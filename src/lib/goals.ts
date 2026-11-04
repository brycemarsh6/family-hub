import { HOUSEHOLD_TIME_ZONE } from "./constants";
import {
  GOAL_OWNERSHIPS,
  toGoalVisibility,
  toHabitPeriod,
  toLifeArea,
  toPlanKind,
  type GoalOwnership,
  type GoalVisibility,
  type HabitPeriod,
  type LifeArea,
  type PlanKind,
} from "./goalVocabulary";
import {
  addCalendarDays,
  calendarDateInZone,
  calendarDaysBetween,
  parseDateParam,
  startOfMonth,
  startOfWeek,
  utcMidnightInstant,
  type CalendarDate,
} from "./householdDate";

// Plans & Goals' pure logic: policy, habit windows, progress, validation.
// No db, no React. `PlanLog.day` and `targetDate` are UTC midnight.

export type Viewer = { userId: string; isDevice: boolean };

export type PaceStatus = "reached" | "onPace" | "behind" | null;

export type GoalRow = {
  id: string;
  title: string;
  area: LifeArea;
  why: string | null;
  targetDate: Date;
  ownerId: string | null;
  owner: { id: string; displayName: string; avatarColor: string } | null;
  visibility: GoalVisibility;
  measureUnit: string | null;
  startValue: number | null;
  targetValue: number | null;
  currentValue: number | null;
  checkedInAt: Date | null;
  completedAt: Date | null;
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
};

export type PlanLogRow = { id: string; planItemId: string; day: Date; createdAt: Date };

export type PlanItemView = PlanItemRow & {
  count: number;
  target: number;
  windowLabel: "this week" | "this month" | null;
  done: boolean;
};

export type GoalView = GoalRow & {
  items: PlanItemView[];
  progress: number;
  pace: PaceStatus;
  canEdit: boolean;
  canLog: boolean;
};

export type PlansPageData = { today: CalendarDate; weekStart: CalendarDate; goals: GoalView[] };

// ---- Policy: a goal with no owner is "Together" ----

type Owned = Pick<GoalRow, "ownerId" | "visibility">;

/** A private goal is seen by its owner only (a private goal with no owner by nobody). */
export function canSee(goal: Owned, viewer: Viewer): boolean {
  if (goal.visibility !== "private") return true;
  return goal.ownerId !== null && goal.ownerId === viewer.userId;
}

/** Shared devices never change goals; Together is anyone's; Mine is its owner's. */
export function canEdit(goal: Owned, viewer: Viewer): boolean {
  if (viewer.isDevice) return false;
  return goal.ownerId === null || goal.ownerId === viewer.userId;
}

/** Like canEdit, except a shared device may log on a Together goal. */
export function canLog(goal: Owned, viewer: Viewer): boolean {
  return goal.ownerId === null || goal.ownerId === viewer.userId;
}

// ---- Validation ----

export type GoalInput = {
  title: string;
  area: LifeArea;
  why: string | null;
  targetDate: CalendarDate;
  ownership: GoalOwnership;
  visibility: GoalVisibility;
  measure: { unit: string; start: number; target: number } | null;
};

export type PlanItemInput = { title: string; kind: PlanKind; timesPerPeriod: number | null; period: HabitPeriod | null };

const TITLE_MAX = 120;
const WHY_MAX = 500;
const UNIT_MAX = 12;
const PAST_DATE = "Pick a target date that isn't in the past.";

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}

function validateMeasure(raw: unknown): { ok: GoalInput["measure"] } | { error: string } {
  if (raw === null || raw === undefined) return { ok: null };
  if (!isRecord(raw)) return { error: "Fill in the number to track, or turn it off." };
  const unit = typeof raw.unit === "string" ? raw.unit.trim() : "";
  if (unit.length < 1 || unit.length > UNIT_MAX) return { error: `Name the unit in 1 to ${UNIT_MAX} characters.` };
  const { start, target } = raw;
  if (typeof start !== "number" || !Number.isFinite(start)) return { error: "Enter a starting number." };
  if (typeof target !== "number" || !Number.isFinite(target)) return { error: "Enter a target number." };
  if (start === target) return { error: "The target needs to be different from the starting number." };
  return { ok: { unit, start, target } };
}

function validTitle(raw: unknown, what: string): { title: string } | { error: string } {
  const title = typeof raw === "string" ? raw.trim() : "";
  if (title.length < 1) return { error: `Give the ${what} a name.` };
  if (title.length > TITLE_MAX) return { error: `Keep the name to ${TITLE_MAX} characters or fewer.` };
  return { title };
}

/** The earlier of two days (ties give the first). */
export function earlierDate(a: CalendarDate, b: CalendarDate) {
  return calendarDaysBetween(a, b) >= 0 ? a : b;
}

/** `options.earliest` (default today) is the earliest date allowed, so an overdue goal can keep its own. */
export function validateGoalInput(
  raw: unknown, today: CalendarDate, options?: { earliest?: CalendarDate },
): { ok: GoalInput } | { error: string } {
  if (!isRecord(raw)) return { error: "That goal didn't come through. Try again." };
  const named = validTitle(raw.title, "goal");
  if ("error" in named) return named;
  const area = toLifeArea(raw.area);
  if (!area) return { error: "Pick a life area." };
  const ownership = GOAL_OWNERSHIPS.find((o) => o === raw.ownership);
  if (!ownership) return { error: "Pick whether the goal is Mine or Together." };
  const visibility = toGoalVisibility(raw.visibility);
  if (visibility === "private" && ownership !== "mine") return { error: "Only a goal that's yours can be private." };
  if (raw.why != null && typeof raw.why !== "string") return { error: "The why needs to be words." };
  const why = typeof raw.why === "string" ? raw.why.trim() : "";
  if (why.length > WHY_MAX) return { error: `Keep the why to ${WHY_MAX} characters or fewer.` };
  const targetDate = typeof raw.targetDate === "string" ? parseDateParam(raw.targetDate) : null;
  if (!targetDate) return { error: "Pick a target date." };
  if (calendarDaysBetween(options?.earliest ?? today, targetDate) < 0) return { error: PAST_DATE };
  const measure = validateMeasure(raw.measure);
  if ("error" in measure) return measure;
  return { ok: { title: named.title, area, why: why || null, targetDate, ownership, visibility, measure: measure.ok } };
}

export function validatePlanItemInput(raw: unknown): { ok: PlanItemInput } | { error: string } {
  if (!isRecord(raw)) return { error: "That plan didn't come through. Try again." };
  const named = validTitle(raw.title, "plan");
  if ("error" in named) return named;
  const { title } = named;
  const kind = toPlanKind(raw.kind);
  if (!kind) return { error: "Pick habit, step, or reminder." };
  const times = raw.timesPerPeriod ?? null;
  const period = raw.period ?? null;
  if (kind !== "habit") {
    if (times !== null || period !== null) return { error: "Only a habit repeats." };
    return { ok: { title, kind, timesPerPeriod: null, period: null } };
  }
  if (typeof times !== "number" || !Number.isInteger(times) || times < 1 || times > 20) {
    return { error: "Pick how many times, from 1 to 20." };
  }
  const habitPeriod = toHabitPeriod(period);
  if (!habitPeriod) return { error: "Pick a day, week, or month." };
  return { ok: { title, kind, timesPerPeriod: times, period: habitPeriod } };
}

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

// ---- Progress and pace (a goal with a number) ----

/** 0..1 of the way from start to target, whichever direction the number moves. */
export function progressFraction(goal: GoalRow): number {
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

export function paceStatus(goal: GoalRow, today: CalendarDate): PaceStatus {
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

/** The first step not yet done, by sortOrder (ties keep the given order). */
export function nextStep(items: PlanItemRow[]): PlanItemRow | null {
  let next: PlanItemRow | null = null;
  for (const item of items) {
    if (item.kind !== "step" || item.doneAt !== null) continue;
    if (next === null || item.sortOrder < next.sortOrder) next = item;
  }
  return next;
}

/**
 * This week's habits only (day and week habits; monthly ones are left out).
 * A habit logged past its target counts as exactly its target.
 */
export function weekSummary(goals: GoalView[]): { done: number; total: number } {
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

export function targetDateChips(today: CalendarDate): { label: string; date: CalendarDate }[] {
  const isLastDay = today.month === 12 && today.day === 31;
  const year = isLastDay ? today.year + 1 : today.year;
  return [
    { label: "End of this year", date: { year, month: 12, day: 31 } },
    { label: "In 90 days", date: addCalendarDays(today, 90) },
  ];
}

export function buildGoalView(
  goal: GoalRow,
  items: PlanItemRow[],
  logs: PlanLogRow[],
  viewer: Viewer,
  today: CalendarDate,
): GoalView {
  return {
    ...goal,
    items: items.map((item) => buildPlanItemView(item, logs, today)),
    progress: progressFraction(goal),
    pace: paceStatus(goal, today),
    canEdit: canEdit(goal, viewer),
    canLog: canLog(goal, viewer),
  };
}
