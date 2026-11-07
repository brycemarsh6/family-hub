import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { aiUnavailable } from "@/lib/assistant/errors";
import { mealPlanWeekQuery } from "@/lib/assistant/schemasMealPlan";
import { toGroceryNeeds, weekForDate } from "@/lib/assistant/serializeMealPlan";
import { readPlanRecipes } from "@/lib/assistant/mealPlanReads";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { formatCalendarDate, parseDateParam } from "@/lib/householdDate";
import { findWeekPlan } from "@/lib/mealPlanWrites";
import { IngredientAiError, classifyIngredientLines } from "@/lib/recipeIngredientMatch";
import type { z } from "zod";

export const GET = assistantRoute<Record<string, never>, undefined, z.output<typeof mealPlanWeekQuery>>({
  action: "mealPlan.groceryNeeds",
  query: mealPlanWeekQuery,
  handler: async ({ query, now }) => {
    const day = query.weekOf ? parseDateParam(query.weekOf)! : requireHouseholdToday(now);
    const { sunday, instant } = weekForDate(day);
    const weekOf = formatCalendarDate(sunday);
    const plan = await findWeekPlan(instant);
    const recipes = plan ? await readPlanRecipes(plan.id) : [];
    const empty = { weekOf, readable: true, recipes: [], missing: [], onList: [], have: [] };
    const lines = recipes.flatMap((r) => r.lines);
    // Nothing linked (or nothing to read): no AI call.
    if (lines.length === 0) {
      return { data: { ...empty, recipes: recipes.map((r) => ({ id: r.id, title: r.title })) } };
    }

    // ONE parse call for every recipe's lines together.
    let result;
    try {
      result = await classifyIngredientLines(lines);
    } catch (error) {
      if (!(error instanceof IngredientAiError)) throw error;
      // Nothing is guessed on an AI outage.
      throw aiUnavailable();
    }
    const recipeList = recipes.map((r) => ({ id: r.id, title: r.title }));
    if (result.status === "unreadable") return { data: { ...empty, readable: false, recipes: recipeList } };
    const needs = toGroceryNeeds(
      result.suggestions,
      recipes.map((r) => ({ recipeId: r.id, lines: r.lines })),
    );
    return { data: { weekOf, readable: true, recipes: recipeList, ...needs } };
  },
});
