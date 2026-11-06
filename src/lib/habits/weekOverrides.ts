import { calendarDateFromUtcMidnight, dayOfWeek, startOfWeek, type CalendarDate } from "../householdDate";
import { isWeekday, type Weekday } from "../habitVocabulary";
import { isScheduledDay, isSameDay } from "./schedule";
import type { ChoreDayState, ScheduleSpec, WeekOverride } from "./types";

// "This week only" changes to a weekdays chore (decision 117): a chore can be
// moved to another day of one week, or skipped for that week, and the default
// week stays as it was. The week starts on Sunday. A change only reads for
// the chore's own days, and only for the week it names. Pure: no db, no React.

/** The changes that belong to the week holding `day`, for a weekday the chore really has. */
function overridesInWeek(spec: ScheduleSpec, overrides: readonly WeekOverride[], day: CalendarDate): WeekOverride[] {
  if (spec.schedule !== "weekdays") return [];
  const week = startOfWeek(day);
  return overrides.filter(
    (change) =>
      isSameDay(change.weekStart, week) &&
      spec.days.includes(change.fromWeekday) &&
      // A move with no target, or onto its own day, changes nothing.
      !(change.action === "moved" && (change.toWeekday === null || change.toWeekday === change.fromWeekday)),
  );
}

/**
 * What the chore asks on `day`. Moved away: none on the old day, required on
 * the new one. Skipped: excused on its day. A chore with no change in that
 * week reads as its schedule says. Only weekdays chores take changes.
 */
export function choreDayState(spec: ScheduleSpec, overrides: readonly WeekOverride[], day: CalendarDate): ChoreDayState {
  const weekday = dayOfWeek(day) as Weekday;
  const changes = overridesInWeek(spec, overrides, day);
  if (changes.some((change) => change.action === "moved" && change.toWeekday === weekday)) return "required";
  if (!isScheduledDay(spec, day)) return "none";
  const own = changes.find((change) => change.fromWeekday === weekday);
  if (!own) return "required";
  return own.action === "skipped" ? "excused" : "none";
}

/**
 * The tag the chart draws on a chore (decision 117): "moved away" on the old
 * day (naming the new weekday), "moved here" on the new day, "skipped" on a
 * skipped day; null with no change. The words are `choreTagLabel`'s.
 */
export type ChoreTag =
  | { kind: "moved-away"; toWeekday: Weekday }
  | { kind: "moved-here" }
  | { kind: "skipped" };

export function choreTag(spec: ScheduleSpec, overrides: readonly WeekOverride[], day: CalendarDate): ChoreTag | null {
  const weekday = dayOfWeek(day) as Weekday;
  const changes = overridesInWeek(spec, overrides, day);
  if (changes.some((change) => change.action === "moved" && change.toWeekday === weekday)) return { kind: "moved-here" };
  const own = changes.find((change) => change.fromWeekday === weekday);
  if (!own) return null;
  if (own.action === "skipped") return { kind: "skipped" };
  return { kind: "moved-away", toWeekday: own.toWeekday as Weekday };
}

/** A stored override row (`ChoreWeekOverride`) as the engine reads it; days are UTC midnight. */
export type StoredWeekOverride = { weekStart: Date; fromWeekday: number; action: string; toWeekday: number | null };

const toWeekday = (raw: number | null): Weekday | null => (isWeekday(raw) ? raw : null);

/** The engine's reading of a stored override; null when the row is unreadable (an unknown action or weekday). */
export function overrideFromRow(row: StoredWeekOverride): WeekOverride | null {
  const from = toWeekday(row.fromWeekday);
  if (from === null || (row.action !== "moved" && row.action !== "skipped")) return null;
  return { weekStart: calendarDateFromUtcMidnight(row.weekStart), fromWeekday: from, action: row.action, toWeekday: toWeekday(row.toWeekday) };
}

/**
 * This week's changes to one chore as a row needs them: today's state and tag
 * (null with no changes), and `stateOn` for any other day (the carry-over check).
 * Only a weekdays chore takes changes: a stale row left on a chore whose
 * schedule moved to something else changes nothing.
 */
export function weekChange(spec: ScheduleSpec | null, rows: readonly StoredWeekOverride[] | undefined, today: CalendarDate) {
  const changes = (rows ?? []).flatMap((row) => overrideFromRow(row) ?? []);
  const active = spec?.schedule === "weekdays" && changes.length > 0;
  return {
    state: active ? choreDayState(spec, changes, today) : null,
    tag: active ? choreTag(spec, changes, today) : null,
    stateOn: (day: CalendarDate): ChoreDayState => (active ? choreDayState(spec, changes, day) : "required"),
  };
}

/**
 * Decisions 126 and 129: whether a this-week change may be written. The turn
 * sits on its moved-to day, or on its own day when unchanged (`sitsPast`: that
 * day is before today). It may change only while it sits on today or later, or
 * while it is skipped this week (a skipped turn may still be moved to a day
 * ahead). A moved turn whose moved-to day has passed is locked. Clearing, going
 * back to the default, also needs the original day not to be past, because that
 * would make a past day required again. The rule: no past day becomes required,
 * un-excused or un-required, so a miss cannot be erased (decisions 6 and 33).
 */
export function changeAllowed(input: { fromPast: boolean; sitsPast: boolean; skipped: boolean; clearing: boolean }): boolean {
  if (input.sitsPast && !input.skipped) return false;
  return !(input.clearing && input.fromPast);
}

/** The row fields the "x of y" and confetti rules read; the two excuses may be left off. */
export type ExcusableRow = { doneToday: boolean; skippedToday: boolean; onVacation?: boolean; skippedThisWeek?: boolean };

/**
 * Excused for the whole day by the calendar rather than a tap: skipped for the
 * week or on vacation, and not done (decisions 127, 130: a check actually made
 * on such a day counts, so only an undone row is excused).
 */
export function isExcusedAllDay(row: Pick<ExcusableRow, "doneToday" | "onVacation" | "skippedThisWeek">): boolean {
  return (!!row.skippedThisWeek || !!row.onVacation) && !row.doneToday;
}

/** Excused today: skipped by a tap, or excused all day. Excused rows leave "x of y" and the confetti (decisions 109, 115, 127). */
export function isExcused(row: Pick<ExcusableRow, "doneToday" | "skippedToday" | "onVacation" | "skippedThisWeek">): boolean {
  return row.skippedToday || isExcusedAllDay(row);
}
