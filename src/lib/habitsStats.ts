import { addCalendarDays, calendarDaysBetween, dayOfWeek, startOfMonth, startOfWeek, type CalendarDate } from "./householdDate";
import { perfectDaysInRange, type DayEntry } from "./habits/perfectDays";
import {
  compareDays,
  dayInVacation,
  isDayInRange,
  isOpenKind,
  isSameDay,
  periodTarget,
  periodsInRange,
} from "./habits/schedule";
import { displayStreak, streakUnitOf, type StreakCache } from "./habits/streaks";
import type { HabitLogDay, ScheduleSpec, Vacation, WeekOverride } from "./habits/types";
import { choreDayState, choreTag } from "./habits/weekOverrides";
import { FULL_MONTH_NAMES } from "./mealPlanDates";
import { isTapDayAllowed } from "./habits/carryOver";
import { isCheckStatus, streakLabel, type StreakUnit, type Weekday } from "./habitVocabulary";

// The stats page's rules, with no database: `habitsRead.ts` (or a stats
// reader) fetches the habit, its logs and vacations, and this file works out
// the numbers, the month calendar, the side by side table and the weekly
// series. Callers pass `today`, so every rule can be tested.

/** The weeks the chart shows, ending with the week that holds today (decision 104). */
export const STATS_WEEKS = 6;

/** A week holds seven days, so the chart's one shared axis runs 0 to 7. */
export const STATS_WEEK_AXIS_MAX = 7;

/** One person on a habit, as the stats rules need them. `since` is the later of the habit's start and their join day. */
export type StatsPerson = {
  userId: string;
  displayName: string;
  avatarColor: string;
  since: CalendarDate;
  deactivated: boolean;
  /** The cached streak columns (`streakAsOf` already a calendar day). */
  cache: StreakCache;
};

/** Everything the rules read about one habit. `logs` carry `userId`; `vacationsByUser` is keyed the same way. */
export type StatsInput = {
  spec: ScheduleSpec;
  people: readonly StatsPerson[];
  logs: readonly HabitLogDay[];
  vacationsByUser: ReadonlyMap<string, readonly Vacation[]>;
  /** The chore's "this week only" changes (decision 117), all people; none for a habit. */
  overrides?: readonly WeekOverride[];
  today: CalendarDate;
};

function personOf(input: StatsInput, userId: string): StatsPerson | undefined {
  return input.people.find((person) => person.userId === userId);
}

function logsOf(input: StatsInput, userId: string): HabitLogDay[] {
  return input.logs.filter((log) => log.userId === userId);
}

function vacationsOf(input: StatsInput, userId: string): readonly Vacation[] {
  return input.vacationsByUser.get(userId) ?? [];
}

/** The streak tile's unit follows the habit (decision 94). */
export function statsStreakUnit(input: Pick<StatsInput, "spec">): StreakUnit {
  return streakUnitOf(input.spec);
}

export type PersonTotals = {
  userId: string;
  /** Today's streak: the cache aged by `streakAfter`. */
  current: number;
  best: number;
  /** Checks that count as done (on time or late). */
  total: number;
  unit: StreakUnit;
};

/** One person's three tiles. `best` is never below `current`. */
export function personTotals(input: StatsInput, userId: string): PersonTotals | null {
  const person = personOf(input, userId);
  if (!person) return null;
  const current = displayStreak(input.spec, person.cache, vacationsOf(input, userId), input.today);
  return {
    userId,
    current,
    best: Math.max(person.cache.best, current),
    total: logsOf(input, userId).filter((log) => isCheckStatus(log.status)).length,
    unit: statsStreakUnit(input),
  };
}

export type MonthCellState = "done" | "late" | "skipped" | "missed" | "today" | "future" | "notDue";

/** Why a day without a check reads as it does (decision 170): it feeds the spoken label. */
export type CellReason = { kind: "vacation" } | { kind: "weekSkip" } | { kind: "movedAway"; toWeekday: Weekday };

export type MonthCell = {
  day: CalendarDate;
  state: MonthCellState;
  /** Set on an undone vacation or week-skipped day ("skipped") and on a moved-away day ("notDue"); else null. */
  reason: CellReason | null;
  /** A tap may write this day: within `TAP_DAYS_BACK` and never in the future. */
  tappable: boolean;
};

export type MonthCalendar = {
  /** The 1st of the month shown. */
  first: CalendarDate;
  /** Blank cells before the 1st in a Sunday-first grid. */
  leading: number;
  cells: MonthCell[];
};

/**
 * The month containing `inMonth`, one cell per day. A check wins over
 * everything (done, late or skipped, today included). With no check: after
 * today is "future" and an earlier day is "missed" when the person was meant
 * to do it (a due day on or after `since`) and "notDue" otherwise. A due day
 * that is undone and on vacation or skipped for the week is "skipped" (today
 * too, since it is excused all day; decision 170), and a chore's moved-away
 * day is "notDue" while its moved-to day is due. Open kinds (weekly, monthly)
 * have no scheduled day, so an unchecked past day is "notDue".
 */
export function monthCalendar(input: StatsInput, userId: string, inMonth: CalendarDate): MonthCalendar | null {
  const person = personOf(input, userId);
  if (!person) return null;
  const first = startOfMonth(inMonth);
  const logs = logsOf(input, userId);
  const vacations = vacationsOf(input, userId);
  const overrides = input.overrides ?? [];
  const cells: MonthCell[] = [];
  for (let day = first; day.month === first.month; day = addCalendarDays(day, 1)) {
    const log = logs.find((entry) => isSameDay(entry.day, day));
    const ahead = compareDays(day, input.today) > 0;
    const tag = choreTag(input.spec, overrides, day);
    const dueDay = choreDayState(input.spec, overrides, day);
    // A day before the person joined the habit was never theirs.
    const meant = dueDay !== "none" && compareDays(day, person.since) >= 0;
    let state: MonthCellState;
    let reason: CellReason | null = null;
    if (log) state = log.status;
    else if (ahead) state = "future";
    else if (meant && (dueDay === "excused" || dayInVacation(day, vacations))) {
      state = "skipped";
      reason = dayInVacation(day, vacations) ? { kind: "vacation" } : { kind: "weekSkip" };
    } else if (isSameDay(day, input.today)) state = "today";
    else state = meant ? "missed" : "notDue";
    if (!log && !meant && tag?.kind === "moved-away") reason = { kind: "movedAway", toWeekday: tag.toWeekday };
    cells.push({ day, state, reason, tappable: isTapDayAllowed(day, input.today, null) && compareDays(day, person.since) >= 0 });
  }
  return { first, leading: dayOfWeek(first), cells };
}

/** The stats calendar title: the month name, plus the year only outside the current year (decision 112). */
export function statsMonthTitle(year: number, month: number, todayYear: number): string {
  const name = FULL_MONTH_NAMES[month - 1];
  return year === todayYear ? name : `${name} ${year}`;
}

/** Whole percent, or null when nothing has been due yet. */
function wholePercent(done: number, due: number): number | null {
  return due === 0 ? null : Math.round((done / due) * 100);
}

/**
 * The share of due days (or due periods' checks, for open kinds) a person
 * completed since they joined. Skipped days, undone vacation days and a chore's
 * undone week-skipped days are not due; its moved-away day is not due and its
 * moved-to day is (decision 170). Today
 * (or the current period) counts only once it is done, because it is not over.
 */
export function completionRate(input: StatsInput, userId: string): number | null {
  const person = personOf(input, userId);
  if (!person) return null;
  const { spec, today } = input;
  const checks = logsOf(input, userId);
  const doneOn = (day: CalendarDate) => checks.some((log) => isSameDay(log.day, day) && isCheckStatus(log.status));
  const skippedOn = (day: CalendarDate) => checks.some((log) => isSameDay(log.day, day) && log.status === "skipped");
  const vacations = vacationsOf(input, userId);
  let done = 0;
  let due = 0;
  if (!isOpenKind(spec)) {
    const overrides = input.overrides ?? [];
    for (let day = person.since; compareDays(day, today) <= 0; day = addCalendarDays(day, 1)) {
      const dueDay = choreDayState(spec, overrides, day);
      if (dueDay === "none") continue;
      const finished = doneOn(day);
      // A day done on vacation or skipped for the week counts as due and done (decisions 127, 130); only an undone one is skipped.
      if (skippedOn(day) || ((dueDay === "excused" || dayInVacation(day, vacations)) && !finished)) continue;
      if (isSameDay(day, today) && !finished) continue;
      due++;
      if (finished) done++;
    }
    return wholePercent(done, due);
  }
  for (const period of periodsInRange(spec, person.since, today)) {
    const target = periodTarget(spec, period.start);
    const count = checks.filter((log) => isCheckStatus(log.status) && isDayInRange(log.day, period)).length;
    if (isDayInRange(today, period) && count < target) continue;
    due += target;
    done += Math.min(count, target);
  }
  return wholePercent(done, due);
}

export type SideBySideRow = {
  userId: string;
  displayName: string;
  avatarColor: string;
  total: number;
  /** Whole percent of due days completed since joining; null before anything was due. */
  rate: number | null;
  streak: number;
  /** "12 days", null below 2. */
  streakLabel: string | null;
};

/** The table for a Side by side habit, in the people's order; deactivated people are left out. */
export function sideBySideRows(input: StatsInput): SideBySideRow[] {
  return input.people
    .filter((person) => !person.deactivated)
    .map((person) => {
      const totals = personTotals(input, person.userId)!;
      return {
        userId: person.userId,
        displayName: person.displayName,
        avatarColor: person.avatarColor,
        total: totals.total,
        rate: completionRate(input, person.userId),
        streak: totals.current,
        streakLabel: streakLabel(totals.current, totals.unit),
      };
    });
}

export type WeekSeries = {
  userId: string;
  displayName: string;
  avatarColor: string;
  /** Days done in each week of `WeeklySeries.weeks`, oldest first. */
  counts: number[];
};

export type WeeklySeries = {
  /** The Sunday that starts each week, oldest first; the last holds today. */
  weeks: CalendarDate[];
  /** The one shared axis: every strip runs 0 to this. */
  axisMax: number;
  people: WeekSeries[];
};

/** Days done per person per week for the last `STATS_WEEKS` Sunday-to-Saturday weeks; deactivated people are left out. */
export function weeklySeries(input: StatsInput): WeeklySeries {
  const thisWeek = startOfWeek(input.today);
  const weeks = Array.from({ length: STATS_WEEKS }, (_, i) => addCalendarDays(thisWeek, -7 * (STATS_WEEKS - 1 - i)));
  const people = input.people
    .filter((person) => !person.deactivated)
    .map((person) => {
      const checks = logsOf(input, person.userId).filter((log) => isCheckStatus(log.status));
      const counts = weeks.map((start) => {
        const days = new Set<number>();
        for (const log of checks) {
          const into = calendarDaysBetween(start, log.day);
          if (into >= 0 && into <= 6) days.add(into);
        }
        return days.size;
      });
      return { userId: person.userId, displayName: person.displayName, avatarColor: person.avatarColor, counts };
    });
  return { weeks, axisMax: STATS_WEEK_AXIS_MAX, people };
}

/**
 * The perfect days in the month containing `inMonth`, oldest first, up to
 * today (a future day is never perfect). `entriesFor` supplies the person's
 * entries for a day, as for `perfectDaysInRange`.
 */
export function perfectDaysInMonth(
  inMonth: CalendarDate,
  today: CalendarDate,
  entriesFor: (day: CalendarDate) => readonly DayEntry[],
): CalendarDate[] {
  const first = startOfMonth(inMonth);
  const last = addCalendarDays({ ...first, month: first.month + 1 }, -1);
  const to = compareDays(last, today) > 0 ? today : last;
  return perfectDaysInRange(first, to, entriesFor);
}
