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
// once more, now finding and locking the winner's row. A write that also
// creates the week's plan can lose twice (the plan race, then the slot race
// on the winner's plan), so that one gets three attempts.

import { db } from "@/lib/db";
import type { MealPlan, MealPlanEntry, Prisma } from "@/generated/prisma/client";
import { toMealSlot } from "@/lib/constants";
import { pickNearestPlan, planWindow } from "@/lib/mealPlanWeek";
import { isUniqueViolationError } from "@/lib/prismaErrors";
import type { WriteError } from "@/lib/tagWrites";

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
 * The week's plan: the one whose weekStart is within PLAN_TOLERANCE_MS of
 * `instant`, nearest first. Plans are stored as the creating phone's local
 * midnight, which differs by zone, so lookup is by distance, never by equality.
 */
export async function findWeekPlan(
  instant: Date,
  client: Prisma.TransactionClient | typeof db = db,
): Promise<MealPlan | null> {
  const t = instant.getTime();
  return pickNearestPlan(await client.mealPlan.findMany({ where: { weekStart: planWindow(t) } }), t);
}

async function lockSlot(
  tx: Prisma.TransactionClient,
  where: { mealPlanId: string; dayOffset: number; slot: string },
) {
  await tx.$queryRaw`SELECT "id" FROM "MealPlanEntry" WHERE "mealPlanId" = ${where.mealPlanId} AND "dayOffset" = ${where.dayOffset} AND "slot" = ${where.slot} FOR UPDATE`;
}

export type SetMealPlanEntryResult =
  | WriteError
  | { error?: undefined; before: MealPlanEntry | null; after: MealPlanEntry };

type SlotInput = {
  dayOffset: number;
  slot: string;
  title: string;
  recipeId?: string | null;
};

/** The family's validation of a slot write, normalized; or the refusal. */
async function checkSlotInput(
  input: SlotInput,
): Promise<{ slot: string; dayOffset: number; title: string; recipeId: string | null } | WriteError> {
  const slot = toMealSlot(input.slot);
  if (!slot) return { error: "That's not a real meal slot.", code: "invalid" };
  if (!Number.isInteger(input.dayOffset) || input.dayOffset < 0 || input.dayOffset > 6) {
    return { error: "That's not a real day of the week.", code: "invalid" };
  }
  const title = input.title.trim();
  if (!title) return { error: "Give the meal a name.", code: "invalid" };

  const recipeId = input.recipeId ?? null;
  if (recipeId) {
    const recipe = await db.recipe.findUnique({
      where: { id: recipeId },
      select: { id: true },
    });
    if (!recipe) return { error: "That recipe no longer exists.", code: "missing" };
  }
  return { slot, dayOffset: input.dayOffset, title, recipeId };
}

/** Lock the slot's row, then update it or create it; `before` is what it replaced. */
async function writeSlot(
  tx: Prisma.TransactionClient,
  where: { mealPlanId: string; dayOffset: number; slot: string },
  title: string,
  recipeId: string | null,
) {
  await lockSlot(tx, where);
  const before = await tx.mealPlanEntry.findUnique({
    where: { mealPlanId_dayOffset_slot: where },
  });
  const after = before
    ? await tx.mealPlanEntry.update({ where: { id: before.id }, data: { title, recipeId } })
    : await tx.mealPlanEntry.create({ data: { ...where, title, recipeId } });
  return { before, after };
}

/** Run a whole transaction; if it lost a create race (P2002) run it again, up to `attempts` in all. */
async function retryOnRace<T>(attempt: () => Promise<T>, attempts: number): Promise<T> {
  for (let n = 1; ; n++) {
    try {
      return await attempt();
    } catch (error) {
      if (n >= attempts || !isUniqueViolationError(error)) throw error;
    }
  }
}

/**
 * Fill (or overwrite) one slot. Validates like the family's action always
 * has, plus a recipe that no longer exists is an error (it used to crash).
 * `before` is the entry this replaced, null when the slot was empty.
 */
export async function setMealPlanEntryRow(
  input: SlotInput & { mealPlanId: string },
): Promise<SetMealPlanEntryResult> {
  const checked = await checkSlotInput(input);
  if ("error" in checked) return checked;

  const { slot, dayOffset, title, recipeId } = checked;
  const where = { mealPlanId: input.mealPlanId, dayOffset, slot };
  return retryOnRace(() => db.$transaction((tx) => writeSlot(tx, where, title, recipeId)), 2);
}

/**
 * Fill one slot in the week whose plan sits within PLAN_TOLERANCE_MS of
 * `instant`, creating that plan at `instant` when the week has none. Plan
 * and slot are written in ONE transaction, so a failure leaves no empty plan
 * behind and the request is all-or-nothing for undo. `planCreated` is a copy
 * of the plan this call made, null when the week already had one. A lost
 * create race (plan or slot, P2002) reruns the whole transaction, up to 3
 * attempts in all.
 */
export async function setMealPlanEntryInWeekRow(
  instant: Date,
  input: SlotInput,
): Promise<
  | WriteError
  | { error?: undefined; planCreated: MealPlan | null; before: MealPlanEntry | null; after: MealPlanEntry }
> {
  const checked = await checkSlotInput(input);
  if ("error" in checked) return checked;

  const { slot, dayOffset, title, recipeId } = checked;
  return retryOnRace(
    () =>
      db.$transaction(async (tx) => {
        const found = await findWeekPlan(instant, tx);
        const plan = found ?? (await tx.mealPlan.create({ data: { weekStart: instant } }));
        const written = await writeSlot(tx, { mealPlanId: plan.id, dayOffset, slot }, title, recipeId);
        return { planCreated: found ? null : plan, ...written };
      }),
    3,
  );
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
