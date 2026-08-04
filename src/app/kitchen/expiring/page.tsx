import { db } from "@/lib/db";
import { effectiveExpiry, daysUntil } from "@/lib/expiring";
import { ExpiringList, type ExpiringEntry } from "@/components/ExpiringList";
import type { Urgency } from "@/components/ExpiringRow";
import type { Category, Location } from "@/lib/constants";
import type { PantryItemView } from "@/lib/types";

export const dynamic = "force-dynamic";

// Only things inside this window show up at all. Without a cutoff, flour's
// six-month estimate and canned olives' two-year one would bury the page —
// this is meant to answer "what needs eating soon", not "list every item
// with any date attached."
const WINDOW_DAYS = 14;

function labelFor(daysLeft: number): string {
  if (daysLeft < 0) {
    return `${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? "day" : "days"} overdue`;
  }
  if (daysLeft === 0) return "Today";
  if (daysLeft === 1) return "1 day left";
  return `${daysLeft} days left`;
}

/** "now" and "week" match the plan's red/amber sections; anything else inside
 * the window is "later" (muted) — see WINDOW_DAYS above for the outer edge. */
function urgencyFor(daysLeft: number): Urgency {
  if (daysLeft <= 1) return "now";
  if (daysLeft <= 6) return "week";
  return "later";
}

export default async function ExpiringPage() {
  const [pantryItems, openGroceryLinks] = await Promise.all([
    db.pantryItem.findMany({
      select: {
        id: true,
        name: true,
        location: true,
        quantity: true,
        unit: true,
        category: true,
        lowThreshold: true,
        expiresAt: true,
        restockedAt: true,
      },
    }),
    // Same pattern as the Inventory page: one query for every "already on
    // the list?" check instead of one query per row.
    db.groceryItem.findMany({
      where: { checked: false, pantryItemId: { not: null } },
      select: { pantryItemId: true },
    }),
  ]);

  const onListIds = new Set(
    openGroceryLinks.map((link) => link.pantryItemId).filter(Boolean),
  );

  const today = new Date();

  // Built with daysLeft attached so sorting doesn't have to re-derive the
  // estimate a second time — the estimate is only computed once per item.
  const withDays: (ExpiringEntry & { daysLeft: number })[] = [];

  for (const raw of pantryItems) {
    const expiry = effectiveExpiry({
      name: raw.name,
      category: raw.category as Category,
      location: raw.location as Location,
      expiresAt: raw.expiresAt,
      restockedAt: raw.restockedAt,
    });
    if (expiry === null) continue; // nothing to estimate — doesn't belong on this page

    const daysLeft = daysUntil(expiry.date, today);
    if (daysLeft > WINDOW_DAYS) continue;

    const item: PantryItemView = {
      id: raw.id,
      name: raw.name,
      location: raw.location,
      quantity: raw.quantity,
      unit: raw.unit,
      category: raw.category,
      lowThreshold: raw.lowThreshold,
      expiresAt: raw.expiresAt,
      onList: onListIds.has(raw.id),
    };

    withDays.push({
      item,
      label: labelFor(daysLeft),
      urgency: urgencyFor(daysLeft),
      isEstimate: expiry.isEstimate,
      daysLeft,
    });
  }

  // Soonest (or most overdue) first, within whichever section it lands in.
  withDays.sort((a, b) => a.daysLeft - b.daysLeft);
  const entries: ExpiringEntry[] = withDays.map(
    ({ item, label, urgency, isEstimate }) => ({
      item,
      label,
      urgency,
      isEstimate,
    }),
  );

  return (
    <div className="py-2">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Expiring</h1>
        <p className="mt-1 text-sm text-muted">
          {entries.length === 0
            ? "Nothing needs eating soon"
            : `${entries.length} ${entries.length === 1 ? "thing needs" : "things need"} eating soon`}
        </p>
      </div>

      <ExpiringList entries={entries} />
    </div>
  );
}
