// Pins Plans & Goals' vocabulary (goalVocabulary.ts): the five life areas,
// the plan kinds, habit periods, visibility and ownership, and the narrowers
// that repair unknown stored values. The rules that use them are in
// goals.test.ts and goalsProgress.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GOAL_OWNERSHIPS,
  GOAL_OWNERSHIP_LABELS,
  LIFE_AREAS,
  PLAN_KIND_LABELS,
  lifeAreaInfo,
  toGoalVisibility,
  toHabitPeriod,
  toLifeArea,
  toPlanKind,
} from "./goalVocabulary";

test("vocabulary: five life areas in order, narrowers repair unknowns", () => {
  assert.deepEqual(
    LIFE_AREAS.map((a) => a.key),
    ["spiritual", "health", "growth", "financial", "relationships"],
  );
  assert.equal(toLifeArea("health"), "health");
  assert.equal(toLifeArea("Health"), null);
  assert.equal(lifeAreaInfo("relationships").short, "Relationships");
  assert.equal(toPlanKind("step"), "step");
  assert.equal(toPlanKind("chore"), null);
  assert.equal(toHabitPeriod("month"), "month");
  assert.equal(toHabitPeriod("year"), null);
  assert.equal(toGoalVisibility("private"), "private");
  assert.equal(toGoalVisibility("shared"), "shared");
  assert.equal(toGoalVisibility("secret"), "private");
  assert.equal(toGoalVisibility(undefined), "private");
  assert.deepEqual(PLAN_KIND_LABELS.habit, { label: "Habit", hint: "repeats" });
});

test("ownership: Mine and Together, each with its label", () => {
  assert.deepEqual([...GOAL_OWNERSHIPS], ["mine", "together"]);
  assert.deepEqual(GOAL_OWNERSHIP_LABELS, { mine: "Mine", together: "Together" });
});
