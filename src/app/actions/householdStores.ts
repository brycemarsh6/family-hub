"use server";

// The Stores screen's writes (parents and admins). Each action checks the
// login itself, reads the saved list, lets a pure helper in
// src/lib/storeList.ts decide the next list, saves it, and hands the new list
// back. They never throw. The rules are in src/lib/storeList.ts.

import { revalidatePath } from "next/cache";

import { MANAGER_ROLES } from "@/lib/constants";
import { getVerifiedUser } from "@/lib/dal";
import { householdStores } from "@/lib/householdSettingsRead";
import { renameStore, saveStoreList } from "@/lib/householdSettingsWrites";
import { addStore, removeStore, renameInList, reorderStores, type StoreEdit } from "@/lib/storeList";

const SAVE_FAILED = "That didn't save. Please try again.";

async function applyEdit(
  edit: (current: string[]) => StoreEdit,
  save: (next: string[], current: string[], userId: string) => Promise<void> = (next, _current, userId) =>
    saveStoreList(next, userId),
): Promise<StoreEdit> {
  try {
    const user = await getVerifiedUser();
    if (!user || user.isDevice || !MANAGER_ROLES.includes(user.role)) {
      return { ok: false, error: "Only parents and admins can change the store list." };
    }
    const current = await householdStores();
    const next = edit(current);
    if (!next.ok) return next;
    await save(next.stores, current, user.userId);
    for (const path of ["/settings/stores", "/settings", "/kitchen/shopping", "/kitchen/inventory", "/kitchen/expiring", "/"]) {
      revalidatePath(path);
    }
    return { ok: true, stores: next.stores };
  } catch (error) {
    console.error("Store list save failed", error);
    return { ok: false, error: SAVE_FAILED };
  }
}

export async function addStoreAction(name: unknown): Promise<StoreEdit> {
  if (typeof name !== "string") return { ok: false, error: "Type a store name first." };
  return applyEdit((current) => addStore(current, name));
}

export async function removeStoreAction(name: unknown): Promise<StoreEdit> {
  if (typeof name !== "string") return { ok: false, error: "That store isn't on the list." };
  return applyEdit((current) => removeStore(current, name));
}

export async function renameStoreAction(from: unknown, to: unknown): Promise<StoreEdit> {
  if (typeof from !== "string" || typeof to !== "string") return { ok: false, error: "Type a store name first." };
  return applyEdit(
    (current) => renameInList(current, from, to),
    // The list holds the cleaned new name, so items move to that exact text.
    (next, current, userId) => renameStore(next, from, next[current.indexOf(from)], userId),
  );
}

export async function reorderStoresAction(orderedNames: unknown): Promise<StoreEdit> {
  if (!Array.isArray(orderedNames) || !orderedNames.every((name) => typeof name === "string")) {
    return { ok: false, error: "That order doesn't match the stores on the list." };
  }
  return applyEdit((current) => reorderStores(current, orderedNames as string[]));
}
