// Pins dashboardPicks.ts: foreign picks are dropped, picked order is kept, the
// wall tablet's layout leaves out the two habit tiles, Showing keeps picked
// order and a toggle adds at the end or removes (decisions 138, 132, 136, 137).

import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DASHBOARD_LAYOUT, setWidgetItems } from "./dashboardLayout";
import { keepOwnPicks, layoutForViewer, picksOf, splitPicks, togglePick } from "./dashboardPicks";

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

// --- picker ----------------------------------------------------------

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
