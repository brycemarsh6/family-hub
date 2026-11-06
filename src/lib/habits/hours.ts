import { HOURS_LIMITS, type PaceDays } from "../habitHoursVocabulary";
import { addCalendarDays, calendarDaysBetween, dayOfWeek, startOfWeek, type CalendarDate } from "../householdDate";
import { compareDays, dayInVacation } from "./schedule";
import type { StreakCache, StreakResult } from "./streaks";
import type { TimeEntry, Vacation } from "./types";

// The hours habit's rules (mission 37): a weekly goal in minutes, counted
// Sunday to Saturday. Missing a day never counts against anyone; only the
// week's total matters. Pure: no db, callers pass `today` and one person's
// entries. Streaks here count weeks, not days.

export type HoursWeek = {
  weekStart: CalendarDate;
  doneMinutes: number;
  targetMinutes: number;
  leftMinutes: number;
  /** Minutes a day still needed, rounded up to the next 15; null when met or no counted day is left. */
  perDayMinutes: number | null;
  met: boolean;
  /** Minutes per weekday, Sunday first. */
  byDay: number[];
};

/** Minutes a day still needed: what is `left` over the `daysLeft` counted days, rounded up to the next pace step. Null when nothing is left or no counted day is. */
export function paceMinutesPerDay(left: number, daysLeft: number): number | null {
  if (left <= 0 || daysLeft <= 0) return null;
  return Math.ceil(left / daysLeft / HOURS_LIMITS.paceStep) * HOURS_LIMITS.paceStep;
}

/** Days from `today` to Saturday inclusive that the pace counts; "monsat" leaves out Sundays, vacation days are left out too. */
export function countedDaysLeft(today: CalendarDate, paceDays: PaceDays, vacations: readonly Vacation[] = []): number {
  let count = 0;
  for (let day = today; dayOfWeek(day) !== 0 || compareDays(day, today) === 0; day = addCalendarDays(day, 1)) {
    if (paceDays === "monsat" && dayOfWeek(day) === 0) continue;
    if (!dayInVacation(day, vacations)) count += 1;
  }
  return count;
}

/** The Sunday to Saturday week holding `today`: minutes done, left, the pace, and whether the goal is met. */
export function hoursWeek(input: {
  entries: readonly TimeEntry[];
  targetMinutes: number;
  paceDays: PaceDays;
  today: CalendarDate;
  vacations: readonly Vacation[];
}): HoursWeek {
  const weekStart = startOfWeek(input.today);
  const byDay = [0, 0, 0, 0, 0, 0, 0];
  for (const entry of input.entries) {
    const offset = calendarDaysBetween(weekStart, entry.day);
    if (offset >= 0 && offset <= 6) byDay[offset] += entry.minutes;
  }
  const doneMinutes = byDay.reduce((sum, minutes) => sum + minutes, 0);
  const leftMinutes = Math.max(0, input.targetMinutes - doneMinutes);
  const met = doneMinutes >= input.targetMinutes;
  const days = countedDaysLeft(input.today, input.paceDays, input.vacations);
  const perDayMinutes = met ? null : paceMinutesPerDay(leftMinutes, days);
  return { weekStart, doneMinutes, targetMinutes: input.targetMinutes, leftMinutes, perDayMinutes, met, byDay };
}

/** Total minutes by week (keyed by the Sunday's day number). */
function totalsByWeek(entries: readonly TimeEntry[]): Map<number, number> {
  const totals = new Map<number, number>();
  const epoch = { year: 1970, month: 1, day: 1 };
  for (const entry of entries) {
    const key = calendarDaysBetween(epoch, startOfWeek(entry.day));
    totals.set(key, (totals.get(key) ?? 0) + entry.minutes);
  }
  return totals;
}

/** True when every counted day of the week starting `weekStart` was on vacation. */
function weekOnVacation(weekStart: CalendarDate, paceDays: PaceDays, vacations: readonly Vacation[]): boolean {
  for (let offset = paceDays === "monsat" ? 1 : 0; offset <= 6; offset += 1) {
    if (!dayInVacation(addCalendarDays(weekStart, offset), vacations)) return false;
  }
  return true;
}

/**
 * Weeks in a row the goal was reached. A finished week (before today's) that
 * reached it extends the run; one that missed breaks it, unless every counted
 * day of it was on vacation, which neither counts nor breaks. This week counts
 * once met and never breaks the run while it is going. Weeks before
 * `startWeek` are ignored. `paceDays` only decides which days a vacation must
 * cover ("monsat" = Monday to Saturday); it defaults to "monsat".
 * Cache note: `asOf` is today when this week is met (it is counted), else the
 * Saturday before this week, so `hoursStreakAfter` examines this week once over.
 */
export function hoursStreaks(input: {
  entries: readonly TimeEntry[];
  targetMinutes: number;
  startWeek: CalendarDate;
  today: CalendarDate;
  vacations: readonly Vacation[];
  paceDays?: PaceDays;
}): StreakResult {
  const paceDays = input.paceDays ?? "monsat";
  const totals = totalsByWeek(input.entries);
  const epoch = { year: 1970, month: 1, day: 1 };
  const thisWeek = startOfWeek(input.today);
  let current = 0;
  let best = 0;
  let thisMet = false;
  for (let week = startOfWeek(input.startWeek); compareDays(week, thisWeek) <= 0; week = addCalendarDays(week, 7)) {
    const reached = (totals.get(calendarDaysBetween(epoch, week)) ?? 0) >= input.targetMinutes;
    if (reached) {
      if (compareDays(week, thisWeek) === 0) thisMet = true;
      current += 1;
      best = Math.max(best, current);
    } else if (compareDays(week, thisWeek) < 0 && !weekOnVacation(week, paceDays, input.vacations)) {
      current = 0;
    }
  }
  return { current, best, asOf: thisMet ? input.today : addCalendarDays(thisWeek, -1) };
}

/**
 * Ages a cached hours streak to `today` with no entries: each whole week after
 * the one holding `cached.asOf` and before today's week missed the goal, so it
 * breaks the run unless every counted day of it was on vacation. This week adds
 * nothing and breaks nothing. Never grows, never touches `best`.
 */
export function hoursStreakAfter(
  cached: StreakCache,
  vacations: readonly Vacation[],
  paceDays: PaceDays,
  today: CalendarDate,
): StreakResult {
  const { asOf } = cached;
  if (asOf === null || compareDays(asOf, today) >= 0 || cached.current === 0) {
    return { current: cached.current, best: cached.best, asOf: asOf ?? today };
  }
  const thisWeek = startOfWeek(today);
  let broken = false;
  for (let week = addCalendarDays(startOfWeek(asOf), 7); compareDays(week, thisWeek) < 0 && !broken; week = addCalendarDays(week, 7)) {
    broken = !weekOnVacation(week, paceDays, vacations);
  }
  return { current: broken ? 0 : cached.current, best: cached.best, asOf: today };
}

/** The last `n` weeks' totals in minutes, oldest first, this week last. */
export function weekTotals(entries: readonly TimeEntry[], today: CalendarDate, n: number): number[] {
  const totals = totalsByWeek(entries);
  const epoch = { year: 1970, month: 1, day: 1 };
  const thisWeek = startOfWeek(today);
  const out: number[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    out.push(totals.get(calendarDaysBetween(epoch, addCalendarDays(thisWeek, -7 * i))) ?? 0);
  }
  return out;
}
