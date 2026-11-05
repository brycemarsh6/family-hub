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
  type PlanLogRow,
  type PlansPageData,
  type Viewer,
} from "@/lib/goals";
import { isRecapDay, weekRecap, type RecapGoalInput, type WeekRecap } from "@/lib/goalsRecap";
import { weekSummary, weekTodo } from "@/lib/goalsProgress";
import {
  LIFE_AREAS,
  toGoalVisibility,
  toHabitPeriod,
  toLifeArea,
  toPlanKind,
  type LifeArea,
  type VisionBoardKey,
} from "@/lib/goalVocabulary";
import {
  startOfMonth,
  addCalendarDays,
  startOfWeek,
  utcMidnightInstant,
  type CalendarDate,
} from "@/lib/householdDate";

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
function logsFrom(today: CalendarDate): Date {
  return utcMidnightInstant(addCalendarDays(earliestWindowStart(today), -7));
}

function goalInclude(today: CalendarDate, { checkIns = false }: { checkIns?: boolean } = {}) {
  return {
    // Check-in rows load only for the pages that show or sum them.
    checkIns: checkIns ? { orderBy: { at: "desc" as const }, select: { id: true, value: true, at: true } } : false,
    owner: { select: OWNER_SELECT },
    planItems: {
      orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      include: {
        logs: { where: { day: { gte: logsFrom(today) } } },
      },
    },
  };
}

type LoadedGoal = Awaited<ReturnType<typeof findGoals>>[number];

function findGoals(today: CalendarDate, options?: { checkIns?: boolean }) {
  return db.goal.findMany({ include: goalInclude(today, options), orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }] });
}

type GoalParts = { goal: GoalRow; items: PlanItemRow[]; logs: PlanLogRow[] };

/** The plain rows behind a loaded goal; null when the viewer may not see it. */
function toParts(row: LoadedGoal, viewer: Viewer): GoalParts | null {
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
    doneAt: item.doneAt,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt,
  }));
  const logs: PlanLogRow[] = row.planItems.flatMap((item) =>
    item.logs.map((log) => ({
      id: log.id,
      planItemId: log.planItemId,
      day: log.day,
      createdAt: log.createdAt,
    })),
  );
  return { goal, items, logs };
}

function toView(row: LoadedGoal, viewer: Viewer, today: CalendarDate, withCheckIns = false): GoalView | null {
  const parts = toParts(row, viewer);
  if (!parts) return null;
  const view = buildGoalView(parts.goal, parts.items, parts.logs, viewer, today);
  return withCheckIns ? { ...view, checkIns: row.checkIns } : view;
}

/** Every goal the viewer may see, soonest target date first, with this week's and month's habit counts. */
export async function loadPlansPage(viewer: Viewer, today: CalendarDate): Promise<PlansPageData> {
  const rows = await findGoals(today);
  const goals = rows.flatMap((row) => toView(row, viewer, today) ?? []);
  return { today, weekStart: startOfWeek(today), goals };
}

/** One goal as the viewer sees it; null when it is missing or hidden from them. */
export async function loadGoal(id: string, viewer: Viewer, today: CalendarDate): Promise<GoalView | null> {
  const row = await db.goal.findUnique({ where: { id }, include: goalInclude(today, { checkIns: true }) });
  return row ? toView(row, viewer, today, true) : null;
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

/** What the dashboard tile shows: this week's habit taps for the viewer's own and Together goals, and what is left. */
export async function loadGoalsTile(
  viewer: Viewer,
  today: CalendarDate,
): Promise<{ done: number; total: number; todo: { id: string; title: string; left: number }[] }> {
  const { goals } = await loadPlansPage(viewer, today);
  const inScope = goalsInScope(goals, viewer, "mine");
  return { ...weekSummary(inScope), todo: weekTodo(inScope, 3) };
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
  const rows = await findGoals(today, { checkIns: true });
  const inputs: RecapGoalInput[] = rows.flatMap((row) => {
    const parts = toParts(row, viewer);
    return parts ? [{ ...parts, checkIns: row.checkIns.map(({ value, at }) => ({ value, at })) }] : [];
  });
  const lastWeek = addCalendarDays(startOfWeek(today), -7);
  const mine = inputs.filter((input) => countsInScope(input.goal, viewer, "mine"));
  return { mine: weekRecap(mine, lastWeek), everyone: weekRecap(inputs, lastWeek) };
}
