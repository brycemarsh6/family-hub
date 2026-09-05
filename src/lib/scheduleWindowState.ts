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
import { allDayInstantToLocalDay } from "./calendarDates";
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
 * Adapts a CalendarTaskView — mission-15/C5's own fix for a real vanish bug
 * live in production, so read this before touching it again.
 *
 * The OLD version represented a task as a zero-length all-day entry
 * (`startAt === endAt === task.dueDate`). `task.dueDate` is stored at UTC
 * MIDNIGHT of its intended calendar day (Task.dueDate's own schema
 * comment, always written through `localDayToAllDayInstant`) — a
 * DIFFERENT convention than the half-open BROWSER-LOCAL-midnight
 * `[windowStart, windowEnd)` bounds `mergeWindow`'s `overlapsWindow`
 * compares a `ScheduleEvent`'s raw instants against. For any timezone AT
 * OR WEST of UTC (this household's real zone, America/Denver, and every
 * other US timezone), a calendar day's UTC-midnight instant is an EARLIER
 * absolute instant than that SAME day's local midnight — so a task due
 * exactly on `windowEnd`'s own calendar day could still read as
 * "overlaps this window" to a raw instant comparison, even though
 * `fetchTasks` (actions/tasks.ts's own comment) correctly excludes it,
 * because THAT query re-expresses the window bounds in `dueDate`'s own
 * UTC-midnight terms before comparing. `mergeWindow` then reads "used to
 * overlap this window, but didn't come back in the fetch" as a
 * server-side deletion, and drops a task that's still very real —
 * confirmed live: completing or editing a nearby task/event triggers
 * `refreshDay`'s own 14-day window (`refreshChunkFor`), and a task due
 * right at that window's edge silently vanishes from the list.
 *
 * The fix: re-express the task's span in the SAME units `windowStart`/
 * `windowEnd` are already in. `allDayInstantToLocalDay` (calendarDates.ts)
 * recovers the calendar day `dueDate` names — the exact inverse of
 * `localDayToAllDayInstant`, the function that wrote it — and
 * `[localDay, localDay + 1 day)` expresses that day as a genuine
 * BROWSER-LOCAL half-open range, exactly the units `windowStart`/
 * `windowEnd` are built in (this module's own D3 rule). Worked through
 * algebraically (and pinned in scheduleWindowState.test.ts across
 * America/Denver, America/Los_Angeles, UTC, and Asia/Tokyo): a task's
 * `overlapsWindow(windowStart, windowEnd)` now holds if and only if
 * `fetchTasks(windowStart, windowEnd)` would actually return it, in ANY
 * timezone — not just "less likely to disagree," but structurally unable
 * to, since both sides now reduce to the exact same half-open local-day
 * comparison.
 *
 * The one accepted tradeoff, not a NEW gap this fix introduces: `scheduleRows`
 * (scheduleWindow.ts) feeds this exact span through the shared
 * `daysEventCovers`/`eventDaySpan` (calendarDates.ts) to decide which day
 * to RENDER the task under, and that shared code re-applies
 * `allDayInstantToLocalDay` — a no-op for any zone AT OR WEST of UTC
 * (the shift never crosses a day boundary in that direction, so the
 * render day is unchanged from before this fix), but one calendar day
 * early for a zone STRICTLY EAST of UTC (e.g. Tokyo). That's the same
 * "not a claim of correctness for every timezone on Earth" limitation
 * `fetchTasks`'s own comment already accepts, for the identical reason —
 * fixing it would mean changing calendarDates.ts's shared, DB-storage-
 * convention-aware decoder, outside this fix's own boundary.
 */
function taskToScheduleEvent(task: CalendarTaskView): ScheduleEvent {
  const localDay = allDayInstantToLocalDay(task.dueDate);
  return { id: task.id, startAt: localDay, endAt: addDays(localDay, 1), allDay: true };
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
 * whether either direction is still worth trying to extend, and — since
 * mission-15/C6 (B3) — how many CONSECUTIVE chunks in a row have come back
 * genuinely empty in each direction (see applyChunkResult's own header for
 * why this exists: a quiet-but-real stretch must not be confused with "no
 * more data", but it must still eventually stop). Reset to 0 the moment a
 * chunk in that direction comes back with anything real. */
export type ScheduleWindowState = {
  windowStart: Date;
  windowEnd: Date;
  entries: Map<string, ScheduleEvent>;
  records: Map<string, ScheduleFullRecord>;
  hasMoreBackward: boolean;
  hasMoreForward: boolean;
  emptyStreakBackward: number;
  emptyStreakForward: number;
};

/**
 * How many CONSECUTIVE genuinely-empty chunks (mission-15/C6's `[]`, never
 * a `null` refusal) a single scroll direction auto-loads, UNPROMPTED,
 * before pausing and showing "that's as far as this loads" — NOT a hard
 * ceiling; see `reopenAfterEmptyStreak` below for how a reader can still
 * get past it.
 *
 * mission-15/C8 (B3): this used to be 24, on the strength of a claim this
 * comment made that turned out to be false the moment there was real data
 * to check it against — "24 × CHUNK_DAYS (30) is roughly two years... far
 * past what any realistic gap in this household's data should ever
 * reach... not a limit anyone should expect to hit in practice." This
 * household's real calendar IS the sparse case that dismissed: measured on
 * a production build against the real 4-event household data, 24 meant
 * ~720 days scanned in BOTH directions on every single open, unprompted —
 * 100 POST requests and ~11 seconds of loading skeletons, to show 4 rows.
 *
 * 3 is small enough to settle in a couple of round trips even on a
 * calendar this quiet (90 days scanned, not 720), and large enough that an
 * ordinary quiet season — a slow month or two with nothing on it — is
 * never even noticed. Hitting this cap is no longer the direction's END:
 * `reopenAfterEmptyStreak` is what a further, GENUINE scroll gesture
 * (useScheduleSentinels.ts's own wheel/touchmove listener — never an
 * automatic re-arm) spends to buy one more chunk, so a real gap wider than
 * 90 days is still reachable by continuing to scroll for it, rather than
 * being scanned for free the moment the view opens. Bryce's own ruling is
 * unchanged by any of this: a quiet month must never PERMANENTLY end the
 * list.
 */
export const MAX_CONSECUTIVE_EMPTY_CHUNKS = 3;

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
    emptyStreakBackward: 0,
    emptyStreakForward: 0,
  };
}

/**
 * Folds one freshly-fetched chunk into `state`. Pure — no Date.now(), no
 * DOM, nothing but the inputs — so this is where the real bugs would show
 * up and where they're actually tested (scheduleWindowState.test.ts).
 *
 * **mission-15/C6 (B3) amends this function's original contract**, which
 * treated `[]` from BOTH fetchCalendarEvents and fetchTasks as "nothing
 * more this way, ever" and never advanced the window boundary. Verified
 * live against the real household data, that was a genuine bug: a single
 * quiet 30-day chunk (say, a calm October between today and a real
 * Thanksgiving event in November) permanently walled off everything past
 * it — nine real items became unreachable by scrolling, in exactly the
 * "endless scroll" feature this view exists to be. The two calls this
 * function receives (fetchCalendarEvents, fetchTasks — see their own
 * headers) were changed alongside this to make the distinction
 * expressible in the first place:
 *
 * - **`null`** (from either fetch) means the request was REFUSED — a guard
 *   failure, an invalid range, or the `MAX_FETCH_SPAN_DAYS` cap. A refusal
 *   must never be retried, so this stops that direction immediately: the
 *   window boundary does NOT advance (an unconfirmed range must not start
 *   looking loaded), `hasMore<Direction>` flips to `false` for good, and
 *   (mission-15/C12) `emptyStreak<Direction>` resets to 0. That reset
 *   matters for a refusal reached BY REOPENING an already-empty-cap-stopped
 *   direction: `reopenAfterEmptyStreak` deliberately leaves the streak AT
 *   the cap when it reopens (see its own header), so without this reset a
 *   refused reopen would land right back at `!hasMore && streak >= cap` —
 *   indistinguishable from a genuine empty-cap stop to `isStoppedByEmptyCap`
 *   — and the same refused chunk would re-fetch on every further gesture,
 *   forever. Resetting to 0 here means a refusal always reads
 *   `streak 0 < cap`, so it can never be mistaken for reopenable again.
 * - **`[]`** (from both) means the request SUCCEEDED and genuinely found
 *   nothing in that exact range. The window boundary DOES advance — a
 *   quiet stretch is still confirmed, checked territory, not an unknown —
 *   and scrolling keeps going. `emptyStreak<Direction>` counts these in a
 *   row (reset to 0 the moment a chunk isn't fully empty) so a direction
 *   that runs out of real data forever still terminates eventually, via
 *   `MAX_CONSECUTIVE_EMPTY_CHUNKS`, rather than fetching empty pages
 *   without end.
 *
 * A MIX — one fetch refused, the other didn't — is still treated as a
 * refusal for this chunk as a whole: `fetchCalendarEvents`/`fetchTasks`
 * share the exact same guard order and `MAX_FETCH_SPAN_DAYS` value, so in
 * practice either both refuse the same chunk or neither does, and treating
 * "we don't have a trustworthy answer for BOTH halves of this chunk" as
 * "don't trust this chunk" is the safer read of an inputs shape that
 * shouldn't occur.
 */
export function applyChunkResult(
  state: ScheduleWindowState,
  direction: "backward" | "forward",
  chunk: ScheduleChunk,
  fetchedEvents: CalendarEventView[] | null,
  fetchedTasks: CalendarTaskView[] | null,
): ScheduleWindowState {
  if (fetchedEvents === null || fetchedTasks === null) {
    return direction === "backward"
      ? { ...state, hasMoreBackward: false, emptyStreakBackward: 0 }
      : { ...state, hasMoreForward: false, emptyStreakForward: 0 };
  }

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
    const emptyStreakBackward = isEmpty ? state.emptyStreakBackward + 1 : 0;
    return {
      ...state,
      entries: nextEntries,
      records: nextRecords,
      windowStart: chunk.start,
      emptyStreakBackward,
      hasMoreBackward: emptyStreakBackward < MAX_CONSECUTIVE_EMPTY_CHUNKS,
    };
  }

  const emptyStreakForward = isEmpty ? state.emptyStreakForward + 1 : 0;
  return {
    ...state,
    entries: nextEntries,
    records: nextRecords,
    windowEnd: chunk.end,
    emptyStreakForward,
    hasMoreForward: emptyStreakForward < MAX_CONSECUTIVE_EMPTY_CHUNKS,
  };
}

/**
 * mission-15/C10 (Vision's blocker) — the exact question `reopenAfterEmptyStreak`
 * below already answers internally for ONE direction, pulled out and
 * exported so useScheduleWindow.ts's own `extend` can ask it too, BEFORE
 * calling `loadBackward`/`loadForward` at all. `extend` used to call those
 * unconditionally right after `reopenAfterEmptyStreak` (a pure no-op on
 * anything but a genuine empty-cap stop) — so a gesture aimed at a
 * direction stopped by a genuine REFUSAL re-fetched the exact same refused
 * chunk on every gesture, forever. D2: a refusal must never be retried.
 *
 * mission-15/C12 — that fix alone left one path open: a refusal reached BY
 * REOPENING an already-empty-cap-stopped direction. `reopenAfterEmptyStreak`
 * flips `hasMore<Direction>` back to `true` without touching
 * `emptyStreak<Direction>` (by design — see its own header), so if the
 * reopened load then came back refused, `applyChunkResult`'s null branch
 * used to leave the streak exactly where reopening found it — AT the cap —
 * landing back at `!hasMore && streak >= cap`, the same reading a genuine
 * empty-cap stop gives. This predicate would then keep saying "reopenable"
 * forever, and the same refused chunk re-fetched on every further gesture.
 * Fixed in `applyChunkResult`'s own null branch, which now resets
 * `emptyStreak<Direction>` to 0 on every refusal regardless of how it was
 * reached, so a refused edge always reads `streak 0 < cap` here.
 *
 * Takes the two `hasMore`/`emptyStreak` mirrors as plain objects (not a
 * whole `ScheduleWindowState`) so useScheduleWindow.ts can call this from
 * its ref-mirrored "current" values directly, the same shape `hasMoreRef`
 * already uses, without needing a real `ScheduleWindowState` on hand.
 */
export function isStoppedByEmptyCap(
  direction: "backward" | "forward",
  hasMore: { backward: boolean; forward: boolean },
  emptyStreak: { backward: number; forward: number },
): boolean {
  return direction === "backward"
    ? !hasMore.backward && emptyStreak.backward >= MAX_CONSECUTIVE_EMPTY_CHUNKS
    : !hasMore.forward && emptyStreak.forward >= MAX_CONSECUTIVE_EMPTY_CHUNKS;
}

/**
 * mission-15/C8 (B3) — the OTHER half of "let a further scroll gesture
 * extend it": reopens `direction` for exactly one more chunk after it
 * stopped because it hit `MAX_CONSECUTIVE_EMPTY_CHUNKS` above. Called by
 * useScheduleWindow.ts's own `extend`, which useScheduleSentinels.ts
 * invokes only on a GENUINE wheel/touchmove gesture still aimed at that
 * edge — see that file's own comment for why it must be one of those two
 * events specifically, never a plain `scroll` (this hook's own manual
 * scroll-anchoring correction, useScrollAnchor.ts, writes `scrollTop`
 * directly, which dispatches a real, indistinguishable `scroll` event of
 * its own).
 *
 * Deliberately does NOT reset `emptyStreak<Direction>` back to 0: the next
 * chunk this buys is checked against the SAME running streak, so one more
 * empty chunk re-stops immediately — one more chunk per further gesture —
 * while a chunk that turns out to hold something real resets the streak
 * the ordinary way (this function's sibling, `applyChunkResult`'s
 * `isEmpty` branch) and hands ordinary automatic loading back the wheel.
 * A sustained scroll, which keeps generating the very wheel/touchmove
 * events this is gated on, reads as a sustained stream of "one more
 * chunk" grants rather than a single lump re-scan.
 *
 * A no-op unless `direction` is stopped for EXACTLY the empty-cap reason —
 * `isStoppedByEmptyCap` above is that exact check. A direction stopped by a
 * genuine REFUSAL always reads `emptyStreak<Direction> === 0` (mission-15/
 * C12 — `applyChunkResult`'s null branch now resets it on every refusal,
 * specifically so a refusal reached BY REOPENING an empty-cap-stopped
 * direction — see this function's own "deliberately does NOT reset" note
 * above, and `isStoppedByEmptyCap`'s header — can never be mistaken for
 * still being empty-cap-stopped), so the two stop reasons can never be
 * confused here — which is what keeps D2's own rule (a refusal must never
 * be retried) intact.
 */
export function reopenAfterEmptyStreak(
  state: ScheduleWindowState,
  direction: "backward" | "forward",
): ScheduleWindowState {
  const hasMore = { backward: state.hasMoreBackward, forward: state.hasMoreForward };
  const emptyStreak = { backward: state.emptyStreakBackward, forward: state.emptyStreakForward };
  if (!isStoppedByEmptyCap(direction, hasMore, emptyStreak)) return state;
  return direction === "backward"
    ? { ...state, hasMoreBackward: true }
    : { ...state, hasMoreForward: true };
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
 *
 * mission-15/C6: `fetchedEvents`/`fetchedTasks` share fetchCalendarEvents'/
 * fetchTasks' own `null`-means-refused shape now. A refresh is a much
 * narrower, always-valid range (`refreshChunkFor`'s own 14 days, far under
 * `MAX_FETCH_SPAN_DAYS`), so a refusal here should never happen in
 * practice — but if one somehow does (a signed-out session between the
 * detail sheet opening and this call, say), the safe response is to leave
 * `state` exactly as it was: a refused re-check tells us nothing new, so
 * there is nothing trustworthy to merge in.
 */
export function applyRefresh(
  state: ScheduleWindowState,
  chunk: ScheduleChunk,
  fetchedEvents: CalendarEventView[] | null,
  fetchedTasks: CalendarTaskView[] | null,
): ScheduleWindowState {
  if (fetchedEvents === null || fetchedTasks === null) return state;

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
