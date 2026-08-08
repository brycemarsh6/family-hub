"use server";

// Server Actions for cookbooks. Same rule as recipes.ts/pantry.ts/groceries.ts:
// a Server Action is a real public POST endpoint, reachable directly, so
// every one of these opens with a getVerifiedSession() check.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedSession } from "@/lib/dal";

function refreshCookbookViews(cookbookId?: string) {
  revalidatePath("/kitchen/cooking/recipes");
  if (cookbookId) {
    revalidatePath(`/kitchen/cooking/recipes/cookbooks/${cookbookId}`);
  }
}

export type CookbookResult = { id?: string; error?: string };

/** Title -> straight into the new empty book, no second confirmation step. */
export async function createCookbook(title: string): Promise<CookbookResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const trimmed = title.trim();
  if (!trimmed) return { error: "Give the cookbook a title." };

  const cookbook = await db.cookbook.create({ data: { title: trimmed } });
  refreshCookbookViews();
  return { id: cookbook.id };
}

export async function renameCookbook(
  cookbookId: string,
  title: string,
): Promise<CookbookResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const trimmed = title.trim();
  if (!trimmed) return { error: "Give the cookbook a title." };

  const existing = await db.cookbook.findUnique({
    where: { id: cookbookId },
    select: { id: true },
  });
  if (!existing) return { error: "That cookbook no longer exists." };

  await db.cookbook.update({ where: { id: cookbookId }, data: { title: trimmed } });
  refreshCookbookViews(cookbookId);
  return { id: cookbookId };
}

export type DeleteCookbookResult = { error?: string };

/**
 * Unfiles every recipe in this cookbook — the CookbookRecipe join rows
 * cascade-delete with it — but never touches the recipes themselves. This is
 * one of the two deliberate breaks of the house's single-tap-delete rule
 * (the other is deleting a tag, in C2): both silently touch many rows'
 * relationships at once, so the client confirms with a real count before
 * calling this, via ConfirmSheet.
 */
export async function deleteCookbook(
  cookbookId: string,
): Promise<DeleteCookbookResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  await db.cookbook.delete({ where: { id: cookbookId } });
  refreshCookbookViews();
  return {};
}

export type CookbookMembershipResult = { error?: string };

/**
 * Idempotent — the (cookbookId, recipeId) unique constraint means filing an
 * already-filed recipe again is a harmless no-op rather than a duplicate row
 * or a thrown error.
 */
export async function addRecipeToCookbook(
  cookbookId: string,
  recipeId: string,
): Promise<CookbookMembershipResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  await db.cookbookRecipe.upsert({
    where: { cookbookId_recipeId: { cookbookId, recipeId } },
    create: { cookbookId, recipeId },
    update: {},
  });
  refreshCookbookViews(cookbookId);
  return {};
}

/** Unfiles one recipe from one cookbook — never touches the recipe itself. */
export async function removeRecipeFromCookbook(
  cookbookId: string,
  recipeId: string,
): Promise<CookbookMembershipResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  await db.cookbookRecipe.deleteMany({ where: { cookbookId, recipeId } });
  refreshCookbookViews(cookbookId);
  return {};
}
