"use client";

// The Schedule view's data hook — mission-15 (CV3), contract C3 (split
// further in C3b). Owns the endless-scroll state machine: which
// [windowStart, windowEnd) range is currently loaded, the merged event+task
// set inside it, and the two booleans that decide whether scrolling further
// in either direction should even try to fetch more.
//
// The pure data transforms — building the initial state, folding one
// fetched chunk into it, turning state into render-ready months — used to
// live directly in this file with their own node:test coverage, the same
// split useCalendarNavigation.ts uses. C3b moved them out to
// scheduleWindowState.ts instead, because this file transitively imports
// fetchCalendarEvents/fetchTasks (src/app/actions/calendar.ts,
// src/app/actions/tasks.ts) -> dal.ts -> db.ts, which carries
// "server-only" — importing THIS file from a plain `node:test` process
// throws before a single assertion runs. See scheduleWindowState.ts's own
// header for the loginRateLimitPolicy.ts/loginRateLimit.ts precedent this
// follows, and scheduleWindowState.test.ts for the coverage that split
// makes possible.
//
// What's left here — the hook itself — wires scheduleWindowState.ts's pure
// functions to React state, refs, an IntersectionObserver, and manual
// scroll anchoring, and — like useCalendarNavigation's own push guard — is
// verified live in the running app rather than with a renderer-free unit
// test, because what it's actually responsible for (a real scrollHeight
// not jumping, a real IntersectionObserver firing once) has no meaning
// without a real DOM.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { nextBackwardChunk, nextForwardChunk } from "./scheduleWindow";
import { startOfDay } from "./mealPlanDates";
import { fetchCalendarEvents } from "@/app/actions/calendar";
import { fetchTasks } from "@/app/actions/tasks";
import {
  applyChunkResult,
  applyRefresh,
  buildInitialScheduleState,
  buildScheduleRenderMonths,
  refreshChunkFor,
  type ScheduleRenderMonth,
  type ScheduleWindowState,
} from "./scheduleWindowState";

export type { ScheduleFullRecord, ScheduleRenderDay, ScheduleRenderMonth } from "./scheduleWindowState";

export type UseScheduleWindowResult = {
  windowStart: Date;
  windowEnd: Date;
  months: ScheduleRenderMonth[];
  hasMoreBackward: boolean;
  hasMoreForward: boolean;
  loadingBackward: boolean;
  loadingForward: boolean;
  /** Ref callback for the sentinel rendered just before the earliest
   * loaded day. */
  topSentinelRef: (node: HTMLDivElement | null) => void;
  /** Ref callback for the sentinel rendered just after the latest loaded
   * day. */
  bottomSentinelRef: (node: HTMLDivElement | null) => void;
  /**
   * Re-fetches a narrow window around `day` and merges the result in —
   * ScheduleView's own answer to "re-merges the seed on identity change (so
   * router.refresh() after an edit flows in)": rather than a passive prop
   * whose identity the caller has to remember to change, this hook exposes
   * the re-merge directly as an action, called with the one day the
   * caller's own detail sheet was just looking at. Narrower and cheaper
   * than re-fetching the whole scrolled-through range (which could exceed
   * MAX_FETCH_SPAN_DAYS after enough scrolling), and — see applyRefresh —
   * it never touches `hasMoreBackward`/`hasMoreForward` or the outer window
   * bounds.
   */
  refreshDay: (day: Date) => void;
};

/**
 * The Schedule view's data hook. `initialDay` seeds where the very first
 * load is centered (see buildInitialScheduleState) — a change to its VALUE
 * (not object identity: a fresh `Date` for the same calendar day must not
 * discard already-scrolled history) restarts the whole window from
 * scratch, the same way navigating Week/Day to a different anchor would.
 *
 * `today`, like every other "what day is it" decision in this app
 * (useToday.ts's own header), is the CALLER's job, not this hook's — passed
 * in rather than read here, so there is exactly one useToday() call site
 * per view (ScheduleView.tsx), the same discipline CalendarViews.tsx
 * already holds for Week/Day/Month. `null` (SSR / first client render)
 * renders the same "haven't resolved yet" placeholder every other view
 * does; see ScheduleView.tsx's own loading branch.
 */
export function useScheduleWindow(
  initialDay: Date,
  today: Date | null,
): UseScheduleWindowResult {
  const initialDayTime = startOfDay(initialDay).getTime();
  const [state, setState] = useState<ScheduleWindowState>(() =>
    buildInitialScheduleState(initialDay),
  );
  const [loadingBackward, setLoadingBackward] = useState(false);
  const [loadingForward, setLoadingForward] = useState(false);

  // `loadBackward`/`loadForward` below read the CURRENT window bounds and
  // hasMore flags through these refs rather than closing over `state`
  // directly, so both callbacks can stay referentially stable
  // (`useCallback([])`) — the IntersectionObserver effect further down never
  // has to tear down and recreate its observer just because the window
  // moved, which would risk missing an intersection that happens
  // mid-teardown.
  const currentWindow = useRef({ windowStart: state.windowStart, windowEnd: state.windowEnd });
  useEffect(() => {
    currentWindow.current = { windowStart: state.windowStart, windowEnd: state.windowEnd };
  }, [state.windowStart, state.windowEnd]);

  const hasMoreRef = useRef({ backward: state.hasMoreBackward, forward: state.hasMoreForward });
  useEffect(() => {
    hasMoreRef.current = { backward: state.hasMoreBackward, forward: state.hasMoreForward };
  }, [state.hasMoreBackward, state.hasMoreForward]);

  // ONE in-flight ref per direction (mission-15/C3's own requirement): a
  // second backward fetch must not start while the first is still running,
  // even if the sentinel reports intersecting twice in quick succession.
  const backwardInFlight = useRef(false);
  const forwardInFlight = useRef(false);

  // Whether BACKWARD has ever completed a load once already — see
  // loadBackward's own comment for why this gates the scroll-anchoring
  // mechanism: the very FIRST backward load (part of establishing the
  // starting view, racing the forward load on mount) has nothing on screen
  // yet worth preserving the position of, and anchoring it would yank the
  // page to a scroll position the reader never asked for before they've
  // even seen anything. Reset alongside the state itself whenever
  // `initialDay` genuinely changes.
  const hasLoadedBackwardOnce = useRef(false);

  // Tracks whether `initialDay` has genuinely changed VALUE since the state
  // above was seeded, so the reset effect below only fires on a real change
  // — not on every render just because the caller passed a structurally
  // equal but referentially new Date.
  const seededInitialDayTime = useRef(initialDayTime);

  useEffect(() => {
    if (seededInitialDayTime.current === initialDayTime) return;
    seededInitialDayTime.current = initialDayTime;
    hasLoadedBackwardOnce.current = false;
    setState(buildInitialScheduleState(initialDay));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDayTime]);

  // MANUAL SCROLL ANCHORING — WebKit has no `overflow-anchor`. Whenever a
  // NON-INITIAL backward merge is about to prepend content above what's
  // already on screen, loadBackward records the page's scrollHeight
  // synchronously (before the state update that will grow the DOM above the
  // fold), and this useLayoutEffect adds the resulting delta to scrollTop
  // BEFORE the browser paints — so the reader's eye never sees the jump.
  //
  // `document.scrollingElement` (never `document.body`/`documentElement`
  // directly) is the standards-defined answer to "which element is the
  // page's real scroller" — Schedule scrolls the page itself, not a boxed
  // sub-container (unlike CV4's TimelineGrid, a different view with its own
  // dedicated overflow-y-auto scroller), matching how the rest of this
  // app's pages scroll.
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

  const loadBackward = useCallback(async () => {
    if (backwardInFlight.current) return;
    backwardInFlight.current = true;
    // Captured now, not after the await below: this is specifically the
    // FIRST-ever backward load (racing the initial forward load on mount),
    // which must render top-down naturally rather than being anchored
    // against a "before" height measured while the page was still blank.
    const isInitialLoad = !hasLoadedBackwardOnce.current;
    hasLoadedBackwardOnce.current = true;
    setLoadingBackward(true);
    try {
      const chunk = nextBackwardChunk(currentWindow.current.windowStart);
      const [events, tasks] = await Promise.all([
        fetchCalendarEvents(chunk.start, chunk.end),
        fetchTasks(chunk.start, chunk.end),
      ]);
      if (!isInitialLoad) {
        const scroller = document.scrollingElement;
        pendingScrollAdjustment.current = scroller ? scroller.scrollHeight : null;
      }
      setState((previous) => applyChunkResult(previous, "backward", chunk, events, tasks));
    } finally {
      backwardInFlight.current = false;
      setLoadingBackward(false);
    }
  }, []);

  const loadForward = useCallback(async () => {
    if (forwardInFlight.current) return;
    forwardInFlight.current = true;
    setLoadingForward(true);
    try {
      const chunk = nextForwardChunk(currentWindow.current.windowEnd);
      const [events, tasks] = await Promise.all([
        fetchCalendarEvents(chunk.start, chunk.end),
        fetchTasks(chunk.start, chunk.end),
      ]);
      // Forward-appended content never needs anchoring — it's added BELOW
      // whatever the reader is currently looking at, so scrollHeight growing
      // past the fold doesn't move anything already on screen.
      setState((previous) => applyChunkResult(previous, "forward", chunk, events, tasks));
    } finally {
      forwardInFlight.current = false;
      setLoadingForward(false);
    }
  }, []);

  const topSentinel = useRef<HTMLDivElement | null>(null);
  const bottomSentinel = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

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
    [loadBackward, loadForward],
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

  // The very first load: both directions, unconditionally, so Schedule
  // never opens on a blank screen waiting for a scroll gesture that hasn't
  // happened yet. Keyed on initialDayTime alone (not on hasMore/in-flight
  // refs, which are refs and can't be effect dependencies anyway) so a
  // genuine initialDay change (the reset effect above) re-runs this too.
  useEffect(() => {
    void loadBackward();
    void loadForward();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDayTime]);

  const refreshDay = useCallback((day: Date) => {
    const chunk = refreshChunkFor(day);
    void (async () => {
      const [events, tasks] = await Promise.all([
        fetchCalendarEvents(chunk.start, chunk.end),
        fetchTasks(chunk.start, chunk.end),
      ]);
      setState((previous) => applyRefresh(previous, chunk, events, tasks));
    })();
  }, []);

  const months = useMemo(
    () => buildScheduleRenderMonths(state, today ?? startOfDay(initialDay)),
    [state, today, initialDay],
  );

  return {
    windowStart: state.windowStart,
    windowEnd: state.windowEnd,
    months,
    hasMoreBackward: state.hasMoreBackward,
    hasMoreForward: state.hasMoreForward,
    loadingBackward,
    loadingForward,
    topSentinelRef,
    bottomSentinelRef,
    refreshDay,
  };
}
