import { test } from "node:test";
import assert from "node:assert/strict";
import { PLAN_TOLERANCE_MS, pickNearestPlan, planWindow } from "./mealPlanWeek";

const T = Date.UTC(2030, 0, 6, 7);
const at = (offsetMs: number) => ({ weekStart: new Date(T + offsetMs) });

test("pickNearestPlan: nearest within tolerance wins, the edge counts", () => {
  const far = { id: "far", ...at(PLAN_TOLERANCE_MS) };
  const near = { id: "near", ...at(-3_600_000) };
  assert.equal(pickNearestPlan([far, near], T)?.id, "near");
  assert.equal(pickNearestPlan([far], T)?.id, "far");
});

test("pickNearestPlan: out of range and empty are null", () => {
  assert.equal(pickNearestPlan([at(PLAN_TOLERANCE_MS + 1)], T), null);
  assert.equal(pickNearestPlan([], T), null);
});

test("planWindow brackets the instant by the tolerance", () => {
  const w = planWindow(T);
  assert.equal(w.gte.getTime(), T - PLAN_TOLERANCE_MS);
  assert.equal(w.lte.getTime(), T + PLAN_TOLERANCE_MS);
});
