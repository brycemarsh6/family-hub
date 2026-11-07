import { test } from "node:test";
import assert from "node:assert/strict";
import { fingerprintIngredients } from "@/lib/nutritionFingerprint";
import {
  toRecipeDetail,
  toRecipeListItem,
  toShareUrl,
  toShortfall,
  toWriteFailure,
  totalMinutes,
} from "./serializeRecipes";

const row = {
  id: "r1",
  title: "Soup",
  rating: 4,
  lastCookedAt: new Date("2026-10-09T12:00:00Z"),
  servings: "4",
  prepTime: "10 min",
  cookTime: "1 hr",
  shareToken: "tok",
  tags: [{ tag: { id: "t1", name: "Dinner" } }],
  cookbooks: [{ cookbook: { id: "c1", title: "Book" } }],
  ingredients: "1 onion\n\n2 carrots ",
  steps: "Chop\nCook",
  notes: null,
  sourceUrl: null,
  nutritionCalories: 300,
  nutritionProteinG: 10,
  nutritionCarbsG: 40,
  nutritionFatG: 5,
  nutritionServings: 4,
  nutritionFingerprint: fingerprintIngredients("1 onion\n\n2 carrots "),
  // Columns that must never reach the wire:
  updatedAt: new Date(),
};

test("toRecipeListItem: exact key set, ISO date, never the token", () => {
  const out = toRecipeListItem(row);
  assert.deepEqual(Object.keys(out).sort(), [
    "cookTime", "cookbooks", "id", "lastCookedAt", "prepTime", "rating", "servings",
    "shared", "tags", "title", "totalMinutes",
  ]);
  assert.equal(out.lastCookedAt, "2026-10-09T12:00:00.000Z");
  assert.equal(out.totalMinutes, 70);
  assert.equal(out.shared, true);
  assert.deepEqual(out.tags, [{ id: "t1", name: "Dinner" }]);
  assert.ok(!JSON.stringify(out).includes("tok"));
});

test("totalMinutes: sums what parses, null when neither does", () => {
  assert.equal(totalMinutes("10 min", null), 10);
  assert.equal(totalMinutes(null, "a while"), null);
  assert.equal(totalMinutes("nope", "45 min"), 45);
});

test("toRecipeDetail: lines as arrays, absolute share URL, nutrition and its outdated flag", () => {
  const out = toRecipeDetail(row, "https://x.test");
  assert.deepEqual(out.ingredients, ["1 onion", "2 carrots"]);
  assert.deepEqual(out.steps, ["Chop", "Cook"]);
  assert.equal(out.shareUrl, "https://x.test/share/recipe/tok");
  assert.deepEqual(out.nutrition, {
    calories: 300, proteinG: 10, carbsG: 40, fatG: 5, perServings: 4, isEstimate: true, outdated: false,
  });
  const stale = toRecipeDetail({ ...row, ingredients: "changed" }, "https://x.test");
  assert.equal(stale.nutrition?.outdated, true);
  const none = toRecipeDetail({ ...row, nutritionCalories: null, shareToken: null }, "https://x.test");
  assert.equal(none.nutrition, null);
  assert.equal(none.shareUrl, null);
  assert.ok(!("shareToken" in out));
});

test("toShareUrl: null without a token", () => {
  assert.equal(toShareUrl("https://x.test", null), null);
});

test("toShortfall: three piles; unreadable gives empty lists", () => {
  const s = (status: "missing" | "in-pantry" | "on-list", name: string) => ({
    line: `1 ${name}`, name, status, matchedName: status === "in-pantry" ? "Big " + name : null,
  });
  const out = toShortfall("r1", [s("missing", "a"), s("in-pantry", "b"), s("on-list", "c")]);
  assert.equal(out.readable, true);
  assert.deepEqual(out.have, [{ line: "1 b", name: "b", matchedName: "Big b" }]);
  assert.deepEqual(out.missing, [{ line: "1 a", name: "a" }]);
  assert.deepEqual(out.onList, [{ line: "1 c", name: "c" }]);
  assert.deepEqual(toShortfall("r1", null), { recipeId: "r1", readable: false, have: [], missing: [], onList: [] });
});

test("toWriteFailure: a missing thing is 404, anything else 400", () => {
  assert.equal(toWriteFailure("That tag no longer exists.").status, 404);
  assert.equal(toWriteFailure("Ratings run 1 to 5.").status, 400);
});
