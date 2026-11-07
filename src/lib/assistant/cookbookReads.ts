import "server-only";

// The one place the cookbook routes read cookbooks: one narrow select each,
// shaped by serializeCookbooks.ts.

import { db } from "@/lib/db";
import { assistantCreatedWhere, didAssistantCreate } from "./audit";
import { toCookbook, toCookbookDetail } from "./serializeCookbooks";

const LIST_SELECT = {
  id: true,
  title: true,
  shareToken: true,
  _count: { select: { recipes: true } },
} as const;

export async function listCookbooks() {
  const rows = await db.cookbook.findMany({ select: LIST_SELECT, orderBy: { title: "asc" } });
  return rows.map(toCookbook);
}

/** One cookbook in the list shape, or null when it doesn't exist. */
export async function getCookbookListItem(id: string) {
  const row = await db.cookbook.findUnique({ where: { id }, select: LIST_SELECT });
  return row ? toCookbook(row) : null;
}

/** One cookbook with its recipes (newest filing first), or null when it doesn't exist. */
export async function getCookbook(id: string, origin: string) {
  const row = await db.cookbook.findUnique({
    where: { id },
    select: {
      ...LIST_SELECT,
      recipes: {
        select: { addedAt: true, recipe: { select: { id: true, title: true } } },
      },
    },
  });
  if (!row) return null;
  return toCookbookDetail(row, origin, await didAssistantCreate("Cookbook", id));
}

/**
 * Which of this cookbook's filings did the Assistant API itself make? (Ids of
 * its filings whose create is in the audit log, undo-made ones not counted.)
 * Read just before a delete, then checked against the filings the delete's own
 * transaction sees: a filing that appeared in between is not in this set, so
 * it counts as the family's and the delete is refused.
 */
export async function assistantFiledIds(cookbookId: string): Promise<Set<string>> {
  const filings = await db.cookbookRecipe.findMany({ where: { cookbookId }, select: { id: true } });
  if (filings.length === 0) return new Set();
  const hits = await db.assistantChange.findMany({
    where: assistantCreatedWhere("CookbookRecipe", { in: filings.map((f) => f.id) }),
    select: { recordId: true },
  });
  return new Set(hits.map((h) => h.recordId));
}
