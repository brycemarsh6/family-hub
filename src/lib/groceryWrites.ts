import "server-only";

// The one definition of every shopping-list write — pulled out of
// `actions/groceries.ts` and the two grocery adders in `actions/pantry.ts`
// (mission-22/G1) because the Assistant API is a SECOND caller, and a Route
// Handler with no session can't call a `"use server"` action (nor may lib
// import from `actions/`). Same shape as `pantryWrites.ts`: a `server-only`
// lib module with NO auth check of its own. Each caller carries its own gate,
// and `revalidatePath` stays in the actions (STRUCTURE.md: route strings never
// live in lib).
//
// Input *normalization* (trim, round to 2dp, floor, vocabulary guards) lives
// here so both callers get identical rows; *rejection* of bad input (an empty
// name) stays with the caller, as it always was. Rows that carry `addedById`
// take an `actorUserId` — null when the caller has no person to attribute.

import { db } from "@/lib/db";
import type { GroceryItem, Prisma } from "@/generated/prisma/client";
import { isLow, toCategory, toLocation, toStore } from "@/lib/constants";
import { tokens } from "@/lib/match";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Never let a quantity drop below 1 — removing an item is what delete is for. */
const floorQuantity = (n: number) => Math.max(1, round2(n));

/** The comparison key for "is this the same thing already on the list". */
const nameKey = (name: string) => tokens(name).join(" ");

/**
 * Copy-taking (the audit log's undo copies): GroceryItem has no `updatedAt`,
 * so a write can't be keyed on "the row is still what I read". Instead the
 * write runs in a transaction that first locks the rows (`SELECT ... FOR
 * UPDATE`, in id order so two lockers can't deadlock); every other writer
 * waits, so the `before` read after the lock is exactly what the write then
 * replaces, and the row the write returns is exactly what it left.
 */
async function lockGroceryRows(tx: Prisma.TransactionClient, ids: string[]) {
  if (ids.length === 0) return;
  await tx.$queryRaw`SELECT "id" FROM "GroceryItem" WHERE "id" = ANY(${ids}) ORDER BY "id" FOR UPDATE`;
}

/** A row as one write replaced it (`before`) and left it (`after`). */
export type GroceryCopies = { before: GroceryItem; after: GroceryItem };

export async function addGroceryItem(
  fields: {
    name: string;
    quantity: number;
    unit: string | null;
    category: unknown;
    store: unknown;
    /** Optional free-text note; absent keeps today's behaviour (no note). */
    note?: string | null;
  },
  options: { actorUserId: string | null; mergeIntoExisting?: boolean },
): Promise<{ row: GroceryItem; merged: boolean; before: GroceryItem | null }> {
  const name = fields.name.trim();
  const quantity =
    Number.isFinite(fields.quantity) && fields.quantity > 0
      ? fields.quantity
      : 1;
  // toStore() returns null rather than a default — leaving the store blank is
  // a normal, valid choice, not a mistake.
  const store = toStore(fields.store);

  if (options.mergeIntoExisting) {
    const key = nameKey(name);
    if (key) {
      // Checked rows are already bought — adding more of the thing starts a
      // fresh line, it doesn't resurrect that one. `store: null` matches null.
      const candidates = await db.groceryItem.findMany({
        where: { checked: false, store },
        orderBy: { createdAt: "asc" },
      });
      const existing = candidates.find((row) => nameKey(row.name) === key);
      if (existing) {
        // `increment` lets the database do the addition (one atomic UPDATE),
        // so parallel adds onto the same row can't overwrite each other's
        // total the way read-then-write did. Only the incoming amount is
        // rounded; the stored value is never re-rounded by a round trip.
        // The row is locked first (see lockGroceryRows) so `before` is exactly
        // what this add replaced, and the add lands only on a row that is
        // still unchecked: if it was ticked or deleted since the lookup we
        // fall through to a fresh line (otherwise the added quantity would
        // ride along into the next put-away).
        // Not covered: parallel adds of a NEW name each find no row and each
        // create one (no quantity is lost, but duplicates are possible).
        const copies = await db.$transaction(async (tx) => {
          await lockGroceryRows(tx, [existing.id]);
          const before = await tx.groceryItem.findUnique({
            where: { id: existing.id },
          });
          if (!before || before.checked) return null;
          const after = await tx.groceryItem.update({
            where: { id: existing.id },
            data: { quantity: { increment: round2(quantity) } },
          });
          return { before, after };
        });
        if (copies) {
          return { row: copies.after, merged: true, before: copies.before };
        }
      }
    }
  }

  const row = await db.groceryItem.create({
    data: {
      name,
      quantity,
      unit: fields.unit?.trim() || null,
      // toCategory() rejects anything that isn't one of our real categories,
      // so a tampered-with request can't put junk in the database.
      category: toCategory(fields.category),
      store,
      note: fields.note?.trim() || null,
      addedById: options.actorUserId,
    },
  });
  return { row, merged: false, before: null };
}

/** Tick or untick rows inside an open transaction; the rows must be locked. */
async function setCheckedIn(
  tx: Prisma.TransactionClient,
  ids: string[],
  checked: boolean,
) {
  await tx.groceryItem.updateMany({
    where: { id: { in: ids } },
    // Record when it was ticked off, so checked items can be listed
    // most-recent-first.
    data: { checked, checkedAt: checked ? new Date() : null },
  });
}

/**
 * Tick or untick several rows at once, with a before/after copy of every row
 * that exists (a missing id simply has no entry). Locked first, see
 * lockGroceryRows.
 */
export async function setGroceryCheckedWithCopies(
  ids: string[],
  checked: boolean,
): Promise<Map<string, GroceryCopies>> {
  return db.$transaction(async (tx) => {
    await lockGroceryRows(tx, ids);
    const before = await tx.groceryItem.findMany({ where: { id: { in: ids } } });
    await setCheckedIn(tx, ids, checked);
    const after = await tx.groceryItem.findMany({ where: { id: { in: ids } } });
    const afterById = new Map(after.map((row) => [row.id, row]));
    const copies = new Map<string, GroceryCopies>();
    for (const row of before) {
      const next = afterById.get(row.id);
      if (next) copies.set(row.id, { before: row, after: next });
    }
    return copies;
  });
}

/** Flip one row's checked state; null when the row is missing. */
export async function toggleGroceryChecked(
  id: string,
): Promise<GroceryItem | null> {
  const item = await db.groceryItem.findUnique({ where: { id } });
  if (!item) return null;

  return db.groceryItem.update({
    where: { id },
    data: {
      checked: !item.checked,
      checkedAt: item.checked ? null : new Date(),
    },
  });
}

/** Throws P2025 on a missing row, as the action always did. */
export async function setGroceryQuantity(
  id: string,
  quantity: number,
): Promise<GroceryItem> {
  return db.groceryItem.update({
    where: { id },
    data: { quantity: floorQuantity(quantity) },
  });
}

/**
 * Patch the fields a shopper actually needs to correct in place. Deliberately
 * does NOT touch `checked` or `pantryItemId` — ticking off has its own helper,
 * and the pantry link is a provenance record, not something to hand-edit.
 * A field left `undefined` is untouched. Returns null when the row is missing.
 */
export async function editGroceryItem(
  id: string,
  edits: GroceryEdits,
): Promise<GroceryItem | null> {
  const copies = await patchGroceryItemWithCopies(id, edits, undefined);
  return copies ? copies.after : null;
}

type GroceryEdits = {
    name?: string;
    quantity?: number;
    unit?: string | null;
    category?: string;
    store?: string | null;
    /** Null = no opinion; see GroceryItem.location's schema comment. */
    location?: string | null;
    /** Null or blank clears the note; undefined leaves it alone. */
    note?: string | null;
};

/**
 * editGroceryItem plus an optional tick/untick, as ONE locked transaction,
 * returning the row before and after the whole patch (the audit log's undo
 * copies). Null when the row is missing.
 */
export async function patchGroceryItemWithCopies(
  id: string,
  edits: GroceryEdits,
  checked: boolean | undefined,
): Promise<GroceryCopies | null> {
  return db.$transaction(async (tx) => {
    await lockGroceryRows(tx, [id]);
    const current = await tx.groceryItem.findUnique({ where: { id } });
    if (!current) return null;
    let after = current;
    if (Object.keys(edits).length > 0) after = await editIn(tx, id, edits, current);
    if (checked !== undefined) {
      await setCheckedIn(tx, [id], checked);
      after = (await tx.groceryItem.findUnique({ where: { id } })) ?? after;
    }
    return { before: current, after };
  });
}

async function editIn(
  tx: Prisma.TransactionClient,
  id: string,
  edits: GroceryEdits,
  current: GroceryItem,
): Promise<GroceryItem> {
  const category =
    edits.category === undefined ? undefined : toCategory(edits.category);

  return tx.groceryItem.update({
    where: { id },
    data: {
      name: edits.name === undefined ? undefined : edits.name.trim(),
      quantity:
        edits.quantity === undefined ? undefined : floorQuantity(edits.quantity),
      unit:
        edits.unit === undefined ? undefined : edits.unit?.trim() || null,
      category,
      store: edits.store === undefined ? undefined : toStore(edits.store),
      note: edits.note === undefined ? undefined : edits.note?.trim() || null,
      location:
        edits.location === undefined
          ? undefined
          : edits.location
            ? toLocation(edits.location)
            : null,
      // Compared against what was actually stored before this save, not
      // against a value handed in by the client — a tampered-with request
      // can claim any "previous" category it likes, but it can't fake what
      // the database already had. Only a genuine change flips this; saving
      // with the category untouched leaves a prior edit's flag alone
      // rather than ever clearing it back to false.
      categoryEdited:
        category !== undefined && category !== current.category
          ? true
          : undefined,
    },
  });
}

/** Throws P2025 on a missing row, as the action always did. */
export async function deleteGroceryItem(id: string): Promise<GroceryItem> {
  return db.groceryItem.delete({ where: { id } });
}

/** Remove everything already ticked off, without touching the pantry. */
export async function clearCheckedGroceryItems(): Promise<number> {
  const result = await db.groceryItem.deleteMany({ where: { checked: true } });
  return result.count;
}

/**
 * Put one pantry item on the list. Null when the pantry item is missing or is
 * already on the list unchecked, so tapping twice is harmless.
 */
export async function addPantryItemToList(
  pantryItemId: string,
  store: unknown,
  actorUserId: string | null,
): Promise<GroceryItem | null> {
  const pantryItem = await db.pantryItem.findUnique({
    where: { id: pantryItemId },
  });
  if (!pantryItem) return null;

  const alreadyOnList = await db.groceryItem.findFirst({
    where: { pantryItemId, checked: false },
  });
  if (alreadyOnList) return null;

  return db.groceryItem.create({
    data: {
      name: pantryItem.name,
      quantity: 1,
      unit: pantryItem.unit,
      category: pantryItem.category,
      pantryItemId: pantryItem.id,
      store: toStore(store),
      addedById: actorUserId,
    },
  });
}

/**
 * The one-tap restock: everything at or below its "low" threshold goes on the
 * list, skipping anything already on there. `store` applies to the whole
 * batch. Returns the rows created (empty when nothing was low or all listed).
 */
export async function addLowItemsToList(
  store: unknown,
  actorUserId: string | null,
): Promise<GroceryItem[]> {
  const pantryItems = await db.pantryItem.findMany();

  // The "is it low?" test happens here rather than in the query — a `where`
  // can't compare two columns.
  const lowItems = pantryItems.filter((item) =>
    isLow(item.quantity, item.lowThreshold),
  );
  if (lowItems.length === 0) return [];

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
  if (toAdd.length === 0) return [];

  const validStore = toStore(store);

  return db.groceryItem.createManyAndReturn({
    data: toAdd.map((item) => ({
      name: item.name,
      quantity: 1,
      unit: item.unit,
      category: item.category,
      pantryItemId: item.id,
      store: validStore,
      addedById: actorUserId,
    })),
  });
}
