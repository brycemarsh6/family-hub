"use server";

// The Chore chart's writes (decisions 116, 117, 118): adding a chore under a
// day of someone's Default week, and this week's move, skip and undo. Guard
// order in every action: session, the tablet refused, the row (the person for
// Add, the chore for the three changes), then the policy (`canEditChart` for
// Add, `canChangeChore` for the three changes: you, a parent or admin for
// anyone, a kid only themselves and not on a shared chore), then the fields. A
// missing row and a refused one answer the same words. Server Actions are
// public POST endpoints: nothing here trusts the page that rendered them.

import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { canChangeChore, canEditChart } from "@/lib/habits/access";
import {
  clearChoreChange as clearChoreChangeRow,
  moveChoreThisWeek as moveChoreRow,
  skipChoreThisWeek as skipChoreRow,
  type ChoreChangeResult,
} from "@/lib/habits/choreWrites";
import { createHabit as createHabitRow } from "@/lib/habits/habitWrites";
import { householdParticipantIds } from "@/lib/habits/participantWrites";
import { HABIT_TITLE_MAX, isWeekday, printWeekdayMask } from "@/lib/habitVocabulary";
import { loadHabitForAction } from "@/lib/habitsRead";
import type { HabitActionResult } from "./habits";

const NOT_SIGNED_IN = "Not signed in.";
const DEVICE_REFUSAL = "The tablet can't change chores.";
const NOT_FOUND = "That chore isn't available.";

function revalidateChart() {
  revalidatePath("/habits", "layout");
  revalidatePath("/settings");
}

/** Add a chore on one weekday of `personId`'s Default week (decision 116): Certain days, Anytime, carry over off, default icon, Side by side, not private. */
export async function addChartChore(personId: string, weekday: number, name: string): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSAL };
  if (typeof personId !== "string" || !(await householdParticipantIds()).includes(personId)) return { error: NOT_FOUND };
  if (!canEditChart({ userId: user.userId, role: user.role }, personId)) return { error: NOT_FOUND };
  const title = typeof name === "string" ? name.trim() : "";
  if (!title) return { error: "Give it a name." };
  if (title.length > HABIT_TITLE_MAX) return { error: `Keep the name to ${HABIT_TITLE_MAX} letters or fewer.` };
  if (!isWeekday(weekday)) return { error: "Pick a day." };
  try {
    const habit = await createHabitRow({
      fields: {
        title,
        kind: "chore",
        mode: "build",
        icon: null,
        lifeArea: null,
        timeOfDay: null,
        schedule: "weekdays",
        weekdays: printWeekdayMask([weekday]),
        times: null,
        anchorWeek: null,
        carryOver: false,
        sharing: "each",
        isPrivate: false,
        createdById: user.userId,
      },
      participantIds: [personId],
      today: householdToday(new Date())!,
    });
    revalidateChart();
    return { id: habit.id };
  } catch (err) {
    console.error("addChartChore failed", err);
    return { error: "Couldn't save it. Try again." };
  }
}

/** Session, device, the chore's row, then `canChangeChore` (the person holds it, the viewer sees it and may edit their chart, and a shared chore is a parent's, decision 125); the fields are the writer's. */
async function guardedChange(personId: string, habitId: string, change: () => Promise<ChoreChangeResult>): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSAL };
  if (typeof personId !== "string" || typeof habitId !== "string") return { error: NOT_FOUND };
  const habit = await loadHabitForAction(habitId);
  const actor = { userId: user.userId, role: user.role };
  if (!habit || !canChangeChore(actor, habit, personId)) return { error: NOT_FOUND };
  try {
    const result = await change();
    if (!result.ok) return { error: result.error };
    revalidateChart();
    return { id: habitId };
  } catch (err) {
    console.error("choreChart change failed", err);
    return { error: "Couldn't save it. Try again." };
  }
}

/** Move one day of a chore to a later day this week (today or after), this week only (decision 117). */
export async function moveChoreThisWeek(personId: string, habitId: string, fromWeekday: number, toWeekday: number): Promise<HabitActionResult> {
  return guardedChange(personId, habitId, () => moveChoreRow(habitId, fromWeekday, toWeekday, householdToday(new Date())!));
}

/** Skip one day of a chore this week: excused, the streak survives. */
export async function skipChoreThisWeek(personId: string, habitId: string, fromWeekday: number): Promise<HabitActionResult> {
  return guardedChange(personId, habitId, () => skipChoreRow(habitId, fromWeekday, householdToday(new Date())!));
}

/** "Back to the default": drop this week's change to that day. */
export async function clearChoreChange(personId: string, habitId: string, fromWeekday: number): Promise<HabitActionResult> {
  return guardedChange(personId, habitId, () => clearChoreChangeRow(habitId, fromWeekday, householdToday(new Date())!));
}
