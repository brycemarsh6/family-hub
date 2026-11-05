// Pins goals.ts: whose a goal is and who can see / change / log it, how a
// goal is built into a view, and what the goal and plan forms may submit.
// Windows, counts, progress, pace and formatting are in goalsProgress.test.ts,
// the vocabulary in goalVocabulary.test.ts, tap-time changes in
// planItemChanges.test.ts, the habit glue in goalsHabitInput.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GOAL_TITLE_MAX,
  GOAL_WHY_MAX,
  HABIT_TIMES_MAX,
  MEASURE_UNIT_MAX,
  buildGoalView,
  canEdit,
  canLog,
  canSee,
  earlierDate,
  goalOnBoard,
  goalOwnership,
  countsInScope,
  goalsInScope,
  isPrivateGoal,
  nextStep,
  validateGoalInput,
  validatePlanItemInput,
  whoseGoal,
  type GoalRow,
  type PlanItemRow,
  type Viewer,
} from "./goals";
import { utcMidnightInstant, type CalendarDate } from "./householdDate";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const ME: Viewer = { userId: "me", isDevice: false };
const SPOUSE: Viewer = { userId: "spouse", isDevice: false };
const TABLET: Viewer = { userId: "tablet", isDevice: true };
const TODAY = d(2026, 11, 4); // a Wednesday

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

test("goalOwnership, whoseGoal, isPrivateGoal: no owner is Together, the viewer's own is Mine", () => {
  assert.equal(goalOwnership(goal()), "mine");
  assert.equal(goalOwnership(goal({ ownerId: null })), "together");
  assert.equal(whoseGoal(goal(), "me"), "mine");
  assert.equal(whoseGoal(goal(), "spouse"), "theirs");
  assert.equal(whoseGoal(goal({ ownerId: null }), "me"), "together");
  assert.equal(whoseGoal(goal({ ownerId: null }), "tablet"), "together");
  assert.equal(isPrivateGoal(goal({ visibility: "private" })), true);
  assert.equal(isPrivateGoal(goal({ visibility: "shared" })), false);
});

test("goalOnBoard: the Together board holds Together goals, a person's board holds theirs", () => {
  assert.equal(goalOnBoard(goal({ ownerId: null }), "together"), true);
  assert.equal(goalOnBoard(goal({ ownerId: "me" }), "together"), false);
  assert.equal(goalOnBoard(goal({ ownerId: "me" }), "me"), true);
  assert.equal(goalOnBoard(goal({ ownerId: "spouse" }), "me"), false);
  assert.equal(goalOnBoard(goal({ ownerId: null }), "me"), false);
});

test("canSee: private is the owner's alone, and private with no owner is nobody's", () => {
  assert.equal(canSee(goal({ visibility: "private" }), ME), true);
  assert.equal(canSee(goal({ visibility: "private" }), SPOUSE), false);
  assert.equal(canSee(goal({ visibility: "private" }), TABLET), false);
  assert.equal(canSee(goal({ visibility: "private", ownerId: null }), ME), false);
  assert.equal(canSee(goal({ visibility: "shared" }), SPOUSE), true);
});

test("canEdit: a device never edits; Together is anyone's; Mine is its owner's", () => {
  const together = goal({ ownerId: null });
  assert.equal(canEdit(together, TABLET), false);
  assert.equal(canEdit(together, SPOUSE), true);
  assert.equal(canEdit(goal(), ME), true);
  assert.equal(canEdit(goal(), SPOUSE), false);
});

test("canLog: a device can log a Together goal; only the owner logs a Mine goal", () => {
  assert.equal(canLog(goal({ ownerId: null }), TABLET), true);
  assert.equal(canLog(goal(), ME), true);
  assert.equal(canLog(goal(), SPOUSE), false);
  assert.equal(canLog(goal(), TABLET), false);
});

test("nextStep: the first undone step by sortOrder; reminders and habits never qualify", () => {
  const step = (id: string, sortOrder: number, doneAt: Date | null = null): PlanItemRow =>
    item({ id, kind: "step", timesPerPeriod: null, period: null, habitId: null, sortOrder, doneAt });
  assert.equal(nextStep([step("b", 2), step("a", 1), step("c", 1)])?.id, "a");
  assert.equal(nextStep([step("a", 1, new Date()), step("b", 2)])?.id, "b");
  assert.equal(nextStep([item(), item({ kind: "reminder", timesPerPeriod: null, period: null, habitId: null })]), null);
  assert.equal(nextStep([]), null);
});

test("buildGoalView: reads each habit item from its own Habit, and an unlinked one shows 0", () => {
  const habit = {
    spec: { schedule: "weekly", times: 3 } as const,
    schedule: { schedule: "weekly", times: 3 },
    logs: [{ day: d(2026, 11, 3), status: "done" as const, userId: "me" }],
  };
  const items = [item({ habitId: "h1" }), item({ id: "i2", habitId: null }), item({ id: "i3", habitId: "gone" })];
  const view = buildGoalView(goal(), items, new Map([["h1", habit]]), ME, TODAY);
  assert.deepEqual(view.items.map((i) => [i.count, i.target]), [[1, 3], [0, 4], [0, 4]]);
});

test("buildGoalView: carries the progress, pace and the viewer's rights", () => {
  const view = buildGoalView(goal({ currentValue: 178 }), [item()], new Map(), SPOUSE, d(2026, 7, 2));
  assert.equal(view.items.length, 1);
  assert.ok(Math.abs(view.progress - 11 / 24) < 1e-9);
  assert.equal(view.pace, "onPace");
  assert.equal(view.canEdit, false);
  assert.equal(view.canLog, false);
  const together = buildGoalView(goal({ ownerId: null, owner: null }), [], new Map(), TABLET, TODAY);
  assert.equal(together.canEdit, false);
  assert.equal(together.canLog, true);
});

const GOOD = {
  title: "  Weigh 165  ",
  area: "health",
  why: "  To keep up with the kids  ",
  targetDate: "2026-12-31",
  ownership: "mine",
  visibility: "private",
  measure: { unit: " lb ", start: 189, target: 165 },
};

test("validateGoalInput: accepts a complete goal and trims it", () => {
  assert.deepEqual(validateGoalInput(GOOD, TODAY), {
    ok: {
      title: "Weigh 165",
      area: "health",
      why: "To keep up with the kids",
      targetDate: d(2026, 12, 31),
      ownership: "mine",
      visibility: "private",
      measure: { unit: "lb", start: 189, target: 165 },
    },
  });
});

test("validateGoalInput: the minimum goal needs no why, no number", () => {
  const raw = { title: "Date night", area: "relationships", targetDate: "2026-11-04", ownership: "together", visibility: "shared", why: "   " };
  const result = validateGoalInput(raw, TODAY);
  assert.deepEqual(result, {
    ok: {
      title: "Date night",
      area: "relationships",
      why: null,
      targetDate: TODAY,
      ownership: "together",
      visibility: "shared",
      measure: null,
    },
  });
});

test("validateGoalInput: rejects a past date, private + together, and half a number", () => {
  assert.deepEqual(validateGoalInput({ ...GOOD, targetDate: "2026-11-03" }, TODAY), {
    error: "Pick a target date that isn't in the past.",
  });
  assert.deepEqual(validateGoalInput({ ...GOOD, ownership: "together" }, TODAY), {
    error: "Only a goal that's yours can be private.",
  });
  assert.deepEqual(validateGoalInput({ ...GOOD, measure: { unit: "lb", start: 189 } }, TODAY), {
    error: "Enter a target number.",
  });
  assert.deepEqual(validateGoalInput({ ...GOOD, measure: { unit: "lb", target: 165 } }, TODAY), {
    error: "Enter a starting number.",
  });
});

test("validateGoalInput: a Together goal sent as private is refused, and a missing visibility fails closed", () => {
  const together = { ...GOOD, ownership: "together", visibility: "shared" };
  assert.ok("ok" in validateGoalInput(together, TODAY));
  assert.deepEqual(validateGoalInput({ ...together, visibility: "private" }, TODAY), {
    error: "Only a goal that's yours can be private.",
  });
  // An unknown or missing visibility reads as private, so it can't quietly make a Together goal shared.
  assert.deepEqual(validateGoalInput({ ...together, visibility: undefined }, TODAY), {
    error: "Only a goal that's yours can be private.",
  });
  const mine = { ...GOOD, ownership: "mine", visibility: "weird" };
  const result = validateGoalInput(mine, TODAY);
  assert.ok("ok" in result);
  assert.equal("ok" in result && result.ok.visibility, "private");
});

test("validateGoalInput: an overdue goal may keep its date, but no other past date", () => {
  const overdue = { year: 2026, month: 11, day: 1 };
  const keep = { ...GOOD, targetDate: "2026-11-01" };
  assert.ok("ok" in validateGoalInput(keep, TODAY, { earliest: overdue }));
  assert.ok("ok" in validateGoalInput({ ...GOOD, targetDate: "2026-12-31" }, TODAY, { earliest: overdue }));
  const message = { error: "Pick a target date that isn't in the past." };
  assert.deepEqual(validateGoalInput({ ...GOOD, targetDate: "2026-10-30" }, TODAY, { earliest: overdue }), message);
  assert.deepEqual(validateGoalInput(keep, TODAY), message);
  assert.deepEqual(validateGoalInput(keep, TODAY, {}), message);
});

test("earlierDate: picks the earlier day, ties give the first", () => {
  const a = { year: 2026, month: 11, day: 1 };
  const b = { year: 2026, month: 12, day: 1 };
  assert.equal(earlierDate(a, b), a);
  assert.equal(earlierDate(b, a), a);
  assert.equal(earlierDate(a, { ...a }), a);
});

test("earlierDate: a month start before the week start wins, and the other way round", () => {
  const nov1 = d(2026, 11, 1);
  const nov2 = d(2026, 11, 2);
  assert.equal(earlierDate(nov2, nov1), nov1);
  const nov29 = d(2026, 11, 29);
  const dec1 = d(2026, 12, 1);
  assert.equal(earlierDate(nov29, dec1), nov29);
});

test("validateGoalInput: rejects a bad number, a bad unit and equal start and target", () => {
  const withMeasure = (measure: unknown) => validateGoalInput({ ...GOOD, measure }, TODAY);
  assert.ok("error" in withMeasure({ unit: "lb", start: 5, target: 5 }));
  assert.ok("error" in withMeasure({ unit: "lb", start: Infinity, target: 5 }));
  assert.ok("error" in withMeasure({ unit: "lb", start: "5", target: 6 }));
  assert.ok("error" in withMeasure({ unit: "   ", start: 1, target: 2 }));
  assert.ok("error" in withMeasure({ unit: "x".repeat(13), start: 1, target: 2 }));
  assert.ok("ok" in withMeasure({ unit: "x".repeat(12), start: 1, target: 2 }));
  assert.ok("ok" in withMeasure(null));
});

test("validateGoalInput: title and area and date rules", () => {
  assert.deepEqual(validateGoalInput({ ...GOOD, title: "   " }, TODAY), { error: "Give the goal a name." });
  assert.deepEqual(validateGoalInput({ ...GOOD, title: undefined }, TODAY), { error: "Give the goal a name." });
  assert.ok("error" in validateGoalInput({ ...GOOD, title: "x".repeat(121) }, TODAY));
  assert.ok("ok" in validateGoalInput({ ...GOOD, title: "x".repeat(120) }, TODAY));
  assert.deepEqual(validateGoalInput({ ...GOOD, area: "play" }, TODAY), { error: "Pick a life area." });
  assert.ok("error" in validateGoalInput({ ...GOOD, why: "x".repeat(501) }, TODAY));
  assert.deepEqual(validateGoalInput({ ...GOOD, targetDate: "2026-02-30" }, TODAY), { error: "Pick a target date." });
  assert.deepEqual(validateGoalInput({ ...GOOD, targetDate: "12/31/2026" }, TODAY), { error: "Pick a target date." });
  assert.ok("error" in validateGoalInput({ ...GOOD, ownership: "ours" }, TODAY));
  for (const junk of [null, undefined, "goal", 7, []]) assert.ok("error" in validateGoalInput(junk, TODAY));
});

test("validatePlanItemInput: habits need times and a period, steps and reminders take neither", () => {
  assert.deepEqual(validatePlanItemInput({ title: " Run ", kind: "habit", timesPerPeriod: 3, period: "week" }), {
    ok: { title: "Run", kind: "habit", timesPerPeriod: 3, period: "week" },
  });
  assert.ok("error" in validatePlanItemInput({ title: "Run", kind: "habit", timesPerPeriod: 3 }));
  assert.ok("error" in validatePlanItemInput({ title: "Run", kind: "habit", period: "week" }));
  assert.ok("error" in validatePlanItemInput({ title: "Run", kind: "habit", timesPerPeriod: 0, period: "week" }));
  assert.ok("error" in validatePlanItemInput({ title: "Run", kind: "habit", timesPerPeriod: 8, period: "week" }));
  assert.ok("error" in validatePlanItemInput({ title: "Run", kind: "habit", timesPerPeriod: 1.5, period: "week" }));
  assert.ok("ok" in validatePlanItemInput({ title: "Run", kind: "habit", timesPerPeriod: 7, period: "week" }));
  assert.ok("ok" in validatePlanItemInput({ title: "Run", kind: "habit", timesPerPeriod: 31, period: "month" }));
  assert.ok("error" in validatePlanItemInput({ title: "Run", kind: "habit", timesPerPeriod: 32, period: "month" }));
  assert.ok("ok" in validatePlanItemInput({ title: "Run", kind: "habit", timesPerPeriod: 1, period: "day" }));
  assert.deepEqual(validatePlanItemInput({ title: "Buy land", kind: "step", timesPerPeriod: null, period: null }), {
    ok: { title: "Buy land", kind: "step", timesPerPeriod: null, period: null },
  });
  assert.deepEqual(validatePlanItemInput({ title: "Buy land", kind: "step", period: "week" }), {
    error: "Only a habit repeats.",
  });
  assert.ok("error" in validatePlanItemInput({ title: "Pray", kind: "reminder", timesPerPeriod: 1, period: null }));
  assert.ok("ok" in validatePlanItemInput({ title: "Pray", kind: "reminder" }));
});

test("the form limits are the ones the checks enforce", () => {
  assert.deepEqual([GOAL_TITLE_MAX, GOAL_WHY_MAX, MEASURE_UNIT_MAX], [120, 500, 12]);
  assert.deepEqual(HABIT_TIMES_MAX, { day: 1, week: 7, month: 31 });
  const goalWith = (over: object) => validateGoalInput({ ...GOOD, ...over }, TODAY);
  assert.ok("ok" in goalWith({ title: "x".repeat(GOAL_TITLE_MAX) }));
  assert.ok("error" in goalWith({ title: "x".repeat(GOAL_TITLE_MAX + 1) }));
  assert.ok("ok" in goalWith({ why: "x".repeat(GOAL_WHY_MAX) }));
  assert.ok("error" in goalWith({ why: "x".repeat(GOAL_WHY_MAX + 1) }));
  assert.ok("ok" in goalWith({ measure: { unit: "x".repeat(MEASURE_UNIT_MAX), start: 1, target: 2 } }));
  assert.ok("error" in goalWith({ measure: { unit: "x".repeat(MEASURE_UNIT_MAX + 1), start: 1, target: 2 } }));
  const habit = (times: number, period: string) => validatePlanItemInput({ title: "Run", kind: "habit", timesPerPeriod: times, period });
  assert.ok("ok" in habit(HABIT_TIMES_MAX.week, "week"));
  assert.deepEqual(habit(HABIT_TIMES_MAX.week + 1, "week"), { error: "Pick how many times, from 1 to 7." });
  assert.deepEqual(habit(HABIT_TIMES_MAX.month + 1, "month"), { error: "Pick how many times, from 1 to 31." });
  assert.deepEqual(habit(2, "day"), { error: "A habit gets one check a day." });
});

test("validatePlanItemInput: title and kind rules", () => {
  assert.deepEqual(validatePlanItemInput({ title: "", kind: "step" }), { error: "Give the plan a name." });
  assert.ok("error" in validatePlanItemInput({ title: "x".repeat(121), kind: "step" }));
  assert.deepEqual(validatePlanItemInput({ title: "Run", kind: "chore" }), { error: "Pick habit, step, or reminder." });
  assert.ok("error" in validatePlanItemInput(null));
});


test("goalsInScope: Mine and Together drops someone else's goals and completed ones", () => {
  const mine = goal({ id: "a" });
  const together = goal({ id: "b", ownerId: null });
  const theirs = goal({ id: "c", ownerId: "spouse" });
  const done = goal({ id: "d", completedAt: new Date("2026-10-01T00:00:00Z") });
  const ids = (goals: GoalRow[]) => goals.map((g) => g.id);
  assert.deepEqual(ids(goalsInScope([mine, together, theirs, done], ME, "mine")), ["a", "b"]);
  assert.deepEqual(ids(goalsInScope([mine, together, theirs, done], ME, "everyone")), ["a", "b", "c"]);
});

test("goalsInScope: a shared device counts every active goal whatever the scope", () => {
  const goals = [goal({ id: "a" }), goal({ id: "c", ownerId: "spouse" }), goal({ id: "d", completedAt: new Date() })];
  assert.deepEqual(goalsInScope(goals, TABLET, "mine").map((g) => g.id), ["a", "c"]);
});

test("countsInScope: completed goals still count; only someone else's goals drop out of Mine and Together", () => {
  const theirs = goal({ id: "c", ownerId: "spouse" });
  const done = goal({ id: "d", completedAt: new Date("2026-10-01T00:00:00Z") });
  assert.equal(countsInScope(done, ME, "mine"), true);
  assert.equal(countsInScope(theirs, ME, "mine"), false);
  assert.equal(countsInScope(theirs, ME, "everyone"), true);
  assert.equal(countsInScope(theirs, TABLET, "mine"), true);
});
