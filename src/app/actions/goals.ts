"use server";

// Server Actions for Plans & Goals' goals (mission 27). Like every action file,
// each export is a real public POST endpoint, so each one opens with its own
// guard. Order: signed in, then not a shared device (the wall tablet only logs
// habits, see planItems.ts), then the row itself through canSee + canEdit from
// src/lib/goals.ts. Hidden and forbidden answer with the same words, so a
// private goal's existence never leaks. Who may do what lives in that lib file;
// nothing here re-decides it. Validation comes from there too.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedUser, type VerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { canEdit, canSee, earlierDate, goalOwnership, validateGoalInput, type GoalInput } from "@/lib/goals";
import { numberAfterCheckIns } from "@/lib/goalsProgress";
import { toGoalVisibility } from "@/lib/goalVocabulary";
import { calendarDateInZone, utcMidnightInstant } from "@/lib/householdDate";
import { isMissingRowError } from "@/lib/prismaErrors";

export type GoalActionResult = { error?: string };
export type CreateGoalResult = GoalActionResult & { id?: string };

const NOT_SIGNED_IN = "Not signed in.";
const DEVICE_REFUSED = "A shared device can't change goals.";
const NOT_ALLOWED = "You can't change that goal.";
const GONE = "That goal no longer exists.";

function refreshPlansViews() {
  revalidatePath("/plans", "layout");
}

/** The measure columns a goal's input writes, for a goal that has none yet or is being created. */
function newMeasureData(measure: GoalInput["measure"]) {
  return {
    measureUnit: measure?.unit ?? null,
    startValue: measure?.start ?? null,
    targetValue: measure?.target ?? null,
    currentValue: measure?.start ?? null,
  };
}

type Loaded =
  | { user: VerifiedUser; goal: NonNullable<Awaited<ReturnType<typeof findGoalForWrite>>> }
  | { error: string; missing?: boolean };

function findGoalForWrite(id: string) {
  return db.goal.findUnique({
    where: { id },
    select: {
      ownerId: true,
      visibility: true,
      targetDate: true,
      measureUnit: true,
      startValue: true,
      targetValue: true,
      currentValue: true,
    },
  });
}

/**
 * The shared opening of every action except create: the signed-in person, and
 * the goal row only if they may see and change it. `missing` tells delete that
 * an already-gone goal is a success.
 */
async function loadEditable(id: string): Promise<Loaded> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSED };

  const goal = await findGoalForWrite(id);
  if (!goal) return { error: GONE, missing: true };
  const policy = { ownerId: goal.ownerId, visibility: toGoalVisibility(goal.visibility) };
  if (!canSee(policy, user) || !canEdit(policy, user)) return { error: NOT_ALLOWED };
  return { user, goal };
}

export async function createGoal(raw: unknown): Promise<CreateGoalResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSED };

  const checked = validateGoalInput(raw, householdToday(new Date())!);
  if ("error" in checked) return { error: checked.error };
  const input = checked.ok;

  const created = await db.goal.create({
    data: {
      title: input.title,
      area: input.area,
      why: input.why,
      targetDate: input.targetDate && utcMidnightInstant(input.targetDate),
      ownerId: input.ownership === "mine" ? user.userId : null,
      visibility: input.visibility,
      ...newMeasureData(input.measure),
      createdById: user.userId,
    },
    select: { id: true },
  });

  refreshPlansViews();
  return { id: created.id };
}

/**
 * Edit a goal. The number to track is the delicate part: adding one starts it
 * at its starting value, taking it away also forgets the last check-in and deletes
 * the goal's whole check-in history (old readings never return under a new number), and
 * changing its unit, start or target keeps the current reading.
 */
export async function updateGoal(id: string, raw: unknown): Promise<GoalActionResult> {
  const loaded = await loadEditable(id);
  if ("error" in loaded) return { error: loaded.error };
  const { goal } = loaded;

  // Whose a goal is can't change by editing: the stored row decides, never the client.
  // A Together goal therefore can't be made private, and a Mine goal can't be handed to everyone.
  const ownership = goalOwnership(goal);
  const submitted = typeof raw === "object" && raw !== null ? { ...raw, ownership } : raw;

  // The date may stay, move later, or move to any day not earlier than the stored one (or today, if sooner).
  const today = householdToday(new Date())!;
  const checked = validateGoalInput(submitted, today, {
    earliest: goal.targetDate ? earlierDate(today, calendarDateInZone(goal.targetDate, "UTC")) : today,
  });
  if ("error" in checked) return { error: checked.error };
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

  try {
    const update = db.goal.update({
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
    if (hadMeasure && !input.measure) {
      await db.$transaction([db.goalCheckIn.deleteMany({ where: { goalId: id } }), update]);
    } else {
      await update;
    }
  } catch (error) {
    if (isMissingRowError(error)) return { error: GONE };
    throw error;
  }

  refreshPlansViews();
  return {};
}

/** One tap, no confirmation. Its plan items go with it; their habits stay, unlinked. A goal already gone is a success. */
export async function deleteGoal(id: string): Promise<GoalActionResult> {
  const loaded = await loadEditable(id);
  if ("error" in loaded) return "missing" in loaded && loaded.missing ? {} : { error: loaded.error };

  try {
    await db.goal.delete({ where: { id } });
  } catch (error) {
    if (!isMissingRowError(error)) throw error;
  }

  refreshPlansViews();
  return {};
}

async function setCompleted(id: string, completedAt: Date | null): Promise<GoalActionResult> {
  const loaded = await loadEditable(id);
  if ("error" in loaded) return { error: loaded.error };

  try {
    await db.goal.update({ where: { id }, data: { completedAt } });
  } catch (error) {
    if (isMissingRowError(error)) return { error: GONE };
    throw error;
  }

  refreshPlansViews();
  return {};
}

export async function completeGoal(id: string): Promise<GoalActionResult> {
  return setCompleted(id, new Date());
}

export async function uncompleteGoal(id: string): Promise<GoalActionResult> {
  return setCompleted(id, null);
}

/** Record where the goal's number stands now. Only a goal with a number to track can be checked in. */
export async function checkInGoal(id: string, value: unknown): Promise<GoalActionResult> {
  const loaded = await loadEditable(id);
  if ("error" in loaded) return { error: loaded.error };
  if (loaded.goal.measureUnit === null) return { error: "This goal has no number to track." };
  if (typeof value !== "number" || !Number.isFinite(value)) return { error: "Enter a number." };

  const at = new Date();
  try {
    await db.$transaction([
      db.goal.update({ where: { id }, data: { currentValue: value, checkedInAt: at } }),
      db.goalCheckIn.create({ data: { goalId: id, value, at, createdById: loaded.user.userId } }),
    ]);
  } catch (error) {
    if (isMissingRowError(error)) return { error: GONE };
    throw error;
  }

  refreshPlansViews();
  return {};
}

/**
 * Remove one check-in (already gone is success), then point the goal's current
 * number back at the newest check-in left, or at its start value when none remain.
 */
export async function deleteCheckIn(id: string): Promise<GoalActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSED };

  const checkIn = await db.goalCheckIn.findUnique({ where: { id }, select: { goalId: true } });
  if (!checkIn) return {};
  const loaded = await loadEditable(checkIn.goalId);
  if ("error" in loaded) return loaded.missing ? {} : { error: loaded.error };
  if (loaded.goal.measureUnit === null) return { error: "This goal has no number to track." };

  try {
    await db.$transaction(async (tx) => {
      await tx.goalCheckIn.deleteMany({ where: { id } });
      const remaining = await tx.goalCheckIn.findMany({
        where: { goalId: checkIn.goalId },
        orderBy: { at: "desc" },
        take: 1,
        select: { value: true, at: true },
      });
      await tx.goal.update({
        where: { id: checkIn.goalId },
        data: numberAfterCheckIns(loaded.goal.startValue, remaining),
      });
    });
  } catch (error) {
    if (isMissingRowError(error)) return {};
    throw error;
  }

  refreshPlansViews();
  return {};
}
