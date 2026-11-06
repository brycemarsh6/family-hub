// Pins dashboardPicker.ts: Showing keeps picked order, Not showing keeps the
// given order, a toggle adds at the end or removes, and a drag reorders widgets
// without losing any (decisions 137, 140).

import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DASHBOARD_LAYOUT } from "./dashboardLayout";
import { reorderWidgets, splitPicks, togglePick } from "./dashboardPicker";

const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

test("splitPicks puts picked items first in picked order and the rest in the given order", () => {
  const { showing, notShowing } = splitPicks(items, ["c", "a"]);
  assert.deepEqual(showing.map((i) => i.id), ["c", "a"]);
  assert.deepEqual(notShowing.map((i) => i.id), ["b", "d"]);
});

test("splitPicks with nothing picked shows nothing and lists everything under Not showing", () => {
  const { showing, notShowing } = splitPicks(items, []);
  assert.deepEqual(showing, []);
  assert.equal(notShowing.length, 4);
});

test("splitPicks leaves out a pick that is no longer pickable", () => {
  const { showing, notShowing } = splitPicks(items, ["gone", "b"]);
  assert.deepEqual(showing.map((i) => i.id), ["b"]);
  assert.deepEqual(notShowing.map((i) => i.id), ["a", "c", "d"]);
});

test("togglePick adds an unpicked item at the end", () => {
  assert.deepEqual(togglePick(items, ["c"], "a"), ["c", "a"]);
});

test("togglePick removes a picked item and keeps the others in order", () => {
  assert.deepEqual(togglePick(items, ["c", "a", "b"], "a"), ["c", "b"]);
  assert.deepEqual(togglePick(items, ["a"], "a"), []);
});

test("togglePick drops picks that are no longer pickable", () => {
  assert.deepEqual(togglePick(items, ["gone", "a"], "b"), ["a", "b"]);
});

test("reorderWidgets follows the given ids and keeps each widget's settings", () => {
  const ids = DEFAULT_DASHBOARD_LAYOUT.widgets.map((w) => w.id);
  const reversed = [...ids].reverse();
  const layout = reorderWidgets(DEFAULT_DASHBOARD_LAYOUT, reversed);
  assert.deepEqual(layout.widgets.map((w) => w.id), reversed);
  assert.deepEqual(
    layout.widgets.map((w) => w.enabled),
    DEFAULT_DASHBOARD_LAYOUT.widgets.map((w) => w.enabled).reverse(),
  );
});

test("reorderWidgets ignores unknown ids and keeps widgets the list forgot", () => {
  const ids = DEFAULT_DASHBOARD_LAYOUT.widgets.map((w) => w.id);
  const layout = reorderWidgets(DEFAULT_DASHBOARD_LAYOUT, ["nope", ids[2]]);
  assert.equal(layout.widgets.length, ids.length);
  assert.equal(layout.widgets[0].id, ids[2]);
  assert.deepEqual(layout.widgets.slice(1).map((w) => w.id), ids.filter((id) => id !== ids[2]));
});
