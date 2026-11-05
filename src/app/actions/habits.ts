"use server";

// Habit actions that belong to no single page. Today that is one: the
// admin-only "Recompute streaks" button on /settings. It uses the
// null-returning guard (getVerifiedUser) and shows its refusal inline, since
// a thrown redirect would bounce the browser mid-click (STRUCTURE.md guard-form
// rule). The role is checked here, not trusted from the page: Server Actions
// are public POST endpoints.

import { getVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { recomputeAllStreaks } from "@/lib/habits/habitWrites";

export type RecomputeResult = { error?: string; updated?: number };

/** Rebuild every cached streak from the check history. Admins only. */
export async function recomputeStreaks(): Promise<RecomputeResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (user.role !== "admin") return { error: "Only an admin can recompute streaks." };

  try {
    const { updated } = await recomputeAllStreaks(householdToday(new Date())!);
    return { updated };
  } catch (err) {
    console.error("recomputeStreaks failed", err);
    return { error: "Couldn't recompute streaks. Try again." };
  }
}
