import { test } from "node:test";
import assert from "node:assert/strict";
import { toGroceryNeeds, toMealCell, toWeek, weekForDate } from "./serializeMealPlan";

test("weekForDate: any day maps to its Sunday, offset and Denver midnight", () => {
  const w = weekForDate({ year: 2030, month: 7, day: 10 }); // a Wednesday
  assert.deepEqual(w.sunday, { year: 2030, month: 7, day: 7 });
  assert.equal(w.dayOffset, 3);
  assert.equal(w.instant.toISOString(), "2030-07-07T06:00:00.000Z"); // MDT
  assert.equal(weekForDate({ year: 2030, month: 7, day: 7 }).dayOffset, 0);
  assert.equal(weekForDate({ year: 2030, month: 7, day: 13 }).dayOffset, 6);
});

test("weekForDate: the DST week of 2030-11-03 stores Denver midnight, not 24 h arithmetic", () => {
  // Sun Nov 3 2030 is the fall-back day itself: midnight is still MDT (06:00Z).
  const w = weekForDate({ year: 2030, month: 11, day: 5 });
  assert.deepEqual(w.sunday, { year: 2030, month: 11, day: 3 });
  assert.equal(w.instant.toISOString(), "2030-11-03T06:00:00.000Z");
  // The following Sunday is MST (07:00Z).
  assert.equal(weekForDate({ year: 2030, month: 11, day: 10 }).instant.toISOString(), "2030-11-10T07:00:00.000Z");
  assert.equal(weekForDate({ year: 2030, month: 11, day: 9 }).dayOffset, 6);
});

test("toMealCell hides a stale recipe title when there is no recipe", () => {
  assert.deepEqual(toMealCell({ title: "Soup", recipeId: null }, "x"), { title: "Soup", recipeId: null, recipeTitle: null });
});

test("toWeek: seven days, four slots each, empties null, ignores unknown slots", () => {
  const out = toWeek(
    { year: 2030, month: 7, day: 7 },
    "p1",
    [
      { dayOffset: 2, slot: "Dinner", title: "Tacos", recipeId: "r1" },
      { dayOffset: 2, slot: "Brunch", title: "Odd", recipeId: null },
    ],
    new Map([["r1", "Taco recipe"]]),
  );
  assert.equal(out.weekOf, "2030-07-07");
  assert.equal(out.planId, "p1");
  assert.equal(out.days.length, 7);
  assert.equal(out.days[2].date, "2030-07-09");
  assert.deepEqual(Object.keys(out.days[0].meals), ["Breakfast", "Lunch", "Dinner", "Snacks"]);
  assert.deepEqual(out.days[2].meals.Dinner, { title: "Tacos", recipeId: "r1", recipeTitle: "Taco recipe" });
  assert.equal(out.days[2].meals.Lunch, null);
  assert.equal(toWeek({ year: 2030, month: 7, day: 7 }, null, [], new Map()).planId, null);
});

test("toGroceryNeeds: dedupes by lower-cased name and keeps every source", () => {
  const out = toGroceryNeeds(
    [
      { line: "2 cups Milk", name: "Milk", status: "missing" },
      { line: "1 cup milk", name: "milk", status: "missing" },
      { line: "1 cup milk", name: "milk", status: "missing" },
      { line: "salt", name: "Salt", status: "in-pantry" },
      { line: "salt to taste", name: "salt", status: "in-pantry" },
      { line: "eggs", name: "Eggs", status: "on-list" },
    ],
    [
      { recipeId: "a", lines: ["2 cups Milk", "salt", "eggs"] },
      { recipeId: "b", lines: ["1 cup milk", "salt to taste"] },
    ],
  );
  assert.deepEqual(out.missing, [
    { name: "Milk", from: [{ recipeId: "a", line: "2 cups Milk" }, { recipeId: "b", line: "1 cup milk" }] },
  ]);
  assert.deepEqual(out.have, ["Salt"]);
  assert.deepEqual(out.onList, ["Eggs"]);
});
