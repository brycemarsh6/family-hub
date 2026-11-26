"use client";

import { useSyncExternalStore } from "react";

// Remembers the Rewards page's "Hide earned" switch on this device.
//
// Plain localStorage, the lastStore.ts pattern: it is a per-device viewing
// choice, nothing else needs it, and it works with no server round trip.

const KEY = "marshee.rewards.hideEarned";
// A same-tab signal: the browser's "storage" event only fires in other tabs.
const CHANGED_EVENT = "marshee.rewards.hideEarned-changed";

export function getHideEarned(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function setHideEarned(hide: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, hide ? "1" : "0");
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

/** The switch's value; the server and the first client render say off, then the device's own value takes over. */
export function useHideEarned(): boolean {
  return useSyncExternalStore(subscribe, getHideEarned, () => false);
}
