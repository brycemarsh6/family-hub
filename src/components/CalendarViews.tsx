"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ListChecks } from "lucide-react";
import { RadioSheet } from "./RadioSheet";
import { ActionSheet } from "./ActionSheet";
import { CalendarHeader } from "./CalendarHeader";
import { DaySection } from "./DaySection";
import { MonthGrid } from "./MonthGrid";
import { ScheduleView, type ScheduleViewHandle } from "./ScheduleView";
import { TimelineGrid } from "./TimelineGrid";
import { EventDetailSheet } from "./EventDetailSheet";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { useCalendarNavigation } from "@/lib/useCalendarNavigation";
import {
  CALENDAR_VIEW_OPTIONS,
  DEFAULT_CALENDAR_VIEW,
  type CalendarPeriodView,
} from "@/lib/calendarViewVocabulary";
import { VIEW_CONFIG } from "@/lib/calendarViewConfig";
import { daysEventCovers, isOutsideWindow, allDayInstantToLocalDay } from "@/lib/calendarDates";
import { isSameDay, toLocalDateString } from "@/lib/mealPlanDates";
import { useNowMinute } from "@/lib/useNowMinute";
import { useAppHeaderHeight } from "@/lib/appChrome";
import type { CalendarEventView, CalendarPersonView, CalendarTaskView } from "@/lib/types";

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
  const { view, anchor, today, step, goToToday, setView, openDay } =
    useCalendarNavigation(DEFAULT_CALENDAR_VIEW);

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

  const [pickingView, setPickingView] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
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

  const config = VIEW_CONFIG[view];
  // The null-guards below are about `today` not having resolved yet — NOT
  // about which view is active, which is why they stay here rather than
  // moving into VIEW_CONFIG (every row would carry the same null check).
  // `anchor` is null exactly while `today` is (useCalendarPeriod derives one
  // from the other), so guarding both is belt-and-braces, not two cases.
  const days = anchor === null ? [] : config.days(anchor);

  const isCurrentPeriod =
    today !== null && anchor !== null && config.isCurrentPeriod(anchor, today);

  // mission-15/C8 (B1) — for Schedule specifically, override with
  // ScheduleView's own live visibility answer rather than the anchor
  // comparison above, which is true FOREVER the instant the reader scrolls
  // anywhere at all (scrolling deliberately never moves the anchor — D2/D3).
  // Every other view is completely untouched by this override.
  const headerIsCurrentPeriod = view === "schedule" ? scheduleTodayVisible : isCurrentPeriod;

  function handleToday() {
    if (view === "schedule") {
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
          <MonthGrid
            anchor={anchor}
            today={today}
            events={events}
            tasks={tasks}
            windowStart={windowStart}
            windowEnd={windowEnd}
            onOpenDay={openDay}
          />
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
      // is the identical one-arg closure the "daySection" case below
      // already passes (a task has exactly one due date, never a span, so
      // the `day` argument that closure ignores is unused here too).
      return (
        today !== null &&
        now !== null && (
          <TimelineGrid
            columnDays={days}
            events={events}
            tasks={tasks}
            today={today}
            now={now}
            windowStart={windowStart}
            windowEnd={windowEnd}
            onOpenEvent={(event, day) => setSelected({ event, day })}
            onOpenTask={(task) => setSelectedTask(task)}
            chromeOffsetPx={chromeOffsetPx}
          />
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
      case "daySection":
        // mission-17/C4 confirms the prediction the comment here used to
        // make: this branch is now reached ONLY by `year` — day/threeDay/
        // week all moved to their own "timeline" branch, handled earlier in
        // this function (alongside "month", ahead of the generic
        // `today === null` placeholder below — see its own comment for
        // why), and schedule is its own case above. `year` is itself
        // unreachable today (`BUILT_VIEWS.year` is false), so this case is
        // defensive fallthrough for a total switch, not a path real
        // navigation takes — the same standing MonthGrid's own `today !==
        // null` check above has ("for TypeScript, not a reachable branch").
        // `showLocation`/`compact` are DROPPED here rather than kept as
        // `view === "day"`/`view === "week"` checks that can never be true
        // any more: leaving them would read as live behaviour for views
        // this case no longer serves. Both are optional on DaySection
        // (default falsy), and Year has no stated need for either — CV5
        // replaces this whole case with Year's real 12-mini-grid renderer
        // rather than ever exercising it.
        return days.map((day) => (
          <DaySection
            key={day.getTime()}
            day={day}
            today={today}
            notLoaded={isOutsideWindow(day, windowStart, windowEnd)}
            events={events.filter(
              (event) =>
                daysEventCovers(event.startAt, event.endAt, event.allDay, [day]).length > 0,
            )}
            // A task has exactly one due date, never a span, so this is a
            // plain same-day comparison rather than daysEventCovers'
            // range check — see allDayInstantToLocalDay's own comment
            // (calendarDates.ts) for why a UTC-midnight-stored due date
            // has to be read back through it, not a bare local getter.
            tasks={tasks.filter((task) => isSameDay(allDayInstantToLocalDay(task.dueDate), day))}
            onOpenEvent={(event, eventDay) => setSelected({ event, day: eventDay })}
            // mission-14/C4 — the real TaskDetailSheet, wired the same
            // way onOpenEvent backs EventDetailSheet above. `day` is
            // unused: see selectedTask's own comment for why a task
            // needs none.
            onOpenTask={(task) => setSelectedTask(task)}
          />
        ));
      default: {
        // Exhaustiveness check, the whole point of this contract: a new
        // `CalendarRenderer` value with no case here fails to compile.
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
        showArrows={view !== "schedule"}
        canManage={canManage}
        onAdd={() => setAddingEvent(true)}
      />

      {/* The render switch itself — which case runs for which view — lives
          in `renderPeriodContent`, above; see that function's own comment. */}
      <div className="flex flex-col gap-4">{renderPeriodContent()}</div>

      {pickingView && (
        <RadioSheet<CalendarPeriodView>
          title="View"
          options={CALENDAR_VIEW_OPTIONS}
          selected={view}
          onSelect={setView}
          onClose={() => setPickingView(false)}
        />
      )}

      {addingEvent && (
        <ActionSheet
          title="Add"
          onClose={() => setAddingEvent(false)}
          items={[
            {
              label: "Event",
              icon: <CalendarDays aria-hidden="true" size={18} />,
              onClick: () => {
                setAddingEvent(false);
                router.push(`/calendar/new${addSheetDateParam}`);
              },
            },
            {
              label: "Task",
              icon: <ListChecks aria-hidden="true" size={18} />,
              onClick: () => {
                setAddingEvent(false);
                router.push(`/calendar/new/task${addSheetDateParam}`);
              },
            },
          ]}
        />
      )}

      {selected && (
        <EventDetailSheet
          event={selected.event}
          day={selected.day}
          createdByName={selected.event.createdByName}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            router.refresh();
          }}
        />
      )}

      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          people={people}
          canManage={canManage}
          onClose={() => setSelectedTask(null)}
          onChanged={() => router.refresh()}
          onDeleted={() => {
            setSelectedTask(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
