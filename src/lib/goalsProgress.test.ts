// Pins goalsProgress.ts: habit windows and counts, plan item views, progress,
// pace and number formatting (the pure rules behind This week and the Goals
// list). Who may see a goal, validation and goal views are in goals.test.ts,
// the vocabulary in goalVocabulary.test.ts, tap-time changes in
// planItemChanges.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PACE_LABELS,
  buildPlanItemView,
  countInWindow,
  formatMeasure,
  logWindow,
  measureStep,
  numberAfterCheckIns,
  paceStatus,
  parseTypedNumber,
  progressFraction,
  targetDateChips,
  weekSummary,
  weekTodo,
  type GoalMeasure,
  type PlanItemRow,
  type PlanLogRow,
} from "./goalsProgress";
import { utcMidnightInstant, type CalendarDate } from "./householdDate";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const TODAY = d(2026, 11, 4); // a Wednesday

function goal(over: Partial<GoalMeasure> = {}): GoalMeasure {
  return {
    targetDate: utcMidnightInstant(d(2026, 12, 31)),
    startValue: 189,
    targetValue: 165,
    currentValue: 189,
    createdAt: new Date("2026-01-01T19:00:00Z"), // Jan 1 in Denver
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
    createdAt: new Date("2026-01-01T19:00:00Z"),
    ...over,
  };
}

function logsOn(planItemId: string, days: CalendarDate[]): PlanLogRow[] {
  return days.map((day, n) => ({
    id: `l${n}`,
    planItemId,
    day: utcMidnightInstant(day),
    createdAt: new Date("2026-11-04T12:00:00Z"),
  }));
}

test("buildPlanItemView: 4 of 4 is done, and 5 logs still report count 5", () => {
  const four = buildPlanItemView(item(), logsOn("i1", [d(2026, 11, 1), d(2026, 11, 2), d(2026, 11, 3), d(2026, 11, 4)]), TODAY);
  assert.equal(four.count, 4);
  assert.equal(four.done, true);
  assert.equal(four.windowLabel, "this week");
  const five = buildPlanItemView(
    item(),
    logsOn("i1", [d(2026, 11, 1), d(2026, 11, 1), d(2026, 11, 2), d(2026, 11, 3), d(2026, 11, 4)]),
    TODAY,
  );
  assert.equal(five.count, 5);
  assert.equal(five.target, 4);
});

test("buildPlanItemView: ignores another item's logs; 3 of 4 is not done", () => {
  const logs = [...logsOn("i1", [d(2026, 11, 2), d(2026, 11, 3), d(2026, 11, 4)]), ...logsOn("other", [d(2026, 11, 4)])];
  const view = buildPlanItemView(item(), logs, TODAY);
  assert.equal(view.count, 3);
  assert.equal(view.done, false);
});

test("buildPlanItemView: steps follow doneAt, reminders have no target", () => {
  const step = item({ kind: "step", timesPerPeriod: null, period: null });
  assert.deepEqual(
    (({ count, target, done, windowLabel }) => ({ count, target, done, windowLabel }))(buildPlanItemView(step, [], TODAY)),
    { count: 0, target: 1, done: false, windowLabel: null },
  );
  const doneStep = buildPlanItemView({ ...step, doneAt: new Date() }, [], TODAY);
  assert.equal(doneStep.done, true);
  assert.equal(doneStep.count, 1);
  const reminder = buildPlanItemView(item({ kind: "reminder", timesPerPeriod: null, period: null }), [], TODAY);
  assert.equal(reminder.target, 0);
  assert.equal(reminder.done, false);
});

test("logWindow: a day habit counts across the week, times x 7", () => {
  const daily = item({ timesPerPeriod: 1, period: "day" });
  assert.deepEqual(logWindow(daily, d(2026, 11, 7)), {
    start: d(2026, 11, 1),
    end: d(2026, 11, 7),
    target: 7,
    label: "this week",
  }); // Saturday
  assert.deepEqual(logWindow(daily, d(2026, 11, 8)), {
    start: d(2026, 11, 8),
    end: d(2026, 11, 14),
    target: 7,
    label: "this week",
  }); // Sunday starts a new week
});

test("logWindow: week habit target is times; month habit spans the whole month", () => {
  assert.equal(logWindow(item(), TODAY)?.target, 4);
  assert.deepEqual(logWindow(item({ timesPerPeriod: 2, period: "month" }), d(2027, 1, 31)), {
    start: d(2027, 1, 1),
    end: d(2027, 1, 31),
    target: 2,
    label: "this month",
  });
  assert.deepEqual(logWindow(item({ timesPerPeriod: 2, period: "month" }), d(2027, 2, 1))?.end, d(2027, 2, 28));
  assert.deepEqual(logWindow(item({ period: "month" }), d(2026, 12, 15))?.end, d(2026, 12, 31));
});

test("logWindow: null for steps and reminders", () => {
  assert.equal(logWindow(item({ kind: "step", timesPerPeriod: null, period: null }), TODAY), null);
  assert.equal(logWindow(item({ kind: "reminder", timesPerPeriod: null, period: null }), TODAY), null);
});

test("countInWindow: both ends included, the day before and after are not", () => {
  const window = { start: d(2026, 11, 1), end: d(2026, 11, 7) };
  const logs = logsOn("i1", [d(2026, 10, 31), d(2026, 11, 1), d(2026, 11, 7), d(2026, 11, 8)]);
  assert.equal(countInWindow(logs, window), 2);
});

test("progressFraction: a decreasing number (189 to 165) and an increasing one", () => {
  assert.ok(Math.abs(progressFraction(goal({ currentValue: 178 })) - 11 / 24) < 1e-9);
  assert.equal(progressFraction(goal({ currentValue: 189 })), 0);
  assert.equal(progressFraction(goal({ currentValue: 160 })), 1);
  assert.equal(progressFraction(goal({ currentValue: 195 })), 0);
  const income = goal({ startValue: 0, targetValue: 500000, currentValue: 125000 });
  assert.equal(progressFraction(income), 0.25);
});

test("progressFraction: 0 with no number to track", () => {
  const none = goal({ startValue: null, targetValue: null, currentValue: null });
  assert.equal(progressFraction(none), 0);
  assert.equal(paceStatus(none, TODAY), null);
});

test("paceStatus: Jul 2 is half way through Jan 1 to Dec 31, so 178 is on pace and 183 is behind", () => {
  const halfway = d(2026, 7, 2); // 182 of 364 days
  assert.equal(paceStatus(goal({ currentValue: 178 }), halfway), "onPace");
  assert.equal(paceStatus(goal({ currentValue: 183 }), halfway), "behind");
  assert.equal(paceStatus(goal({ currentValue: 165 }), halfway), "reached");
});

test("paceStatus: within 10 points of expected is still on pace, and early on nobody is behind", () => {
  // expected 0.5, progress 0.4167 (179) is within the 0.10 margin
  assert.equal(paceStatus(goal({ currentValue: 179 }), d(2026, 7, 2)), "onPace");
  assert.equal(paceStatus(goal({ currentValue: 189 }), d(2026, 1, 10)), "onPace");
});

test("paceStatus: counts from the Denver day the goal was created", () => {
  // 03:00Z on Jan 2 is still Jan 1 in Denver, so Jan 2 is 1 day elapsed, not 0.
  const late = goal({ createdAt: new Date("2026-01-02T03:00:00Z"), targetDate: utcMidnightInstant(d(2026, 1, 11)) });
  // total = 10 days; on Jan 6 elapsed = 5, expected 0.5; 0 progress is behind
  assert.equal(paceStatus(late, d(2026, 1, 6)), "behind");
  // On Jan 2 elapsed = 1, expected 0.1; 0 progress is not below 0.1 - 0.10
  assert.equal(paceStatus(late, d(2026, 1, 2)), "onPace");
});

test("paceStatus: a target date on or before the created day is reached or behind", () => {
  const same = goal({ targetDate: utcMidnightInstant(d(2026, 1, 1)) });
  assert.equal(paceStatus(same, TODAY), "behind");
  assert.equal(paceStatus({ ...same, currentValue: 165 }, TODAY), "reached");
  assert.deepEqual(PACE_LABELS, { reached: "reached", onPace: "on pace", behind: "a little behind pace" });
});

test("measureStep: a twentieth of the range, snapped to a tidy size", () => {
  assert.equal(measureStep(189, 165), 1);
  assert.equal(measureStep(0, 500000), 25000);
  assert.equal(measureStep(0, 10), 0.5);
  assert.equal(measureStep(0, 1), 0.5);
  assert.equal(measureStep(0, 100), 5);
  assert.equal(measureStep(0, 1000000000), 100000);
  assert.equal(measureStep(500000, 0), 25000);
  assert.equal(measureStep(0, 30), 1); // ideal 1.5 sits between 1 and 2: the tie goes down
});

test("formatMeasure: dollars abbreviate, other units trail", () => {
  assert.equal(formatMeasure(412000, "$"), "$412K");
  assert.equal(formatMeasure(1250000, "$"), "$1.2M");
  assert.equal(formatMeasure(1500, "$"), "$1.5K");
  assert.equal(formatMeasure(999999, "$"), "$999.9K");
  assert.equal(formatMeasure(250, "$"), "$250");
  assert.equal(formatMeasure(0, "$"), "$0");
  assert.equal(formatMeasure(178, "lb"), "178 lb");
  assert.equal(formatMeasure(12.5, "pages"), "12.5 pages");
  assert.equal(formatMeasure(12.46, "pages"), "12.5 pages");
});

function viewOf(items: PlanItemRow[], logs: PlanLogRow[]) {
  return { items: items.map((row) => buildPlanItemView(row, logs, TODAY)) };
}

test("weekSummary: day and week habits only, and a habit over its target counts as exactly its target", () => {
  const over = [d(2026, 11, 1), d(2026, 11, 1), d(2026, 11, 2), d(2026, 11, 3), d(2026, 11, 4)];
  const short = [d(2026, 11, 2)];
  const items = [
    item({ id: "i1" }),
    item({ id: "i2", timesPerPeriod: 3 }),
    item({ id: "i3", kind: "step", timesPerPeriod: null, period: null }),
  ];
  const view = viewOf(items, [...logsOn("i1", over), ...logsOn("i2", short)]);
  assert.equal(view.items[0].count, 5);
  assert.deepEqual(weekSummary([view]), { done: 4 + 1, total: 4 + 3 });
  assert.deepEqual(weekSummary([]), { done: 0, total: 0 });
});

test("weekSummary: a monthly habit with target 1 does not change the summary", () => {
  const items = [item({ id: "i1" }), item({ id: "i2", timesPerPeriod: 1, period: "month" })];
  const logs = [...logsOn("i1", [d(2026, 11, 2)]), ...logsOn("i2", [d(2026, 11, 2)])];
  const view = viewOf(items, logs);
  assert.equal(view.items[1].windowLabel, "this month");
  assert.deepEqual(weekSummary([view]), { done: 1, total: 4 });
  assert.deepEqual(weekSummary([viewOf([items[0]], logs)]), weekSummary([view]));
});

test("weekTodo: undone day and week habits in order, with taps left, capped at the limit", () => {
  const items = [
    item({ id: "i1", title: "Exercise" }),
    item({ id: "i2", title: "Read", timesPerPeriod: 2 }),
    item({ id: "i3", title: "Stretch", timesPerPeriod: 1 }),
    item({ id: "i4", title: "Monthly", timesPerPeriod: 1, period: "month" }),
    item({ id: "i5", title: "Plan", kind: "step", timesPerPeriod: null, period: null }),
  ];
  const logs = [...logsOn("i1", [d(2026, 11, 2)]), ...logsOn("i2", [d(2026, 11, 2), d(2026, 11, 3)])];
  const view = viewOf(items, logs);
  assert.deepEqual(weekTodo([view], 5), [
    { id: "i1", title: "Exercise", left: 3 },
    { id: "i3", title: "Stretch", left: 1 },
  ]);
  assert.deepEqual(weekTodo([view], 1), [{ id: "i1", title: "Exercise", left: 3 }]);
  assert.deepEqual(weekTodo([], 3), []);
});

test("parseTypedNumber: commas and spaces are fine, blanks and words are not", () => {
  assert.equal(parseTypedNumber("178"), 178);
  assert.equal(parseTypedNumber(" 1,200.5 "), 1200.5);
  assert.equal(parseTypedNumber("-3"), -3);
  assert.equal(parseTypedNumber("0"), 0);
  assert.equal(parseTypedNumber(""), null);
  assert.equal(parseTypedNumber("   "), null);
  assert.equal(parseTypedNumber("abc"), null);
  assert.equal(parseTypedNumber("1e999"), null);
});

test("targetDateChips: end of this year, and next year's on Dec 31", () => {
  assert.deepEqual(targetDateChips(TODAY), [
    { label: "End of this year", date: d(2026, 12, 31) },
    { label: "In 90 days", date: d(2027, 2, 2) },
  ]);
  assert.deepEqual(targetDateChips(d(2026, 12, 31))[0].date, d(2027, 12, 31));
});

test("numberAfterCheckIns: the newest remaining check-in, or the start value with no date when none remain", () => {
  const old = { value: 185, at: new Date("2026-10-01T18:00:00Z") };
  const recent = { value: 180, at: new Date("2026-10-20T18:00:00Z") };
  assert.deepEqual(numberAfterCheckIns(189, [old, recent]), { currentValue: 180, checkedInAt: recent.at });
  assert.deepEqual(numberAfterCheckIns(189, [recent, old]), { currentValue: 180, checkedInAt: recent.at });
  assert.deepEqual(numberAfterCheckIns(189, []), { currentValue: 189, checkedInAt: null });
  assert.deepEqual(numberAfterCheckIns(null, []), { currentValue: null, checkedInAt: null });
});
