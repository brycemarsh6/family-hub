import { isLow } from "@/lib/constants";
import type { ReviewQueue, DuplicateCandidate } from "@/lib/duplicates";
import { effectiveExpiry } from "@/lib/expiring";
import { calendarDateInZone, formatCalendarDate, type CalendarDate } from "@/lib/householdDate";
import { daysUntilInZone } from "@/lib/assistant/today";

// DB row -> wire format for the Assistant API. Pure, and every output is built
// field by field: never a spread of a row, so a column added to the schema
// later (a hash, a token) can't leak onto the wire by default.

type PantryRow = {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  location: string;
  lowThreshold: number;
  expiresAt: Date | null;
  restockedAt: Date;
  updatedAt: Date;
};

export function toInventoryItem(
  row: PantryRow,
  ctx: { onList: boolean; today: CalendarDate; timeZone: string },
) {
  const expiry = effectiveExpiry({
    name: row.name,
    // effectiveExpiry takes the vocabulary types; rows hold plain strings.
    category: row.category as Parameters<typeof effectiveExpiry>[0]["category"],
    location: row.location as Parameters<typeof effectiveExpiry>[0]["location"],
    expiresAt: row.expiresAt,
    restockedAt: row.restockedAt,
  });
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    category: row.category,
    location: row.location,
    lowThreshold: row.lowThreshold,
    status:
      row.quantity <= 0
        ? ("out" as const)
        : isLow(row.quantity, row.lowThreshold)
          ? ("low" as const)
          : ("ok" as const),
    expiresOn: row.expiresAt
      ? formatCalendarDate(calendarDateInZone(row.expiresAt, ctx.timeZone))
      : null,
    expiry: expiry
      ? {
          date: formatCalendarDate(calendarDateInZone(expiry.date, ctx.timeZone)),
          isEstimate: expiry.isEstimate,
          daysLeft: daysUntilInZone(expiry.date, ctx.today, ctx.timeZone),
        }
      : null,
    onShoppingList: ctx.onList,
    restockedAt: row.restockedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toFamilyMember(row: {
  id: string;
  displayName: string;
  role: string;
  deactivatedAt: Date | null;
}) {
  return {
    id: row.id,
    displayName: row.displayName,
    role: row.role,
    isKid: row.role === "kid",
    isActive: row.deactivatedAt === null,
  };
}

const toQueueItem = (c: DuplicateCandidate) => ({
  id: c.id,
  name: c.name,
  location: c.location,
  category: c.category,
  quantity: c.quantity,
  unit: c.unit,
});

export function toReviewQueue(queue: ReviewQueue) {
  return {
    total: queue.total,
    pairs: queue.pairs.map((p) => ({
      kind: p.kind,
      fingerprint: p.fingerprint,
      a: toQueueItem(p.a),
      b: toQueueItem(p.b),
    })),
    parked: queue.parked.map((p) => ({
      kind: p.kind,
      fingerprint: p.fingerprint,
      item: toQueueItem(p.item),
    })),
  };
}
