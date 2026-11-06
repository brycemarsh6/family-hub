// Pins goals.ts's habit glue: how a plan item becomes a Habit's fields
// (`habitInputFromPlan`) and whose row a tap writes (`habitCheckTarget`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { habitCheckTarget, habitInputFromPlan, habitParticipantsFor, hoursSubject, planHabitFor, validatePlanItemInput } from "./goals";

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

test("habitInputFromPlan: an hours item carries the whole hours shape, each person's own even under a Together goal", () => {
  const input = { title: "Calling", kind: "habit" as const, timesPerPeriod: 1, period: "week" as const, track: "hours" as const, weeklyMinutes: 600, paceDays: "every" as const };
  const mine = habitInputFromPlan(input, { ownerId: "me", visibility: "shared", area: "work" });
  assert.deepEqual(
    [mine.track, mine.weeklyMinutes, mine.paceDays, mine.schedule, mine.times, mine.sharing],
    ["hours", 600, "every", "weekly", 1, "each"],
  );
  assert.equal(habitInputFromPlan(input, { ownerId: null, visibility: "shared", area: "work" }).sharing, "each");
});

test("habitInputFromPlan: an item with no Track says nothing about it; checks says checks", () => {
  const goal = { ownerId: "me", visibility: "shared", area: "health" };
  const base = { title: "Run", kind: "habit" as const, timesPerPeriod: 3, period: "week" as const };
  assert.equal("track" in habitInputFromPlan(base, goal), false);
  assert.equal(habitInputFromPlan({ ...base, track: "checks" }, goal).track, "checks");
});

test("validatePlanItemInput: hours reads whole hours, forces one time a week, and refuses bad numbers", () => {
  const hours = { title: "Calling", kind: "habit", track: "hours", weeklyHours: 10, paceDays: "monsat", timesPerPeriod: 5, period: "day" };
  assert.deepEqual(validatePlanItemInput(hours), {
    ok: { title: "Calling", kind: "habit", timesPerPeriod: 1, period: "week", track: "hours", weeklyMinutes: 600, paceDays: "monsat" },
  });
  for (const weeklyHours of [0, 81, 2.5, "5", null]) assert.ok("error" in validatePlanItemInput({ ...hours, weeklyHours }));
  assert.ok("error" in validatePlanItemInput({ ...hours, paceDays: "never" }));
  assert.ok("error" in validatePlanItemInput({ ...hours, track: "minutes" }));
});

test("validatePlanItemInput: no track stays out of the result; only a habit may name a Track", () => {
  const habit = validatePlanItemInput({ title: "Run", kind: "habit", timesPerPeriod: 3, period: "week" });
  assert.equal("ok" in habit && "track" in habit.ok, false);
  const checks = validatePlanItemInput({ title: "Run", kind: "habit", timesPerPeriod: 3, period: "week", track: "checks" });
  assert.equal("ok" in checks && checks.ok.track, "checks");
  assert.ok("error" in validatePlanItemInput({ title: "Call", kind: "step", track: "hours", weeklyHours: 5, paceDays: "monsat" }));
});

test("hoursSubject: a Mine goal names its owner, a Together goal the tapper or else the first person on the habit", () => {
  const mine = { ownerId: "me" };
  const together = { ownerId: null };
  assert.equal(hoursSubject(mine, "me", ["me"]), "me");
  assert.equal(hoursSubject(together, "b", ["a", "b"]), "b");
  assert.equal(hoursSubject(together, "tablet", ["a", "b"]), "a", "the tablet logs for the first person, as a check does");
});

test("hoursSubject: nobody when the one named is not on the habit (someone added later, nobody on it)", () => {
  assert.equal(hoursSubject({ ownerId: "me" }, "me", ["you"]), null);
  assert.equal(hoursSubject({ ownerId: null }, "tablet", []), null, "a device on a Together item with no one to name gets no logging target");
});

test("planHabitFor: an hours habit gets its subject; a checks habit is returned as it was", () => {
  const checks = { spec: null, schedule: { schedule: "weekly", times: 1 }, logs: [], participantIds: ["a"] };
  assert.equal(planHabitFor(checks, { ownerId: null }, "a"), checks);
  const hours = { ...checks, hours: { targetMinutes: 600, paceDays: "monsat" as const, entries: [], forUserId: null } };
  assert.equal(planHabitFor(hours, { ownerId: null }, "a").hours?.forUserId, "a");
});
