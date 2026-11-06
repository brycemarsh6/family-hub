import "server-only";

// The chore streak cache and the "this week only" changes (decisions 33, 117).
// Split from habitWrites.ts to keep both under the line cap. Same rules as
// that file: no auth, no `revalidatePath`; a transaction client joins the
// caller's transaction, the default `db` opens its own (`atomically`).
// `choreWrites.ts` alone writes the chore streak columns of `UserPreferences`
// and the `ChoreWeekOverride` table. Days go in through `utcMidnightInstant`.

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { addCalendarDays, startOfWeek, utcMidnightInstant, type CalendarDate } from "../householdDate";
import { isWeekday } from "../habitVocabulary";
import { carrySince, habitStartDay } from "./carryOver";
import { computeChoreStreak, type ChoreInput } from "./choreStreak";
import { logDayFromRow, specFromRow, vacationFromRow } from "./habitRows";
import { atomically } from "./participantWrites";
import { compareDays } from "./schedule";
import { changeAllowed, overrideFromRow } from "./weekOverrides";

type Client = Prisma.TransactionClient;

/** The people who hold `habitId` when it is a chore, else none. Read before and after a write that moves them. */
export async function choreOwnersOf(tx: Client, habitId: string): Promise<string[]> {
  const habit = await tx.habit.findUnique({ where: { id: habitId }, select: { kind: true, participants: { select: { userId: true } } } });
  return habit?.kind === "chore" ? habit.participants.map((p) => p.userId) : [];
}

/**
 * Rebuilds one person's cached chore streak from every live chore they hold,
 * their checks, this-week changes and vacations, and stores
 * `computeChoreStreak`'s answer unchanged (`asOf` yesterday while a chore due
 * today is undone). Creates their `UserPreferences` row when they have none.
 */
export async function recomputeChoreStreak(userId: string, today: CalendarDate, client: Prisma.TransactionClient = db): Promise<void> {
  return atomically(client, async (tx) => {
    const habits = await tx.habit.findMany({
      where: { kind: "chore", archivedAt: null, participants: { some: { userId } } },
      select: {
        id: true, schedule: true, weekdays: true, times: true, anchorWeek: true, createdAt: true,
        participants: { where: { userId }, select: { joinedAt: true } },
      },
    });
    const ids = habits.map((habit) => habit.id);
    const [logRows, overrideRows, vacationRows] = await Promise.all([
      tx.habitLog.findMany({ where: { userId, habitId: { in: ids } }, select: { habitId: true, userId: true, day: true, status: true } }),
      tx.choreWeekOverride.findMany({ where: { habitId: { in: ids } } }),
      tx.vacationPeriod.findMany({ where: { userId }, select: { startDay: true, endDay: true } }),
    ]);
    const chores = habits.flatMap((habit): ChoreInput[] => {
      const spec = specFromRow(habit);
      if (!spec) return [];
      return [{
        spec,
        logs: logRows.filter((row) => row.habitId === habit.id).map(logDayFromRow),
        overrides: overrideRows.filter((row) => row.habitId === habit.id).flatMap((row) => overrideFromRow(row) ?? []),
        since: carrySince(habit.participants[0]?.joinedAt, habitStartDay(habit.createdAt)),
      }];
    });
    const result = computeChoreStreak(chores, vacationRows.map(vacationFromRow), today);
    const data = { choreStreakCurrent: result.current, choreStreakBest: result.best, choreStreakAsOf: utcMidnightInstant(result.asOf) };
    await tx.userPreferences.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  });
}

/** `recomputeChoreStreak` for each distinct person. */
export async function recomputeChoreStreaks(userIds: readonly string[], today: CalendarDate, client: Prisma.TransactionClient = db): Promise<void> {
  return atomically(client, async (tx) => {
    for (const userId of new Set(userIds)) await recomputeChoreStreak(userId, today, tx);
  });
}

/** Every person who holds a chore, plus anyone with a cached count to clear (the admin's Recompute button). */
export async function recomputeAllChoreStreaks(today: CalendarDate, client: Prisma.TransactionClient = db): Promise<void> {
  return atomically(client, async (tx) => {
    const [holders, cached] = await Promise.all([
      tx.habitParticipant.findMany({ where: { habit: { kind: "chore" } }, select: { userId: true } }),
      tx.userPreferences.findMany({ where: { OR: [{ choreStreakCurrent: { gt: 0 } }, { choreStreakBest: { gt: 0 } }] }, select: { userId: true } }),
    ]);
    await recomputeChoreStreaks([...holders, ...cached].map((row) => row.userId), today, tx);
  });
}

/** Why a this-week change was refused, in words the action can show as they are. */
export type ChoreChangeResult = { ok: true } | { ok: false; error: string };

const CANNOT_CHANGE = "That chore can't change this week.";

/**
 * `change` null clears. The shared checks: a live weekdays chore that really
 * falls on `fromWeekday`; a move's target of today or later; and the day being
 * changed either today or later, or (decision 126) a past day whose turn was
 * already moved or skipped, which may be moved on or skipped but never cleared
 * (`changeAllowed`: a past day's miss cannot be erased, decisions 6 and 33).
 */
async function writeChange(
  habitId: string,
  fromWeekday: number,
  change: { action: "moved"; toWeekday: number } | { action: "skipped" } | null,
  today: CalendarDate,
  client: Prisma.TransactionClient,
): Promise<ChoreChangeResult> {
  if (!isWeekday(fromWeekday)) return { ok: false, error: CANNOT_CHANGE };
  const weekStart = startOfWeek(today);
  const fromPast = compareDays(addCalendarDays(weekStart, fromWeekday), today) < 0;
  if (change?.action === "moved") {
    const target = change.toWeekday;
    if (!isWeekday(target) || target === fromWeekday || compareDays(addCalendarDays(weekStart, target), today) < 0) {
      return { ok: false, error: CANNOT_CHANGE };
    }
  }
  return atomically(client, async (tx): Promise<ChoreChangeResult> => {
    const habit = await tx.habit.findUnique({
      where: { id: habitId },
      select: { kind: true, schedule: true, weekdays: true, times: true, anchorWeek: true, archivedAt: true, participants: { select: { userId: true } } },
    });
    const spec = habit ? specFromRow(habit) : null;
    if (!habit || habit.kind !== "chore" || habit.archivedAt || spec?.schedule !== "weekdays" || !spec.days.includes(fromWeekday)) {
      return { ok: false, error: CANNOT_CHANGE };
    }
    const key = { habitId, weekStart: utcMidnightInstant(weekStart), fromWeekday };
    const existing = await tx.choreWeekOverride.findUnique({ where: { habitId_weekStart_fromWeekday: key }, select: { id: true } });
    if (!changeAllowed({ fromPast, hasChange: existing !== null, clearing: change === null })) return { ok: false, error: CANNOT_CHANGE };
    if (change === null) {
      await tx.choreWeekOverride.deleteMany({ where: key });
    } else {
      const data = { action: change.action, toWeekday: change.action === "moved" ? change.toWeekday : null };
      await tx.choreWeekOverride.upsert({ where: { habitId_weekStart_fromWeekday: key }, create: { ...key, ...data }, update: data });
    }
    await recomputeChoreStreaks(habit.participants.map((p) => p.userId), today, tx);
    return { ok: true };
  });
}

/** Moves one weekday's turn of a chore to another day of this week (today or later), this week only. */
export function moveChoreThisWeek(
  habitId: string,
  fromWeekday: number,
  toWeekday: number,
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<ChoreChangeResult> {
  return writeChange(habitId, fromWeekday, { action: "moved", toWeekday }, today, client);
}

/** Skips one weekday's turn of a chore for this week: excused, not broken. */
export function skipChoreThisWeek(habitId: string, fromWeekday: number, today: CalendarDate, client: Prisma.TransactionClient = db): Promise<ChoreChangeResult> {
  return writeChange(habitId, fromWeekday, { action: "skipped" }, today, client);
}

/** Back to the default for that weekday this week (a no-op when nothing was changed). */
export function clearChoreChange(habitId: string, fromWeekday: number, today: CalendarDate, client: Prisma.TransactionClient = db): Promise<ChoreChangeResult> {
  return writeChange(habitId, fromWeekday, null, today, client);
}
