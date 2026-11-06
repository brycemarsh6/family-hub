"use server";

// The hours habit's two writes: add time and remove an entry (mission 37).
// Same guard order as the checks in habitChecks.ts: session, the habit's row,
// then `canLogFor` (yourself, the tablet for any participant, a parent or
// admin for anyone), then the day and the minutes. A missing habit and a
// refused one answer the same words. The day rule is a late check's: the last
// seven days up to today, never the future. Server Actions are public POST
// endpoints: nothing here trusts the page that rendered the sheet.

import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { canLogFor } from "@/lib/habits/access";
import { isTapDayAllowed } from "@/lib/habits/carryOver";
import { addHabitTime as addHabitTimeRow, removeHabitTime as removeHabitTimeRow } from "@/lib/habits/habitWrites";
import { HOURS_LIMITS } from "@/lib/habitHoursVocabulary";
import { parseDateParam } from "@/lib/householdDate";
import { loadHabitForAction, loadTimeEntryForAction } from "@/lib/habitsRead";
import type { HabitActionResult } from "./habits";

const NOT_FOUND = "That habit isn't available.";
const NOT_SIGNED_IN = "Not signed in.";

function done(): HabitActionResult {
  revalidatePath("/habits", "layout");
  revalidatePath("/");
  revalidatePath("/plans", "layout");
  return {};
}

/** Minutes the sheet could have sent: a whole multiple of the step, from the smallest entry to the largest. */
function validMinutes(minutes: unknown): minutes is number {
  const { entryStep, entryMin, entryMax } = HOURS_LIMITS;
  return typeof minutes === "number" && Number.isInteger(minutes) && minutes >= entryMin && minutes <= entryMax && minutes % entryStep === 0;
}

/** Log time for you (or `forUserId`) on a day in the last week up to today. Several entries may share a day. */
export async function addHabitTime(habitId: string, forUserId: string, dayIso: string, minutes: number): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (typeof habitId !== "string" || typeof forUserId !== "string") return { error: NOT_FOUND };
  const habit = await loadHabitForAction(habitId);
  if (!habit || !canLogFor({ userId: user.userId, role: user.role }, forUserId, habit)) return { error: NOT_FOUND };
  if (habit.archived) return { error: "That habit is archived." };
  if (!validMinutes(minutes)) return { error: "Pick a time from half an hour to 12 hours." };
  const today = householdToday(new Date())!;
  const day = typeof dayIso === "string" ? parseDateParam(dayIso) : null;
  if (!day || !isTapDayAllowed(day, today, null)) return { error: "Pick a day from the last week." };
  try {
    const entry = await addHabitTimeRow({ habitId, userId: forUserId, day, minutes, loggedById: user.userId }, today);
    if (!entry) return { error: "That habit doesn't track hours." };
    return done();
  } catch (err) {
    console.error("addHabitTime failed", err);
    return { error: "Couldn't save the time. Try again." };
  }
}

/** Take one entry back (one tap, no confirmation). Allowed for an entry on a habit the viewer may log for. An entry already gone is a success. */
export async function removeHabitTime(entryId: string): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (typeof entryId !== "string") return { error: NOT_FOUND };
  try {
    const entry = await loadTimeEntryForAction(entryId);
    if (!entry) return {};
    const habit = await loadHabitForAction(entry.habitId);
    if (!habit || !canLogFor({ userId: user.userId, role: user.role }, entry.userId, habit)) return { error: NOT_FOUND };
    await removeHabitTimeRow(entryId, householdToday(new Date())!);
    return done();
  } catch (err) {
    console.error("removeHabitTime failed", err);
    return { error: "Couldn't remove it. Try again." };
  }
}
