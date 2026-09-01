import { db } from "@/lib/db";
import { BackLink } from "@/components/BackLink";
import { GroceryList } from "@/components/GroceryList";
import { PutAwayButton } from "@/components/PutAwayButton";
import { AddItemBar, AddItemSelect } from "@/components/AddItemBar";
import { StoreSelect } from "@/components/StoreSelect";
import { getVerifiedUser } from "@/lib/dal";
import { CATEGORY_NAMES, DEFAULT_CATEGORY, MANAGER_ROLES } from "@/lib/constants";
import { addGroceryItem, clearCheckedGroceryItems } from "@/app/actions/groceries";

export const dynamic = "force-dynamic";

export default async function GroceriesPage() {
  // Only to decide whether "Just clear" renders below — clearCheckedGroceryItems
  // itself is the real, server-side gate (mission-6's C1). A kid session can
  // still check items off and Put away; only the bulk discard is hidden.
  const user = await getVerifiedUser();
  const canManage = user !== null && MANAGER_ROLES.includes(user.role);

  // `select` lists exactly the fields we need. Asking for less means less data
  // travelling to the browser, and it's self-documenting.
  const rows = await db.groceryItem.findMany({
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
      store: true,
      location: true,
      categoryEdited: true,
      // Just enough to show "this lives in the Fridge right now" in the
      // edit sheet — read fresh on every page load, so it can never go
      // stale the way storing a copy on the grocery row would.
      pantryItem: { select: { location: true } },
    },
  });

  const items = rows.map(({ pantryItem, ...row }) => ({
    ...row,
    pantryItemLocation: pantryItem?.location ?? null,
  }));

  const checkedCount = items.filter((item) => item.checked).length;

  return (
    <div className="py-2">
      <BackLink href="/kitchen" label="Kitchen" />

      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Shopping
        </h1>
        <p className="mt-1 text-sm text-muted">
          {items.length - checkedCount} to buy
          {checkedCount > 0 && ` · ${checkedCount} in the trolley`}
        </p>

        {checkedCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Client-side now, not a plain form: put-away has to classify
                what's checked before it knows whether to act immediately or
                open the review sheet for anything new — see PutAwayButton. */}
            <PutAwayButton checkedCount={checkedCount} />

            {/* Still a plain form pointed straight at a Server Action — this
                one needs no decision, so no client-side JavaScript at all.
                Omitted entirely (not disabled) for a kid session — see the
                canManage comment above. */}
            {canManage && (
              <form action={clearCheckedGroceryItems}>
                <button
                  type="submit"
                  className="min-h-11 rounded-xl border border-line px-4 text-sm font-medium text-muted transition-colors hover:border-danger hover:text-danger"
                >
                  Just clear
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <GroceryList items={items} />

      {/* Keeps the last row clear of the floating add bar. */}
      <div aria-hidden="true" className="h-28" />

      <AddItemBar action={addGroceryItem} placeholder="Add to the list…">
        <AddItemSelect
          name="category"
          label="Category"
          options={CATEGORY_NAMES}
          defaultValue={DEFAULT_CATEGORY}
        />
        <StoreSelect />
      </AddItemBar>
    </div>
  );
}
