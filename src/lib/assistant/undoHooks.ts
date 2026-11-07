import "server-only";

// Work undo does after its steps, inside the same transaction. Habit streaks
// are caches (VOLATILE in undoModels.ts): undo does not restore them, it
// rebuilds them from the logs that are left. Without this, undoing a check
// deletes the log row but leaves the cached flame one too high. A chore's
// streak lives on the person (`UserPreferences`), so those are rebuilt too,
// for everyone the steps name and for everyone on a habit that was restored
// or re-created (a habit-to-chore edit undone changes no participant row).

import type { Prisma } from "@/generated/prisma/client";
import { recomputeChoreStreaks } from "@/lib/habits/choreWrites";
import { recomputeHabit, recomputeStreaks } from "@/lib/habits/streakWrites";
import { householdToday } from "./today";
import { rebuildGoalNumber } from "@/lib/goalWrites";
import type { UndoStep } from "./undoPlan";
import { goalWork, streakWork } from "./undoWork";

export async function afterUndo(
  tx: Prisma.TransactionClient,
  steps: readonly UndoStep[],
  now: Date,
): Promise<void> {
  // A goal's number mirrors its newest check-in (VOLATILE in undoModels.ts): rebuilt from the check-ins left,
  // keeping `updatedAt` so the goal still matches the copy the undo just logged.
  for (const goalId of goalWork(steps)) await rebuildGoalNumber(tx, goalId, { keepUpdatedAt: true });
  const today = householdToday(now);
  if (!today) return;
  const { users, habits, choreUsers } = streakWork(steps);
  for (const [habitId, userIds] of users) {
    await recomputeStreaks(habitId, userIds, today, tx); // {} when the habit is gone
  }
  for (const habitId of habits) await recomputeHabit(tx, habitId, today);
  const onRestored = habits.length === 0 ? [] : await tx.habitParticipant.findMany({ where: { habitId: { in: habits } }, select: { userId: true } });
  // Idempotent, so it runs every time rather than only when a chore is involved.
  await recomputeChoreStreaks([...new Set([...choreUsers, ...onRestored.map((p) => p.userId)])], today, tx);
}
