import { searchRecipes } from "@/lib/match";
import { totalTimeBucket, type TimeBucket } from "@/lib/recipeTimeFilter";

// The pure logic behind the C4 filter bar — kept separate from the UI
// component so it's directly testable and so the "filters compose"
// behavior (Tags + Total Time + Rating all narrowing the same list
// together) lives in one obvious place rather than smeared across event
// handlers.

export type SortOption = "az" | "rating" | "cooked";

export type RecipeFilterState = {
  query: string;
  tagId: string | null;
  timeBucket: TimeBucket | "all";
  cookedOnly: boolean;
  /** "At least this many stars." Null means no rating filter. */
  minRating: number | null;
  sort: SortOption;
};

export const DEFAULT_RECIPE_FILTERS: RecipeFilterState = {
  query: "",
  tagId: null,
  timeBucket: "all",
  cookedOnly: false,
  minRating: null,
  sort: "az",
};

export type FilterableRecipe = {
  id: string;
  title: string;
  ingredients: string;
  tagIds: string[];
  rating: number | null;
  lastCookedAt: Date | null;
  prepTime: string | null;
  cookTime: string | null;
};

/**
 * Filter and sort a recipe list per the current filter-bar state.
 *
 * A typed search query takes over ordering entirely (ranked by match
 * quality, via the same searchRecipes used everywhere else recipes are
 * searched) — the Sort control only applies once there's no query, same
 * shape as every other search-vs-browse view in this app.
 */
export function applyRecipeFilters<T extends FilterableRecipe>(
  recipes: T[],
  filters: RecipeFilterState,
): T[] {
  let visible = recipes;

  if (filters.tagId) {
    visible = visible.filter((recipe) => recipe.tagIds.includes(filters.tagId!));
  }
  if (filters.timeBucket !== "all") {
    visible = visible.filter(
      (recipe) => totalTimeBucket(recipe.prepTime, recipe.cookTime) === filters.timeBucket,
    );
  }
  if (filters.cookedOnly) {
    visible = visible.filter((recipe) => recipe.lastCookedAt !== null);
  }
  if (filters.minRating !== null) {
    visible = visible.filter((recipe) => (recipe.rating ?? 0) >= filters.minRating!);
  }

  const query = filters.query.trim();
  if (query) return searchRecipes(query, visible);

  const sorted = [...visible];
  if (filters.sort === "rating") {
    sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.title.localeCompare(b.title));
  } else if (filters.sort === "cooked") {
    sorted.sort((a, b) => {
      const aTime = a.lastCookedAt?.getTime() ?? -Infinity;
      const bTime = b.lastCookedAt?.getTime() ?? -Infinity;
      return bTime - aTime || a.title.localeCompare(b.title);
    });
  } else {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  }
  return sorted;
}
