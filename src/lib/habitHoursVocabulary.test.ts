// Pins habitHoursVocabulary.ts: the track and pace lists, the repairers and
// the limits the hours habit rules and editor share.

import { test } from "node:test";
import assert from "node:assert/strict";
import { HABIT_TRACKS, HOURS_LIMITS, LOG_SHEET_WORDS, PACE_DAYS, PACE_LABELS, TRACK_LABELS, hoursInitialOf, toHabitTrack, toPaceDays } from "./habitHoursVocabulary";

test("the track and pace lists are pinned", () => {
  assert.deepEqual([...HABIT_TRACKS], ["checks", "hours"]);
  assert.deepEqual([...PACE_DAYS], ["monsat", "every"]);
});

test("toHabitTrack repairs anything unknown to checks", () => {
  assert.equal(toHabitTrack("hours"), "hours");
  assert.equal(toHabitTrack("checks"), "checks");
  for (const odd of ["Hours", "", null, undefined, 3]) assert.equal(toHabitTrack(odd), "checks");
});

test("toPaceDays repairs anything unknown to monsat", () => {
  assert.equal(toPaceDays("every"), "every");
  assert.equal(toPaceDays("monsat"), "monsat");
  for (const odd of ["daily", "", null, undefined, 7]) assert.equal(toPaceDays(odd), "monsat");
});

test("the limits are pinned", () => {
  assert.deepEqual(
    { ...HOURS_LIMITS },
    { entryStep: 30, entryMin: 30, entryMax: 720, entryDefault: 60, targetMinHours: 1, targetMaxHours: 80, targetDefaultHours: 5 },
  );
});

test("every track and pace has its words", () => {
  for (const track of HABIT_TRACKS) assert.ok(TRACK_LABELS[track].label && TRACK_LABELS[track].hint);
  for (const days of PACE_DAYS) assert.ok(PACE_LABELS[days].label && PACE_LABELS[days].hint);
  assert.equal(TRACK_LABELS.hours.hint, "Log time toward a weekly goal");
  assert.equal(PACE_LABELS.monsat.hint, "Skip Sundays");
});

test("Edit opens an hours habit as Hours with its own goal and pace, anything else as Checks", () => {
  assert.deepEqual(hoursInitialOf({ weeklyMinutes: 360, paceDays: "every" }), { track: "hours", weeklyMinutes: 360, paceDays: "every" });
  assert.deepEqual(hoursInitialOf(null), { track: "checks", weeklyMinutes: null, paceDays: null });
});

test("the log sheet words", () => {
  assert.equal(LOG_SHEET_WORDS.title("Calling"), "Add time to Calling");
  assert.equal(LOG_SHEET_WORDS.button("1½ hours"), "Add 1½ hours");
  assert.equal(LOG_SHEET_WORDS.afterThis("3½ of 6 hours this week"), "After this: 3½ of 6 hours this week");
});
