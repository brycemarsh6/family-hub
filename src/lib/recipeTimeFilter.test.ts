// Real unit tests (node:test, zero new dependencies) for the time-bucket
// parser behind C4's Total Time filter — the plan calls these out
// specifically, since free-text prep/cook times are exactly the kind of
// input that quietly breaks a naive parser. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTimeToMinutes, totalTimeBucket } from "./recipeTimeFilter";

test("parseTimeToMinutes: plain minutes", () => {
  assert.equal(parseTimeToMinutes("45 min"), 45);
});

test("parseTimeToMinutes: hour plus minutes", () => {
  assert.equal(parseTimeToMinutes("1 hr 15 min"), 75);
});

test("parseTimeToMinutes: fractional hours with the ½ glyph", () => {
  assert.equal(parseTimeToMinutes("1½ hours"), 90);
});

test("parseTimeToMinutes: bare fraction glyph", () => {
  assert.equal(parseTimeToMinutes("½ hr"), 30);
});

test("parseTimeToMinutes: whole hours, no minutes", () => {
  assert.equal(parseTimeToMinutes("2 hrs"), 120);
});

test("parseTimeToMinutes: single-letter units", () => {
  assert.equal(parseTimeToMinutes("1h 30m"), 90);
});

test("parseTimeToMinutes: unrecognizable text returns null", () => {
  assert.equal(parseTimeToMinutes("a while"), null);
});

test("parseTimeToMinutes: empty string returns null", () => {
  assert.equal(parseTimeToMinutes(""), null);
});

test("totalTimeBucket: under 30 minutes total", () => {
  assert.equal(totalTimeBucket("10 min", "15 min"), "under30");
});

test("totalTimeBucket: exactly 30 lands in the 30-60 bucket", () => {
  assert.equal(totalTimeBucket("15 min", "15 min"), "30to60");
});

test("totalTimeBucket: 30 to 60 minutes total", () => {
  assert.equal(totalTimeBucket("15 min", "30 min"), "30to60");
});

test("totalTimeBucket: exactly 60 still lands in 30-60, not over", () => {
  assert.equal(totalTimeBucket("30 min", "30 min"), "30to60");
});

test("totalTimeBucket: over an hour total", () => {
  assert.equal(totalTimeBucket("30 min", "45 min"), "over60");
});

test("totalTimeBucket: one field unparseable still counts the other", () => {
  assert.equal(totalTimeBucket("a while", "45 min"), "30to60");
});

test("totalTimeBucket: both fields unparseable is no bucket at all", () => {
  assert.equal(totalTimeBucket("a while", null), null);
});

test("totalTimeBucket: both fields missing is no bucket at all", () => {
  assert.equal(totalTimeBucket(null, null), null);
});

test("totalTimeBucket: only prepTime set", () => {
  assert.equal(totalTimeBucket("1 hr 15 min", null), "over60");
});
