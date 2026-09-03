"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, UtensilsCrossed } from "lucide-react";
import { RadioSheet } from "./RadioSheet";
import { ActionSheet } from "./ActionSheet";
import { CalendarHeader } from "./CalendarHeader";
import { DaySection } from "./DaySection";
import { MonthGrid } from "./MonthGrid";
import { EventDetailSheet } from "./EventDetailSheet";
import { useCalendarNavigation } from "@/lib/useCalendarNavigation";
import type { CalendarPeriodView } from "@/lib/useCalendarPeriod";
import { daysEventCovers, daysOfWeek, isOutsideWindow } from "@/lib/calendarDates";
import {
  formatDayLabel,
  formatMonthTitle,
  formatWeekRange,
  isSameDay,
  isSameMonth,
  sundayOf,
  toLocalDateString,
} from "@/lib/mealPlanDates";
import type { CalendarEventView } from "@/lib/types";

// CalendarEventView / CalendarPersonView live in src/lib/types.ts, not here
// — this file, DaySection.tsx, and EventCard.tsx all import them from that
// one shared place rather than from one another, which is what keeps the
// module graph free of the component-to-component cycle mission-8's
// Captain gate flagged (B2). Import from "@/lib/types" directly rather than
// re-exporting from here, or the cycle comes right back (this file already
// imports the DaySection *component*, so a type re-export pointed the other
// way would recreate exactly the loop this fix removes).

/**
 * The per-view differences the shell itself has to know about, as one row
 * per view rather than a ternary per difference (mission-10/CV0, completed
 * in mission-11/C1). Typed as a total `Record`, so widening
 * `CalendarPeriodView` for Schedule / 3 Day / Year is a compile error until
 * each one has a row here — which is the point: a new view ADDS A ROW, it
 * doesn't add a branch to several separate expressions that can then
 * disagree.
 *
 * That claim was only two-fifths true when CV0 first wrote it. `title`,
 * `days` and `isCurrentPeriod` stayed behind as ternaries in the component
 * body, each ending in a catch-all `: <day behaviour>` — so a new view
 * name compiled clean and silently rendered a Day title over a single-day
 * array (Captain's CV0 Ruling 2; the same catch-all-else hazard
 * `useCalendarPeriod.stepPeriod` carries). All five per-view differences
 * live here now, so the sentence above is true of every one of them rather
 * than of the two labels.
 */
type ViewConfig = {
  prevLabel: string;
  nextLabel: string;
  /**
   * How many DaySection placeholders the loading frame renders. Fixed by
   * `view` alone, never by `today` — that's what lets the frame below show
   * the right COUNT before `today` resolves. Month renders MonthGrid rather
   * than DaySections, and every path to Month (`setView`, or the URL resync's
   * `jumpTo`) requires `today` already resolved, so its value here is never
   * actually reached.
   */
  placeholderCount: number;
  /**
   * The header title. Takes `anchor` only: no view's title depends on what
   * day it is today, and a parameter nothing uses would be a promise the
   * rows don't keep. The component still withholds the title until `today`
   * resolves (that's the loading frame, below) — widening this to
   * `(anchor, today)` is a one-line change here if a view ever wants to say
   * "Today" instead of a date.
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
// taking one computed once in the component. It is a clone-and-setDate, so
// the repeat costs nothing measurable, and it keeps every row readable on
// its own terms — no row is handed a value only Week uses, and none has to
// deal with the `null` that a component-level `weekStart` carries while
// `today` is still resolving.
const VIEW_CONFIG: Record<CalendarPeriodView, ViewConfig> = {
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
};

const VIEW_OPTIONS: { value: CalendarPeriodView; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
];

type CalendarViewsProps = {
  events: CalendarEventView[];
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
  canManage,
  windowStart,
  windowEnd,
}: CalendarViewsProps) {
  // For the Add sheet's own destinations only — the calendar's own paging
  // navigations all go through useCalendarNavigation.
  const router = useRouter();
  const { view, anchor, today, step, goToToday, setView, openDay } =
    useCalendarNavigation("week");

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
        {view === "month" ? (
          // Guaranteed non-null (see ViewConfig.placeholderCount's comment
          // above); this check is for TypeScript, not a reachable branch.
          today !== null &&
          anchor !== null && (
            <MonthGrid
              anchor={anchor}
              today={today}
              events={events}
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
              onOpenEvent={(event, eventDay) => setSelected({ event, day: eventDay })}
            />
          ))
        )}
      </div>

      {pickingView && (
        <RadioSheet<CalendarPeriodView>
          title="View"
          options={VIEW_OPTIONS}
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
                const dateParam = anchor ? `?date=${toLocalDateString(anchor)}` : "";
                router.push(`/calendar/new${dateParam}`);
              },
            },
            {
              label: "Meal",
              icon: <UtensilsCrossed aria-hidden="true" size={18} />,
              onClick: () => {
                setAddingEvent(false);
                router.push("/kitchen/cooking/meal-plan");
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
