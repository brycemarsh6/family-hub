// Pins dashboardPicks.ts: foreign picks are dropped, picked order is kept, and
// the wall tablet's layout leaves out the two habit tiles (decisions 138, 132, 136).

import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DASHBOARD_LAYOUT, setWidgetItems } from "./dashboardLayout";
import { keepOwnPicks, layoutForViewer, picksOf } from "./dashboardPicks";

test("keepOwnPicks drops ids that are not the viewer's and keeps picked order", () => {
  assert.deepEqual(keepOwnPicks(["c", "x", "a", "gone"], ["a", "b", "c"]), ["c", "a"]);
});

test("keepOwnPicks with nothing allowed or nothing picked is empty", () => {
  assert.deepEqual(keepOwnPicks(["a"], []), []);
  assert.deepEqual(keepOwnPicks([], ["a"]), []);
});

test("picksOf reads a widget's items, empty when it has none", () => {
  const layout = setWidgetItems(DEFAULT_DASHBOARD_LAYOUT, "habits", ["h2", "h1"]);
  assert.deepEqual(picksOf(layout, "habits"), ["h2", "h1"]);
  assert.deepEqual(picksOf(layout, "goals"), []);
  assert.deepEqual(picksOf(layout, "chores"), []);
});

test("the tablet's layout leaves out habits and chores and keeps the rest in order", () => {
  const ids = layoutForViewer(DEFAULT_DASHBOARD_LAYOUT, true).widgets.map((w) => w.id);
  assert.deepEqual(ids, ["todayMeals", "goals", "inventory", "grocery", "recipes"]);
});

test("a person's layout is returned as it is", () => {
  assert.equal(layoutForViewer(DEFAULT_DASHBOARD_LAYOUT, false), DEFAULT_DASHBOARD_LAYOUT);
});
