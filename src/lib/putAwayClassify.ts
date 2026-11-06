import "server-only";

// The read-only half of the put-away flow: what would "Put away" do with the
// ticked items? Split out of `putAway.ts` (mission-39/L1) to keep both files
// small. Same rules as there: NO auth check of its own and no `revalidatePath`.

import { db } from "@/lib/db";
import { DEFAULT_LOCATION } from "@/lib/constants";
import { matchItem } from "@/lib/match";

/**
 * Is this bought item already something the household tracks? Two ways to
 * know for certain — linked by id, or an exact (case-insensitive) name
 * match. Anything looser than exact is a *suggestion*, never a match: see
 * matchItem's own module comment for what plain substring matching cost
 * this app before (steaks filed under a rule meant for "tea").
 */
export function findExactMatch(
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
