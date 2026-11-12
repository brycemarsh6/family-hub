"use client";

// The Calendar filter's wiring (mission 78), so CalendarViews.tsx grows by a
// few lines: the remembered filter, the lists every view draws with it
// applied, the count the Filter circle shows, and what the sheet needs. The
// rules themselves live in calendarFilter.ts, the only home of the predicates.

import { useMemo, useState } from "react";
import {
  MARSHEE_CALENDAR_KEY,
  EMPTY_CALENDAR_FILTER,
  filterRows,
  hiddenCount,
  liveFilter,
  toggleHiddenCalendar,
  toggleHiddenPerson,
} from "@/lib/calendarFilter";
import { useCalendarFilter } from "@/lib/calendarFilterStore";
import type {
  CalendarEventView,
  CalendarFilterAccountView,
  CalendarHabitDayView,
  CalendarPersonView,
  CalendarTaskView,
} from "@/lib/types";

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
  const [stored, setFilter] = useCalendarFilter(viewerId);
  const [open, setOpen] = useState(false);

  const activePeople = useMemo(() => people.filter((person) => !person.deactivated), [people]);
  const personIds = useMemo(() => activePeople.map((person) => person.userId), [activePeople]);
  const calendarKeys = useMemo(
    () => [MARSHEE_CALENDAR_KEY, ...filterCalendars.flatMap((account) => account.calendars.map((calendar) => calendar.id))],
    [filterCalendars],
  );
  // The stored filter may name people or calendars the sheet can no longer list;
  // those must hide nothing, so everything below reads the live filter.
  const filter = useMemo(() => liveFilter(stored, personIds, calendarKeys), [stored, personIds, calendarKeys]);
  const shown = useMemo(() => filterRows({ events, tasks, habitDays }, filter, viewerId), [events, tasks, habitDays, filter, viewerId]);
  const count = useMemo(() => hiddenCount(stored, personIds, calendarKeys), [stored, personIds, calendarKeys]);

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
      onTogglePerson: (userId: string) => setFilter(toggleHiddenPerson(stored, userId)),
      onToggleCalendar: (key: string) => setFilter(toggleHiddenCalendar(stored, key)),
      onShowAll: () => setFilter(EMPTY_CALENDAR_FILTER),
      onClose: () => setOpen(false),
    },
  };
}
