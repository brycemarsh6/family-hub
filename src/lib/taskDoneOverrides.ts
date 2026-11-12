// Mission 74 (F1): the optimistic half of "Task completed, Undo". A tick or an
// Undo flips the task on screen at once, before the server round trip lands
// (DESIGN.md "Instant feedback"). CalendarViews holds one map of these and
// every view draws its tasks through `applyTaskDone`. Pure, so it is tested
// without React (taskDoneOverrides.test.ts).

import type { CalendarTaskView } from "./types";

/** task id to the completion time to draw (a Date = done, null = not done). */
export type TaskDoneOverrides = ReadonlyMap<string, Date | null>;

/**
 * The tasks with each override's done state swapped in. Returns the SAME
 * array when no override changes a task, so memoised children skip a render.
 */
export function applyTaskDone(tasks: CalendarTaskView[], overrides: TaskDoneOverrides): CalendarTaskView[] {
  if (overrides.size === 0) return tasks;
  let changed = false;
  const next = tasks.map((task) => {
    if (!overrides.has(task.id)) return task;
    const completedAt = overrides.get(task.id) ?? null;
    if ((completedAt !== null) === (task.completedAt !== null)) return task;
    changed = true;
    return { ...task, completedAt };
  });
  return changed ? next : tasks;
}

/**
 * Drops each override once the server's task agrees on done / not done; keeps
 * it while they disagree or the task is not in `serverTasks`. Returns the SAME
 * map when nothing is dropped.
 */
export function pruneTaskDone(overrides: TaskDoneOverrides, serverTasks: CalendarTaskView[]): TaskDoneOverrides {
  if (overrides.size === 0) return overrides;
  const serverDone = new Map(serverTasks.map((task) => [task.id, task.completedAt !== null]));
  let next: Map<string, Date | null> | null = null;
  for (const [id, completedAt] of overrides) {
    if (serverDone.get(id) === (completedAt !== null)) {
      next ??= new Map(overrides);
      next.delete(id);
    }
  }
  return next ?? overrides;
}
