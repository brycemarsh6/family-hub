"use client";

// The Schedule view's data hook — mission-15 (CV3), contract C3. Owns the
// endless-scroll state machine: which [windowStart, windowEnd) range is
// currently loaded, the merged event+task set inside it, and the two
// booleans that decide whether scrolling further in either direction should
// even try to fetch more.
//
// Split the same way useCalendarNavigation.ts is (see that file's own
// header, and useCalendarNavigation.test.ts's comment on WHY): the parts
// that are pure data transforms — building the initial state, folding one
// fetched chunk into it — are plain exported functions with real
// node:test coverage (useScheduleWindow.test.ts). The hook itself
// (useScheduleWindow, below) wires those to React state, refs, an
// IntersectionObserver, and manual scroll anchoring, and — like
// useCalendarNavigation's own push guard — is verified live in the running
// app rather than with a renderer-free unit test, because what it's
// actually responsible for (a real scrollHeight not jumping, a real
// IntersectionObserver firing once) has no meaning without a real DOM.
//
// A "use client" file is still safely importable by node:test for its pure
// exports — useCalendarNavigation.ts already proves this in this exact
// codebase: importing "react" doesn't require a browser, and none of the
// hooks below are ever CALLED by a plain import, only defined.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  mergeWindow,
  nextBackwardChunk,
  nextForwardChunk,
  scheduleRows,
  type ScheduleChunk,
  type ScheduleEvent,
} from "./scheduleWindow";
import { addDays, startOfDay } from "./mealPlanDates";
import { fetchCalendarEvents } from "@/app/actions/calendar";
import { fetchTasks } from "@/app/actions/tasks";
import type { CalendarEventView, CalendarTaskView } from "./types";

/**
 * The full record behind one merged id — scheduleWindow.ts's own
 * `ScheduleEvent` only carries id/span/allDay (deliberately: it may only
 * import mealPlanDates.ts/calendarDates.ts, and doesn't need to know a
 * title from a due date to do windowing math). Rendering needs the whole
 * CalendarEventView/CalendarTaskView back, so this hook keeps a SECOND map
 * alongside the merged ScheduleEvent one, updated in lockstep — never a
 * union event/task type folded into one shape, matching CalendarTaskView's
 * own "deliberately its own type" reasoning (src/lib/types.ts) for the
 * exact same fields-and-verbs-genuinely-differ argument.
 */
export type ScheduleFullRecord =
  | { kind: "event"; event: CalendarEventView }
  | { kind: "task"; task: CalendarTaskView };

/** Adapts a CalendarEventView into the minimal shape scheduleWindow.ts's
 * merge/grouping functions need. A plain field-by-field pick, not a cast —
 * ScheduleEvent's own doc comment names exactly this shape. */
function eventToScheduleEvent(event: CalendarEventView): ScheduleEvent {
  return { id: event.id, startAt: event.startAt, endAt: event.endAt, allDay: event.allDay };
}

/**
 * Adapts a CalendarTaskView the same way — a task has one due date, never a
 * span, so it's represented as a zero-length all-day entry
 * (`startAt === endAt === dueDate`, `allDay: true`). Traced through
 * calendarDates.ts's own `eventDaySpan` before relying on this: a
 * zero-length ALL-DAY span hits that function's own V2 clamp
 * (`lastDayRaw` computed one day before `firstDay`, then clamped back up to
 * `firstDay`), which is exactly what turns it into a correct single-day
 * span — the same clamp that exists there to keep a malformed CalendarEvent
 * row from vanishing, reused here rather than re-derived, since it already
 * does precisely what a task's degenerate span needs.
 */
function taskToScheduleEvent(task: CalendarTaskView): ScheduleEvent {
  return { id: task.id, startAt: task.dueDate, endAt: task.dueDate, allDay: true };
}

/** Combines one chunk's fetched events+tasks into the two lookup structures
 * every merge (initial load, scroll-triggered load, or a targeted refresh)
 * needs: the minimal ScheduleEvent list mergeWindow expects, and an
 * id -> full-record map so the caller can resolve rendering data back out
 * afterward. Shared by applyChunkResult and the hook's own refreshDay,
 * rather than duplicated between them. */
function toFetchedParts(
  events: CalendarEventView[],
  tasks: CalendarTaskView[],
): { scheduleEvents: ScheduleEvent[]; recordsById: Map<string, ScheduleFullRecord> } {
  const scheduleEvents: ScheduleEvent[] = [
    ...events.map(eventToScheduleEvent),
    ...tasks.map(taskToScheduleEvent),
  ];
  const recordsById = new Map<string, ScheduleFullRecord>();
  for (const event of events) recordsById.set(event.id, { kind: "event", event });
  for (const task of tasks) recordsById.set(task.id, { kind: "task", task });
  return { scheduleEvents, recordsById };
}

/** The hook's whole state: the loaded window, the merged minimal set (for
 * scheduleRows/mergeWindow), the full records behind it (for rendering),
 * and whether either direction is still worth trying to extend. */
export type ScheduleWindowState = {
  windowStart: Date;
  windowEnd: Date;
  entries: Map<string, ScheduleEvent>;
  records: Map<string, ScheduleFullRecord>;
  hasMoreBackward: boolean;
  hasMoreForward: boolean;
};

/**
 * The seed state before anything has ever been fetched: a genuinely EMPTY
 * window pinned at `initialDay`'s own local midnight — `windowStart ===
 * windowEnd`, so the very first backward/forward chunks
 * (`nextBackwardChunk`/`nextForwardChunk`, called by the hook on mount)
 * tile together into exactly `[initialDay - CHUNK_DAYS, initialDay +
 * CHUNK_DAYS)`, with `initialDay` itself landing in the forward half
 * (`nextForwardChunk`'s start is inclusive) — no special-cased "first load"
 * math, the same two chunk functions do the initial load and every load
 * after it.
 */
export function buildInitialScheduleState(initialDay: Date): ScheduleWindowState {
  const day = startOfDay(initialDay);
  return {
    windowStart: day,
    windowEnd: day,
    entries: new Map(),
    records: new Map(),
    hasMoreBackward: true,
    hasMoreForward: true,
  };
}

/**
 * Folds one freshly-fetched chunk into `state`. Pure — no Date.now(), no
 * DOM, nothing but the inputs — so this is where the real bugs would show
 * up and where they're actually tested (useScheduleWindow.test.ts).
 *
 * `[]` back from BOTH fetchCalendarEvents and fetchTasks for this chunk is
 * treated as "nothing more this way, ever" (mission-15/D2's own comment on
 * fetchCalendarEvents): the window boundary is NOT advanced (an
 * unconfirmed range must not start looking loaded — this app's own
 * standing "three states must never be mistakable" rule, applied to
 * Schedule's one state that isn't loading/empty/outside-window: "still
 * scrollable" vs "nothing more here"), and `hasMore<Direction>` flips to
 * `false` so the hook stops trying. This can't tell a genuine empty 30-day
 * stretch apart from a guard refusal (both return `[]`) — deliberately: a
 * refusal must never be retried, and an ambiguous empty signal is safest
 * treated the same way, rather than silently claiming a range is "checked"
 * when it might not have been.
 */
export function applyChunkResult(
  state: ScheduleWindowState,
  direction: "backward" | "forward",
  chunk: ScheduleChunk,
  fetchedEvents: CalendarEventView[],
  fetchedTasks: CalendarTaskView[],
): ScheduleWindowState {
  const { scheduleEvents, recordsById } = toFetchedParts(fetchedEvents, fetchedTasks);
  const nextEntries = mergeWindow(state.entries, chunk.start, chunk.end, scheduleEvents);

  // Rebuilt from nextEntries' own keys, never state.records' — an id that
  // mergeWindow just dropped (a server-side deletion) must not survive here
  // either, or a stale card would keep rendering with nothing left to
  // refresh it.
  const nextRecords = new Map<string, ScheduleFullRecord>();
  for (const id of nextEntries.keys()) {
    const record = recordsById.get(id) ?? state.records.get(id);
    if (record) nextRecords.set(id, record);
  }

  const isEmpty = fetchedEvents.length === 0 && fetchedTasks.length === 0;

  if (direction === "backward") {
    return {
      ...state,
      entries: nextEntries,
      records: nextRecords,
      windowStart: isEmpty ? state.windowStart : chunk.start,
      hasMoreBackward: !isEmpty,
    };
  }

  return {
    ...state,
    entries: nextEntries,
    records: nextRecords,
    windowEnd: isEmpty ? state.windowEnd : chunk.end,
    hasMoreForward: !isEmpty,
  };
}

/**
 * Merges a chunk's result WITHOUT touching the outer window bounds or
 * either `hasMore` flag — the hook's own `refreshDay` uses this, never
 * `applyChunkResult`, because a targeted "did anything change in a range we
 * already trust" refresh must not (a) silently widen how far the list
 * claims to be loaded if `day` happens to fall outside today's actual
 * windowStart/windowEnd, or (b) reopen a direction that had already
 * stopped. Still goes through the exact same `mergeWindow` dedupe-and-drop
 * logic as a real chunk load, so an edit or delete made while the sheet was
 * open is reflected (a deleted row drops, an edited one's fields update)
 * the moment the caller invokes this.
 */
export function applyRefresh(
  state: ScheduleWindowState,
  chunk: ScheduleChunk,
  fetchedEvents: CalendarEventView[],
  fetchedTasks: CalendarTaskView[],
): ScheduleWindowState {
  const { scheduleEvents, recordsById } = toFetchedParts(fetchedEvents, fetchedTasks);
  const entries = mergeWindow(state.entries, chunk.start, chunk.end, scheduleEvents);
  const records = new Map<string, ScheduleFullRecord>();
  for (const id of entries.keys()) {
    const record = recordsById.get(id) ?? state.records.get(id);
    if (record) records.set(id, record);
  }
  return { ...state, entries, records };
}

/** One day, ready to render: the full records behind it, split back into
 * events/tasks (DaySection's own two props) rather than the combined
 * minimal list scheduleRows works with internally. */
export type ScheduleRenderDay = {
  day: Date;
  events: CalendarEventView[];
  tasks: CalendarTaskView[];
};

/** One month's worth of render-ready days — the sticky-month-header
 * grouping ScheduleView renders, mirroring scheduleWindow.ts's own
 * ScheduleMonthGroup but carrying full records instead of ids. */
export type ScheduleRenderMonth = {
  monthStart: Date;
  days: ScheduleRenderDay[];
};

/**
 * Turns `state` into what ScheduleView actually renders: scheduleRows'
 * month/day grouping (including "today always", even when it's empty),
 * with each day's ids resolved back to full records via `state.records`
 * and split into `events`/`tasks` — exactly the two props DaySection
 * already requires. An id `scheduleRows` reports for a day but that has no
 * matching record (shouldn't happen — every id in `state.entries` always
 * has a matching `state.records` entry by `applyChunkResult`'s own
 * construction) is skipped rather than crashing the render.
 */
export function buildScheduleRenderMonths(
  state: ScheduleWindowState,
  today: Date,
): ScheduleRenderMonth[] {
  const groups = scheduleRows(
    Array.from(state.entries.values()),
    state.windowStart,
    state.windowEnd,
    today,
  );

  return groups.map((group) => ({
    monthStart: group.monthStart,
    days: group.days.map((row) => {
      const events: CalendarEventView[] = [];
      const tasks: CalendarTaskView[] = [];
      for (const scheduleEvent of row.events) {
        const record = state.records.get(scheduleEvent.id);
        if (!record) continue;
        if (record.kind === "event") events.push(record.event);
        else tasks.push(record.task);
      }
      return { day: row.day, events, tasks };
    }),
  }));
}

/** A day-scoped refresh window — wide enough to cover any realistic
 * multi-day event or a task's own due date, and cheap: 14 days is far
 * inside MAX_FETCH_SPAN_DAYS (124) regardless of how deep the user has
 * scrolled. */
export function refreshChunkFor(day: Date): ScheduleChunk {
  const start = addDays(startOfDay(day), -7);
  return { start, end: addDays(start, 14) };
}

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
