import {
  calendarDateInZone,
  parseDateParam,
  type CalendarDate,
} from "@/lib/householdDate";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";

// "What day is it" for the Assistant API, which has no browser to ask. Pure
// and process-independent: nothing here reads a process-local date getter, so
// a Denver evening (already tomorrow in UTC on Vercel) lands on the right day.
// Deliberately NOT built on expiring.ts's daysUntil/startOfDay — those use the
// process-local getters, which is the exact bug this file exists to avoid.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

const dayNumber = (d: CalendarDate) => Date.UTC(d.year, d.month - 1, d.day) / MS_PER_DAY;

/** Calendar days from `today` to the day `instant` falls on in `timeZone`. Negative = overdue. */
export function daysUntilInZone(
  instant: Date,
  today: CalendarDate,
  timeZone: string,
): number {
  return Math.round(
    dayNumber(calendarDateInZone(instant, timeZone)) - dayNumber(today),
  );
}
