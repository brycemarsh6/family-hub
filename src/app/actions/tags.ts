"use server";

// Server Actions for tags. Same rule as recipes.ts/cookbooks.ts: a Server
// Action is a real public POST endpoint, reachable directly, so every one
// of these opens with a getVerifiedSession() check.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedSession } from "@/lib/dal";
import { isMissingRowError } from "@/lib/prismaErrors";

export type TagInfo = { id: string; name: string; recipeCount: number };
export type TagResult = { tag?: TagInfo; error?: string };

/**
 * Case-insensitive find-or-create — the Recipes v2 plan's "search or
 * create" rule: an existing tag surfaces first, and "create" is only ever
 * offered for a name that genuinely doesn't exist yet. The check happens
 * here rather than only client-side, so a direct call (this is a real
 * public POST endpoint) can't slip a duplicate past the UI. Tag.name's own
 * database uniqueness is case-SENSITIVE (see the schema comment), so this
 * function is what actually keeps "Dessert" and "dessert" as one tag.
 *
 * The guarantee is "no duplicate from a later request", not "no duplicate
 * ever": this is a read-then-write with no transaction around it, so two
 * requests racing on different casings of a brand-new name could still
 * create both rows. Left as is deliberately — a household of two tapping
 * the same new tag name in the same instant isn't a real scenario, and the
 * cure (a serializable transaction, or a normalized-name column) costs more
 * than the disease. Merging duplicates by hand is a one-liner if it ever
 * happens.
 */
export async function findOrCreateTag(name: string): Promise<TagResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Give the tag a name." };

  const existing = await db.tag.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true, name: true, _count: { select: { recipes: true } } },
  });
  if (existing) {
    return { tag: { id: existing.id, name: existing.name, recipeCount: existing._count.recipes } };
  }

  const created = await db.tag.create({ data: { name: trimmed } });
  revalidatePath("/kitchen/cooking/recipes");
  return { tag: { id: created.id, name: created.name, recipeCount: 0 } };
}

export async function renameTag(tagId: string, name: string): Promise<TagResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Give the tag a name." };

  const clash = await db.tag.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" }, id: { not: tagId } },
    select: { id: true },
  });
  if (clash) return { error: "A tag with that name already exists." };

  let updated;
  try {
    updated = await db.tag.update({
      where: { id: tagId },
      data: { name: trimmed },
      select: { id: true, name: true, _count: { select: { recipes: true } } },
    });
  } catch (error) {
    // Deleted on another phone while this one still had it on screen.
    if (isMissingRowError(error)) return { error: "That tag no longer exists." };
    throw error;
  }

  revalidatePath("/kitchen/cooking/recipes");
  return { tag: { id: updated.id, name: updated.name, recipeCount: updated._count.recipes } };
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
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

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

  await db.recipeTag.upsert({
    where: { recipeId_tagId: { recipeId, tagId } },
    create: { recipeId, tagId },
    update: {},
  });
  revalidatePath(`/kitchen/cooking/recipes/${recipeId}`);
  revalidatePath("/kitchen/cooking/recipes");
  return {};
}

export async function removeTagFromRecipe(
  recipeId: string,
  tagId: string,
): Promise<TagActionResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  await db.recipeTag.deleteMany({ where: { recipeId, tagId } });
  revalidatePath(`/kitchen/cooking/recipes/${recipeId}`);
  revalidatePath("/kitchen/cooking/recipes");
  return {};
}
