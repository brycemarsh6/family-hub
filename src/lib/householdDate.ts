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
function zoneOffsetMs(instant: Date, timeZone: string): number {
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

/** The UTC instant at which `date` begins in `timeZone`. */
export function zoneMidnightInstant(date: CalendarDate, timeZone: string): Date {
  const wallAsUtc = Date.UTC(date.year, date.month - 1, date.day);
  // Two-step fixed point: guess with the offset at the naive instant, then
  // re-read the offset at the guess. Correct for any zone whose transition
  // doesn't straddle local midnight (true of America/Denver and every US zone).
  const first = wallAsUtc - zoneOffsetMs(new Date(wallAsUtc), timeZone);
  const second = wallAsUtc - zoneOffsetMs(new Date(first), timeZone);
  return new Date(second);
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

export function addCalendarDays(date: CalendarDate, n: number): CalendarDate {
  const moved = new Date(Date.UTC(date.year, date.month - 1, date.day) + n * MS_PER_DAY);
  return {
    year: moved.getUTCFullYear(),
    month: moved.getUTCMonth() + 1,
    day: moved.getUTCDate(),
  };
}

/** 0 = Sunday. */
export function dayOfWeek(date: CalendarDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

/** UTC midnight of `date` — the stored shape of all-day events and tasks. */
export function utcMidnightInstant(date: CalendarDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}
