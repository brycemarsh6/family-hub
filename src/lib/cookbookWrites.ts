import "server-only";

// The one definition of every cookbook write (mission 45, C1): create,
// find-or-create, rename, delete, file a recipe, unfile it, share, stop
// sharing. Same shape as `tagWrites.ts` and `recipeWrites.ts`: `server-only`,
// NO auth check, NO `revalidatePath`. The actions in `actions/cookbooks.ts`
// add the session or manager-role check and the page refresh; the Assistant
// API adds its token, its audit log and its undo copies.
//
// Every write returns whole-row copies (every column) of what it created,
// replaced or removed. Updates take a row lock (`SELECT ... FOR UPDATE`) in a
// transaction, so `before` is exactly what the write replaced and `after` is
// exactly what it left.
//
// A refusal comes back as a `WriteError` (`writeError.ts`).

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { Cookbook, CookbookRecipe, Prisma } from "@/generated/prisma/client";
import { isForeignKeyViolationError, isUniqueViolationError } from "@/lib/prismaErrors";
import { invalid, missing, RECIPE_MISSING } from "@/lib/writeError";
import type { WriteError } from "@/lib/writeError";

type Tx = Prisma.TransactionClient;

export const COOKBOOK_MISSING: WriteError = missing("That cookbook no longer exists.");

/** The trimmed title, or the refusal when it trims to nothing. */
function checkTitle(title: string): { title: string } | WriteError {
  const trimmed = title.trim();
  if (!trimmed) return invalid("Give the cookbook a title.");
  return { title: trimmed };
}

/** Lock one cookbook row and read it; null when it doesn't exist. */
async function lockCookbook(tx: Tx, id: string): Promise<Cookbook | null> {
  await tx.$queryRaw`SELECT "id" FROM "Cookbook" WHERE "id" = ${id} FOR UPDATE`;
  return tx.cookbook.findUnique({ where: { id } });
}

/** Make a new, empty cookbook (the app's create: twins are allowed). */
export async function createCookbookRow(title: string): Promise<{ cookbook: Cookbook } | WriteError> {
  const checked = checkTitle(title);
  if ("error" in checked) return checked;
  return { cookbook: await db.cookbook.create({ data: { title: checked.title } }) };
}

/**
 * The cookbook with this title (any casing; the oldest if several match), or a
 * new one. `created` is the new row's copy, or null when one already existed.
 * There is no unique index on the title, so same-title creates are serialised
 * with a transaction advisory lock on the lowercased title before the
 * find-then-create.
 */
export async function findOrCreateCookbookRow(
  title: string,
): Promise<{ cookbook: Cookbook; recipeCount: number; created: Cookbook | null } | WriteError> {
  const checked = checkTitle(title);
  if ("error" in checked) return checked;

  return db.$transaction(async (tx) => {
    // $executeRaw: the lock call returns void, which $queryRaw cannot read back.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(lower(${checked.title})))`;
    // Raw SQL on purpose: Prisma's case-insensitive `equals` runs as ILIKE,
    // where `%` and `_` in a title would act as wildcards.
    const [match] = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Cookbook"
      WHERE lower("title") = lower(${checked.title})
      ORDER BY "createdAt" ASC, "id" ASC
      LIMIT 1`;
    const existing = match
      ? await tx.cookbook.findUnique({
          where: { id: match.id },
          include: { _count: { select: { recipes: true } } },
        })
      : null;
    if (existing) {
      const { _count, ...cookbook } = existing;
      return { cookbook, recipeCount: _count.recipes, created: null };
    }
    const created = await tx.cookbook.create({ data: { title: checked.title } });
    return { cookbook: created, recipeCount: 0, created };
  });
}

/**
 * Rename a cookbook. Another cookbook with the same title is fine (the app
 * allows twins). The same title it has now writes nothing, so `updatedAt`
 * doesn't move and `before` equals `after`.
 */
export async function renameCookbookRow(
  id: string,
  title: string,
): Promise<{ before: Cookbook; after: Cookbook } | WriteError> {
  const checked = checkTitle(title);
  if ("error" in checked) return checked;

  return db.$transaction(async (tx) => {
    const before = await lockCookbook(tx, id);
    if (!before) return COOKBOOK_MISSING;
    if (before.title === checked.title) return { before, after: before };
    const after = await tx.cookbook.update({ where: { id }, data: { title: checked.title } });
    return { before, after };
  });
}

/**
 * Delete a cookbook and, by cascade, its filings (never the recipes). The
 * cookbook is locked first: a filing being inserted at the same moment needs a
 * key-share lock on this row, so it waits, and the `guard` sees every filing.
 * `guard` may refuse (nothing is deleted then). Null if the cookbook is gone.
 */
export async function deleteCookbookRow(
  id: string,
  guard?: (filings: CookbookRecipe[]) => WriteError | null,
): Promise<{ cookbook: Cookbook; filings: CookbookRecipe[] } | WriteError | null> {
  return db.$transaction(async (tx) => {
    const cookbook = await lockCookbook(tx, id);
    if (!cookbook) return null;
    const filings = await tx.cookbookRecipe.findMany({ where: { cookbookId: id } });
    const refusal = guard?.(filings) ?? null;
    if (refusal) return refusal;
    await tx.cookbook.delete({ where: { id } });
    return { cookbook, filings };
  });
}

/**
 * File a recipe in a cookbook. Idempotent: `created` is null when it was
 * already filed (a lost race on the pair counts). Either side missing,
 * checked first or caught as a foreign-key failure, is a `missing` refusal.
 */
export async function fileRecipeRow(
  cookbookId: string,
  recipeId: string,
): Promise<{ created: CookbookRecipe | null } | WriteError> {
  async function whatIsMissing(): Promise<WriteError | null> {
    const [cookbook, recipe] = await Promise.all([
      db.cookbook.findUnique({ where: { id: cookbookId }, select: { id: true } }),
      db.recipe.findUnique({ where: { id: recipeId }, select: { id: true } }),
    ]);
    if (!cookbook) return COOKBOOK_MISSING;
    if (!recipe) return RECIPE_MISSING;
    return null;
  }

  const gone = await whatIsMissing();
  if (gone) return gone;

  try {
    return { created: await db.cookbookRecipe.create({ data: { cookbookId, recipeId } }) };
  } catch (error) {
    if (isUniqueViolationError(error)) return { created: null };
    if (isForeignKeyViolationError(error)) return (await whatIsMissing()) ?? COOKBOOK_MISSING;
    throw error;
  }
}

/** Unfile a recipe. Idempotent: `deleted` is the removed row's copy, or null. Never touches the recipe. */
export async function unfileRecipeRow(
  cookbookId: string,
  recipeId: string,
): Promise<{ deleted: CookbookRecipe | null }> {
  return db.$transaction(async (tx) => {
    const row = await tx.cookbookRecipe.findUnique({
      where: { cookbookId_recipeId: { cookbookId, recipeId } },
    });
    if (!row) return { deleted: null };
    const { count } = await tx.cookbookRecipe.deleteMany({ where: { id: row.id } });
    return { deleted: count > 0 ? row : null };
  });
}

/**
 * Share a cookbook. Idempotent: an already-shared one keeps its token
 * (`changed: false`, nothing written, `before` equals `after`). 32 random
 * bytes is the whole gate on the public page. Null if missing.
 */
export async function shareCookbookRow(
  id: string,
): Promise<{ before: Cookbook; after: Cookbook; changed: boolean } | null> {
  return db.$transaction(async (tx) => {
    const before = await lockCookbook(tx, id);
    if (!before) return null;
    if (before.shareToken) return { before, after: before, changed: false };
    const after = await tx.cookbook.update({
      where: { id },
      data: { shareToken: randomBytes(32).toString("base64url") },
    });
    return { before, after, changed: true };
  });
}

/** Turn sharing off: the token is nulled, so the old link 404s. Null if missing. */
export async function stopSharingCookbookRow(
  id: string,
): Promise<{ before: Cookbook; after: Cookbook } | null> {
  return db.$transaction(async (tx) => {
    const before = await lockCookbook(tx, id);
    if (!before) return null;
    // Already off: write nothing, so `updatedAt` doesn't move and an earlier
    // undo isn't refused as "changed since".
    if (!before.shareToken) return { before, after: before };
    const after = await tx.cookbook.update({ where: { id }, data: { shareToken: null } });
    return { before, after };
  });
}
