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
import { HABIT_NOT_FOUND, logHours, removeHours } from "@/lib/habitTapWrites";
import { parseDateParam } from "@/lib/householdDate";
import { missing } from "@/lib/writeError";
import type { HabitActionResult } from "./habits";

const NOT_FOUND = HABIT_NOT_FOUND;
const NOT_SIGNED_IN = "Not signed in.";

function done(): HabitActionResult {
  revalidatePath("/habits", "layout");
  revalidatePath("/");
  revalidatePath("/plans", "layout");
  return {};
}

/** Log time for you (or `forUserId`) on a day in the last week up to today. Several entries may share a day. */
export async function addHabitTime(habitId: string, forUserId: string, dayIso: string, minutes: number): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (typeof habitId !== "string" || typeof forUserId !== "string") return { error: NOT_FOUND };
  try {
    const result = await logHours(
      (h) => canLogFor({ userId: user.userId, role: user.role }, forUserId, h),
      { habitId, forUserId, day: typeof dayIso === "string" ? parseDateParam(dayIso) : null, minutes, loggedById: user.userId },
      householdToday(new Date())!,
    );
    if ("error" in result) return { error: result.error };
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
    const result = await removeHours(
      (entry, habit) => (canLogFor({ userId: user.userId, role: user.role }, entry.userId, habit) ? null : missing(HABIT_NOT_FOUND)),
      entryId,
      householdToday(new Date())!,
    );
    if ("error" in result) return { error: result.error };
    return done();
  } catch (err) {
    console.error("removeHabitTime failed", err);
    return { error: "Couldn't remove it. Try again." };
  }
}
