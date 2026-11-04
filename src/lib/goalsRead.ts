import "server-only";
import { db } from "@/lib/db";
import {
  buildGoalView,
  canSee,
  earlierDate,
  type GoalRow,
  type GoalView,
  type PlanItemRow,
  type PlanLogRow,
  type PlansPageData,
  type Viewer,
} from "@/lib/goals";
import {
  LIFE_AREAS,
  toGoalVisibility,
  toHabitPeriod,
  toLifeArea,
  toPlanKind,
} from "@/lib/goalVocabulary";
import {
  startOfMonth,
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

function goalInclude(today: CalendarDate) {
  return {
    owner: { select: OWNER_SELECT },
    planItems: {
      orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      include: {
        logs: { where: { day: { gte: utcMidnightInstant(earliestWindowStart(today)) } } },
      },
    },
  };
}

type LoadedGoal = Awaited<ReturnType<typeof findGoals>>[number];

function findGoals(today: CalendarDate) {
  return db.goal.findMany({ include: goalInclude(today), orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }] });
}

function toView(row: LoadedGoal, viewer: Viewer, today: CalendarDate): GoalView | null {
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
  }));
  const logs: PlanLogRow[] = row.planItems.flatMap((item) =>
    item.logs.map((log) => ({
      id: log.id,
      planItemId: log.planItemId,
      day: log.day,
      createdAt: log.createdAt,
    })),
  );
  return buildGoalView(goal, items, logs, viewer, today);
}

/** Every goal the viewer may see, soonest target date first, with this week's and month's habit counts. */
export async function loadPlansPage(viewer: Viewer, today: CalendarDate): Promise<PlansPageData> {
  const rows = await findGoals(today);
  const goals = rows.flatMap((row) => toView(row, viewer, today) ?? []);
  return { today, weekStart: startOfWeek(today), goals };
}

/** One goal as the viewer sees it; null when it is missing or hidden from them. */
export async function loadGoal(id: string, viewer: Viewer, today: CalendarDate): Promise<GoalView | null> {
  const row = await db.goal.findUnique({ where: { id }, include: goalInclude(today) });
  return row ? toView(row, viewer, today) : null;
}
