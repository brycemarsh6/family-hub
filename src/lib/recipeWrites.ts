import "server-only";

// The one definition of every recipe and tag write, pulled out of
// `actions/recipes.ts` and `actions/tags.ts` (mission 44, C1) because the
// Assistant API is about to be a SECOND caller. Same shape as
// `pantryWrites.ts`: a `server-only` module with NO auth check and NO
// `revalidatePath`; each caller carries its own gate and its own route
// strings.
//
// Tag writes live in `tagWrites.ts` (this module imports it for the tag diff
// that rides inside a recipe edit).
//
// Input normalization AND the field guards (required text, rating range) live
// here with the actions' exact messages, so both callers reject and store the
// same things. A guard failure comes back as `{ error, code }` (`code` says
// 404 or 400 to the API), a missing row as `null`, never a throw.
//
// Every write returns whole-row copies (every column) of what it created,
// replaced or removed, for the audit log and undo. Updates take a row lock
// (`SELECT ... FOR UPDATE`) inside a transaction, so `before` is exactly what
// the write replaced and `after` is exactly what it left (no retry loop, no
// "conflict" outcome).

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type {
  Prisma,
  Recipe,
  RecipeTag,
  CookbookRecipe,
} from "@/generated/prisma/client";
import { applyRecipeTagDiff, TAG_MISSING, tagsExist } from "@/lib/tagWrites";
import { COOKBOOK_MISSING } from "@/lib/cookbookWrites";
import { invalid } from "@/lib/writeError";
import type { WriteError } from "@/lib/writeError";

type Tx = Prisma.TransactionClient;

/** The text fields a caller may set on a recipe. */
export type RecipeFields = {
  title: string;
  ingredients: string;
  steps: string;
  servings?: string | null;
  prepTime?: string | null;
  cookTime?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
};

/** A partial edit: an omitted field is left untouched. */
export type RecipePatch = Partial<RecipeFields> & {
  /** 1 to 5, or null to clear. */
  rating?: number | null;
};

/** Trimmed to null rather than "", so an empty optional field reads as "not set". */
function optionalText(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

/** The first missing required field, in the form's order, as the action's message. */
function requiredFieldError(fields: {
  title?: string;
  ingredients?: string;
  steps?: string;
}): string | null {
  if (fields.title !== undefined && !fields.title.trim()) return "Give the recipe a title.";
  if (fields.ingredients !== undefined && !fields.ingredients.trim()) {
    return "Add at least one ingredient.";
  }
  if (fields.steps !== undefined && !fields.steps.trim()) return "Add at least one step.";
  return null;
}

/** `null` clears the rating, so it is a real input, not an error. */
function ratingError(rating: number | null): string | null {
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return "Ratings run 1 to 5.";
  }
  return null;
}

/** Lock one recipe row and read it; null when it doesn't exist. */
async function lockRecipe(tx: Tx, id: string): Promise<Recipe | null> {
  await tx.$queryRaw`SELECT "id" FROM "Recipe" WHERE "id" = ${id} FOR UPDATE`;
  return tx.recipe.findUnique({ where: { id } });
}

/**
 * Create a recipe, optionally filed into a cookbook and carrying tags, in one
 * transaction. The cookbook and every tag must exist. Returns copies of every
 * row created (Recipe, CookbookRecipe, RecipeTag), or `{ error }`.
 */
export async function createRecipeRow(
  fields: RecipeFields,
  options: { cookbookId?: string | null; tagIds?: string[] } = {},
): Promise<
  | { recipe: Recipe; cookbookRecipe: CookbookRecipe | null; recipeTags: RecipeTag[] }
  | WriteError
> {
  const problem = requiredFieldError(fields);
  if (problem) return invalid(problem);

  const cookbookId = options.cookbookId || null;
  const tagIds = [...new Set(options.tagIds ?? [])];

  return db.$transaction(async (tx) => {
    if (cookbookId) {
      const cookbook = await tx.cookbook.findUnique({
        where: { id: cookbookId },
        select: { id: true },
      });
      if (!cookbook) return COOKBOOK_MISSING;
    }
    if (!(await tagsExist(tx, tagIds))) return TAG_MISSING;

    const recipe = await tx.recipe.create({
      data: {
        title: fields.title.trim(),
        ingredients: fields.ingredients.trim(),
        steps: fields.steps.trim(),
        servings: optionalText(fields.servings),
        prepTime: optionalText(fields.prepTime),
        cookTime: optionalText(fields.cookTime),
        sourceUrl: optionalText(fields.sourceUrl),
        notes: optionalText(fields.notes),
      },
    });
    const cookbookRecipe = cookbookId
      ? await tx.cookbookRecipe.create({ data: { cookbookId, recipeId: recipe.id } })
      : null;
    const recipeTags: RecipeTag[] = [];
    for (const tagId of tagIds) {
      recipeTags.push(await tx.recipeTag.create({ data: { recipeId: recipe.id, tagId } }));
    }
    return { recipe, cookbookRecipe, recipeTags };
  });
}

/**
 * Edit any subset of the text fields and the rating. Required text that
 * trims to empty, or a rating outside 1 to 5, returns `{ error }` (checked
 * before the row is looked up, like the action). Null when the recipe is
 * missing. Row-locked, so `before` and `after` are exact.
 */
export async function updateRecipeRow(
  id: string,
  patch: RecipePatch,
): Promise<{ before: Recipe; after: Recipe } | WriteError | null> {
  const result = await updateRecipeAndTagsRow(id, patch);
  if (!result || "error" in result) return result;
  return { before: result.before, after: result.after };
}

/**
 * A field patch and a tag set (the full set, by id) applied together: the
 * recipe is locked once and both writes share ONE transaction, so a failure
 * in either leaves nothing written. Either part may be left out. Returns
 * `{ before, after }` for the recipe (equal, and `updatedAt` untouched, when
 * the patch is empty) and copies of the tag links created and deleted.
 * `{ error }` for a bad patch or an unknown tag id (nothing written); null
 * when the recipe is missing.
 */
export async function updateRecipeAndTagsRow(
  id: string,
  patch: RecipePatch = {},
  tagIds?: string[],
): Promise<
  { before: Recipe; after: Recipe; created: RecipeTag[]; deleted: RecipeTag[] } | WriteError | null
> {
  const problem =
    requiredFieldError(patch) ??
    (patch.rating !== undefined ? ratingError(patch.rating) : null);
  if (problem) return invalid(problem);

  return db.$transaction(async (tx) => {
    const before = await lockRecipe(tx, id);
    if (!before) return null;

    // Tags first: an unknown tag id refuses before anything is written.
    const tags = tagIds ? await applyRecipeTagDiff(tx, id, tagIds) : { created: [], deleted: [] };
    if ("error" in tags) return tags;

    const data = {
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.ingredients !== undefined ? { ingredients: patch.ingredients.trim() } : {}),
      ...(patch.steps !== undefined ? { steps: patch.steps.trim() } : {}),
      ...(patch.servings !== undefined ? { servings: optionalText(patch.servings) } : {}),
      ...(patch.prepTime !== undefined ? { prepTime: optionalText(patch.prepTime) } : {}),
      ...(patch.cookTime !== undefined ? { cookTime: optionalText(patch.cookTime) } : {}),
      ...(patch.sourceUrl !== undefined ? { sourceUrl: optionalText(patch.sourceUrl) } : {}),
      ...(patch.notes !== undefined ? { notes: optionalText(patch.notes) } : {}),
      ...(patch.rating !== undefined ? { rating: patch.rating } : {}),
    };
    const after =
      Object.keys(data).length > 0 ? await tx.recipe.update({ where: { id }, data }) : before;
    return { before, after, ...tags };
  });
}

/** Stamp `now` as the last-cooked time, overwriting whatever was there. Null if missing. */
export async function markRecipeCookedRow(
  id: string,
  now: Date,
): Promise<{ before: Recipe; after: Recipe } | null> {
  return db.$transaction(async (tx) => {
    const before = await lockRecipe(tx, id);
    if (!before) return null;
    const after = await tx.recipe.update({ where: { id }, data: { lastCookedAt: now } });
    return { before, after };
  });
}

/**
 * Turn sharing on. Idempotent: an already-shared recipe keeps its token
 * (`changed: false`, nothing written, `before` equals `after`). 32 random
 * bytes is the whole gate on the public page. Null if missing.
 */
export async function shareRecipeRow(
  id: string,
): Promise<{ before: Recipe; after: Recipe; changed: boolean } | null> {
  return db.$transaction(async (tx) => {
    const before = await lockRecipe(tx, id);
    if (!before) return null;
    if (before.shareToken) return { before, after: before, changed: false };
    const after = await tx.recipe.update({
      where: { id },
      data: { shareToken: randomBytes(32).toString("base64url") },
    });
    return { before, after, changed: true };
  });
}

/** Turn sharing off: the token is nulled, so the old link 404s. Null if missing. */
export async function stopSharingRecipeRow(
  id: string,
): Promise<{ before: Recipe; after: Recipe } | null> {
  return db.$transaction(async (tx) => {
    const before = await lockRecipe(tx, id);
    if (!before) return null;
    // Already off: write nothing, so `updatedAt` doesn't move and an earlier
    // undo isn't refused as "changed since".
    if (!before.shareToken) return { before, after: before };
    const after = await tx.recipe.update({ where: { id }, data: { shareToken: null } });
    return { before, after };
  });
}
