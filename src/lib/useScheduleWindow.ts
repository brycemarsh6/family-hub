"use client";

// The Schedule view's data hook — mission-15 (CV3), contract C3 (split
// further in C3b, C10). Owns the endless-scroll state machine: which
// [windowStart, windowEnd) range is currently loaded, the merged event+task
// set inside it, and the two booleans that decide whether scrolling further
// in either direction should even try to fetch more.
//
// The pure data transforms live in scheduleWindowState.ts, not here — kept
// separate for its own real node:test coverage, since this file (React
// state/refs/IntersectionObserver/manual scroll anchoring) has no meaning
// outside a real DOM and stays verified live in the running app instead.
// It USED TO import fetchCalendarEvents/fetchTasks directly, which reach
// dal.ts/db.ts's "server-only" and crashed under plain `node:test` (see
// that file's header); C5 also found this was `src/lib/`'s one exception
// to STRUCTURE.md's app/-and-components/-import ban. Fixed by dependency
// inversion: ScheduleView.tsx (a component, which MAY import actions)
// passes its fetchers in as a `ScheduleFetchers` argument, so this hook
// never names a Server Action module itself.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nextBackwardChunk, nextForwardChunk } from "./scheduleWindow";
import { startOfDay } from "./mealPlanDates";
import {
  applyChunkResult,
  applyRefresh,
  buildInitialScheduleState,
  buildScheduleRenderMonths,
  isStoppedByEmptyCap,
  refreshChunkFor,
  reopenAfterEmptyStreak,
  type ScheduleRenderMonth,
  type ScheduleWindowState,
} from "./scheduleWindowState";
import { useScheduleSentinels } from "./useScheduleSentinels";
import { useScrollAnchor } from "./useScrollAnchor";
import type { CalendarEventView, CalendarTaskView } from "./types";

export type { ScheduleFullRecord, ScheduleRenderDay, ScheduleRenderMonth } from "./scheduleWindowState";

/**
 * The two fetch functions the hook needs — shaped to match
 * `fetchCalendarEvents` (actions/calendar.ts) and `fetchTasks`
 * (actions/tasks.ts) exactly, but this file names neither of them: the
 * caller supplies whichever implementations it likes (the real Server
 * Actions in the running app; a fake pair in a future component test),
 * which is the whole point of the inversion above.
 */
export type ScheduleFetchers = {
  /**
   * mission-15/C6 (B3): `null` means the request was REFUSED (a guard
   * failure, an invalid range, or the fetcher's own span cap) and must
   * never be retried; `[]` means it succeeded and genuinely found nothing
   * in that range, which should NOT stop scrolling — see
   * scheduleWindowState.ts's `applyChunkResult` for how the two are told
   * apart.
   */
  fetchEvents: (windowStart: Date, windowEnd: Date) => Promise<CalendarEventView[] | null>;
  fetchTasks: (windowStart: Date, windowEnd: Date) => Promise<CalendarTaskView[] | null>;
};

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
 *
 * `fetchers` (mission-15/C5) is the caller's own `fetchEvents`/`fetchTasks`
 * pair — see `ScheduleFetchers`'s own comment above for why this hook takes
 * them as a parameter rather than importing a Server Action module by
 * name. Read through a ref (`fetchersRef` below), the same pattern
 * `currentWindow`/`hasMoreRef` already use in this file: `loadBackward`/
 * `loadForward`/`refreshDay` all need to stay referentially stable
 * (`useCallback([])`), and ScheduleView.tsx has no obligation to memoize
 * the object it passes in — the underlying `fetchEvents`/`fetchTasks`
 * function references (real Server Action imports) are already stable on
 * their own, so a ref that's simply kept current is enough.
 */
export function useScheduleWindow(
  initialDay: Date,
  today: Date | null,
  fetchers: ScheduleFetchers,
): UseScheduleWindowResult {
  const initialDayTime = startOfDay(initialDay).getTime();
  const [state, setState] = useState<ScheduleWindowState>(() =>
    buildInitialScheduleState(initialDay),
  );
  const [loadingBackward, setLoadingBackward] = useState(false);
  const [loadingForward, setLoadingForward] = useState(false);

  const fetchersRef = useRef(fetchers);
  useEffect(() => {
    fetchersRef.current = fetchers;
  }, [fetchers]);

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

  // mission-15/C10 — mirrored the same way, for `extend` below.
  const emptyStreakRef = useRef({ backward: state.emptyStreakBackward, forward: state.emptyStreakForward });
  useEffect(() => {
    emptyStreakRef.current = { backward: state.emptyStreakBackward, forward: state.emptyStreakForward };
  }, [state.emptyStreakBackward, state.emptyStreakForward]);

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
    // mission-15/C10 — the load effect just below fires in this SAME
    // commit and reads these refs SYNCHRONOUSLY, but their own sync-effects
    // only catch up a render late. Found LIVE tapping Today from six
    // months out: the reload tiled off the OLD stale boundary instead of
    // fresh ones near today, landing a window a day short of today. Reset
    // here too, same as the ref above.
    const fresh = buildInitialScheduleState(initialDay);
    currentWindow.current = { windowStart: fresh.windowStart, windowEnd: fresh.windowEnd };
    hasMoreRef.current = { backward: fresh.hasMoreBackward, forward: fresh.hasMoreForward };
    emptyStreakRef.current = { backward: fresh.emptyStreakBackward, forward: fresh.emptyStreakForward };
    setState(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDayTime]);

  // MANUAL SCROLL ANCHORING, and disabling the BROWSER's own native
  // anchoring — split out to useScrollAnchor.ts in mission-15/C8: partly to
  // make room under this file's own 350-line cap, but mainly because the
  // two are one story — see that file's own header for why Chromium's
  // native anchoring firing ALONGSIDE this manual correction (not merely
  // redundant with it) was the exact B2 bug.
  const { prepareAdjustment } = useScrollAnchor();

  const loadBackward = useCallback(async () => {
    if (backwardInFlight.current) return;
    backwardInFlight.current = true;
    // Captured now, not after the await below: this is specifically the
    // FIRST-ever backward load (racing the initial forward load on mount),
    // which must render top-down naturally rather than being anchored
    // against a "before" height measured while the page was still blank.
    const isInitialLoad = !hasLoadedBackwardOnce.current;
    hasLoadedBackwardOnce.current = true;
    // mission-15/C10 — the skeleton is a DOM-height change too; C8's B2 fix
    // needs the manual correction to be the ONLY corrector, so every
    // height-changing commit below gets its own "before" capture.
    if (!isInitialLoad) prepareAdjustment();
    setLoadingBackward(true);
    try {
      const chunk = nextBackwardChunk(currentWindow.current.windowStart);
      const [events, tasks] = await Promise.all([
        fetchersRef.current.fetchEvents(chunk.start, chunk.end),
        fetchersRef.current.fetchTasks(chunk.start, chunk.end),
      ]);
      if (!isInitialLoad) prepareAdjustment();
      setState((previous) => applyChunkResult(previous, "backward", chunk, events, tasks));
    } finally {
      backwardInFlight.current = false;
      if (!isInitialLoad) prepareAdjustment();
      setLoadingBackward(false);
    }
  }, [prepareAdjustment]);

  const loadForward = useCallback(async () => {
    if (forwardInFlight.current) return;
    forwardInFlight.current = true;
    setLoadingForward(true);
    try {
      const chunk = nextForwardChunk(currentWindow.current.windowEnd);
      const [events, tasks] = await Promise.all([
        fetchersRef.current.fetchEvents(chunk.start, chunk.end),
        fetchersRef.current.fetchTasks(chunk.start, chunk.end),
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

  // mission-15/C8 (B3) — the hook's own half of "let a further scroll
  // gesture extend it": useScheduleSentinels.ts detects the GENUINE
  // gesture (wheel/touchmove — see that file's own comment for why) and
  // calls this. mission-15/C10 (Vision's blocker): this used to call
  // loadBackward/loadForward UNCONDITIONALLY, so a gesture at a direction
  // stopped by a genuine REFUSAL (never safe to retry — D2) kept
  // re-fetching the same refused chunk forever. isStoppedByEmptyCap now
  // gates it — the exact question reopenAfterEmptyStreak answers
  // internally, so only an empty-cap stop reopens and loads.
  const extend = useCallback(
    (direction: "backward" | "forward") => {
      if (!isStoppedByEmptyCap(direction, hasMoreRef.current, emptyStreakRef.current)) return;
      setState((previous) => reopenAfterEmptyStreak(previous, direction));
      if (direction === "backward") void loadBackward();
      else void loadForward();
    },
    [loadBackward, loadForward],
  );

  // mission-15/C6 — the sentinel elements, the shared IntersectionObserver,
  // and each sentinel's latest-known intersection state all live in
  // useScheduleSentinels.ts now (Captain's own extraction ruling, once this
  // file first hit its 350-line soft cap). See that file's header for why a
  // sentinel needs re-arming at all — short version: IntersectionObserver
  // only fires on a TRANSITION, and a sentinel already inside `rootMargin`
  // the moment it's observed (a short page at a real 375px viewport,
  // proven live) can go silent forever even while the reader keeps
  // scrolling toward it.
  const { topSentinelRef, bottomSentinelRef, topIntersectingRef, bottomIntersectingRef } =
    useScheduleSentinels(loadBackward, loadForward, hasMoreRef, extend);

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

  // mission-15/C6 (B1) — re-arms a sentinel still sitting inside
  // `rootMargin` once a load settles, which IntersectionObserver never
  // does on its own. A `useEffect` keyed on window/hasMore STATE, not code
  // in `loadBackward`/`loadForward`'s own `finally`: `finally` runs before
  // React commits the `setState` it just made, so `currentWindow`/
  // `hasMoreRef` (updated by their OWN effects, reacting to that same
  // commit) would still read the PREVIOUS values there — reading
  // `state.hasMore<Direction>` straight from this effect's closure avoids
  // that ordering question entirely.
  //
  // Bounded: each re-invocation is a no-op while the prior one is still in
  // flight (`backwardInFlight`/`forwardInFlight`), and `hasMoreBackward`/
  // `hasMoreForward` eventually flip `false` — a genuine refusal, or
  // `MAX_CONSECUTIVE_EMPTY_CHUNKS` (B3, scheduleWindowState.ts) — which
  // this effect's own guard respects exactly like the observer's does.
  useEffect(() => {
    if (topIntersectingRef.current && state.hasMoreBackward) void loadBackward();
    if (bottomIntersectingRef.current && state.hasMoreForward) void loadForward();
    // topIntersectingRef/bottomIntersectingRef are refs (from
    // useScheduleSentinels) — stable identity, read for their CURRENT
    // value rather than reacted to, same as every other ref in this file.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.windowStart, state.windowEnd, state.hasMoreBackward, state.hasMoreForward, loadBackward, loadForward]);

  const refreshDay = useCallback((day: Date) => {
    const chunk = refreshChunkFor(day);
    void (async () => {
      const [events, tasks] = await Promise.all([
        fetchersRef.current.fetchEvents(chunk.start, chunk.end),
        fetchersRef.current.fetchTasks(chunk.start, chunk.end),
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
