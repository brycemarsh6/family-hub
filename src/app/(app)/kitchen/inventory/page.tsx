import { db } from "@/lib/db";
import { BackLink } from "@/components/BackLink";
import { PantryList } from "@/components/PantryList";
import { PantryAddFlow } from "@/components/PantryAddFlow";
import { AddLowItemsButton } from "@/components/AddLowItemsButton";
import { ReviewQueueButton } from "@/components/ReviewQueueButton";
import { buildReviewQueue, type DuplicateCandidate } from "@/lib/duplicates";
import { getVerifiedUser } from "@/lib/dal";
import { isLow, MANAGER_ROLES } from "@/lib/constants";
import type { PantryItemView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PantryPage() {
  // Only to decide whether to show delete controls below — deletePantryItem
  // itself is the real, server-side gate (mission-6's C1). Read once here,
  // not per-row, since it's the same answer for the whole page.
  const user = await getVerifiedUser();
  const canManage = user !== null && MANAGER_ROLES.includes(user.role);

  // One parallel batch, deliberately. The functions and the database sit
  // in different regions, so each *sequential* await is another
  // cross-country round trip — the single biggest thing that made
  // navigating between branches feel slow.
  const [pantryItems, openGroceryLinks, dismissals] = await Promise.all([
    db.pantryItem.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        location: true,
        quantity: true,
        unit: true,
        category: true,
        lowThreshold: true,
        expiresAt: true,
      },
    }),
    // Which pantry items already have an unticked entry on the shopping list?
    // Fetching them all at once and matching in memory avoids running a
    // separate query for every single row.
    db.groceryItem.findMany({
      where: { checked: false, pantryItemId: { not: null } },
      select: { pantryItemId: true },
    }),
    db.irregularityDismissal.findMany({ select: { fingerprint: true } }),
  ]);

  // Computed fresh on every load, same as the low counts below — nothing
  // about the review queue is stored except the dismissals it filters by.
  // Built from `pantryItems` above rather than calling getReviewQueue(),
  // which would re-fetch all of them a second time; the select above is
  // already a superset of what the detectors need.
  const reviewQueue = buildReviewQueue(
    pantryItems as DuplicateCandidate[],
    new Set(dismissals.map((d) => d.fingerprint)),
  );

  const onListIds = new Set(
    openGroceryLinks.map((link) => link.pantryItemId).filter(Boolean),
  );

  const items: PantryItemView[] = pantryItems.map((item) => ({
    ...item,
    onList: onListIds.has(item.id),
  }));

  const lowItems = items.filter((item) => isLow(item.quantity, item.lowThreshold));
  // Only offer the bulk button for low items that aren't already on the list,
  // so it never appears promising work it won't do.
  const lowNotYetListed = lowItems.filter((item) => !item.onList).length;

  return (
    <div className="py-2">
      <BackLink href="/kitchen" label="Kitchen" />

      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Inventory</h1>
        <p className="mt-1 text-sm text-muted">
          {items.length} {items.length === 1 ? "item" : "items"}
          {lowItems.length > 0 && ` · ${lowItems.length} running low`}
        </p>

        {lowNotYetListed > 0 && <AddLowItemsButton count={lowNotYetListed} />}

        <ReviewQueueButton initial={reviewQueue} />
      </div>

      <PantryList items={items} canManage={canManage} />

      {/* Keeps the last row clear of the floating add bar. */}
      <div aria-hidden="true" className="h-28" />

      <PantryAddFlow />
    </div>
  );
}
