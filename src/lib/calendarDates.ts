// Pure date/label helpers for the Calendar branch (K1 — Week and Day views).
//
// No "server-only" guard: per STRUCTURE.md's rule, a lib module may skip it
// when it is pure over its inputs, reads no env var, and holds no secret of
// its own. Everything here is plain arithmetic and Intl formatting over the
// Date objects it's handed — same standing as match.ts and duplicates.ts.
//
// Extends the two rules mealPlanDates.ts already established for this
// codebase (read that file's header for the full reasoning):
//
// 1. Calendar-component math only, never milliseconds. A week is 167 or 169
//    hours across a daylight-saving change (US clocks fall back Nov 1,
//    2026), so every day-count here moves whole calendar days via
//    mealPlanDates' `addDays`/`isSameDay`, reused rather than redefined.
// 2. "Now"/"today" is never decided in here. Every function below takes it
//    as an explicit parameter and none call `new Date()` — that's what lets
//    the tests pin exact instants, and what keeps a server-decided "today"
//    (Vercel runs UTC; this household runs Mountain, which is *behind* it)
//    from ever leaking into a calendar-meaningful decision again.

import { addDays, isSameDay, startOfDay } from "./mealPlanDates";

/**
 * Seven consecutive local calendar dates (all at local midnight) starting
 * from `weekStart`, which the caller is expected to have already snapped to
 * a Sunday (`sundayOf` in mealPlanDates.ts does that). Safe across a DST
 * boundary because it's `addDays` seven times, never `+ 7 * 24 * 3600 * 1000`.
 */
export function daysOfWeek(weekStart: Date): Date[] {
  const sunday = startOfDay(weekStart);
  return Array.from({ length: 7 }, (_, offset) => addDays(sunday, offset));
}

// Two formatters, not constructed per call: minutes only appear when the
// time isn't on the hour ("8 PM", never "8:00 PM"), so which one applies
// depends on the instant being formatted.
const CLOCK_WITH_MINUTES = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const CLOCK_HOUR_ONLY = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hour12: true,
});

/** The numeric clock text ("8", "12:30") and meridiem ("AM"/"PM") for one
 * instant, read off `Intl.DateTimeFormat`'s own parts rather than hand-
 * rolling hour-mod-12 logic (which gets midnight/noon wrong easily). */
function clockParts(date: Date): { numeric: string; meridiem: string } {
  const formatter = date.getMinutes() === 0 ? CLOCK_HOUR_ONLY : CLOCK_WITH_MINUTES;
  const parts = formatter.formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value;
  const meridiem = parts.find((p) => p.type === "dayPeriod")?.value ?? "";
  return { numeric: minute ? `${hour}:${minute}` : hour, meridiem };
}

/**
 * The house label for a timed event's start–end range: "8 – 9 PM",
 * "10 – 11 AM", "12:30 – 4:30 PM", "11:30 AM – 1 PM". `:00` minutes are
 * dropped, and the meridiem is shown only once — on the end — whenever
 * both ends share it; a range that crosses AM/PM shows it on both sides
 * since dropping either would change the meaning.
 */
export function formatTimeRange(start: Date, end: Date): string {
  const startParts = clockParts(start);
  const endParts = clockParts(end);
  const sameMeridiem = startParts.meridiem === endParts.meridiem;
  const startText = sameMeridiem
    ? startParts.numeric
    : `${startParts.numeric} ${startParts.meridiem}`;
  const endText = `${endParts.numeric} ${endParts.meridiem}`;
  return `${startText} – ${endText}`;
}

/** Whole calendar days from `a` to `b` (both truncated to local midnight
 * first), computed by walking `addDays`/`isSameDay` rather than an epoch
 * subtraction — the same calendar-component discipline as everything else
 * in this file, just applied to counting instead of shifting. Realistic
 * event spans are days or weeks, never long enough for the loop to matter.
 *
 * Exported as of mission-9 (K2/C1) so `monthLayout.ts` and, later,
 * `CalendarViews.tsx`'s own `daysBetween` copy can share this one
 * implementation instead of re-deriving it — no behavior change, same
 * signature, still called locally by `eventDaySpan`/`formatAllDayLabel`
 * below exactly as before. */
export function calendarDayDiff(a: Date, b: Date): number {
  const from = startOfDay(a);
  const to = startOfDay(b);
  const forward = to.getTime() >= from.getTime();
  let cursor = from;
  let count = 0;
  while (!isSameDay(cursor, to)) {
    cursor = addDays(cursor, forward ? 1 : -1);
    count += forward ? 1 : -1;
  }
  return count;
}

/** The inclusive first/last local calendar day an event covers, and how
 * many days that spans. All-day events store their end **exclusive** —
 * the common iCal/Google convention, where a Mon–Wed all-day event's end
 * is Thursday midnight — so this subtracts one day back onto Wednesday
 * before counting; a timed event's `end` instant is used as-is in the
 * general case, since a timed event genuinely does span into the next
 * calendar day if it runs past midnight (a New Year's Eve party, say) and
 * shouldn't have a day subtracted for that. This is the one function in
 * the file responsible for that distinction — every day-span calculation
 * below goes through it, which is what keeps an all-day event from leaking
 * onto the extra day its stored end instant would otherwise imply.
 *
 * Two fixes from mission-8's pass-1 gates, both in this one function so
 * `formatAllDayLabel` and `daysEventCovers` can never disagree about them:
 *
 * V1 (Vision) — a TIMED event's end instant needs one more case than "use
 * it as-is": when it lands EXACTLY on local midnight (the natural way to
 * type "ends at midnight" — 8:00 PM to 12:00 AM), that midnight belongs to
 * the day it's CLOSING, not the day it would otherwise open. Without this,
 * "8 PM – 12 AM" silently became a real 2-day span with no time label on
 * either day. Only exact midnight triggers it, and only when the event is
 * a genuine span (end after start) — an ordinary 2 PM–3 PM event is
 * untouched.
 *
 * V2 (Vision) — a degenerate row (an all-day event whose end isn't
 * actually after its start) would otherwise put `lastDay` BEFORE
 * `firstDay`, which makes `daysEventCovers`' range check impossible to
 * satisfy for ANY day — the event silently never appears anywhere, ever.
 * `validateEventInput` (actions/calendar.ts) now rejects a *new* row shaped
 * like this; this clamp is what keeps an already-saved one from vanishing
 * instead — validate AND clamp, the same defense-in-depth shape the rest
 * of this app already uses for its write paths.
 */
function eventDaySpan(
  start: Date,
  end: Date,
  allDay: boolean,
): { firstDay: Date; lastDay: Date; totalDays: number } {
  const firstDay = startOfDay(start);

  const endDay = startOfDay(end);
  const lastDayRaw = allDay
    ? addDays(endDay, -1)
    : end.getTime() === endDay.getTime() && end.getTime() > start.getTime()
      ? addDays(endDay, -1)
      : endDay;

  // V2's clamp: never let the span run backwards.
  const lastDay = lastDayRaw.getTime() < firstDay.getTime() ? firstDay : lastDayRaw;

  const totalDays = Math.max(calendarDayDiff(firstDay, lastDay) + 1, 1);
  return { firstDay, lastDay, totalDays };
}

/**
 * The badge shown in place of a time range for an all-day or multi-day
 * event, for the calendar day `day` it's being rendered on: a single-day
 * all-day event reads "All day"; any event spanning more than one calendar
 * day reads "Day N of M" for whichever day this is. Returns `null` for a
 * plain single-day timed event, since that case has no badge of its own —
 * `formatTimeRange` is the right label there instead.
 */
export function formatAllDayLabel(
  start: Date,
  end: Date,
  allDay: boolean,
  day: Date,
): string | null {
  const { firstDay, totalDays } = eventDaySpan(start, end, allDay);
  if (totalDays <= 1) return allDay ? "All day" : null;
  const dayIndex = calendarDayDiff(firstDay, startOfDay(day)) + 1;
  return `Day ${dayIndex} of ${totalDays}`;
}

/**
 * True once an event has ended relative to `now`. An event whose end lands
 * exactly on `now` counts as past — it isn't still happening, so it dims
 * like anything already over, rather than waiting for the instant after.
 */
export function isPast(end: Date, now: Date): boolean {
  return end.getTime() <= now.getTime();
}

/**
 * Which of `days` an event appears on, so a multi-day event can render a
 * card on each one. Uses the same all-day-aware inclusive span as
 * `formatAllDayLabel`, so the two always agree on how many days an event
 * covers and which ones they are.
 */
export function daysEventCovers(
  start: Date,
  end: Date,
  allDay: boolean,
  days: Date[],
): Date[] {
  const { firstDay, lastDay } = eventDaySpan(start, end, allDay);
  return days.filter((day) => {
    const d = startOfDay(day);
    return d.getTime() >= firstDay.getTime() && d.getTime() <= lastDay.getTime();
  });
}

/**
 * Whether `day` is missing from page.tsx's fetch window — even partially.
 * A day counts as loaded only when the window FULLY CONTAINS it: true when
 * the day's own local START falls before `windowStart`, OR the day's own
 * local END (`addDays(startOfDay(day), 1)`, i.e. its following midnight)
 * falls after `windowEnd`. An equal end (`dayEnd === windowEnd`) counts as
 * inside — the window's own edge instant is still loaded.
 *
 * This full-containment rule exists because a weaker "does the day's START
 * land inside the window" check (mission-8's V4, pass 2) is a real lie:
 * page.tsx builds `windowEnd` from the SERVER's own clock (UTC on Vercel),
 * while `day` here is always a BROWSER-built local midnight (see
 * CalendarViews.tsx's `daysOfWeek`/anchor construction). Because the
 * household's browser runs America/Denver, which is BEHIND UTC, a day
 * whose start reads as safely inside the window can still have its own
 * local END land hours after the server actually stopped fetching — an
 * evening event on that day is genuinely in the database, was never
 * queried, and a start-only check called the day "loaded" anyway. Compare
 * raw `.getTime()` instants on both sides, never re-floor one side's
 * instant through the OTHER side's local getters (`startOfDay`/
 * `getFullYear`/etc. all read the CURRENT environment's own clock — a
 * server-built instant re-floored through a browser's local getters, or
 * vice versa, silently becomes a different absolute instant) — see this
 * file's own top-of-file rule 2 and `mealPlanDates.ts`'s original warning
 * for the same trap in a different shape.
 */
export function isOutsideWindow(day: Date, windowStart: Date, windowEnd: Date): boolean {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();
  return dayStart < windowStart.getTime() || dayEnd > windowEnd.getTime();
}

/**
 * Whether paging one more period in a direction is allowed, given the
 * CANDIDATE period's own edge day closest to "now" — the first day of the
 * next period when stepping forward, or the last day of the previous
 * period when stepping backward (CalendarViews.tsx computes both the same
 * way already, calling them `nextPeriodStart` / `previousPeriodEnd`).
 * Reuses `isOutsideWindow` on that single day: if even the CLOSEST day of
 * the candidate period is outside the loaded window, every day further
 * into that period is guaranteed to be outside too (each one moves further
 * from "now", never back toward it), so the whole period would render
 * nothing but `NotLoadedCard` — stepping there is refused instead. One
 * shared definition for both Prev and Next (Prev was already correct, but
 * now shares the exact same predicate rather than a second hand-written
 * copy of the same idea), so they can never disagree about the edge.
 */
export function canStepToPeriod(
  candidateEdgeDay: Date,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  return !isOutsideWindow(candidateEdgeDay, windowStart, windowEnd);
}
