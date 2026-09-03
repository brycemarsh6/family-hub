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
// monthLayout.ts. `calendarDayDiff`'s test stays in monthLayout.test.ts:
// calendarDates.test.ts is at its 350-line soft cap, and moving that one
// test isn't in this contract's scope.
//
// isSameMonth/formatMonthTitle are new exports added by this same contract
// (Month view vocabulary Captain's C1 pass-1 gate flagged as missing —
// no full-month-name list existed anywhere in this repo).

import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMonthTitle, isSameMonth, toLocalDateString } from "./mealPlanDates";

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
