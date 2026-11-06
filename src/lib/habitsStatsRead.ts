import "server-only";

import { db } from "@/lib/db";
import { AVATAR_COLORS } from "@/lib/constants";
import { addCalendarDays, utcMidnightInstant, startOfMonth, startOfWeek, type CalendarDate } from "./householdDate";
import { CARRY_LOOKBACK_DAYS, carrySince, habitStartDay } from "./habits/carryOver";
import { choreCacheFromRow } from "./choreChart";
import { logDayFromRow, specFromRow, vacationFromRow } from "./habits/habitRows";
import type { HabitActor, HabitLogDay, Vacation } from "./habits/types";
import { buildFamilyPage, buildStatsData, statsSubject, type FamilyPage, type HabitStatsData, type PerfectDayHabit } from "./habitsFamily";
import { todayLogsFrom } from "./habitsToday";
import { loadHouseholdPeople } from "./householdPeople";
import { toHabitKind } from "./habitVocabulary";

// The readers for the stats page and the family view, in a sibling of
// `habitsRead.ts` (which would pass 350 lines). Queries plus calls into the
// pure builders in `habitsFamily.ts`. No auth: the page has already resolved
// the viewer, and the builders apply `access.ts`.

function vacationMap(rows: { userId: string; startDay: Date; endDay: Date }[]): Map<string, Vacation[]> {
  const map = new Map<string, Vacation[]>();
  for (const row of rows) map.set(row.userId, [...(map.get(row.userId) ?? []), vacationFromRow(row)]);
  return map;
}

/**
 * The stats page for `habitId` as plain data (days as "YYYY-MM-DD"), or null
 * when the habit is missing or the viewer may not open it (a private habit is
 * the same as a missing one). `month` is any day in the month the calendar
 * shows. Queries: the habit with its people; then in one round every check on
 * the habit, the people's vacations, the nudges the viewer sent today, the
 * subject's habits and their checks that month (for perfect days).
 */
export async function loadHabitStats(
  viewer: HabitActor,
  habitId: string,
  today: CalendarDate,
  month: CalendarDate = today,
): Promise<HabitStatsData | null> {
  const habit = await db.habit.findUnique({
    where: { id: habitId },
    include: {
      participants: {
        select: {
          userId: true,
          joinedAt: true,
          currentStreak: true,
          bestStreak: true,
          streakAsOf: true,
          user: { select: { displayName: true, avatarColor: true, deactivatedAt: true } },
        },
      },
    },
  });
  if (!habit) return null;
  const members = habit.participants.map((p) => ({
    userId: p.userId,
    displayName: p.user.displayName,
    avatarColor: p.user.avatarColor,
    joinedAt: p.joinedAt,
    deactivatedAt: p.user.deactivatedAt,
    currentStreak: p.currentStreak,
    bestStreak: p.bestStreak,
    streakAsOf: p.streakAsOf,
  }));
  const subjectId = statsSubject(viewer.userId, members);
  if (!subjectId) return null;
  const first = startOfMonth(month);
  const next = addCalendarDays({ ...first, month: first.month + 1 }, 0);
  const [logRows, vacationRows, nudgeRows, subjectHabits, monthLogRows] = await Promise.all([
    db.habitLog.findMany({ where: { habitId }, select: { habitId: true, userId: true, day: true, status: true } }),
    db.vacationPeriod.findMany({ where: { userId: { in: members.map((m) => m.userId) } }, select: { userId: true, startDay: true, endDay: true } }),
    db.nudge.findMany({ where: { habitId, fromUserId: viewer.userId, day: utcMidnightInstant(today) }, select: { toUserId: true } }),
    // Their live habits; another person's private ones are not ours to count.
    db.habit.findMany({
      where: { participants: { some: { userId: subjectId } }, archivedAt: null, ...(subjectId === viewer.userId ? {} : { isPrivate: false }) },
      include: { participants: { where: { userId: subjectId }, select: { joinedAt: true } } },
    }),
    db.habitLog.findMany({
      where: { userId: subjectId, day: { gte: utcMidnightInstant(first), lt: utcMidnightInstant(next) } },
      select: { habitId: true, userId: true, day: true, status: true },
    }),
  ]);
  const monthLogs = new Map<string, HabitLogDay[]>();
  for (const row of monthLogRows) monthLogs.set(row.habitId, [...(monthLogs.get(row.habitId) ?? []), logDayFromRow(row)]);
  const perfectHabits: PerfectDayHabit[] = subjectHabits.flatMap((other) => {
    const spec = specFromRow(other);
    if (!spec) return [];
    return [{ kind: toHabitKind(other.kind), spec, since: carrySince(other.participants[0]?.joinedAt, habitStartDay(other.createdAt)), logs: monthLogs.get(other.id) ?? [] }];
  });
  return buildStatsData({
    viewer,
    habit,
    members,
    logs: logRows.map(logDayFromRow),
    vacationsByUser: vacationMap(vacationRows),
    subjectHabits: perfectHabits,
    nudgedToday: nudgeRows.map((row) => row.toUserId),
    today,
    month,
  });
}

/**
 * The family view: the Together strip and one column per active non-device
 * person (`householdPeople.ts` decides who). Private and archived habits are
 * never fetched. Queries: the household people and the habits with their
 * participants; then the checks (fourteen days back, as Today), the people's
 * vacations, avatar colors and chore streaks.
 */
export async function loadFamilyPage(viewer: HabitActor, today: CalendarDate): Promise<FamilyPage> {
  const [household, habits] = await Promise.all([
    loadHouseholdPeople(),
    db.habit.findMany({
      where: { isPrivate: false, archivedAt: null },
      include: {
        // The last two weeks of this-week changes, as on Today.
        weekOverrides: { where: { weekStart: { gte: utcMidnightInstant(startOfWeek(addCalendarDays(today, -CARRY_LOOKBACK_DAYS))) } } },
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
    }),
  ]);
  const ids = household.map((person) => person.id);
  const habitIds = habits.map((habit) => habit.id);
  const [logRows, vacationRows, colorRows, prefsRows] = await Promise.all([
    habitIds.length === 0
      ? []
      : db.habitLog.findMany({
          where: { habitId: { in: habitIds }, day: { gte: utcMidnightInstant(todayLogsFrom(today)) } },
          select: { habitId: true, userId: true, day: true, status: true },
        }),
    db.vacationPeriod.findMany({ where: { userId: { in: ids } }, select: { userId: true, startDay: true, endDay: true } }),
    db.user.findMany({ where: { id: { in: ids } }, select: { id: true, avatarColor: true } }),
    db.userPreferences.findMany({ where: { userId: { in: ids } }, select: { userId: true, choreStreakCurrent: true, choreStreakBest: true, choreStreakAsOf: true } }),
  ]);
  const logsByHabit = new Map<string, HabitLogDay[]>();
  for (const row of logRows) logsByHabit.set(row.habitId, [...(logsByHabit.get(row.habitId) ?? []), logDayFromRow(row)]);
  const colors = new Map(colorRows.map((row) => [row.id, row.avatarColor]));
  const people = household.map((person) => ({ id: person.id, displayName: person.displayName, avatarColor: colors.get(person.id) ?? AVATAR_COLORS[0].name }));
  const choreCaches = new Map(prefsRows.map((row) => [row.userId, choreCacheFromRow(row)]));
  return buildFamilyPage(viewer, habits, people, logsByHabit, today, vacationMap(vacationRows), choreCaches);
}
