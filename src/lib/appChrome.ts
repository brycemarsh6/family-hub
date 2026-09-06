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
