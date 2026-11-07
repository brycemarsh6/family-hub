import { test } from "node:test";
import assert from "node:assert/strict";
import { mealPlanPutBody, mealPlanWeekQuery, mealSlotParams } from "./schemasMealPlan";

test("mealPlanWeekQuery: optional real date, strict", () => {
  assert.ok(mealPlanWeekQuery.safeParse({}).success);
  assert.ok(mealPlanWeekQuery.safeParse({ weekOf: "2030-07-10" }).success);
  assert.ok(!mealPlanWeekQuery.safeParse({ weekOf: "2030-02-30" }).success);
  assert.ok(!mealPlanWeekQuery.safeParse({ week: "2030-07-10" }).success);
});

test("mealSlotParams: slot must be exactly one of the four", () => {
  assert.ok(mealSlotParams.safeParse({ date: "2030-07-10", slot: "Dinner" }).success);
  assert.ok(!mealSlotParams.safeParse({ date: "2030-07-10", slot: "dinner" }).success);
  assert.ok(!mealSlotParams.safeParse({ date: "2030-07-10", slot: "Brunch" }).success);
  assert.ok(!mealSlotParams.safeParse({ date: "July 10", slot: "Lunch" }).success);
});

test("mealPlanPutBody: needs a title or a recipeId, trims, strict", () => {
  assert.ok(!mealPlanPutBody.safeParse({}).success);
  assert.ok(!mealPlanPutBody.safeParse({ title: "   " }).success);
  assert.ok(mealPlanPutBody.safeParse({ recipeId: "r1" }).success);
  assert.equal(mealPlanPutBody.parse({ title: "  Tacos " }).title, "Tacos");
  assert.ok(!mealPlanPutBody.safeParse({ title: "x", extra: 1 }).success);
});
