// Real unit tests (node:test, zero new dependencies) for the Schedule
// view's pure windowing/grouping helpers — mission-15 (CV3), contract C2.
// Run with `npm test`, which pins TZ=America/Denver; the gauntlet re-runs
// this file directly under TZ=UTC and TZ=America/Los_Angeles to prove
// nothing here silently depends on the ambient zone. This file lives
// directly in src/lib/ — the only place (plus src/lib/voice/) the test
// glob (`package.json` + two CI steps, all three hand-enumerated) reaches;
// a new subdirectory would silently drop these tests from all three.
//
// Same DST-vacuity trap `timelineLayout.test.ts` and `monthLayout.test.ts`
// already document: a fall-back/spring-forward assertion built from local
// calendar components passes VACUOUSLY under a zone with no such
// transition (UTC has neither), so the zone-dependent cases below skip
// unless the ambient zone actually observes the transition, and one case
// pins America/Denver via `withTimeZone` so the tiling rule keeps genuine
// coverage under UTC too.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHUNK_DAYS,
  mergeWindow,
  nextBackwardChunk,
  nextForwardChunk,
  scheduleRows,
  type ScheduleEvent,
} from "./scheduleWindow";
import { calendarDayDiff } from "./calendarDates";
import { addDays } from "./mealPlanDates";

function d(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month, day, hour, minute);
}

/** A schedule entry; `id` doubles as the deterministic tiebreak. */
function ev(id: string, startAt: Date, endAt: Date, allDay = false): ScheduleEvent {
  return { id, startAt, endAt, allDay };
}

/** Same trick calendarDates.test.ts / timelineLayout.test.ts use: Node
 * re-reads `process.env.TZ` for every local Date getter/constructor, so one
 * test can pin a simulated browser zone regardless of how the suite was
 * invoked. Safe here because scheduleWindow.ts touches only Date getters
 * and mealPlanDates/calendarDates' own local-getter helpers — no
 * `Intl.DateTimeFormat`, which would freeze its zone at construction. */
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

// Mar 8 2026 (US spring forward) and Nov 1 2026 (US fall back) — the real
// dates, not synthetic stand-ins, per this project's standing DST discipline.
const observesSpringForward = () =>
  d(2026, 2, 8, 0, 0).getTimezoneOffset() !== d(2026, 2, 8, 12, 0).getTimezoneOffset();
const observesFallBack = () =>
  d(2026, 10, 1, 0, 0).getTimezoneOffset() !== d(2026, 10, 1, 12, 0).getTimezoneOffset();

/** Asserts a chunk is exactly CHUNK_DAYS long and that walking it day by day
 * via `addDays` never skips or repeats a calendar day — the same
 * "no-gap-no-duplicate" discipline `monthLayout.test.ts`'s
 * `assertConsecutiveNoGapNoDuplicate` established, applied to a chunk's own
 * half-open range instead of a pre-built list. */
function assertExactChunk(chunk: { start: Date; end: Date }): void {
  assert.equal(calendarDayDiff(chunk.start, chunk.end), CHUNK_DAYS);
  let cursor = chunk.start;
  for (let i = 0; i < CHUNK_DAYS; i++) {
    const next = addDays(cursor, 1);
    assert.equal(calendarDayDiff(cursor, next), 1, `day ${i} should be exactly 1 day after day ${i - 1}`);
    cursor = next;
  }
  assert.equal(cursor.getTime(), chunk.end.getTime(), "walking CHUNK_DAYS days from start lands exactly on end");
}

// ---------------------------------------------------------------------------
// mergeWindow

test("mergeWindow: a multi-day event seen in two overlapping chunks is stored once", () => {
  // A 10-day all-day event, Jan 25 - Feb 4 (exclusive end), overlapping both
  // a Jan chunk and a Feb chunk.
  const spanning = ev("spanning", d(2026, 0, 25), d(2026, 1, 4), true);

  const janChunk = { start: d(2026, 0, 1), end: d(2026, 1, 1) };
  const febChunk = { start: d(2026, 1, 1), end: d(2026, 2, 1) };

  let map = mergeWindow(new Map(), janChunk.start, janChunk.end, [spanning]);
  assert.equal(map.size, 1);
  map = mergeWindow(map, febChunk.start, febChunk.end, [spanning]);
  assert.equal(map.size, 1, "the same event fetched from a second overlapping chunk must not duplicate");
  assert.equal(map.get("spanning"), spanning);
});

test("mergeWindow: an event deleted on the server drops when its window is re-fetched", () => {
  const chunk = { start: d(2026, 3, 1), end: d(2026, 4, 1) };
  const survivor = ev("survivor", d(2026, 3, 5), d(2026, 3, 6));
  const deleted = ev("deleted", d(2026, 3, 10), d(2026, 3, 11));

  let map = mergeWindow(new Map(), chunk.start, chunk.end, [survivor, deleted]);
  assert.equal(map.size, 2);

  // Re-fetching the exact same range, but the server no longer returns
  // "deleted" — it was removed since the last fetch.
  map = mergeWindow(map, chunk.start, chunk.end, [survivor]);
  assert.equal(map.size, 1);
  assert.ok(map.has("survivor"));
  assert.ok(!map.has("deleted"), "an event that no longer overlaps a re-fetched window must be dropped");
});

test("mergeWindow: an event outside this window is left untouched even when the fetch comes back empty", () => {
  const untouchedChunk = { start: d(2026, 0, 1), end: d(2026, 1, 1) };
  const outsider = ev("outsider", d(2026, 0, 15), d(2026, 0, 16));
  const seed = mergeWindow(new Map(), untouchedChunk.start, untouchedChunk.end, [outsider]);
  assert.equal(seed.size, 1);

  // A completely different, non-overlapping window fetched empty must not
  // touch "outsider" — it never claimed authority over January.
  const otherChunk = { start: d(2026, 1, 1), end: d(2026, 2, 1) };
  const result = mergeWindow(seed, otherChunk.start, otherChunk.end, []);
  assert.equal(result.size, 1);
  assert.ok(result.has("outsider"));
});

test("mergeWindow: a freshly fetched event overwrites the stale copy under the same id", () => {
  const chunk = { start: d(2026, 5, 1), end: d(2026, 6, 1) };
  const original = ev("edited", d(2026, 5, 10, 9, 0), d(2026, 5, 10, 10, 0));
  const edited = ev("edited", d(2026, 5, 10, 14, 0), d(2026, 5, 10, 15, 0));

  let map = mergeWindow(new Map(), chunk.start, chunk.end, [original]);
  map = mergeWindow(map, chunk.start, chunk.end, [edited]);
  assert.equal(map.size, 1);
  assert.equal(map.get("edited"), edited, "the newer fetch's copy must win, not the first one merged");
});

test("mergeWindow: never mutates the map it was given", () => {
  const chunk = { start: d(2026, 7, 1), end: d(2026, 8, 1) };
  const original = new Map<string, ScheduleEvent>();
  mergeWindow(original, chunk.start, chunk.end, [ev("new", d(2026, 7, 5), d(2026, 7, 6))]);
  assert.equal(original.size, 0, "mergeWindow must return a NEW map, leaving its input untouched");
});

// ---------------------------------------------------------------------------
// nextBackwardChunk / nextForwardChunk

test("nextBackwardChunk / nextForwardChunk: exactly CHUNK_DAYS, and three chunks in a row tile with no gap or double-count", () => {
  const loadedStart = d(2026, 5, 15);
  const loadedEnd = d(2026, 6, 15);

  const back1 = nextBackwardChunk(loadedStart);
  assertExactChunk(back1);
  assert.equal(back1.end.getTime(), loadedStart.getTime(), "the backward chunk's end must be exactly the already-loaded start");

  const back2 = nextBackwardChunk(back1.start);
  assertExactChunk(back2);
  assert.equal(back2.end.getTime(), back1.start.getTime());

  const forward1 = nextForwardChunk(loadedEnd);
  assertExactChunk(forward1);
  assert.equal(forward1.start.getTime(), loadedEnd.getTime(), "the forward chunk's start must be exactly the already-loaded end");

  const forward2 = nextForwardChunk(forward1.end);
  assertExactChunk(forward2);
  assert.equal(forward2.start.getTime(), forward1.end.getTime());
});

test("nextBackwardChunk / nextForwardChunk: snap to local midnight even when handed a mid-day instant", () => {
  const midDay = d(2026, 5, 15, 13, 30);
  const back = nextBackwardChunk(midDay);
  assert.equal(back.end.getHours(), 0);
  assert.equal(back.end.getMinutes(), 0);
  const forward = nextForwardChunk(midDay);
  assert.equal(forward.start.getHours(), 0);
  assert.equal(forward.start.getMinutes(), 0);
});

test(
  "nextForwardChunk across the real Mar 8 2026 spring-forward: still exactly 30 days, no day skipped or duplicated",
  { skip: observesSpringForward() ? false : "ambient zone has no spring-forward transition" },
  () => {
    const chunk = nextForwardChunk(d(2026, 1, 20)); // Feb 20 -> spans into March
    assertExactChunk(chunk);
  },
);

test(
  "nextBackwardChunk across the real Nov 1 2026 fall-back: still exactly 30 days, no day skipped or duplicated",
  { skip: observesFallBack() ? false : "ambient zone has no fall-back transition" },
  () => {
    const chunk = nextBackwardChunk(d(2026, 10, 20)); // Nov 20, backward -> spans across Nov 1
    assertExactChunk(chunk);
  },
);

test("DST (America/Denver pinned, so this runs under TZ=UTC too): chunk tiling holds across both real 2026 transitions", () => {
  withTimeZone("America/Denver", () => {
    assertExactChunk(nextForwardChunk(d(2026, 1, 20))); // spans Mar 8 spring-forward
    assertExactChunk(nextBackwardChunk(d(2026, 10, 20))); // spans Nov 1 fall-back
  });
});

// ---------------------------------------------------------------------------
// scheduleRows

test("scheduleRows: today is included even when it holds nothing", () => {
  const windowStart = d(2026, 5, 1);
  const windowEnd = d(2026, 5, 10);
  const today = d(2026, 5, 5); // holds no events at all
  const groups = scheduleRows([], windowStart, windowEnd, today);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].days.length, 1);
  assert.equal(groups[0].days[0].day.getTime(), d(2026, 5, 5).getTime());
  assert.deepEqual(groups[0].days[0].events, []);
});

test("scheduleRows: a day with no events, and that isn't today, is omitted entirely", () => {
  const windowStart = d(2026, 5, 1);
  const windowEnd = d(2026, 5, 10);
  const today = d(2026, 5, 5);
  const onlyEvent = ev("only", d(2026, 5, 3, 9, 0), d(2026, 5, 3, 10, 0));
  const groups = scheduleRows([onlyEvent], windowStart, windowEnd, today);
  const days = groups.flatMap((g) => g.days);
  // Jun 3 (the event) and Jun 5 (today) both appear; every other day in the
  // window (Jun 1-2, 4, 6-9) is genuinely empty and not today, so it must
  // not appear at all.
  assert.equal(days.length, 2);
  assert.deepEqual(
    days.map((row) => row.day.getDate()).sort((a, b) => a - b),
    [3, 5],
  );
});

test("scheduleRows: today outside the loaded window is not force-included", () => {
  const windowStart = d(2026, 5, 1);
  const windowEnd = d(2026, 5, 10);
  const todayFarAway = d(2026, 8, 1); // September — nowhere near this window
  const groups = scheduleRows([], windowStart, windowEnd, todayFarAway);
  assert.equal(groups.length, 0, "nothing in the window has anything, and today isn't in the window either");
});

test("scheduleRows: groups split at a month boundary", () => {
  const windowStart = d(2026, 5, 28); // Jun 28
  const windowEnd = d(2026, 6, 3); // Jul 3 (exclusive)
  const today = d(2026, 5, 1); // outside this window entirely, on purpose
  const juneEvent = ev("june", d(2026, 5, 29, 9, 0), d(2026, 5, 29, 10, 0));
  const julyEvent = ev("july", d(2026, 6, 1, 9, 0), d(2026, 6, 1, 10, 0));
  const groups = scheduleRows([juneEvent, julyEvent], windowStart, windowEnd, today);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].monthStart.getMonth(), 5);
  assert.equal(groups[0].days.length, 1);
  assert.equal(groups[0].days[0].day.getDate(), 29);
  assert.equal(groups[1].monthStart.getMonth(), 6);
  assert.equal(groups[1].days.length, 1);
  assert.equal(groups[1].days[0].day.getDate(), 1);
});

test("scheduleRows: events within a day are sorted by start time, then id as a deterministic tiebreak", () => {
  const windowStart = d(2026, 5, 1);
  const windowEnd = d(2026, 5, 2);
  const today = d(2026, 5, 1);
  const late = ev("z-late", d(2026, 5, 1, 15, 0), d(2026, 5, 1, 16, 0));
  const earlyB = ev("b-tie", d(2026, 5, 1, 8, 0), d(2026, 5, 1, 9, 0));
  const earlyA = ev("a-tie", d(2026, 5, 1, 8, 0), d(2026, 5, 1, 9, 0));
  const groups = scheduleRows([late, earlyB, earlyA], windowStart, windowEnd, today);
  const ids = groups[0].days[0].events.map((e) => e.id);
  assert.deepEqual(ids, ["a-tie", "b-tie", "z-late"]);
});

test("scheduleRows: a multi-day event appears on every day it covers, within the window", () => {
  const windowStart = d(2026, 5, 1);
  const windowEnd = d(2026, 5, 10);
  const today = d(2026, 6, 1); // outside the window, so it adds nothing extra
  // All-day Jun 3 - Jun 6 (exclusive end) covers Jun 3, 4, 5.
  const trip = ev("trip", d(2026, 5, 3), d(2026, 5, 6), true);
  const groups = scheduleRows([trip], windowStart, windowEnd, today);
  const days = groups.flatMap((g) => g.days);
  assert.deepEqual(
    days.map((row) => row.day.getDate()),
    [3, 4, 5],
  );
  days.forEach((row) => assert.deepEqual(row.events, [trip]));
});

test("scheduleRows: an empty window with today also outside it produces no groups at all", () => {
  const groups = scheduleRows([], d(2026, 5, 1), d(2026, 5, 1), d(2026, 6, 1));
  assert.deepEqual(groups, []);
});
