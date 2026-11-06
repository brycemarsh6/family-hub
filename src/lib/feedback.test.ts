import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MESSAGE_MAX,
  SCREENSHOT_MAX_BYTES,
  TOUCH_STAMP,
  decodeScreenshot,
  describeDevice,
  normalizeMessage,
  normalizePagePath,
  normalizeViewport,
} from "./feedback";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120 Mobile Safari/537.36";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120";

function jpegUrl(bytes: number): string {
  return "data:image/jpeg;base64," + Buffer.alloc(bytes, 1).toString("base64");
}

test("normalizeMessage trims and keeps a good message", () => {
  assert.deepEqual(normalizeMessage("  The tile is cut off \n"), {
    ok: true,
    message: "The tile is cut off",
  });
});

test("normalizeMessage: empty or blank is the Write a message first error", () => {
  for (const raw of ["", "   \n ", undefined, 5]) {
    assert.deepEqual(normalizeMessage(raw), { ok: false, error: "Write a message first." });
  }
});

test("normalizeMessage: 2000 is fine, 2001 is an error", () => {
  assert.equal(normalizeMessage("a".repeat(MESSAGE_MAX)).ok, true);
  const over = normalizeMessage("a".repeat(MESSAGE_MAX + 1));
  assert.equal(over.ok, false);
});

test("normalizeMessage counts the trimmed text, not the padding", () => {
  assert.equal(normalizeMessage(" ".repeat(50) + "a".repeat(MESSAGE_MAX) + " ").ok, true);
});

test("normalizePagePath keeps a path and drops the query and hash", () => {
  assert.equal(normalizePagePath("/habits/abc?tab=report#top"), "/habits/abc");
  assert.equal(normalizePagePath("/plans"), "/plans");
});

test("normalizePagePath falls back to / for anything that is not an app path", () => {
  for (const raw of ["", "habits", "https://evil.example/x", "//evil.example", "?a=1", null, 3]) {
    assert.equal(normalizePagePath(raw), "/");
  }
});

test("normalizePagePath: 200 characters is the limit", () => {
  assert.equal(normalizePagePath("/" + "a".repeat(199)).length, 200);
  assert.equal(normalizePagePath("/" + "a".repeat(200)), "/");
});

test("normalizeViewport accepts WxH only", () => {
  assert.equal(normalizeViewport("820x1180"), "820x1180");
  assert.equal(normalizeViewport("big"), "");
  assert.equal(normalizeViewport(undefined), "");
});

test("describeDevice names the common devices with the viewport", () => {
  assert.equal(describeDevice(IPHONE, "390x844"), "iPhone (390x844)");
  assert.equal(describeDevice(IPAD, "820x1180"), "iPad (820x1180)");
  assert.equal(describeDevice(ANDROID, "412x915"), "Android phone (412x915)");
  assert.equal(describeDevice(WINDOWS, "1280x720"), "Computer (1280x720)");
  assert.equal(describeDevice(MAC, "1440x900"), "Computer (1440x900)");
});

test("describeDevice: a Mac user agent with touch is an iPad", () => {
  assert.equal(describeDevice(MAC, "1024x768", true), "iPad (1024x768)");
  assert.equal(describeDevice(MAC + TOUCH_STAMP, "1024x768"), "iPad (1024x768)");
});

test("describeDevice: unknown agents say so, and a bad viewport is left off", () => {
  assert.equal(describeDevice("", "390x844"), "Unknown device (390x844)");
  assert.equal(describeDevice(IPHONE, "nope"), "iPhone");
});

test("decodeScreenshot accepts a small JPEG data URL", () => {
  const bytes = decodeScreenshot(jpegUrl(1000));
  assert.ok(bytes);
  assert.equal(bytes.length, 1000);
});

test("decodeScreenshot accepts exactly 400 KB and rejects one byte more", () => {
  assert.equal(decodeScreenshot(jpegUrl(SCREENSHOT_MAX_BYTES))?.length, SCREENSHOT_MAX_BYTES);
  assert.equal(decodeScreenshot(jpegUrl(SCREENSHOT_MAX_BYTES + 1)), null);
});

test("decodeScreenshot rejects other types, bad base64 and non-strings", () => {
  const body = Buffer.from("hi").toString("base64");
  assert.equal(decodeScreenshot("data:image/png;base64," + body), null);
  assert.equal(decodeScreenshot("data:text/html;base64," + body), null);
  assert.equal(decodeScreenshot("data:image/jpeg;base64,"), null);
  assert.equal(decodeScreenshot("data:image/jpeg;base64,@@@@"), null);
  assert.equal(decodeScreenshot("data:image/jpeg;base64,abc"), null);
  assert.equal(decodeScreenshot("data:image/jpeg,raw"), null);
  assert.equal(decodeScreenshot(null), null);
  assert.equal(decodeScreenshot(42), null);
});
