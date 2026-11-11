// Real unit tests (node:test, zero new dependencies) for the hour-timeline's
// drag math (timelineDrag.ts; written on the old CD1 branch, mission 20,
// ported in mission 70): the DST-sensitive minutes-of-day -> Date
// reconstruction, and (mission 70) `resolveDrop`, the whole drop in one
// call, and `canLiftOnTimeline`. The pixel, snapping, clamping and column
// tests live in the sibling `timelineDragPixels.test.ts` (split in mission
// 70, F1).
//
// Run with `npm test`, which pins TZ=America/Denver; the gauntlet re-runs
// this file directly under TZ=UTC to prove nothing here silently depends on
// the ambient zone. Per timelineLayout
// .test.ts's own established pattern (mission-9's lesson: a DST assertion
// built from local calendar components passes VACUOUSLY under a zone with
// no such transition, and proves nothing) — the zone-dependent cases below
// skip unless the ambient zone actually observes the transition, and one
// extra case pins America/Denver via `withTimeZone` so the DST-sensitive
// function keeps genuine coverage under UTC and Los Angeles too.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canLiftOnTimeline,
  minutesOfDayToDate,
  resolveDrop,
  type DropInput,
} from "./timelineDrag";
import { minutesOfDay } from "./timelineLayout";
// The shared home for this helper (testing/withTimeZone.ts says what it
// does, why it's safe, and which older test files still carry an inline
// copy). Safe here because timelineDrag.ts touches only Date
// getters and the local-component constructor — no `Intl.DateTimeFormat`,
// which would freeze its zone at construction.
import { withTimeZone } from "./testing/withTimeZone";

function d(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month, day, hour, minute);
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
// resolveDrop — the whole drop in one call (mission 70)

/** A Sun..Sat week of columns 100px wide, 2px per minute (120px hours),
 * scrolled 1000px down, an event 9:00 to 10:00 on Tuesday grabbed 30px below
 * its top. Each test overrides only what it is about. */
function dropInput(overrides: Partial<DropInput> = {}): DropInput {
  const columnDays = [0, 1, 2, 3, 4, 5, 6].map((i) => d(2026, 8, 6 + i)); // Sun Sep 6 .. Sat Sep 12
  return {
    fingerX: 250,
    fingerY: 200,
    grabOffsetY: 30,
    scrollTop: 1000,
    visibleHeightPx: 600,
    pxPerMinute: 2,
    columnCount: 7,
    columnWidthPx: 100,
    columnDays,
    originalStart: d(2026, 8, 8, 9, 0),
    durationMinutes: 60,
    ...overrides,
  };
}

/** A scroll position and finger y (kept inside the visible hours) that put
 * the block's top at `minutes` for `input`'s zoom and grab offset. */
function placeAt(minutes: number, input = dropInput()): { scrollTop: number; fingerY: number } {
  const topPx = minutes * input.pxPerMinute + input.grabOffsetY;
  const fingerY = Math.min(topPx, input.visibleHeightPx / 2);
  return { scrollTop: topPx - fingerY, fingerY };
}

test("resolveDrop: the block's top is scrollTop + finger - grab offset, in the column under the finger", () => {
  // 1000 + 200 - 30 = 1170px = 585 minutes = 9:45, column 2 (Tue Sep 8).
  const start = resolveDrop(dropInput());
  assert.ok(start);
  assert.equal(start.getDate(), 8);
  assert.equal(start.getHours(), 9);
  assert.equal(start.getMinutes(), 45);
});

test("resolveDrop: the mission's database case, 9 to 10 AM dragged onto 2:15 PM", () => {
  const start = resolveDrop(dropInput({ ...placeAt(14 * 60 + 15) }));
  assert.deepEqual(start, d(2026, 8, 8, 14, 15));
});

test("resolveDrop: uses the LIVE pxPerMinute, so the same finger means a different time at another zoom", () => {
  // Same 1170px top: 585 min at 2px/min (9:45), 1170 min at 1px/min (7:30 PM).
  assert.deepEqual(resolveDrop(dropInput({ pxPerMinute: 2 })), d(2026, 8, 8, 9, 45));
  assert.deepEqual(resolveDrop(dropInput({ pxPerMinute: 1 })), d(2026, 8, 8, 19, 30));
  // And pinched in to 4px/min: 1170 / 4 = 292.5 minutes (4:52:30), snaps to 5:00 AM.
  assert.deepEqual(resolveDrop(dropInput({ pxPerMinute: 4 })), d(2026, 8, 8, 5, 0));
});

test("resolveDrop: the grab offset keeps the block under the finger instead of jumping its top to it", () => {
  // Grabbed 60px (30 minutes) lower down the block: the start is 30 minutes earlier.
  assert.deepEqual(resolveDrop(dropInput({ grabOffsetY: 0 })), d(2026, 8, 8, 10, 0));
  assert.deepEqual(resolveDrop(dropInput({ grabOffsetY: 60 })), d(2026, 8, 8, 9, 30));
});

test("resolveDrop: the scroll position counts (the hours scroll under a held block)", () => {
  assert.deepEqual(resolveDrop(dropInput({ scrollTop: 1120 })), d(2026, 8, 8, 10, 45));
});

test("resolveDrop: the column is the one under the finger, edges included", () => {
  assert.equal(resolveDrop(dropInput({ fingerX: 0 }))?.getDate(), 6, "first pixel is Sunday");
  assert.equal(resolveDrop(dropInput({ fingerX: 99 }))?.getDate(), 6, "last pixel of Sunday");
  assert.equal(resolveDrop(dropInput({ fingerX: 100 }))?.getDate(), 7, "first pixel of Monday");
  assert.equal(resolveDrop(dropInput({ fingerX: 699 }))?.getDate(), 12, "last pixel of Saturday");
});

test("resolveDrop: a moved day keeps the wall-clock time", () => {
  const start = resolveDrop(dropInput({ fingerX: 550, ...placeAt(9 * 60) }));
  assert.deepEqual(start, d(2026, 8, 11, 9, 0), "Friday 9:00, same hour, new day");
});

test("resolveDrop: snaps to the clock's 15-minute marks", () => {
  // 7 minutes past 9 rounds down, 8 minutes past rounds up (midpoint 7.5).
  assert.deepEqual(resolveDrop(dropInput({ fingerX: 50, ...placeAt(9 * 60 + 7) })), d(2026, 8, 6, 9, 0));
  assert.deepEqual(resolveDrop(dropInput({ fingerX: 50, ...placeAt(9 * 60 + 8) })), d(2026, 8, 6, 9, 15));
  for (const minutes of [0, 13, 301, 777, 1203]) {
    const start = resolveDrop(dropInput({ ...placeAt(minutes), fingerX: 50 }));
    assert.ok(start);
    assert.equal(start.getMinutes() % 15, 0, `minute ${minutes} lands on a 15-minute mark`);
  }
});

test("resolveDrop: clamps inside the day at both ends, never spilling into another day", () => {
  // Dragged up past midnight: the top of the day.
  assert.deepEqual(resolveDrop(dropInput({ scrollTop: 0, fingerY: 10, grabOffsetY: 50 })), d(2026, 8, 8, 0, 0));
  // Dragged past the bottom with a 90-minute event: 10:30 PM, so it ends at midnight.
  const late = resolveDrop(dropInput({ scrollTop: 2800, fingerY: 590, grabOffsetY: 0, durationMinutes: 90 }));
  assert.deepEqual(late, d(2026, 8, 8, 22, 30));
  // A 10-minute event still reserves the 30-minute drawn box.
  const short = resolveDrop(dropInput({ scrollTop: 2800, fingerY: 590, grabOffsetY: 0, durationMinutes: 10 }));
  assert.deepEqual(short, d(2026, 8, 8, 23, 30));
});

test("resolveDrop: null outside the grid on every side", () => {
  assert.equal(resolveDrop(dropInput({ fingerX: -1 })), null, "left of the first column (the hour gutter)");
  assert.equal(resolveDrop(dropInput({ fingerX: 700 })), null, "right of the last column");
  assert.equal(resolveDrop(dropInput({ fingerY: -1 })), null, "above the hours (the header)");
  assert.equal(resolveDrop(dropInput({ fingerY: 601 })), null, "below the hours");
  // The very edges of the visible area are still inside.
  assert.ok(resolveDrop(dropInput({ fingerY: 0 })));
  assert.ok(resolveDrop(dropInput({ fingerY: 600 })));
});

test("resolveDrop: null for a grid it cannot measure, never a guessed time", () => {
  assert.equal(resolveDrop(dropInput({ columnCount: 0 })), null, "no columns");
  assert.equal(resolveDrop(dropInput({ columnWidthPx: 0 })), null, "zero-width columns");
  assert.equal(resolveDrop(dropInput({ pxPerMinute: 0 })), null, "no hour height (would otherwise read as midnight)");
  assert.equal(resolveDrop(dropInput({ pxPerMinute: Number.NaN })), null);
  assert.equal(resolveDrop(dropInput({ columnDays: [] })), null, "a column count the days array does not back");
});

test("resolveDrop: null when the block lands back on its own day and minute", () => {
  assert.equal(resolveDrop(dropInput({ ...placeAt(9 * 60) })), null);
  assert.equal(resolveDrop(dropInput({ ...placeAt(9 * 60 + 5) })), null, "within the snap");
  // Same minute, another day, is a move.
  assert.deepEqual(resolveDrop(dropInput({ fingerX: 350, ...placeAt(9 * 60) })), d(2026, 8, 9, 9, 0));
});

test("resolveDrop: an event off the 15-minute marks dropped where it was snaps to a mark (a real move)", () => {
  const input = dropInput({ originalStart: d(2026, 8, 8, 9, 7) });
  assert.deepEqual(resolveDrop({ ...input, ...placeAt(9 * 60 + 7, input) }), d(2026, 8, 8, 9, 0));
});

test("resolveDrop: DST days (America/Denver pinned, so this runs under TZ=UTC too) land on the wall clock shown", () => {
  withTimeZone("America/Denver", () => {
    // Fall back, Nov 1 2026 (25 hours): a drop at 11 PM is 11 PM on Nov 1,
    // where milliseconds from midnight would read 10 PM.
    const fallDays = [d(2026, 9, 31), d(2026, 10, 1), d(2026, 10, 2)];
    const base = { columnDays: fallDays, columnCount: 3, originalStart: d(2026, 9, 31, 9, 0) };
    const late = resolveDrop(dropInput({ ...base, fingerX: 150, ...placeAt(23 * 60) }));
    assert.ok(late);
    assert.equal(late.getDate(), 1);
    assert.equal(late.getHours(), 23);
    assert.equal(late.getMinutes(), 0);
    assert.equal(minutesOfDay(late), 23 * 60);

    // Spring forward, Mar 8 2026 (23 hours): a drop at 10 PM stays on Mar 8,
    // where milliseconds from midnight would read 11 PM.
    const springDays = [d(2026, 2, 7), d(2026, 2, 8), d(2026, 2, 9)];
    const springBase = { columnDays: springDays, columnCount: 3, originalStart: d(2026, 2, 7, 9, 0) };
    const evening = resolveDrop(dropInput({ ...springBase, fingerX: 150, ...placeAt(22 * 60) }));
    assert.ok(evening);
    assert.equal(evening.getDate(), 8);
    assert.equal(evening.getHours(), 22);
    // And the proof this is not vacuous: under Denver the ms approach disagrees.
    assert.notEqual(
      minutesOfDayToDateViaMilliseconds(springDays[1], 22 * 60).getTime(),
      evening.getTime(),
    );

    // An event in the repeated 1 AM hour put back where it was is no move.
    const secondOneThirty = new Date(d(2026, 10, 1, 0, 30).getTime() + 2 * 60 * 60_000); // 1:30 MST
    assert.equal(secondOneThirty.getHours(), 1);
    const back = resolveDrop(
      dropInput({ ...base, originalStart: secondOneThirty, fingerX: 150, ...placeAt(90) }),
    );
    assert.equal(back, null);
  });
});

// ---------------------------------------------------------------------------
// canLiftOnTimeline — which timed blocks may be held and dragged (mission 70)

test("canLiftOnTimeline: an event that starts and ends on one day may lift", () => {
  assert.equal(canLiftOnTimeline({ startAt: d(2026, 10, 11, 9), endAt: d(2026, 10, 11, 10) }), true);
});

test("canLiftOnTimeline: an event that crosses midnight may not lift", () => {
  assert.equal(canLiftOnTimeline({ startAt: d(2026, 10, 11, 23), endAt: d(2026, 10, 12, 1) }), false);
});

test("canLiftOnTimeline: an event that ends exactly at midnight is still one day and may lift", () => {
  assert.equal(canLiftOnTimeline({ startAt: d(2026, 10, 11, 22), endAt: d(2026, 10, 12, 0) }), true);
});
