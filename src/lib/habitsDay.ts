import { addCalendarDays, calendarDaysBetween, formatCalendarDate, parseDateParam, type CalendarDate } from "./householdDate";
import { CARRY_LOOKBACK_DAYS } from "./habits/carryOver";

// The Habits page's day browser (mission 51, decision 222): `?day=YYYY-MM-DD`
// shows a past day, read only, as far back as the data window reaches. Pure,
// so the bounds are pinned by tests.

export type HabitsDay = {
  /** The day to show: the asked one when it is today or up to 14 days back, else today. */
  day: CalendarDate;
  isToday: boolean;
  /** The day before, "YYYY-MM-DD", or null at the floor. */
  prev: string | null;
  /** The day after, "YYYY-MM-DD", or null on today. */
  next: string | null;
};

/** Anything missing, malformed, in the future or more than 14 days back is today. */
export function resolveHabitsDay(param: string | string[] | undefined, today: CalendarDate): HabitsDay {
  const asked = parseDateParam((Array.isArray(param) ? param[0] : param) ?? "");
  const back = asked ? calendarDaysBetween(asked, today) : -1;
  const day = asked && back >= 0 && back <= CARRY_LOOKBACK_DAYS ? asked : today;
  const daysBack = calendarDaysBetween(day, today);
  return {
    day,
    isToday: daysBack === 0,
    prev: daysBack < CARRY_LOOKBACK_DAYS ? formatCalendarDate(addCalendarDays(day, -1)) : null,
    next: daysBack > 0 ? formatCalendarDate(addCalendarDays(day, 1)) : null,
  };
}

/** A Habits page address: Mine is the bare page, the family view adds `view=family` (and `person`); today leaves `day` out. */
export function habitsHref({ family, day, person }: { family: boolean; day?: string | null; person?: string | null }): string {
  const query = new URLSearchParams();
  if (family) query.set("view", "family");
  if (family && person) query.set("person", person);
  if (day) query.set("day", day);
  const text = query.toString();
  return text ? `/habits?${text}` : "/habits";
}
