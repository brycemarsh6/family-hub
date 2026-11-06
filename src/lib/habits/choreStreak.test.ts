// Pins choreStreak.ts against the rules at the top of that file (decision 33):
// days in a row on which every required chore was done on time. Plain
// calendar dates over the November 2026 and March 2027 clock changes, so the
// results are the same in every time zone. November 2026: Sun 1, Mon 2,
// Tue 3, Wed 4, Thu 5, Fri 6, Sat 7, Sun 8, Mon 9.

import { test } from "node:test";
import assert from "node:assert/strict";
import { addCalendarDays, type CalendarDate } from "../householdDate";
import { computeChoreStreak, choreStreakAfter, finishedAllChoresLastWeek, type ChoreInput } from "./choreStreak";
import type { HabitLogDay, Vacation, WeekOverride } from "./types";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const log = (day: CalendarDate, status: HabitLogDay["status"] = "done"): HabitLogDay => ({ day, status });
const daily = (logs: HabitLogDay[], since = d(2026, 10, 25), overrides: WeekOverride[] = []): ChoreInput => ({ spec: { schedule: "daily" }, logs, overrides, since });
const onDays = (days: (0 | 1 | 2 | 3 | 4 | 5 | 6)[], logs: HabitLogDay[], since = d(2026, 10, 25), overrides: WeekOverride[] = []): ChoreInput => ({ spec: { schedule: "weekdays", days }, logs, overrides, since });
const range = (from: CalendarDate, n: number, status: HabitLogDay["status"] = "done") => Array.from({ length: n }, (_, i) => log(addCalendarDays(from, i), status));
const none: Vacation[] = [];
const sum = (chores: ChoreInput[], today: CalendarDate, vacations = none) => {
  const { current, best } = computeChoreStreak(chores, vacations, today);
  return { current, best };
};

test("every day done grows the streak, across the November clock change", () => {
  assert.deepEqual(sum([daily(range(d(2026, 10, 29), 7))], d(2026, 11, 4)), { current: 7, best: 7 });
});

test("no chores at all, or none due: nothing to break, nothing to grow", () => {
  assert.deepEqual(sum([], d(2026, 11, 5)), { current: 0, best: 0 });
  // Mondays only: Tue to Sat have nothing due and never break the run.
  const monday = onDays([1], [log(d(2026, 10, 26)), log(d(2026, 11, 2))]);
  assert.deepEqual(sum([monday], d(2026, 11, 5)), { current: 2, best: 2 });
});

test("a chore nobody has done yet is not yet a break before its first due day", () => {
  // Made on Wed Nov 4; the earlier Mondays were never due.
  assert.deepEqual(sum([onDays([1], [], d(2026, 11, 4))], d(2026, 11, 5)), { current: 0, best: 0 });
});

test("today not yet done: the streak stands from yesterday; done today it grows", () => {
  const chore = daily(range(d(2026, 11, 1), 4)); // Nov 1 to 4
  const before = computeChoreStreak([chore], none, d(2026, 11, 5));
  assert.deepEqual({ current: before.current, asOf: before.asOf }, { current: 4, asOf: d(2026, 11, 4) });
  const after = computeChoreStreak([daily([...chore.logs, log(d(2026, 11, 5))])], none, d(2026, 11, 5));
  assert.deepEqual({ current: after.current, asOf: after.asOf }, { current: 5, asOf: d(2026, 11, 5) });
});

test("today waits for every chore due today, not just one", () => {
  const a = daily([...range(d(2026, 11, 1), 4), log(d(2026, 11, 5))]);
  const b = daily(range(d(2026, 11, 1), 4));
  assert.deepEqual(sum([a, b], d(2026, 11, 5)), { current: 4, best: 4 });
});

test("a chore done late breaks the day; a missed day breaks it too; best keeps the old run", () => {
  const lateMonday = daily([...range(d(2026, 11, 1), 3), log(d(2026, 11, 4), "late"), ...range(d(2026, 11, 5), 1)]);
  assert.deepEqual(sum([lateMonday], d(2026, 11, 5)), { current: 1, best: 3 });
  const missed = daily([...range(d(2026, 11, 1), 3), ...range(d(2026, 11, 5), 1)]); // Nov 4 has no row
  assert.deepEqual(sum([missed], d(2026, 11, 5)), { current: 1, best: 3 });
});

test("one chore late on a day with another done still breaks that day", () => {
  const a = daily(range(d(2026, 11, 1), 5));
  const b = daily([...range(d(2026, 11, 1), 2), log(d(2026, 11, 3), "late"), ...range(d(2026, 11, 4), 2)]);
  assert.deepEqual(sum([a, b], d(2026, 11, 5)), { current: 2, best: 2 });
});

test("a skip log is excused: the run survives and the day adds nothing", () => {
  const chore = daily([...range(d(2026, 11, 1), 2), log(d(2026, 11, 3), "skipped"), ...range(d(2026, 11, 4), 2)]);
  assert.deepEqual(sum([chore], d(2026, 11, 5)), { current: 4, best: 4 });
});

test("vacation days are excused even with nothing done", () => {
  const vacation: Vacation[] = [{ start: d(2026, 11, 3), end: d(2026, 11, 4) }];
  const chore = daily([...range(d(2026, 11, 1), 2), ...range(d(2026, 11, 5), 1)]);
  assert.deepEqual(sum([chore], d(2026, 11, 5), vacation), { current: 3, best: 3 });
  assert.deepEqual(sum([chore], d(2026, 11, 5)), { current: 1, best: 2 });
});

test("a move across the week: the new day is required, the old day is not", () => {
  const moved: WeekOverride = { weekStart: d(2026, 11, 1), fromWeekday: 1, action: "moved", toWeekday: 4 };
  // Mondays only, Monday Nov 2 moved to Thursday Nov 5: Monday needs nothing, Thursday needs a check.
  const done = onDays([1], [log(d(2026, 10, 26)), log(d(2026, 11, 5))], d(2026, 10, 25), [moved]);
  assert.deepEqual(sum([done], d(2026, 11, 5)), { current: 2, best: 2 });
  const notYet = onDays([1], [log(d(2026, 10, 26))], d(2026, 10, 25), [moved]);
  const result = computeChoreStreak([notYet], none, d(2026, 11, 5));
  assert.deepEqual({ current: result.current, asOf: result.asOf }, { current: 1, asOf: d(2026, 11, 4) });
  // Past the moved day with nothing logged it is a break.
  assert.equal(computeChoreStreak([notYet], none, d(2026, 11, 6)).current, 0);
});

test("a skip this week is excused whatever the log says", () => {
  const skip: WeekOverride = { weekStart: d(2026, 11, 1), fromWeekday: 1, action: "skipped", toWeekday: null };
  const chore = onDays([1], [log(d(2026, 10, 26))], d(2026, 10, 25), [skip]);
  assert.deepEqual(sum([chore], d(2026, 11, 5)), { current: 1, best: 1 });
});

test("chores with no set days (weekly, monthly) are left out", () => {
  const weekly: ChoreInput = { spec: { schedule: "weekly", times: 2 }, logs: [], overrides: [], since: d(2026, 10, 1) };
  assert.deepEqual(sum([weekly], d(2026, 11, 5)), { current: 0, best: 0 });
  assert.deepEqual(sum([weekly, daily(range(d(2026, 11, 3), 3))], d(2026, 11, 5)), { current: 3, best: 3 });
});

test("choreStreakAfter: a cached streak breaks on a required day that passed undone, and survives a vacation or an empty stretch", () => {
  const chores = [{ spec: { schedule: "weekdays", days: [1] } as const, overrides: [], since: d(2026, 10, 1) }];
  const cache = { current: 3, best: 5, asOf: d(2026, 11, 1) as CalendarDate | null };
  assert.deepEqual(choreStreakAfter(chores, cache, none, d(2026, 11, 2)), { current: 3, best: 5, asOf: d(2026, 11, 2) }); // Monday is today: not yet over
  assert.equal(choreStreakAfter(chores, cache, none, d(2026, 11, 3)).current, 0); // Monday passed
  assert.equal(choreStreakAfter(chores, cache, [{ start: d(2026, 11, 2), end: d(2026, 11, 2) }], d(2026, 11, 3)).current, 3);
  assert.equal(choreStreakAfter(chores, { ...cache, asOf: d(2026, 11, 2) }, none, d(2026, 11, 8)).current, 3); // no Monday between
  assert.equal(choreStreakAfter(chores, { current: 0, best: 5, asOf: d(2026, 11, 1) }, none, d(2026, 11, 20)).current, 0);
  assert.equal(choreStreakAfter(chores, { current: 3, best: 5, asOf: null }, none, d(2026, 11, 20)).current, 3);
});

test("choreStreakAfter: a moved-in day breaks it and a moved-away day does not", () => {
  const moved: WeekOverride = { weekStart: d(2026, 11, 1), fromWeekday: 1, action: "moved", toWeekday: 4 };
  const chores = [{ spec: { schedule: "weekdays", days: [1] } as const, overrides: [moved], since: d(2026, 10, 1) }];
  const cache = { current: 3, best: 3, asOf: d(2026, 11, 1) as CalendarDate | null };
  assert.equal(choreStreakAfter(chores, cache, none, d(2026, 11, 4)).current, 3); // Mon Nov 2 moved away, Thu not yet
  assert.equal(choreStreakAfter(chores, cache, none, d(2026, 11, 6)).current, 0); // Thu Nov 5 passed undone
});

test("finishedAllChoresLastWeek: Sunday to Saturday before today, at least one done, none broken", () => {
  // Today Sun Nov 8: last week is Nov 1 to Nov 7.
  const clean = daily(range(d(2026, 11, 1), 7));
  assert.equal(finishedAllChoresLastWeek([clean], none, d(2026, 11, 8)), true);
  assert.equal(finishedAllChoresLastWeek([clean], none, d(2026, 11, 11)), true); // any day of this week looks at the same week
  assert.equal(finishedAllChoresLastWeek([clean], none, d(2026, 11, 15)), false); // two weeks on, last week is Nov 8 to 14
  const oneBroken = daily([...range(d(2026, 11, 1), 3), ...range(d(2026, 11, 5), 3)]);
  assert.equal(finishedAllChoresLastWeek([oneBroken], none, d(2026, 11, 8)), false);
  const late = daily([...range(d(2026, 11, 1), 6), log(d(2026, 11, 7), "late")]);
  assert.equal(finishedAllChoresLastWeek([late], none, d(2026, 11, 8)), false);
});

test("finishedAllChoresLastWeek: needs a chore due, and excused days do not count against it", () => {
  assert.equal(finishedAllChoresLastWeek([], none, d(2026, 11, 8)), false);
  const mondayOnly = onDays([1], [], d(2026, 11, 4)); // made after last Monday
  assert.equal(finishedAllChoresLastWeek([mondayOnly], none, d(2026, 11, 8)), false);
  const allVacation: Vacation[] = [{ start: d(2026, 10, 30), end: d(2026, 11, 7) }];
  assert.equal(finishedAllChoresLastWeek([daily([])], allVacation, d(2026, 11, 8)), false);
  const skipOne = daily([...range(d(2026, 11, 1), 2), log(d(2026, 11, 3), "skipped"), ...range(d(2026, 11, 4), 4)]);
  assert.equal(finishedAllChoresLastWeek([skipOne], none, d(2026, 11, 8)), true);
});

test("the week boundary across the March clock change: last week is still Sunday to Saturday", () => {
  // Mar 14 2027 is the Sunday after the spring-forward; last week is Mar 7 to 13.
  const clean = daily(range(d(2027, 3, 7), 7), d(2027, 3, 1));
  assert.equal(finishedAllChoresLastWeek([clean], none, d(2027, 3, 14)), true);
  assert.deepEqual(sum([daily(range(d(2027, 3, 5), 10), d(2027, 3, 1))], d(2027, 3, 14)), { current: 10, best: 10 });
});
