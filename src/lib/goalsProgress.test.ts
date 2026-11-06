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
  formatMeasure,
  measureStep,
  numberAfterCheckIns,
  paceStatus,
  parseTypedNumber,
  progressFraction,
  targetDateChips,
  weekSummary,
  weekTodo,
  weekTodoForGoals,
  type GoalMeasure,
  type PlanHabit,
  type PlanItemRow,
} from "./goalsProgress";
import { goalHoursLine } from "./habitsHours";
import type { ScheduleSpec } from "./habits/types";
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
    habitId: "h1",
    doneAt: null,
    sortOrder: 0,
    createdAt: new Date("2026-01-01T19:00:00Z"),
    ...over,
  };
}

const WEEKLY_4: ScheduleSpec = { schedule: "weekly", times: 4 };

/** One habit as the reader hands it over: its schedule and a "done" check on each day. */
function habitOn(days: CalendarDate[], spec: ScheduleSpec = WEEKLY_4, userId = "u1"): PlanHabit {
  return {
    spec,
    schedule: { schedule: spec.schedule, times: "times" in spec ? spec.times : null },
    logs: days.map((day) => ({ day, status: "done", userId })),
  };
}

test("buildPlanItemView: 4 of 4 is done, and a repeat check on one day still counts once", () => {
  const four = buildPlanItemView(item(), habitOn([d(2026, 11, 1), d(2026, 11, 2), d(2026, 11, 3), d(2026, 11, 4)]), TODAY);
  assert.equal(four.count, 4);
  assert.equal(four.done, true);
  assert.equal(four.windowLabel, "this week");
  const dup = buildPlanItemView(
    item(),
    habitOn([d(2026, 11, 1), d(2026, 11, 1), d(2026, 11, 2), d(2026, 11, 3), d(2026, 11, 4)]),
    TODAY,
  );
  assert.equal(dup.count, 4);
  assert.equal(dup.target, 4);
});

test("buildPlanItemView: three taps on one day are one check (one row per person per day)", () => {
  const view = buildPlanItemView(item(), habitOn([TODAY, TODAY, TODAY]), TODAY);
  assert.equal(view.count, 1);
  assert.equal(view.doneToday, true);
  assert.equal(view.done, false);
});

test("buildPlanItemView: a Together habit's checks from every participant count once per day", () => {
  const habit: PlanHabit = {
    ...habitOn([]),
    logs: ["a", "b", "c"].flatMap((userId) => [d(2026, 11, 2), d(2026, 11, 3)].map((day) => ({ day, status: "done" as const, userId }))),
  };
  assert.equal(buildPlanItemView(item(), habit, TODAY).count, 2);
});

test("buildPlanItemView: 3 of 4 is not done, and doneToday follows today's check", () => {
  const view = buildPlanItemView(item(), habitOn([d(2026, 11, 2), d(2026, 11, 3), d(2026, 11, 4)]), TODAY);
  assert.equal(view.count, 3);
  assert.equal(view.done, false);
  assert.equal(view.doneToday, true);
  assert.equal(buildPlanItemView(item(), habitOn([d(2026, 11, 2), d(2026, 11, 3)]), TODAY).doneToday, false);
});

test("buildPlanItemView: a skipped day is not a check", () => {
  const habit = habitOn([]);
  habit.logs = [{ day: TODAY, status: "skipped", userId: "u1" }];
  const view = buildPlanItemView(item(), habit, TODAY);
  assert.equal(view.count, 0);
  assert.equal(view.doneToday, false);
});

test("buildPlanItemView: a daily habit counts across the week against 7 and reads as 'every day' to the edit sheet", () => {
  const daily = habitOn([d(2026, 11, 1), d(2026, 11, 2)], { schedule: "daily" });
  const view = buildPlanItemView(item({ timesPerPeriod: 3, period: "week" }), daily, d(2026, 11, 7));
  assert.deepEqual([view.target, view.count, view.windowLabel, view.timesPerPeriod, view.period], [7, 2, "this week", 1, "day"]);
  // Sunday starts a new week
  assert.equal(buildPlanItemView(item(), daily, d(2026, 11, 8)).count, 0);
});

test("buildPlanItemView: week target is times; a month habit spans the whole month", () => {
  assert.equal(buildPlanItemView(item(), habitOn([]), TODAY).target, 4);
  const monthly: ScheduleSpec = { schedule: "monthly", times: 2 };
  const view = buildPlanItemView(item(), habitOn([d(2027, 1, 3), d(2027, 1, 30)], monthly), d(2027, 1, 31));
  assert.deepEqual([view.count, view.target, view.windowLabel, view.timesPerPeriod, view.period], [2, 2, "this month", 2, "month"]);
  // The day before the month and the day after are outside it.
  assert.equal(buildPlanItemView(item(), habitOn([d(2026, 12, 31), d(2027, 2, 1)], monthly), d(2027, 1, 31)).count, 0);
  assert.equal(buildPlanItemView(item(), habitOn([d(2027, 2, 27)], monthly), d(2027, 2, 28)).count, 1);
});

test("buildPlanItemView: a habit item with no Habit shows 0 of its own target and is never done", () => {
  const view = buildPlanItemView(item({ habitId: null }), null, TODAY);
  assert.deepEqual([view.count, view.target, view.done, view.doneToday, view.windowLabel], [0, 4, false, false, "this week"]);
  const monthly = buildPlanItemView(item({ habitId: "gone", timesPerPeriod: 2, period: "month" }), null, TODAY);
  assert.deepEqual([monthly.count, monthly.target, monthly.windowLabel], [0, 2, "this month"]);
  const daily = buildPlanItemView(item({ timesPerPeriod: 1, period: "day" }), null, TODAY);
  assert.equal(daily.target, 7);
});

test("buildPlanItemView: steps follow doneAt, reminders have no target", () => {
  const step = item({ kind: "step", timesPerPeriod: null, period: null, habitId: null });
  assert.deepEqual(
    (({ count, target, done, windowLabel }) => ({ count, target, done, windowLabel }))(buildPlanItemView(step, null, TODAY)),
    { count: 0, target: 1, done: false, windowLabel: null },
  );
  const doneStep = buildPlanItemView({ ...step, doneAt: new Date() }, null, TODAY);
  assert.equal(doneStep.done, true);
  assert.equal(doneStep.count, 1);
  const reminder = buildPlanItemView(item({ kind: "reminder", timesPerPeriod: null, period: null, habitId: null }), null, TODAY);
  assert.equal(reminder.target, 0);
  assert.equal(reminder.done, false);
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

function viewOf(items: PlanItemRow[], habits: Record<string, PlanHabit>) {
  return { items: items.map((row) => buildPlanItemView(row, row.habitId ? (habits[row.habitId] ?? null) : null, TODAY)) };
}

test("weekSummary: day and week habits only, and a habit over its target counts as exactly its target", () => {
  const over = [d(2026, 11, 1), d(2026, 11, 2), d(2026, 11, 3), d(2026, 11, 4), d(2026, 11, 5)];
  const short = [d(2026, 11, 2)];
  const items = [
    item({ id: "i1" }),
    item({ id: "i2", habitId: "h2" }),
    item({ id: "i3", kind: "step", timesPerPeriod: null, period: null, habitId: null }),
  ];
  const view = viewOf(items, { h1: habitOn(over), h2: habitOn(short, { schedule: "weekly", times: 3 }) });
  assert.equal(view.items[0].count, 5);
  assert.deepEqual(weekSummary([view]), { done: 4 + 1, total: 4 + 3 });
  assert.deepEqual(weekSummary([]), { done: 0, total: 0 });
});

test("weekSummary: a monthly habit with target 1 does not change the summary", () => {
  const items = [item({ id: "i1" }), item({ id: "i2", habitId: "h2" })];
  const logs = { h1: habitOn([d(2026, 11, 2)]), h2: habitOn([d(2026, 11, 2)], { schedule: "monthly", times: 1 }) };
  const view = viewOf(items, logs);
  assert.equal(view.items[1].windowLabel, "this month");
  assert.deepEqual(weekSummary([view]), { done: 1, total: 4 });
  assert.deepEqual(weekSummary([viewOf([items[0]], logs)]), weekSummary([view]));
});

test("weekTodo: undone day and week habits in order, with taps left, capped at the limit", () => {
  const items = [
    item({ id: "i1", title: "Exercise" }),
    item({ id: "i2", title: "Read", habitId: "h2" }),
    item({ id: "i3", title: "Stretch", habitId: "h3" }),
    item({ id: "i4", title: "Monthly", habitId: "h4" }),
    item({ id: "i5", title: "Plan", kind: "step", timesPerPeriod: null, period: null, habitId: null }),
  ];
  const logs = {
    h1: habitOn([d(2026, 11, 2)]),
    h2: habitOn([d(2026, 11, 2), d(2026, 11, 3)], { schedule: "weekly", times: 2 }),
    h3: habitOn([], { schedule: "weekly", times: 1 }),
    h4: habitOn([], { schedule: "monthly", times: 1 }),
  };
  const view = viewOf(items, logs);
  assert.deepEqual(weekTodo([view], 5), [
    { id: "i1", title: "Exercise", left: 3 },
    { id: "i3", title: "Stretch", left: 1 },
  ]);
  assert.deepEqual(weekTodo([view], 1), [{ id: "i1", title: "Exercise", left: 3 }]);
  assert.deepEqual(weekTodo([], 3), []);
});

test("weekTodoForGoals: only the picked goals, in picked order, then item order, uncapped", () => {
  const logs = {
    h1: habitOn([], { schedule: "weekly", times: 2 }),
    h2: habitOn([], { schedule: "weekly", times: 1 }),
    h3: habitOn([d(2026, 11, 2)], { schedule: "weekly", times: 1 }),
    h4: habitOn([], { schedule: "weekly", times: 1 }),
    h5: habitOn([], { schedule: "weekly", times: 1 }),
  };
  const a = { id: "gA", ...viewOf([item({ id: "a1", title: "A1", habitId: "h1" }), item({ id: "a2", title: "A2", habitId: "h3" })], logs) };
  const b = { id: "gB", ...viewOf([item({ id: "b1", title: "B1", habitId: "h2" }), item({ id: "b2", title: "B2", habitId: "h4" }), item({ id: "b3", title: "B3", habitId: "h5" })], logs) };
  const c = { id: "gC", ...viewOf([item({ id: "c1", title: "C1", habitId: "h2" })], logs) };
  assert.deepEqual(weekTodoForGoals([a, b, c], ["gB", "gA"]), [
    { id: "b1", title: "B1", left: 1 },
    { id: "b2", title: "B2", left: 1 },
    { id: "b3", title: "B3", left: 1 },
    { id: "a1", title: "A1", left: 2 },
  ]);
  assert.deepEqual(weekTodoForGoals([a, b, c], ["gC", "gC", "nope"]), [{ id: "c1", title: "C1", left: 1 }]);
  assert.deepEqual(weekTodoForGoals([a, b, c], []), []);
  assert.deepEqual(weekTodoForGoals([a], ["gX"]), []);
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

// --- Hours habits (decision 198) ---

const hoursHabit = (minutes: number, over: Partial<NonNullable<PlanHabit["hours"]>> = {}): PlanHabit => ({
  spec: { schedule: "weekly", times: 1 },
  schedule: { schedule: "weekly", times: 1 },
  logs: [],
  hours: { targetMinutes: 600, paceDays: "monsat", entries: [{ day: d(2026, 11, 2), minutes, userId: "u1" }], ...over },
});

test("buildPlanItemView: an hours habit shows 'Calling · 6½ of 10 hours this week' with its bar, 0 of 1 until met", () => {
  const view = buildPlanItemView(item({ title: "Calling" }), hoursHabit(390), TODAY);
  assert.equal(view.hours?.doneText, "6½ of 10 hours this week");
  assert.equal(view.hours?.fraction, 0.65);
  assert.equal(goalHoursLine(view.title, view.hours!), "Calling · 6½ of 10 hours this week");
  assert.deepEqual([view.count, view.target, view.windowLabel, view.done, view.doneToday], [0, 1, "this week", false, false]);
  assert.equal(buildPlanItemView(item(), habitOn([]), TODAY).hours, undefined, "a checks habit has none");
});

test("buildPlanItemView: an hours habit counts done for the goal's week only once the target is met", () => {
  const met = buildPlanItemView(item(), hoursHabit(600), TODAY);
  assert.deepEqual([met.count, met.target, met.done], [1, 1, true]);
  assert.deepEqual(weekSummary([{ items: [met, buildPlanItemView(item({ id: "i2" }), hoursHabit(120), TODAY)] }]), { done: 1, total: 2 });
});

test("weekTodo: an unmet hours habit lists with its Goals tile line 'Calling · 3½ hours left'; a met one is left out", () => {
  const unmet = buildPlanItemView(item({ id: "i1", title: "Calling" }), hoursHabit(390), d(2026, 11, 6));
  const met = buildPlanItemView(item({ id: "i2", title: "Follow-up" }), hoursHabit(600), d(2026, 11, 6));
  assert.deepEqual(weekTodo([{ items: [unmet, met] }], 5), [{ id: "i1", title: "Calling", left: 1, hoursLine: "Calling · 3½ hours left" }]);
});

test("buildPlanItemView: last week's hours for the Sunday recap are counted from that week's entries", () => {
  const view = buildPlanItemView(item(), hoursHabit(600), d(2026, 11, 1));
  assert.equal(view.done, true);
  assert.equal(buildPlanItemView(item(), hoursHabit(600), d(2026, 11, 8)).done, false, "the next week starts empty");
});
