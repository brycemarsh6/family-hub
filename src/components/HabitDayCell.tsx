import { SkipForward } from "lucide-react";
import { parseDateParam } from "@/lib/householdDate";
import { MONTH_NAMES, SHORT_DAY_NAMES } from "@/lib/mealPlanDates";
import type { CellReason, MonthCellState } from "@/lib/habitsStats";

/** One day of a habit's calendar as plain data (days as "YYYY-MM-DD"); `reason` explains an undone vacation, week-skipped or moved-away day (decision 170). */
export type CalendarCell = { day: string; state: MonthCellState; reason?: CellReason | null; tappable: boolean };

/** 44px tall; at least 44px wide at 375 (the card and grid gaps are tight on purpose), and no wider than 48px, centred, on an iPad. */
const FULL = "flex min-h-11 w-full max-w-12 items-center justify-center justify-self-center rounded-full text-sm";

/** The Report's small grids: about 22px cells, 10px numbers (decision 167). Read-only, so no tap target to protect. */
const COMPACT = "flex h-[22px] w-full max-w-[22px] items-center justify-center justify-self-center rounded-full text-[10px]";

/**
 * What the cell draws. A check wins; without one a vacation or week-skipped
 * reason reads as Skipped and a moved-away reason as not due, so an optimistic
 * undo (which resets `state` to "missed" or "today") still draws right until
 * the server answers.
 */
export function effectiveState(cell: Pick<CalendarCell, "state" | "reason">): MonthCellState {
  if (cell.state === "done" || cell.state === "late") return cell.state;
  if (cell.reason?.kind === "vacation" || cell.reason?.kind === "weekSkip") return "skipped";
  if (cell.reason?.kind === "movedAway" && cell.state !== "future") return "notDue";
  return cell.state;
}

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

/** "Nov 8, skipped (on vacation)", "Nov 8, skipped this week", "Nov 9, not due (moved to Thu)" (decision 170). */
export function dayCellLabel(cell: Pick<CalendarCell, "day" | "state" | "reason">): string {
  const parsed = parseDateParam(cell.day)!;
  const date = `${MONTH_NAMES[parsed.month - 1]} ${parsed.day}`;
  const state = effectiveState(cell);
  if (state === "skipped" && cell.reason?.kind === "vacation") return `${date}, skipped (on vacation)`;
  if (state === "skipped" && cell.reason?.kind === "weekSkip") return `${date}, skipped this week`;
  if (state === "notDue" && cell.reason?.kind === "movedAway") return `${date}, not due (moved to ${SHORT_DAY_NAMES[cell.reason.toWeekday]})`;
  return `${date}, ${STATE_WORDS[state]}`;
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
  const label = dayCellLabel(cell);
  const className = `${compact ? COMPACT : FULL} ${cellClass(state)} ${cell.day === today ? "outline-2 outline-offset-1 outline-fg" : ""}`;
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
