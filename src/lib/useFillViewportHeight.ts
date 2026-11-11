"use client";

// The timeline scroller's height: from its own top edge to the bottom of the
// viewport (moved out of TimelineGrid.tsx in mission-72, word for word, plus
// the observer below). `chromeOffsetPx` seeds the CSS `calc()` used for the
// very first paint (and SSR) — cheap and correct because a `height` isn't a
// pinned `style={{ top }}`; a one-paint-late refinement here reads as the box
// settling, not as content jumping under a fixed point (see mission-16/C1's
// own rider comment for the "fine for scroll-mt, not fine for a pinned top"
// distinction this borrows).
//
// It measures on mount, on window resize, on a `resetKey` change (the view),
// and whenever the calendar body around the scroller changes size (the month
// panel opening or closing above it), through one ResizeObserver.

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

type FillViewportOptions = {
  /** The shortest the scroller may be. */
  minPx: number;
  /** The first-paint seed (see above). */
  chromeOffsetPx: number;
  /** A change re-measures: cheap, and correct if the chrome above renders at
   * a different height for a different view. Not the days: a page turn must
   * not touch the scroller (mission 69). */
  resetKey: unknown;
};

/** Returns the scroller's height as a style string. Call it before any
 * effect that reads the scroller's height in the same commit. */
export function useFillViewportHeight(
  scrollerRef: RefObject<HTMLElement | null>,
  { minPx, chromeOffsetPx, resetKey }: FillViewportOptions,
): string {
  const [measuredHeightPx, setMeasuredHeightPx] = useState<number | null>(null);
  // So an unchanged value never calls setState (no render loop from the observer).
  const lastHeightRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    function measure() {
      const top = scroller!.getBoundingClientRect().top;
      const available = Math.max(window.innerHeight - top, minPx);
      if (lastHeightRef.current !== available) {
        lastHeightRef.current = available;
        setMeasuredHeightPx(available);
      }
      // Applied imperatively, in addition to the React state update above,
      // for a real reason and not a redundant belt-and-suspenders: the
      // scroll-to-now effect runs in the SAME commit, immediately
      // after this one, and reads `scroller.clientHeight` — a React state
      // update doesn't reach the DOM until the NEXT render/commit, which is
      // too late for that read. Mutating `style.height` here directly means
      // the very next `getBoundingClientRect()`/`clientHeight` read in this
      // same synchronous pass already reflects the real measured height,
      // not the previous render's `calc()` first-paint seed. (Caught by
      // measuring, not assumed: without this line, the scroll-to-now target
      // was computed against the calc() fallback's clientHeight — visibly
      // wrong on a real device, where the fallback overshoots the true
      // available height.)
      scroller!.style.height = `${available}px`;
    }
    measure();
    window.addEventListener("resize", measure);
    // The calendar body above or around the scroller changing size (the
    // month panel opening) moves the scroller's top edge without any window
    // resize. C3 puts `data-calendar-body` on the box holding panel and view.
    const body = scroller.closest("[data-calendar-body]") ?? scroller.parentElement;
    let observer: ResizeObserver | null = null;
    if (body && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measure);
      observer.observe(body);
    }
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return measuredHeightPx !== null
    ? `${measuredHeightPx}px`
    : `calc(100dvh - ${chromeOffsetPx}px)`;
}
