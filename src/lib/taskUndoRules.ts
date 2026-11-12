// Who may un-complete a task, mission 74 (calendar-fullscreen-v1 decision 10,
// answer 3). Parents any time; a person on the task, or the kitchen tablet,
// only for a short window after the completion, so an accidental tap can be
// undone without a kid being able to quietly reopen old work.
//
// Pure functions over plain values, so they are unit-tested without a
// database (taskUndoRules.test.ts). They live here, not in actions/tasks.ts,
// because an action file may export only async functions.

import { MANAGER_ROLES, type Role } from "./constants";
import { tabletMayCompleteAnyTask } from "./tabletRules";

/** How long after completing a task the person on it may still undo it. */
export const TASK_UNDO_WINDOW_MS = 60_000;

export const NOT_ON_TASK = "You're not assigned to that task.";
export const TOO_LATE_TO_UNDO =
  "Too late to undo. Ask a parent to mark it not complete.";

/**
 * Why this person may not un-complete the task, or null when they may.
 * A completedAt in the future (clock skew) counts as inside the window.
 */
export function uncompleteRefusal({
  role,
  isOnTask,
  completedAt,
  now,
}: {
  role: Role;
  isOnTask: boolean;
  completedAt: Date | null;
  now: Date;
}): string | null {
  if (MANAGER_ROLES.includes(role)) return null;
  if (completedAt === null) return null;

  const withinWindow = now.getTime() - completedAt.getTime() <= TASK_UNDO_WINDOW_MS;
  if (tabletMayCompleteAnyTask(role)) {
    return withinWindow ? null : TOO_LATE_TO_UNDO;
  }
  if (!isOnTask) return NOT_ON_TASK;
  return withinWindow ? null : TOO_LATE_TO_UNDO;
}

/** What the task sheet draws: may this person mark the task complete? */
export function mayCompleteTask({
  canManage,
  isMine,
  isTablet,
}: {
  canManage: boolean;
  isMine: boolean;
  isTablet: boolean;
}): boolean {
  return canManage || isMine || isTablet;
}
