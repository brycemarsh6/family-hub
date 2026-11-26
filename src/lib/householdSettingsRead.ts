import "server-only";

import { db } from "@/lib/db";
import { parseStoreList } from "@/lib/storeList";

// The only place the HouseholdSettings table is read. No login check: the
// callers (the shopping, inventory and expiring pages, the grocery writes and
// the dashboard loaders) check who is asking. A missing row, or no saved
// stores, reads as the built-in store list.

export async function householdStores(): Promise<string[]> {
  const row = await db.householdSettings.findUnique({ where: { id: "household" } });
  return parseStoreList(row?.stores);
}

/** The family name saved in setup, or null when none is saved (or reading fails). */
export async function savedFamilyName(): Promise<string | null> {
  try {
    const row = await db.householdSettings.findUnique({
      where: { id: "household" },
      select: { familyName: true },
    });
    return row?.familyName?.trim() || null;
  } catch {
    return null;
  }
}

/** True once first-run setup has finished. Errors propagate: the setup gate
 * must never read a failed lookup as "not finished". */
export async function setupFinished(): Promise<boolean> {
  const row = await db.householdSettings.findUnique({
    where: { id: "household" },
    select: { setupFinishedAt: true },
  });
  return row?.setupFinishedAt != null;
}

/** The stored hash of the current recovery code, or null when none is saved.
 * Errors propagate. */
export async function recoveryCodeHash(): Promise<string | null> {
  const row = await db.householdSettings.findUnique({
    where: { id: "household" },
    select: { recoveryCodeHash: true },
  });
  return row?.recoveryCodeHash ?? null;
}

/** Whether a recovery code has been made yet. Errors propagate. */
export async function hasRecoveryCode(): Promise<boolean> {
  return (await recoveryCodeHash()) !== null;
}

/** True once the family has hidden the "Finish setting up" card. Errors propagate. */
export async function checklistDismissed(): Promise<boolean> {
  const row = await db.householdSettings.findUnique({
    where: { id: "household" },
    select: { checklistDismissedAt: true },
  });
  return row?.checklistDismissedAt != null;
}

/** True once the Stores screen has saved a list (even the built-in six). Errors propagate. */
export async function storesSaved(): Promise<boolean> {
  const row = await db.householdSettings.findUnique({
    where: { id: "household" },
    select: { stores: true },
  });
  return (row?.stores?.trim() ?? "") !== "";
}
