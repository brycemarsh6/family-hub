// Real unit tests (node:test, zero new dependencies) for color.ts's own
// exports — this file exists solely to hold hexToRgba after mission-10/C3
// hoisted it out of MonthCell.tsx and EventCard.tsx's two byte-identical
// private copies.

import { test } from "node:test";
import assert from "node:assert/strict";
import { hexToRgba } from "./color";

test("hexToRgba: converts a 6-digit hex string with the given alpha", () => {
  assert.equal(hexToRgba("#000000", 0.1), "rgba(0, 0, 0, 0.1)");
  assert.equal(hexToRgba("#ffffff", 1), "rgba(255, 255, 255, 1)");
});

test("hexToRgba: reads each channel from its own 2-digit slice", () => {
  // #1a2b3c -> r=0x1a=26, g=0x2b=43, b=0x3c=60 — a value where every
  // channel differs catches a slice-offset mistake a same-value test like
  // #000000/#ffffff can't.
  assert.equal(hexToRgba("#1a2b3c", 0.5), "rgba(26, 43, 60, 0.5)");
});

test("hexToRgba: passes alpha through unchanged, including 0", () => {
  assert.equal(hexToRgba("#336699", 0), "rgba(51, 102, 153, 0)");
  assert.equal(hexToRgba("#336699", 0.05), "rgba(51, 102, 153, 0.05)");
});
