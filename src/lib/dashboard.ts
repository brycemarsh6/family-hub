import { addDays, isSameDay, sundayOf } from "@/lib/mealPlanDates";
import { MEAL_SLOTS, STORES, type MealSlot } from "@/lib/constants";
import type { MealPlanView } from "@/lib/types";

// Pure logic for the dashboard's four tiles. No "use client", no
// server-only, no `db` import — these have to run on both the server (the
// page itself) and the client (TodayMealsTile, which needs the browser's
// own idea of "today" — see useToday.ts) and be directly unit-testable
// against plain data, the same shape as recipeFilters.ts.

/** One of today's four meal slots, as the dashboard tile shows it. `title`
 * is null for an empty slot — the tile renders that as a muted "—". */
export type TodaySlot = {
  slot: MealSlot;
  title: string | null;
  recipeId: string | null;
};

/**
 * Today's four meal slots, or null when no meal plan covers the week
 * containing `today`. When a plan does cover it, the result is always
 * exactly 4 slots (one per MEAL_SLOTS, in that order) — an unfilled slot
 * is `{ title: null, recipeId: null }`, not a missing entry, so the tile
 * never has to guess whether a slot is "empty" or "not yet known".
 *
 * Calendar-component math only (via mealPlanDates.ts's addDays/isSameDay),
 * never millisecond arithmetic — a week is 167 or 169 hours across a
 * daylight-saving change, not always 168. `today` must already be decided
 * by the caller (the browser's clock, via useToday()) — this function does
 * no clock reads of its own.
 */
export function todaysMeals(plans: MealPlanView[], today: Date): TodaySlot[] | null {
  const todaySunday = sundayOf(today);
  const plan = plans.find((p) => isSameDay(p.weekStart, todaySunday));
  if (!plan) return null;

  // Which of this week's 7 days is today? Walked day-by-day with addDays
  // rather than computed from a millisecond difference, so it stays correct
  // across the Nov 1, 2026 DST fall-back the same way the Meal Plan branch
  // itself does.
  let dayOffset = -1;
  for (let offset = 0; offset < 7; offset++) {
    if (isSameDay(addDays(plan.weekStart, offset), today)) {
      dayOffset = offset;
      break;
    }
  }

  return MEAL_SLOTS.map((slot) => {
    const entry = plan.entries.find((e) => e.dayOffset === dayOffset && e.slot === slot);
    return {
      slot,
      title: entry ? entry.title : null,
      recipeId: entry ? entry.recipeId : null,
    };
  });
}

/** One row of the Grocery tile's per-store breakdown — "Costco 4". */
export type StoreCount = {
  label: string;
  count: number;
};

/**
 * How many to-buy grocery items sit against each store, for the Grocery
 * tile's summary line ("Costco 4 · Walmart 2 · Unassigned 1"). Only stores
 * that actually have items appear; ordered by count descending, with ties
 * broken by STORES' own order (the same "walk the real vocabulary" pattern
 * as categoryOrder/locationOrder in constants.ts) -- except "Unassigned"
 * (a null store), which always sorts last, EVEN when it would otherwise be
 * the biggest group by count. A pile of undecided items shouldn't read as
 * the headline of "what to buy where", so it's pinned to the end rather
 * than competing on count at all.
 */
export function storeBreakdown(items: { store: string | null }[]): StoreCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = item.store ?? "Unassigned";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  function sortOrder(label: string): number {
    const index = STORES.indexOf(label as (typeof STORES)[number]);
    // A store name that isn't in STORES shouldn't be reachable (every
    // GroceryItem.store is validated by toStore() on write), but falling
    // back to "sorts at the end" rather than crashing is the safe choice
    // if old data ever disagrees.
    return index === -1 ? STORES.length : index;
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      // Unassigned is pinned last regardless of count -- checked before the
      // count comparison below, not as a tiebreak within it.
      if (a.label === "Unassigned") return 1;
      if (b.label === "Unassigned") return -1;
      return b.count - a.count || sortOrder(a.label) - sortOrder(b.label);
    });
}

/** The Inventory tile's "what's most urgent" line: a handful of low-item
 * names plus how many more there are beyond that. */
export type UrgentLowItems = {
  names: string[];
  more: number;
};

/**
 * The `max` most urgent low pantry items, by name — "Out" (quantity 0)
 * first, then ascending quantity, ties broken alphabetically so the result
 * is deterministic regardless of the order `lowItems` arrives in (a
 * Prisma `findMany` makes no ordering promise we can rely on here).
 */
export function urgentLowItems(
  lowItems: { name: string; quantity: number }[],
  max: number,
): UrgentLowItems {
  const sorted = [...lowItems].sort(
    (a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name),
  );
  return {
    names: sorted.slice(0, max).map((item) => item.name),
    more: Math.max(0, sorted.length - max),
  };
}
