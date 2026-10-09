"use server";

// Server Actions for the pantry. See the note at the top of groceries.ts about
// these being reachable directly — which is why every one of them starts with
// a getVerifiedSession() check.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedSession, getVerifiedUser } from "@/lib/dal";
import {
  toStore,
  MANAGER_ROLES,
  type Store,
} from "@/lib/constants";
import type { DuplicateMatch } from "@/lib/duplicates";
import {
  createPantryItem,
  setPantryQuantity as writePantryQuantity,
  editPantryItem as writePantryItemEdit,
  mergeIntoPantryItem,
  logLeftover as writeLeftover,
  findDuplicateCandidates,
} from "@/lib/pantryWrites";

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

  await createPantryItem({
    name,
    quantity,
    unit: String(formData.get("unit") ?? ""),
    category: String(formData.get("category") ?? ""),
    location: String(formData.get("location") ?? ""),
  });

  refreshKitchenViews();
}

/**
 * Read-only: does a not-yet-created item probably already exist? Called
 * from the Inventory add bar before it writes anything — see
 * PantryAddFlow.tsx, and findDuplicateMatches' own comment in
 * duplicates.ts for how exact-same-location, exact-other-location, and
 * subset-name matches are ranked and why location changes the answer.
 */
export async function checkForDuplicateOnAdd(
  name: string,
  location: string,
): Promise<DuplicateMatch[]> {
  if (!(await getVerifiedSession())) return [];

  return findDuplicateCandidates(name, location);
}

/**
 * Creates a new pantry item from the add-time review sheet — after a
 * human has looked at the possible duplicates and confirmed this is
 * genuinely new (editing any field along the way). Separate from
 * addPantryItem because the review sheet hands over already-typed
 * values, not a FormData submission.
 */
export async function createPantryItemReviewed(fields: {
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  location: string;
}) {
  if (!(await getVerifiedSession())) return;

  const name = fields.name.trim();
  if (!name) return;

  // Explicit field list: a crafted call can't smuggle extra keys (lowThreshold,
  // expiresAt) past the helper's wider signature.
  await createPantryItem({
    name,
    quantity: fields.quantity,
    unit: fields.unit,
    category: fields.category,
    location: fields.location,
  });

  refreshKitchenViews();
}

/**
 * The other half of the add-time review sheet: the human said "that's
 * the same thing" and picked which existing row it is. Adds quantity
 * only — deliberately doesn't touch the target's own category or
 * location, the same restraint commitPutAway's merge path uses and for
 * the same reason: "this is the same item" is a different claim than
 * "also re-file it."
 */
export async function mergeIntoExistingPantryItem(
  pantryItemId: string,
  quantity: number,
) {
  if (!(await getVerifiedSession())) return;
  if (!(quantity > 0)) return;

  await mergeIntoPantryItem(pantryItemId, quantity);

  refreshKitchenViews();
}

export async function setPantryQuantity(id: string, quantity: number) {
  if (!(await getVerifiedSession())) return;

  // Clamping, rounding and the restockedAt rule live in pantryWrites.ts.
  if (!(await writePantryQuantity(id, quantity))) return;

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

  const edited = await writePantryItemEdit(id, {
    name,
    quantity: changes.quantity,
    unit: changes.unit,
    category: changes.category,
    location: changes.location,
    lowThreshold: changes.lowThreshold,
    expiresAt: changes.expiresAt,
  });
  if (!edited) return;

  refreshKitchenViews();
}

/**
 * Log a leftover: name, how many portions, how many days it's good for.
 *
 * Deliberately never asks for a date — see LogLeftoverSheet for why that's
 * the whole point. "Days good" converts to a real `expiresAt` at local
 * midnight N days out (in pantryWrites.ts), the same convention the edit
 * sheet's date field uses — so a logged leftover and a hand-typed date
 * behave identically everywhere downstream.
 */
export async function logLeftover(input: {
  name: string;
  quantity: number;
  daysGood: number;
}) {
  if (!(await getVerifiedSession())) return;

  const name = input.name.trim();
  if (!name) return;

  // Quantity floor, days-good → expiresAt (server-local midnight) and the
  // Leftovers/Fridge defaults live in pantryWrites.ts.
  await writeLeftover({
    name,
    quantity: input.quantity,
    daysGood: input.daysGood,
  });

  refreshKitchenViews();
}

/**
 * Gated to admin/parent — deleting an inventory row is management, not
 * participation ("parents manage, kids participate"; see the Family
 * Accounts v1 plan's Phase 3a). Replaces the plain getVerifiedSession()
 * check that used to guard this action rather than duplicating it.
 */
export async function deletePantryItem(id: string) {
  const user = await getVerifiedUser();
  if (!user || !MANAGER_ROLES.includes(user.role)) return;

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
  const user = await getVerifiedUser();
  if (!user) return;

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
      // Family Accounts v1: who pushed this onto the list.
      addedById: user.userId,
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
  const user = await getVerifiedUser();
  if (!user) return;

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
      // Family Accounts v1: who triggered this batch add.
      addedById: user.userId,
    })),
  });

  refreshKitchenViews();
}
