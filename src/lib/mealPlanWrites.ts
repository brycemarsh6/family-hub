import "server-only";

// The one definition of every meal-plan write (mission-44/C2), pulled out of
// `actions/mealPlans.ts` because the Assistant API is a second caller. Same
// shape as `groceryWrites.ts`: a `server-only` lib module with NO auth check
// and no `revalidatePath` (those stay with each caller).
//
// Nothing here decides "which Sunday is this" (mealPlanDates.ts rule 2): every
// week instant is given by the caller, stored as given.
//
// Copies (the audit log's undo): MealPlanEntry changes run in a transaction
// that first locks the slot's row (`SELECT ... FOR UPDATE`), so the `before`
// read after the lock is exactly what the write then replaces. A slot that
// does not exist yet cannot be locked, so two creators can race; the loser
// hits the unique key (P2002), its transaction rolls back whole, and it runs
// once more, now finding and locking the winner's row.

import { db } from "@/lib/db";
import type { MealPlan, MealPlanEntry, Prisma } from "@/generated/prisma/client";
import { toMealSlot } from "@/lib/constants";
import { isUniqueViolationError } from "@/lib/prismaErrors";

/**
 * Create a week's plan at `weekStart`. Two phones tapping the same week at
 * once both want "this week is planned", so a unique-key collision is
 * success: the existing plan is read back. `created` is a copy of the row
 * this call made, null when it already existed. `plan` is null only if the
 * winner was deleted again before it could be read.
 */
export async function getOrCreateMealPlanRow(
  weekStart: Date,
): Promise<{ plan: MealPlan | null; created: MealPlan | null }> {
  try {
    const created = await db.mealPlan.create({ data: { weekStart } });
    return { plan: created, created };
  } catch (error) {
    if (!isUniqueViolationError(error)) throw error;
    const existing = await db.mealPlan.findUnique({ where: { weekStart } });
    return { plan: existing, created: null };
  }
}

/**
 * The plan whose weekStart is within `toleranceMs` of `instant`, nearest
 * first. Plans are stored as the creating phone's local midnight, which
 * differs by zone, so lookup is by distance, never by equality.
 */
export async function findPlanNear(
  instant: Date,
  toleranceMs: number,
): Promise<MealPlan | null> {
  const t = instant.getTime();
  const plans = await db.mealPlan.findMany({
    where: {
      weekStart: { gte: new Date(t - toleranceMs), lte: new Date(t + toleranceMs) },
    },
  });
  let best: MealPlan | null = null;
  let bestGap = Infinity;
  for (const plan of plans) {
    const gap = Math.abs(plan.weekStart.getTime() - t);
    if (gap < bestGap) {
      best = plan;
      bestGap = gap;
    }
  }
  return best;
}

/**
 * Find the week's existing plan within tolerance, or create one at `instant`
 * (an exact-instant collision re-finds, via getOrCreateMealPlanRow).
 */
export async function getOrCreatePlanNear(
  instant: Date,
  toleranceMs: number,
): Promise<{ plan: MealPlan | null; created: MealPlan | null }> {
  const found = await findPlanNear(instant, toleranceMs);
  if (found) return { plan: found, created: null };
  return getOrCreateMealPlanRow(instant);
}

async function lockSlot(
  tx: Prisma.TransactionClient,
  where: { mealPlanId: string; dayOffset: number; slot: string },
) {
  await tx.$queryRaw`SELECT "id" FROM "MealPlanEntry" WHERE "mealPlanId" = ${where.mealPlanId} AND "dayOffset" = ${where.dayOffset} AND "slot" = ${where.slot} FOR UPDATE`;
}

export type SetMealPlanEntryResult =
  | { error: string }
  | { error?: undefined; before: MealPlanEntry | null; after: MealPlanEntry };

/**
 * Fill (or overwrite) one slot. Validates like the family's action always
 * has, plus a recipe that no longer exists is an error (it used to crash).
 * `before` is the entry this replaced, null when the slot was empty.
 */
export async function setMealPlanEntryRow(input: {
  mealPlanId: string;
  dayOffset: number;
  slot: string;
  title: string;
  recipeId?: string | null;
}): Promise<SetMealPlanEntryResult> {
  const slot = toMealSlot(input.slot);
  if (!slot) return { error: "That's not a real meal slot." };
  if (!Number.isInteger(input.dayOffset) || input.dayOffset < 0 || input.dayOffset > 6) {
    return { error: "That's not a real day of the week." };
  }
  const title = input.title.trim();
  if (!title) return { error: "Give the meal a name." };

  const recipeId = input.recipeId ?? null;
  if (recipeId) {
    const recipe = await db.recipe.findUnique({
      where: { id: recipeId },
      select: { id: true },
    });
    if (!recipe) return { error: "That recipe no longer exists." };
  }

  const where = { mealPlanId: input.mealPlanId, dayOffset: input.dayOffset, slot };
  const attempt = () =>
    db.$transaction(async (tx) => {
      await lockSlot(tx, where);
      const before = await tx.mealPlanEntry.findUnique({
        where: { mealPlanId_dayOffset_slot: where },
      });
      const after = before
        ? await tx.mealPlanEntry.update({
            where: { id: before.id },
            data: { title, recipeId },
          })
        : await tx.mealPlanEntry.create({ data: { ...where, title, recipeId } });
      return { before, after };
    });

  try {
    return await attempt();
  } catch (error) {
    if (!isUniqueViolationError(error)) throw error;
    return await attempt();
  }
}

/**
 * Empty a slot. Returns the entry it removed, or null if the slot was already
 * empty (a no-op, not an error). The slot is not validated: an unknown one
 * simply matches nothing.
 */
export async function clearMealPlanEntryRow(input: {
  mealPlanId: string;
  dayOffset: number;
  slot: string;
}): Promise<MealPlanEntry | null> {
  return db.$transaction(async (tx) => {
    await lockSlot(tx, input);
    const existing = await tx.mealPlanEntry.findUnique({
      where: { mealPlanId_dayOffset_slot: input },
    });
    if (!existing) return null;
    await tx.mealPlanEntry.delete({ where: { id: existing.id } });
    return existing;
  });
}
