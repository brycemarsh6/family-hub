import "server-only";

// The one place the shopping routes read the list. Rows come back through
// `toShoppingItem`, so attribution needs two small extras: the display name of
// whoever added a row (the name only — never the user row) and whether the
// Assistant API itself created it (from the audit log).

import { db } from "@/lib/db";
import type { GroceryItem } from "@/generated/prisma/client";
import { categoryOrder } from "@/lib/constants";
import { toShoppingItem } from "./serializeShopping";

/**
 * Serialize rows for the wire: two extra queries however many rows there are.
 * `justCreatedIds` are rows the calling request itself just created — the
 * audit log only records them once the request finishes, so the response
 * would otherwise call the assistant's own new rows "nobody".
 */
export async function toShoppingItems(rows: GroceryItem[], justCreatedIds: string[] = []) {
  if (rows.length === 0) return [];
  const userIds = [...new Set(rows.flatMap((r) => (r.addedById ? [r.addedById] : [])))];
  const [users, created] = await Promise.all([
    userIds.length > 0
      ? db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } })
      : Promise.resolve([]),
    db.assistantChange.findMany({
      where: { model: "GroceryItem", action: "create", recordId: { in: rows.map((r) => r.id) } },
      select: { recordId: true },
    }),
  ]);
  const names = new Map(users.map((u) => [u.id, u.displayName]));
  const byAssistant = new Set([...created.map((c) => c.recordId), ...justCreatedIds]);
  return rows.map((row) =>
    toShoppingItem(row, {
      addedByName: row.addedById ? (names.get(row.addedById) ?? null) : null,
      createdByAssistant: byAssistant.has(row.id),
    }),
  );
}

/** Unchecked first, then checked; within each, supermarket order then name. */
export async function listShoppingItems(filter: {
  store?: string;
  checked?: boolean;
}) {
  const rows = await db.groceryItem.findMany({
    where: {
      ...(filter.store === undefined ? {} : { store: filter.store === "none" ? null : filter.store }),
      ...(filter.checked === undefined ? {} : { checked: filter.checked }),
    },
  });
  rows.sort(
    (a, b) =>
      Number(a.checked) - Number(b.checked) ||
      categoryOrder(a.category) - categoryOrder(b.category) ||
      a.name.localeCompare(b.name),
  );
  return toShoppingItems(rows);
}

/** One serialized row, or null when it doesn't exist. */
export async function getShoppingItem(id: string) {
  const row = await db.groceryItem.findUnique({ where: { id } });
  if (!row) return null;
  return (await toShoppingItems([row]))[0];
}
