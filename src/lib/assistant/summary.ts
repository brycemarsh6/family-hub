import { HOUSEHOLD_TIME_ZONE, isLow } from "@/lib/constants";
import { effectiveExpiry, expiresWithin } from "@/lib/expiring";
import {
  addCalendarDays,
  calendarDateInZone,
  calendarDaysBetween,
  dayOfWeek,
  formatCalendarDate,
  zoneMidnightInstant,
  type CalendarDate,
} from "@/lib/householdDate";
import { daysUntilInZone } from "@/lib/assistant/today";

// Pure pieces of the Assistant API's /summary route: which meal plan is a
// week's, which events land on which day, and the inventory headline counts.

const PLAN_TOLERANCE_MS = 14 * 60 * 60 * 1000;

/** The Sunday on or before `date`. */
export function sundayOfCalendarDate(date: CalendarDate): CalendarDate {
  return addCalendarDays(date, -dayOfWeek(date));
}

/**
 * The plan for the week starting `sunday`. Plans are stored as the creating
 * phone's local midnight, which differs by zone, so a plan matches within
 * ±14 hours of the household zone's midnight; the nearest wins. A different
 * week is 7 days away and can never fall in range.
 */
export function findPlanForWeek<P extends { weekStart: Date }>(
  plans: P[],
  sunday: CalendarDate,
  timeZone: string = HOUSEHOLD_TIME_ZONE,
): P | null {
  const target = zoneMidnightInstant(sunday, timeZone).getTime();
  let best: P | null = null;
  let bestGap = Infinity;
  for (const plan of plans) {
    const gap = Math.abs(plan.weekStart.getTime() - target);
    if (gap <= PLAN_TOLERANCE_MS && gap < bestGap) {
      best = plan;
      bestGap = gap;
    }
  }
  return best;
}

type BucketEvent = { startAt: Date; endAt: Date; allDay: boolean };

const utcDate = (instant: Date): CalendarDate => ({
  year: instant.getUTCFullYear(),
  month: instant.getUTCMonth() + 1,
  day: instant.getUTCDate(),
});

/** First and last calendar dates an event covers. */
function coveredRange(event: BucketEvent, timeZone: string): [CalendarDate, CalendarDate] {
  if (event.allDay) {
    // CT1 convention: UTC midnights, endAt exclusive.
    const first = utcDate(event.startAt);
    const last =
      event.endAt.getTime() > event.startAt.getTime()
        ? addCalendarDays(utcDate(event.endAt), -1)
        : first;
    return [first, last];
  }
  const first = calendarDateInZone(event.startAt, timeZone);
  // [startAt, endAt): an event ending exactly at midnight doesn't touch that day.
  const lastInstant =
    event.endAt.getTime() > event.startAt.getTime()
      ? new Date(event.endAt.getTime() - 1)
      : event.startAt;
  return [first, calendarDateInZone(lastInstant, timeZone)];
}

/** For each of `days`, the events covering it, keyed by `YYYY-MM-DD`. */
export function bucketEventsByDay<E extends BucketEvent>(
  events: E[],
  days: CalendarDate[],
  timeZone: string = HOUSEHOLD_TIME_ZONE,
): Map<string, E[]> {
  const out = new Map<string, E[]>();
  for (const day of days) out.set(formatCalendarDate(day), []);
  for (const event of events) {
    const [first, last] = coveredRange(event, timeZone);
    for (const day of days) {
      if (calendarDaysBetween(first, day) >= 0 && calendarDaysBetween(day, last) >= 0) {
        out.get(formatCalendarDate(day))!.push(event);
      }
    }
  }
  return out;
}

type SummaryItem = {
  name: string;
  category: string;
  location: string;
  quantity: number;
  lowThreshold: number;
  expiresAt: Date | null;
  restockedAt: Date;
};

/** Headline counts. `out` and `low` are disjoint (an out item isn't also low). */
export function summarizeInventory(
  items: SummaryItem[],
  today: CalendarDate,
  timeZone: string,
  expiringWithinDays: number,
) {
  let low = 0;
  let out = 0;
  let expiring = 0;
  for (const item of items) {
    if (item.quantity <= 0) out++;
    else if (isLow(item.quantity, item.lowThreshold)) low++;
    const expiry = effectiveExpiry({
      name: item.name,
      category: item.category as Parameters<typeof effectiveExpiry>[0]["category"],
      location: item.location as Parameters<typeof effectiveExpiry>[0]["location"],
      expiresAt: item.expiresAt,
      restockedAt: item.restockedAt,
    });
    if (expiry && expiresWithin(daysUntilInZone(expiry.date, today, timeZone), expiringWithinDays)) {
      expiring++;
    }
  }
  return { total: items.length, low, out, expiring };
}
