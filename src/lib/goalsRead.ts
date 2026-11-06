import "server-only";
import { db } from "@/lib/db";
import {
  buildGoalView,
  canSee,
  countsInScope,
  earlierDate,
  goalOnBoard,
  goalsInScope,
  type GoalRow,
  type GoalView,
  type PlanItemRow,
  type PlanHabit,
  type PlansPageData,
  type Viewer,
} from "@/lib/goals";
import { isRecapDay, weekRecap, type RecapGoalInput, type WeekRecap } from "@/lib/goalsRecap";
import { weekSummary, weekTodo, weekTodoForGoals, type WeekTodoItem } from "@/lib/goalsProgress";
import { keepOwnPicks } from "@/lib/dashboardPicks";
import { loadHabitsForPlan } from "@/lib/habitsRead";
import {
  LIFE_AREAS,
  toGoalVisibility,
  toHabitPeriod,
  toLifeArea,
  toPlanKind,
  type LifeArea,
  type VisionBoardKey,
} from "@/lib/goalVocabulary";
import { startOfMonth, addCalendarDays, startOfWeek, type CalendarDate } from "@/lib/householdDate";

// Plans & Goals' reader: one query shape for the Goals list, This week and a
// single goal's detail page. No auth and no revalidation here: the page that
// calls it guards, and `canSee` decides what a viewer may be shown. Stored
// text (area, kind, period, visibility) is repaired by the vocabulary
// narrowers, so an odd row degrades to a safe default instead of crashing.

const OWNER_SELECT = { id: true, displayName: true, avatarColor: true } as const;

/** The earliest log any habit's window can reach: the week or the month start, whichever is earlier. */
function earliestWindowStart(today: CalendarDate): CalendarDate {
  return earlierDate(startOfWeek(today), startOfMonth(today));
}

/** Habit logs reach back one more week than the windows need, so the Sunday recap can sum the week just ended. */
function logsFrom(today: CalendarDate): CalendarDate {
  return addCalendarDays(earliestWindowStart(today), -7);
}

function goalInclude({ checkIns = false }: { checkIns?: boolean } = {}) {
  return {
    // Check-in rows load only for the pages that show or sum them.
    checkIns: checkIns ? { orderBy: { at: "desc" as const }, select: { id: true, value: true, at: true } } : false,
    owner: { select: OWNER_SELECT },
    planItems: {
      orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
    },
  };
}

type LoadedGoal = Awaited<ReturnType<typeof findGoals>>[number];

function findGoals(options?: { checkIns?: boolean }) {
  return db.goal.findMany({ include: goalInclude(options), orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }] });
}

type GoalParts = { goal: GoalRow; items: PlanItemRow[]; habits: ReadonlyMap<string, PlanHabit> };

/** The plain rows behind a loaded goal; null when the viewer may not see it. */
function toParts(row: LoadedGoal, viewer: Viewer, habits: ReadonlyMap<string, PlanHabit>): GoalParts | null {
  const goal: GoalRow = {
    id: row.id,
    title: row.title,
    area: toLifeArea(row.area) ?? LIFE_AREAS[0].key,
    why: row.why,
    targetDate: row.targetDate,
    ownerId: row.ownerId,
    owner: row.owner,
    visibility: toGoalVisibility(row.visibility),
    measureUnit: row.measureUnit,
    startValue: row.startValue,
    targetValue: row.targetValue,
    currentValue: row.currentValue,
    checkedInAt: row.checkedInAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
  };
  if (!canSee(goal, viewer)) return null;

  const items: PlanItemRow[] = row.planItems.map((item) => ({
    id: item.id,
    goalId: item.goalId,
    title: item.title,
    kind: toPlanKind(item.kind) ?? "reminder",
    timesPerPeriod: item.timesPerPeriod,
    period: toHabitPeriod(item.period),
    habitId: item.habitId,
    doneAt: item.doneAt,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt,
  }));
  return { goal, items, habits };
}

/** The habits behind the visible goals' habit items: one loader call, with the reach-back the windows and recap need. */
function habitsOf(rows: LoadedGoal[], viewer: Viewer, today: CalendarDate) {
  const ids = rows
    .filter((row) => canSee({ ownerId: row.ownerId, visibility: toGoalVisibility(row.visibility) }, viewer))
    .flatMap((row) => row.planItems.flatMap((item) => (item.habitId ? [item.habitId] : [])));
  return loadHabitsForPlan(ids, logsFrom(today), viewer.userId);
}

function toView(
  row: LoadedGoal,
  viewer: Viewer,
  today: CalendarDate,
  habits: ReadonlyMap<string, PlanHabit>,
  withCheckIns = false,
): GoalView | null {
  const parts = toParts(row, viewer, habits);
  if (!parts) return null;
  const view = buildGoalView(parts.goal, parts.items, parts.habits, viewer, today);
  return withCheckIns ? { ...view, checkIns: row.checkIns } : view;
}

/** Every goal the viewer may see, soonest target date first, with this week's and month's habit counts. */
export async function loadPlansPage(viewer: Viewer, today: CalendarDate): Promise<PlansPageData> {
  const rows = await findGoals();
  const habits = await habitsOf(rows, viewer, today);
  const goals = rows.flatMap((row) => toView(row, viewer, today, habits) ?? []);
  return { today, weekStart: startOfWeek(today), goals };
}

/** One goal as the viewer sees it; null when it is missing or hidden from them. */
export async function loadGoal(id: string, viewer: Viewer, today: CalendarDate): Promise<GoalView | null> {
  const row = await db.goal.findUnique({ where: { id }, include: goalInclude({ checkIns: true }) });
  if (!row) return null;
  return toView(row, viewer, today, await habitsOf([row], viewer, today), true);
}

/** How many active goals each life area has on a board, among the goals the viewer may see. */
export async function loadGoalAreaCounts(
  viewer: Viewer,
  board: VisionBoardKey,
  today: CalendarDate,
): Promise<Record<LifeArea, number>> {
  const { goals } = await loadPlansPage(viewer, today);
  const counts = Object.fromEntries(LIFE_AREAS.map((area) => [area.key, 0])) as Record<LifeArea, number>;
  for (const goal of goals) {
    if (goal.completedAt === null && goalOnBoard(goal, board)) counts[goal.area] += 1;
  }
  return counts;
}

/**
 * What the dashboard tile shows: this week's habit taps for the viewer's own and Together goals, and what is left.
 * `picks` are goal ids from the layout (decision 136): ids that are not among the goals counted here are dropped,
 * and with any left "Still to do" lists the picked goals' habits only (`picked` is true). `pickable` is the goal
 * list for the picker: Mine and Together, not completed, soonest target date first.
 */
export async function loadGoalsTile(
  viewer: Viewer,
  today: CalendarDate,
  picks: string[] = [],
): Promise<{
  done: number;
  total: number;
  todo: WeekTodoItem[];
  picked: boolean;
  pickable: { id: string; title: string }[];
}> {
  const { goals } = await loadPlansPage(viewer, today);
  const inScope = goalsInScope(goals, viewer, "mine");
  const pickable = inScope.map((goal) => ({ id: goal.id, title: goal.title }));
  const own = keepOwnPicks(picks, pickable.map((goal) => goal.id));
  const todo = own.length > 0 ? weekTodoForGoals(inScope, own) : weekTodo(inScope, 3);
  return { ...weekSummary(inScope), todo, picked: own.length > 0, pickable };
}

/**
 * The Sunday recap of the week that just ended, for both of This week's scopes
 * (the chips switch between them on the client), or null when today is not
 * Sunday. Only what the viewer may see goes into either. Unlike the tile, a
 * goal completed during or after that week still counts, so the scope rule is
 * applied here with `countsInScope` rather than through `goalsInScope`.
 */
export async function loadWeekRecap(
  viewer: Viewer,
  today: CalendarDate,
): Promise<{ mine: WeekRecap | null; everyone: WeekRecap | null } | null> {
  if (!isRecapDay(today)) return null;
  const rows = await findGoals({ checkIns: true });
  const habits = await habitsOf(rows, viewer, today);
  const inputs: RecapGoalInput[] = rows.flatMap((row) => {
    const parts = toParts(row, viewer, habits);
    return parts ? [{ ...parts, checkIns: row.checkIns.map(({ value, at }) => ({ value, at })) }] : [];
  });
  const lastWeek = addCalendarDays(startOfWeek(today), -7);
  const mine = inputs.filter((input) => countsInScope(input.goal, viewer, "mine"));
  return { mine: weekRecap(mine, lastWeek), everyone: weekRecap(inputs, lastWeek) };
}
