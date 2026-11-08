import "server-only";

// The writes on a goal's plan items (mission 50, C1): add, edit and tick a
// step. The rules `src/app/actions/planItems.ts` used to hold, in one
// `server-only` lib module with NO session check and NO `revalidatePath`
// (same split as `goalWrites.ts`). The guard judges the item's PARENT goal,
// and the caller decides whether that means "may edit" or "may log" (a shared
// device may tick a step but not change the plan). Deleting an item, and the
// habit taps, stay in the action.
//
// A habit item owns a Habit: adding one makes the Habit and its participants,
// editing keeps them in step, turning it into a step or reminder deletes the
// Habit (the app's path). Every write returns whole-row copies of what it
// wrote, read inside the same transaction, or a `WriteError`. The Habit and
// participant rows come back as `before` and `after` arrays to diff by id.

import { db } from "@/lib/db";
import { Prisma, type Habit, type HabitParticipant, type PlanItem } from "@/generated/prisma/client";
import { habitInputFromPlan, habitParticipantsFor, validatePlanItemInput, type PlanItemInput } from "./goals";
import { toHabitPeriod, toPlanKind } from "./goalVocabulary";
import { GOAL_GONE, GOAL_NOT_ALLOWED, type GoalGuard, type GoalPolicyRow } from "./goalWrites";
import { createHabit, deleteHabit, updateHabit } from "./habits/habitWrites";
import { atomically } from "./habits/participantWrites";
import { loadHabitForAction } from "./habitsRead";
import type { PlanItemRow } from "./goalsProgress";
import type { CalendarDate } from "./householdDate";
import { isMissingRowError } from "./prismaErrors";
import { invalid, missing, type WriteError } from "./writeError";

export const PLAN_ITEM_GONE = "That plan no longer exists.";
export const ONLY_STEP_CHECKED = "Only a step can be checked off.";

/** The item as the plan's views read it (`PlanItemRow`): what a caller needs to tell a habit from a step before writing. */
export type PlanItemForWrite = PlanItemRow;

/** P2003: the goal or item was deleted on another phone between the check and the write. */
function isMissingParentError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}

type Client = Prisma.TransactionClient;

/** The Habit behind a new habit item: the goal's owner for a Mine goal, every active person for a Together one. */
async function newHabit(tx: Client, input: PlanItemInput, goal: GoalPolicyRow, createdById: string | null, today: CalendarDate) {
  return createHabit(
    {
      fields: { ...habitInputFromPlan(input, goal), createdById },
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
  tx: Client,
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

async function habitsAndPeople(tx: Client, habitIds: string[]): Promise<{ habits: Habit[]; participants: HabitParticipant[] }> {
  if (habitIds.length === 0) return { habits: [], participants: [] };
  const [habits, participants] = await Promise.all([
    tx.habit.findMany({ where: { id: { in: habitIds } }, orderBy: { id: "asc" } }),
    tx.habitParticipant.findMany({ where: { habitId: { in: habitIds } }, orderBy: [{ habitId: "asc" }, { userId: "asc" }] }),
  ]);
  return { habits, participants };
}

/** The item with its parent goal's policy row, judged by `guard`. */
async function guardedItem(
  guard: GoalGuard,
  id: string,
  tx: Client,
): Promise<{ row: PlanItem; goal: GoalPolicyRow } | WriteError> {
  const row = await tx.planItem.findUnique({
    where: { id },
    include: { goal: { select: { ownerId: true, visibility: true, area: true } } },
  });
  if (!row) return missing(PLAN_ITEM_GONE);
  if (!guard(row.goal)) return missing(GOAL_NOT_ALLOWED);
  const { goal, ...item } = row;
  return { row: item, goal };
}

/** The item as the plan's views read it. */
export function planItemRowOf(row: PlanItem): PlanItemForWrite {
  return {
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
}

/**
 * Add a habit, step or reminder under a goal, last in its list. A habit makes
 * its Habit (`today` is the household's day, the caller's to give; `createdById` is the person who made it, `null` for the Assistant
 * API). The Habit and its participants come back with the item.
 */
export async function createPlanItem(
  guard: GoalGuard,
  goalId: string,
  raw: unknown,
  today: CalendarDate,
  createdById: string | null,
  client: Client = db,
): Promise<{ item: PlanItem; habits: Habit[]; participants: HabitParticipant[] } | WriteError> {
  try {
    return await atomically(client, async (tx) => {
      const goal = await tx.goal.findUnique({ where: { id: goalId }, select: { ownerId: true, visibility: true, area: true } });
      if (!goal) return missing(GOAL_GONE);
      if (!guard(goal)) return missing(GOAL_NOT_ALLOWED);

      const checked = validatePlanItemInput(raw);
      if ("error" in checked) return invalid(checked.error);
      const input = checked.ok;

      const { _max } = await tx.planItem.aggregate({ where: { goalId }, _max: { sortOrder: true } });
      const habit = input.kind === "habit" ? await newHabit(tx, input, goal, createdById, today) : null;
      const item = await tx.planItem.create({
        data: {
          goalId,
          title: input.title,
          kind: input.kind,
          timesPerPeriod: input.timesPerPeriod,
          period: input.period,
          habitId: habit?.id ?? null,
          sortOrder: (_max.sortOrder ?? -1) + 1,
        },
      });
      return { item, ...(await habitsAndPeople(tx, habit ? [habit.id] : [])) };
    });
  } catch (error) {
    if (isMissingParentError(error)) return missing(GOAL_GONE);
    throw error;
  }
}

/**
 * Rewrites title, kind and repeat. Turning a step into anything else forgets
 * that it was done. A habit keeps its Habit in step with the item; any other
 * kind lets the Habit go (it is deleted, with its checks). A habit made by the
 * edit (a step turned into a habit) is `createdById`'s. `habits` and
 * `participants` hold the Habit rows as they were and as they are now.
 */
export async function updatePlanItem(
  guard: GoalGuard,
  id: string,
  raw: unknown,
  today: CalendarDate,
  createdById: string | null,
  client: Client = db,
): Promise<
  | {
      item: { before: PlanItem; after: PlanItem };
      habits: { before: Habit[]; after: Habit[] };
      participants: { before: HabitParticipant[]; after: HabitParticipant[] };
    }
  | WriteError
> {
  try {
    return await atomically(client, async (tx) => {
      const found = await guardedItem(guard, id, tx);
      if ("error" in found) return found;
      const { row, goal } = found;

      const checked = validatePlanItemInput(raw);
      if ("error" in checked) return invalid(checked.error);
      const input = checked.ok;

      const keepsHours = input.kind === "habit" && input.track === undefined && !!row.habitId && (await loadHabitForAction(row.habitId))?.track === "hours";
      const before = await habitsAndPeople(tx, row.habitId ? [row.habitId] : []);

      // A habit keeps its Habit in step with the item; anything else lets the Habit go.
      let habitId: string | null = null;
      if (input.kind === "habit") {
        const updated = row.habitId ? await updateLinkedHabit(tx, row.habitId, input, goal, today, keepsHours) : null;
        habitId = updated ? updated.id : (await newHabit(tx, input, goal, createdById, today)).id;
      }
      const after = await tx.planItem.update({
        where: { id },
        data: {
          title: input.title,
          kind: input.kind,
          timesPerPeriod: keepsHours ? row.timesPerPeriod : input.timesPerPeriod,
          period: keepsHours ? row.period : input.period,
          habitId,
          ...(input.kind === "step" ? {} : { doneAt: null }),
        },
      });
      if (habitId === null && row.habitId) await deleteHabit(row.habitId, today, tx);

      const now = await habitsAndPeople(tx, habitId ? [habitId] : []);
      return {
        item: { before: row, after },
        habits: { before: before.habits, after: now.habits },
        participants: { before: before.participants, after: now.participants },
      };
    });
  } catch (error) {
    if (isMissingRowError(error)) return missing(PLAN_ITEM_GONE);
    throw error;
  }
}

/** Tick a step (`done: true`, stamped now) or untick it. Only a step can be checked off. */
export async function setStepDone(
  guard: GoalGuard,
  id: string,
  done: boolean,
  client: Client = db,
): Promise<{ before: PlanItem; after: PlanItem } | WriteError> {
  try {
    return await atomically(client, async (tx) => {
      const found = await guardedItem(guard, id, tx);
      if ("error" in found) return found;
      if (toPlanKind(found.row.kind) !== "step") return invalid(ONLY_STEP_CHECKED);
      const after = await tx.planItem.update({ where: { id }, data: { doneAt: done ? new Date() : null } });
      return { before: found.row, after };
    });
  } catch (error) {
    if (isMissingRowError(error)) return missing(PLAN_ITEM_GONE);
    throw error;
  }
}
