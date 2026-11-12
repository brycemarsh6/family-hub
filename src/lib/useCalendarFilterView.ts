"use client";

// The Calendar filter's wiring (mission 78), so CalendarViews.tsx grows by a
// few lines: the remembered filter, the lists every view draws with it
// applied, the count the Filter circle shows, and what the sheet needs. The
// rules themselves live in calendarFilter.ts, the only home of the predicates.

import { useMemo, useState } from "react";
import {
  MARSHEE_CALENDAR_KEY,
  filterRows,
  hiddenCount,
  toggleHiddenCalendar,
  toggleHiddenPerson,
  EMPTY_CALENDAR_FILTER,
  type CalendarFilter,
} from "@/lib/calendarFilter";
import { isSameDay } from "@/lib/mealPlanDates";
import { useCalendarFilter } from "@/lib/calendarFilterStore";
import type {
  CalendarEventView,
  CalendarFilterAccountView,
  CalendarHabitDayView,
  CalendarPersonView,
  CalendarTaskView,
} from "@/lib/types";
import type { ScheduleRenderMonthWithHabits } from "@/lib/scheduleHabitDays";

/**
 * Schedule's months with the filter applied. A day the filter empties drops out
 * exactly as a day that never had items does; today's row always stays (the
 * page shows its "Nothing planned" row), and so does a day whose items the
 * filter did not touch. A month left with no days drops out too.
 */
export function filterScheduleMonths(
  months: ScheduleRenderMonthWithHabits[],
  filter: CalendarFilter,
  viewerId: string | null,
  today: Date | null,
): ScheduleRenderMonthWithHabits[] {
  if (filter.hiddenPeople.length === 0 && filter.hiddenCalendars.length === 0) return months;
  return months
    .map((month) => ({
      ...month,
      days: month.days
        .map((row) => {
          const kept = filterRows(row, filter, viewerId);
          const emptied = kept.events.length + kept.tasks.length + kept.habitDays.length === 0;
          const wasEmpty = row.events.length + row.tasks.length + row.habitDays.length === 0;
          return emptied && !wasEmpty && !(today !== null && isSameDay(row.day, today)) ? null : kept;
        })
        .filter((row): row is NonNullable<typeof row> => row !== null),
    }))
    .filter((month) => month.days.length > 0);
}

export function useCalendarFilterView({
  viewerId,
  people,
  filterCalendars,
  events,
  tasks,
  habitDays,
}: {
  viewerId: string | null;
  people: CalendarPersonView[];
  filterCalendars: CalendarFilterAccountView[];
  events: CalendarEventView[];
  tasks: CalendarTaskView[];
  habitDays: CalendarHabitDayView[];
}) {
  const [filter, setFilter] = useCalendarFilter(viewerId);
  const [open, setOpen] = useState(false);

  const shown = useMemo(() => filterRows({ events, tasks, habitDays }, filter, viewerId), [events, tasks, habitDays, filter, viewerId]);
  const activePeople = useMemo(() => people.filter((person) => !person.deactivated), [people]);
  const count = useMemo(
    () =>
      hiddenCount(
        filter,
        activePeople.map((person) => person.userId),
        [MARSHEE_CALENDAR_KEY, ...filterCalendars.flatMap((account) => account.calendars.map((calendar) => calendar.id))],
      ),
    [filter, activePeople, filterCalendars],
  );

  return {
    events: shown.events,
    tasks: shown.tasks,
    habitDays: shown.habitDays,
    filter,
    viewerId,
    count,
    open,
    setOpen,
    sheet: {
      people: activePeople,
      accounts: filterCalendars,
      filter,
      count,
      onTogglePerson: (userId: string) => setFilter(toggleHiddenPerson(filter, userId)),
      onToggleCalendar: (key: string) => setFilter(toggleHiddenCalendar(filter, key)),
      onShowAll: () => setFilter(EMPTY_CALENDAR_FILTER),
      onClose: () => setOpen(false),
    },
  };
}
