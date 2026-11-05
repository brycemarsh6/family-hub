import type { CalendarDate } from "../householdDate";
import { isDayInRange, isSameDay, periodTarget, periodWindow } from "./schedule";
import type { DayRange, HabitLogDay, ScheduleSpec } from "./types";

// How many checks a habit has in its period, for the "3 of 7 this week" line
// Plans & Goals shows. Pure: no db, no React; callers pass `today`.

export type WindowProgress = DayRange & {
  count: number;
  target: number;
  label: "this week" | "this month";
  doneToday: boolean;
};

/** A check counts toward progress when the thing was done, on time or late; a skip does not. */
function isCheck(log: HabitLogDay): boolean {
  return log.status === "done" || log.status === "late";
}

/** Distinct days with a check inside `range` (ends included). */
export function countDays(logs: readonly HabitLogDay[], range: DayRange): number {
  const days = new Set<number>();
  for (const log of logs) {
    if (isCheck(log) && isDayInRange(log.day, range)) {
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
 * month and everything else the week.
 */
export function windowProgress(
  spec: ScheduleSpec,
  logs: readonly HabitLogDay[],
  today: CalendarDate,
): WindowProgress {
  const window = periodWindow(spec, today);
  return {
    ...window,
    count: countDays(logs, window),
    target: periodTarget(spec, today),
    label: spec.schedule === "monthly" ? "this month" : "this week",
    doneToday: logs.some((log) => isCheck(log) && isSameDay(log.day, today)),
  };
}
