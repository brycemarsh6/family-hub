import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import {
  addCalendarDays,
  calendarDateFromUtcMidnight,
  calendarDaysBetween,
  calendarDateInZone,
  startOfMonth,
  type CalendarDate,
} from "./householdDate";
import { canSeeHabit } from "./habits/access";
import { CARRY_LOOKBACK_DAYS, carriedFrom as carriedDay } from "./habits/carryOver";
import { logsForUser, specFromRow, type StoredScheduleFields } from "./habits/habitRows";
import { windowProgress, type WindowProgress } from "./habits/progress";
import { compareDays, dueState as dueStateOf, isOpenKind, isSameDay } from "./habits/schedule";
import { streakAfter } from "./habits/streaks";
import type { DueState, HabitActor, HabitLogDay, ScheduleSpec, Vacation } from "./habits/types";
import type { HabitRowState, HabitMemberState } from "./habitChanges";
import {
  isCheckStatus,
  streakLabel,
  toHabitKind,
  toHabitMode,
  toHabitSharing,
  toTimeOfDay,
  type HabitKind,
  type HabitMode,
  type HabitSharing,
  type StreakUnit,
  type TimeOfDay,
} from "./habitVocabulary";

// The Today page's rules, with no database: `habitsRead.ts` fetches the rows
// and logs, and this file decides who sees what, in which order, and what each
// row says. Callers pass `today`, so every rule can be tested.

/** One participant on a Today row: the reducer's state plus who they are. */
export type HabitMemberView = HabitMemberState & {
  displayName: string;
  avatarColor: string;
  /** The person's streak today (decision 98): the cached number aged by `streakAfter`. */
  streak: number;
  /** "12 days", or null below 2 (the unit follows the habit's schedule). */
  streakLabel: string | null;
};

/**
 * One Today row. Extends `HabitRowState` (habitChanges.ts) so the list can
 * feed it straight into `applyHabitChange`; `doneToday` / `skippedToday` are
 * the viewer's own. `participants` is everyone active on the habit (an Each
 * habit shows each one's state), in joined order.
 */
export type HabitRowView = Omit<HabitRowState, "participants"> & {
  title: string;
  icon: string | null;
  kind: HabitKind;
  mode: HabitMode;
  timeOfDay: TimeOfDay | null;
  lifeArea: string | null;
  isPrivate: boolean;
  /** Made with the Everyone button (decision 87); the row says "Everyone" instead of "Together". */
  everyone: boolean;
  /** Required, open or none today; a "none" row only appears when carried or already checked or skipped. */
  dueState: DueState;
  /** The missed day this row stands for (carry-over), else null. A tap for it is written "late". */
  carriedFrom: CalendarDate | null;
  /** The viewer's count in this period (decision 85's start day included); null if the schedule cannot be read. */
  progress: WindowProgress | null;
  /** What the streak counts: days, weeks or months. */
  streakUnit: StreakUnit;
  /** The viewer's own streak and its label (decision 98). */
  streak: number;
  streakLabel: string | null;
  participants: HabitMemberView[];
};

/** One habit in the manager (active or archived), with every field the edit form pre-fills. */
export type HabitManagerItem = {
  id: string;
  title: string;
  icon: string | null;
  kind: HabitKind;
  mode: HabitMode;
  lifeArea: string | null;
  timeOfDay: TimeOfDay | null;
  schedule: string;
  weekdays: string | null;
  times: number | null;
  anchorWeek: CalendarDate | null;
  carryOver: boolean;
  sharing: HabitSharing;
  isPrivate: boolean;
  /** Made with the Everyone button (decision 87). */
  everyone: boolean;
  archived: boolean;
  participantIds: string[];
};

export type TodayPage = {
  /** Today's rows in the viewer's own order (done rows are NOT moved: the list sorts on load). */
  rows: HabitRowView[];
  /** Active habits the viewer takes part in, in the viewer's order. */
  manage: HabitManagerItem[];
  /** Archived habits the viewer took part in, newest archived first. */
  archived: HabitManagerItem[];
};

/** A habit as the reader fetches it: the columns below plus its participants (a Prisma row fits). */
export type TodayHabitInput = StoredScheduleFields & {
  id: string;
  title: string;
  icon: string | null;
  kind: string;
  mode: string;
  timeOfDay: string | null;
  lifeArea: string | null;
  sharing: string;
  isPrivate: boolean;
  everyone: boolean;
  carryOver: boolean;
  createdAt: Date;
  archivedAt: Date | null;
  participants: {
    userId: string;
    sortOrder: number;
    joinedAt: Date;
    /** The cached streak columns (a Prisma row fits); left off means no streak yet. */
    currentStreak?: number;
    bestStreak?: number;
    streakAsOf?: Date | null;
    user: { displayName: string; avatarColor: string; deactivatedAt: Date | null };
  }[];
};

/** What a habit's streak counts: months for monthly, weeks for the other open kinds, else days. */
export function streakUnitOf(spec: ScheduleSpec | null): StreakUnit {
  if (!spec || !isOpenKind(spec)) return "days";
  return spec.schedule === "monthly" ? "months" : "weeks";
}

/**
 * The streak to show today: the cached number aged forward by `streakAfter`
 * (display only; the cache itself is written by `habitWrites.ts`). Zero when
 * the schedule cannot be read.
 */
export function displayStreak(
  spec: ScheduleSpec | null,
  cache: { current: number; best: number; asOf: CalendarDate | null },
  vacations: readonly Vacation[],
  today: CalendarDate,
): number {
  return spec ? streakAfter(spec, cache, vacations, today).current : 0;
}

/**
 * True when the day is finished for the confetti (decision 76): at least one
 * row is required today and every required row is done or skipped. A row that
 * is only open, or only carried, does not count either way.
 */
export function allRequiredDoneToday(rows: readonly Pick<HabitRowView, "dueState" | "doneToday" | "skippedToday">[]): boolean {
  const required = rows.filter((row) => row.dueState === "required");
  return required.length > 0 && required.every((row) => row.doneToday || row.skippedToday);
}

/** The first day of checks the page needs: fourteen days back, or the 1st of the month when earlier so a monthly count is whole. */
export function todayLogsFrom(today: CalendarDate): CalendarDate {
  const lookback = addCalendarDays(today, -CARRY_LOOKBACK_DAYS);
  const monthStart = startOfMonth(today);
  return compareDays(monthStart, lookback) < 0 ? monthStart : lookback;
}

/** The household day a habit was made: decision 85's first-week start, and the earliest day it can carry over from. */
export function habitStartDay(createdAt: Date): CalendarDate {
  return calendarDateInZone(createdAt, HOUSEHOLD_TIME_ZONE);
}

/**
 * The first day a person can have missed on a habit: the later of the day the
 * habit was made and the day they joined it (`joinedAt` unknown means the
 * habit's own start). The one `since` for carry-over.
 */
export function carrySince(joinedAt: Date | null | undefined, startDay: CalendarDate): CalendarDate {
  const joinedDay = joinedAt ? calendarDateInZone(joinedAt, HOUSEHOLD_TIME_ZONE) : startDay;
  return compareDays(joinedDay, startDay) > 0 ? joinedDay : startDay;
}

/**
 * Whether every requested participant may be saved: an active household person,
 * or someone already on the habit (a person turned off since keeps their place
 * until someone removes them, so saving the habit never fails over them).
 */
export function participantsAllowed(
  requested: readonly string[],
  household: readonly string[],
  alreadyOnHabit: readonly string[] = [],
): boolean {
  if (requested.length === 0) return false;
  const allowed = new Set([...household, ...alreadyOnHabit]);
  return requested.every((id) => allowed.has(id));
}

/** The habits the viewer takes part in and may see (`canSeeHabit`), in the viewer's own order, oldest first on a tie. */
export function visibleInViewerOrder(viewer: HabitActor, habits: readonly TodayHabitInput[]): TodayHabitInput[] {
  const sortOrderOf = (habit: TodayHabitInput) => habit.participants.find((p) => p.userId === viewer.userId)?.sortOrder ?? 0;
  return habits
    .filter((habit) => habit.participants.some((p) => p.userId === viewer.userId))
    .filter((habit) => canSeeHabit(viewer, { isPrivate: habit.isPrivate, participantIds: habit.participants.map((p) => p.userId) }))
    .sort((a, b) => sortOrderOf(a) - sortOrderOf(b) || a.createdAt.getTime() - b.createdAt.getTime());
}

/** Today's rows for the live habits, in the order given. A "none" row stays out unless carried, done or skipped. */
export function buildTodayRows(
  viewer: HabitActor,
  live: readonly TodayHabitInput[],
  logsByHabit: ReadonlyMap<string, HabitLogDay[]>,
  today: CalendarDate,
  vacationsByUser: ReadonlyMap<string, readonly Vacation[]> = new Map(),
): HabitRowView[] {
  const rows: HabitRowView[] = [];
  for (const habit of live) {
    const logs = logsByHabit.get(habit.id) ?? [];
    const mine = logsForUser(logs, viewer.userId);
    const spec = specFromRow(habit);
    const startDay = habitStartDay(habit.createdAt);
    const since = carrySince(habit.participants.find((p) => p.userId === viewer.userId)?.joinedAt, startDay);
    const progress = spec ? windowProgress(spec, mine, today, startDay) : null;
    const carriedFrom = spec ? carriedDay(spec, habit.carryOver, mine, today, since) : null;
    const dueState: DueState = spec ? dueStateOf(spec, today, false, progress?.count ?? 0) : "required";
    const todayOf = (userId: string) => logs.find((log) => log.userId === userId && isSameDay(log.day, today));
    // Oldest member first, then by id: the same order for every viewer and every load.
    const unit = streakUnitOf(spec);
    const streakOf = (p: TodayHabitInput["participants"][number]) =>
      displayStreak(
        spec,
        {
          current: p.currentStreak ?? 0,
          best: p.bestStreak ?? 0,
          asOf: p.streakAsOf ? calendarDateFromUtcMidnight(p.streakAsOf) : null,
        },
        vacationsByUser.get(p.userId) ?? [],
        today,
      );
    const members: HabitMemberView[] = [...habit.participants]
      .filter((p) => !p.user.deactivatedAt)
      .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0))
      .map((p) => {
        const log = todayOf(p.userId);
        const streak = streakOf(p);
        return {
          userId: p.userId,
          displayName: p.user.displayName,
          avatarColor: p.user.avatarColor,
          done: log ? isCheckStatus(log.status) : false,
          skipped: log?.status === "skipped",
          streak,
          streakLabel: streakLabel(streak, unit),
        };
      });
    const viewerPart = habit.participants.find((p) => p.userId === viewer.userId);
    const viewerStreak = viewerPart ? streakOf(viewerPart) : 0;
    const me = todayOf(viewer.userId);
    const doneToday = me ? isCheckStatus(me.status) : false;
    const skippedToday = me?.status === "skipped";
    if (dueState === "none" && !carriedFrom && !doneToday && !skippedToday) continue;
    rows.push({
      id: habit.id,
      sharing: toHabitSharing(habit.sharing),
      viewerId: viewer.userId,
      doneToday,
      skippedToday,
      participants: members,
      title: habit.title,
      icon: habit.icon,
      kind: toHabitKind(habit.kind),
      mode: toHabitMode(habit.mode),
      timeOfDay: toTimeOfDay(habit.timeOfDay),
      lifeArea: habit.lifeArea,
      isPrivate: habit.isPrivate,
      everyone: habit.everyone,
      dueState,
      carriedFrom,
      progress,
      streakUnit: unit,
      streak: viewerStreak,
      streakLabel: streakLabel(viewerStreak, unit),
    });
  }
  return rows;
}

export function managerItem(habit: TodayHabitInput): HabitManagerItem {
  return {
    id: habit.id,
    title: habit.title,
    icon: habit.icon,
    kind: toHabitKind(habit.kind),
    mode: toHabitMode(habit.mode),
    lifeArea: habit.lifeArea,
    timeOfDay: toTimeOfDay(habit.timeOfDay),
    schedule: habit.schedule,
    weekdays: habit.weekdays,
    times: habit.times,
    anchorWeek: habit.anchorWeek ? calendarDateFromUtcMidnight(habit.anchorWeek) : null,
    carryOver: habit.carryOver,
    sharing: toHabitSharing(habit.sharing),
    isPrivate: habit.isPrivate,
    everyone: habit.everyone,
    archived: habit.archivedAt !== null,
    participantIds: habit.participants.map((p) => p.userId),
  };
}

/** The whole page from the fetched habits (those the viewer takes part in) and their checks. */
export function buildTodayPage(
  viewer: HabitActor,
  habits: readonly TodayHabitInput[],
  logsByHabit: ReadonlyMap<string, HabitLogDay[]>,
  today: CalendarDate,
  vacationsByUser: ReadonlyMap<string, readonly Vacation[]> = new Map(),
): TodayPage {
  const visible = visibleInViewerOrder(viewer, habits);
  const live = visible.filter((habit) => !habit.archivedAt);
  return {
    rows: buildTodayRows(viewer, live, logsByHabit, today, vacationsByUser),
    manage: live.map(managerItem),
    archived: visible
      .filter((habit) => habit.archivedAt)
      .sort((a, b) => b.archivedAt!.getTime() - a.archivedAt!.getTime())
      .map(managerItem),
  };
}

/** How far back any tap may reach on its own; a carried day may be older (up to the carry-over lookback). */
export const TAP_DAYS_BACK = 7;

/**
 * Whether a tap for `day` is allowed: never in the future, never past the
 * carry-over lookback, and older than a week only when it is exactly the
 * carried day the Today row stands for (`carried`, the server's own answer).
 */
export function isTapDayAllowed(day: CalendarDate, today: CalendarDate, carried: CalendarDate | null): boolean {
  const ago = calendarDaysBetween(day, today);
  if (ago < 0 || ago > CARRY_LOOKBACK_DAYS) return false;
  return ago <= TAP_DAYS_BACK || (carried !== null && isSameDay(day, carried));
}
