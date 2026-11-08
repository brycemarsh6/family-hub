// Real unit tests (node:test, zero new dependencies) for parseDashboardLayout
// and the default layout in dashboardLayout.ts: garbage input, v2 parsing,
// size snapping, uid repair and the widget cap. Run with `npm test`. Siblings:
// dashboardLayoutEdits.test.ts (add, remove, resize, reorder, nextWidgetUid),
// dashboardLayoutUpgrade.test.ts (v1 upgrading to v2) and
// dashboardLayoutItems.test.ts (the `items` picked-ids cases).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  parseDashboardLayout,
  serializeDashboardLayout,
  type DashboardLayout,
} from "./dashboardLayout";
import { MAX_DASHBOARD_WIDGETS } from "./dashboardWidgets";

const uids = (layout: DashboardLayout) => layout.widgets.map((w) => w.uid);
const v2 = (widgets: unknown): unknown => ({ version: 2, widgets });

// --- the default -------------------------------------------------------

test("default layout: registry order, each kind at its default size, uid is the kind", () => {
  assert.equal(DEFAULT_DASHBOARD_LAYOUT.version, 2);
  assert.deepEqual(DEFAULT_DASHBOARD_LAYOUT.widgets, [
    { uid: "calendar", kind: "calendar", size: "l" },
    { uid: "todayMeals", kind: "todayMeals", size: "m" },
    { uid: "habits", kind: "habits", size: "l" },
    { uid: "chores", kind: "chores", size: "m" },
    { uid: "goals", kind: "goals", size: "m" },
    { uid: "inventory", kind: "inventory", size: "s" },
    { uid: "grocery", kind: "grocery", size: "s" },
    { uid: "recipes", kind: "recipes", size: "m" },
  ]);
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
  assert.equal(DEFAULT_DASHBOARD_LAYOUT.widgets[0].size, "l");
  assert.equal(parseDashboardLayout(null).widgets.length, 8);
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
