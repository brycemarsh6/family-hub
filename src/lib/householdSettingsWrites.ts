import "server-only";

import { db } from "@/lib/db";
import { serializeStoreList } from "@/lib/storeList";

// The database work behind the household's settings (today the Stores screen).
// No login check: the Server Actions in src/app/actions/householdStores.ts
// check who is asking and have already decided the next list with the pure
// helpers in storeList.ts.

/** The one write of the saved store list (the row is made on first save). */
function upsertStores(names: readonly string[], actorUserId: string) {
  const stores = serializeStoreList(names);
  return db.householdSettings.upsert({
    where: { id: "household" },
    create: { id: "household", stores, updatedById: actorUserId },
    update: { stores, updatedById: actorUserId },
  });
}

/** Save the whole list. */
export async function saveStoreList(names: readonly string[], actorUserId: string): Promise<void> {
  await upsertStores(names, actorUserId);
}

/**
 * Save the list with `from` already replaced by `to`, and move every grocery
 * item on `from` to `to`, in one transaction so the two never disagree.
 */
export async function renameStore(
  nextNames: readonly string[],
  from: string,
  to: string,
  actorUserId: string,
): Promise<void> {
  await db.$transaction([
    upsertStores(nextNames, actorUserId),
    db.groceryItem.updateMany({ where: { store: from }, data: { store: to } }),
  ]);
}
