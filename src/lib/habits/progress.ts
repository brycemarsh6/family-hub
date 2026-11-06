import { calendarDaysBetween, type CalendarDate } from "../householdDate";
import { compareDays, isDayInRange, isSameDay, periodTarget, periodWindow } from "./schedule";
import { isCheckStatus } from "../habitVocabulary";
import type { DayRange, HabitLogDay, ScheduleSpec } from "./types";

// How many checks a habit has in its period, for the "3 of 7 this week" line
// Plans & Goals shows. Pure: no db, no React; callers pass `today`.

export type WindowProgress = DayRange & {
  count: number;
  target: number;
  label: "this week" | "this month";
  doneToday: boolean;
};

/** Distinct days with a check inside `range` (ends included). */
export function countDays(logs: readonly HabitLogDay[], range: DayRange): number {
  const days = new Set<number>();
  for (const log of logs) {
    if (isCheckStatus(log.status) && isDayInRange(log.day, range)) {
      days.add(Date.UTC(log.day.year, log.day.month - 1, log.day.day));
    }
  }
  return days.size;
}

/**
 * One entry per day across participants, how Plans & Goals reads a Together
 * habit after fan-out: three people's checks on Tuesday are one Tuesday. The
 * best status wins (done, then late, then skipped); oldest day first.
 */
export function distinctDays(logs: readonly HabitLogDay[]): HabitLogDay[] {
  const rank = { done: 0, late: 1, skipped: 2 } as const;
  const byDay = new Map<number, HabitLogDay>();
  for (const log of logs) {
    const key = Date.UTC(log.day.year, log.day.month - 1, log.day.day);
    const kept = byDay.get(key);
    if (!kept || rank[log.status] < rank[kept.status]) {
      byDay.set(key, { day: log.day, status: log.status });
    }
  }
  return [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([, log]) => log);
}

/**
 * Progress in the period containing `today`. A daily habit keeps the old
 * "7 this week" target so Plans & Goals reads the same; monthly counts the
 * month and everything else the week. `startDay` is the day the habit was
 * made (decision 85): for a daily habit whose first week is this one, the
 * target counts only the days from then to Saturday ("1 of 3" on a
 * Thursday); an older habit, or any other schedule, is unchanged.
 */
export function windowProgress(
  spec: ScheduleSpec,
  logs: readonly HabitLogDay[],
  today: CalendarDate,
  startDay?: CalendarDate | null,
): WindowProgress {
  const window = periodWindow(spec, today);
  let target = periodTarget(spec, today);
  if (spec.schedule === "daily" && startDay && isDayInRange(startDay, window) && compareDays(startDay, window.start) > 0) {
    target = calendarDaysBetween(startDay, window.end) + 1;
  }
  return {
    ...window,
    count: countDays(logs, window),
    target,
    label: spec.schedule === "monthly" ? "this month" : "this week",
    doneToday: logs.some((log) => isCheckStatus(log.status) && isSameDay(log.day, today)),
  };
}
