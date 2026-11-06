import "server-only";

// The one definition of every habit write, the shape of `pantryWrites.ts`: a
// `server-only` lib module with NO auth check of its own. The Server Actions
// that call it carry the session and the `access.ts` rules, and
// `revalidatePath` stays in the actions (STRUCTURE.md: route strings never
// live in lib).
//
// Atomicity: a check and its streak recompute must land together. Every
// multi-step function runs inside `atomically()`: when the caller passes a
// transaction client the steps simply join that transaction (so C4 can wrap
// `createHabit` plus a `planItem.create` in one `$transaction`); when the
// caller passes nothing (the default `db`) the function opens its own
// `db.$transaction`. Either way it commits or rolls back as one.
//
// Every day goes in through `utcMidnightInstant` and comes out through
// `calendarDateFromUtcMidnight` (see habitRows.ts).

import { db } from "@/lib/db";
import type { Habit, Prisma } from "@/generated/prisma/client";
import { calendarDateFromUtcMidnight, utcMidnightInstant, type CalendarDate } from "../householdDate";
import { toHabitLogStatus, toHabitSchedule, type HabitLogStatus } from "../habitVocabulary";
import {
  checkTargetUserIds,
  habitColumns,
  logDayFromRow,
  logsForUser,
  scheduleChanged,
  specFromRow,
  vacationFromRow,
  type HabitFields,
} from "./habitRows";
import { computeStreaks, type StreakResult } from "./streaks";
import type { DayRange } from "./types";

type Client = Prisma.TransactionClient;

/** Runs `work` in the caller's transaction, or in a fresh one when the caller gave only `db`. */
function atomically<T>(client: Prisma.TransactionClient, work: (tx: Client) => Promise<T>): Promise<T> {
  if (client === (db as unknown)) return db.$transaction((tx) => work(tx), { timeout: 15000 });
  return work(client);
}

const SCHEDULE_SELECT = { schedule: true, weekdays: true, times: true, anchorWeek: true } as const;

/** Fields for a new habit; title and schedule are required, the rest take the column defaults. */
export type NewHabit = HabitFields & { title: string; schedule: string };

/** Every active person who can hold a habit: not deactivated, not a shared device login. */
export async function householdParticipantIds(client: Prisma.TransactionClient = db): Promise<string[]> {
  const people = await client.user.findMany({ where: { deactivatedAt: null, role: { not: "device" } }, select: { id: true } });
  return people.map((person) => person.id);
}

/**
 * Creates a habit and its participants (one nested write, so it is atomic by
 * itself). `participantIds` is a list of people, or "household" for everyone
 * active (a Together goal's habit). "household", or `everyone: true`, also
 * flags the habit so a person added or turned back on later joins it
 * (decision 87); with `everyone` the caller still passes the list it picked.
 */
export async function createHabit(
  input: { fields: NewHabit; participantIds: readonly string[] | "household"; everyone?: boolean },
  client: Prisma.TransactionClient = db,
): Promise<Habit> {
  const everyone = input.participantIds === "household" || input.everyone === true;
  const ids = input.participantIds === "household" ? await householdParticipantIds(client) : input.participantIds;
  const userIds = [...new Set(ids)];
  return client.habit.create({
    data: {
      ...habitColumns(input.fields),
      everyone,
      title: input.fields.title.trim(),
      schedule: toHabitSchedule(input.fields.schedule),
      participants: { create: userIds.map((userId, sortOrder) => ({ userId, sortOrder })) },
    },
  });
}

/** Who takes part in a habit and whether it follows the whole family; either may be left out to keep it as is. */
export type HabitPeople = { participantIds?: readonly string[]; everyone?: boolean };

/**
 * Updates the given fields. When a schedule column actually changed, every
 * participant's streak is rebuilt for `today`. `people` may replace the
 * participant set (people dropped lose only their participant row: their
 * logs stay, so adding them back restores their history) and the `everyone`
 * flag; without it participants are not touched. Null when the habit is missing.
 */
export async function updateHabit(
  habitId: string,
  fields: HabitFields,
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
  people: HabitPeople = {},
): Promise<Habit | null> {
  return atomically(client, async (tx) => {
    const before = await tx.habit.findUnique({ where: { id: habitId }, select: SCHEDULE_SELECT });
    if (!before) return null;
    const updated = await tx.habit.update({
      where: { id: habitId },
      data: { ...habitColumns(fields), ...(people.everyone !== undefined ? { everyone: people.everyone } : {}) },
    });
    if (people.participantIds) await replaceParticipants(tx, habitId, people.participantIds);
    if (scheduleChanged(before, updated)) await recomputeHabit(tx, habitId, today);
    return updated;
  });
}

/** Makes the habit's participants exactly `participantIds`: new people go to the end, dropped people lose only their row. */
async function replaceParticipants(tx: Client, habitId: string, participantIds: readonly string[]): Promise<void> {
  const wanted = [...new Set(participantIds)];
  const current = await tx.habitParticipant.findMany({ where: { habitId }, select: { userId: true, sortOrder: true } });
  const have = new Set(current.map((p) => p.userId));
  await tx.habitParticipant.deleteMany({ where: { habitId, userId: { notIn: wanted } } });
  const added = wanted.filter((userId) => !have.has(userId));
  if (added.length === 0) return;
  const next = current.reduce((max, p) => Math.max(max, p.sortOrder), -1) + 1;
  await tx.habitParticipant.createMany({
    data: added.map((userId, i) => ({ habitId, userId, sortOrder: next + i })),
    skipDuplicates: true,
  });
}

/**
 * Adds the person to every non-archived habit made with Everyone that they
 * are not already in (decision 87), at the end of their own list. Called when
 * a profile is created or turned back on. Returns how many habits they joined.
 */
export async function joinEveryoneHabits(userId: string, client: Prisma.TransactionClient = db): Promise<number> {
  return atomically(client, async (tx) => {
    const [habits, mine] = await Promise.all([
      tx.habit.findMany({ where: { everyone: true, archivedAt: null }, select: { id: true }, orderBy: { createdAt: "asc" } }),
      tx.habitParticipant.findMany({ where: { userId }, select: { habitId: true, sortOrder: true } }),
    ]);
    const inHabit = new Set(mine.map((p) => p.habitId));
    const joining = habits.filter((habit) => !inHabit.has(habit.id));
    if (joining.length === 0) return 0;
    const next = mine.reduce((max, p) => Math.max(max, p.sortOrder), -1) + 1;
    const { count } = await tx.habitParticipant.createMany({
      data: joining.map((habit, i) => ({ habitId: habit.id, userId, sortOrder: next + i })),
      skipDuplicates: true,
    });
    return count;
  });
}

/**
 * Writes `ids` as this person's order (0, 1, 2...) in their own list only.
 * Ids they do not take part in are ignored, repeats count once.
 */
export async function reorderHabits(userId: string, ids: readonly string[], client: Prisma.TransactionClient = db): Promise<void> {
  const wanted = [...new Set(ids)];
  if (wanted.length === 0) return;
  await atomically(client, async (tx) => {
    const mine = await tx.habitParticipant.findMany({ where: { userId, habitId: { in: wanted } }, select: { habitId: true } });
    const valid = new Set(mine.map((p) => p.habitId));
    let sortOrder = 0;
    for (const habitId of wanted) {
      if (!valid.has(habitId)) continue;
      await tx.habitParticipant.updateMany({ where: { userId, habitId }, data: { sortOrder } });
      sortOrder += 1;
    }
  });
}

/**
 * Deletes the plan items pointing at the habit, then the habit (its
 * participants, logs and the rest cascade), as one unit.
 */
export async function deleteHabit(
  habitId: string,
  client: Prisma.TransactionClient = db,
): Promise<{ deleted: boolean; planItemsDeleted: number }> {
  return atomically(client, async (tx) => {
    const items = await tx.planItem.deleteMany({ where: { habitId } });
    const habit = await tx.habit.deleteMany({ where: { id: habitId } });
    return { deleted: habit.count > 0, planItemsDeleted: items.count };
  });
}

/**
 * Sets `archivedAt` to `at`; false when the habit is missing.
 * Dormant until PR B (mission 31): the habit editor's Archive.
 */
export async function archiveHabit(habitId: string, at: Date, client: Prisma.TransactionClient = db): Promise<boolean> {
  const result = await client.habit.updateMany({ where: { id: habitId }, data: { archivedAt: at } });
  return result.count > 0;
}

/**
 * Clears `archivedAt`; false when the habit is missing.
 * Dormant until PR B (mission 31): the Archived list's Restore.
 */
export async function restoreHabit(habitId: string, client: Prisma.TransactionClient = db): Promise<boolean> {
  const result = await client.habit.updateMany({ where: { id: habitId }, data: { archivedAt: null } });
  return result.count > 0;
}

export type CheckResult = {
  /** Rows written; 0 when it was already checked (or the habit/person does not exist). */
  created: number;
  /** The people whose rows the write was aimed at (and whose streaks were rebuilt). */
  userIds: string[];
};

/**
 * One row for an "each" habit, or one per participant for "together", with
 * `createMany({ skipDuplicates })` so a second tap is a no-op, then rebuilds
 * the streaks of everyone it was aimed at. A day that already has a row (any
 * status) is left alone: uncheck first to change it.
 */
export async function checkHabit(
  input: {
    habitId: string;
    forUserId: string;
    day: CalendarDate;
    status?: HabitLogStatus;
    loggedById: string | null;
  },
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<CheckResult> {
  return atomically(client, async (tx) => {
    const userIds = await targetUserIds(tx, input.habitId, input.forUserId);
    if (userIds.length === 0) return { created: 0, userIds };
    const { count } = await tx.habitLog.createMany({
      data: userIds.map((userId) => ({
        habitId: input.habitId,
        userId,
        day: utcMidnightInstant(input.day),
        status: toHabitLogStatus(input.status ?? "done"),
        loggedById: input.loggedById,
      })),
      skipDuplicates: true,
    });
    if (count > 0) await recomputeStreaks(input.habitId, userIds, today, tx);
    return { created: count, userIds };
  });
}

/**
 * Writes a "skipped" row for the day (the same fan-out and no-op rules as `checkHabit`).
 * Dormant until PR B (mission 31): the Today list's Skip.
 */
export function skipHabit(
  input: { habitId: string; forUserId: string; day: CalendarDate; loggedById: string | null },
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<CheckResult> {
  return checkHabit({ ...input, status: "skipped" }, today, client);
}

export type UncheckResult = {
  /** Rows deleted. */
  removed: number;
  /** The day removed (uncheckNewest only), null when nothing matched. */
  day: CalendarDate | null;
  /** The people whose streaks were rebuilt. */
  userIds: string[];
};

/** Deletes the rows for one day: just `forUserId`'s for "each", everyone's for "together". Also unskips. */
export async function uncheckHabit(
  input: { habitId: string; forUserId: string; day: CalendarDate },
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<UncheckResult> {
  return atomically(client, async (tx) => {
    const userIds = await targetUserIds(tx, input.habitId, input.forUserId);
    if (userIds.length === 0) return { removed: 0, day: null, userIds };
    const { count } = await tx.habitLog.deleteMany({
      where: { habitId: input.habitId, userId: { in: userIds }, day: utcMidnightInstant(input.day) },
    });
    if (count > 0) await recomputeStreaks(input.habitId, userIds, today, tx);
    return { removed: count, day: count > 0 ? input.day : null, userIds };
  });
}

/**
 * Deletes the newest row of `userId` inside `window` (inclusive) and, for
 * "together", that day's rows for every participant. Backs "undo" on a
 * count-in-a-window habit.
 */
export async function uncheckNewest(
  habitId: string,
  userId: string,
  window: DayRange,
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<UncheckResult> {
  return atomically(client, async (tx) => {
    const newest = await tx.habitLog.findFirst({
      where: {
        habitId,
        userId,
        day: { gte: utcMidnightInstant(window.start), lte: utcMidnightInstant(window.end) },
      },
      orderBy: { day: "desc" },
      select: { day: true },
    });
    if (!newest) return { removed: 0, day: null, userIds: [] };
    const day = calendarDateFromUtcMidnight(newest.day);
    return uncheckHabit({ habitId, forUserId: userId, day }, today, tx);
  });
}

/** Who a write for `forUserId` lands on, read from the habit's sharing and participants. */
async function targetUserIds(tx: Client, habitId: string, forUserId: string): Promise<string[]> {
  const habit = await tx.habit.findUnique({
    where: { id: habitId },
    select: { sharing: true, participants: { select: { userId: true } } },
  });
  if (!habit) return [];
  return checkTargetUserIds(habit.sharing, habit.participants.map((p) => p.userId), forUserId);
}

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
    return storeStreaks(tx, [{ habitId, userIds, habit }], today);
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
    return { habits: new Set(Object.keys(results).map((key) => key.split(":")[0])).size };
  });
}

/** Every participant of one habit, used when its schedule changed. */
async function recomputeHabit(tx: Client, habitId: string, today: CalendarDate): Promise<void> {
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
