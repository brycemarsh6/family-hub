"use client";

import { useRef, useState } from "react";
import { uncompleteTask } from "@/app/actions/tasks";

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

/**
 * The bar after "Mark complete": "Task completed" with Undo. Undo calls the
 * same `uncompleteTask` action as the sheet's "Mark not complete" (the server
 * decides who may: parents any time, a person on the task within 60 seconds,
 * src/lib/taskUndoRules.ts), then `refresh()` redraws the task. A refusal
 * shows its reason in a warn bar. No new bar follows a successful Undo.
 */
export function showTaskCompleted(showBar: ShowBar, closeBar: () => void, taskId: string, refresh: () => void) {
  showBar({
    message: "Task completed",
    tone: "neutral",
    actionLabel: "Undo",
    onAction: () => {
      closeBar();
      void uncompleteTask(taskId).then((result) => {
        if (result.error) showBar({ message: result.error, tone: "warn" });
        else refresh();
      });
    },
  });
}
