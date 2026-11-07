// Pins the v1 to v2 upgrade inside parseDashboardLayout: a saved v1 layout
// (an id and an on/off switch per widget) must open looking the same as it
// did, same widgets, same order, same widths. The cases mirror the old
// widgetSpans tests: every v1 "full" widget becomes its default size, a pair
// of "half" widgets (inventory, grocery) become Small, a lone half widget,
// which v1 drew full width, becomes Medium. Siblings: dashboardLayout.test.ts
// (the default, v2 parsing, edits) and dashboardLayoutItems.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DASHBOARD_LAYOUT, parseDashboardLayout, serializeDashboardLayout, type DashboardLayout } from "./dashboardLayout";

type V1 = { id: string; enabled?: unknown; items?: unknown };
const v1 = (widgets: unknown): unknown => ({ version: 1, widgets });
const allOn = (): V1[] =>
  ["todayMeals", "habits", "chores", "goals", "inventory", "grocery", "recipes"].map((id) => ({ id, enabled: true }));
const off = (...ids: string[]): V1[] => allOn().map((w) => (ids.includes(w.id) ? { ...w, enabled: false } : w));
const uids = (layout: DashboardLayout) => layout.widgets.map((w) => w.uid);
const sizes = (layout: DashboardLayout) => layout.widgets.map((w) => `${w.kind}:${w.size}`);

test("v1 default (everything on) upgrades to exactly the v2 default", () => {
  assert.deepEqual(parseDashboardLayout(v1(allOn())), DEFAULT_DASHBOARD_LAYOUT);
});

test("v1: all on, the two halves pair into Small and the full widgets keep their widths", () => {
  assert.deepEqual(sizes(parseDashboardLayout(v1(allOn()))), [
    "todayMeals:m", "habits:l", "chores:l", "goals:m", "inventory:s", "grocery:s", "recipes:m",
  ]);
});

test("v1: Inventory off, Grocery went full, so it becomes Medium", () => {
  assert.deepEqual(sizes(parseDashboardLayout(v1(off("inventory")))), [
    "todayMeals:m", "habits:l", "chores:l", "goals:m", "grocery:m", "recipes:m",
  ]);
});

test("v1: Grocery off, Inventory went full, so it becomes Medium", () => {
  assert.deepEqual(sizes(parseDashboardLayout(v1(off("grocery")))), [
    "todayMeals:m", "habits:l", "chores:l", "goals:m", "inventory:m", "recipes:m",
  ]);
});

test("v1: both halves off, they are gone and nothing else changes", () => {
  const out = parseDashboardLayout(v1(off("inventory", "grocery")));
  assert.deepEqual(sizes(out), ["todayMeals:m", "habits:l", "chores:l", "goals:m", "recipes:m"]);
});

test("v1: halves moved apart both went full, so both become Medium", () => {
  const apart = [
    { id: "inventory", enabled: true },
    { id: "todayMeals", enabled: true },
    { id: "grocery", enabled: true },
    { id: "recipes", enabled: true },
  ];
  const out = parseDashboardLayout(v1(apart));
  assert.deepEqual(sizes(out).filter((s) => s.startsWith("inventory") || s.startsWith("grocery")), ["inventory:m", "grocery:m"]);
});

test("v1: a switched-off full widget between two halves lets them pair, as v1 did", () => {
  const layout = [
    { id: "inventory", enabled: true },
    { id: "todayMeals", enabled: false },
    { id: "grocery", enabled: true },
    { id: "recipes", enabled: true },
    { id: "habits", enabled: false },
    { id: "chores", enabled: false },
    { id: "goals", enabled: false },
  ];
  const out = parseDashboardLayout(v1(layout));
  assert.deepEqual(sizes(out).slice(0, 2), ["inventory:s", "grocery:s"]);
  assert.ok(!uids(out).includes("todayMeals"));
});

test("v1: everything off upgrades to an empty dashboard", () => {
  const out = parseDashboardLayout(v1(allOn().map((w) => ({ ...w, enabled: false }))));
  assert.deepEqual(out, { version: 2, widgets: [] });
});

test("v1: reordered keeps the person's order, uid is the kind", () => {
  const reordered = [
    { id: "recipes", enabled: true },
    { id: "grocery", enabled: false },
    { id: "inventory", enabled: true },
    { id: "todayMeals", enabled: true },
    { id: "habits", enabled: true },
    { id: "chores", enabled: true },
    { id: "goals", enabled: true },
  ];
  const out = parseDashboardLayout(JSON.stringify(v1(reordered)));
  assert.deepEqual(uids(out), ["recipes", "inventory", "todayMeals", "habits", "chores", "goals"]);
  assert.deepEqual(sizes(out), ["recipes:m", "inventory:m", "todayMeals:m", "habits:l", "chores:l", "goals:m"]);
  assert.ok(out.widgets.every((w) => w.uid === w.kind));
});

test("v1: picks are kept on habits and goals, dropped elsewhere and with a switched-off widget", () => {
  const out = parseDashboardLayout(
    v1([
      { id: "habits", enabled: true, items: ["h2", "h1", "h2", ""] },
      { id: "goals", enabled: false, items: ["g1"] },
      { id: "recipes", enabled: true, items: ["x"] },
    ]),
  );
  assert.deepEqual(out.widgets.find((w) => w.kind === "habits")?.items, ["h2", "h1"]);
  assert.ok(!out.widgets.some((w) => w.kind === "goals"));
  assert.ok(!("items" in out.widgets.find((w) => w.kind === "recipes")!));
});

test("v1: unknown ids are dropped and duplicates removed, first wins", () => {
  const out = parseDashboardLayout(
    v1([
      { id: "weather", enabled: true },
      { id: "grocery", enabled: false },
      { id: "grocery", enabled: true },
    ]),
  );
  assert.ok(!uids(out).includes("weather"));
  assert.ok(!uids(out).includes("grocery"));
  assert.equal(out.widgets.length, 6);
});

test("v1: junk entries are skipped and a non-boolean enabled counts as on", () => {
  const out = parseDashboardLayout(v1([null, 7, "grocery", { id: 5 }, { id: "recipes", enabled: false }, { id: "grocery", enabled: "no" }]));
  assert.ok(!uids(out).includes("recipes"));
  assert.ok(uids(out).includes("grocery"));
  assert.equal(out.widgets.length, 6);
});

test("v1: an id added later shows up for an old stored row, in registry position", () => {
  const out = parseDashboardLayout(v1([{ id: "recipes", enabled: false }, { id: "todayMeals", enabled: true }]));
  assert.deepEqual(uids(out), ["todayMeals", "habits", "chores", "goals", "inventory", "grocery"]);
  assert.deepEqual(sizes(out).slice(4), ["inventory:s", "grocery:s"]);
});

test("v1: a saved four-widget layout gains habits, chores and goals after todayMeals", () => {
  const out = parseDashboardLayout(
    v1([
      { id: "todayMeals", enabled: true },
      { id: "inventory", enabled: false },
      { id: "grocery", enabled: true },
      { id: "recipes", enabled: true },
    ]),
  );
  assert.deepEqual(uids(out), ["todayMeals", "habits", "chores", "goals", "grocery", "recipes"]);
  assert.equal(out.widgets.find((w) => w.kind === "grocery")?.size, "m");
});

test("v1: goals lands right after todayMeals even when todayMeals was moved last", () => {
  const out = parseDashboardLayout(
    v1([
      { id: "inventory", enabled: true },
      { id: "grocery", enabled: true },
      { id: "recipes", enabled: true },
      { id: "todayMeals", enabled: true },
    ]),
  );
  assert.deepEqual(uids(out), ["inventory", "grocery", "recipes", "todayMeals", "habits", "chores", "goals"]);
});

test("v1: with todayMeals and goals both missing they come back in registry order", () => {
  const out = parseDashboardLayout(
    v1([
      { id: "inventory", enabled: true },
      { id: "grocery", enabled: false },
      { id: "recipes", enabled: true },
    ]),
  );
  assert.deepEqual(uids(out), ["todayMeals", "habits", "chores", "goals", "inventory", "recipes"]);
  assert.equal(out.widgets.find((w) => w.kind === "inventory")?.size, "m");
});

test("v1 upgrade is stable: serialize then parse gives the same v2 layout", () => {
  const once = parseDashboardLayout(v1(off("inventory")));
  assert.deepEqual(parseDashboardLayout(serializeDashboardLayout(once)), once);
});
