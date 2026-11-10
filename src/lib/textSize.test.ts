// Pins the Text size vocabulary: exact labels, and a toTextSize that never
// throws and never lets an unknown value through.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_TEXT_SIZE,
  TEXT_SIZES,
  TEXT_SIZE_HELP,
  TEXT_SIZE_LABELS,
  toTextSize,
} from "./textSize";

test("TEXT_SIZE_LABELS: one exact label per size, nothing extra", () => {
  assert.deepEqual(TEXT_SIZE_LABELS, {
    normal: "Normal",
    large: "Large",
    xl: "Extra large",
  });
  assert.deepEqual(Object.keys(TEXT_SIZE_LABELS), [...TEXT_SIZES]);
});

test("TEXT_SIZE_HELP and DEFAULT_TEXT_SIZE are pinned", () => {
  assert.equal(TEXT_SIZE_HELP, "Applies on wide screens.");
  assert.equal(DEFAULT_TEXT_SIZE, "normal");
});

test("toTextSize: every valid value passes through", () => {
  for (const size of TEXT_SIZES) assert.equal(toTextSize(size), size);
});

test("toTextSize: garbage falls back to the default without throwing", () => {
  for (const raw of [null, undefined, 42, "Large", "huge", "__proto__", "", {}, []]) {
    assert.equal(toTextSize(raw), DEFAULT_TEXT_SIZE);
  }
});
