import { canSeeHabit } from "./access";
import type { CalendarHabitDayView } from "../types";
import type { HabitActor } from "./types";

// Which planned habit days the Calendar shows the viewer, and which are done
// (decision 146). Pure: the reader hands in the viewer's own planned rows and
// checks; this applies the access rule and shapes the items.

/** One planned-day row with the facts of its habit. `userId` is whose row it is. */
export type PlannedDayRow = {
  habitId: string;
  userId: string;
  title: string;
  icon: string | null;
  kind: string;
  isPrivate: boolean;
  participantIds: readonly string[];
  /** The planned household day at UTC midnight. */
  day: Date;
};

/** One check: a habit's day for a person, with its status. */
export type PlannedDayCheck = { habitId: string; userId: string; day: Date; status: string };

function dayKey(day: Date): string {
  return day.toISOString().slice(0, 10);
}

/**
 * The viewer's planned days, in day then title order. Only the viewer's own
 * rows count (so a Together habit shows once, from their row), and only for a
 * habit they are on and may see: a private habit only to its person, and the
 * tablet (a device login) sees none. A day is done when the viewer has a
 * "done" or "late" check on it; a skip is not done.
 */
export function buildCalendarHabitDays(
  viewer: HabitActor,
  rows: readonly PlannedDayRow[],
  checks: readonly PlannedDayCheck[],
): CalendarHabitDayView[] {
  if (viewer.role === "device") return [];
  const doneKeys = new Set(
    checks
      .filter((check) => check.userId === viewer.userId && (check.status === "done" || check.status === "late"))
      .map((check) => `${check.habitId}:${dayKey(check.day)}`),
  );
  const items = new Map<string, CalendarHabitDayView>();
  for (const row of rows) {
    if (row.userId !== viewer.userId || !row.participantIds.includes(viewer.userId)) continue;
    if (!canSeeHabit(viewer, row)) continue;
    const id = `${row.habitId}:${dayKey(row.day)}`;
    items.set(id, {
      id,
      habitId: row.habitId,
      title: row.title,
      icon: row.icon,
      kind: row.kind === "chore" ? "chore" : "habit",
      dayInstant: row.day,
      done: doneKeys.has(id),
    });
  }
  return [...items.values()].sort(
    (a, b) => a.dayInstant.getTime() - b.dayInstant.getTime() || a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
  );
}
