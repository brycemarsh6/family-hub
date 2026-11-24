// Pins rewardVocabulary.ts: the star steps, the late-check choices and their
// repairers.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LATE_STARS,
  LATE_STARS_HELP,
  LATE_STARS_LABELS,
  LATE_STARS_OFF_LIST,
  LATE_STARS_REFUSAL,
  LATE_STARS_TITLE,
  REWARDS_SETTINGS_TITLE,
  STARS_FIELD_HINT,
  STARS_FIELD_LABEL,
  STAR_REFUSAL,
  STAR_STEPS,
  starCountText,
  starStepText,
  toLateStars,
  toStarValue,
} from "./rewardVocabulary";

test("the star steps and late choices are pinned", () => {
  assert.deepEqual([...STAR_STEPS], [1, 2, 3, 4, 5, 10, 15, 20, 25, 50]);
  assert.deepEqual([...LATE_STARS], ["full", "half", "none"]);
  assert.deepEqual(LATE_STARS_LABELS, { full: "Full stars", half: "Half stars", none: "No stars" });
  assert.equal(STAR_REFUSAL, "Pick a star value from the list.");
});

test("toStarValue keeps every listed step", () => {
  for (const step of STAR_STEPS) assert.equal(toStarValue(step), step);
});

test("toStarValue turns anything off the list, including 0, into null", () => {
  for (const raw of [0, -1, 6, 7, 51, 2.5, NaN, "5", null, undefined, {}]) assert.equal(toStarValue(raw), null);
});

test("toLateStars keeps the known choices and repairs the rest to full", () => {
  assert.equal(toLateStars("half"), "half");
  assert.equal(toLateStars("none"), "none");
  assert.equal(toLateStars("full"), "full");
  for (const raw of ["", "HALF", null, undefined, 3]) assert.equal(toLateStars(raw), "full");
});

test("starCountText is singular for 1 and -1, plural otherwise", () => {
  assert.equal(starCountText(1), "1 star");
  assert.equal(starCountText(-1), "-1 star");
  assert.equal(starCountText(10), "10 stars");
  assert.equal(starCountText(0), "0 stars");
  assert.equal(starCountText(-3), "-3 stars");
});

test("starStepText says None for no stars, else the count", () => {
  assert.equal(starStepText(null), "None");
  assert.equal(starStepText(1), "1 star");
  assert.equal(starStepText(50), "50 stars");
});

test("the form and settings words are Bryce's, word for word", () => {
  assert.equal(STARS_FIELD_LABEL, "Stars");
  assert.equal(STARS_FIELD_HINT, "Paid into the star bank each time it's checked off");
  assert.equal(REWARDS_SETTINGS_TITLE, "Rewards");
  assert.equal(LATE_STARS_TITLE, "Late checks");
  assert.equal(LATE_STARS_HELP, "A late check is a carried-over item checked off the next day. Half rounds up.");
  assert.equal(LATE_STARS_REFUSAL, "Only parents and admins can change this.");
  assert.equal(LATE_STARS_OFF_LIST, "That choice isn't on the list.");
});
