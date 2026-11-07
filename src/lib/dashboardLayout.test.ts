// Real unit tests (node:test, zero new dependencies) for the dashboard
// layout logic (layout v2): the default, parsing a stored v2 value, the
// Customize sheet's edits and nextWidgetUid. Run with `npm test`. Siblings:
// dashboardLayoutUpgrade.test.ts (saved v1 layouts upgrading to v2) and
// dashboardLayoutItems.test.ts (the `items` picked-ids cases).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  addWidget,
  nextWidgetUid,
  parseDashboardLayout,
  removeWidget,
  reorderWidgets,
  resizeWidget,
  serializeDashboardLayout,
  type DashboardLayout,
} from "./dashboardLayout";
import {
  DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_KINDS,
  MAX_DASHBOARD_WIDGETS,
  WIDGET_SIZES,
  WIDGET_SIZE_LABELS,
} from "./dashboardWidgets";

const uids = (layout: DashboardLayout) => layout.widgets.map((w) => w.uid);
const v2 = (widgets: unknown): unknown => ({ version: 2, widgets });

// --- the default and the registry -------------------------------------

test("default layout: registry order, each kind at its default size, uid is the kind", () => {
  assert.equal(DEFAULT_DASHBOARD_LAYOUT.version, 2);
  assert.deepEqual(DEFAULT_DASHBOARD_LAYOUT.widgets, [
    { uid: "todayMeals", kind: "todayMeals", size: "m" },
    { uid: "habits", kind: "habits", size: "l" },
    { uid: "chores", kind: "chores", size: "l" },
    { uid: "goals", kind: "goals", size: "m" },
    { uid: "inventory", kind: "inventory", size: "s" },
    { uid: "grocery", kind: "grocery", size: "s" },
    { uid: "recipes", kind: "recipes", size: "m" },
  ]);
});

test("registry: labels, sizes (decision 200) and the tablet flag", () => {
  const sizes = (k: keyof typeof DASHBOARD_WIDGETS) => DASHBOARD_WIDGETS[k].sizes.join("");
  assert.equal(DASHBOARD_WIDGETS.todayMeals.label, "Today's meals");
  assert.equal(DASHBOARD_WIDGETS.habits.label, "Habits");
  assert.equal(DASHBOARD_WIDGETS.chores.label, "Chores today");
  assert.equal(DASHBOARD_WIDGETS.goals.label, "Goals this week");
  assert.deepEqual(
    ["inventory", "grocery", "recipes", "todayMeals", "goals", "habits", "chores"].map((k) => sizes(k as never)),
    ["sm", "sm", "sm", "m", "m", "ml", "ml"],
  );
  assert.deepEqual([...DASHBOARD_WIDGET_KINDS], Object.keys(DASHBOARD_WIDGETS));
  const offTablet = DASHBOARD_WIDGET_KINDS.filter((k) => !DASHBOARD_WIDGETS[k].onTablet);
  assert.deepEqual(offTablet, ["habits", "chores"]);
  for (const kind of DASHBOARD_WIDGET_KINDS) {
    const def = DASHBOARD_WIDGETS[kind];
    assert.ok(def.sizes.length > 0 && def.sizes.includes(def.defaultSize), kind);
    const ranks = def.sizes.map((s) => WIDGET_SIZES.indexOf(s));
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), kind);
  }
  assert.deepEqual(Object.values(WIDGET_SIZE_LABELS), ["Small", "Medium", "Large", "Extra large"]);
});

// --- parseDashboardLayout: garbage ------------------------------------

test("parse: garbage inputs and unknown versions give the default", () => {
  const garbage: unknown[] = [
    null,
    undefined,
    "{",
    "",
    42,
    true,
    [],
    {},
    { version: 3, widgets: [{ uid: "grocery", kind: "grocery", size: "s" }] },
    { version: 0, widgets: [] },
    { version: 2, widgets: "nope" },
    { version: 2, widgets: { kind: "grocery" } },
    { version: 1, widgets: "nope" },
    JSON.stringify({ version: 2 }),
  ];
  for (const raw of garbage) {
    assert.deepEqual(parseDashboardLayout(raw), DEFAULT_DASHBOARD_LAYOUT, JSON.stringify(raw));
  }
});

test("parse: the default is returned as a fresh copy", () => {
  const a = parseDashboardLayout(null);
  a.widgets[0].size = "s";
  a.widgets.pop();
  assert.equal(DEFAULT_DASHBOARD_LAYOUT.widgets[0].size, "m");
  assert.equal(parseDashboardLayout(null).widgets.length, 7);
});

// --- parseDashboardLayout: v2 ------------------------------------------

test("parse v2: keeps entries in order, accepts a string or an object, round trips", () => {
  const stored: DashboardLayout = {
    version: 2,
    widgets: [
      { uid: "recipes", kind: "recipes", size: "s" },
      { uid: "habits", kind: "habits", size: "m" },
      { uid: "habits-2", kind: "habits", size: "l" },
    ],
  };
  assert.deepEqual(parseDashboardLayout(stored), stored);
  assert.deepEqual(parseDashboardLayout(JSON.stringify(stored)), stored);
  assert.deepEqual(parseDashboardLayout(serializeDashboardLayout(stored)), stored);
});

test("parse v2: junk entries and unknown kinds are dropped", () => {
  const out = parseDashboardLayout(
    v2([null, 7, "grocery", { kind: 5 }, { uid: "w", kind: "weather", size: "s" }, { uid: "r", kind: "recipes", size: "s" }]),
  );
  assert.deepEqual(out.widgets, [{ uid: "r", kind: "recipes", size: "s" }]);
});

test("parse v2: a size the kind does not allow snaps to the nearest allowed one", () => {
  const sizeOf = (kind: string, size: unknown) =>
    parseDashboardLayout(v2([{ uid: "a", kind, size }])).widgets[0].size;
  assert.equal(sizeOf("inventory", "xl"), "m");
  assert.equal(sizeOf("inventory", "l"), "m");
  assert.equal(sizeOf("habits", "s"), "m");
  assert.equal(sizeOf("habits", "xl"), "l");
  assert.equal(sizeOf("todayMeals", "s"), "m");
  assert.equal(sizeOf("todayMeals", "xl"), "m");
  assert.equal(sizeOf("recipes", "l"), "m");
});

test("parse v2: a missing or invalid size gets the kind's default", () => {
  for (const size of [undefined, null, 3, "huge", "M", ""]) {
    const out = parseDashboardLayout(v2([{ uid: "a", kind: "habits", size }]));
    assert.equal(out.widgets[0].size, "l", String(size));
  }
  assert.equal(parseDashboardLayout(v2([{ uid: "a", kind: "inventory" }])).widgets[0].size, "s");
});

test("parse v2: a bad uid is replaced by the next free one", () => {
  const bad: unknown[] = [undefined, null, 5, "", "has space", "a/b", "x".repeat(41), "é"];
  for (const uid of bad) {
    const out = parseDashboardLayout(v2([{ uid, kind: "habits", size: "m" }]));
    assert.equal(out.widgets[0].uid, "habits", String(uid));
  }
  assert.equal(parseDashboardLayout(v2([{ uid: "x".repeat(40), kind: "habits" }])).widgets[0].uid, "x".repeat(40));
  assert.equal(parseDashboardLayout(v2([{ uid: "A_b-9", kind: "habits" }])).widgets[0].uid, "A_b-9");
});

test("parse v2: a repeated uid is replaced, the first keeps it", () => {
  const out = parseDashboardLayout(
    v2([
      { uid: "habits", kind: "habits", size: "m" },
      { uid: "habits", kind: "habits", size: "l" },
      { uid: "habits", kind: "goals", size: "m" },
    ]),
  );
  assert.deepEqual(uids(out), ["habits", "habits-2", "goals"]);
  assert.deepEqual(out.widgets.map((w) => w.size), ["m", "l", "m"]);
});

test("parse v2: at most MAX_DASHBOARD_WIDGETS are kept", () => {
  const many = Array.from({ length: 45 }, (_, i) => ({ uid: `w${i}`, kind: "recipes", size: "s" }));
  const out = parseDashboardLayout(v2(many));
  assert.equal(out.widgets.length, MAX_DASHBOARD_WIDGETS);
  assert.equal(out.widgets[29].uid, "w29");
});

test("parse v2: missing kinds are not added back and an empty list stays empty", () => {
  const out = parseDashboardLayout(v2([{ uid: "recipes", kind: "recipes", size: "m" }]));
  assert.deepEqual(uids(out), ["recipes"]);
  assert.deepEqual(parseDashboardLayout(v2([])), { version: 2, widgets: [] });
  assert.deepEqual(parseDashboardLayout(JSON.stringify(v2([]))), { version: 2, widgets: [] });
});

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
  assert.deepEqual(one.widgets[7], { uid: "habits-2", kind: "habits", size: "m" });
  assert.equal(one.widgets.length, 8);
  const two = addWidget(one, "habits", "xl");
  assert.deepEqual(two.widgets[8], { uid: "habits-3", kind: "habits", size: "l" });
  assert.equal(addWidget(DEFAULT_DASHBOARD_LAYOUT, "todayMeals", "s").widgets[7].size, "m");
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
  assert.deepEqual(uids(out), ["todayMeals", "chores", "goals", "inventory", "grocery", "recipes", "habits-2"]);
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
  assert.equal(resizeWidget(DEFAULT_DASHBOARD_LAYOUT, "inventory", "xl").widgets[4].size, "m");
  assert.equal(resizeWidget(DEFAULT_DASHBOARD_LAYOUT, "habits", "s").widgets[1].size, "m");
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
