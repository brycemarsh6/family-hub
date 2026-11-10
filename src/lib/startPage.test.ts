// Pins the "Open Marshee on" vocabulary: nine pages, Dashboard first, Lists and
// Settings absent, and a toStartPage that never throws and never lets an
// unknown or off-site value through.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_START_PAGE,
  START_PAGE_OPTIONS,
  isStartPage,
  START_PAGE_WORDS,
  startPageLabel,
  toStartPage,
} from "./startPage";

test("START_PAGE_OPTIONS: nine pages, Dashboard first, no Lists, no Settings", () => {
  assert.equal(START_PAGE_OPTIONS.length, 9);
  assert.equal(START_PAGE_OPTIONS[0].href, "/");
  assert.equal(START_PAGE_OPTIONS[0].label, "Dashboard");
  const hrefs = START_PAGE_OPTIONS.map((option) => option.href);
  assert.ok(!hrefs.includes("/lists"));
  assert.ok(!hrefs.includes("/settings"));
  assert.equal(new Set(hrefs).size, hrefs.length);
});

test("DEFAULT_START_PAGE is the Dashboard", () => {
  assert.equal(DEFAULT_START_PAGE, "/");
});

test("toStartPage: every option passes through", () => {
  for (const option of START_PAGE_OPTIONS) assert.equal(toStartPage(option.href), option.href);
});

test("toStartPage: garbage falls back to the Dashboard without throwing", () => {
  for (const raw of [
    null,
    undefined,
    "",
    "/lists",
    "/settings",
    "https://evil.example",
    "//evil.example",
    "/calendar/x",
    42,
    {},
  ]) {
    assert.equal(toStartPage(raw), "/");
  }
});

test("startPageLabel: names each option, unknown reads as Dashboard", () => {
  for (const option of START_PAGE_OPTIONS) assert.equal(startPageLabel(option.href), option.label);
  assert.equal(startPageLabel("/lists"), "Dashboard");
  assert.equal(startPageLabel(null), "Dashboard");
});

test("START_PAGE_WORDS are pinned", () => {
  assert.deepEqual(START_PAGE_WORDS, {
    label: "Open Marshee on",
    helpSelf: "Where you land after you sign in.",
    helpTablet: "Where a tap on the slideshow or the black screen takes the tablet.",
    saveError: "Couldn't save the start page. Check your connection and try again.",
    notAllowed: "Only parents, admins and the wall tablet can change this.",
    notAPage: "That isn't a page you can start on.",
  });
});

test("isStartPage: true for every option, false for anything else", () => {
  for (const option of START_PAGE_OPTIONS) assert.equal(isStartPage(option.href), true);
  for (const raw of [null, undefined, "", "/lists", "/settings", "https://evil.example", 5, {}]) {
    assert.equal(isStartPage(raw), false);
  }
});
