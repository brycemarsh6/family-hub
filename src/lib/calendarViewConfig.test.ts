// Unit tests for the Calendar's per-view date/label configuration —
// mission-14/C1. Run with `npm test`.
//
// This is the coverage gap the extraction exists to close: before this
// contract, VIEW_CONFIG lived in CalendarViews.tsx, a ".tsx" file
// package.json's test glob cannot reach, so none of this per-view date
// logic had a single test of its own — unlike its sibling VIEW_CURSOR
// (useCalendarPeriod.ts), which already had property tests across every
// day of 2026. These tests exercise the same real dates this repo already
// uses elsewhere for exactly that reason: Nov 1, 2026 (US fall-back) and
// Mar 8, 2026 (US spring-forward) are both real Sundays this year, and a
// month boundary (Jan 31 -> Feb 28, the exact date CV0's own header comment
// cites) is covered too.

import { test } from "node:test";
import assert from "node:assert/strict";
import { VIEW_CONFIG } from "./calendarViewConfig";
import { isSameDay } from "./mealPlanDates";
import type { CalendarPeriodView } from "./calendarViewVocabulary";

const ALL_VIEWS: CalendarPeriodView[] = [
  "schedule",
  "day",
  "threeDay",
  "week",
  "month",
  "year",
];

function d(year: number, month: number, day: number): Date {
  return new Date(year, month, day);
}

test("every view name has exactly one VIEW_CONFIG row, and nothing else does", () => {
  assert.deepEqual(Object.keys(VIEW_CONFIG).sort(), [...ALL_VIEWS].sort());
});

test("placeholderCount matches each view's real day count", () => {
  assert.equal(VIEW_CONFIG.week.placeholderCount, 7);
  assert.equal(VIEW_CONFIG.day.placeholderCount, 1);
  assert.equal(VIEW_CONFIG.month.placeholderCount, 1);
  assert.equal(VIEW_CONFIG.schedule.placeholderCount, 7);
  assert.equal(VIEW_CONFIG.threeDay.placeholderCount, 3);
  assert.equal(VIEW_CONFIG.year.placeholderCount, 1);
});

// ---------------------------------------------------------------------------
// Week

test("week: title, days and isCurrentPeriod across the Nov 1 2026 DST fall-back week", () => {
  // Nov 1, 2026 is a real Sunday this year — the same week the rest of this
  // repo's Calendar tests use to prove DST doesn't produce a skip/duplicate.
  const sunday = d(2026, 10, 1);
  const anchor = d(2026, 10, 3); // Tuesday, mid-week
  const { title, days, isCurrentPeriod } = VIEW_CONFIG.week;

  assert.equal(title(anchor), "Nov 1–7");

  const week = days(anchor);
  assert.equal(week.length, 7);
  for (let i = 0; i < 7; i++) {
    const expected = new Date(2026, 10, 1 + i);
    assert.ok(
      isSameDay(week[i], expected),
      `day ${i}: got ${week[i].toDateString()}, expected ${expected.toDateString()}`,
    );
  }
  assert.equal(isCurrentPeriod(anchor, d(2026, 10, 5)), true); // Thursday, same week
  assert.equal(isCurrentPeriod(anchor, sunday), true); // the week's own Sunday
  assert.equal(isCurrentPeriod(anchor, d(2026, 9, 25)), false); // prior week
  assert.equal(isCurrentPeriod(anchor, d(2026, 10, 8)), false); // next week
});

test("week: title, days and isCurrentPeriod across the Mar 8 2026 DST spring-forward week", () => {
  // Mar 8, 2026 is also a real Sunday this year.
  const anchor = d(2026, 2, 10); // Tuesday, mid-week
  const { title, days, isCurrentPeriod } = VIEW_CONFIG.week;

  assert.equal(title(anchor), "Mar 8–14");

  const week = days(anchor);
  assert.equal(week.length, 7);
  for (let i = 0; i < 7; i++) {
    const expected = new Date(2026, 2, 8 + i);
    assert.ok(
      isSameDay(week[i], expected),
      `day ${i}: got ${week[i].toDateString()}, expected ${expected.toDateString()}`,
    );
  }

  assert.equal(isCurrentPeriod(anchor, d(2026, 2, 8)), true);
  assert.equal(isCurrentPeriod(anchor, d(2026, 2, 14)), true);
  assert.equal(isCurrentPeriod(anchor, d(2026, 2, 15)), false); // next week's Sunday
});

test("week: title crosses a month boundary correctly", () => {
  // Jul 26 – Aug 1, 2026: a real week (Sunday Jul 26 through Saturday Aug 1)
  // that starts in one month and ends in the next, the same shape
  // formatWeekRange's own doc comment illustrates with "Jul 27 – Aug 2".
  const anchor = d(2026, 6, 30); // Thursday, Jul 30 2026
  assert.equal(VIEW_CONFIG.week.title(anchor), "Jul 26 – Aug 1");
});

// ---------------------------------------------------------------------------
// Day

test("day: title, days and isCurrentPeriod", () => {
  const anchor = d(2026, 10, 3); // Tuesday, Nov 3 2026
  const { title, days, isCurrentPeriod } = VIEW_CONFIG.day;

  assert.equal(title(anchor), "Tuesday, Nov 3");
  assert.equal(days(anchor).length, 1);
  assert.ok(isSameDay(days(anchor)[0], anchor));

  assert.equal(isCurrentPeriod(anchor, anchor), true);
  assert.equal(isCurrentPeriod(anchor, d(2026, 10, 4)), false);
});

// ---------------------------------------------------------------------------
// Month

test("month: title and isCurrentPeriod across the Jan 31 -> Feb boundary", () => {
  // The exact date CV0's own VIEW_CURSOR header comment cites as the case a
  // scalar day-offset gets wrong; VIEW_CONFIG's month row must still treat
  // Jan 31 as squarely inside January.
  const anchor = d(2026, 0, 31);
  const { title, isCurrentPeriod } = VIEW_CONFIG.month;

  assert.equal(title(anchor), "January 2026");
  assert.equal(isCurrentPeriod(anchor, d(2026, 0, 1)), true); // same month, day 1
  assert.equal(isCurrentPeriod(anchor, d(2026, 0, 31)), true); // same month, same day
  assert.equal(isCurrentPeriod(anchor, d(2026, 1, 1)), false); // February
  assert.equal(isCurrentPeriod(anchor, d(2025, 0, 31)), false); // January a year earlier
});

test("month: days returns the anchor itself, per its own documented contract", () => {
  // MonthGrid builds its own 42-day grid and never reads this array — this
  // just confirms the row keeps its documented shape rather than silently
  // becoming empty or multi-day.
  const anchor = d(2026, 5, 15);
  const result = VIEW_CONFIG.month.days(anchor);
  assert.equal(result.length, 1);
  assert.ok(isSameDay(result[0], anchor));
});

// ---------------------------------------------------------------------------
// Schedule / 3 Day / Year — unbuilt (BUILT_VIEWS says false for all three),
// but the rows are real, testable facts about the period, per VIEW_CONFIG's
// own header comment: "days"/"isCurrentPeriod" are already real facts about
// the period each will show.

test("schedule: isCurrentPeriod matches the anchor day exactly (its own row is PROVISIONAL beyond that)", () => {
  const anchor = d(2026, 10, 3);
  assert.equal(VIEW_CONFIG.schedule.isCurrentPeriod(anchor, anchor), true);
  assert.equal(VIEW_CONFIG.schedule.isCurrentPeriod(anchor, d(2026, 10, 4)), false);
});

test("threeDay: days spans three consecutive calendar days across the Nov 1 2026 DST boundary", () => {
  const anchor = d(2026, 9, 31); // Halloween, the day before the fall-back
  const { days, isCurrentPeriod } = VIEW_CONFIG.threeDay;

  const span = days(anchor);
  assert.equal(span.length, 3);
  assert.ok(isSameDay(span[0], d(2026, 9, 31)));
  assert.ok(isSameDay(span[1], d(2026, 10, 1)));
  assert.ok(isSameDay(span[2], d(2026, 10, 2)));

  assert.equal(isCurrentPeriod(anchor, d(2026, 9, 31)), true);
  assert.equal(isCurrentPeriod(anchor, d(2026, 10, 1)), true);
  assert.equal(isCurrentPeriod(anchor, d(2026, 10, 2)), true);
  assert.equal(isCurrentPeriod(anchor, d(2026, 10, 3)), false);
  assert.equal(isCurrentPeriod(anchor, d(2026, 9, 30)), false);
});

test("year: title and isCurrentPeriod", () => {
  const anchor = d(2026, 10, 3);
  assert.equal(VIEW_CONFIG.year.title(anchor), "2026");
  assert.equal(VIEW_CONFIG.year.isCurrentPeriod(anchor, d(2026, 0, 1)), true);
  assert.equal(VIEW_CONFIG.year.isCurrentPeriod(anchor, d(2025, 11, 31)), false);
});
