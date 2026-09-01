"use server";

// Server Actions for the Meal Plan. Same rule as every other actions file:
// a Server Action is a real public POST endpoint, reachable directly, so
// every one of these opens with a getVerifiedSession() check.
//
// Nothing here decides "what day is today" or "which Sunday is this" — see
// src/lib/mealPlanDates.ts for why that decision has to be made by the
// browser, not the server. Every Date these actions receive is stored or
// added-to exactly as given, never reconstructed from calendar components.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getVerifiedSession, getVerifiedUser } from "@/lib/dal";
import { toMealSlot, MANAGER_ROLES } from "@/lib/constants";
import type { Category, Location } from "@/lib/constants";
import { effectiveExpiry, daysUntil } from "@/lib/expiring";
import { suggestMeals, type MealSuggestion } from "@/lib/mealSuggest";

function refreshMealPlanViews() {
  revalidatePath("/kitchen/cooking/meal-plan");
  revalidatePath("/kitchen/cooking");
  revalidatePath("/kitchen");
}

export type MealPlanActionResult = { error?: string };

/** Adds the new (or already-existing) plan's id to the usual result — the
 * recipe detail page's "Meal Plan" button needs it to fill a slot in the
 * same interaction, without a second round trip to find the plan it just
 * made. See AddToMealPlanSheet. */
export type CreateMealPlanResult = MealPlanActionResult & { mealPlanId?: string };

/**
 * Create a week's plan. `weekStart` is whatever Date the browser decided on
 * (see CreatePlanSheet) — stored as-is, no server-side reinterpretation.
 *
 * Two phones tapping the same week chip at once both want the same outcome
 * ("this week is planned"), so a unique-constraint collision here isn't an
 * error to surface — it's treated as success either way, and the existing
 * plan's id is read back so the caller gets the same answer whichever phone
 * won the race.
 */
export async function createMealPlan(
  weekStart: Date,
): Promise<CreateMealPlanResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  let mealPlanId: string | undefined;

  try {
    const created = await db.mealPlan.create({ data: { weekStart } });
    mealPlanId = created.id;
  } catch (error) {
    const isDuplicateWeek =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (!isDuplicateWeek) throw error;

    const existing = await db.mealPlan.findUnique({
      where: { weekStart },
      select: { id: true },
    });
    mealPlanId = existing?.id;
  }

  refreshMealPlanViews();
  return { mealPlanId };
}

/**
 * Single tap, no confirmation dialog — same delete rule as every other item
 * in the app. Entries cascade-delete with their plan (schema-level).
 */
export async function deleteMealPlan(mealPlanId: string): Promise<void> {
  // Gated to admin/parent — deleting a whole week's plan is management,
  // not participation; filling/clearing individual slots stays open to
  // any signed-in user (setMealPlanEntry, clearMealPlanEntry).
  const user = await getVerifiedUser();
  if (!user || !MANAGER_ROLES.includes(user.role)) return;

  await db.mealPlan.deleteMany({ where: { id: mealPlanId } });
  refreshMealPlanViews();
}

/**
 * Fill (or overwrite) one slot. Upserts on the entry's own unique key, so a
 * double-tap or a slow network retry lands on the same row instead of a
 * duplicate.
 */
export async function setMealPlanEntry(input: {
  mealPlanId: string;
  dayOffset: number;
  slot: string;
  title: string;
  recipeId?: string | null;
}): Promise<MealPlanActionResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const slot = toMealSlot(input.slot);
  if (!slot) return { error: "That's not a real meal slot." };
  if (!Number.isInteger(input.dayOffset) || input.dayOffset < 0 || input.dayOffset > 6) {
    return { error: "That's not a real day of the week." };
  }
  const title = input.title.trim();
  if (!title) return { error: "Give the meal a name." };

  await db.mealPlanEntry.upsert({
    where: {
      mealPlanId_dayOffset_slot: {
        mealPlanId: input.mealPlanId,
        dayOffset: input.dayOffset,
        slot,
      },
    },
    create: {
      mealPlanId: input.mealPlanId,
      dayOffset: input.dayOffset,
      slot,
      title,
      recipeId: input.recipeId ?? null,
    },
    update: {
      title,
      recipeId: input.recipeId ?? null,
    },
  });

  refreshMealPlanViews();
  return {};
}

/** How soon an item has to be going bad to be worth building a meal around.
 * Wider than the Kitchen tile's 3-day badge — the point here is "plan around
 * it before it's urgent", not "this is urgent now". */
const SUGGEST_EXPIRY_WINDOW_DAYS = 7;

export type SuggestMealsResult = {
  suggestions?: MealSuggestion[];
  error?: string;
};

/**
 * "What can I make?" — asks Claude for meal ideas grounded in the real
 * inventory. Guarded like every other action here, and deliberately
 * READ-ONLY: it hands suggestions back to the client and writes nothing.
 * A suggestion only becomes a meal when the user taps it, which routes
 * through setMealPlanEntry like any other way of filling a slot.
 */
export async function suggestMealsForSlot(
  slot: string,
): Promise<SuggestMealsResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const mealSlot = toMealSlot(slot);
  if (!mealSlot) return { error: "That's not a real meal slot." };

  const recipeFields = { id: true, title: true, ingredients: true } as const;

  const [pantryItems, slotRecipes, allRecipes] = await Promise.all([
    db.pantryItem.findMany({
      where: { quantity: { gt: 0 } },
      select: {
        name: true,
        quantity: true,
        unit: true,
        category: true,
        location: true,
        expiresAt: true,
        restockedAt: true,
      },
      orderBy: { name: "asc" },
    }),
    // Pre-filtered by slot tag BEFORE the prompt, not inside it — a model
    // can't ignore a list it never saw. The tag's name is exactly the slot's
    // own name (seeded from MEAL_SLOTS in prisma/seed-slot-tags.ts), so this
    // is an exact match, never a fuzzy one — the steaks/"tea" lesson applied
    // preemptively rather than learned again.
    db.recipe.findMany({
      where: { tags: { some: { tag: { name: mealSlot } } } },
      select: recipeFields,
      orderBy: { title: "asc" },
    }),
    db.recipe.findMany({ select: recipeFields, orderBy: { title: "asc" } }),
  ]);

  // Untagged-library fallback: if nothing is tagged for this slot yet (the
  // common case before anyone's tagged anything), fall back to the whole
  // library rather than suggesting nothing.
  const recipes = slotRecipes.length > 0 ? slotRecipes : allRecipes;

  const today = new Date();
  const expiringSoon = pantryItems
    .map((item) => {
      const expiry = effectiveExpiry({
        name: item.name,
        category: item.category as Category,
        location: item.location as Location,
        expiresAt: item.expiresAt,
        restockedAt: item.restockedAt,
      });
      if (!expiry) return null;
      const daysLeft = daysUntil(expiry.date, today);
      return daysLeft <= SUGGEST_EXPIRY_WINDOW_DAYS
        ? { name: item.name, daysLeft }
        : null;
    })
    .filter((item) => item !== null)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  try {
    const suggestions = await suggestMeals({
      slot: mealSlot,
      inventory: pantryItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        // `unit` is optional on a pantry item ("3 bananas" needs no unit),
        // so fall back to a bare count rather than printing "null".
        unit: item.unit ?? "",
      })),
      expiringSoon,
      recipes,
    });

    if (suggestions.length === 0) {
      return { error: "Couldn't think of anything from what's in stock." };
    }
    return { suggestions };
  } catch (error) {
    // Never let a Claude outage block the manual paths — the sheet keeps
    // presets, the recipe picker, and free text usable either way.
    console.error("suggestMealsForSlot failed:", error);
    return { error: "Couldn't reach the AI just now. Try again in a moment." };
  }
}

/** Empties a slot. A no-op (not an error) if it was already empty — the
 * same idempotent shape as every other clear/skip action in the app. */
export async function clearMealPlanEntry(input: {
  mealPlanId: string;
  dayOffset: number;
  slot: string;
}): Promise<void> {
  if (!(await getVerifiedSession())) return;

  await db.mealPlanEntry.deleteMany({
    where: {
      mealPlanId: input.mealPlanId,
      dayOffset: input.dayOffset,
      slot: input.slot,
    },
  });

  refreshMealPlanViews();
}
