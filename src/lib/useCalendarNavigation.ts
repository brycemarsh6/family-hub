"use client";

// The Calendar branch's navigation cluster: which view is showing, which
// period it is pointed at, and the two-way sync between that cursor and the
// "?date=" / "?view=" URL parameters. Lifted out of CalendarViews.tsx
// (mission-10/CV0, contract C1), which sat at its 350-line cap with three
// more views, a Task entity and two gestures still to land on it. No
// "server-only" guard, matching useToday.ts / useCalendarPeriod.ts: this is
// browser-side plumbing, and everything it composes already is.
//
// This hook is the Calendar branch's ONLY reader of `useSearchParams` — the
// URL is the source of truth for where the calendar is pointed (mission-9/C6,
// "let's do it the way Google does it"), so exactly one module turns it into
// cursor state and exactly one module pushes it back. CV3's Schedule view
// takes its initial day as a PROP rather than adding a second reader.
//
// The two directions, unchanged in behaviour by the move:
//
//   LOCAL -> URL, imperatively, in each handler below (`step`/`goToToday`/
//   `setView`/`openDay`): compute the resulting Date with the same pure
//   functions useCalendarPeriod uses internally, update local state, push a
//   matching navigation, all in one function — see `navigateTo`.
//
//   URL -> LOCAL, via the one effect below: re-points the cursor with
//   `jumpTo` only when the URL names something local state doesn't already
//   match — a deep link, a reload, or Back/Forward.
//
// WHO DECIDES WHAT: the SERVER (calendar/page.tsx) only ever turns "?date="
// into a fetch WINDOW — a range, never a decided day (calendarPaging.ts's
// header). WHICH day is "today", and which day each event card renders
// under, is decided here in the browser, from useToday().

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToday } from "./useToday";
import {
  useCalendarPeriod,
  periodAnchor,
  stepPeriod,
  withView,
  type CalendarPeriodView,
} from "./useCalendarPeriod";
import { buildCalendarSearch, parseDateParam, parseViewParam } from "./calendarPaging";
import { isSameDay } from "./mealPlanDates";

/**
 * Reconciles the search string the URL just landed on against the pushes
 * this hook has made and not yet seen land, oldest first.
 *
 * `ours` true means the URL is one of our own in-flight pushes arriving late,
 * so the cursor must NOT be re-pointed at it — local state is already ahead
 * (the double-tap case). Every entry pushed BEFORE the matched one is dropped
 * along with it: they were superseded by it, so they can never legitimately
 * match a later URL, and leaving them behind is what would let a stale entry
 * swallow a genuine Back later on. A URL that is nobody's push is an external
 * navigation, which discards every in-flight push (`remaining: []`).
 *
 * Pure and exported so the rule is testable without a renderer — see
 * useCalendarNavigation.test.ts.
 */
export function consumePushedSearch(
  pushed: readonly string[],
  urlSearch: string,
): { ours: boolean; remaining: string[] } {
  const index = pushed.indexOf(urlSearch);
  if (index === -1) return { ours: false, remaining: [] };
  return { ours: true, remaining: pushed.slice(index + 1) };
}

export type CalendarNavigation = {
  view: CalendarPeriodView;
  /** The day the current period is anchored to — `null` only while
   * `today` itself hasn't resolved (SSR and the first client render). */
  anchor: Date | null;
  /** The browser's own "today" (useToday.ts), `null` on the same two
   * renders as `anchor`. Read here so the Calendar branch has exactly one
   * useToday() call site, as it did before this extraction. */
  today: Date | null;
  /** Move one period and ask the server for a window centred where it lands. */
  step: (direction: 1 | -1) => void;
  goToToday: () => void;
  setView: (view: CalendarPeriodView) => void;
  /** Opens `day` (e.g. one of Month's 42 grid days) in Day view. */
  openDay: (day: Date) => void;
};

export function useCalendarNavigation(initialView: CalendarPeriodView): CalendarNavigation {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = useToday();
  const { view, anchor, period, setView, step, goToToday, jumpTo } =
    useCalendarPeriod<CalendarPeriodView>(initialView, today);

  // Keyed on VALUES from `searchParams`/`today`, never those objects
  // (mission-9/C8) — `useToday()` returns a FRESH `Date` each call, so
  // depending on the object reran the effect below every render, including
  // after a step had moved state but before `router.push` committed: it saw
  // a "mismatch" against the still-stale URL and jumped back, so two taps
  // moved one period.
  const dateParam = searchParams.get("date");
  const viewParam = searchParams.get("view");
  const todayTime = today === null ? null : today.getTime();

  // THE PUSH GUARD (Vision's compare-and-clear design, mission-9/C8 pass 4;
  // implemented here rather than in CalendarViews.tsx because both K2 gates
  // ruled the cluster had to be extracted first).
  //
  // C8 shipped a pending-navigation COUNTER and Vision proved it drifts: a
  // push producing no search-param change never runs the effect, so its
  // increment is never consumed, and each stale one swallows a later Back.
  // C9 removed it rather than replacing it. This is the replacement:
  //
  //   (a) `navigateTo` computes the search string it is about to push and
  //       returns WITHOUT pushing when that equals where the calendar is
  //       already headed. A no-op navigation is nothing to guard, and this
  //       kills the counter's own trigger outright — re-picking the
  //       already-selected view (RadioSheet fires onSelect on the checked
  //       row) now pushes nothing at all, so it can't leave a history entry
  //       to swallow.
  //
  //   (b) the counter becomes this ordered list of the exact search strings
  //       we pushed. In the effect: in sync -> clear; the URL is one of ours
  //       -> consume it (and everything older) and skip; otherwise -> clear
  //       and `jumpTo`, since an external navigation discards every in-flight
  //       push anyway.
  //
  // "Where the calendar is already headed" is the newest un-reconciled push
  // if there is one, and the URL otherwise — NOT the URL alone. That matters
  // for Next-then-Prev tapped inside one push's flight: the URL still names
  // the period Prev is returning to, so comparing against it would skip the
  // Prev push and leave the cursor and the URL disagreeing with nothing left
  // in flight to fix it.
  //
  // RESIDUAL, stated rather than hidden: a push the router discards (a newer
  // one supersedes it before it commits) leaves its string in the list until
  // the next sync or the next mismatch clears it. While it sits there a Back
  // to that exact search would be consumed as "ours" and skipped. It is much
  // narrower than the counter's drift — guard (a) means only a real,
  // superseded navigation can leave one, where the counter leaked on every
  // re-pick — and any in-sync render empties the list.
  const pushed = useRef<string[]>([]);

  // The search string the URL currently names, normalized through the same
  // parse/build pair the effect uses, so "?view=day" and
  // "?date=<today>&view=day" compare equal — they name the same day.
  const currentSearch =
    todayTime === null
      ? null
      : buildCalendarSearch(parseViewParam(viewParam), parseDateParam(dateParam) ?? new Date(todayTime));

  function navigateTo(nextView: CalendarPeriodView, nextAnchor: Date) {
    const search = buildCalendarSearch(nextView, nextAnchor);
    const heading = pushed.current.at(-1) ?? currentSearch;
    if (search === heading) return;
    pushed.current = [...pushed.current, search];
    router.push(`/calendar?${search}`);
  }

  useEffect(() => {
    if (todayTime === null) return;
    const targetView = parseViewParam(viewParam);
    const targetAnchor = parseDateParam(dateParam) ?? new Date(todayTime);
    const inSync = anchor !== null && view === targetView && isSameDay(anchor, targetAnchor);
    if (inSync) {
      pushed.current = [];
      return;
    }
    const { ours, remaining } = consumePushedSearch(
      pushed.current,
      buildCalendarSearch(targetView, targetAnchor),
    );
    pushed.current = remaining;
    if (!ours) jumpTo(targetAnchor, targetView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateParam, viewParam, todayTime]);

  // `nextPeriod`/`nextAnchor` below use the SAME pure functions the cursor
  // uses internally, rather than waiting a render to read `anchor` back, so
  // the navigation URL can be built synchronously in the same handler.
  function handleStep(direction: 1 | -1) {
    if (today === null) return;
    const nextPeriod = stepPeriod(period, direction);
    const nextAnchor = periodAnchor(nextPeriod, today);
    step(direction);
    navigateTo(nextPeriod.view, nextAnchor);
  }

  function handleToday() {
    if (today === null) return;
    goToToday();
    navigateTo(view, today);
  }

  function handleSetView(nextView: CalendarPeriodView) {
    if (today === null) {
      setView(nextView);
      return;
    }
    const nextPeriod = withView(period, nextView, today);
    const nextAnchor = periodAnchor(nextPeriod, today);
    setView(nextView);
    navigateTo(nextView, nextAnchor);
  }

  function openDay(day: Date) {
    if (today === null) return;
    jumpTo(day, "day");
    navigateTo("day", day);
  }

  return {
    view,
    anchor,
    today,
    step: handleStep,
    goToToday: handleToday,
    setView: handleSetView,
    openDay,
  };
}
