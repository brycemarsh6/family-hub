import "server-only";

// The one definition of every recipe and tag write, pulled out of
// `actions/recipes.ts` and `actions/tags.ts` (mission 44, C1) because the
// Assistant API is about to be a SECOND caller. Same shape as
// `pantryWrites.ts`: a `server-only` module with NO auth check and NO
// `revalidatePath`; each caller carries its own gate and its own route
// strings.
//
// Input normalization AND the field guards (required text, rating range) live
// here with the actions' exact messages, so both callers reject and store the
// same things. A guard failure comes back as `{ error }`, a missing row as
// `null`, never a throw.
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
  Tag,
} from "@/generated/prisma/client";
import { isUniqueViolationError } from "@/lib/prismaErrors";

type Tx = Prisma.TransactionClient;

export type WriteError = { error: string };

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
export function ratingError(rating: number | null): string | null {
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
  const invalid = requiredFieldError(fields);
  if (invalid) return { error: invalid };

  const cookbookId = options.cookbookId || null;
  const tagIds = [...new Set(options.tagIds ?? [])];

  return db.$transaction(async (tx) => {
    if (cookbookId) {
      const cookbook = await tx.cookbook.findUnique({
        where: { id: cookbookId },
        select: { id: true },
      });
      if (!cookbook) return { error: "That cookbook no longer exists." };
    }
    if (tagIds.length > 0) {
      const found = await tx.tag.count({ where: { id: { in: tagIds } } });
      if (found !== tagIds.length) return { error: "That tag no longer exists." };
    }

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
  const invalid =
    requiredFieldError(patch) ??
    (patch.rating !== undefined ? ratingError(patch.rating) : null);
  if (invalid) return { error: invalid };

  return db.$transaction(async (tx) => {
    const before = await lockRecipe(tx, id);
    if (!before) return null;

    const after = await tx.recipe.update({
      where: { id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.ingredients !== undefined ? { ingredients: patch.ingredients.trim() } : {}),
        ...(patch.steps !== undefined ? { steps: patch.steps.trim() } : {}),
        ...(patch.servings !== undefined ? { servings: optionalText(patch.servings) } : {}),
        ...(patch.prepTime !== undefined ? { prepTime: optionalText(patch.prepTime) } : {}),
        ...(patch.cookTime !== undefined ? { cookTime: optionalText(patch.cookTime) } : {}),
        ...(patch.sourceUrl !== undefined ? { sourceUrl: optionalText(patch.sourceUrl) } : {}),
        ...(patch.notes !== undefined ? { notes: optionalText(patch.notes) } : {}),
        ...(patch.rating !== undefined ? { rating: patch.rating } : {}),
      },
    });
    return { before, after };
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
    const after = await tx.recipe.update({ where: { id }, data: { shareToken: null } });
    return { before, after };
  });
}

/**
 * Case-insensitive find-or-create (Tag.name's own uniqueness is
 * case-sensitive). `created` is the new row's copy, or null when the tag
 * already existed. A lost race on the exact same name re-finds the winner.
 */
export async function findOrCreateTagRow(
  name: string,
): Promise<{ tag: Tag; recipeCount: number; created: Tag | null } | WriteError> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Give the tag a name." };

  const find = () =>
    db.tag.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
      include: { _count: { select: { recipes: true } } },
    });

  const existing = await find();
  if (existing) {
    const { _count, ...tag } = existing;
    return { tag, recipeCount: _count.recipes, created: null };
  }

  try {
    const created = await db.tag.create({ data: { name: trimmed } });
    return { tag: created, recipeCount: 0, created };
  } catch (error) {
    if (!isUniqueViolationError(error)) throw error;
    const winner = await find();
    if (!winner) throw error;
    const { _count, ...tag } = winner;
    return { tag, recipeCount: _count.recipes, created: null };
  }
}

/** Put a tag on a recipe. Idempotent: `created` is null when it was already there. */
export async function addRecipeTagRow(
  recipeId: string,
  tagId: string,
): Promise<{ created: RecipeTag | null } | WriteError> {
  const [recipe, tag] = await Promise.all([
    db.recipe.findUnique({ where: { id: recipeId }, select: { id: true } }),
    db.tag.findUnique({ where: { id: tagId }, select: { id: true } }),
  ]);
  if (!recipe) return { error: "That recipe no longer exists." };
  if (!tag) return { error: "That tag no longer exists." };

  try {
    return { created: await db.recipeTag.create({ data: { recipeId, tagId } }) };
  } catch (error) {
    if (isUniqueViolationError(error)) return { created: null };
    throw error;
  }
}

/** Take a tag off a recipe. Idempotent: `removed` is the deleted row's copy, or null. */
export async function removeRecipeTagRow(
  recipeId: string,
  tagId: string,
): Promise<{ removed: RecipeTag | null }> {
  return db.$transaction(async (tx) => {
    const row = await tx.recipeTag.findUnique({
      where: { recipeId_tagId: { recipeId, tagId } },
    });
    if (!row) return { removed: null };
    const { count } = await tx.recipeTag.deleteMany({ where: { id: row.id } });
    return { removed: count > 0 ? row : null };
  });
}

/**
 * Make a recipe carry exactly these tags: the diff is applied in one
 * transaction (recipe row-locked). Returns copies of the rows created and
 * deleted, or `{ error }` for a missing recipe or an unknown tag id.
 */
export async function setRecipeTagRows(
  recipeId: string,
  tagIds: string[],
): Promise<{ created: RecipeTag[]; deleted: RecipeTag[] } | WriteError> {
  const wanted = [...new Set(tagIds)];

  return db.$transaction(async (tx) => {
    const recipe = await lockRecipe(tx, recipeId);
    if (!recipe) return { error: "That recipe no longer exists." };

    if (wanted.length > 0) {
      const found = await tx.tag.count({ where: { id: { in: wanted } } });
      if (found !== wanted.length) return { error: "That tag no longer exists." };
    }

    const current = await tx.recipeTag.findMany({ where: { recipeId } });
    const have = new Set(current.map((row) => row.tagId));
    const keep = new Set(wanted);

    const deleted = current.filter((row) => !keep.has(row.tagId));
    if (deleted.length > 0) {
      await tx.recipeTag.deleteMany({ where: { id: { in: deleted.map((row) => row.id) } } });
    }
    const created: RecipeTag[] = [];
    for (const tagId of wanted) {
      if (!have.has(tagId)) {
        created.push(await tx.recipeTag.create({ data: { recipeId, tagId } }));
      }
    }
    return { created, deleted };
  });
}
