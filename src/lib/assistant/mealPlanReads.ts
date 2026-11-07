import "server-only";

// The meal-plan routes' database reads, narrow selects only. The week's plan
// is found with `findWeekPlan` (mealPlanWrites.ts), by distance, never by
// equality.

import { db } from "@/lib/db";
import { recipeLines } from "@/lib/recipeText";

/** A week's entries, and the titles of the recipes they link to. */
export async function readWeekEntries(planId: string) {
  const entries = await db.mealPlanEntry.findMany({
    where: { mealPlanId: planId },
    select: { dayOffset: true, slot: true, title: true, recipeId: true },
  });
  const ids = [...new Set(entries.flatMap((e) => (e.recipeId ? [e.recipeId] : [])))];
  const recipes = ids.length
    ? await db.recipe.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })
    : [];
  return { entries, recipeTitles: new Map(recipes.map((r) => [r.id, r.title])) };
}

export function getRecipeTitle(id: string) {
  return db.recipe.findUnique({ where: { id }, select: { title: true } });
}

/** Every distinct recipe linked in the plan, with its ingredient lines. */
export async function readPlanRecipes(planId: string) {
  const recipes = await db.recipe.findMany({
    where: { mealPlanEntries: { some: { mealPlanId: planId } } },
    select: { id: true, title: true, ingredients: true },
    orderBy: { title: "asc" },
  });
  return recipes.map((r) => ({ id: r.id, title: r.title, lines: recipeLines(r.ingredients) }));
}
