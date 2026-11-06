import { HOUSEHOLD_TIME_ZONE } from "./constants";
import type { HabitPeriod, PlanKind } from "./goalVocabulary";
import { distinctDays, windowProgress } from "./habits/progress";
import type { HabitLogDay, ScheduleSpec } from "./habits/types";
import {
  addCalendarDays,
  calendarDateInZone,
  calendarDaysBetween,
  type CalendarDate,
} from "./householdDate";

// Plans & Goals' progress math: habit counts (read from the habit engine), how
// far a number has moved, pace, and number formatting. No db, no React.
// `targetDate` is UTC midnight. The row and view types the math needs live
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
  /** For a habit with a Habit row, `buildPlanItemView` re-derives these two from its schedule. */
  timesPerPeriod: number | null;
  period: HabitPeriod | null;
  /** The Habit behind a habit item; null for steps, reminders and a habit item not yet linked. */
  habitId: string | null;
  doneAt: Date | null;
  sortOrder: number;
  createdAt: Date;
};

/** What the views read of a habit: its schedule and every participant's checks (`HabitForPlan` fits). */
export type PlanHabit = {
  spec: ScheduleSpec | null;
  schedule: { schedule: string; times: number | null };
  /** The day the habit was made, for a daily habit's first-week target. */
  startDay?: CalendarDate | null;
  logs: HabitLogDay[];
};

export type PlanItemView = PlanItemRow & {
  count: number;
  target: number;
  windowLabel: "this week" | "this month" | null;
  done: boolean;
  /** Whether today has a check; one tap a day, so this is what the round button shows. */
  doneToday: boolean;
};

// ---- Habit counts ----

/** The "times a day / week / month" a schedule reads as in the edit sheet. */
function planShape(spec: ScheduleSpec): { timesPerPeriod: number; period: HabitPeriod } {
  switch (spec.schedule) {
    case "daily":
      return { timesPerPeriod: 1, period: "day" };
    case "monthly":
      return { timesPerPeriod: spec.times, period: "month" };
    case "weekly":
      return { timesPerPeriod: spec.times, period: "week" };
    default:
      return { timesPerPeriod: Math.max(spec.days.length, 1), period: "week" };
  }
}

/** A habit item with no readable Habit: 0 progress against the target its own columns give, never done. */
function unlinkedHabitView(item: PlanItemRow): PlanItemView {
  const times = item.timesPerPeriod ?? 0;
  const target = item.period === "day" ? times * 7 : times;
  const windowLabel = item.period === null ? null : item.period === "month" ? "this month" : "this week";
  return { ...item, count: 0, target, windowLabel, done: false, doneToday: false };
}

/** One plan item as a view. Counts are days with a check (a Together habit's participants collapse into one). */
export function buildPlanItemView(
  item: PlanItemRow,
  habit: PlanHabit | null,
  today: CalendarDate,
): PlanItemView {
  if (item.kind === "step") {
    const done = item.doneAt !== null;
    return { ...item, count: done ? 1 : 0, target: 1, windowLabel: null, done, doneToday: false };
  }
  if (item.kind !== "habit") {
    return { ...item, count: 0, target: 0, windowLabel: null, done: false, doneToday: false };
  }
  if (!habit || !habit.spec) return unlinkedHabitView(item);
  const progress = windowProgress(habit.spec, distinctDays(habit.logs), today, habit.startDay);
  return {
    ...item,
    ...planShape(habit.spec),
    count: progress.count,
    target: progress.target,
    windowLabel: progress.label,
    done: progress.count >= progress.target,
    doneToday: progress.doneToday,
  };
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
