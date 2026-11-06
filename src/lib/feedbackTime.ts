// How the Feedback screens write times. Every day, month and weekday goes
// through the household helpers so the server and the browser print the same
// words in any time zone (STRUCTURE.md, one source of truth: dates).

import { HOUSEHOLD_TIME_ZONE } from "./constants";
import { calendarDateInZone, calendarDaysBetween, dayOfWeek, formatShortCalendarDate } from "./householdDate";
import { SHORT_DAY_NAMES } from "./mealPlanDates";

const CLOCK = new Intl.DateTimeFormat("en-US", {
  timeZone: HOUSEHOLD_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

/** "Just now", "5 min ago", "3 h ago", "2 d ago", then the date ("Nov 3"). */
export function feedbackTimeAgo(createdAt: Date, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const created = calendarDateInZone(createdAt, HOUSEHOLD_TIME_ZONE);
  const days = calendarDaysBetween(created, calendarDateInZone(now, HOUSEHOLD_TIME_ZONE));
  if (days < 14) return `${Math.max(1, days)} d ago`;
  return formatShortCalendarDate(created);
}

/** The full stamp for the detail sheet: "Tue, Nov 3, 11:30 PM" (household time). */
export function feedbackTimeLabel(createdAt: Date): string {
  const date = calendarDateInZone(createdAt, HOUSEHOLD_TIME_ZONE);
  return `${SHORT_DAY_NAMES[dayOfWeek(date)]}, ${formatShortCalendarDate(date)}, ${CLOCK.format(createdAt)}`;
}
