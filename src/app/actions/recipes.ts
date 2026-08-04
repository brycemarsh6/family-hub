"use server";

// Server Actions for recipes. Same rule as pantry.ts/groceries.ts: a Server
// Action is a real public POST endpoint, reachable directly, so every one of
// these opens with a getVerifiedSession() check rather than trusting that a
// request came from our own buttons.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedSession } from "@/lib/dal";
import {
  extractRecipeFromText,
  extractRecipeFromPhotos,
  type ExtractedRecipe,
  type PhotoInput,
} from "@/lib/recipeExtract";

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
 */
export async function createRecipe(
  _previous: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const title = String(formData.get("title") ?? "").trim();
  const ingredients = String(formData.get("ingredients") ?? "").trim();
  const steps = String(formData.get("steps") ?? "").trim();

  if (!title) return { error: "Give the recipe a title." };
  if (!ingredients) return { error: "Add at least one ingredient." };
  if (!steps) return { error: "Add at least one step." };

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
    },
  });

  refreshRecipeViews();
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
  const hasContent =
    extracted.title || extracted.ingredients.length > 0 || extracted.steps.length > 0;
  if (!hasContent) {
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
  const hasContent =
    extracted.title || extracted.ingredients.length > 0 || extracted.steps.length > 0;
  if (!hasContent) {
    return {
      error:
        "Couldn't find a recipe in those photos. Make sure the text is clear and in frame, or type it in manually.",
    };
  }

  return { data: extracted };
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
