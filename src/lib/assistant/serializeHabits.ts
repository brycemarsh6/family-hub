import type { ChoreChartData } from "@/lib/choreChart";
import { hoursStreakOf } from "@/lib/habitsHours";
import type { HabitRowView } from "@/lib/habitsToday";
import { toHabitTrack, toPaceDays } from "@/lib/habitHoursVocabulary";
import { toHabitKind } from "@/lib/habitVocabulary";
import { hoursFromRow, specFromRow, timeEntryFromRow, type StoredHoursFields, type StoredScheduleFields } from "@/lib/habits/habitRows";
import { hoursWeek } from "@/lib/habits/hours";
import { displayStreak } from "@/lib/habits/streaks";
import type { Vacation } from "@/lib/habits/types";
import { calendarDateFromUtcMidnight, formatCalendarDate, type CalendarDate } from "@/lib/householdDate";
import type { ChangeInput } from "./audit";
import { toCopy, sameCopy } from "./undoPlan";

// DB row -> wire format for the Assistant API's habit routes, and the audit
// copies a habit write records. Pure, and every output is built field by
// field: never a spread of a row, so a column added later can't leak onto the
// wire by default. Days leave as "YYYY-MM-DD".

export type HabitRow = StoredScheduleFields & StoredHoursFields & {
  id: string;
  title: string;
  kind: string;
  mode: string;
  icon: string | null;
  lifeArea: string | null;
  timeOfDay: string | null;
  carryOver: boolean;
  sharing: string;
  isPrivate: boolean;
  everyone: boolean;
  archivedAt: Date | null;
  participants: {
    userId: string;
    currentStreak: number;
    bestStreak: number;
    streakAsOf: Date | null;
    user: { deactivatedAt: Date | null };
  }[];
};

/** What a streak needs beyond the row: today, each person's vacations, and a chore-doer's chore streak. */
export type StreakContext = {
  today: CalendarDate;
  vacationsOf: (userId: string) => readonly Vacation[];
  choreStreakOf: (userId: string) => { current: number; best: number };
};

const day = (date: Date) => formatCalendarDate(calendarDateFromUtcMidnight(date));

/** The current streak is the cache aged to today; a chore shows its person's one chore streak. */
function participantStreak(row: HabitRow, part: HabitRow["participants"][number], ctx: StreakContext) {
  if (toHabitKind(row.kind) === "chore") {
    const chore = ctx.choreStreakOf(part.userId);
    return { streak: chore.current, bestStreak: chore.best };
  }
  const cache = { current: part.currentStreak, best: part.bestStreak, asOf: part.streakAsOf ? calendarDateFromUtcMidnight(part.streakAsOf) : null };
  const vacations = ctx.vacationsOf(part.userId);
  const streak = hoursStreakOf(row, cache, vacations, ctx.today) ?? displayStreak(specFromRow(row), cache, vacations, ctx.today);
  return { streak, bestStreak: part.bestStreak };
}

/** A habit or chore as Winnie reads it. Deactivated people are left out of `participants`. */
export function toHabit(row: HabitRow, ctx: StreakContext) {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    mode: row.mode,
    icon: row.icon,
    lifeArea: row.lifeArea,
    timeOfDay: row.timeOfDay,
    schedule: row.schedule,
    weekdays: row.weekdays,
    times: row.times,
    anchorWeek: row.anchorWeek ? day(row.anchorWeek) : null,
    carryOver: row.carryOver,
    sharing: row.sharing,
    isPrivate: row.isPrivate,
    everyone: row.everyone,
    archived: row.archivedAt !== null,
    track: toHabitTrack(row.track),
    weeklyMinutes: row.weeklyMinutes,
    paceDays: row.paceDays === null ? null : toPaceDays(row.paceDays),
    participants: row.participants
      .filter((part) => part.user.deactivatedAt === null)
      .map((part) => ({ personId: part.userId, ...participantStreak(row, part, ctx) })),
  };
}

export type EntryRow = { id: string; userId: string; day: Date; minutes: number };

/** One person's week on an hours habit (this week's entries, Sunday to Saturday), or null for a checks habit. */
export function toHoursWeeks(row: HabitRow, entries: readonly EntryRow[], madeByAssistant: ReadonlySet<string>, ctx: StreakContext) {
  const spec = hoursFromRow(row);
  if (!spec) return null;
  return row.participants
    .filter((part) => part.user.deactivatedAt === null)
    .map((part) => {
      const mine = entries.filter((entry) => entry.userId === part.userId);
      const week = hoursWeek({
        entries: mine.map(timeEntryFromRow),
        targetMinutes: spec.targetMinutes,
        paceDays: spec.paceDays,
        today: ctx.today,
        vacations: ctx.vacationsOf(part.userId),
      });
      return {
        personId: part.userId,
        weekStart: formatCalendarDate(week.weekStart),
        doneMinutes: week.doneMinutes,
        targetMinutes: week.targetMinutes,
        leftMinutes: week.leftMinutes,
        perDayMinutes: week.perDayMinutes,
        met: week.met,
        byDay: week.byDay,
        entries: mine.map((entry) => ({
          id: entry.id,
          day: day(entry.day),
          minutes: entry.minutes,
          loggedByAssistant: madeByAssistant.has(entry.id),
        })),
      };
    });
}

/** `GET /habits/{id}`: the habit, its hours weeks, the last 14 days of checks, and whether Winnie made it. */
export function toHabitDetail(
  row: HabitRow,
  extras: {
    entries: readonly EntryRow[];
    madeByAssistant: ReadonlySet<string>;
    logs: readonly { userId: string; day: Date; status: string }[];
    createdByAssistant: boolean;
  },
  ctx: StreakContext,
) {
  return {
    ...toHabit(row, ctx),
    hoursWeek: toHoursWeeks(row, extras.entries, extras.madeByAssistant, ctx),
    recentLogs: extras.logs.map((log) => ({ personId: log.userId, day: day(log.day), status: log.status })),
    createdByAssistant: extras.createdByAssistant,
  };
}

/** One person's rows for one day. A row is "done" (checked, or an hours goal met), "skipped" or "left". */
export function toTodayRow(row: HabitRowView) {
  return {
    habitId: row.id,
    title: row.title,
    kind: row.kind,
    dueState: row.dueState,
    state: row.doneToday ? "done" : row.skippedToday ? "skipped" : "left",
    carriedFrom: row.carriedFrom ? formatCalendarDate(row.carriedFrom) : null,
    onVacation: row.onVacation,
    skippedThisWeek: row.skippedThisWeek,
    hours: row.hours
      ? {
          doneMinutes: row.hours.done,
          targetMinutes: row.hours.target,
          leftMinutes: Math.max(0, row.hours.target - row.hours.done),
          met: row.hours.met,
        }
      : null,
  };
}

/** The chore chart without names, chips or editing flags: ids, titles, and what this week did to each turn. */
export function toChart(data: ChoreChartData) {
  return {
    personId: data.personId,
    today: data.today,
    defaultWeek: data.defaultWeek.map((d) => ({
      weekday: d.weekday,
      name: d.name,
      chores: d.chores.map((chore) => ({ id: chore.id, title: chore.title })),
    })),
    thisWeek: {
      start: data.thisWeek.start,
      end: data.thisWeek.end,
      days: data.thisWeek.days.map((d) => ({
        weekday: d.weekday,
        name: d.name,
        date: d.date,
        isToday: d.isToday,
        chores: d.chores.map((chore) => ({ id: chore.id, title: chore.title, state: chore.state, tag: chore.tag })),
      })),
    },
  };
}

// ---- Audit copies ----

type Row = Record<string, unknown>;

/** A habit and its participants, as read inside a transaction (the full rows). */
export type HabitSnapshot = { habit: Row & { id: string }; participants: (Row & { id: string })[] };

export function logChange(action: "create" | "delete", row: Row & { id: string }): ChangeInput {
  const copy = toCopy("HabitLog", row);
  return {
    model: "HabitLog",
    recordId: row.id,
    action,
    summary: { habitId: copy.habitId, personId: copy.userId, day: String(copy.day).slice(0, 10), status: copy.status },
    before: action === "delete" ? copy : null,
    after: action === "create" ? copy : null,
  };
}

export function timeEntryChange(action: "create" | "delete", row: Row & { id: string }): ChangeInput {
  const copy = toCopy("HabitTimeEntry", row);
  return {
    model: "HabitTimeEntry",
    recordId: row.id,
    action,
    summary: { habitId: copy.habitId, personId: copy.userId, day: String(copy.day).slice(0, 10), minutes: copy.minutes },
    before: action === "delete" ? copy : null,
    after: action === "create" ? copy : null,
  };
}

/** Columns of the Habit copy that differ, leaving out `updatedAt` (it moves on every write). */
function changedColumns(before: Row, after: Row): string[] {
  return Object.keys(after).filter((key) => key !== "updatedAt" && (before[key] ?? null) !== (after[key] ?? null));
}

/**
 * What a habit write changed, from the rows before and after (null = did not
 * exist): the Habit, then its participants by id. Nothing changed (or only the
 * streak caches, which undo rebuilds instead of restoring) is an empty list.
 */
export function habitChanges(before: HabitSnapshot | null, after: HabitSnapshot | null): ChangeInput[] {
  const out: ChangeInput[] = [];
  const habitBefore = before ? toCopy("Habit", before.habit) : null;
  const habitAfter = after ? toCopy("Habit", after.habit) : null;
  const id = (after ?? before)?.habit.id;
  if (id === undefined) return out;
  if (habitBefore === null && habitAfter !== null) {
    out.push({ model: "Habit", recordId: id, action: "create", summary: { title: habitAfter.title }, before: null, after: habitAfter });
  } else if (habitBefore !== null && habitAfter !== null) {
    const changed = changedColumns(habitBefore, habitAfter);
    if (changed.length > 0) out.push({ model: "Habit", recordId: id, action: "update", summary: { changed }, before: habitBefore, after: habitAfter });
  }
  const had = new Map((before?.participants ?? []).map((row) => [row.id, toCopy("HabitParticipant", row)]));
  const has = new Map((after?.participants ?? []).map((row) => [row.id, toCopy("HabitParticipant", row)]));
  const entry = (action: ChangeInput["action"], recordId: string, b: Row | null, a: Row | null): ChangeInput => ({
    model: "HabitParticipant",
    recordId,
    action,
    summary: { habitId: id, personId: (a ?? b)?.userId },
    before: b,
    after: a,
  });
  for (const [recordId, copy] of has) {
    const old = had.get(recordId);
    if (!old) out.push(entry("create", recordId, null, copy));
    else if (!sameCopy("HabitParticipant", old, copy)) out.push(entry("update", recordId, old, copy));
  }
  for (const [recordId, copy] of had) if (!has.has(recordId)) out.push(entry("delete", recordId, copy, null));
  return out;
}
