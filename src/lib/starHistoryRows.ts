// Turns the star history's database rows into the plain entries
// `rewards/starHistory.ts` draws (mission 83). It sits at the top of
// `src/lib/` because it asks `canSeeHabit`, which `src/lib/rewards/` may not
// import (the starFlights.ts precedent). Pure: no database, no clock.

import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { ASSISTANT_GIVER_NAME } from "@/lib/rewardVocabulary";
import { canSeeHabit } from "@/lib/habits/access";
import type { HabitActor } from "@/lib/habits/types";
import {
  calendarDateFromUtcMidnight,
  calendarDateInZone,
  formatCalendarDate,
  formatWeekdayShortDate,
  type CalendarDate,
} from "@/lib/householdDate";
import type { HistoryEntry, RecentEntry } from "@/lib/rewards/starHistory";

export type StarLogRow = {
  id: string;
  day: Date;
  status: string;
  stars: number | null;
  createdAt: Date;
  habit: { title: string; isPrivate: boolean; participants: { userId: string }[] };
};
export type RedemptionRow = { id: string; title: string; emoji: string | null; cost: number; redeemedAt: Date };
export type AdjustmentRow = { id: string; amount: number; note: string | null; createdAt: Date; createdBy: { displayName: string } | null };

/** A named giver always wins; a giverless adjustment is Winnie's only when her id set says so. */
function giverOf(row: { id: string; createdBy: { displayName: string } | null }, assistantIds: ReadonlySet<string>): string | null {
  return row.createdBy?.displayName ?? (assistantIds.has(row.id) ? ASSISTANT_GIVER_NAME : null);
}

function dayFields(date: CalendarDate): { dayKey: string; dayText: string } {
  return { dayKey: formatCalendarDate(date), dayText: formatWeekdayShortDate(date) };
}

function householdDay(instant: Date): { dayKey: string; dayText: string } {
  return dayFields(calendarDateInZone(instant, HOUSEHOLD_TIME_ZONE));
}

/** One person's checks (only the ones that paid), redemptions and adjustments as history entries, for `viewer` (`assistantIds` are the adjustments Winnie made): a private habit's name is hidden unless `canSeeHabit` says the viewer may see it. */
export function toHistoryEntries(
  rows: { logs: StarLogRow[]; redemptions: RedemptionRow[]; adjustments: AdjustmentRow[] },
  viewer: HabitActor,
  assistantIds: ReadonlySet<string>,
): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  for (const log of rows.logs) {
    if (log.stars === null) continue;
    const visible = canSeeHabit(viewer, { isPrivate: log.habit.isPrivate, participantIds: log.habit.participants.map((p) => p.userId) });
    entries.push({
      id: `log-${log.id}`,
      kind: log.status === "late" ? "late" : "check",
      amount: log.stars,
      at: log.createdAt.getTime(),
      ...dayFields(calendarDateFromUtcMidnight(log.day)),
      title: visible ? log.habit.title : null,
      nameHidden: !visible,
      giverName: null,
      note: null,
      emoji: null,
    });
  }
  for (const row of rows.redemptions) {
    entries.push({
      id: `redeem-${row.id}`, kind: "redeem", amount: -row.cost, at: row.redeemedAt.getTime(), ...householdDay(row.redeemedAt),
      title: row.title, nameHidden: false, giverName: null, note: null, emoji: row.emoji,
    });
  }
  for (const row of rows.adjustments) {
    entries.push({
      id: `adjust-${row.id}`, kind: row.amount < 0 ? "take" : "bonus", amount: row.amount, at: row.createdAt.getTime(), ...householdDay(row.createdAt),
      title: null, nameHidden: false, giverName: giverOf(row, assistantIds), note: row.note, emoji: null,
    });
  }
  return entries;
}

/** The household's redemptions and adjustments as Manage's Recent entries. Ids are the plain row ids, which Undo needs. `assistantIds` are the adjustments Winnie made. */
export function toRecentEntries(rows: {
  redemptions: (RedemptionRow & { user: { displayName: string }; redeemedBy: { displayName: string } | null })[];
  adjustments: (AdjustmentRow & { user: { displayName: string } })[];
}, assistantIds: ReadonlySet<string>): RecentEntry[] {
  return [
    ...rows.redemptions.map((row): RecentEntry => ({
      id: row.id, kind: "redeem", amount: -row.cost, at: row.redeemedAt.getTime(), ...householdDay(row.redeemedAt),
      personName: row.user.displayName, title: row.title, emoji: row.emoji, giverName: row.redeemedBy?.displayName ?? null, note: null,
    })),
    ...rows.adjustments.map((row): RecentEntry => ({
      id: row.id, kind: row.amount < 0 ? "take" : "bonus", amount: row.amount, at: row.createdAt.getTime(), ...householdDay(row.createdAt),
      personName: row.user.displayName, title: null, emoji: null, giverName: giverOf(row, assistantIds), note: row.note,
    })),
  ];
}
