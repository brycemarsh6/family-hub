"use client";

import { useOptimistic, useTransition } from "react";
import { GroceryRow } from "./GroceryRow";
import { EmptyState } from "./EmptyState";
import { categoryEmoji, categoryOrder } from "@/lib/constants";
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

export function GroceryList({ items }: { items: GroceryItemView[] }) {
  // useOptimistic gives us a copy of the list we're allowed to fib about.
  // We update it the instant a button is tapped so the screen responds
  // immediately, then the real answer arrives from the server a moment later
  // and quietly replaces it. Without this, every tap would feel laggy.
  const [optimisticItems, applyOptimistic] = useOptimistic(items, applyChange);
  const [, startTransition] = useTransition();

  function run(change: Change, serverAction: () => Promise<void>) {
    startTransition(async () => {
      applyOptimistic(change);
      await serverAction();
    });
  }

  const unchecked = optimisticItems.filter((item) => !item.checked);
  const checked = optimisticItems.filter((item) => item.checked);

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

  if (optimisticItems.length === 0) {
    return (
      <EmptyState
        emoji="🛒"
        title="The list is empty"
        hint="Add something below, or pull in what's running low from the pantry."
      />
    );
  }

  return (
    <div className="space-y-6">
      {sortedGroups.map(([category, categoryItems]) => (
        <section key={category}>
          <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
            <span aria-hidden="true">{categoryEmoji(category)}</span>
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
      ))}

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
  );
}
