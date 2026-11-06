import { HOUSEHOLD_TIME_ZONE } from "../constants";
import { addCalendarDays, calendarDateInZone, calendarDaysBetween, type CalendarDate } from "../householdDate";
import type { HabitLogStatus } from "../habitVocabulary";
import { compareDays, isOpenKind, isSameDay, isScheduledDay } from "./schedule";
import type { HabitLogDay, ScheduleSpec } from "./types";

// Carry-over: a missed scheduled day shows again until it is done or until
// the habit's next scheduled day absorbs it. Pure: callers pass `today`.

/**
 * How many days back a missed day can still be carried (the Today page loads 14 days of logs).
 */
export const CARRY_LOOKBACK_DAYS = 14;

/**
 * The day a carried row is "from", or null. Only scheduled kinds with
 * carry-over on; null when today is itself scheduled (the carry is absorbed,
 * decision 72). Otherwise the latest scheduled day before today, if it has no
 * row of any status (if it has one, any older miss is absorbed: null), no earlier than `since` (the day the habit or person
 * started) and no more than CARRY_LOOKBACK_DAYS back.
 */
export function carriedFrom(
  spec: ScheduleSpec,
  carryOver: boolean,
  logs: readonly HabitLogDay[],
  today: CalendarDate,
  since?: CalendarDate,
): CalendarDate | null {
  if (!carryOver || isOpenKind(spec) || isScheduledDay(spec, today)) return null;
  for (let back = 1; back <= CARRY_LOOKBACK_DAYS; back++) {
    const day = addCalendarDays(today, -back);
    if (since && compareDays(day, since) < 0) return null;
    // The newest scheduled day decides: a row on it absorbs any older miss.
    if (isScheduledDay(spec, day)) return logs.some((log) => isSameDay(log.day, day)) ? null : day;
  }
  return null;
}

/**
 * The status a tap writes: "late" only when the tap is for the carried day
 * (it was missed and is not otherwise due today); a tap for today, or a
 * back-filled day, is "done" on time.
 */
export function statusForTap(tapDay: CalendarDate, carried: CalendarDate | null): HabitLogStatus {
  return carried && isSameDay(tapDay, carried) ? "late" : "done";
}

/** The household day a habit was made: decision 85's first-week start, and the earliest day it can carry over from. */
export function habitStartDay(createdAt: Date): CalendarDate {
  return calendarDateInZone(createdAt, HOUSEHOLD_TIME_ZONE);
}

/**
 * The first day a person can have missed on a habit: the later of the day the
 * habit was made and the day they joined it (`joinedAt` unknown means the
 * habit's own start). The one `since` for carry-over.
 */
export function carrySince(joinedAt: Date | null | undefined, startDay: CalendarDate): CalendarDate {
  const joinedDay = joinedAt ? calendarDateInZone(joinedAt, HOUSEHOLD_TIME_ZONE) : startDay;
  return compareDays(joinedDay, startDay) > 0 ? joinedDay : startDay;
}

/** How far back any tap may reach on its own; a carried day may be older (up to the carry-over lookback). */
export const TAP_DAYS_BACK = 7;

/**
 * Whether a tap for `day` is allowed: never in the future, never past the
 * carry-over lookback, and older than a week only when it is exactly the
 * carried day the Today row stands for (`carried`, the server's own answer).
 */
export function isTapDayAllowed(day: CalendarDate, today: CalendarDate, carried: CalendarDate | null): boolean {
  const ago = calendarDaysBetween(day, today);
  if (ago < 0 || ago > CARRY_LOOKBACK_DAYS) return false;
  return ago <= TAP_DAYS_BACK || (carried !== null && isSameDay(day, carried));
}
