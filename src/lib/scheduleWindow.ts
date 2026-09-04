// Pure windowing/grouping maths for the Calendar branch's Schedule view
// (CV3, mission-15/C2) — one continuous list of days that scrolls endlessly
// backward and forward, today always present.
//
// The sibling of monthLayout.ts and timelineLayout.ts: same house rules,
// same reason to state them again rather than assume they're remembered.
//
// No React, no database, no zero-argument `new Date()`, no `Date.now()` —
// this module never reads the clock. Every date arrives as a parameter, and
// every calculation moves whole calendar days via mealPlanDates.ts's
// `addDays`/`startOfDay`/`isSameDay`/`isSameMonth`, or calendarDates.ts's
// `calendarDayDiff`/`daysEventCovers` — never milliseconds. A week is 167 or
// 169 hours across a daylight-saving change (US clocks fall back Nov 1,
// 2026, spring forward Mar 8, 2026), so `+ 30 * 24 * 3600 * 1000` would
// silently drift a "30-day" chunk by an hour on either transition. See those
// two files' headers for the fuller reasoning this module inherits rather
// than re-litigates.
//
// Imports are limited to ./mealPlanDates and ./calendarDates — the same
// restriction monthLayout.ts and timelineLayout.ts both follow.
//
// D3 (mission-15's Banner brief): the windows this module works with are
// built from BROWSER-LOCAL midnights by the caller (C3's hook), never
// padded for server/device clock skew the way page.tsx's
// `resolveServerFetchWindow` is — the browser knows its own midnight, the
// server doesn't need to guess here. Every window below is HALF-OPEN,
// `[start, end)`, matching `isOutsideWindow`'s own convention in
// calendarDates.ts: `end` is the exclusive edge, one local midnight past
// the last day the window actually contains. That's what lets two adjacent
// chunks tile with no gap and no double-counted day — chunk A's `end`
// equals chunk B's `start`, by construction, not by a boundary caller has
// to get right on their own.

import { addDays, isSameDay, isSameMonth, startOfDay } from "./mealPlanDates";
import { calendarDayDiff, daysEventCovers } from "./calendarDates";

/** How many calendar days one "page" of Schedule loads at a time, in either
 * direction. Not tied to anything about screen size or scroll speed — it's
 * just a fetch granularity, chosen the same way CV2/CV4's constants are
 * chosen as a plain named constant rather than a magic number scattered
 * through the caller. */
export const CHUNK_DAYS = 30;

/**
 * The minimal, structural shape this module needs from a calendar entry —
 * not a copy of `CalendarEventView` or `CalendarTaskView` (src/lib/types.ts),
 * which this module isn't allowed to import (it may only import from
 * mealPlanDates.ts and calendarDates.ts) and shouldn't need to: windowing
 * and grouping only care about identity and date span, never a title or who
 * a card belongs to. Deliberately the same shape `MonthLayoutEvent` and
 * `TimelineEvent` already use, for the same reason those two agree with
 * each other — a caller adapting a task's single `dueDate` into
 * `startAt === endAt === dueDate, allDay: true` can hand both events and
 * tasks through this exact same module with no second code path here.
 */
export type ScheduleEvent = {
  id: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
};

/** A half-open `[start, end)` range of local midnights — one "page" of
 * Schedule's endless scroll, either the next one to fetch (`nextBackward
 * Chunk`/`nextForwardChunk`) or the caller's own currently-loaded span
 * (`mergeWindow`/`scheduleRows`'s `windowStart`/`windowEnd` pair, kept as
 * two parameters rather than boxed into this type there since those two
 * functions already had that shape before this type existed and nothing
 * forces the change). */
export type ScheduleChunk = {
  start: Date;
  end: Date;
};

/** True when `event`'s own span overlaps the half-open `[windowStart,
 * windowEnd)` range — the exact overlap test `page.tsx`'s Prisma query
 * already uses (`startAt < windowEnd AND endAt > windowStart`), reused here
 * so `mergeWindow`'s "did this window's own contents come back stale"
 * check agrees with what the server considers "in range" for that same
 * window. Plain instant comparison, not calendar-day comparison — an
 * all-day event's `startAt`/`endAt` are already stored as fixed UTC-midnight
 * instants (calendarDates.ts's `allDayInstantToLocalDay` comment), and a
 * timed event's overlap genuinely is an instant question, so there is no
 * DST trap here to route around the way there is in `scheduleRows` below. */
function overlapsWindow(event: ScheduleEvent, windowStart: Date, windowEnd: Date): boolean {
  return event.startAt.getTime() < windowEnd.getTime() && event.endAt.getTime() > windowStart.getTime();
}

/**
 * Folds a freshly-fetched `[windowStart, windowEnd)` page into the
 * caller's accumulated `Map<id, ScheduleEvent>`, and returns a NEW map
 * (this module never mutates an input) with two properties, both load-
 * bearing for an endlessly-scrolling list built from overlapping fetches:
 *
 * 1. **A multi-day event seen in two overlapping fetches is stored once.**
 *    Two chunks that both touch the same event (one prepended, one
 *    appended, or a re-merge of the same range after `router.refresh()`)
 *    both hand back the same `id` — the second `set()` simply overwrites
 *    the first entry with the freshest copy, and a `Map` can't hold two
 *    entries under the same key. No dedup pass is needed; it falls out of
 *    keying by `id` at all.
 * 2. **An event deleted on the server drops.** Naively only ever ADDING
 *    what comes back would let a deleted row live in the map forever, since
 *    nothing ever fetches it again to notice it's gone. Instead: anything
 *    already in the map that USED to overlap this exact window (
 *    `overlapsWindow`, matching the server's own overlap test for that
 *    range) but did NOT come back in `fetched` is removed first — the
 *    window is treated as authoritative for its own span. An event
 *    entirely outside `[windowStart, windowEnd)` is left alone regardless
 *    of whether it appears in `fetched` (it has no business being there),
 *    which is what makes it safe to call this once per chunk rather than
 *    only once for the whole accumulated range.
 */
export function mergeWindow(
  existing: Map<string, ScheduleEvent>,
  windowStart: Date,
  windowEnd: Date,
  fetched: ScheduleEvent[],
): Map<string, ScheduleEvent> {
  const fetchedIds = new Set(fetched.map((event) => event.id));

  const next = new Map<string, ScheduleEvent>();
  for (const [id, event] of existing) {
    // Keep anything the fetch had no opinion about (outside this window).
    // Keep anything the fetch actively reconfirmed too — the loop below
    // overwrites those with the fresher copy regardless, so keeping them
    // here just avoids a delete-then-reinsert for no reason.
    if (!overlapsWindow(event, windowStart, windowEnd) || fetchedIds.has(id)) {
      next.set(id, event);
    }
    // Anything left out — overlapped this window, but didn't come back —
    // is a server-side deletion, and is simply never copied into `next`.
  }

  for (const event of fetched) {
    next.set(event.id, event);
  }

  return next;
}

/** The next chunk to load when the user scrolls toward the top: the
 * `CHUNK_DAYS` immediately before whatever's already loaded. `end` is
 * exactly `loadedStart` — the caller's own already-loaded window begins
 * exactly where this one ends, so stitching the two together with
 * `mergeWindow` neither skips a day nor asks for one twice. */
export function nextBackwardChunk(loadedStart: Date): ScheduleChunk {
  const end = startOfDay(loadedStart);
  return { start: addDays(end, -CHUNK_DAYS), end };
}

/** The mirror of `nextBackwardChunk`, scrolling toward the bottom: the
 * `CHUNK_DAYS` immediately after whatever's already loaded. `start` is
 * exactly `loadedEnd`, for the same tiling reason. */
export function nextForwardChunk(loadedEnd: Date): ScheduleChunk {
  const start = startOfDay(loadedEnd);
  return { start, end: addDays(start, CHUNK_DAYS) };
}

/** One rendered day in the Schedule list: the calendar day itself (local
 * midnight) and the events touching it, in the same start-time-then-id
 * order `monthLayout.ts`'s `compareCandidates` uses for its own tiebreak —
 * deterministic regardless of the `Map`'s own insertion order, which
 * depends on fetch/scroll history rather than anything about the events
 * themselves. */
export type ScheduleDayRow = {
  day: Date;
  events: ScheduleEvent[];
};

/** One month's worth of `ScheduleDayRow`s, in calendar order — the grouping
 * the Schedule view renders a sticky month header per. */
export type ScheduleMonthGroup = {
  monthStart: Date;
  days: ScheduleDayRow[];
};

function compareEvents(a: ScheduleEvent, b: ScheduleEvent): number {
  const byStart = a.startAt.getTime() - b.startAt.getTime();
  if (byStart !== 0) return byStart;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

/**
 * Turns the loaded, merged event set into what the Schedule view renders:
 * every day in `[windowStart, windowEnd)` that has at least one event,
 * grouped into months, PLUS today — even when today holds nothing.
 *
 * That last clause is the whole reason this function exists rather than a
 * one-line `.filter()` at the call site: Google's own Schedule view does
 * the same thing, and for the same reason — a plain "only days with
 * something" list would let today silently vanish from the middle of an
 * otherwise-populated list the moment it happens to be free, which reads as
 * "the app lost today" rather than "today is open." Today is included only
 * when it actually falls inside `[windowStart, windowEnd)` — this walks the
 * window day by day and simply never encounters a `today` outside it, so
 * there's no separate "is today in range" branch to keep in sync with the
 * loop below.
 *
 * `events` need not already be sorted or deduplicated — `mergeWindow`'s
 * `Map` already guarantees the one-entry-per-id part before this ever
 * runs, but this function doesn't depend on that; it re-derives which day
 * each event belongs to from scratch via `daysEventCovers`, the same
 * function `monthLayout.ts`'s `assignLanes` and `CalendarViews.tsx`'s own
 * per-day filter both use, so an all-day/multi-day span is read identically
 * everywhere in this app.
 */
export function scheduleRows(
  events: ScheduleEvent[],
  windowStart: Date,
  windowEnd: Date,
  today: Date,
): ScheduleMonthGroup[] {
  const start = startOfDay(windowStart);
  const end = startOfDay(windowEnd);
  const totalDays = Math.max(calendarDayDiff(start, end), 0);
  const todayDay = startOfDay(today);

  const groups: ScheduleMonthGroup[] = [];

  for (let offset = 0; offset < totalDays; offset++) {
    const day = addDays(start, offset);

    const dayEvents = events
      .filter((event) => daysEventCovers(event.startAt, event.endAt, event.allDay, [day]).length > 0)
      .sort(compareEvents);

    if (dayEvents.length === 0 && !isSameDay(day, todayDay)) continue;

    const monthStart = new Date(day.getFullYear(), day.getMonth(), 1);
    const lastGroup = groups[groups.length - 1];
    const row: ScheduleDayRow = { day, events: dayEvents };

    if (lastGroup && isSameMonth(lastGroup.monthStart, monthStart)) {
      lastGroup.days.push(row);
    } else {
      groups.push({ monthStart, days: [row] });
    }
  }

  return groups;
}
