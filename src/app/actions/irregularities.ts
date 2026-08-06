"use server";

// Server Actions for the inventory review queue. Same rule as every other
// actions file: these are real POST endpoints reachable directly, so every
// one starts with a getVerifiedSession() check.
//
// The irregularities themselves are never stored — they're recomputed from
// live data on each call (see src/lib/duplicates.ts). Only dismissals
// persist, in IrregularityDismissal.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedSession } from "@/lib/dal";
import { toCategory, toLocation } from "@/lib/constants";
import {
  findIrregularities,
  type DuplicateCandidate,
  type DuplicatePair,
  type ParkedInOther,
} from "@/lib/duplicates";

function refreshInventoryViews() {
  revalidatePath("/kitchen/inventory");
  revalidatePath("/kitchen/shopping");
  revalidatePath("/kitchen");
  revalidatePath("/");
}

export type ReviewQueue = {
  pairs: DuplicatePair[];
  parked: ParkedInOther[];
  total: number;
};

/**
 * Everything the review queue should show right now: detectors run
 * against live data, minus anything already dismissed forever.
 *
 * Read-only. Called both for the header badge's count and for the sheet
 * itself, so the number on the icon and the list behind it can never
 * disagree.
 */
export async function getReviewQueue(): Promise<ReviewQueue> {
  if (!(await getVerifiedSession())) return { pairs: [], parked: [], total: 0 };

  const [items, dismissals] = await Promise.all([
    db.pantryItem.findMany({
      select: {
        id: true,
        name: true,
        location: true,
        category: true,
        quantity: true,
        unit: true,
      },
    }),
    db.irregularityDismissal.findMany({ select: { fingerprint: true } }),
  ]);

  const dismissed = new Set(dismissals.map((d) => d.fingerprint));
  const report = findIrregularities(items as DuplicateCandidate[]);

  const pairs = [...report.sameName, ...report.subsetName].filter(
    (pair) => !dismissed.has(pair.fingerprint),
  );
  const parked = report.parked.filter(
    (entry) => !dismissed.has(entry.fingerprint),
  );

  return { pairs, parked, total: pairs.length + parked.length };
}

/**
 * "These are different things, stop asking." Permanent by design — a
 * queue that re-raises settled decisions is how these features become
 * noise and get ignored.
 *
 * Idempotent: tapping twice (or two phones at once) lands on the same
 * row rather than erroring, since `fingerprint` is unique.
 */
export async function dismissIrregularity(kind: string, fingerprint: string) {
  if (!(await getVerifiedSession())) return;
  if (!fingerprint.trim()) return;

  await db.irregularityDismissal.upsert({
    where: { fingerprint },
    create: { kind, fingerprint },
    update: {},
  });

  refreshInventoryViews();
}

export type MergeResult = { error?: string };

/**
 * Fold one pantry row into another: add its quantity to the survivor,
 * then delete it.
 *
 * THE TRAP, and why the two foreign keys pointing at PantryItem are
 * treated in opposite ways here:
 *
 * - `GroceryItem.pantryItemId` MUST be re-pointed to the survivor first.
 *   It's `onDelete: SetNull`, so a live shopping-list row linked to the
 *   merged-away item would silently lose its link, and "Put away" would
 *   then create a duplicate instead of restocking the survivor — quietly
 *   re-creating the exact mess this queue exists to clean up.
 *
 * - `VoiceChange.pantryItemId` must NOT be re-pointed. Letting it go
 *   null is correct: `applyUndo` (src/lib/voice/apply.ts) *deletes the
 *   pantry item outright* when a log row has `quantityBefore === null`,
 *   because that change is what created the item. Re-point such a row to
 *   the survivor and a later "undo" would delete the survivor — taking
 *   the merged quantities with it. Going null degrades undo to a
 *   harmless no-op, and the log still reads correctly because
 *   `itemName` is stored as plain text for exactly this reason (see its
 *   schema comment).
 *
 * Runs in a transaction: re-link, add, delete, and dismiss together, so
 * a failure halfway can't leave the survivor topped up with the other
 * row still present (which would double the household's count).
 */
export async function mergePantryItems(input: {
  survivorId: string;
  mergedId: string;
  /** Recorded so the pair never comes back if the same names recur. */
  fingerprint: string;
}): Promise<MergeResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };
  if (input.survivorId === input.mergedId) {
    return { error: "Can't merge an item into itself." };
  }

  const [survivor, merged] = await Promise.all([
    db.pantryItem.findUnique({ where: { id: input.survivorId } }),
    db.pantryItem.findUnique({ where: { id: input.mergedId } }),
  ]);
  if (!survivor || !merged) {
    // Someone else already resolved this one — re-reading the queue will
    // simply no longer show it, so this isn't worth surfacing as an error.
    return {};
  }

  await db.$transaction(async (tx) => {
    // Re-link BEFORE the delete, or SetNull silently wins the race.
    await tx.groceryItem.updateMany({
      where: { pantryItemId: input.mergedId },
      data: { pantryItemId: input.survivorId },
    });

    await tx.pantryItem.update({
      where: { id: input.survivorId },
      data: {
        quantity: { increment: merged.quantity },
        restockedAt: new Date(),
      },
    });

    // VoiceChange rows pointing here are deliberately left alone — see
    // the comment above. They go null via SetNull, which is what we want.
    await tx.pantryItem.delete({ where: { id: input.mergedId } });

    if (input.fingerprint.trim()) {
      await tx.irregularityDismissal.upsert({
        where: { fingerprint: input.fingerprint },
        create: { kind: "merged", fingerprint: input.fingerprint },
        update: {},
      });
    }
  });

  refreshInventoryViews();
  return {};
}

/**
 * Resolve a "parked in Other" entry by filing it properly. Only touches
 * the one field the detector complained about, so filing a location
 * can't quietly overwrite a category someone set moments earlier from
 * another phone.
 */
export async function fileParkedItem(input: {
  itemId: string;
  location?: string;
  category?: string;
}) {
  if (!(await getVerifiedSession())) return;

  const data: { location?: string; category?: string } = {};
  if (input.location !== undefined) data.location = toLocation(input.location);
  if (input.category !== undefined) data.category = toCategory(input.category);
  if (Object.keys(data).length === 0) return;

  await db.pantryItem.updateMany({ where: { id: input.itemId }, data });
  refreshInventoryViews();
}
