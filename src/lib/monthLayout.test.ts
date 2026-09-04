// Real unit tests (node:test, zero new dependencies) for the Month view's
// pure layout helpers — mission-9 (K2), contract C1. Run with `npm test`;
// this file lives directly in src/lib/, the only place (plus src/lib/voice/)
// the test glob reaches. `toLocalDateString`'s own DEDICATED test moved to
// mealPlanDates.test.ts in mission-9's C2a (that's the function's real home,
// declared in mealPlanDates.ts, not here) — it's still imported below, just
// as a convenience uniqueness check inside `monthGridDays`' own test, not as
// something this file is responsible for verifying. `calendarDayDiff` is
// imported below only as this file's own consecutive-day helper
// (`assertConsecutiveNoGapNoDuplicate`) — its own test, adopted here by
// mission 9's C1 because calendarDates.test.ts was at the 350-line soft cap,
// moved home in mission 10's C2, which emptied STRUCTURE.md's adoption-clause
// list.

import { test } from "node:test";
import assert from "node:assert/strict";
import { monthGridDays, assignLanes, type MonthLayoutEvent } from "./monthLayout";
import { toLocalDateString } from "./mealPlanDates";
import { calendarDayDiff, isOutsideWindow } from "./calendarDates";

function d(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month, day, hour, minute);
}

function assertConsecutiveNoGapNoDuplicate(dates: Date[]): void {
  for (let i = 1; i < dates.length; i++) {
    const diff = calendarDayDiff(dates[i - 1], dates[i]);
    assert.equal(diff, 1, `index ${i - 1}->${i} should be exactly 1 calendar day apart, was ${diff}`);
  }
}

// ---------------------------------------------------------------------------
// monthGridDays

test("monthGridDays: a month starting on Sunday (Nov 2026 — also the DST fall-back month)", () => {
  const grid = monthGridDays(d(2026, 10, 15)); // any day in November
  assert.equal(grid.length, 42);
  // Row 1 is Nov 1..7 exactly, since Nov 1 2026 is itself a Sunday.
  assert.equal(grid[0].getFullYear(), 2026);
  assert.equal(grid[0].getMonth(), 10);
  assert.equal(grid[0].getDate(), 1);
  // The real Nov 1-30 2026 DST fall-back month renders as 30 genuinely
  // consecutive dates at grid indices 0..29 — the exact discipline
  // mealPlanDates.ts's daysOfWeek test already established for the Week
  // view, applied here to the Month grid.
  const novemberPortion = grid.slice(0, 30);
  novemberPortion.forEach((day, i) => {
    assert.equal(day.getMonth(), 10, `index ${i} should still be November`);
    assert.equal(day.getDate(), i + 1);
  });
  assertConsecutiveNoGapNoDuplicate(grid);
  // Six full rows: the 42nd day is Dec 12.
  assert.equal(grid[41].getMonth(), 11);
  assert.equal(grid[41].getDate(), 12);
});

test("monthGridDays: a month starting on Saturday (Aug 2026)", () => {
  const grid = monthGridDays(d(2026, 7, 1));
  assert.equal(grid.length, 42);
  // Aug 1 2026 is a Saturday, so the grid opens on the Sunday before it:
  // Jul 26 2026.
  assert.equal(grid[0].getMonth(), 6);
  assert.equal(grid[0].getDate(), 26);
  assert.equal(grid[6].getMonth(), 7);
  assert.equal(grid[6].getDate(), 1);
  assertConsecutiveNoGapNoDuplicate(grid);
});

test("monthGridDays: February of a non-leap year needs rows 5-6 from March", () => {
  const grid = monthGridDays(d(2026, 1, 10)); // 2026 is not a leap year
  assert.equal(grid.length, 42);
  // Feb 1 2026 is itself a Sunday, so Feb fills rows 1-4 exactly
  // (28 days = 4 weeks) and rows 5-6 must come from March.
  assert.equal(grid[0].getMonth(), 1);
  assert.equal(grid[0].getDate(), 1);
  assert.equal(grid[27].getMonth(), 1);
  assert.equal(grid[27].getDate(), 28); // last day of February
  assert.equal(grid[28].getMonth(), 2);
  assert.equal(grid[28].getDate(), 1); // rows 5-6 begin here
  assert.equal(grid[41].getMonth(), 2);
  assert.equal(grid[41].getDate(), 14);
  assertConsecutiveNoGapNoDuplicate(grid);
});

test("monthGridDays: always exactly 42 days for every month of 2026, no duplicate, no gap", () => {
  for (let month = 0; month < 12; month++) {
    const grid = monthGridDays(d(2026, month, 15));
    assert.equal(grid.length, 42, `month ${month + 1} should have 42 grid days`);
    assertConsecutiveNoGapNoDuplicate(grid);
    // No duplicate calendar day anywhere in the grid.
    const seen = new Set(grid.map((day) => toLocalDateString(day)));
    assert.equal(seen.size, 42, `month ${month + 1} grid should have 42 distinct days`);
  }
});

// ---------------------------------------------------------------------------
// assignLanes

function event(id: string, startAt: Date, endAt: Date, allDay = false): MonthLayoutEvent {
  return { id, startAt, endAt, allDay };
}

const NOV_ROW1 = monthGridDays(d(2026, 10, 1)).slice(0, 7); // Nov 1-7
const NOV_ROW2 = monthGridDays(d(2026, 10, 1)).slice(7, 14); // Nov 8-14

test("assignLanes: a 3-day all-day event crossing a week break splits into one span per row, keeping its lane in this mix", () => {
  // All-day Nov 6 - Nov 9 (exclusive end) covers Nov 6, 7, 8 — three days
  // that straddle the Nov 7/Nov 8 week break.
  const spanning = event("spanning", d(2026, 10, 6), d(2026, 10, 9), true);

  const row1 = assignLanes(NOV_ROW1, [spanning]);
  assert.equal(row1.spans.length, 1);
  assert.equal(row1.spans[0].startCol, 5); // Nov 6 = column 5
  assert.equal(row1.spans[0].endCol, 6); // Nov 7 = column 6 (row ends here)
  assert.equal(row1.spans[0].lane, 0);

  // Row 2 also carries a later single-day event that starts AFTER the
  // spanning event's own original start. "spanning" keeps lane 0 here
  // because compareCandidates sorts multi-day events before single-day ones
  // — not because lane continuity across a week break is a general
  // guarantee. That ordering-by-startAt only applies within the single-day
  // branch; the multi-day branch sorts by length first, so a *longer*
  // event starting fresh in the continuation row can outrank (and bump the
  // lane of) a shorter continuing one. See this module's own header for the
  // "where possible" caveat.
  const later = event("later", d(2026, 10, 8, 10, 0), d(2026, 10, 8, 11, 0));
  const row2 = assignLanes(NOV_ROW2, [spanning, later]);
  const spanningSpan = row2.spans.find((s) => s.event.id === "spanning");
  const laterSpan = row2.spans.find((s) => s.event.id === "later");
  assert.ok(spanningSpan && laterSpan);
  assert.equal(spanningSpan!.startCol, 0); // Nov 8 = column 0
  assert.equal(spanningSpan!.endCol, 0); // only one day of it remains
  assert.equal(spanningSpan!.lane, 0, "the continuing event keeps lane 0");
  assert.equal(laterSpan!.lane, 1, "the newly-starting event takes the next lane");
});

test("assignLanes: two overlapping multi-day bars take lanes 0 and 1 (RED-THEN-GREEN case — see report)", () => {
  // A: Nov 2 - Nov 5 (4 days, cols 1-4). B: Nov 4 - Nov 6 (3 days, cols 3-5).
  // They overlap on Nov 4-5 (cols 3-4), so B cannot share A's lane.
  const eventA = event("A-longer", d(2026, 10, 2), d(2026, 10, 6), true); // all-day, exclusive end
  const eventB = event("B-shorter", d(2026, 10, 4), d(2026, 10, 7), true);

  const { spans } = assignLanes(NOV_ROW1, [eventA, eventB]);
  const spanA = spans.find((s) => s.event.id === "A-longer");
  const spanB = spans.find((s) => s.event.id === "B-shorter");
  assert.ok(spanA && spanB, "both events should be visible (only 2 of 3 lanes used)");
  assert.equal(spanA!.startCol, 1);
  assert.equal(spanA!.endCol, 4);
  assert.equal(spanB!.startCol, 3);
  assert.equal(spanB!.endCol, 5);
  // The real assertion: they must NOT collide, i.e. different lanes.
  assert.notEqual(spanA!.lane, spanB!.lane, "overlapping bars must not share a lane");
  // Longer event (A, 4 days) sorts first and gets the lower lane.
  assert.equal(spanA!.lane, 0);
  assert.equal(spanB!.lane, 1);
});

test("assignLanes: a cell with five single-day events shows three, overflowByDay is 2 for that column", () => {
  // Nov 3, column 2 in NOV_ROW1.
  const events = [0, 1, 2, 3, 4].map((i) =>
    event(`single-${i}`, d(2026, 10, 3, 8 + i, 0), d(2026, 10, 3, 8 + i, 30)),
  );
  const { spans, overflowByDay } = assignLanes(NOV_ROW1, events);
  const forThisColumn = spans.filter((s) => s.startCol === 2 && s.endCol === 2);
  assert.equal(forThisColumn.length, 3, "only 3 of the 5 should be visible");
  const lanesUsed = forThisColumn.map((s) => s.lane).sort();
  assert.deepEqual(lanesUsed, [0, 1, 2]);
  assert.equal(overflowByDay[2], 2);
  // No other column should be touched.
  overflowByDay.forEach((count, col) => {
    if (col !== 2) assert.equal(count, 0);
  });
});

test("assignLanes: an event with no coverage of the row contributes nothing", () => {
  const elsewhere = event("elsewhere", d(2026, 9, 1), d(2026, 9, 2), true); // October, unrelated
  const { spans, overflowByDay } = assignLanes(NOV_ROW1, [elsewhere]);
  assert.equal(spans.length, 0);
  assert.deepEqual(overflowByDay, [0, 0, 0, 0, 0, 0, 0]);
});

// ---------------------------------------------------------------------------
// isOutsideWindow, exercised against a real month-grid day (calendarDates.ts
// owns the function itself — see its own tests in calendarDates.test.ts;
// this confirms it composes correctly with monthGridDays' output).

test("assignLanes-adjacent: a grid cell can be marked outside the fetch window", () => {
  const grid = monthGridDays(d(2026, 10, 15));
  const windowStart = d(2026, 10, 1);
  const windowEnd = d(2026, 10, 15); // only the first two weeks were fetched
  const earlyDay = grid[3]; // Nov 4 — inside
  const lateDay = grid[35]; // deep into row 6 — outside
  assert.equal(isOutsideWindow(earlyDay, windowStart, windowEnd), false);
  assert.equal(isOutsideWindow(lateDay, windowStart, windowEnd), true);
});
