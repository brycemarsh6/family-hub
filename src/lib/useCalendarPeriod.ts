"use client";

// The Calendar branch's period cursor — mission-9 (K2), contract C2a.
//
// Replaces the pre-K2 `offsetDays` scalar CalendarViews.tsx used to hold
// directly (`useState(0)`, stepped by `view === "week" ? 7 : 1`). Captain
// demonstrated against the real state model that a day-count scalar cannot
// express month paging: the only third arm it admits is "add
// daysInMonth(anchor)", which is anchor-dependent and therefore neither
// reversible nor month-faithful —
//
//   Next ×5 from Jan 31 2026:  Jan 31 → Mar 3 → Apr 3 → May 3 → Jun 3 → Jul 3
//   months shown: Jan, Mar, Apr, May, Jun, Jul      ← February skipped
//
//   Prev/Next round trip from Mar 31:  Mar 31 → Feb 28 → Mar 28  ← 3 days lost
//
// The fix is TWO independent offsets, not one — `dayOffset` for Day/Week,
// `monthOffset` for Month — because a month is 28-31 days and no single
// day-count can serve both without one of the two failures above. Both
// offsets are plain integers, counted from `today`, and PURE integer
// arithmetic composes exactly: `monthOffset + 1 - 1` is always back to
// exactly `monthOffset`, with no rounding or clamping loss, regardless of
// which months that offset happens to land on when rendered. That's what
// makes Prev∘Next an exact identity (see useCalendarPeriod.test.ts) even
// though the intermediate rendered anchor (a real Date) can legitimately
// get clamped — Jan 31 stepped one month forward lands on Feb 28, a real
// day that exists, and stepping back reaches Jan 31 again exactly because
// `monthOffset` never forgot it, not because the clamped Date remembered.
//
// `today` continues to arrive from `useToday()` at the call site (see that
// file's own comment) — this module never constructs a calendar-meaningful
// date of its own; every date it touches is `today` (a parameter) plus
// calendar-component arithmetic on it. Offsets are stored relative to
// `today` rather than as one committed absolute Date so a family that
// leaves the app open on "today" (offset 0) across midnight keeps
// auto-advancing exactly like the pre-K2 code did (`addDays(today,
// offsetDays)`, recomputed fresh every render from the live `today`).

import { useState } from "react";
import { addDays } from "./mealPlanDates";
import { calendarDayDiff } from "./calendarDates";

/**
 * The three things the Calendar branch's period cursor can express.
 * Broader than CalendarViews.tsx's own local view-mode type on purpose:
 * Month (K2/C2b) is a cursor concept this module has to model correctly
 * NOW even though no UI offers it yet — this contract is headless plumbing
 * only (see mission-9's C2a). CalendarViews.tsx keeps passing its own
 * narrower "week" | "day" values in, which TypeScript accepts structurally
 * wherever a `CalendarPeriodView` is expected.
 */
export type CalendarPeriodView = "day" | "week" | "month";

/**
 * A period, expressed as offsets from `today` rather than one committed
 * Date. `dayOffset` drives Day/Week paging (unchanged from the pre-K2
 * scalar: 7 per Week step, 1 per Day step). `monthOffset` drives Month
 * paging and is a genuinely separate counter, never derived from
 * `dayOffset` — see this file's header for why one scalar can't serve
 * both.
 */
export type CalendarPeriod = {
  view: CalendarPeriodView;
  dayOffset: number;
  monthOffset: number;
  /**
   * The day-of-month a Month-view Prev/Next step AIMS for — distinct from
   * whatever day the rendered anchor actually lands on once clamped to a
   * shorter target month. Stepping from Jan 31 into February (28 days in
   * 2026) clamps the rendered anchor to Feb 28, but `monthDay` keeps
   * remembering 31 untouched, so stepping back from there reaches Jan 31
   * again exactly — not Feb 28 minus a month (Jan 28), which is what a
   * naive "always re-derive the preferred day from the last rendered
   * anchor" approach would produce. Only meaningful while `view ===
   * "month"`; ignored by Day/Week arithmetic.
   */
  monthDay: number;
};

/** The number of real calendar days in `year`'s `monthIndex` (0-11, but
 * safe outside that range too — see `monthAnchor` below). Day 0 of the
 * FOLLOWING month is always the last day of `monthIndex`, and the `Date`
 * constructor normalizes an out-of-range month index the same way it
 * normalizes `monthAnchor`'s own arithmetic, so this needs no separate
 * year-rollover handling of its own. */
function daysInCalendarMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** The rendered Date for a Month-view period: `monthOffset` whole calendar
 * months from `today`'s own month, on day `min(monthDay, <days in that
 * target month>)`. Month/year rollover (`monthOffset` pushing past
 * December or before January) is handled by the `Date` constructor itself
 * — passing a month index outside 0-11 rolls the year the same way it
 * already does throughout this codebase's other date helpers. */
function monthAnchor(today: Date, monthOffset: number, monthDay: number): Date {
  const targetMonthIndex = today.getMonth() + monthOffset;
  const daysInTarget = daysInCalendarMonth(today.getFullYear(), targetMonthIndex);
  const day = Math.min(monthDay, daysInTarget);
  return new Date(today.getFullYear(), targetMonthIndex, day);
}

/** Whole calendar months from `a`'s month to `b`'s month (year-aware, so
 * Nov 2026 → Feb 2027 is 3, not -9). Calendar-component arithmetic only,
 * never milliseconds, same discipline as every other date helper in this
 * codebase. */
function calendarMonthDiff(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/** The specific calendar day a period currently renders as its anchor —
 * Day/Week just add `dayOffset` days to `today` (unchanged pre-K2
 * behavior); Month goes through `monthAnchor` above. Pure: no `new Date()`
 * with no arguments, no `Date.now()` — `today` is always the caller's. */
export function periodAnchor(period: CalendarPeriod, today: Date): Date {
  return period.view === "month"
    ? monthAnchor(today, period.monthOffset, period.monthDay)
    : addDays(today, period.dayOffset);
}

/** Moves a period one step in `direction` — 7 days for Week, 1 day for
 * Day (both exactly as the pre-K2 `offsetDays` scalar did), or 1 whole
 * calendar month for Month. Month stepping touches ONLY `monthOffset` —
 * `monthDay` is carried through completely untouched, which is what makes
 * a Prev∘Next round trip exact even when an intermediate step clamps (see
 * this file's header). */
export function stepPeriod(period: CalendarPeriod, direction: 1 | -1): CalendarPeriod {
  if (period.view === "month") {
    return { ...period, monthOffset: period.monthOffset + direction };
  }
  const days = period.view === "week" ? 7 : 1;
  return { ...period, dayOffset: period.dayOffset + direction * days };
}

/**
 * Switches which view a period represents, preserving the exact anchored
 * day — the property that makes Month → Day open the day the user was on,
 * not some other day derived from a stale offset. Converts the CURRENT
 * rendered anchor into the new view's own offset representation:
 * `calendarDayDiff` (calendarDates.ts) for Day/Week, `calendarMonthDiff` +
 * the anchor's own day-of-month for Month. This round-trips exactly in
 * both directions — see useCalendarPeriod.test.ts's "switching view
 * preserves the anchored day" property — because a real Date's own
 * day-of-month always fits inside its own month by definition, so
 * converting a genuine anchor INTO Month view never needs the clamp that
 * only fires when STEPPING onto a shorter month.
 */
export function withView(
  period: CalendarPeriod,
  view: CalendarPeriodView,
  today: Date,
): CalendarPeriod {
  if (view === period.view) return period;
  const anchor = periodAnchor(period, today);
  if (view === "month") {
    return {
      view,
      dayOffset: period.dayOffset,
      monthOffset: calendarMonthDiff(today, anchor),
      monthDay: anchor.getDate(),
    };
  }
  return {
    view,
    dayOffset: calendarDayDiff(today, anchor),
    monthOffset: period.monthOffset,
    monthDay: period.monthDay,
  };
}

/** Resets both offsets to 0 (today's own day, today's own month) while
 * keeping whichever view was already showing — the "Today" button's job.
 * `monthDay` is set to `today`'s real day-of-month rather than left alone,
 * so a period reset while already in Month view renders `today` exactly,
 * not merely "some day in today's month." */
export function resetToToday(view: CalendarPeriodView, today: Date): CalendarPeriod {
  return { view, dayOffset: 0, monthOffset: 0, monthDay: today.getDate() };
}

export type UseCalendarPeriodResult<V extends CalendarPeriodView> = {
  view: V;
  /** The specific calendar day this period is anchored to — `null` only
   * while `today` itself hasn't resolved yet (SSR and the first client
   * render; see useToday.ts's own comment). This hook never guesses in
   * the meantime, matching the rest of the Calendar branch's loading
   * pattern. */
  anchor: Date | null;
  /** The raw period (offsets + monthDay) this render is derived from —
   * exposed as of mission-9/C6 for CalendarViews.tsx's URL sync, which
   * needs to run the SAME pure `stepPeriod`/`periodAnchor`/`withView`
   * functions this hook uses internally to compute what a step/
   * view-switch WILL land on, synchronously, in the same event handler
   * that also calls `step`/`setView` — real navigation (`router.push`)
   * needs that resulting Date to build the "?date=" URL, and can't wait
   * for a second render to read it back off `anchor`. */
  period: CalendarPeriod;
  setView: (view: V) => void;
  step: (direction: 1 | -1) => void;
  goToToday: () => void;
  /** Jumps directly to an arbitrary DAY, in the given view — mission-9/C6.
   * Two callers: (1) CalendarViews.tsx's URL-resync effect, which uses
   * this to make the period cursor follow the "?date=" search param when
   * it changes for a reason OTHER than this hook's own actions (a deep
   * link, a reload, or the browser's Back/Forward), and (2) MonthGrid's
   * day-number tap, opening Day view on that exact day (replacing the old
   * step-in-a-loop composition `openDay` used before this contract).
   * Goes through the SAME `withView` conversion `setView` itself uses,
   * from a synthetic Day-view period at `anchor`'s own offset — never a
   * second, parallel way to "start somewhere other than today". */
  jumpTo: (anchor: Date, view: V) => void;
};

/**
 * The stateful wrapper CalendarViews.tsx actually calls — a thin `useState`
 * shell around the pure functions above, which is where every property
 * this contract requires is actually proven (see useCalendarPeriod.test.ts;
 * none of it depends on React, so none of it needs a render to verify).
 *
 * Generic over `V` (the caller's OWN view-mode type, e.g.
 * CalendarViews.tsx's local `"week" | "day"`) rather than always returning
 * the broad `CalendarPeriodView` — a caller that hasn't wired up Month yet
 * gets back exactly the narrower type its own switcher/header components
 * already expect, with no cast needed at every call site. The one
 * `as V` below is safe because `setView`'s own parameter type is `V`, so
 * `period.view` can only ever actually hold a `V` value at runtime — this
 * hook never assigns it anything else.
 *
 * `monthDay`'s initial value (below) is an inert placeholder: `view` only
 * ever becomes "month" through `setView`, which always calls `withView` —
 * and `withView` always recomputes `monthDay` from a REAL anchor. There is
 * no code path that renders a Month period whose `monthDay` still holds
 * the placeholder.
 */
export function useCalendarPeriod<V extends CalendarPeriodView>(
  initialView: V,
  today: Date | null,
): UseCalendarPeriodResult<V> {
  const [period, setPeriod] = useState<CalendarPeriod>({
    view: initialView,
    dayOffset: 0,
    monthOffset: 0,
    monthDay: 1,
  });

  const anchor = today === null ? null : periodAnchor(period, today);

  function setView(view: V) {
    setPeriod((previous) => (today === null ? { ...previous, view } : withView(previous, view, today)));
  }

  function step(direction: 1 | -1) {
    setPeriod((previous) => stepPeriod(previous, direction));
  }

  function goToToday() {
    if (today === null) return;
    setPeriod((previous) => resetToToday(previous.view, today));
  }

  function jumpTo(anchorDate: Date, view: V) {
    if (today === null) return;
    // A synthetic Day-view period at `anchorDate`'s own offset, then
    // `withView` converts it into the target view correctly (monthDay
    // included, for Month) — the exact same conversion `setView` uses,
    // just starting from an arbitrary day instead of the CURRENT period's
    // anchor.
    const asDay: CalendarPeriod = { view: "day", dayOffset: calendarDayDiff(today, anchorDate), monthOffset: 0, monthDay: 1 };
    setPeriod(withView(asDay, view, today));
  }

  return { view: period.view as V, anchor, period, setView, step, goToToday, jumpTo };
}
