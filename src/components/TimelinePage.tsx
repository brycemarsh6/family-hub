"use client";

// One PAGE of the hour timeline (mission 69 / C1): the sticky header's
// contents (weekday row, all-day strip, not-loaded banner) and the day
// columns, each self-contained given `columnDays`, so the sliding track can
// render three of them side by side. `TimelineGrid.tsx` keeps the scroller,
// sizing, zoom, scroll-to-now, the gutter and the sticky wrapper. Moved
// wholesale from there, not rewritten; the long reasoning comments travelled
// with the code they explain.

import { useMemo } from "react";
import { CalendarOff } from "lucide-react";
import {
  blockGeometry,
  partitionForTimeline,
  assignColumns,
  type TimelineEvent,
  type TimelineColumnSlot,
  type TimelineBlock,
} from "@/lib/timelineLayout";
import { isSameDay } from "@/lib/mealPlanDates";
import { isOutsideWindow } from "@/lib/calendarDates";
import { MINUTES_PER_DAY } from "@/lib/timelineLayout";
import { TimelineAllDayStrip } from "./TimelineAllDayStrip";
import { AllDayToggle } from "./AllDayToggle";
import { TimelineDayHeaderRow, TimelineDayLabel } from "./TimelineDayHeader";
import { TimelineDayColumn } from "./TimelineDayColumn";
import type { CalendarEventView, CalendarHabitDayView, CalendarTaskView } from "@/lib/types";

export const GUTTER_WIDTH_PX = 48;

/** Hour labels ("12 AM", "1 AM", ... "11 PM") via `Intl`, computed once at
 * module load against a fixed, deliberately non-transition date (Jan 1 —
 * nowhere near either US DST boundary) purely as a vehicle to get
 * `Intl.DateTimeFormat` to spell out a given HOUR NUMBER, never rendered or
 * compared as a real calendar day. */
const HOUR_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: true });
const HOUR_LABELS = Array.from({ length: MINUTES_PER_DAY / 60 }, (_, hour) =>
  HOUR_LABEL_FORMATTER.format(new Date(2000, 0, 1, hour, 0)),
);

/** The column of hour labels. It reads `--hour-height` like the day columns
 * do, so the labels and the gridlines stay level while zooming. Day view draws
 * one inside each page (it slides with its day); 3 Day and Week draw one fixed
 * gutter beside the sliding viewport. */
export function TimelineHourLabels() {
  return (
    <div aria-hidden="true" className="relative shrink-0 bg-bg" style={{ width: GUTTER_WIDTH_PX }}>
      {HOUR_LABELS.map((label, hour) => (
        <span
          key={hour}
          data-hour-label={hour}
          // whitespace-nowrap + min(): mission 70's marker precedent, so "10 AM" never wraps at Largest.
          className="absolute right-1 -translate-y-1/2 whitespace-nowrap text-[min(0.625rem,12px)] text-muted"
          style={{ top: `calc(var(--hour-height) * ${hour})` }}
        >
          {hour === 0 ? "" : label}
        </span>
      ))}
    </div>
  );
}

/** The grid template the weekday row, the all-day strip and (in Day) the
 * columns page share, so they stay pixel-aligned by construction. Day's pages
 * carry their own gutter cell (48px). In 3 Day and Week the header pages pass
 * a zero-width first cell (the strip and weekday row place their bars around
 * it) and the columns page is a plain `repeat(n, minmax(0, 1fr))` beside the
 * fixed gutter, which lines up because both sit in same-width viewports. */
export function timelineGridTemplate(columnCount: number, gutterPx: number = GUTTER_WIDTH_PX): string {
  return `${gutterPx}px repeat(${columnCount}, minmax(0, 1fr))`;
}

/** One event's shape as the pure layout library needs it — see
 * timelineLayout.ts's own `TimelineEvent` doc comment for why this is
 * deliberately narrower than `CalendarEventView`. */
function toTimelineEvent(event: CalendarEventView): TimelineEvent {
  return { id: event.id, startAt: event.startAt, endAt: event.endAt, allDay: event.allDay };
}

function dayKey(columnDays: Date[]): string {
  return columnDays.map((day) => day.getTime()).join(",");
}

type TimelinePageHeaderProps = {
  columnDays: Date[];
  events: CalendarEventView[];
  tasks: CalendarTaskView[];
  habitDays: CalendarHabitDayView[];
  today: Date;
  windowStart: Date;
  windowEnd: Date;
  onOpenEvent: (event: CalendarEventView, day: Date) => void;
  onOpenTask: (task: CalendarTaskView, day: Date) => void;
  /** Day only: this page carries its own gutter corner (the date). */
  ownGutter: boolean;
  /** Mission 73: the all-day row's open state, owned by TimelineGrid. Only the
   * current page gets it; neighbour pages are always collapsed. `showToggle`
   * is whether the chevron shows (something hidden, or open). In Day the
   * chevron sits under the date in this page's corner. */
  allDay?: { expanded: boolean; showToggle: boolean; onToggle: () => void };
};

export function TimelinePageHeader({
  columnDays,
  events,
  tasks,
  habitDays,
  today,
  windowStart,
  windowEnd,
  onOpenEvent,
  onOpenTask,
  ownGutter,
  allDay,
}: TimelinePageHeaderProps) {
  const columnDaysKey = dayKey(columnDays);
  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const { allDayRow } = useMemo(
    () => partitionForTimeline(columnDays, events.map(toTimelineEvent)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnDaysKey, events],
  );

  // mission-17/C5 — Strange reached the state where a Day/3 Day/Week
  // column's window coverage was fully out of the fetched range and found
  // the accessible text byte-identical to a genuinely-empty day, since the
  // only differentiator was a 9x9px `aria-hidden` glyph. `outsideColumns`
  // and `allColumnsOutside` below are what let the render body below show
  // DaySection's own WORDED not-loaded card in that case — see that
  // section's own comment for the full reasoning, including why a single
  // shared banner correctly covers BOTH "Day as a card in the column body"
  // and "3 Day/Week as a single strip" (Day has exactly one column, so the
  // two descriptions collapse to the identical element).
  const outsideColumns = columnDays.map((day) => isOutsideWindow(day, windowStart, windowEnd));
  const allColumnsOutside = outsideColumns.length > 0 && outsideColumns.every(Boolean);


  const compact = columnDays.length > 1; // 3 Day / Week — Day view (1 column) gets more detail (D5).
  // Pages without their own gutter have no gutter cell: the corner is fixed outside the track.
  const gridTemplateColumns = timelineGridTemplate(columnDays.length, ownGutter ? GUTTER_WIDTH_PX : 0);

  return (
    <>
      {/* 3 Day and Week: the weekday row. Day view has no row: its label
          rides in the all-day strip's gutter corner (mission 67). */}
      {compact && (
        <TimelineDayHeaderRow
          columnDays={columnDays}
          today={today}
          windowStart={windowStart}
          windowEnd={windowEnd}
          gridTemplateColumns={gridTemplateColumns}
        />
      )}

      {/* mission-17/C6 — the all-day strip's own grid (tasks, events,
          the expand state, the "+N more" button) now lives in
          `./TimelineAllDayStrip.tsx`; see that file's own header for
          the full reasoning. Passed `allDayRow` (already partitioned
          above, not re-derived), `eventById` (the SAME map the hour
          rail below also reads), and the SAME `gridTemplateColumns`
          string this header row and the hour rail use, so all three
          stay pixel-aligned by construction rather than by three
          independently-matching formulas. Renders nothing (no height
          claimed) when there's nothing to show — see that file's own
          early-return comment. */}
      <TimelineAllDayStrip
        columnDays={columnDays}
        allDayRow={allDayRow}
        tasks={tasks}
        habitDays={habitDays}
        eventById={eventById}
        onOpenEvent={onOpenEvent}
        onOpenTask={onOpenTask}
        gridTemplateColumns={gridTemplateColumns}
        expanded={allDay?.expanded ?? false}
        onExpand={allDay?.onToggle}
        corner={
          ownGutter ? (
            <>
              <TimelineDayLabel
                day={columnDays[0]}
                today={today}
                notLoaded={outsideColumns[0]}
              />
              {allDay?.showToggle && (
                <AllDayToggle expanded={allDay.expanded} onToggle={allDay.onToggle} />
              )}
            </>
          ) : undefined
        }
      />

      {/* mission-17/C5 — Strange reached the state (2000ms injected
          latency + 14 rapid Next taps) where every column here was
          fully outside the fetched window, and found the accessible
          text byte-identical to a genuinely-empty day apart from the
          dates — the only differentiator was a 9x9px `aria-hidden`
          glyph next to each day number above. DaySection.tsx's own
          `NotLoadedCard` already solves this with WORDED text
          (`ScheduleView` still renders it, proving the treatment is
          affordable); that component is private to DaySection.tsx and
          off this contract's boundary, so its markup is reproduced
          verbatim here rather than imported. Rendered only when EVERY
          column is out of window — the realistic case, since the fetch
          window moves as one block — leaving the per-column glyph above
          as the only signal for a MIXED window (only possible in 3 Day/
          Week, never Day, which has exactly one column and so is never
          "mixed"). That single-column case is also why one shared
          element correctly satisfies BOTH "Day as a card in the column
          body" and "3 Day/Week as a single strip": with one column, a
          full-width strip IS the column's own body. */}
      {allColumnsOutside && (
        <div className="m-2 flex items-start gap-2 rounded-xl border border-line bg-surface px-3 py-3 text-sm text-muted">
          <CalendarOff aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          <span>
            Not all events loaded
            <span className="mt-0.5 block text-xs">
              Marshee shows about two months each way — tap Today to come back.
            </span>
          </span>
        </div>
      )}
    </>
  );
}

type TimelinePageColumnsProps = {
  columnDays: Date[];
  events: CalendarEventView[];
  today: Date;
  now: Date;
  hoursPerDay: number;
  pxPerMinute: number;
  onOpenEvent: (event: CalendarEventView, day: Date) => void;
  /** Day only: this page starts with its own hour labels. */
  ownGutter: boolean;
  /** Mission 70: blocks may lift (the viewer can edit events). */
  canDrag: boolean;
};

export function TimelinePageColumns({
  columnDays,
  events,
  today,
  now,
  hoursPerDay,
  pxPerMinute,
  onOpenEvent,
  ownGutter,
  canDrag,
}: TimelinePageColumnsProps) {
  const columnDaysKey = dayKey(columnDays);
  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const { timed } = useMemo(
    () => partitionForTimeline(columnDays, events.map(toTimelineEvent)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnDaysKey, events],
  );

  // One `assignColumns` call PER COLUMN (never once for the whole set) —
  // each day's timed blocks are laid out independently, which is what lets
  // a Fri 10 PM -> Sat 2 AM event draw a clipped block on BOTH days without
  // the two clipped halves fighting over one shared column assignment.
  const columnSlots: TimelineColumnSlot<TimelineBlock>[][] = columnDays.map((day) => {
    const blocks: TimelineBlock[] = [];
    for (const event of timed) {
      const geometry = blockGeometry(day, event);
      if (geometry) {
        blocks.push({ id: event.id, topMinutes: geometry.topMinutes, heightMinutes: geometry.heightMinutes });
      }
    }
    return assignColumns(blocks);
  });

  const compact = columnDays.length > 1; // 3 Day / Week — Day view (1 column) gets more detail (D5).

  // Mission 69 (F2): Day's page starts with its own hour labels, so they ride
  // in with their day. 3 Day and Week pages are day columns only; their one
  // gutter is fixed beside the viewport that holds the track.
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: ownGutter
          ? timelineGridTemplate(1)
          : `repeat(${columnDays.length}, minmax(0, 1fr))`,
        height: `calc(var(--hour-height) * ${hoursPerDay})`,
      }}
    >
      {ownGutter && <TimelineHourLabels />}
      {columnDays.map((day, columnIndex) => (
        <TimelineDayColumn
          key={day.getTime()}
          day={day}
          isToday={isSameDay(day, today)}
          slots={columnSlots[columnIndex]}
          eventById={eventById}
          now={now}
          hoursPerDay={hoursPerDay}
          pxPerMinute={pxPerMinute}
          compact={compact}
          onOpenEvent={onOpenEvent}
          canDrag={canDrag}
        />
      ))}
    </div>
  );
}
