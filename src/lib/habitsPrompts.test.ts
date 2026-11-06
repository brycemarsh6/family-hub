// Pins habitsPrompts.ts (decisions 39, 142, 143): which open habits ask for a
// day today, and the chips each offers. "Today" is Friday 2026-11-06 unless
// said otherwise; the days are plain calendar days, so the results are the same
// in every time zone.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "./householdDate";
import type { HabitActor, HabitLogDay } from "./habits/types";
import { buildTodayPrompts, type PromptHabitInput } from "./habitsPrompts";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const thursday = d(2026, 11, 5);
const friday = d(2026, 11, 6);
const me: HabitActor = { userId: "me", role: "kid" };
const old = new Date("2026-01-01T12:00:00Z");

function habit(overrides: Partial<PromptHabitInput> & { id: string }): PromptHabitInput {
  return { title: overrides.id, icon: null, kind: "habit", createdAt: old, schedule: "daily", weekdays: null, times: null, anchorWeek: null, ...overrides };
}

const weeklyTwice = (id: string) => habit({ id, schedule: "weekly", times: 2 });
const noLogs = new Map<string, HabitLogDay[]>();
const logsFor = (id: string, logs: HabitLogDay[]) => new Map([[id, logs]]);
const noPlans = new Map<string, CalendarDate[]>();
const plannedOn = (id: string, ...days: CalendarDate[]) => new Map([[id, days]]);

test("prompts: a weekly habit with no plan prompts on Friday with Today and Sat, no Other day", () => {
  const prompts = buildTodayPrompts(me, [weeklyTwice("w")], noLogs, noPlans, friday);
  assert.equal(prompts.length, 1);
  assert.equal(prompts[0].habitId, "w");
  assert.deepEqual(prompts[0].chips, [{ day: "2026-11-06", label: "Today" }, { day: "2026-11-07", label: "Sat" }]);
  assert.equal(prompts[0].showOther, false);
});

test("prompts: none on a Thursday, none once planned this week, none for scheduled habits, none once the target is met", () => {
  assert.deepEqual(buildTodayPrompts(me, [weeklyTwice("w")], noLogs, noPlans, thursday), []);
  assert.deepEqual(buildTodayPrompts(me, [weeklyTwice("w")], noLogs, plannedOn("w", d(2026, 11, 7)), friday), []);
  assert.deepEqual(buildTodayPrompts(me, [habit({ id: "daily" })], noLogs, noPlans, friday), []);
  const twice = logsFor("w", [{ userId: "me", day: d(2026, 11, 2), status: "done" }, { userId: "me", day: d(2026, 11, 4), status: "done" }]);
  assert.deepEqual(buildTodayPrompts(me, [weeklyTwice("w")], twice, noPlans, friday), []);
});

test("prompts: a monthly habit on a Sunday offers three chips and Other day limited to the rest of the month", () => {
  const monthly = habit({ id: "m", schedule: "monthly", times: 1 });
  const [prompt] = buildTodayPrompts(me, [monthly], noLogs, noPlans, d(2026, 11, 8));
  assert.deepEqual(prompt.chips.map((chip) => chip.label), ["Today", "Mon", "Tue"]);
  assert.equal(prompt.showOther, true);
  assert.equal(prompt.otherFrom, "2026-11-11");
  assert.equal(prompt.otherTo, "2026-11-30");
});

test("prompts: none while the viewer is on vacation, back the day after it ends", () => {
  const habits = [weeklyTwice("w")];
  assert.deepEqual(buildTodayPrompts(me, habits, noLogs, noPlans, friday, [{ start: d(2026, 11, 3), end: d(2026, 11, 6) }]), []);
  assert.equal(buildTodayPrompts(me, habits, noLogs, noPlans, friday, [{ start: d(2026, 11, 1), end: d(2026, 11, 5) }]).length, 1);
});
