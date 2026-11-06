// Pins ongoing goals (no end date): the form's explicit Ongoing is the only
// way past a blank date, and an ongoing goal has no pace beyond "reached".
// The rest of validation is in goals.test.ts, pace in goalsProgress.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { validateGoalInput } from "./goals";
import { paceStatus, type GoalMeasure } from "./goalsProgress";
import { utcMidnightInstant, type CalendarDate } from "./householdDate";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const TODAY = d(2026, 11, 4);

const GOOD = {
  title: "Read more",
  area: "growth",
  why: "",
  targetDate: "",
  ownership: "mine",
  visibility: "shared",
  measure: null,
};

function goal(over: Partial<GoalMeasure> = {}): GoalMeasure {
  return {
    targetDate: null,
    startValue: 0,
    targetValue: 100,
    currentValue: 10,
    createdAt: new Date("2026-01-01T19:00:00Z"),
    ...over,
  };
}

test("validateGoalInput: Ongoing saves with no date", () => {
  const result = validateGoalInput({ ...GOOD, ongoing: true }, TODAY);
  assert.ok("ok" in result);
  assert.equal(result.ok.targetDate, null);
});

test("validateGoalInput: Ongoing ignores a stray date, even a past one", () => {
  const result = validateGoalInput({ ...GOOD, ongoing: true, targetDate: "2020-01-01" }, TODAY);
  assert.ok("ok" in result);
  assert.equal(result.ok.targetDate, null);
});

test("validateGoalInput: a blank date without Ongoing is still refused", () => {
  assert.deepEqual(validateGoalInput(GOOD, TODAY), { error: "Pick a target date." });
  assert.deepEqual(validateGoalInput({ ...GOOD, ongoing: false }, TODAY), { error: "Pick a target date." });
  assert.deepEqual(validateGoalInput({ ...GOOD, ongoing: "true" }, TODAY), { error: "Pick a target date." });
});

test("validateGoalInput: a dated goal still checks the past", () => {
  assert.ok("error" in validateGoalInput({ ...GOOD, targetDate: "2026-11-03" }, TODAY));
  assert.deepEqual(validateGoalInput({ ...GOOD, targetDate: "2026-12-31" }, TODAY), {
    ok: { title: "Read more", area: "growth", why: null, targetDate: d(2026, 12, 31), ownership: "mine", visibility: "shared", measure: null },
  });
});

test("paceStatus: an ongoing goal has no pace until it is reached", () => {
  assert.equal(paceStatus(goal(), TODAY), null);
  assert.equal(paceStatus(goal({ currentValue: 100 }), TODAY), "reached");
  assert.equal(paceStatus(goal({ currentValue: 120 }), TODAY), "reached");
});

test("paceStatus: an ongoing goal with no number is null", () => {
  assert.equal(paceStatus(goal({ startValue: null, targetValue: null, currentValue: null }), TODAY), null);
});

test("paceStatus: a dated goal's pace is unchanged", () => {
  const dated = goal({ targetDate: utcMidnightInstant(d(2026, 12, 31)), currentValue: 0 });
  assert.equal(paceStatus(dated, d(2026, 11, 4)), "behind");
  assert.equal(paceStatus({ ...dated, currentValue: 100 }, TODAY), "reached");
});
