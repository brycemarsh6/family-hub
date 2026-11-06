import {
  HABIT_TIMES_LIMITS,
  parseWeekdayMask,
  type Weekday,
} from "../habitVocabulary";
import {
  addCalendarDays,
  calendarDaysBetween,
  dayOfWeek,
  startOfMonth,
  startOfWeek,
  type CalendarDate,
} from "../householdDate";
import type { DayRange, DueState, ScheduleSpec } from "./types";

// What a schedule means: which days it is scheduled on, which kinds are
// "open" (weekly, monthly, biweekly with no days) and which are "scheduled"
// (the rest), and the period a count is taken over. Pure: no db, no React,
// and "today" always comes in from the caller.

/** The stored columns of a habit that decide its schedule (`anchorWeek` already a CalendarDate). */
export type ScheduleRow = {
  schedule: string;
  weekdays: string | null;
  times: number | null;
  anchorWeek: CalendarDate | null;
};

export function isSameDay(a: CalendarDate, b: CalendarDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/** Negative when `a` is before `b`. */
export function compareDays(a: CalendarDate, b: CalendarDate): number {
  return calendarDaysBetween(b, a);
}

export function isDayInRange(day: CalendarDate, range: DayRange): boolean {
  return compareDays(day, range.start) >= 0 && compareDays(day, range.end) <= 0;
}

function clampTimes(times: number | null, max: number): number {
  if (times === null || !Number.isFinite(times)) return 1;
  return Math.min(Math.max(Math.trunc(times), 1), max);
}

/**
 * The engine's reading of a stored row; null when the row cannot be
 * scheduled (an unknown schedule, weekdays with no days, biweekly with no
 * anchor). Weekly times clamp to 1..7 and monthly to 1..31.
 */
export function scheduleFromRow(row: ScheduleRow): ScheduleSpec | null {
  const days = row.weekdays === null ? [] : parseWeekdayMask(row.weekdays);
  switch (row.schedule) {
    case "daily":
      return { schedule: "daily" };
    case "weekdays":
      return days && days.length > 0 ? { schedule: "weekdays", days } : null;
    case "weekly":
      return { schedule: "weekly", times: clampTimes(row.times, HABIT_TIMES_LIMITS.weekly) };
    case "biweekly":
      return days && row.anchorWeek
        ? { schedule: "biweekly", days, anchorWeek: startOfWeek(row.anchorWeek) }
        : null;
    case "monthly":
      return { schedule: "monthly", times: clampTimes(row.times, HABIT_TIMES_LIMITS.monthly) };
    default:
      return null;
  }
}

/** Open kinds stay open until their count is met: weekly, monthly, biweekly with no days. */
export function isOpenKind(spec: ScheduleSpec): boolean {
  if (spec.schedule === "biweekly") return spec.days.length === 0;
  return spec.schedule === "weekly" || spec.schedule === "monthly";
}

/** Biweekly parity: whole weeks from the anchor week to `day`'s week are even (before the anchor too). */
export function isDueWeek(spec: ScheduleSpec, day: CalendarDate): boolean {
  if (spec.schedule !== "biweekly") return true;
  const weeks = calendarDaysBetween(spec.anchorWeek, startOfWeek(day)) / 7;
  return Math.abs(weeks) % 2 === 0;
}

/** Whether `day` is one of the schedule's own days. Open kinds have none. */
export function isScheduledDay(spec: ScheduleSpec, day: CalendarDate): boolean {
  switch (spec.schedule) {
    case "daily":
      return true;
    case "weekdays":
      return spec.days.includes(dayOfWeek(day) as Weekday);
    case "biweekly":
      return spec.days.includes(dayOfWeek(day) as Weekday) && isDueWeek(spec, day);
    default:
      return false;
  }
}

/** The month for monthly, otherwise the Sunday-to-Saturday week, containing `day`. */
export function periodWindow(spec: ScheduleSpec, day: CalendarDate): DayRange {
  if (spec.schedule === "monthly") {
    const start = startOfMonth(day);
    // Month 13 rolls into next January inside addCalendarDays' Date.UTC.
    return { start, end: addCalendarDays({ ...start, month: start.month + 1 }, -1) };
  }
  const start = startOfWeek(day);
  return { start, end: addCalendarDays(start, 6) };
}

/**
 * How many checks fill the period containing `day`: a daily habit's week is
 * 7, certain days is its day count, weekly and monthly are N, and a biweekly
 * week is its day count (1 with none) or 0 in an off week.
 */
export function periodTarget(spec: ScheduleSpec, day: CalendarDate): number {
  switch (spec.schedule) {
    case "daily":
      return 7;
    case "weekdays":
      return spec.days.length;
    case "biweekly":
      return isDueWeek(spec, day) ? Math.max(spec.days.length, 1) : 0;
    default:
      return spec.times;
  }
}

/**
 * Required, open or none on `day`. A scheduled kind is required on its days;
 * an open kind is open until `doneInPeriod` (checks so far this period)
 * reaches the target, then none; a planned day makes any kind required,
 * unless an open kind's target is already met.
 */
export function dueState(
  spec: ScheduleSpec,
  day: CalendarDate,
  planned: boolean,
  doneInPeriod = 0,
): DueState {
  if (isOpenKind(spec)) {
    if (!isDueWeek(spec, day) || doneInPeriod >= periodTarget(spec, day)) return "none";
    return planned ? "required" : "open";
  }
  return planned || isScheduledDay(spec, day) ? "required" : "none";
}

/**
 * Every scheduled day from `from` to `to`, oldest first.
 * Dormant until PR C (mission 32): the calendar and the stats page read scheduled days.
 */
export function scheduledDaysInRange(spec: ScheduleSpec, from: CalendarDate, to: CalendarDate): CalendarDate[] {
  const days: CalendarDate[] = [];
  for (let day = from; compareDays(day, to) <= 0; day = addCalendarDays(day, 1)) {
    if (isScheduledDay(spec, day)) days.push(day);
  }
  return days;
}

/** The due periods of an open kind that overlap `from` to `to`, oldest first; none for scheduled kinds. */
export function periodsInRange(spec: ScheduleSpec, from: CalendarDate, to: CalendarDate): DayRange[] {
  if (!isOpenKind(spec)) return [];
  const periods: DayRange[] = [];
  let cursor = periodWindow(spec, from).start;
  while (compareDays(cursor, to) <= 0) {
    const window = periodWindow(spec, cursor);
    if (isDueWeek(spec, cursor)) periods.push(window);
    cursor = addCalendarDays(window.end, 1);
  }
  return periods;
}
