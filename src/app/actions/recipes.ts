"use server";

// Server Actions for recipes. Same rule as pantry.ts/groceries.ts: a Server
// Action is a real public POST endpoint, reachable directly, so every one of
// these opens with a getVerifiedSession() check rather than trusting that a
// request came from our own buttons.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { getVerifiedSession } from "@/lib/dal";
import {
  extractRecipeFromText,
  extractRecipeFromPhotos,
  hasRecipeContent,
  type ExtractedRecipe,
  type PhotoInput,
} from "@/lib/recipeExtract";
import { importRecipeFromUrl } from "@/lib/recipeUrlImport";

function refreshRecipeViews() {
  revalidatePath("/kitchen/cooking/recipes");
  revalidatePath("/kitchen/cooking");
  revalidatePath("/kitchen");
}

/** Trimmed to null rather than "", so an empty optional field reads as
 * "not set" everywhere downstream instead of an empty string floating around. */
function optionalField(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  return value || null;
}

export type RecipeFormState = { error?: string };

/**
 * Create a recipe from the shared RecipeForm. Redirects to the new recipe's
 * detail page on success — there's nothing useful to show on the form itself
 * once it's saved.
 *
 * `cookbookId` is optional and comes from RecipeForm's hidden field — every
 * import path (type, paste, photo, link) shares this one action, so passing
 * it through here is what makes a recipe "born inside a book" land in it,
 * in the same insert rather than a separate write.
 */
export async function createRecipe(
  _previous: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const title = String(formData.get("title") ?? "").trim();
  const ingredients = String(formData.get("ingredients") ?? "").trim();
  const steps = String(formData.get("steps") ?? "").trim();
  const cookbookId = optionalField(formData, "cookbookId");

  if (!title) return { error: "Give the recipe a title." };
  if (!ingredients) return { error: "Add at least one ingredient." };
  if (!steps) return { error: "Add at least one step." };

  if (cookbookId) {
    const cookbook = await db.cookbook.findUnique({
      where: { id: cookbookId },
      select: { id: true },
    });
    if (!cookbook) return { error: "That cookbook no longer exists." };
  }

  const recipe = await db.recipe.create({
    data: {
      title,
      ingredients,
      steps,
      servings: optionalField(formData, "servings"),
      prepTime: optionalField(formData, "prepTime"),
      cookTime: optionalField(formData, "cookTime"),
      sourceUrl: optionalField(formData, "sourceUrl"),
      notes: optionalField(formData, "notes"),
      ...(cookbookId ? { cookbooks: { create: { cookbookId } } } : {}),
    },
  });

  refreshRecipeViews();
  if (cookbookId) revalidatePath(`/kitchen/cooking/recipes/cookbooks/${cookbookId}`);
  redirect(`/kitchen/cooking/recipes/${recipe.id}`);
}

/** Same shape as createRecipe, plus a hidden `id` field the form carries. */
export async function updateRecipe(
  _previous: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const ingredients = String(formData.get("ingredients") ?? "").trim();
  const steps = String(formData.get("steps") ?? "").trim();

  if (!id) return { error: "Missing recipe." };
  if (!title) return { error: "Give the recipe a title." };
  if (!ingredients) return { error: "Add at least one ingredient." };
  if (!steps) return { error: "Add at least one step." };

  const existing = await db.recipe.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { error: "That recipe no longer exists." };

  await db.recipe.update({
    where: { id },
    data: {
      title,
      ingredients,
      steps,
      servings: optionalField(formData, "servings"),
      prepTime: optionalField(formData, "prepTime"),
      cookTime: optionalField(formData, "cookTime"),
      sourceUrl: optionalField(formData, "sourceUrl"),
      notes: optionalField(formData, "notes"),
    },
  });

  refreshRecipeViews();
  revalidatePath(`/kitchen/cooking/recipes/${id}`);
  redirect(`/kitchen/cooking/recipes/${id}`);
}

export type ExtractResult = { data?: ExtractedRecipe; error?: string };

/**
 * Pull recipe fields out of pasted text via Claude, for the "Paste text"
 * import flow. Deliberately does not touch the database — this only ever
 * hands data back to the client to pre-fill RecipeForm; nothing is saved
 * until the user reviews it and taps Save, same as every import path in the
 * Recipes plan.
 */
export async function extractRecipeFromPastedText(
  text: string,
): Promise<ExtractResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const trimmed = text.trim();
  if (!trimmed) return { error: "Paste some recipe text first." };
  if (trimmed.length > 20000) {
    return {
      error: "That's a lot of text — try pasting just the recipe portion.",
    };
  }

  const extracted = await extractRecipeFromText(trimmed);
  if (!hasRecipeContent(extracted)) {
    return {
      error:
        "Couldn't find a recipe in that text. Try pasting just the recipe part, or type it in manually.",
    };
  }

  return { data: extracted };
}

// Generous per-photo cap on the base64 string itself — the client already
// downscales to ~1600px long edge before upload, so a real photo lands well
// under this; it exists to reject something that slipped past that step
// (e.g. a very detailed image that still encodes large) before it counts
// against the shared Server Action body limit (next.config.ts).
const MAX_PHOTO_BASE64_LENGTH = 3_000_000; // ~2.2MB of actual image data

/**
 * Pull recipe fields out of up to 3 photos via Claude, for the "From a
 * photo" import flow. Same no-database-write contract as
 * extractRecipeFromPastedText — this only ever hands data back to the
 * client to pre-fill RecipeForm.
 */
export async function extractRecipeFromRecipePhotos(
  photos: PhotoInput[],
): Promise<ExtractResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  if (photos.length === 0) return { error: "Add at least one photo first." };
  if (photos.length > 3) {
    return { error: "Up to 3 photos at a time." };
  }
  if (photos.some((photo) => photo.data.length > MAX_PHOTO_BASE64_LENGTH)) {
    return { error: "One of those photos is too large. Try again." };
  }

  const extracted = await extractRecipeFromPhotos(photos);
  if (!hasRecipeContent(extracted)) {
    return {
      error:
        "Couldn't find a recipe in those photos. Make sure the text is clear and in frame, or type it in manually.",
    };
  }

  return { data: extracted };
}

export type UrlImportResult = ExtractResult & { sourceUrl?: string };

/**
 * Pull recipe fields out of a URL for the "From a link" import flow — the
 * flakiest path, since it depends on someone else's website. Same
 * no-database-write contract as the text and photo paths: this only ever
 * hands data back to the client to pre-fill RecipeForm.
 */
export async function importRecipeFromLink(
  url: string,
): Promise<UrlImportResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const trimmed = url.trim();
  if (!trimmed) return { error: "Paste a link first." };

  return importRecipeFromUrl(trimmed);
}

export type ShareResult = { shareToken?: string | null; error?: string };

/**
 * Turn sharing on for one recipe, returning the token its public link uses.
 *
 * The token IS the gate — /share/recipe/[token] has no session check (it's
 * meant for people outside the household), so the only thing standing
 * between a stranger and this recipe is not being able to guess the token.
 * 32 bytes from crypto.randomBytes is 256 bits of entropy: not sequential,
 * not derived from the recipe id, and not brute-forceable.
 *
 * Idempotent on purpose — re-sharing an already-shared recipe returns the
 * existing token rather than rotating it, so tapping Share twice doesn't
 * silently break a link someone already sent.
 */
export async function shareRecipe(recipeId: string): Promise<ShareResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const recipe = await db.recipe.findUnique({
    where: { id: recipeId },
    select: { shareToken: true },
  });
  if (!recipe) return { error: "That recipe no longer exists." };
  if (recipe.shareToken) return { shareToken: recipe.shareToken };

  const shareToken = randomBytes(32).toString("base64url");
  await db.recipe.update({ where: { id: recipeId }, data: { shareToken } });

  revalidatePath(`/kitchen/cooking/recipes/${recipeId}`);
  return { shareToken };
}

/**
 * Stop sharing: null the token, which kills the old link immediately —
 * anyone holding it gets a 404 from then on, since the public page looks a
 * recipe up *by* that value.
 */
export async function stopSharingRecipe(
  recipeId: string,
): Promise<ShareResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const recipe = await db.recipe.findUnique({
    where: { id: recipeId },
    select: { id: true },
  });
  if (!recipe) return { error: "That recipe no longer exists." };

  await db.recipe.update({
    where: { id: recipeId },
    data: { shareToken: null },
  });

  revalidatePath(`/kitchen/cooking/recipes/${recipeId}`);
  return { shareToken: null };
}

/**
 * Single tap, no confirmation dialog — same delete rule as every other item
 * in the app. Redirects back to the list since the detail page it was called
 * from no longer exists.
 */
export async function deleteRecipe(formData: FormData): Promise<void> {
  if (!(await getVerifiedSession())) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.recipe.delete({ where: { id } });

  refreshRecipeViews();
  redirect("/kitchen/cooking/recipes");
}

export type RecipeRatingResult = { rating?: number | null; error?: string };

/**
 * Set (or clear) a recipe's star rating. `rating: null` is a real input,
 * not an error state — tapping the currently-set star clears it back to
 * unrated, per the Recipes v2 plan's decision.
 */
export async function setRecipeRating(
  recipeId: string,
  rating: number | null,
): Promise<RecipeRatingResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return { error: "Ratings run 1 to 5." };
  }

  await db.recipe.update({ where: { id: recipeId }, data: { rating } });
  revalidatePath(`/kitchen/cooking/recipes/${recipeId}`);
  return { rating };
}

export type MarkCookedResult = { lastCookedAt?: Date; error?: string };

/**
 * "Mark as cooked" always stamps *now*, overwriting whatever was there —
 * there's no separate "unmark" control, since the point is a running record
 * of the most recent time this was made, not a toggle.
 */
export async function markRecipeCooked(recipeId: string): Promise<MarkCookedResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const recipe = await db.recipe.update({
    where: { id: recipeId },
    data: { lastCookedAt: new Date() },
    select: { lastCookedAt: true },
  });
  revalidatePath(`/kitchen/cooking/recipes/${recipeId}`);
  return { lastCookedAt: recipe.lastCookedAt ?? undefined };
}
