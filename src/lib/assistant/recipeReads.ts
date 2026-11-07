import "server-only";

// The one place the recipe routes read recipes, cookbooks and tags: one
// narrow select each, shaped by serializeRecipes.ts.

import { db } from "@/lib/db";
import { searchRecipes } from "@/lib/match";
import {
  toCookbook,
  toRecipeDetail,
  toRecipeListItem,
  toTag,
  totalMinutes,
} from "./serializeRecipes";

const LIST_SELECT = {
  id: true,
  title: true,
  ingredients: true, // for q only; the list item never carries it
  rating: true,
  lastCookedAt: true,
  servings: true,
  prepTime: true,
  cookTime: true,
  shareToken: true,
  tags: { select: { tag: { select: { id: true, name: true } } } },
  cookbooks: { select: { cookbook: { select: { id: true, title: true } } } },
} as const;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  steps: true,
  notes: true,
  sourceUrl: true,
  nutritionCalories: true,
  nutritionProteinG: true,
  nutritionCarbsG: true,
  nutritionFatG: true,
  nutritionServings: true,
  nutritionFingerprint: true,
} as const;

/** Title A to Z, or best match first when `q` is given. */
export async function listRecipes(filter: {
  q?: string;
  tagId?: string;
  cookbookId?: string;
  maxMinutes?: number;
}) {
  let rows = await db.recipe.findMany({
    where: {
      ...(filter.tagId ? { tags: { some: { tagId: filter.tagId } } } : {}),
      ...(filter.cookbookId ? { cookbooks: { some: { cookbookId: filter.cookbookId } } } : {}),
    },
    select: LIST_SELECT,
    orderBy: { title: "asc" },
  });
  if (filter.q && filter.q.trim()) rows = searchRecipes(filter.q, rows);
  const { maxMinutes } = filter;
  if (maxMinutes !== undefined) {
    // A recipe whose times don't parse is left out rather than guessed at.
    rows = rows.filter((row) => {
      const total = totalMinutes(row.prepTime, row.cookTime);
      return total !== null && total <= maxMinutes;
    });
  }
  return rows.map(toRecipeListItem);
}

/** One recipe in the detail shape, or null when it doesn't exist. */
export async function getRecipe(id: string, origin: string) {
  const row = await db.recipe.findUnique({ where: { id }, select: DETAIL_SELECT });
  return row ? toRecipeDetail(row, origin) : null;
}

export async function listCookbooks() {
  const rows = await db.cookbook.findMany({
    select: { id: true, title: true, _count: { select: { recipes: true } } },
    orderBy: { title: "asc" },
  });
  return rows.map(toCookbook);
}

export async function listTags() {
  const rows = await db.tag.findMany({
    select: { id: true, name: true, _count: { select: { recipes: true } } },
    orderBy: { name: "asc" },
  });
  return rows.map((row) => toTag(row, row._count.recipes));
}

/** True when every id is a real tag (a cheap check before a two-part edit). */
export async function allTagsExist(tagIds: string[]): Promise<boolean> {
  const wanted = [...new Set(tagIds)];
  if (wanted.length === 0) return true;
  return (await db.tag.count({ where: { id: { in: wanted } } })) === wanted.length;
}
