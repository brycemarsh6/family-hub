// Pins Plans & Goals' vocabulary (goalVocabulary.ts): the six life areas,
// the plan kinds, habit periods, visibility and ownership, and the narrowers
// that repair unknown stored values. The rules that use them are in
// goals.test.ts and goalsProgress.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GOAL_OWNERSHIPS,
  GOAL_OWNERSHIP_LABELS,
  DEFAULT_VISION_HORIZON,
  VISION_HORIZONS,
  LIFE_AREAS,
  PLAN_KIND_LABELS,
  lifeAreaInfo,
  toGoalVisibility,
  toHabitPeriod,
  toLifeArea,
  toPlanKind,
  toVisionHorizon,
} from "./goalVocabulary";

test("vocabulary: six life areas in order, narrowers repair unknowns", () => {
  assert.deepEqual(
    LIFE_AREAS.map((a) => a.key),
    ["spiritual", "health", "growth", "relationships", "financial", "fun"],
  );
  assert.equal(toLifeArea("health"), "health");
  assert.equal(toLifeArea("Health"), null);
  assert.equal(lifeAreaInfo("relationships").short, "Relationships");
  assert.equal(lifeAreaInfo("financial").label, "Work & Money");
  assert.equal(lifeAreaInfo("financial").short, "Work & Money");
  assert.equal(lifeAreaInfo("fun").label, "Fun & Adventure");
  assert.equal(toLifeArea("fun"), "fun");
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

test("vision horizons: 5, 10 and 15 years, numbers or their strings, 10 by default", () => {
  assert.deepEqual([...VISION_HORIZONS], [5, 10, 15]);
  assert.equal(DEFAULT_VISION_HORIZON, 10);
  assert.equal(toVisionHorizon(5), 5);
  assert.equal(toVisionHorizon("10"), 10);
  assert.equal(toVisionHorizon("15"), 15);
  assert.equal(toVisionHorizon(7), null);
  assert.equal(toVisionHorizon("7"), null);
  assert.equal(toVisionHorizon("10 "), null);
  assert.equal(toVisionHorizon(null), null);
  assert.equal(toVisionHorizon(undefined), null);
});
