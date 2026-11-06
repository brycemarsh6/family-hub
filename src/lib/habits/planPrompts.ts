import { addCalendarDays, calendarDaysBetween, dayOfWeek, type CalendarDate } from "../householdDate";
import { compareDays, isDayInRange, isDueWeek, isOpenKind, isSameDay, periodWindow } from "./schedule";
import type { ScheduleSpec } from "./types";

// When the "plan your day" prompt goes out (decisions 38 and 47). Only open
// kinds are prompted. Pure: callers pass `today` and the planned days.

const SUNDAY = 0;
const THURSDAY = 4;
const FRIDAY = 5;

/** Most day chips a prompt card offers (decision 142). */
const MAX_CHIPS = 3;

/**
 * True when an open habit should prompt today: its period's target is not
 * met (`done` false), it has no planned day today or later inside its current
 * period (decision 143), and it is a prompt day. Weekly (and a due biweekly
 * week): Friday. Monthly: Sundays on days 1 to 14, Sundays and Thursdays from
 * day 15. A planned day that has passed undone, or one in a later period,
 * does not hold the prompt back.
 */
export function isPromptDay(
  spec: ScheduleSpec,
  today: CalendarDate,
  plannedDays: readonly CalendarDate[],
  done: boolean,
): boolean {
  if (done || !isOpenKind(spec) || !isDueWeek(spec, today)) return false;
  const period = periodWindow(spec, today);
  if (plannedDays.some((planned) => compareDays(planned, today) >= 0 && isDayInRange(planned, period))) return false;
  const weekday = dayOfWeek(today);
  if (spec.schedule !== "monthly") return weekday === FRIDAY;
  return weekday === SUNDAY || (today.day >= 15 && weekday === THURSDAY);
}

/** One day button on a prompt card. */
export type PromptChip = { day: CalendarDate; isToday: boolean };

/**
 * What a prompt card offers (decision 142): up to three days left in the
 * period from today, and whether "Other day" shows (only when more days
 * remain than the chips cover). `lastDay` is the latest date "Other day" may take.
 */
export function promptChips(spec: ScheduleSpec, today: CalendarDate): { chips: PromptChip[]; showOther: boolean; lastDay: CalendarDate } {
  const lastDay = periodWindow(spec, today).end;
  const daysLeft = calendarDaysBetween(today, lastDay) + 1;
  const chips = Array.from({ length: Math.min(MAX_CHIPS, daysLeft) }, (_, i) => ({ day: addCalendarDays(today, i), isToday: i === 0 }));
  return { chips, showOther: daysLeft > MAX_CHIPS, lastDay };
}

/** Whether `day` may be planned: an open kind in a due period, today or later, no later than the period's last day. */
export function isPlannableDay(spec: ScheduleSpec, today: CalendarDate, day: CalendarDate): boolean {
  if (!isOpenKind(spec) || !isDueWeek(spec, today)) return false;
  return compareDays(day, today) >= 0 && isDayInRange(day, periodWindow(spec, today));
}

/** Whether one of the planned days is today: the `planned` input of `dueState` (decision 145). */
export function isPlannedToday(plannedDays: readonly CalendarDate[], today: CalendarDate): boolean {
  return plannedDays.some((planned) => isSameDay(planned, today));
}
