"use server";

// Server Actions for turning a recipe's ingredients into shopping list rows.
// Same rule as every other actions file (see groceries.ts's own header for
// the full explanation): these are real POST endpoints reachable directly,
// so every one starts with a getVerifiedSession() check.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedSession, getVerifiedUser } from "@/lib/dal";
import { toCategory } from "@/lib/constants";
import {
  classifyRecipe,
  IngredientAiError,
  type RecipeIngredientSuggestion,
} from "@/lib/recipeIngredientMatch";

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
  // The dashboard's Kitchen widget shows these counts too.
  revalidatePath("/");
}

export type { RecipeIngredientSuggestion };

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

  let result;
  try {
    result = await classifyRecipe(recipeId);
  } catch (error) {
    if (!(error instanceof IngredientAiError)) throw error;
    // Never let a Claude outage look like a data problem, the recipe is
    // fine, the parse isn't. Same shape as suggestMealsForSlot's guard.
    console.error("classifyRecipeIngredients failed:", error.original);
    return { error: "Couldn't reach the AI just now. Try again in a moment." };
  }

  switch (result.status) {
    case "recipe_missing":
      return { error: "That recipe no longer exists." };
    case "no_ingredients":
      return { error: "This recipe doesn't list any ingredients yet." };
    case "unreadable":
      return { error: "Couldn't read shopping items out of these ingredients." };
    case "ok":
      return { suggestions: result.suggestions };
  }
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
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

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
      // Family Accounts v1: who added these ingredients to the list.
      addedById: user.userId,
    })),
  });

  refreshGroceryViews();
  return { added: wanted.length };
}
