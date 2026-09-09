// Pure drag math for the hour timeline's long-press-and-drag gesture (CD1).
// The sibling `timelineLayout.ts` only ever goes forward — a Date plus a day
// becomes a block's minutes-of-day geometry (`blockGeometry`), and minutes
// become a pixel position in the CALLER'S own render code
// (`slot.block.topMinutes * pxPerMinute`, TimelineDayColumn.tsx:170-178).
// Nothing in this app has ever gone the other way: a pixel offset a finger
// is currently at, back into a calendar-meaningful start time. That's the
// one job of this module.
//
// No React, no DOM, no `Date.now()`/zero-argument `new Date()` — every date
// arrives as a parameter, same discipline timelineLayout.ts documents at its
// own header. Imports are limited to ./timelineLayout (read-only — this
// module is explicitly forbidden from editing it) and ./mealPlanDates, the
// same local-calendar-date helpers timelineLayout.ts itself is built on.
//
// ---------------------------------------------------------------------------
// The DST policy inherited from timelineLayout.ts, restated for this half:
// a drag that changes the vertical position stays on ONE calendar day and is
// pure minutes-of-day arithmetic — no clock is read, so DST cannot enter the
// vertical math at all. The one place DST is a live risk is
// `minutesOfDayToDate`, which turns a resolved minutes-of-day figure back
// into a real `Date` on a given day: that step MUST build the result from
// calendar components (year/month/date/hour/minute), never
// `startOfDay(day).getTime() + minutes * 60_000`. The two disagree on Nov 1
// 2026 (a 25-hour day, where the ms approach drifts an hour early into the
// next calendar day for any minutes-of-day figure past the repeated hour)
// and on Mar 8 2026 (a 23-hour day, where it drifts an hour late). See that
// function's own tests for both directions proven, not asserted.
// ---------------------------------------------------------------------------

import { MINUTES_PER_DAY, MIN_BLOCK_MINUTES } from "./timelineLayout";
import { startOfDay } from "./mealPlanDates";

/** The grid a dragged block's start snaps to. Chosen to match the touch-first
 * house rule (no fiddly typing, no fine-grained pixel-perfect placement) and
 * because it's the smallest unit a person actually schedules in — nobody
 * means to book a meeting at 9:07. */
export const SNAP_MINUTES = 15;

// ---------------------------------------------------------------------------
// pixels <-> minutes

/**
 * The inverse of `slot.block.topMinutes * pxPerMinute`
 * (TimelineDayColumn.tsx:170-178) — given how far down a column a finger
 * currently sits and the same `pxPerMinute` the column was rendered with,
 * returns the minutes-of-day that pixel offset represents.
 *
 * A non-positive `pxPerMinute` (a caller passing a bad measurement rather
 * than a real one) returns 0 instead of `Infinity`/`NaN` — this module never
 * hands a caller a value it would have to re-validate before using.
 */
export function minutesFromPixels(offsetPx: number, pxPerMinute: number): number {
  if (!(pxPerMinute > 0)) return 0;
  return offsetPx / pxPerMinute;
}

/**
 * The forward direction `TimelineDayColumn.tsx` already computes inline.
 * Exported here only as `minutesFromPixels`'s round-trip partner for tests
 * and for a caller (C5's drag preview) that wants to draw the ghost block at
 * a SNAPPED minutes value without re-deriving the multiplication itself —
 * not a second copy of anything, since the component's own inline
 * `topMinutes * pxPerMinute` stays exactly as it is.
 */
export function pixelsFromMinutes(minutes: number, pxPerMinute: number): number {
  return minutes * pxPerMinute;
}

// ---------------------------------------------------------------------------
// snapping

/**
 * Rounds arbitrary minutes-of-day to the nearest `SNAP_MINUTES` mark
 * (default 15). Ties round up, matching `Math.round`'s own behaviour — there
 * is no house convention either way for a drag landing exactly on a
 * half-step, so this simply doesn't invent one.
 */
export function snapMinutes(minutes: number, snapTo: number = SNAP_MINUTES): number {
  if (!(snapTo > 0)) return minutes;
  return Math.round(minutes / snapTo) * snapTo;
}

// ---------------------------------------------------------------------------
// clamping

/**
 * Clamps a candidate start (minutes-of-day) so the dragged block cannot
 * leave the day it's being dropped on.
 *
 * The room reserved at the bottom of the day uses
 * `Math.max(durationMinutes, MIN_BLOCK_MINUTES)`, not `durationMinutes`
 * alone — the same floor `blockGeometry` itself applies when it pads a
 * short event up to a tappable box (timelineLayout.ts's own
 * `Math.max(MIN_BLOCK_MINUTES, ...)`). A real event can be shorter than 30
 * minutes, but whatever renders it will always occupy at least
 * MIN_BLOCK_MINUTES of the rail — so clamping only against the true
 * duration would let a drop land a spot whose RENDERED box runs off the
 * bottom of the day, even though the underlying instants are still both
 * inside it. Duration itself is never changed here — the caller supplies a
 * new start only (per the mission's own rule) and recomputes the real
 * `endAt` from the unmodified duration, server-side.
 *
 * A duration at or beyond a full day (including one that would push a block
 * past midnight) collapses `maxStart` to 0 via the inner `Math.max`, which
 * is a real, exercised branch — see the test for a block that's longer than
 * the room the day has left.
 */
export function clampStartMinutes(startMinutes: number, durationMinutes: number): number {
  const reservedMinutes = Math.max(durationMinutes, MIN_BLOCK_MINUTES);
  const maxStart = Math.max(0, MINUTES_PER_DAY - reservedMinutes);
  return Math.max(0, Math.min(startMinutes, maxStart));
}

// ---------------------------------------------------------------------------
// minutes-of-day -> a real Date (the DST-sensitive half)

/**
 * The true inverse of `timelineLayout.ts`'s `minutesOfDay` — given a day
 * (any `Date` on the target calendar date; only its own year/month/date are
 * read) and a minutes-of-day figure, builds the `Date` whose LOCAL wall
 * clock reads that many minutes past that day's local midnight.
 *
 * Built entirely from calendar components
 * (`new Date(year, month, date, hours, minutes)`), never
 * `startOfDay(day).getTime() + minutes * 60_000` — the two are NOT
 * equivalent on a DST transition day, and this is the one place in this
 * module a wrong choice would actually corrupt a saved time rather than
 * just misplace a drag preview. See `minutesOfDayToDate.test` cases for both
 * transition days proven against the millisecond approach, not merely
 * asserted correct.
 *
 * `minutes` is allowed to be fractional (a snap step is always a whole
 * number, but a caller previewing mid-drag before snapping is not
 * obligated to round first) — fractional minutes become fractional seconds
 * via the Date constructor's own remaining arguments, never truncated
 * ahead of time and never propagated as drift.
 */
export function minutesOfDayToDate(day: Date, minutes: number): Date {
  const base = startOfDay(day);
  const wholeMinutes = Math.floor(minutes);
  const seconds = (minutes - wholeMinutes) * 60;
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    0,
    wholeMinutes,
    seconds,
  );
}

// ---------------------------------------------------------------------------
// x offset -> column index -> date

/**
 * Which column (0-based) a horizontal pixel offset within the whole grid
 * falls in, clamped to `[0, columnCount - 1]` — a drag that overshoots the
 * grid's own edge resolves to "the last real column" rather than an
 * out-of-range index the caller would have to guard against separately.
 *
 * Returns `null` only when there is no valid column to land in at all
 * (`columnCount <= 0` or a non-positive `columnWidthPx`), which the caller
 * should treat as "stay on the day the drag started on."
 */
export function columnIndexFromOffset(
  offsetPx: number,
  columnWidthPx: number,
  columnCount: number,
): number | null {
  if (columnCount <= 0 || !(columnWidthPx > 0)) return null;
  const index = Math.floor(offsetPx / columnWidthPx);
  return Math.max(0, Math.min(index, columnCount - 1));
}

/**
 * Resolves a column index into the calendar day it represents, given the
 * SAME `columnDays` array the caller already built from
 * `VIEW_CONFIG[view].days(anchor)` (calendarViewConfig.ts) and is already
 * iterating in `TimelineGrid.tsx:350` against `columnSlots[i]` — verified at
 * dispatch to be the same array, same order, same length. This module
 * deliberately does not import `calendarViewConfig.ts` itself and does not
 * re-derive that array; a caller that already has it just hands it in.
 *
 * Returns `null` for an out-of-range index (an empty `columnDays`, or an
 * index a caller computed some other way) rather than throwing, so a
 * rounding mistake at a column boundary degrades to "no day resolved" —
 * the caller's own fallback is to keep the block on the day it started on.
 */
export function columnDateForIndex(columnDays: Date[], index: number): Date | null {
  return columnDays[index] ?? null;
}
