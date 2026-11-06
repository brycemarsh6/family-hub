import "server-only";

import { db } from "@/lib/db";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import {
  addCalendarDays,
  calendarDateFromUtcMidnight,
  calendarDateInZone,
  startOfMonth,
  utcMidnightInstant,
  type CalendarDate,
} from "./householdDate";
import { canSeeHabit } from "./habits/access";
import { CARRY_LOOKBACK_DAYS, carriedFrom as carriedDay } from "./habits/carryOver";
import { logDayFromRow, logsForUser, specFromRow } from "./habits/habitRows";
import { windowProgress, type WindowProgress } from "./habits/progress";
import { compareDays, dueState as dueStateOf, isSameDay } from "./habits/schedule";
import type { DueState, HabitAccess, HabitActor, HabitLogDay, ScheduleSpec } from "./habits/types";
import type { HabitRowState, HabitMemberState } from "./habitChanges";
import {
  toHabitKind,
  toHabitMode,
  toHabitSharing,
  toTimeOfDay,
  type HabitKind,
  type HabitMode,
  type HabitSharing,
  type TimeOfDay,
} from "./habitVocabulary";

// The reader for habit rows, so pages never query the habit tables directly.
// PR A has one loader; later PRs add theirs here (or in a sibling file when
// this passes 350 lines). No auth: the caller (a page or action) has already
// checked the session and decides what the viewer may see via `access.ts`.

/** Everything the Plans & Goals views need to know about one habit. */
export type HabitForPlan = {
  id: string;
  title: string;
  sharing: string;
  isPrivate: boolean;
  carryOver: boolean;
  archivedAt: Date | null;
  /** The household day the habit was made (decision 85: its first week's target). */
  startDay: CalendarDate;
  /** The engine's reading of the schedule; null if the stored row cannot be scheduled. */
  spec: ScheduleSpec | null;
  /** The stored schedule columns, for forms. `anchorWeek` is already a calendar day. */
  schedule: { schedule: string; weekdays: string | null; times: number | null; anchorWeek: CalendarDate | null };
  participantIds: string[];
  /** Each participant's cached streak (`streakAsOf` as a calendar day, null if never computed). */
  participants: { userId: string; currentStreak: number; bestStreak: number; streakAsOf: CalendarDate | null }[];
  /** Checks on or after `from`, from every participant (each tagged with its `userId`). */
  logs: HabitLogDay[];
};

/**
 * Loads the given habits and their checks since `from` (inclusive) in two
 * queries however many habits there are. Habits that do not exist are simply
 * absent from the map.
 */
export async function loadHabitsForPlan(
  habitIds: readonly string[],
  from: CalendarDate,
): Promise<Map<string, HabitForPlan>> {
  const result = new Map<string, HabitForPlan>();
  const ids = [...new Set(habitIds)];
  if (ids.length === 0) return result;
  const [habits, logs] = await Promise.all([
    db.habit.findMany({
      where: { id: { in: ids } },
      include: {
        participants: {
          orderBy: { joinedAt: "asc" },
          select: { userId: true, currentStreak: true, bestStreak: true, streakAsOf: true },
        },
      },
    }),
    db.habitLog.findMany({
      where: { habitId: { in: ids }, day: { gte: utcMidnightInstant(from) } },
      select: { habitId: true, userId: true, day: true, status: true },
    }),
  ]);
  const logsByHabit = new Map<string, HabitLogDay[]>();
  for (const row of logs) {
    const list = logsByHabit.get(row.habitId) ?? [];
    list.push(logDayFromRow(row));
    logsByHabit.set(row.habitId, list);
  }
  for (const habit of habits) {
    result.set(habit.id, {
      id: habit.id,
      title: habit.title,
      sharing: habit.sharing,
      isPrivate: habit.isPrivate,
      carryOver: habit.carryOver,
      archivedAt: habit.archivedAt,
      startDay: calendarDateInZone(habit.createdAt, HOUSEHOLD_TIME_ZONE),
      spec: specFromRow(habit),
      schedule: {
        schedule: habit.schedule,
        weekdays: habit.weekdays,
        times: habit.times,
        anchorWeek: habit.anchorWeek ? calendarDateFromUtcMidnight(habit.anchorWeek) : null,
      },
      participantIds: habit.participants.map((p) => p.userId),
      participants: habit.participants.map((p) => ({
        userId: p.userId,
        currentStreak: p.currentStreak,
        bestStreak: p.bestStreak,
        streakAsOf: p.streakAsOf ? calendarDateFromUtcMidnight(p.streakAsOf) : null,
      })),
      logs: logsByHabit.get(habit.id) ?? [],
    });
  }
  return result;
}

/** One participant on a Today row: the reducer's state plus who they are. */
export type HabitMemberView = HabitMemberState & { displayName: string; avatarColor: string };

/**
 * One Today row. Extends `HabitRowState` (habitChanges.ts) so the list can
 * feed it straight into `applyHabitChange`; `doneToday` / `skippedToday` are
 * the viewer's own. `participants` is everyone active on the habit (an Each
 * habit shows each one's state), in joined order.
 */
export type HabitRowView = Omit<HabitRowState, "participants"> & {
  title: string;
  icon: string | null;
  kind: HabitKind;
  mode: HabitMode;
  timeOfDay: TimeOfDay | null;
  lifeArea: string | null;
  isPrivate: boolean;
  /** Required, open or none today; a "none" row only appears when carried or already checked or skipped. */
  dueState: DueState;
  /** The missed day this row stands for (carry-over), else null. A tap for it is written "late". */
  carriedFrom: CalendarDate | null;
  /** The viewer's count in this period (decision 85's start day included); null if the schedule cannot be read. */
  progress: WindowProgress | null;
  participants: HabitMemberView[];
};

/** One habit in the manager (active or archived), with every field the edit form pre-fills. */
export type HabitManagerItem = {
  id: string;
  title: string;
  icon: string | null;
  kind: HabitKind;
  mode: HabitMode;
  lifeArea: string | null;
  timeOfDay: TimeOfDay | null;
  schedule: string;
  weekdays: string | null;
  times: number | null;
  anchorWeek: CalendarDate | null;
  carryOver: boolean;
  sharing: HabitSharing;
  isPrivate: boolean;
  /** Made with the Everyone button (decision 87). */
  everyone: boolean;
  archived: boolean;
  participantIds: string[];
};

export type TodayPage = {
  /** Today's rows in the viewer's own order (done rows are NOT moved: the list sorts on load). */
  rows: HabitRowView[];
  /** Active habits the viewer takes part in, in the viewer's order. */
  manage: HabitManagerItem[];
  /** Archived habits the viewer took part in, newest archived first. */
  archived: HabitManagerItem[];
};

function isCheckStatus(status: string): boolean {
  return status === "done" || status === "late";
}

/**
 * The Today page and the manager in two queries: the habits the viewer takes
 * part in (with participants and names), then their checks from fourteen days
 * back, or from the first of the month when that is earlier so a monthly
 * count is whole. Private habits the viewer may not see are left out
 * (`canSeeHabit`). No auth: the page has already resolved the viewer.
 */
export async function loadTodayPage(viewer: HabitActor, today: CalendarDate): Promise<TodayPage> {
  const habits = await db.habit.findMany({
    where: { participants: { some: { userId: viewer.userId } } },
    include: {
      participants: {
        orderBy: { joinedAt: "asc" },
        select: {
          userId: true,
          sortOrder: true,
          joinedAt: true,
          user: { select: { displayName: true, avatarColor: true, deactivatedAt: true } },
        },
      },
    },
  });
  const sortOrderOf = (habit: (typeof habits)[number]) =>
    habit.participants.find((p) => p.userId === viewer.userId)?.sortOrder ?? 0;
  const visible = habits
    .filter((habit) => canSeeHabit(viewer, { isPrivate: habit.isPrivate, participantIds: habit.participants.map((p) => p.userId) }))
    .sort((a, b) => sortOrderOf(a) - sortOrderOf(b) || a.createdAt.getTime() - b.createdAt.getTime());
  const live = visible.filter((habit) => !habit.archivedAt);

  const lookback = addCalendarDays(today, -CARRY_LOOKBACK_DAYS);
  const monthStart = startOfMonth(today);
  const from = compareDays(monthStart, lookback) < 0 ? monthStart : lookback;
  const logRows =
    live.length === 0
      ? []
      : await db.habitLog.findMany({
          where: { habitId: { in: live.map((habit) => habit.id) }, day: { gte: utcMidnightInstant(from) } },
          select: { habitId: true, userId: true, day: true, status: true },
        });
  const logsByHabit = new Map<string, HabitLogDay[]>();
  for (const row of logRows) {
    const list = logsByHabit.get(row.habitId) ?? [];
    list.push(logDayFromRow(row));
    logsByHabit.set(row.habitId, list);
  }

  const rows: HabitRowView[] = [];
  for (const habit of live) {
    const logs = logsByHabit.get(habit.id) ?? [];
    const mine = logsForUser(logs, viewer.userId);
    const spec = specFromRow(habit);
    const startDay = calendarDateInZone(habit.createdAt, HOUSEHOLD_TIME_ZONE);
    const joined = habit.participants.find((p) => p.userId === viewer.userId)?.joinedAt;
    const joinedDay = joined ? calendarDateInZone(joined, HOUSEHOLD_TIME_ZONE) : startDay;
    const since = compareDays(joinedDay, startDay) > 0 ? joinedDay : startDay;
    const progress = spec ? windowProgress(spec, mine, today, startDay) : null;
    const carriedFrom = spec ? carriedDay(spec, habit.carryOver, mine, today, since) : null;
    const dueState: DueState = spec ? dueStateOf(spec, today, false, progress?.count ?? 0) : "required";
    const todayOf = (userId: string) => logs.find((log) => log.userId === userId && isSameDay(log.day, today));
    const members: HabitMemberView[] = habit.participants
      .filter((p) => !p.user.deactivatedAt)
      .map((p) => {
        const log = todayOf(p.userId);
        return {
          userId: p.userId,
          displayName: p.user.displayName,
          avatarColor: p.user.avatarColor,
          done: log ? isCheckStatus(log.status) : false,
          skipped: log?.status === "skipped",
        };
      });
    const me = todayOf(viewer.userId);
    const doneToday = me ? isCheckStatus(me.status) : false;
    const skippedToday = me?.status === "skipped";
    if (dueState === "none" && !carriedFrom && !doneToday && !skippedToday) continue;
    rows.push({
      id: habit.id,
      sharing: toHabitSharing(habit.sharing),
      viewerId: viewer.userId,
      doneToday,
      skippedToday,
      participants: members,
      title: habit.title,
      icon: habit.icon,
      kind: toHabitKind(habit.kind),
      mode: toHabitMode(habit.mode),
      timeOfDay: toTimeOfDay(habit.timeOfDay),
      lifeArea: habit.lifeArea,
      isPrivate: habit.isPrivate,
      dueState,
      carriedFrom,
      progress,
    });
  }

  const managerItem = (habit: (typeof habits)[number]): HabitManagerItem => ({
    id: habit.id,
    title: habit.title,
    icon: habit.icon,
    kind: toHabitKind(habit.kind),
    mode: toHabitMode(habit.mode),
    lifeArea: habit.lifeArea,
    timeOfDay: toTimeOfDay(habit.timeOfDay),
    schedule: habit.schedule,
    weekdays: habit.weekdays,
    times: habit.times,
    anchorWeek: habit.anchorWeek ? calendarDateFromUtcMidnight(habit.anchorWeek) : null,
    carryOver: habit.carryOver,
    sharing: toHabitSharing(habit.sharing),
    isPrivate: habit.isPrivate,
    everyone: habit.everyone,
    archived: habit.archivedAt !== null,
    participantIds: habit.participants.map((p) => p.userId),
  });
  return {
    rows,
    manage: live.map(managerItem),
    archived: visible
      .filter((habit) => habit.archivedAt)
      .sort((a, b) => b.archivedAt!.getTime() - a.archivedAt!.getTime())
      .map(managerItem),
  };
}

/** What an action needs to know about one habit before it lets anyone touch it. */
export type HabitForAction = HabitAccess & {
  sharing: HabitSharing;
  archived: boolean;
  carryOver: boolean;
  spec: ScheduleSpec | null;
  startDay: CalendarDate;
};

/** The habit's access facts (one query), or null when it does not exist. */
export async function loadHabitForAction(habitId: string): Promise<HabitForAction | null> {
  const habit = await db.habit.findUnique({
    where: { id: habitId },
    include: { participants: { select: { userId: true } } },
  });
  if (!habit) return null;
  return {
    isPrivate: habit.isPrivate,
    participantIds: habit.participants.map((p) => p.userId),
    sharing: toHabitSharing(habit.sharing),
    archived: habit.archivedAt !== null,
    carryOver: habit.carryOver,
    spec: specFromRow(habit),
    startDay: calendarDateInZone(habit.createdAt, HOUSEHOLD_TIME_ZONE),
  };
}

/**
 * The status of `userId`'s check on `day`, or null when there is none (two
 * queries at most: used by uncheck and unskip so each removes only its own kind).
 */
export async function loadLogStatus(habitId: string, userId: string, day: CalendarDate): Promise<string | null> {
  const row = await db.habitLog.findUnique({
    where: { habitId_userId_day: { habitId, userId, day: utcMidnightInstant(day) } },
    select: { status: true },
  });
  return row?.status ?? null;
}

/**
 * The missed day a tap by `userId` on `habitId` would be carrying today
 * (carry-over rules, 14 days back), or null. Lets the check action decide
 * "late" on the server instead of trusting the client.
 */
export async function loadCarriedDay(habit: HabitForAction, habitId: string, userId: string, today: CalendarDate): Promise<CalendarDate | null> {
  if (!habit.spec || !habit.carryOver) return null;
  const [logs, member] = await Promise.all([
    db.habitLog.findMany({
      where: { habitId, userId, day: { gte: utcMidnightInstant(addCalendarDays(today, -CARRY_LOOKBACK_DAYS)) } },
      select: { habitId: true, userId: true, day: true, status: true },
    }),
    db.habitParticipant.findUnique({ where: { habitId_userId: { habitId, userId } }, select: { joinedAt: true } }),
  ]);
  const joinedDay = member ? calendarDateInZone(member.joinedAt, HOUSEHOLD_TIME_ZONE) : habit.startDay;
  const since = compareDays(joinedDay, habit.startDay) > 0 ? joinedDay : habit.startDay;
  return carriedDay(habit.spec, true, logs.map(logDayFromRow), today, since);
}
