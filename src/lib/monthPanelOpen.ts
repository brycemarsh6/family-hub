"use client";

// Whether the Calendar's month panel is open, remembered per person per
// device (mission-72). A per-device UI convenience, not family data, so
// localStorage with no server round trip, the same shape as
// lastCalendarView.ts and the zoom's per-person key (timelineZoom.ts). Only
// a wide container (an iPad) honours the stored value; the phone's dropdown
// always starts closed, and that rule is applied at the call site.

import { useCallback, useSyncExternalStore } from "react";

export const MONTH_PANEL_KEY_PREFIX = "marshee:calendar-month-panel:";

/** One key per person, so two people sharing a device keep their own panel. */
export function monthPanelOpenKey(personId: string): string {
  return `${MONTH_PANEL_KEY_PREFIX}${personId}`;
}

/** "1" is open; anything else (missing, "0", junk) is closed. */
export function parseMonthPanelOpen(raw: string | null): boolean {
  return raw === "1";
}

// A same-tab signal: the browser's "storage" event fires only for OTHER tabs.
const MONTH_PANEL_CHANGED = "marshee:calendar-month-panel-changed";

function readOpen(viewerId: string): boolean {
  try {
    return parseMonthPanelOpen(window.localStorage.getItem(monthPanelOpenKey(viewerId)));
  } catch {
    return false;
  }
}

function writeOpen(viewerId: string, open: boolean): void {
  try {
    window.localStorage.setItem(monthPanelOpenKey(viewerId), open ? "1" : "0");
  } catch {
    // Storage blocked or full: the panel just won't be remembered.
  }
  window.dispatchEvent(new Event(MONTH_PANEL_CHANGED));
}

function subscribe(callback: () => void) {
  window.addEventListener(MONTH_PANEL_CHANGED, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(MONTH_PANEL_CHANGED, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * `useSyncExternalStore`, never `useState` + `useEffect` (see
 * lastCalendarView.ts): closed on the server and for the hydration render,
 * the real value on the render right after. A null viewer (nobody signed
 * in) reads closed and `setOpen` does nothing, so nothing is ever saved.
 */
export function useMonthPanelOpen(viewerId: string | null): [boolean, (open: boolean) => void] {
  const open = useSyncExternalStore(
    subscribe,
    () => (viewerId === null ? false : readOpen(viewerId)),
    () => false,
  );
  const setOpen = useCallback(
    (next: boolean) => {
      if (viewerId === null) return;
      writeOpen(viewerId, next);
    },
    [viewerId],
  );
  return [open, setOpen];
}
