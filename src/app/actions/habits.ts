"use server";

// Habit actions that belong to no single page: the admin-only "Recompute
// streaks" button on /settings, and the habit editor's writes (create, update,
// archive, restore, delete, reorder). The checks on Today live in
// habitChecks.ts. Every action uses the null-returning guard
// (getVerifiedUser) and shows its refusal inline, since a thrown redirect
// would bounce the browser mid-click (STRUCTURE.md guard-form rule). Guard
// order is always: session, then the habit's row (so the policy has facts to
// read), then the policy (`access.ts`), then the fields. A missing habit and
// a refused one answer the same words, so a private habit's existence is not
// confirmed to someone who may not see it. Server Actions are public POST
// endpoints: nothing here trusts the page that rendered the button.

import { revalidatePath } from "next/cache";
import { getVerifiedUser, type VerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { canEditHabit } from "@/lib/habits/access";
import { INCLUDE_YOURSELF, checkHabitInput, type HabitInput } from "@/lib/habitInput";
import {
  archiveHabit as archiveHabitRow,
  createHabit as createHabitRow,
  deleteHabit as deleteHabitRow,
  restoreHabit as restoreHabitRow,
  updateHabit as updateHabitRow,
} from "@/lib/habits/habitWrites";
import { recomputeAllStreaks as rebuildAllStreaks } from "@/lib/habits/streakWrites";
import { householdParticipantIds, reorderHabits as reorderHabitRows } from "@/lib/habits/participantWrites";
import { loadHabitForAction } from "@/lib/habitsRead";

export type RecomputeResult = { error?: string; habits?: number };

/** What every habit action answers: an `error` to show inline, or success (with the new habit's `id` on create). */
export type HabitActionResult = { error?: string; id?: string };

const MAX_REORDER_IDS = 500;
const NOT_FOUND = "That habit isn't available.";
const NOT_SIGNED_IN = "Not signed in.";
const DEVICE_REFUSAL = "The tablet can't change habits.";

function revalidateHabits() {
  revalidatePath("/habits", "layout");
  revalidatePath("/plans", "layout");
}

/** Rebuild every cached streak from the check history. Admins only. */
export async function recomputeAllStreaks(): Promise<RecomputeResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.role !== "admin") return { error: "Only an admin can recompute streaks." };

  try {
    const { habits } = await rebuildAllStreaks(householdToday(new Date())!);
    return { habits };
  } catch (err) {
    console.error("recomputeAllStreaks failed", err);
    return { error: "Couldn't recompute streaks. Try again." };
  }
}

/** Whether this signed-in person could still edit the habit once it holds exactly `participantIds`. */
function mayEditResult(user: VerifiedUser, isPrivate: boolean, participantIds: readonly string[]): boolean {
  return canEditHabit({ userId: user.userId, role: user.role }, { isPrivate, participantIds });
}

/** Make a habit or chore. Guards: session, the tablet refused, fields, then you may edit what you'd make. */
export async function createHabit(input: HabitInput): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSAL };
  const checked = checkHabitInput(input, await householdParticipantIds());
  if ("error" in checked) return checked;
  if (!mayEditResult(user, checked.fields.isPrivate ?? false, checked.participantIds)) {
    return { error: INCLUDE_YOURSELF };
  }
  try {
    const habit = await createHabitRow({
      fields: { ...checked.fields, createdById: user.userId },
      participantIds: checked.participantIds,
      everyone: checked.everyone,
      today: householdToday(new Date())!,
    });
    revalidateHabits();
    return { id: habit.id };
  } catch (err) {
    console.error("createHabit failed", err);
    return { error: "Couldn't save it. Try again." };
  }
}

/** Save the editor. Guards: session, the habit's row, edit policy on it, fields, then edit policy on the result. */
export async function updateHabit(habitId: string, input: HabitInput): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (typeof habitId !== "string") return { error: NOT_FOUND };
  const habit = await loadHabitForAction(habitId);
  if (!habit || !mayEditResult(user, habit.isPrivate, habit.participantIds)) return { error: NOT_FOUND };
  const checked = checkHabitInput(input, await householdParticipantIds(), habit.participantIds);
  if ("error" in checked) return checked;
  if (!mayEditResult(user, checked.fields.isPrivate ?? false, checked.participantIds)) {
    return { error: INCLUDE_YOURSELF };
  }
  try {
    const { fields, participantIds, everyone } = checked;
    const updated = await updateHabitRow(habitId, fields, householdToday(new Date())!, undefined, { participantIds, everyone });
    if (!updated) return { error: NOT_FOUND };
    revalidateHabits();
    return { id: habitId };
  } catch (err) {
    console.error("updateHabit failed", err);
    return { error: "Couldn't save it. Try again." };
  }
}

/** The shared guard for archive, restore and delete: session, row, edit policy. */
async function guardedEdit(habitId: string): Promise<{ error: string } | null> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (typeof habitId !== "string") return { error: NOT_FOUND };
  const habit = await loadHabitForAction(habitId);
  if (!habit || !mayEditResult(user, habit.isPrivate, habit.participantIds)) return { error: NOT_FOUND };
  return null;
}

/** Archive keeps its history and can be brought back. */
export async function archiveHabit(habitId: string): Promise<HabitActionResult> {
  const refused = await guardedEdit(habitId);
  if (refused) return refused;
  try {
    if (!(await archiveHabitRow(habitId, new Date(), householdToday(new Date())!))) return { error: NOT_FOUND };
    revalidateHabits();
    return { id: habitId };
  } catch (err) {
    console.error("archiveHabit failed", err);
    return { error: "Couldn't archive it. Try again." };
  }
}

/** Bring an archived habit back. */
export async function restoreHabit(habitId: string): Promise<HabitActionResult> {
  const refused = await guardedEdit(habitId);
  if (refused) return refused;
  try {
    if (!(await restoreHabitRow(habitId, householdToday(new Date())!))) return { error: NOT_FOUND };
    revalidateHabits();
    return { id: habitId };
  } catch (err) {
    console.error("restoreHabit failed", err);
    return { error: "Couldn't restore it. Try again." };
  }
}

/** Delete for good (one tap, no confirmation: the project rule), along with its history and plan items. */
export async function deleteHabit(habitId: string): Promise<HabitActionResult> {
  const refused = await guardedEdit(habitId);
  if (refused) return refused;
  try {
    const { deleted } = await deleteHabitRow(habitId, householdToday(new Date())!);
    if (!deleted) return { error: NOT_FOUND };
    revalidateHabits();
    return { id: habitId };
  } catch (err) {
    console.error("deleteHabit failed", err);
    return { error: "Couldn't delete it. Try again." };
  }
}

/**
 * Save the order of the signed-in person's own list. Guards: session, the
 * tablet refused (it holds no list), the ids as claims. The writer only ever
 * touches this person's own participant rows and ignores ids they are not in,
 * so there is no per-row policy to read.
 */
export async function reorderHabits(ids: string[]): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSAL };
  if (!Array.isArray(ids) || ids.length > MAX_REORDER_IDS || ids.some((id) => typeof id !== "string")) {
    return { error: "Couldn't save the order." };
  }
  try {
    await reorderHabitRows(user.userId, ids);
    revalidateHabits();
    return {};
  } catch (err) {
    console.error("reorderHabits failed", err);
    return { error: "Couldn't save the order. Try again." };
  }
}
