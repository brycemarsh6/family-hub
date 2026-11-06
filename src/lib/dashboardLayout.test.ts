// Real unit tests (node:test, zero new dependencies) for the dashboard
// layout logic: parsing whatever is stored, the Customize sheet's edits, and
// how widgets pair up into rows. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  parseDashboardLayout,
  reorderWidgets,
  serializeDashboardLayout,
  toggleWidget,
  widgetSpans,
  type DashboardLayout,
} from "./dashboardLayout";
import { DASHBOARD_WIDGETS, DASHBOARD_WIDGET_IDS } from "./dashboardWidgets";

const ids = (layout: DashboardLayout) => layout.widgets.map((w) => w.id);

function layoutOf(order: DashboardLayout["widgets"]): DashboardLayout {
  return { version: 1, widgets: order };
}

// --- the default -------------------------------------------------------

test("default layout: registry order, everything on", () => {
  assert.deepEqual(ids(DEFAULT_DASHBOARD_LAYOUT), ["todayMeals", "habits", "chores", "goals", "inventory", "grocery", "recipes"]);
  assert.ok(DEFAULT_DASHBOARD_LAYOUT.widgets.every((w) => w.enabled));
  assert.equal(DEFAULT_DASHBOARD_LAYOUT.version, 1);
});

test("registry: labels and widths", () => {
  assert.equal(DASHBOARD_WIDGETS.todayMeals.label, "Today's meals");
  assert.equal(DASHBOARD_WIDGETS.todayMeals.width, "full");
  assert.equal(DASHBOARD_WIDGETS.habits.label, "Habits");
  assert.equal(DASHBOARD_WIDGETS.chores.label, "Chores today");
  assert.equal(DASHBOARD_WIDGETS.habits.width, "full");
  assert.equal(DASHBOARD_WIDGETS.chores.width, "full");
  assert.ok(DASHBOARD_WIDGETS.habits.defaultEnabled && DASHBOARD_WIDGETS.chores.defaultEnabled);
  assert.equal(DASHBOARD_WIDGETS.goals.label, "Goals this week");
  assert.equal(DASHBOARD_WIDGETS.goals.width, "full");
  assert.equal(DASHBOARD_WIDGETS.inventory.width, "half");
  assert.equal(DASHBOARD_WIDGETS.grocery.width, "half");
  assert.equal(DASHBOARD_WIDGETS.recipes.width, "full");
  assert.deepEqual([...DASHBOARD_WIDGET_IDS], Object.keys(DASHBOARD_WIDGETS));
});

// --- parseDashboardLayout: garbage ------------------------------------

test("parse: garbage inputs give the default", () => {
  const garbage: unknown[] = [
    null,
    undefined,
    "{",
    "",
    42,
    true,
    [],
    {},
    { version: 2, widgets: [{ id: "grocery", enabled: false }] },
    { version: 1, widgets: "nope" },
    { version: 1, widgets: { id: "grocery" } },
    JSON.stringify({ version: 1 }),
  ];
  for (const raw of garbage) {
    assert.deepEqual(parseDashboardLayout(raw), DEFAULT_DASHBOARD_LAYOUT, JSON.stringify(raw));
  }
});

test("parse: the default is returned as a fresh copy", () => {
  const a = parseDashboardLayout(null);
  a.widgets[0].enabled = false;
  assert.equal(DEFAULT_DASHBOARD_LAYOUT.widgets[0].enabled, true);
  assert.equal(parseDashboardLayout(null).widgets[0].enabled, true);
});

test("parse: junk entries inside widgets are skipped", () => {
  const out = parseDashboardLayout({
    version: 1,
    widgets: [null, 7, "grocery", { id: 5 }, { id: "recipes", enabled: false }],
  });
  assert.deepEqual(out.widgets.find((w) => w.id === "recipes"), { id: "recipes", enabled: false });
  assert.equal(out.widgets.length, 7);
});

test("parse: a non-boolean enabled falls back to the widget's default", () => {
  const out = parseDashboardLayout({ version: 1, widgets: [{ id: "grocery", enabled: "no" }] });
  assert.deepEqual(out.widgets.find((w) => w.id === "grocery"), { id: "grocery", enabled: true });
});

// --- parseDashboardLayout: shape repair -------------------------------

test("parse: unknown ids are dropped", () => {
  const out = parseDashboardLayout({
    version: 1,
    widgets: [
      { id: "weather", enabled: true },
      { id: "grocery", enabled: false },
    ],
  });
  assert.ok(!ids(out).includes("weather" as never));
  assert.deepEqual(ids(out), ["todayMeals", "habits", "chores", "goals", "inventory", "grocery", "recipes"]);
  assert.equal(out.widgets.find((w) => w.id === "grocery")?.enabled, false);
  assert.equal(out.widgets.length, 7);
});

test("parse: duplicates are removed, first one wins", () => {
  const out = parseDashboardLayout({
    version: 1,
    widgets: [
      { id: "grocery", enabled: false },
      { id: "grocery", enabled: true },
    ],
  });
  assert.equal(ids(out).filter((id) => id === "grocery").length, 1);
  assert.deepEqual(out.widgets.find((w) => w.id === "grocery"), { id: "grocery", enabled: false });
});

test("parse: an id added later shows up for an old stored row", () => {
  const old = {
    version: 1,
    widgets: [
      { id: "recipes", enabled: false },
      { id: "todayMeals", enabled: true },
    ],
  };
  const out = parseDashboardLayout(old);
  assert.deepEqual(ids(out), ["recipes", "todayMeals", "habits", "chores", "goals", "inventory", "grocery"]);
  assert.deepEqual(out.widgets[0], { id: "recipes", enabled: false });
  assert.equal(out.widgets[5].enabled, DASHBOARD_WIDGETS.inventory.defaultEnabled);
  assert.equal(out.widgets[6].enabled, DASHBOARD_WIDGETS.grocery.defaultEnabled);
});

test("parse: a saved four-widget layout gains habits, chores and goals after todayMeals", () => {
  const out = parseDashboardLayout(
    layoutOf([
      { id: "todayMeals", enabled: true },
      { id: "inventory", enabled: false },
      { id: "grocery", enabled: true },
      { id: "recipes", enabled: true },
    ]),
  );
  assert.deepEqual(ids(out), ["todayMeals", "habits", "chores", "goals", "inventory", "grocery", "recipes"]);
  assert.deepEqual(out.widgets[1], { id: "habits", enabled: true });
  assert.deepEqual(out.widgets[2], { id: "chores", enabled: true });
  assert.deepEqual(out.widgets[3], { id: "goals", enabled: true });
  assert.equal(out.widgets[4].enabled, false);
});

test("parse: goals lands right after todayMeals even when todayMeals was moved last", () => {
  const out = parseDashboardLayout(
    layoutOf([
      { id: "inventory", enabled: true },
      { id: "grocery", enabled: true },
      { id: "recipes", enabled: true },
      { id: "todayMeals", enabled: true },
    ]),
  );
  assert.deepEqual(ids(out), ["inventory", "grocery", "recipes", "todayMeals", "habits", "chores", "goals"]);
});

test("parse: with todayMeals and goals both missing they come back in registry order", () => {
  const out = parseDashboardLayout(
    layoutOf([
      { id: "inventory", enabled: true },
      { id: "grocery", enabled: false },
      { id: "recipes", enabled: true },
    ]),
  );
  assert.deepEqual(ids(out), ["todayMeals", "habits", "chores", "goals", "inventory", "grocery", "recipes"]);
  assert.equal(out.widgets[5].enabled, false);
});

test("parse: accepts a JSON string as well as an object", () => {
  const stored = layoutOf([
    { id: "recipes", enabled: true },
    { id: "grocery", enabled: false },
    { id: "inventory", enabled: true },
    { id: "todayMeals", enabled: true },
    { id: "habits", enabled: true },
    { id: "chores", enabled: true },
    { id: "goals", enabled: true },
  ]);
  assert.deepEqual(parseDashboardLayout(JSON.stringify(stored)), stored);
  assert.deepEqual(parseDashboardLayout(stored), stored);
});

// --- serialize --------------------------------------------------------

test("serialize/parse round trip keeps order and switches", () => {
  const layout = reorderWidgets(toggleWidget(DEFAULT_DASHBOARD_LAYOUT, "inventory"), ["recipes", "todayMeals"]);
  const text = serializeDashboardLayout(layout);
  assert.equal(typeof text, "string");
  assert.deepEqual(parseDashboardLayout(text), layout);
});

// --- toggle -----------------------------------------------------------

test("toggle: flips one widget, leaves the rest, does not mutate", () => {
  const before = JSON.stringify(DEFAULT_DASHBOARD_LAYOUT);
  const off = toggleWidget(DEFAULT_DASHBOARD_LAYOUT, "grocery");
  assert.equal(off.widgets.find((w) => w.id === "grocery")?.enabled, false);
  assert.equal(off.widgets.filter((w) => w.enabled).length, 6);
  assert.equal(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT), before);
  assert.deepEqual(toggleWidget(off, "grocery"), DEFAULT_DASHBOARD_LAYOUT);
});

// --- reorder ----------------------------------------------------------

test("reorderWidgets follows the given ids and keeps each widget's settings", () => {
  const order = ids(DEFAULT_DASHBOARD_LAYOUT);
  const reversed = [...order].reverse();
  const layout = reorderWidgets(DEFAULT_DASHBOARD_LAYOUT, reversed);
  assert.deepEqual(layout.widgets.map((w) => w.id), reversed);
  assert.deepEqual(
    layout.widgets.map((w) => w.enabled),
    DEFAULT_DASHBOARD_LAYOUT.widgets.map((w) => w.enabled).reverse(),
  );
});

test("reorderWidgets ignores unknown ids and keeps widgets the list forgot", () => {
  const order = ids(DEFAULT_DASHBOARD_LAYOUT);
  const layout = reorderWidgets(DEFAULT_DASHBOARD_LAYOUT, ["nope", order[2]]);
  assert.equal(layout.widgets.length, order.length);
  assert.equal(layout.widgets[0].id, order[2]);
  assert.deepEqual(layout.widgets.slice(1).map((w) => w.id), order.filter((id) => id !== order[2]));
});

test("reorder: keeps each widget's own switch", () => {
  const start = toggleWidget(DEFAULT_DASHBOARD_LAYOUT, "inventory");
  const moved = reorderWidgets(start, ["inventory", ...ids(start).filter((id) => id !== "inventory")]);
  assert.deepEqual(moved.widgets[0], { id: "inventory", enabled: false });
});

// --- widgetSpans ------------------------------------------------------

test("spans: all on, the two halves pair", () => {
  assert.deepEqual(widgetSpans(DEFAULT_DASHBOARD_LAYOUT), [
    { id: "todayMeals", span: "full" },
    { id: "habits", span: "full" },
    { id: "chores", span: "full" },
    { id: "goals", span: "full" },
    { id: "inventory", span: "half" },
    { id: "grocery", span: "half" },
    { id: "recipes", span: "full" },
  ]);
});

test("spans: Inventory off, Grocery goes full", () => {
  const spans = widgetSpans(toggleWidget(DEFAULT_DASHBOARD_LAYOUT, "inventory"));
  assert.deepEqual(spans, [
    { id: "todayMeals", span: "full" },
    { id: "habits", span: "full" },
    { id: "chores", span: "full" },
    { id: "goals", span: "full" },
    { id: "grocery", span: "full" },
    { id: "recipes", span: "full" },
  ]);
});

test("spans: Grocery off, Inventory goes full", () => {
  const spans = widgetSpans(toggleWidget(DEFAULT_DASHBOARD_LAYOUT, "grocery"));
  assert.deepEqual(spans, [
    { id: "todayMeals", span: "full" },
    { id: "habits", span: "full" },
    { id: "chores", span: "full" },
    { id: "goals", span: "full" },
    { id: "inventory", span: "full" },
    { id: "recipes", span: "full" },
  ]);
});

test("spans: both halves moved apart both go full (greedy, no partner beside them)", () => {
  const apart = layoutOf([
    { id: "inventory", enabled: true },
    { id: "todayMeals", enabled: true },
    { id: "grocery", enabled: true },
    { id: "recipes", enabled: true },
  ]);
  assert.deepEqual(
    widgetSpans(apart).map((s) => s.span),
    ["full", "full", "full", "full"],
  );
});

test("spans: a disabled full widget between two halves lets them pair", () => {
  const layout = layoutOf([
    { id: "inventory", enabled: true },
    { id: "todayMeals", enabled: false },
    { id: "grocery", enabled: true },
    { id: "recipes", enabled: true },
  ]);
  assert.deepEqual(widgetSpans(layout), [
    { id: "inventory", span: "half" },
    { id: "grocery", span: "half" },
    { id: "recipes", span: "full" },
  ]);
});

test("spans: everything off gives an empty list", () => {
  const off = layoutOf(DEFAULT_DASHBOARD_LAYOUT.widgets.map((w) => ({ ...w, enabled: false })));
  assert.deepEqual(widgetSpans(off), []);
});
