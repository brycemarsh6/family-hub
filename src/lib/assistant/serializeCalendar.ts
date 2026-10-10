import type { CalendarEventView } from "@/lib/types";
import { formatCalendarDate } from "@/lib/householdDate";

// The Assistant API's calendar-event shape, built field by field. No avatar
// colours, no createdBy — Winnie needs what's happening and who's in it.

type EventInput = Pick<
  CalendarEventView,
  "id" | "title" | "notes" | "location" | "startAt" | "endAt" | "allDay"
> & { people: { userId: string; displayName: string }[] };

const utcDateString = (instant: Date) =>
  formatCalendarDate({
    year: instant.getUTCFullYear(),
    month: instant.getUTCMonth() + 1,
    day: instant.getUTCDate(),
  });

export function toAssistantEvent(event: EventInput) {
  return {
    id: event.id,
    title: event.title,
    start: event.startAt.toISOString(),
    end: event.endAt.toISOString(),
    allDay: event.allDay,
    // All-day events are stored at UTC midnight with endAt exclusive (CT1), so
    // these are the calendar dates themselves; timed events don't carry them.
    ...(event.allDay
      ? { startDate: utcDateString(event.startAt), endDate: utcDateString(event.endAt) }
      : {}),
    location: event.location,
    notes: event.notes,
    people: event.people.map((p) => ({ id: p.userId, name: p.displayName })),
  };
}
