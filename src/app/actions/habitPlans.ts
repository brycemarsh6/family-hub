"use server";

// The plan-the-day action (decisions 36 to 38, 141 to 144). Same guard order
// as the taps: session, the habit's row, `canLogFor` (you plan for yourself;
// a Together habit fans out to everyone on it in the writer), then the day:
// an open habit that is not archived, and a day that is today or later and
// inside the habit's current week or month (`isPlannableDay`). A missing
// habit and a refused one answer the same words. "Today" is the server's (Denver).

import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { canLogFor } from "@/lib/habits/access";
import { isPlannableDay } from "@/lib/habits/planPrompts";
import { planHabitDay as planHabitDayRow } from "@/lib/habits/planWrites";
import { parseDateParam } from "@/lib/householdDate";
import { loadHabitForAction } from "@/lib/habitsRead";
import type { HabitActionResult } from "./habits";

const NOT_FOUND = "That habit isn't available.";

/** Plan `day` (`YYYY-MM-DD`) for a habit you are on. Guards: session, the habit's row, `canLogFor`, then the day rules. */
export async function planHabitDay(habitId: string, day: string): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (typeof habitId !== "string" || typeof day !== "string") return { error: NOT_FOUND };
  const habit = await loadHabitForAction(habitId);
  if (!habit || !canLogFor({ userId: user.userId, role: user.role }, user.userId, habit)) return { error: NOT_FOUND };
  if (habit.archived) return { error: "That habit is archived." };
  const planned = parseDateParam(day);
  const today = householdToday(new Date())!;
  if (!planned || !habit.spec || !isPlannableDay(habit.spec, today, planned)) return { error: "That day can't be planned." };
  try {
    await planHabitDayRow({ habitId, forUserId: user.userId, day: planned });
    revalidatePath("/");
    revalidatePath("/habits", "layout");
    revalidatePath("/calendar");
    return {};
  } catch (err) {
    console.error("planHabitDay failed", err);
    return { error: "Couldn't save that day. Try again." };
  }
}
