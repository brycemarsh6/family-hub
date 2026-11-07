import "server-only";

// The guarded taps on a habit (mission 47, C1): check, skip, uncheck, unskip,
// add hours and remove hours. The rules the Server Actions in
// `habitChecks.ts` and `habitHours.ts` used to hold, in one `server-only` lib
// module with NO session check and NO `revalidatePath`: the actions add the
// session and the page refresh, the Assistant API adds its token, audit log
// and undo copies.
//
// Same guard order every time: the habit's row and the caller's `guard`
// (a callback, so this module knows no actor and no access rule: the actions
// pass `canLogFor` for the signed-in person, the Assistant API passes it for
// Winnie), then the day, then the habit's own refusals. A missing habit and a refused one answer the
// same words. "Today" is the caller's; a `day` is accepted only from the last
// seven days up to today, never the future, plus the one older day a
// carried-over row stands for (up to 14 days back). A `null` day is one the
// caller could not parse: it is refused after the access check, so a habit's
// existence is not confirmed by the day's error.
//
// Every write returns whole-row copies of what it created or removed, read
// inside the same transaction, or a `WriteError` (`writeError.ts`). The
// writers in `habitWrites.ts` are unchanged.

import { db } from "@/lib/db";
import type { HabitLog, HabitTimeEntry, Prisma } from "@/generated/prisma/client";
import { checkEntryMinutes } from "./habitHoursVocabulary";
import { calendarDaysBetween, utcMidnightInstant, type CalendarDate } from "./householdDate";
import { loadCarriedDay, loadHabitForAction, loadLogStatus, type HabitForAction } from "./habitsRead";
import { invalid, missing, type WriteError } from "./writeError";
import { isTapDayAllowed, statusForTap, TAP_DAYS_BACK } from "./habits/carryOver";
import {
  addHabitTime as addHabitTimeRow,
  checkHabit as checkHabitRow,
  removeHabitTime as removeHabitTimeRow,
  skipHabit as skipHabitRow,
  uncheckHabit as uncheckHabitRow,
} from "./habits/habitWrites";
import { atomically } from "./habits/participantWrites";

export const HABIT_NOT_FOUND = "That habit isn't available.";
export const HABIT_TRACKS_HOURS = "That habit tracks hours.";
export const HABIT_ARCHIVED = "That habit is archived.";
export const TAP_DAY_REFUSED = "That day can't be changed.";
export const HOURS_DAY_REFUSED = "Pick a day from the last week.";
export const HOURS_MINUTES_REFUSED = "Pick a time from half an hour to 12 hours, in quarter hours.";
export const HABIT_NOT_HOURS = "That habit doesn't track hours.";

/** The caller's access test on the habit: true when it may be tapped. A refused habit answers like a missing one. */
export type HabitGuard = (habit: HabitForAction) => boolean;

/** A day the caller parsed, `null` when it could not be parsed, `undefined` for today. */
type TapDay = CalendarDate | null | undefined;

export type TapInput = { habitId: string; forUserId: string; day?: TapDay };

type Guarded = { habit: HabitForAction; day: CalendarDate; carried: CalendarDate | null | undefined };

/**
 * The row, the `guard`, then the day. `carried` is loaded only for a day
 * older than a week (one more query); the server's answer decides, not the
 * client's. `undefined` means it was not loaded.
 */
async function guardedTap(guard: HabitGuard, input: TapInput, today: CalendarDate): Promise<Guarded | WriteError> {
  const habit = await loadHabitForAction(input.habitId);
  if (!habit || !guard(habit)) return missing(HABIT_NOT_FOUND);
  const day = input.day === undefined ? today : input.day;
  if (!day) return invalid(TAP_DAY_REFUSED);
  const carried = calendarDaysBetween(day, today) > TAP_DAYS_BACK ? await loadCarriedDay(habit, input.habitId, input.forUserId, today) : undefined;
  if (!isTapDayAllowed(day, today, carried ?? null)) return invalid(TAP_DAY_REFUSED);
  return { habit, day, carried };
}

/** The refusals only a check or skip has: the habit tracks hours, or is archived. */
function checkRefusal(habit: HabitForAction): WriteError | null {
  if (habit.track === "hours") return invalid(HABIT_TRACKS_HOURS);
  if (habit.archived) return invalid(HABIT_ARCHIVED);
  return null;
}

/** Every log for the habit on the day, whoever it is for (a Together habit holds one row per participant). */
function logsOn(tx: Prisma.TransactionClient, habitId: string, day: CalendarDate): Promise<HabitLog[]> {
  return tx.habitLog.findMany({ where: { habitId, day: utcMidnightInstant(day) }, orderBy: { userId: "asc" } });
}

/** Rows that are in `after` but not in `before`, by id. */
function addedRows<T extends { id: string }>(before: readonly T[], after: readonly T[]): T[] {
  const had = new Set(before.map((row) => row.id));
  return after.filter((row) => !had.has(row.id));
}

async function writeLogs(
  status: "check" | "skip",
  guard: HabitGuard,
  input: TapInput & { loggedById: string | null },
  today: CalendarDate,
  client: Prisma.TransactionClient,
): Promise<{ created: HabitLog[]; userIds: string[] } | WriteError> {
  const guarded = await guardedTap(guard, input, today);
  if ("error" in guarded) return guarded;
  const { habit, day } = guarded;
  const refused = checkRefusal(habit);
  if (refused) return refused;
  // A check on a carried day is written "late"; the guard may not have loaded it.
  const carried = status === "check" ? (guarded.carried !== undefined ? guarded.carried : await loadCarriedDay(habit, input.habitId, input.forUserId, today)) : null;
  return atomically(client, async (tx) => {
    const before = await logsOn(tx, input.habitId, day);
    const base = { habitId: input.habitId, forUserId: input.forUserId, day, loggedById: input.loggedById };
    const result =
      status === "check"
        ? await checkHabitRow({ ...base, status: statusForTap(day, carried) }, today, tx)
        : await skipHabitRow(base, today, tx);
    if (result.created === 0) return { created: [], userIds: result.userIds };
    return { created: addedRows(before, await logsOn(tx, input.habitId, day)), userIds: result.userIds };
  });
}

/** Tick a habit for `forUserId` on `day` (today when none). A carried day is written "late"; a day that already has a row is a no-op (`created: []`). */
export function tapCheck(
  guard: HabitGuard,
  input: TapInput & { loggedById: string | null },
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<{ created: HabitLog[]; userIds: string[] } | WriteError> {
  return writeLogs("check", guard, input, today, client);
}

/** Skip the day (same day rules as `tapCheck`). A day that already has a check or skip is left alone. */
export function tapSkip(
  guard: HabitGuard,
  input: TapInput & { loggedById: string | null },
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<{ created: HabitLog[]; userIds: string[] } | WriteError> {
  return writeLogs("skip", guard, input, today, client);
}

/**
 * Remove one kind of row ("check" = done or late, "skip" = skipped) for the
 * day; any other row is left alone. A mismatch or no row writes nothing and
 * answers `removed: []`.
 */
export async function tapUncheck(
  kind: "check" | "skip",
  guard: HabitGuard,
  input: TapInput,
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<{ removed: HabitLog[] } | WriteError> {
  const guarded = await guardedTap(guard, input, today);
  if ("error" in guarded) return guarded;
  const { habit, day } = guarded;
  if (habit.track === "hours") return invalid(HABIT_TRACKS_HOURS);
  const status = await loadLogStatus(input.habitId, input.forUserId, day);
  if (status === null || (status === "skipped") !== (kind === "skip")) return { removed: [] };
  return atomically(client, async (tx) => {
    const before = await logsOn(tx, input.habitId, day);
    const result = await uncheckHabitRow({ habitId: input.habitId, forUserId: input.forUserId, day }, today, tx);
    if (result.removed === 0) return { removed: [] };
    return { removed: addedRows(await logsOn(tx, input.habitId, day), before) };
  });
}

/**
 * Log time for `forUserId` on a day in the last week up to today. Several
 * entries may share a day. `day` is `null` when the caller could not parse it.
 */
export async function logHours(
  guard: HabitGuard,
  input: { habitId: string; forUserId: string; day: CalendarDate | null; minutes: number; loggedById: string | null },
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<{ entry: HabitTimeEntry } | WriteError> {
  const habit = await loadHabitForAction(input.habitId);
  if (!habit || !guard(habit)) return missing(HABIT_NOT_FOUND);
  if (habit.archived) return invalid(HABIT_ARCHIVED);
  if (!checkEntryMinutes(input.minutes)) return invalid(HOURS_MINUTES_REFUSED);
  if (!input.day || !isTapDayAllowed(input.day, today, null)) return invalid(HOURS_DAY_REFUSED);
  const entry = await addHabitTimeRow(
    { habitId: input.habitId, userId: input.forUserId, day: input.day, minutes: input.minutes, loggedById: input.loggedById },
    today,
    client,
  );
  if (!entry) return invalid(HABIT_NOT_HOURS);
  return { entry };
}

/**
 * Take one entry back. `guard` runs inside the transaction on the entry and
 * its habit and may refuse (nothing is removed then; it may also throw, which
 * rolls the transaction back): the actions let anyone
 * who may log for the entry's person remove it, the Assistant API adds "only
 * time she logged herself". A missing habit is `HABIT_NOT_FOUND` before the
 * guard is asked. An entry already gone is a success (`removed: null`).
 */
export async function removeHours(
  guard: (entry: HabitTimeEntry, habit: HabitForAction) => Promise<WriteError | null> | WriteError | null,
  entryId: string,
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<{ removed: HabitTimeEntry | null } | WriteError> {
  return atomically(client, async (tx) => {
    const entry = await tx.habitTimeEntry.findUnique({ where: { id: entryId } });
    if (!entry) return { removed: null };
    const habit = await loadHabitForAction(entry.habitId);
    if (!habit) return missing(HABIT_NOT_FOUND);
    const refusal = await guard(entry, habit);
    if (refusal) return refusal;
    const gone = await removeHabitTimeRow(entryId, today, tx);
    return { removed: gone ? entry : null };
  });
}
