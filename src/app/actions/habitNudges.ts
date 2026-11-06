"use server";

// The nudge actions (decisions 96 and 97). Same guard order as the taps:
// session, the habit's row, the policy (`canNudge`: never the tablet; sender
// and recipient both on a Side by side habit that is not private or archived, the recipient not deactivated),
// then the fields (the recipient has not finished today). A missing habit and a refused one answer the same words.
// "Today" is the server's (Denver). A nudge that already exists answers success.

import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { canNudge } from "@/lib/habits/access";
import { createNudge, markNudgeSeen as markNudgeSeenRow } from "@/lib/habits/nudgeWrites";
import { loadHabitForAction, loadLogStatus } from "@/lib/habitsRead";
import type { HabitActionResult } from "./habits";

const NOT_FOUND = "That habit isn't available.";

function done(): HabitActionResult {
  revalidatePath("/habits", "layout");
  revalidatePath("/");
  return {};
}

/** Nudge `toUserId` about a habit you share. Guards: session, the habit's row, policy (`canNudge`), then they have not finished today. */
export async function nudge(habitId: string, toUserId: string): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (typeof habitId !== "string" || typeof toUserId !== "string") return { error: NOT_FOUND };
  const habit = await loadHabitForAction(habitId);
  if (!habit) return { error: NOT_FOUND };
  if (!canNudge({ userId: user.userId, role: user.role }, habit, toUserId)) return { error: NOT_FOUND };
  const today = householdToday(new Date())!;
  // Any check on today (done, late or skipped) means they have finished it.
  if ((await loadLogStatus(habitId, toUserId, today)) !== null) return { error: "They've already finished it today." };
  try {
    await createNudge({ habitId, fromUserId: user.userId, toUserId, day: today });
    return done();
  } catch (err) {
    console.error("nudge failed", err);
    return { error: "Couldn't send the nudge. Try again." };
  }
}

/** Mark one of your own nudge cards "Got it". Guards: session, then the id; the write only touches a nudge sent to you. */
export async function markNudgeSeen(nudgeId: string): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (typeof nudgeId !== "string") return { error: "That note isn't available." };
  try {
    await markNudgeSeenRow(nudgeId, user.userId);
    return done();
  } catch (err) {
    console.error("markNudgeSeen failed", err);
    return { error: "Couldn't save that. Try again." };
  }
}
