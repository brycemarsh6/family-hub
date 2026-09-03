"use client";

import { monthGridDays, assignLanes, type MonthLayoutEvent } from "@/lib/monthLayout";
import { daysEventCovers, isOutsideWindow } from "@/lib/calendarDates";
import { addDays, isSameDay, isSameMonth, SHORT_DAY_NAMES } from "@/lib/mealPlanDates";
import { MonthCell, type MonthCellSlot } from "./MonthCell";
import type { CalendarEventView } from "@/lib/types";

const GRID_ROWS = 6;
const ROW_LENGTH = 7;
const VISIBLE_LANES = 3;

// Same header-row-plus-rows wrapper classes on both the SHORT_DAY_NAMES
// header and every day row below, so the two stay column-aligned by
// sharing one layout definition rather than two hand-tuned copies that
// could drift apart. Deliberately NO column gap (mission-9/C5, Strange's
// B2 finding): a `gap-1` here put 11.9px of page background between two
// adjacent cells' pills, breaking a multi-day bar into visibly separate
// chips — a 33% gap on a 36.4px segment. The VERTICAL gap between the six
// week rows is unaffected; it lives on the separate `flex flex-col gap-1`
// wrapper below, not on this row-level class.
const ROW_CLASS = "grid grid-cols-7 px-1";

/**
 * The Sunday-first six-week grid (mission-9/C2b) — the one component that
 * turns monthLayout.ts's pure, per-row `assignLanes` output into what a
 * family actually sees: header row, six rows of MonthCell, pills, spanning
 * bars, "+N more". `assignLanes` is called ONCE PER ROW (never once for
 * the whole month), per that library's own contract — a multi-day event is
 * clipped to each row automatically, and drawing the week-break
 * CONTINUATION (open vs. closed bar ends) is this component's job, done
 * below with `daysEventCovers` on the day just outside each row.
 *
 * Rendered only once `today`/`anchor` have resolved client-side — see
 * CalendarViews.tsx, which owns the `today === null` guard.
 */
export function MonthGrid({
  anchor,
  today,
  events,
  windowStart,
  windowEnd,
  onOpenDay,
}: {
  anchor: Date;
  today: Date;
  events: CalendarEventView[];
  /** page.tsx's fetch bounds — passed straight to `isOutsideWindow` per
   * cell, exactly as Week/Day already do (see CalendarViews.tsx). */
  windowStart: Date;
  windowEnd: Date;
  /** Opens Day view anchored on the tapped day — see CalendarViews.tsx's
   * `openDay` for how this composes with the period cursor without
   * touching useCalendarPeriod.ts (outside this contract's boundary). */
  onOpenDay: (day: Date) => void;
}) {
  const gridDays = monthGridDays(anchor);
  // MonthLayoutEvent is a narrowed, id/span-only shape (monthLayout.ts may
  // only import mealPlanDates/calendarDates, never src/lib/types) — this
  // map is how a `MonthLaneSpan` gets back to the real title/people this
  // component needs to render.
  const eventById = new Map(events.map((event) => [event.id, event]));
  const layoutEvents: MonthLayoutEvent[] = events.map((event) => ({
    id: event.id,
    startAt: event.startAt,
    endAt: event.endAt,
    allDay: event.allDay,
  }));

  return (
    <div>
      <div className={`${ROW_CLASS} pb-1 text-center text-xs font-semibold uppercase tracking-wide text-muted`}>
        {SHORT_DAY_NAMES.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {Array.from({ length: GRID_ROWS }, (_, rowIndex) => {
          const rowDays = gridDays.slice(rowIndex * ROW_LENGTH, (rowIndex + 1) * ROW_LENGTH);
          const { spans, overflowByDay } = assignLanes(rowDays, layoutEvents);

          // Constraint 1 (Vision, mission-9): a continuing bar may land on
          // a DIFFERENT lane in the row below, so continuity can only be
          // drawn per row, as open/closed bar ends — never a connector
          // that assumes the lane number carries across the break. A span
          // is "open" on an edge when the event also covers the day just
          // past that edge, checked once per span (not per column).
          const dayBeforeRow = addDays(rowDays[0], -1);
          const dayAfterRow = addDays(rowDays[ROW_LENGTH - 1], 1);

          const cellSlots: MonthCellSlot[][] = rowDays.map(() =>
            new Array(VISIBLE_LANES).fill(null) as MonthCellSlot[],
          );
          for (const span of spans) {
            const event = eventById.get(span.event.id);
            if (!event) continue; // defensive; every span's event came from `events`
            const continuesBefore =
              daysEventCovers(event.startAt, event.endAt, event.allDay, [dayBeforeRow]).length > 0;
            const continuesAfter =
              daysEventCovers(event.startAt, event.endAt, event.allDay, [dayAfterRow]).length > 0;
            for (let col = span.startCol; col <= span.endCol; col++) {
              cellSlots[col][span.lane] = {
                event,
                showLabel: col === span.startCol,
                roundLeft: col === span.startCol && !continuesBefore,
                roundRight: col === span.endCol && !continuesAfter,
              };
            }
          }

          return (
            <div key={rowIndex} className={ROW_CLASS}>
              {rowDays.map((day, col) => (
                <MonthCell
                  key={day.getTime()}
                  day={day}
                  today={today}
                  isCurrentMonth={isSameMonth(day, anchor)}
                  isToday={isSameDay(day, today)}
                  // Constraint 3 (Vision/mission-9): a bar the app DOES
                  // have real data for still renders through a not-loaded
                  // cell — this glyph means "there may be MORE we don't
                  // know about", not "we know nothing here", the same
                  // policy DaySection.tsx's NotLoadedCard already applies
                  // (fetched cards render alongside the caveat, not
                  // instead of it).
                  notLoaded={isOutsideWindow(day, windowStart, windowEnd)}
                  slots={cellSlots[col]}
                  overflow={overflowByDay[col]}
                  onOpen={() => onOpenDay(day)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
