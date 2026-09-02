"use client";

import { useState } from "react";
import { CalendarCheck, CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { RadioSheet } from "./RadioSheet";
import { DaySection } from "./DaySection";
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
   * True for admin/parent sessions, computed server-side in page.tsx.
   * Unused by C3 — this branch is read-only in K1's third contract — and
   * kept in this type (not destructured below — an unused destructured
   * binding is what the lint rule actually flags, a type field costs
   * nothing) only so C4 (create/edit/delete) can gate its
   * FloatingAddButton and per-event Edit/Delete on the exact boolean the
   * page already computed, rather than every client component
   * re-deriving it. Per STRUCTURE.md, hiding UI is never the real gate —
   * the write actions in actions/calendar.ts check this independently.
   */
  canManage: boolean;
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
export function CalendarViews({ events, windowStart, windowEnd }: CalendarViewsProps) {
  const today = useToday();
  const [view, setView] = useState<CalendarViewMode>("week");
  const [offsetDays, setOffsetDays] = useState(0);
  const [pickingView, setPickingView] = useState(false);

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
  const atWindowEnd =
    today !== null &&
    nextPeriodStart !== null &&
    nextPeriodStart.getTime() > today.getTime() &&
    !canStepToPeriod(nextPeriodStart, windowStart, windowEnd);
  const atWindowStart =
    today !== null &&
    previousPeriodEnd !== null &&
    previousPeriodEnd.getTime() < today.getTime() &&
    !canStepToPeriod(previousPeriodEnd, windowStart, windowEnd);

  return (
    <div>
      <div className="mb-5 flex items-center justify-center gap-10">
        <ActionCircle
          icon={<CalendarCheck aria-hidden="true" size={22} />}
          label="Today"
          onClick={() => setOffsetDays(0)}
          disabled={today === null || isCurrentPeriod}
        />
        <ActionCircle
          icon={<CalendarRange aria-hidden="true" size={22} />}
          label={view === "week" ? "Week" : "Day"}
          onClick={() => setPickingView(true)}
        />
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={today === null || atWindowStart}
          aria-label={view === "week" ? "Previous week" : "Previous day"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors active:bg-surface-2 disabled:opacity-40"
        >
          <ChevronLeft aria-hidden="true" size={22} />
        </button>

        {/* Pinned height: this is the one piece of the header whose CONTENT
            depends on `today` (the title text itself), so it's the one
            piece that needs the null-frame and resolved-frame to match
            exactly rather than by coincidence. The buttons on either side
            render identically regardless of `today`, so they need no such
            pinning. */}
        <span className="flex h-7 min-w-0 flex-1 items-center justify-center">
          {title === null ? (
            <span aria-hidden="true" className="h-5 w-32 animate-pulse rounded bg-surface-2" />
          ) : (
            <h2 className="truncate text-lg font-semibold">{title}</h2>
          )}
        </span>

        <button
          type="button"
          onClick={() => step(1)}
          disabled={today === null || atWindowEnd}
          aria-label={view === "week" ? "Next week" : "Next day"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors active:bg-surface-2 disabled:opacity-40"
        >
          <ChevronRight aria-hidden="true" size={22} />
        </button>
      </div>

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
    </div>
  );
}

function ActionCircle({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 disabled:opacity-40"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-fg transition-colors active:bg-line">
        {icon}
      </span>
      <span className="text-xs font-medium text-muted">{label}</span>
    </button>
  );
}
