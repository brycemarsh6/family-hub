"use client";

// The Schedule view's SCROLL ANCHORING — extracted out of
// useScheduleWindow.ts in mission-15/C8, both to keep that file under its
// 350-line soft cap and because this is genuinely one self-contained
// story: the manual correction below, and turning the BROWSER's own
// native anchoring off for as long as Schedule is mounted, have to travel
// together — see `useScrollAnchor`'s own comment for why leaving native
// anchoring on breaks the manual correction rather than merely being
// redundant with it.
//
// Nothing here is specific to backward/forward or chunks — this hook knows
// nothing about scheduleWindow.ts at all. useScheduleWindow.ts calls
// `prepareAdjustment()` exactly once, synchronously, right before a state
// update that will grow the DOM above the reader's current scroll position
// (a non-initial backward prepend); everything else is this file's own
// business.

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

export type ScrollAnchor = {
  /**
   * Call SYNCHRONOUSLY, immediately before the state update that will
   * prepend content above what's currently on screen — records the page's
   * CURRENT scrollHeight so the layout effect below can correct for
   * however much taller the page just got, before the browser paints the
   * new content. `document.scrollingElement` (never `document.body`/
   * `documentElement` directly) is the standards-defined answer to "which
   * element is the page's real scroller" — Schedule scrolls the page
   * itself, not a boxed sub-container (unlike CV4's TimelineGrid, a
   * different view with its own dedicated overflow-y-auto scroller).
   */
  prepareAdjustment: () => void;
};

/**
 * mission-15/C8 (B2) — the fix, and the bug Strange's gate found live in
 * production. The comment that used to sit next to the manual correction
 * below said "WebKit has no `overflow-anchor`" — true, and still the
 * reason the manual mechanism has to exist for Safari — but the
 * conclusion it left unstated was wrong. CHROMIUM'S OWN scroll anchoring
 * is ON by default (`overflow-anchor: auto`), and it does not know or
 * care that this file's manual correction already does its exact job — it
 * fires independently, on top of the manual one. Measured on a
 * PRODUCTION build in Chromium, 3-for-3 real prepends: the net
 * `scrollTop` delta landed at exactly 2x the height change every time,
 * not the height change itself — Chromium's own anchor was silently
 * applying the identical correction a second time. (iOS Safari never
 * showed this, having no native anchoring to conflict with in the first
 * place — which is exactly why testing on a phone alone would have missed
 * it.)
 *
 * The fix is to make the manual mechanism the ONLY one running: disable
 * native anchoring on Schedule's own scrolling element for as long as
 * this hook (and therefore Schedule) is mounted, restoring whatever value
 * was there before on unmount. Scoped here, on the one element, rather
 * than in globals.css — this app's one global stylesheet, shared by
 * every other page, none of which has a manual correction of their own to
 * fall back on if their native anchoring were switched off too.
 */
export function useScrollAnchor(): ScrollAnchor {
  useEffect(() => {
    const scroller = document.scrollingElement as HTMLElement | null;
    if (!scroller) return;
    const previousValue = scroller.style.overflowAnchor;
    scroller.style.overflowAnchor = "none";
    return () => {
      scroller.style.overflowAnchor = previousValue;
    };
  }, []);

  // MANUAL SCROLL ANCHORING — WebKit has no `overflow-anchor` at all, so
  // this half has to exist regardless of the Chromium fix above. Whenever
  // `prepareAdjustment` has been called, this useLayoutEffect adds the
  // resulting scrollHeight delta to scrollTop BEFORE the browser paints —
  // so the reader's eye never sees the jump.
  const pendingScrollAdjustment = useRef<number | null>(null);

  useLayoutEffect(() => {
    const previousHeight = pendingScrollAdjustment.current;
    if (previousHeight === null) return;
    pendingScrollAdjustment.current = null;
    const scroller = document.scrollingElement;
    if (!scroller) return;
    const delta = scroller.scrollHeight - previousHeight;
    if (delta !== 0) scroller.scrollTop += delta;
  });

  const prepareAdjustment = useCallback(() => {
    const scroller = document.scrollingElement;
    pendingScrollAdjustment.current = scroller ? scroller.scrollHeight : null;
  }, []);

  return { prepareAdjustment };
}
