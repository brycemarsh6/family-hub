import { dayOfWeek, type CalendarDate } from "../householdDate";
import { compareDays, isDueWeek, isOpenKind } from "./schedule";
import type { ScheduleSpec } from "./types";

// When the "plan your day" prompt goes out (decisions 38 and 47). Only open
// kinds are prompted. Pure: callers pass `today` and the planned days.

const SUNDAY = 0;
const THURSDAY = 4;
const FRIDAY = 5;

/**
 * True when an open habit should prompt today: its period's target is not
 * met (`done` false), it has no planned day today or still ahead, and it is
 * a prompt day. Weekly (and a due biweekly week): Friday. Monthly: Sundays on
 * days 1 to 14, Sundays and Thursdays from day 15. A planned day that has
 * passed undone does not hold the prompt back.
 */
export function isPromptDay(
  spec: ScheduleSpec,
  today: CalendarDate,
  plannedDays: readonly CalendarDate[],
  done: boolean,
): boolean {
  if (done || !isOpenKind(spec) || !isDueWeek(spec, today)) return false;
  if (plannedDays.some((planned) => compareDays(planned, today) >= 0)) return false;
  const weekday = dayOfWeek(today);
  if (spec.schedule !== "monthly") return weekday === FRIDAY;
  return weekday === SUNDAY || (today.day >= 15 && weekday === THURSDAY);
}
