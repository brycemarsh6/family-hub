import "server-only";

import { db } from "@/lib/db";
import { isLow } from "@/lib/constants";
import { addDays } from "@/lib/mealPlanDates";
import { isExpiringWithin } from "@/lib/expiring";
import { storeBreakdown, urgentLowItems, type StoreCount, type UrgentLowItems } from "@/lib/dashboard";
import type { Category, Location } from "@/lib/constants";
import type { MealPlanView } from "@/lib/types";

// The dashboard's kitchen reads, one function per widget kind, so the page can
// load only the kinds a person's layout actually has. A kind with two widgets
// is read once and shared. The Habits and Goals reads live in habitsRead.ts and
// goalsRead.ts (no second habit reader). `now` is the server clock, used only
// to bound queries and the expiring-soon count, never to decide which day it is.

// "Expiring soon" on the Inventory tile means today/tomorrow plus one extra
// day of runway. The number is kept here rather than in a shared constant:
// expiring.ts doesn't export one, and this tile is its only caller. If a
// second caller ever needs it, that's the time to make the shared constant.
const EXPIRING_SOON_WINDOW_DAYS = 3;

// How many of the most-urgent low items to name on the Inventory tile
// before folding the rest into "+N more": a dashboard tile is a glance,
// not a list, so this stays small on purpose.
const MAX_URGENT_LOW_ITEMS = 3;

export type InventorySummary = {
  stocked: number;
  lowCount: number;
  expiringSoonCount: number;
  urgent: UrgentLowItems;
};

export async function loadInventorySummary(now: Date): Promise<InventorySummary> {
  const pantryItems = await db.pantryItem.findMany({
    select: {
      name: true,
      quantity: true,
      lowThreshold: true,
      category: true,
      location: true,
      expiresAt: true,
      restockedAt: true,
    },
  });

  // Postgres can't compare two columns of the same row to each other inside
  // a `where`, so the low check happens here instead (the Inventory page
  // does the same). Fine at
  // family scale (hundreds of rows, not thousands).
  const lowItems = pantryItems.filter((item) => isLow(item.quantity, item.lowThreshold));

  const expiringSoonCount = pantryItems.filter((item) => {
    return isExpiringWithin(
      {
        name: item.name,
        category: item.category as Category,
        location: item.location as Location,
        expiresAt: item.expiresAt,
        restockedAt: item.restockedAt,
      },
      EXPIRING_SOON_WINDOW_DAYS,
      now,
    );
  }).length;

  return {
    stocked: pantryItems.length,
    lowCount: lowItems.length,
    expiringSoonCount,
    urgent: urgentLowItems(lowItems, MAX_URGENT_LOW_ITEMS),
  };
}

export type GrocerySummary = { toBuy: number; breakdown: StoreCount[] };

export async function loadGrocerySummary(): Promise<GrocerySummary> {
  const groceryItems = await db.groceryItem.findMany({
    where: { checked: false },
    select: { store: true },
  });
  return { toBuy: groceryItems.length, breakdown: storeBreakdown(groceryItems) };
}

export type RecipesSummary = { count: number; newestTitle: string | null };

export async function loadRecipesSummary(): Promise<RecipesSummary> {
  const [count, newest] = await Promise.all([
    db.recipe.count(),
    db.recipe.findFirst({
      orderBy: { createdAt: "desc" },
      select: { title: true },
    }),
  ]);
  return { count, newestTitle: newest?.title ?? null };
}

/**
 * The meal plans near now, for the Today's meals tile. The window is a wide
 * tolerance, not a "what day is it" decision: Vercel's server clock runs UTC
 * while this household runs Mountain, so nothing that actually decides which
 * week is "current" may use `now`. That decision happens entirely client-side,
 * in TodayMealsTile, against the browser's own clock (see src/lib/useToday.ts).
 * ±8 days comfortably contains the real current week no matter how far the two
 * clocks disagree.
 */
export async function loadMealPlans(now: Date): Promise<MealPlanView[]> {
  const mealPlans = await db.mealPlan.findMany({
    where: { weekStart: { gte: addDays(now, -8), lte: addDays(now, 8) } },
    include: {
      entries: {
        select: { id: true, dayOffset: true, slot: true, title: true, recipeId: true },
      },
    },
  });

  // Same shape as meal-plan/page.tsx's own view mapping: kept in sync by
  // hand, since MealPlanView is a plain browser-facing type, not something
  // Prisma produces directly.
  return mealPlans.map((plan) => ({
    id: plan.id,
    weekStart: plan.weekStart,
    entries: plan.entries.map((entry) => ({
      id: entry.id,
      dayOffset: entry.dayOffset,
      slot: entry.slot,
      title: entry.title,
      recipeId: entry.recipeId,
    })),
  }));
}
