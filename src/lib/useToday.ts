"use client";

import { useSyncExternalStore } from "react";
import { startOfDay } from "./mealPlanDates";

// The browser's own idea of "today" — via useSyncExternalStore for the same
// reason src/lib/lastStore.ts uses it for localStorage (see that file's own
// comment for the full explanation of the pattern). The specific risk here
// is sharper than localStorage's: this project's dev machine runs Mountain
// time, Vercel's production runtime runs UTC, and Mountain is *behind* UTC —
// so for roughly six or seven hours every evening, the server's clock has
// already crossed into tomorrow while the browser's hasn't. A page that
// computed "today" during its server render would show the wrong day
// highlighted, then visibly flip once the client takes over. Server render
// and the first client render both get `null` here (matching, so nothing to
// flip incorrectly), then this switches to the browser's real "today"
// immediately after — the same mechanism `useLastStore` uses, applied to a
// different browser-vs-server disagreement.

function getTodayTimestamp(): number {
  // A stable primitive, not a fresh Date object — useSyncExternalStore
  // compares snapshots, and a new Date() every call would look like a
  // change on every single render, even when the day hasn't moved.
  return startOfDay(new Date()).getTime();
}

function subscribe(callback: () => void) {
  // No native "the calendar day changed" event exists. A family checking a
  // meal plan isn't relying on the highlight moving to a new day within
  // milliseconds of midnight — a minute is plenty responsive for a tab left
  // open overnight, at negligible cost.
  const interval = setInterval(callback, 60_000);
  return () => clearInterval(interval);
}

/** The device's current calendar day, at local midnight. `null` during SSR
 * and the first client render (see above) — real callers should treat that
 * as "not yet known" rather than guessing. */
export function useToday(): Date | null {
  const timestamp = useSyncExternalStore(subscribe, getTodayTimestamp, () => null);
  return timestamp === null ? null : new Date(timestamp);
}
