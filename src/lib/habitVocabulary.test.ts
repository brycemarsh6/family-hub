// Pins Habits & Chores' vocabulary (habitVocabulary.ts): the string sets,
// narrowers that repair odd stored values, the icon allow-list, and the
// weekday mask. The rules that use them are in src/lib/habits/*.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as lucide from "lucide-react";
import {
  HABIT_ICONS,
  HABIT_KINDS,
  HABIT_LOG_STATUSES,
  HABIT_MODES,
  HABIT_SCHEDULES,
  HABIT_SCHEDULE_LABELS,
  HABIT_SHARING,
  TIMES_OF_DAY,
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
