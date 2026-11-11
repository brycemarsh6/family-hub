// The month panel's side width is spelled as a literal class (Tailwind cannot
// read an interpolated one), so this keeps it equal to MONTH_PANEL_SIDE_REM,
// checks no container query is left to second-guess monthPanelBeside, and pins
// monthPanelBeside's answers (mission 72). Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MONTH_PANEL_BESIDE_VIEW_CLASSES,
  MONTH_PANEL_ROW_CLASSES,
  MONTH_PANEL_SIDE_CLASSES,
  MONTH_PANEL_SIDE_REM,
  MONTH_PANEL_STACKED_CLASSES,
  MONTH_PANEL_STICKY_CLASSES,
  monthPanelBeside,
} from "./gridClasses";

test("the side class spells the one side width", () => {
  assert.ok(MONTH_PANEL_SIDE_CLASSES.split(" ").includes(`w-[${MONTH_PANEL_SIDE_REM}rem]`));
});

test("no month-panel class string carries a container query", () => {
  for (const classes of [
    MONTH_PANEL_ROW_CLASSES,
    MONTH_PANEL_SIDE_CLASSES,
    MONTH_PANEL_STACKED_CLASSES,
    MONTH_PANEL_STICKY_CLASSES,
    MONTH_PANEL_BESIDE_VIEW_CLASSES,
  ]) {
    assert.ok(!classes.includes("@min-["));
  }
});

test("an iPad body of 736px takes the panel beside at Normal text", () => {
  assert.equal(monthPanelBeside(true, 736, 16), true);
});

test("the same 736px body stacks at Largest text (24px root)", () => {
  assert.equal(monthPanelBeside(true, 736, 24), false);
});

test("a wider 920px body takes it beside even at Largest text", () => {
  assert.equal(monthPanelBeside(true, 920, 24), true);
});

test("under the 700px cutoff it always stacks", () => {
  assert.equal(monthPanelBeside(true, 690, 16), false);
  assert.equal(monthPanelBeside(true, 393, 16), false);
});

test("a view without columns (Month, Year) never goes beside", () => {
  assert.equal(monthPanelBeside(false, 1200, 16), false);
});
