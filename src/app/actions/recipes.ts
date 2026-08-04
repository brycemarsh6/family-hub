"use server";

// Server Actions for recipes. Same rule as pantry.ts/groceries.ts: a Server
// Action is a real public POST endpoint, reachable directly, so every one of
// these opens with a getVerifiedSession() check rather than trusting that a
// request came from our own buttons.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedSession } from "@/lib/dal";

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
