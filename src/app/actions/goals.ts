"use server";

// Server Actions for Plans & Goals' goals (mission 27). Like every action file,
// each export is a real public POST endpoint, so each one opens with its own
// guard. Order: signed in, then not a shared device (the wall tablet only logs
// habits, see planItems.ts), then the row itself through canSee + canEdit from
// src/lib/goals.ts. Hidden and forbidden answer with the same words, so a
// private goal's existence never leaks. Who may do what lives in that lib file;
// nothing here re-decides it. Validation comes from there too. The writes
// themselves live in src/lib/goalWrites.ts (mission 50), shared with the
// Assistant API; this file adds the session, the guard and the page refresh.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedUser, type VerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { canEdit, canSee } from "@/lib/goals";
import { toGoalVisibility } from "@/lib/goalVocabulary";
import {
  addCheckIn,
  createGoal as createGoalRow,
  GOAL_NOT_ALLOWED,
  removeCheckIn,
  setGoalCompleted,
  updateGoal as updateGoalRow,
  type GoalPolicyRow,
} from "@/lib/goalWrites";
import { missing } from "@/lib/writeError";
import { isMissingRowError } from "@/lib/prismaErrors";

export type GoalActionResult = { error?: string };
export type CreateGoalResult = GoalActionResult & { id?: string };

const NOT_SIGNED_IN = "Not signed in.";
const DEVICE_REFUSED = "A shared device can't change goals.";

function refreshPlansViews() {
  revalidatePath("/plans", "layout");
}

/** The one place a goal row is judged for these actions: the person may see it and change it. */
function mayEdit(goal: GoalPolicyRow, user: VerifiedUser): boolean {
  const policy = { ownerId: goal.ownerId, visibility: toGoalVisibility(goal.visibility) };
  return canSee(policy, user) && canEdit(policy, user);
}

export async function createGoal(raw: unknown): Promise<CreateGoalResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSED };

  const result = await createGoalRow({ raw, today: householdToday(new Date())!, ownerId: user.userId, createdById: user.userId });
  if ("error" in result) return { error: result.error };

  refreshPlansViews();
  return { id: result.goal.id };
}

/**
 * Edit a goal. The number to track is the delicate part: adding one starts it
 * at its starting value, taking it away also forgets the last check-in and deletes
 * the goal's whole check-in history (old readings never return under a new number), and
 * changing its unit, start or target keeps the current reading.
 */
export async function updateGoal(id: string, raw: unknown): Promise<GoalActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSED };

  const result = await updateGoalRow((goal) => mayEdit(goal, user), id, raw, householdToday(new Date())!);
  if ("error" in result) return { error: result.error };

  refreshPlansViews();
  return {};
}

/** One tap, no confirmation. Its plan items go with it; their habits stay, unlinked. A goal already gone is a success. */
export async function deleteGoal(id: string): Promise<GoalActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSED };

  const goal = await db.goal.findUnique({ where: { id }, select: { ownerId: true, visibility: true, area: true } });
  if (!goal) return {};
  if (!mayEdit(goal, user)) return { error: GOAL_NOT_ALLOWED };

  try {
    await db.goal.delete({ where: { id } });
  } catch (error) {
    if (!isMissingRowError(error)) throw error;
  }

  refreshPlansViews();
  return {};
}

async function setCompleted(id: string, done: boolean): Promise<GoalActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSED };

  const result = await setGoalCompleted((goal) => mayEdit(goal, user), id, done);
  if ("error" in result) return { error: result.error };

  refreshPlansViews();
  return {};
}

export async function completeGoal(id: string): Promise<GoalActionResult> {
  return setCompleted(id, true);
}

export async function uncompleteGoal(id: string): Promise<GoalActionResult> {
  return setCompleted(id, false);
}

/** Record where the goal's number stands now. Only a goal with a number to track can be checked in. */
export async function checkInGoal(id: string, value: unknown): Promise<GoalActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSED };

  const result = await addCheckIn((goal) => mayEdit(goal, user), id, value, user.userId);
  if ("error" in result) return { error: result.error };

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

  const result = await removeCheckIn((_checkIn, goal) => (mayEdit(goal, user) ? null : missing(GOAL_NOT_ALLOWED)), id);
  if ("error" in result) return { error: result.error };
  if (result.removed === null) return {};

  refreshPlansViews();
  return {};
}
