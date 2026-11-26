import { STORES } from "@/lib/constants";

// The household's store list, in plain code with no database. The saved text
// lives in HouseholdSettings.stores (one store per line); this file turns it
// into the clean list every screen offers. No saved text reads as the
// built-in STORES, so a copy that never edits its list looks exactly as it
// always did.

export const MAX_STORES = 12;
export const MAX_STORE_NAME = 24;
export const OTHER_STORE = "Other";

/** Trim, collapse inner spaces, cut long names, drop blanks, drop repeats (any case), drop "Other". */
function cleanNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim().replace(/\s+/g, " ").slice(0, MAX_STORE_NAME).trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (key === OTHER_STORE.toLowerCase() || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** The saved text as a list: at most 12 names, "Other" always present and always last. */
export function parseStoreList(text: string | null | undefined): string[] {
  if (!text || !text.trim()) return [...STORES];
  const names = cleanNames(text.split("\n")).slice(0, MAX_STORES - 1);
  return [...names, OTHER_STORE];
}

/** The text to save for a list of names (same cleaning as parseStoreList). */
export function serializeStoreList(names: readonly string[]): string {
  return cleanNames(names).join("\n");
}

/**
 * The shopping list's filter chips: the saved list in order, then any store
 * an item still uses that was since removed, so those items stay reachable.
 */
export function storeFilterOptions(
  saved: readonly string[],
  itemStores: readonly (string | null)[],
): string[] {
  const out = [...saved];
  for (const store of itemStores) {
    if (store && !out.includes(store)) out.push(store);
  }
  return out;
}
