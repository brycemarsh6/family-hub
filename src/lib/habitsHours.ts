import { HOURS_LIMITS, HOURS_PHRASES, unitFor, type PaceDays } from "./habitHoursVocabulary";
import { canLogFor } from "./habits/access";
import { hoursFromRow, type StoredHoursFields } from "./habits/habitRows";
import { countedDaysLeft, hoursStreakAfter, hoursWeek, paceMinutesPerDay, weekTotals, type HoursWeek } from "./habits/hours";
import { compareDays } from "./habits/schedule";
import type { StreakCache } from "./habits/streaks";
import type { DueState, HabitAccess, HabitActor, TimeEntry, Vacation } from "./habits/types";
import {
  addCalendarDays,
  calendarDaysBetween,
  formatCalendarDate,
  formatShortCalendarDate,
  startOfWeek,
  type CalendarDate,
} from "./householdDate";
import { SHORT_DAY_NAMES } from "./mealPlanDates";

// The hours habit's pages, with no database (mission 37, decisions 187 to
// 199): the words that join the numbers, the Today and dashboard row view, the
// goal-plan view and the stats page's hours data. The rules (week totals, the
// pace, the weeks streak) are in `habits/hours.ts`; callers pass `today`.

const QUARTERS = ["", "¼", "½", "¾"] as const;

/** Hours as a number of quarters: 90 is "1½", 30 is "½", 600 is "10", 0 is "0" (decision 187). */
export function formatHours(minutes: number): string {
  const quarters = Math.round(Math.max(0, minutes) / HOURS_LIMITS.paceStep);
  const whole = Math.floor(quarters / 4);
  const part = QUARTERS[quarters % 4];
  return whole === 0 ? part || "0" : `${whole}${part}`;
}

/** An amount to add or list: "30 min", "1 hour", "1½ hours", "2 hours". */
export function formatAmount(minutes: number): string {
  return minutes < 60 ? `${minutes} min` : `${formatHours(minutes)} ${unitFor(minutes)}`;
}

/** Manage's line (decision 199): "6 hours a week", "1 hour a week". */
export function hoursAWeek(targetMinutes: number): string {
  return `${formatHours(targetMinutes)} ${unitFor(targetMinutes)} a week`;
}

/** The hours behind a habit row: all plain numbers and words, so a row can be redrawn without the server. */
export type HoursRowView = {
  /** Minutes this week and the week's goal. */
  done: number;
  target: number;
  /** "6½ of 10 hours this week", with " · done" once met (decision 189). */
  doneText: string;
  /** "3½ hours left · about 1¾ a day", "4 hours left · today" on the last counted day (decision 188); null when met. */
  leftText: string | null;
  /** "3½ hours left" alone, for the dashboard tile and the Goals tile; null when met. */
  leftShort: string | null;
  met: boolean;
  /** 0 to 1, for the bar. */
  fraction: number;
  paceDays: PaceDays;
  /** The counted days left this week, today included (what the pace divided by). */
  daysLeft: number;
  /** Minutes logged last week, so the log sheet can say what a last-week entry adds up to (decision 191). Every builder sets it; a hand-made view may leave it off (read as 0). */
  lastWeek?: number;
  /** The household's today as "YYYY-MM-DD", from the server: the log sheet's Today chip and the last day it accepts. Every builder sets it; the sheet falls back to the browser's clock without it. */
  today?: string;
};

/** What a row view needs beyond the week itself. */
type RowContext = { lastWeek?: number; today?: string };

/** "6½ of 10 hours this week" for the week now, or "... last week" for the recap. */
export function hoursDoneText(done: number, target: number, when: "this week" | "last week" = "this week"): string {
  return `${formatHours(done)} of ${formatHours(target)} ${unitFor(target)} ${when}${done >= target ? HOURS_PHRASES.done : ""}`;
}

function viewOf(done: number, target: number, paceDays: PaceDays, daysLeft: number, context: RowContext): HoursRowView {
  const left = Math.max(0, target - done);
  const met = done >= target;
  const perDay = met ? null : paceMinutesPerDay(left, daysLeft);
  const leftShort = met ? null : `${formatHours(left)} ${unitFor(left)} ${HOURS_PHRASES.left}`;
  const pace = perDay === null ? "" : daysLeft === 1 ? HOURS_PHRASES.today : HOURS_PHRASES.aboutADay(formatHours(perDay));
  return {
    done,
    target,
    doneText: hoursDoneText(done, target),
    leftText: leftShort === null ? null : `${leftShort}${pace}`,
    leftShort,
    met,
    fraction: target > 0 ? Math.min(1, done / target) : 0,
    paceDays,
    daysLeft,
    lastWeek: context.lastWeek,
    today: context.today,
  };
}

/** A week's result as a row view; `daysLeft` is `countedDaysLeft` for the same day. */
export function hoursRowView(week: Pick<HoursWeek, "doneMinutes" | "targetMinutes">, paceDays: PaceDays, daysLeft: number, context: RowContext): HoursRowView {
  return viewOf(week.doneMinutes, week.targetMinutes, paceDays, daysLeft, context);
}

/** What `hoursRowView` needs of the days: last week's minutes from `entries` (one person's), and `today` written as "YYYY-MM-DD". */
function contextFor(entries: readonly TimeEntry[], today: CalendarDate): RowContext {
  return { lastWeek: weekTotals(entries, today, 2)[0], today: formatCalendarDate(today) };
}

/** The view after `minutes` more are logged this week (the optimistic tap); the same words the server would send. */
export function addHoursMinutes(view: HoursRowView, minutes: number): HoursRowView {
  return viewOf(view.done + Math.max(0, minutes), view.target, view.paceDays, view.daysLeft, view);
}

/** Decision 191's line for a day in last week: "7 of 6 hours last week", once `minutes` more are counted. */
export function lastWeekAfterText(view: HoursRowView, minutes: number): string {
  return `${formatHours((view.lastWeek ?? 0) + minutes)} of ${formatHours(view.target)} ${unitFor(view.target)} last week`;
}

/** "Calling · 6½ of 10 hours this week" (the goal page and This week, decision 198). */
export function goalHoursLine(title: string, view: HoursRowView): string {
  return `${title} · ${view.doneText}`;
}

/** "Calling · 3½ hours left" (the Goals tile); the title alone once met. */
export function goalLeftLine(title: string, view: HoursRowView): string {
  return view.leftShort === null ? title : `${title} · ${view.leftShort}`;
}

// ---- Reading an hours habit off its row ----

export type HoursSpec = { targetMinutes: number; paceDays: PaceDays; since: CalendarDate | null };

/** The hours reading of a habit row, or null for a checks habit (or an hours one with no usable goal, which then acts as a plain weekly habit). The hours columns may be left off. */
export function hoursSpecOf(habit: Partial<StoredHoursFields>): HoursSpec | null {
  return hoursFromRow({
    track: habit.track ?? "checks",
    weeklyMinutes: habit.weeklyMinutes ?? null,
    paceDays: habit.paceDays ?? null,
    hoursSince: habit.hoursSince ?? null,
  });
}

/** The weeks streak to show today for an hours habit (the cache aged by `hoursStreakAfter`), or null for a checks habit. */
export function hoursStreakOf(habit: Partial<StoredHoursFields>, cache: StreakCache, vacations: readonly Vacation[], today: CalendarDate): number | null {
  const spec = hoursSpecOf(habit);
  return spec ? hoursStreakAfter(cache, vacations, spec.paceDays, today).current : null;
}

/** One person's view for this week; `entries` may hold other people's too. */
export function hoursViewFor(spec: HoursSpec, userId: string, entries: readonly TimeEntry[], today: CalendarDate, vacations: readonly Vacation[]): HoursRowView {
  const own = entries.filter((entry) => entry.userId === userId);
  const week = hoursWeek({ entries: own, targetMinutes: spec.targetMinutes, paceDays: spec.paceDays, today, vacations });
  return hoursRowView(week, spec.paceDays, countedDaysLeft(today, spec.paceDays, vacations), contextFor(own, today));
}

/**
 * What an hours habit overrides on a Today row (decisions 189, 197): always on
 * Today and open, never required, carried, planned or skipped (a checks habit gets `hours: null` and nothing else); `doneToday`
 * mirrors "met" so the list sorts it with the finished rows; every member's
 * `done` is their own week's goal. A vacation day still shows it (time can be
 * logged); the pace leaves the vacation out.
 */
export function hoursRowFields<M extends { userId: string; done: boolean; skipped: boolean }>(
  spec: HoursSpec | null,
  viewerId: string,
  entries: readonly TimeEntry[],
  today: CalendarDate,
  vacationsOf: (userId: string) => readonly Vacation[],
  members: readonly M[],
) {
  if (!spec) return { hours: null };
  const hours = hoursViewFor(spec, viewerId, entries, today, vacationsOf(viewerId));
  return {
    hours,
    doneToday: hours.met,
    skippedToday: false,
    dueState: "open" as DueState,
    carriedFrom: null,
    progress: null,
    plannedToday: false,
    plannedLater: null,
    onVacation: false,
    skippedThisWeek: false,
    weekTag: null,
    participants: members.map((member) => ({ ...member, done: hoursViewFor(spec, member.userId, entries, today, vacationsOf(member.userId)).met, skipped: false })),
  };
}

/** Manage and Edit read these (decision 199). */
export type ManagerHours = { weeklyMinutes: number; paceDays: PaceDays; text: string; since: CalendarDate | null };

export function managerHours(habit: Partial<StoredHoursFields>): ManagerHours | null {
  const spec = hoursSpecOf(habit);
  return spec ? { weeklyMinutes: spec.targetMinutes, paceDays: spec.paceDays, text: hoursAWeek(spec.targetMinutes), since: spec.since } : null;
}

// ---- Goal plans ----

/**
 * What a goal's habit item reads of an hours habit: the goal, everyone's
 * entries, and `forUserId`, the one person the screen shows and logs for
 * (`habitCheckTarget`, when they are on the habit; null shows nobody's week).
 */
export type PlanHours = { targetMinutes: number; paceDays: PaceDays; entries: TimeEntry[]; forUserId: string | null };

/** An hours item's view: the week, and whose it is (null: no bar and no +). */
export type PlanHoursView = HoursRowView & { forUserId: string | null };

/** `forUserId`'s week holding `today` for a goal's habit item (no vacations are read there). */
export function planHoursView(hours: PlanHours, today: CalendarDate): PlanHoursView {
  const own = hours.entries.filter((entry) => entry.userId === hours.forUserId);
  const week = hoursWeek({ entries: own, targetMinutes: hours.targetMinutes, paceDays: hours.paceDays, today, vacations: [] });
  return { ...hoursRowView(week, hours.paceDays, countedDaysLeft(today, hours.paceDays), contextFor(own, today)), forUserId: hours.forUserId };
}

// ---- The stats page ----

/** A stored entry with its id (the stats page lists them so one can be removed). */
export type StatsTimeEntry = TimeEntry & { id: string };

/** One line of the entries list: "Thu · 1½ hours" (decision 192). */
export type HoursEntryView = { id: string; day: string; label: string; canDelete: boolean };

export type HoursStatsData = {
  /** The subject's bar and words for this week. */
  view: HoursRowView;
  week: HoursWeek;
  /** "Current streak" and "Best streak" in weeks, and "Total hours" (decision 195). */
  tiles: { current: number; best: number; totalText: string };
  /** Sunday to Saturday, minutes each. */
  chartDays: { day: string; label: string; minutes: number }[];
  /** "Last 4 weeks: 6 · 7 · 6½ · 2 so far". */
  lastWeeksText: string;
  entries: { thisWeek: HoursEntryView[]; lastWeek: HoursEntryView[] };
  /** "Switched to hours on Nov 6" when the habit was a checks habit first (decision 198), else null. */
  switchedText: string | null;
  /** One bar per active person for Side by side (decision 196), else null. */
  perPerson: { userId: string; displayName: string; avatarColor: string; view: HoursRowView }[] | null;
};

export type HoursStatsInput = {
  spec: HoursSpec;
  viewer: HabitActor;
  access: HabitAccess;
  subjectId: string;
  /** Every entry on the habit, all people, all time. */
  entries: readonly StatsTimeEntry[];
  people: readonly { userId: string; displayName: string; avatarColor: string; deactivated: boolean }[];
  vacationsByUser: ReadonlyMap<string, readonly Vacation[]>;
  today: CalendarDate;
  /** The household day the habit was made. */
  startDay: CalendarDate;
  streak: { current: number; best: number };
  sideBySide: boolean;
};

export function buildHoursStats(input: HoursStatsInput): HoursStatsData {
  const { spec, today, subjectId } = input;
  const vacations = input.vacationsByUser.get(subjectId) ?? [];
  const mine = input.entries.filter((entry) => entry.userId === subjectId);
  const week = hoursWeek({ entries: mine, targetMinutes: spec.targetMinutes, paceDays: spec.paceDays, today, vacations });
  const thisStart = startOfWeek(today);
  const listFor = (weeksBack: number): HoursEntryView[] =>
    mine
      .filter((entry) => calendarDaysBetween(thisStart, entry.day) >= -7 * weeksBack && calendarDaysBetween(thisStart, entry.day) < 7 - 7 * weeksBack)
      .sort((a, b) => compareDays(b.day, a.day) || (a.id < b.id ? 1 : -1))
      .map((entry) => ({
        id: entry.id,
        day: formatCalendarDate(entry.day),
        label: `${SHORT_DAY_NAMES[calendarDaysBetween(startOfWeek(entry.day), entry.day)]} · ${formatAmount(entry.minutes)}`,
        canDelete: canLogFor(input.viewer, entry.userId, input.access),
      }));
  const recent = weekTotals(mine, today, 4).map(formatHours);
  const since = spec.since;
  return {
    view: hoursRowView(week, spec.paceDays, countedDaysLeft(today, spec.paceDays, vacations), contextFor(mine, today)),
    week,
    tiles: { current: input.streak.current, best: input.streak.best, totalText: formatHours(mine.reduce((sum, entry) => sum + entry.minutes, 0)) },
    chartDays: week.byDay.map((minutes, index) => ({ day: formatCalendarDate(addCalendarDays(week.weekStart, index)), label: SHORT_DAY_NAMES[index], minutes })),
    lastWeeksText: `Last 4 weeks: ${[...recent.slice(0, 3), `${recent[3]} so far`].join(" · ")}`,
    entries: { thisWeek: listFor(0), lastWeek: listFor(1) },
    switchedText: since && compareDays(since, input.startDay) > 0 ? `Switched to hours on ${formatShortCalendarDate(since)}` : null,
    perPerson: input.sideBySide
      ? input.people.filter((p) => !p.deactivated).map((p) => ({ userId: p.userId, displayName: p.displayName, avatarColor: p.avatarColor, view: hoursViewFor(spec, p.userId, input.entries, today, input.vacationsByUser.get(p.userId) ?? []) }))
      : null,
  };
}
