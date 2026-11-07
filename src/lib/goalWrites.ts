import "server-only";

// The writes on a goal (mission 50, C1): create, edit, complete, check in and
// remove a check-in. The rules `src/app/actions/goals.ts` used to hold, in one
// `server-only` lib module with NO session check and NO `revalidatePath`: the
// actions add the session and the page refresh, the Assistant API adds its
// token, audit log and undo copies.
//
// Same guard order every time: the goal's row, then the caller's `guard` (a
// callback, so this module knows no actor and no access rule: the actions pass
// `canSee` + `canEdit` for the signed-in person, the Assistant API passes them
// for Winnie), then everything else. A missing goal answers `GOAL_GONE`; a
// refused one answers `GOAL_NOT_ALLOWED`, the same words whether the goal is
// hidden or only forbidden.
//
// Every write returns whole-row copies of what it wrote, read inside the same
// transaction, or a `WriteError` (`writeError.ts`). Taking a goal's number away
// deletes its check-ins in the same transaction, and `removed` hands them back.

import { db } from "@/lib/db";
import type { Goal, GoalCheckIn, Prisma } from "@/generated/prisma/client";
import { earlierDate, goalOwnership, validateGoalInput, type GoalInput } from "./goals";
import { numberAfterCheckIns } from "./goalsProgress";
import { calendarDateFromUtcMidnight, utcMidnightInstant, type CalendarDate } from "./householdDate";
import { isMissingRowError } from "./prismaErrors";
import { invalid, missing, type WriteError } from "./writeError";
import { atomically } from "./habits/participantWrites";

export const GOAL_NOT_ALLOWED = "You can't change that goal.";
export const GOAL_GONE = "That goal no longer exists.";
export const GOAL_NO_NUMBER = "This goal has no number to track.";
export const CHECK_IN_NOT_A_NUMBER = "Enter a number.";
/** Not a family-visible string: a Mine goal needs a person to be mine (the Assistant API's owner may be unset). */
export const GOAL_NEEDS_OWNER = "A goal that's mine needs a person it belongs to.";

/** What the guard judges: who owns the goal, whether it is private, and its life area (a habit plan item takes it). */
export type GoalPolicyRow = { ownerId: string | null; visibility: string; area: string };

/** The caller's access test on the goal: true when it may be changed. A refused goal answers like a missing one. */
export type GoalGuard = (goal: GoalPolicyRow) => boolean;

/** The whole stored goal row: what `updateGoal` and the others read first, and hand back as `before` and `after`. */
export type GoalForWrite = Goal;

/** The measure columns a goal's input writes, for a goal that has none yet or is being created. */
function newMeasureData(measure: GoalInput["measure"]) {
  return {
    measureUnit: measure?.unit ?? null,
    startValue: measure?.start ?? null,
    targetValue: measure?.target ?? null,
    currentValue: measure?.start ?? null,
  };
}

/** Inside a write's transaction: lock the goal row, so the reads and the write that follow see one goal. */
export async function lockGoal(tx: Prisma.TransactionClient, id: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Goal" WHERE "id" = ${id} FOR UPDATE`;
}

/** The goal and the caller's `guard`, read inside `tx`. */
async function guardedGoal(guard: GoalGuard, id: string, tx: Prisma.TransactionClient): Promise<Goal | WriteError> {
  const goal = await tx.goal.findUnique({ where: { id } });
  if (!goal) return missing(GOAL_GONE);
  if (!guard(goal)) return missing(GOAL_NOT_ALLOWED);
  return goal;
}

/**
 * Add a goal. `ownerId` is who "Mine" means (the signed-in person; the
 * Assistant API's owner); Together takes none. `createdById` is the person who
 * made it, `null` for the Assistant API.
 */
export async function createGoal(
  fields: { raw: unknown; today: CalendarDate; ownerId: string | null; createdById: string | null },
  client: Prisma.TransactionClient = db,
): Promise<{ goal: Goal } | WriteError> {
  const checked = validateGoalInput(fields.raw, fields.today);
  if ("error" in checked) return invalid(checked.error);
  const input = checked.ok;
  if (input.ownership === "mine" && fields.ownerId === null) return invalid(GOAL_NEEDS_OWNER);

  const goal = await client.goal.create({
    data: {
      title: input.title,
      area: input.area,
      why: input.why,
      targetDate: input.targetDate && utcMidnightInstant(input.targetDate),
      ownerId: input.ownership === "mine" ? fields.ownerId : null,
      visibility: input.visibility,
      ...newMeasureData(input.measure),
      createdById: fields.createdById,
    },
  });
  return { goal };
}

/**
 * Edit a goal. The number to track is the delicate part: adding one starts it
 * at its starting value, taking it away also forgets the last check-in and deletes
 * the goal's whole check-in history (old readings never return under a new number, and
 * `removed` returns them), and changing its unit, start or target keeps the current reading.
 */
export async function updateGoal(
  guard: GoalGuard,
  id: string,
  raw: unknown,
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<{ before: Goal; after: Goal; removed: GoalCheckIn[] } | WriteError> {
  try {
    return await atomically(client, async (tx) => {
      const goal = await guardedGoal(guard, id, tx);
      if ("error" in goal) return goal;

      // Whose a goal is can't change by editing: the stored row decides, never the client.
      // A Together goal therefore can't be made private, and a Mine goal can't be handed to everyone.
      const ownership = goalOwnership(goal);
      const submitted = typeof raw === "object" && raw !== null ? { ...raw, ownership } : raw;

      // The date may stay, move later, or move to any day not earlier than the stored one (or today, if sooner).
      const checked = validateGoalInput(submitted, today, {
        earliest: goal.targetDate ? earlierDate(today, calendarDateFromUtcMidnight(goal.targetDate)) : today,
      });
      if ("error" in checked) return invalid(checked.error);
      const input = checked.ok;

      const hadMeasure = goal.measureUnit !== null;
      const measureData = !input.measure
        ? { measureUnit: null, startValue: null, targetValue: null, currentValue: null, checkedInAt: null }
        : hadMeasure
          ? {
              measureUnit: input.measure.unit,
              startValue: input.measure.start,
              targetValue: input.measure.target,
              currentValue: goal.currentValue ?? input.measure.start,
            }
          : newMeasureData(input.measure);

      const removed = hadMeasure && !input.measure ? await tx.goalCheckIn.findMany({ where: { goalId: id }, orderBy: { at: "asc" } }) : [];
      if (removed.length > 0) await tx.goalCheckIn.deleteMany({ where: { goalId: id } });
      const after = await tx.goal.update({
        where: { id },
        data: {
          title: input.title,
          area: input.area,
          why: input.why,
          targetDate: input.targetDate && utcMidnightInstant(input.targetDate),
          visibility: input.visibility,
          ...measureData,
        },
      });
      return { before: goal, after, removed };
    });
  } catch (error) {
    if (isMissingRowError(error)) return missing(GOAL_GONE);
    throw error;
  }
}

/** Mark a goal done (`done: true`, stamped now) or open it again. */
export async function setGoalCompleted(
  guard: GoalGuard,
  id: string,
  done: boolean,
  client: Prisma.TransactionClient = db,
): Promise<{ before: Goal; after: Goal } | WriteError> {
  try {
    return await atomically(client, async (tx) => {
      const goal = await guardedGoal(guard, id, tx);
      if ("error" in goal) return goal;
      const after = await tx.goal.update({ where: { id }, data: { completedAt: done ? new Date() : null } });
      return { before: goal, after };
    });
  } catch (error) {
    if (isMissingRowError(error)) return missing(GOAL_GONE);
    throw error;
  }
}

/**
 * Record where the goal's number stands now. Only a goal with a number to
 * track can be checked in. `createdById` is the person who did it, `null` for
 * the Assistant API.
 */
export async function addCheckIn(
  guard: GoalGuard,
  id: string,
  value: unknown,
  createdById: string | null,
  client: Prisma.TransactionClient = db,
): Promise<{ before: Goal; after: Goal; checkIn: GoalCheckIn } | WriteError> {
  try {
    return await atomically(client, async (tx) => {
      const goal = await guardedGoal(guard, id, tx);
      if ("error" in goal) return goal;
      if (goal.measureUnit === null) return invalid(GOAL_NO_NUMBER);
      if (typeof value !== "number" || !Number.isFinite(value)) return invalid(CHECK_IN_NOT_A_NUMBER);

      const at = new Date();
      const after = await tx.goal.update({ where: { id }, data: { currentValue: value, checkedInAt: at } });
      const checkIn = await tx.goalCheckIn.create({ data: { goalId: id, value, at, createdById } });
      return { before: goal, after, checkIn };
    });
  } catch (error) {
    if (isMissingRowError(error)) return missing(GOAL_GONE);
    throw error;
  }
}

/**
 * Point a goal's current number back at the newest check-in it has left, or
 * at its start value (no check-in date) when none remain. The one writer of
 * that rule, behind removing a check-in and behind undo. Nothing is written
 * when the number already stands there. `keepUpdatedAt` leaves the goal's
 * `updatedAt` as it was (undo needs the goal to still match the copy it just
 * logged). Returns the goal as it is now, `null` when the goal is gone.
 */
export async function rebuildGoalNumber(
  tx: Prisma.TransactionClient,
  goalId: string,
  options: { keepUpdatedAt?: boolean } = {},
): Promise<Goal | null> {
  const goal = await tx.goal.findUnique({ where: { id: goalId } });
  if (!goal) return null;
  const remaining = await tx.goalCheckIn.findMany({
    where: { goalId },
    orderBy: { at: "desc" },
    take: 1,
    select: { value: true, at: true },
  });
  const next = numberAfterCheckIns(goal.startValue, remaining);
  if (next.currentValue === goal.currentValue && next.checkedInAt?.getTime() === goal.checkedInAt?.getTime()) return goal;
  return tx.goal.update({ where: { id: goalId }, data: options.keepUpdatedAt ? { ...next, updatedAt: goal.updatedAt } : next });
}

/**
 * Remove one check-in (already gone is a success: `removed: null`), then point
 * the goal's number back at the newest check-in left (`rebuildGoalNumber`).
 * `guard` runs inside the transaction on the check-in and its goal and may
 * refuse (nothing is removed then; it may also throw, which rolls the
 * transaction back): the actions let anyone who may change the goal remove it,
 * the Assistant API adds "only a check-in she added herself". A goal already
 * gone is a success too.
 */
export async function removeCheckIn(
  guard: (checkIn: GoalCheckIn, goal: Goal) => Promise<WriteError | null> | WriteError | null,
  checkInId: string,
  client: Prisma.TransactionClient = db,
): Promise<{ removed: GoalCheckIn | null; before: Goal | null; after: Goal | null } | WriteError> {
  try {
    return await atomically(client, async (tx) => {
      const checkIn = await tx.goalCheckIn.findUnique({ where: { id: checkInId } });
      if (!checkIn) return { removed: null, before: null, after: null };
      const goal = await tx.goal.findUnique({ where: { id: checkIn.goalId } });
      if (!goal) return { removed: null, before: null, after: null };
      const refusal = await guard(checkIn, goal);
      if (refusal) return refusal;
      if (goal.measureUnit === null) return invalid(GOAL_NO_NUMBER);

      await tx.goalCheckIn.deleteMany({ where: { id: checkInId } });
      const after = await rebuildGoalNumber(tx, goal.id);
      return { removed: checkIn, before: goal, after };
    });
  } catch (error) {
    if (isMissingRowError(error)) return { removed: null, before: null, after: null };
    throw error;
  }
}
