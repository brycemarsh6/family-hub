// Which models undo can restore, remove and re-create, and how they hang
// together. Pure data (no database), shared by undoPlan.ts and undoWrites.ts.

import type {
  CookbookRecipe,
  GroceryItem,
  MealPlan,
  MealPlanEntry,
  PantryItem,
  Recipe,
  RecipeTag,
  Tag,
} from "@/generated/prisma/client";

export type UndoModel =
  | "PantryItem"
  | "GroceryItem"
  | "Recipe"
  | "Tag"
  | "RecipeTag"
  | "CookbookRecipe"
  | "MealPlan"
  | "MealPlanEntry";

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
  CookbookRecipe: describe(COOKBOOK_RECIPE_COLUMNS),
  MealPlan: describe(MEAL_PLAN_COLUMNS),
  MealPlanEntry: describe(MEAL_PLAN_ENTRY_COLUMNS),
};

/**
 * 0 = a parent (nothing in this list points at it as a required owner), 1 =
 * a row that points at one. Removes run children first so a parent delete
 * never cascades away a row the plan still expects to delete; re-creates run
 * parents first so a child finds its parent.
 */
export const TIER: Record<UndoModel, 0 | 1> = {
  PantryItem: 0, Recipe: 0, Tag: 0, MealPlan: 0,
  GroceryItem: 1, RecipeTag: 1, CookbookRecipe: 1, MealPlanEntry: 1,
};

/** The database table behind each parent model (for the row locks). */
export const PARENT_TABLES = {
  PantryItem: "PantryItem",
  Recipe: "Recipe",
  Tag: "Tag",
  MealPlan: "MealPlan",
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
  child: "GroceryItem" | "VoiceChange" | "RecipeTag" | "CookbookRecipe" | "MealPlanEntry";
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
  MealPlan: [{ child: "MealPlanEntry", column: "mealPlanId" }],
};

/**
 * What a re-created row points at. `onMissing: "null"` is what the database
 * itself does when that parent is deleted (SetNull), so the row comes back
 * with the link empty; "refuse" means the row cannot exist without it.
 */
export type ForeignKey = {
  column: string;
  parent: "PantryItem" | "User" | "Recipe" | "Tag" | "Cookbook" | "MealPlan";
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
};
