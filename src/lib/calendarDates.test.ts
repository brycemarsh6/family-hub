// Real unit tests (node:test, zero new dependencies) for the Calendar
// branch's day/span math — see calendarDates.ts's own header for the two
// rules every case here is checking: calendar-component math only, and
// "now"/"today" always arrives as a parameter, never from `new Date()`.
// Label-formatting tests (formatTimeRange, formatAllDayLabel, isPast) live
// in the sibling calendarDatesFormat.test.ts — split by concern (never by
// number, per STRUCTURE.md), mission 10's C2, because this file was at 349
// of the 350-line soft cap.
// Run with `npm test` — this file must live directly in src/lib/, since
// that's the only place (plus src/lib/voice/) the test glob reaches.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  daysOfWeek,
  calendarDayDiff,
  daysEventCovers,
  isOutsideWindow,
  formatTimeRange,
  formatAllDayLabel,
} from "./calendarDates";

function d(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month, day, hour, minute);
}

// ---------------------------------------------------------------------------
// daysOfWeek

test("daysOfWeek: seven consecutive dates from a Sunday", () => {
  const week = daysOfWeek(d(2026, 7, 9)); // Sunday, Aug 9 2026
  assert.equal(week.length, 7);
  const expected = [9, 10, 11, 12, 13, 14, 15];
  week.forEach((day, i) => {
    assert.equal(day.getFullYear(), 2026);
    assert.equal(day.getMonth(), 7);
    assert.equal(day.getDate(), expected[i]);
  });
});

test("daysOfWeek: the real Nov 1 2026 US DST fall-back week is seven genuinely consecutive dates", () => {
  // Nov 1, 2026 is a Sunday, and the week it opens is the exact week clocks
  // fall back in the US — this project tests the actual date, not a
  // synthetic stand-in, per its own established discipline.
  const week = daysOfWeek(d(2026, 10, 1));
  assert.equal(week.length, 7);
  const expectedDates = [1, 2, 3, 4, 5, 6, 7];
  week.forEach((day, i) => {
    assert.equal(day.getFullYear(), 2026);
    assert.equal(day.getMonth(), 10); // November
    assert.equal(day.getDate(), expectedDates[i]);
  });
  // No skip, no duplicate: each consecutive pair is exactly one calendar
  // day apart despite the 25-hour day sitting inside this exact week.
  for (let i = 1; i < week.length; i++) {
    const prev = week[i - 1];
    const cur = week[i];
    assert.notEqual(prev.getDate(), cur.getDate());
  }
});

test("daysOfWeek: truncates a weekStart carrying a time-of-day to local midnight", () => {
  const week = daysOfWeek(d(2026, 7, 9, 13, 45));
  assert.equal(week[0].getHours(), 0);
  assert.equal(week[0].getMinutes(), 0);
});

// ---------------------------------------------------------------------------
// calendarDayDiff
//
// Moved home from monthLayout.test.ts, mission 10's C2. It landed there
// (mission 9's C1) only because this file was already at the 349/350 cap —
// STRUCTURE.md's adoption clause always called that a debt marker, and the
// split above is the real fix. This is its function's own file again.

test("calendarDayDiff: forward, backward, and zero", () => {
  assert.equal(calendarDayDiff(d(2026, 10, 1), d(2026, 10, 1)), 0);
  assert.equal(calendarDayDiff(d(2026, 10, 1), d(2026, 10, 5)), 4);
  assert.equal(calendarDayDiff(d(2026, 10, 5), d(2026, 10, 1)), -4);
});

// ---------------------------------------------------------------------------
// daysEventCovers

test("daysEventCovers: a single-day timed event covers exactly its own day", () => {
  const week = daysOfWeek(d(2026, 7, 9));
  const covered = daysEventCovers(
    d(2026, 7, 11, 14, 0),
    d(2026, 7, 11, 15, 0),
    false,
    week,
  );
  assert.equal(covered.length, 1);
  assert.equal(covered[0].getDate(), 11);
});

test("daysEventCovers: a multi-day all-day event covers each real day, not the exclusive boundary", () => {
  const week = daysOfWeek(d(2026, 7, 9)); // Aug 9-15
  // All-day Mon-Wed, stored end exclusive as Thursday midnight.
  const covered = daysEventCovers(d(2026, 7, 10), d(2026, 7, 13), true, week);
  const dates = covered.map((day) => day.getDate());
  assert.deepEqual(dates, [10, 11, 12]);
});

test("daysEventCovers: an event entirely outside the given days covers none of them", () => {
  const week = daysOfWeek(d(2026, 7, 9)); // Aug 9-15
  const covered = daysEventCovers(d(2026, 7, 20), d(2026, 7, 21), true, week);
  assert.equal(covered.length, 0);
});

test("daysEventCovers: a multi-day timed event spanning midnight covers both calendar days", () => {
  const week = daysOfWeek(d(2026, 7, 9));
  // New Year's-Eve-style event: starts late one night, ends after midnight.
  const covered = daysEventCovers(
    d(2026, 7, 11, 22, 0),
    d(2026, 7, 12, 1, 0),
    false,
    week,
  );
  const dates = covered.map((day) => day.getDate());
  assert.deepEqual(dates, [11, 12]);
});

// ---------------------------------------------------------------------------
// Regression tests — mission-8 pass-1 blockers (Vision V1, V2)
//
// These exercise daysEventCovers — the day-boundary/span function this file
// owns — together with the two label formatters, since the bug and its fix
// were both about which calendar day an event's span belongs to; confirming
// the label output alongside the span is what proves the fix, not scope
// creep into calendarDatesFormat.test.ts's own territory.

test("REGRESSION (V1): a timed event ending exactly at local midnight belongs to the day it closes, not the day it opens", () => {
  // The natural way to type "8 PM to midnight": Sep 4 8:00 PM -> Sep 5
  // 12:00 AM. Before the fix, calendarDayDiff saw this as a genuine 2-day
  // span (firstDay Sep 4, lastDay Sep 5), so it leaked onto Sep 5 and lost
  // its time label on both days. An end instant landing exactly on
  // midnight belongs to the day it CLOSES.
  const start = d(2026, 8, 4, 20, 0); // Sep 4, 8:00 PM
  const end = d(2026, 8, 5, 0, 0); // Sep 5, 12:00 AM (exactly midnight)
  const week = [d(2026, 8, 4), d(2026, 8, 5)];

  const covered = daysEventCovers(start, end, false, week);
  assert.deepEqual(
    covered.map((day) => day.getDate()),
    [4],
    "must cover only Sep 4, not leak onto Sep 5",
  );

  // Multi-day badge must not appear for what is really a same-day event.
  assert.equal(formatAllDayLabel(start, end, false, d(2026, 8, 4)), null);
  assert.equal(formatAllDayLabel(start, end, false, d(2026, 8, 5)), null);

  // And the real time range must render, on the one day it actually covers.
  assert.equal(formatTimeRange(start, end), "8 PM – 12 AM");
});

test("REGRESSION (V1): an ordinary same-day event ending mid-afternoon is unaffected by the midnight-close rule", () => {
  // Guards against an overly broad fix: only an end instant that is
  // EXACTLY midnight (and after the start) should get the day-back
  // adjustment. 2 PM should stay 2 PM.
  const start = d(2026, 8, 4, 14, 0);
  const end = d(2026, 8, 4, 15, 0);
  const week = [d(2026, 8, 4), d(2026, 8, 5)];
  const covered = daysEventCovers(start, end, false, week);
  assert.deepEqual(
    covered.map((day) => day.getDate()),
    [4],
  );
});

test("REGRESSION (V2): a degenerate all-day event (end not after start) still renders as one day, never zero", () => {
  // validateEventInput now rejects a NEW event shaped like this (see
  // actions/calendar.ts), but eventDaySpan must independently clamp so an
  // already-saved bad row can't silently disappear from every view forever
  // — defense in depth, not a substitute for the validation.
  const start = d(2026, 7, 9); // Aug 9 midnight
  const end = d(2026, 7, 9); // exclusive end equal to start: zero real days
  const week = daysOfWeek(d(2026, 7, 9)); // Aug 9-15

  const covered = daysEventCovers(start, end, true, week);
  assert.deepEqual(
    covered.map((day) => day.getDate()),
    [9],
    "a degenerate span must still render on its own start day, not vanish",
  );
  assert.equal(formatAllDayLabel(start, end, true, d(2026, 7, 9)), "All day");
});

// ---------------------------------------------------------------------------
// isOutsideWindow — mission-8 pass-2 blocker (Vision V4)

/**
 * Temporarily forces `process.env.TZ` for the duration of `run`, then
 * restores whatever it was. Node/V8 re-reads `process.env.TZ` for every
 * local Date getter/constructor call (confirmed directly: this project's
 * own `test` script hardcodes `TZ=America/Denver` as a launch-time env var
 * for exactly this reason), so this is a reliable, zero-dependency way to
 * pin ONE test's simulated browser timezone regardless of which TZ the
 * whole suite happens to be invoked under. That matters specifically here:
 * `npm test` always forces America/Denver, but this project's own gauntlet
 * also re-runs this file directly under `TZ=UTC` to prove nothing else in
 * it silently depends on ambient TZ — and the V4 scenario below is
 * genuinely, deliberately about a Mountain browser watching a UTC-built
 * server window, so it needs a FIXED simulated browser timezone to mean
 * the same thing under either invocation. (The other three cases just
 * below don't need this — they build both the day and the window from the
 * same local calendar semantics, so they hold under any ambient TZ without
 * help.) One sharp edge (Vision pass-3, note 2): this only works for `Date`
 * getters — calendarDates.ts's module-level `Intl.DateTimeFormat`
 * instances freeze their zone at construction and never re-read `TZ`, so
 * `run` must call only isOutsideWindow here, never a formatter
 * (formatTimeRange, formatAllDayLabel — see calendarDatesFormat.test.ts).
 */
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

test("REGRESSION (V4): a day whose start is loaded but whose own local end lands past windowEnd is OUTSIDE — the boundary-day lie", () => {
  // page.tsx builds windowEnd from the SERVER's clock (UTC on Vercel);
  // CalendarViews builds `day` from the BROWSER's own clock. The household
  // browser runs America/Denver, which is BEHIND UTC, so a day whose START
  // reads as safely inside the window can still have its own local END run
  // past windowEnd — exactly the mission's reproduced case: a "Halloween
  // Party 7 PM Oct 31" row sat in the database while the old start-only
  // check called Oct 31 "loaded" and the page showed "No events" over it.
  withTimeZone("America/Denver", () => {
    const windowStart = new Date("2025-01-01T00:00:00Z"); // far enough back to be irrelevant here
    const windowEnd = new Date("2026-11-01T00:00:00Z"); // the server's own UTC midnight
    const day = d(2026, 9, 31); // Oct 31 2026, the BROWSER's own local midnight

    assert.equal(
      isOutsideWindow(day, windowStart, windowEnd),
      true,
      "Oct 31's own local end (Nov 1 00:00 MDT = Nov 1 06:00Z) is six hours past windowEnd, so it must be OUTSIDE even though its start is inside",
    );
  });
});

test("REGRESSION (V4) back-edge mirror: a day whose start precedes windowStart is OUTSIDE", () => {
  const windowStart = d(2026, 7, 10); // Aug 10
  const windowEnd = d(2026, 7, 20); // Aug 20
  const day = d(2026, 7, 9); // Aug 9 — one full day before windowStart
  assert.equal(isOutsideWindow(day, windowStart, windowEnd), true);
});

test("REGRESSION (V4) control: a day fully contained by the window is INSIDE", () => {
  const windowStart = d(2026, 7, 1);
  const windowEnd = d(2026, 7, 20);
  const day = d(2026, 7, 10);
  assert.equal(isOutsideWindow(day, windowStart, windowEnd), false);
});

test("REGRESSION (V4) exact-fit: a day whose own end equals windowEnd exactly is INSIDE", () => {
  const day = d(2026, 7, 9); // Aug 9
  const windowStart = d(2026, 7, 1);
  const windowEnd = d(2026, 7, 10); // Aug 10 00:00 — exactly day's own end
  assert.equal(isOutsideWindow(day, windowStart, windowEnd), false);
});
