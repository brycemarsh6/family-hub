"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, UtensilsCrossed } from "lucide-react";
import { RadioSheet } from "./RadioSheet";
import { ActionSheet } from "./ActionSheet";
import { CalendarHeader } from "./CalendarHeader";
import { DaySection } from "./DaySection";
import { MonthGrid } from "./MonthGrid";
import { EventDetailSheet } from "./EventDetailSheet";
import { useToday } from "@/lib/useToday";
import { useCalendarPeriod, periodAnchor, stepPeriod, withView } from "@/lib/useCalendarPeriod";
import { buildCalendarSearch, parseDateParam, parseViewParam } from "@/lib/calendarPaging";
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

type CalendarViewMode = "week" | "day" | "month";

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
   * the "?date=" param this file keeps in sync, not a fixed span around
   * the server's clock (K1's original wall design; calendarPaging.ts's
   * header). Used ONLY to decide whether a day was actually fetched
   * (DaySection's `NotLoadedCard`, MonthGrid's `notLoaded`), never to
   * disable paging — now rare rather than routine, as intended.
   */
  windowStart: Date;
  windowEnd: Date;
};

/**
 * The Calendar branch's whole client-side shell: which view (Week/Day/Month)
 * and which period is on screen, both driven from the browser's own clock
 * (useToday()) and never the server's — Vercel runs UTC, the household
 * runs Mountain (see useToday.ts). `events` is the page's one server fetch
 * (a window around whatever period the URL names — see page.tsx's own
 * comment); everything else — which specific days to show, which of
 * `events` land on each one — is computed here.
 *
 * mission-9/C6 ("We HAVE to fix it. Let's do it the way Google does it."):
 * the "?date="/"?view=" URL params, not the period cursor alone, are now
 * the source of truth for where the calendar is pointed, kept in sync in
 * BOTH directions — LOCAL → URL imperatively, in each handler below
 * (`handleStep`/`handleToday`/`handleSetView`/`openDay`: compute the
 * resulting Date with the same pure functions the hook uses internally,
 * update local state, push a matching navigation, all in one function —
 * see `navigateTo`), and URL → LOCAL via the one effect below (re-points
 * the cursor via `jumpTo` only when the URL names something local state
 * doesn't already match: a deep link, a reload, or Back/Forward — never
 * this file's own pushes, which already agree with the URL by the time
 * it changes).
 *
 * WHO DECIDES WHAT (this contract's required disclosure): the SERVER
 * (page.tsx) only ever turns "?date=" into a fetch WINDOW — a range,
 * never a decided day (calendarPaging.ts's header). WHICH day is
 * "today", and which day each event card renders under, is decided
 * entirely here, in the browser, exactly as before.
 *
 * `canStepToPeriod`'s old use as a navigation WALL is gone — Prev/Next
 * are disabled only while `today` hasn't resolved, since paging now asks
 * the server for a fresh window centered on wherever it lands, arbitrarily
 * far either direction. That predicate still exists, moved to
 * calendarPaging.ts's `periodWindowEdges` and tested there for the first
 * time (kept, not deleted, per that contract's own instruction) — this
 * file just no longer calls it to gate anything.
 */
export function CalendarViews({
  events,
  canManage,
  windowStart,
  windowEnd,
}: CalendarViewsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = useToday();
  // The period cursor (mission-9/C2a) — a typed `{ view, offsets }` state.
  // `today` is passed in rather than read by the hook itself, per the
  // standing rule that no calendar-meaningful date is ever constructed
  // server-side — it still arrives from useToday() at this one call site.
  const { view, anchor, period, setView, step, goToToday, jumpTo } =
    useCalendarPeriod<CalendarViewMode>("week", today);

  const [pickingView, setPickingView] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [selected, setSelected] = useState<{ event: CalendarEventView; day: Date } | null>(null);

  // Real navigation (mission-9/C6).
  function navigateTo(nextView: CalendarViewMode, nextAnchor: Date) {
    router.push(`/calendar?${buildCalendarSearch(nextView, nextAnchor)}`);
  }

  // URL → LOCAL sync: re-points the cursor via `jumpTo` only when the URL
  // names something local state doesn't already match.
  //
  // mission-9/C8: keys on VALUES from `searchParams`/`today`, never those
  // objects — `useToday()` returns a FRESH `Date` each call, so depending on
  // it reran this every render, including after `handleStep` moved state but
  // before `router.push` committed; it saw a "mismatch" against the stale URL
  // and jumped back, so two taps moved one period.
  //
  // KNOWN GAP — do NOT add a pending-navigation guard here. C8 tried one (a
  // counter of our own pushes); Vision proved it drifts: a push with no
  // search-param change never runs this effect, so its increment is never
  // consumed and each stale one swallows a later Back — reachable with no
  // timing by re-picking the current view, and cumulative. Removed rather
  // than replaced (Bryce, 2026-09-02): the residual it guarded is milder —
  // two fast taps that both commit briefly show the intermediate period,
  // then settle. A flicker, not a lost step. The real repair is Vision's
  // compare-and-clear Set plus a no-op-push guard, and it belongs AFTER
  // Captain's extraction of this cluster — both gates ruled: split first.
  const dateParam = searchParams.get("date");
  const viewParam = searchParams.get("view");
  const todayTime = today === null ? null : today.getTime();
  useEffect(() => {
    if (todayTime === null) return;
    const targetView = parseViewParam(viewParam);
    const targetAnchor = parseDateParam(dateParam) ?? new Date(todayTime);
    const inSync = anchor !== null && view === targetView && isSameDay(anchor, targetAnchor);
    if (!inSync) jumpTo(targetAnchor, targetView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateParam, viewParam, todayTime]);

  // `today` (and therefore `anchor`) is null during SSR and the first
  // client render (see useToday()'s own comment). Every value below that
  // would otherwise depend on "which day is it" stays null too, on
  // purpose, rather than guessing — that's what lets the header and
  // DaySection below render an honestly-loading frame instead of a wrong
  // one.
  const weekStart = anchor === null ? null : sundayOf(anchor);
  // Week/Day only — Month builds its own 42-day grid from `anchor` inside
  // MonthGrid (monthLayout.ts's `monthGridDays`), not from this list.
  const days =
    view === "week"
      ? weekStart === null
        ? []
        : daysOfWeek(weekStart)
      : anchor === null
        ? []
        : [anchor];

  const isCurrentPeriod =
    today !== null &&
    anchor !== null &&
    weekStart !== null &&
    (view === "week"
      ? isSameDay(weekStart, sundayOf(today))
      : view === "month"
        ? isSameMonth(anchor, today)
        : isSameDay(anchor, today));

  const title =
    today === null || anchor === null || weekStart === null
      ? null
      : view === "week"
        ? formatWeekRange(weekStart)
        : view === "month"
          ? formatMonthTitle(anchor)
          : formatDayLabel(anchor);

  // Week always shows seven DaySections, Day always shows one — fixed by
  // `view` alone, never by `today` — so the loading frame below can render
  // the right COUNT of placeholders before `today` resolves. No Month arm
  // needed: every path to `view === "month"` (`setView`, or `jumpTo` above)
  // requires `today` already resolved (useCalendarPeriod.ts). (mission-9/C8:
  // dropped the old, now-false claim that loading.tsx's Week fallback never
  // needs a Month shape — C6 gave it one; the conclusion above still holds.)
  const placeholderCount = view === "week" ? 7 : 1;

  // Moves the period one step and immediately asks the server for a fresh
  // window centered on where it landed (mission-9/C6, replacing K1's
  // fixed ±60-day wall). `nextPeriod`/`nextAnchor` use the SAME pure
  // functions the hook uses internally, rather than waiting a render to
  // read `anchor` back, so the navigation URL can be built synchronously.
  function handleStep(direction: 1 | -1) {
    if (today === null) return;
    const nextPeriod = stepPeriod(period, direction);
    const nextAnchor = periodAnchor(nextPeriod, today);
    step(direction);
    navigateTo(nextPeriod.view as CalendarViewMode, nextAnchor);
  }

  function handleToday() {
    if (today === null) return;
    goToToday();
    navigateTo(view, today);
  }

  function handleSetView(nextView: CalendarViewMode) {
    if (today === null) {
      setView(nextView);
      return;
    }
    const nextPeriod = withView(period, nextView, today);
    const nextAnchor = periodAnchor(nextPeriod, today);
    setView(nextView);
    navigateTo(nextView, nextAnchor);
  }

  // Opens `day` (any of Month's 42 grid days) in Day view — `jumpTo`
  // (useCalendarPeriod.ts) lands on it in one call, replacing the old
  // step-in-a-loop composition.
  function openDay(day: Date) {
    if (today === null) return;
    jumpTo(day, "day");
    navigateTo("day", day);
  }

  return (
    <div>
      <CalendarHeader
        view={view}
        onPickView={() => setPickingView(true)}
        todayResolved={today !== null}
        isCurrentPeriod={isCurrentPeriod}
        onToday={handleToday}
        title={title}
        onPrev={() => handleStep(-1)}
        onNext={() => handleStep(1)}
        prevDisabled={today === null}
        nextDisabled={today === null}
        prevLabel={view === "week" ? "Previous week" : view === "month" ? "Previous month" : "Previous day"}
        nextLabel={view === "week" ? "Next week" : view === "month" ? "Next month" : "Next day"}
        canManage={canManage}
        onAdd={() => setAddingEvent(true)}
      />

      <div className="flex flex-col gap-4">
        {view === "month" ? (
          // Guaranteed non-null (see placeholderCount's comment above);
          // this check is for TypeScript, not a reachable branch.
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
          Array.from({ length: placeholderCount }, (_, index) => (
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
        <RadioSheet<CalendarViewMode>
          title="View"
          options={[
            { value: "week", label: "Week" },
            { value: "day", label: "Day" },
            { value: "month", label: "Month" },
          ]}
          selected={view}
          onSelect={handleSetView}
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
