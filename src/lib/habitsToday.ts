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
import { compareDays, dueState as dueStateOf, isSameDay } from "./habits/schedule";
import type { DueState, HabitActor, HabitLogDay } from "./habits/types";
import type { HabitRowState, HabitMemberState } from "./habitChanges";
import {
  isCheckStatus,
  toHabitKind,
  toHabitMode,
  toHabitSharing,
  toTimeOfDay,
  type HabitKind,
  type HabitMode,
  type HabitSharing,
  type TimeOfDay,
} from "./habitVocabulary";

// The Today page's rules, with no database: `habitsRead.ts` fetches the rows
// and logs, and this file decides who sees what, in which order, and what each
// row says. Callers pass `today`, so every rule can be tested.

/** One participant on a Today row: the reducer's state plus who they are. */
export type HabitMemberView = HabitMemberState & { displayName: string; avatarColor: string };

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
    user: { displayName: string; avatarColor: string; deactivatedAt: Date | null };
  }[];
};

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
    const members: HabitMemberView[] = habit.participants
      .filter((p) => !p.user.deactivatedAt)
      .map((p) => {
        const log = todayOf(p.userId);
        return {
          userId: p.userId,
          displayName: p.user.displayName,
          avatarColor: p.user.avatarColor,
          done: log ? isCheckStatus(log.status) : false,
          skipped: log?.status === "skipped",
        };
      });
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
): TodayPage {
  const visible = visibleInViewerOrder(viewer, habits);
  const live = visible.filter((habit) => !habit.archivedAt);
  return {
    rows: buildTodayRows(viewer, live, logsByHabit, today),
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
