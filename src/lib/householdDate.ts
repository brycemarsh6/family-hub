// Pure calendar-date helpers for code that runs on a UTC server (Vercel) but
// must answer questions about the household's own calendar (Mountain time).
// Every function here gives identical results whatever the process's TZ is:
// nothing uses `new Date(y, m, d)` or the process-local getters.
//
// Two stored conventions meet here, and they are different on purpose:
//   - MealPlan.weekStart is *zone-local* midnight (06:00Z / 07:00Z for Denver)
//     -> zoneMidnightInstant.
//   - all-day events and tasks are *UTC* midnight -> utcMidnightInstant.
// Building either with a process-local `new Date(y, m, d)` on a UTC server
// would be off by the zone offset — e.g. a second MealPlan for the same week.

import { MONTH_NAMES } from "./mealPlanDates";

export type CalendarDate = { year: number; month: number; day: number };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The calendar date `instant` falls on in `timeZone`. */
export function calendarDateInZone(instant: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Offset (ms, zone minus UTC) in effect in `timeZone` at `instant`. */
export function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  // Drop sub-second precision from the instant so it cancels exactly.
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The hour (0 to 23) on the wall clock of `timeZone` at `instant`. */
export function hourInZone(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", hour: "numeric" }).formatToParts(instant);
  return Number(parts.find((p) => p.type === "hour")?.value);
}

/** Minutes after midnight (0 to 1439) on the wall clock of `timeZone` at `instant`. */
export function minuteOfDayInZone(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return get("hour") * 60 + get("minute");
}

/**
 * The app's clock style in `timeZone`: "10:05 AM", or with `dropZeroMinutes`
 * "10 AM" (minutes only when not on the hour). Always a plain ASCII space
 * before AM/PM: Intl can emit a narrow no-break space (U+202F) there.
 */
export function formatHouseholdClock(instant: Date, timeZone: string, options: { dropZeroMinutes: boolean }): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(instant);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const minute = part("minute");
  const time = options.dropZeroMinutes && minute === "00" ? part("hour") : `${part("hour")}:${minute}`;
  return `${time} ${part("dayPeriod")}`.replace(/\s/g, " ");
}

/** An instant's wall clock in `timeZone` read as if it were UTC (ms): the zone's offset added on. */
export function wallClockMs(instant: Date, timeZone: string): number {
  return instant.getTime() + zoneOffsetMs(instant, timeZone);
}

/**
 * The instant whose wall clock in `timeZone` reads `wallMs` (a wall clock as if
 * it were UTC). Two-step fixed point: guess with the offset at the naive
 * instant, then re-read the offset at the guess. Correct for any zone whose
 * transition doesn't straddle the reading (true of America/Denver and every US
 * zone, except a reading inside the spring-forward gap, which lands an hour on).
 */
export function instantAtWallClock(wallMs: number, timeZone: string): Date {
  const first = wallMs - zoneOffsetMs(new Date(wallMs), timeZone);
  return new Date(wallMs - zoneOffsetMs(new Date(first), timeZone));
}

/** One instant moved by wall-clock minutes in `timeZone` (7:00 is 7:30 after +30 on any day, clock changes included). */
export function shiftWallClockInZone(instant: Date, minutes: number, timeZone: string): Date {
  return instantAtWallClock(wallClockMs(instant, timeZone) + minutes * 60 * 1000, timeZone);
}

/** The UTC instant at which `date` begins in `timeZone`. */
export function zoneMidnightInstant(date: CalendarDate, timeZone: string): Date {
  return instantAtWallClock(Date.UTC(date.year, date.month - 1, date.day), timeZone);
}

/** Strict `YYYY-MM-DD`; null for anything else, including impossible dates. */
export function parseDateParam(text: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function formatCalendarDate(date: CalendarDate): string {
  const pad = (n: number, width: number) => String(n).padStart(width, "0");
  return `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`;
}

/** "Nov 3": the short month name and the day, no year. */
export function formatShortCalendarDate(date: CalendarDate): string {
  return `${MONTH_NAMES[date.month - 1]} ${date.day}`;
}

/** The Habits Report's week title, with no dash: "Nov 1 to 7", "Oct 26 to Nov 1".
 * A year other than `currentYear` is written, once at the end when the week stays
 * in one year ("Nov 1 to 7, 2025") and on each end when it crosses New Year
 * ("Dec 28, 2025 to Jan 3"). */
export function formatWeekTitle(weekStart: CalendarDate, currentYear: number): string {
  const end = addCalendarDays(weekStart, 6);
  const startMonth = MONTH_NAMES[weekStart.month - 1];
  const endMonth = MONTH_NAMES[end.month - 1];
  const withYear = (text: string, year: number) => (year === currentYear ? text : `${text}, ${year}`);
  const endText = startMonth === endMonth && weekStart.year === end.year ? `${end.day}` : `${endMonth} ${end.day}`;
  if (weekStart.year === end.year) return withYear(`${startMonth} ${weekStart.day} to ${endText}`, end.year);
  return `${withYear(`${startMonth} ${weekStart.day}`, weekStart.year)} to ${withYear(endText, end.year)}`;
}

export function addCalendarDays(date: CalendarDate, n: number): CalendarDate {
  const moved = new Date(Date.UTC(date.year, date.month - 1, date.day) + n * MS_PER_DAY);
  return {
    year: moved.getUTCFullYear(),
    month: moved.getUTCMonth() + 1,
    day: moved.getUTCDate(),
  };
}

/** Whole calendar days from `a` to `b` (negative when `b` is earlier). */
export function calendarDaysBetween(a: CalendarDate, b: CalendarDate): number {
  const dayNumber = (d: CalendarDate) => Date.UTC(d.year, d.month - 1, d.day) / MS_PER_DAY;
  return Math.round(dayNumber(b) - dayNumber(a));
}

/** 0 = Sunday. */
export function dayOfWeek(date: CalendarDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

/** UTC midnight of `date` — the stored shape of all-day events and tasks. */
export function utcMidnightInstant(date: CalendarDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

/** The calendar day a stored UTC-midnight column holds (the inverse of `utcMidnightInstant`). */
export function calendarDateFromUtcMidnight(stored: Date): CalendarDate {
  return calendarDateInZone(stored, "UTC");
}

/** The Sunday that starts the week `date` falls in (a Sunday is its own week start). */
export function startOfWeek(date: CalendarDate): CalendarDate {
  return addCalendarDays(date, -dayOfWeek(date));
}

/** The first of the month `date` falls in. */
export function startOfMonth(date: CalendarDate): CalendarDate {
  return { year: date.year, month: date.month, day: 1 };
}
