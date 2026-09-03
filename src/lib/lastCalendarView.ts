"use client";

// The Calendar's last-used view, remembered per device (mission-11/C2;
// calendar-v2.md decision 5). Same shape as lastStore.ts's store-picker
// memory, and for the same reasons — a per-device UI convenience ("which
// view do I like"), not data about the family, so localStorage rather than
// a column, with no server round trip.
//
// Its one reader and one writer both live in useCalendarNavigation.ts;
// this is a file of its own only because that hook is at 300+ lines and
// the 350-line cap is real. Two rules travel with it, and both are
// enforced at the call site rather than here:
//
//   READ ONLY WHEN "?view=" IS ABSENT, AND ONLY ONCE PER MOUNT. The URL
//   stays the source of truth; a stored preference that argued with the URL
//   would re-invent the C8/C9 drift CV0 spent four contracts killing. It is
//   a FALLBACK passed to `parseViewParam`, never an override — and it is
//   frozen at the moment it first resolves (`freezeFallbackView`), because
//   a URL naming no view must keep meaning what it meant when it was
//   opened, or Back to it stops working (mission-11/C3).
//
//   WRITTEN ONLY BY A PICKER TAP, never by the URL resync. "Last used"
//   means the last view this person deliberately chose — a deep link
//   someone else sent, or a Back that happens to land on Month, is not a
//   preference and must not silently become one.

import { useSyncExternalStore } from "react";
import { toBuiltCalendarView, type CalendarPeriodView } from "./calendarViewVocabulary";

const LAST_VIEW_KEY = "marshee:last-calendar-view";
// A same-tab signal: the browser's "storage" event fires only for OTHER
// tabs, so without this one nothing would tell the tab that just wrote the
// value to re-read it.
//
// Not subscribing to "storage" is deliberate — but it is NOT what stops
// another tab's picker tap from changing the view under this one's finger,
// and this comment used to claim it was. Vision measured the opposite in
// mission-11/C3: tab B picked Month, and tab A's next Back landed on Month.
// A subscription only decides whether a re-render is TRIGGERED; React calls
// `getSnapshot` on every render either way, so any unrelated re-render in
// tab A (a Next tap, say) picked up tab B's write. What actually delivers
// the promise is the READER — useCalendarNavigation freezes this value at
// mount — so a write from anywhere, another tab or this one's own picker,
// cannot reach a mount already under way.
//
// The event still earns its place: it keeps this a correct external store
// on its own terms (write then read, same tab, same answer) rather than one
// whose correctness depends on its only caller happening to freeze it.
const LAST_VIEW_CHANGED = "marshee:last-calendar-view-changed";

function readLastCalendarView(): CalendarPeriodView | null {
  if (typeof window === "undefined") return null;
  // Narrowed through the same BUILT_VIEWS gate a URL goes through: a value
  // written by a future build ("year") — or by hand — normalizes away
  // rather than pointing this device at a renderer that does not exist.
  return toBuiltCalendarView(window.localStorage.getItem(LAST_VIEW_KEY));
}

export function writeLastCalendarView(view: CalendarPeriodView): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_VIEW_KEY, view);
  window.dispatchEvent(new Event(LAST_VIEW_CHANGED));
}

function subscribeLastCalendarView(callback: () => void) {
  window.addEventListener(LAST_VIEW_CHANGED, callback);
  return () => window.removeEventListener(LAST_VIEW_CHANGED, callback);
}

/**
 * `useSyncExternalStore`, never `useState` + `useEffect`: the server has no
 * localStorage, so the read-in-an-effect version renders one thing on the
 * server and another on the first client render — a hydration mismatch,
 * which is why this project's lint rules forbid the pattern (see
 * lastStore.ts's own comment, and CLAUDE.md). The third argument below is
 * the value used for the server render and the hydration render (`null`,
 * so both agree); the real value arrives on the render right after — the
 * same render `useToday()` resolves on, since both are external-store
 * reads checked in the one post-hydration pass. That co-timing is what
 * lets useCalendarNavigation's resync effect see the preference the first
 * time it has anything to reconcile — and what makes the value frozen there
 * the real preference rather than this `null` placeholder.
 */
export function useLastCalendarView(): CalendarPeriodView | null {
  return useSyncExternalStore(subscribeLastCalendarView, readLastCalendarView, () => null);
}

