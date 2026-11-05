import { addCalendarDays, type CalendarDate } from "../householdDate";
import type { HabitKind, HabitLogStatus } from "../habitVocabulary";
import { compareDays } from "./schedule";
import type { DueState } from "./types";

// Perfect days (decision 71): every required habit done or skipped. Chores
// never count, and a day where nothing was required is neither perfect nor
// imperfect. Pure: callers say what was required and what was logged.

/** One item on one day: its kind, whether it was required, and the person's row (null = none). */
export type DayEntry = { kind: HabitKind; state: DueState; status: HabitLogStatus | null };

/**
 * True when every required habit was done or skipped (a "late" row keeps the
 * day missed), false when one was not, null when no habit was required.
 */
export function isPerfectDay(entries: readonly DayEntry[]): boolean | null {
  const required = entries.filter((entry) => entry.kind === "habit" && entry.state === "required");
  if (required.length === 0) return null;
  return required.every((entry) => entry.status === "done" || entry.status === "skipped");
}

/** The perfect days from `from` to `to`, oldest first; `entriesFor` supplies each day's entries. */
export function perfectDaysInRange(
  from: CalendarDate,
  to: CalendarDate,
  entriesFor: (day: CalendarDate) => readonly DayEntry[],
): CalendarDate[] {
  const days: CalendarDate[] = [];
  for (let day = from; compareDays(day, to) <= 0; day = addCalendarDays(day, 1)) {
    if (isPerfectDay(entriesFor(day)) === true) days.push(day);
  }
  return days;
}
