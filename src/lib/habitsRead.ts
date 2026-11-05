import "server-only";

import { db } from "@/lib/db";
import { calendarDateInZone, utcMidnightInstant, type CalendarDate } from "./householdDate";
import { logDayFromRow, specFromRow, storedDay } from "./habits/habitRows";
import type { HabitLogDay, ScheduleSpec } from "./habits/types";

// The reader for habit rows, so pages never query the habit tables directly.
// PR A has one loader; later PRs add theirs here (or in a sibling file when
// this passes 350 lines). No auth: the caller (a page or action) has already
// checked the session and decides what the viewer may see via `access.ts`.

/** Everything the Plans & Goals views need to know about one habit. */
export type HabitForPlan = {
  id: string;
  title: string;
  sharing: string;
  isPrivate: boolean;
  carryOver: boolean;
  archivedAt: Date | null;
  /** The engine's reading of the schedule; null if the stored row cannot be scheduled. */
  spec: ScheduleSpec | null;
  /** The stored schedule columns, for forms. `anchorWeek` is already a calendar day. */
  schedule: { schedule: string; weekdays: string | null; times: number | null; anchorWeek: CalendarDate | null };
  participantIds: string[];
  /** Each participant's cached streak (`streakAsOf` as a calendar day, null if never computed). */
  participants: { userId: string; currentStreak: number; bestStreak: number; streakAsOf: CalendarDate | null }[];
  /** Checks on or after `from`, from every participant (each tagged with its `userId`). */
  logs: HabitLogDay[];
};

/**
 * Loads the given habits and their checks since `from` (inclusive) in two
 * queries however many habits there are. Habits that do not exist are simply
 * absent from the map.
 */
export async function loadHabitsForPlan(
  habitIds: readonly string[],
  from: CalendarDate,
): Promise<Map<string, HabitForPlan>> {
  const result = new Map<string, HabitForPlan>();
  const ids = [...new Set(habitIds)];
  if (ids.length === 0) return result;
  const [habits, logs] = await Promise.all([
    db.habit.findMany({
      where: { id: { in: ids } },
      include: {
        participants: {
          orderBy: { joinedAt: "asc" },
          select: { userId: true, currentStreak: true, bestStreak: true, streakAsOf: true },
        },
      },
    }),
    db.habitLog.findMany({
      where: { habitId: { in: ids }, day: { gte: utcMidnightInstant(from) } },
      select: { habitId: true, userId: true, day: true, status: true },
    }),
  ]);
  const logsByHabit = new Map<string, HabitLogDay[]>();
  for (const row of logs) {
    const list = logsByHabit.get(row.habitId) ?? [];
    list.push(logDayFromRow(row));
    logsByHabit.set(row.habitId, list);
  }
  for (const habit of habits) {
    result.set(habit.id, {
      id: habit.id,
      title: habit.title,
      sharing: habit.sharing,
      isPrivate: habit.isPrivate,
      carryOver: habit.carryOver,
      archivedAt: habit.archivedAt,
      spec: specFromRow(habit),
      schedule: {
        schedule: habit.schedule,
        weekdays: habit.weekdays,
        times: habit.times,
        anchorWeek: habit.anchorWeek ? storedDay(habit.anchorWeek) : null,
      },
      participantIds: habit.participants.map((p) => p.userId),
      participants: habit.participants.map((p) => ({
        userId: p.userId,
        currentStreak: p.currentStreak,
        bestStreak: p.bestStreak,
        streakAsOf: p.streakAsOf ? calendarDateInZone(p.streakAsOf, "UTC") : null,
      })),
      logs: logsByHabit.get(habit.id) ?? [],
    });
  }
  return result;
}
