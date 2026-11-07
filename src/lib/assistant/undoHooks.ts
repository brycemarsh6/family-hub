import "server-only";

// Work undo does after its steps, inside the same transaction. Habit streaks
// are caches (VOLATILE in undoModels.ts): undo does not restore them, it
// rebuilds them from the logs that are left. Without this, undoing a check
// deletes the log row but leaves the cached flame one too high.

import type { Prisma } from "@/generated/prisma/client";
import { recomputeHabit, recomputeStreaks } from "@/lib/habits/streakWrites";
import { householdToday } from "./today";
import { streakWork, type UndoStep } from "./undoPlan";

export async function afterUndo(
  tx: Prisma.TransactionClient,
  steps: readonly UndoStep[],
  now: Date,
): Promise<void> {
  const today = householdToday(now);
  if (!today) return;
  const { users, habits } = streakWork(steps);
  for (const [habitId, userIds] of users) {
    await recomputeStreaks(habitId, userIds, today, tx); // {} when the habit is gone
  }
  for (const habitId of habits) await recomputeHabit(tx, habitId, today);
}
