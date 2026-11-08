// Which models undo can restore, remove and re-create, and how they hang
// together. Pure data (no database), shared by undoPlan.ts and undoWrites.ts.
//
// VOLATILE columns are caches the app rebuilds on its own (a habit's streak
// numbers). A copy still records them (so it stays a full row), but undo never
// matches on them (a family tap that only moved a cache is not a conflict) and
// never writes them back (a restored old number would be wrong); undoHooks.ts
// rebuilds them inside the same transaction.

import type {
  Cookbook, CookbookRecipe, Goal, GoalCheckIn, GroceryItem, Habit, HabitLog, HabitParticipant,
  HabitTimeEntry, MealPlan, MealPlanEntry, PantryItem, PlanItem, Recipe, RecipeTag, Tag,
  VisionStatement,
} from "@/generated/prisma/client";

export type UndoModel =
  | "PantryItem" | "GroceryItem" | "Recipe" | "Tag" | "RecipeTag" | "Cookbook"
  | "CookbookRecipe" | "MealPlan" | "MealPlanEntry"
  | "Habit" | "HabitParticipant" | "HabitLog" | "HabitTimeEntry"
  | "Goal" | "GoalCheckIn" | "PlanItem" | "VisionStatement";

export type ColumnKind = "date" | "value";

/**
 * Every column of each model we may restore, and which of them are dates.
 * Typed over the generated Prisma rows, so a column added to the schema stops
 * `tsc` here until it is classified (otherwise undo would silently skip it).
 */
const PANTRY_COLUMNS: Record<keyof PantryItem, ColumnKind> = {
  id: "value", name: "value", location: "value", quantity: "value", unit: "value",
  category: "value", lowThreshold: "value", expiresAt: "date", restockedAt: "date",
  createdAt: "date", updatedAt: "date",
};

const GROCERY_COLUMNS: Record<keyof GroceryItem, ColumnKind> = {
  id: "value", name: "value", quantity: "value", unit: "value", category: "value",
  checked: "value", addedBy: "value", note: "value", store: "value", addedById: "value",
  location: "value", categoryEdited: "value", pantryItemId: "value", createdAt: "date",
  checkedAt: "date",
};

const RECIPE_COLUMNS: Record<keyof Recipe, ColumnKind> = {
  id: "value", title: "value", ingredients: "value", steps: "value", servings: "value",
  prepTime: "value", cookTime: "value", sourceUrl: "value", notes: "value",
  shareToken: "value", rating: "value", lastCookedAt: "date", nutritionCalories: "value",
  nutritionProteinG: "value", nutritionCarbsG: "value", nutritionFatG: "value",
  nutritionServings: "value", nutritionFingerprint: "value", createdAt: "date",
  updatedAt: "date",
};

const TAG_COLUMNS: Record<keyof Tag, ColumnKind> = {
  id: "value", name: "value", createdAt: "date",
};

const RECIPE_TAG_COLUMNS: Record<keyof RecipeTag, ColumnKind> = {
  id: "value", recipeId: "value", tagId: "value",
};

const COOKBOOK_COLUMNS: Record<keyof Cookbook, ColumnKind> = {
  id: "value", title: "value", shareToken: "value", createdAt: "date", updatedAt: "date",
};

const COOKBOOK_RECIPE_COLUMNS: Record<keyof CookbookRecipe, ColumnKind> = {
  id: "value", cookbookId: "value", recipeId: "value", addedAt: "date",
};

const MEAL_PLAN_COLUMNS: Record<keyof MealPlan, ColumnKind> = {
  id: "value", weekStart: "date", createdAt: "date",
};

const MEAL_PLAN_ENTRY_COLUMNS: Record<keyof MealPlanEntry, ColumnKind> = {
  id: "value", mealPlanId: "value", dayOffset: "value", slot: "value", title: "value",
  recipeId: "value", createdAt: "date", updatedAt: "date",
};

const HABIT_COLUMNS: Record<keyof Habit, ColumnKind> = {
  id: "value", title: "value", kind: "value", mode: "value", icon: "value", lifeArea: "value",
  timeOfDay: "value", schedule: "value", weekdays: "value", times: "value", anchorWeek: "date",
  carryOver: "value", track: "value", weeklyMinutes: "value", paceDays: "value",
  hoursSince: "date", sharing: "value", isPrivate: "value", everyone: "value",
  archivedAt: "date", createdById: "value", createdAt: "date", updatedAt: "date",
};

const HABIT_PARTICIPANT_COLUMNS: Record<keyof HabitParticipant, ColumnKind> = {
  id: "value", habitId: "value", userId: "value", sortOrder: "value", currentStreak: "value",
  bestStreak: "value", streakAsOf: "date", joinedAt: "date",
};

const HABIT_LOG_COLUMNS: Record<keyof HabitLog, ColumnKind> = {
  id: "value", habitId: "value", userId: "value", day: "date", status: "value",
  loggedById: "value", createdAt: "date",
};

const HABIT_TIME_ENTRY_COLUMNS: Record<keyof HabitTimeEntry, ColumnKind> = {
  id: "value", habitId: "value", userId: "value", day: "date", minutes: "value",
  loggedById: "value", createdAt: "date",
};

const GOAL_COLUMNS: Record<keyof Goal, ColumnKind> = {
  id: "value", title: "value", area: "value", why: "value", targetDate: "date", ownerId: "value",
  visibility: "value", measureUnit: "value", startValue: "value", targetValue: "value",
  currentValue: "value", checkedInAt: "date", completedAt: "date", createdById: "value",
  createdAt: "date", updatedAt: "date",
};

const GOAL_CHECK_IN_COLUMNS: Record<keyof GoalCheckIn, ColumnKind> = {
  id: "value", goalId: "value", value: "value", at: "date", createdById: "value",
};

const PLAN_ITEM_COLUMNS: Record<keyof PlanItem, ColumnKind> = {
  id: "value", goalId: "value", title: "value", kind: "value", timesPerPeriod: "value",
  period: "value", doneAt: "date", sortOrder: "value", habitId: "value", createdAt: "date",
  updatedAt: "date",
};

const VISION_STATEMENT_COLUMNS: Record<keyof VisionStatement, ColumnKind> = {
  id: "value", area: "value", horizon: "value", ownerId: "value", boardKey: "value",
  text: "value", updatedById: "value", createdAt: "date", updatedAt: "date",
};

function describe(kinds: Record<string, ColumnKind>) {
  const columns = Object.keys(kinds);
  return { columns, dates: columns.filter((c) => kinds[c] === "date") };
}

export const MODELS: Record<UndoModel, { columns: readonly string[]; dates: readonly string[] }> = {
  PantryItem: describe(PANTRY_COLUMNS),
  GroceryItem: describe(GROCERY_COLUMNS),
  Recipe: describe(RECIPE_COLUMNS),
  Tag: describe(TAG_COLUMNS),
  RecipeTag: describe(RECIPE_TAG_COLUMNS),
  Cookbook: describe(COOKBOOK_COLUMNS),
  CookbookRecipe: describe(COOKBOOK_RECIPE_COLUMNS),
  MealPlan: describe(MEAL_PLAN_COLUMNS),
  MealPlanEntry: describe(MEAL_PLAN_ENTRY_COLUMNS),
  Habit: describe(HABIT_COLUMNS),
  HabitParticipant: describe(HABIT_PARTICIPANT_COLUMNS),
  HabitLog: describe(HABIT_LOG_COLUMNS),
  HabitTimeEntry: describe(HABIT_TIME_ENTRY_COLUMNS),
  Goal: describe(GOAL_COLUMNS),
  GoalCheckIn: describe(GOAL_CHECK_IN_COLUMNS),
  PlanItem: describe(PLAN_ITEM_COLUMNS),
  VisionStatement: describe(VISION_STATEMENT_COLUMNS),
};

/** Cache columns undo neither matches on nor writes (see the header). */
export const VOLATILE: Partial<Record<UndoModel, readonly string[]>> = {
  HabitParticipant: ["currentStreak", "bestStreak", "streakAsOf"],
  // The goal's number mirrors its newest check-in; undoHooks.ts rebuilds it.
  Goal: ["currentValue", "checkedInAt"],
};

export function isVolatile(model: UndoModel, column: string): boolean {
  return VOLATILE[model]?.includes(column) ?? false;
}

/**
 * 0 = a parent (nothing in this list points at it as a required owner), 1 =
 * a row that points at one. Removes run children first so a parent delete
 * never cascades away a row the plan still expects to delete; re-creates run
 * parents first so a child finds its parent.
 */
export const TIER: Record<UndoModel, 0 | 1> = {
  PantryItem: 0, Recipe: 0, Tag: 0, Cookbook: 0, MealPlan: 0,
  Habit: 0, Goal: 0, VisionStatement: 0,
  GroceryItem: 1, RecipeTag: 1, CookbookRecipe: 1, MealPlanEntry: 1,
  HabitParticipant: 1, HabitLog: 1, HabitTimeEntry: 1, GoalCheckIn: 1, PlanItem: 1,
};

/** The database table behind each parent model (for the row locks). */
export const PARENT_TABLES = {
  PantryItem: "PantryItem",
  Recipe: "Recipe",
  Tag: "Tag",
  Cookbook: "Cookbook",
  MealPlan: "MealPlan",
  Habit: "Habit",
  Goal: "Goal",
  PlanItem: "PlanItem",
} as const;

export type ParentModel = keyof typeof PARENT_TABLES;

export function isParentModel(model: string): model is ParentModel {
  return Object.hasOwn(PARENT_TABLES, model);
}

/**
 * Rows that point at a parent. `child` may be a model undo does not cover
 * (VoiceChange): such rows are never removed by a plan, so they always count.
 */
export type Reference = {
  child:
    | "GroceryItem" | "VoiceChange" | "RecipeTag" | "CookbookRecipe" | "MealPlanEntry"
    | "HabitParticipant" | "HabitLog" | "HabitTimeEntry"
    | "HabitPlannedDay" | "ChoreWeekOverride" | "Nudge" | "PlanItem" | "GoalCheckIn" | "PlanLog";
  column: string;
};

export const REFERENCES: Record<ParentModel, readonly Reference[]> = {
  PantryItem: [
    { child: "GroceryItem", column: "pantryItemId" },
    { child: "VoiceChange", column: "pantryItemId" },
  ],
  Recipe: [
    { child: "RecipeTag", column: "recipeId" },
    { child: "CookbookRecipe", column: "recipeId" },
    { child: "MealPlanEntry", column: "recipeId" },
  ],
  Tag: [{ child: "RecipeTag", column: "tagId" }],
  Cookbook: [{ child: "CookbookRecipe", column: "cookbookId" }],
  MealPlan: [{ child: "MealPlanEntry", column: "mealPlanId" }],
  // HabitPlannedDay, ChoreWeekOverride and Nudge are not covered by undo, so a
  // plan never removes them and they always count as in use. A PlanItem is
  // covered: one the plan removes, or restores away from the habit, is left
  // out of the count (referenceChecks).
  Habit: [
    { child: "HabitParticipant", column: "habitId" },
    { child: "HabitLog", column: "habitId" },
    { child: "HabitTimeEntry", column: "habitId" },
    { child: "HabitPlannedDay", column: "habitId" },
    { child: "ChoreWeekOverride", column: "habitId" },
    { child: "Nudge", column: "habitId" },
    { child: "PlanItem", column: "habitId" },
  ],
  Goal: [
    { child: "GoalCheckIn", column: "goalId" },
    { child: "PlanItem", column: "goalId" },
  ],
  // PlanLog is not covered, so a plan never removes one: always in use.
  PlanItem: [{ child: "PlanLog", column: "planItemId" }],
};

/**
 * What a re-created row points at. `onMissing: "null"` is what the database
 * itself does when that parent is deleted (SetNull), so the row comes back
 * with the link empty; "refuse" means the row cannot exist without it.
 */
export type ForeignKey = {
  column: string;
  parent: "PantryItem" | "User" | "Recipe" | "Tag" | "Cookbook" | "MealPlan" | "Habit" | "Goal";
  onMissing: "null" | "refuse";
};

export const FOREIGN_KEYS: Partial<Record<UndoModel, readonly ForeignKey[]>> = {
  GroceryItem: [
    { column: "pantryItemId", parent: "PantryItem", onMissing: "null" },
    { column: "addedById", parent: "User", onMissing: "null" },
  ],
  RecipeTag: [
    { column: "recipeId", parent: "Recipe", onMissing: "refuse" },
    { column: "tagId", parent: "Tag", onMissing: "refuse" },
  ],
  CookbookRecipe: [
    { column: "cookbookId", parent: "Cookbook", onMissing: "refuse" },
    { column: "recipeId", parent: "Recipe", onMissing: "refuse" },
  ],
  MealPlanEntry: [
    { column: "mealPlanId", parent: "MealPlan", onMissing: "refuse" },
    { column: "recipeId", parent: "Recipe", onMissing: "null" },
  ],
  Habit: [{ column: "createdById", parent: "User", onMissing: "null" }],
  HabitParticipant: [
    { column: "habitId", parent: "Habit", onMissing: "refuse" },
    { column: "userId", parent: "User", onMissing: "refuse" },
  ],
  HabitLog: [
    { column: "habitId", parent: "Habit", onMissing: "refuse" },
    { column: "userId", parent: "User", onMissing: "refuse" },
    { column: "loggedById", parent: "User", onMissing: "null" },
  ],
  HabitTimeEntry: [
    { column: "habitId", parent: "Habit", onMissing: "refuse" },
    { column: "userId", parent: "User", onMissing: "refuse" },
    { column: "loggedById", parent: "User", onMissing: "null" },
  ],
  Goal: [
    { column: "ownerId", parent: "User", onMissing: "refuse" }, // not silently Together
    { column: "createdById", parent: "User", onMissing: "null" },
  ],
  GoalCheckIn: [
    { column: "goalId", parent: "Goal", onMissing: "refuse" },
    { column: "createdById", parent: "User", onMissing: "null" },
  ],
  PlanItem: [
    { column: "goalId", parent: "Goal", onMissing: "refuse" },
    { column: "habitId", parent: "Habit", onMissing: "refuse" }, // not unlinked
  ],
  VisionStatement: [
    { column: "ownerId", parent: "User", onMissing: "refuse" },
    { column: "updatedById", parent: "User", onMissing: "null" },
  ],
};
