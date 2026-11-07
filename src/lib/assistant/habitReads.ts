import "server-only";

// The one place the habit routes read habits: narrow selects, shaped by
// serializeHabits.ts. Who Winnie may see is decided here and nowhere else,
// by `canSeeHabit` (habits/access.ts) with her actor: a habit she may not see
// is answered as missing, never filtered by a second copy of the rule.

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { toRole } from "@/lib/constants";
import {
  choreCacheFromRow,
  choreInputsFor,
  overrideWindowStart,
  type ChoreChartData,
} from "@/lib/choreChart";
import { loadChoreChart, loadTodayPage } from "@/lib/habitsRead";
import { HOUSEHOLD_PERSON_WHERE, loadHouseholdPeople } from "@/lib/householdPeople";
import { canSeeHabit } from "@/lib/habits/access";
import { choreStreakAfter } from "@/lib/habits/choreStreak";
import { vacationFromRow } from "@/lib/habits/habitRows";
import type { Vacation } from "@/lib/habits/types";
import { addCalendarDays, formatCalendarDate, startOfWeek, utcMidnightInstant, type CalendarDate } from "@/lib/householdDate";
import { assistantCreatedWhere, didAssistantCreate } from "./audit";
import { notFound } from "./errors";
import { assistantHabitActor } from "./habitActor";
import {
  toChart,
  toHabit,
  toHabitDetail,
  toTodayRow,
  type HabitRow,
  type StreakContext,
} from "./serializeHabits";

const HABIT_SELECT = {
  id: true,
  title: true,
  kind: true,
  mode: true,
  icon: true,
  lifeArea: true,
  timeOfDay: true,
  schedule: true,
  weekdays: true,
  times: true,
  anchorWeek: true,
  carryOver: true,
  track: true,
  weeklyMinutes: true,
  paceDays: true,
  hoursSince: true,
  sharing: true,
  isPrivate: true,
  everyone: true,
  archivedAt: true,
  participants: {
    orderBy: [{ joinedAt: "asc" }, { userId: "asc" }],
    select: { userId: true, currentStreak: true, bestStreak: true, streakAsOf: true, user: { select: { deactivatedAt: true } } },
  },
} satisfies Prisma.HabitSelect;

/** Whether Winnie may see this habit (the one rule, in `access.ts`). */
function visible(isPrivate: boolean, participantIds: readonly string[]): boolean {
  return canSeeHabit(assistantHabitActor(), { isPrivate, participantIds });
}

/** Is this an active household person (not deactivated, not the tablet)? */
export async function isHouseholdPerson(id: string): Promise<boolean> {
  return (await db.user.findFirst({ where: { id, ...HOUSEHOLD_PERSON_WHERE }, select: { id: true } })) !== null;
}

/** 404 unless `personId` is an active household person. */
export async function requireHouseholdPerson(personId: string): Promise<void> {
  if (!(await isHouseholdPerson(personId))) throw notFound();
}

/** Each person's chore streak, the cache aged to today with their chores and this week's changes. */
async function choreStreaksFor(userIds: readonly string[], vacationsOf: (userId: string) => readonly Vacation[], today: CalendarDate) {
  const prefs = await db.userPreferences.findMany({
    where: { userId: { in: [...userIds] } },
    select: { userId: true, choreStreakCurrent: true, choreStreakBest: true, choreStreakAsOf: true },
  });
  const caches = new Map(prefs.map((row) => [row.userId, choreCacheFromRow(row)]));
  const from = overrideWindowStart(today, [...caches.values()].map((cache) => cache.asOf));
  const chores = await db.habit.findMany({
    where: { kind: "chore", archivedAt: null, participants: { some: { userId: { in: [...userIds] } } } },
    include: {
      weekOverrides: { where: { weekStart: { gte: utcMidnightInstant(from) } } },
      participants: { select: { userId: true, joinedAt: true } },
    },
  });
  return (userId: string) => {
    const cache = caches.get(userId) ?? choreCacheFromRow(null);
    const aged = choreStreakAfter(choreInputsFor(userId, chores, new Map()), cache, vacationsOf(userId), today);
    return { current: aged.current, best: cache.best };
  };
}

/** The vacations and chore streaks the rows' streaks need, read once for all of them. */
async function streakContext(rows: readonly HabitRow[], today: CalendarDate): Promise<StreakContext> {
  const userIds = [...new Set(rows.flatMap((row) => row.participants.map((p) => p.userId)))];
  const vacationRows = userIds.length === 0 ? [] : await db.vacationPeriod.findMany({ where: { userId: { in: userIds } }, select: { userId: true, startDay: true, endDay: true } });
  const byUser = new Map<string, Vacation[]>();
  for (const row of vacationRows) byUser.set(row.userId, [...(byUser.get(row.userId) ?? []), vacationFromRow(row)]);
  const vacationsOf = (userId: string) => byUser.get(userId) ?? [];
  const choreUsers = [...new Set(rows.filter((row) => row.kind === "chore").flatMap((row) => row.participants.map((p) => p.userId)))];
  const choreStreakOf = choreUsers.length === 0 ? () => ({ current: 0, best: 0 }) : await choreStreaksFor(choreUsers, vacationsOf, today);
  return { today, vacationsOf, choreStreakOf };
}

/**
 * Habits and chores Winnie may see, A to Z (by title), live first and the
 * archived after them when asked for. Null when `personId` is not a household person.
 */
export async function listHabits(opts: { personId?: string; includeArchived: boolean }, today: CalendarDate) {
  if (opts.personId && !(await isHouseholdPerson(opts.personId))) return null;
  const rows = await db.habit.findMany({
    where: {
      ...(opts.includeArchived ? {} : { archivedAt: null }),
      ...(opts.personId ? { participants: { some: { userId: opts.personId } } } : {}),
    },
    select: HABIT_SELECT,
    orderBy: [{ title: "asc" }, { id: "asc" }],
  });
  const seen = rows.filter((row) => visible(row.isPrivate, row.participants.map((p) => p.userId)));
  const ordered = [...seen.filter((row) => row.archivedAt === null), ...seen.filter((row) => row.archivedAt !== null)];
  const ctx = await streakContext(ordered, today);
  return ordered.map((row) => toHabit(row, ctx));
}

async function loadRow(id: string, gated: boolean): Promise<HabitRow | null> {
  const row = await db.habit.findUnique({ where: { id }, select: HABIT_SELECT });
  return row && (!gated || visible(row.isPrivate, row.participants.map((p) => p.userId))) ? row : null;
}

/**
 * One habit in the list shape. `gated` (the default) answers null for a habit
 * Winnie may not see; a write's answer passes false, since she just made it.
 */
export async function getHabit(id: string, today: CalendarDate, gated = true) {
  const row = await loadRow(id, gated);
  return row ? toHabit(row, await streakContext([row], today)) : null;
}

/** One habit with its stats: hours weeks (with this week's entries), the last 14 days of checks, who made it. */
export async function getHabitDetail(id: string, today: CalendarDate, gated = true) {
  const row = await loadRow(id, gated);
  if (!row) return null;
  const [ctx, entries, logs, createdByAssistant] = await Promise.all([
    streakContext([row], today),
    db.habitTimeEntry.findMany({
      where: { habitId: id, day: { gte: utcMidnightInstant(startOfWeek(today)) } },
      orderBy: [{ day: "asc" }, { createdAt: "asc" }],
      select: { id: true, userId: true, day: true, minutes: true },
    }),
    db.habitLog.findMany({
      where: { habitId: id, day: { gte: utcMidnightInstant(addCalendarDays(today, -13)) } },
      orderBy: [{ day: "asc" }, { userId: "asc" }],
      select: { userId: true, day: true, status: true },
    }),
    didAssistantCreate("Habit", id),
  ]);
  const hers = entries.length === 0 ? [] : await db.assistantChange.findMany({
    where: assistantCreatedWhere("HabitTimeEntry", { in: entries.map((entry) => entry.id) }),
    select: { recordId: true },
  });
  return toHabitDetail(row, { entries, madeByAssistant: new Set(hers.map((h) => h.recordId)), logs, createdByAssistant }, ctx);
}

/**
 * One person's day, or every active person's in household order. Each day is
 * the family's own Today page (`loadTodayPage`), keeping only the rows Winnie
 * may see. Null when `personId` is not a household person.
 */
export async function readToday(personId: string | undefined, today: CalendarDate) {
  const household = await loadHouseholdPeople();
  const wanted = personId ? household.filter((person) => person.id === personId) : household;
  if (wanted.length === 0 && personId) return null;
  const roles = await db.user.findMany({ where: { ...HOUSEHOLD_PERSON_WHERE, id: { in: wanted.map((p) => p.id) } }, select: { id: true, role: true } });
  const roleOf = new Map(roles.map((row) => [row.id, toRole(row.role)]));
  const people = [];
  for (const person of wanted) {
    const page = await loadTodayPage({ userId: person.id, role: roleOf.get(person.id) ?? toRole(null) }, today);
    const rows = page.rows.filter((row) => visible(row.isPrivate, row.participants.map((member) => member.userId)));
    people.push({ personId: person.id, rows: rows.map(toTodayRow), choreStreak: page.choreStreak });
  }
  return { date: formatCalendarDate(today), people };
}

/** The person's chore chart for this week as Winnie sees it (another person's private chores stay out), or null for an unknown person. */
export async function readChart(personId: string, today: CalendarDate) {
  const data: ChoreChartData | null = await loadChoreChart(assistantHabitActor(), personId, today);
  return data ? toChart(data) : null;
}

/** A habit and its participants as stored, read inside a transaction (the copies a write records). */
export async function habitSnapshot(tx: Prisma.TransactionClient, id: string) {
  const habit = await tx.habit.findUnique({ where: { id } });
  if (!habit) return null;
  return { habit, participants: await tx.habitParticipant.findMany({ where: { habitId: id }, orderBy: { id: "asc" } }) };
}

/** One time entry as stored, or null. */
export function readTimeEntry(entryId: string) {
  return db.habitTimeEntry.findUnique({ where: { id: entryId } });
}
