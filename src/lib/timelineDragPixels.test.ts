// Real unit tests (node:test, zero new dependencies) for the pixel and
// column half of the hour-timeline's drag math (timelineDrag.ts; written on
// the old CD1 branch, mission 20, ported in mission 70): the pixel<->minutes
// inverse `blockGeometry` never had, snapping, day-boundary clamping, the
// x-offset -> column-index -> date mapping, and the pipeline composed by
// hand. Split out in mission 70 (F1) so neither file grows past the soft
// cap; the sibling `timelineDrag.test.ts` holds the DST-sensitive
// `minutesOfDayToDate`, `resolveDrop` and `canLiftOnTimeline`.
//
// Run with `npm test` (TZ=America/Denver); the gauntlet re-runs it under
// TZ=UTC. Nothing here reads the ambient zone: every Date is built from
// local calendar parts and read back with local getters.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SNAP_MINUTES,
  minutesFromPixels,
  snapMinutes,
  clampStartMinutes,
  minutesOfDayToDate,
  columnIndexFromOffset,
  columnDateForIndex,
} from "./timelineDrag";
import { MINUTES_PER_DAY, MIN_BLOCK_MINUTES } from "./timelineLayout";

function d(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month, day, hour, minute);
}

// ---------------------------------------------------------------------------
// pixels <-> minutes

test("minutesFromPixels: the inverse of topMinutes * pxPerMinute", () => {
  assert.equal(minutesFromPixels(0, 2), 0);
  assert.equal(minutesFromPixels(180, 2), 90);
  assert.equal(minutesFromPixels(45, 0.5), 90);
});

test("minutesFromPixels: a non-positive pxPerMinute returns 0, never Infinity/NaN", () => {
  assert.equal(minutesFromPixels(100, 0), 0);
  assert.equal(minutesFromPixels(100, -1), 0);
});

// ---------------------------------------------------------------------------
// snapping

test("snapMinutes: a value already exactly on a 15-minute mark is unchanged", () => {
  assert.equal(snapMinutes(0), 0);
  assert.equal(snapMinutes(15), 15);
  assert.equal(snapMinutes(450), 450); // 7:30
});

test("snapMinutes: either side of the midpoint between two marks", () => {
  // Marks at 15 and 30; midpoint is 22.5.
  assert.equal(snapMinutes(21), 15, "just below the midpoint rounds down");
  assert.equal(snapMinutes(22), 15, "still below the midpoint rounds down");
  assert.equal(snapMinutes(23), 30, "just above the midpoint rounds up");
  assert.equal(snapMinutes(24), 30, "further above rounds up");
});

test("snapMinutes: an exact tie rounds up, matching Math.round's own convention", () => {
  assert.equal(snapMinutes(22.5), 30);
});

test("snapMinutes: a custom snap step is honored", () => {
  assert.equal(snapMinutes(7, 5), 5);
  assert.equal(snapMinutes(8, 5), 10);
});

test("snapMinutes: a non-positive snap step is a no-op rather than a divide-by-zero", () => {
  assert.equal(snapMinutes(37, 0), 37);
  assert.equal(snapMinutes(37, -5), 37);
});

test("SNAP_MINUTES is the 15-minute grid the module documents", () => {
  assert.equal(SNAP_MINUTES, 15);
});

// ---------------------------------------------------------------------------
// clamping

test("clampStartMinutes: an ordinary mid-day start needs no clamping at all", () => {
  assert.equal(clampStartMinutes(540, 60), 540); // 9 AM, 1-hour event
});

test("clampStartMinutes: the top of the day", () => {
  assert.equal(clampStartMinutes(0, 60), 0);
  assert.equal(clampStartMinutes(-30, 60), 0, "a negative candidate clamps up to midnight");
});

test("clampStartMinutes: the bottom of the day respects MIN_BLOCK_MINUTES, not just the real duration", () => {
  // A 5-minute event dragged to the very last minute of the day: its
  // RENDERED box (blockGeometry's own pad) will always be MIN_BLOCK_MINUTES
  // tall, so the room reserved must be at least that much even though the
  // true duration is far shorter.
  const maxStartForShortEvent = MINUTES_PER_DAY - MIN_BLOCK_MINUTES;
  assert.equal(clampStartMinutes(MINUTES_PER_DAY - 5, 5), maxStartForShortEvent);
  assert.equal(clampStartMinutes(MINUTES_PER_DAY, 5), maxStartForShortEvent);
});

test("clampStartMinutes: an ordinary (>= MIN_BLOCK_MINUTES) duration clamps against its OWN length", () => {
  const durationMinutes = 90;
  const maxStart = MINUTES_PER_DAY - durationMinutes;
  assert.equal(clampStartMinutes(maxStart, durationMinutes), maxStart, "exactly at the edge stays put");
  assert.equal(clampStartMinutes(maxStart + 45, durationMinutes), maxStart, "past the edge is pulled back");
});

test("clampStartMinutes: a block whose duration would push it past midnight regardless of start collapses to 0", () => {
  // A duration at or beyond a full day: there is no start (other than 0)
  // that keeps the whole block on one day, so every candidate resolves to
  // the top of the day rather than a negative "room left."
  assert.equal(clampStartMinutes(0, MINUTES_PER_DAY), 0);
  assert.equal(clampStartMinutes(700, MINUTES_PER_DAY), 0);
  assert.equal(clampStartMinutes(700, MINUTES_PER_DAY + 200), 0, "even a duration longer than the day itself");
});

// ---------------------------------------------------------------------------
// x offset -> column index -> date

test("columnIndexFromOffset: an ordinary offset lands in the expected column", () => {
  assert.equal(columnIndexFromOffset(0, 100, 7), 0);
  assert.equal(columnIndexFromOffset(99, 100, 7), 0);
  assert.equal(columnIndexFromOffset(100, 100, 7), 1);
  assert.equal(columnIndexFromOffset(650, 100, 7), 6);
});

test("columnIndexFromOffset: clamps a negative offset to the first column", () => {
  assert.equal(columnIndexFromOffset(-50, 100, 7), 0);
});

test("columnIndexFromOffset: clamps an overshoot past the grid's own edge to the last column", () => {
  assert.equal(columnIndexFromOffset(10_000, 100, 7), 6);
});

test("columnIndexFromOffset: null when there is nothing to land in", () => {
  assert.equal(columnIndexFromOffset(50, 100, 0), null, "no columns at all");
  assert.equal(columnIndexFromOffset(50, 0, 7), null, "a zero-width column can't be divided into");
  assert.equal(columnIndexFromOffset(50, -10, 7), null, "a negative width is nonsensical, not a crash");
});

test("columnDateForIndex: resolves an in-range index straight from the caller's own columnDays array", () => {
  const columnDays = [d(2026, 8, 2), d(2026, 8, 3), d(2026, 8, 4)];
  assert.deepEqual(columnDateForIndex(columnDays, 0), columnDays[0]);
  assert.deepEqual(columnDateForIndex(columnDays, 2), columnDays[2]);
});

test("columnDateForIndex: null for an out-of-range index, including on an empty array", () => {
  const columnDays = [d(2026, 8, 2), d(2026, 8, 3)];
  assert.equal(columnDateForIndex(columnDays, 2), null);
  assert.equal(columnDateForIndex(columnDays, -1), null);
  assert.equal(columnDateForIndex([], 0), null);
});

// ---------------------------------------------------------------------------
// the whole pipeline composed by hand (resolveDrop below does the same in one call)

test("the full pixel-drag pipeline: offset -> minutes -> snap -> clamp -> a real Date, on an ordinary day", () => {
  const day = d(2026, 8, 3);
  const pxPerMinute = 2;
  const durationMinutes = 45;

  // A finger currently 1123px down the column.
  const rawMinutes = minutesFromPixels(1123, pxPerMinute); // 561.5
  const snapped = snapMinutes(rawMinutes); // nearest 15 -> 555 (9:15 AM)
  const clamped = clampStartMinutes(snapped, durationMinutes);
  const newStart = minutesOfDayToDate(day, clamped);

  assert.equal(snapped, 555);
  assert.equal(clamped, 555, "well within the day, so clamping is a no-op here");
  assert.equal(newStart.getHours(), 9);
  assert.equal(newStart.getMinutes(), 15);
  assert.equal(newStart.getDate(), 3);
});

test("the full pixel-drag pipeline: a drag to the very bottom of the day is pulled back to leave room for the block", () => {
  const day = d(2026, 8, 3);
  const pxPerMinute = 2;
  const durationMinutes = 20; // shorter than MIN_BLOCK_MINUTES

  const rawMinutes = minutesFromPixels(3000, pxPerMinute); // 1500, off the rail
  const snapped = snapMinutes(rawMinutes);
  const clamped = clampStartMinutes(snapped, durationMinutes);
  const newStart = minutesOfDayToDate(day, clamped);

  assert.equal(clamped, MINUTES_PER_DAY - MIN_BLOCK_MINUTES);
  assert.equal(newStart.getDate(), 3, "still the same day — clamping never lets a drag spill onto the next one");
});
