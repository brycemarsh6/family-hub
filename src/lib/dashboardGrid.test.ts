// Pins dashboardGrid.ts: the cells each size covers and where the first-fit
// packer puts widgets at 2 and at 4 columns (decisions 201, 202), plus the
// CSS custom properties the page hands to each cell.

import { test } from "node:test";
import assert from "node:assert/strict";
import { cellsOf, gridAreaVars, packWidgets } from "./dashboardGrid";
import { DEFAULT_DASHBOARD_LAYOUT } from "./dashboardLayout";
import type { WidgetSize } from "./dashboardWidgets";

const spot = (row: number, col: number, w: number, h: number) => ({ row, col, w, h });
const defaultSizes = DEFAULT_DASHBOARD_LAYOUT.widgets.map((w) => w.size);

test("cellsOf: s 1x1, m 2x1, l 2x2, xl the full width by 2", () => {
  assert.deepEqual(cellsOf("s", 2), { w: 1, h: 1 });
  assert.deepEqual(cellsOf("m", 4), { w: 2, h: 1 });
  assert.deepEqual(cellsOf("l", 4), { w: 2, h: 2 });
  assert.deepEqual(cellsOf("xl", 2), { w: 2, h: 2 });
  assert.deepEqual(cellsOf("xl", 4), { w: 4, h: 2 });
});

test("pack: empty input gives empty output", () => {
  assert.deepEqual(packWidgets([], 2), []);
  assert.deepEqual(packWidgets([], 4), []);
  assert.deepEqual(gridAreaVars([]), []);
});

test("pack: the default layout at 2 columns stacks, the two Smalls share a row", () => {
  assert.deepEqual(packWidgets(defaultSizes, 2), [
    spot(1, 1, 2, 1), // todayMeals m
    spot(2, 1, 2, 2), // habits l
    spot(4, 1, 2, 2), // chores l
    spot(6, 1, 2, 1), // goals m
    spot(7, 1, 1, 1), // inventory s
    spot(7, 2, 1, 1), // grocery s
    spot(8, 1, 2, 1), // recipes m
  ]);
});

test("pack: the default layout at 4 columns tucks widgets in beside each other", () => {
  assert.deepEqual(packWidgets(defaultSizes, 4), [
    spot(1, 1, 2, 1), // todayMeals m
    spot(1, 3, 2, 2), // habits l beside it
    spot(2, 1, 2, 2), // chores l under todayMeals
    spot(3, 3, 2, 1), // goals m under habits
    spot(4, 1, 1, 1), // inventory s
    spot(4, 2, 1, 1), // grocery s
    spot(4, 3, 2, 1), // recipes m
  ]);
});

test("pack: S M S, the later Small fills the hole at 2 columns", () => {
  assert.deepEqual(packWidgets(["s", "m", "s"], 2), [spot(1, 1, 1, 1), spot(2, 1, 2, 1), spot(1, 2, 1, 1)]);
});

test("pack: S M S at 4 columns, M sits beside the first S and the next S goes after", () => {
  assert.deepEqual(packWidgets(["s", "m", "s"], 4), [spot(1, 1, 1, 1), spot(1, 2, 2, 1), spot(1, 4, 1, 1)]);
});

test("pack: L beside S S at 4 columns, the Smalls stack in the hole under the second row", () => {
  assert.deepEqual(packWidgets(["l", "s", "s"], 4), [spot(1, 1, 2, 2), spot(1, 3, 1, 1), spot(1, 4, 1, 1)]);
  assert.deepEqual(packWidgets(["l", "s", "s", "s", "s"], 4).slice(1), [
    spot(1, 3, 1, 1),
    spot(1, 4, 1, 1),
    spot(2, 3, 1, 1),
    spot(2, 4, 1, 1),
  ]);
});

test("pack: L then S S at 2 columns goes below", () => {
  assert.deepEqual(packWidgets(["l", "s", "s"], 2), [spot(1, 1, 2, 2), spot(3, 1, 1, 1), spot(3, 2, 1, 1)]);
});

test("pack: xl takes the full width at 2 and at 4 columns", () => {
  assert.deepEqual(packWidgets(["xl", "s"], 2), [spot(1, 1, 2, 2), spot(3, 1, 1, 1)]);
  assert.deepEqual(packWidgets(["xl", "s"], 4), [spot(1, 1, 4, 2), spot(3, 1, 1, 1)]);
  assert.deepEqual(packWidgets(["s", "xl"], 4), [spot(1, 1, 1, 1), spot(2, 1, 4, 2)]);
});

test("pack: no two widgets overlap and nothing leaves the grid, for every order of a mixed set", () => {
  const all: WidgetSize[] = ["s", "m", "l", "xl", "s", "m", "s", "l"];
  for (const columns of [2, 4] as const) {
    for (let shift = 0; shift < all.length; shift++) {
      const sizes = [...all.slice(shift), ...all.slice(0, shift)];
      const used = new Set<string>();
      for (const cell of packWidgets(sizes, columns)) {
        assert.ok(cell.col >= 1 && cell.col + cell.w - 1 <= columns);
        for (let r = cell.row; r < cell.row + cell.h; r++) {
          for (let c = cell.col; c < cell.col + cell.w; c++) {
            assert.ok(!used.has(`${r},${c}`), `${columns} columns, shift ${shift}`);
            used.add(`${r},${c}`);
          }
        }
      }
    }
  }
});

test("gridAreaVars: the four custom properties as '<start> / span <n>'", () => {
  const vars = gridAreaVars(["m", "s", "xl"]);
  assert.equal(vars.length, 3);
  assert.deepEqual(vars[0], {
    "--dash-r2": "1 / span 1",
    "--dash-c2": "1 / span 2",
    "--dash-r4": "1 / span 1",
    "--dash-c4": "1 / span 2",
  });
  assert.deepEqual(vars[1], {
    "--dash-r2": "2 / span 1",
    "--dash-c2": "1 / span 1",
    "--dash-r4": "1 / span 1",
    "--dash-c4": "3 / span 1",
  });
  assert.deepEqual(vars[2], {
    "--dash-r2": "3 / span 2",
    "--dash-c2": "1 / span 2",
    "--dash-r4": "2 / span 2",
    "--dash-c4": "1 / span 4",
  });
});
