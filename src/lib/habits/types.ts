import type { Role } from "../constants";
import type { CalendarDate } from "../householdDate";
import type { HabitLogStatus, Weekday } from "../habitVocabulary";

// The pure engine's own types. Nothing here comes from the Prisma client:
// callers convert stored rows once (days with `calendarDateFromUtcMidnight`)
// and pass these in, so the engine never touches the database.

export type { Weekday };

/**
 * A habit's schedule as the engine reads it, a union by schedule. `days` is
 * the set of weekdays (Sunday = 0); biweekly with no days means "any day of a
 * due week", and `anchorWeek` is the Sunday of its first due week.
 */
export type ScheduleSpec =
  | { schedule: "daily" }
  | { schedule: "weekdays"; days: readonly Weekday[] }
  | { schedule: "weekly"; times: number }
  | { schedule: "biweekly"; days: readonly Weekday[]; anchorWeek: CalendarDate }
  | { schedule: "monthly"; times: number };

/** One check: the day it is for and its status. `userId` is whose check, when it matters. */
export type HabitLogDay = { day: CalendarDate; status: HabitLogStatus; userId?: string };

/** A vacation, inclusive at both ends. */
export type Vacation = { start: CalendarDate; end: CalendarDate };

/** Who is acting: a login's id and role. */
export type HabitActor = { userId: string; role: Role };

/** What the access rules need to know about a habit. */
export type HabitAccess = { isPrivate: boolean; participantIds: readonly string[] };

export type DueState = "required" | "open" | "none";

export type DayRange = { start: CalendarDate; end: CalendarDate };

/**
 * One change to a weekdays chore for one week (decisions 117, 33): the week's
 * Sunday, the weekday it normally falls on, and what happened to it. `toWeekday`
 * is set only for "moved".
 */
export type WeekOverride = {
  weekStart: CalendarDate;
  fromWeekday: Weekday;
  action: "moved" | "skipped";
  toWeekday: Weekday | null;
};

/** What a chore asks of a person on one day: `excused` is a skip (a chore skipped for the week). */
export type ChoreDayState = "required" | "excused" | "none";
