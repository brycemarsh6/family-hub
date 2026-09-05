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
//   URL -> LOCAL, via two effects below: the resync effect re-points the
//   cursor with `jumpTo` when the URL names something local state doesn't
//   already match — a deep link, a reload, or Back/Forward — and the settle
//   effect reconciles again once the router reports it has finished, which
//   is the one moment the first effect cannot see (see the guard's (c)).
//
// WHO DECIDES WHAT: the SERVER (calendar/page.tsx) only ever turns "?date="
// into a fetch WINDOW — a range, never a decided day (calendarPaging.ts's
// header). WHICH day is "today", and which day each event card renders
// under, is decided here in the browser, from useToday().

import { useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToday } from "./useToday";
import { useCalendarPeriod, periodAnchor, stepPeriod, withView } from "./useCalendarPeriod";
import { buildCalendarSearch, parseDateParam, parseViewParam } from "./calendarPaging";
import type { CalendarPeriodView } from "./calendarViewVocabulary";
import { useLastCalendarView, writeLastCalendarView } from "./lastCalendarView";
import { useCanonicalCalendarUrl } from "./useCanonicalCalendarUrl";
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
  /**
   * `preserveScroll` (mission-15/C11): Next's documented default is to
   * scroll to the top of the page on every `router.push` — correct for
   * Week/Day/Month, where paging to a new period should land at its top,
   * but wrong for Schedule's Today, which has already scrolled the reader
   * to today's row (ScheduleView's own re-armed effect, C10) before this
   * slow `force-dynamic` navigation resolves and undoes it. Only Schedule's
   * fallback-to-navigate path (CalendarViews.tsx's handleToday) sets it;
   * every other caller is unaffected by its mere existence.
   */
  goToToday: (options?: { preserveScroll?: boolean }) => void;
  setView: (view: CalendarPeriodView) => void;
  /** Opens `day` (e.g. one of Month's 42 grid days) in Day view. */
  openDay: (day: Date) => void;
};

/**
 * `defaultView` is the seed: the view the cursor starts on, and the answer when
 * neither the URL nor this device's stored preference has one — see
 * `fallbackView` below for when the preference gets its say.
 */
export function useCalendarNavigation(defaultView: CalendarPeriodView): CalendarNavigation {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = useToday();
  const { view, anchor, period, setView, step, goToToday, jumpTo } =
    useCalendarPeriod<CalendarPeriodView>(defaultView, today);

  // Keyed on VALUES from `searchParams`/`today`, never those objects
  // (mission-9/C8) — `useToday()` returns a FRESH `Date` each call, so
  // depending on the object reran the effect below every render, including
  // after a step had moved state but before `router.push` committed: it saw
  // a "mismatch" against the still-stale URL and jumped back, so two taps
  // moved one period.
  const dateParam = searchParams.get("date");
  const viewParam = searchParams.get("view");
  const todayTime = today === null ? null : today.getTime();

  // What a MISSING (or unbuilt) "?view=" means on this device: the last view
  // its owner picked, else `defaultView`. Read LIVE again (C3 froze it per
  // mount; useCanonicalCalendarUrl.ts says why that was not enough), which is
  // safe because the effect below rewrites such a URL the moment `today`
  // resolves: this value decides what gets WRITTEN, and afterwards no entry is
  // left whose meaning a later store write could change. Absent from both
  // effects' dependency lists deliberately — `todayTime` flipping null -> real
  // is the render it resolves on, so they see it the first time they have
  // anything to reconcile, while listing it would re-run the resync effect
  // mid-push against a URL still naming the old view: CV0's C8/C9 drift.
  const fallbackView = useLastCalendarView() ?? defaultView;

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
  //   (c) the SETTLE effect below. (b) alone still inherited the counter's
  //       real defect, because both reconcile only when the URL's PARAMS
  //       change: two fast taps in opposite directions (Next then Prev, the
  //       ordinary "wrong way, correct it" double-tap) push two searches that
  //       cancel out, so the URL never changes, so the effect never runs, so
  //       both strings sit in the list forever — and the next Back that lands
  //       on one of them is consumed as "ours" and swallowed, leaving the
  //       cursor and the URL disagreeing with nothing in flight to fix it.
  //       Reproduced against the real app (mission-10/C4, Vision pass 1) and
  //       confirmed to be a regression against the pre-extraction build.
  //       The missing signal is "the router has finished", which is not the
  //       same event as "the params changed" — see the settle effect.
  const pushed = useRef<string[]>([]);

  // Each push is made inside a transition purely so this flag exists.
  // MEASURED, not assumed (the Next 16.2.12 / React 19.2.4 docs are silent on
  // it): `router.push` called inside `startTransition` keeps `isPending` true
  // until the navigation actually commits — a slow single Next holds it true
  // from the click to the very render where `dateParam` changes, and a fast
  // Next-then-Prev whose params cancel out holds it true across BOTH pushes
  // and then drops it on a render where the params never changed at all.
  // That last edge is precisely the one (b) could not see.
  const [isNavigating, startNavigation] = useTransition();

  // The search string the URL currently names, normalized through the same
  // parse/build pair the effect uses, so "?view=day" and
  // "?date=<today>&view=day" compare equal — they name the same day.
  const currentSearch =
    todayTime === null
      ? null
      : buildCalendarSearch(
          parseViewParam(viewParam, fallbackView),
          parseDateParam(dateParam) ?? new Date(todayTime),
        );

  function navigateTo(
    nextView: CalendarPeriodView,
    nextAnchor: Date,
    options?: { preserveScroll?: boolean },
  ) {
    const search = buildCalendarSearch(nextView, nextAnchor);
    const heading = pushed.current.at(-1) ?? currentSearch;
    if (search === heading) return;
    pushed.current = [...pushed.current, search];
    startNavigation(() => {
      // `scroll: false` only when a caller opts in (see goToToday's own
      // comment) — every other push keeps Next's default top-of-page scroll.
      router.push(
        `/calendar?${search}`,
        options?.preserveScroll ? { scroll: false } : undefined,
      );
    });
  }

  // What the URL currently names, and whether the cursor is already there.
  // Read by BOTH effects below so they can never drift apart on the one
  // question they both have to answer the same way. Recomputed per call
  // rather than memoised because `targetAnchor` is a fresh Date every time —
  // keeping it out of any dependency array is the same C8 value-keying rule
  // the effect deps follow.
  function urlTarget(): { view: CalendarPeriodView; anchor: Date } | null {
    if (todayTime === null) return null;
    return {
      view: parseViewParam(viewParam, fallbackView),
      anchor: parseDateParam(dateParam) ?? new Date(todayTime),
    };
  }

  function isInSyncWith(target: { view: CalendarPeriodView; anchor: Date }) {
    return anchor !== null && view === target.view && isSameDay(anchor, target.anchor);
  }

  useEffect(() => {
    const target = urlTarget();
    if (target === null) return;
    if (isInSyncWith(target)) {
      pushed.current = [];
      return;
    }
    const { ours, remaining } = consumePushedSearch(
      pushed.current,
      buildCalendarSearch(target.view, target.anchor),
    );
    pushed.current = remaining;
    if (!ours) jumpTo(target.anchor, target.view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateParam, viewParam, todayTime]);

  // THE SETTLE EFFECT — ordered after the resync effect on purpose, so that on
  // a render where both run, the reconciliation above has already had its say.
  //
  // Nothing is in flight here, so nothing is left to guard: the list is
  // emptied unconditionally (that is the whole fix — a push whose params
  // cancelled another one out can no longer sit there and swallow a later
  // Back), and the URL, being the source of truth, wins any disagreement.
  //
  // While `isNavigating` is TRUE this does nothing, which is what keeps the
  // double-tap fix intact: the second tap's push starts its own transition
  // before the first one's commit renders, so the flag never dips between two
  // taps of a burst, and the resync effect's "this URL is our own late push,
  // don't follow it" rule is still the one in charge.
  //
  // RESIDUAL, stated rather than hidden: a navigation that never settles at
  // all (a push the router never resolves) leaves `isNavigating` true and the
  // list unemptied — the behaviour this fix replaced, no worse. Nothing
  // observed doing that; every burst measured settled within ~300ms.
  useEffect(() => {
    if (isNavigating) return;
    const target = urlTarget();
    if (target === null) return;
    pushed.current = [];
    if (isInSyncWith(target)) return;
    jumpTo(target.anchor, target.view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNavigating, dateParam, viewParam, todayTime]);

  // Keeps the URL honest: a URL naming no built view is rewritten, in place,
  // to name the one it actually renders — see useCanonicalCalendarUrl.ts for
  // the whole reason this exists. Called AFTER the two effects above so its
  // own effect is registered last: it WRITES the URL they READ, so both have
  // already acted on this render's view of it before the correction lands.
  useCanonicalCalendarUrl(viewParam, dateParam, todayTime, urlTarget());

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

  function handleToday(options?: { preserveScroll?: boolean }) {
    if (today === null) return;
    goToToday();
    navigateTo(view, today, options);
  }

  function handleSetView(nextView: CalendarPeriodView) {
    // The one write of the per-device preference: the only path a human
    // deliberately chooses a view on. It is for the NEXT open — every URL
    // already in this session's history names its own view outright by now
    // (useCanonicalCalendarUrl.ts), so this write has nothing behind it left
    // to reinterpret. Written before the early return below so a pick made
    // while `today` is still resolving is still remembered.
    writeLastCalendarView(nextView);
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
