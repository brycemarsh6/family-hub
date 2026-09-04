// The per-view date/label configuration for the Calendar's six views —
// extracted out of CalendarViews.tsx in mission-14/C1.
//
// WHY THIS MOVED: `CalendarViews.tsx` sat at 348/350 lines and CT2 must add
// lines to it to thread tasks through every view. Captain's CT1 ruling was a
// written trigger for exactly this moment — the next mission that must add a
// line to that file performs this extraction first, whether or not it is
// CV3. The decisive argument was COVERAGE, not size: this is per-view date
// logic that used to live in a `.tsx` file `package.json`'s test glob cannot
// reach, while its sibling `VIEW_CURSOR` (useCalendarPeriod.ts) already sits
// in `src/lib/` with property tests across every day of 2026. Now this one
// does too — see calendarViewConfig.test.ts.
//
// The render switch (which component draws MonthGrid vs DaySection) stays
// in CalendarViews.tsx on purpose — that's where future views land, and it
// should stay flat and visible there, not buried in a config object.
//
// No "server-only" guard: this module is pure over its inputs (a `Date` in,
// a string/boolean/Date[] out), same standing as calendarDates.ts and
// mealPlanDates.ts.

import {
  addDays,
  formatDayLabel,
  formatMonthTitle,
  formatWeekRange,
  isSameDay,
  isSameMonth,
  sundayOf,
} from "./mealPlanDates";
import { daysOfWeek } from "./calendarDates";
import type { CalendarPeriodView } from "./calendarViewVocabulary";

/**
 * The per-view differences the shell itself has to know about, as one row
 * per view rather than a ternary per difference (mission-10/CV0, completed
 * in mission-11/C1). Typed as a total `Record`, so a new name in
 * `CalendarPeriodView` is a compile error until it has a row here: a new
 * view ADDS A ROW, it never adds a branch to several separate expressions
 * that can then disagree.
 *
 * That claim was only two-fifths true when CV0 wrote it — `title`, `days`
 * and `isCurrentPeriod` were still ternaries ending in a catch-all
 * `: <day behaviour>`, so a new view compiled clean and silently rendered
 * a Day title over a single-day array (Captain's CV0 Ruling 2). C1 moved
 * all five here; C2 widened the union to six views against that check and
 * added the label as a sixth difference, in
 * `calendarViewVocabulary.VIEW_LABELS`, where the picker and the header's
 * switcher circle both read it.
 */
export type ViewConfig = {
  prevLabel: string;
  nextLabel: string;
  /**
   * How many DaySection placeholders the loading frame renders. Fixed by
   * `view` alone, never by `today` — that's what lets the frame below show
   * the right COUNT before `today` resolves. Month renders MonthGrid, and
   * every path to Month (`setView`, or the URL resync's `jumpTo`) requires
   * `today` already resolved, so its value here is never reached.
   */
  placeholderCount: number;
  /**
   * The header title. Takes `anchor` only: no view's title depends on what
   * day it is today, and a parameter nothing uses would be a promise the
   * rows don't keep. The component still withholds the title until `today`
   * resolves (the loading frame, below); widening this to `(anchor, today)`
   * is a one-line change if a view ever wants to say "Today" instead.
   */
  title: (anchor: Date) => string;
  /**
   * Which days the shell renders as DaySections. Month's row returns its
   * anchor day for honesty about where the period is pointed, but nothing
   * reads it: Month renders MonthGrid, which builds its own 42-day grid
   * from `anchor` (monthLayout.ts's `monthGridDays`).
   */
  days: (anchor: Date) => Date[];
  /** Whether the cursor is parked on the period containing `today` — what
   * greys out the header's Today circle. */
  isCurrentPeriod: (anchor: Date, today: Date) => boolean;
};

// Each row derives its own week start with `sundayOf(anchor)` rather than
// taking one computed once by the caller. It is a clone-and-setDate, so the
// repeat costs nothing measurable, and it keeps every row readable on its
// own terms — no row is handed a value only Week uses, and none has to deal
// with the `null` that a component-level `weekStart` carries while `today`
// is still resolving.
export const VIEW_CONFIG: Record<CalendarPeriodView, ViewConfig> = {
  week: {
    prevLabel: "Previous week",
    nextLabel: "Next week",
    placeholderCount: 7,
    title: (anchor) => formatWeekRange(sundayOf(anchor)),
    days: (anchor) => daysOfWeek(sundayOf(anchor)),
    isCurrentPeriod: (anchor, today) => isSameDay(sundayOf(anchor), sundayOf(today)),
  },
  day: {
    prevLabel: "Previous day",
    nextLabel: "Next day",
    placeholderCount: 1,
    title: (anchor) => formatDayLabel(anchor),
    days: (anchor) => [anchor],
    isCurrentPeriod: (anchor, today) => isSameDay(anchor, today),
  },
  month: {
    prevLabel: "Previous month",
    nextLabel: "Next month",
    placeholderCount: 1,
    title: (anchor) => formatMonthTitle(anchor),
    days: (anchor) => [anchor],
    isCurrentPeriod: (anchor, today) => isSameMonth(anchor, today),
  },
  // The three views the vocabulary names but nothing renders YET
  // (mission-11/C2). None is reachable: `BUILT_VIEWS`
  // (calendarViewVocabulary.ts) says false for all three, so the picker
  // never offers them and `parseViewParam` normalizes a URL naming one.
  // The rows exist because this Record is total, and because
  // `days`/`isCurrentPeriod` are already real facts about the period each
  // will show. What cannot be known before the renderer exists is marked
  // PROVISIONAL and belongs to the phase that builds it (CV3 Schedule, CV4
  // 3 Day, CV5 Year) — with a measurement, not a guess.
  schedule: {
    // PROVISIONAL, all three: Schedule has no period to page between (CV3
    // hides the arrows; the cursor's `step: 0` already refuses to move
    // it), its title tracks the month at the top of the scroll, and its
    // Today scrolls rather than pages.
    prevLabel: "Previous",
    nextLabel: "Next",
    placeholderCount: 7,
    title: (anchor) => formatMonthTitle(anchor),
    // CV3 builds its own rolling window from `anchor` (scheduleWindow.ts).
    days: (anchor) => [anchor],
    isCurrentPeriod: (anchor, today) => isSameDay(anchor, today),
  },
  threeDay: {
    prevLabel: "Previous 3 days",
    nextLabel: "Next 3 days",
    placeholderCount: 3,
    // PROVISIONAL: the first column's day. A real 3-day range label needs a
    // formatter for spans other than a week (`formatWeekRange` is
    // hard-wired to 7); adding one belongs with CV4's timeline.
    title: (anchor) => formatDayLabel(anchor),
    // Anchor-relative, never snapped to a boundary: Google's own 3 Day
    // behaviour, and exactly what calendar-v2.md gives CV4 for `columnDays`.
    days: (anchor) => [anchor, addDays(anchor, 1), addDays(anchor, 2)],
    isCurrentPeriod: (anchor, today) =>
      isSameDay(anchor, today) ||
      isSameDay(addDays(anchor, 1), today) ||
      isSameDay(addDays(anchor, 2), today),
  },
  year: {
    prevLabel: "Previous year",
    nextLabel: "Next year",
    // Year renders 12 mini month grids, not DaySections — unreachable for
    // the same reason Month's is.
    placeholderCount: 1,
    title: (anchor) => String(anchor.getFullYear()),
    days: (anchor) => [anchor],
    isCurrentPeriod: (anchor, today) => anchor.getFullYear() === today.getFullYear(),
  },
};
