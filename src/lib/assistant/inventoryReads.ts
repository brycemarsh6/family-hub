import "server-only";

// The one place the inventory routes ask "is this item on the shopping
// list?" — an item is on it when an unchecked grocery row points at it.
// Five routes used to repeat this query; they now share it.

import { db } from "@/lib/db";

/**
 * Ids of pantry items that have an unchecked grocery row. With no `ids` it
 * answers for the whole inventory (list routes fetch it alongside the rows,
 * in one Promise.all); with `ids` it narrows to just those.
 */
export async function onShoppingListIds(ids?: string[]): Promise<Set<string>> {
  const links = await db.groceryItem.findMany({
    where: {
      checked: false,
      pantryItemId: ids ? { in: ids } : { not: null },
    },
    select: { pantryItemId: true },
  });
  return new Set(links.flatMap((l) => (l.pantryItemId ? [l.pantryItemId] : [])));
}

/** Single-item form of the same question. */
export async function isOnShoppingList(id: string): Promise<boolean> {
  return (await onShoppingListIds([id])).has(id);
}
