import {
  toHabitKind,
  toHabitLogStatus,
  toHabitMode,
  toHabitSchedule,
  toHabitSharing,
  toHabitIcon,
  toTimeOfDay,
  type HabitKind,
  type HabitMode,
  type HabitSchedule,
  type HabitSharing,
} from "../habitVocabulary";
import { calendarDateFromUtcMidnight, utcMidnightInstant, type CalendarDate } from "../householdDate";
import { scheduleFromRow } from "./schedule";
import type { HabitLogDay, ScheduleSpec, Vacation } from "./types";

// Row-shaped glue between the stored habit tables and the pure engine, kept
// out of the server modules so it can be tested without a database. Nothing
// here imports Prisma: the shapes below are just the columns the engine needs.
// Stored days are UTC midnight, so they are read once with
// `calendarDateFromUtcMidnight` and written with `utcMidnightInstant`.

/** The stored columns that decide a habit's schedule. */
export type StoredScheduleFields = {
  schedule: string;
  weekdays: string | null;
  times: number | null;
  anchorWeek: Date | null;
};

export type StoredLog = { day: Date; status: string; userId: string };
export type StoredVacation = { startDay: Date; endDay: Date };

export function logDayFromRow(row: StoredLog): HabitLogDay {
  return { day: calendarDateFromUtcMidnight(row.day), status: toHabitLogStatus(row.status), userId: row.userId };
}

export function vacationFromRow(row: StoredVacation): Vacation {
  return { start: calendarDateFromUtcMidnight(row.startDay), end: calendarDateFromUtcMidnight(row.endDay) };
}

/** The engine's reading of a stored habit; null when it cannot be scheduled (see `scheduleFromRow`). */
export function specFromRow(row: StoredScheduleFields): ScheduleSpec | null {
  return scheduleFromRow({
    schedule: row.schedule,
    weekdays: row.weekdays,
    times: row.times,
    anchorWeek: row.anchorWeek ? calendarDateFromUtcMidnight(row.anchorWeek) : null,
  });
}

/** True when two stored schedules differ, which is when streaks must be rebuilt. */
export function scheduleChanged(before: StoredScheduleFields, after: StoredScheduleFields): boolean {
  return (
    before.schedule !== after.schedule ||
    before.weekdays !== after.weekdays ||
    before.times !== after.times ||
    (before.anchorWeek?.getTime() ?? null) !== (after.anchorWeek?.getTime() ?? null)
  );
}

/**
 * Whose rows a check writes. "together" fans out to every participant; "each"
 * writes only the person it is for. Someone who is not a participant gets
 * nothing, so a stray id can never create a row.
 */
export function checkTargetUserIds(
  sharing: string,
  participantIds: readonly string[],
  forUserId: string,
): string[] {
  if (!participantIds.includes(forUserId)) return [];
  return toHabitSharing(sharing) === "together" ? [...participantIds] : [forUserId];
}

/** One person's checks out of a habit's logs (a Together habit stores one row per participant). */
export function logsForUser(logs: readonly HabitLogDay[], userId: string): HabitLogDay[] {
  return logs.filter((log) => log.userId === userId);
}

/** The editable columns of a habit. `undefined` means "leave as is"; `null` clears. */
export type HabitFields = {
  title?: string;
  kind?: HabitKind;
  mode?: HabitMode;
  icon?: string | null;
  lifeArea?: string | null;
  timeOfDay?: string | null;
  schedule?: HabitSchedule;
  weekdays?: string | null;
  times?: number | null;
  anchorWeek?: CalendarDate | null;
  carryOver?: boolean;
  sharing?: HabitSharing;
  isPrivate?: boolean;
  createdById?: string | null;
};

export type HabitColumns = {
  title?: string;
  kind?: string;
  mode?: string;
  icon?: string | null;
  lifeArea?: string | null;
  timeOfDay?: string | null;
  schedule?: string;
  weekdays?: string | null;
  times?: number | null;
  anchorWeek?: Date | null;
  carryOver?: boolean;
  sharing?: string;
  isPrivate?: boolean;
  createdById?: string | null;
};

/**
 * The columns to write for some fields: vocabulary repaired by the `to*`
 * narrowers, the title trimmed, times a whole number, the anchor week at UTC
 * midnight. Only the keys that were given come out, so it serves both create
 * and update.
 */
export function habitColumns(fields: HabitFields): HabitColumns {
  const out: HabitColumns = {};
  if (fields.title !== undefined) out.title = fields.title.trim();
  if (fields.kind !== undefined) out.kind = toHabitKind(fields.kind);
  if (fields.mode !== undefined) out.mode = toHabitMode(fields.mode);
  if (fields.icon !== undefined) out.icon = toHabitIcon(fields.icon);
  if (fields.lifeArea !== undefined) out.lifeArea = fields.lifeArea;
  if (fields.timeOfDay !== undefined) out.timeOfDay = toTimeOfDay(fields.timeOfDay);
  if (fields.schedule !== undefined) out.schedule = toHabitSchedule(fields.schedule);
  if (fields.weekdays !== undefined) out.weekdays = fields.weekdays;
  if (fields.times !== undefined) out.times = fields.times === null ? null : Math.trunc(fields.times);
  if (fields.anchorWeek !== undefined) {
    out.anchorWeek = fields.anchorWeek === null ? null : utcMidnightInstant(fields.anchorWeek);
  }
  if (fields.carryOver !== undefined) out.carryOver = fields.carryOver;
  if (fields.sharing !== undefined) out.sharing = toHabitSharing(fields.sharing);
  if (fields.isPrivate !== undefined) out.isPrivate = fields.isPrivate;
  if (fields.createdById !== undefined) out.createdById = fields.createdById;
  return out;
}
