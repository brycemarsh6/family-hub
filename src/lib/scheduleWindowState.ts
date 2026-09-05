// The Schedule view's pure state transforms — split out of
// useScheduleWindow.ts (mission-15/C3b) the same way loginRateLimitPolicy.ts
// was split out of loginRateLimit.ts: that hook transitively imports
// fetchCalendarEvents/fetchTasks (src/app/actions/calendar.ts,
// src/app/actions/tasks.ts), which import dal.ts -> db.ts, which carries
// "server-only" and throws the moment plain `node:test` imports it. C3
// wrote real tests for the functions below, found the import graph made
// that impossible from useScheduleWindow.ts itself, and removed the test
// file rather than ship it dishonestly scoped — this file, and
// scheduleWindowState.test.ts, are what that flag asked for.
//
// Zero imports of anything DB-touching or "server-only". This file may only
// import from ./scheduleWindow, ./mealPlanDates, ./calendarDates, and
// ./types (types.ts is plain shapes, no imports of its own — see its own
// header) — never a Server Action, never db.ts. That's what lets
// scheduleWindowState.test.ts run under a bare `node --import tsx --test`
// process with no PrismaClient anywhere in its import graph, the same
// guarantee loginRateLimitPolicy.test.ts gives loginRateLimit.ts's tests.
//
// useScheduleWindow.ts (the hook) imports everything below and wires it to
// React state, refs, an IntersectionObserver, and manual scroll anchoring —
// none of which has a meaning outside a real DOM, so that half stays
// verified live in the running app rather than here.

import {
  mergeWindow,
  scheduleRows,
  type ScheduleChunk,
  type ScheduleEvent,
} from "./scheduleWindow";
import { addDays, startOfDay } from "./mealPlanDates";
import type { CalendarEventView, CalendarTaskView } from "./types";

/**
 * The full record behind one merged id — scheduleWindow.ts's own
 * `ScheduleEvent` only carries id/span/allDay (deliberately: it may only
 * import mealPlanDates.ts/calendarDates.ts, and doesn't need to know a
 * title from a due date to do windowing math). Rendering needs the whole
 * CalendarEventView/CalendarTaskView back, so useScheduleWindow.ts keeps a
 * SECOND map alongside the merged ScheduleEvent one, updated in lockstep —
 * never a union event/task type folded into one shape, matching
 * CalendarTaskView's own "deliberately its own type" reasoning
 * (src/lib/types.ts) for the exact same fields-and-verbs-genuinely-differ
 * argument.
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
 * afterward. Shared by applyChunkResult and applyRefresh, rather than
 * duplicated between them. */
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
 * up and where they're actually tested (scheduleWindowState.test.ts).
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
