import { canSeeHabit } from "./habits/access";
import { logDayFromRow, specFromRow, type StoredScheduleFields } from "./habits/habitRows";
import { countDays } from "./habits/progress";
import { periodTarget, periodWindow } from "./habits/schedule";
import { addCalendarDays, calendarDateFromUtcMidnight, formatCalendarDate, utcMidnightInstant } from "./householdDate";
import type { CalendarHabitDayView } from "./types";
import type { HabitActor } from "./habits/types";
import { isCheckStatus } from "./habitVocabulary";
import { toHabitTrack } from "./habitHoursVocabulary";

// Which planned habit days the Calendar shows the viewer, and which are done
// (decision 146). Pure: the reader hands in the viewer's own planned rows and
// checks; this applies the access rule and shapes the items.

/** One planned-day row with the facts of its habit. `userId` is whose row it is. */
export type PlannedDayRow = StoredScheduleFields & {
  habitId: string;
  userId: string;
  title: string;
  icon: string | null;
  kind: string;
  isPrivate: boolean;
  participantIds: readonly string[];
  /** "hours" habits are never planned onto the Calendar (decision 197). */
  track?: string;
  /** The planned household day at UTC midnight. */
  day: Date;
};

/** One check: a habit's day for a person, with its status. */
export type PlannedDayCheck = { habitId: string; userId: string; day: Date; status: string };

/** The whole period (week or month) containing each planned day, as the one range of checks to read: `[from, to)`, or null with no rows. */
export function plannedPeriodsRange(rows: readonly PlannedDayRow[]): { from: Date; to: Date } | null {
  let from: Date | null = null;
  let to: Date | null = null;
  for (const row of rows) {
    const spec = specFromRow(row);
    if (!spec) continue;
    const window = periodWindow(spec, calendarDateFromUtcMidnight(row.day));
    const start = utcMidnightInstant(window.start);
    const end = utcMidnightInstant(addCalendarDays(window.end, 1));
    if (!from || start < from) from = start;
    if (!to || end > to) to = end;
  }
  return from && to ? { from, to } : null;
}

function dayKey(day: Date): string {
  return formatCalendarDate(calendarDateFromUtcMidnight(day));
}

/**
 * The viewer's planned days, in day then title order. Only the viewer's own
 * rows count (so a Together habit shows once, from their row), and only for a
 * habit they are on (a person removed from a habit keeps their planned rows)
 * and may see (`canSeeHabit`). The tablet (a device login) sees none. A day is done when the viewer has a done or
 * late check on it (`isCheckStatus`), or when the habit's period containing it
 * (`periodWindow`) has met its target from the viewer's done or late checks
 * (decision 160). A skip never counts.
 */
export function buildCalendarHabitDays(
  viewer: HabitActor,
  rows: readonly PlannedDayRow[],
  checks: readonly PlannedDayCheck[],
): CalendarHabitDayView[] {
  if (viewer.role === "device") return [];
  const mine = checks.filter((check) => check.userId === viewer.userId && isCheckStatus(check.status));
  const doneKeys = new Set(mine.map((check) => `${check.habitId}:${dayKey(check.day)}`));
  const logsByHabit = new Map<string, ReturnType<typeof logDayFromRow>[]>();
  for (const check of mine) logsByHabit.set(check.habitId, [...(logsByHabit.get(check.habitId) ?? []), logDayFromRow(check)]);
  const periodMet = (row: PlannedDayRow): boolean => {
    const spec = specFromRow(row);
    if (!spec) return false;
    const day = calendarDateFromUtcMidnight(row.day);
    const target = periodTarget(spec, day);
    return target > 0 && countDays(logsByHabit.get(row.habitId) ?? [], periodWindow(spec, day)) >= target;
  };
  const items = new Map<string, CalendarHabitDayView>();
  for (const row of rows) {
    if (toHabitTrack(row.track) === "hours" || row.userId !== viewer.userId || !row.participantIds.includes(viewer.userId) || !canSeeHabit(viewer, row)) continue;
    const id = `${row.habitId}:${dayKey(row.day)}`;
    items.set(id, {
      id,
      habitId: row.habitId,
      title: row.title,
      icon: row.icon,
      kind: row.kind === "chore" ? "chore" : "habit",
      dayInstant: row.day,
      done: doneKeys.has(id) || periodMet(row),
    });
  }
  return [...items.values()].sort(
    (a, b) => a.dayInstant.getTime() - b.dayInstant.getTime() || a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
  );
}
