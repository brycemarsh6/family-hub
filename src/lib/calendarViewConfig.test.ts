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

// Mid-November 2026, the Denver "today" every title below is read against.
const TODAY = new Date(2026, 10, 10);

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

// mission-17/C3 — `pinned` and `renderer` used to be inline `view ===
// "member"` tests beside this file (CalendarHeader.tsx, CalendarViews.tsx)
// rather than rows inside it. Now that they're plain data here, they're
// exactly as testable as `placeholderCount` above — closing the coverage
// gap the totality clause exists to prevent (a per-member difference that
// TypeScript's total-Record check alone can't catch is wrong, only that a
// row is present, not what it's set to).
test("pinned is true for Schedule alone", () => {
  for (const view of ALL_VIEWS) {
    assert.equal(VIEW_CONFIG[view].pinned, view === "schedule", `${view}.pinned`);
  }
});

// mission-18/C5 (Captain's reachability blocker) — `ownsTodayScroll` used
// to be an inline `view === "schedule"` test beside this file rather than a
// row here, same shape as `pinned`/`renderer` before mission-17/C3. Asserted
// the same way: every view checked against what it should be, not just
// Schedule's own row, so a future view silently inheriting the wrong default
// would fail here too.

test("ownsTodayScroll is true for Schedule alone", () => {
  for (const view of ALL_VIEWS) {
    assert.equal(
      VIEW_CONFIG[view].ownsTodayScroll,
      view === "schedule",
      `${view}.ownsTodayScroll`,
    );
  }
});

test("renderer matches each view's actual component today", () => {
  assert.equal(VIEW_CONFIG.month.renderer, "month");
  assert.equal(VIEW_CONFIG.schedule.renderer, "schedule");
  // mission-17/C4 — day/threeDay/week switched from the shared DaySection
  // path to `TimelineGrid` (the hour timeline) in this commit.
  assert.equal(VIEW_CONFIG.day.renderer, "timeline");
  assert.equal(VIEW_CONFIG.threeDay.renderer, "timeline");
  assert.equal(VIEW_CONFIG.week.renderer, "timeline");
  // mission-18/C4 — year gets its own tag, `YearView`'s twelve mini
  // month-grids, the last of the four families and the one that retired
  // `"daySection"` entirely — see calendarViewConfig.ts's own per-row and
  // `CalendarRenderer` comments.
  assert.equal(VIEW_CONFIG.year.renderer, "year");
});

// ---------------------------------------------------------------------------
// Week

test("week: title, days and isCurrentPeriod across the Nov 1 2026 DST fall-back week", () => {
  // Nov 1, 2026 is a real Sunday this year — the same week the rest of this
  // repo's Calendar tests use to prove DST doesn't produce a skip/duplicate.
  const sunday = d(2026, 10, 1);
  const anchor = d(2026, 10, 3); // Tuesday, mid-week
  const { title, days, isCurrentPeriod } = VIEW_CONFIG.week;

  assert.equal(title(anchor, TODAY), "November");

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

  assert.equal(title(anchor, TODAY), "March");

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

test("week: a week spanning two months is titled by its first visible day's month", () => {
  // Jul 26 to Aug 1, 2026: the Sunday is in July.
  const anchor = d(2026, 6, 30); // Thursday, Jul 30 2026
  assert.equal(VIEW_CONFIG.week.title(anchor, TODAY), "July");
  // Anchored on the Saturday that is already August, still July.
  assert.equal(VIEW_CONFIG.week.title(d(2026, 7, 1), TODAY), "July");
});

test("week: a year-boundary week takes the first day's year", () => {
  // Dec 27 2026 (Sunday) to Jan 2 2027.
  assert.equal(VIEW_CONFIG.week.title(d(2027, 0, 1), TODAY), "December");
  // Same week read from 2027: December is not the current year, so it says so.
  assert.equal(VIEW_CONFIG.week.title(d(2027, 0, 1), d(2027, 0, 5)), "December 2026");
  // Jan 3 2027 (Sunday) starts a week wholly in 2027.
  assert.equal(VIEW_CONFIG.week.title(d(2027, 0, 5), TODAY), "January 2027");
});

// ---------------------------------------------------------------------------
// Day

test("day: title, days and isCurrentPeriod", () => {
  const anchor = d(2026, 10, 3); // Tuesday, Nov 3 2026
  const { title, days, isCurrentPeriod } = VIEW_CONFIG.day;

  assert.equal(title(anchor, TODAY), "November");
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

  assert.equal(title(anchor, TODAY), "January");
  assert.equal(title(anchor, d(2027, 5, 1)), "January 2026");
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
// Schedule — `isCurrentPeriod` is REQUIRED by the total Record type but no
// longer READ for this view (see VIEW_CONFIG's own per-row comment: the
// header computes it from ScheduleView's live scroll position instead), so
// this is the one thing left to test about the row beyond `title`/`days`,
// both of which are exercised through the running app rather than here.

test("schedule: isCurrentPeriod matches the anchor day exactly (its own row is PROVISIONAL beyond that)", () => {
  const anchor = d(2026, 10, 3);
  assert.equal(VIEW_CONFIG.schedule.isCurrentPeriod(anchor, anchor), true);
  assert.equal(VIEW_CONFIG.schedule.isCurrentPeriod(anchor, d(2026, 10, 4)), false);
});

// ---------------------------------------------------------------------------
// 3 Day — mission-17/C4 (was PROVISIONAL, `BUILT_VIEWS.threeDay` false,
// through CV1–C3; see calendarViewConfig.ts's own per-row comment).

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

test("threeDay: title is the first visible day's month, even when the span crosses into the next", () => {
  // Anchor-relative (the anchor plus the next two days).
  assert.equal(VIEW_CONFIG.threeDay.title(d(2026, 8, 9), TODAY), "September");
  // Aug 30, 31, Sep 1: titled by August, the first visible day.
  assert.equal(VIEW_CONFIG.threeDay.title(d(2026, 7, 30), TODAY), "August");
  assert.equal(VIEW_CONFIG.threeDay.title(d(2027, 0, 1), TODAY), "January 2027");
});

test("schedule: title is the anchor's month, with the year only outside this year", () => {
  assert.equal(VIEW_CONFIG.schedule.title(d(2026, 10, 3), TODAY), "November");
  assert.equal(VIEW_CONFIG.schedule.title(d(2027, 1, 3), TODAY), "February 2027");
});

// ---------------------------------------------------------------------------
// Year — built as of mission-18/C4 (`YearView`, CalendarViews.tsx). `title`/
// `isCurrentPeriod` were real, testable facts about the period even before
// that — this test predates the renderer and is unchanged by it.

test("year: title and isCurrentPeriod", () => {
  const anchor = d(2026, 10, 3);
  assert.equal(VIEW_CONFIG.year.title(anchor, TODAY), "2026");
  assert.equal(VIEW_CONFIG.year.title(d(2027, 5, 1), TODAY), "2027");
  assert.equal(VIEW_CONFIG.year.isCurrentPeriod(anchor, d(2026, 0, 1)), true);
  assert.equal(VIEW_CONFIG.year.isCurrentPeriod(anchor, d(2025, 11, 31)), false);
});
