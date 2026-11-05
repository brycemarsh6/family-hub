import { HOUSEHOLD_TIME_ZONE } from "./constants";
import type { HabitPeriod, PlanKind } from "./goalVocabulary";
import {
  addCalendarDays,
  calendarDateInZone,
  calendarDaysBetween,
  startOfMonth,
  startOfWeek,
  utcMidnightInstant,
  type CalendarDate,
} from "./householdDate";

// Plans & Goals' progress math: habit windows and counts, how far a number has
// moved, pace, and number formatting. No db, no React. `PlanLog.day` and
// `targetDate` are UTC midnight. The row and view types the math needs live
// here, and goals.ts re-exports them, so this file never imports goals.ts.
// Who may see or change a goal, and what the forms may submit, are in goals.ts.

export type PaceStatus = "reached" | "onPace" | "behind" | null;

/** The part of a goal the progress and pace math reads (a `GoalRow` fits). */
export type GoalMeasure = {
  targetDate: Date;
  startValue: number | null;
  targetValue: number | null;
  currentValue: number | null;
  createdAt: Date;
};

export type PlanItemRow = {
  id: string;
  goalId: string;
  title: string;
  kind: PlanKind;
  timesPerPeriod: number | null;
  period: HabitPeriod | null;
  doneAt: Date | null;
  sortOrder: number;
  createdAt: Date;
};

export type PlanLogRow = { id: string; planItemId: string; day: Date; createdAt: Date };

export type PlanItemView = PlanItemRow & {
  count: number;
  target: number;
  windowLabel: "this week" | "this month" | null;
  done: boolean;
};

// ---- Habit windows and counts ----

export type LogWindow = { start: CalendarDate; end: CalendarDate; target: number; label: "this week" | "this month" };

/** Where a habit's logs count: a day habit counts across the week. Null for non-habits. */
export function logWindow(item: PlanItemRow, today: CalendarDate): LogWindow | null {
  if (item.kind !== "habit" || item.timesPerPeriod === null || item.period === null) return null;
  const times = item.timesPerPeriod;
  if (item.period === "month") {
    const start = startOfMonth(today);
    // Month 13 rolls into next January inside addCalendarDays' Date.UTC.
    const end = addCalendarDays({ ...start, month: start.month + 1 }, -1);
    return { start, end, target: times, label: "this month" };
  }
  const start = startOfWeek(today);
  const target = item.period === "day" ? times * 7 : times;
  return { start, end: addCalendarDays(start, 6), target, label: "this week" };
}

/** Logs whose day falls in the window, ends included. */
export function countInWindow(
  logs: PlanLogRow[],
  window: Pick<LogWindow, "start" | "end">,
): number {
  const from = utcMidnightInstant(window.start).getTime();
  const before = utcMidnightInstant(addCalendarDays(window.end, 1)).getTime();
  return logs.filter((log) => log.day.getTime() >= from && log.day.getTime() < before).length;
}

export function buildPlanItemView(
  item: PlanItemRow,
  logs: PlanLogRow[],
  today: CalendarDate,
): PlanItemView {
  if (item.kind === "step") {
    const done = item.doneAt !== null;
    return { ...item, count: done ? 1 : 0, target: 1, windowLabel: null, done };
  }
  const window = logWindow(item, today);
  if (!window) return { ...item, count: 0, target: 0, windowLabel: null, done: false };
  const count = countInWindow(
    logs.filter((log) => log.planItemId === item.id),
    window,
  );
  return { ...item, count, target: window.target, windowLabel: window.label, done: count >= window.target };
}

/**
 * This week's habits only (day and week habits; monthly ones are left out).
 * A habit logged past its target counts as exactly its target.
 */
export function weekSummary(goals: { items: PlanItemView[] }[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const goal of goals) {
    for (const item of goal.items) {
      if (item.kind !== "habit" || item.windowLabel !== "this week") continue;
      done += Math.min(item.count, item.target);
      total += item.target;
    }
  }
  return { done, total };
}

/**
 * The habits `weekSummary` counts that are not yet done, in goal order then
 * item order, as how many taps each still needs. At most `limit`.
 */
export function weekTodo(
  goals: { items: PlanItemView[] }[],
  limit: number,
): { id: string; title: string; left: number }[] {
  const todo: { id: string; title: string; left: number }[] = [];
  for (const goal of goals) {
    for (const item of goal.items) {
      if (item.kind !== "habit" || item.windowLabel !== "this week" || item.count >= item.target) continue;
      todo.push({ id: item.id, title: item.title, left: item.target - item.count });
    }
  }
  return todo.slice(0, Math.max(0, limit));
}

/**
 * Where a goal's number stands once a check-in is removed: the newest of the
 * ones left (given in any order), or the start value with no check-in date
 * when none remain.
 */
export function numberAfterCheckIns(
  startValue: number | null,
  remaining: { value: number; at: Date }[],
): { currentValue: number | null; checkedInAt: Date | null } {
  if (remaining.length === 0) return { currentValue: startValue, checkedInAt: null };
  const newest = remaining.reduce((a, b) => (b.at.getTime() > a.at.getTime() ? b : a));
  return { currentValue: newest.value, checkedInAt: newest.at };
}

// ---- Progress and pace (a goal with a number) ----

/** 0..1 of the way from start to target, whichever direction the number moves. */
export function progressFraction(goal: GoalMeasure): number {
  const { startValue: start, targetValue: target, currentValue: current } = goal;
  if (start === null || target === null || current === null || start === target) return 0;
  return Math.min(1, Math.max(0, (current - start) / (target - start)));
}

export const PACE_LABELS: Record<Exclude<PaceStatus, null>, string> = {
  reached: "reached",
  onPace: "on pace",
  behind: "a little behind pace",
};

const BEHIND_MARGIN = 0.1;

export function paceStatus(goal: GoalMeasure, today: CalendarDate): PaceStatus {
  if (goal.startValue === null || goal.targetValue === null || goal.currentValue === null) return null;
  const progress = progressFraction(goal);
  const created = calendarDateInZone(goal.createdAt, HOUSEHOLD_TIME_ZONE);
  const total = calendarDaysBetween(created, calendarDateInZone(goal.targetDate, "UTC"));
  if (total <= 0) return progress >= 1 ? "reached" : "behind";
  if (progress >= 1) return "reached";
  const expected = Math.min(1, Math.max(0, calendarDaysBetween(created, today) / total));
  return progress < expected - BEHIND_MARGIN ? "behind" : "onPace";
}

const MEASURE_STEPS = [
  0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000,
];

/** The +/- step for a check-in: about a twentieth of the range, snapped to a tidy size (ties go down). */
export function measureStep(start: number, target: number): number {
  const ideal = Math.abs(target - start) / 20;
  let best = MEASURE_STEPS[0];
  for (const step of MEASURE_STEPS) {
    if (Math.abs(step - ideal) < Math.abs(best - ideal)) best = step;
  }
  return best;
}

function trimDecimal(value: number): string {
  return String(Number(value.toFixed(1)));
}

/** `$` leads and abbreviates from 1,000 (truncated to one decimal); any other unit trails. */
export function formatMeasure(value: number, unit: string): string {
  if (unit !== "$") return `${trimDecimal(value)} ${unit}`;
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs < 1000) return `${sign}$${trimDecimal(abs)}`;
  const [divisor, suffix] = abs >= 1_000_000 ? [1_000_000, "M"] : [1000, "K"];
  const tenths = Math.floor(abs / (divisor / 10));
  const decimal = tenths % 10 === 0 ? "" : `.${tenths % 10}`;
  return `${sign}$${Math.floor(tenths / 10)}${decimal}${suffix}`;
}

/** What was typed, as a number; null for blank or anything that isn't one ("1,200" counts). */
export function parseTypedNumber(text: string): number | null {
  const cleaned = text.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function targetDateChips(today: CalendarDate): { label: string; date: CalendarDate }[] {
  const isLastDay = today.month === 12 && today.day === 31;
  const year = isLastDay ? today.year + 1 : today.year;
  return [
    { label: "End of this year", date: { year, month: 12, day: 31 } },
    { label: "In 90 days", date: addCalendarDays(today, 90) },
  ];
}
