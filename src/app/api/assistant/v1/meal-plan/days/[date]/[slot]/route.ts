import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { ApiError, fromZodError } from "@/lib/assistant/errors";
import { mealPlanPutBody, mealSlotParams } from "@/lib/assistant/schemasMealPlan";
import { toWriteFailure } from "@/lib/assistant/serializeRecipes";
import { toMealCell, weekForDate } from "@/lib/assistant/serializeMealPlan";
import { findWeekPlan, getRecipeTitle } from "@/lib/assistant/mealPlanReads";
import { PLAN_TOLERANCE_MS } from "@/lib/assistant/summary";
import { parseDateParam } from "@/lib/householdDate";
import { clearMealPlanEntryRow, setMealPlanEntryInWeekRow } from "@/lib/mealPlanWrites";
import type { z } from "zod";

type Params = { date: string; slot: string };

/** The path is the only place the date and slot live, so it is checked here. */
function readParams(params: Params) {
  const parsed = mealSlotParams.safeParse(params);
  if (!parsed.success) throw fromZodError(parsed.error);
  return { slot: parsed.data.slot, ...weekForDate(parseDateParam(parsed.data.date)!), date: parsed.data.date };
}

export const PUT = assistantRoute<Params, z.output<typeof mealPlanPutBody>>({
  action: "mealPlan.setMeal",
  body: mealPlanPutBody,
  handler: async ({ params, body, changes }) => {
    const { slot, date, instant, dayOffset } = readParams(params);

    // The recipe is checked before a plan is created, so a bad id leaves nothing behind.
    const recipe = body.recipeId ? await getRecipeTitle(body.recipeId) : null;
    if (body.recipeId && !recipe) throw new ApiError(404, "not_found", "That recipe doesn't exist.");
    const title = body.title ?? recipe!.title;

    // One transaction: find the week's plan within +-14 h (or create it) and
    // write the slot, so a failure leaves no empty plan behind.
    const result = await setMealPlanEntryInWeekRow(instant, PLAN_TOLERANCE_MS, {
      dayOffset,
      slot,
      title,
      recipeId: body.recipeId ?? null,
    });
    if (result.error !== undefined) throw toWriteFailure(result);
    if (result.planCreated) {
      changes.push({
        model: "MealPlan",
        recordId: result.planCreated.id,
        action: "create",
        summary: { weekOf: date },
        before: null,
        after: result.planCreated,
      });
    }
    changes.push({
      model: "MealPlanEntry",
      recordId: result.after.id,
      action: result.before ? "update" : "create",
      summary: { date, slot, title },
      before: result.before,
      after: result.after,
    });
    return { data: { date, slot, meal: toMealCell(result.after, recipe?.title ?? null) } };
  },
});

export const DELETE = assistantRoute<Params>({
  action: "mealPlan.clearMeal",
  handler: async ({ params, changes }) => {
    const { slot, date, instant, dayOffset } = readParams(params);
    const plan = await findWeekPlan(instant);
    if (!plan) return { data: { cleared: false } };
    const removed = await clearMealPlanEntryRow({ mealPlanId: plan.id, dayOffset, slot });
    // Clearing an empty slot is a no-op: nothing to record, nothing to undo.
    if (!removed) return { data: { cleared: false } };
    changes.push({
      model: "MealPlanEntry",
      recordId: removed.id,
      action: "delete",
      summary: { date, slot, title: removed.title },
      before: removed,
      after: null,
    });
    return { data: { cleared: true } };
  },
});
