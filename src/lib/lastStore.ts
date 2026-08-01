"use client";

import { useSyncExternalStore } from "react";

// Remembers the most recently chosen store, so the next store picker starts
// on a good guess instead of blank every time.
//
// Plain localStorage rather than the database: this is a per-device UI
// convenience ("what did I pick last"), not data about an item — nothing
// else in the app needs to know it, and it works instantly with no server
// round trip.

const KEY = "marsh-hub:last-store";
// A same-tab signal: the browser's built-in "storage" event only fires for
// *other* tabs/windows, never the one that made the change, so a component
// reading this value right after another one just set it wouldn't hear
// about it without this.
const CHANGED_EVENT = "marsh-hub:last-store-changed";

export function getLastStore(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setLastStore(store: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, store);
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * The React-safe way to read a browser-only value like localStorage.
 *
 * The naive version of this — `useState(null)` plus a `useEffect` that reads
 * localStorage and calls `setState` — works, but reads as "fetch some data,
 * then update state," which is the pattern React (and this project's lint
 * rules) steer away from because of a real bug it invites: the server has no
 * localStorage, so the first client render would show a different value than
 * the server-rendered HTML, which is a hydration mismatch.
 *
 * `useSyncExternalStore` is React's actual tool for "read a value that lives
 * outside React and can change underneath you." Its third argument is the
 * value to use for the server render and the very first client render (here,
 * `null`, same as the server) — so the two always agree — and it only
 * switches to the real localStorage value after that, automatically.
 */
export function useLastStore(): string | null {
  return useSyncExternalStore(subscribe, getLastStore, () => null);
}
