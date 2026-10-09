import { estimateExpiryDate } from "@/lib/shelfLife";
import type { Category, Location } from "@/lib/constants";

// Small shared helpers for anywhere that needs "how many days until this
// expires" — the Expiring page itself, and the Kitchen tile's badge count.
// Kept separate from shelfLife.ts because this is date arithmetic glue, not
// the shelf-life data/matching logic that file owns.

/** Midnight, local time — so "today" means the same thing all day, not just
 * at the exact moment a request happens to run. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysUntil(target: Date, from: Date): number {
  const ms = startOfDay(target).getTime() - startOfDay(from).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * The date an item effectively expires on, and whether that's a real date or
 * a guess. `null` when there's nothing to go on — see estimateExpiryDate for
 * why that's common and correct (spices, dry goods, etc. don't get one).
 */
export function effectiveExpiry(item: {
  name: string;
  category: Category;
  location: Location;
  expiresAt: Date | null;
  restockedAt: Date;
}): { date: Date; isEstimate: boolean } | null {
  if (item.expiresAt) return { date: item.expiresAt, isEstimate: false };
  const estimated = estimateExpiryDate(item);
  return estimated ? { date: estimated, isEstimate: true } : null;
}

/** Which red/amber/muted section an expiry falls in. */
export type Urgency = "now" | "week" | "later";

/** "now" and "week" are the red and amber sections; anything else inside the
 * caller's window is "later" (muted). One definition for the Expiring page and
 * the Assistant API. */
export function urgencyFor(daysLeft: number): Urgency {
  if (daysLeft <= 1) return "now";
  if (daysLeft <= 6) return "week";
  return "later";
}

/** Whether an expiry `daysLeft` days away is inside a `withinDays` window.
 * Inclusive, and already-expired (negative) counts — they're even more
 * "within". Pure, so it doesn't care how `daysLeft` was computed. */
export function expiresWithin(daysLeft: number, withinDays: number): boolean {
  return daysLeft <= withinDays;
}

/**
 * Whether an item expires within `withinDays` of `today` (already-expired
 * items count). Items with no real date and no estimate never match. This is
 * the process-local form, for the dashboard and the Kitchen tile. They run on
 * the SERVER's clock (UTC on Vercel), not the household's — a tolerated skew of
 * a few hours each evening (see CLAUDE.md). The Assistant API is stricter: it
 * computes `daysLeft` zone-aware (assistant/today.ts) and shares only the
 * comparison, `expiresWithin`, and the buckets, `urgencyFor`.
 */
export function isExpiringWithin(
  item: Parameters<typeof effectiveExpiry>[0],
  withinDays: number,
  today: Date,
): boolean {
  const expiry = effectiveExpiry(item);
  return expiry !== null && expiresWithin(daysUntil(expiry.date, today), withinDays);
}
