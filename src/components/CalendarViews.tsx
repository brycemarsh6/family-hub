"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, UtensilsCrossed } from "lucide-react";
import { RadioSheet } from "./RadioSheet";
import { ActionSheet } from "./ActionSheet";
import { CalendarHeader } from "./CalendarHeader";
import { DaySection } from "./DaySection";
import { FloatingAddButton } from "./FloatingAddButton";
import { EventDetailSheet } from "./EventDetailSheet";
import { useToday } from "@/lib/useToday";
import {
  canStepToPeriod,
  daysEventCovers,
  daysOfWeek,
  isOutsideWindow,
} from "@/lib/calendarDates";
import {
  addDays,
  formatDayLabel,
  formatWeekRange,
  isSameDay,
  sundayOf,
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

type CalendarViewMode = "week" | "day";

type CalendarViewsProps = {
  events: CalendarEventView[];
  /**
   * True for admin/parent sessions, computed server-side in page.tsx —
   * used from C4 onward to gate the FloatingAddButton and the detail
   * sheet's Edit/⋯. Per STRUCTURE.md, hiding UI is never the real gate —
   * the write actions in actions/calendar.ts check this independently,
   * so a kid whose browser somehow rendered these controls anyway would
   * still be refused server-side.
   */
  canManage: boolean;
  /** Event id -> creator's display name, for the detail sheet's "Added by"
   * line. Built in page.tsx (the one place that already joins `createdBy`)
   * rather than added to CalendarEventView itself — see that file's own
   * comment for why. Null for an event whose creator was deactivated
   * (SetNull) or that predates this field. */
  createdByNames: Record<string, string | null>;
  /**
   * The bounds of page.tsx's one server fetch (day-level; see its own
   * WINDOW_DAYS comment) — used ONLY to decide whether paging further
   * would reach a period whose events were never queried, never to decide
   * "today" (that's useToday()'s job alone). Prev/Next disable at these
   * edges rather than letting the user page into a false "No events" —
   * see DaySection.tsx's NotLoadedCard for the same guarantee applied a
   * second, defensive way (a Week/Day view switch right at the edge can
   * still land a day outside the window even with paging disabled).
   */
  windowStart: Date;
  windowEnd: Date;
};

/**
 * The Calendar branch's whole client-side shell: which view (Week/Day) and
 * which period is on screen, both driven from the browser's own clock
 * (useToday()) and never the server's — Vercel runs UTC, the household
 * runs Mountain (see useToday.ts). `events` is the page's one server fetch
 * (a generous window around the server clock, used only to bound the
 * query — see page.tsx's own comment); everything else — which specific
 * days to show, which of `events` land on each one — is computed here.
 */
export function CalendarViews({
  events,
  canManage,
  createdByNames,
  windowStart,
  windowEnd,
}: CalendarViewsProps) {
  const router = useRouter();
  const today = useToday();
  const [view, setView] = useState<CalendarViewMode>("week");
  const [offsetDays, setOffsetDays] = useState(0);
  const [pickingView, setPickingView] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [selected, setSelected] = useState<{ event: CalendarEventView; day: Date } | null>(null);

  // `today` is null during SSR and the first client render (see
  // useToday()'s own comment). Every value below that would otherwise
  // depend on "which day is it" stays null too, on purpose, rather than
  // guessing — that's what lets the header and DaySection below render an
  // honestly-loading frame instead of a wrong one.
  const anchor = today === null ? null : addDays(today, offsetDays);
  const weekStart = anchor === null ? null : sundayOf(anchor);
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
    (view === "week" ? isSameDay(weekStart, sundayOf(today)) : isSameDay(anchor, today));

  const title =
    today === null || anchor === null || weekStart === null
      ? null
      : view === "week"
        ? formatWeekRange(weekStart)
        : formatDayLabel(anchor);

  function step(direction: 1 | -1) {
    setOffsetDays((previous) => previous + direction * (view === "week" ? 7 : 1));
  }

  // Week always shows seven DaySections, Day always shows one — fixed by
  // `view` alone, never by `today` — so the loading frame below can render
  // the right COUNT of placeholders before `today` resolves, matching
  // exactly what the resolved frame will show.
  const placeholderCount = view === "week" ? 7 : 1;

  // Disable Next/Prev the moment stepping ONE MORE period would land on a
  // period with NO loaded days at all — not the moment the CURRENT period
  // merely touches the edge. `nextPeriodStart` / `previousPeriodEnd` are
  // the CANDIDATE period's own edge day closest to "now" (its first day
  // forward, or its last day backward); `canStepToPeriod` (calendarDates.ts)
  // is what decides whether that day is fully loaded, and it's the exact
  // same full-containment predicate `isOutsideWindow` below uses per-day —
  // Prev and Next and every individual DaySection now all agree by
  // construction, not by two hand-written copies of the same idea staying
  // in sync. See calendarDates.ts's own doc comments for why this needs
  // full containment (not just "does this day's start land inside") and
  // why raw `.getTime()` comparisons matter here.
  const nextPeriodStart =
    view === "week"
      ? weekStart === null
        ? null
        : addDays(weekStart, 7)
      : anchor === null
        ? null
        : addDays(anchor, 1);
  const previousPeriodEnd =
    view === "week"
      ? weekStart === null
        ? null
        : addDays(weekStart, -1)
      : anchor === null
        ? null
        : addDays(anchor, -1);
  // The window check is only the right question when a step moves AWAY from
  // today — a step TOWARD today must never be refused, even into a
  // candidate period that's itself outside the window (it shows the honest
  // NotLoadedCard, and the next step gets closer). Without this a Week→Day
  // switch right at the edge could strand both arrows: Prev'd to
  // Jun 28–Jul 4, Day view on Wed Jul 1 has a not-loaded day on BOTH sides.
  // Vision pass-3 note (a): if the device clock is skewed enough that
  // `today` itself sits outside the window (61+ days off), the "away from
  // today" direction check above can't tell which way is actually toward
  // the data anymore — both directions look like "away from today" the
  // first time anchor === today. `anchorBeforeWindow`/`anchorAfterWindow`
  // track whether the CURRENT period itself hasn't reached the window
  // yet (not `today`, which never changes for the render) — once paging
  // carries the anchor into or past the window, these go false and the
  // ordinary edge checks above resume unaided. In the ordinary case
  // (today inside the window, as it always is on a real device) both are
  // false from the start, so this changes nothing about the already-
  // verified C7 behavior.
  const anchorBeforeWindow = anchor !== null && anchor.getTime() < windowStart.getTime();
  const anchorAfterWindow = anchor !== null && anchor.getTime() > windowEnd.getTime();
  const atWindowEnd =
    today !== null &&
    nextPeriodStart !== null &&
    nextPeriodStart.getTime() > today.getTime() &&
    !canStepToPeriod(nextPeriodStart, windowStart, windowEnd) &&
    !anchorBeforeWindow;
  const atWindowStart =
    today !== null &&
    previousPeriodEnd !== null &&
    previousPeriodEnd.getTime() < today.getTime() &&
    !canStepToPeriod(previousPeriodEnd, windowStart, windowEnd) &&
    !anchorAfterWindow;

  return (
    <div>
      <CalendarHeader
        view={view}
        onPickView={() => setPickingView(true)}
        todayResolved={today !== null}
        isCurrentPeriod={isCurrentPeriod}
        onToday={() => setOffsetDays(0)}
        title={title}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        prevDisabled={today === null || atWindowStart}
        nextDisabled={today === null || atWindowEnd}
        prevLabel={view === "week" ? "Previous week" : "Previous day"}
        nextLabel={view === "week" ? "Next week" : "Next day"}
      />

      <div className="flex flex-col gap-4">
        {today === null
          ? Array.from({ length: placeholderCount }, (_, index) => (
              <DaySection key={index} loading />
            ))
          : days.map((day) => (
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
            ))}
      </div>

      {pickingView && (
        <RadioSheet<CalendarViewMode>
          title="View"
          options={[
            { value: "week", label: "Week" },
            { value: "day", label: "Day" },
          ]}
          selected={view}
          onSelect={setView}
          onClose={() => setPickingView(false)}
        />
      )}

      {/* Kids see the same read-only calendar with no way to reach any of
          this — the action's own MANAGER_ROLES check is the real gate
          (see actions/calendar.ts), this is only the UI half. */}
      {canManage && (
        <FloatingAddButton onClick={() => setAddingEvent(true)} />
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
                const dateParam = anchor ? `?date=${toDateParam(anchor)}` : "";
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
          createdByName={createdByNames[selected.event.id] ?? null}
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

/** "YYYY-MM-DD" for the `?date=` param `/calendar/new` reads — the same
 * local-calendar-day format PantryItemEditSheet's/EventForm's own
 * toDateInputValue produce, kept as its own tiny local copy rather than a
 * shared export: this is a URL param, not a form input value, and the two
 * jobs happening to want the same string shape doesn't make them one
 * vocabulary. */
function toDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
