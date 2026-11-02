"use client";

import { useLayoutEffect, useState } from "react";
import type { NavMode } from "./navMode";

/**
 * mission-23 — the height of the row the floating hamburger button sits in
 * on every page except the dashboard and /login: an 8px gap ABOVE the
 * button (its top offset) plus the 48px button, so the button's bottom edge
 * is exactly where `<main>` content starts. Deliberately EXCLUDES
 * `env(safe-area-inset-top)`, a device fact this constant cannot know;
 * `useHamburgerRowHeight` below measures with the inset included.
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
 * letters, and `calendar/loading.tsx`'s skeleton.
 */
export const HAMBURGER_ROW_HEIGHT_PX = 56;

/**
 * Measures the real bottom edge of the floating hamburger button (inset
 * included), picked out by its `data-floating-menu-button` attribute. Returns
 * 0 when it is absent, which is the truth on the dashboard and /login where
 * the in-header button is not floating. Seeded with
 * `HAMBURGER_ROW_HEIGHT_PX` so the first paint already reads a real number;
 * same shape as a `ResizeObserver` plus a `window` resize listener.
 */
export function useHamburgerRowHeight(): number {
  const [height, setHeight] = useState(HAMBURGER_ROW_HEIGHT_PX);

  useLayoutEffect(() => {
    const button = document.querySelector("[data-floating-menu-button]");

    function measure() {
      setHeight(button ? button.getBoundingClientRect().bottom : 0);
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

/** True on the pages that show the Marshee wordmark header: `/` and `/login`. */
export function showsWordmarkHeader(pathname: string): boolean {
  return pathname === "/" || pathname === "/login";
}

/**
 * The icons-only pinned menu's width. Dependents (check each when this
 * changes): `AppChrome.tsx`'s `--app-nav-width` variable, which the fixed
 * bars use as their left edge, and the pinned `<aside>` in `PinnedNav.tsx`.
 */
export const NAV_RAIL_WIDTH_PX = 72;

/**
 * The icons + names pinned menu's width, the same as the drawer's rows.
 * Dependents (check each when this changes): `AppChrome.tsx`'s
 * `--app-nav-width` variable and the pinned `<aside>` in `PinnedNav.tsx`.
 */
export const NAV_SIDEBAR_WIDTH_PX = 256;

/** How wide the pinned menu is at `lg` and up: 0 when the mode is the menu button. */
export function pinnedNavWidthPx(mode: NavMode): number {
  if (mode === "rail") return NAV_RAIL_WIDTH_PX;
  if (mode === "sidebar") return NAV_SIDEBAR_WIDTH_PX;
  return 0;
}
