"use client";

import { useState } from "react";
import { CalendarCheck, CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { RadioSheet } from "./RadioSheet";
import { DaySection } from "./DaySection";
import { useToday } from "@/lib/useToday";
import { daysEventCovers, daysOfWeek } from "@/lib/calendarDates";
import {
  addDays,
  formatDayLabel,
  formatWeekRange,
  isSameDay,
  startOfDay,
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
  // merely touches the edge. That distinction matters and was only found
  // by actually running this with a Mountain-timezone browser against this
  // UTC-clocked dev server: `windowStart`/`windowEnd` are instants built
  // server-side from the SERVER's own local calendar components
  // (page.tsx), while every date below is local midnight in the BROWSER's
  // timezone (from useToday()). Because Mountain is BEHIND UTC, a
  // server-built "midnight of day X" instant reads back as still being on
  // day X-1 by the time a Mountain browser's OWN local midnight for day X
  // arrives — so a check like "is this period's last day already past
  // windowEnd" can go true for a period whose local calendar days, read
  // from the browser's own clock, turn out to have NONE of them actually
  // inside [windowStart, windowEnd] (confirmed live: the seeded Nov 1 2026
  // week rendered as reachable but showed the NotLoaded card on all seven
  // days). Checking the NEXT candidate period's first (or previous
  // period's last) day instead is what keeps every reachable period
  // guaranteed to hold at least one real loaded day — a partially-loaded
  // period right at the edge is still reachable, only a period with
  // nothing loaded in it at all becomes unreachable, which is what "cannot
  // reach a period whose data was never loaded" actually requires.
  // Comparing with plain `.getTime()` (never re-flooring a server-built
  // instant through the browser's own startOfDay/getFullYear) is what
  // avoids the reinterpretation in the first place — a Date's epoch
  // timestamp is the same absolute instant no matter whose clock reads it.
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
  const atWindowEnd = nextPeriodStart !== null && nextPeriodStart.getTime() > windowEnd.getTime();
  const atWindowStart =
    previousPeriodEnd !== null && previousPeriodEnd.getTime() < windowStart.getTime();

  // `day` here is always a browser-built local midnight already (from
  // daysOfWeek/the anchor), so flooring it with startOfDay is a safe no-op
  // — unlike windowStart/windowEnd above, it never crossed the server/
  // client boundary, so there's nothing to reinterpret.
  function isOutsideWindow(day: Date): boolean {
    const time = startOfDay(day).getTime();
    return time < windowStart.getTime() || time > windowEnd.getTime();
  }

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
                notLoaded={isOutsideWindow(day)}
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
