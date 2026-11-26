import "server-only";

import { db } from "@/lib/db";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import type { HabitActor } from "@/lib/habits/types";
import { addCalendarDays, calendarDateInZone, formatCalendarDate, utcMidnightInstant, zoneMidnightInstant } from "@/lib/householdDate";
import { recentLines, starHistory, type HistoryDay, type RecentLine } from "@/lib/rewards/starHistory";
import { toHistoryEntries, toRecentEntries } from "@/lib/starHistoryRows";

// The star history's readers (mission 83). No login check: callers check who
// is asking. These list rows only; the bank sum stays in starBankRead.ts.

const HISTORY_DAYS = 30;
const RECENT_CAP = 100;

function windowStart(now: Date) {
  const today = calendarDateInZone(now, HOUSEHOLD_TIME_ZONE);
  const first = addCalendarDays(today, -(HISTORY_DAYS - 1));
  return { todayKey: formatCalendarDate(today), yesterdayKey: formatCalendarDate(addCalendarDays(today, -1)), first };
}

/** One person's last 30 Denver days (today and 29 before) of star lines, grouped by day, newest first, as `viewer` may see them. */
export async function loadStarHistory(userId: string, viewer: HabitActor, now: Date): Promise<HistoryDay[]> {
  const { todayKey, yesterdayKey, first } = windowStart(now);
  const since = zoneMidnightInstant(first, HOUSEHOLD_TIME_ZONE);
  const [logs, redemptions, adjustments] = await Promise.all([
    db.habitLog.findMany({
      where: { userId, stars: { not: null }, day: { gte: utcMidnightInstant(first) } },
      select: {
        id: true, day: true, status: true, stars: true, createdAt: true,
        habit: { select: { title: true, isPrivate: true, participants: { select: { userId: true } } } },
      },
    }),
    db.rewardRedemption.findMany({
      where: { userId, redeemedAt: { gte: since } },
      select: { id: true, title: true, emoji: true, cost: true, redeemedAt: true },
    }),
    db.starAdjustment.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { id: true, amount: true, note: true, createdAt: true, createdBy: { select: { displayName: true } } },
    }),
  ]);
  return starHistory(toHistoryEntries({ logs, redemptions, adjustments }, viewer), todayKey, yesterdayKey);
}

/** The household's redemptions and adjustments from the last 30 days, newest first, at most 100, for Manage's Recent list. */
export async function loadRecentActivity(now: Date): Promise<RecentLine[]> {
  const { todayKey, yesterdayKey, first } = windowStart(now);
  const since = zoneMidnightInstant(first, HOUSEHOLD_TIME_ZONE);
  const [redemptions, adjustments] = await Promise.all([
    db.rewardRedemption.findMany({
      where: { redeemedAt: { gte: since } },
      orderBy: { redeemedAt: "desc" },
      take: RECENT_CAP,
      select: {
        id: true, title: true, emoji: true, cost: true, redeemedAt: true,
        user: { select: { displayName: true } }, redeemedBy: { select: { displayName: true } },
      },
    }),
    db.starAdjustment.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: RECENT_CAP,
      select: {
        id: true, amount: true, note: true, createdAt: true,
        user: { select: { displayName: true } }, createdBy: { select: { displayName: true } },
      },
    }),
  ]);
  return recentLines(toRecentEntries({ redemptions, adjustments }), todayKey, yesterdayKey).slice(0, RECENT_CAP);
}
