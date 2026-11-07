import { ApiError } from "./errors";
import type { WriteError } from "@/lib/tagWrites";
import { fingerprintIngredients } from "@/lib/nutritionFingerprint";
import { parseTimeToMinutes } from "@/lib/recipeTimeFilter";
import { recipeLines } from "@/lib/recipeText";

// DB row -> wire format for the Assistant API's recipe routes. Pure, and
// every output is built field by field: never a spread of a row, so a column
// added later can't leak onto the wire by default.

export type RecipeListRow = {
  id: string;
  title: string;
  rating: number | null;
  lastCookedAt: Date | null;
  servings: string | null;
  prepTime: string | null;
  cookTime: string | null;
  shareToken: string | null;
  tags: { tag: { id: string; name: string } }[];
  cookbooks: { cookbook: { id: string; title: string } }[];
};

export type RecipeDetailRow = RecipeListRow & {
  ingredients: string;
  steps: string;
  notes: string | null;
  sourceUrl: string | null;
  nutritionCalories: number | null;
  nutritionProteinG: number | null;
  nutritionCarbsG: number | null;
  nutritionFatG: number | null;
  nutritionServings: number | null;
  nutritionFingerprint: string | null;
};

/** Prep plus cook, from whichever of the two parse; null when neither does. */
export function totalMinutes(prepTime: string | null, cookTime: string | null): number | null {
  const prep = prepTime ? parseTimeToMinutes(prepTime) : null;
  const cook = cookTime ? parseTimeToMinutes(cookTime) : null;
  return prep === null && cook === null ? null : (prep ?? 0) + (cook ?? 0);
}

export function toRecipeListItem(row: RecipeListRow) {
  return {
    id: row.id,
    title: row.title,
    rating: row.rating,
    lastCookedAt: row.lastCookedAt ? row.lastCookedAt.toISOString() : null,
    servings: row.servings,
    prepTime: row.prepTime,
    cookTime: row.cookTime,
    totalMinutes: totalMinutes(row.prepTime, row.cookTime),
    tags: row.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
    cookbooks: row.cookbooks.map((c) => ({ id: c.cookbook.id, title: c.cookbook.title })),
    shared: row.shareToken !== null,
  };
}

/** The public page address for a share token, from the request's own origin. */
export function toShareUrl(origin: string, token: string | null): string | null {
  return token ? `${origin}/share/recipe/${token}` : null;
}

export function toRecipeDetail(row: RecipeDetailRow, origin: string) {
  const hasNutrition = row.nutritionCalories !== null;
  return {
    ...toRecipeListItem(row),
    ingredients: recipeLines(row.ingredients),
    steps: recipeLines(row.steps),
    notes: row.notes,
    sourceUrl: row.sourceUrl,
    shareUrl: toShareUrl(origin, row.shareToken),
    nutrition: hasNutrition
      ? {
          calories: row.nutritionCalories,
          proteinG: row.nutritionProteinG,
          carbsG: row.nutritionCarbsG,
          fatG: row.nutritionFatG,
          perServings: row.nutritionServings,
          isEstimate: true as const,
          outdated:
            row.nutritionFingerprint !== null &&
            row.nutritionFingerprint !== fingerprintIngredients(row.ingredients),
        }
      : null,
  };
}

type Suggestion = {
  line: string;
  name: string;
  status: "missing" | "in-pantry" | "on-list";
  matchedName: string | null;
};

/** The classifier's suggestions, sorted into the three piles the bot reads. */
export function toShortfall(recipeId: string, suggestions: Suggestion[] | null) {
  const list = suggestions ?? [];
  return {
    recipeId,
    readable: suggestions !== null && list.length > 0,
    have: list
      .filter((s) => s.status === "in-pantry")
      .map((s) => ({ line: s.line, name: s.name, matchedName: s.matchedName })),
    missing: list.filter((s) => s.status === "missing").map((s) => ({ line: s.line, name: s.name })),
    onList: list.filter((s) => s.status === "on-list").map((s) => ({ line: s.line, name: s.name })),
  };
}

export function toCookbook(row: { id: string; title: string; _count: { recipes: number } }) {
  return { id: row.id, title: row.title, recipeCount: row._count.recipes };
}

export function toTag(row: { id: string; name: string }, recipeCount: number) {
  return { id: row.id, name: row.name, recipeCount };
}

/**
 * A write module's refusal as the API's: `missing` names something that
 * doesn't exist (404); `invalid` is a bad request (400). Goes by the code,
 * never the message text.
 */
export function toWriteFailure(failure: WriteError): ApiError {
  return failure.code === "missing"
    ? new ApiError(404, "not_found", failure.error)
    : new ApiError(400, "validation", failure.error);
}
