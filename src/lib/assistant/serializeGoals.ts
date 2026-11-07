import { LIFE_AREAS, type VisionHorizon } from "@/lib/goalVocabulary";
import { goalOnBoard, goalOwnership, isOngoingGoal, isPrivateGoal, nextStep, type GoalView, type PlanItemView } from "@/lib/goals";
import { weekSummary, weekTodo } from "@/lib/goalsProgress";
import type { WeekRecap } from "@/lib/goalsRecap";
import { weekRows } from "@/lib/goalsWeek";
import { calendarDateFromUtcMidnight, formatCalendarDate, type CalendarDate } from "@/lib/householdDate";
import type { ChangeInput } from "./audit";
import { habitChanges, type HabitSnapshot } from "./serializeHabits";
import { toCopy } from "./undoPlan";

// DB row -> wire format for the Assistant API's goal, plan item and vision
// routes, and the audit copies their writes record. Pure, and every output is
// built field by field: never a spread of a row or view, so a column added
// later can't leak onto the wire by default. People are ids only: the owner's
// name, which the views carry, never leaves here. Days leave as "YYYY-MM-DD".

const day = (date: Date) => formatCalendarDate(calendarDateFromUtcMidnight(date));
const instant = (date: Date) => date.toISOString();

/** A goal's number, or null for a goal with none. */
function toNumber(goal: GoalView) {
  if (goal.measureUnit === null) return null;
  return {
    unit: goal.measureUnit,
    start: goal.startValue,
    target: goal.targetValue,
    current: goal.currentValue,
    progress: goal.progress,
    pace: goal.pace,
    checkedInAt: goal.checkedInAt ? instant(goal.checkedInAt) : null,
  };
}

/** The goal as the Goals list reads it. */
export function toGoalSummary(goal: GoalView) {
  return {
    id: goal.id,
    title: goal.title,
    area: goal.area,
    why: goal.why,
    targetDate: goal.targetDate ? day(goal.targetDate) : null,
    ongoing: isOngoingGoal(goal),
    ownership: goalOwnership(goal),
    ownerId: goal.ownerId,
    private: isPrivateGoal(goal),
    number: toNumber(goal),
    completed: goal.completedAt !== null,
    completedAt: goal.completedAt ? instant(goal.completedAt) : null,
    planItemCount: goal.items.length,
    latestCheckIn: goal.checkedInAt && goal.currentValue !== null ? { value: goal.currentValue, at: instant(goal.checkedInAt) } : null,
    canEdit: goal.canEdit,
  };
}

/** A plan item with this week's (or month's) count. A step carries `doneAt`; an hours habit its week. */
export function toPlanItem(item: PlanItemView) {
  return {
    id: item.id,
    goalId: item.goalId,
    title: item.title,
    kind: item.kind,
    habitId: item.habitId,
    timesPerPeriod: item.timesPerPeriod,
    period: item.period,
    count: item.count,
    target: item.target,
    window: item.windowLabel,
    done: item.done,
    doneToday: item.doneToday,
    doneAt: item.doneAt ? instant(item.doneAt) : null,
    hours: item.hours
      ? { doneMinutes: item.hours.done, targetMinutes: item.hours.target, met: item.hours.met, forPersonId: item.hours.forUserId }
      : null,
  };
}

export type GoalExtras = {
  checkIns: readonly { id: string; value: number; at: Date }[];
  madeByAssistant: ReadonlySet<string>;
  /** The vision line the goal's page shows: the board it sits on ("together" or a person's id). */
  vision: { board: string; horizon: number; text: string } | null;
  createdByAssistant: boolean;
};

/** `GET /goals/{id}`: the summary, its plan items, every check-in newest first and the vision line. */
export function toGoalDetail(goal: GoalView, extras: GoalExtras) {
  return {
    ...toGoalSummary(goal),
    createdByAssistant: extras.createdByAssistant,
    planItems: goal.items.map(toPlanItem),
    checkIns: extras.checkIns.map((checkIn) => ({
      id: checkIn.id,
      value: checkIn.value,
      at: instant(checkIn.at),
      createdByAssistant: extras.madeByAssistant.has(checkIn.id),
    })),
    vision: extras.vision,
  };
}

/** `WeekRecap` with days spelled out and nothing but the words and counts. */
function toRecap(recap: WeekRecap | null) {
  if (recap === null) return null;
  return {
    start: formatCalendarDate(recap.start),
    end: formatCalendarDate(recap.end),
    done: recap.done,
    total: recap.total,
    habits: recap.habits.map((h) => ({ title: h.title, count: h.count, target: h.target, met: h.met, hoursText: h.hoursText ?? null })),
    measures: recap.measures.map((m) => ({ goalTitle: m.goalTitle, from: m.from, to: m.to })),
    stepsDone: [...recap.stepsDone],
  };
}

/**
 * `GET /goals/week`: each goal's rows in the order This week shows them (habits,
 * the steps ticked this week, the next step, reminders), the week's habit
 * count, the habits still to do, and on Sundays the recap of the week just ended.
 */
export function toWeek(input: { goals: readonly GoalView[]; weekStart: CalendarDate; recapDay: boolean; recap: WeekRecap | null; personId?: string }) {
  const goals = input.goals.flatMap((goal) => {
    const rows = weekRows(goal, input.weekStart);
    if (rows.length === 0) return [];
    return [{ id: goal.id, title: goal.title, area: goal.area, ownership: goalOwnership(goal), ownerId: goal.ownerId, planItems: rows.map(toPlanItem) }];
  });
  const todo = weekTodo([...input.goals], Number.POSITIVE_INFINITY);
  return {
    weekStart: formatCalendarDate(input.weekStart),
    personId: input.personId ?? null,
    summary: weekSummary([...input.goals]),
    habitsLeft: todo.map((t) => ({ planItemId: t.id, title: t.title, left: t.left, hoursLine: t.hoursLine ?? null })),
    nextSteps: input.goals.flatMap((goal) => {
      const step = nextStep(goal.items);
      return step ? [{ goalId: goal.id, planItemId: step.id, title: step.title }] : [];
    }),
    goals,
    recapDay: input.recapDay,
    recap: toRecap(input.recap),
  };
}

export type VisionRows = { boardKey: string; area: string; horizon: number; text: string }[];

/** `GET /vision`: each board at each horizon, with the text (or null) and the active goal count per life area. */
export function toVisionBoards(input: {
  boards: readonly string[];
  horizons: readonly VisionHorizon[];
  rows: VisionRows;
  goals: readonly { ownerId: string | null; area: string; completedAt: Date | null }[];
  canEdit: (board: string) => boolean;
}) {
  return input.boards.map((board) => ({
    board,
    canEdit: input.canEdit(board),
    horizons: input.horizons.map((horizon) => ({
      horizon,
      cards: LIFE_AREAS.map((area) => {
        const row = input.rows.find((r) => r.boardKey === board && r.horizon === horizon && r.area === area.key && r.text.trim() !== "");
        return {
          area: area.key,
          text: row ? row.text : null,
          goalCount: input.goals.filter((g) => g.completedAt === null && g.area === area.key && goalOnBoard(g, board)).length,
        };
      }),
    })),
  }));
}

// ---- Audit copies ----

type Row = Record<string, unknown> & { id: string };

/** Columns of two copies that differ, leaving out `updatedAt` (it moves on every write). */
export function changedColumns(before: Row, after: Row, model: "Goal" | "PlanItem" | "VisionStatement"): string[] {
  const b = toCopy(model, before);
  const a = toCopy(model, after);
  return Object.keys(a).filter((key) => key !== "updatedAt" && (b[key] ?? null) !== (a[key] ?? null));
}

/** Whether any column differs, `updatedAt` included (a write that moved only that still has to be on record, or the next undo sees a stale row). */
function wasWritten(model: "Goal" | "PlanItem" | "VisionStatement", before: Row, after: Row): boolean {
  const b = toCopy(model, before);
  const a = toCopy(model, after);
  return Object.keys(a).some((key) => (b[key] ?? null) !== (a[key] ?? null));
}

export function goalCreateChange(goal: Row): ChangeInput {
  return { model: "Goal", recordId: goal.id, action: "create", summary: { title: goal.title }, before: null, after: toCopy("Goal", goal) };
}

/** A goal write's entry from the row before and after, or none when the row was not written. */
export function goalUpdateChange(before: Row, after: Row): ChangeInput[] {
  if (!wasWritten("Goal", before, after)) return [];
  return [{ model: "Goal", recordId: after.id, action: "update", summary: { changed: changedColumns(before, after, "Goal") }, before: toCopy("Goal", before), after: toCopy("Goal", after) }];
}

export function checkInChange(action: "create" | "delete", row: Row): ChangeInput {
  const copy = toCopy("GoalCheckIn", row);
  return {
    model: "GoalCheckIn",
    recordId: row.id,
    action,
    summary: { goalId: copy.goalId, value: copy.value },
    before: action === "delete" ? copy : null,
    after: action === "create" ? copy : null,
  };
}

function planItemChange(action: ChangeInput["action"], before: Row | null, after: Row | null): ChangeInput {
  const row = (after ?? before)!;
  return {
    model: "PlanItem",
    recordId: row.id,
    action,
    summary: action === "update" && before && after ? { changed: changedColumns(before, after, "PlanItem") } : { goalId: row.goalId, title: row.title },
    before: before ? toCopy("PlanItem", before) : null,
    after: after ? toCopy("PlanItem", after) : null,
  };
}

/** The Habit and participant rows grouped per habit, for `habitChanges` to diff. */
function habitSnapshots(habits: readonly Row[], participants: readonly Row[]): Map<string, HabitSnapshot> {
  return new Map(habits.map((habit) => [habit.id, { habit, participants: participants.filter((p) => p.habitId === habit.id) as HabitSnapshot["participants"] }]));
}

/** A plan item that was just added, with the Habit (and its people) a habit item made. */
export function planItemCreateChanges(item: Row, habits: readonly Row[], participants: readonly Row[]): ChangeInput[] {
  return [planItemChange("create", null, item), ...[...habitSnapshots(habits, participants).values()].flatMap((snap) => habitChanges(null, snap))];
}

/** What editing a plan item wrote: the item, then each Habit it touched; empty when nothing changed. */
export function planItemUpdateChanges(input: {
  item: { before: Row; after: Row };
  habits: { before: readonly Row[]; after: readonly Row[] };
  participants: { before: readonly Row[]; after: readonly Row[] };
}): ChangeInput[] {
  const had = habitSnapshots(input.habits.before, input.participants.before);
  const has = habitSnapshots(input.habits.after, input.participants.after);
  const habitIds = [...new Set([...had.keys(), ...has.keys()])];
  const habitEntries = habitIds.flatMap((id) => habitChanges(had.get(id) ?? null, has.get(id) ?? null));
  const itemEntry = wasWritten("PlanItem", input.item.before, input.item.after) ? [planItemChange("update", input.item.before, input.item.after)] : [];
  return [...itemEntry, ...habitEntries];
}

/** Whether an edit changed anything the family would see (the `updatedAt` stamp alone does not count). */
export function planItemEditChangedAnything(input: Parameters<typeof planItemUpdateChanges>[0]): boolean {
  const habitEntries = planItemUpdateChanges(input).filter((entry) => entry.model !== "PlanItem");
  return changedColumns(input.item.before, input.item.after, "PlanItem").length > 0 || habitEntries.length > 0;
}

export function visionChange(before: Row | null, after: Row): ChangeInput {
  return {
    model: "VisionStatement",
    recordId: after.id,
    action: before ? "update" : "create",
    summary: { board: after.boardKey, area: after.area, horizon: after.horizon },
    before: before ? toCopy("VisionStatement", before) : null,
    after: toCopy("VisionStatement", after),
  };
}
