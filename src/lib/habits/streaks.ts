import type { StreakUnit } from "../habitVocabulary";
import { addCalendarDays, type CalendarDate } from "../householdDate";
import {
  compareDays,
  dayInVacation,
  isDayInRange,
  isOpenKind,
  isScheduledDay,
  periodTarget,
  periodsInRange,
} from "./schedule";
import type { DayRange, HabitLogDay, ScheduleSpec, Vacation } from "./types";

// Streaks: the one formula (decision 80, audit D3), used to rebuild the
// cache from logs (`computeStreaks`) and to age a cached value forward with
// no logs (`streakAfter`). Rules:
//   - daily, certain days and biweekly-with-days count due days only; a day
//     that is not due never breaks or grows a streak
//   - weekly, monthly and biweekly-without-days count periods; the current
//     period counts once its N is reached, and an unmet period that has not
//     ended is neutral
//   - a skipped day, an undone vacation day and a period that cannot reach N for lack
//     of non-excused days are excused: the streak survives and does not grow;
//     a check actually made on a vacation day still counts (decision 127)
//   - "late" keeps its day missed; a day with no row breaks, except today,
//     which never breaks until it is over
// Pure: no db, no React; callers pass `today`.

export type StreakResult = { current: number; best: number; asOf: CalendarDate };

/** What the participant row caches; `asOf` null means never computed. */
export type StreakCache = { current: number; best: number; asOf: CalendarDate | null };

function dayKey(day: CalendarDate): number {
  return Date.UTC(day.year, day.month - 1, day.day);
}

/** Days of `period` that are not excused by a vacation or a skip. */
function availableDays(period: DayRange, vacations: readonly Vacation[], skipped: ReadonlySet<number>): number {
  let available = 0;
  for (let day = period.start; compareDays(day, period.end) <= 0; day = addCalendarDays(day, 1)) {
    if (!dayInVacation(day, vacations) && !skipped.has(dayKey(day))) available++;
  }
  return available;
}

/** Rebuilds the streak from logs. `asOf` is the day the answer holds from (see the cache note below). */
export function computeStreaks(
  spec: ScheduleSpec,
  logs: readonly HabitLogDay[],
  vacations: readonly Vacation[],
  today: CalendarDate,
): StreakResult {
  const seen = logs.filter((log) => compareDays(log.day, today) <= 0);
  if (seen.length === 0) return { current: 0, best: 0, asOf: today };
  const first = seen.reduce((a, b) => (compareDays(b.day, a.day) < 0 ? b : a)).day;
  const done = new Set<number>();
  const skipped = new Set<number>();
  const present = new Set<number>();
  for (const log of seen) {
    present.add(dayKey(log.day));
    if (log.status === "done") done.add(dayKey(log.day));
    if (log.status === "skipped") skipped.add(dayKey(log.day));
  }

  let run = 0;
  let best = 0;
  const grow = () => {
    run++;
    best = Math.max(best, run);
  };

  if (!isOpenKind(spec)) {
    for (let day = first; compareDays(day, today) <= 0; day = addCalendarDays(day, 1)) {
      if (!isScheduledDay(spec, day) || skipped.has(dayKey(day))) continue;
      if (done.has(dayKey(day))) grow(); // a check made on a vacation day counts (decision 127)
      else if (dayInVacation(day, vacations)) continue;
      else if (present.has(dayKey(day)) || compareDays(day, today) < 0) run = 0; // late, or nothing
    }
    // Cache note (scheduled): a due day left unchecked today is not counted
    // yet, so the cache holds from yesterday and `streakAfter` examines today.
    const pending =
      isScheduledDay(spec, today) &&
      !dayInVacation(today, vacations) &&
      !present.has(dayKey(today));
    return { current: run, best, asOf: pending ? addCalendarDays(today, -1) : today };
  }

  // Cache note: when the current period is due and still short of N, `asOf`
  // is the day before it starts, so `streakAfter` knows that period was not
  // counted yet; otherwise it is today.
  let asOf = today;
  for (const period of periodsInRange(spec, first, today)) {
    const target = periodTarget(spec, period.start);
    let count = 0;
    for (const key of done) if (isDayInRange(keyToDay(key), period)) count++;
    const current = isDayInRange(today, period);
    if (count >= target) grow();
    else if (availableDays(period, vacations, skipped) < target) continue;
    else if (current) asOf = addCalendarDays(period.start, -1);
    else run = 0;
  }
  return { current: run, best, asOf };
}

function keyToDay(key: number): CalendarDate {
  const d = new Date(key);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * Ages a cached streak to `today` with no logs: any due day (or due period)
 * after `cached.asOf` and before today passed unchecked, so it breaks the
 * streak unless a vacation excuses it. Never grows, never touches `best`.
 * Dormant until PR C (mission 32): the stats page ages a cached streak without logs.
 */
export function streakAfter(
  spec: ScheduleSpec,
  cached: StreakCache,
  vacations: readonly Vacation[],
  today: CalendarDate,
): StreakResult {
  const { asOf } = cached;
  if (asOf === null || compareDays(asOf, today) >= 0 || cached.current === 0) {
    return { current: cached.current, best: cached.best, asOf: asOf ?? today };
  }
  const from = addCalendarDays(asOf, 1);
  const yesterday = addCalendarDays(today, -1);
  let broken = false;
  if (!isOpenKind(spec)) {
    for (let day = from; compareDays(day, yesterday) <= 0 && !broken; day = addCalendarDays(day, 1)) {
      broken = isScheduledDay(spec, day) && !dayInVacation(day, vacations);
    }
  } else {
    for (const period of periodsInRange(spec, from, yesterday)) {
      if (compareDays(period.start, asOf) <= 0 || compareDays(period.end, today) >= 0) continue;
      if (availableDays(period, vacations, new Set()) >= periodTarget(spec, period.start)) broken = true;
    }
  }
  return { current: broken ? 0 : cached.current, best: cached.best, asOf: today };
}

/** What a habit's streak counts: months for monthly, weeks for the other open kinds, else days. */
export function streakUnitOf(spec: ScheduleSpec | null): StreakUnit {
  if (!spec || !isOpenKind(spec)) return "days";
  return spec.schedule === "monthly" ? "months" : "weeks";
}

/**
 * The streak to show today: the cached number aged forward by `streakAfter`
 * (display only; the cache itself is written by `habitWrites.ts`). Zero when
 * the schedule cannot be read.
 */
export function displayStreak(
  spec: ScheduleSpec | null,
  cache: StreakCache,
  vacations: readonly Vacation[],
  today: CalendarDate,
): number {
  return spec ? streakAfter(spec, cache, vacations, today).current : 0;
}
