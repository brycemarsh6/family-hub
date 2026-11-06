// Pins Habits & Chores' vocabulary (habitVocabulary.ts): the string sets,
// narrowers that repair odd stored values, the icon allow-list, and the
// weekday mask. The rules that use them are in src/lib/habits/*.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as lucide from "lucide-react";
import { GOAL_TITLE_MAX } from "./goals";
import { FULL_DAY_NAMES, SHORT_DAY_NAMES } from "./mealPlanDates";
import {
  HABIT_ICONS,
  HABIT_KINDS,
  HABIT_LOG_STATUSES,
  HABIT_MODES,
  HABIT_SCHEDULES,
  HABIT_SCHEDULE_LABELS,
  HABIT_SCHEDULE_SHORT_LABELS,
  HABIT_SHARING,
  HABIT_TITLE_MAX,
  HABIT_WHO_CHOICES,
  HABIT_WHO_LABELS,
  ANYTIME_LABEL,
  SKIPPED_TODAY_LABEL,
  STREAK_MIN_SHOWN,
  STREAK_UNITS,
  streakLabel,
  TIMES_OF_DAY,
  TIME_OF_DAY_LABELS,
  canBePrivate,
  canCarryOver,
  habitWhoLabel,
  isCheckStatus,
  parseWeekdayMask,
  printWeekdayMask,
  toHabitIcon,
  toHabitKind,
  toHabitLogStatus,
  toHabitMode,
  toHabitSchedule,
  toHabitSharing,
  toTimeOfDay,
} from "./habitVocabulary";

test("vocabulary: the string sets, in order", () => {
  assert.deepEqual([...HABIT_KINDS], ["habit", "chore"]);
  assert.deepEqual([...HABIT_MODES], ["build", "quit"]);
  assert.deepEqual([...HABIT_SCHEDULES], ["daily", "weekdays", "weekly", "biweekly", "monthly"]);
  assert.deepEqual([...HABIT_SHARING], ["together", "each"]);
  assert.deepEqual([...HABIT_LOG_STATUSES], ["done", "late", "skipped"]);
  assert.deepEqual([...TIMES_OF_DAY], ["morning", "afternoon", "evening"]);
  for (const schedule of HABIT_SCHEDULES) assert.ok(HABIT_SCHEDULE_LABELS[schedule]);
});

test("narrowers keep good values and repair odd ones", () => {
  assert.equal(toHabitKind("chore"), "chore");
  assert.equal(toHabitKind("Chore"), "habit");
  assert.equal(toHabitKind(null), "habit");
  assert.equal(toHabitMode("quit"), "quit");
  assert.equal(toHabitMode(5), "build");
  assert.equal(toHabitSchedule("biweekly"), "biweekly");
  assert.equal(toHabitSchedule("hourly"), "daily");
  assert.equal(toHabitSharing("together"), "together");
  assert.equal(toHabitSharing(undefined), "each");
  assert.equal(toHabitLogStatus("late"), "late");
  assert.equal(toHabitLogStatus("missed"), "done");
  assert.equal(toTimeOfDay("evening"), "evening");
  assert.equal(toTimeOfDay("noon"), null);
  assert.equal(toTimeOfDay(null), null);
});

test("icons: every allow-listed name is a real Lucide icon, no repeats", () => {
  assert.equal(new Set(HABIT_ICONS).size, HABIT_ICONS.length);
  for (const name of HABIT_ICONS) assert.ok(name in lucide, `${name} is not a Lucide icon`);
  assert.equal(HABIT_ICONS.length, 40);
  for (const name of ["Salad", "ShoppingCart", "GraduationCap"]) assert.equal(toHabitIcon(name), name);
  assert.equal(toHabitIcon("Dumbbell"), "Dumbbell");
  assert.equal(toHabitIcon("NotAnIcon"), null);
  assert.equal(toHabitIcon(null), null);
});

test("weekday mask: Sunday first, round-trips, invalid is null", () => {
  assert.deepEqual(parseWeekdayMask("0100100"), [1, 4]);
  assert.deepEqual(parseWeekdayMask("1000001"), [0, 6]);
  assert.deepEqual(parseWeekdayMask("0000000"), []);
  assert.equal(printWeekdayMask([1, 4]), "0100100");
  assert.equal(printWeekdayMask([4, 1, 1]), "0100100");
  assert.equal(printWeekdayMask([]), "0000000");
  for (const mask of ["0100100", "1111111", "0000001"]) {
    assert.equal(printWeekdayMask(parseWeekdayMask(mask)!), mask);
  }
  for (const bad of ["", "010010", "01001000", "01001a0", "0100 00", null, undefined, 1001001]) {
    assert.equal(parseWeekdayMask(bad), null, `${String(bad)} should be invalid`);
  }
});

test("schedule words: the editor's five, and the shorter five for Manage", () => {
  assert.deepEqual(HABIT_SCHEDULE_LABELS, {
    daily: "Every day",
    weekdays: "Certain days of the week",
    weekly: "A number of times a week",
    biweekly: "Every other week",
    monthly: "A number of times a month",
  });
  assert.deepEqual(HABIT_SCHEDULE_SHORT_LABELS, {
    daily: "Every day",
    weekdays: "Certain days",
    weekly: "Weekly",
    biweekly: "Every other week",
    monthly: "Monthly",
  });
});

test("time of day words: one name per time, and the name for none", () => {
  assert.deepEqual(TIME_OF_DAY_LABELS, { morning: "Morning", afternoon: "Afternoon", evening: "Evening" });
  assert.deepEqual(Object.keys(TIME_OF_DAY_LABELS), [...TIMES_OF_DAY]);
  assert.equal(ANYTIME_LABEL, "Anytime");
});

test("habitWhoLabel: Mine for one person, Everyone for the button, else Together or Side by side", () => {
  assert.equal(habitWhoLabel({ people: 1, everyone: false, sharing: "each" }), "Mine");
  assert.equal(habitWhoLabel({ people: 0, everyone: true, sharing: "together" }), "Mine");
  assert.equal(habitWhoLabel({ people: 3, everyone: true, sharing: "each" }), "Everyone");
  assert.equal(habitWhoLabel({ people: 2, everyone: false, sharing: "together" }), "Together");
  assert.equal(habitWhoLabel({ people: 2, everyone: false, sharing: "each" }), "Side by side");
  assert.equal(habitWhoLabel({ people: 2, everyone: false, sharing: "odd" }), "Side by side");
  assert.equal(HABIT_WHO_LABELS.mine, "Mine");
});

test("the editor's Who strip: three choices with the approved words and hints", () => {
  assert.deepEqual(
    HABIT_WHO_CHOICES.map((choice) => [choice.key, choice.label, choice.hint]),
    [
      ["me", "Just me", "One person: you"],
      ["together", "Together", "Together: one check counts for everyone"],
      ["each", "Side by side", "Side by side: everyone checks their own"],
    ],
  );
});

test("HABIT_TITLE_MAX is 120, the same as a goal's title", () => {
  assert.equal(HABIT_TITLE_MAX, 120);
  assert.equal(HABIT_TITLE_MAX, GOAL_TITLE_MAX);
});

test("isCheckStatus: done and late count, a skip or anything else does not", () => {
  assert.equal(isCheckStatus("done"), true);
  assert.equal(isCheckStatus("late"), true);
  assert.equal(isCheckStatus("skipped"), false);
  assert.equal(isCheckStatus(""), false);
});

test("canCarryOver: only for a habit with set days", () => {
  assert.equal(canCarryOver("daily", []), true);
  assert.equal(canCarryOver("weekdays", [1, 4]), true);
  assert.equal(canCarryOver("biweekly", [3]), true);
  assert.equal(canCarryOver("biweekly", []), false);
  assert.equal(canCarryOver("weekly", [1]), false);
  assert.equal(canCarryOver("monthly", []), false);
});

test("canBePrivate: only a habit for exactly one person", () => {
  assert.equal(canBePrivate(1), true);
  assert.equal(canBePrivate(0), false);
  assert.equal(canBePrivate(2), false);
});

test("weekday names: the one list the editor's day buttons are drawn from, Sunday first", () => {
  assert.equal(FULL_DAY_NAMES.length, 7);
  assert.equal(FULL_DAY_NAMES[0], "Sunday");
  assert.equal(FULL_DAY_NAMES.map((name) => name[0]).join(""), "SMTWTFS");
  FULL_DAY_NAMES.forEach((name, i) => assert.ok(name.startsWith(SHORT_DAY_NAMES[i])));
});

test("streakLabel: the count with its unit, and nothing below 2 (decision 98)", () => {
  assert.equal(STREAK_MIN_SHOWN, 2);
  assert.deepEqual([...STREAK_UNITS], ["days", "weeks", "months"]);
  assert.equal(streakLabel(12, "days"), "12 days");
  assert.equal(streakLabel(3, "weeks"), "3 weeks");
  assert.equal(streakLabel(2, "months"), "2 months");
  assert.equal(streakLabel(1, "days"), null);
  assert.equal(streakLabel(0, "weeks"), null);
});

test("SKIPPED_TODAY_LABEL is the words decision 101 names", () => {
  assert.equal(SKIPPED_TODAY_LABEL, "Skipped today");
});
