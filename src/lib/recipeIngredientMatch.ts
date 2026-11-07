import "server-only";

// The one definition of "read a recipe's ingredient lines and check each
// against the pantry and the shopping list" (mission-44/C2), pulled out of
// `actions/groceriesRecipes.ts` because the Assistant API is a second caller.
// Read-only and carries no auth check: each caller carries its own gate.
//
// An AI outage is a typed error the caller maps to its own wording; it must
// never look like a data problem (the recipe is fine, the parse isn't).

import { db } from "@/lib/db";
import { DEFAULT_CATEGORY } from "@/lib/constants";
import { matchItem } from "@/lib/match";
import { recipeLines } from "@/lib/recipeText";
import { parseIngredientNames } from "@/lib/ingredientParse";

/**
 * What the review sheet knows about one of a recipe's ingredients.
 *
 * `status` drives both the label and whether the row starts checked: the
 * house already having something, or already having written it down, is a
 * reason to *not* buy it again, but never a reason to decide that silently
 * (see the Recipes v2 plan: suggest, never auto-add).
 */
export type RecipeIngredientSuggestion = {
  /** The recipe's own line, shown so a wrong parse is visible. */
  line: string;
  /** The shoppable name the parse produced, what actually gets added. */
  name: string;
  status: "missing" | "in-pantry" | "on-list";
  /** The inventory row this matched, for display. Null unless status is
   * "in-pantry". */
  matchedName: string | null;
  /**
   * Set only for an UNAMBIGUOUS inventory match. A linked grocery row is
   * what makes "put away" top up the right inventory item instead of
   * creating a duplicate, so a wrong link is worse than no link, and an
   * ambiguous match (the house stocks seven milks and no plain "Milk")
   * deliberately stays null. Put-away's own exact-name check and review
   * sheet still catch it later; that's the layer built for it.
   */
  pantryItemId: string | null;
  /** Borrowed from the matched inventory row when there's a confident
   * match, a real fact, not a guess. Otherwise the catch-all. */
  category: string;
};

/** The Claude call failed (outage, missing key). Nothing was guessed. */
export class IngredientAiError extends Error {
  constructor(readonly original: unknown) {
    super("The ingredient reader could not be reached.");
    this.name = "IngredientAiError";
  }
}

export type ClassifyLinesResult =
  | { status: "ok"; suggestions: RecipeIngredientSuggestion[] }
  /** The AI answered but nothing shoppable could be read out of the lines. */
  | { status: "unreadable" };

/**
 * Parse `lines` into shoppable names and check each against the real
 * inventory and the unchecked shopping list. Throws IngredientAiError when
 * the parse call fails.
 */
export async function classifyIngredientLines(
  lines: string[],
): Promise<ClassifyLinesResult> {
  let parsed;
  try {
    parsed = await parseIngredientNames(lines);
  } catch (error) {
    throw new IngredientAiError(error);
  }

  if (parsed.length === 0) return { status: "unreadable" };

  const [pantryItems, groceryItems] = await Promise.all([
    db.pantryItem.findMany({
      select: { id: true, name: true, category: true },
    }),
    db.groceryItem.findMany({
      where: { checked: false },
      select: { name: true },
    }),
  ]);

  const pantryById = new Map(pantryItems.map((item) => [item.id, item]));
  const onListNames = new Set(
    groceryItems.map((item) => item.name.trim().toLowerCase()),
  );

  const suggestions = parsed.map((item): RecipeIngredientSuggestion => {
    const name = item.name.trim();
    const line = lines[item.lineIndex];

    if (onListNames.has(name.toLowerCase())) {
      return {
        line,
        name,
        status: "on-list",
        matchedName: null,
        pantryItemId: null,
        category: DEFAULT_CATEGORY,
      };
    }

    const { match, ambiguous } = matchItem(name, pantryItems);
    if (match) {
      const full = pantryById.get(match.id)!;
      return {
        line,
        name,
        status: "in-pantry",
        matchedName: full.name,
        // See the pantryItemId doc comment above for why an ambiguous
        // match is shown but never linked.
        pantryItemId: ambiguous ? null : full.id,
        category: ambiguous ? DEFAULT_CATEGORY : full.category,
      };
    }

    return {
      line,
      name,
      status: "missing",
      matchedName: null,
      pantryItemId: null,
      category: DEFAULT_CATEGORY,
    };
  });

  return { status: "ok", suggestions };
}

export type ClassifyRecipeResult =
  | ClassifyLinesResult
  | { status: "recipe_missing" }
  | { status: "no_ingredients" };

/** Classify one recipe's ingredient lines. Throws IngredientAiError. */
export async function classifyRecipe(
  recipeId: string,
): Promise<ClassifyRecipeResult> {
  const recipe = await db.recipe.findUnique({
    where: { id: recipeId },
    select: { ingredients: true },
  });
  if (!recipe) return { status: "recipe_missing" };

  const lines = recipeLines(recipe.ingredients);
  if (lines.length === 0) return { status: "no_ingredients" };

  return classifyIngredientLines(lines);
}
