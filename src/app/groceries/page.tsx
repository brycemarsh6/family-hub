import { db } from "@/lib/db";
import { GroceryList } from "@/components/GroceryList";
import { AddItemBar, AddItemSelect } from "@/components/AddItemBar";
import { CATEGORIES, DEFAULT_CATEGORY } from "@/lib/constants";
import {
  addGroceryItem,
  clearCheckedGroceryItems,
} from "@/app/actions/groceries";

export const dynamic = "force-dynamic";

export default async function GroceriesPage() {
  // `select` lists exactly the fields we need. Asking for less means less data
  // travelling to the browser, and it's self-documenting.
  const items = await db.groceryItem.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      quantity: true,
      unit: true,
      category: true,
      checked: true,
      note: true,
      pantryItemId: true,
    },
  });

  const checkedCount = items.filter((item) => item.checked).length;

  return (
    <div className="py-2">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Grocery List
          </h1>
          <p className="mt-1 text-sm text-muted">
            {items.length - checkedCount} to buy
            {checkedCount > 0 && ` · ${checkedCount} in the trolley`}
          </p>
        </div>

        {checkedCount > 0 && (
          // A plain form pointed straight at a Server Action. No client-side
          // JavaScript needed for this one — the browser submits it the
          // old-fashioned way and Next.js runs the function on the server.
          <form action={clearCheckedGroceryItems}>
            <button
              type="submit"
              className="min-h-11 shrink-0 rounded-xl border border-line px-4 text-sm font-medium text-muted transition-colors hover:border-danger hover:text-danger"
            >
              Clear checked
            </button>
          </form>
        )}
      </div>

      <GroceryList items={items} />

      {/* Keeps the last row clear of the floating add bar. */}
      <div aria-hidden="true" className="h-28 md:h-24" />

      <AddItemBar action={addGroceryItem} placeholder="Add to the list…">
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
