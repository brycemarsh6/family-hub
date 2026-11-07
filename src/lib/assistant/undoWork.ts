// Pure grouping of what undo must rebuild afterwards (no database): habit
// streaks (mission 47) and goal numbers (mission 50). undoHooks.ts runs it.

import type { UndoStep } from "./undoPlan";

const PER_PERSON = new Set(["HabitParticipant", "HabitLog", "HabitTimeEntry"]);

/**
 * From the steps: which people on which habit had a row touched (read from
 * whichever copy exists), and which habits were themselves restored or
 * re-created (their schedule may have changed, so everyone is rebuilt). A
 * removed habit is left out: there is nothing to rebuild. `choreUsers` is
 * everyone named by any of those rows, habit existing or not: a chore's
 * streak lives on the person (`UserPreferences`), so it is rebuilt for them
 * even when the chore itself was just undone out of existence.
 */
export function streakWork(steps: readonly UndoStep[]): {
  users: Map<string, string[]>;
  habits: string[];
  choreUsers: string[];
} {
  const users = new Map<string, Set<string>>();
  const habits = new Set<string>();
  const choreUsers = new Set<string>();
  for (const step of steps) {
    if (step.model === "Habit") {
      if (step.kind !== "remove") habits.add(step.recordId);
    } else if (PER_PERSON.has(step.model)) {
      for (const copy of [step.before, step.after]) {
        if (!copy) continue;
        const { habitId, userId } = copy;
        if (typeof habitId !== "string" || typeof userId !== "string") continue;
        choreUsers.add(userId);
        users.set(habitId, (users.get(habitId) ?? new Set()).add(userId));
      }
    }
  }
  return {
    users: new Map([...users].map(([habitId, ids]) => [habitId, [...ids].sort()])),
    habits: [...habits].sort(),
    choreUsers: [...choreUsers].sort(),
  };
}

/**
 * Goals whose number cache (`currentValue`, `checkedInAt`) must be rebuilt:
 * every goal named by a Goal step or a check-in step (read from whichever copy
 * exists), except a goal the plan removes. The hook still skips any that are
 * gone from the database.
 */
export function goalWork(steps: readonly UndoStep[]): string[] {
  const goals = new Set<string>();
  const removed = new Set<string>();
  for (const step of steps) {
    if (step.model === "Goal") {
      (step.kind === "remove" ? removed : goals).add(step.recordId);
    } else if (step.model === "GoalCheckIn") {
      for (const copy of [step.before, step.after]) {
        if (typeof copy?.goalId === "string") goals.add(copy.goalId);
      }
    }
  }
  return [...goals].filter((id) => !removed.has(id)).sort();
}
