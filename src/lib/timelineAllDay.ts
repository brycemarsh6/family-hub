// The all-day row's rules for the hour timeline (mission-73), as pure
// functions: which items the row holds and how many are hidden past the
// lanes it shows. Moved out of TimelineAllDayStrip.tsx so node:test can cover
// them. No React and no "server-only": pure over its inputs, the same
// standing as calendarDates.ts.

import { addDays } from "./mealPlanDates";
import { allDayInstantToLocalDay, localDayToAllDayInstant } from "./calendarDates";
import { assignLanes, type MonthLayoutEvent } from "./monthLayout";
import { partitionForTimeline, type TimelineEvent } from "./timelineLayout";
import type { CalendarHabitDayView, CalendarTaskView } from "./types";

/** Lanes the all-day row shows before it says "more", on every width. */
export const TIMELINE_ALL_DAY_LANES = 2;

/** Everything the all-day row packs: the all-day events, then tasks, then
 * planned habit days. Tasks and habit days are reshaped into the same
 * `{id, startAt, endAt: +1 day, allDay: true}` layout shape (`startAt` is
 * already the day's UTC-midnight all-day instant; `endAt` is the next day's,
 * the exclusive end every all-day span here uses). */
export function timelineAllDayItems(
  allDayRow: TimelineEvent[],
  tasks: CalendarTaskView[],
  habitDays: CalendarHabitDayView[],
): MonthLayoutEvent[] {
  const taskLayoutEvents: MonthLayoutEvent[] = tasks.map((task) => ({
    id: task.id,
    startAt: task.dueDate,
    endAt: localDayToAllDayInstant(addDays(allDayInstantToLocalDay(task.dueDate), 1)),
    allDay: true,
  }));
  const habitLayoutEvents: MonthLayoutEvent[] = habitDays.map((item) => ({
    id: item.id,
    startAt: item.dayInstant,
    endAt: localDayToAllDayInstant(addDays(allDayInstantToLocalDay(item.dayInstant), 1)),
    allDay: true,
  }));
  return [...allDayRow, ...taskLayoutEvents, ...habitLayoutEvents];
}

/** The total number of items hidden beyond TIMELINE_ALL_DAY_LANES, summed
 * over every column. */
export function allDayHiddenCount(columnDays: Date[], items: MonthLayoutEvent[]): number {
  const { overflowByDay } = assignLanes(columnDays, items, TIMELINE_ALL_DAY_LANES);
  return overflowByDay.reduce((sum, count) => sum + count, 0);
}

/** How many all-day items one page hides, from the raw inputs: partitions the
 * events, builds the items with `timelineAllDayItems` (never a second copy of
 * that code) and counts what is past the lanes. TimelineGrid asks this to
 * decide whether the chevron shows. */
export function pageAllDayHiddenCount(
  columnDays: Date[],
  events: TimelineEvent[],
  tasks: CalendarTaskView[],
  habitDays: CalendarHabitDayView[],
): number {
  const { allDayRow } = partitionForTimeline(columnDays, events);
  return allDayHiddenCount(columnDays, timelineAllDayItems(allDayRow, tasks, habitDays));
}
