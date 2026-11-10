import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CAPTION_MAX,
  PHOTO_LONG_EDGE,
  PHOTO_MAX_BYTES,
  PHOTO_TYPE,
  THUMB_LONG_EDGE,
  THUMB_MAX_BYTES,
  isTakenOn,
  normalizeCaption,
  photoPaths,
  toDimension,
} from "./slideshowPhotos";

test("the limits are the ones the contract names", () => {
  assert.equal(CAPTION_MAX, 80);
  assert.equal(PHOTO_MAX_BYTES, 3.5 * 1024 * 1024);
  assert.equal(THUMB_MAX_BYTES, 512 * 1024);
  assert.equal(PHOTO_LONG_EDGE, 2048);
  assert.equal(THUMB_LONG_EDGE, 400);
  assert.equal(PHOTO_TYPE, "image/jpeg");
});

test("normalizeCaption trims and collapses whitespace", () => {
  assert.equal(normalizeCaption("  Lake   day \n at\tthe cabin "), "Lake day at the cabin");
});

test("normalizeCaption turns empty, blank and non-strings into null", () => {
  assert.equal(normalizeCaption(""), null);
  assert.equal(normalizeCaption("   \n "), null);
  assert.equal(normalizeCaption(undefined), null);
  assert.equal(normalizeCaption(null), null);
  assert.equal(normalizeCaption(42), null);
  assert.equal(normalizeCaption({}), null);
});

test("normalizeCaption keeps exactly 80 and nulls 81, never truncating", () => {
  assert.equal(normalizeCaption("a".repeat(80)), "a".repeat(80));
  assert.equal(normalizeCaption("a".repeat(81)), null);
});

test("normalizeCaption measures after collapsing whitespace", () => {
  const spaced = `${"a".repeat(40)}      ${"b".repeat(39)}`; // 40 + 6 spaces + 39
  assert.equal(normalizeCaption(spaced), `${"a".repeat(40)} ${"b".repeat(39)}`);
});

test("isTakenOn accepts real dates", () => {
  assert.equal(isTakenOn("2023-02-28"), true);
  assert.equal(isTakenOn("2024-02-29"), true);
  assert.equal(isTakenOn("1900-01-01"), true);
  assert.equal(isTakenOn("2100-12-31"), true);
});

test("isTakenOn rejects impossible dates", () => {
  assert.equal(isTakenOn("2023-02-30"), false);
  assert.equal(isTakenOn("2023-02-29"), false);
  assert.equal(isTakenOn("1900-02-29"), false);
  assert.equal(isTakenOn("2023-04-31"), false);
  assert.equal(isTakenOn("2023-13-01"), false);
  assert.equal(isTakenOn("2023-00-10"), false);
  assert.equal(isTakenOn("2023-05-00"), false);
});

test("isTakenOn rejects years outside 1900 to 2100", () => {
  assert.equal(isTakenOn("1899-12-31"), false);
  assert.equal(isTakenOn("2101-01-01"), false);
  assert.equal(isTakenOn("0000-00-00"), false);
});

test("isTakenOn rejects wrong shapes and non-strings", () => {
  assert.equal(isTakenOn("2023-2-3"), false);
  assert.equal(isTakenOn("2023:02:03"), false);
  assert.equal(isTakenOn("2023-02-03T00:00:00Z"), false);
  assert.equal(isTakenOn(" 2023-02-03"), false);
  assert.equal(isTakenOn(""), false);
  assert.equal(isTakenOn(20230203), false);
  assert.equal(isTakenOn(null), false);
  assert.equal(isTakenOn(undefined), false);
  assert.equal(isTakenOn(new Date()), false);
});

test("photoPaths names the photo and its thumbnail", () => {
  assert.deepEqual(photoPaths("abc-123"), {
    photoPath: "slideshow/abc-123.jpg",
    thumbPath: "slideshow/abc-123-thumb.jpg",
  });
});

test("toDimension accepts whole numbers 1 to 8192", () => {
  assert.equal(toDimension(1), 1);
  assert.equal(toDimension(2048), 2048);
  assert.equal(toDimension(8192), 8192);
  assert.equal(toDimension("1536"), 1536);
});

test("toDimension rejects out of range, fractions and junk", () => {
  assert.equal(toDimension(0), null);
  assert.equal(toDimension(-5), null);
  assert.equal(toDimension(8193), null);
  assert.equal(toDimension(10.5), null);
  assert.equal(toDimension(Number.NaN), null);
  assert.equal(toDimension(Number.POSITIVE_INFINITY), null);
  assert.equal(toDimension("0"), null);
  assert.equal(toDimension("8193"), null);
  assert.equal(toDimension("12.5"), null);
  assert.equal(toDimension("1e3"), null);
  assert.equal(toDimension("0x10"), null);
  assert.equal(toDimension(" 12"), null);
  assert.equal(toDimension(""), null);
  assert.equal(toDimension(null), null);
  assert.equal(toDimension(undefined), null);
  assert.equal(toDimension({}), null);
});
