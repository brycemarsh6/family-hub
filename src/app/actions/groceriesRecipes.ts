"use server";

// Server Actions for turning a recipe's ingredients into shopping list rows.
// Same rule as every other actions file (see groceries.ts's own header for
// the full explanation): these are real POST endpoints reachable directly,
// so every one starts with a getVerifiedSession() check.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedSession } from "@/lib/dal";
import { toCategory, DEFAULT_CATEGORY } from "@/lib/constants";
import { matchItem } from "@/lib/match";
import { recipeLines } from "@/lib/recipeText";
import { parseIngredientNames } from "@/lib/ingredientParse";

/**
 * Re-render the pages whose contents just changed.
 *
 * Next.js caches rendered pages. After we change data we have to say "that page
 * is out of date", or the browser would keep showing the old list. The kitchen
 * home page is included because it displays the item counts.
 *
 * A private copy, not a shared import from groceries.ts — deliberately.
 * Exporting a plain helper from a "use server" file makes it a public POST
 * endpoint, so each action file carries its own small refresh*Views().
 */
function refreshGroceryViews() {
  revalidatePath("/kitchen/shopping");
  revalidatePath("/kitchen");
  // The dashboard's Kitchen widget shows these counts too.
  revalidatePath("/");
}

/**
 * What the review sheet knows about one of a recipe's ingredients.
 *
 * `status` drives both the label and whether the row starts checked — the
 * house already having something, or already having written it down, is a
 * reason to *not* buy it again, but never a reason to decide that silently
 * (see the Recipes v2 plan: suggest, never auto-add).
 */
export type RecipeIngredientSuggestion = {
  /** The recipe's own line, shown so a wrong parse is visible. */
  line: string;
  /** The shoppable name the parse produced — what actually gets added. */
  name: string;
  status: "missing" | "in-pantry" | "on-list";
  /** The inventory row this matched, for display. Null unless status is
   * "in-pantry". */
  matchedName: string | null;
  /**
   * Set only for an UNAMBIGUOUS inventory match. A linked grocery row is
   * what makes "put away" top up the right inventory item instead of
   * creating a duplicate — so a wrong link is worse than no link, and an
   * ambiguous match (the house stocks seven milks and no plain "Milk")
   * deliberately stays null. Put-away's own exact-name check and review
   * sheet still catch it later; that's the layer built for it.
   */
  pantryItemId: string | null;
  /** Borrowed from the matched inventory row when there's a confident
   * match — a real fact, not a guess. Otherwise the catch-all. */
  category: string;
};

export type ClassifyIngredientsResult = {
  suggestions?: RecipeIngredientSuggestion[];
  error?: string;
};

/**
 * Read the recipe's ingredients, work out plain item names, and check each
 * one against the real inventory and the current shopping list.
 *
 * Read-only on purpose: this only ever hands suggestions back to the client.
 * Nothing reaches the shopping list until a human ticks rows and taps add,
 * which routes through addIngredientsToGroceries below.
 */
export async function classifyRecipeIngredients(
  recipeId: string,
): Promise<ClassifyIngredientsResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const recipe = await db.recipe.findUnique({
    where: { id: recipeId },
    select: { ingredients: true },
  });
  if (!recipe) return { error: "That recipe no longer exists." };

  const lines = recipeLines(recipe.ingredients);
  if (lines.length === 0) {
    return { error: "This recipe doesn't list any ingredients yet." };
  }

  let parsed;
  try {
    parsed = await parseIngredientNames(lines);
  } catch (error) {
    // Never let a Claude outage look like a data problem — the recipe is
    // fine, the parse isn't. Same shape as suggestMealsForSlot's guard.
    console.error("classifyRecipeIngredients failed:", error);
    return { error: "Couldn't reach the AI just now. Try again in a moment." };
  }

  if (parsed.length === 0) {
    return { error: "Couldn't read shopping items out of these ingredients." };
  }

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

  return { suggestions };
}

/** One row the human ticked in the review sheet. */
export type ConfirmedIngredient = {
  name: string;
  category: string;
  pantryItemId: string | null;
};

export type AddIngredientsResult = { added?: number; error?: string };

/**
 * Add the confirmed rows to the shopping list — and only those. Everything
 * unticked in the review sheet is simply not here.
 *
 * `pantryItemId` is re-checked against the database rather than trusted from
 * the client: it's the field that decides which inventory row "put away"
 * later tops up, so a stale or tampered id would quietly restock the wrong
 * thing. An id that no longer resolves degrades to an unlinked row, which
 * put-away already knows how to handle.
 */
export async function addIngredientsToGroceries(
  items: ConfirmedIngredient[],
): Promise<AddIngredientsResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const wanted = items
    .map((item) => ({ ...item, name: item.name.trim() }))
    .filter((item) => item.name.length > 0);
  if (wanted.length === 0) return { added: 0 };

  const linkedIds = wanted
    .map((item) => item.pantryItemId)
    .filter((id): id is string => id !== null);
  const existingPantryIds = new Set(
    linkedIds.length === 0
      ? []
      : (
          await db.pantryItem.findMany({
            where: { id: { in: linkedIds } },
            select: { id: true },
          })
        ).map((item) => item.id),
  );

  await db.groceryItem.createMany({
    data: wanted.map((item) => ({
      name: item.name,
      quantity: 1,
      category: toCategory(item.category),
      pantryItemId:
        item.pantryItemId && existingPantryIds.has(item.pantryItemId)
          ? item.pantryItemId
          : null,
    })),
  });

  refreshGroceryViews();
  return { added: wanted.length };
}
