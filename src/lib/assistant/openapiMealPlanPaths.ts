import { mealPlanPutBody, mealPlanWeekQuery } from "./schemasMealPlan";
import type { Operation } from "./openapiTypes";

// The registry rows for the meal-plan routes. Fury wires this array into
// openapi.ts; until then openapi.test.ts fails on exactly these routes.

export const mealPlanOperations: Operation[] = [
  {
    method: "GET",
    path: "/meal-plan",
    action: "mealPlan.week",
    summary:
      "One week of the meal plan. weekOf is any day (YYYY-MM-DD); its Sunday (Denver) is the week. Omitted = this week. " +
      "A week nobody has planned yet answers planId: null with every meal null.",
    query: mealPlanWeekQuery,
    response:
      "{ weekOf (the Sunday), planId | null, days: [7 x { date, meals: { Breakfast, Lunch, Dinner, Snacks } }] } " +
      "where each meal is { title, recipeId, recipeTitle } or null.",
  },
  {
    method: "PUT",
    path: "/meal-plan/days/{date}/{slot}",
    action: "mealPlan.setMeal",
    summary:
      "Fill or overwrite one meal. date is YYYY-MM-DD; slot is exactly Breakfast, Lunch, Dinner or Snacks. " +
      "Send a title, a recipeId, or both (the title defaults to the recipe's). Creates the week's plan if it has none. Undoable.",
    body: mealPlanPutBody,
    response: "{ date, slot, meal: { title, recipeId, recipeTitle } }. 404 if the recipe doesn't exist; 400 for a bad date or slot.",
  },
  {
    method: "DELETE",
    path: "/meal-plan/days/{date}/{slot}",
    action: "mealPlan.clearMeal",
    summary: "Empty one meal. Clearing an already-empty meal is not an error and records nothing. Undoable.",
    response: "{ cleared: boolean }. 400 for a bad date or slot.",
  },
  {
    method: "GET",
    path: "/meal-plan/grocery-needs",
    action: "mealPlan.groceryNeeds",
    summary:
      "What the week's linked recipes need that the house lacks. All ingredient lines are read together (one AI call), " +
      "then checked against the inventory and the shopping list. A week with no linked recipes answers empty lists without the AI.",
    query: mealPlanWeekQuery,
    response:
      "{ weekOf, readable, recipes: [{id,title}], missing: [{ name, from: [{recipeId, line}] }], onList: [name], have: [name] }. " +
      "readable is false when the week had ingredient lines but the AI read none of them (the lists are then empty and mean " +
      "\"unknown\", not \"nothing needed\"); true otherwise, including a week with no lines. " +
      "503 ai_unavailable (retry-after 5) when the AI can't be reached (nothing is guessed; try again).",
  },
];
