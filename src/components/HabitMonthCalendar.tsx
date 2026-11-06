"use client";

import { SkipForward } from "lucide-react";
import { parseDateParam } from "@/lib/householdDate";
import { MONTH_NAMES } from "@/lib/mealPlanDates";
import type { MonthCellState } from "@/lib/habitsStats";

export type CalendarCell = { day: string; state: MonthCellState; tappable: boolean };

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

const BASE = "flex min-h-11 items-center justify-center rounded-full text-sm";

/** Look by state. Done and Skipped differ by shape as well as color (a filled disc, a dashed ring), Missed by its amber fill. */
function cellClass(state: MonthCellState): string {
  switch (state) {
    case "done":
    case "late":
      return "bg-accent text-accent-fg";
    case "skipped":
      return "border-2 border-dashed border-muted text-muted";
    case "missed":
      return "bg-warn-soft font-semibold text-warn";
    case "today":
    case "future":
      return "border border-line text-muted";
    case "notDue":
      return "text-muted";
  }
}

const STATE_WORDS: Record<MonthCellState, string> = {
  done: "done",
  late: "done late",
  skipped: "skipped",
  missed: "missed",
  today: "not done yet",
  future: "not yet",
  notDue: "not due",
};

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
 * Today). The legend names the three marks in words.
 */
export function HabitMonthCalendar({
  cells,
  leading,
  today,
  onToggle,
}: {
  cells: CalendarCell[];
  leading: number;
  /** "YYYY-MM-DD" */
  today: string;
  /** Called with the tapped cell; the owner decides check or undo. */
  onToggle: (cell: CalendarCell) => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LETTERS.map((letter, index) => (
          <span key={index} aria-hidden="true" className="text-center text-xs font-semibold text-muted">
            {letter}
          </span>
        ))}
        {Array.from({ length: leading }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden="true" />
        ))}
        {cells.map((cell) => {
          const parsed = parseDateParam(cell.day)!;
          const label = `${MONTH_NAMES[parsed.month - 1]} ${parsed.day}, ${STATE_WORDS[cell.state]}`;
          const className = `${BASE} ${cellClass(cell.state)} ${cell.day === today ? "outline-2 outline-offset-1 outline-fg" : ""}`;
          const body = cell.state === "skipped" ? <SkipForward aria-hidden="true" size={14} /> : parsed.day;
          if (!cell.tappable || cell.state === "skipped") {
            return (
              <span key={cell.day} role="img" aria-label={label} className={className}>
                {body}
              </span>
            );
          }
          const checked = cell.state === "done" || cell.state === "late";
          return (
            <button key={cell.day} type="button" aria-pressed={checked} aria-label={label} onClick={() => onToggle(cell)} className={className}>
              {body}
            </button>
          );
        })}
      </div>
      <Legend />
    </div>
  );
}
