// Pins weekOverrides.ts (decision 117): a weekdays chore moved or skipped for
// one week only. Weeks start on Sunday. Plain calendar dates, so the results
// are the same in every time zone. November 2026: Sun 1, Mon 2, Tue 3, Wed 4,
// Thu 5, Fri 6, Sat 7, Sun 8.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "../householdDate";
import { changeAllowed, choreDayState, choreTag, isExcused, isExcusedAllDay, overrideFromRow, weekChange } from "./weekOverrides";
import type { ScheduleSpec, WeekOverride } from "./types";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const mondayAndWednesday: ScheduleSpec = { schedule: "weekdays", days: [1, 3] };
const week = d(2026, 11, 1);
const moved = (from: 1 | 3, to: 0 | 1 | 2 | 3 | 4 | 5 | 6, weekStart = week): WeekOverride => ({ weekStart, fromWeekday: from, action: "moved", toWeekday: to });
const skipped = (from: 1 | 3, weekStart = week): WeekOverride => ({ weekStart, fromWeekday: from, action: "skipped", toWeekday: null });

test("a move across the week: not required on the old day, required on the new one", () => {
  const changes = [moved(1, 5)];
  assert.equal(choreDayState(mondayAndWednesday, changes, d(2026, 11, 2)), "none"); // Monday, moved away
  assert.equal(choreDayState(mondayAndWednesday, changes, d(2026, 11, 6)), "required"); // Friday, moved here
  assert.equal(choreDayState(mondayAndWednesday, changes, d(2026, 11, 4)), "required"); // Wednesday, untouched
  assert.equal(choreDayState(mondayAndWednesday, changes, d(2026, 11, 3)), "none"); // Tuesday, never
});

test("a skip: excused on its day, the other days unchanged", () => {
  const changes = [skipped(3)];
  assert.equal(choreDayState(mondayAndWednesday, changes, d(2026, 11, 4)), "excused");
  assert.equal(choreDayState(mondayAndWednesday, changes, d(2026, 11, 2)), "required");
});

test("the week boundary: a change reads only in its own Sunday-to-Saturday week", () => {
  const changes = [moved(1, 5), skipped(3)];
  assert.equal(choreDayState(mondayAndWednesday, changes, d(2026, 11, 9)), "required"); // next Monday
  assert.equal(choreDayState(mondayAndWednesday, changes, d(2026, 11, 11)), "required"); // next Wednesday
  assert.equal(choreDayState(mondayAndWednesday, changes, d(2026, 11, 13)), "none"); // next Friday
  // Sunday belongs to the week it starts: moving Monday to Sunday lands on Nov 1, not Nov 8.
  assert.equal(choreDayState(mondayAndWednesday, [moved(1, 0)], d(2026, 11, 1)), "required");
  assert.equal(choreDayState(mondayAndWednesday, [moved(1, 0)], d(2026, 11, 8)), "none");
  // Saturday is the last day of the week.
  assert.equal(choreDayState(mondayAndWednesday, [moved(1, 6)], d(2026, 11, 7)), "required");
  assert.equal(choreDayState(mondayAndWednesday, [moved(1, 6)], d(2026, 11, 14)), "none");
});

test("moving onto a day the chore already has keeps it required; a move onto its own day changes nothing", () => {
  assert.equal(choreDayState(mondayAndWednesday, [moved(1, 3)], d(2026, 11, 4)), "required");
  assert.equal(choreDayState(mondayAndWednesday, [moved(1, 3)], d(2026, 11, 2)), "none");
  assert.equal(choreDayState(mondayAndWednesday, [moved(1, 1)], d(2026, 11, 2)), "required");
  assert.equal(choreTag(mondayAndWednesday, [moved(1, 1)], d(2026, 11, 2)), null);
});

test("a change for a weekday the chore does not have, or on a chore that is not weekdays, is ignored", () => {
  const stray = [moved(1, 5)];
  const tuesdayOnly: ScheduleSpec = { schedule: "weekdays", days: [2] };
  assert.equal(choreDayState(tuesdayOnly, stray, d(2026, 11, 6)), "none");
  assert.equal(choreDayState({ schedule: "daily" }, stray, d(2026, 11, 2)), "required");
  assert.equal(choreDayState({ schedule: "weekly", times: 2 }, stray, d(2026, 11, 2)), "none");
});

test("choreTag: moved away names the new weekday, moved here and skipped have their own", () => {
  const changes = [moved(1, 5), skipped(3)];
  assert.deepEqual(choreTag(mondayAndWednesday, changes, d(2026, 11, 2)), { kind: "moved-away", toWeekday: 5 });
  assert.deepEqual(choreTag(mondayAndWednesday, changes, d(2026, 11, 6)), { kind: "moved-here" });
  assert.deepEqual(choreTag(mondayAndWednesday, changes, d(2026, 11, 4)), { kind: "skipped" });
  assert.equal(choreTag(mondayAndWednesday, changes, d(2026, 11, 3)), null);
  assert.equal(choreTag(mondayAndWednesday, changes, d(2026, 11, 9)), null);
});

test("overrideFromRow: stored days are read as calendar days; unknown rows are null", () => {
  const row = { weekStart: new Date("2026-11-01T00:00:00Z"), fromWeekday: 1, action: "moved", toWeekday: 4 };
  assert.deepEqual(overrideFromRow(row), { weekStart: week, fromWeekday: 1, action: "moved", toWeekday: 4 });
  assert.equal(overrideFromRow({ ...row, action: "swapped" }), null);
  assert.equal(overrideFromRow({ ...row, fromWeekday: 9 }), null);
  assert.equal(overrideFromRow({ ...row, action: "skipped", toWeekday: null })?.toWeekday, null);
});

test("weekChange: today's state and tag, and any other day's state", () => {
  const rows = [{ weekStart: new Date("2026-11-01T00:00:00Z"), fromWeekday: 1, action: "moved", toWeekday: 4 }];
  const change = weekChange(mondayAndWednesday, rows, d(2026, 11, 5));
  assert.equal(change.state, "required");
  assert.deepEqual(change.tag, { kind: "moved-here" });
  assert.equal(change.stateOn(d(2026, 11, 2)), "none");
  const plain = weekChange(mondayAndWednesday, undefined, d(2026, 11, 5));
  assert.equal(plain.state, null);
  assert.equal(plain.tag, null);
  assert.equal(plain.stateOn(d(2026, 11, 2)), "required");
  assert.equal(weekChange(null, rows, d(2026, 11, 5)).state, null);
});

test("weekChange: a stale override on a weekly or monthly habit changes neither its state nor its tag", () => {
  // The Monday-to-Thursday move was saved while the chore was on certain days; the schedule has since changed.
  const rows = [{ weekStart: new Date("2026-11-01T00:00:00Z"), fromWeekday: 1, action: "moved", toWeekday: 4 }];
  for (const spec of [{ schedule: "weekly", times: 2 }, { schedule: "monthly", times: 3 }, { schedule: "daily" }] as ScheduleSpec[]) {
    for (const day of [d(2026, 11, 2), d(2026, 11, 5)]) {
      const change = weekChange(spec, rows, day);
      assert.equal(change.state, null);
      assert.equal(change.tag, null);
      assert.equal(change.stateOn(day), "required");
    }
  }
});

test("isExcused: skipped, on vacation and undone, or skipped this week; a plain row is not", () => {
  assert.equal(isExcused({ doneToday: false, skippedToday: true }), true);
  assert.equal(isExcused({ doneToday: false, skippedToday: false, onVacation: true }), true);
  assert.equal(isExcused({ doneToday: false, skippedToday: false, skippedThisWeek: true }), true);
  assert.equal(isExcused({ doneToday: false, skippedToday: false }), false);
});

test("isExcusedAllDay: a vacation row is excused only while undone (decision 127)", () => {
  assert.equal(isExcusedAllDay({ doneToday: false, onVacation: true }), true);
  assert.equal(isExcusedAllDay({ doneToday: true, onVacation: true }), false);
  assert.equal(isExcusedAllDay({ doneToday: false, skippedThisWeek: true }), true);
  assert.equal(isExcusedAllDay({ doneToday: false }), false);
  // A tap-skip is not an all-day excuse; isExcused adds it.
  assert.equal(isExcused({ doneToday: false, skippedToday: true }), true);
  assert.equal(isExcusedAllDay({ doneToday: false }), false);
  assert.equal(isExcused({ doneToday: true, skippedToday: false, onVacation: true }), false);
});

test("changeAllowed (decisions 126, 129): a turn changes only while it sits on today or later, or is skipped; clearing also needs its own day not past", () => {
  const input = (fromPast: boolean, sitsPast: boolean, skipped: boolean, clearing: boolean) => changeAllowed({ fromPast, sitsPast, skipped, clearing });
  // Untouched, today or later: any change, including the no-op clear.
  assert.equal(input(false, false, false, false), true);
  assert.equal(input(false, false, false, true), true);
  // Untouched and past: a miss cannot be moved or skipped away or cleared.
  assert.equal(input(true, true, false, false), false);
  assert.equal(input(true, true, false, true), false);
  // Moved Mon to Wed, Wed passed undone: locked, skip and move refused (129).
  assert.equal(input(true, true, false, false), false);
  // Moved Mon to Fri, Thu: still changeable, but not back to the past Monday.
  assert.equal(input(true, false, false, false), true);
  assert.equal(input(true, false, false, true), false);
  // Skipped Mon, Thu: may move on to Fri, but not be cleared.
  assert.equal(input(true, true, true, false), true);
  assert.equal(input(true, true, true, true), false);
  // Moved Fri to Wed (Wed passed), Thu: locked, even to clear.
  assert.equal(input(false, true, false, true), false);
});

test("isExcusedAllDay: a week-skipped row is excused only while undone (decision 130)", () => {
  assert.equal(isExcusedAllDay({ doneToday: true, skippedThisWeek: true }), false);
  assert.equal(isExcused({ doneToday: true, skippedToday: false, skippedThisWeek: true }), false);
});
