"use server";

// The Today list's taps: check, uncheck, skip and unskip. Split from
// habits.ts (the editor's writes) to keep both under the line cap. Same guard
// order in every action: session, the habit's row, then `canLogFor` (yourself,
// the tablet for any participant, a parent or admin for anyone), then the
// day. A missing habit and a refused one answer the same words. The tablet
// may check but never edit. "Today" is the server's (Denver); a client `day`
// is accepted only from the last seven days up to today, never the future.

import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { canLogFor } from "@/lib/habits/access";
import { statusForTap } from "@/lib/habits/carryOver";
import {
  checkHabit as checkHabitRow,
  skipHabit as skipHabitRow,
  uncheckHabit as uncheckHabitRow,
} from "@/lib/habits/habitWrites";
import { calendarDaysBetween, parseDateParam, type CalendarDate } from "@/lib/householdDate";
import { loadCarriedDay, loadHabitForAction, loadLogStatus, type HabitForAction } from "@/lib/habitsRead";
import type { HabitActionResult } from "./habits";

const NOT_FOUND = "That habit isn't available.";
const MAX_DAYS_BACK = 7;

type Target = { userId: string; habit: HabitForAction; forUserId: string; day: CalendarDate; today: CalendarDate };

/** The day a tap is for: today when none given, else a `YYYY-MM-DD` in the last seven days, never ahead of today. */
function tapDay(raw: string | undefined, today: CalendarDate): CalendarDate | null {
  if (raw === undefined) return today;
  const day = typeof raw === "string" ? parseDateParam(raw) : null;
  if (!day) return null;
  const ago = calendarDaysBetween(day, today);
  return ago >= 0 && ago <= MAX_DAYS_BACK ? day : null;
}

/** Session, row, `canLogFor`, then the day: the one guard behind all four taps. */
async function guardedTap(habitId: string, forUserId: string | undefined, rawDay: string | undefined): Promise<Target | { error: string }> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (typeof habitId !== "string" || (forUserId !== undefined && typeof forUserId !== "string")) return { error: NOT_FOUND };
  const habit = await loadHabitForAction(habitId);
  const target = forUserId ?? user.userId;
  if (!habit || !canLogFor({ userId: user.userId, role: user.role }, target, habit)) return { error: NOT_FOUND };
  const today = householdToday(new Date())!;
  const day = tapDay(rawDay, today);
  if (!day) return { error: "That day can't be changed." };
  return { userId: user.userId, habit, forUserId: target, day, today };
}

function done(): HabitActionResult {
  revalidatePath("/habits", "layout");
  revalidatePath("/plans", "layout");
  return {};
}

/** Tick a habit for you (or `forUserId`) on today (or a day in the last week). A carried day is written "late". */
export async function checkHabit(habitId: string, forUserId?: string, day?: string): Promise<HabitActionResult> {
  const t = await guardedTap(habitId, forUserId, day);
  if ("error" in t) return t;
  if (t.habit.archived) return { error: "That habit is archived." };
  try {
    const carried = await loadCarriedDay(t.habit, habitId, t.forUserId, t.today);
    await checkHabitRow(
      { habitId, forUserId: t.forUserId, day: t.day, status: statusForTap(t.day, carried), loggedById: t.userId },
      t.today,
    );
    return done();
  } catch (err) {
    console.error("checkHabit failed", err);
    return { error: "Couldn't save the check. Try again." };
  }
}

/** Skip the day (same day rules as `checkHabit`). A day that already has a check or skip is left alone. */
export async function skipHabit(habitId: string, forUserId?: string, day?: string): Promise<HabitActionResult> {
  const t = await guardedTap(habitId, forUserId, day);
  if ("error" in t) return t;
  if (t.habit.archived) return { error: "That habit is archived." };
  try {
    await skipHabitRow({ habitId, forUserId: t.forUserId, day: t.day, loggedById: t.userId }, t.today);
    return done();
  } catch (err) {
    console.error("skipHabit failed", err);
    return { error: "Couldn't skip it. Try again." };
  }
}

/** Remove one kind of row ("check" = done or late, "skip" = skipped) for the day; any other row is left alone. */
async function removeRow(kind: "check" | "skip", habitId: string, forUserId?: string, day?: string): Promise<HabitActionResult> {
  const t = await guardedTap(habitId, forUserId, day);
  if ("error" in t) return t;
  try {
    const status = await loadLogStatus(habitId, t.forUserId, t.day);
    if (status === null || (status === "skipped") !== (kind === "skip")) return done();
    await uncheckHabitRow({ habitId, forUserId: t.forUserId, day: t.day }, t.today);
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
