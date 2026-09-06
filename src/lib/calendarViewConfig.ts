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
// mission-17/C3 — the render switch's SELECTION (which family of component
// a view uses) now lives here too, as the `renderer` field below. What
// stays in CalendarViews.tsx is the switch's BODY — the actual JSX for each
// renderer — because `src/lib/` must not import from `src/components/`
// (STRUCTURE.md's layout map), so this record cannot hold a component
// reference, only a string tag the switch matches on. That switch is
// exhaustive over `CalendarRenderer` (a `never`-typed default), so a new
// renderer value here is a compile error in CalendarViews.tsx until it has
// a case — the same totality guarantee this whole file already gives
// `title`/`days`/`isCurrentPeriod`, extended to "which component draws
// this view" instead of stopping short of it. See CalendarRenderer's own
// comment for why this was a live gap.
//
// mission-17/C4 — the `"timeline"` renderer lands: Day, 3 Day and Week all
// switch their row from `"daySection"` to it in this commit, and
// `BUILT_VIEWS.threeDay` (calendarViewVocabulary.ts) flips to `true` at the
// same time, so the vocabulary and the renderers agree completely for the
// first time since CV1. `formatThreeDayRange`, below, is the one other loose
// end this reachability change closes — see its own comment.
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
 * The families of component a view can render. A string tag, not a
 * component reference — `src/lib/` may not import from `src/components/`
 * (STRUCTURE.md), so the actual `MonthGrid`/`ScheduleView`/`DaySection`/
 * `TimelineGrid` elements stay in CalendarViews.tsx's switch. `year` is the
 * one view still sharing `"daySection"` today — a real fact about the
 * current app (its `days(anchor)` returns one entry, rendered as a single
 * plain `DaySection`), not a placeholder — because CV5 is what gives it its
 * own 12-mini-grid renderer. `day`, `threeDay` and `week` moved OFF that
 * shared tag in mission-17/C4: they render `TimelineGrid` now, an hour
 * timeline rather than a plain agenda list, so `"timeline"` is a genuinely
 * different family, not an alias for `"daySection"` under a new name.
 * Widening this union is a compile error in CalendarViews.tsx's switch
 * until every case is handled — see that switch's own `never`-typed
 * default.
 */
export type CalendarRenderer = "month" | "schedule" | "daySection" | "timeline";

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
 * switcher circle both read it. mission-17/C3 closes the remaining two
 * gaps Captain's ruling named: `pinned` (CalendarHeader.tsx's own
 * `const pinned = view === "schedule"`) and `renderer` (CalendarViews.tsx's
 * render switch) were both still inline `view === "member"` tests beside
 * this record rather than rows inside it — tolerable only while `threeDay`
 * and `year` stayed unreachable, and CV4 is what makes `threeDay`
 * reachable (see `calendarViewVocabulary.ts`'s `BUILT_VIEWS`).
 */
export type ViewConfig = {
  prevLabel: string;
  nextLabel: string;
  /**
   * Which family of component this view renders — see `CalendarRenderer`'s
   * own comment. Read by CalendarViews.tsx's switch, never branched on
   * inline anywhere else.
   */
  renderer: CalendarRenderer;
  /**
   * Whether CalendarHeader pins itself (`position: sticky`) below the app
   * header instead of scrolling away with the page. Today this is true for
   * Schedule alone — it is the one view whose content scrolls far enough,
   * and long enough, for a persistent header to earn its keep — but it is
   * a row here, not a `view === "schedule"` expression in
   * CalendarHeader.tsx, so a future view that also wants this has
   * somewhere to say so instead of silently inheriting `false`.
   */
  pinned: boolean;
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

/** Short month name via `Intl`, formatted against the LOCAL calendar fields
 * of a plain calendar-component `Date` (no `timeZone` option, so it reads
 * the runtime's own default zone — the same convention `TimelineGrid.tsx`'s
 * `HOUR_LABEL_FORMATTER` already uses) — a self-contained, one-line
 * substitute for `mealPlanDates.ts`'s own (unexported) `MONTH_NAMES` array,
 * which this file is not allowed to import (off this contract's boundary).
 * Module-level, not per-call, matching that same file's own `Intl` instance
 * — `DateTimeFormat` construction is real work worth doing once. */
const SHORT_MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short" });

/** "Sep 9–11" / "Aug 30 – Sep 1" — 3 Day's own range label, mission-17/C4.
 * The exact same shape as `formatWeekRange` (mealPlanDates.ts) — same-month
 * gets the tight en dash, a month crossing gets the wider one plus both
 * month names — deliberately re-implemented locally rather than
 * generalizing that function to an arbitrary span: `formatWeekRange` is off
 * this contract's boundary, and widening a shared, already-tested function's
 * signature to serve a single new caller is a bigger change than a five-line
 * local copy for a genuinely different view. */
function formatThreeDayRange(anchor: Date): string {
  const end = addDays(anchor, 2);
  const startMonth = SHORT_MONTH_FORMATTER.format(anchor);
  const endMonth = SHORT_MONTH_FORMATTER.format(end);
  return startMonth === endMonth
    ? `${startMonth} ${anchor.getDate()}–${end.getDate()}`
    : `${startMonth} ${anchor.getDate()} – ${endMonth} ${end.getDate()}`;
}

export const VIEW_CONFIG: Record<CalendarPeriodView, ViewConfig> = {
  week: {
    prevLabel: "Previous week",
    nextLabel: "Next week",
    // mission-17/C4 — was "daySection" (a plain agenda list); Week now
    // renders `TimelineGrid`, the hour timeline. `placeholderCount` below is
    // unaffected: it still only feeds CalendarViews.tsx's `today === null`
    // guard, which runs BEFORE the renderer switch and renders the same
    // DaySection-shaped loading rows it always has — that transient frame
    // is governed by `today` resolving, not by which renderer is about to
    // take over once it does.
    renderer: "timeline",
    pinned: false,
    placeholderCount: 7,
    title: (anchor) => formatWeekRange(sundayOf(anchor)),
    days: (anchor) => daysOfWeek(sundayOf(anchor)),
    isCurrentPeriod: (anchor, today) => isSameDay(sundayOf(anchor), sundayOf(today)),
  },
  day: {
    prevLabel: "Previous day",
    nextLabel: "Next day",
    // mission-17/C4 — same switch as Week's row above, same reasoning.
    renderer: "timeline",
    pinned: false,
    placeholderCount: 1,
    title: (anchor) => formatDayLabel(anchor),
    days: (anchor) => [anchor],
    isCurrentPeriod: (anchor, today) => isSameDay(anchor, today),
  },
  month: {
    prevLabel: "Previous month",
    nextLabel: "Next month",
    renderer: "month",
    pinned: false,
    placeholderCount: 1,
    title: (anchor) => formatMonthTitle(anchor),
    days: (anchor) => [anchor],
    isCurrentPeriod: (anchor, today) => isSameMonth(anchor, today),
  },
  // Originally the three views the vocabulary named but nothing rendered
  // (mission-11/C2) — mission-15/C4 built Schedule's renderer and flipped
  // `BUILT_VIEWS.schedule` to true; mission-17/C4 did the same for 3 Day
  // (below). Year is the one left — `BUILT_VIEWS.year`
  // (calendarViewVocabulary.ts) still says false, so the picker never
  // offers it and `parseViewParam` normalizes a URL naming it. Its row
  // exists because this Record is total, and because `days`/
  // `isCurrentPeriod` are already real facts about the period it will
  // show. What cannot be known before a renderer exists is marked
  // PROVISIONAL and belongs to the phase that builds it (CV5) — with a
  // measurement, not a guess.
  schedule: {
    // SETTLED, mission-15/C4 (was PROVISIONAL since CV1). Schedule has no
    // period to page between — the cursor's `step: 0` already refuses to
    // move it — so `CalendarHeader`'s `showArrows` hides the prev/next
    // buttons entirely for this view; `prevLabel`/`nextLabel` below are
    // real strings anyway (never empty) so nothing about the type needs an
    // escape hatch, and so a future accessibility fallback that briefly
    // shows them isn't stuck with placeholders.
    prevLabel: "Previous",
    nextLabel: "Next",
    renderer: "schedule",
    // The one `true` row. Schedule is the one view whose content scrolls
    // far enough, and long enough, for a persistent header to earn its
    // keep — see `pinned`'s own comment on `ViewConfig` above.
    pinned: true,
    placeholderCount: 7,
    // mission-16/C4 — this function's return VALUE is no longer what
    // Schedule's header actually displays. CalendarHeader.tsx now renders
    // a portal target for Schedule instead of this string (see
    // SCHEDULE_TITLE_SLOT_ID's own comment in that file), fed by
    // ScheduleView.tsx's own "which month is topmost on screen" answer —
    // exactly the scroll-driven label the comment this replaces said
    // wasn't built and wasn't going to be. What this function still does
    // is decide whether the title is null vs. resolved (the
    // loading-placeholder check in CalendarHeader.tsx needs SOME value
    // here, not none); its concrete text is otherwise unused for schedule
    // specifically. Kept computing the anchor's real month anyway, rather
    // than returning e.g. `""`, since an honest (if now-overridden) value
    // is a stranger thing to read here than a placeholder would be.
    //
    // CORRECTED AGAIN, mission-16/C4 (previously corrected mission-15/C8):
    // that earlier correction was itself an overclaim of this exact
    // project's own named defect class. It said the sticky month headers
    // "do NOT actually stick" because of globals.css's `overflow-x:
    // hidden` rule, and called that "a pre-existing, whole-app fact this
    // mission did not introduce and is not the one to fix" — true when
    // written, false now. `overflow-x: clip` (globals.css, this same
    // contract) removes that rule's side effect without losing its job
    // (still clips a stray wide element, per that file's own comment) —
    // every `position: sticky` element in the app, including this file's
    // own now-moot claim about week-range dividers standing in for a live
    // label, actually sticks.
    title: (anchor) => formatMonthTitle(anchor),
    // CV3 builds its own rolling window from `anchor` (scheduleWindow.ts).
    days: (anchor) => [anchor],
    // SETTLED, mission-15/C8 (was "a known, accepted limitation" through
    // C4). This field is REQUIRED by the total Record type above but no
    // longer READ for schedule: CalendarViews.tsx now computes
    // isCurrentPeriod for this one view from ScheduleView's own live scroll
    // position (whether TODAY's row is actually visible on screen), not
    // from the anchor — an anchor that scrolling deliberately never moves
    // (D2/D3) made this exact comparison true FOREVER the instant the
    // reader scrolled anywhere at all, which permanently disabled the
    // header's Today circle while the screen showed a day months away.
    // Kept here, unchanged in VALUE, only because every row of this Record
    // needs one — `isSameDay(anchor, today)` remains an honest (if now
    // unused by the header) answer to "is the URL's own anchor today."
    isCurrentPeriod: (anchor, today) => isSameDay(anchor, today),
  },
  threeDay: {
    prevLabel: "Previous 3 days",
    nextLabel: "Next 3 days",
    // SETTLED, mission-17/C4 (was PROVISIONAL through CV1–C3): `BUILT_VIEWS
    // .threeDay` (calendarViewVocabulary.ts) is `true` as of this same
    // commit, so this row is reachable through the picker and a URL now —
    // it renders `TimelineGrid`, the same hour timeline Day/Week just
    // switched to, not a third implementation.
    renderer: "timeline",
    pinned: false,
    placeholderCount: 3,
    // SETTLED, mission-17/C4: a real 3-day range label, via the local
    // `formatThreeDayRange` above — see its own comment for why that's a
    // small local copy of `formatWeekRange`'s shape rather than a
    // generalization of that (off-boundary) function.
    title: (anchor) => formatThreeDayRange(anchor),
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
    // PROVISIONAL: Year is meant to render 12 mini month grids, not
    // DaySections, but `BUILT_VIEWS.year` is false (unreachable through the
    // picker or a URL) and no such renderer exists yet — CV5's job. Tagged
    // `"daySection"` for now because that is what this row's `days`
    // (`[anchor]`, one entry) currently produces if ever reached directly,
    // matching pre-C3 behaviour exactly rather than inventing a value
    // nothing renders.
    renderer: "daySection",
    pinned: false,
    placeholderCount: 1,
    title: (anchor) => String(anchor.getFullYear()),
    days: (anchor) => [anchor],
    isCurrentPeriod: (anchor, today) => anchor.getFullYear() === today.getFullYear(),
  },
};
