"use client";

import { monthGridDays, assignLanes, type MonthLayoutEvent } from "@/lib/monthLayout";
import {
  daysEventCovers,
  isOutsideWindow,
  allDayInstantToLocalDay,
  localDayToAllDayInstant,
} from "@/lib/calendarDates";
import { addDays, isSameDay, isSameMonth, SHORT_DAY_NAMES } from "@/lib/mealPlanDates";
import { MonthCell, type MonthCellSlot } from "./MonthCell";
import type { CalendarEventView, CalendarTaskView } from "@/lib/types";

/**
 * A task, reshaped into the exact CalendarEventView shape MonthCell.tsx
 * already knows how to render (mission-14/C3, D1: "no second packer" — see
 * this file's own MonthGrid comment below for the fuller reasoning).
 * `endAt` is built the SAME way every other single-day all-day span in this
 * app is built (EventForm.tsx's `toggleAllDay`, TaskForm.tsx's own
 * `localDayToAllDayInstant`): the due day's UTC-midnight instant plus one
 * calendar day, giving the EXCLUSIVE end `eventDaySpan`/`daysEventCovers`
 * (calendarDates.ts) expect for an all-day row. `notes`/`location`/
 * `createdByName` are filled with the "no such fact" value a real
 * CalendarEventView would use when absent — a Task genuinely has none of
 * these, not merely unset ones.
 */
function taskAsMonthEvent(task: CalendarTaskView): CalendarEventView {
  const localDay = allDayInstantToLocalDay(task.dueDate);
  return {
    id: task.id,
    title: task.title,
    notes: null,
    location: null,
    startAt: task.dueDate,
    endAt: localDayToAllDayInstant(addDays(localDay, 1)),
    allDay: true,
    people: task.people,
    createdByName: null,
  };
}

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
 *
 * `tasks` (mission-14/C3) shares the SAME lane packer as `events` — see
 * `taskAsMonthEvent` above and the `eventById` construction below for how a
 * task becomes a pill without teaching `assignLanes` or MonthCell.tsx a
 * second shape (D1: "no second packer", same rule CV2 followed for the
 * timeline/Month split).
 *
 * mission-14/C3 shipped with a real, disclosed gap: MonthCell.tsx was
 * outside that contract's file boundary, so a completed task's pill was
 * pixel-identical to an open one. C3b closes it — `completedTaskIds` below
 * is the only new plumbing this needed, since MonthCell.tsx (now in
 * bounds) does the actual rendering. Lane assignment and the "+N more"
 * count are untouched: a completed task is still just another
 * {id, startAt, endAt, allDay} span to `assignLanes`, exactly as before.
 */
export function MonthGrid({
  anchor,
  today,
  events,
  tasks,
  windowStart,
  windowEnd,
  onOpenDay,
}: {
  anchor: Date;
  today: Date;
  events: CalendarEventView[];
  /** Tasks due within the fetched window — see the module comment above
   * `taskAsMonthEvent` and this component's own doc comment for how these
   * become pills. */
  tasks: CalendarTaskView[];
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
  // component needs to render. mission-14/C3: `eventById` now carries BOTH
  // real events and tasks (converted to a CalendarEventView-shaped proxy by
  // `taskAsMonthEvent` above), so `layoutEvents` — built FROM this map's own
  // values, not from `events` directly — automatically includes tasks too.
  // That's what makes tasks and events compete for the same three lanes and
  // share one "+N more" count, per D1's "no second packer": `assignLanes`
  // itself never learns tasks exist as a distinct thing, it just sees more
  // {id, startAt, endAt, allDay} spans.
  const eventById = new Map<string, CalendarEventView>([
    ...events.map((event) => [event.id, event] as const),
    ...tasks.map((task) => [task.id, taskAsMonthEvent(task)] as const),
  ]);
  const layoutEvents: MonthLayoutEvent[] = Array.from(eventById.values()).map((event) => ({
    id: event.id,
    startAt: event.startAt,
    endAt: event.endAt,
    allDay: event.allDay,
  }));
  // C3b: `taskAsMonthEvent` reshapes a Task into a CalendarEventView-shaped
  // proxy that has no `completedAt` field at all (a real event genuinely
  // has none), so completion has to be looked up by id from the ORIGINAL
  // `tasks` array, not read off anything in `eventById`. An event's id can
  // never collide with a task's id (separate cuid-keyed tables), so a plain
  // id set is a safe lookup with no risk of a real event being mistaken for
  // a completed task.
  const completedTaskIds = new Set(
    tasks.filter((task) => task.completedAt !== null).map((task) => task.id),
  );

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
                taskCompleted: completedTaskIds.has(event.id),
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
