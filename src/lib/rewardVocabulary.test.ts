// Pins rewardVocabulary.ts: the star steps, the late-check choices and their
// repairers.

import { test } from "node:test";
import assert from "node:assert/strict";
import { LATE_STARS, LATE_STARS_LABELS, STAR_REFUSAL, STAR_STEPS, toLateStars, toStarValue } from "./rewardVocabulary";

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
