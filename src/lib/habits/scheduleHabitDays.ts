import type { CalendarHabitDayView } from "../types";
import type { ScheduleRenderDay, ScheduleRenderMonth } from "../scheduleWindowState";

// Folds planned habit days into the Schedule view's rendered months (decision
// 146) without touching the paging state machine. A planned day with no event
// or task still needs a row, so rows are added for those days.

export type ScheduleRenderDayWithHabits = ScheduleRenderDay & { habitDays: CalendarHabitDayView[] };
export type ScheduleRenderMonthWithHabits = { monthStart: Date; days: ScheduleRenderDayWithHabits[] };

function localDay(instant: Date): Date {
  return new Date(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate());
}

/**
 * Every day of `months` gains its `habitDays`; a habit day inside
 * `[windowStart, windowEnd)` (local midnights) with no row gets its own row,
 * in calendar order. Days outside the window are ignored (they are not loaded).
 */
export function addHabitDaysToSchedule(
  months: readonly ScheduleRenderMonth[],
  habitDays: readonly CalendarHabitDayView[],
  windowStart: Date,
  windowEnd: Date,
): ScheduleRenderMonthWithHabits[] {
  const byDay = new Map<number, CalendarHabitDayView[]>();
  for (const item of habitDays) {
    const day = localDay(item.dayInstant);
    if (day.getTime() < windowStart.getTime() || day.getTime() >= windowEnd.getTime()) continue;
    byDay.set(day.getTime(), [...(byDay.get(day.getTime()) ?? []), item]);
  }
  if (byDay.size === 0) return months.map((m) => ({ monthStart: m.monthStart, days: m.days.map((d) => ({ ...d, habitDays: [] })) }));

  const rows = new Map<number, ScheduleRenderDayWithHabits>();
  for (const month of months) {
    for (const row of month.days) rows.set(row.day.getTime(), { ...row, habitDays: byDay.get(row.day.getTime()) ?? [] });
  }
  for (const [time, items] of byDay) {
    if (!rows.has(time)) rows.set(time, { day: new Date(time), events: [], tasks: [], habitDays: items });
  }
  const groups: ScheduleRenderMonthWithHabits[] = [];
  for (const row of [...rows.values()].sort((a, b) => a.day.getTime() - b.day.getTime())) {
    const monthStart = new Date(row.day.getFullYear(), row.day.getMonth(), 1);
    const last = groups[groups.length - 1];
    if (last && last.monthStart.getTime() === monthStart.getTime()) last.days.push(row);
    else groups.push({ monthStart, days: [row] });
  }
  return groups;
}
