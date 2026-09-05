"use client";

// Extracted out of useScheduleWindow.ts (mission-15/C6) — Captain's own
// pass-1 ruling on that file (350/350 soft cap) named this exact cluster
// as the next thing to pull out once a contract needed the headroom, and
// the B1 fix (re-arming a sentinel that never leaves IntersectionObserver's
// rootMargin) was that contract. Owns the two Schedule sentinel elements,
// the single IntersectionObserver watching both, and the LATEST
// intersection state each one reported — everything the endless-scroll
// hook needs to decide "should I fetch more," whether that decision comes
// from the browser reporting a fresh transition or from
// useScheduleWindow's own re-arm effect asking "is this sentinel STILL
// sitting inside the margin" after a load settles.
//
// Takes `loadBackward`/`loadForward` (useScheduleWindow's own stable
// `useCallback([])` functions) and `hasMoreRef` (that hook's own ref
// mirror of `state.hasMoreBackward`/`state.hasMoreForward`) as parameters
// rather than reaching for them by name — the same dependency-inversion
// shape `ScheduleFetchers` already uses for the Server Actions
// useScheduleWindow.ts itself is handed, kept consistent here rather than
// having this file import from useScheduleWindow.ts (which would just
// invert the extraction) or duplicate its state.
//
// Verified live in the running app rather than with a renderer-free unit
// test, same reasoning useScheduleWindow.ts's own header gives: a real
// IntersectionObserver re-arming after a real DOM mutation has no meaning
// outside a real browser.

import { useCallback, useEffect, useRef } from "react";

/** The one thing this hook needs to read from useScheduleWindow.ts's own
 * `hasMoreRef` — kept as a plain shape rather than importing that hook's
 * internal type, so this file has no compile-time dependency on
 * useScheduleWindow.ts at all (only the reverse). */
export type ScheduleHasMoreRef = { current: { backward: boolean; forward: boolean } };

export type UseScheduleSentinelsResult = {
  /** Ref callback for the sentinel rendered just before the earliest
   * loaded day. */
  topSentinelRef: (node: HTMLDivElement | null) => void;
  /** Ref callback for the sentinel rendered just after the latest loaded
   * day. */
  bottomSentinelRef: (node: HTMLDivElement | null) => void;
  /**
   * mission-15/C6 (B1) — the LATEST intersection state
   * `IntersectionObserver` reported for the top sentinel, updated on
   * EVERY callback (entering OR leaving), not just the "start loading"
   * moment. `IntersectionObserver` only calls back on a TRANSITION: if a
   * sentinel is already inside `rootMargin` the moment `observe()` runs —
   * a short page at a real 375px viewport, proven live against the
   * household's own data, not hypothetical — it fires once and then goes
   * silent for as long as it never actually leaves and re-enters that
   * margin, even while the reader keeps scrolling toward it. That single
   * callback can also land while the caller's own in-flight guard is
   * already true (an unconditional mount load started first), so it's
   * silently swallowed — and then, because there's no second transition
   * to report, no further load is ever triggered by the observer alone.
   * useScheduleWindow.ts's own re-arm effect reads this ref once a load
   * actually settles, which is what re-arms a sentinel that's been
   * sitting inside the margin the whole time.
   */
  topIntersectingRef: { current: boolean };
  /** The bottom sentinel's own mirror of `topIntersectingRef`. */
  bottomIntersectingRef: { current: boolean };
};

/**
 * Wires up the two Schedule scroll sentinels to one shared
 * `IntersectionObserver`. `loadBackward`/`loadForward` are called with
 * `void` at the call site (never awaited here) — this hook only ever
 * triggers them, never inspects their result, matching how
 * useScheduleWindow.ts's own initial-load effect calls them too.
 *
 * `extend` (mission-15/C8, B3) is useScheduleWindow.ts's own
 * `reopenAfterEmptyStreak` + load pairing — see the wheel/touchmove effect
 * below for when this hook calls it.
 */
export function useScheduleSentinels(
  loadBackward: () => void,
  loadForward: () => void,
  hasMoreRef: ScheduleHasMoreRef,
  extend: (direction: "backward" | "forward") => void,
): UseScheduleSentinelsResult {
  const topSentinel = useRef<HTMLDivElement | null>(null);
  const bottomSentinel = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const topIntersectingRef = useRef(false);
  const bottomIntersectingRef = useRef(false);

  const attachObserver = useCallback(
    (top: HTMLDivElement | null, bottom: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      if (!top && !bottom) return;

      // rootMargin: "100% 0px" — a sentinel starts a fetch a full viewport
      // height BEFORE it's actually on screen, so the next chunk is already
      // loading while the reader is still scrolling toward the edge, not
      // after they hit it.
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.target === top) topIntersectingRef.current = entry.isIntersecting;
            if (entry.target === bottom) bottomIntersectingRef.current = entry.isIntersecting;
            if (!entry.isIntersecting) continue;
            if (entry.target === top && hasMoreRef.current.backward) void loadBackward();
            if (entry.target === bottom && hasMoreRef.current.forward) void loadForward();
          }
        },
        { rootMargin: "100% 0px" },
      );
      if (top) observer.observe(top);
      if (bottom) observer.observe(bottom);
      observerRef.current = observer;
    },
    [loadBackward, loadForward, hasMoreRef],
  );

  const topSentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      topSentinel.current = node;
      attachObserver(topSentinel.current, bottomSentinel.current);
    },
    [attachObserver],
  );
  const bottomSentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      bottomSentinel.current = node;
      attachObserver(topSentinel.current, bottomSentinel.current);
    },
    [attachObserver],
  );

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  // mission-15/C8 (B3) — "let a further SCROLL GESTURE extend it": once a
  // direction has stopped (its own hasMore flag false, having already spent
  // its one small MAX_CONSECUTIVE_EMPTY_CHUNKS batch —
  // scheduleWindowState.ts's own comment), an actual wheel/touch gesture
  // still aimed at that edge buys ONE more chunk via `extend`.
  //
  // DELIBERATELY wheel/touchmove, never a plain `scroll` listener: this
  // view's own manual scroll-anchoring correction (useScrollAnchor.ts)
  // WRITES `scrollTop` directly after every backward load, and writing
  // `scrollTop` dispatches a real "scroll" event indistinguishable from one
  // a human generated — a plain scroll listener would treat the app's OWN
  // correction as "the reader is still trying" and re-open the very
  // direction it had just correctly stopped, forever. `wheel` (trackpad/
  // mouse) and `touchmove` (phone/tablet — this app's PRIMARY input, per
  // DESIGN.md's touch-first rule) are never synthesized by a programmatic
  // `scrollTop` write, so either one can only mean a real person is still
  // trying to go further.
  //
  // mission-15/C10 (Strange's blocker) — this used to gate on
  // `topIntersectingRef`/`bottomIntersectingRef`, which is WRONG:
  // `rootMargin: "100% 0px"` means a sentinel a full viewport away already
  // reads "intersecting", so on the household's real SHORT page (under two
  // viewports tall) BOTH sentinels are permanently intersecting — an
  // ordinary flick ANYWHERE reopened whichever direction happened to be
  // stopped, including the WRONG one, since intersection alone says
  // nothing about which way the reader is actually trying to go. Gated
  // instead on the scroller genuinely being AT that extremity
  // (`document.scrollingElement` — the same scroller useScrollAnchor.ts
  // corrects) AND the gesture's own direction: a downward gesture (wheel's
  // own `deltaY`, or the touch-drag equivalent) can only ever extend
  // forward; an upward one, only backward. `extend` itself, and the
  // `loadBackward`/`loadForward` it triggers, are single-flight guarded
  // already (useScheduleWindow.ts's own in-flight refs), so a burst of
  // wheel events from one gesture spends at most one fetch, not one per
  // event.
  useEffect(() => {
    // A small dead zone, not a bare `<= 0`/`>= scrollHeight`: real
    // sub-pixel rounding in scrollTop/scrollHeight/clientHeight across
    // browsers would otherwise miss a genuine extremity by a fraction of a
    // pixel.
    const EXTREMITY_EPSILON = 4;
    let lastTouchY: number | null = null;

    function atTop(scroller: Element): boolean {
      return scroller.scrollTop <= EXTREMITY_EPSILON;
    }
    function atBottom(scroller: Element): boolean {
      return scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - EXTREMITY_EPSILON;
    }

    function handleWheel(event: WheelEvent) {
      const scroller = document.scrollingElement;
      if (!scroller) return;
      if (event.deltaY < 0 && atTop(scroller) && !hasMoreRef.current.backward) extend("backward");
      if (event.deltaY > 0 && atBottom(scroller) && !hasMoreRef.current.forward) extend("forward");
    }

    function handleTouchStart(event: TouchEvent) {
      lastTouchY = event.touches[0]?.clientY ?? null;
    }

    function handleTouchMove(event: TouchEvent) {
      const scroller = document.scrollingElement;
      const currentY = event.touches[0]?.clientY;
      const previousY = lastTouchY;
      lastTouchY = currentY ?? null;
      if (!scroller || currentY === undefined || previousY === null) return;
      // A finger moving UP drags content up — the same "further forward"
      // intent as a positive wheel deltaY; moving DOWN is the backward
      // equivalent of a negative one.
      const deltaY = previousY - currentY;
      if (deltaY < 0 && atTop(scroller) && !hasMoreRef.current.backward) extend("backward");
      if (deltaY > 0 && atBottom(scroller) && !hasMoreRef.current.forward) extend("forward");
    }

    document.addEventListener("wheel", handleWheel, { passive: true });
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, [extend, hasMoreRef]);

  return { topSentinelRef, bottomSentinelRef, topIntersectingRef, bottomIntersectingRef };
}
