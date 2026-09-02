// Real unit tests (node:test, zero new dependencies) for the Calendar
// branch's pure date/label helpers — see calendarDates.ts's own header for
// the two rules every case here is checking: calendar-component math only,
// and "now"/"today" always arrives as a parameter, never from `new Date()`.
// Run with `npm test` — this file must live directly in src/lib/, since
// that's the only place (plus src/lib/voice/) the test glob reaches.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  daysOfWeek,
  formatTimeRange,
  formatAllDayLabel,
  isPast,
  daysEventCovers,
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
// formatTimeRange

test("formatTimeRange: whole hours, same meridiem (PM)", () => {
  assert.equal(formatTimeRange(d(2026, 0, 1, 20, 0), d(2026, 0, 1, 21, 0)), "8 – 9 PM");
});

test("formatTimeRange: whole hours, same meridiem (AM)", () => {
  assert.equal(formatTimeRange(d(2026, 0, 1, 10, 0), d(2026, 0, 1, 11, 0)), "10 – 11 AM");
});

test("formatTimeRange: half-hour times, same meridiem", () => {
  assert.equal(
    formatTimeRange(d(2026, 0, 1, 12, 30), d(2026, 0, 1, 16, 30)),
    "12:30 – 4:30 PM",
  );
});

test("formatTimeRange: crossing AM to PM shows the meridiem on both ends", () => {
  assert.equal(
    formatTimeRange(d(2026, 0, 1, 11, 30), d(2026, 0, 1, 13, 0)),
    "11:30 AM – 1 PM",
  );
});

test("formatTimeRange: midnight formats as 12 AM, not 0", () => {
  assert.equal(formatTimeRange(d(2026, 0, 1, 0, 0), d(2026, 0, 1, 1, 0)), "12 – 1 AM");
});

test("formatTimeRange: noon formats as 12 PM, not 0", () => {
  assert.equal(formatTimeRange(d(2026, 0, 1, 12, 0), d(2026, 0, 1, 13, 0)), "12 – 1 PM");
});

test("formatTimeRange: noon crossing into the afternoon still shows both meridiems if they differ", () => {
  // 11:45 AM to 12:15 PM crosses the noon boundary, so AM/PM legitimately
  // differ even though both are "12"-adjacent times.
  assert.equal(
    formatTimeRange(d(2026, 0, 1, 11, 45), d(2026, 0, 1, 12, 15)),
    "11:45 AM – 12:15 PM",
  );
});

// ---------------------------------------------------------------------------
// formatAllDayLabel

test("formatAllDayLabel: single-day all-day event reads 'All day'", () => {
  // Stored end is the exclusive convention: an all-day event on Aug 9
  // stores end = Aug 10 midnight.
  const label = formatAllDayLabel(d(2026, 7, 9), d(2026, 7, 10), true, d(2026, 7, 9));
  assert.equal(label, "All day");
});

test("formatAllDayLabel: a 5-day all-day event reads 'Day 2 of 5' on its second day", () => {
  const start = d(2026, 7, 9); // Sunday
  const end = d(2026, 7, 14); // exclusive: covers Aug 9-13 inclusive (5 days)
  const label = formatAllDayLabel(start, end, true, d(2026, 7, 10));
  assert.equal(label, "Day 2 of 5");
});

test("formatAllDayLabel: the exclusive stored end does not leak onto an extra day", () => {
  const start = d(2026, 7, 9);
  const end = d(2026, 7, 10); // exclusive end => a single real day, Aug 9
  // Asking about Aug 10 (the exclusive boundary, not a real day of the event)
  // must not be treated as day 2 of a 2-day span.
  const label = formatAllDayLabel(start, end, true, d(2026, 7, 9));
  assert.equal(label, "All day");
});

test("formatAllDayLabel: a plain single-day timed event returns null (use formatTimeRange instead)", () => {
  const label = formatAllDayLabel(
    d(2026, 7, 9, 14, 0),
    d(2026, 7, 9, 15, 0),
    false,
    d(2026, 7, 9),
  );
  assert.equal(label, null);
});

test("formatAllDayLabel: a multi-day timed event (inclusive end instant) labels each day correctly", () => {
  // A business trip: Tue 9 AM to Thu 5 PM — a timed event, so its end
  // instant is used as-is (no exclusive-end adjustment), and it genuinely
  // spans 3 calendar days.
  const start = d(2026, 7, 11, 9, 0); // Tuesday
  const end = d(2026, 7, 13, 17, 0); // Thursday
  assert.equal(formatAllDayLabel(start, end, false, d(2026, 7, 11)), "Day 1 of 3");
  assert.equal(formatAllDayLabel(start, end, false, d(2026, 7, 12)), "Day 2 of 3");
  assert.equal(formatAllDayLabel(start, end, false, d(2026, 7, 13)), "Day 3 of 3");
});

// ---------------------------------------------------------------------------
// isPast

test("isPast: an event that ended earlier today is past", () => {
  const now = d(2026, 7, 9, 15, 0);
  assert.equal(isPast(d(2026, 7, 9, 14, 0), now), true);
});

test("isPast: an event still running (end in the future) is not past", () => {
  const now = d(2026, 7, 9, 15, 0);
  assert.equal(isPast(d(2026, 7, 9, 16, 0), now), false);
});

test("isPast: an event ending exactly at now counts as past", () => {
  const now = d(2026, 7, 9, 15, 0);
  assert.equal(isPast(d(2026, 7, 9, 15, 0), now), true);
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
