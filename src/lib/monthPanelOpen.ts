"use client";

// The Calendar's month panel state (mission-72). This file owns two things:
// the stored open value (`useMonthPanelOpen`) and everything CalendarViews
// decides about the panel from it (`useMonthPanel`). Open is remembered per
// person per device. A per-device UI convenience, not family data, so
// localStorage with no server round trip, the same shape as
// lastCalendarView.ts and the zoom's per-person key (timelineZoom.ts). Only
// a wide container (an iPad) honours the stored value; the phone's dropdown
// always starts closed, and that rule is applied at the call site.

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { NAV_RAIL_WIDTH } from "@/lib/appChrome";
import { monthPanelBeside, MONTH_PANEL_BESIDE_MIN_PX, widthWithRailNav } from "@/lib/gridClasses";
import { useContainerWidth } from "@/lib/useContainerWidth";

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

/**
 * Everything CalendarViews decides about the month panel (mission-72), kept
 * out of that file. Attach `bodyRef` to the box holding the panel and the
 * view (measured, never the window) and `viewRef` to the view's own wrapper.
 *
 * - `wide` (body at least 700px): the open state is the remembered one. Under
 *   it (a phone) it is a plain boolean that always starts closed.
 * - `beside`: open, on a view with columns, with room left for them
 *   (`monthPanelBeside`). Only then is the chrome squeezed to the rail.
 * - `toggle` / `closeNow` hold the reader's place: if the page is scrolled,
 *   the view's top edge is recorded before the change and the scroll is
 *   moved by however far that edge moved, before paint. Measuring the view's
 *   own edge (not the document height) stays right whether or not the
 *   browser's native scroll anchoring already helped.
 * - A pinned Sidebar is what the body is measured beside, but it is squeezed
 *   to the rail once the panel is beside, so the decision reads the live
 *   `--app-nav-width` (set on AppChrome's wrapper, 256px only while the
 *   Sidebar shows) and adds the difference (`widthWithRailNav`).
 * - On a stacked panel, `stackedHeightPx` is its measured height (0 when none
 *   is showing): Schedule reveals rows below it, not just below the chrome.
 * - `closeNow` closes a phone dropdown before the caller scrolls, so the
 *   picked day lands under the header (a no-op on a wide body).
 */
export function useMonthPanel(viewerId: string | null, rootPx: number, canBeside: boolean) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(bodyRef);
  const wide = width >= MONTH_PANEL_BESIDE_MIN_PX;
  const [storedOpen, setStoredOpen] = useMonthPanelOpen(viewerId);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const open = wide ? storedOpen : phoneOpen;
  const [navPx, setNavPx] = useState(0);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el) setNavPx(parseFloat(getComputedStyle(el).getPropertyValue("--app-nav-width")) || 0);
  }, [width]);
  const beside = open && monthPanelBeside(canBeside, widthWithRailNav(width, navPx, parseFloat(NAV_RAIL_WIDTH)), rootPx);

  // The stacked panel's height, kept by a ResizeObserver on its own box.
  const [panelNode, panelRef] = useState<HTMLDivElement | null>(null);
  const [panelHeightPx, setPanelHeightPx] = useState(0);
  useLayoutEffect(() => {
    if (!panelNode) return;
    const measure = () => setPanelHeightPx(Math.round(panelNode.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panelNode);
    return () => observer.disconnect();
  }, [panelNode]);
  const stackedHeightPx = open && !beside && panelNode ? panelHeightPx : 0;

  const heldTop = useRef<number | null>(null);
  const hold = () => {
    heldTop.current = window.scrollY > 0 ? (viewRef.current?.getBoundingClientRect().top ?? null) : null;
  };
  useLayoutEffect(() => {
    const before = heldTop.current;
    if (before === null) return;
    heldTop.current = null;
    const shift = (viewRef.current?.getBoundingClientRect().top ?? before) - before;
    if (shift !== 0) window.scrollTo({ top: window.scrollY + shift, behavior: "instant" });
  });

  const toggle = () => {
    // With no viewer on a wide body nothing changes, so nothing is held.
    if (!wide || viewerId !== null) hold();
    if (wide) setStoredOpen(!storedOpen);
    else setPhoneOpen(!phoneOpen);
  };
  const closeNow = () => {
    if (wide) return;
    hold();
    flushSync(() => setPhoneOpen(false));
  };
  return { bodyRef, viewRef, panelRef, stackedHeightPx, open, beside, toggle, closeNow };
}
