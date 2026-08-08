"use server";

// Server Actions for tags. Same rule as recipes.ts/cookbooks.ts: a Server
// Action is a real public POST endpoint, reachable directly, so every one
// of these opens with a getVerifiedSession() check.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedSession } from "@/lib/dal";

export type TagInfo = { id: string; name: string; recipeCount: number };
export type TagResult = { tag?: TagInfo; error?: string };

/**
 * Case-insensitive find-or-create — the Recipes v2 plan's "search or
 * create" rule: an existing tag surfaces first, and "create" is only ever
 * offered for a name that genuinely doesn't exist yet. The case-
 * insensitive check happens here, not just client-side, so two people
 * typing the same tag name (different case) at nearly the same moment
 * still land on one row — Tag.name's own database uniqueness is case-
 * sensitive (see the schema comment), so this function is what actually
 * enforces "Dessert"/"dessert" as one tag.
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

  const updated = await db.tag.update({
    where: { id: tagId },
    data: { name: trimmed },
    select: { id: true, name: true, _count: { select: { recipes: true } } },
  });
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

  await db.tag.delete({ where: { id: tagId } });
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
