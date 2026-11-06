import "server-only";

import { db } from "@/lib/db";
import { AVATAR_COLORS } from "@/lib/constants";
import {
  addCalendarDays,
  calendarDateFromUtcMidnight,
  startOfWeek,
  utcMidnightInstant,
  type CalendarDate,
} from "./householdDate";
import { buildChoreChart, choreCacheFromRow, orderVacations, overrideWindowStart, type ChoreChartData, type VacationItem } from "./choreChart";
import { canEditChart } from "./habits/access";
import { CARRY_LOOKBACK_DAYS, carriedFrom as carriedDay, carrySince, habitStartDay } from "./habits/carryOver";
import { logDayFromRow, specFromRow, vacationFromRow } from "./habits/habitRows";
import type { HabitAccess, HabitActor, HabitLogDay, ScheduleSpec, Vacation } from "./habits/types";
import { keepOwnPicks } from "./dashboardPicks";
import { choresTileRows, habitsTileRows, pickableHabits, type HabitsTile } from "./habitsDashboard";
import { buildTodayPage, todayLogsFrom, type HabitRowView, type TodayNudge, type TodayPage } from "./habitsToday";
import { loadHouseholdPeople, type HouseholdPerson } from "./householdPeople";
import { toHabitSharing, type HabitSharing } from "./habitVocabulary";

// The reader for habit rows, so pages never query the habit tables directly.
// It holds the Plans & Goals, Today, roster and tap loaders; a new reader goes
// in a sibling file when this passes 350 lines. No auth: the caller (a page or action) has already
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
      startDay: habitStartDay(habit.createdAt),
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

export type { HabitMemberView, HabitRowView, HabitManagerItem, TodayNudge, TodayPage } from "./habitsToday";

/**
 * The Today page and the manager: first the habits the viewer takes part in
 * (with participants, names and cached streaks), then in one round their
 * checks from fourteen days back (or the first of the month when that is
 * earlier so a monthly count is whole), those people's vacations and the
 * viewer's unseen nudges for today. The rules live in `habitsToday.ts`. No
 * auth: the page has already resolved the viewer. The viewer's chore streak
 * cache is read first, because the this-week changes fetched must reach back
 * to the day it was last counted (`overrideWindowStart`).
 */
export async function loadTodayPage(viewer: HabitActor, today: CalendarDate): Promise<TodayPage> {
  const prefsRow = await db.userPreferences.findUnique({ where: { userId: viewer.userId }, select: { choreStreakCurrent: true, choreStreakBest: true, choreStreakAsOf: true } });
  const choreCache = choreCacheFromRow(prefsRow);
  const habits = await db.habit.findMany({
    where: { participants: { some: { userId: viewer.userId } } },
    include: {
      // Today, last week's shout-out and the streak's aging all read these.
      weekOverrides: { where: { weekStart: { gte: utcMidnightInstant(overrideWindowStart(today, [choreCache.asOf])) } } },
      participants: {
        orderBy: { joinedAt: "asc" },
        select: {
          userId: true,
          sortOrder: true,
          joinedAt: true,
          currentStreak: true,
          bestStreak: true,
          streakAsOf: true,
          user: { select: { displayName: true, avatarColor: true, deactivatedAt: true } },
        },
      },
    },
  });
  const liveIds = habits.filter((habit) => !habit.archivedAt).map((habit) => habit.id);
  const peopleIds = [...new Set(habits.flatMap((habit) => habit.participants.map((p) => p.userId)))];
  const [logRows, vacationRows, nudgeRows] = await Promise.all([
    liveIds.length === 0
      ? []
      : db.habitLog.findMany({
          where: { habitId: { in: liveIds }, day: { gte: utcMidnightInstant(todayLogsFrom(today)) } },
          select: { habitId: true, userId: true, day: true, status: true },
        }),
    db.vacationPeriod.findMany({ where: { userId: { in: peopleIds } }, select: { userId: true, startDay: true, endDay: true } }),
    db.nudge.findMany({
      where: { toUserId: viewer.userId, day: utcMidnightInstant(today), seenAt: null, habit: { archivedAt: null } },
      orderBy: { createdAt: "asc" },
      select: { id: true, fromUser: { select: { displayName: true } }, habit: { select: { title: true } } },
    }),
  ]);
  const vacationsByUser = new Map<string, Vacation[]>();
  for (const row of vacationRows) vacationsByUser.set(row.userId, [...(vacationsByUser.get(row.userId) ?? []), vacationFromRow(row)]);
  const logsByHabit = new Map<string, HabitLogDay[]>();
  for (const row of logRows) {
    const list = logsByHabit.get(row.habitId) ?? [];
    list.push(logDayFromRow(row));
    logsByHabit.set(row.habitId, list);
  }
  const nudges = nudgeRows.map((row) => ({ id: row.id, fromName: row.fromUser.displayName, habitTitle: row.habit.title }));
  return buildTodayPage(viewer, habits, logsByHabit, today, vacationsByUser, nudges, choreCache);
}

/** What the dashboard shows from Habits & Chores: the two tiles, the cards above them and the habits the picker lists. */
export type DashboardHabits = {
  habits: HabitsTile<HabitRowView>;
  chores: HabitsTile<HabitRowView>;
  choreStreak: number;
  nudges: TodayNudge[];
  shoutOut: boolean;
  /** The habits the picker lists (kind habit, not archived, private ones the viewer takes part in), in Manage order. */
  pickable: { id: string; title: string; icon: string | null }[];
};

/**
 * The dashboard's habit data, built on the Today loader so it reads exactly
 * what Today reads (private habits already follow `canSeeHabit` there).
 * `picks` is the layout's claim: ids that are not among the viewer's pickable
 * habits are dropped here (decision 137), so a stale or foreign id never reaches a tile.
 */
export async function loadDashboardHabits(viewer: HabitActor, today: CalendarDate, picks: string[]): Promise<DashboardHabits> {
  const page = await loadTodayPage(viewer, today);
  const pickable = pickableHabits(page.manage).map((item) => ({ id: item.id, title: item.title, icon: item.icon }));
  return {
    habits: habitsTileRows(page.rows, keepOwnPicks(picks, pickable.map((item) => item.id))),
    chores: choresTileRows(page.rows),
    choreStreak: page.choreStreak,
    nudges: page.nudges,
    shoutOut: page.shoutOut,
    pickable,
  };
}

/**
 * The chore chart for `personId` as plain data (days as "YYYY-MM-DD"), or null
 * unless the viewer may edit that chart (`canEditChart`, decision 118) and the
 * person is a household person. The checks come before any query. Queries: the
 * household people and their avatar colors, then the person's live chores with
 * this week's changes.
 */
export async function loadChoreChart(viewer: HabitActor, personId: string, today: CalendarDate): Promise<ChoreChartData | null> {
  if (!canEditChart(viewer, personId)) return null;
  const [household, habits] = await Promise.all([
    loadHouseholdPeople(),
    db.habit.findMany({
      where: { kind: "chore", archivedAt: null, participants: { some: { userId: personId } } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        weekOverrides: { where: { weekStart: utcMidnightInstant(startOfWeek(today)) } },
        participants: { select: { userId: true, joinedAt: true } },
      },
    }),
  ]);
  const colors = await db.user.findMany({ where: { id: { in: household.map((person) => person.id) } }, select: { id: true, avatarColor: true } });
  const colorOf = new Map(colors.map((row) => [row.id, row.avatarColor]));
  const people = household.map((person) => ({ ...person, avatarColor: colorOf.get(person.id) ?? AVATAR_COLORS[0].name }));
  return buildChoreChart(viewer, personId, people, habits, today);
}

/** The person's own vacations for Settings, in decision 123's order (current, upcoming, past newest first). */
export async function loadVacations(userId: string, today: CalendarDate): Promise<VacationItem[]> {
  const rows = await db.vacationPeriod.findMany({ where: { userId }, select: { id: true, startDay: true, endDay: true } });
  return orderVacations(rows, today);
}

/** Everyone the habit editor's people picker can offer: the household, oldest profile first (`householdPeople.ts`). */
export function loadHabitRoster(): Promise<HouseholdPerson[]> {
  return loadHouseholdPeople();
}

/** What an action needs to know about one habit before it lets anyone touch it. */
export type HabitForAction = HabitAccess & {
  /** Participants who have been deactivated (the nudge refuses them). */
  deactivatedIds: string[];
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
    include: { participants: { select: { userId: true, user: { select: { deactivatedAt: true } } } } },
  });
  if (!habit) return null;
  return {
    isPrivate: habit.isPrivate,
    participantIds: habit.participants.map((p) => p.userId),
    deactivatedIds: habit.participants.filter((p) => p.user.deactivatedAt !== null).map((p) => p.userId),
    sharing: toHabitSharing(habit.sharing),
    archived: habit.archivedAt !== null,
    carryOver: habit.carryOver,
    spec: specFromRow(habit),
    startDay: habitStartDay(habit.createdAt),
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
  return carriedDay(habit.spec, true, logs.map(logDayFromRow), today, carrySince(member?.joinedAt, habit.startDay));
}
