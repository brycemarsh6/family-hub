import {
  addCalendarDays,
  calendarDateFromUtcMidnight,
  startOfMonth,
  type CalendarDate,
} from "./householdDate";
import { canSeeHabit } from "./habits/access";
import { CARRY_LOOKBACK_DAYS, carriedFrom as carriedDay, carrySince, habitStartDay } from "./habits/carryOver";
import { logsForUser, specFromRow, type StoredScheduleFields } from "./habits/habitRows";
import { windowProgress, type WindowProgress } from "./habits/progress";
import { isPlannedToday, plannedLaterLabel } from "./habits/planPrompts";
import { compareDays, dayInVacation, dueState as dueStateOf, isSameDay } from "./habits/schedule";
import { displayStreak, streakUnitOf, type StreakCache } from "./habits/streaks";
import type { DueState, HabitActor, HabitLogDay, Vacation } from "./habits/types";
import { isExcusedAllDay, weekChange, type ExcusableRow, type StoredWeekOverride } from "./habits/weekOverrides";
import { choreHeader } from "./choreChart";
import { buildTodayPrompts, type TodayPrompt } from "./habitsPrompts";
import { SHORT_DAY_NAMES } from "./mealPlanDates";
import type { HabitRowState, HabitMemberState } from "./habitChanges";
import {
  choreTagLabel,
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
  /** The viewer planned this habit for today (decision 145): the row is required and its meta says so. */
  plannedToday: boolean;
  /** "Planned for Sat" when the viewer planned a later day this period (decision 162), else null; also null once the period target is met (decision 160). */
  plannedLater: string | null;
  /** Due today but the viewer is on vacation (decision 115): excused, muted, the check still works. */
  onVacation: boolean;
  /** A chore skipped for this week only (decision 117): excused like a vacation row. */
  skippedThisWeek: boolean;
  /** The chart's tag for today ("Moved to Thu", "This week only", "Skipped this week"), else null. */
  weekTag: string | null;
  /** The viewer's own streak and its label (decision 98); a chore's label is always null (decision 120). */
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

/** An unseen nudge for today (decision 96): "Emily nudged you about Morning Prayers". */
export type TodayNudge = { id: string; fromName: string; habitTitle: string };

export type TodayPage = {
  /** Today's rows in the viewer's own order (done rows are NOT moved: the list sorts on load). */
  rows: HabitRowView[];
  /** Active habits the viewer takes part in, in the viewer's order. */
  manage: HabitManagerItem[];
  /** Archived habits the viewer took part in, newest archived first. */
  archived: HabitManagerItem[];
  /** The viewer's unseen nudges for today, oldest first. */
  nudges: TodayNudge[];
  /** The habits asking "what day will you do it?" today, with their chips (decisions 39, 142); empty off a prompt day. */
  prompts: TodayPrompt[];
  /** True when every required row is done or skipped (decision 76); the page fires the confetti once a day. */
  confetti: boolean;
  /** The viewer's chore streak, the Sunday shout-out and the end of their current vacation ("YYYY-MM-DD"): `ChoreHeader` in choreChart.ts. */
  choreStreak: number;
  shoutOut: boolean;
  vacationThrough: string | null;
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
  /** This week's changes to a weekdays chore (`ChoreWeekOverride` rows fit); left off means none. */
  weekOverrides?: StoredWeekOverride[];
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

/**
 * True when the day is finished for the confetti (decision 76): at least one
 * row is required today and every required row is done or skipped. A row that
 * is only open, only carried, or excused by a vacation or a week skip does not
 * count either way.
 */
export function allRequiredDoneToday(rows: readonly (ExcusableRow & Pick<HabitRowView, "dueState">)[]): boolean {
  const required = rows.filter((row) => row.dueState === "required" && !isExcusedAllDay(row));
  return required.length > 0 && required.every((row) => row.doneToday || row.skippedToday);
}

/** The first day of checks the page needs: fourteen days back, or the 1st of the month when earlier so a monthly count is whole. */
export function todayLogsFrom(today: CalendarDate): CalendarDate {
  const lookback = addCalendarDays(today, -CARRY_LOOKBACK_DAYS);
  const monthStart = startOfMonth(today);
  return compareDays(monthStart, lookback) < 0 ? monthStart : lookback;
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
  plannedByHabit: ReadonlyMap<string, readonly CalendarDate[]> = new Map(),
): HabitRowView[] {
  const rows: HabitRowView[] = [];
  for (const habit of live) {
    const logs = logsByHabit.get(habit.id) ?? [];
    const mine = logsForUser(logs, viewer.userId);
    const spec = specFromRow(habit);
    const startDay = habitStartDay(habit.createdAt);
    const since = carrySince(habit.participants.find((p) => p.userId === viewer.userId)?.joinedAt, startDay);
    const progress = spec ? windowProgress(spec, mine, today, startDay) : null;
    const change = weekChange(spec, habit.weekOverrides, today);
    const plannedToday = isPlannedToday(plannedByHabit.get(habit.id) ?? [], today);
    const dueState: DueState = change.state ? (change.state === "none" ? "none" : "required") : spec ? dueStateOf(spec, today, plannedToday, progress?.count ?? 0) : "required";
    const onVacation = dueState === "required" && dayInVacation(today, vacationsByUser.get(viewer.userId) ?? []);
    const chore = toHabitKind(habit.kind) === "chore";
    const carried = spec ? carriedDay(spec, habit.carryOver, mine, today, since) : null;
    const carriedFrom = carried && change.stateOn(carried) !== "required" ? null : carried; // a day this week's changes took away is not carried
    const todayOf = (userId: string) => logs.find((log) => log.userId === userId && isSameDay(log.day, today));
    const unit = streakUnitOf(spec);
    const streakOf = (p: TodayHabitInput["participants"][number]) => {
      const cache = { current: p.currentStreak ?? 0, best: p.bestStreak ?? 0, asOf: p.streakAsOf ? calendarDateFromUtcMidnight(p.streakAsOf) : null };
      return displayStreak(spec, cache, vacationsByUser.get(p.userId) ?? [], today);
    };
    // A chore shows no flame of its own (decision 120); the header carries the chore streak.
    const labelOf = (n: number) => (chore ? null : streakLabel(n, unit));
    // Oldest member first, then by id: the same order for every viewer and every load.
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
          streakLabel: labelOf(streak),
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
      plannedToday,
      plannedLater: spec && dueState !== "none" ? plannedLaterLabel(spec, today, plannedByHabit.get(habit.id) ?? [], SHORT_DAY_NAMES) : null,
      onVacation,
      skippedThisWeek: change.state === "excused",
      weekTag: change.tag ? choreTagLabel(change.tag, SHORT_DAY_NAMES) : null,
      streakUnit: unit,
      streak: viewerStreak,
      streakLabel: labelOf(viewerStreak),
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
  nudges: readonly TodayNudge[] = [],
  choreCache: StreakCache = { current: 0, best: 0, asOf: null },
  plannedByHabit: ReadonlyMap<string, readonly CalendarDate[]> = new Map(),
): TodayPage {
  const visible = visibleInViewerOrder(viewer, habits);
  const live = visible.filter((habit) => !habit.archivedAt);
  const rows = buildTodayRows(viewer, live, logsByHabit, today, vacationsByUser, plannedByHabit);
  return {
    rows,
    prompts: buildTodayPrompts(viewer, live, logsByHabit, plannedByHabit, today, vacationsByUser.get(viewer.userId) ?? []),
    nudges: [...nudges],
    confetti: allRequiredDoneToday(rows),
    ...choreHeader(viewer.userId, visible, logsByHabit, today, vacationsByUser.get(viewer.userId) ?? [], choreCache),
    manage: live.map(managerItem),
    archived: visible
      .filter((habit) => habit.archivedAt)
      .sort((a, b) => b.archivedAt!.getTime() - a.archivedAt!.getTime())
      .map(managerItem),
  };
}
