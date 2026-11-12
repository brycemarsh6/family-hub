"use client";

import { useRef, useState } from "react";

// Mission 74: the one bar on the Calendar (UndoBar's props), moved out of
// useEventMoves so a completed task can raise it too. CalendarViews calls
// `useUndoBar()` once, mounts the single <UndoBar>, and hands `showBar` and
// `closeBar` to whoever has something to undo (the event moves, and both
// TaskDetailSheet mounts through `showTaskCompleted`).

/** The one bar on screen (UndoBar's props). A new `id` replaces the old bar. */
export type UndoBarState = {
  id: number;
  message: string;
  tone: "neutral" | "warn";
  actionLabel?: string;
  onAction?: () => void;
};

export type ShowBar = (next: Omit<UndoBarState, "id">) => void;

export function useUndoBar() {
  const [bar, setBar] = useState<UndoBarState | null>(null);
  const barId = useRef(0);

  // A new id each time, so a new message replaces the old and restarts the 5 seconds.
  function showBar(next: Omit<UndoBarState, "id">) {
    barId.current += 1;
    setBar({ ...next, id: barId.current });
  }

  return { bar, showBar, closeBar: () => setBar(null) };
}

/** What `showTaskCompleted` needs. The action and the setter come in as arguments, like `useEventMoves`'s actions, so this file never imports from `app/`. */
export type TaskCompletedBar = {
  showBar: ShowBar;
  closeBar: () => void;
  taskId: string;
  /** When the tick happened, put back if an Undo is refused or fails. */
  completedAt: Date;
  /** Redraws the task from the server. */
  refresh: () => void;
  /** The server action behind the sheet's "Mark not complete" (CalendarViews hands in `uncompleteTask`). */
  uncomplete: (taskId: string) => Promise<{ error?: string }>;
  /** The optimistic tick (taskDoneOverrides.ts): a Date draws it done, null not done. */
  setDone: (taskId: string, completedAt: Date | null) => void;
};

/**
 * The bar after "Mark complete": "Task completed" with Undo. Undo un-ticks the
 * task at once, then calls `uncomplete` (the server decides who may: parents
 * any time, a person on the task within 60 seconds, src/lib/taskUndoRules.ts)
 * and `refresh()` redraws it. A refusal or a thrown error puts the tick back
 * and shows a warn bar. No new bar follows a successful Undo.
 */
export function showTaskCompleted({ showBar, closeBar, taskId, completedAt, refresh, uncomplete, setDone }: TaskCompletedBar) {
  showBar({
    message: "Task completed",
    tone: "neutral",
    actionLabel: "Undo",
    onAction: () => {
      closeBar();
      setDone(taskId, null);
      const putBack = (message: string) => {
        setDone(taskId, completedAt);
        showBar({ message, tone: "warn" });
      };
      uncomplete(taskId).then(
        (result) => (result.error ? putBack(result.error) : refresh()),
        () => putBack("Couldn't undo. Try again."),
      );
    },
  });
}
