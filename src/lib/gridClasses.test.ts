// The month-panel class strings spell the container cutoff as a literal
// (Tailwind cannot read an interpolated class), so this keeps them equal to
// MONTH_PANEL_BESIDE_MIN_PX (mission 72). Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MONTH_PANEL_BESIDE_MIN_PX,
  MONTH_PANEL_BESIDE_VIEW_CLASSES,
  MONTH_PANEL_ROW_CLASSES,
  MONTH_PANEL_SIDE_CLASSES,
} from "./gridClasses";

test("every month-panel class string uses the one container cutoff", () => {
  for (const classes of [MONTH_PANEL_ROW_CLASSES, MONTH_PANEL_SIDE_CLASSES, MONTH_PANEL_BESIDE_VIEW_CLASSES]) {
    const variants = classes.match(/@min-\[[^\]]*\]/g) ?? [];
    assert.ok(variants.length > 0);
    for (const variant of variants) assert.equal(variant, `@min-[${MONTH_PANEL_BESIDE_MIN_PX}px]`);
  }
});
