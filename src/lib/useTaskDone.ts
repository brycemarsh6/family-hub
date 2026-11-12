"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { showTaskCompleted, type ShowBar } from "@/lib/useUndoBar";
import { applyTaskDone, pruneTaskDone, pruneTaskDoneByState, type TaskDoneOverrides } from "@/lib/taskDoneOverrides";
import type { CalendarTaskView } from "@/lib/types";

/** What `useTaskDone` needs from the page's one `useUndoBar`, plus the action (a `src/lib/` file never imports from `app/`). */
type TaskDoneDeps = {
  showBar: ShowBar;
  closeBar: () => void;
  /** The server action behind "Mark not complete" (`uncompleteTask`). */
  uncomplete: (taskId: string) => Promise<{ error?: string }>;
};

/**
 * Mission 75 (C1): the optimistic task tick and the "Task completed, Undo" bar,
 * moved out of `CalendarViews.tsx` (mission 74) so the search page reuses them
 * with its own single bar. A tick or an Undo shows at once (`taskDone`,
 * taskDoneOverrides.ts) and is dropped once a fresh `serverTasks` agrees.
 */
export function useTaskDone(serverTasks: CalendarTaskView[], { showBar, closeBar, uncomplete }: TaskDoneDeps) {
  // Mission 74 (F3): which task the bar on screen is "Task completed" for (null = some other bar),
  // so the sheet's other changes can close exactly that bar and never a move's.
  const taskBarFor = useRef<string | null>(null);
  const showMoveBar: ShowBar = (next) => {
    taskBarFor.current = null;
    showBar(next);
  };
  const [taskDone, setTaskDone] = useState<TaskDoneOverrides>(new Map());
  const [seenTasks, setSeenTasks] = useState(serverTasks);
  if (seenTasks !== serverTasks) {
    setSeenTasks(serverTasks);
    setTaskDone(pruneTaskDone(taskDone, serverTasks));
  }
  const tasks = useMemo(() => applyTaskDone(serverTasks, taskDone), [serverTasks, taskDone]);
  const applyDone = useMemo(() => (list: CalendarTaskView[]) => applyTaskDone(list, taskDone), [taskDone]);
  const setDone = (taskId: string, completedAt: Date | null) => setTaskDone((prev) => new Map(prev).set(taskId, completedAt));
  // Any other change to a task (Mark not complete, Edit, Delete) drops its tick so the server's answer shows.
  // Absent key: the same map back, so no state change and no re-render.
  const clearTaskDone = (taskId: string) => {
    if (taskBarFor.current === taskId) {
      taskBarFor.current = null;
      closeBar();
    }
    setTaskDone((prev) => {
      if (!prev.has(taskId)) return prev;
      const next = new Map(prev);
      next.delete(taskId);
      return next;
    });
  };
  // Schedule's own fetched rows are a second server answer (it reaches past the page's window):
  // it hands their done states here (only when those change) so an override they agree with drops.
  const pruneTaskDoneWith = useCallback((done: ReadonlyMap<string, boolean>) => setTaskDone((prev) => pruneTaskDoneByState(prev, done)), []);
  // Every task sheet mount raises "Task completed, Undo" on the one bar.
  const onTaskCompleted = (taskId: string, refresh: () => void) => {
    const completedAt = new Date();
    setDone(taskId, completedAt);
    showTaskCompleted({ showBar, closeBar, taskId, refresh, uncomplete, setDone, clearDone: clearTaskDone });
    taskBarFor.current = taskId;
  };

  return { tasks, applyDone, clearTaskDone, pruneTaskDoneWith, onTaskCompleted, showMoveBar };
}
