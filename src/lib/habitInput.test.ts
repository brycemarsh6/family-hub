// Pins checkHabitInput: every refusal in its old words once, one happy path
// per schedule, and the hours shape. Moved out of the editor's action in
// mission 47, C1, so the Assistant API refuses the same things.

import { test } from "node:test";
import assert from "node:assert/strict";
import { checkHabitInput, type HabitInput } from "./habitInput";

const HOUSEHOLD = ["a", "b", "c"];

const base: HabitInput = {
  title: "Walk",
  kind: "habit",
  mode: "build",
  icon: null,
  lifeArea: null,
  timeOfDay: null,
  schedule: "daily",
  weekdays: null,
  times: null,
  anchorWeek: null,
  carryOver: false,
  sharing: "each",
  isPrivate: false,
  participantIds: ["a"],
  everyone: false,
  track: "checks",
  weeklyHours: null,
  paceDays: null,
};

const run = (over: Partial<HabitInput>, household: readonly string[] = HOUSEHOLD, already: readonly string[] = []) =>
  checkHabitInput({ ...base, ...over }, household, already);
const refusal = (over: Partial<HabitInput>) => {
  const result = run(over);
  return "error" in result ? result.error : "no error";
};

test("refusals: each message once", () => {
  assert.deepEqual(checkHabitInput(null as unknown as HabitInput, HOUSEHOLD), { error: "Couldn't save it. Try again." });
  assert.equal(refusal({ title: "   " }), "Give it a name.");
  assert.equal(refusal({ title: "x".repeat(121) }), "Keep the name to 120 letters or fewer.");
  assert.equal(refusal({ kind: "task" }), "Pick habit or chore.");
  assert.equal(refusal({ mode: "avoid" }), "Pick build or quit.");
  assert.equal(refusal({ sharing: "pair" }), "Pick who it is for.");
  assert.equal(refusal({ track: "minutes" }), "Pick checks or hours.");
  assert.equal(refusal({ schedule: "hourly" }), "Pick a schedule.");
  assert.equal(refusal({ icon: "Nope" }), "Pick an icon from the list.");
  assert.equal(refusal({ lifeArea: "nope" }), "Pick a life area from the list.");
  assert.equal(refusal({ timeOfDay: "noon" }), "Pick a time of day from the list.");
  assert.equal(refusal({ weekdays: "101" }), "Pick the days again.");
  assert.equal(refusal({ schedule: "weekdays", weekdays: "0000000" }), "Pick at least one day.");
  assert.equal(refusal({ schedule: "weekly", times: 8 }), "Pick 1 to 7 times.");
  assert.equal(refusal({ schedule: "monthly", times: 0 }), "Pick 1 to 31 times.");
  assert.equal(refusal({ schedule: "biweekly", anchorWeek: "2026-11-02" }), "Pick which week it starts.");
  assert.equal(refusal({ participantIds: "a" as unknown as string[] }), "Pick who it is for.");
  assert.equal(refusal({ participantIds: ["zz"] }), "Pick who it is for.");
  assert.equal(refusal({ participantIds: [] }), "Pick who it is for.");
  assert.equal(refusal({ sharing: "together", participantIds: ["a"] }), "Pick at least two people, or choose Just me.");
  assert.equal(refusal({ isPrivate: true, participantIds: ["a", "b"] }), "Only a habit for one person can be private.");
});

test("hours refusals: chores, together, carry-over and the target", () => {
  const hours = { track: "hours", weeklyHours: 5, paceDays: "monsat" };
  assert.equal(refusal({ ...hours, kind: "chore" }), "Hours are for habits, not chores.");
  assert.equal(refusal({ ...hours, sharing: "together", participantIds: ["a", "b"] }), "Hours habits are for one person each, not Together.");
  assert.equal(refusal({ ...hours, carryOver: true }), "Hours habits don't carry over.");
  assert.equal(refusal({ ...hours, weeklyHours: 0 }), "Pick 1 to 80 hours a week.");
  assert.equal(refusal({ ...hours, paceDays: "never" }), "Pick which days to count.");
});

test("happy paths: one per schedule", () => {
  const daily = run({ carryOver: true });
  assert.ok(!("error" in daily));
  assert.equal(daily.fields.schedule, "daily");
  assert.equal(daily.fields.carryOver, true);
  assert.equal(daily.fields.weekdays, null);

  const weekdays = run({ schedule: "weekdays", weekdays: "0111110" });
  assert.ok(!("error" in weekdays));
  assert.equal(weekdays.fields.weekdays, "0111110");

  const weekly = run({ schedule: "weekly", times: 3, carryOver: true });
  assert.ok(!("error" in weekly));
  assert.equal(weekly.fields.times, 3);
  assert.equal(weekly.fields.carryOver, false);

  const monthly = run({ schedule: "monthly", times: 31 });
  assert.ok(!("error" in monthly));
  assert.equal(monthly.fields.times, 31);

  const biweekly = run({ schedule: "biweekly", anchorWeek: "2026-11-01", weekdays: "0100000" });
  assert.ok(!("error" in biweekly));
  assert.deepEqual(biweekly.fields.anchorWeek, { year: 2026, month: 11, day: 1 });
  assert.equal(biweekly.fields.weekdays, "0100000");
});

test("hours shape: one weekly habit with minutes and pace, schedule fields ignored", () => {
  const result = run({ track: "hours", weeklyHours: 5, paceDays: "every", schedule: "monthly", times: 99, weekdays: "bad" });
  assert.ok(!("error" in result));
  assert.equal(result.fields.schedule, "weekly");
  assert.equal(result.fields.times, 1);
  assert.equal(result.fields.weekdays, null);
  assert.equal(result.fields.weeklyMinutes, 300);
  assert.equal(result.fields.paceDays, "every");
  assert.equal(result.fields.carryOver, false);
});

test("people: dedupes, Everyone takes the household, an existing member stays allowed", () => {
  const dup = run({ participantIds: ["a", "a", "b"] });
  assert.ok(!("error" in dup));
  assert.deepEqual(dup.participantIds, ["a", "b"]);

  const everyone = run({ everyone: true, participantIds: ["a"] });
  assert.ok(!("error" in everyone));
  assert.deepEqual(everyone.participantIds, HOUSEHOLD);
  assert.equal(everyone.everyone, true);

  assert.ok("error" in run({ participantIds: ["gone"] }));
  assert.ok(!("error" in run({ participantIds: ["gone"] }, HOUSEHOLD, ["gone"])));
});
