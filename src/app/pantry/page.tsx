import { db } from "@/lib/db";
import { PantryList } from "@/components/PantryList";
import { AddItemBar, AddItemSelect } from "@/components/AddItemBar";
import {
  CATEGORIES,
  LOCATIONS,
  DEFAULT_CATEGORY,
  DEFAULT_LOCATION,
  isLow,
} from "@/lib/constants";
import {
  addPantryItem,
  addAllLowItemsToGroceryList,
} from "@/app/actions/pantry";
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
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Inventory</h1>
        <p className="mt-1 text-sm text-muted">
          {items.length} {items.length === 1 ? "item" : "items"}
          {lowItems.length > 0 && ` · ${lowItems.length} running low`}
        </p>

        {lowNotYetListed > 0 && (
          <form action={addAllLowItemsToGroceryList} className="mt-3">
            <button
              type="submit"
              className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg transition-opacity active:opacity-80"
            >
              <span aria-hidden="true">🛒</span> Add {lowNotYetListed} low{" "}
              {lowNotYetListed === 1 ? "item" : "items"} to the list
            </button>
          </form>
        )}
      </div>

      <PantryList items={items} />

      {/* Keeps the last row clear of the floating add bar. */}
      <div aria-hidden="true" className="h-28 md:h-24" />

      <AddItemBar action={addPantryItem} placeholder="Add to the pantry…">
        <AddItemSelect
          name="location"
          label="Location"
          options={LOCATIONS}
          defaultValue={DEFAULT_LOCATION}
        />
        <AddItemSelect
          name="category"
          label="Category"
          options={CATEGORIES}
          defaultValue={DEFAULT_CATEGORY}
        />
      </AddItemBar>
    </div>
  );
}
