"use server";

// Server Actions for the plan items under a goal (mission 27): habits, steps
// and reminders. Same rules as goals.ts: every export is a public POST
// endpoint and opens with its own guard, and who may do what comes from
// canSee / canEdit / canLog in src/lib/goals.ts, judged on the item's parent
// goal. Two kinds of action: create, update and delete change the plan, so a
// shared device is refused; logging a habit tap or ticking a step is what the
// wall tablet is for, so those use canLog, which lets a device act on a
// Together goal. Hidden and forbidden answer with the same words.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedUser, type VerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import {
  canEdit,
  canLog,
  canSee,
  habitCheckTarget,
  habitInputFromPlan,
  habitParticipantsFor,
  validatePlanItemInput,
  type PlanItemInput,
} from "@/lib/goals";
import { type PlanItemRow } from "@/lib/goalsProgress";
import type { CalendarDate } from "@/lib/householdDate";
import { toGoalVisibility, toHabitPeriod, toPlanKind } from "@/lib/goalVocabulary";
import { canLogFor } from "@/lib/habits/access";
import { checkHabit, createHabit, deleteHabit, uncheckNewest, updateHabit } from "@/lib/habits/habitWrites";
import { periodWindow } from "@/lib/habits/schedule";
import type { ScheduleSpec } from "@/lib/habits/types";
import { loadHabitForAction, loadHabitsForPlan } from "@/lib/habitsRead";
import { Prisma } from "@/generated/prisma/client";
import { isMissingRowError } from "@/lib/prismaErrors";

export type PlanItemActionResult = { error?: string };
export type CreatePlanItemResult = PlanItemActionResult & { id?: string };

const NOT_SIGNED_IN = "Not signed in.";
const DEVICE_REFUSED = "A shared device can't change goals.";
const NOT_ALLOWED = "You can't change that goal.";
const GONE = "That plan no longer exists.";
const TRACKS_HOURS = "That habit tracks hours.";
const NOT_LINKED = "This habit needs to be saved once more before it can be checked. Tap Edit, then Save.";

/** P2003: the goal or item was deleted on another phone between the check and the write. */
function isMissingParentError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}

function refreshPlansViews() {
  revalidatePath("/plans", "layout");
}

type Access = "edit" | "log";

type GoalPolicyRow = { ownerId: string | null; visibility: string; area: string };

/** The one place a goal row is judged: edit refuses devices (canEdit), log lets a device on Together goals (canLog). */
function allowed(goal: GoalPolicyRow, user: VerifiedUser, access: Access): boolean {
  const policy = { ownerId: goal.ownerId, visibility: toGoalVisibility(goal.visibility) };
  return canSee(policy, user) && (access === "edit" ? canEdit(policy, user) : canLog(policy, user));
}

type LoadedItem =
  | { user: VerifiedUser; item: PlanItemRow; goal: GoalPolicyRow }
  | { error: string; missing?: boolean };

/** Signed in, device rule for edits, then the item and its parent goal judged by `access`. */
async function loadItem(id: string, access: Access): Promise<LoadedItem> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (access === "edit" && user.isDevice) return { error: DEVICE_REFUSED };

  const row = await db.planItem.findUnique({
    where: { id },
    include: { goal: { select: { ownerId: true, visibility: true, area: true } } },
  });
  if (!row) return { error: GONE, missing: true };
  if (!allowed(row.goal, user, access)) return { error: NOT_ALLOWED };

  const item: PlanItemRow = {
    id: row.id,
    goalId: row.goalId,
    title: row.title,
    kind: toPlanKind(row.kind) ?? "reminder",
    timesPerPeriod: row.timesPerPeriod,
    period: toHabitPeriod(row.period),
    habitId: row.habitId,
    doneAt: row.doneAt,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  };
  return { user, item, goal: row.goal };
}

export async function createPlanItem(goalId: string, raw: unknown): Promise<CreatePlanItemResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSED };

  const goal = await db.goal.findUnique({
    where: { id: goalId },
    select: { ownerId: true, visibility: true, area: true },
  });
  if (!goal) return { error: "That goal no longer exists." };
  if (!allowed(goal, user, "edit")) return { error: NOT_ALLOWED };

  const checked = validatePlanItemInput(raw);
  if ("error" in checked) return { error: checked.error };
  const input = checked.ok;

  const { _max } = await db.planItem.aggregate({ where: { goalId }, _max: { sortOrder: true } });

  try {
    const created = await db.$transaction(async (tx) => {
      const habit = input.kind === "habit" ? await newHabit(tx, input, goal, user, householdToday(new Date())!) : null;
      return tx.planItem.create({
        data: {
          goalId,
          title: input.title,
          kind: input.kind,
          timesPerPeriod: input.timesPerPeriod,
          period: input.period,
          habitId: habit?.id ?? null,
          sortOrder: (_max.sortOrder ?? -1) + 1,
        },
        select: { id: true },
      });
    });
    refreshPlansViews();
    return { id: created.id };
  } catch (error) {
    if (isMissingParentError(error)) return { error: "That goal no longer exists." };
    throw error;
  }
}

/** The Habit behind a new habit item: the goal's owner for a Mine goal, every active person for a Together one. */
async function newHabit(tx: Prisma.TransactionClient, input: PlanItemInput, goal: GoalPolicyRow, user: VerifiedUser, today: CalendarDate) {
  return createHabit(
    {
      fields: { ...habitInputFromPlan(input, goal), createdById: user.userId },
      participantIds: habitParticipantsFor(goal),
      today,
    },
    tx,
  );
}

/**
 * Brings the linked Habit in step with an edited item. An edit that names no
 * Track never changes it (decision 198): an hours habit (`keepsHours`) then
 * only takes the new title, because the item's repeat fields stand for checks.
 */
async function updateLinkedHabit(
  tx: Prisma.TransactionClient,
  habitId: string,
  input: PlanItemInput,
  goal: GoalPolicyRow,
  today: CalendarDate,
  keepsHours: boolean,
) {
  const { title, schedule, times, track, weeklyMinutes, paceDays } = habitInputFromPlan(input, goal);
  if (keepsHours) return updateHabit(habitId, { title }, today, tx);
  return updateHabit(habitId, { title, schedule, times, track, weeklyMinutes, paceDays }, today, tx);
}

/** Rewrites title, kind and repeat. Turning a step into anything else forgets that it was done. */
export async function updatePlanItem(id: string, raw: unknown): Promise<PlanItemActionResult> {
  const loaded = await loadItem(id, "edit");
  if ("error" in loaded) return { error: loaded.error };

  const checked = validatePlanItemInput(raw);
  if ("error" in checked) return { error: checked.error };
  const input = checked.ok;

  const { user, item, goal } = loaded;
  const today = householdToday(new Date())!;

  try {
    const keepsHours = input.kind === "habit" && input.track === undefined && !!item.habitId && (await loadHabitForAction(item.habitId))?.track === "hours";
    await db.$transaction(async (tx) => {
      // A habit keeps its Habit in step with the item; anything else lets the Habit go.
      let habitId: string | null = null;
      if (input.kind === "habit") {
        const updated = item.habitId ? await updateLinkedHabit(tx, item.habitId, input, goal, today, keepsHours) : null;
        habitId = updated ? updated.id : (await newHabit(tx, input, goal, user, today)).id;
      }
      await tx.planItem.update({
        where: { id },
        data: {
          title: input.title,
          kind: input.kind,
          timesPerPeriod: keepsHours ? item.timesPerPeriod : input.timesPerPeriod,
          period: keepsHours ? item.period : input.period,
          habitId,
          ...(input.kind === "step" ? {} : { doneAt: null }),
        },
      });
      if (habitId === null && item.habitId) await deleteHabit(item.habitId, today, tx);
    });
  } catch (error) {
    if (isMissingRowError(error)) return { error: GONE };
    throw error;
  }

  refreshPlansViews();
  return {};
}

/** One tap, no confirmation. A habit's Habit and its checks go with it. An item already gone is a success. */
export async function deletePlanItem(id: string): Promise<PlanItemActionResult> {
  const loaded = await loadItem(id, "edit");
  if ("error" in loaded) return "missing" in loaded && loaded.missing ? {} : { error: loaded.error };

  if (loaded.item.habitId) await deleteHabit(loaded.item.habitId, householdToday(new Date())!);
  await db.planItem.deleteMany({ where: { id } });

  refreshPlansViews();
  return {};
}

type HabitTarget = { habitId: string; forUserId: string; spec: ScheduleSpec | null };

/**
 * The habit behind a tapped item and whose row the tap is for, once the
 * viewer may check it (decision 78: see the goal, then `canLogFor`). A habit
 * item with no Habit yet comes back as `unlinked`.
 */
async function habitTarget(
  loaded: { user: VerifiedUser; item: PlanItemRow; goal: GoalPolicyRow },
  today: CalendarDate,
): Promise<HabitTarget | { error: string } | { unlinked: true }> {
  const { user, item, goal } = loaded;
  if (item.kind !== "habit") return { error: "Only a habit can be logged." };
  if (!item.habitId) return { unlinked: true };
  const habit = (await loadHabitsForPlan([item.habitId], today)).get(item.habitId);
  if (!habit) return { error: GONE };
  if (habit.track === "hours") return { error: TRACKS_HOURS };
  const forUserId = habitCheckTarget(goal, user.userId, habit.participantIds);
  const access = { isPrivate: habit.isPrivate, participantIds: habit.participantIds };
  if (!canLogFor({ userId: user.userId, role: user.role }, forUserId, access)) return { error: NOT_ALLOWED };
  return { habitId: habit.id, forUserId, spec: habit.spec };
}

/** One tap on a habit, counted toward today (the household's, not the server's). One check a day: a repeat tap changes nothing. */
export async function logHabit(id: string): Promise<PlanItemActionResult> {
  const loaded = await loadItem(id, "log");
  if ("error" in loaded) return { error: loaded.error };

  const today = householdToday(new Date())!;
  const target = await habitTarget(loaded, today);
  if ("error" in target) return { error: target.error };
  if ("unlinked" in target) return { error: NOT_LINKED };

  try {
    const { created } = await checkHabit(
      { habitId: target.habitId, forUserId: target.forUserId, day: today, loggedById: loaded.user.userId },
      today,
    );
    if (created === 0) return {};
  } catch (error) {
    if (isMissingParentError(error)) return { error: GONE };
    throw error;
  }

  refreshPlansViews();
  return {};
}

/** Takes back the newest check in the habit's current window. Nothing to take back is fine. */
export async function undoHabitLog(id: string): Promise<PlanItemActionResult> {
  const loaded = await loadItem(id, "log");
  if ("error" in loaded) return { error: loaded.error };

  const today = householdToday(new Date())!;
  const target = await habitTarget(loaded, today);
  if ("error" in target) return { error: target.error };
  if ("unlinked" in target) return {};

  if (!target.spec) return {};

  const window = periodWindow(target.spec, today);
  const { removed } = await uncheckNewest(target.habitId, target.forUserId, window, today);
  if (removed === 0) return {};

  refreshPlansViews();
  return {};
}

async function setStepDone(id: string, doneAt: Date | null): Promise<PlanItemActionResult> {
  const loaded = await loadItem(id, "log");
  if ("error" in loaded) return { error: loaded.error };
  if (loaded.item.kind !== "step") return { error: "Only a step can be checked off." };

  try {
    await db.planItem.update({ where: { id }, data: { doneAt } });
  } catch (error) {
    if (isMissingRowError(error)) return { error: GONE };
    throw error;
  }

  refreshPlansViews();
  return {};
}

export async function completeStep(id: string): Promise<PlanItemActionResult> {
  return setStepDone(id, new Date());
}

export async function uncompleteStep(id: string): Promise<PlanItemActionResult> {
  return setStepDone(id, null);
}
