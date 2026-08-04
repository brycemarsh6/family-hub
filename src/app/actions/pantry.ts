"use server";

// Server Actions for the pantry. See the note at the top of groceries.ts about
// these being reachable directly — which is why every one of them starts with
// a getVerifiedSession() check.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedSession } from "@/lib/dal";
import { toCategory, toLocation, toStore, type Store } from "@/lib/constants";

/**
 * Both pages can be affected by a pantry change: the pantry obviously, and the
 * grocery list when an item is sent to it. The kitchen home page shows counts
 * for both.
 */
function refreshKitchenViews() {
  revalidatePath("/kitchen/inventory");
  revalidatePath("/kitchen/shopping");
  revalidatePath("/kitchen");
  // The dashboard's Kitchen widget shows these counts too.
  revalidatePath("/");
}

export async function addPantryItem(formData: FormData) {
  if (!(await getVerifiedSession())) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const rawQuantity = Number(formData.get("quantity"));
  const quantity = Number.isFinite(rawQuantity) && rawQuantity >= 0 ? rawQuantity : 1;

  await db.pantryItem.create({
    data: {
      name,
      quantity,
      unit: String(formData.get("unit") ?? "").trim() || null,
      category: toCategory(formData.get("category")),
      location: toLocation(formData.get("location")),
    },
  });

  refreshKitchenViews();
}

export async function setPantryQuantity(id: string, quantity: number) {
  if (!(await getVerifiedSession())) return;

  // Zero is meaningful here ("we're out"), so unlike the grocery list we allow
  // it — we just don't allow negatives.
  const safeQuantity = Math.max(0, Math.round(quantity * 100) / 100);

  const current = await db.pantryItem.findUnique({
    where: { id },
    select: { quantity: true },
  });
  if (!current) return;

  await db.pantryItem.update({
    where: { id },
    data: {
      quantity: safeQuantity,
      // Tapping + is "I just got more of this" — the Expiring page's shelf-life
      // clock (see src/lib/shelfLife.ts) counts from here, not from when the
      // row was first created. Tapping − is using what's already there, so it
      // doesn't reset anything.
      ...(safeQuantity > current.quantity ? { restockedAt: new Date() } : {}),
    },
  });

  refreshKitchenViews();
}

/**
 * Save every field from the edit sheet at once: name, quantity, unit,
 * category, location, and the low-stock threshold.
 *
 * This is a full replace rather than a partial patch — the sheet always
 * submits all six fields together, so there's no ambiguity about which ones
 * changed.
 */
export async function editPantryItem(
  id: string,
  changes: {
    name: string;
    quantity: number;
    unit: string | null;
    category: string;
    location: string;
    lowThreshold: number;
    expiresAt: Date | null;
  },
) {
  if (!(await getVerifiedSession())) return;

  const name = changes.name.trim();
  if (!name) return;

  const current = await db.pantryItem.findUnique({
    where: { id },
    select: { quantity: true },
  });
  if (!current) return;

  const quantity = Math.max(0, Math.round(changes.quantity * 100) / 100);

  await db.pantryItem.update({
    where: { id },
    data: {
      name,
      quantity,
      unit: changes.unit?.trim() || null,
      category: toCategory(changes.category),
      location: toLocation(changes.location),
      lowThreshold: Math.max(0, Math.round(changes.lowThreshold * 100) / 100),
      expiresAt: changes.expiresAt,
      // Same "went up = restocked" rule as the quantity stepper — see there.
      ...(quantity > current.quantity ? { restockedAt: new Date() } : {}),
    },
  });

  refreshKitchenViews();
}

export async function deletePantryItem(id: string) {
  if (!(await getVerifiedSession())) return;

  await db.pantryItem.delete({ where: { id } });
  refreshKitchenViews();
}

/**
 * Put a pantry item on the shopping list.
 *
 * The new grocery item remembers which pantry item it came from
 * (`pantryItemId`). That's what makes the round trip work later: when it's
 * checked off at the shop, "put away" knows exactly which jar to top up.
 *
 * `store` is `null` when the shopper skipped the store picker — that's a
 * real, valid choice (assign it later from Shopping), not an error.
 *
 * Returns silently if it's already on the list, so tapping twice is harmless.
 */
export async function addPantryItemToGroceryList(
  id: string,
  store: Store | null,
) {
  if (!(await getVerifiedSession())) return;

  const pantryItem = await db.pantryItem.findUnique({ where: { id } });
  if (!pantryItem) return;

  const alreadyOnList = await db.groceryItem.findFirst({
    where: { pantryItemId: id, checked: false },
  });
  if (alreadyOnList) return;

  await db.groceryItem.create({
    data: {
      name: pantryItem.name,
      quantity: 1,
      unit: pantryItem.unit,
      category: pantryItem.category,
      pantryItemId: pantryItem.id,
      store: toStore(store),
    },
  });

  refreshKitchenViews();
}

/**
 * The one-tap restock: everything at or below its "low" threshold goes on the
 * shopping list, skipping anything already on there.
 *
 * `store` applies to the whole batch — asking once per item would turn a
 * one-tap restock into a dozen sequential prompts, which defeats the point.
 */
export async function addAllLowItemsToGroceryList(store: Store | null) {
  if (!(await getVerifiedSession())) return;

  const pantryItems = await db.pantryItem.findMany();

  // SQLite can't compare two columns inside a `where`, so the "is it low?"
  // test happens here rather than in the query.
  const lowItems = pantryItems.filter(
    (item) => item.quantity <= item.lowThreshold,
  );
  if (lowItems.length === 0) return;

  const alreadyListed = await db.groceryItem.findMany({
    where: {
      checked: false,
      pantryItemId: { in: lowItems.map((item) => item.id) },
    },
    select: { pantryItemId: true },
  });
  const alreadyListedIds = new Set(
    alreadyListed.map((entry) => entry.pantryItemId),
  );

  const toAdd = lowItems.filter((item) => !alreadyListedIds.has(item.id));
  if (toAdd.length === 0) return;

  const validStore = toStore(store);

  await db.groceryItem.createMany({
    data: toAdd.map((item) => ({
      name: item.name,
      quantity: 1,
      unit: item.unit,
      category: item.category,
      pantryItemId: item.id,
      store: validStore,
    })),
  });

  refreshKitchenViews();
}
