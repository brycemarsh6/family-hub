import "server-only";

// The put-away flow (classify -> review -> commit), pulled out of
// `actions/groceriesPutAway.ts` (mission-22/P1) because the Assistant API is a
// SECOND caller. Same shape as `pantryWrites.ts`: a `server-only` lib module
// with NO auth check of its own and no `revalidatePath` — each caller carries
// its own gate (the Server Actions call `getVerifiedSession()`, the assistant
// routes carry the bearer token) and the actions keep the route strings.

import { db } from "@/lib/db";
import type { GroceryItem, PantryItem, Prisma } from "@/generated/prisma/client";
import { toCategory, toLocation, DEFAULT_LOCATION } from "@/lib/constants";
import { isMissingRowError } from "@/lib/prismaErrors";
import { findExactMatch } from "@/lib/putAwayClassify";

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

/** One line of what a commit actually did, in grocery-row order. */
export type PutAwayReportItem = {
  groceryItemId: string;
  groceryName: string;
  /** restocked = automatic match (linked or exact name); merged = a human's
   * merge decision; created = a new inventory row. */
  action: "restocked" | "merged" | "created";
  pantryItemId: string;
  quantityAdded: number;
};

/** A pantry row as the whole put-away replaced it and left it (the audit
 * log's undo copies). `before` is null when this put-away created the row; a
 * row touched by two lines carries the first `before` and the last `after`. */
export type PutAwayPantryCopy = {
  pantryItemId: string;
  before: PantryItem | null;
  after: PantryItem;
  /** The grocery rows folded into this pantry row, in order. */
  lines: PutAwayReportItem[];
};

export type PutAwayReport = {
  items: PutAwayReportItem[];
  /** Decisions that named a grocery row which wasn't checked (or no longer
   * exists), so they were not applied. Echoed so a caller can see it. */
  ignoredDecisions: string[];
};

/** What commitPutAway returns: the report plus the copies the audit log keeps. */
export type PutAwayCommit = PutAwayReport & {
  /** One entry per pantry row touched, in first-touch order. */
  pantryCopies: PutAwayPantryCopy[];
  /** The grocery rows as the claim removed them, in claim order. */
  groceryCopies: GroceryItem[];
};

export type PutAwayOptions = {
  /** What to do with an unmatched item that has no decision. "defaults"
   * (today's behaviour) creates it from the grocery row's own fields;
   * "refuse" throws PutAwayNeedsReview before writing anything. */
  createUnreviewed?: "defaults" | "refuse";
};

/**
 * Thrown by commitPutAway when the checked rows it read were already claimed
 * (put away, unchecked or deleted) by someone else before this transaction got
 * to them. The transaction rolls back, so nothing was changed.
 */
export class PutAwayConflict extends Error {
  constructor() {
    super("The checked items changed while putting them away.");
    this.name = "PutAwayConflict";
  }
}

/** Thrown by commitPutAway under `createUnreviewed: "refuse"`, before any write. */
export class PutAwayNeedsReview extends Error {
  readonly groceryItemIds: string[];
  constructor(groceryItemIds: string[]) {
    super(`${groceryItemIds.length} checked item(s) need review before put-away.`);
    this.name = "PutAwayNeedsReview";
    this.groceryItemIds = groceryItemIds;
  }
}

const MAX_TOP_UP_ATTEMPTS = 20;

/** Adds to one pantry row, returning the row as it was just before the write
 * and as the write left it. See the copy-taking note in commitPutAway. */
async function topUpPantryRow(
  tx: Prisma.TransactionClient,
  id: string,
  data: Prisma.PantryItemUpdateInput,
): Promise<{ beforeRow: PantryItem; row: PantryItem }> {
  for (let attempt = 0; attempt < MAX_TOP_UP_ATTEMPTS; attempt++) {
    const beforeRow = await tx.pantryItem.findUnique({ where: { id } });
    if (!beforeRow) throw new Error("A pantry row vanished during put-away.");
    try {
      const row = await tx.pantryItem.update({
        where: { id, updatedAt: beforeRow.updatedAt },
        data,
      });
      return { beforeRow, row };
    } catch (error) {
      // Lost the race to a parallel edit: re-read and try again.
      if (!isMissingRowError(error)) throw error;
    }
  }
  throw new Error("A pantry row kept changing during put-away.");
}

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
  options: PutAwayOptions = {},
): Promise<PutAwayCommit> {
  const createUnreviewed = options.createUnreviewed ?? "defaults";
  const checkedItems = await db.groceryItem.findMany({
    where: { checked: true },
  });
  const checkedIds = new Set(checkedItems.map((item) => item.id));
  const ignoredDecisions = [
    ...new Set(
      decisions
        .map((decision) => decision.groceryItemId)
        .filter((id) => !checkedIds.has(id)),
    ),
  ];
  if (checkedItems.length === 0) {
    return { items: [], pantryCopies: [], groceryCopies: [], ignoredDecisions };
  }

  const decisionByGroceryId = new Map(
    decisions.map((decision) => [decision.groceryItemId, decision]),
  );

  const report: PutAwayCommit = {
    items: [],
    pantryCopies: [],
    groceryCopies: [],
    ignoredDecisions,
  };

  await db.$transaction(async (tx) => {
    const pantryItems = await tx.pantryItem.findMany();

    // Two lookup tables so the loop below doesn't hit the database once per item.
    const byId = new Map(pantryItems.map((item) => [item.id, item]));
    const byName = new Map(
      pantryItems.map((item) => [item.name.trim().toLowerCase(), item]),
    );

    if (createUnreviewed === "refuse") {
      // Same re-check the loop does, run up front so a refusal precedes every
      // write. A merge decision whose target is gone counts as unreviewed too.
      const unreviewed = checkedItems.filter((boughtItem) => {
        const decision = decisionByGroceryId.get(boughtItem.id);
        if (findExactMatch(boughtItem, byId, byName)) return false;
        if (decision?.type === "merge" && byId.has(decision.pantryItemId)) return false;
        return decision?.type !== "create";
      });
      if (unreviewed.length > 0) {
        throw new PutAwayNeedsReview(unreviewed.map((item) => item.id));
      }
    }

    // Claim the rows BEFORE any pantry write. The checked rows were read
    // outside this transaction, so two put-aways at once (two phones, or the
    // assistant retrying) would both see them and both restock. Each delete
    // takes a row lock and returns the row as it was at that moment: the
    // second transaction waits here, then finds the row gone (or un-ticked)
    // and rolls back instead of restocking a second time. Restocking from the
    // returned rows, not the earlier read, means a quantity edited in between
    // is the quantity that lands in the pantry.
    const claimedItems: typeof checkedItems = [];
    for (const checkedItem of checkedItems) {
      try {
        claimedItems.push(
          await tx.groceryItem.delete({
            where: { id: checkedItem.id, checked: true },
          }),
        );
      } catch (error) {
        if (isMissingRowError(error)) throw new PutAwayConflict();
        throw error;
      }
    }

    report.groceryCopies = claimedItems;

    // Copy-taking for the pantry (the audit log's undo copies): PantryItem has
    // `updatedAt`, so each top-up is keyed on the row exactly as it was read
    // (`where { id, updatedAt }`, retried on a miss, the same pattern as
    // adjustPantryQuantity). A parallel app edit that lands between the read
    // and the write makes the write miss, and the retry re-reads it, so every
    // `before` is exactly what the update replaced and every `after` is the
    // row the update returned. No lock is held beyond the write itself.
    const copyByPantryId = new Map<string, PutAwayPantryCopy>();
    const record = (
      before: PantryItem | null,
      after: PantryItem,
      line: PutAwayReportItem,
    ) => {
      const existing = copyByPantryId.get(after.id);
      if (existing) {
        existing.after = after;
        existing.lines.push(line);
        return;
      }
      const copy = { pantryItemId: after.id, before, after, lines: [line] };
      copyByPantryId.set(after.id, copy);
      report.pantryCopies.push(copy);
    };

    for (const boughtItem of claimedItems) {
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

        const data: Prisma.PantryItemUpdateInput = {
          quantity: { increment: incrementQuantity },
          // This IS the restock, definitionally — groceries just came home
          // and went in the fridge/pantry. See setPantryQuantity's comment
          // in pantryWrites.ts for what restockedAt drives.
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
        };
        const { beforeRow, row } = await topUpPantryRow(tx, target.id, data);
        const line: PutAwayReportItem = {
          groceryItemId: boughtItem.id,
          groceryName: boughtItem.name,
          action: autoMatch ? "restocked" : "merged",
          pantryItemId: target.id,
          quantityAdded: incrementQuantity,
        };
        report.items.push(line);
        record(beforeRow, row, line);
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
        const line: PutAwayReportItem = {
          groceryItemId: boughtItem.id,
          groceryName: boughtItem.name,
          action: "created",
          pantryItemId: created.id,
          quantityAdded: created.quantity,
        };
        report.items.push(line);
        record(null, created, line);
      }
    }
  });

  return report;
}
