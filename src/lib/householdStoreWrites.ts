import "server-only";

import { db } from "@/lib/db";
import { serializeStoreList } from "@/lib/storeList";

// The database work behind the Stores screen. No login check: the Server
// Actions in src/app/actions/householdStores.ts check who is asking and have
// already decided the next list with the pure helpers in storeList.ts.

/** Save the whole list (the row is made on first save). */
export async function saveStoreList(names: readonly string[], actorUserId: string): Promise<void> {
  const stores = serializeStoreList(names);
  await db.householdSettings.upsert({
    where: { id: "household" },
    create: { id: "household", stores, updatedById: actorUserId },
    update: { stores, updatedById: actorUserId },
  });
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
  const stores = serializeStoreList(nextNames);
  await db.$transaction([
    db.householdSettings.upsert({
      where: { id: "household" },
      create: { id: "household", stores, updatedById: actorUserId },
      update: { stores, updatedById: actorUserId },
    }),
    db.groceryItem.updateMany({ where: { store: from }, data: { store: to } }),
  ]);
}
