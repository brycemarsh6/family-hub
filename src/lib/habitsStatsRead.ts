import "server-only";

import { db } from "@/lib/db";
import { AVATAR_COLORS } from "@/lib/constants";
import { addCalendarDays, utcMidnightInstant, startOfMonth, startOfWeek, type CalendarDate } from "./householdDate";
import { carrySince, habitStartDay } from "./habits/carryOver";
import { othersPrivateHidden } from "./habits/access";
import { choreCacheFromRow, overrideWindowStart } from "./choreChart";
import { logDayFromRow, specFromRow, timeEntryFromRow, vacationFromRow } from "./habits/habitRows";
import { overrideFromRow } from "./habits/weekOverrides";
import type { HabitActor, HabitLogDay, TimeEntry, Vacation, WeekOverride } from "./habits/types";
import { buildFamilyPage, buildStatsData, statsSubject, type FamilyPage, type HabitStatsData, type PerfectDayHabit } from "./habitsFamily";
import { hoursSpecOf, type StatsTimeEntry } from "./habitsHours";
import { todayLogsFrom } from "./habitsToday";
import { HOUSEHOLD_PERSON_WHERE, loadHouseholdPeople } from "./householdPeople";
import { toHabitKind } from "./habitVocabulary";
import { buildHabitReport, type HabitReport } from "./habitsReport";
import { reportPersonId, reportScope, type ReportParams } from "./habitsReportScope";
import { buildCalendarHabitDays, plannedPeriodsRange, type PlannedDayRow } from "./habitsCalendar";
import type { CalendarHabitDayView } from "./types";

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
 * the habit, the people's vacations, its this-week changes, the nudges the viewer sent today, the
 * subject's habits and their checks that month (for perfect days), and, for an
 * hours habit, every time entry on it. Hours habits are left out of the
 * subject's perfect-day habits (decision 197).
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
  const [logRows, vacationRows, overrideRows, nudgeRows, subjectHabits, monthLogRows, timeRows] = await Promise.all([
    db.habitLog.findMany({ where: { habitId }, select: { habitId: true, userId: true, day: true, status: true } }),
    db.vacationPeriod.findMany({ where: { userId: { in: members.map((m) => m.userId) } }, select: { userId: true, startDay: true, endDay: true } }),
    db.choreWeekOverride.findMany({ where: { habitId }, select: { weekStart: true, fromWeekday: true, action: true, toWeekday: true } }),
    db.nudge.findMany({ where: { habitId, fromUserId: viewer.userId, day: utcMidnightInstant(today) }, select: { toUserId: true } }),
    // Their live habits; another person's private ones are not ours to count.
    db.habit.findMany({
      where: { participants: { some: { userId: subjectId } }, archivedAt: null, track: "checks", ...othersPrivateHidden(viewer, subjectId) },
      include: { participants: { where: { userId: subjectId }, select: { joinedAt: true } } },
    }),
    db.habitLog.findMany({
      where: { userId: subjectId, day: { gte: utcMidnightInstant(first), lt: utcMidnightInstant(next) } },
      select: { habitId: true, userId: true, day: true, status: true },
    }),
    hoursSpecOf(habit) ? db.habitTimeEntry.findMany({ where: { habitId }, select: { id: true, userId: true, day: true, minutes: true } }) : [],
  ]);
  const entries: StatsTimeEntry[] = timeRows.map((row) => ({ ...timeEntryFromRow(row), id: row.id }));
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
    entries,
    vacationsByUser: vacationMap(vacationRows),
    overrides: overrideRows.flatMap((row) => overrideFromRow(row) ?? []),
    subjectHabits: perfectHabits,
    nudgedToday: nudgeRows.map((row) => row.toUserId),
    today,
    month,
  });
}

/**
 * The family view: the Together strip and one column per active non-device
 * person (`householdPeople.ts` decides who). Archived habits are never
 * fetched; private ones are, but only feed the chore streak numbers, never a
 * row (decision 78). Queries: the household people and everyone's chore streak
 * caches (the this-week changes fetched reach back to the oldest cache,
 * `overrideWindowStart`); then the habits with their participants; then the
 * checks (fourteen days back, as Today), the people's vacations and avatar colors.
 */
export async function loadFamilyPage(viewer: HabitActor, today: CalendarDate): Promise<FamilyPage> {
  const [household, prefsRows] = await Promise.all([
    loadHouseholdPeople(),
    db.userPreferences.findMany({ select: { userId: true, choreStreakCurrent: true, choreStreakBest: true, choreStreakAsOf: true } }),
  ]);
  const choreCaches = new Map(prefsRows.map((row) => [row.userId, choreCacheFromRow(row)]));
  const habits = await db.habit.findMany({
    // Private chores are fetched too, only for the chore streak numbers: the builder never makes a row of a private habit (decision 78).
    where: { archivedAt: null },
    include: {
      // As on Today: two weeks, or back to the oldest cached chore streak.
      weekOverrides: { where: { weekStart: { gte: utcMidnightInstant(overrideWindowStart(today, [...choreCaches.values()].map((cache) => cache.asOf))) } } },
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
  const ids = household.map((person) => person.id);
  const habitIds = habits.map((habit) => habit.id);
  const [logRows, vacationRows, colorRows, timeRows] = await Promise.all([
    habitIds.length === 0
      ? []
      : db.habitLog.findMany({
          where: { habitId: { in: habitIds }, day: { gte: utcMidnightInstant(todayLogsFrom(today)) } },
          select: { habitId: true, userId: true, day: true, status: true },
        }),
    db.vacationPeriod.findMany({ where: { userId: { in: ids } }, select: { userId: true, startDay: true, endDay: true } }),
    db.user.findMany({ where: { id: { in: ids } }, select: { id: true, avatarColor: true } }),
    // This week's hours entries, everyone's, for the columns' bars.
    habitIds.length === 0
      ? []
      : db.habitTimeEntry.findMany({
          where: { habitId: { in: habitIds }, habit: { track: "hours" }, day: { gte: utcMidnightInstant(addCalendarDays(startOfWeek(today), -7)) } },
          select: { habitId: true, userId: true, day: true, minutes: true },
        }),
  ]);
  const timeByHabit = new Map<string, TimeEntry[]>();
  for (const row of timeRows) timeByHabit.set(row.habitId, [...(timeByHabit.get(row.habitId) ?? []), timeEntryFromRow(row)]);
  const logsByHabit = new Map<string, HabitLogDay[]>();
  for (const row of logRows) logsByHabit.set(row.habitId, [...(logsByHabit.get(row.habitId) ?? []), logDayFromRow(row)]);
  const colors = new Map(colorRows.map((row) => [row.id, row.avatarColor]));
  const people = household.map((person) => ({ id: person.id, displayName: person.displayName, avatarColor: colors.get(person.id) ?? AVATAR_COLORS[0].name }));
  return buildFamilyPage(viewer, habits, people, logsByHabit, today, vacationMap(vacationRows), choreCaches, timeByHabit);
}

/**
 * The viewer's planned habit days for the Calendar (decision 146) in
 * `[from, to)`, both UTC-midnight all-day instants like `Task.dueDate`. Only
 * the viewer's own rows are read (a Together habit has one per person) and the
 * tablet reads nothing; `buildCalendarHabitDays` applies the access rule.
 * Queries: the viewer's rows with their habit and its people; then the
 * viewer's checks for those habits across each planned day's whole period.
 */
export async function loadPlannedHabitDays(viewer: HabitActor, from: Date, to: Date): Promise<CalendarHabitDayView[]> {
  if (viewer.role === "device") return [];
  const planned = await db.habitPlannedDay.findMany({
    where: { userId: viewer.userId, day: { gte: from, lt: to }, habit: { archivedAt: null } },
    select: {
      habitId: true,
      userId: true,
      day: true,
      habit: { select: { title: true, icon: true, kind: true, track: true, isPrivate: true, schedule: true, weekdays: true, times: true, anchorWeek: true, participants: { select: { userId: true } } } },
    },
  });
  if (planned.length === 0) return [];
  const rows: PlannedDayRow[] = planned.map((row) => ({
    schedule: row.habit.schedule,
    weekdays: row.habit.weekdays,
    times: row.habit.times,
    anchorWeek: row.habit.anchorWeek,
    habitId: row.habitId,
    userId: row.userId,
    title: row.habit.title,
    icon: row.habit.icon,
    kind: row.habit.kind,
    track: row.habit.track,
    isPrivate: row.habit.isPrivate,
    participantIds: row.habit.participants.map((p) => p.userId),
    day: row.day,
  }));
  // Each planned day reads done from its whole period (decision 160), so the checks cover those periods, not just the range.
  const periods = plannedPeriodsRange(rows);
  const checks = await db.habitLog.findMany({
    where: { userId: viewer.userId, habitId: { in: [...new Set(rows.map((row) => row.habitId))] }, day: periods ? { gte: periods.from, lt: periods.to } : { gte: from, lt: to } },
    select: { habitId: true, userId: true, day: true, status: true },
  });
  return buildCalendarHabitDays(viewer, rows, checks);
}

/**
 * The Report (decisions 163 to 171) as plain data, or null on the tablet. The
 * rules are `habitsReport.ts`'s and `habitsReportScope.ts`'s. Queries: the household people and the shown
 * person's live habits with their people; then, for the range shown only and
 * only the items drawn, that person's checks, the vacations touching it and the
 * this-week changes to those items. Another person is shown only to a parent
 * or admin (`reportScope` falls back to the viewer), and another person's
 * private habits are never fetched into a row. Hours habits are left out
 * entirely, with no note (decision 197).
 */
export async function loadHabitReport(viewer: HabitActor, params: ReportParams, today: CalendarDate): Promise<HabitReport | null> {
  if (viewer.role === "device") return null;
  const [household, colorRows] = await Promise.all([loadHouseholdPeople(), db.user.findMany({ where: HOUSEHOLD_PERSON_WHERE, select: { id: true, avatarColor: true } })]);
  const colors = new Map(colorRows.map((row) => [row.id, row.avatarColor]));
  const people = household.map((person) => ({ id: person.id, displayName: person.displayName, avatarColor: colors.get(person.id) ?? AVATAR_COLORS[0].name }));
  // Who is shown is decided before the habits are read, by `reportPersonId`, the rule `reportScope` applies too.
  const shownId = reportPersonId(viewer, params.person, people);
  const habits = await db.habit.findMany({
    where: { archivedAt: null, track: "checks", participants: { some: { userId: shownId } }, ...othersPrivateHidden(viewer, shownId) },
    include: {
      participants: {
        orderBy: { joinedAt: "asc" },
        select: { userId: true, sortOrder: true, joinedAt: true, user: { select: { displayName: true, avatarColor: true, deactivatedAt: true } } },
      },
    },
  });
  const scope = reportScope(viewer, params, habits, people, today);
  const ids = scope.items.map((item) => item.id);
  const [logRows, overrideRows, vacationRows] =
    ids.length === 0
      ? [[], [], []]
      : await Promise.all([
          db.habitLog.findMany({
            where: { userId: scope.personId, habitId: { in: ids }, day: { gte: utcMidnightInstant(scope.from), lte: utcMidnightInstant(scope.to) } },
            select: { habitId: true, userId: true, day: true, status: true },
          }),
          db.choreWeekOverride.findMany({
            where: { habitId: { in: ids }, weekStart: { gte: utcMidnightInstant(startOfWeek(scope.from)), lte: utcMidnightInstant(scope.to) } },
            select: { habitId: true, weekStart: true, fromWeekday: true, action: true, toWeekday: true },
          }),
          db.vacationPeriod.findMany({ where: { userId: scope.personId, startDay: { lte: utcMidnightInstant(scope.to) }, endDay: { gte: utcMidnightInstant(scope.from) } }, select: { userId: true, startDay: true, endDay: true } }),
        ]);
  const logsByHabit = new Map<string, HabitLogDay[]>();
  for (const row of logRows) logsByHabit.set(row.habitId, [...(logsByHabit.get(row.habitId) ?? []), logDayFromRow(row)]);
  const overridesByHabit = new Map<string, WeekOverride[]>();
  for (const row of overrideRows) {
    const change = overrideFromRow(row);
    if (change) overridesByHabit.set(row.habitId, [...(overridesByHabit.get(row.habitId) ?? []), change]);
  }
  return buildHabitReport(scope, { logsByHabit, overridesByHabit, vacations: vacationRows.map(vacationFromRow) }, today);
}
