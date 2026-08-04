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
import { getVerifiedSession } from "@/lib/dal";
import { toMealSlot } from "@/lib/constants";

function refreshMealPlanViews() {
  revalidatePath("/kitchen/cooking/meal-plan");
  revalidatePath("/kitchen/cooking");
  revalidatePath("/kitchen");
}

export type MealPlanActionResult = { error?: string };

/**
 * Create a week's plan. `weekStart` is whatever Date the browser decided on
 * (see CreatePlanSheet) — stored as-is, no server-side reinterpretation.
 *
 * Two phones tapping the same week chip at once both want the same outcome
 * ("this week is planned"), so a unique-constraint collision here isn't an
 * error to surface — it's treated as success either way.
 */
export async function createMealPlan(
  weekStart: Date,
): Promise<MealPlanActionResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  try {
    await db.mealPlan.create({ data: { weekStart } });
  } catch (error) {
    const isDuplicateWeek =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (!isDuplicateWeek) throw error;
  }

  refreshMealPlanViews();
  return {};
}

/**
 * Single tap, no confirmation dialog — same delete rule as every other item
 * in the app. Entries cascade-delete with their plan (schema-level).
 */
export async function deleteMealPlan(mealPlanId: string): Promise<void> {
  if (!(await getVerifiedSession())) return;

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
