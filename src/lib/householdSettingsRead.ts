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
