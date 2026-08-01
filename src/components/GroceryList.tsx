"use client";

import { useOptimistic, useState, useTransition } from "react";
import { GroceryRow } from "./GroceryRow";
import { EmptyState } from "./EmptyState";
import {
  categoryIcon,
  categoryOrder,
  STORES,
  STORE_ICON as StoreIcon,
} from "@/lib/constants";
import type { GroceryItemView } from "@/lib/types";
import {
  toggleGroceryItem,
  setGroceryQuantity,
  deleteGroceryItem,
} from "@/app/actions/groceries";

// Every way the list can change on screen before the server has caught up.
type Change =
  | { type: "toggle"; id: string }
  | { type: "quantity"; id: string; quantity: number }
  | { type: "delete"; id: string };

function applyChange(
  items: GroceryItemView[],
  change: Change,
): GroceryItemView[] {
  switch (change.type) {
    case "toggle":
      return items.map((item) =>
        item.id === change.id ? { ...item, checked: !item.checked } : item,
      );
    case "quantity":
      return items.map((item) =>
        item.id === change.id ? { ...item, quantity: change.quantity } : item,
      );
    case "delete":
      return items.filter((item) => item.id !== change.id);
  }
}

const ALL = "All";
const UNASSIGNED = "Unassigned";

export function GroceryList({ items }: { items: GroceryItemView[] }) {
  // useOptimistic gives us a copy of the list we're allowed to fib about.
  // We update it the instant a button is tapped so the screen responds
  // immediately, then the real answer arrives from the server a moment later
  // and quietly replaces it. Without this, every tap would feel laggy.
  const [optimisticItems, applyOptimistic] = useOptimistic(items, applyChange);
  const [, startTransition] = useTransition();
  const [storeFilter, setStoreFilter] = useState<string>(ALL);

  function run(change: Change, serverAction: () => Promise<void>) {
    startTransition(async () => {
      applyOptimistic(change);
      await serverAction();
    });
  }

  const filteredByStore =
    storeFilter === ALL
      ? optimisticItems
      : storeFilter === UNASSIGNED
        ? optimisticItems.filter((item) => !item.store)
        : optimisticItems.filter((item) => item.store === storeFilter);

  const unchecked = filteredByStore.filter((item) => !item.checked);
  const checked = filteredByStore.filter((item) => item.checked);

  // Group the still-to-buy items by category, ordered roughly the way you walk
  // a supermarket, so the list matches the route rather than the alphabet.
  const groups = new Map<string, GroceryItemView[]>();
  for (const item of unchecked) {
    const existing = groups.get(item.category);
    if (existing) existing.push(item);
    else groups.set(item.category, [item]);
  }
  const sortedGroups = [...groups.entries()].sort(
    ([a], [b]) => categoryOrder(a) - categoryOrder(b),
  );

  const emptyTitle =
    storeFilter === ALL
      ? "The list is empty"
      : storeFilter === UNASSIGNED
        ? "Nothing without a store yet"
        : `Nothing from ${storeFilter}`;

  return (
    <div>
      {/*
        Store filter chips — same pattern as Inventory's location chips.
        There's no per-store icon (Lucide has no Walmart or Costco logo), so
        every chip but "All" shares one generic storefront icon.
      */}
      <div className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {[ALL, UNASSIGNED, ...STORES].map((option) => {
            const active = storeFilter === option;
            const count =
              option === ALL
                ? optimisticItems.length
                : option === UNASSIGNED
                  ? optimisticItems.filter((item) => !item.store).length
                  : optimisticItems.filter((item) => item.store === option)
                      .length;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setStoreFilter(option)}
                aria-pressed={active}
                className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
                  active
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-line bg-surface text-muted"
                }`}
              >
                {option !== ALL && <StoreIcon aria-hidden="true" size={16} />}
                {option} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filteredByStore.length === 0 ? (
        <EmptyState
          emoji="🛒"
          title={emptyTitle}
          hint="Add something below, or pull in what's running low from the pantry."
        />
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(([category, categoryItems]) => {
            const CategoryIcon = categoryIcon(category);
            return (
              <section key={category}>
                <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
                  <CategoryIcon aria-hidden="true" size={16} />
                  {category}
                  <span className="font-normal normal-case">
                    ({categoryItems.length})
                  </span>
                </h2>
                <ul className="space-y-2">
                  {categoryItems.map((item) => (
                    <GroceryRow
                      key={item.id}
                      item={item}
                      onToggle={() =>
                        run({ type: "toggle", id: item.id }, () =>
                          toggleGroceryItem(item.id),
                        )
                      }
                      onQuantityChange={(quantity) =>
                        run({ type: "quantity", id: item.id, quantity }, () =>
                          setGroceryQuantity(item.id, quantity),
                        )
                      }
                      onDelete={() =>
                        run({ type: "delete", id: item.id }, () =>
                          deleteGroceryItem(item.id),
                        )
                      }
                    />
                  ))}
                </ul>
              </section>
            );
          })}

          {unchecked.length === 0 && (
            <p className="rounded-xl bg-accent-soft px-4 py-3 text-base font-medium text-accent">
              Everything on the list is in the trolley. 🎉
            </p>
          )}

          {checked.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
                In the trolley ({checked.length})
              </h2>
              <ul className="space-y-2 opacity-60">
                {checked.map((item) => (
                  <GroceryRow
                    key={item.id}
                    item={item}
                    onToggle={() =>
                      run({ type: "toggle", id: item.id }, () =>
                        toggleGroceryItem(item.id),
                      )
                    }
                    onQuantityChange={(quantity) =>
                      run({ type: "quantity", id: item.id, quantity }, () =>
                        setGroceryQuantity(item.id, quantity),
                      )
                    }
                    onDelete={() =>
                      run({ type: "delete", id: item.id }, () =>
                        deleteGroceryItem(item.id),
                      )
                    }
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
