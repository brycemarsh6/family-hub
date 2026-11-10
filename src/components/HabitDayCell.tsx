import { SkipForward } from "lucide-react";
import { parseDateParam } from "@/lib/householdDate";
import { dayCellLabel, effectiveState, type CellReason, type MonthCellState } from "@/lib/habitsStats";
import { REPORT_LABELS } from "@/lib/habitVocabulary";

/** One day of a habit's calendar as plain data (days as "YYYY-MM-DD"); `reason` explains a vacation, week-skipped or moved-away day, checked or not (decision 170). */
export type CalendarCell = { day: string; state: MonthCellState; reason?: CellReason | null; tappable: boolean };

/** 44px tall; at least 44px wide at 375 (the card and grid gaps are tight on purpose), and no wider than 48px, centred, on an iPad. */
const FULL = "flex min-h-11 w-full max-w-12 items-center justify-center justify-self-center rounded-full text-sm";

/** The Report's small grids: about 22px cells, 10px numbers (decision 167). Read-only, so no tap target to protect. */
const COMPACT = "flex h-[1.375rem] w-full max-w-[1.375rem] items-center justify-center justify-self-center rounded-full text-[0.625rem]";

/** Look by state. Done and Skipped differ by shape as well as color (a filled disc, a dashed ring), Missed by its amber fill. Future and not-due days are plain (no ring), so only a due day looks like something to do; a not-due today is plain too, its number bolder. */
function cellClass(state: MonthCellState, isToday: boolean): string {
  switch (state) {
    case "done":
    case "late":
      return "bg-accent text-accent-fg";
    case "skipped":
      return "border-2 border-dashed border-muted text-muted";
    case "missed":
      return "bg-warn-soft font-semibold text-warn";
    case "today":
      return "border border-line text-muted";
    case "future":
      return "text-muted";
    case "notDue":
      return isToday ? "font-semibold text-fg" : "text-muted";
  }
}

/**
 * One day, drawn the same on the stats calendar and every Report grid. With
 * `onToggle` and a tappable day it is a button (a tap checks it, a tap on a
 * done day undoes it); a day marked skipped by a tap is left alone (skips are
 * made on Today), but one skipped only by a vacation or this-week change can
 * still be checked (decision 127). Otherwise it is a read-only span with the
 * spoken label.
 */
export function HabitDayCell({
  cell,
  today,
  compact = false,
  onToggle,
}: {
  cell: CalendarCell;
  /** "YYYY-MM-DD" */
  today: string;
  compact?: boolean;
  onToggle?: (cell: CalendarCell) => void;
}) {
  const parsed = parseDateParam(cell.day)!;
  const state = effectiveState(cell);
  const isToday = cell.day === today;
  const label = dayCellLabel(cell);
  const className = `${compact ? COMPACT : FULL} ${cellClass(state, isToday)} ${isToday && state !== "notDue" ? "outline-2 outline-offset-1 outline-fg" : ""}`;
  const body = state === "skipped" ? <SkipForward aria-hidden="true" size={compact ? 10 : 14} /> : parsed.day;
  const tapSkipped = cell.state === "skipped" && !cell.reason;
  if (!onToggle || !cell.tappable || tapSkipped) {
    return (
      <span role="img" aria-label={label} className={className}>
        {body}
      </span>
    );
  }
  return (
    <button type="button" aria-pressed={state === "done" || state === "late"} aria-label={label} onClick={() => onToggle(cell)} className={className}>
      {body}
    </button>
  );
}

/** The three marks in words, under a month calendar (decision 94). The swatches are the real cells' looks: a filled disc, a dashed ring, an amber disc. */
export function HabitDayLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted ${className}`}>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3 w-3 rounded-full bg-accent" />
        {REPORT_LABELS.legend.done}
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3 w-3 rounded-full border-2 border-dashed border-muted" />
        {REPORT_LABELS.legend.skipped}
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3 w-3 rounded-full bg-warn-soft" />
        {REPORT_LABELS.legend.missed}
      </span>
    </div>
  );
}
