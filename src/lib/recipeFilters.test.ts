// Real unit tests (node:test, zero new dependencies) for the filter/sort
// composition behind C4's filter bar. Run with `npm test`.
//
// The fixture below is the one C4 was verified against by hand in the
// running app: four recipes chosen so that the plan's own worked example
// ("Dinner + Under 30 + 4 stars" narrowing to exactly one recipe) is
// decisive rather than coincidental. Keeping it here means the next change
// to filtering or sorting has to keep that example true.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyRecipeFilters,
  DEFAULT_RECIPE_FILTERS,
  type FilterableRecipe,
  type RecipeFilterState,
} from "./recipeFilters";

const DINNER = "tag-dinner";
const BREAKFAST = "tag-breakfast";

/** A: Dinner, 25 min total, 4 stars, and the only one ever cooked. */
const A: FilterableRecipe = {
  id: "a",
  title: "Almond Chicken Skillet",
  ingredients: "chicken thighs\nalmonds\nolive oil",
  tagIds: [DINNER],
  rating: 4,
  lastCookedAt: new Date("2026-08-01T12:00:00Z"),
  prepTime: "10 min",
  cookTime: "15 min",
};

/** B: Dinner, 75 min total — the one the Under 30 filter has to drop. */
const B: FilterableRecipe = {
  id: "b",
  title: "Braised Short Ribs",
  ingredients: "short ribs\nred wine\ncarrots",
  tagIds: [DINNER],
  rating: 4,
  lastCookedAt: null,
  prepTime: "15 min",
  cookTime: "1 hr",
};

/** C: the only Breakfast-tagged one, and the only title with "Breakfast"
 * in it — so a search for that word has exactly one right answer. */
const C: FilterableRecipe = {
  id: "c",
  title: "Classic Breakfast Hash",
  ingredients: "potatoes\nonion\npaprika",
  tagIds: [BREAKFAST],
  rating: 4,
  lastCookedAt: null,
  prepTime: "5 min",
  cookTime: "10 min",
};

/** D: Dinner and Under 30 like A, but 2 stars — what makes the rating step
 * of the worked example do real work. */
const D: FilterableRecipe = {
  id: "d",
  title: "Deviled Eggs",
  ingredients: "eggs\nmayonnaise\nmustard",
  tagIds: [DINNER],
  rating: 2,
  lastCookedAt: null,
  prepTime: "20 min",
  cookTime: null,
};

const FIXTURE = [A, B, C, D];

/** Ids in the order applyRecipeFilters returned them — order matters for the
 * sort tests, so this deliberately doesn't sort or normalize. */
function ids(recipes: FilterableRecipe[]): string[] {
  return recipes.map((recipe) => recipe.id);
}

function filters(overrides: Partial<RecipeFilterState> = {}): RecipeFilterState {
  return { ...DEFAULT_RECIPE_FILTERS, ...overrides };
}

test("no filters: everything, alphabetical by default", () => {
  assert.deepEqual(ids(applyRecipeFilters(FIXTURE, filters())), ["a", "b", "c", "d"]);
});

test("tag alone: only the Dinner-tagged recipes", () => {
  const result = applyRecipeFilters(FIXTURE, filters({ tagId: DINNER }));
  assert.deepEqual(ids(result), ["a", "b", "d"]);
});

test("tag + time: Under 30 drops the 75-minute recipe", () => {
  const result = applyRecipeFilters(
    FIXTURE,
    filters({ tagId: DINNER, timeBucket: "under30" }),
  );
  assert.deepEqual(ids(result), ["a", "d"]);
});

test("tag + time + rating: the plan's worked example lands on exactly one", () => {
  const result = applyRecipeFilters(
    FIXTURE,
    filters({ tagId: DINNER, timeBucket: "under30", minRating: 4 }),
  );
  assert.deepEqual(ids(result), ["a"]);
});

test("filters compose as AND, not OR", () => {
  // Breakfast + over an hour matches nothing: C is the only Breakfast
  // recipe and it's 15 minutes. Under OR semantics this would wrongly
  // return both C and B.
  const result = applyRecipeFilters(
    FIXTURE,
    filters({ tagId: BREAKFAST, timeBucket: "over60" }),
  );
  assert.deepEqual(ids(result), []);
});

test("cooked only: just the one with a lastCookedAt", () => {
  assert.deepEqual(ids(applyRecipeFilters(FIXTURE, filters({ cookedOnly: true }))), ["a"]);
});

test("minRating is 'at least', not 'exactly'", () => {
  const atLeastTwo = applyRecipeFilters(FIXTURE, filters({ minRating: 2 }));
  assert.deepEqual(ids(atLeastTwo), ["a", "b", "c", "d"]);

  const atLeastFive = applyRecipeFilters(FIXTURE, filters({ minRating: 5 }));
  assert.deepEqual(ids(atLeastFive), []);
});

test("sort by rating: 4-star recipes first, alphabetical within a tie", () => {
  const result = applyRecipeFilters(FIXTURE, filters({ sort: "rating" }));
  assert.deepEqual(ids(result), ["a", "b", "c", "d"]);
});

test("sort by rating: an unrated recipe sorts below a 1-star one", () => {
  const unrated: FilterableRecipe = { ...D, id: "unrated", rating: null };
  const oneStar: FilterableRecipe = { ...D, id: "one-star", rating: 1 };
  const result = applyRecipeFilters([unrated, oneStar], filters({ sort: "rating" }));
  assert.deepEqual(ids(result), ["one-star", "unrated"]);
});

test("sort by cooked: most recent first, never-cooked last", () => {
  const older: FilterableRecipe = {
    ...B,
    id: "older",
    lastCookedAt: new Date("2026-07-01T12:00:00Z"),
  };
  const result = applyRecipeFilters([C, older, A], filters({ sort: "cooked" }));
  // A (Aug 1) then older (Jul 1), then C, which has never been cooked.
  assert.deepEqual(ids(result), ["a", "older", "c"]);
});

test("a search query takes over ordering entirely, overriding sort", () => {
  const result = applyRecipeFilters(
    FIXTURE,
    filters({ query: "Breakfast", sort: "rating" }),
  );
  assert.deepEqual(ids(result), ["c"]);
});

test("a search query still narrows within the other filters", () => {
  // "chicken" matches A by title, but A is Dinner-tagged — so filtering to
  // Breakfast first leaves the search nothing to rank.
  const result = applyRecipeFilters(
    FIXTURE,
    filters({ query: "chicken", tagId: BREAKFAST }),
  );
  assert.deepEqual(ids(result), []);
});

test("search matches ingredients too, not just titles", () => {
  const result = applyRecipeFilters(FIXTURE, filters({ query: "mustard" }));
  assert.deepEqual(ids(result), ["d"]);
});

test("a whitespace-only query is treated as no query at all", () => {
  const result = applyRecipeFilters(FIXTURE, filters({ query: "   " }));
  assert.deepEqual(ids(result), ["a", "b", "c", "d"]);
});

test("recipes with unparseable times are dropped by any time filter", () => {
  const vague: FilterableRecipe = {
    ...A,
    id: "vague",
    prepTime: "a while",
    cookTime: null,
  };
  const all = applyRecipeFilters([vague], filters());
  assert.deepEqual(ids(all), ["vague"]);

  // Deliberate: no bucket matches, rather than guessing one. See
  // recipeTimeFilter.ts.
  for (const bucket of ["under30", "30to60", "over60"] as const) {
    assert.deepEqual(ids(applyRecipeFilters([vague], filters({ timeBucket: bucket }))), []);
  }
});

test("the input array is never mutated", () => {
  const original = [...FIXTURE];
  applyRecipeFilters(FIXTURE, filters({ sort: "rating" }));
  assert.deepEqual(FIXTURE, original);
});
