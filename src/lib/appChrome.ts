"use client";

import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import type { NavMode } from "./navMode";

/** The row in rem: the single number the string and the pixel seed derive from. */
const HAMBURGER_ROW_HEIGHT_REM = 3.5;

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
 * the live root font size (`useHamburgerInsetPx().rootPx`) or measure.
 *
 * STRUCTURE.md's chrome-dimension rule: this number has one home, here.
 * Never call `useHamburgerRowHeight` from a component that lives in the
 * layout and survives navigation (it reads once on mount and could hold a
 * stale 0); page-level components only.
 *
 * Dependents (check each when this changes): `AppChrome.tsx`'s `<main>` top
 * padding, `CalendarHeader.tsx`'s lift onto this row and pinned Schedule
 * bar, `ScheduleView.tsx`'s chrome offset (scroll target, day-row margins,
 * month-title boundary), `TimelineGrid.tsx`'s
 * scroller seed (via `CalendarViews.tsx`), `RecipeList.tsx`'s sticky
 * letters, `calendar/loading.tsx`'s skeleton, `FeedbackList.tsx`'s sticky
 * panel, and `MealPlanList.tsx`'s `scrollMarginTop`.
 */
export const HAMBURGER_ROW_HEIGHT = `${HAMBURGER_ROW_HEIGHT_REM}rem`;

/**
 * The row at the default 16px root font size: only the first-paint seed of
 * `useHamburgerRowHeight`, which has no document to read on the server. The
 * hook replaces it with a real measurement before the first paint.
 */
const HAMBURGER_ROW_HEIGHT_PX = HAMBURGER_ROW_HEIGHT_REM * 16;

/** Measures the floating hamburger's bottom edge, or 0 when it is absent. */
function measureButtonBottom(button: Element | null): number {
  return button ? button.getBoundingClientRect().bottom : 0;
}

/**
 * The one measuring setup both hooks below share: finds the floating
 * hamburger, runs `read` with its bottom edge and the live root font size
 * (`<html>`'s computed `font-size`, which the Text size setting changes),
 * and re-runs on resize of the button or the window. `read` must be stable
 * (a module-level function).
 */
function useFloatingButtonMeasure<T>(seed: T, read: (bottom: number, rootPx: number, hasButton: boolean) => T): T {
  const [value, setValue] = useState(seed);

  useLayoutEffect(() => {
    const button = document.querySelector("[data-floating-menu-button]");

    function measure() {
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setValue(read(measureButtonBottom(button), rootPx, button !== null));
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
  }, [read]);

  return value;
}

function readRowHeight(bottom: number): number {
  return bottom;
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
  return useFloatingButtonMeasure(HAMBURGER_ROW_HEIGHT_PX, readRowHeight);
}

function readInsetAndRoot(bottom: number, rootPx: number, hasButton: boolean): { insetPx: number; rootPx: number } {
  if (!hasButton) return { insetPx: 0, rootPx };
  return { insetPx: Math.max(0, bottom - HAMBURGER_ROW_HEIGHT_REM * rootPx), rootPx };
}

const INSET_SEED = { insetPx: 0, rootPx: 16 };

/**
 * Two numbers for callers that swap the hamburger row for their own bar
 * (`ScheduleView.tsx`): `insetPx`, the safe-area inset above the floating
 * hamburger (its measured bottom edge minus the row's own rem height at the
 * live root font size), and `rootPx`, that live root font size, for turning
 * a rem height into pixels. Inset is 0 until the first layout effect and on
 * pages without the floating button; `rootPx` starts at 16.
 */
export function useHamburgerInsetPx(): { insetPx: number; rootPx: number } {
  return useFloatingButtonMeasure(INSET_SEED, readInsetAndRoot);
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
 * mission-58: px on purpose. The pinned menu stays Normal size at every Text
 * size (follow-up, Bryce 2026-11-09), so `--app-nav-width` and the aside agree.
 */
export const NAV_RAIL_WIDTH = "72px";

/**
 * The icons + names pinned menu's width, the same as the drawer's rows.
 * Dependents (check each when this changes): `AppChrome.tsx`'s
 * `--app-nav-width` variable and the pinned `<aside>` in `PinnedNav.tsx`.
 */
export const NAV_SIDEBAR_WIDTH = "256px";

/** How wide the pinned menu is at `lg` and up, as a CSS length: 0px when the mode is the menu button. */
export function pinnedNavWidth(mode: NavMode): string {
  if (mode === "rail") return NAV_RAIL_WIDTH;
  if (mode === "sidebar") return NAV_SIDEBAR_WIDTH;
  return "0px";
}
