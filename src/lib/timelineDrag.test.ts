// Real unit tests (node:test, zero new dependencies) for the hour-timeline's
// drag math (timelineDrag.ts, mission-20/CD1/C2) — the pixel<->minutes
// inverse `blockGeometry` never had, plus snapping, day-boundary clamping,
// the DST-sensitive minutes-of-day -> Date reconstruction, and the x-offset
// -> column-index -> date mapping.
//
// Run with `npm test`, which pins TZ=America/Denver; the gauntlet re-runs
// this file directly under TZ=UTC and TZ=America/Los_Angeles to prove
// nothing here silently depends on the ambient zone. Per timelineLayout
// .test.ts's own established pattern (mission-9's lesson: a DST assertion
// built from local calendar components passes VACUOUSLY under a zone with
// no such transition, and proves nothing) — the zone-dependent cases below
// skip unless the ambient zone actually observes the transition, and one
// extra case pins America/Denver via `withTimeZone` so the DST-sensitive
// function keeps genuine coverage under UTC and Los Angeles too.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SNAP_MINUTES,
  minutesFromPixels,
  pixelsFromMinutes,
  snapMinutes,
  clampStartMinutes,
  minutesOfDayToDate,
  columnIndexFromOffset,
  columnDateForIndex,
} from "./timelineDrag";
import { MINUTES_PER_DAY, MIN_BLOCK_MINUTES, minutesOfDay } from "./timelineLayout";

function d(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month, day, hour, minute);
}

/** Same trick timelineLayout.test.ts / calendarDates.test.ts use: Node
 * re-reads `process.env.TZ` for every local Date getter/constructor, so one
 * test can pin a simulated browser zone regardless of how the suite was
 * invoked. Safe here because timelineDrag.ts touches only Date getters and
 * the local-component constructor — no `Intl.DateTimeFormat`, which would
 * freeze its zone at construction. */
function withTimeZone<T>(tz: string, run: () => T): T {
  const previous = process.env.TZ;
  process.env.TZ = tz;
  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

// Nov 1 2026 (US fall back) and Mar 8 2026 (US spring forward) — the real
// dates, not synthetic stand-ins, per this project's standing DST discipline.
const observesFallBack = () =>
  d(2026, 10, 1, 0, 0).getTimezoneOffset() !== d(2026, 10, 1, 12, 0).getTimezoneOffset();
const observesSpringForward = () =>
  d(2026, 2, 8, 0, 0).getTimezoneOffset() !== d(2026, 2, 8, 12, 0).getTimezoneOffset();

/** The WRONG way to do this conversion — millisecond arithmetic off a
 * `startOfDay` anchor — kept here ONLY as a fixture the DST tests compare
 * against, to prove the two approaches genuinely diverge on a transition
 * day rather than merely asserting the real function's output in isolation.
 * This is not a second implementation living in the app; it never leaves
 * this test file. */
function minutesOfDayToDateViaMilliseconds(day: Date, minutes: number): Date {
  const base = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  return new Date(base.getTime() + minutes * 60_000);
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

test("pixelsFromMinutes / minutesFromPixels: exhaustive round trip across realistic pxPerMinute values", () => {
  const pxPerMinuteValues = [0.5, 1, 1.5, 2, 2.5, 3, 3.5];
  for (const pxPerMinute of pxPerMinuteValues) {
    for (let minutes = 0; minutes <= MINUTES_PER_DAY; minutes += 7) {
      const px = pixelsFromMinutes(minutes, pxPerMinute);
      const roundTripped = minutesFromPixels(px, pxPerMinute);
      assert.ok(
        Math.abs(roundTripped - minutes) < 1e-9,
        `round trip drifted at minutes=${minutes}, pxPerMinute=${pxPerMinute}: got ${roundTripped}`,
      );
    }
  }
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
// minutesOfDayToDate — the DST-sensitive inverse of minutesOfDay

test("minutesOfDayToDate: round-trips with minutesOfDay on an ordinary day", () => {
  const day = d(2026, 8, 3);
  for (const minutes of [0, 1, 90, 570, 900, 1439]) {
    const built = minutesOfDayToDate(day, minutes);
    assert.equal(minutesOfDay(built), minutes);
    assert.equal(built.getFullYear(), 2026);
    assert.equal(built.getMonth(), 8);
    assert.equal(built.getDate(), 3);
  }
});

test("minutesOfDayToDate: a fractional minutes value becomes fractional seconds, not truncated drift", () => {
  const day = d(2026, 8, 3);
  const built = minutesOfDayToDate(day, 90.5); // 1:30:30
  assert.equal(built.getHours(), 1);
  assert.equal(built.getMinutes(), 30);
  assert.equal(built.getSeconds(), 30);
});

test(
  "DST fall-back (Nov 1 2026): late-evening minutes must use calendar components, not milliseconds",
  { skip: observesFallBack() ? false : "ambient zone has no fall-back transition" },
  () => {
    const day = d(2026, 10, 1); // the real 25-hour day
    const minutes = 23 * 60; // intended wall clock: 11 PM

    const correct = minutesOfDayToDate(day, minutes);
    assert.equal(correct.getHours(), 23, "component construction lands on the intended 11 PM");
    assert.equal(correct.getMinutes(), 0);
    assert.equal(correct.getDate(), 1, "and stays on Nov 1 — the day the drag actually targeted");

    const wrong = minutesOfDayToDateViaMilliseconds(day, minutes);
    assert.notEqual(
      wrong.getTime(),
      correct.getTime(),
      "the ms approach must genuinely diverge on this transition day, or this test proves nothing",
    );
    assert.equal(wrong.getHours(), 22, "the ms approach drifts an hour EARLY across the repeated hour");
  },
);

test(
  "DST fall-back (Nov 1 2026): the repeated 1 AM resolves to the FIRST occurrence and round-trips",
  { skip: observesFallBack() ? false : "ambient zone has no fall-back transition" },
  () => {
    const day = d(2026, 10, 1);
    const built = minutesOfDayToDate(day, 90); // 1:30 AM
    assert.equal(built.getHours(), 1);
    assert.equal(built.getMinutes(), 30);
    assert.equal(minutesOfDay(built), 90, "round-trips exactly through minutesOfDay, ambiguity and all");
  },
);

test(
  "DST spring-forward (Mar 8 2026): the missing 2 AM normalizes forward, and this diverges from the ms approach",
  { skip: observesSpringForward() ? false : "ambient zone has no spring-forward transition" },
  () => {
    const day = d(2026, 2, 8); // the real 23-hour day
    const missingHourMinutes = 2 * 60 + 10; // intended 2:10 AM, which never happens locally

    const correct = minutesOfDayToDate(day, missingHourMinutes);
    assert.equal(correct.getDate(), 8, "still Mar 8 — normalized forward within the same calendar day");
    assert.equal(correct.getHours(), 3, "2:10 AM does not exist, so it normalizes to 3:10 AM");
    assert.equal(correct.getMinutes(), 10);

    // And the case that actually matters for a drag: late-evening minutes
    // must not roll into the WRONG CALENDAR DAY, which the ms approach does
    // on this 23-hour day.
    const lateMinutes = 23 * 60; // intended 11 PM, well past the missing hour
    const correctLate = minutesOfDayToDate(day, lateMinutes);
    const wrongLate = minutesOfDayToDateViaMilliseconds(day, lateMinutes);
    assert.equal(correctLate.getDate(), 8, "correctly stays on Mar 8");
    assert.equal(correctLate.getHours(), 23);
    assert.notEqual(
      wrongLate.getTime(),
      correctLate.getTime(),
      "the ms approach must genuinely diverge here, or this test proves nothing",
    );
    assert.equal(wrongLate.getDate(), 9, "the ms approach rolls a full calendar day LATE — Mar 9, not Mar 8");
  },
);

test(
  "DST (America/Denver pinned, so this runs under TZ=UTC and TZ=America/Los_Angeles too): the divergence is deliberate, not ambient luck",
  () => {
    withTimeZone("America/Denver", () => {
      const day = d(2026, 10, 1);
      const lateMinutes = 23 * 60;
      const correct = minutesOfDayToDate(day, lateMinutes);
      const wrong = minutesOfDayToDateViaMilliseconds(day, lateMinutes);
      // THE PIN'S OWN PROOF: under a zone with no fall-back at all (say
      // TZ=UTC, where this whole `withTimeZone` block is itself running),
      // the two approaches would agree — so first confirm they genuinely
      // disagree here, under the zone that actually has the transition.
      assert.notEqual(wrong.getTime(), correct.getTime());
      assert.equal(correct.getHours(), 23);
      assert.equal(wrong.getHours(), 22);
    });

    // And outside the pin, still whatever zone the gauntlet leg is running
    // under, a same-day round trip on an ORDINARY day (no transition
    // involved at all) must still hold — proving this pinned case adds
    // coverage rather than replacing the ambient-zone tests above.
    const ordinaryDay = d(2026, 6, 15);
    const built = minutesOfDayToDate(ordinaryDay, 600);
    assert.equal(minutesOfDay(built), 600);
  },
);

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
// the whole pipeline composed, the way C5's wiring will actually call it

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
