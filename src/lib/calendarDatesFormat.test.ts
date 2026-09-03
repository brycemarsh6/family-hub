// Real unit tests (node:test, zero new dependencies) for the Calendar
// branch's label-formatting helpers — see calendarDates.ts's own header for
// the two rules every case here is checking: calendar-component math only,
// and "now"/"today" always arrives as a parameter, never from `new Date()`.
// Day/span math (daysOfWeek, calendarDayDiff, daysEventCovers,
// isOutsideWindow) lives in the sibling calendarDates.test.ts — split by
// concern (never by number, per STRUCTURE.md), mission 10's C2, because
// that file was at 349 of the 350-line soft cap.
// Run with `npm test` — this file must live directly in src/lib/, since
// that's the only place (plus src/lib/voice/) the test glob reaches.

import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTimeRange, formatAllDayLabel, isPast } from "./calendarDates";

function d(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month, day, hour, minute);
}

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
