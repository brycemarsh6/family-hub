import { HABIT_TIMES_LIMITS } from "./habitVocabulary";
import {
  GOAL_OWNERSHIPS,
  GOAL_OWNERSHIP_LABELS,
  TOGETHER_BOARD,
  toGoalVisibility,
  toHabitPeriod,
  toLifeArea,
  toPlanKind,
  type GoalOwnership,
  type GoalVisibility,
  type HabitPeriod,
  type LifeArea,
  type PlanKind,
  type VisionBoardKey,
} from "./goalVocabulary";
import {
  buildPlanItemView,
  paceStatus,
  progressFraction,
  type PaceStatus,
  type PlanItemRow,
  type PlanHabit,
  type PlanItemView,
} from "./goalsProgress";
import type { HabitFields } from "./habits/habitRows";
import { calendarDaysBetween, parseDateParam, type CalendarDate } from "./householdDate";

// Plans & Goals' pure rules: who a goal belongs to and who may see, change or
// log it, what the goal and plan forms may submit, and how a goal is built
// into a view. No db, no React. The progress math (windows, counts, pace,
// formatting) is in goalsProgress.ts, whose row and view types are
// re-exported here so callers keep one import path.

export type { PaceStatus, PlanHabit, PlanItemRow, PlanItemView } from "./goalsProgress";

export type Viewer = { userId: string; isDevice: boolean };

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

export type GoalView = GoalRow & {
  items: PlanItemView[];
  /** Newest first. Empty unless the reader loaded them (only a single goal's page does). */
  checkIns: { id: string; value: number; at: Date }[];
  progress: number;
  pace: PaceStatus;
  canEdit: boolean;
  canLog: boolean;
};

export type PlansPageData = { today: CalendarDate; weekStart: CalendarDate; goals: GoalView[] };

// ---- Policy: a goal with no owner is "Together" ----
// Every place that asks whose a goal is, or whether it is private, asks here.

type Owned = Pick<GoalRow, "ownerId" | "visibility">;

/** Mine (it has an owner) or Together (it has none). */
export function goalOwnership(goal: Pick<GoalRow, "ownerId">): GoalOwnership {
  return goal.ownerId === null ? "together" : "mine";
}

/** Whose a goal is to this viewer: theirs, nobody's in particular, or someone else's. */
export function whoseGoal(goal: Pick<GoalRow, "ownerId">, viewerId: string): "mine" | "together" | "theirs" {
  if (goal.ownerId === null) return "together";
  return goal.ownerId === viewerId ? "mine" : "theirs";
}

export function isPrivateGoal(goal: Pick<GoalRow, "visibility">): boolean {
  return goal.visibility === "private";
}

/** Whether a goal sits on a vision board: the Together board holds Together goals, a person's holds theirs. */
export function goalOnBoard(goal: Pick<GoalRow, "ownerId">, board: VisionBoardKey): boolean {
  return board === TOGETHER_BOARD ? goal.ownerId === null : goal.ownerId === board;
}

/** A private goal is seen by its owner only (a private goal with no owner by nobody). */
export function canSee(goal: Owned, viewer: Viewer): boolean {
  if (!isPrivateGoal(goal)) return true;
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

/**
 * Whether a viewer counts a goal in a scope. A shared device, or the
 * "everyone" scope, keeps all of them; otherwise the viewer's own and Together
 * ones (not someone else's). Completed or not is a separate question.
 */
export function countsInScope(goal: Pick<GoalRow, "ownerId">, viewer: Viewer, scope: "mine" | "everyone"): boolean {
  return viewer.isDevice || scope === "everyone" || whoseGoal(goal, viewer.userId) !== "theirs";
}

/** The active goals (not completed) a viewer counts on This week and the dashboard tile. */
export function goalsInScope<G extends Pick<GoalRow, "ownerId" | "completedAt">>(
  goals: G[],
  viewer: Viewer,
  scope: "mine" | "everyone",
): G[] {
  return goals.filter((goal) => goal.completedAt === null && countsInScope(goal, viewer, scope));
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

// The form limits, shared by these checks and the inputs' maxLength.
export const GOAL_TITLE_MAX = 120;
export const GOAL_WHY_MAX = 500;
export const MEASURE_UNIT_MAX = 12;
/** The most checks a period holds with one check a day: a day has one, a week seven, a month 31. */
export const HABIT_TIMES_MAX: Record<HabitPeriod, number> = { day: 1, week: HABIT_TIMES_LIMITS.weekly, month: HABIT_TIMES_LIMITS.monthly };
const PAST_DATE = "Pick a target date that isn't in the past.";

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}

function validateMeasure(raw: unknown): { ok: GoalInput["measure"] } | { error: string } {
  if (raw === null || raw === undefined) return { ok: null };
  if (!isRecord(raw)) return { error: "Fill in the number to track, or turn it off." };
  const unit = typeof raw.unit === "string" ? raw.unit.trim() : "";
  if (unit.length < 1 || unit.length > MEASURE_UNIT_MAX) return { error: `Name the unit in 1 to ${MEASURE_UNIT_MAX} characters.` };
  const { start, target } = raw;
  if (typeof start !== "number" || !Number.isFinite(start)) return { error: "Enter a starting number." };
  if (typeof target !== "number" || !Number.isFinite(target)) return { error: "Enter a target number." };
  if (start === target) return { error: "The target needs to be different from the starting number." };
  return { ok: { unit, start, target } };
}

function validTitle(raw: unknown, what: string): { title: string } | { error: string } {
  const title = typeof raw === "string" ? raw.trim() : "";
  if (title.length < 1) return { error: `Give the ${what} a name.` };
  if (title.length > GOAL_TITLE_MAX) return { error: `Keep the name to ${GOAL_TITLE_MAX} characters or fewer.` };
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
  if (!ownership) {
    return { error: `Pick whether the goal is ${GOAL_OWNERSHIP_LABELS.mine} or ${GOAL_OWNERSHIP_LABELS.together}.` };
  }
  const visibility = toGoalVisibility(raw.visibility);
  if (visibility === "private" && ownership !== "mine") return { error: "Only a goal that's yours can be private." };
  if (raw.why != null && typeof raw.why !== "string") return { error: "The why needs to be words." };
  const why = typeof raw.why === "string" ? raw.why.trim() : "";
  if (why.length > GOAL_WHY_MAX) return { error: `Keep the why to ${GOAL_WHY_MAX} characters or fewer.` };
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
  const habitPeriod = toHabitPeriod(period);
  if (!habitPeriod) return { error: "Pick every day, a week, or a month." };
  const max = HABIT_TIMES_MAX[habitPeriod];
  if (typeof times !== "number" || !Number.isInteger(times) || times < 1 || times > max) {
    return { error: habitPeriod === "day" ? "A habit gets one check a day." : `Pick how many times, from 1 to ${max}.` };
  }
  return { ok: { title, kind, timesPerPeriod: times, period: habitPeriod } };
}

/**
 * The Habit fields a habit plan item stands for: every day, N a week or N a
 * month; "build" mode, the goal's life area, one shared check for a Together
 * goal and one each for a Mine goal (private when the goal is).
 */
export function habitInputFromPlan(
  input: PlanItemInput,
  goal: { ownerId: string | null; visibility: string; area: string },
): HabitFields & { title: string; schedule: string } {
  const schedule = input.period === "day" ? "daily" : input.period === "month" ? "monthly" : "weekly";
  return {
    title: input.title,
    kind: "habit",
    mode: "build",
    schedule,
    times: schedule === "daily" ? null : input.timesPerPeriod,
    lifeArea: goal.area,
    sharing: goal.ownerId === null ? "together" : "each",
    isPrivate: toGoalVisibility(goal.visibility) === "private",
  };
}

/**
 * Whose row a tap writes. A Mine goal's habit is its owner's. A Together
 * habit checks for everyone, so any participant will do: the tapper when they
 * are one, otherwise (the wall tablet, someone who joined later) the first.
 */
export function habitCheckTarget(
  goal: { ownerId: string | null },
  viewerId: string,
  participantIds: readonly string[],
): string {
  if (goal.ownerId !== null) return goal.ownerId;
  return participantIds.includes(viewerId) ? viewerId : (participantIds[0] ?? viewerId);
}

/** Who a new habit is for: the owner of a Mine goal, the whole household for a Together one. */
export function habitParticipantsFor(goal: { ownerId: string | null }): string[] | "household" {
  return goal.ownerId !== null ? [goal.ownerId] : "household";
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

export function buildGoalView(
  goal: GoalRow,
  items: PlanItemRow[],
  habits: ReadonlyMap<string, PlanHabit>,
  viewer: Viewer,
  today: CalendarDate,
): GoalView {
  return {
    ...goal,
    items: items.map((item) => buildPlanItemView(item, item.habitId ? (habits.get(item.habitId) ?? null) : null, today)),
    checkIns: [],
    progress: progressFraction(goal),
    pace: paceStatus(goal, today),
    canEdit: canEdit(goal, viewer),
    canLog: canLog(goal, viewer),
  };
}
