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
  widthWithRailNav,
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

// Mission 72 F2: a pinned Sidebar (256) squeezes to the rail (72) once beside.
const decide = (width: number, nav: number, root: number) => monthPanelBeside(true, widthWithRailNav(width, nav, 72), root);

test("1024 landscape with the Sidebar (736 body) goes beside at Large and Largest", () => {
  assert.equal(decide(736, 256, 18), true);
  assert.equal(decide(736, 256, 24), true);
});

test("1180 landscape with the Sidebar (892 body) goes beside at Largest", () => {
  assert.equal(decide(892, 256, 24), true);
});

test("768 upright (no pinned menu) stacks at Large and goes beside at Normal", () => {
  assert.equal(decide(736, 0, 18), false);
  assert.equal(decide(736, 0, 16), true);
});

test("once beside, the body already has the rail's width: nothing is added, no flip", () => {
  assert.equal(widthWithRailNav(920, 72, 72), 920);
  assert.equal(decide(920, 72, 24), true);
});

test("a missing nav width adds nothing", () => {
  assert.equal(widthWithRailNav(736, Number.NaN, 72), 736);
  assert.equal(widthWithRailNav(736, 0, 72), 736);
});
