// Pins goals.ts's habit glue: how a plan item becomes a Habit's fields
// (`habitInputFromPlan`) and whose row a tap writes (`habitCheckTarget`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { habitCheckTarget, habitInputFromPlan, habitParticipantsFor } from "./goals";

test("habitParticipantsFor: a Mine goal's habit is for its owner, a Together goal's for the household", () => {
  assert.deepEqual(habitParticipantsFor({ ownerId: "me" }), ["me"]);
  assert.equal(habitParticipantsFor({ ownerId: null }), "household");
});

test("habitInputFromPlan: every day, N a week and N a month become a daily, weekly or monthly Habit", () => {
  const mine = { ownerId: "me", visibility: "shared", area: "health" };
  const input = (timesPerPeriod: number, period: "day" | "week" | "month") => ({ title: "Run", kind: "habit" as const, timesPerPeriod, period });
  const daily = habitInputFromPlan(input(1, "day"), mine);
  assert.deepEqual([daily.schedule, daily.times, daily.sharing, daily.isPrivate, daily.lifeArea], ["daily", null, "each", false, "health"]);
  const weekly = habitInputFromPlan(input(3, "week"), mine);
  assert.deepEqual([weekly.schedule, weekly.times], ["weekly", 3]);
  const monthly = habitInputFromPlan(input(2, "month"), mine);
  assert.deepEqual([monthly.schedule, monthly.times], ["monthly", 2]);
});

test("habitInputFromPlan: a Together goal's habit is shared, a private Mine goal's is private", () => {
  const input = { title: "Walk", kind: "habit" as const, timesPerPeriod: 1, period: "day" as const };
  assert.equal(habitInputFromPlan(input, { ownerId: null, visibility: "shared", area: "health" }).sharing, "together");
  assert.equal(habitInputFromPlan(input, { ownerId: "me", visibility: "private", area: "health" }).isPrivate, true);
});

test("habitCheckTarget: a Mine goal checks for its owner; Together for the tapper, else the first participant", () => {
  assert.equal(habitCheckTarget({ ownerId: "me" }, "me", ["me"]), "me");
  assert.equal(habitCheckTarget({ ownerId: null }, "spouse", ["me", "spouse"]), "spouse");
  assert.equal(habitCheckTarget({ ownerId: null }, "tablet", ["me", "spouse"]), "me");
  assert.equal(habitCheckTarget({ ownerId: null }, "tablet", []), "tablet");
});
