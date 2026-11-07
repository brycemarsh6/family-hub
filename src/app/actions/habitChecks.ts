"use server";

// The Today list's taps: check, uncheck, skip and unskip. Split from
// habits.ts (the editor's writes) to keep both under the line cap. Same guard
// order in every action: session, the habit's row, then `canLogFor` (yourself,
// the tablet for any participant, a parent or admin for anyone), then the
// day. A missing habit and a refused one answer the same words. The tablet
// may check but never edit. "Today" is the server's (Denver); a client `day`
// is accepted only from the last seven days up to today, never the future,
// plus the one older day a carried-over row stands for (up to 14 days back).

import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { canLogFor } from "@/lib/habits/access";
import { HABIT_NOT_FOUND, tapCheck, tapSkip, tapUncheck } from "@/lib/habitTapWrites";
import { parseDateParam, type CalendarDate } from "@/lib/householdDate";
import type { HabitActionResult } from "./habits";

const NOT_FOUND = HABIT_NOT_FOUND;

/** The day a tap is for: none given means today (the module's default), else a `YYYY-MM-DD` that is a real day (`null` when it is not; the module judges the rest). */
function tapDay(raw: string | undefined): CalendarDate | null | undefined {
  if (raw === undefined) return undefined;
  return typeof raw === "string" ? parseDateParam(raw) : null;
}

function done(): HabitActionResult {
  revalidatePath("/habits", "layout");
  revalidatePath("/");
  revalidatePath("/plans", "layout");
  return {};
}

/** Tick a habit for you (or `forUserId`) on today (or a day in the last week). A carried day is written "late". */
export async function checkHabit(habitId: string, forUserId?: string, day?: string): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (typeof habitId !== "string" || (forUserId !== undefined && typeof forUserId !== "string")) return { error: NOT_FOUND };
  try {
    const result = await tapCheck(
      (h) => canLogFor({ userId: user.userId, role: user.role }, forUserId ?? user.userId, h),
      { habitId, forUserId: forUserId ?? user.userId, day: tapDay(day), loggedById: user.userId },
      householdToday(new Date())!,
    );
    if ("error" in result) return { error: result.error };
    return done();
  } catch (err) {
    console.error("checkHabit failed", err);
    return { error: "Couldn't save the check. Try again." };
  }
}

/** Skip the day (same day rules as `checkHabit`). A day that already has a check or skip is left alone. */
export async function skipHabit(habitId: string, forUserId?: string, day?: string): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (typeof habitId !== "string" || (forUserId !== undefined && typeof forUserId !== "string")) return { error: NOT_FOUND };
  try {
    const result = await tapSkip(
      (h) => canLogFor({ userId: user.userId, role: user.role }, forUserId ?? user.userId, h),
      { habitId, forUserId: forUserId ?? user.userId, day: tapDay(day), loggedById: user.userId },
      householdToday(new Date())!,
    );
    if ("error" in result) return { error: result.error };
    return done();
  } catch (err) {
    console.error("skipHabit failed", err);
    return { error: "Couldn't skip it. Try again." };
  }
}

/** Remove one kind of row ("check" = done or late, "skip" = skipped) for the day; any other row is left alone. */
async function removeRow(kind: "check" | "skip", habitId: string, forUserId?: string, day?: string): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (typeof habitId !== "string" || (forUserId !== undefined && typeof forUserId !== "string")) return { error: NOT_FOUND };
  try {
    const result = await tapUncheck(
      kind,
      (h) => canLogFor({ userId: user.userId, role: user.role }, forUserId ?? user.userId, h),
      { habitId, forUserId: forUserId ?? user.userId, day: tapDay(day) },
      householdToday(new Date())!,
    );
    if ("error" in result) return { error: result.error };
    return done();
  } catch (err) {
    console.error(`un${kind} failed`, err);
    return { error: "Couldn't undo it. Try again." };
  }
}

/** Undo a check (done or late); a skip on that day stays. */
export async function uncheckHabit(habitId: string, forUserId?: string, day?: string): Promise<HabitActionResult> {
  return removeRow("check", habitId, forUserId, day);
}

/** Undo a skip (it calls the uncheck writer on a skipped row); a check on that day stays. */
export async function unskipHabit(habitId: string, forUserId?: string, day?: string): Promise<HabitActionResult> {
  return removeRow("skip", habitId, forUserId, day);
}
