// Pins the Menu style vocabulary: exact labels, and a toNavMode that never
// throws and never lets an unknown value through.

import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_NAV_MODE, NAV_MODES, NAV_MODE_HELP, NAV_MODE_LABELS, toNavMode } from "./navMode";

test("NAV_MODE_LABELS: one exact label per mode, nothing extra", () => {
  assert.deepEqual(NAV_MODE_LABELS, {
    hamburger: "Menu button",
    rail: "Always open, icons only",
    sidebar: "Always open, icons + names",
  });
  assert.deepEqual(Object.keys(NAV_MODE_LABELS), [...NAV_MODES]);
});

test("NAV_MODE_HELP and DEFAULT_NAV_MODE are pinned", () => {
  assert.equal(NAV_MODE_HELP, "Applies on wide screens. Phones always use the menu button.");
  assert.equal(DEFAULT_NAV_MODE, "hamburger");
});

test("toNavMode: every valid value passes through", () => {
  for (const mode of NAV_MODES) assert.equal(toNavMode(mode), mode);
});

test("toNavMode: garbage falls back to the default without throwing", () => {
  for (const raw of [null, undefined, 42, "Rail", "__proto__", "", {}, []]) {
    assert.equal(toNavMode(raw), DEFAULT_NAV_MODE);
  }
});
