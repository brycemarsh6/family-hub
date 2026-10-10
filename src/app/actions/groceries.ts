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
import { getVerifiedSession, getVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import {
  addGroceryItem as writeGroceryItem,
  toggleGroceryChecked,
  setGroceryQuantity as writeGroceryQuantity,
  editGroceryItem as writeGroceryEdit,
  deleteGroceryItem as writeGroceryDelete,
  clearCheckedGroceryItems as writeClearChecked,
} from "@/lib/groceryWrites";

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
  const user = await getVerifiedUser();
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  // Ignore empty submissions (e.g. someone taps Add with nothing typed).
  if (!name) return;

  await writeGroceryItem(
    {
      name,
      quantity: Number(formData.get("quantity")),
      unit: String(formData.get("unit") ?? ""),
      category: formData.get("category"),
      store: formData.get("store"),
    },
    // Family Accounts v1: who added this. Any signed-in user (kids
    // included — adding to the list is participation, not management).
    { actorUserId: user.userId },
  );

  refreshGroceryViews();
}

export async function toggleGroceryItem(id: string) {
  if (!(await getVerifiedSession())) return;

  const item = await toggleGroceryChecked(id);
  if (!item) return;

  refreshGroceryViews();
}

export async function setGroceryQuantity(id: string, quantity: number) {
  if (!(await getVerifiedSession())) return;

  await writeGroceryQuantity(id, quantity);

  refreshGroceryViews();
}

/**
 * Edit the fields a shopper actually needs to correct in place: a
 * mistyped name, the wrong count or unit, the wrong aisle, the wrong
 * shop, or where it should land when it's put away. Deliberately does
 * NOT touch `checked` or `pantryItemId` — ticking off has its own
 * action, and the pantry link is a provenance record ("this came from
 * the pantry"), not something to hand-edit.
 */
export async function editGroceryItem(
  id: string,
  edits: {
    name: string;
    quantity: number;
    unit: string | null;
    category: string;
    store: string | null;
    /** Null = no opinion; see GroceryItem.location's schema comment. */
    location: string | null;
  },
) {
  if (!(await getVerifiedSession())) return;

  const name = edits.name.trim();
  // An empty name would render as a blank row with no way to identify it,
  // so treat it the same as the add bar does: ignore the edit entirely.
  if (!name) return;

  const row = await writeGroceryEdit(id, { ...edits, name });
  if (!row) return;

  refreshGroceryViews();
}

export async function deleteGroceryItem(id: string) {
  if (!(await getVerifiedSession())) return;

  await writeGroceryDelete(id);
  refreshGroceryViews();
}

/**
 * Remove everything already ticked off, without touching the pantry.
 *
 * Gated to admin/parent — bulk-clearing the list is management, not
 * participation; deleteGroceryItem (undoing your own mistake on one row)
 * stays open to any signed-in user.
 */
export async function clearCheckedGroceryItems() {
  const user = await getVerifiedUser();
  if (!user || !MANAGER_ROLES.includes(user.role)) return;

  await writeClearChecked();
  refreshGroceryViews();
}
