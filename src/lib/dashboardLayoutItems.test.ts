// Pins the `items` (picked ids) cases of dashboardLayout.ts: parsing, cleaning,
// setWidgetItems and how add, resize and reorder keep them (decisions 44, 49).
// Picks belong to one widget instance, so two Habits widgets pick separately.
// Sibling of dashboardLayoutParse.test.ts and dashboardLayoutEdits.test.ts, split off to keep each under 350 lines;
// the v1 picks case is in dashboardLayoutUpgrade.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  addWidget,
  parseDashboardLayout,
  reorderWidgets,
  resizeWidget,
  serializeDashboardLayout,
  setWidgetItems,
  type DashboardLayout,
} from "./dashboardLayout";

// --- picked items (decisions 44, 49) ----------------------------------

const layoutOf = (widgets: DashboardLayout["widgets"]): DashboardLayout => ({ version: 2, widgets });
const withItems = (kind: "habits" | "goals", items: unknown): unknown => ({
  version: 2,
  widgets: [{ uid: kind, kind, size: "m", items }],
});
const itemsOf = (layout: DashboardLayout, uid: string) => layout.widgets.find((w) => w.uid === uid)?.items;

test("items: survive a round trip on habits and goals, in picked order", () => {
  const stored = layoutOf([
    { uid: "todayMeals", kind: "todayMeals", size: "m" },
    { uid: "habits", kind: "habits", size: "l", items: ["h3", "h1", "h2"] },
    { uid: "chores", kind: "chores", size: "l" },
    { uid: "goals", kind: "goals", size: "m", items: ["g2", "g1"] },
    { uid: "inventory", kind: "inventory", size: "s" },
  ]);
  const back = parseDashboardLayout(serializeDashboardLayout(stored));
  assert.deepEqual(back, stored);
  assert.deepEqual(itemsOf(back, "habits"), ["h3", "h1", "h2"]);
});

test("items: dropped on every other kind", () => {
  const out = parseDashboardLayout({
    version: 2,
    widgets: [
      { uid: "chores", kind: "chores", size: "m", items: ["a"] },
      { uid: "recipes", kind: "recipes", size: "m", items: ["a"] },
      { uid: "habits", kind: "habits", size: "m", items: ["a"] },
    ],
  });
  assert.equal(itemsOf(out, "chores"), undefined);
  assert.equal(itemsOf(out, "recipes"), undefined);
  assert.deepEqual(itemsOf(out, "habits"), ["a"]);
  assert.ok(!("items" in out.widgets.find((w) => w.uid === "chores")!));
});

test("items: bad shapes are dropped, and the default layout has none", () => {
  for (const bad of ["h1", 7, { 0: "h1" }, null, [], [1, null, "", {}]]) {
    const out = parseDashboardLayout(withItems("habits", bad));
    assert.ok(!("items" in out.widgets[0]), JSON.stringify(bad));
  }
  assert.ok(DEFAULT_DASHBOARD_LAYOUT.widgets.every((w) => !("items" in w)));
});

test("items: duplicates and empties go, valid strings stay, capped at 50", () => {
  const mixed = parseDashboardLayout(withItems("goals", ["a", "a", "", 3, "b"]));
  assert.deepEqual(itemsOf(mixed, "goals"), ["a", "b"]);
  const many = Array.from({ length: 80 }, (_, i) => `id${i}`);
  const capped = parseDashboardLayout(withItems("habits", many));
  assert.deepEqual(itemsOf(capped, "habits"), many.slice(0, 50));
});

test("resize, add and reorder keep a widget's items", () => {
  const picked = setWidgetItems(DEFAULT_DASHBOARD_LAYOUT, "habits", ["h1"]);
  assert.deepEqual(itemsOf(resizeWidget(picked, "habits", "m"), "habits"), ["h1"]);
  assert.deepEqual(itemsOf(addWidget(picked, "chores", "m"), "habits"), ["h1"]);
  assert.deepEqual(itemsOf(reorderWidgets(picked, ["goals", "habits"]), "habits"), ["h1"]);
});

test("setWidgetItems: sets, replaces, clears, ignores other widgets, never mutates", () => {
  const before = JSON.stringify(DEFAULT_DASHBOARD_LAYOUT);
  const one = setWidgetItems(DEFAULT_DASHBOARD_LAYOUT, "goals", ["g1", "g1", "g2"]);
  assert.equal(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT), before);
  assert.deepEqual(itemsOf(one, "goals"), ["g1", "g2"]);
  assert.deepEqual(itemsOf(setWidgetItems(one, "goals", ["g9"]), "goals"), ["g9"]);
  const cleared = setWidgetItems(one, "goals", []);
  assert.deepEqual(cleared, DEFAULT_DASHBOARD_LAYOUT);
  assert.ok(!("items" in cleared.widgets.find((w) => w.uid === "goals")!));
  assert.deepEqual(setWidgetItems(DEFAULT_DASHBOARD_LAYOUT, "recipes", ["x"]), DEFAULT_DASHBOARD_LAYOUT);
  assert.deepEqual(setWidgetItems(DEFAULT_DASHBOARD_LAYOUT, "nope", ["x"]), DEFAULT_DASHBOARD_LAYOUT);
  assert.deepEqual(itemsOf(setWidgetItems(one, "habits", ["h1"]), "goals"), ["g1", "g2"]);
});

test("setWidgetItems: two Habits widgets pick separately", () => {
  const two = addWidget(DEFAULT_DASHBOARD_LAYOUT, "habits", "m");
  const out = setWidgetItems(setWidgetItems(two, "habits", ["a"]), "habits-2", ["b", "c"]);
  assert.deepEqual(itemsOf(out, "habits"), ["a"]);
  assert.deepEqual(itemsOf(out, "habits-2"), ["b", "c"]);
  assert.deepEqual(parseDashboardLayout(serializeDashboardLayout(out)), out);
});
