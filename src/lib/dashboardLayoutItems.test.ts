// Pins the `items` (picked ids) cases of dashboardLayout.ts: parsing, cleaning,
// setWidgetItems and how toggle and reorder keep them (decisions 44, 49).
// Sibling of dashboardLayout.test.ts, split off to keep both under 350 lines.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  parseDashboardLayout,
  reorderWidgets,
  serializeDashboardLayout,
  setWidgetItems,
  toggleWidget,
  type DashboardLayout,
} from "./dashboardLayout";

// --- picked items (decisions 44, 49) ----------------------------------

const layoutOf = (widgets: DashboardLayout["widgets"]): DashboardLayout => ({ version: 1, widgets });
const withItems = (id: "habits" | "goals", items: unknown): unknown => ({
  version: 1,
  widgets: [{ id, enabled: true, items }],
});
const itemsOf = (layout: DashboardLayout, id: string) => layout.widgets.find((w) => w.id === id)?.items;

test("items: survive a round trip on habits and goals, in picked order", () => {
  const stored = layoutOf([
    { id: "todayMeals", enabled: true },
    { id: "habits", enabled: true, items: ["h3", "h1", "h2"] },
    { id: "chores", enabled: true },
    { id: "goals", enabled: false, items: ["g2", "g1"] },
    { id: "inventory", enabled: true },
    { id: "grocery", enabled: true },
    { id: "recipes", enabled: true },
  ]);
  const back = parseDashboardLayout(serializeDashboardLayout(stored));
  assert.deepEqual(back, stored);
  assert.deepEqual(itemsOf(back, "habits"), ["h3", "h1", "h2"]);
});

test("items: dropped on every other widget", () => {
  const out = parseDashboardLayout({
    version: 1,
    widgets: [
      { id: "chores", enabled: true, items: ["a"] },
      { id: "recipes", enabled: true, items: ["a"] },
      { id: "habits", enabled: true, items: ["a"] },
    ],
  });
  assert.equal(itemsOf(out, "chores"), undefined);
  assert.equal(itemsOf(out, "recipes"), undefined);
  assert.deepEqual(itemsOf(out, "habits"), ["a"]);
  assert.ok(!("items" in out.widgets.find((w) => w.id === "chores")!));
});

test("items: bad shapes are dropped, and the default layout has none", () => {
  for (const bad of ["h1", 7, { 0: "h1" }, null, [], [1, null, "", {}]]) {
    const out = parseDashboardLayout(withItems("habits", bad));
    assert.ok(!("items" in out.widgets.find((w) => w.id === "habits")!), JSON.stringify(bad));
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

test("toggle and reorder keep a widget's items", () => {
  const picked = setWidgetItems(DEFAULT_DASHBOARD_LAYOUT, "habits", ["h1"]);
  assert.deepEqual(itemsOf(toggleWidget(picked, "habits"), "habits"), ["h1"]);
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
  assert.ok(!("items" in cleared.widgets.find((w) => w.id === "goals")!));
  assert.deepEqual(setWidgetItems(DEFAULT_DASHBOARD_LAYOUT, "recipes", ["x"]), DEFAULT_DASHBOARD_LAYOUT);
  assert.deepEqual(setWidgetItems(one, "habits", ["h1"]).widgets.find((w) => w.id === "goals")?.items, ["g1", "g2"]);
});
