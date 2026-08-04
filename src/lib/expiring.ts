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
