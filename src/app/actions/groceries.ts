"use server";

// "use server" at the top of a file marks every function in it as a Server
// Action: code that always runs on the server, even when a button in the
// browser calls it. That's what lets a click in the kitchen safely write to the
// database without us having to build an API by hand.
//
// SECURITY NOTE: these functions are reachable by anyone who can reach the
// site, not just through our buttons. That's fine while the app only runs on
// this laptop. Before it goes online, every function here needs a check that
// the caller is signed in.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { toCategory } from "@/lib/constants";

/**
 * Re-render the pages whose contents just changed.
 *
 * Next.js caches rendered pages. After we change data we have to say "that page
 * is out of date", or the browser would keep showing the old list. The home
 * page is included because it displays the item counts.
 */
function refreshGroceryViews() {
  revalidatePath("/groceries");
  revalidatePath("/");
}

export async function addGroceryItem(formData: FormData) {
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
    },
  });

  refreshGroceryViews();
}

export async function toggleGroceryItem(id: string) {
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
  // Never let quantity drop below 1 — removing an item is what delete is for.
  const safeQuantity = Math.max(1, Math.round(quantity * 100) / 100);

  await db.groceryItem.update({
    where: { id },
    data: { quantity: safeQuantity },
  });

  refreshGroceryViews();
}

export async function deleteGroceryItem(id: string) {
  await db.groceryItem.delete({ where: { id } });
  refreshGroceryViews();
}

/** Remove everything already ticked off, without touching the pantry. */
export async function clearCheckedGroceryItems() {
  await db.groceryItem.deleteMany({ where: { checked: true } });
  refreshGroceryViews();
}
