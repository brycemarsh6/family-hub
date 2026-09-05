// The Calendar branch's view VOCABULARY — the six names Calendar v2 needs
// (Schedule / Day / 3 Day / Week / Month / Year), their labels, and which
// of them actually render today. Mission-11/CV1, contract C2.
//
// No "server-only" guard and no React: this module is pure over its inputs
// and holds nothing but data, which is what lets calendarPaging.ts (called
// from BOTH page.tsx on the server and the browser) read it without
// dragging a client module into the server graph. The same standing as
// calendarDates.ts / match.ts, for the same reason (STRUCTURE.md's "a lib
// module may skip server-only only when it is pure over its inputs").
//
// WHY THE TYPE LIVES HERE rather than in useCalendarPeriod.ts, where it
// started: calendarPaging.ts needs the vocabulary at RUNTIME (it gates
// "?view=" through BUILT_VIEWS below), and useCalendarPeriod.ts is a
// "use client" module. Importing a client module from the shared paging
// helper would leave page.tsx's server bundle holding client references
// instead of these plain objects. The dependency direction is now
// vocabulary (pure data) <- calendarPaging (pure) <- useCalendarPeriod
// (client cursor) <- useCalendarNavigation <- the components.
//
// THE UNION IS WIDER THAN WHAT RENDERS, ON PURPOSE. CV1's job was the
// vocabulary and the cursor math for all six views; the renderers land in
// CV3 (Schedule), CV4 (Day / 3 Day / Week timeline) and CV5 (Year).
// `BUILT_VIEWS` below is the one gate that keeps the two facts from
// disagreeing — see its own comment.

/**
 * Every view the Calendar's period cursor can express. Widened from
 * "day" | "week" | "month" in mission-11/C2.
 *
 * Adding a name here is deliberately expensive: it is a compile error
 * until it has a row in `VIEW_LABELS` and `BUILT_VIEWS` below, in
 * `VIEW_CURSOR` (useCalendarPeriod.ts — how it steps and what it anchors
 * on), in `VIEW_CONFIG` (CalendarViews.tsx — title, days, placeholder
 * count, arrow labels, isCurrentPeriod) and in loading.tsx's skeleton map.
 * That totality is the whole mechanism: a new view ADDS ROWS, it never
 * silently inherits another view's behaviour from a trailing `else`.
 */
export type CalendarPeriodView =
  | "schedule"
  | "day"
  | "threeDay"
  | "week"
  | "month"
  | "year";

/**
 * The one place a view's human label is written. Read by the picker
 * (`CALENDAR_VIEW_OPTIONS` below) AND by CalendarHeader's view-switcher
 * circle, which is the point: the header used to carry its own
 * `view === "week" ? "Week" : view === "day" ? "Day" : "Month"` chain, a
 * catch-all that would have labelled Schedule, 3 Day and Year "Month" the
 * moment the union widened — with no compile error, because a ternary
 * chain has no totality check (mission-11/C1's finding: its own contracted
 * fix, importing the real union into the header, removed the type mismatch
 * that had been acting as the tripwire).
 *
 * KEY ORDER IS THE PICKER'S ORDER — Google's own order, coarsest-to-
 * finest is deliberately NOT it. `CALENDAR_VIEW_OPTIONS` derives from
 * `Object.keys` here rather than from a second hand-written list, so a
 * view cannot be labelled and then forgotten by the picker.
 */
export const VIEW_LABELS: Record<CalendarPeriodView, string> = {
  schedule: "Schedule",
  day: "Day",
  threeDay: "3 Day",
  week: "Week",
  month: "Month",
  year: "Year",
};

/**
 * Which views have a renderer TODAY. The plan's "no stubs" rule
 * (calendar-v2.md) and the widened union are only compatible because of
 * this gate: the vocabulary, the cursor arms and the config rows are real,
 * testable DATA that each view will need, but nothing that lacks a
 * renderer may appear in the picker or be reachable from a URL.
 *
 * Both readers go through this one record — `parseViewParam`
 * (calendarPaging.ts) normalizes an unbuilt "?view=" back to the default
 * instead of routing to a missing renderer, and `CALENDAR_VIEW_OPTIONS`
 * below builds the picker from it — so the two can never disagree about
 * what exists. Each later phase flips exactly one entry to `true` in the
 * same commit that adds its renderer: CV3 schedule, CV4 threeDay, CV5
 * year (Day and Week move from the list renderer to the timeline in CV4
 * without changing this table).
 */
export const BUILT_VIEWS: Record<CalendarPeriodView, boolean> = {
  // mission-15/C4: Schedule's renderer (ScheduleView.tsx) ships in this
  // same commit. Day and Week deliberately STAY true here — the plan's
  // original text has them retired the moment Schedule lands, but the app
  // went LIVE before this phase shipped, and Bryce confirmed keeping both
  // (mission-15's Banner brief, D1): unbuilding either would leave
  // `DEFAULT_CALENDAR_VIEW` ("week", below) naming a view with no
  // renderer, which every rejected "?view=" and every stale stored
  // preference would then resolve to. They become hour timelines in CV4
  // rather than disappearing first.
  schedule: true,
  day: true,
  threeDay: false,
  week: true,
  month: true,
  year: false,
};

/** The view a request falls back to when nothing else decides — a missing
 * or unrecognised "?view=", an unbuilt view named in a URL, and the seed
 * `CalendarViews` hands `useCalendarNavigation`. Week, unchanged from the
 * value `parseViewParam` hard-coded before this contract. */
export const DEFAULT_CALENDAR_VIEW: CalendarPeriodView = "week";

/** The views that actually render, in label order. Derived, never
 * hand-listed. */
export const BUILT_CALENDAR_VIEWS: readonly CalendarPeriodView[] = (
  Object.keys(VIEW_LABELS) as CalendarPeriodView[]
).filter((view) => BUILT_VIEWS[view]);

/**
 * Narrows an arbitrary string (a "?view=" value, a localStorage entry) to
 * a view that both EXISTS and RENDERS, or `null`.
 *
 * Deliberately a `find` over the built list rather than `value in
 * BUILT_VIEWS`: the `in` operator walks the prototype chain, so
 * `"toString" in BUILT_VIEWS` is true and `BUILT_VIEWS["toString"]` is a
 * function — truthy — which would let `?view=toString` through. Six
 * entries make the scan free.
 */
export function toBuiltCalendarView(
  value: string | undefined | null,
): CalendarPeriodView | null {
  return BUILT_CALENDAR_VIEWS.find((view) => view === value) ?? null;
}

/** The picker's rows (`RadioSheet` in CalendarViews.tsx) — built views
 * only, labels from `VIEW_LABELS`. Nothing here can be tapped into a
 * missing renderer, and nothing that renders can be missing from it. */
export const CALENDAR_VIEW_OPTIONS: { value: CalendarPeriodView; label: string }[] =
  BUILT_CALENDAR_VIEWS.map((view) => ({ value: view, label: VIEW_LABELS[view] }));
