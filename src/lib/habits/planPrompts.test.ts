// Pins planPrompts.ts (decisions 38 and 47): who gets the plan-the-day
// prompt and on which days.

import { test } from "node:test";
import assert from "node:assert/strict";
import { dayOfWeek, type CalendarDate } from "../householdDate";
import { isPlannableDay, isPlannedToday, isPromptDay, promptChips } from "./planPrompts";
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

test("weekly: nothing when done, or when a planned day is still ahead in the week (Friday, Saturday)", () => {
  const friday = d(2026, 11, 6);
  assert.equal(isPromptDay(weekly, friday, [], true), false);
  for (const planned of [d(2026, 11, 6), d(2026, 11, 7)]) {
    assert.equal(isPromptDay(weekly, friday, [planned], false), false);
  }
});

test("a weekly item planned next week no longer silences this week's Friday prompt (decision 143)", () => {
  const friday = d(2026, 11, 6);
  for (const planned of [d(2026, 11, 8), d(2026, 11, 10), d(2026, 11, 20)]) {
    assert.equal(isPromptDay(weekly, friday, [planned], false), true, `${planned.month}/${planned.day}`);
  }
});

test("a monthly item planned next month does not silence this month's prompt, one later this month does", () => {
  assert.equal(isPromptDay(monthly, d(2026, 11, 29), [d(2026, 12, 2)], false), true);
  assert.equal(isPromptDay(monthly, d(2026, 11, 29), [d(2026, 11, 30)], false), false);
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
  assert.equal(isPromptDay(monthly, d(2026, 11, 29), [], false), true); // Sunday, day 29

});

test("biweekly with no days prompts on Friday of a due week only; scheduled kinds never prompt", () => {
  const noDays: ScheduleSpec = { schedule: "biweekly", days: [], anchorWeek: d(2026, 11, 1) };
  assert.equal(isPromptDay(noDays, d(2026, 11, 6), [], false), true);
  assert.equal(isPromptDay(noDays, d(2026, 11, 13), [], false), false);
  assert.equal(isPromptDay({ schedule: "daily" }, d(2026, 11, 6), [], false), false);
  assert.equal(isPromptDay({ schedule: "weekdays", days: [5] }, d(2026, 11, 6), [], false), false);
});

const labels = (chips: { day: CalendarDate; isToday: boolean }[]) => chips.map((c) => (c.isToday ? "Today" : `${c.day.month}/${c.day.day}`));

test("chips: weekly Friday offers Today and Saturday, no Other day", () => {
  const { chips, showOther, lastDay } = promptChips(weekly, d(2026, 11, 6));
  assert.deepEqual(labels(chips), ["Today", "11/7"]);
  assert.equal(showOther, false);
  assert.deepEqual(lastDay, d(2026, 11, 7));
});

test("chips: monthly Thursday day 19 offers three days and Other day up to Nov 30", () => {
  const { chips, showOther, lastDay } = promptChips(monthly, d(2026, 11, 19));
  assert.deepEqual(labels(chips), ["Today", "11/20", "11/21"]);
  assert.deepEqual(chips.map((c) => dayOfWeek(c.day)), [4, 5, 6]);
  assert.equal(showOther, true);
  assert.deepEqual(lastDay, d(2026, 11, 30));
});

test("chips: the last day of the month offers only Today; three days left shows no Other day", () => {
  const last = promptChips(monthly, d(2026, 11, 30));
  assert.deepEqual(labels(last.chips), ["Today"]);
  assert.equal(last.showOther, false);
  const three = promptChips(monthly, d(2026, 11, 28));
  assert.equal(three.chips.length, 3);
  assert.equal(three.showOther, false);
  assert.equal(promptChips(monthly, d(2026, 11, 27)).showOther, true);
});

test("chips stop at the month end across a year change", () => {
  const { chips, lastDay } = promptChips(monthly, d(2026, 12, 30));
  assert.deepEqual(labels(chips), ["Today", "12/31"]);
  assert.deepEqual(lastDay, d(2026, 12, 31));
});

test("isPlannableDay: today or later, inside the period, open kinds in a due week only", () => {
  const friday = d(2026, 11, 6);
  assert.equal(isPlannableDay(weekly, friday, d(2026, 11, 6)), true);
  assert.equal(isPlannableDay(weekly, friday, d(2026, 11, 7)), true);
  assert.equal(isPlannableDay(weekly, friday, d(2026, 11, 5)), false);
  assert.equal(isPlannableDay(weekly, friday, d(2026, 11, 8)), false);
  assert.equal(isPlannableDay(monthly, friday, d(2026, 11, 30)), true);
  assert.equal(isPlannableDay(monthly, friday, d(2026, 12, 1)), false);
  assert.equal(isPlannableDay({ schedule: "daily" }, friday, friday), false);
  assert.equal(isPlannableDay({ schedule: "weekdays", days: [5] }, friday, friday), false);
  const offWeek: ScheduleSpec = { schedule: "biweekly", days: [], anchorWeek: d(2026, 11, 1) };
  assert.equal(isPlannableDay(offWeek, d(2026, 11, 13), d(2026, 11, 14)), false);
  assert.equal(isPlannableDay(offWeek, friday, d(2026, 11, 7)), true);
});

test("isPlannedToday matches only today's date", () => {
  assert.equal(isPlannedToday([d(2026, 11, 7), d(2026, 11, 6)], d(2026, 11, 6)), true);
  assert.equal(isPlannedToday([d(2026, 11, 7)], d(2026, 11, 6)), false);
  assert.equal(isPlannedToday([], d(2026, 11, 6)), false);
});
