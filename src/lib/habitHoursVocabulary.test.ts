// Pins habitHoursVocabulary.ts: the track and pace lists, the repairers and
// the limits the hours habit rules and editor share.

import { test } from "node:test";
import assert from "node:assert/strict";
import { HABIT_TRACKS, HOURS_LIMITS, LOG_SHEET_WORDS, PACE_DAYS, PACE_LABELS, TRACK_LABELS, checkEntryMinutes, checkHoursTarget, hoursInitialOf, toHabitTrack, toPaceDays, unitFor } from "./habitHoursVocabulary";

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
    { entryStep: 30, entryGrain: 15, entryMin: 30, entryMax: 720, entryDefault: 60, targetMinHours: 1, targetMaxHours: 80, targetDefaultHours: 5, paceStep: 15, chips: [30, 60, 120] },
  );
});

test("unitFor: hour up to and including one hour, else hours", () => {
  assert.equal(unitFor(30), "hour");
  assert.equal(unitFor(60), "hour");
  assert.equal(unitFor(90), "hours");
  assert.equal(unitFor(0), "hours");
});

test("checkHoursTarget: whole hours from 1 to 80 and a known pace, answered in minutes", () => {
  assert.deepEqual(checkHoursTarget(6, "every"), { weeklyMinutes: 360, paceDays: "every" });
  assert.deepEqual(checkHoursTarget(80, "monsat"), { weeklyMinutes: 4800, paceDays: "monsat" });
  assert.deepEqual(checkHoursTarget(0, "monsat"), { error: "Pick 1 to 80 hours a week." });
  assert.deepEqual(checkHoursTarget(81, "monsat"), { error: "Pick 1 to 80 hours a week." });
  assert.deepEqual(checkHoursTarget(2.5, "monsat"), { error: "Pick 1 to 80 hours a week." });
  assert.deepEqual(checkHoursTarget("6", "monsat"), { error: "Pick 1 to 80 hours a week." });
  assert.deepEqual(checkHoursTarget(6, "daily"), { error: "Pick which days to count." });
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

test("checkEntryMinutes: half an hour to 12 hours in quarter hours", () => {
  for (const ok of [30, 45, 60, 75, 720]) assert.equal(checkEntryMinutes(ok), true, String(ok));
  for (const bad of [15, 0, 40, 735, 750, 60.5, "60", null, NaN]) assert.equal(checkEntryMinutes(bad), false, String(bad));
});
