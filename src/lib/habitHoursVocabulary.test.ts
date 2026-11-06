// Pins habitHoursVocabulary.ts: the track and pace lists, the repairers and
// the limits the hours habit rules and editor share.

import { test } from "node:test";
import assert from "node:assert/strict";
import { HABIT_TRACKS, HOURS_LIMITS, PACE_DAYS, toHabitTrack, toPaceDays } from "./habitHoursVocabulary";

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
