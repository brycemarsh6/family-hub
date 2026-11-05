import { HOUSEHOLD_TIME_ZONE } from "./constants";
import type { GoalRow } from "./goals";
import { buildPlanItemView, formatMeasure, weekSummary, type PlanItemRow, type PlanItemView, type PlanLogRow } from "./goalsProgress";
import {
  addCalendarDays,
  dayOfWeek,
  formatShortCalendarDate,
  zoneMidnightInstant,
  type CalendarDate,
} from "./householdDate";

// The Sunday recap's pure logic: whether today is recap day, and how the week
// that just ended (Sunday to Saturday) sums up. No db, no React. Habit logs
// are matched by their `day` (UTC midnight); check-ins and finished steps are
// real instants, compared against household midnights. Monthly habits are
// left out, the same as the This week header (`weekSummary`).

export type RecapGoalInput = {
  goal: GoalRow;
  items: PlanItemRow[];
  logs: PlanLogRow[];
  checkIns: { value: number; at: Date }[];
};

export type WeekRecap = {
  start: CalendarDate;
  end: CalendarDate;
  done: number;
  total: number;
  habits: { title: string; count: number; target: number; met: boolean }[];
  measures: { goalTitle: string; from: string; to: string }[];
  stepsDone: string[];
};

/** The recap card shows on Sundays only. */
export function isRecapDay(today: CalendarDate): boolean {
  return dayOfWeek(today) === 0;
}

/** "Nov 1 to 7"; the month repeats only when it changes ("Oct 25 to Nov 1"). */
export function recapRangeLabel(start: CalendarDate, end: CalendarDate): string {
  const last = start.month === end.month ? String(end.day) : formatShortCalendarDate(end);
  return `${formatShortCalendarDate(start)} to ${last}`;
}

/**
 * The week starting `weekStart` (a Sunday), or null when there is nothing to
 * show: no day or week habits, no measured check-ins and no finished steps.
 * A goal counts if it was active that week (created before the week ended,
 * and not completed before it began).
 */
export function weekRecap(input: RecapGoalInput[], weekStart: CalendarDate): WeekRecap | null {
  const end = addCalendarDays(weekStart, 6);
  const from = zoneMidnightInstant(weekStart, HOUSEHOLD_TIME_ZONE).getTime();
  const until = zoneMidnightInstant(addCalendarDays(weekStart, 7), HOUSEHOLD_TIME_ZONE).getTime();

  let done = 0;
  let total = 0;
  const habits: WeekRecap["habits"] = [];
  const measures: WeekRecap["measures"] = [];
  const stepsDone: string[] = [];

  for (const { goal, items, logs, checkIns } of input) {
    if (goal.createdAt.getTime() >= until) continue;
    if (goal.completedAt !== null && goal.completedAt.getTime() < from) continue;

    const habitViews: PlanItemView[] = [];
    for (const item of items) {
      if (item.createdAt.getTime() >= until) continue;
      if (item.kind === "step") {
        if (item.doneAt !== null && item.doneAt.getTime() >= from && item.doneAt.getTime() < until) {
          stepsDone.push(item.title);
        }
        continue;
      }
      if (item.kind !== "habit") continue;
      const view = buildPlanItemView(item, logs, weekStart);
      if (view.windowLabel === "this week") habitViews.push(view);
    }
    // Same read as the This week header: day and week habits, capped at target.
    const sum = weekSummary([{ items: habitViews }]);
    done += sum.done;
    total += sum.total;
    for (const view of habitViews) {
      const count = Math.min(view.count, view.target);
      habits.push({ title: view.title, count, target: view.target, met: view.done });
    }

    const { measureUnit: unit, startValue, targetValue } = goal;
    if (unit === null || startValue === null || targetValue === null) continue;
    const ms = (checkIn: { at: Date }) => checkIn.at.getTime();
    const inWeek = checkIns.filter((c) => ms(c) >= from && ms(c) < until);
    if (inWeek.length === 0) continue;
    const newest = (list: typeof checkIns) => list.reduce((a, b) => (ms(b) > ms(a) ? b : a));
    const before = checkIns.filter((c) => ms(c) < from);
    const startOfWeekValue = before.length > 0 ? newest(before).value : startValue;
    measures.push({
      goalTitle: goal.title,
      from: formatMeasure(startOfWeekValue, unit),
      to: formatMeasure(newest(inWeek).value, unit),
    });
  }

  if (habits.length === 0 && measures.length === 0 && stepsDone.length === 0) return null;
  return { start: weekStart, end, done, total, habits, measures, stepsDone };
}
