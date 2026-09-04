// Pure helpers for the Calendar branch's UNBOUNDED navigation (mission-9,
// K2/C6 — Bryce, 2026-09-02: "We HAVE to fix it. Let's do it the way
// Google does it."). No "server-only" guard, same standing as
// calendarDates.ts/mealPlanDates.ts: everything here is pure over its
// inputs, called from BOTH page.tsx (server) and CalendarViews.tsx
// (client) — see each function's own comment for which side calls it and
// why that's still safe under this codebase's "never decide a
// calendar-meaningful day on the server" rule.
//
// Two jobs live here:
//
// 1. The "?date=" URL parameter <-> Date conversion, validated
//    SEMANTICALLY rather than lexically (K1's own C8 note): a shape-only
//    regex accepts "2026-02-30" and lets `Date` silently roll it over to
//    Mar 2, which is a real lie about which day is showing, not just a
//    cosmetic one. `parseDateParam` round-trips through
//    `toLocalDateString` (mealPlanDates.ts) instead —
//    `toLocalDateString(parse(d)) === d` — so a day that doesn't exist is
//    rejected outright rather than silently rolled forward.
//
// 2. `buildFetchWindow` (and page.tsx's own `resolveServerFetchWindow`) —
//    the fetch window a requested anchor DAY implies. THIS is the
//    resolution to this contract's own named trap: a fetch window is a
//    RANGE, not a decided calendar day, so it's fine to build server-side
//    from the parsed param PROVIDED it's padded generously enough to
//    absorb the gap between the SERVER's own runtime timezone (UTC on
//    Vercel, but whatever `TZ` the dev machine happens to run) and the
//    BROWSER's (always America/Denver, this household's real location) —
//    see `parseDateParam`'s own comment for exactly where that gap can
//    appear. `WINDOW_TZ_SKEW_PAD_DAYS` below is that padding, on top of
//    the ordinary paging headroom (`CALENDAR_FETCH_WINDOW_DAYS`, unchanged
//    in value from K1's old page.tsx-local `WINDOW_DAYS`).
//
//    WHO DECIDES WHAT, restated because this is the trap this contract
//    names explicitly: the server may pick the WINDOW's outer edges (a
//    range, never wrong to be a little generous with). It is NEVER the
//    server's job to decide which day is "today", or which day an event's
//    card renders under — that's still entirely `useToday()` +
//    CalendarViews.tsx's own period cursor (useCalendarPeriod.ts),
//    completely unchanged by this contract.
//
// `periodWindowEdges` used to be a third export here — CalendarViews.tsx's
// pre-C6 window/paging predicate, kept when C6 retired its use as a
// navigation WALL. It was deleted in mission-10/CV0 (contract C1) together
// with calendarDates.ts's `canStepToPeriod`, which only it called: two
// missions passed with no application caller, which is Captain's
// dormant-export rule for deleting rather than commenting. Paging is
// unbounded now — the window follows wherever "?date=" points, and a day the
// fetch didn't cover still renders honestly through `isOutsideWindow`
// (calendarDates.ts), which IS still live in MonthGrid and CalendarViews.

import { addDays, startOfDay, toLocalDateString } from "./mealPlanDates";
import {
  DEFAULT_CALENDAR_VIEW,
  toBuiltCalendarView,
  type CalendarPeriodView,
} from "./calendarViewVocabulary";

const DATE_PARAM_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a "?date=" value into a calendar-component Date, or `null` if
 * it's missing, malformed, or names a day that doesn't exist
 * ("2026-02-30"). Validated SEMANTICALLY, not lexically, via a round trip
 * back through `toLocalDateString` — the shape-only regex this codebase
 * used to run alone (K1's own C8 note, page.tsx's `new/page.tsx`) accepts
 * "2026-02-30" and lets `Date` silently roll it forward to Mar 2.
 *
 * Safe to call on EITHER side (server or client): the Date it returns is
 * built from calendar COMPONENTS only (never `new Date(string)`, which
 * parses as UTC and is the exact trap mealPlanDates.ts's own header warns
 * about), so it always represents local midnight in WHICHEVER runtime
 * calls it. That's fine for this contract's two actual callers —
 * page.tsx only ever feeds the result into `buildFetchWindow` (a padded
 * RANGE, see that function's own comment for why the runtime gap doesn't
 * matter there), and CalendarViews.tsx only ever compares it against its
 * OWN browser-built anchor/today (same runtime, no gap possible). Never
 * reuse this pattern to decide "today" itself outside those two uses.
 */
export function parseDateParam(value: string | undefined | null): Date | null {
  if (!value || !DATE_PARAM_SHAPE.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return toLocalDateString(parsed) === value ? parsed : null;
}

/**
 * Narrows a raw "?view=" string to a view that actually RENDERS, falling
 * back to `fallback` for anything else — missing, malformed, a stray
 * value, or a real view name that has no renderer yet. Same "invalid input
 * dropped, not trusted" posture as `parseDateParam`, and kept next to it
 * since both are the two halves of the one URL shape useCalendarNavigation
 * reads and writes (`buildCalendarSearch` below).
 *
 * THE UNBUILT CASE IS THE POINT (mission-11/C2). `CalendarPeriodView` now
 * holds six names but only three render, so `?view=year` — a bookmark
 * saved from a future build, a hand-typed URL, a link from a phone running
 * ahead of this deploy — must not reach a renderer that does not exist.
 * `toBuiltCalendarView` reads the single `BUILT_VIEWS` table the picker
 * reads, so "what a URL may name" and "what the picker offers" cannot
 * drift apart: an unbuilt view is normalized away here and never appears
 * there. This is the plan's "no stubs" rule kept — the vocabulary and the
 * cursor arithmetic for all six views are real, but nothing half-built is
 * reachable.
 *
 * `fallback` exists for the last-used-view preference
 * (useCalendarNavigation.ts): with no "?view=" at all, the answer is the
 * view this device last picked, and only `DEFAULT_CALENDAR_VIEW` when
 * there is no such preference. An unrecognised value falls back the same
 * way — the URL asked for something that does not exist, so the device's
 * own default is the best available answer.
 */
export function parseViewParam(
  value: string | undefined | null,
  fallback: CalendarPeriodView = DEFAULT_CALENDAR_VIEW,
): CalendarPeriodView {
  return toBuiltCalendarView(value) ?? fallback;
}

/** The "date=...&view=..." query string useCalendarNavigation pushes on
 * every real navigation (mission-9/C6) — the exact inverse of
 * `parseDateParam`/`parseViewParam` above, kept next to them so the two
 * directions can't quietly drift into different string shapes. Takes the
 * full `CalendarPeriodView` rather than only the built three: it is the
 * inverse of a parse, and narrowing it here would just move the question
 * of what may appear in a URL away from `BUILT_VIEWS`, which is the one
 * place that answers it. Nothing can hand it an unbuilt view today —
 * every caller's view came from `parseViewParam` or the picker. */
export function buildCalendarSearch(view: CalendarPeriodView, anchor: Date): string {
  const params = new URLSearchParams();
  params.set("date", toLocalDateString(anchor));
  params.set("view", view);
  return params.toString();
}

/** The ordinary paging headroom around a requested anchor day — unchanged
 * in VALUE from K1's old page.tsx-local `WINDOW_DAYS`, just relocated so
 * it lives next to the function that actually consumes it. */
export const CALENDAR_FETCH_WINDOW_DAYS = 60;

/** Extra padding, ON TOP of the headroom above, to absorb the gap between
 * the SERVER's own runtime timezone and the BROWSER's — see this file's
 * header. `parseDateParam` returns local midnight in whichever process
 * calls it; on Vercel that's UTC, while the household's real browser is
 * America/Denver (UTC-6/-7), so the two midnights for the "same" calendar
 * day can be several hours apart. One extra day of padding on each side
 * swallows that gap (and would swallow the worst case anywhere on Earth,
 * ~14 hours) with room to spare — this contract's own "padded generously
 * (≥1 day each side)" instruction, satisfied exactly rather than just
 * generously. */
const WINDOW_TZ_SKEW_PAD_DAYS = 1;

/** The fetch window a requested anchor DAY implies:
 * `CALENDAR_FETCH_WINDOW_DAYS` (+ the timezone pad above) on each side,
 * via `addDays` — calendar-component arithmetic, never milliseconds, the
 * same discipline as every other date helper in this codebase. A RANGE,
 * not a decided day — see this file's header for why that distinction is
 * what makes it safe to build from a server-parsed param at all. */
export function buildFetchWindow(anchorDay: Date): { windowStart: Date; windowEnd: Date } {
  const pad = CALENDAR_FETCH_WINDOW_DAYS + WINDOW_TZ_SKEW_PAD_DAYS;
  const start = startOfDay(anchorDay);
  return { windowStart: addDays(start, -pad), windowEnd: addDays(start, pad) };
}

/**
 * page.tsx's one call: turns its raw "?date=" search param into the fetch
 * window for its `calendarEvent.findMany` query. Falls back to the
 * SERVER's own clock only when `dateParam` is missing or invalid — exactly
 * the pre-C6 fallback behavior (page.tsx's old `WINDOW_DAYS` comment),
 * which stays fine for the SAME reason `buildFetchWindow` is fine: this is
 * only ever used to bound a query, never to decide which day is "today"
 * for rendering (that's still `useToday()`, client-side, unchanged).
 */
export function resolveServerFetchWindow(
  dateParam: string | undefined,
  serverNow: Date,
): { windowStart: Date; windowEnd: Date } {
  const anchorDay = parseDateParam(dateParam) ?? startOfDay(serverNow);
  return buildFetchWindow(anchorDay);
}
