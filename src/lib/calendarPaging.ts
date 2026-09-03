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
// `periodWindowEdges` is a THIRD, separate export — CalendarViews.tsx's
// OLD (pre-C6) window/paging predicate block, lines 163-214, moved here
// verbatim (Captain's C2-1 recommendation, "unavoidable anyway" per
// mission-9's own pre-authorization note). C6 retired `canStepToPeriod`'s
// use as a navigation WALL — see CalendarViews.tsx's own comment on why
// Prev/Next are never disabled by a window edge anymore now that the
// window follows wherever the URL's own "?date=" points — but the
// predicate itself is kept, not deleted, per that contract's explicit "do
// not delete the honesty machinery, retire only its use as a wall"
// instruction. Moving it here is what finally makes its two previously
// browser-only-verified invariants (C7's direction-of-travel rule; Vision
// pass-3's skewed-clock guard) real `node:test` cases — see
// calendarPaging.test.ts, including the red-then-green transcript in
// Stark's C6 report showing both were unreachable before this file
// existed.

import { addDays, startOfDay, toLocalDateString } from "./mealPlanDates";
import { canStepToPeriod } from "./calendarDates";

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

/** Narrows a raw "?view=" string to a real Calendar view, falling back to
 * Week for anything else (missing, malformed, or a stray value) — same
 * "invalid input dropped, not trusted" posture as `parseDateParam`. Kept
 * next to it since both are the two halves of the one URL shape
 * CalendarViews.tsx reads and writes (`buildCalendarSearch` below). */
export function parseViewParam(value: string | undefined | null): "day" | "week" | "month" {
  return value === "day" || value === "month" ? value : "week";
}

/** The "date=...&view=..." query string CalendarViews.tsx pushes on every
 * real navigation (mission-9/C6) — the exact inverse of
 * `parseDateParam`/`parseViewParam` above, kept next to them so the two
 * directions can't quietly drift into different string shapes. */
export function buildCalendarSearch(view: "day" | "week" | "month", anchor: Date): string {
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

// ---------------------------------------------------------------------------
// periodWindowEdges — see this file's header.

export type PeriodWindowEdgesInput = {
  view: "day" | "week" | "month";
  /** `useCalendarPeriod`'s own `anchor` — `null` only before `today`
   * resolves (see that hook's own comment). */
  anchor: Date | null;
  /** Week view only; `null` for Day/Month (mirrors CalendarViews.tsx's own
   * `weekStart`). */
  weekStart: Date | null;
  today: Date | null;
  windowStart: Date;
  windowEnd: Date;
};

export type PeriodWindowEdges = {
  /** True only when stepping BACKWARD one more period would land somewhere
   * the fetch window doesn't fully contain, AND that step would move AWAY
   * from today (never true for a step that moves toward it — C7's
   * direction-of-travel rule) — see this function's own body for the
   * skewed-clock guard on top of that. */
  atWindowStart: boolean;
  /** The forward-stepping mirror of `atWindowStart`. */
  atWindowEnd: boolean;
};

/**
 * Whether stepping one more period, in either direction, from `anchor`
 * would land somewhere the fetch window doesn't fully cover — moved
 * verbatim from CalendarViews.tsx (mission-9/C6; see this file's header
 * for why it still exists even though C6 retired its use as a navigation
 * WALL — CalendarViews.tsx no longer imports this function at all). Two
 * invariants, both pinned in calendarPaging.test.ts:
 *
 * C7 (direction-of-travel) — a step that moves TOWARD today must never be
 * flagged, even into a candidate period the window doesn't cover (that
 * candidate still renders honestly via `isOutsideWindow`/`NotLoadedCard`;
 * the next step only gets closer). Guarded by comparing the CANDIDATE
 * period's own near edge against `today`, not by the window at all.
 *
 * Vision pass-3 (skewed clock) — if `today` itself sits outside the
 * window (a badly-skewed device clock), the direction check above can't
 * tell which way is "toward" the data anymore the first time
 * `anchor === today`. `anchorBeforeWindow`/`anchorAfterWindow` track
 * whether the CURRENT period itself hasn't reached the window yet — once
 * paging carries the anchor into or past the window, they go false and
 * the ordinary check above resumes unaided.
 */
export function periodWindowEdges({
  view,
  anchor,
  weekStart,
  today,
  windowStart,
  windowEnd,
}: PeriodWindowEdgesInput): PeriodWindowEdges {
  const nextPeriodStart =
    anchor === null
      ? null
      : view === "week"
        ? weekStart === null
          ? null
          : addDays(weekStart, 7)
        : view === "month"
          ? new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)
          : addDays(anchor, 1);
  const previousPeriodEnd =
    anchor === null
      ? null
      : view === "week"
        ? weekStart === null
          ? null
          : addDays(weekStart, -1)
        : view === "month"
          ? new Date(anchor.getFullYear(), anchor.getMonth(), 0)
          : addDays(anchor, -1);

  const anchorBeforeWindow = anchor !== null && anchor.getTime() < windowStart.getTime();
  const anchorAfterWindow = anchor !== null && anchor.getTime() > windowEnd.getTime();

  const atWindowEnd =
    today !== null &&
    nextPeriodStart !== null &&
    nextPeriodStart.getTime() > today.getTime() &&
    !canStepToPeriod(nextPeriodStart, windowStart, windowEnd) &&
    !anchorBeforeWindow;
  const atWindowStart =
    today !== null &&
    previousPeriodEnd !== null &&
    previousPeriodEnd.getTime() < today.getTime() &&
    !canStepToPeriod(previousPeriodEnd, windowStart, windowEnd) &&
    !anchorAfterWindow;

  return { atWindowStart, atWindowEnd };
}
