"use server";

// Server Actions for the pantry. See the note at the top of groceries.ts about
// these being reachable directly — they'll each need an "are you signed in?"
// check before this app ever goes online.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { toCategory, toLocation } from "@/lib/constants";

/**
 * Both pages can be affected by a pantry change: the pantry obviously, and the
 * grocery list when an item is sent to it. The home page shows counts for both.
 */
function refreshKitchenViews() {
  revalidatePath("/pantry");
  revalidatePath("/groceries");
  revalidatePath("/");
}

export async function addPantryItem(formData: FormData) {
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
  // Zero is meaningful here ("we're out"), so unlike the grocery list we allow
  // it — we just don't allow negatives.
  const safeQuantity = Math.max(0, Math.round(quantity * 100) / 100);

  await db.pantryItem.update({
    where: { id },
    data: { quantity: safeQuantity },
  });

  refreshKitchenViews();
}

/** Change where an item is kept, or when it should count as running low. */
export async function updatePantryItem(
  id: string,
  changes: { location?: string; lowThreshold?: number },
) {
  await db.pantryItem.update({
    where: { id },
    data: {
      ...(changes.location !== undefined && {
        location: toLocation(changes.location),
      }),
      ...(changes.lowThreshold !== undefined && {
        lowThreshold: Math.max(0, changes.lowThreshold),
      }),
    },
  });

  refreshKitchenViews();
}

export async function deletePantryItem(id: string) {
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
 * Returns silently if it's already on the list, so tapping twice is harmless.
 */
export async function addPantryItemToGroceryList(id: string) {
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
    },
  });

  refreshKitchenViews();
}
