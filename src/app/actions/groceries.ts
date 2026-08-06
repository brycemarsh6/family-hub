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
import { toCategory, toStore, toLocation, DEFAULT_LOCATION } from "@/lib/constants";
import { matchItem } from "@/lib/match";

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

  const current = await db.groceryItem.findUnique({
    where: { id },
    select: { category: true },
  });
  if (!current) return;

  const category = toCategory(edits.category);

  await db.groceryItem.update({
    where: { id },
    data: {
      name,
      // Same floor as setGroceryQuantity — removing an item is what delete
      // is for, not counting it down to zero.
      quantity: Math.max(1, Math.round(edits.quantity * 100) / 100),
      unit: edits.unit?.trim() || null,
      // Both of these reject anything outside the real vocabulary, so a
      // tampered-with request can't write junk (see addGroceryItem).
      category,
      store: toStore(edits.store),
      location: edits.location ? toLocation(edits.location) : null,
      // Compared against what was actually stored before this save, not
      // against a value handed in by the client — a tampered-with request
      // can claim any "previous" category it likes, but it can't fake what
      // the database already had. Only a genuine change flips this; saving
      // with the category untouched leaves a prior edit's flag alone
      // rather than ever clearing it back to false.
      categoryEdited: category !== current.category ? true : undefined,
    },
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

function refreshPutAwayViews() {
  revalidatePath("/kitchen/shopping");
  revalidatePath("/kitchen/inventory");
  revalidatePath("/kitchen");
  revalidatePath("/");
}

/**
 * Is this bought item already something the household tracks? Two ways to
 * know for certain — linked by id, or an exact (case-insensitive) name
 * match. Anything looser than exact is a *suggestion*, never a match: see
 * matchItem's own module comment for what plain substring matching cost
 * this app before (steaks filed under a rule meant for "tea").
 */
function findExactMatch(
  boughtItem: { pantryItemId: string | null; name: string },
  byId: Map<string, { id: string }>,
  byName: Map<string, { id: string }>,
) {
  const linked = boughtItem.pantryItemId
    ? byId.get(boughtItem.pantryItemId)
    : undefined;
  return linked ?? byName.get(boughtItem.name.trim().toLowerCase());
}

export type PutAwayMergeSuggestion = {
  pantryItemId: string;
  name: string;
  quantity: number;
  unit: string | null;
  location: string;
};

/** One checked item with no exact match in the inventory — genuinely new,
 * or possibly a duplicate under a different name (see `suggestions`). */
export type PutAwayNewItem = {
  groceryItemId: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  /** Pre-filled starting point for the review sheet: this row's own
   * location override if one was set (see editGroceryItem), else
   * DEFAULT_LOCATION. Editable from there — see PutAwayDecision. */
  location: string;
  /** Ranked, best first. Never more than a handful — see the cap in
   * classifyForPutAway. Advisory only; nothing here is ever applied
   * without a human tapping it in the review sheet. */
  suggestions: PutAwayMergeSuggestion[];
};

export type PutAwayClassification = {
  /** How many checked items will be put away with no review at all —
   * shown once, is why the review sheet never renders for a fully-known
   * shop. */
  knownCount: number;
  newItems: PutAwayNewItem[];
};

/** At most this many merge suggestions per new item — matchItem can return
 * up to four ranked candidates (best + 3 alternatives), but the review
 * sheet is meant to be a quick glance, not another list to read. */
const MAX_SUGGESTIONS = 2;

/**
 * Read-only preview of what "Put away" is about to do. Never writes
 * anything — see commitPutAway for the actual transaction, which
 * re-checks all of this itself rather than trusting what was classified
 * a moment ago (another phone may have put groceries away in between).
 */
export async function classifyForPutAway(): Promise<PutAwayClassification> {
  if (!(await getVerifiedSession())) return { knownCount: 0, newItems: [] };

  const checkedItems = await db.groceryItem.findMany({
    where: { checked: true },
  });
  if (checkedItems.length === 0) return { knownCount: 0, newItems: [] };

  const pantryItems = await db.pantryItem.findMany({
    select: { id: true, name: true, quantity: true, unit: true, location: true },
  });
  const byId = new Map(pantryItems.map((item) => [item.id, item]));
  const byName = new Map(
    pantryItems.map((item) => [item.name.trim().toLowerCase(), item]),
  );

  let knownCount = 0;
  const newItems: PutAwayNewItem[] = [];

  for (const boughtItem of checkedItems) {
    if (findExactMatch(boughtItem, byId, byName)) {
      knownCount++;
      continue;
    }

    // matchItem is built for "does this phrase refer to an existing row" —
    // exactly this question — and unlike the Inventory search box's
    // searchItems(), it doesn't require every word of the bought item's
    // name to appear in the candidate (or vice versa), so "Ground beef
    // 80/20" still surfaces a plain "Ground Beef" already in the pantry.
    const { match, alternatives } = matchItem(boughtItem.name, pantryItems);
    const suggestions = [match, ...alternatives]
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
      .slice(0, MAX_SUGGESTIONS)
      .map((candidate) => {
        const full = byId.get(candidate.id)!;
        return {
          pantryItemId: full.id,
          name: full.name,
          quantity: full.quantity,
          unit: full.unit,
          location: full.location,
        };
      });

    newItems.push({
      groceryItemId: boughtItem.id,
      name: boughtItem.name,
      quantity: boughtItem.quantity,
      unit: boughtItem.unit,
      category: boughtItem.category,
      location: boughtItem.location ?? DEFAULT_LOCATION,
      suggestions,
    });
  }

  return { knownCount, newItems };
}

/** What the review sheet decided for one new item — either fold it into an
 * existing pantry row the human confirmed is the same thing, or create a
 * fresh one with whatever fields they edited. */
export type PutAwayDecision =
  | { groceryItemId: string; type: "merge"; pantryItemId: string; quantity: number }
  | {
      groceryItemId: string;
      type: "create";
      name: string;
      quantity: number;
      unit: string | null;
      category: string;
      location: string;
    };

export type PutAwayResult = { error?: string };

/**
 * Unpacking the shopping: everything ticked off gets added into the pantry,
 * then cleared off the list. `decisions` covers only the items the review
 * sheet showed — anything the household already tracks (linked, or an
 * exact name match) is put away automatically, no decision needed.
 *
 * For each bought item, the match is found the same way
 * classifyForPutAway found it — id first, exact name second — but
 * re-checked here, fresh, rather than trusted from the classification a
 * moment ago: another phone may have put the same shopping away in
 * between, and a real match found just now always wins over a stale
 * "create" decision. A `merge` decision the human explicitly made wins
 * over an automatic one too, in case they merged into something
 * classification didn't consider an exact match.
 *
 * The whole thing runs inside a transaction — an all-or-nothing bundle.
 * Without it, a failure halfway through could top up the pantry but fail
 * to clear the list, and the next "put away" would count the same
 * shopping twice.
 */
export async function commitPutAway(
  decisions: PutAwayDecision[],
): Promise<PutAwayResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const checkedItems = await db.groceryItem.findMany({
    where: { checked: true },
  });
  if (checkedItems.length === 0) return {};

  const decisionByGroceryId = new Map(
    decisions.map((decision) => [decision.groceryItemId, decision]),
  );

  await db.$transaction(async (tx) => {
    const pantryItems = await tx.pantryItem.findMany();

    // Two lookup tables so the loop below doesn't hit the database once per item.
    const byId = new Map(pantryItems.map((item) => [item.id, item]));
    const byName = new Map(
      pantryItems.map((item) => [item.name.trim().toLowerCase(), item]),
    );

    for (const boughtItem of checkedItems) {
      const decision = decisionByGroceryId.get(boughtItem.id);
      const autoMatch = findExactMatch(boughtItem, byId, byName);
      const mergeTarget =
        decision?.type === "merge" ? byId.get(decision.pantryItemId) : undefined;
      const target = autoMatch ?? mergeTarget;

      if (target) {
        // `increment` lets the database do the addition, so two people
        // putting shopping away at once can't overwrite each other's total.
        const incrementQuantity =
          decision?.type === "merge" ? decision.quantity : boughtItem.quantity;

        await tx.pantryItem.update({
          where: { id: target.id },
          data: {
            quantity: { increment: incrementQuantity },
            // This IS the restock, definitionally — groceries just came home
            // and went in the fridge/pantry. See setPantryQuantity's comment
            // in pantry.ts for what restockedAt drives.
            restockedAt: new Date(),
            // Only for a genuine automatic match — an already-known item
            // this row's own overrides (P2) describe. A merge the human
            // just chose in the review sheet only means "don't duplicate
            // this," not "also move or re-file the thing I merged into";
            // that's what Inventory's own edit sheet is for.
            ...(autoMatch && boughtItem.location
              ? { location: toLocation(boughtItem.location) }
              : {}),
            ...(autoMatch && boughtItem.categoryEdited
              ? { category: toCategory(boughtItem.category) }
              : {}),
          },
        });
      } else {
        const useDecision = decision?.type === "create";
        const created = await tx.pantryItem.create({
          data: {
            name: useDecision ? decision.name.trim() || boughtItem.name : boughtItem.name,
            quantity: useDecision ? decision.quantity : boughtItem.quantity,
            unit: useDecision ? decision.unit : boughtItem.unit,
            category: toCategory(useDecision ? decision.category : boughtItem.category),
            location: toLocation(
              useDecision ? decision.location : boughtItem.location ?? DEFAULT_LOCATION,
            ),
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

  refreshPutAwayViews();
  return {};
}
