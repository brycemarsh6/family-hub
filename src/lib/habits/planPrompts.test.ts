// Pins planPrompts.ts (decisions 38 and 47): who gets the plan-the-day
// prompt and on which days.

import { test } from "node:test";
import assert from "node:assert/strict";
import { dayOfWeek, type CalendarDate } from "../householdDate";
import { isPromptDay } from "./planPrompts";
import type { ScheduleSpec } from "./types";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const weekly: ScheduleSpec = { schedule: "weekly", times: 2 };
const monthly: ScheduleSpec = { schedule: "monthly", times: 2 };

test("weekly: Friday only", () => {
  assert.equal(dayOfWeek(d(2026, 11, 6)), 5);
  assert.equal(isPromptDay(weekly, d(2026, 11, 6), [], false), true);
  for (const day of [1, 2, 3, 4, 5, 7]) {
    assert.equal(isPromptDay(weekly, d(2026, 11, day), [], false), false, `Nov ${day}`);
  }
});

test("weekly: nothing when done, or when a planned day is still ahead (Friday, Saturday, Sunday)", () => {
  const friday = d(2026, 11, 6);
  assert.equal(isPromptDay(weekly, friday, [], true), false);
  for (const planned of [d(2026, 11, 6), d(2026, 11, 7), d(2026, 11, 8)]) {
    assert.equal(isPromptDay(weekly, friday, [planned], false), false);
  }
});

test("a planned day that passed undone asks again at the next prompt", () => {
  assert.equal(isPromptDay(weekly, d(2026, 11, 6), [d(2026, 11, 3)], false), true);
});

test("monthly: first two weeks (days 1 to 14) Sundays only", () => {
  assert.equal(isPromptDay(monthly, d(2026, 11, 1), [], false), true); // Sunday, day 1
  assert.equal(isPromptDay(monthly, d(2026, 11, 8), [], false), true); // Sunday, day 8
  assert.equal(isPromptDay(monthly, d(2026, 11, 5), [], false), false); // Thursday, day 5
  assert.equal(isPromptDay(monthly, d(2026, 11, 12), [], false), false); // Thursday, day 12
});

test("monthly: day 15 to the end gets Sundays and Thursdays", () => {
  assert.equal(isPromptDay(monthly, d(2026, 11, 15), [], false), true); // Sunday, day 15
  assert.equal(isPromptDay(monthly, d(2026, 11, 19), [], false), true); // Thursday, day 19
  assert.equal(isPromptDay(monthly, d(2026, 11, 26), [], false), true); // Thursday, day 26
  assert.equal(isPromptDay(monthly, d(2026, 11, 20), [], false), false); // Friday
  assert.equal(isPromptDay(monthly, d(2026, 11, 19), [d(2026, 11, 21)], false), false);
});

test("biweekly with no days prompts on Friday of a due week only; scheduled kinds never prompt", () => {
  const noDays: ScheduleSpec = { schedule: "biweekly", days: [], anchorWeek: d(2026, 11, 1) };
  assert.equal(isPromptDay(noDays, d(2026, 11, 6), [], false), true);
  assert.equal(isPromptDay(noDays, d(2026, 11, 13), [], false), false);
  assert.equal(isPromptDay({ schedule: "daily" }, d(2026, 11, 6), [], false), false);
  assert.equal(isPromptDay({ schedule: "weekdays", days: [5] }, d(2026, 11, 6), [], false), false);
});
