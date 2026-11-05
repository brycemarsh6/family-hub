// Pins goalsRecap.ts: recap day, the week's habit counts, number movement,
// finished steps, the all-empty null and the range label. The tests run in
// both Denver and UTC, so the household-midnight cut-offs are proven.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { GoalRow } from "./goals";
import { isRecapDay, recapRangeLabel, weekRecap, type RecapGoalInput } from "./goalsRecap";
import type { PlanItemRow, PlanLogRow } from "./goalsProgress";
import { utcMidnightInstant, type CalendarDate } from "./householdDate";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const WEEK = d(2026, 10, 25); // the Sunday; the week ends Saturday Oct 31

function goal(over: Partial<GoalRow> = {}): GoalRow {
  return {
    id: "g1",
    title: "Weigh 165",
    area: "health",
    why: null,
    targetDate: utcMidnightInstant(d(2026, 12, 31)),
    ownerId: "me",
    owner: { id: "me", displayName: "Me", avatarColor: "sky" },
    visibility: "shared",
    measureUnit: "lb",
    startValue: 189,
    targetValue: 165,
    currentValue: 189,
    checkedInAt: null,
    completedAt: null,
    createdAt: new Date("2026-01-01T19:00:00Z"),
    ...over,
  };
}

function item(over: Partial<PlanItemRow> = {}): PlanItemRow {
  return {
    id: "i1",
    goalId: "g1",
    title: "Exercise",
    kind: "habit",
    timesPerPeriod: 4,
    period: "week",
    doneAt: null,
    sortOrder: 0,
    ...over,
  };
}

function logsOn(planItemId: string, days: CalendarDate[]): PlanLogRow[] {
  return days.map((day, i) => ({ id: `${planItemId}-${i}`, planItemId, day: utcMidnightInstant(day), createdAt: new Date() }));
}

function input(over: Partial<RecapGoalInput> = {}): RecapGoalInput {
  return { goal: goal({ measureUnit: null, startValue: null, targetValue: null }), items: [], logs: [], checkIns: [], ...over };
}

test("isRecapDay: Sunday only", () => {
  assert.equal(isRecapDay(d(2026, 11, 1)), true);
  assert.equal(isRecapDay(d(2026, 11, 2)), false);
  assert.equal(isRecapDay(d(2026, 11, 7)), false);
});

test("recapRangeLabel: the month repeats only when it changes", () => {
  assert.equal(recapRangeLabel(d(2026, 11, 1), d(2026, 11, 7)), "Nov 1 to 7");
  assert.equal(recapRangeLabel(d(2026, 10, 25), d(2026, 11, 1)), "Oct 25 to Nov 1");
});

test("weekRecap: a week habit counts its logs against its target, with the end date set", () => {
  const out = weekRecap(
    [input({ items: [item()], logs: logsOn("i1", [d(2026, 10, 26), d(2026, 10, 28), d(2026, 10, 31)]) })],
    WEEK,
  );
  assert.ok(out);
  assert.deepEqual(out.start, WEEK);
  assert.deepEqual(out.end, d(2026, 10, 31));
  assert.deepEqual(out.habits, [{ title: "Exercise", count: 3, target: 4, met: false }]);
  assert.deepEqual([out.done, out.total], [3, 4]);
});

test("weekRecap: a day habit's target is times x 7, and a habit over target counts as its target", () => {
  const days = [25, 26, 27, 28, 29, 30, 31].map((n) => d(2026, 10, n));
  const out = weekRecap(
    [input({ items: [item({ timesPerPeriod: 1, period: "day" })], logs: [...logsOn("i1", days), ...logsOn("i1", [d(2026, 10, 31)])] })],
    WEEK,
  );
  assert.ok(out);
  assert.deepEqual(out.habits, [{ title: "Exercise", count: 7, target: 7, met: true }]);
  assert.deepEqual([out.done, out.total], [7, 7]);
});

test("weekRecap: monthly habits are left out", () => {
  const items = [item(), item({ id: "i2", title: "Call mom", timesPerPeriod: 1, period: "month" })];
  const out = weekRecap([input({ items, logs: [...logsOn("i1", [d(2026, 10, 26)]), ...logsOn("i2", [d(2026, 10, 26)])] })], WEEK);
  assert.ok(out);
  assert.deepEqual(out.habits.map((h) => h.title), ["Exercise"]);
  assert.equal(out.total, 4);
});

test("weekRecap: a log on Saturday counts, one on the next Sunday does not", () => {
  const out = weekRecap([input({ items: [item()], logs: logsOn("i1", [d(2026, 10, 31), d(2026, 11, 1), d(2026, 10, 24)]) })], WEEK);
  assert.ok(out);
  assert.equal(out.habits[0].count, 1);
});

test("weekRecap: a number moves from the check-in before the week to the newest one in it", () => {
  const checkIns = [
    { value: 185, at: new Date("2026-10-20T18:00:00Z") },
    { value: 183, at: new Date("2026-10-24T17:00:00Z") },
    { value: 181, at: new Date("2026-10-27T18:00:00Z") },
    { value: 180.5, at: new Date("2026-10-30T18:00:00Z") },
  ];
  const out = weekRecap([input({ goal: goal(), checkIns })], WEEK);
  assert.ok(out);
  assert.deepEqual(out.measures, [{ goalTitle: "Weigh 165", from: "183 lb", to: "180.5 lb", unit: "lb" }]);
  assert.deepEqual(out.habits, []);
});

test("weekRecap: with no earlier check-in, from is the goal's start value", () => {
  const out = weekRecap([input({ goal: goal(), checkIns: [{ value: 187, at: new Date("2026-10-28T18:00:00Z") }] })], WEEK);
  assert.ok(out);
  assert.deepEqual(out.measures, [{ goalTitle: "Weigh 165", from: "189 lb", to: "187 lb", unit: "lb" }]);
});

test("weekRecap: a check-in at 11:30 pm Denver Saturday is in the week, one at 12:30 am Sunday is not", () => {
  const late = { value: 182, at: new Date("2026-11-01T05:30:00Z") }; // Sat Oct 31, 11:30 pm MDT (UTC-6)
  const lateInWeek = weekRecap([input({ goal: goal(), checkIns: [late] })], WEEK);
  assert.ok(lateInWeek);
  assert.equal(lateInWeek.measures[0].to, "182 lb");
  const after = { value: 181, at: new Date("2026-11-01T06:30:00Z") }; // Sun Nov 1, 12:30 am MDT
  assert.equal(weekRecap([input({ goal: goal(), checkIns: [after] })], WEEK), null);
});

test("weekRecap: a goal with a number but no check-in that week adds no measure line", () => {
  const out = weekRecap([input({ goal: goal(), items: [item()] })], WEEK);
  assert.ok(out);
  assert.deepEqual(out.measures, []);
});

test("weekRecap: steps finished in the week are listed", () => {
  const items = [
    item({ id: "s1", title: "Book the trip", kind: "step", timesPerPeriod: null, period: null, doneAt: new Date("2026-10-29T18:00:00Z") }),
    item({ id: "s2", title: "Pack", kind: "step", timesPerPeriod: null, period: null, doneAt: new Date("2026-11-03T18:00:00Z") }),
    item({ id: "s3", title: "Plan", kind: "step", timesPerPeriod: null, period: null, doneAt: null }),
  ];
  const out = weekRecap([input({ items })], WEEK);
  assert.ok(out);
  assert.deepEqual(out.stepsDone, ["Book the trip"]);
});

test("weekRecap: nothing to show is null", () => {
  assert.equal(weekRecap([], WEEK), null);
  assert.equal(weekRecap([input({ items: [item({ id: "s", kind: "step", timesPerPeriod: null, period: null })] })], WEEK), null);
  assert.equal(weekRecap([input({ items: [item({ timesPerPeriod: 1, period: "month" })] })], WEEK), null);
});

test("weekRecap: a goal completed mid-week is included, one completed before the week is not", () => {
  const items = [item()];
  const logs = logsOn("i1", [d(2026, 10, 26)]);
  const mid = input({ goal: goal({ completedAt: new Date("2026-10-28T18:00:00Z") }), items, logs });
  assert.equal(weekRecap([mid], WEEK)?.habits.length, 1);
  const earlier = input({ goal: goal({ completedAt: new Date("2026-10-20T18:00:00Z") }), items, logs });
  assert.equal(weekRecap([earlier], WEEK), null);
  const after = input({ goal: goal({ completedAt: new Date("2026-11-03T18:00:00Z") }), items, logs });
  assert.equal(weekRecap([after], WEEK)?.habits.length, 1);
});

test("weekRecap: a goal created after the week ended is left out", () => {
  const later = input({ goal: goal({ createdAt: new Date("2026-11-02T18:00:00Z") }), items: [item()] });
  assert.equal(weekRecap([later], WEEK), null);
});
