"use client";

import { useSyncExternalStore } from "react";

// Remembers which Inventory category groups were left open, per device —
// same reasoning and the same useSyncExternalStore pattern as lastStore.ts
// (see that file's own comment for why this isn't useState + useEffect):
// the server has no localStorage, so the first client render has to match
// the server-rendered HTML exactly, and only swap to the real value after.
//
// Plain localStorage, not the database: this is "what did I leave open,"
// a per-device UI convenience, not data about the household's pantry.

const KEY = "marsh-hub:inventory-open-categories";
// A same-tab signal: the browser's "storage" event only fires for *other*
// tabs, never the one that made the change.
const CHANGED_EVENT = "marsh-hub:inventory-open-categories-changed";

// A stable empty-array reference for "nothing open yet" — a fresh `[]` on
// every call would make useSyncExternalStore think the snapshot changed on
// every render, which either warns or loops.
const EMPTY: readonly string[] = [];

// getSnapshot must return the *same* reference until the underlying value
// actually changes, or useSyncExternalStore assumes it changed every call.
// JSON.parse can't provide that on its own — it makes a new array each
// time — so the parsed result is cached against the raw string that
// produced it, and only reparsed when that raw string is different.
let cachedRaw: string | null | undefined;
let cachedValue: readonly string[] = EMPTY;

function readSnapshot(): readonly string[] {
  if (typeof window === "undefined") return EMPTY;

  const raw = window.localStorage.getItem(KEY);
  if (raw === cachedRaw) return cachedValue;

  let value: readonly string[] = EMPTY;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        value = parsed.filter((entry): entry is string => typeof entry === "string");
      }
    } catch {
      value = EMPTY;
    }
  }

  cachedRaw = raw;
  cachedValue = value;
  return value;
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** The persisted list of open category names. `[]` during SSR and the
 * first client render (see lastStore.ts for why that has to match the
 * server), switching to the real saved list right after. */
export function useInventoryOpenCategories(): readonly string[] {
  return useSyncExternalStore(subscribe, readSnapshot, () => EMPTY);
}

/**
 * The current value, read directly rather than via the hook — for a
 * toggle handler that needs to read-modify-write.
 *
 * This matters more than it looks: two toggles fired in the same tick (two
 * quick taps before React re-renders) both close over the value from the
 * SAME render. A handler that reads the hook's render-time value and writes
 * `[...that value, newCategory]` would let the second toggle silently
 * discard the first — this is exactly the bug `setState`'s functional
 * updater exists to prevent, and this store has no equivalent unless
 * callers read fresh here instead of trusting what they rendered with.
 */
export function getInventoryOpenCategories(): readonly string[] {
  return readSnapshot();
}

export function setInventoryOpenCategories(categories: readonly string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(categories));
  window.dispatchEvent(new Event(CHANGED_EVENT));
}
