// Pins stars.ts: what each status pays, the stepper and the bank sum.

import { test } from "node:test";
import assert from "node:assert/strict";
import { nextStarStep, starsForLog, sumStars } from "./stars";

test("a done check pays the habit's value whatever the late setting", () => {
  for (const late of ["full", "half", "none"] as const) assert.equal(starsForLog(5, "done", late), 5);
});

test("a late check pays full, half rounded up, or nothing", () => {
  assert.equal(starsForLog(5, "late", "full"), 5);
  assert.equal(starsForLog(5, "late", "half"), 3);
  assert.equal(starsForLog(4, "late", "half"), 2);
  assert.equal(starsForLog(1, "late", "half"), 1);
  assert.equal(starsForLog(5, "late", "none"), null);
});

test("a skip pays nothing", () => {
  for (const late of ["full", "half", "none"] as const) assert.equal(starsForLog(5, "skipped", late), null);
});

test("a habit with no stars, or an off-list value, pays nothing", () => {
  assert.equal(starsForLog(null, "done", "full"), null);
  assert.equal(starsForLog(undefined, "late", "full"), null);
  assert.equal(starsForLog(0, "done", "full"), null);
  assert.equal(starsForLog(7, "done", "full"), null);
});

test("an unknown status pays nothing", () => {
  assert.equal(starsForLog(5, "weird", "full"), null);
});

test("the stepper walks None, 1 to 5, then 10 to 50, and stops at both ends", () => {
  assert.equal(nextStarStep(null, "up"), 1);
  assert.equal(nextStarStep(1, "up"), 2);
  assert.equal(nextStarStep(5, "up"), 10);
  assert.equal(nextStarStep(25, "up"), 50);
  assert.equal(nextStarStep(50, "up"), 50);
  assert.equal(nextStarStep(1, "down"), null);
  assert.equal(nextStarStep(10, "down"), 5);
  assert.equal(nextStarStep(null, "down"), null);
});

test("the stepper treats an off-list value as None", () => {
  assert.equal(nextStarStep(7, "up"), 1);
  assert.equal(nextStarStep(7, "down"), null);
});

test("sumStars adds the numbers and ignores nulls", () => {
  assert.equal(sumStars([]), 0);
  assert.equal(sumStars([5, null, 10, undefined, 1]), 16);
});
