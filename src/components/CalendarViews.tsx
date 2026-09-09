"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarSheets } from "./CalendarSheets";
import { DaySection } from "./DaySection";
import { MonthChips } from "./MonthChips";
import { MonthGrid } from "./MonthGrid";
import { ScheduleView, type ScheduleViewHandle } from "./ScheduleView";
import { TimelineGrid } from "./TimelineGrid";
import { YearView } from "./YearView";
import type { TimelineDragPayload } from "./TimelineDayColumn";
import { useCalendarNavigation } from "@/lib/useCalendarNavigation";
import { usePageSwipe } from "@/lib/usePageSwipe";
import { useLongPressDrag } from "@/lib/useLongPressDrag";
import {
  minutesFromPixels,
  snapMinutes,
  clampStartMinutes,
  minutesOfDayToDate,
  columnIndexFromOffset,
  columnDateForIndex,
} from "@/lib/timelineDrag";
import { moveCalendarEvent } from "@/app/actions/calendar";
import { buildCalendarSearch } from "@/lib/calendarPaging";
import { DEFAULT_CALENDAR_VIEW } from "@/lib/calendarViewVocabulary";
import { VIEW_CONFIG } from "@/lib/calendarViewConfig";
import { toLocalDateString } from "@/lib/mealPlanDates";
import { useNowMinute } from "@/lib/useNowMinute";
import { useAppHeaderHeight } from "@/lib/appChrome";
import type { CalendarEventView, CalendarPersonView, CalendarTaskView } from "@/lib/types";

// mission-20 (CD1)/C5 — the optimistic move + its own inline error, wired up
// here rather than in TimelineGrid.tsx/TimelineDayColumn.tsx: this file is
// the one place that already holds `events` as a prop and can compare a
// resolved drag against the real `days` (config.days(anchor)) the timeline
// itself renders. `applyDragMove` is a pure `(events, change) => events[]`,
// the exact PantryList.tsx:66-73 shape (`useOptimistic(items, applyChange)`
// + `useTransition`) — a rejected drop calls no `refreshCalendarViews()`, so
// the transition settles back onto the SAME `events` prop it started from
// and the optimistic value is discarded automatically; nothing here needs
// to manually "undo" the change.
type DragMoveChange = { id: string; startAt: Date; endAt: Date };

function applyDragMove(
  events: CalendarEventView[],
  change: DragMoveChange,
): CalendarEventView[] {
  return events.map((event) =>
    event.id === change.id
      ? { ...event, startAt: change.startAt, endAt: change.endAt }
      : event,
  );
}

// CalendarEventView / CalendarPersonView live in src/lib/types.ts, not here
// — this file, DaySection.tsx, and EventCard.tsx all import them from that
// one shared place rather than from one another, which is what keeps the
// module graph free of the component-to-component cycle mission-8's
// Captain gate flagged (B2). Import from "@/lib/types" directly rather than
// re-exporting from here, or the cycle comes right back (this file already
// imports the DaySection *component*, so a type re-export pointed the other
// way would recreate exactly the loop this fix removes).

// ViewConfig / VIEW_CONFIG (title, days, isCurrentPeriod per view) moved
// to src/lib/calendarViewConfig.ts in mission-14/C1 — see that file's own
// header for why (coverage: it's per-view date logic a .tsx file the test
// glob can't reach). mission-17/C3: the switch's SELECTION (which
// `config.renderer` tag maps to which component) now lives there too, as a
// total record — this file just holds the switch's BODY (the actual JSX),
// since `src/lib/` can't import a component. renderPeriodContent, below,
// is that switch.

type CalendarViewsProps = {
  events: CalendarEventView[];
  /**
   * mission-14/C2 — page.tsx's parallel `db.task.findMany`, converted the
   * same way `events` is. mission-14/C3: filtered per day and handed to
   * DaySection for Week/Day, and passed straight through to MonthGrid for
   * Month (which does its own per-row conversion — see that component).
   * Per D1 (mission-14's Banner brief), this is deliberately its OWN prop,
   * not folded into `events` — see CalendarTaskView's own comment in
   * src/lib/types.ts for why a union would force a discriminant into three
   * other components for no benefit yet.
   */
  tasks: CalendarTaskView[];
  /**
   * The full household roster — page.tsx's third parallel query
   * (mission-14/C5), threaded straight to TaskDetailSheet's edit view
   * (TaskForm, mission-14/C6) so a task's People field is a real
   * reassignable picker rather than a static echo of who's currently on
   * it. Unused by every other branch below; passed through, not read here.
   */
  people: CalendarPersonView[];
  /**
   * True for admin/parent sessions, computed server-side in page.tsx —
   * gates the header's Add circle (mission-9/C5, Strange's B1 remedy) and
   * the detail sheet's Edit/⋯. Per STRUCTURE.md, hiding UI is never the
   * real gate — the write actions in actions/calendar.ts check this
   * independently, so a kid whose browser somehow rendered these controls
   * anyway would still be refused server-side.
   */
  canManage: boolean;
  /**
   * The bounds of page.tsx's one server fetch — built (mission-9/C6) from
   * the "?date=" param useCalendarNavigation keeps in sync, not a fixed span
   * around the server's clock (K1's original wall design; calendarPaging.ts's
   * header). Used ONLY to decide whether a day was actually fetched
   * (DaySection's `NotLoadedCard`, MonthGrid's `notLoaded`), never to
   * disable paging — now rare rather than routine, as intended.
   */
  windowStart: Date;
  windowEnd: Date;
};

/**
 * The Calendar branch's client-side shell: the header, one view, and the
 * sheets. Everything about WHERE the calendar is pointed — the period
 * cursor, the "?date="/"?view=" URL sync, and the push guard that keeps two
 * fast taps from cancelling each other — lives in
 * `useCalendarNavigation` (src/lib/useCalendarNavigation.ts), extracted
 * there in mission-10/CV0 so that adding a view means adding a row to
 * VIEW_CONFIG (src/lib/calendarViewConfig.ts) rather than another handler
 * here.
 *
 * `today` comes from that hook (which reads useToday()), and is `null`
 * during SSR and the first client render — every value below that would
 * otherwise depend on "which day is it" stays null too, on purpose, rather
 * than guessing. That's what lets the header and DaySection render an
 * honestly-loading frame instead of a wrong one.
 *
 * `events` is the page's one server fetch (a window around whatever period
 * the URL names — see page.tsx's own comment); which specific days to show,
 * and which of `events` land on each one, is computed here.
 */
export function CalendarViews({
  events,
  tasks,
  people,
  canManage,
  windowStart,
  windowEnd,
}: CalendarViewsProps) {
  // For the Add sheet's own destinations only — the calendar's own paging
  // navigations all go through useCalendarNavigation.
  const router = useRouter();
  // mission-19/C3 — `jumpToDay` (mission-19/C2) is what MonthJumpSheet's
  // day taps call: jumps to an arbitrary day while keeping the CURRENT
  // view, unlike `openDay` (Month's own day-cell tap), which always forces
  // Day view.
  const { view, anchor, today, step, goToToday, setView, openDay, jumpToDay } =
    useCalendarNavigation(DEFAULT_CALENDAR_VIEW);

  // mission-20 (CD1)/C5 — moved up (used to sit right before the render
  // switch) so `days` is in scope for `onDragEnd`'s closure below, rather
  // than a forward reference. Only depends on `view`/`anchor`, already
  // destructured above.
  const config = VIEW_CONFIG[view];
  // The null-guards below are about `today` not having resolved yet — NOT
  // about which view is active, which is why they stay here rather than
  // moving into VIEW_CONFIG (every row would carry the same null check).
  // `anchor` is null exactly while `today` is (useCalendarPeriod derives one
  // from the other), so guarding both is belt-and-braces, not two cases.
  const days = anchor === null ? [] : config.days(anchor);

  // mission-17/C4 — TimelineGrid's two dependency-injected values (see that
  // file's own header for why they're props rather than internal hooks).
  // Called unconditionally, same convention as `today` above: cheap even on
  // the four out of six views that never read them, and it keeps every hook
  // call in this component at the top level regardless of which view is
  // active. `now` is a SEPARATE useSyncExternalStore value from `today` —
  // both are `null` on SSR and the first client render, but nothing
  // guarantees they resolve on the exact same tick, so `renderPeriodContent`'s
  // own "timeline" branch guards it on its own rather than assuming
  // `today !== null` covers it too.
  const now = useNowMinute();
  const chromeOffsetPx = useAppHeaderHeight();

  // mission-20 (CD1)/C5 — optimistic drag-to-reschedule state:
  // `useOptimistic(events, applyDragMove)` + `useTransition`,
  // PantryList.tsx:66-73's own shape. `optimisticEvents` (not the raw
  // `events` prop) goes to the "timeline" branch below ONLY — every other
  // branch (Month/Year/Schedule) keeps reading `events` unchanged, since
  // only the hour timeline can start a drag. `dragError` is a separate
  // plain `useState`: the snap-back on rejection is `useOptimistic`'s own
  // job (the transition settles back onto the unchanged `events` prop),
  // but the house `{ error }` string still needs somewhere to render —
  // see the inline banner near the bottom of this component.
  const [optimisticEvents, applyOptimisticMove] = useOptimistic(events, applyDragMove);
  const [, startDragTransition] = useTransition();
  const [dragError, setDragError] = useState<string | null>(null);

  // mission-20 (CD1)/C4 — the long-press gesture. ONE instance, here:
  // `isGestureClaimed` below has to reach `usePageSwipe` in this SAME
  // component, and `useLongPressDrag` guarantees only a single pointer can
  // ever be claimed at a time — a per-block instance could never make
  // either of those true.
  const longPress = useLongPressDrag<TimelineDragPayload>({
    // Resolves a FINISHED drag into a new start time and (possibly) day,
    // then applies it the way every write in this app does: optimistic
    // dispatch first, inside the SAME `startTransition` that awaits the
    // server call.
    onDragEnd: (payload, dx, dy) => {
      // A hold-then-release with no travel — nothing to snap/clamp, and
      // nothing worth a server round trip (`activeDrag`/`offsetRef` both
      // start at `{dx: 0, dy: 0}` in useLongPressDrag.ts).
      if (dx === 0 && dy === 0) return;

      // The block's own start, reconstructed from the moment the drag
      // began — the baseline the snapped/clamped result is compared
      // against below, so a drag that nets to zero commits nothing.
      const originalStartAt = minutesOfDayToDate(payload.day, payload.topMinutes);

      // Vertical: pixels -> minutes -> snapped to 15 -> clamped so the
      // block can't be dropped off the bottom of the day.
      const deltaMinutes = minutesFromPixels(dy, payload.pxPerMinute);
      const snappedTopMinutes = snapMinutes(payload.topMinutes + deltaMinutes);
      const clampedTopMinutes = clampStartMinutes(snappedTopMinutes, payload.durationMinutes);

      // Horizontal: the block's own starting column's left edge plus the
      // raw drag distance, resolved into a column index (clamped to the
      // real count) and then a real day — `days`, the SAME array
      // TimelineGrid.tsx is rendering right now (fact 7, preflight).
      const startColumnLeftPx = payload.columnIndex * payload.columnWidthPx;
      const newColumnIndex =
        columnIndexFromOffset(startColumnLeftPx + dx, payload.columnWidthPx, days.length) ??
        payload.columnIndex;
      const newDay = columnDateForIndex(days, newColumnIndex) ?? payload.day;

      const newStartAt = minutesOfDayToDate(newDay, clampedTopMinutes);
      // Snapped/clamped straight back to the original slot — nothing
      // changed, so nothing is worth an optimistic flicker or a call.
      if (newStartAt.getTime() === originalStartAt.getTime()) return;

      // Duration is preserved by construction (timelineDrag.ts's own
      // rule): only a new START is computed above; `endAt` here previews
      // what `moveCalendarEvent` independently recomputes server-side from
      // the stored row's own duration — not a second source of truth.
      const newEndAt = new Date(newStartAt.getTime() + payload.durationMinutes * 60_000);

      setDragError(null);
      startDragTransition(async () => {
        applyOptimisticMove({ id: payload.eventId, startAt: newStartAt, endAt: newEndAt });
        const result = await moveCalendarEvent(payload.eventId, newStartAt);
        if (result.error) setDragError(result.error);
      });
    },
  });

  // mission-19/C4 — swipe-to-page, via a hook rather than folded in here
  // (see usePageSwipe.ts's own header for why it's a sibling of
  // SwipeActions.tsx's gesture machine rather than a shared import from
  // it). Called unconditionally, the same convention as useNowMinute/
  // useAppHeaderHeight just above — only renderPeriodContent's "month",
  // "timeline" and "year" branches actually spread these handlers onto
  // anything; Schedule manages its own scrolling and is never wrapped.
  // `step` is the SAME call the header's Prev/Next arrows make (below) —
  // this is an addition to how the calendar pages, not a replacement.
  //
  // mission-20 (CD1)/C5 — `isGestureClaimed: longPress.isGestureClaimed`
  // fills in CV6's own existing seam: a long-press that's claimed the
  // pointer always wins over a page-swipe reading the same drag, on every
  // move, not just at pointerdown.
  const pageSwipeHandlers = usePageSwipe({
    onSwipeLeft: () => step(1),
    onSwipeRight: () => step(-1),
    isGestureClaimed: longPress.isGestureClaimed,
  });

  const [pickingView, setPickingView] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  // mission-19/C3 — the month-jump sheet CalendarHeader's title control
  // opens. A fifth independent boolean, same shape as `pickingView`/
  // `addingEvent` above (CalendarHeader also flips this one — see the
  // header's own `onOpenMonthJump` prop).
  const [pickingMonth, setPickingMonth] = useState(false);
  const [selected, setSelected] = useState<{ event: CalendarEventView; day: Date } | null>(null);
  // mission-14/C4 — the sheet TaskCard/DaySection's onOpenTask now opens
  // for real. Just the task itself, no day: unlike an event, a task has
  // exactly one due date, never a span, so there's no "which day was this
  // card rendered for" ambiguity onOpenEvent's callback has to carry.
  const [selectedTask, setSelectedTask] = useState<CalendarTaskView | null>(null);

  // mission-15/C8 (B1) — Schedule's own live answer to "is the reader on
  // today right now," reported up by ScheduleView.tsx's own visibility
  // tracker (see that file's comment). `scheduleRef` is what lets the
  // header's Today circle scroll Schedule directly rather than always
  // navigating — see handleToday below.
  const scheduleRef = useRef<ScheduleViewHandle>(null);
  const [scheduleTodayVisible, setScheduleTodayVisible] = useState(false);

  const isCurrentPeriod =
    today !== null && anchor !== null && config.isCurrentPeriod(anchor, today);

  // mission-15/C8 (B1) — for Schedule specifically, override with
  // ScheduleView's own live visibility answer rather than the anchor
  // comparison above, which is true FOREVER the instant the reader scrolls
  // anywhere at all (scrolling deliberately never moves the anchor — D2/D3).
  // Every other view is completely untouched by this override.
  //
  // mission-18/C5 (Captain's reachability blocker) — the condition used to
  // be an inline check of `view` against the literal Schedule tag, the
  // third one beside `VIEW_CONFIG` (a total record with no field for this)
  // that Captain's finding named. `config.ownsTodayScroll` is that field
  // now — see its own comment on `ViewConfig` (calendarViewConfig.ts). The
  // branch bodies below are unchanged; only the condition moved.
  const headerIsCurrentPeriod = config.ownsTodayScroll ? scheduleTodayVisible : isCurrentPeriod;

  function handleToday() {
    if (config.ownsTodayScroll) {
      // "Scrolls if loaded, navigates if not" (the mission's Done #3):
      // scrollToToday returns false when today's row isn't loaded at all
      // (e.g. a deep link far away that hasn't been scrolled back from),
      // in which case falling through to goToToday() re-anchors the URL at
      // today, which resets useScheduleWindow.ts's whole window around it.
      // preserveScroll (mission-15/C11): ScheduleView re-arms its own
      // scroll-to-today once the rebuilt window lands (C10) — without this,
      // Next's default post-push scroll-to-top fires seconds later, after
      // the slow force-dynamic round trip, and undoes it. Only this
      // fallback needs it; the scrolled-already branch above never navigates.
      const scrolled = scheduleRef.current?.scrollToToday() ?? false;
      if (!scrolled) goToToday({ preserveScroll: true });
      return;
    }
    goToToday();
  }

  // mission-18/C3 — `MonthChips`' own tap handler. This is a DIRECT
  // `router.push`, not a call through `useCalendarNavigation`'s `step`/
  // `goToToday`/`setView`: none of those can express "stay on Month, but
  // jump the anchor to an ARBITRARY month" — `step` only moves by one
  // period per call and reads its own stale closure if called in a loop,
  // and `setView` only ever converts the CURRENT anchor into a new view,
  // never takes one in. The hook exposes exactly one arbitrary-jump path,
  // `openDay`, and it is hardcoded to Day view. Extending the hook itself
  // to expose a general `jumpTo(day, view)` — which `calendar-v2.md`'s own
  // CV6 entry will need too, for its "tap a day in the dropdown -> jumpTo
  // (day, currentView)" — is a real gap, but `useCalendarNavigation.ts` is
  // outside this contract's boundary, so it is left for whichever contract
  // is allowed to touch it.
  //
  // This push is NOT unguarded: `useCalendarNavigation.ts`'s own resync
  // effect is written to treat exactly this shape of push — a URL change
  // that doesn't match anything in its `pushed` ref — as "an external
  // navigation" (its own comment: "a deep link, a reload, or Back/
  // Forward... discards every in-flight push") and re-points the cursor
  // with `jumpTo` accordingly. `buildCalendarSearch` (calendarPaging.ts) is
  // the SAME pure function that hook's own `navigateTo` builds every push
  // from, so the string this produces is byte-identical to what a guarded
  // push would have written — `useCanonicalCalendarUrl` has nothing left
  // to rewrite once it lands.
  function handlePickMonth(day: Date) {
    router.push(`/calendar?${buildCalendarSearch("month", day)}`);
  }

  const title = today === null || anchor === null ? null : config.title(anchor);
  const addSheetDateParam = anchor ? `?date=${toLocalDateString(anchor)}` : "";

  // mission-17/C3 — replaces the old `view === "member"` ternary chain with
  // a switch on `config.renderer` (calendarViewConfig.ts), exhaustive via
  // the `never`-typed default below. That field is the render-SELECTION
  // half of the hazard STRUCTURE.md names for `pinned` (CalendarHeader.tsx):
  // a per-view difference that used to be tested inline beside
  // `VIEW_CONFIG` — a total record — instead of read from it. C3 itself
  // changed no behaviour (see that file's per-row comments for why each
  // view got the tag it did); mission-17/C4, immediately below, is the
  // first contract to actually MOVE a view between tags — day/threeDay/
  // week's rows switched from `"daySection"` to `"timeline"` in that same
  // commit, which is a real, visible change (an hour rail instead of a flat
  // agenda list), not a refactor.
  function renderPeriodContent() {
    const renderer = config.renderer;

    if (renderer === "month") {
      // Guaranteed non-null (see ViewConfig.placeholderCount's comment
      // in calendarViewConfig.ts); this check is for TypeScript, not a
      // reachable branch.
      return (
        today !== null &&
        anchor !== null && (
          <>
            {/* mission-19/C4 — MonthChips is deliberately OUTSIDE the
                swipe wrapper below: it scrolls itself HORIZONTALLY (its
                own `overflow-x-auto`), so wrapping it too would fight
                its own drag-to-scroll for the same gesture. */}
            <MonthChips anchor={anchor} onPickMonth={handlePickMonth} />
            <div className="touch-pan-y" {...pageSwipeHandlers}>
              <MonthGrid
                anchor={anchor}
                today={today}
                events={events}
                tasks={tasks}
                windowStart={windowStart}
                windowEnd={windowEnd}
                onOpenDay={openDay}
              />
            </div>
          </>
        )
      );
    }

    if (renderer === "timeline") {
      // mission-17/C4 — handled here, ahead of the generic `today === null`
      // placeholder below, for the SAME reason "month" is: rendering
      // `config.placeholderCount` DaySection-loading blocks while `today`
      // resolves would show Week's 7-block shape (loading.tsx's own comment
      // explains why EVERY non-month view briefly renders that shape,
      // regardless of which one was actually requested — `view` hasn't
      // synced from the URL's default seed yet), immediately before
      // snapping to a single `TimelineGrid` box. MEASURED against the real
      // running app: that snap is a genuine ~225px height drop (a 7-block
      // list settles around 1093px of page height; the real TimelineGrid
      // box settles around 868px at a 375×812 viewport) — a far bigger,
      // more visible jump than the list-to-list swap the OTHER
      // daySection-rendered views make. Skipping the placeholder here,
      // exactly like Month already does, removes it: the brief gap while
      // `today`/`now` resolve is covered by loading.tsx's own (now
      // TimelineGrid-shaped) fallback instead, and resolves fast enough in
      // practice — both are client-side `useSyncExternalStore` reads, no
      // network round trip — not to read as a blank flash.
      //
      // `now` (useNowMinute.ts) is a SEPARATE value from `today`, with its
      // own null-on-first-render window, so it gets its own guard here —
      // the same "guard every independently-resolving value" convention
      // the "month" case above already follows for `today`/`anchor`
      // together. `columnDays` is just `days` (already computed above from
      // `config.days(anchor)` — see ViewConfig.days's own comment for why
      // each row already returns exactly the column set this component
      // needs: `[anchor]` for Day, the anchor-relative 3-day span for
      // 3 Day, `sundayOf(anchor)`'s week for Week).
      //
      // `tasks`/`onOpenTask` — mission-17/C5. Fury's original C2 contract
      // enumerated this component's props and left `tasks` out entirely, so
      // a task due today was invisible on Day/3 Day/Week even though Month
      // and Schedule both already rendered it. Passed straight through
      // unfiltered, exactly as the "month" case above already does for
      // MonthGrid — TimelineGrid decides which tasks touch `days` itself,
      // via `assignLanes`, the same way MonthGrid does per row. `onOpenTask`
      // is a plain one-arg closure: a task has exactly one due date, never
      // a span, so there's no "which day was this card rendered for"
      // ambiguity to pass through, unlike `onOpenEvent` just below it.
      //
      // mission-20 (CD1)/C5 — `events={optimisticEvents}`, not the raw
      // `events` prop: this is the ONLY branch a drag can start from (only
      // blocks in the `timed` partition are draggable, and only
      // TimelineGrid renders them), so it's the only branch that needs the
      // optimistic array; Month/Year/Schedule keep reading `events`
      // directly. `getHandlers` is the client-side "can this session
      // manage the calendar" gate, decided HERE rather than inside
      // TimelineGrid.tsx/TimelineDayColumn.tsx: a kid's session gets
      // `undefined`, so no pointer handlers ever attach and a long-press
      // can never even start. The SERVER'S guard in `moveCalendarEvent`
      // (MANAGER_ROLES) is the real gate regardless — this only spares a
      // kid a block that lifts and then snaps back with a refusal.
      return (
        today !== null &&
        now !== null && (
          // mission-19/C4 — the swipe wrapper. TimelineGrid owns its own
          // internal vertical scroller (`overflow-y-auto`); `touch-pan-y`
          // here is what lets that scroll pass through undisturbed when a
          // drag's vertical travel wins the direction lock (see
          // usePageSwipe.ts's header) — the same reasoning SwipeActions.tsx
          // already relies on for its own rows.
          <div className="touch-pan-y" {...pageSwipeHandlers}>
            <TimelineGrid
              columnDays={days}
              events={optimisticEvents}
              tasks={tasks}
              today={today}
              now={now}
              windowStart={windowStart}
              windowEnd={windowEnd}
              onOpenEvent={(event, day) => setSelected({ event, day })}
              onOpenTask={(task) => setSelectedTask(task)}
              chromeOffsetPx={chromeOffsetPx}
              getHandlers={canManage ? longPress.getHandlers : undefined}
              activeDrag={longPress.activeDrag}
            />
          </div>
        )
      );
    }

    if (renderer === "year") {
      // mission-18/C4 — handled here, ahead of the generic `today === null`
      // placeholder below, for the SAME reason "month" and "timeline" are
      // (see their own comments): Year's real content — twelve mini
      // month-grids — is nothing like the single/seven DaySection-loading
      // blocks that placeholder renders, so rendering it briefly first
      // would ADD a shape jump rather than avoid one. `today !== null &&
      // anchor !== null` is TypeScript-only, the same standing as "month"'s
      // own guard — this component's `today`/`anchor` resolve together
      // (useCalendarPeriod.ts), and by the time any renderer branch here
      // runs at all, loading.tsx's own route-level Suspense fallback has
      // already covered the fetch itself.
      return (
        today !== null &&
        anchor !== null && (
          // mission-19/C4 — the swipe wrapper. YearView's own tappable
          // units are its 12 month buttons; a swipe's click-swallow (see
          // usePageSwipe.ts's header) is what stops a released drag from
          // also firing whichever tile it ends on.
          <div className="touch-pan-y" {...pageSwipeHandlers}>
            <YearView anchor={anchor} today={today} onPickMonth={handlePickMonth} />
          </div>
        )
      );
    }

    if (today === null) {
      return Array.from({ length: config.placeholderCount }, (_, index) => (
        <DaySection key={index} loading />
      ));
    }

    switch (renderer) {
      case "schedule":
        // `anchor` is guaranteed non-null here (useCalendarPeriod.ts — it's
        // null exactly when `today` is, ruled out above).
        //
        // mission-16/C9 (Captain's N4), updated mission-17/C3: an invariant
        // lives HERE, not in either file it constrains. ScheduleView's
        // month-title portal (useScheduleMonthTitle.ts) only renders
        // anything because CalendarHeader is mounted AND in its own
        // `pinned` branch (`VIEW_CONFIG[view].pinned`) at the exact same
        // moment this case runs (`config.renderer === "schedule"`) — both
        // now derive from the same `VIEW_CONFIG[view]` row, which is what
        // keeps them from ever disagreeing. If a future row ever sets
        // `renderer: "schedule"` without also setting `pinned: true` (or
        // the reverse), the title's portal target never exists and the
        // month label silently disappears — no error, no test failure.
        // Keep the two on the same row.
        return (
          anchor !== null && (
            <ScheduleView
              ref={scheduleRef}
              initialDay={anchor}
              people={people}
              canManage={canManage}
              onTodayVisibleChange={setScheduleTodayVisible}
            />
          )
        );
      default: {
        // Exhaustiveness check, the whole point of this contract: a new
        // `CalendarRenderer` value with no case here fails to compile.
        // mission-18/C4 removed the `"daySection"` case that used to sit
        // here (a plain agenda list, reached only by `year` as a
        // placeholder before it had its own renderer — see that type's own
        // comment in calendarViewConfig.ts) once `year` moved to its own
        // `if (renderer === "year")` branch above, the same place "month"
        // and "timeline" are handled. With "month", "timeline" and "year"
        // all narrowed out by the `if`s above, `renderer` here is only ever
        // `"schedule"` — so this `default` is reachable the instant a
        // SEVENTH renderer tag is ever added with no case for it, exactly
        // as it always was.
        const exhaustiveCheck: never = renderer;
        throw new Error(`Unhandled calendar renderer: ${String(exhaustiveCheck)}`);
      }
    }
  }

  return (
    <div>
      <CalendarHeader
        view={view}
        onPickView={() => setPickingView(true)}
        todayResolved={today !== null}
        isCurrentPeriod={headerIsCurrentPeriod}
        onToday={handleToday}
        title={title}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        prevDisabled={today === null}
        nextDisabled={today === null}
        prevLabel={config.prevLabel}
        nextLabel={config.nextLabel}
        canManage={canManage}
        onAdd={() => setAddingEvent(true)}
        onOpenMonthJump={() => setPickingMonth(true)}
      />

      {/* mission-20 (CD1)/C5 — the house `{ error }` pattern
          (PutAwayButton.tsx's own `{error && <p role="alert" ...>}`), for a
          rejected drag. No sheet exists to put this inside, so it renders
          here — the one place in this component not specific to a single
          renderer branch. The snap-back needs no code: `useOptimistic`'s
          transition settles back onto the unchanged `events` prop the
          moment `moveCalendarEvent` returns without refreshing, so the
          block is already back by the time this message appears. */}
      {dragError && (
        <p role="alert" className="px-1 text-sm text-danger">
          {dragError}
        </p>
      )}

      {/* The render switch itself — which case runs for which view — lives
          in `renderPeriodContent`, above; see that function's own comment. */}
      <div className="flex flex-col gap-4">{renderPeriodContent()}</div>

      {/* mission-19/C1 — the view picker, Add, event-detail, and
          task-detail sheets were extracted verbatim into CalendarSheets
          (see that file's own header comment for why and what's shared).
          The four booleans/values below and their setters stay HERE,
          unmoved: `pickingView`/`addingEvent` are also set from
          CalendarHeader above, and `selected`/`selectedTask` are also set
          from renderPeriodContent()'s onOpenEvent/onOpenTask callbacks —
          so this component remains the one place all four are read from
          and written to, exactly as before this extraction.

          mission-19/C3 added a FIFTH: `pickingMonth`, also set from
          CalendarHeader (its new `onOpenMonthJump`), plus the two
          read-only values (`anchor`, `today`) and the one action
          (`jumpToDay`) MonthJumpSheet needs — none of which are new state,
          just values/functions this component already held. */}
      <CalendarSheets
        view={view}
        onSelectView={setView}
        pickingView={pickingView}
        onClosePickingView={() => setPickingView(false)}
        addingEvent={addingEvent}
        onCloseAdding={() => setAddingEvent(false)}
        addSheetDateParam={addSheetDateParam}
        selected={selected}
        onCloseSelected={() => setSelected(null)}
        selectedTask={selectedTask}
        onCloseTask={() => setSelectedTask(null)}
        people={people}
        canManage={canManage}
        pickingMonth={pickingMonth}
        onClosePickingMonth={() => setPickingMonth(false)}
        anchor={anchor}
        today={today}
        onJumpToDay={jumpToDay}
      />
    </div>
  );
}
