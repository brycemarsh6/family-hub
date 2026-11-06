import { calendarDateFromUtcMidnight, formatCalendarDate, startOfMonth, type CalendarDate } from "./householdDate";
import { canLogFor, canNudge, canSeeHabitStats } from "./habits/access";
import { specFromRow, type StoredScheduleFields } from "./habits/habitRows";
import type { DayEntry } from "./habits/perfectDays";
import { compareDays, dueState as dueStateOf, isDayInRange, isSameDay } from "./habits/schedule";
import type { HabitActor, HabitLogDay, ScheduleSpec, Vacation } from "./habits/types";
import {
  carrySince,
  buildTodayRows,
  habitStartDay,
  visibleInViewerOrder,
  type HabitRowView,
  type TodayHabitInput,
} from "./habitsToday";
import {
  monthCalendar,
  perfectDaysInMonth,
  personTotals,
  sideBySideRows,
  weeklySeries,
  type MonthCellState,
  type PersonTotals,
  type SideBySideRow,
  type StatsInput,
} from "./habitsStats";
import {
  HABIT_SCHEDULE_LABELS,
  habitWhoLabel,
  toHabitKind,
  toHabitMode,
  toHabitSchedule,
  toHabitSharing,
  type HabitKind,
  type HabitMode,
  type HabitSharing,
} from "./habitVocabulary";

// The family view and the stats page, built from fetched rows with no
// database: `habitsStatsRead.ts` runs the queries and calls these. The
// stats builder sits here (not in `habitsStats.ts`) so the numbers stay in one
// file and the assembly into plain page data in another. Dates leave this file
// as "YYYY-MM-DD" strings (stats) or plain calendar days (family rows).

/** An active household person, as a family column needs them. */
export type FamilyPerson = { id: string; displayName: string; avatarColor: string };

/** A Today row plus what the family view needs to tick it: `logForId` is whose check a tap writes, `canLog` whether the viewer may. */
export type FamilyRow = HabitRowView & { canLog: boolean; logForId: string };

export type FamilyColumn = FamilyPerson & {
  rows: FamilyRow[];
  /** Rows the person has checked today, out of the rows they owe (skipped rows are in neither number, decision 109). */
  doneCount: number;
  totalCount: number;
};

/** "Done of owed" over rows that are still in play: a skipped row is neither done nor owed (decision 109). One rule for Today and the family view. */
export function doneCounts(rows: readonly Pick<HabitRowView, "doneToday" | "skippedToday">[]): { done: number; total: number } {
  const owed = rows.filter((row) => !row.skippedToday);
  return { done: owed.filter((row) => row.doneToday).length, total: owed.length };
}

/** "3 of 7 done". */
export function doneCountLabel(rows: readonly Pick<HabitRowView, "doneToday" | "skippedToday">[]): string {
  const { done, total } = doneCounts(rows);
  return `${done} of ${total} done`;
}

export type FamilyPage = {
  today: string;
  /** Together habits, once each, above the columns. */
  together: FamilyRow[];
  /** One column per active non-device person, in the order given. */
  columns: FamilyColumn[];
};

/** The row for one participant of a habit, or undefined when the habit is not on that person's Today. */
function rowFor(userId: string, habit: TodayHabitInput, viewer: HabitActor, logs: ReadonlyMap<string, HabitLogDay[]>, today: CalendarDate, vacations: ReadonlyMap<string, readonly Vacation[]>) {
  return buildTodayRows({ userId, role: viewer.role }, [habit], logs, today, vacations)[0];
}

function familyRow(row: HabitRowView, viewer: HabitActor, logForId: string): FamilyRow {
  const access = { isPrivate: row.isPrivate, participantIds: row.participants.map((p) => p.userId) };
  return { ...row, logForId, canLog: canLogFor(viewer, logForId, access) };
}

/**
 * The family page (decision 95). Private and archived habits never appear.
 * Together habits go in the strip (one row each, ticked for the viewer when
 * they are on it, else for the first member); every other habit goes in each
 * participant's column, in that person's own order. `people` are the active
 * non-device people, already ordered.
 */
export function buildFamilyPage(
  viewer: HabitActor,
  habits: readonly TodayHabitInput[],
  people: readonly FamilyPerson[],
  logsByHabit: ReadonlyMap<string, HabitLogDay[]>,
  today: CalendarDate,
  vacationsByUser: ReadonlyMap<string, readonly Vacation[]> = new Map(),
): FamilyPage {
  const shown = habits.filter((habit) => !habit.isPrivate && !habit.archivedAt);
  const together: FamilyRow[] = [];
  for (const habit of [...shown].filter((h) => toHabitSharing(h.sharing) === "together").sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : 1))) {
    const members = habit.participants.filter((p) => !p.user.deactivatedAt);
    const logForId = members.some((p) => p.userId === viewer.userId) ? viewer.userId : members[0]?.userId;
    const row = logForId ? rowFor(logForId, habit, viewer, logsByHabit, today, vacationsByUser) : undefined;
    if (row && logForId) together.push(familyRow(row, viewer, logForId));
  }
  const each = shown.filter((h) => toHabitSharing(h.sharing) === "each");
  const columns = people.map((person): FamilyColumn => {
    // Role is unused for habits that are not private (the only kind in `each`).
    const mine = visibleInViewerOrder({ userId: person.id, role: "kid" }, each);
    const rows = mine.flatMap((habit) => {
      const row = rowFor(person.id, habit, viewer, logsByHabit, today, vacationsByUser);
      return row ? [familyRow(row, viewer, person.id)] : [];
    });
    const { done, total } = doneCounts(rows);
    return { ...person, rows, doneCount: done, totalCount: total };
  });
  return { today: formatCalendarDate(today), together, columns };
}

// ---- The stats page ----

/** One participant of the habit, as the reader fetches them. */
export type StatsMemberInput = {
  userId: string;
  displayName: string;
  avatarColor: string;
  joinedAt: Date;
  deactivatedAt: Date | null;
  currentStreak: number;
  bestStreak: number;
  streakAsOf: Date | null;
};

/** One of the subject's habits, for perfect days: its schedule, the day they started it, and their own checks on it. */
export type PerfectDayHabit = { kind: HabitKind; spec: ScheduleSpec; since: CalendarDate; logs: readonly HabitLogDay[] };

/**
 * Whose numbers the tiles show (decision 94): the viewer when they are an
 * active participant, else (a parent opening a kid's habit) the longest-joined
 * active participant. Null when nobody active is on the habit.
 */
export function statsSubject(viewerId: string, members: readonly Pick<StatsMemberInput, "userId" | "joinedAt" | "deactivatedAt">[]): string | null {
  const active = members.filter((m) => !m.deactivatedAt);
  if (active.some((m) => m.userId === viewerId)) return viewerId;
  const first = [...active].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || (a.userId < b.userId ? -1 : 1))[0];
  return first?.userId ?? null;
}

/**
 * The entries `perfectDaysInRange` reads for one person (decision 71). A habit
 * adds an entry only on days it was scheduled and meant for them: on or after
 * `since` and not on vacation. Open kinds (weekly, monthly) never add one.
 */
export function perfectDayEntries(habits: readonly PerfectDayHabit[], vacations: readonly Vacation[]): (day: CalendarDate) => DayEntry[] {
  return (day) => {
    if (vacations.some((vacation) => isDayInRange(day, vacation))) return [];
    return habits.flatMap((habit) => {
      if (compareDays(day, habit.since) < 0) return [];
      const state = dueStateOf(habit.spec, day, false);
      if (state === "none") return [];
      const log = habit.logs.find((entry) => isSameDay(entry.day, day));
      return [{ kind: habit.kind, state, status: log?.status ?? null }];
    });
  };
}

/** Stats-page data for C3: plain values, days as "YYYY-MM-DD". */
export type HabitStatsData = {
  habit: { id: string; title: string; icon: string | null; kind: HabitKind; mode: HabitMode; sharing: HabitSharing; isPrivate: boolean; archived: boolean; scheduleLabel: string; whoLabel: string };
  today: string;
  /** The 1st of the month the calendar shows. */
  month: string;
  viewerId: string;
  /** Whose numbers the tiles and the month calendar show. */
  subjectId: string;
  /** The subject's display name, for "Emily's numbers" when a parent opens a kid's habit. */
  subjectName: string;
  tiles: PersonTotals;
  calendar: { first: string; leading: number; cells: { day: string; state: MonthCellState; tappable: boolean }[] };
  /** Whether the viewer may tap the calendar's days (`canLogFor` the subject). */
  canTap: boolean;
  perfectDays: number;
  /** Side by side habits only (more than one active person), else null. */
  sideBySide: { rows: SideBySideRow[]; weekly: { weeks: string[]; axisMax: number; people: { userId: string; displayName: string; avatarColor: string; counts: number[] }[] } } | null;
  /** Who the viewer can nudge today (decision 97), with whether they already did. Empty on the tablet and for private, archived or non-Side-by-side habits. */
  nudgeable: { userId: string; displayName: string; nudged: boolean }[];
};

export type StatsBuildInput = {
  viewer: HabitActor;
  habit: StoredScheduleFields & {
    id: string;
    title: string;
    icon: string | null;
    kind: string;
    mode: string;
    sharing: string;
    isPrivate: boolean;
    everyone: boolean;
    archivedAt: Date | null;
    createdAt: Date;
  };
  members: readonly StatsMemberInput[];
  /** Every check on this habit, all participants, all time. */
  logs: readonly HabitLogDay[];
  vacationsByUser: ReadonlyMap<string, readonly Vacation[]>;
  /** The subject's habits for perfect days (this one included), their own checks for the month shown. */
  subjectHabits: readonly PerfectDayHabit[];
  /** The people the viewer already nudged about this habit today. */
  nudgedToday: readonly string[];
  today: CalendarDate;
  /** Any day in the month to show. */
  month: CalendarDate;
};

/** The whole stats page, or null when the viewer may not open it, the schedule cannot be read, or nobody active is on the habit. */
export function buildStatsData(input: StatsBuildInput): HabitStatsData | null {
  const { viewer, habit, members, today } = input;
  const access = { isPrivate: habit.isPrivate, participantIds: members.map((m) => m.userId) };
  const spec = specFromRow(habit);
  const subjectId = statsSubject(viewer.userId, members);
  if (!canSeeHabitStats(viewer, access) || !spec || !subjectId) return null;
  const startDay = habitStartDay(habit.createdAt);
  const stats: StatsInput = {
    spec,
    today,
    logs: input.logs,
    vacationsByUser: input.vacationsByUser,
    people: [...members]
      .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || (a.userId < b.userId ? -1 : 1))
      .map((m) => ({
        userId: m.userId,
        displayName: m.displayName,
        avatarColor: m.avatarColor,
        since: carrySince(m.joinedAt, startDay),
        deactivated: m.deactivatedAt !== null,
        cache: { current: m.currentStreak, best: m.bestStreak, asOf: m.streakAsOf ? calendarDateFromUtcMidnight(m.streakAsOf) : null },
      })),
  };
  const tiles = personTotals(stats, subjectId)!;
  const calendar = monthCalendar(stats, subjectId, input.month)!;
  const perfect = perfectDaysInMonth(input.month, today, perfectDayEntries(input.subjectHabits, input.vacationsByUser.get(subjectId) ?? []));
  const sharing = toHabitSharing(habit.sharing);
  const active = stats.people.filter((p) => !p.deactivated);
  const sideBySide =
    sharing === "each" && active.length > 1
      ? (() => {
          const weekly = weeklySeries(stats);
          return { rows: sideBySideRows(stats), weekly: { ...weekly, weeks: weekly.weeks.map(formatCalendarDate) } };
        })()
      : null;
  const nudgeHabit = { ...access, sharing, archived: habit.archivedAt !== null };
  const doneByToday = new Set(input.logs.filter((log) => isSameDay(log.day, today)).map((log) => log.userId));
  const nudgeable = active
    .filter((p) => canNudge(viewer, nudgeHabit, p.userId) && !doneByToday.has(p.userId))
    .map((p) => ({ userId: p.userId, displayName: p.displayName, nudged: input.nudgedToday.includes(p.userId) }));
  return {
    habit: {
      id: habit.id,
      title: habit.title,
      icon: habit.icon,
      kind: toHabitKind(habit.kind),
      mode: toHabitMode(habit.mode),
      sharing,
      isPrivate: habit.isPrivate,
      archived: habit.archivedAt !== null,
      scheduleLabel: HABIT_SCHEDULE_LABELS[toHabitSchedule(habit.schedule)],
      whoLabel: habitWhoLabel({ people: members.length, everyone: habit.everyone, sharing: habit.sharing }),
    },
    today: formatCalendarDate(today),
    month: formatCalendarDate(startOfMonth(input.month)),
    viewerId: viewer.userId,
    subjectId,
    subjectName: members.find((m) => m.userId === subjectId)?.displayName ?? "",
    tiles,
    calendar: {
      first: formatCalendarDate(calendar.first),
      leading: calendar.leading,
      cells: calendar.cells.map((cell) => ({ day: formatCalendarDate(cell.day), state: cell.state, tappable: cell.tappable })),
    },
    canTap: canLogFor(viewer, subjectId, access),
    perfectDays: perfect.length,
    sideBySide,
    nudgeable,
  };
}
