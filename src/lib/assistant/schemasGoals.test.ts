import { test } from "node:test";
import assert from "node:assert/strict";
import { validateGoalInput, validatePlanItemInput } from "@/lib/goals";
import {
  checkInBody,
  editsGoalFields,
  editsPlanItemFields,
  goalCreateBody,
  goalListQuery,
  goalPatchBody,
  newGoalRaw,
  patchedGoalRaw,
  patchedPlanItemRaw,
  planItemCreateBody,
  planItemPatchBody,
  visionBody,
  visionQuery,
} from "./schemasGoals";

const ok = (r: { success: boolean }) => r.success;
const TODAY = { year: 2026, month: 11, day: 7 };

test("goalCreateBody: title, area and ownership are required", () => {
  assert.ok(ok(goalCreateBody.safeParse({ title: "Run", area: "health", ownership: "mine" })));
  assert.ok(!ok(goalCreateBody.safeParse({ area: "health", ownership: "mine" })));
  assert.ok(!ok(goalCreateBody.safeParse({ title: "Run", ownership: "mine" })));
  assert.ok(!ok(goalCreateBody.safeParse({ title: "Run", area: "health" })));
  assert.ok(!ok(goalCreateBody.safeParse({ title: "Run", area: "wealth", ownership: "mine" })));
});

test("visibility and any other unknown key are a 400 on every goal body", () => {
  assert.ok(!ok(goalCreateBody.safeParse({ title: "Run", area: "health", ownership: "mine", visibility: "private" })));
  assert.ok(!ok(goalPatchBody.safeParse({ visibility: "shared" })));
  assert.ok(!ok(goalPatchBody.safeParse({ ownership: "together" })));
  assert.ok(!ok(goalPatchBody.safeParse({ createdById: "x" })));
  assert.ok(!ok(planItemCreateBody.safeParse({ title: "a", kind: "step", goalId: "g" })));
});

test("goalCreateBody: a date and ongoing are not both sent; dates must be real", () => {
  const base = { title: "Run", area: "health", ownership: "together" };
  assert.ok(ok(goalCreateBody.safeParse({ ...base, targetDate: "2027-01-01" })));
  assert.ok(ok(goalCreateBody.safeParse({ ...base, ongoing: true })));
  assert.ok(!ok(goalCreateBody.safeParse({ ...base, ongoing: true, targetDate: "2027-01-01" })));
  assert.ok(!ok(goalCreateBody.safeParse({ ...base, ongoing: false })));
  assert.ok(!ok(goalCreateBody.safeParse({ ...base, targetDate: "2027-02-30" })));
});

test("goalPatchBody: something to change; removeNumber is alone; completed alone is fine", () => {
  assert.ok(!ok(goalPatchBody.safeParse({})));
  assert.ok(ok(goalPatchBody.safeParse({ completed: true })));
  assert.ok(ok(goalPatchBody.safeParse({ removeNumber: true })));
  assert.ok(!ok(goalPatchBody.safeParse({ removeNumber: true, targetValue: 5 })));
  assert.ok(!ok(goalPatchBody.safeParse({ removeNumber: false })));
  assert.ok(!ok(goalPatchBody.safeParse({ ongoing: true, targetDate: "2027-01-01" })));
  assert.ok(ok(goalPatchBody.safeParse({ ongoing: false, targetDate: "2027-01-01" })));
});

test("newGoalRaw: the end of this year when no date is given, Ongoing when asked, always shared", () => {
  const plain = newGoalRaw(goalCreateBody.parse({ title: "Run", area: "health", ownership: "mine" }), TODAY);
  assert.equal(plain.targetDate, "2026-12-31");
  assert.equal(plain.visibility, "shared");
  assert.equal(newGoalRaw(goalCreateBody.parse({ title: "Run", area: "health", ownership: "mine", ongoing: true }), TODAY).targetDate, null);
  assert.equal(newGoalRaw(goalCreateBody.parse({ title: "Run", area: "health", ownership: "mine", targetDate: "2027-03-01" }), TODAY).targetDate, "2027-03-01");
  const ok1 = validateGoalInput(plain, TODAY);
  assert.ok("ok" in ok1 && ok1.ok.visibility === "shared" && ok1.ok.targetDate?.year === 2026);
});

test("newGoalRaw: the number's three fields reach the validator, which refuses a partial one in its words", () => {
  const full = newGoalRaw(goalCreateBody.parse({ title: "Lose", area: "health", ownership: "mine", measureUnit: "lb", startValue: 90, targetValue: 80 }), TODAY);
  const parsed = validateGoalInput(full, TODAY);
  assert.ok("ok" in parsed && parsed.ok.measure?.unit === "lb");
  const partial = newGoalRaw(goalCreateBody.parse({ title: "Lose", area: "health", ownership: "mine", measureUnit: "lb" }), TODAY);
  assert.deepEqual(validateGoalInput(partial, TODAY), { error: "Enter a starting number." });
});

const stored = {
  title: "Run",
  area: "health",
  why: "Feel good",
  targetDate: new Date("2027-01-01T00:00:00Z"),
  visibility: "shared",
  measureUnit: "mi",
  startValue: 0,
  targetValue: 100,
};

test("patchedGoalRaw: what is left out stays, and visibility keeps its stored value", () => {
  const raw = patchedGoalRaw(stored, goalPatchBody.parse({ title: "Run more" }));
  assert.deepEqual(raw, { title: "Run more", area: "health", why: "Feel good", ongoing: false, targetDate: "2027-01-01", measure: { unit: "mi", start: 0, target: 100 }, visibility: "shared" });
  assert.equal(patchedGoalRaw({ ...stored, visibility: "private" }, goalPatchBody.parse({ title: "x" })).visibility, "private");
});

test("patchedGoalRaw: why null clears it, a target alone keeps the unit and start, removeNumber drops the number", () => {
  assert.equal(patchedGoalRaw(stored, goalPatchBody.parse({ why: null })).why, null);
  assert.deepEqual(patchedGoalRaw(stored, goalPatchBody.parse({ targetValue: 120 })).measure, { unit: "mi", start: 0, target: 120 });
  assert.equal(patchedGoalRaw(stored, goalPatchBody.parse({ removeNumber: true })).measure, null);
  assert.equal(patchedGoalRaw({ ...stored, measureUnit: null, startValue: null, targetValue: null }, goalPatchBody.parse({ title: "x" })).measure, null);
});

test("patchedGoalRaw: Ongoing both ways", () => {
  assert.equal(patchedGoalRaw(stored, goalPatchBody.parse({ ongoing: true })).targetDate, null);
  const ongoing = { ...stored, targetDate: null };
  assert.equal(patchedGoalRaw(ongoing, goalPatchBody.parse({ title: "x" })).ongoing, true);
  assert.equal(patchedGoalRaw(ongoing, goalPatchBody.parse({ targetDate: "2027-05-05" })).targetDate, "2027-05-05");
  const dateless = patchedGoalRaw(ongoing, goalPatchBody.parse({ ongoing: false }));
  assert.deepEqual(validateGoalInput({ ...dateless, ownership: "mine" }, TODAY), { error: "Pick a target date." });
});

test("editsGoalFields: completed alone is not an edit of the fields", () => {
  assert.equal(editsGoalFields(goalPatchBody.parse({ completed: true })), false);
  assert.equal(editsGoalFields(goalPatchBody.parse({ completed: true, title: "x" })), true);
});

test("queries: status and horizon are words from a list", () => {
  assert.ok(ok(goalListQuery.safeParse({ status: "done", personId: "p" })));
  assert.ok(!ok(goalListQuery.safeParse({ status: "open" })));
  assert.ok(ok(visionQuery.safeParse({ board: "together", horizon: "10" })));
  assert.ok(!ok(visionQuery.safeParse({ horizon: "7" })));
  assert.ok(ok(checkInBody.safeParse({ value: 78.5 })));
  assert.ok(!ok(checkInBody.safeParse({ value: "78" })));
  assert.ok(ok(visionBody.safeParse({ text: "" })));
  assert.ok(!ok(visionBody.safeParse({ text: "x", board: "y" })));
});

test("planItem bodies: kind and period come from the app's lists", () => {
  assert.ok(ok(planItemCreateBody.safeParse({ title: "Walk", kind: "habit", period: "week", timesPerPeriod: 3 })));
  assert.ok(!ok(planItemCreateBody.safeParse({ title: "Walk", kind: "chore" })));
  assert.ok(!ok(planItemCreateBody.safeParse({ title: "Walk", kind: "habit", period: "year" })));
  assert.ok(!ok(planItemPatchBody.safeParse({})));
  assert.ok(ok(planItemPatchBody.safeParse({ done: true })));
});

test("patchedPlanItemRaw: a habit keeps its repeat, a step turned habit must name one, a step to reminder sends none", () => {
  const habit = { title: "Walk", kind: "habit" as const, timesPerPeriod: 3, period: "week" as const };
  assert.deepEqual(validatePlanItemInput(patchedPlanItemRaw(habit, planItemPatchBody.parse({ title: "Walk fast" }))), { ok: { title: "Walk fast", kind: "habit", timesPerPeriod: 3, period: "week" } });
  const step = { title: "Call", kind: "step" as const, timesPerPeriod: null, period: null };
  assert.deepEqual(validatePlanItemInput(patchedPlanItemRaw(step, planItemPatchBody.parse({ kind: "habit" }))), { error: "Pick every day, a week, or a month." });
  assert.ok("ok" in validatePlanItemInput(patchedPlanItemRaw(step, planItemPatchBody.parse({ kind: "habit", period: "day", timesPerPeriod: 1 }))));
  assert.ok("ok" in validatePlanItemInput(patchedPlanItemRaw(step, planItemPatchBody.parse({ kind: "reminder" }))));
  assert.deepEqual(validatePlanItemInput(patchedPlanItemRaw(step, planItemPatchBody.parse({ timesPerPeriod: 2 }))), { error: "Only a habit repeats." });
});

test("editsPlanItemFields: done alone is not an edit of the item", () => {
  assert.equal(editsPlanItemFields(planItemPatchBody.parse({ done: true })), false);
  assert.equal(editsPlanItemFields(planItemPatchBody.parse({ done: true, title: "x" })), true);
});
