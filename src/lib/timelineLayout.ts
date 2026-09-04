// Pure hour-timeline layout for the Calendar branch's Day / 3 Day / Week
// views (CV2). The sibling of monthLayout.ts: that module packs a month row's
// spans into lanes; this one turns an event and a calendar day into a block's
// vertical position, and a day's worth of blocks into side-by-side columns.
//
// This library speaks MINUTES, never pixels. Nothing here knows how tall an
// hour is on screen — that constant belongs to the component (CV4), which is
// what lets the same numbers drive a phone, a wall tablet, and a print
// stylesheet without this file caring.
//
// No React, no database, no zero-argument `new Date()`, no `Date.now()` —
// this module never reads the clock. Every date arrives as a parameter, and
// every day-level calculation moves whole calendar days via mealPlanDates'
// `startOfDay`/`addDays` or calendarDates' `calendarDayDiff`, never
// milliseconds. See those two files' headers for the two standing rules this
// module inherits rather than re-litigates.
//
// Imports are limited to ./mealPlanDates and ./calendarDates — the same rule
// monthLayout.ts follows. In particular this module does NOT import
// monthLayout.ts: `partitionForTimeline` hands back an all-day row that IS a
// month row, and the CALLER feeds it to `monthLayout.assignLanes` unchanged.
// There is deliberately no second span packer in this codebase.
//
// ---------------------------------------------------------------------------
// The DST policy, stated once, here, because it is a decision and not an
// accident: blocks are projected onto a FIXED 24-row WALL-CLOCK rail. Top and
// height are read off local `getHours()`/`getMinutes()`, never off an elapsed
// millisecond count, and a day is always 1440 rail minutes tall even on the
// two days a year that are 23 or 25 hours long.
//
// The consequences, which are the same ones Google Calendar and Apple
// Calendar ship:
//   * Nov 1 2026 (US fall back) — 1 AM happens twice, and both 1:30s land on
//     rail minute 90. A 3-hour event across the repeat DRAWS 2 hours tall.
//   * Mar 8 2026 (US spring forward) — 2 AM never happens, so the 2 AM row is
//     simply empty, and a 1-hour event across the gap draws 2 hours tall.
// The alternative (an elapsed-time rail) would make the hour gutter lie: the
// row labelled "2 AM" would not sit where 2 AM is. A wall clock that matches
// the one on the kitchen wall is worth more than a block whose height is a
// faithful duration twice a year.
//
// The GUARANTEE, which the tests pin, is narrower and absolute: no NaN, no
// negative height, no block off the rail, no crash — on either transition day
// or on a degenerate row whose end precedes its start.
// ---------------------------------------------------------------------------

import { addDays, startOfDay } from "./mealPlanDates";
import { calendarDayDiff, daysEventCovers } from "./calendarDates";

/** The rail's height. A wall-clock day is always exactly this tall — see the
 * DST policy above for why that stays true on a 23- or 25-hour day. */
export const MINUTES_PER_DAY = 24 * 60;

/** The shortest block that is still comfortably tappable at the app's
 * touch-first 48px minimum. A 5-minute event is padded up to this rather than
 * drawn as a hairline nobody can hit; `assignColumns` then treats the padded
 * box as the real one, so the pad can never let two blocks paint over each
 * other. */
export const MIN_BLOCK_MINUTES = 30;

/** The minimal, structural shape this module needs from an event — not a copy
 * of `CalendarEventView` (src/lib/types.ts), which this module isn't allowed
 * to import and shouldn't need to: layout cares about identity, span, and the
 * all-day flag, never a title or who's on it. Deliberately the same shape as
 * `MonthLayoutEvent`, so the all-day row this module produces is assignable
 * straight into `monthLayout.assignLanes` with no conversion step. */
export type TimelineEvent = {
  id: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
};

/** One block's vertical geometry on one day, in rail minutes from local
 * midnight. `clippedStart`/`clippedEnd` say the event genuinely continues
 * past that edge of the day (so the renderer can draw a continuation arrow) —
 * they describe the EVENT against the DAY, and are unaffected by the
 * MIN_BLOCK_MINUTES pad or the pull-up below. */
export type BlockGeometry = {
  topMinutes: number;
  heightMinutes: number;
  clippedStart: boolean;
  clippedEnd: boolean;
};

/** What `assignColumns` needs: a geometry plus a stable identity. */
export type TimelineBlock = {
  id: string;
  topMinutes: number;
  heightMinutes: number;
};

/** One block's horizontal slot within its overlap cluster. `columnCount` is
 * per CLUSTER, not per day, so the renderer's width is `1 / columnCount` and
 * a single 3 PM event stays full width even though the 9 AM hour was three
 * deep. */
export type TimelineColumnSlot<T extends TimelineBlock> = {
  block: T;
  column: number;
  columnCount: number;
};

/** Local wall-clock minutes since local midnight. Local getters only — an
 * instant re-read through the wrong environment's clock is the trap
 * calendarDates.ts's `isOutsideWindow` header documents at length. */
export function minutesOfDay(instant: Date): number {
  return instant.getHours() * 60 + instant.getMinutes();
}

/**
 * Where an event's block sits on `day`'s rail, or `null` when the event
 * doesn't touch that day at all. Day bounds come from `startOfDay`/`addDays`,
 * so they're exact on a 23- or 25-hour day.
 *
 * An end landing EXACTLY on the day's own following midnight is NOT clipped,
 * and the event draws nothing on that following day — the same rule
 * `eventDaySpan` (calendarDates.ts) already encodes for the day-span side,
 * added there as mission-8's V1 fix. Two libraries that disagree about which
 * days one event touches is precisely how "8 PM - midnight" silently became a
 * two-day span the first time.
 *
 * A DEGENERATE ROW (end at or before start) covers `startOfDay(start)` and
 * nothing else, which is what `eventDaySpan`'s V2 clamp gives it too — for
 * every degenerate shape, not only same-day ones: a zero-length row, an end
 * earlier the same day, and an end on a PREVIOUS day all land on the start's
 * own day in both libraries. Only the last of those is unreachable through
 * `validateEventInput`, which rejects `endAt < startAt` but not
 * `endAt === startAt`. See the branch below for the case that made this
 * necessary.
 *
 * Deliberately takes only `startAt`/`endAt`: it cannot read `allDay`, because
 * routing an all-day event is `belongsInAllDayRow`'s job and the timed path
 * must never interpret an all-day row's stored times (see that function).
 */
export function blockGeometry(
  day: Date,
  event: Pick<TimelineEvent, "startAt" | "endAt">,
): BlockGeometry | null {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const start = event.startAt.getTime();
  const end = event.endAt.getTime();

  // A DEGENERATE ROW — end at or before start — covers exactly the one day
  // `eventDaySpan` (calendarDates.ts) gives it, `startOfDay(start)`, and no
  // other. Deciding it here rather than letting it reach the window test below
  // is what keeps the two libraries agreeing: a zero-length event at exactly
  // local midnight fails `end > dayStart` on its OWN day, so it drew nowhere
  // at all while `daysEventCovers` still listed it — visible in the list views
  // and absent from the timeline. `validateEventInput` rejects only
  // `endAt < startAt`, so `end === start` is writable through the sanctioned
  // path (mission-12/C3, measured by Vision across 225 events x 10 days: this
  // was the only shape the two disagreed on).
  //
  // An invalid Date never reaches this branch — every comparison against NaN
  // is false — so it still falls out of the window test below rather than
  // propagating NaN into the geometry.
  if (end <= start) {
    if (dayStart.getTime() !== startOfDay(event.startAt).getTime()) return null;
    const degenerateTop = minutesOfDay(event.startAt);
    return {
      topMinutes: Math.min(degenerateTop, MINUTES_PER_DAY - MIN_BLOCK_MINUTES),
      heightMinutes: MIN_BLOCK_MINUTES,
      clippedStart: false,
      clippedEnd: false,
    };
  }

  // Strict on both sides: an event that ends exactly when the day begins, or
  // begins exactly when it ends, belongs to the neighbouring day only. An
  // invalid Date makes both comparisons false, so it falls out here rather
  // than propagating NaN into the geometry.
  if (!(start < dayEnd.getTime() && end > dayStart.getTime())) return null;

  const clippedStart = start < dayStart.getTime();
  const clippedEnd = end > dayEnd.getTime();
  const visibleStart = clippedStart ? dayStart : event.startAt;

  const topMinutes = minutesOfDay(visibleStart);
  // The rail's own top edge reads as minute 0 from `minutesOfDay`; its bottom
  // edge would read 0 too (it IS the next midnight), so that one case is
  // named explicitly rather than measured.
  const endMinutes = end >= dayEnd.getTime() ? MINUTES_PER_DAY : minutesOfDay(event.endAt);

  // `Math.max(0, ...)` is NOT the degenerate-row clamp — that case returned
  // above and never reaches here. It stays because a genuinely FORWARD event
  // can still run backwards on the RAIL: on the fall-back repeat, 01:30 MDT
  // to 01:15 MST is 45 real minutes later at 15 fewer wall-clock minutes, so
  // `endMinutes - topMinutes` is -15. That block draws MIN_BLOCK_MINUTES tall
  // at minute 90, never a negative box. (Measured under America/Denver, not
  // reasoned about — mission-12/C3.)
  const heightMinutes = Math.max(MIN_BLOCK_MINUTES, Math.max(0, endMinutes - topMinutes));

  return {
    topMinutes: Math.max(0, Math.min(topMinutes, MINUTES_PER_DAY - heightMinutes)),
    heightMinutes,
    clippedStart,
    clippedEnd,
  };
}

/**
 * Whether an event belongs in the all-day row above the grid rather than in
 * the timed grid itself.
 *
 * `allDay === true` routes there WITHOUT reading the times at all. That's
 * deliberate and load-bearing: all-day rows' stored instants are on the
 * deferred all-day-storage audit list (calendar-v1.md), and tasks are all-day
 * by construction (CT1) — none of that may leak into the timed path.
 *
 * A TIMED event routes there only when it swallows at least one whole
 * calendar day, decided with `calendarDayDiff` and never a millisecond
 * duration. So Fri 10 PM -> Sat 2 AM stays in the GRID and draws on both days
 * clipped (Google's behaviour), while Fri 10 AM -> Sun 2 PM, which covers
 * Saturday end to end, moves up to the row.
 */
export function belongsInAllDayRow(event: TimelineEvent): boolean {
  if (event.allDay) return true;

  const startDay = startOfDay(event.startAt);
  // The first day the event could possibly cover END TO END: its own start
  // day when it begins exactly at midnight, otherwise the day after.
  const firstFullDay =
    event.startAt.getTime() === startDay.getTime() ? startDay : addDays(startDay, 1);
  // It covers that day whole iff its end reaches the following midnight,
  // which is exactly "the end's own calendar day is at least a day later".
  return calendarDayDiff(firstFullDay, startOfDay(event.endAt)) >= 1;
}

/**
 * Splits the events a timeline view has fetched into the two things it draws:
 * `allDayRow`, the banner strip above the grid, and `timed`, the events that
 * get blocks inside it. Both are filtered to what actually touches
 * `columnDays` and keep their input order, so the split is deterministic.
 *
 * `allDayRow` IS a month row — spans, lanes, "+N more" — so the caller feeds
 * it to `monthLayout.assignLanes` unchanged. This module does not import that
 * one (see the header); composing them is the caller's job, which is what
 * keeps there being exactly one span packer in the app.
 */
export function partitionForTimeline(
  columnDays: Date[],
  events: TimelineEvent[],
): { allDayRow: TimelineEvent[]; timed: TimelineEvent[] } {
  const allDayRow: TimelineEvent[] = [];
  const timed: TimelineEvent[] = [];

  for (const event of events) {
    if (belongsInAllDayRow(event)) {
      // The same coverage predicate `assignLanes` itself applies, so this
      // filter can never hide a row the packer would have drawn.
      if (daysEventCovers(event.startAt, event.endAt, event.allDay, columnDays).length > 0) {
        allDayRow.push(event);
      }
    } else if (columnDays.some((day) => blockGeometry(day, event) !== null)) {
      timed.push(event);
    }
  }

  return { allDayRow, timed };
}

/** Top ascending, then taller first, then a stable `id` tiebreak — the same
 * shape as `compareCandidates` in monthLayout.ts, and there for the same
 * reason: identical input must always produce identical columns. A renderer
 * whose blocks reshuffle between two renders of the same data is a bug this
 * sort exists to rule out. */
function compareBlocks(a: TimelineBlock, b: TimelineBlock): number {
  if (a.topMinutes !== b.topMinutes) return a.topMinutes - b.topMinutes;
  if (a.heightMinutes !== b.heightMinutes) return b.heightMinutes - a.heightMinutes;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

/**
 * Side-by-side columns for overlapping blocks — greedy interval packing, the
 * sibling of `monthLayout.assignLanes`.
 *
 * Blocks are grouped into clusters of mutual overlap; a cluster ends the
 * moment a block starts at or after every previous block's VISUAL bottom
 * (`top + height`, i.e. after the MIN_BLOCK_MINUTES pad, so the pad can never
 * let two boxes paint over each other). "At or after" is the whole point:
 * 9-10 and 10-11 TOUCH, they do not overlap, and each stays full width.
 * Within a cluster each block takes the lowest-numbered column whose previous
 * occupant ended at or before this block's start, and `columnCount` is that
 * cluster's own width.
 *
 * `id` must be UNIQUE PER RENDERED BLOCK, not per database row. When K4 adds
 * recurrence, one `rrule` row expands into many instances, and two instances
 * sharing an id would make the tiebreak above non-deterministic — the caller
 * is the only place that can guarantee distinct instance ids, so it must.
 */
export function assignColumns<T extends TimelineBlock>(blocks: T[]): TimelineColumnSlot<T>[] {
  const sorted = [...blocks].sort(compareBlocks);
  const slots: TimelineColumnSlot<T>[] = [];

  // Indices into `slots` for the cluster currently being built, plus the
  // visual bottom of the last block in each of its columns.
  let clusterSlots: TimelineColumnSlot<T>[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -Infinity;

  const closeCluster = () => {
    for (const slot of clusterSlots) slot.columnCount = columnEnds.length;
    clusterSlots = [];
    columnEnds = [];
    clusterEnd = -Infinity;
  };

  for (const block of sorted) {
    const bottom = block.topMinutes + block.heightMinutes;
    if (block.topMinutes >= clusterEnd) closeCluster();

    let column = columnEnds.findIndex((columnEnd) => columnEnd <= block.topMinutes);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(bottom);
    } else {
      columnEnds[column] = bottom;
    }

    const slot: TimelineColumnSlot<T> = { block, column, columnCount: 0 };
    clusterSlots.push(slot);
    slots.push(slot);
    clusterEnd = Math.max(clusterEnd, bottom);
  }
  closeCluster();

  return slots;
}
