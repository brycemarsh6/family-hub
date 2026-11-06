import {
  addCalendarDays,
  calendarDateFromUtcMidnight,
  dayOfWeek,
  formatCalendarDate,
  startOfWeek,
  type CalendarDate,
} from "./householdDate";
import { canChangeChore, canEditChart, canSeeHabit } from "./habits/access";
import { CARRY_LOOKBACK_DAYS, carrySince, habitStartDay } from "./habits/carryOver";
import { choreStreakAfter, finishedAllChoresLastWeek, type ChoreInput } from "./habits/choreStreak";
import { logsForUser, specFromRow, type StoredScheduleFields } from "./habits/habitRows";
import { compareDays, isDayInRange, isSameDay } from "./habits/schedule";
import type { StreakCache } from "./habits/streaks";
import type { HabitActor, HabitLogDay, Vacation } from "./habits/types";
import { changeAllowed, choreDayState, choreTag, overrideFromRow, type StoredWeekOverride } from "./habits/weekOverrides";
import { CHORE_CHART_LABELS, choreTagLabel, habitWhoLabel, toHabitKind, type Weekday } from "./habitVocabulary";
import { FULL_DAY_NAMES, SHORT_DAY_NAMES } from "./mealPlanDates";

// The chore pages' pure builders, with no database: `habitsRead.ts` and
// `habitsStatsRead.ts` fetch the rows and call these. Three jobs: the chore
// header on Today and the family view (the streak, the Sunday shout-out, the
// vacation line: decisions 115, 120, 122), the chart page (116, 117, 119) and
// the Settings vacation list (123). Callers pass `today`; days leave this file
// as "YYYY-MM-DD" strings.

/** A habit as the chore builders read it; `TodayHabitInput` fits. */
export type ChoreHabitInput = StoredScheduleFields & {
  id: string;
  title: string;
  icon: string | null;
  kind: string;
  sharing: string;
  everyone: boolean;
  isPrivate: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  /** This week's changes to a weekdays chore; left off means none. */
  weekOverrides?: StoredWeekOverride[];
  participants: { userId: string; joinedAt: Date }[];
};

/** One person's live chores in the shape the chore streak reads (their own checks only). */
export function choreInputsFor(
  userId: string,
  habits: readonly ChoreHabitInput[],
  logsByHabit: ReadonlyMap<string, HabitLogDay[]>,
): ChoreInput[] {
  return habits.flatMap((habit): ChoreInput[] => {
    const part = habit.participants.find((p) => p.userId === userId);
    const spec = specFromRow(habit);
    if (!part || habit.archivedAt || !spec || toHabitKind(habit.kind) !== "chore") return [];
    return [{
      spec,
      logs: logsForUser(logsByHabit.get(habit.id) ?? [], userId),
      overrides: (habit.weekOverrides ?? []).flatMap((row) => overrideFromRow(row) ?? []),
      since: carrySince(part.joinedAt, habitStartDay(habit.createdAt)),
    }];
  });
}

/** The stored chore streak columns of `UserPreferences` as a cache; no row means no streak yet. */
export function choreCacheFromRow(row: { choreStreakCurrent: number; choreStreakBest: number; choreStreakAsOf: Date | null } | null | undefined): StreakCache {
  return {
    current: row?.choreStreakCurrent ?? 0,
    best: row?.choreStreakBest ?? 0,
    asOf: row?.choreStreakAsOf ? calendarDateFromUtcMidnight(row.choreStreakAsOf) : null,
  };
}

/**
 * The Sunday that starts the window of this-week changes a page fetches. Today's
 * rows and the Sunday line read two weeks back, but aging a cached chore streak
 * (`choreStreakAfter`) reads every day after its `asOf`, so the window reaches
 * back to the oldest cache too.
 */
export function overrideWindowStart(today: CalendarDate, cacheAsOfs: readonly (CalendarDate | null)[]): CalendarDate {
  let earliest = addCalendarDays(today, -CARRY_LOOKBACK_DAYS);
  for (const asOf of cacheAsOfs) if (asOf && compareDays(asOf, earliest) < 0) earliest = asOf;
  return startOfWeek(earliest);
}

/** What Today's and a family card's Chores header need about one person. */
export type ChoreHeader = {
  /** The chore streak aged to today (decision 33); the page decides whether to show it (decision 120). */
  choreStreak: number;
  /** Sundays only, when every chore due last week was done on time (decision 122). */
  shoutOut: boolean;
  /** The last day of the vacation that covers today, "YYYY-MM-DD", else null (decision 115). */
  vacationThrough: string | null;
};

export function choreHeader(
  userId: string,
  habits: readonly ChoreHabitInput[],
  logsByHabit: ReadonlyMap<string, HabitLogDay[]>,
  today: CalendarDate,
  vacations: readonly Vacation[],
  cache: StreakCache,
): ChoreHeader {
  const chores = choreInputsFor(userId, habits, logsByHabit);
  const current = vacations.find((vacation) => isDayInRange(today, vacation));
  return {
    choreStreak: choreStreakAfter(chores, cache, vacations, today).current,
    shoutOut: dayOfWeek(today) === 0 && finishedAllChoresLastWeek(chores, vacations, today),
    vacationThrough: current ? formatCalendarDate(current.end) : null,
  };
}

// ---- The chart page ----

export const firstNameOf = (displayName: string) => displayName.trim().split(/\s+/)[0] || displayName;

export type ChartChip = { id: string; name: string; avatarColor: string; selected: boolean };

/** One chore on a day of the Default week. `who` is the who label when the chore is shared, else null. */
export type ChartChore = { id: string; title: string; icon: string | null; who: string | null };

/**
 * One chore on a day of This week. `fromWeekday` is the weekday the chore
 * normally falls on (the key every change uses); a moved chore shows twice,
 * "moved-away" on its old day and "required" with a tag on its new one.
 */
export type ChartWeekChore = ChartChore & {
  fromWeekday: Weekday;
  state: "required" | "skipped" | "moved-away";
  /** "Moved to Thu", "This week only", "Skipped this week", else null. */
  tag: string | null;
  /** A change exists, so the sheet offers "Back to the default". */
  changed: boolean;
  /**
   * The row opens the sheet: the day the turn now sits on is today or later, or
   * the turn is skipped this week (decisions 126, 129; a past miss stays a miss,
   * and a moved turn whose moved-to day has passed is locked).
   */
  canChange: boolean;
  /** The viewer may not change this chore (a kid on a shared chore, decision 125): the sheet says "Ask a parent" and offers nothing. */
  askParent: boolean;
  /** Its normal day is already past: "Back to the default" is hidden, as it would make a past day required again (decision 126). */
  originalDayPast: boolean;
  /** "Move to" chips: today and later days this week except its own day. */
  moveTargets: Weekday[];
};

export type ChartDay = { weekday: Weekday; name: string; short: string; chores: ChartChore[] };
export type ChartWeekDay = { weekday: Weekday; name: string; short: string; date: string; isToday: boolean; chores: ChartWeekChore[] };

export type ChoreChartData = {
  personId: string;
  personName: string;
  /** "Emily's week". */
  subtitle: string;
  chips: ChartChip[];
  defaultWeek: ChartDay[];
  thisWeek: { start: string; end: string; days: ChartWeekDay[] };
  today: string;
};

export type ChartPerson = { id: string; displayName: string; avatarColor: string };

/**
 * The chart for `personId`, or null when the viewer may not edit it
 * (`canEditChart`, decision 118) or the person is not in `people`. Chips
 * (decision 119): the people the viewer may edit, the viewer first, then the
 * given (family) order. The charts hold the person's live weekdays chores the
 * viewer may see (another person's private chore never shows).
 */
export function buildChoreChart(
  viewer: HabitActor,
  personId: string,
  people: readonly ChartPerson[],
  habits: readonly ChoreHabitInput[],
  today: CalendarDate,
): ChoreChartData | null {
  const person = people.find((entry) => entry.id === personId);
  if (!person || !canEditChart(viewer, personId)) return null;
  const chips = [...people.filter((p) => p.id === viewer.userId), ...people.filter((p) => p.id !== viewer.userId)]
    .filter((p) => canEditChart(viewer, p.id))
    .map((p) => ({ id: p.id, name: firstNameOf(p.displayName), avatarColor: p.avatarColor, selected: p.id === personId }));
  const chores = habits.flatMap((habit) => {
    const spec = specFromRow(habit);
    const access = { isPrivate: habit.isPrivate, participantIds: habit.participants.map((p) => p.userId) };
    if (!spec || spec.schedule !== "weekdays" || habit.archivedAt || toHabitKind(habit.kind) !== "chore") return [];
    if (!access.participantIds.includes(personId) || !canSeeHabit(viewer, access)) return [];
    const who = habit.participants.length > 1 ? habitWhoLabel({ people: habit.participants.length, everyone: habit.everyone, sharing: habit.sharing }) : null;
    const overrides = (habit.weekOverrides ?? []).flatMap((row) => overrideFromRow(row) ?? []);
    return [{ habit, spec, overrides, askParent: !canChangeChore(viewer, access, personId), base: { id: habit.id, title: habit.title, icon: habit.icon, who } }];
  });
  const weekStart = startOfWeek(today);
  const weekdays = Array.from({ length: 7 }, (_, i) => i as Weekday);
  const defaultWeek = weekdays.map((weekday): ChartDay => ({
    weekday,
    name: FULL_DAY_NAMES[weekday],
    short: SHORT_DAY_NAMES[weekday],
    chores: chores.filter((c) => c.spec.schedule === "weekdays" && c.spec.days.includes(weekday)).map((c) => c.base),
  }));
  const days = weekdays.map((weekday): ChartWeekDay => {
    const day = addCalendarDays(weekStart, weekday);
    const entries = chores.flatMap((c): ChartWeekChore[] => {
      const state = choreDayState(c.spec, c.overrides, day);
      const tag = choreTag(c.spec, c.overrides, day);
      if (state === "none" && tag?.kind !== "moved-away") return [];
      const mover = tag?.kind === "moved-here" ? c.overrides.find((o) => o.action === "moved" && o.toWeekday === weekday && isSameDay(o.weekStart, weekStart)) : undefined;
      const fromWeekday = mover?.fromWeekday ?? weekday;
      const fromDay = addCalendarDays(weekStart, fromWeekday);
      const originalDayPast = compareDays(fromDay, today) < 0;
      return [{
        ...c.base,
        fromWeekday,
        state: state === "excused" ? "skipped" : state === "none" ? "moved-away" : "required",
        tag: tag ? choreTagLabel(tag, SHORT_DAY_NAMES) : null,
        changed: tag !== null,
        canChange: changeAllowed({
          fromPast: originalDayPast,
          // The day the turn sits on: its moved-to day while moved, else this column's own day.
          sitsPast: compareDays(addCalendarDays(weekStart, tag?.kind === "moved-away" ? tag.toWeekday : weekday), today) < 0,
          skipped: tag?.kind === "skipped",
          clearing: false,
        }),
        askParent: c.askParent,
        originalDayPast,
        moveTargets: weekdays.filter((w) => w !== fromWeekday && compareDays(addCalendarDays(weekStart, w), today) >= 0),
      }];
    });
    return { weekday, name: FULL_DAY_NAMES[weekday], short: SHORT_DAY_NAMES[weekday], date: formatCalendarDate(day), isToday: isSameDay(day, today), chores: entries };
  });
  const personName = firstNameOf(person.displayName);
  return {
    personId,
    personName,
    subtitle: CHORE_CHART_LABELS.personWeek(personName),
    chips,
    defaultWeek,
    thisWeek: { start: formatCalendarDate(weekStart), end: formatCalendarDate(addCalendarDays(weekStart, 6)), days },
    today: formatCalendarDate(today),
  };
}

// ---- The Settings vacation list ----

export type VacationItem = { id: string; from: string; through: string; status: "current" | "upcoming" | "past" };

/** Decision 123's order: current, then upcoming (soonest first), then past (newest first). Days as "YYYY-MM-DD". */
export function orderVacations(rows: readonly { id: string; startDay: Date; endDay: Date }[], today: CalendarDate): VacationItem[] {
  const items = rows.map((row) => {
    const range = { start: calendarDateFromUtcMidnight(row.startDay), end: calendarDateFromUtcMidnight(row.endDay) };
    const status = isDayInRange(today, range) ? "current" : compareDays(range.start, today) > 0 ? "upcoming" : "past";
    return { id: row.id, range, status } as const;
  });
  const rank = { current: 0, upcoming: 1, past: 2 } as const;
  items.sort((a, b) => {
    if (a.status !== b.status) return rank[a.status] - rank[b.status];
    // Upcoming reads oldest first; current and past read newest first.
    const order = compareDays(a.range.start, b.range.start) || compareDays(a.range.end, b.range.end);
    return a.status === "upcoming" ? order : -order;
  });
  return items.map((item) => ({ id: item.id, from: formatCalendarDate(item.range.start), through: formatCalendarDate(item.range.end), status: item.status }));
}
