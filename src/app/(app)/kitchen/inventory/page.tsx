import { db } from "@/lib/db";
import { BackLink } from "@/components/BackLink";
import { PantryList } from "@/components/PantryList";
import { PantryAddFlow } from "@/components/PantryAddFlow";
import { AddLowItemsButton } from "@/components/AddLowItemsButton";
import { isLow } from "@/lib/constants";
import type { PantryItemView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PantryPage() {
  const [pantryItems, openGroceryLinks] = await Promise.all([
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
  ]);

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
      </div>

      <PantryList items={items} />

      {/* Keeps the last row clear of the floating add bar. */}
      <div aria-hidden="true" className="h-28" />

      <PantryAddFlow />
    </div>
  );
}
