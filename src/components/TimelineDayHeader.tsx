"use client";

// The weekday header of TimelineGrid.tsx's sticky header, split out in
// mission 67 (Calendar full screen PR 1, contract C2) so Day view can put the
// SAME label in the gutter corner of the all-day strip instead of in a row of
// its own. `TimelineDayLabel` is one day's weekday, date circle and
// not-loaded glyph; `TimelineDayHeaderRow` is the row 3 Day and Week draw
// above the all-day strip (one label per column, the gutter left empty).
// Moved verbatim from TimelineGrid.tsx, behaviour unchanged.

import { CalendarOff } from "lucide-react";
import { isSameDay, SHORT_DAY_NAMES } from "@/lib/mealPlanDates";
import { isOutsideWindow } from "@/lib/calendarDates";

type TimelineDayLabelProps = {
  day: Date;
  today: Date;
  /** `isOutsideWindow(day, windowStart, windowEnd)`, decided by the caller. */
  notLoaded: boolean;
};

/** One day's label: weekday, date number (circled when it is today), and the not-loaded glyph. */
export function TimelineDayLabel({ day, today, notLoaded }: TimelineDayLabelProps) {
  const isToday = isSameDay(day, today);
  return (
    <div className="flex flex-col items-center gap-0.5 px-0.5">
      <span className={`text-[0.625rem] font-semibold uppercase tracking-wide ${isToday ? "text-accent" : "text-muted"}`}>
        {SHORT_DAY_NAMES[day.getDay()]}
      </span>
      <span className="flex items-center gap-0.5">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
            isToday ? "bg-accent text-accent-fg" : "text-fg"
          }`}
        >
          {day.getDate()}
        </span>
        {/* Per-column not-loaded glyph — MonthCell's own policy
            (small, muted, next to the day number), applied here
            rather than inside the all-day lanes below: a day
            with zero all-day events still needs somewhere to
            say "not fully fetched," and the header cell is
            where MonthCell puts the identical fact.
            mission-17/C7, item 2 — the glyph alone was
            `aria-hidden`, telling a screen reader nothing in a
            mixed window; the sr-only span says it in words.
            Never `hidden` — `display: none` drops it from the
            a11y tree entirely (mission-9's finding).
            mission-18/C1 — the string used to read "no events
            loaded for this day," which is FALSE on the real
            production path and was shipped anyway (mission-17's
            own delivery note names it as CV4's one open
            finding). `isOutsideWindow` (calendarDates.ts) flags
            a day whenever EITHER edge fails full containment —
            including a day that's only PARTIALLY outside, which
            is the common case here, not an edge case: the fetch
            window's edges are built server-side from
            `startOfDay`/`addDays` (calendarPaging.ts's
            `buildFetchWindow`), both of which construct
            midnight in the SERVER's own runtime timezone (UTC
            on Vercel). Rendered here in the BROWSER (this file
            is "use client"), that UTC-midnight instant lands at
            6 PM Mountain Daylight Time (5 PM Standard) the
            PRECEDING Denver calendar day — so the last day the
            window is meant to cover still gets everything from
            its own local midnight up to that afternoon/evening
            cutoff fetched and rendered right here, in the same
            column, underneath a label claiming zero did. This
            can only be OBSERVED on a UTC server: a Denver dev
            server's own `startOfDay` already lands on a Denver
            midnight, so the two edges agree and the false case
            never occurs locally — confirmed by reading
            `buildFetchWindow`'s and `isOutsideWindow`'s own
            implementations, not by trying to reproduce it here.
            "Not all events loaded" is true in BOTH the fully-
            unfetched case and this partial one, reads the same
            as a count could never be misheard as ("not all"
            can't parse as a number the way "no events" briefly
            could), and is the exact phrase this file's own
            TimelineGrid.tsx's worded banner and DaySection.tsx's
            `NotLoadedCard` already use — one wording for the
            same fact everywhere the app states it, not three.
            mission-17/C8 (round 3, Strange) — the day number
            sits right before this ("Fri", "6", then this span),
            which is why a leading "no"/"not" still matters:
            nothing here should ever read as a quantity. */}
        {notLoaded && (
          <>
            <CalendarOff aria-hidden="true" size={9} className="shrink-0 text-muted" />
            <span className="sr-only">— not all events loaded</span>
          </>
        )}
      </span>
    </div>
  );
}

type TimelineDayHeaderRowProps = {
  columnDays: Date[];
  today: Date;
  windowStart: Date;
  windowEnd: Date;
  /** The one string TimelineGrid.tsx computes for header, all-day strip and hour rail. */
  gridTemplateColumns: string;
};

/** The weekday row for 3 Day and Week: an empty gutter cell, then one label per column. */
export function TimelineDayHeaderRow({
  columnDays,
  today,
  windowStart,
  windowEnd,
  gridTemplateColumns,
}: TimelineDayHeaderRowProps) {
  return (
    <div className="grid py-1" style={{ gridTemplateColumns }}>
      <span aria-hidden="true" />
      {columnDays.map((day) => (
        <TimelineDayLabel
          key={day.getTime()}
          day={day}
          today={today}
          notLoaded={isOutsideWindow(day, windowStart, windowEnd)}
        />
      ))}
    </div>
  );
}
