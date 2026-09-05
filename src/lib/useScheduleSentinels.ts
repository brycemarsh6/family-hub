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
 */
export function useScheduleSentinels(
  loadBackward: () => void,
  loadForward: () => void,
  hasMoreRef: ScheduleHasMoreRef,
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

  return { topSentinelRef, bottomSentinelRef, topIntersectingRef, bottomIntersectingRef };
}
