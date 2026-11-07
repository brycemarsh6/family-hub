import "server-only";

// The one definition of every tag write (mission 44, F1a): find-or-create,
// rename, put a tag on a recipe, take one off, and the tag diff that makes a
// recipe carry exactly a given set. Pulled out of `recipeWrites.ts` so the
// tag-name rules (trim, empty message, case-insensitive clash) live once and
// `renameTag` stops carrying its own copy. Same shape as `recipeWrites.ts`:
// `server-only`, NO auth check, NO `revalidatePath`.
//
// This module is the lowest of the write modules: `recipeWrites.ts` imports
// it (to run the tag diff inside its own transaction), never the other way.
//
// A refusal comes back as `{ error, code }`: `error` is the family's message
// as the actions always showed it, `code` lets the API pick 404 or 400
// without matching message text.

import { db } from "@/lib/db";
import type { Prisma, RecipeTag, Tag } from "@/generated/prisma/client";
import { isMissingRowError, isUniqueViolationError } from "@/lib/prismaErrors";

type Tx = Prisma.TransactionClient;

/** `missing`: something named doesn't exist (404). `invalid`: bad input (400). */
export type WriteError = { error: string; code: "missing" | "invalid" };

export const TAG_MISSING: WriteError = { error: "That tag no longer exists.", code: "missing" };

/** The trimmed name, or the refusal when it trims to nothing. */
function checkTagName(name: string): { name: string } | WriteError {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Give the tag a name.", code: "invalid" };
  return { name: trimmed };
}

/** The tag with this name, ignoring case, optionally excluding one id; with its recipe count. */
function findTagByName(client: Tx | typeof db, name: string, exceptId?: string) {
  return client.tag.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    include: { _count: { select: { recipes: true } } },
  });
}

/** True when every id is a real tag (duplicates in `tagIds` count once). */
export async function tagsExist(client: Tx | typeof db, tagIds: string[]): Promise<boolean> {
  const wanted = [...new Set(tagIds)];
  if (wanted.length === 0) return true;
  return (await client.tag.count({ where: { id: { in: wanted } } })) === wanted.length;
}

/**
 * Case-insensitive find-or-create (Tag.name's own uniqueness is
 * case-sensitive). `created` is the new row's copy, or null when the tag
 * already existed. A lost race on the exact same name re-finds the winner.
 * Two requests racing on different casings of a brand-new name can still
 * create both rows: a household of two doesn't hit that, and merging by hand
 * is a one-liner if it ever happens.
 */
export async function findOrCreateTagRow(
  name: string,
): Promise<{ tag: Tag; recipeCount: number; created: Tag | null } | WriteError> {
  const checked = checkTagName(name);
  if ("error" in checked) return checked;

  const existing = await findTagByName(db, checked.name);
  if (existing) {
    const { _count, ...tag } = existing;
    return { tag, recipeCount: _count.recipes, created: null };
  }

  try {
    const created = await db.tag.create({ data: { name: checked.name } });
    return { tag: created, recipeCount: 0, created };
  } catch (error) {
    if (!isUniqueViolationError(error)) throw error;
    const winner = await findTagByName(db, checked.name);
    if (!winner) throw error;
    const { _count, ...tag } = winner;
    return { tag, recipeCount: _count.recipes, created: null };
  }
}

/**
 * Rename a tag. Another tag already using that name (any casing) is a
 * refusal; a tag deleted on another phone is `missing`.
 */
export async function renameTagRow(
  tagId: string,
  name: string,
): Promise<{ tag: Tag; recipeCount: number } | WriteError> {
  const checked = checkTagName(name);
  if ("error" in checked) return checked;

  if (await findTagByName(db, checked.name, tagId)) {
    return { error: "A tag with that name already exists.", code: "invalid" };
  }

  try {
    const updated = await db.tag.update({
      where: { id: tagId },
      data: { name: checked.name },
      include: { _count: { select: { recipes: true } } },
    });
    const { _count, ...tag } = updated;
    return { tag, recipeCount: _count.recipes };
  } catch (error) {
    if (isMissingRowError(error)) return TAG_MISSING;
    throw error;
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
  if (!recipe) return { error: "That recipe no longer exists.", code: "missing" };
  if (!tag) return TAG_MISSING;

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
 * Make a recipe carry exactly `tagIds`, inside the caller's transaction (the
 * caller has the recipe row locked). Every id must be a real tag, else
 * `TAG_MISSING` and nothing is written. Returns copies of the rows created
 * and deleted.
 */
export async function applyRecipeTagDiff(
  tx: Tx,
  recipeId: string,
  tagIds: string[],
): Promise<{ created: RecipeTag[]; deleted: RecipeTag[] } | WriteError> {
  const wanted = [...new Set(tagIds)];
  if (!(await tagsExist(tx, wanted))) return TAG_MISSING;

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
}

/**
 * `applyRecipeTagDiff` on its own: one transaction, recipe row-locked.
 * `{ error }` for a missing recipe or an unknown tag id.
 */
export async function setRecipeTagRows(
  recipeId: string,
  tagIds: string[],
): Promise<{ created: RecipeTag[]; deleted: RecipeTag[] } | WriteError> {
  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Recipe" WHERE "id" = ${recipeId} FOR UPDATE`;
    if (locked.length === 0) return { error: "That recipe no longer exists.", code: "missing" as const };
    return applyRecipeTagDiff(tx, recipeId, tagIds);
  });
}
