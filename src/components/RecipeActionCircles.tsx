"use client";

import { useState } from "react";
import { CalendarDays, ShoppingCart, Share2 } from "lucide-react";
import { ActionCircle } from "./ActionCircle";
import { ShareSheet } from "./ShareSheet";
import { AddToMealPlanSheet, type PlannedWeek } from "./AddToMealPlanSheet";
import { AddToGroceriesSheet } from "./AddToGroceriesSheet";

/**
 * The three quick-action circles under the recipe title: Meal Plan, Add to
 * groceries, and Share. All three are real as of C5 — Meal Plan and Groceries
 * shipped visible-but-stubbed in C3 (per the house's no-feature-stubbed-early
 * rule) and are wired up here.
 */
export function RecipeActionCircles({
  recipeId,
  title,
  ingredients,
  steps,
  initialShareToken,
  plannedWeeks,
}: {
  recipeId: string;
  title: string;
  ingredients: string;
  steps: string;
  initialShareToken: string | null;
  /** Weeks that already have a meal plan, so the picker reuses one instead
   * of colliding on MealPlan.weekStart. */
  plannedWeeks: PlannedWeek[];
}) {
  const [openSheet, setOpenSheet] = useState<
    "share" | "mealPlan" | "groceries" | null
  >(null);

  return (
    <div className="mb-6 flex items-center justify-around">
      <ActionCircle
        icon={<CalendarDays aria-hidden="true" size={22} />}
        label="Meal Plan"
        onClick={() => setOpenSheet("mealPlan")}
      />
      <ActionCircle
        icon={<ShoppingCart aria-hidden="true" size={22} />}
        label="Groceries"
        onClick={() => setOpenSheet("groceries")}
      />
      <ActionCircle
        icon={<Share2 aria-hidden="true" size={22} />}
        label="Share"
        onClick={() => setOpenSheet("share")}
      />

      {openSheet === "share" && (
        <ShareSheet
          recipeId={recipeId}
          title={title}
          ingredients={ingredients}
          steps={steps}
          initialShareToken={initialShareToken}
          onClose={() => setOpenSheet(null)}
        />
      )}

      {openSheet === "mealPlan" && (
        <AddToMealPlanSheet
          recipeId={recipeId}
          recipeTitle={title}
          plannedWeeks={plannedWeeks}
          onClose={() => setOpenSheet(null)}
        />
      )}

      {openSheet === "groceries" && (
        <AddToGroceriesSheet
          recipeId={recipeId}
          onClose={() => setOpenSheet(null)}
        />
      )}
    </div>
  );
}
