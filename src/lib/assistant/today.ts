import {
  calendarDateInZone,
  calendarDaysBetween,
  parseDateParam,
  type CalendarDate,
} from "@/lib/householdDate";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { ApiError } from "@/lib/assistant/errors";

// "What day is it" for the Assistant API, which has no browser to ask. Pure
// and process-independent: nothing here reads a process-local date getter, so
// a Denver evening (already tomorrow in UTC on Vercel) lands on the right day.
// Deliberately NOT built on expiring.ts's daysUntil/startOfDay — those use the
// process-local getters, which is the exact bug this file exists to avoid.

/**
 * The household's today at `now`, or the `?date=` override when one is given.
 * Null only when `dateParam` is given and is not a real `YYYY-MM-DD` — the
 * route turns that into a 400.
 */
export function householdToday(
  now: Date,
  dateParam?: string,
): CalendarDate | null {
  if (dateParam !== undefined) return parseDateParam(dateParam);
  return calendarDateInZone(now, HOUSEHOLD_TIME_ZONE);
}

/** `householdToday`, with the route's 400 built in: a `date` override that
 * isn't a real day throws instead of returning null. */
export function requireHouseholdToday(now: Date, dateParam?: string): CalendarDate {
  const today = householdToday(now, dateParam);
  if (!today) {
    throw new ApiError(400, "validation", "`date` must be a real YYYY-MM-DD.");
  }
  return today;
}

/** Calendar days from `today` to the day `instant` falls on in `timeZone`. Negative = overdue. */
export function daysUntilInZone(
  instant: Date,
  today: CalendarDate,
  timeZone: string,
): number {
  return calendarDaysBetween(today, calendarDateInZone(instant, timeZone));
}
