"use server";

// "use server" at the top of a file marks every function in it as a Server
// Action: code that always runs on the server, even when a button in the
// browser calls it. That's what lets a click in the kitchen safely write to the
// database without us having to build an API by hand.
//
// SECURITY: these functions are reachable by anyone who can reach the site —
// they're real POST endpoints, callable directly with curl, not only through
// our buttons. So every one of them starts by checking for a valid session,
// and returns without touching the database if there isn't one.
//
// That check lives here, next to the data, rather than only in proxy.ts.
// The Next.js auth guide is blunt about why: proxy "should not be your only
// line of defense". Proxy handles the redirect-to-login experience; this is
// what actually protects the data.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedSession } from "@/lib/dal";
import { toCategory, toStore, DEFAULT_LOCATION } from "@/lib/constants";

/**
 * Re-render the pages whose contents just changed.
 *
 * Next.js caches rendered pages. After we change data we have to say "that page
 * is out of date", or the browser would keep showing the old list. The kitchen
 * home page is included because it displays the item counts.
 */
function refreshGroceryViews() {
  revalidatePath("/kitchen/shopping");
  revalidatePath("/kitchen");
  // The dashboard's Kitchen widget shows these counts too.
  revalidatePath("/");
}

export async function addGroceryItem(formData: FormData) {
  if (!(await getVerifiedSession())) return;

  const name = String(formData.get("name") ?? "").trim();
  // Ignore empty submissions (e.g. someone taps Add with nothing typed).
  if (!name) return;

  const rawQuantity = Number(formData.get("quantity"));
  const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;
  const unit = String(formData.get("unit") ?? "").trim() || null;

  await db.groceryItem.create({
    data: {
      name,
      quantity,
      unit,
      // toCategory() rejects anything that isn't one of our real categories,
      // so a tampered-with form can't put junk in the database.
      category: toCategory(formData.get("category")),
      // toStore() returns null rather than a default — leaving the store
      // blank on the add bar is a normal, valid choice, not a mistake.
      store: toStore(formData.get("store")),
    },
  });

  refreshGroceryViews();
}

export async function toggleGroceryItem(id: string) {
  if (!(await getVerifiedSession())) return;

  const item = await db.groceryItem.findUnique({ where: { id } });
  if (!item) return;

  await db.groceryItem.update({
    where: { id },
    data: {
      checked: !item.checked,
      // Record when it was ticked off, so checked items can be listed
      // most-recent-first.
      checkedAt: item.checked ? null : new Date(),
    },
  });

  refreshGroceryViews();
}

export async function setGroceryQuantity(id: string, quantity: number) {
  if (!(await getVerifiedSession())) return;

  // Never let quantity drop below 1 — removing an item is what delete is for.
  const safeQuantity = Math.max(1, Math.round(quantity * 100) / 100);

  await db.groceryItem.update({
    where: { id },
    data: { quantity: safeQuantity },
  });

  refreshGroceryViews();
}

export async function deleteGroceryItem(id: string) {
  if (!(await getVerifiedSession())) return;

  await db.groceryItem.delete({ where: { id } });
  refreshGroceryViews();
}

/** Remove everything already ticked off, without touching the pantry. */
export async function clearCheckedGroceryItems() {
  if (!(await getVerifiedSession())) return;

  await db.groceryItem.deleteMany({ where: { checked: true } });
  refreshGroceryViews();
}

/**
 * Unpacking the shopping: everything ticked off gets added into the pantry,
 * then cleared off the list.
 *
 * For each bought item we look for the matching pantry item in three steps:
 *
 *   1. Did it come FROM the pantry? Then we already know exactly which item it
 *      is, because we stored its id when it was added to the list.
 *   2. Otherwise, is there a pantry item with the same name? Compared
 *      case-insensitively in JavaScript, because SQLite can't do
 *      case-insensitive matching in a query the way Postgres can.
 *   3. Still nothing? It's new to the house, so create a pantry entry for it.
 *
 * The whole thing runs inside a transaction — a all-or-nothing bundle. Without
 * it, a failure halfway through could top up the pantry but fail to clear the
 * list, and the next "put away" would count the same shopping twice.
 */
export async function putAwayCheckedItems() {
  if (!(await getVerifiedSession())) return;

  const checkedItems = await db.groceryItem.findMany({
    where: { checked: true },
  });
  if (checkedItems.length === 0) return;

  await db.$transaction(async (tx) => {
    const pantryItems = await tx.pantryItem.findMany();

    // Two lookup tables so the loop below doesn't hit the database once per item.
    const byId = new Map(pantryItems.map((item) => [item.id, item]));
    const byName = new Map(
      pantryItems.map((item) => [item.name.trim().toLowerCase(), item]),
    );

    for (const boughtItem of checkedItems) {
      const linked = boughtItem.pantryItemId
        ? byId.get(boughtItem.pantryItemId)
        : undefined;
      const target =
        linked ?? byName.get(boughtItem.name.trim().toLowerCase());

      if (target) {
        // `increment` lets the database do the addition, so two people putting
        // shopping away at once can't overwrite each other's total.
        await tx.pantryItem.update({
          where: { id: target.id },
          data: { quantity: { increment: boughtItem.quantity } },
        });
      } else {
        const created = await tx.pantryItem.create({
          data: {
            name: boughtItem.name,
            quantity: boughtItem.quantity,
            unit: boughtItem.unit,
            category: boughtItem.category,
            location: DEFAULT_LOCATION,
          },
        });
        // Register it, so a second "Milk" in the same shop tops up this new
        // entry instead of creating a duplicate.
        byId.set(created.id, created);
        byName.set(created.name.trim().toLowerCase(), created);
      }
    }

    await tx.groceryItem.deleteMany({
      where: { id: { in: checkedItems.map((item) => item.id) } },
    });
  });

  revalidatePath("/kitchen/shopping");
  revalidatePath("/kitchen/inventory");
  revalidatePath("/kitchen");
  revalidatePath("/");
}
