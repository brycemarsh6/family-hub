import "server-only";

// The cached streak columns (`currentStreak`, `bestStreak`, `streakAsOf` on
// `HabitParticipant`): this file alone writes them (split out of
// habitWrites.ts, mission 35). Same rules as habitWrites.ts: no auth, no
// `revalidatePath`; a transaction client joins the caller's transaction, the
// default `db` opens its own.

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { utcMidnightInstant, type CalendarDate } from "../householdDate";
import { logDayFromRow, logsForUser, specFromRow, vacationFromRow } from "./habitRows";
import { recomputeAllChoreStreaks, recomputeChoreStreak, recomputeChoreStreaks } from "./choreWrites";
import { atomically } from "./participantWrites";
import { computeStreaks, type StreakResult } from "./streaks";

type Client = Prisma.TransactionClient;

export const SCHEDULE_SELECT = { schedule: true, weekdays: true, times: true, anchorWeek: true, kind: true } as const;

/**
 * Rebuilds the cached streak of `userIds` on one habit from its logs and
 * those people's vacations (two reads, then one update per person) and stores
 * `computeStreaks`'s answer unchanged, `asOf` at UTC midnight. A habit whose
 * schedule cannot be read is left alone. Returns the results keyed `habitId:userId`.
 */
export async function recomputeStreaks(
  habitId: string,
  userIds: readonly string[],
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<Record<string, StreakResult>> {
  if (userIds.length === 0) return {};
  return atomically(client, async (tx) => {
    const habit = await tx.habit.findUnique({ where: { id: habitId }, select: SCHEDULE_SELECT });
    if (!habit) return {};
    const stored = await storeStreaks(tx, [{ habitId, userIds, habit }], today);
    if (habit.kind === "chore") await recomputeChoreStreaks(userIds, today, tx);
    return stored;
  });
}

/**
 * Rebuilds one person's cached streak on every live habit they hold, then their
 * chore streak once (a vacation changes all of them): the habits in one read,
 * their checks and vacations in one more, one update per habit.
 */
export async function recomputePersonStreaks(userId: string, today: CalendarDate, client: Prisma.TransactionClient = db): Promise<void> {
  return atomically(client, async (tx) => {
    const habits = await tx.habit.findMany({ where: { archivedAt: null, participants: { some: { userId } } }, select: { id: true, ...SCHEDULE_SELECT } });
    await storeStreaks(tx, habits.map((habit) => ({ habitId: habit.id, userIds: [userId], habit })), today);
    await recomputeChoreStreak(userId, today, tx);
  });
}

/**
 * Rebuilds every participant of every non-archived habit: three reads in all,
 * then one update per person. `habits` counts distinct habits rebuilt, not the
 * per-person records behind them (decision 84).
 */
export async function recomputeAllStreaks(today: CalendarDate, client: Prisma.TransactionClient = db): Promise<{ habits: number }> {
  return atomically(client, async (tx) => {
    const habits = await tx.habit.findMany({
      where: { archivedAt: null },
      select: { id: true, ...SCHEDULE_SELECT, participants: { select: { userId: true } } },
    });
    const results = await storeStreaks(
      tx,
      habits.map((habit) => ({ habitId: habit.id, userIds: habit.participants.map((p) => p.userId), habit })),
      today,
    );
    await recomputeAllChoreStreaks(today, tx);
    return { habits: new Set(Object.keys(results).map((key) => key.split(":")[0])).size };
  });
}

/** Every participant of one habit, used when its schedule changed. */
export async function recomputeHabit(tx: Client, habitId: string, today: CalendarDate): Promise<void> {
  const participants = await tx.habitParticipant.findMany({ where: { habitId }, select: { userId: true } });
  await recomputeStreaks(habitId, participants.map((p) => p.userId), today, tx);
}

type StreakJob = {
  habitId: string;
  userIds: readonly string[];
  habit: { schedule: string; weekdays: string | null; times: number | null; anchorWeek: Date | null };
};

/** Loads logs and vacations for all jobs at once, runs the engine, writes the cache. Keys are `habitId:userId`. */
async function storeStreaks(tx: Client, jobs: StreakJob[], today: CalendarDate): Promise<Record<string, StreakResult>> {
  const live = jobs.filter((job) => job.userIds.length > 0 && specFromRow(job.habit) !== null);
  if (live.length === 0) return {};
  const everyone = [...new Set(live.flatMap((job) => job.userIds))];
  const [logRows, vacationRows] = await Promise.all([
    tx.habitLog.findMany({
      where: { habitId: { in: live.map((job) => job.habitId) }, userId: { in: everyone } },
      select: { habitId: true, userId: true, day: true, status: true },
    }),
    tx.vacationPeriod.findMany({
      where: { userId: { in: everyone } },
      select: { userId: true, startDay: true, endDay: true },
    }),
  ]);
  const out: Record<string, StreakResult> = {};
  for (const job of live) {
    const spec = specFromRow(job.habit)!;
    const logs = logRows.filter((row) => row.habitId === job.habitId).map(logDayFromRow);
    for (const userId of job.userIds) {
      const vacations = vacationRows.filter((row) => row.userId === userId).map(vacationFromRow);
      const result = computeStreaks(spec, logsForUser(logs, userId), vacations, today);
      await tx.habitParticipant.updateMany({
        where: { habitId: job.habitId, userId },
        data: { currentStreak: result.current, bestStreak: result.best, streakAsOf: utcMidnightInstant(result.asOf) },
      });
      out[`${job.habitId}:${userId}`] = result;
    }
  }
  return out;
}
