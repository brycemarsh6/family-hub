"use client";

import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import type { NavMode } from "./navMode";

/**
 * mission-23 — the height of the row the floating hamburger button sits in
 * on every page except the dashboard and /login: a 0.5rem gap ABOVE the
 * button (its top offset) plus the 3rem (`h-12`) button, so the button's
 * bottom edge is exactly where `<main>` content starts. Deliberately
 * EXCLUDES `env(safe-area-inset-top)`, a device fact this constant cannot
 * know; `useHamburgerRowHeight` below measures with the inset included.
 *
 * mission-58 — a CSS length in rem, not px: the button is rem-sized, so it
 * grows with the Text size setting and the row must grow with it. Write it
 * into a `style` or `calc()` as is. Where JavaScript needs a number, use
 * `HAMBURGER_ROW_HEIGHT_PX` (a first-paint seed only) or measure.
 *
 * STRUCTURE.md's chrome-dimension rule: this number has one home, here.
 * Never call `useHamburgerRowHeight` from a component that lives in the
 * layout and survives navigation (it reads once on mount and could hold a
 * stale 0); page-level components only.
 *
 * Dependents (check each when this changes): `AppChrome.tsx`'s `<main>` top
 * padding, `CalendarHeader.tsx`'s lift onto this row and pinned Schedule
 * bar, `ScheduleView.tsx`'s month-title boundary, `TimelineGrid.tsx`'s
 * scroller seed (via `CalendarViews.tsx`), `RecipeList.tsx`'s sticky
 * letters, `calendar/loading.tsx`'s skeleton, `FeedbackList.tsx`'s sticky
 * panel, and `MealPlanList.tsx`'s `scrollMarginTop`.
 */
export const HAMBURGER_ROW_HEIGHT = "3.5rem";

/** The same row as a number of rem, for the one place that multiplies it out. */
const HAMBURGER_ROW_HEIGHT_REM = 3.5;

/**
 * The row at the default 16px root font size: only the first-paint seed of
 * `useHamburgerRowHeight`, which has no document to read on the server. The
 * hook replaces it with a real measurement before the first paint.
 */
export const HAMBURGER_ROW_HEIGHT_PX = 56;

/** Measures the floating hamburger's bottom edge, or 0 when it is absent. */
function measureButtonBottom(button: Element | null): number {
  return button ? button.getBoundingClientRect().bottom : 0;
}

/**
 * Measures the real bottom edge of the floating hamburger button (inset
 * included), picked out by its `data-floating-menu-button` attribute. Returns
 * 0 when it is absent, which is the truth on the dashboard and /login where
 * the in-header button is not floating. Follows the Text size setting
 * because the button is rem-sized. Seeded with
 * `HAMBURGER_ROW_HEIGHT_PX` so the first paint already reads a real number;
 * same shape as a `ResizeObserver` plus a `window` resize listener.
 */
export function useHamburgerRowHeight(): number {
  const [height, setHeight] = useState(HAMBURGER_ROW_HEIGHT_PX);

  useLayoutEffect(() => {
    const button = document.querySelector("[data-floating-menu-button]");

    function measure() {
      setHeight(measureButtonBottom(button));
    }
    measure();
    if (!button) return;

    const observer = new ResizeObserver(measure);
    observer.observe(button);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return height;
}

/**
 * Just the safe-area inset above the floating hamburger: the measured bottom
 * edge minus the row's own rem height at the live root font size (`<html>`'s
 * computed `font-size`, which the Text size setting changes). 0 until the
 * first layout effect and on pages without the floating button. For callers
 * that swap the hamburger row for their own bar (`ScheduleView.tsx`).
 */
export function useHamburgerInsetPx(): number {
  const [inset, setInset] = useState(0);

  useLayoutEffect(() => {
    const button = document.querySelector("[data-floating-menu-button]");

    function measure() {
      if (!button) return setInset(0);
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setInset(Math.max(0, measureButtonBottom(button) - HAMBURGER_ROW_HEIGHT_REM * rootPx));
    }
    measure();
    if (!button) return;

    const observer = new ResizeObserver(measure);
    observer.observe(button);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return inset;
}

/**
 * The empty slot at the right end of the wordmark header row. Two users:
 * `AppChrome.tsx` renders the `<div id=...>`, and `DashboardWidgetList.tsx`
 * portals its Customize button into it (found with
 * `useWordmarkHeaderActionsTarget` below). A named constant, not a string
 * repeated in each file, same contract shape as `SCHEDULE_TITLE_SLOT_ID`.
 */
export const WORDMARK_HEADER_ACTIONS_ID = "wordmark-header-actions";

function subscribeToNothing() {
  return () => {};
}

/**
 * The header slot's DOM node, or null when it is not on the page (/login
 * renders it but nothing portals in) or on the server. A browser-only read,
 * so `useSyncExternalStore` (DESIGN.md), not state set in an effect: the
 * server snapshot is null and the client snapshot reads the DOM, which React
 * re-checks after the first commit and re-renders if the node has appeared
 * (on a client navigation into the page the header and the page can mount in
 * the same commit, so the first read may be null).
 */
export function useWordmarkHeaderActionsTarget(): HTMLElement | null {
  return useSyncExternalStore(
    subscribeToNothing,
    () => document.getElementById(WORDMARK_HEADER_ACTIONS_ID),
    () => null,
  );
}

/** True on the pages that show the Marshee wordmark header: `/` and `/login`. */
export function showsWordmarkHeader(pathname: string): boolean {
  return pathname === "/" || pathname === "/login";
}

/**
 * The icons-only pinned menu's width. Dependents (check each when this
 * changes): `AppChrome.tsx`'s `--app-nav-width` variable, which the fixed
 * bars use as their left edge, and the pinned `<aside>` in `PinnedNav.tsx`.
 * mission-58: rem, so the links (which grow with Text size) never clip.
 */
export const NAV_RAIL_WIDTH = "4.5rem";

/**
 * The icons + names pinned menu's width, the same as the drawer's rows.
 * Dependents (check each when this changes): `AppChrome.tsx`'s
 * `--app-nav-width` variable and the pinned `<aside>` in `PinnedNav.tsx`.
 */
export const NAV_SIDEBAR_WIDTH = "16rem";

/** How wide the pinned menu is at `lg` and up, as a CSS length: 0px when the mode is the menu button. */
export function pinnedNavWidth(mode: NavMode): string {
  if (mode === "rail") return NAV_RAIL_WIDTH;
  if (mode === "sidebar") return NAV_SIDEBAR_WIDTH;
  return "0px";
}
