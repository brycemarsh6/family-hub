// Real unit tests (node:test, zero new dependencies) for this file's own
// exports — mealPlanDates.ts had no dedicated test file before mission-9's
// C2a (Calendar branch, K2/Month view), even though several of its
// functions (toLocalDateString among them) already had tests scattered in
// monthLayout.test.ts for lack of a permanent home. Run with `npm test`;
// this file lives directly in src/lib/, the only place (plus src/lib/voice/)
// the test glob reaches.
//
// `toLocalDateString`'s test is MOVED here from monthLayout.test.ts (per
// mission-9's C2a contract, explicitly authorized) — this is its proper
// permanent home, since the function it tests is declared in THIS file, not
// monthLayout.ts. The same move has since been made for the other adopted
// test: `calendarDayDiff`'s test went home to calendarDates.test.ts in
// mission-10's C2, which split that file by concern (266 lines now, well
// under the 350-line soft cap that had been the reason for the adoption) and
// emptied STRUCTURE.md's adoption-clause list.
//
// isSameMonth/formatMonthTitle are new exports added by this same contract
// (Month view vocabulary Captain's C1 pass-1 gate flagged as missing —
// no full-month-name list existed anywhere in this repo).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatMonthHeading,
  formatMonthTitle,
  formatShortDayHeader,
  formatWeekRange,
  isSameMonth,
  shortMonthHeading,
  toLocalDateString,
} from "./mealPlanDates";

function d(year: number, month: number, day: number): Date {
  return new Date(year, month, day);
}

// ---------------------------------------------------------------------------
// toLocalDateString

test("toLocalDateString: pads month and day, no timezone conversion", () => {
  assert.equal(toLocalDateString(d(2026, 0, 5)), "2026-01-05");
  assert.equal(toLocalDateString(d(2026, 10, 30)), "2026-11-30");
  assert.equal(toLocalDateString(d(2026, 11, 1)), "2026-12-01");
});

// ---------------------------------------------------------------------------
// isSameMonth

test("isSameMonth: true for two dates in the same calendar month", () => {
  assert.equal(isSameMonth(d(2026, 8, 1), d(2026, 8, 30)), true);
});

test("isSameMonth: false for the same day-of-month in a different month", () => {
  assert.equal(isSameMonth(d(2026, 8, 15), d(2026, 9, 15)), false);
});

test("isSameMonth: false for the same month a year apart (year matters, not just month index)", () => {
  assert.equal(isSameMonth(d(2025, 10, 15), d(2026, 10, 15)), false);
});

// ---------------------------------------------------------------------------
// formatMonthTitle

test("formatMonthTitle: full month name, not the abbreviated MONTH_NAMES set", () => {
  assert.equal(formatMonthTitle(d(2026, 8, 1)), "September 2026");
  assert.equal(formatMonthTitle(d(2026, 0, 1)), "January 2026");
  assert.equal(formatMonthTitle(d(2026, 11, 1)), "December 2026");
});

test("formatMonthTitle: ignores the day-of-month entirely", () => {
  assert.equal(formatMonthTitle(d(2026, 10, 1)), formatMonthTitle(d(2026, 10, 30)));
});

// ---------------------------------------------------------------------------
// formatWeekRange

test("formatWeekRange: one month prints 'to', never a dash", () => {
  assert.equal(formatWeekRange(d(2026, 10, 8)), "Nov 8 to 14");
});

test("formatWeekRange: a week crossing a month names both months", () => {
  assert.equal(formatWeekRange(d(2026, 10, 29)), "Nov 29 to Dec 5");
});

// ---------------------------------------------------------------------------
// formatShortDayHeader

test("formatShortDayHeader: three-letter weekday, space, day number", () => {
  assert.equal(formatShortDayHeader(d(2026, 10, 1)), "Sun 1");
  assert.equal(formatShortDayHeader(d(2026, 10, 2)), "Mon 2");
  assert.equal(formatShortDayHeader(d(2026, 10, 14)), "Sat 14");
});

// ---------------------------------------------------------------------------
// formatMonthHeading

test("formatMonthHeading: the bare month name in the current year", () => {
  assert.equal(formatMonthHeading(d(2026, 10, 9), d(2026, 10, 10)), "November");
  assert.equal(formatMonthHeading(d(2026, 0, 31), d(2026, 10, 10)), "January");
});

test("formatMonthHeading: adds the year for a previous or next year", () => {
  assert.equal(formatMonthHeading(d(2025, 8, 15), d(2026, 10, 10)), "Sep 2025");
  assert.equal(formatMonthHeading(d(2027, 0, 3), d(2026, 10, 10)), "Jan 2027");
});

test("formatMonthHeading: Dec 31 and Jan 1 edges follow the year, not the month", () => {
  assert.equal(formatMonthHeading(d(2026, 11, 31), d(2026, 0, 1)), "December");
  assert.equal(formatMonthHeading(d(2027, 0, 1), d(2026, 11, 31)), "Jan 2027");
  assert.equal(formatMonthHeading(d(2026, 11, 31), d(2027, 0, 1)), "Dec 2026");
  assert.equal(formatMonthHeading(d(2027, 0, 1), d(2027, 0, 1)), "January");
});

// ---------------------------------------------------------------------------
// shortMonthHeading

test("shortMonthHeading: a full month name becomes its three-letter form", () => {
  assert.equal(shortMonthHeading("November"), "Nov");
  assert.equal(shortMonthHeading("May"), "May");
  assert.equal(shortMonthHeading("September 2026"), "Sep 2026");
});

test("shortMonthHeading: already short or a bare year is unchanged", () => {
  assert.equal(shortMonthHeading("Jan 2027"), "Jan 2027");
  assert.equal(shortMonthHeading("2026"), "2026");
});
