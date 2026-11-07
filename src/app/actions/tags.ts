"use server";

// Server Actions for tags. Same rule as recipes.ts/cookbooks.ts: a Server
// Action is a real public POST endpoint, reachable directly, so every one
// of these opens with a getVerifiedSession() check.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedSession, getVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { isMissingRowError } from "@/lib/prismaErrors";
import {
  findOrCreateTagRow,
  renameTagRow,
  addRecipeTagRow,
  removeRecipeTagRow,
} from "@/lib/tagWrites";

export type TagInfo = { id: string; name: string; recipeCount: number };
export type TagResult = { tag?: TagInfo; error?: string };

/**
 * Case-insensitive find-or-create, the Recipes v2 plan's "search or create"
 * rule: an existing tag surfaces first, and "create" is only ever offered for
 * a name that genuinely doesn't exist yet. The check lives in `tagWrites.ts`
 * (shared with the Assistant API), so a direct call to this public POST
 * endpoint can't slip a duplicate past the UI.
 */
export async function findOrCreateTag(name: string): Promise<TagResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const result = await findOrCreateTagRow(name);
  if ("error" in result) return { error: result.error };

  if (result.created) revalidatePath("/kitchen/cooking/recipes");
  return {
    tag: { id: result.tag.id, name: result.tag.name, recipeCount: result.recipeCount },
  };
}

export async function renameTag(tagId: string, name: string): Promise<TagResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const result = await renameTagRow(tagId, name);
  if ("error" in result) return { error: result.error };

  revalidatePath("/kitchen/cooking/recipes");
  return {
    tag: { id: result.tag.id, name: result.tag.name, recipeCount: result.recipeCount },
  };
}

export type TagActionResult = { error?: string };

/**
 * Removes the tag entirely — the second of the plan's two deliberate
 * breaks of the house single-tap-delete rule (the other is deleting a
 * cookbook), since it silently drops the tag from every recipe carrying
 * it. RecipeTag rows cascade with it; the recipes themselves are
 * untouched. The client shows a real count via ConfirmSheet before
 * calling this.
 */
export async function deleteTag(tagId: string): Promise<TagActionResult> {
  // Gated to admin/parent — deleting a tag silently drops it from every
  // recipe carrying it, which is management, not participation. Kids can
  // still create/rename/apply tags via findOrCreateTag/renameTag/
  // addTagToRecipe/removeTagFromRecipe, all ungated.
  const user = await getVerifiedUser();
  if (!user || !MANAGER_ROLES.includes(user.role)) {
    return { error: "Only parents can do that." };
  }

  try {
    await db.tag.delete({ where: { id: tagId } });
  } catch (error) {
    // Already gone (deleted on another phone) is the outcome the caller
    // wanted, so this stays success rather than an error — the same
    // idempotence removeRecipeFromCookbook gets for free from deleteMany.
    if (!isMissingRowError(error)) throw error;
  }

  revalidatePath("/kitchen/cooking/recipes");
  return {};
}

/** Idempotent, same reasoning as addRecipeToCookbook. */
export async function addTagToRecipe(
  recipeId: string,
  tagId: string,
): Promise<TagActionResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const result = await addRecipeTagRow(recipeId, tagId);
  if ("error" in result) return { error: result.error };
  revalidatePath(`/kitchen/cooking/recipes/${recipeId}`);
  revalidatePath("/kitchen/cooking/recipes");
  return {};
}

export async function removeTagFromRecipe(
  recipeId: string,
  tagId: string,
): Promise<TagActionResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  await removeRecipeTagRow(recipeId, tagId);
  revalidatePath(`/kitchen/cooking/recipes/${recipeId}`);
  revalidatePath("/kitchen/cooking/recipes");
  return {};
}
