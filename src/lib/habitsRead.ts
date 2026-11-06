import "server-only";

import { db } from "@/lib/db";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import {
  addCalendarDays,
  calendarDateFromUtcMidnight,
  calendarDateInZone,
  utcMidnightInstant,
  type CalendarDate,
} from "./householdDate";
import { CARRY_LOOKBACK_DAYS, carriedFrom as carriedDay } from "./habits/carryOver";
import { logDayFromRow, specFromRow } from "./habits/habitRows";
import { compareDays } from "./habits/schedule";
import type { HabitAccess, HabitActor, HabitLogDay, ScheduleSpec } from "./habits/types";
import { buildTodayPage, todayLogsFrom, type TodayPage } from "./habitsToday";
import { toHabitSharing, type HabitSharing } from "./habitVocabulary";

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

export type { HabitMemberView, HabitRowView, HabitManagerItem, TodayPage } from "./habitsToday";

/**
 * The Today page and the manager in two queries: the habits the viewer takes
 * part in (with participants and names), then their checks from fourteen days
 * back, or from the first of the month when that is earlier so a monthly
 * count is whole. The rules live in `habitsToday.ts`. No auth: the page has
 * already resolved the viewer.
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
  const liveIds = habits.filter((habit) => !habit.archivedAt).map((habit) => habit.id);
  const logRows =
    liveIds.length === 0
      ? []
      : await db.habitLog.findMany({
          where: { habitId: { in: liveIds }, day: { gte: utcMidnightInstant(todayLogsFrom(today)) } },
          select: { habitId: true, userId: true, day: true, status: true },
        });
  const logsByHabit = new Map<string, HabitLogDay[]>();
  for (const row of logRows) {
    const list = logsByHabit.get(row.habitId) ?? [];
    list.push(logDayFromRow(row));
    logsByHabit.set(row.habitId, list);
  }
  return buildTodayPage(viewer, habits, logsByHabit, today);
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
