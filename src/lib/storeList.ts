import { STORES } from "@/lib/constants";

// The household's store list, in plain code with no database. The saved text
// lives in HouseholdSettings.stores (one store per line); this file turns it
// into the clean list every screen offers. No saved text reads as the
// built-in STORES, so a copy that never edits its list looks exactly as it
// always did.

export const MAX_STORES = 12;
export const MAX_STORE_NAME = 24;
export const OTHER_STORE = "Other";
// The shopping list's two built-in filter chips. A store can't take these
// names or its chip would be confused with them.
export const ALL_FILTER = "All";
export const UNASSIGNED_FILTER = "Unassigned";

const isFilterName = (name: string) =>
  name.toLowerCase() === ALL_FILTER.toLowerCase() || name.toLowerCase() === UNASSIGNED_FILTER.toLowerCase();
const FILTER_NAME_ERROR = "That name is used by the shopping list filters.";

/** Trim, collapse inner spaces, cut long names, drop blanks, drop repeats (any case), drop "Other" and the two filter names. */
function cleanNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim().replace(/\s+/g, " ").slice(0, MAX_STORE_NAME).trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (key === OTHER_STORE.toLowerCase() || isFilterName(name) || seen.has(key)) continue;
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

/**
 * The text to save for a list of names (same cleaning as parseStoreList).
 * A list with no real stores saves "Other", never "", because blank text
 * reads back as the built-in six.
 */
export function serializeStoreList(names: readonly string[]): string {
  return cleanNames(names).join("\n") || OTHER_STORE;
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

// The edits behind the Stores screen. Each takes the household's current list
// (as parseStoreList returns it, "Other" last) and gives back the next list or
// a plain-words reason it was refused. "Other" can't be added, removed,
// renamed or moved, so it stays last after every edit.

export type StoreEdit = { ok: true; stores: string[] } | { ok: false; error: string };

const isOther = (name: string) => name.toLowerCase() === OTHER_STORE.toLowerCase();

/** One typed name, cleaned the same way the saved list is. */
function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_STORE_NAME).trim();
}

/** Put a new store just before "Other". */
export function addStore(list: readonly string[], name: string): StoreEdit {
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: "Type a store name first." };
  if (isFilterName(clean)) return { ok: false, error: FILTER_NAME_ERROR };
  if (list.some((existing) => existing.toLowerCase() === clean.toLowerCase())) {
    return { ok: false, error: "That store is already on the list." };
  }
  if (list.length >= MAX_STORES) return { ok: false, error: `You can have up to ${MAX_STORES} stores.` };
  const names = list.filter((existing) => !isOther(existing));
  return { ok: true, stores: [...names, clean, OTHER_STORE] };
}

export function removeStore(list: readonly string[], name: string): StoreEdit {
  if (isOther(name)) return { ok: false, error: "Other can't be removed." };
  if (!list.includes(name)) return { ok: false, error: "That store isn't on the list." };
  return { ok: true, stores: list.filter((existing) => existing !== name) };
}

/** Rename in place. Only capitals may change on their own; any other clash is refused. */
export function renameInList(list: readonly string[], from: string, to: string): StoreEdit {
  if (isOther(from)) return { ok: false, error: "Other can't be renamed." };
  if (!list.includes(from)) return { ok: false, error: "That store isn't on the list." };
  const clean = cleanName(to);
  if (!clean) return { ok: false, error: "Type a store name first." };
  if (isFilterName(clean)) return { ok: false, error: FILTER_NAME_ERROR };
  const clash = list.some((existing) => existing !== from && existing.toLowerCase() === clean.toLowerCase());
  if (clash || isOther(clean)) return { ok: false, error: "That store is already on the list." };
  return { ok: true, stores: list.map((existing) => (existing === from ? clean : existing)) };
}

/** The new order must name exactly the stores on the list ("Other" may be left off, or last). */
export function reorderStores(list: readonly string[], orderedNames: readonly string[]): StoreEdit {
  const movable = list.filter((existing) => !isOther(existing));
  const ordered = [...orderedNames];
  if (ordered.length > 0 && isOther(ordered[ordered.length - 1])) ordered.pop();
  const sameSet =
    ordered.length === movable.length &&
    new Set(ordered).size === ordered.length &&
    ordered.every((existing) => movable.includes(existing));
  if (!sameSet) return { ok: false, error: "That order doesn't match the stores on the list." };
  return { ok: true, stores: [...ordered, OTHER_STORE] };
}
