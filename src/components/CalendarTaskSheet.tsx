"use client";

import { TaskDetailSheet } from "./TaskDetailSheet";
import { allDayInstantToLocalDay } from "@/lib/calendarDates";
import { isSameDay } from "@/lib/mealPlanDates";
import type { CalendarPersonView, CalendarTaskView } from "@/lib/types";

/**
 * Mission 75 (C1): the one place `TaskDetailSheet` is mounted for the Calendar.
 * The Calendar's sheets, Schedule and the search page all use it, so what each
 * change does (close, drop the tick, redraw, raise "Task completed") is written
 * once. The caller decides how to redraw: `refresh` is told which days changed.
 */
type CalendarTaskSheetProps = {
  task: CalendarTaskView;
  people: CalendarPersonView[];
  canManage: boolean;
  isTablet: boolean;
  onClose: () => void;
  /** Mission 74: a task was just marked complete; shows the bar. `refresh` redraws after its Undo. */
  onTaskCompleted: (taskId: string, refresh: () => void) => void;
  /** Mission 74: any other change to a task drops its optimistic tick before the refresh. */
  clearTaskDone: (taskId: string) => void;
  /** Redraws after a change: `old` is the task's due day, `next` its new one when an edit moved it. */
  refresh: (days: { old: Date; next?: Date }) => void;
  /** An edit moved the due date: the caller re-seats its copy of the task (Schedule needs the new day for a second edit). */
  onDueDateChanged?: (dueDate: Date) => void;
};

export function CalendarTaskSheet({
  task,
  people,
  canManage,
  isTablet,
  onClose,
  onTaskCompleted,
  clearTaskDone,
  refresh,
  onDueDateChanged,
}: CalendarTaskSheetProps) {
  const dueDay = allDayInstantToLocalDay(task.dueDate);
  return (
    <TaskDetailSheet
      task={task}
      people={people}
      canManage={canManage}
      isTablet={isTablet}
      onClose={onClose}
      onCompleted={() => {
        // Mission 74: close, redraw the task's day and show the bar; its Undo redraws the same way.
        const redraw = () => refresh({ old: dueDay });
        onClose();
        redraw();
        onTaskCompleted(task.id, redraw);
      }}
      onChanged={(updated) => {
        // mission-15/C7: `task` is a snapshot from when the sheet opened, so an edit that
        // MOVES the due date must redraw the old day AND the new one (and the caller re-seats
        // its copy), or the task shows on no day until the view remounts.
        clearTaskDone(task.id);
        const next = updated ? allDayInstantToLocalDay(updated.dueDate) : null;
        refresh({ old: dueDay, next: next && !isSameDay(next, dueDay) ? next : undefined });
        if (updated) onDueDateChanged?.(updated.dueDate);
      }}
      onDeleted={() => {
        clearTaskDone(task.id);
        onClose();
        refresh({ old: dueDay });
      }}
    />
  );
}
