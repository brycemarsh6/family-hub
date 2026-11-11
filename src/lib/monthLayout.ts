// Pure month-grid layout for the Calendar branch's Month view (K2/C1).
//
// Two functions: `monthGridDays` turns an anchor date into the Sunday-first
// 42-day grid Month always renders (six rows, so the grid's height never
// jumps between a five-week month and a six-week one); `assignLanes` turns
// one row's worth of events into non-colliding lane positions plus an
// overflow count, so spanning bars and single-day pills never draw on top
// of each other.
//
// No React, no database, no zero-argument `new Date()`, no `Date.now()` —
// this module never reads the clock. Every date it touches arrives as a
// parameter, and every calculation moves whole calendar days via
// `mealPlanDates.ts`'s `addDays`/`sundayOf`, never milliseconds. See that
// file's header, and calendarDates.ts's, for the two standing rules this
// module inherits rather than re-litigates.
//
// `assignLanes` is deliberately called PER ROW, once per each of the grid's
// six rows, rather than once for the whole month — that's what "a span
// crossing a week break is split into one span per row" means in practice:
// the caller (C2) calls this once per row with that row's own seven Dates,
// and `daysEventCovers` (calendarDates.ts) naturally clips a multi-week
// event's coverage down to just the days inside that row. Continuity of
// lane numbers across a week break is not tracked by any shared state
// between calls (there is none — this module holds nothing between two
// invocations); it emerges from the two rows' calls to this same
// deterministic sort/pack, which normally lands a continuing event back on
// the same lane number it had the row before. "Where possible" in the
// mission brief acknowledges that when the second row's own event mix
// differs enough, it may not.

import { addDays, isSameDay, isSameMonth, startOfDay, sundayOf, toLocalDateString } from "./mealPlanDates";
import { allDayInstantToLocalDay, daysEventCovers } from "./calendarDates";

const GRID_ROWS = 6;
const DAYS_PER_ROW = 7;
const GRID_LENGTH = GRID_ROWS * DAYS_PER_ROW;
/** Lanes a Month cell shows on a phone (under 48rem), and on a wide screen.
 * The one home for both numbers; MonthGrid lays the month out once with the
 * wide cap and hides the extra lane on a phone with CSS. */
export const PHONE_LANES = 3;
export const WIDE_LANES = 4;
const VISIBLE_LANES = PHONE_LANES;

/** The Sunday-first 42-day grid (six rows of seven) for the month
 * containing `anchor`. Always six rows — a five-week month still fills a
 * sixth from the following month — so Month's own row count, and therefore
 * its on-screen height, never changes as the family pages between months. */
export function monthGridDays(anchor: Date): Date[] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = sundayOf(firstOfMonth);
  return Array.from({ length: GRID_LENGTH }, (_, offset) => addDays(gridStart, offset));
}

/** A padded month grid (see `monthGridDays` above) contains up to 12 days
 * of its neighbouring months, so a bare `isSameDay(day, today)` circles
 * today's date on the WRONG month's grid whenever that grid is showing a
 * month other than today's real one — DESIGN.md's today-marker rule, and
 * the exact bug mission-19/F1 fixed in the old month-jump sheet (now MiniMonth.tsx). `MonthGrid.tsx`
 * and `YearView.tsx` each guarded this inline before this function existed;
 * that sheet didn't, which is the "no compile error" failure
 * DESIGN.md predicted one mission earlier. This is the invariant's one
 * home now — homed beside the function that creates the padding it guards
 * against, and reachable by `npm test`, which three inline `.tsx` copies
 * structurally were not (the same `VIEW_CONFIG` lesson STRUCTURE.md
 * already records). Route every caller that circles "today" on a padded
 * month grid through this, rather than writing `isSameDay(day, today)` by
 * hand again. */
export function isTodayCell(day: Date, shownMonth: Date, today: Date): boolean {
  return isSameDay(day, today) && isSameMonth(day, shownMonth);
}

/** The local "YYYY-MM-DD" of every day that has an event (across its whole span) or a task, for the small month's dots (mission-72). Reads only what was loaded; a span is capped at 62 days. */
export function daysWithItems(
  events: { startAt: Date; endAt: Date; allDay: boolean }[],
  tasks: { dueDate: Date }[],
): Set<string> {
  const keys = new Set<string>();
  for (const event of events) {
    const first = event.allDay ? allDayInstantToLocalDay(event.startAt) : startOfDay(event.startAt);
    const length = Math.min(62, Math.ceil((event.endAt.getTime() - event.startAt.getTime()) / 86_400_000) + 1);
    const candidates = Array.from({ length }, (_, offset) => addDays(first, offset));
    for (const day of daysEventCovers(event.startAt, event.endAt, event.allDay, candidates)) {
      keys.add(toLocalDateString(day));
    }
  }
  for (const task of tasks) keys.add(toLocalDateString(allDayInstantToLocalDay(task.dueDate)));
  return keys;
}

/** The minimal, structural shape `assignLanes` needs from an event — not a
 * copy of `CalendarEventView` (src/lib/types.ts), which this module isn't
 * allowed to import (it may only import from mealPlanDates.ts and
 * calendarDates.ts) and shouldn't need to: layout only cares about identity,
 * span, and ordering, never a title or who's on it. `id` exists solely as a
 * deterministic tiebreak — see the sort below. */
export type MonthLayoutEvent = {
  id: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
};

/** One event's position within a single row: which columns (0 = Sunday..6 =
 * Saturday) it spans, and which lane (vertical slot, 0-indexed, always less
 * than the cap passed to `assignLanes` — anything that would need a higher
 * lane is dropped from `spans` and folded into `overflowByDay` instead). */
export type MonthLaneSpan = {
  event: MonthLayoutEvent;
  startCol: number;
  endCol: number;
  lane: number;
};

export type MonthLaneAssignment = {
  spans: MonthLaneSpan[];
  /** Length === rowDays.length (7 for a real row). overflowByDay[col] is
   * how many entries touching that column didn't fit in the visible
   * lanes (the cap passed to `assignLanes`) — a multi-day overflow event
   * that touches three columns adds 1 to each of those three counts, not 1 to the total, so "+N more" reads
   * correctly on every cell it would have covered, not just its first. */
  overflowByDay: number[];
};

type Candidate = {
  event: MonthLayoutEvent;
  startCol: number;
  endCol: number;
};

/** Multi-day (within this row) events first, longest first; then
 * single-day events by start time; a stable `id` tiebreak throughout so
 * identical input always produces identical lane numbers — a renderer that
 * gets reshuffled lanes between two renders of the same data is a bug this
 * sort exists to rule out. "Multi-day" is evaluated against THIS row's own
 * columns (endCol > startCol), not the event's true full span — correct by
 * construction, because a continuation row where only one day of a longer
 * event remains visible really does only need one column here, and should
 * sort exactly like any other single-day entry in that row. */
function compareCandidates(a: Candidate, b: Candidate): number {
  const aMulti = a.endCol > a.startCol;
  const bMulti = b.endCol > b.startCol;
  if (aMulti !== bMulti) return aMulti ? -1 : 1;

  if (aMulti) {
    const aLen = a.endCol - a.startCol;
    const bLen = b.endCol - b.startCol;
    if (aLen !== bLen) return bLen - aLen; // longer first
  } else {
    const byStart = a.event.startAt.getTime() - b.event.startAt.getTime();
    if (byStart !== 0) return byStart;
  }

  if (a.event.id < b.event.id) return -1;
  if (a.event.id > b.event.id) return 1;
  return 0;
}

/** The phone's "+N more" counts, derived from a row laid out with
 * `WIDE_LANES`. Lane numbers do not depend on the cap (occupancy of hidden
 * lanes is tracked), so a span on the wide-only lane (3) is exactly what the
 * phone would have folded into overflow: add 1 to every column it covers on
 * top of the wide overflow. Equals `assignLanes(rowDays, events, PHONE_LANES)
 * .overflowByDay`. */
export function phoneOverflowByDay(wide: MonthLaneAssignment): number[] {
  const counts = [...wide.overflowByDay];
  for (const span of wide.spans) {
    if (span.lane < PHONE_LANES) continue;
    for (let col = span.startCol; col <= span.endCol; col++) counts[col] += 1;
  }
  return counts;
}

/** Which of a Month cell's lane slots render, and at which width. `slots`
 * is one column's lanes (length `WIDE_LANES`), any non-null entry meaning
 * "filled". Per lane: "both" (phone and wide: at or above the phone's last
 * filled lane), "wide" (only from 48rem: past the phone's last filled lane
 * but not past the wide one), "none" (past the last filled lane at every
 * width, so nothing renders). The result has one entry per lane up to the
 * wide last filled lane, so a day whose only entry sits on the wide-only lane
 * shows nothing on a phone except "+N more", never blank spacers. */
export function laneVisibility(slots: readonly unknown[]): ("both" | "wide" | "none")[] {
  let phoneLast = -1;
  let wideLast = -1;
  slots.forEach((slot, lane) => {
    if (!slot) return;
    wideLast = lane;
    if (lane < PHONE_LANES) phoneLast = lane;
  });
  return slots.map((_, lane) =>
    lane <= phoneLast ? "both" : lane <= wideLast ? "wide" : "none",
  );
}

/** Given one row's seven Dates and the events that might touch it, packs
 * each event into the lowest free lane (greedy interval packing) and caps
 * visible lanes per cell (three by default). `events` may include events that don't
 * touch this row at all (e.g. the caller's whole fetched set) — anything
 * `daysEventCovers` returns no days for is silently skipped, so the caller
 * doesn't need to pre-filter per row.
 *
 * `visibleLanes` defaults to the module's own `VISIBLE_LANES` (3, the phone
 * count). Month (MonthGrid.tsx) passes `WIDE_LANES` and derives the phone
 * counts with `phoneOverflowByDay`. The parameter was added for a SECOND
 * caller (mission-17/C5): TimelineGrid.tsx's all-day strip caps at
 * the same 3 lanes by default, but its "+N more" used to be a dead end — an
 * inert `<span>`, no route to the 4th+ item at all, and Month's own "+N
 * more" escalates INTO that exact dead end by navigating to Day. Passing a
 * larger `visibleLanes` (effectively unbounded) is what lets that "+N more"
 * become a real button that EXPANDS the strip in place instead of
 * navigating somewhere that can't show them either — see that component's
 * own comment for why expanding was chosen over a second navigation. */
export function assignLanes(
  rowDays: Date[],
  events: MonthLayoutEvent[],
  visibleLanes: number = VISIBLE_LANES,
): MonthLaneAssignment {
  const width = rowDays.length;
  const overflowByDay = new Array(width).fill(0) as number[];

  const candidates: Candidate[] = [];
  for (const event of events) {
    const covered = daysEventCovers(event.startAt, event.endAt, event.allDay, rowDays);
    if (covered.length === 0) continue;
    const cols = covered
      .map((day) => rowDays.findIndex((rowDay) => isSameDay(rowDay, day)))
      .filter((index) => index !== -1)
      .sort((a, b) => a - b);
    if (cols.length === 0) continue;
    candidates.push({ event, startCol: cols[0], endCol: cols[cols.length - 1] });
  }

  candidates.sort(compareCandidates);

  // laneOccupancy[lane] is a per-column boolean row; grown lazily as lanes
  // fill up. Occupancy is tracked for hidden (overflow) lanes too, not just
  // the three visible ones — two different overflowing events must still
  // never share a lane number if their columns collide, even though
  // neither one is ever drawn, or a later free-lane search could wrongly
  // treat an already-claimed column as free.
  const laneOccupancy: boolean[][] = [];
  const spans: MonthLaneSpan[] = [];

  for (const candidate of candidates) {
    let lane = laneOccupancy.findIndex((occupied) => {
      for (let col = candidate.startCol; col <= candidate.endCol; col++) {
        if (occupied[col]) return false;
      }
      return true;
    });
    if (lane === -1) {
      lane = laneOccupancy.length;
      laneOccupancy.push(new Array(width).fill(false));
    }
    for (let col = candidate.startCol; col <= candidate.endCol; col++) {
      laneOccupancy[lane][col] = true;
    }

    if (lane < visibleLanes) {
      spans.push({ event: candidate.event, startCol: candidate.startCol, endCol: candidate.endCol, lane });
    } else {
      for (let col = candidate.startCol; col <= candidate.endCol; col++) {
        overflowByDay[col] += 1;
      }
    }
  }

  return { spans, overflowByDay };
}
