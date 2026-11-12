// The Calendar filter's rules (mission 78). Pure: no React, no server-only,
// so the sheet, every view and the tests share ONE copy. A second copy of
// these predicates anywhere else is a blocker (docs/structure/calendar-filter.md).
//
// The filter stores what is HIDDEN, not what is shown, so a person or a
// calendar that appears later starts out shown.

import type { CalendarEventView, CalendarHabitDayView, CalendarTaskView } from "./types";

/** The key for events made in Marshee (LinkedCalendar ids are cuids, so no clash). */
export const MARSHEE_CALENDAR_KEY = "marshee";

export type CalendarFilter = {
  /** User ids whose events and tasks are hidden. */
  hiddenPeople: string[];
  /** LinkedCalendar ids, plus MARSHEE_CALENDAR_KEY, that are hidden. */
  hiddenCalendars: string[];
};

export const EMPTY_CALENDAR_FILTER: CalendarFilter = { hiddenPeople: [], hiddenCalendars: [] };

/**
 * Every calendar an event lives on: where it came from (the Google calendar it
 * was pulled from, else Marshee) plus every Google calendar Marshee copied it to.
 */
export function eventCalendarKeys(event: Pick<CalendarEventView, "sourceLinkedCalendarId" | "syncs">): string[] {
  const keys = new Set<string>([event.sourceLinkedCalendarId ?? MARSHEE_CALENDAR_KEY]);
  for (const sync of event.syncs) keys.add(sync.linkedCalendarId);
  return [...keys];
}

function anyPersonShown(people: { userId: string }[], filter: CalendarFilter): boolean {
  return people.length === 0 || people.some((person) => !filter.hiddenPeople.includes(person.userId));
}

/** People AND calendars must both match; an event on several calendars shows if any is ticked. */
export function eventPasses(
  event: Pick<CalendarEventView, "people" | "sourceLinkedCalendarId" | "syncs">,
  filter: CalendarFilter,
): boolean {
  return (
    anyPersonShown(event.people, filter) &&
    eventCalendarKeys(event).some((key) => !filter.hiddenCalendars.includes(key))
  );
}

/** Tasks have people and no calendar. */
export function taskPasses(task: Pick<CalendarTaskView, "people">, filter: CalendarFilter): boolean {
  return anyPersonShown(task.people, filter);
}

/** Planned habit days belong to the viewer, so they follow the viewer's own People tick. */
export function habitDaysPass(viewerId: string | null, filter: CalendarFilter): boolean {
  return viewerId === null || !filter.hiddenPeople.includes(viewerId);
}

export function filterRows<
  R extends { events: CalendarEventView[]; tasks: CalendarTaskView[]; habitDays: CalendarHabitDayView[] },
>(rows: R, filter: CalendarFilter, viewerId: string | null): R {
  return {
    ...rows,
    events: rows.events.filter((event) => eventPasses(event, filter)),
    tasks: rows.tasks.filter((task) => taskPasses(task, filter)),
    habitDays: habitDaysPass(viewerId, filter) ? rows.habitDays : [],
  };
}

/** How many hidden ids still exist in today's lists (a stale id never counts). */
export function hiddenCount(filter: CalendarFilter, personIds: string[], calendarKeys: string[]): number {
  return (
    filter.hiddenPeople.filter((id) => personIds.includes(id)).length +
    filter.hiddenCalendars.filter((key) => calendarKeys.includes(key)).length
  );
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((existing) => existing !== id) : [...list, id];
}

export function toggleHiddenPerson(filter: CalendarFilter, userId: string): CalendarFilter {
  return { ...filter, hiddenPeople: toggle(filter.hiddenPeople, userId) };
}

export function toggleHiddenCalendar(filter: CalendarFilter, key: string): CalendarFilter {
  return { ...filter, hiddenCalendars: toggle(filter.hiddenCalendars, key) };
}

function stringList(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? (value as string[]) : null;
}

/** Whatever localStorage holds, turned into a filter; anything malformed is the empty filter. Never throws. */
export function parseStoredFilter(raw: string | null): CalendarFilter {
  if (raw === null) return EMPTY_CALENDAR_FILTER;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return EMPTY_CALENDAR_FILTER;
    const record = parsed as Record<string, unknown>;
    const hiddenPeople = stringList(record.hiddenPeople);
    const hiddenCalendars = stringList(record.hiddenCalendars);
    if (hiddenPeople === null || hiddenCalendars === null) return EMPTY_CALENDAR_FILTER;
    return { hiddenPeople, hiddenCalendars };
  } catch {
    return EMPTY_CALENDAR_FILTER;
  }
}
