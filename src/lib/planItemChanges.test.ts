// Tests for planItemChanges.ts: the tap-time (optimistic) changes to a plan
// item, shared by This week and the goal page. Siblings: goals.test.ts,
// goalsProgress.test.ts, goalVocabulary.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { applyPlanItemChange } from "./planItemChanges";
import type { PlanItemView } from "./goalsProgress";

function view(over: Partial<PlanItemView> = {}): PlanItemView {
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
    count: 3,
    target: 4,
    windowLabel: "this week",
    done: false,
    doneToday: false,
    ...over,
  };
}

test("log: the count goes up and the habit is done when it reaches its target", () => {
  const [one] = applyPlanItemChange([view()], { type: "log", itemId: "i1" });
  assert.equal(one.count, 4);
  assert.equal(one.done, true);
  const [short] = applyPlanItemChange([view({ count: 1 })], { type: "log", itemId: "i1" });
  assert.equal(short.count, 2);
  assert.equal(short.done, false);
});

test("log: sets doneToday, and a second tap on the same day changes nothing (one check a day)", () => {
  const [first] = applyPlanItemChange([view()], { type: "log", itemId: "i1" });
  assert.equal(first.doneToday, true);
  const [again] = applyPlanItemChange([first], { type: "log", itemId: "i1" });
  assert.deepEqual(again, first);
});

test("undo: clears doneToday", () => {
  const [undone] = applyPlanItemChange([view({ count: 4, done: true, doneToday: true })], { type: "undo", itemId: "i1" });
  assert.equal(undone.doneToday, false);
});

test("undo: a habit at its target is no longer done, but one over its target stays done", () => {
  const [atTarget] = applyPlanItemChange([view({ count: 4, done: true })], { type: "undo", itemId: "i1" });
  assert.equal(atTarget.count, 3);
  assert.equal(atTarget.done, false);
  const [over] = applyPlanItemChange([view({ count: 5, done: true })], { type: "undo", itemId: "i1" });
  assert.equal(over.count, 4);
  assert.equal(over.done, true);
});

test("undo: the count never goes below zero, and a reminder is never done", () => {
  const [zero] = applyPlanItemChange([view({ count: 0 })], { type: "undo", itemId: "i1" });
  assert.equal(zero.count, 0);
  assert.equal(zero.done, false);
  const reminder = view({ kind: "reminder", timesPerPeriod: null, period: null, habitId: null, count: 0, target: 0, windowLabel: null });
  const [still] = applyPlanItemChange([reminder], { type: "undo", itemId: "i1" });
  assert.equal(still.done, false);
});

test("stepDone and stepUndone: a step flips between done now and not done", () => {
  const step = view({ kind: "step", timesPerPeriod: null, period: null, habitId: null, count: 0, target: 1, windowLabel: null });
  const at = new Date("2026-11-04T18:00:00Z");
  const [done] = applyPlanItemChange([step], { type: "stepDone", itemId: "i1", at });
  assert.equal(done.done, true);
  assert.equal(done.count, 1);
  assert.equal(done.doneAt, at);
  const [undone] = applyPlanItemChange([done], { type: "stepUndone", itemId: "i1" });
  assert.equal(undone.done, false);
  assert.equal(undone.count, 0);
  assert.equal(undone.doneAt, null);
});

test("only the named item changes; the others are the same objects", () => {
  const other = view({ id: "i2" });
  const items = [view(), other];
  const next = applyPlanItemChange(items, { type: "log", itemId: "i1" });
  assert.equal(next[1], other);
  assert.equal(items[0].count, 3);
  const unknown = applyPlanItemChange(items, { type: "log", itemId: "nope" });
  assert.equal(unknown[0], items[0]);
});
