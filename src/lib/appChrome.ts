"use client";

import { useLayoutEffect, useState } from "react";

/**
 * mission-17/C1 — the app's one global header
 * (`src/app/(app)/layout.tsx`'s `<header>`) real rendered height, measured
 * directly against the running app
 * (`document.querySelector("header").getBoundingClientRect().height`), not
 * assumed: 73px (`py-3` + the `min-h-12` content row + the 1px `border-b`).
 *
 * This is a fact about `(app)/layout.tsx`, not about any one thing that
 * positions against it — moved here from `CalendarHeader.tsx`
 * (mission-16/C4, where it was first measured) once a SECOND consumer
 * needed the identical number: `RecipeList.tsx` (a Kitchen-branch file)
 * already declined to import a calendar component for this value and
 * re-derived it itself with its own `ResizeObserver`. STRUCTURE.md's rule
 * (Bryce-approved 2026-09-05) is exactly this shape — "a measured
 * dimension of app chrome that two or more surfaces position against has
 * one home in `src/lib/`" — because the alternative already went wrong
 * once: the header drifted from a guessed 64px to a measured 73px in one
 * file while a second file one directory away silently kept saying 64.
 * `(app)/layout.tsx`'s own `<header>` carries a comment naming every
 * dependent, so a future header edit has a list to check instead of a
 * silent re-break.
 *
 * Two different ways this value gets used across the app, and the
 * difference is why both a constant AND a hook are exported below rather
 * than just one:
 *   - As the SEED for `useAppHeaderHeight`, painted on the very first
 *     frame before any measurement can land. This is the one that
 *     matters for a pinned `style={{ top: ... }}` (CalendarHeader's own
 *     Schedule bar) or a scroll-reveal boundary computed from it
 *     (ScheduleView's month-title observer) — get the first frame wrong
 *     there and the bar visibly jumps, or the wrong month's name shows
 *     for one paint. Seeding the hook's state with this constant, rather
 *     than `null`, is what removes that failure mode entirely: the first
 *     render already reads the real number.
 *   - Used directly, wherever a one-frame-off answer is genuinely
 *     harmless — a `scroll-mt-*`-style offset only matters once a reader
 *     actually scrolls, well after mount, so CalendarHeader's own pinned
 *     `top` and ScheduleView's `scrollMarginTop` read the constant
 *     straight rather than paying for a hook neither one needs.
 */
export const APP_HEADER_HEIGHT_PX = 73;

/**
 * Measures the app's real header height at runtime rather than trusting
 * `APP_HEADER_HEIGHT_PX` to stay correct forever — a `ResizeObserver` on
 * the one `<header>` element in the app
 * (`document.querySelector("header")` is safe for exactly that reason)
 * re-measures on anything that changes its height (a font-load reflow, a
 * future header redesign) and a `window` resize listener catches layout
 * changes the observer's own target doesn't directly report.
 *
 * Seeded with `APP_HEADER_HEIGHT_PX`, not `null` — see that constant's own
 * comment for why "first-paint seed" matters here: a consumer that reads
 * this hook never needs its own `?? fallback` for the instant before
 * `useLayoutEffect` runs, because that instant already reads the real
 * measured value rather than a placeholder.
 */
export function useAppHeaderHeight(): number {
  const [height, setHeight] = useState(APP_HEADER_HEIGHT_PX);

  useLayoutEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;

    function measure() {
      setHeight(header!.getBoundingClientRect().height);
    }
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(header);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return height;
}

/**
 * mission-17/C5 — the app's one global bottom tab bar (`HubNav.tsx`'s
 * `<nav aria-label="Sections">`) real rendered height, following the exact
 * precedent `APP_HEADER_HEIGHT_PX` above already set. Measured directly
 * against the running app: HubNav.tsx's own `min-h-16` (64px) row PLUS its
 * own `border-t` (1px) = 65px.
 *
 * This number had TWO independent hardcoded copies before this constant
 * existed, and Captain found they disagreed: ScheduleView.tsx's
 * IntersectionObserver margin used `-65px` (right, by coincidence) while
 * TimelineGrid.tsx's own scroller-height fallback used `64` (matching only
 * the inner row, missing the border) — the exact failure this file's own
 * header already describes for the app header, one component lower. Both
 * now read this constant instead of carrying their own guess.
 *
 * Deliberately EXCLUDES `env(safe-area-inset-bottom)` — the extra padding
 * `HubBottomNav` (HubNav.tsx) adds below its own content to clear an
 * iPhone's home indicator. That inset is a DEVICE fact this constant cannot
 * know ahead of time (0 on most devices, roughly 34px on an iPhone with no
 * home button), which is exactly why `useBottomNavHeight` below — a real
 * runtime measurement of the rendered element, insets included — is the
 * correct primary answer wherever one is available; this constant is only
 * the first-paint SEED for the instant before that measurement lands, the
 * same relationship `APP_HEADER_HEIGHT_PX` has to `useAppHeaderHeight`.
 */
export const BOTTOM_NAV_HEIGHT_PX = 65;

/**
 * Measures the app's real bottom-nav height at runtime, insets and all —
 * see `BOTTOM_NAV_HEIGHT_PX`'s own comment for why a runtime measurement is
 * the correct primary answer here (the safe-area inset varies by device and
 * can't be baked into a constant). Same shape as `useAppHeaderHeight` just
 * above: seeded with the constant rather than `null`, a `ResizeObserver` on
 * the one `<nav>` element in the app, plus a `window` resize listener.
 * `aria-label` selector, not a class, because HubNav.tsx's own
 * `aria-label="Sections"` is already the one stable, accessibility-driven
 * hook on that element — see that file's own dependents comment.
 *
 * Not currently called by TimelineGrid.tsx, which keeps its own inline
 * `document.querySelector` for a real reason (see that component's own
 * sizing-effect comment): it needs the measured value applied
 * IMPERATIVELY, in the same synchronous pass a sibling effect reads
 * `scroller.clientHeight` in, and a hook's React-state return value doesn't
 * reach that same pass — only `BOTTOM_NAV_HEIGHT_PX`, the constant, is
 * shared between the two call sites. This hook exists for a future
 * consumer that only needs the number itself, the same relationship
 * `useAppHeaderHeight` already has to `APP_HEADER_HEIGHT_PX`.
 */
export function useBottomNavHeight(): number {
  const [height, setHeight] = useState(BOTTOM_NAV_HEIGHT_PX);

  useLayoutEffect(() => {
    const nav = document.querySelector('nav[aria-label="Sections"]');
    if (!nav) return;

    function measure() {
      setHeight(nav!.getBoundingClientRect().height);
    }
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return height;
}
