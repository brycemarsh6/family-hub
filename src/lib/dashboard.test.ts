// Real unit tests (node:test, zero new dependencies) for the pure logic
// behind the dashboard's four tiles. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { todaysMeals, storeBreakdown, urgentLowItems } from "./dashboard";
import type { MealPlanView } from "./types";

// --- todaysMeals -----------------------------------------------------

test("todaysMeals: no plans at all returns null", () => {
  const today = new Date(2026, 7, 4); // Tue Aug 4, 2026
  assert.equal(todaysMeals([], today), null);
});

test("todaysMeals: plans exist but none cover today's week returns null", () => {
  const plans: MealPlanView[] = [
    { id: "p1", weekStart: new Date(2026, 6, 26), entries: [] }, // a different week
  ];
  const today = new Date(2026, 7, 4);
  assert.equal(todaysMeals(plans, today), null);
});

test("todaysMeals: the week is covered but the day has nothing filled — 4 null slots", () => {
  const weekStart = new Date(2026, 7, 2); // Sun Aug 2, 2026
  const plans: MealPlanView[] = [{ id: "p1", weekStart, entries: [] }];
  const today = new Date(2026, 7, 4); // Tue Aug 4 — dayOffset 2

  const result = todaysMeals(plans, today);
  assert.ok(result);
  assert.equal(result.length, 4);
  assert.deepEqual(
    result.map((s) => s.slot),
    ["Breakfast", "Lunch", "Dinner", "Snacks"],
  );
  for (const slot of result) {
    assert.equal(slot.title, null);
    assert.equal(slot.recipeId, null);
  }
});

test("todaysMeals: a filled Dinner shows up only on the right day's offset", () => {
  const weekStart = new Date(2026, 7, 2); // Sun Aug 2, 2026
  const plans: MealPlanView[] = [
    {
      id: "p1",
      weekStart,
      entries: [
        // dayOffset 2 = Tuesday Aug 4 — today, below.
        { id: "e1", dayOffset: 2, slot: "Dinner", title: "Tacos", recipeId: "r1" },
        // A different day's dinner must never leak onto today's slot.
        { id: "e2", dayOffset: 3, slot: "Dinner", title: "Soup", recipeId: null },
      ],
    },
  ];
  const today = new Date(2026, 7, 4); // Tue Aug 4, 2026

  const result = todaysMeals(plans, today);
  assert.ok(result);
  const dinner = result.find((s) => s.slot === "Dinner");
  assert.deepEqual(dinner, { slot: "Dinner", title: "Tacos", recipeId: "r1" });
  const others = result.filter((s) => s.slot !== "Dinner");
  for (const slot of others) {
    assert.equal(slot.title, null);
  }
});

test("todaysMeals: Sunday boundary — today is the plan's own weekStart, dayOffset 0", () => {
  const weekStart = new Date(2026, 7, 2); // Sunday
  const plans: MealPlanView[] = [
    {
      id: "p1",
      weekStart,
      entries: [{ id: "e1", dayOffset: 0, slot: "Breakfast", title: "Pancakes", recipeId: null }],
    },
  ];
  const result = todaysMeals(plans, weekStart);
  assert.ok(result);
  assert.equal(result.find((s) => s.slot === "Breakfast")?.title, "Pancakes");
});

test("todaysMeals: Saturday boundary — dayOffset 6", () => {
  const weekStart = new Date(2026, 7, 2); // Sunday Aug 2
  const saturday = new Date(2026, 7, 8); // Saturday Aug 8
  const plans: MealPlanView[] = [
    {
      id: "p1",
      weekStart,
      entries: [{ id: "e1", dayOffset: 6, slot: "Snacks", title: "Popcorn", recipeId: null }],
    },
  ];
  const result = todaysMeals(plans, saturday);
  assert.ok(result);
  assert.equal(result.find((s) => s.slot === "Snacks")?.title, "Popcorn");
});

test("todaysMeals: DST week (Nov 1, 2026 fall-back) — Tue Nov 3 is dayOffset 2", () => {
  const weekStart = new Date(2026, 10, 1); // Sunday Nov 1, 2026 — the real US DST date
  const today = new Date(2026, 10, 3); // Tuesday Nov 3, 2026
  const plans: MealPlanView[] = [
    {
      id: "p1",
      weekStart,
      entries: [
        { id: "e1", dayOffset: 2, slot: "Lunch", title: "Leftovers", recipeId: null },
        { id: "e2", dayOffset: 1, slot: "Lunch", title: "Should not show", recipeId: null },
      ],
    },
  ];
  const result = todaysMeals(plans, today);
  assert.ok(result);
  assert.equal(result.find((s) => s.slot === "Lunch")?.title, "Leftovers");
});

// --- storeBreakdown ----------------------------------------------------

test("storeBreakdown: empty list returns an empty array", () => {
  assert.deepEqual(storeBreakdown([]), []);
});

test("storeBreakdown: mixed stores plus nulls — Unassigned label, no zero-count entries", () => {
  const items = [
    { store: "Costco" },
    { store: "Costco" },
    { store: "Walmart" },
    { store: null },
  ];
  const result = storeBreakdown(items);
  assert.deepEqual(result, [
    { label: "Costco", count: 2 },
    { label: "Walmart", count: 1 },
    { label: "Unassigned", count: 1 },
  ]);
  // No entry for a store that has zero items on the list (e.g. Target,
  // Amazon, Maceys, Other — none appear here at all).
  assert.ok(!result.some((r) => r.label === "Target"));
});

test("storeBreakdown: sorted by count descending", () => {
  const items = [
    { store: "Target" },
    { store: "Costco" },
    { store: "Costco" },
    { store: "Costco" },
  ];
  const result = storeBreakdown(items);
  assert.deepEqual(
    result.map((r) => r.label),
    ["Costco", "Target"],
  );
});

test("storeBreakdown: equal counts break ties by STORES order", () => {
  // STORES = ["Walmart", "Costco", "Amazon", "Target", "Maceys", "Other"]
  const items = [{ store: "Target" }, { store: "Walmart" }, { store: "Costco" }];
  const result = storeBreakdown(items);
  assert.deepEqual(
    result.map((r) => r.label),
    ["Walmart", "Costco", "Target"],
  );
});

test("storeBreakdown: Unassigned sorts last even when it's the largest group", () => {
  const items = [
    { store: null },
    { store: null },
    { store: null },
    { store: "Walmart" },
  ];
  const result = storeBreakdown(items);
  assert.deepEqual(result, [
    { label: "Walmart", count: 1 },
    { label: "Unassigned", count: 3 },
  ]);
});

// --- urgentLowItems ------------------------------------------------------

test("urgentLowItems: fewer items than max returns them all, no 'more'", () => {
  const result = urgentLowItems([{ name: "Milk", quantity: 1 }], 3);
  assert.deepEqual(result, { names: ["Milk"], more: 0 });
});

test("urgentLowItems: Out (quantity 0) beats quantity 1 regardless of input order", () => {
  const result = urgentLowItems(
    [
      { name: "Eggs", quantity: 1 },
      { name: "Bread", quantity: 0 },
    ],
    3,
  );
  assert.deepEqual(result.names, ["Bread", "Eggs"]);
});

test("urgentLowItems: ties on quantity break by name", () => {
  const result = urgentLowItems(
    [
      { name: "Zucchini", quantity: 1 },
      { name: "Apples", quantity: 1 },
    ],
    3,
  );
  assert.deepEqual(result.names, ["Apples", "Zucchini"]);
});

test("urgentLowItems: 5 items with max 3 returns the top 3 and more: 2", () => {
  const items = [
    { name: "Milk", quantity: 0 },
    { name: "Eggs", quantity: 1 },
    { name: "Grapes", quantity: 1 },
    { name: "Butter", quantity: 2 },
    { name: "Cheese", quantity: 3 },
  ];
  const result = urgentLowItems(items, 3);
  assert.deepEqual(result, { names: ["Milk", "Eggs", "Grapes"], more: 2 });
});
