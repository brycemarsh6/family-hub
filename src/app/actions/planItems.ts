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
import { canEdit, canLog, canSee, habitCheckTarget } from "@/lib/goals";
import { type PlanItemRow } from "@/lib/goalsProgress";
import type { CalendarDate } from "@/lib/householdDate";
import { toGoalVisibility } from "@/lib/goalVocabulary";
import { canLogFor } from "@/lib/habits/access";
import { checkHabit, deleteHabit, uncheckNewest } from "@/lib/habits/habitWrites";
import { periodWindow } from "@/lib/habits/schedule";
import type { ScheduleSpec } from "@/lib/habits/types";
import { loadHabitsForPlan } from "@/lib/habitsRead";
import { GOAL_NOT_ALLOWED, type GoalPolicyRow } from "@/lib/goalWrites";
import { createPlanItem as createPlanItemRow, PLAN_ITEM_GONE, planItemRowOf, setStepDone, updatePlanItem as updatePlanItemRow } from "@/lib/planItemWrites";
import { Prisma } from "@/generated/prisma/client";

export type PlanItemActionResult = { error?: string };
export type CreatePlanItemResult = PlanItemActionResult & { id?: string };

const NOT_SIGNED_IN = "Not signed in.";
const DEVICE_REFUSED = "A shared device can't change goals.";
const NOT_ALLOWED = GOAL_NOT_ALLOWED;
const GONE = PLAN_ITEM_GONE;
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

  const item = planItemRowOf(row);
  return { user, item, goal: row.goal };
}

export async function createPlanItem(goalId: string, raw: unknown): Promise<CreatePlanItemResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSED };

  const result = await createPlanItemRow((goal) => allowed(goal, user, "edit"), goalId, raw, householdToday(new Date())!, user.userId);
  if ("error" in result) return { error: result.error };

  refreshPlansViews();
  return { id: result.item.id };
}

/** Rewrites title, kind and repeat. Turning a step into anything else forgets that it was done. */
export async function updatePlanItem(id: string, raw: unknown): Promise<PlanItemActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSED };

  const result = await updatePlanItemRow((goal) => allowed(goal, user, "edit"), id, raw, householdToday(new Date())!, user.userId);
  if ("error" in result) return { error: result.error };

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

async function setStep(id: string, done: boolean): Promise<PlanItemActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };

  const result = await setStepDone((goal) => allowed(goal, user, "log"), id, done);
  if ("error" in result) return { error: result.error };

  refreshPlansViews();
  return {};
}

export async function completeStep(id: string): Promise<PlanItemActionResult> {
  return setStep(id, true);
}

export async function uncompleteStep(id: string): Promise<PlanItemActionResult> {
  return setStep(id, false);
}
