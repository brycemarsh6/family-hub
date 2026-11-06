import { addCalendarDays, startOfWeek, type CalendarDate } from "../householdDate";
import { compareDays, dayInVacation, isOpenKind, isSameDay } from "./schedule";
import type { StreakCache, StreakResult } from "./streaks";
import type { HabitLogDay, ScheduleSpec, Vacation, WeekOverride } from "./types";
import { choreDayState } from "./weekOverrides";

// The chore streak (decision 33): days in a row on which every chore required
// of one person that day was done on time. One streak for all of a person's
// chores, unlike a habit's own. Rules:
//   - a day with no chore required never breaks or grows it
//   - a skipped chore (a log, or "skip this week") and an undone vacation day
//     are excused: the streak survives and that chore adds nothing; a chore
//     done on a vacation day or a week-skipped day still counts (decisions
//     127, 130)
//   - a chore done late, or not done at all, breaks the day
//   - today counts only once every chore required today is done; until then
//     the streak stands from yesterday (`asOf` says so)
// A chore with no set days (weekly, monthly, every other week with none) is
// never required on a day, so it is left out. Pure: no db; callers pass `today`.

/** One chore of one person: its schedule, their checks on it, this-week changes, and the first day it can be missed. */
export type ChoreInput = {
  spec: ScheduleSpec;
  logs: readonly HabitLogDay[];
  overrides: readonly WeekOverride[];
  since: CalendarDate;
};

type Verdict = "none" | "done" | "pending" | "broken";

function choreVerdict(chore: ChoreInput, day: CalendarDate, today: CalendarDate): Verdict {
  if (compareDays(day, chore.since) < 0) return "none";
  const state = choreDayState(chore.spec, chore.overrides, day);
  const log = chore.logs.find((entry) => isSameDay(entry.day, day));
  // Skipped for the week: excused, but a check actually made counts as done (decision 130).
  if (state === "excused") return log?.status === "done" ? "done" : "none";
  if (state !== "required") return "none";
  if (!log) return compareDays(day, today) < 0 ? "broken" : "pending";
  if (log.status === "skipped") return "none";
  return log.status === "late" ? "broken" : "done";
}

/** One day over every chore: any broken chore breaks it, else any pending holds it, else any done grows it. */
function dayVerdict(chores: readonly ChoreInput[], vacations: readonly Vacation[], day: CalendarDate, today: CalendarDate): Verdict {
  const verdicts = chores.map((chore) => choreVerdict(chore, day, today));
  // A chore actually done on a vacation day counts; anything else due that day is excused (decision 127).
  if (dayInVacation(day, vacations)) return verdicts.includes("done") ? "done" : "none";
  for (const verdict of ["broken", "pending", "done"] as const) if (verdicts.includes(verdict)) return verdict;
  return "none";
}

function dated(chores: readonly ChoreInput[]): ChoreInput[] {
  return chores.filter((chore) => !isOpenKind(chore.spec));
}

/** Rebuilds the chore streak from logs. `asOf` is today, or yesterday while a chore due today is still undone. */
export function computeChoreStreak(
  chores: readonly ChoreInput[],
  vacations: readonly Vacation[],
  today: CalendarDate,
): StreakResult {
  const mine = dated(chores);
  if (mine.length === 0) return { current: 0, best: 0, asOf: today };
  const first = mine.map((chore) => chore.since).reduce((a, b) => (compareDays(b, a) < 0 ? b : a));
  let run = 0;
  let best = 0;
  let pendingToday = false;
  for (let day = first; compareDays(day, today) <= 0; day = addCalendarDays(day, 1)) {
    const verdict = dayVerdict(mine, vacations, day, today);
    if (verdict === "broken") run = 0;
    else if (verdict === "done") best = Math.max(best, ++run);
    else if (verdict === "pending") pendingToday = true;
  }
  return { current: run, best, asOf: pendingToday ? addCalendarDays(today, -1) : today };
}

/**
 * Ages a cached chore streak to `today` with no logs, like `streakAfter`: any
 * day after `cached.asOf` and before today on which a chore was required (and
 * no vacation covers it) passed undone, so it breaks the streak. Never grows,
 * never touches `best`.
 */
export function choreStreakAfter(
  chores: readonly Pick<ChoreInput, "spec" | "overrides" | "since">[],
  cached: StreakCache,
  vacations: readonly Vacation[],
  today: CalendarDate,
): StreakResult {
  const { asOf } = cached;
  if (asOf === null || compareDays(asOf, today) >= 0 || cached.current === 0) {
    return { current: cached.current, best: cached.best, asOf: asOf ?? today };
  }
  const mine = dated(chores.map((chore) => ({ ...chore, logs: [] })));
  const yesterday = addCalendarDays(today, -1);
  let broken = false;
  for (let day = addCalendarDays(asOf, 1); compareDays(day, yesterday) <= 0 && !broken; day = addCalendarDays(day, 1)) {
    broken = dayVerdict(mine, vacations, day, today) === "broken";
  }
  return { current: broken ? 0 : cached.current, best: cached.best, asOf: today };
}

/**
 * Decision 122: last week (Sunday to Saturday, the week before the one holding
 * `today`) had at least one chore done and no broken day. Excused days do not
 * count against it; a week of only skips or vacation is not "every chore".
 */
export function finishedAllChoresLastWeek(
  chores: readonly ChoreInput[],
  vacations: readonly Vacation[],
  today: CalendarDate,
): boolean {
  const mine = dated(chores);
  const start = addCalendarDays(startOfWeek(today), -7);
  const verdicts = Array.from({ length: 7 }, (_, i) => dayVerdict(mine, vacations, addCalendarDays(start, i), today));
  return verdicts.includes("done") && !verdicts.includes("broken");
}
