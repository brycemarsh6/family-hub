"use client";

import { HabitDayCell, type CalendarCell } from "./HabitDayCell";

export type { CalendarCell };

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function Legend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3 w-3 rounded-full bg-accent" />
        Done
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3 w-3 rounded-full border-2 border-dashed border-muted" />
        Skipped
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3 w-3 rounded-full bg-warn-soft ring-1 ring-warn" />
        Missed
      </span>
    </div>
  );
}

/**
 * One person's month (decision 94): Done is a filled disc, Skipped a dashed
 * ring, Missed an amber disc, and future or not-due days are plain. Today
 * wears an outline. A day in the last week is a button: a tap checks it, a tap
 * on a done day undoes it. A skipped day is left alone (skips are made on
 * Today). The legend names the three marks in words. `compact` is the
 * Report's read-only size (decision 167): small cells, no card and no legend
 * (the Report shows one legend under its pager), never buttons.
 */
export function HabitMonthCalendar({
  cells,
  leading,
  today,
  onToggle,
  compact = false,
}: {
  cells: CalendarCell[];
  leading: number;
  /** "YYYY-MM-DD" */
  today: string;
  /** Called with the tapped cell; the owner decides check or undo. Unused when `compact`. */
  onToggle?: (cell: CalendarCell) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "rounded-2xl border border-line bg-surface p-2"}>
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_LETTERS.map((letter, index) => (
          <span key={index} aria-hidden="true" className={`text-center font-semibold text-muted ${compact ? "text-[10px]" : "text-xs"}`}>
            {letter}
          </span>
        ))}
        {Array.from({ length: leading }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden="true" />
        ))}
        {cells.map((cell) => (
          <HabitDayCell key={cell.day} cell={cell} today={today} compact={compact} onToggle={compact ? undefined : onToggle} />
        ))}
      </div>
      {!compact && <Legend />}
    </div>
  );
}
