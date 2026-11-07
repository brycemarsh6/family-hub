// Real unit tests (node:test, zero new dependencies) for the edit helpers in
// dashboardLayout.ts that the Customize sheet uses: nextWidgetUid, addWidget,
// removeWidget, resizeWidget and reorderWidgets. Run with `npm test`.
// Siblings: dashboardLayoutParse.test.ts (parsing and the default),
// dashboardLayoutUpgrade.test.ts and dashboardLayoutItems.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  addWidget,
  nextWidgetUid,
  removeWidget,
  reorderWidgets,
  resizeWidget,
  type DashboardLayout,
} from "./dashboardLayout";
import { MAX_DASHBOARD_WIDGETS } from "./dashboardWidgets";

const uids = (layout: DashboardLayout) => layout.widgets.map((w) => w.uid);

// --- nextWidgetUid ----------------------------------------------------

test("nextWidgetUid: the kind when free, else the smallest free number from 2", () => {
  assert.equal(nextWidgetUid([], "habits"), "habits");
  assert.equal(nextWidgetUid(["goals"], "habits"), "habits");
  assert.equal(nextWidgetUid(["habits"], "habits"), "habits-2");
  assert.equal(nextWidgetUid(["habits", "habits-2"], "habits"), "habits-3");
  assert.equal(nextWidgetUid(["habits", "habits-3"], "habits"), "habits-2");
  assert.equal(nextWidgetUid(new Set(["habits", "habits-2", "habits-3"]), "habits"), "habits-4");
});

// --- edits ------------------------------------------------------------

test("addWidget: appends with the next free uid, snaps the size, does not mutate", () => {
  const before = JSON.stringify(DEFAULT_DASHBOARD_LAYOUT);
  const one = addWidget(DEFAULT_DASHBOARD_LAYOUT, "habits", "m");
  assert.equal(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT), before);
  assert.deepEqual(one.widgets[8], { uid: "habits-2", kind: "habits", size: "m" });
  assert.equal(one.widgets.length, 9);
  const two = addWidget(one, "habits", "xl");
  assert.deepEqual(two.widgets[9], { uid: "habits-3", kind: "habits", size: "l" });
  assert.equal(addWidget(DEFAULT_DASHBOARD_LAYOUT, "todayMeals", "s").widgets[8].size, "m");
});

test("addWidget: a no-op at the cap", () => {
  let layout: DashboardLayout = { version: 2, widgets: [] };
  for (let i = 0; i < MAX_DASHBOARD_WIDGETS + 3; i++) layout = addWidget(layout, "recipes", "s");
  assert.equal(layout.widgets.length, MAX_DASHBOARD_WIDGETS);
  assert.equal(addWidget(layout, "grocery", "s"), layout);
  assert.equal(new Set(uids(layout)).size, MAX_DASHBOARD_WIDGETS);
});

test("removeWidget: drops one instance by uid, leaves the rest, ignores an unknown uid", () => {
  const before = JSON.stringify(DEFAULT_DASHBOARD_LAYOUT);
  const out = removeWidget(addWidget(DEFAULT_DASHBOARD_LAYOUT, "habits", "m"), "habits");
  assert.deepEqual(uids(out), ["calendar", "todayMeals", "chores", "goals", "inventory", "grocery", "recipes", "habits-2"]);
  assert.deepEqual(removeWidget(DEFAULT_DASHBOARD_LAYOUT, "nope"), DEFAULT_DASHBOARD_LAYOUT);
  assert.equal(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT), before);
  assert.deepEqual(removeWidget({ version: 2, widgets: [{ uid: "a", kind: "recipes", size: "s" }] }, "a").widgets, []);
});

test("resizeWidget: changes one instance, snaps, keeps items, does not mutate", () => {
  const before = JSON.stringify(DEFAULT_DASHBOARD_LAYOUT);
  const out = resizeWidget(DEFAULT_DASHBOARD_LAYOUT, "inventory", "m");
  assert.equal(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT), before);
  assert.equal(out.widgets.find((w) => w.uid === "inventory")?.size, "m");
  assert.equal(out.widgets.filter((w) => w.size === "s").length, 1);
  assert.equal(resizeWidget(DEFAULT_DASHBOARD_LAYOUT, "inventory", "xl").widgets[5].size, "m");
  assert.equal(resizeWidget(DEFAULT_DASHBOARD_LAYOUT, "habits", "s").widgets[2].size, "m");
  assert.deepEqual(resizeWidget(DEFAULT_DASHBOARD_LAYOUT, "nope", "m"), DEFAULT_DASHBOARD_LAYOUT);
});

// --- reorder ----------------------------------------------------------

test("reorderWidgets follows the given uids and keeps each widget's settings", () => {
  const order = uids(DEFAULT_DASHBOARD_LAYOUT);
  const reversed = [...order].reverse();
  const layout = reorderWidgets(DEFAULT_DASHBOARD_LAYOUT, reversed);
  assert.deepEqual(uids(layout), reversed);
  assert.deepEqual(layout.widgets.map((w) => w.size), DEFAULT_DASHBOARD_LAYOUT.widgets.map((w) => w.size).reverse());
});

test("reorderWidgets ignores unknown uids and keeps widgets the list forgot", () => {
  const order = uids(DEFAULT_DASHBOARD_LAYOUT);
  const layout = reorderWidgets(DEFAULT_DASHBOARD_LAYOUT, ["nope", order[2]]);
  assert.equal(layout.widgets.length, order.length);
  assert.equal(layout.widgets[0].uid, order[2]);
  assert.deepEqual(uids(layout).slice(1), order.filter((u) => u !== order[2]));
});

test("reorderWidgets tells two instances of one kind apart", () => {
  const two = addWidget(DEFAULT_DASHBOARD_LAYOUT, "habits", "m");
  const moved = reorderWidgets(two, ["habits-2", ...uids(two).filter((u) => u !== "habits-2")]);
  assert.deepEqual(moved.widgets[0], { uid: "habits-2", kind: "habits", size: "m" });
});
