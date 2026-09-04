"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ListChecks } from "lucide-react";
import { RadioSheet } from "./RadioSheet";
import { ActionSheet } from "./ActionSheet";
import { CalendarHeader } from "./CalendarHeader";
import { DaySection } from "./DaySection";
import { MonthGrid } from "./MonthGrid";
import { EventDetailSheet } from "./EventDetailSheet";
import { useCalendarNavigation } from "@/lib/useCalendarNavigation";
import {
  CALENDAR_VIEW_OPTIONS,
  DEFAULT_CALENDAR_VIEW,
  type CalendarPeriodView,
} from "@/lib/calendarViewVocabulary";
import { VIEW_CONFIG } from "@/lib/calendarViewConfig";
import { daysEventCovers, isOutsideWindow, allDayInstantToLocalDay } from "@/lib/calendarDates";
import { isSameDay, toLocalDateString } from "@/lib/mealPlanDates";
import type { CalendarEventView, CalendarTaskView } from "@/lib/types";

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
// glob can't reach). The render switch below stays here on purpose.

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
 * VIEW_CONFIG above rather than another handler here.
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
  canManage,
  windowStart,
  windowEnd,
}: CalendarViewsProps) {
  // For the Add sheet's own destinations only — the calendar's own paging
  // navigations all go through useCalendarNavigation.
  const router = useRouter();
  const { view, anchor, today, step, goToToday, setView, openDay } =
    useCalendarNavigation(DEFAULT_CALENDAR_VIEW);

  const [pickingView, setPickingView] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [selected, setSelected] = useState<{ event: CalendarEventView; day: Date } | null>(null);

  const config = VIEW_CONFIG[view];
  // The null-guards below are about `today` not having resolved yet — NOT
  // about which view is active, which is why they stay here rather than
  // moving into VIEW_CONFIG (every row would carry the same null check).
  // `anchor` is null exactly while `today` is (useCalendarPeriod derives one
  // from the other), so guarding both is belt-and-braces, not two cases.
  const days = anchor === null ? [] : config.days(anchor);

  const isCurrentPeriod =
    today !== null && anchor !== null && config.isCurrentPeriod(anchor, today);

  const title = today === null || anchor === null ? null : config.title(anchor);
  const addSheetDateParam = anchor ? `?date=${toLocalDateString(anchor)}` : "";

  return (
    <div>
      <CalendarHeader
        view={view}
        onPickView={() => setPickingView(true)}
        todayResolved={today !== null}
        isCurrentPeriod={isCurrentPeriod}
        onToday={goToToday}
        title={title}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        prevDisabled={today === null}
        nextDisabled={today === null}
        prevLabel={config.prevLabel}
        nextLabel={config.nextLabel}
        canManage={canManage}
        onAdd={() => setAddingEvent(true)}
      />

      <div className="flex flex-col gap-4">
        {/* mission-14/C3 renders `tasks` into the two views that exist
            today (Month below, and the Week/Day DaySection branch further
            down) — Schedule (CV3), the hour timeline (CV4/Day+Week), and
            Year (CV5) don't exist yet, so they inherit the same obligation
            when they land here: thread `tasks` into whatever they render,
            the same way `events` already has to be. Not a silent gap —
            BUILT_VIEWS (calendarViewVocabulary.ts) already keeps those
            three unreachable until each ships its own branch in this exact
            switch. */}
        {view === "month" ? (
          // Guaranteed non-null (see ViewConfig.placeholderCount's comment
          // in calendarViewConfig.ts); this check is for TypeScript, not a
          // reachable branch.
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
        ) : today === null ? (
          Array.from({ length: config.placeholderCount }, (_, index) => (
            <DaySection key={index} loading />
          ))
        ) : (
          days.map((day) => (
            <DaySection
              key={day.getTime()}
              day={day}
              today={today}
              showLocation={view === "day"}
              compact={view === "week"}
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
              // Rendering only (mission-14/C3) — C4 wires this to a real
              // TaskDetailSheet, the same way EventDetailSheet backs
              // onOpenEvent above. No state to hold yet, so this stays a
              // no-op rather than introducing a `selectedTask` nothing reads.
              onOpenTask={() => {}}
            />
          ))
        )}
      </div>

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
    </div>
  );
}
