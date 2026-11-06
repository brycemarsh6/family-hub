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
import type { Habit, HabitTimeEntry, Prisma } from "@/generated/prisma/client";
import { calendarDateFromUtcMidnight, utcMidnightInstant, type CalendarDate } from "../householdDate";
import { HOURS_LIMITS, toHabitTrack } from "../habitHoursVocabulary";
import { toHabitLogStatus, toHabitSchedule, type HabitLogStatus } from "../habitVocabulary";
import { checkTargetUserIds, habitColumns, scheduleChanged, type HabitFields } from "./habitRows";
import { choreOwnersOf, clearChoreChanges, recomputeChoreStreaks } from "./choreWrites";
import { atomically, householdParticipantIds, joinHouseholdToHabit, nextSortOrders, replaceParticipants } from "./participantWrites";
import { recomputeHabit, recomputeStreaks, SCHEDULE_SELECT } from "./streakWrites";
import type { DayRange } from "./types";

type Client = Prisma.TransactionClient;

/** Fields for a new habit; title and schedule are required, the rest take the column defaults. */
export type NewHabit = HabitFields & { title: string; schedule: string };

/**
 * Creates a habit and its participants (one nested write, so it is atomic by
 * itself). `participantIds` is a list of people, or "household" for everyone
 * active (a Together goal's habit). "household", or `everyone: true`, also
 * flags the habit so a person added or turned back on later joins it
 * (decision 87); with `everyone` the caller still passes the list it picked.
 * A new chore rebuilds its people's chore streak for `today`, in the same transaction.
 */
export async function createHabit(
  input: { fields: NewHabit; participantIds: readonly string[] | "household"; everyone?: boolean; today: CalendarDate },
  client: Prisma.TransactionClient = db,
): Promise<Habit> {
  return atomically(client, async (tx) => {
    const everyone = input.participantIds === "household" || input.everyone === true;
    const ids = input.participantIds === "household" ? await householdParticipantIds(tx) : input.participantIds;
    const userIds = [...new Set(ids)];
    const next = await nextSortOrders(tx, userIds);
    const habit = await tx.habit.create({
      data: {
        // The caller's schedule goes first, so an hours habit's forced weekly shape from `habitColumns` wins.
        schedule: toHabitSchedule(input.fields.schedule),
        ...habitColumns(input.fields),
        everyone,
        ...(toHabitTrack(input.fields.track) === "hours" ? { hoursSince: utcMidnightInstant(input.today) } : {}),
        title: input.fields.title.trim(),
        participants: { create: userIds.map((userId) => ({ userId, sortOrder: next.get(userId) ?? 0 })) },
      },
    });
    if (habit.kind === "chore") await recomputeChoreStreaks(userIds, input.today, tx);
    return habit;
  });
}

/** Who takes part in a habit and whether it follows the whole family; either may be left out to keep it as is. */
export type HabitPeople = { participantIds?: readonly string[]; everyone?: boolean };

/**
 * Updates the given fields. When a schedule column actually changed, every
 * participant's streak is rebuilt for `today`. `people` may replace the
 * participant set (people dropped lose only their participant row: their
 * logs stay, so adding them back restores their history) and the `everyone`
 * flag; without it participants are not touched. A habit whose schedule leaves
 * "weekdays" loses its this-week-only changes, which only a weekdays chore can
 * hold. Null when the habit is missing.
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
    const owners = new Set(await choreOwnersOf(tx, habitId));
    const updated = await tx.habit.update({
      where: { id: habitId },
      data: {
        ...habitColumns(fields),
        ...hoursSinceChange(before.track, fields.track, today),
        ...(people.everyone !== undefined ? { everyone: people.everyone } : {}),
      },
    });
    if (people.participantIds) await replaceParticipants(tx, habitId, people.participantIds);
    if (before.schedule === "weekdays" && updated.schedule !== "weekdays") await clearChoreChanges(habitId, tx);
    if (scheduleChanged(before, updated)) await recomputeHabit(tx, habitId, today);
    for (const userId of await choreOwnersOf(tx, habitId)) owners.add(userId);
    await recomputeChoreStreaks([...owners], today, tx);
    return updated;
  });
}

/** `hoursSince` follows the track: today when a habit becomes hours, cleared when it goes back to checks, untouched otherwise. */
function hoursSinceChange(beforeTrack: string, track: string | undefined, today: CalendarDate): { hoursSince?: Date | null } {
  if (track === undefined || toHabitTrack(track) === toHabitTrack(beforeTrack)) return {};
  return { hoursSince: toHabitTrack(track) === "hours" ? utcMidnightInstant(today) : null };
}

/**
 * Deletes the plan items pointing at the habit, then the habit (its
 * participants, logs and the rest cascade), as one unit.
 */
export async function deleteHabit(
  habitId: string,
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<{ deleted: boolean; planItemsDeleted: number }> {
  return atomically(client, async (tx) => {
    const owners = await choreOwnersOf(tx, habitId);
    const items = await tx.planItem.deleteMany({ where: { habitId } });
    const habit = await tx.habit.deleteMany({ where: { id: habitId } });
    await recomputeChoreStreaks(owners, today, tx);
    return { deleted: habit.count > 0, planItemsDeleted: items.count };
  });
}

/** Sets `archivedAt` to `at`; false when the habit is missing. */
export async function archiveHabit(habitId: string, at: Date, today: CalendarDate, client: Prisma.TransactionClient = db): Promise<boolean> {
  return atomically(client, async (tx) => {
    const result = await tx.habit.updateMany({ where: { id: habitId }, data: { archivedAt: at } });
    await recomputeChoreStreaks(await choreOwnersOf(tx, habitId), today, tx);
    return result.count > 0;
  });
}

/** Clears `archivedAt`; false when the habit is missing. An Everyone habit also takes in the people who joined the household while it was archived. */
export async function restoreHabit(habitId: string, today: CalendarDate, client: Prisma.TransactionClient = db): Promise<boolean> {
  return atomically(client, async (tx) => {
    const result = await tx.habit.updateMany({ where: { id: habitId }, data: { archivedAt: null } });
    if (result.count === 0) return false;
    const habit = await tx.habit.findUnique({ where: { id: habitId }, select: { everyone: true } });
    if (habit?.everyone) await joinHouseholdToHabit(habitId, tx);
    await recomputeChoreStreaks(await choreOwnersOf(tx, habitId), today, tx);
    return true;
  });
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

/** Writes a "skipped" row for the day (the same fan-out and no-op rules as `checkHabit`). */
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
 * Adds a block of time to an hours habit for one person and rebuilds their
 * weeks-hit streak. Minutes are repaired to a whole number within the entry
 * limits. Null when the habit is not an hours habit or the person is not on it,
 * so a stray id never creates a row. Several entries may share a day.
 */
export async function addHabitTime(
  input: { habitId: string; userId: string; day: CalendarDate; minutes: number; loggedById: string | null },
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<HabitTimeEntry | null> {
  return atomically(client, async (tx) => {
    const habit = await tx.habit.findUnique({
      where: { id: input.habitId },
      select: { track: true, participants: { where: { userId: input.userId }, select: { userId: true } } },
    });
    if (!habit || toHabitTrack(habit.track) !== "hours" || habit.participants.length === 0) return null;
    const whole = Number.isFinite(input.minutes) ? Math.trunc(input.minutes) : HOURS_LIMITS.entryDefault;
    const entry = await tx.habitTimeEntry.create({
      data: {
        habitId: input.habitId,
        userId: input.userId,
        day: utcMidnightInstant(input.day),
        minutes: Math.min(Math.max(whole, HOURS_LIMITS.entryMin), HOURS_LIMITS.entryMax),
        loggedById: input.loggedById,
      },
    });
    await recomputeStreaks(input.habitId, [input.userId], today, tx);
    return entry;
  });
}

/** Removes one entry and rebuilds that person's streak; the habit and person it belonged to, or null when it was already gone. */
export async function removeHabitTime(
  entryId: string,
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<{ habitId: string; userId: string } | null> {
  return atomically(client, async (tx) => {
    const entry = await tx.habitTimeEntry.findUnique({ where: { id: entryId }, select: { habitId: true, userId: true } });
    if (!entry) return null;
    const { count } = await tx.habitTimeEntry.deleteMany({ where: { id: entryId } });
    if (count === 0) return null;
    await recomputeStreaks(entry.habitId, [entry.userId], today, tx);
    return entry;
  });
}
