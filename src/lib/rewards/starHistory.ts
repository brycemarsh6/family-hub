// Star history and Manage's Recent list (mission 83): turns plain entries
// into the lines the screens draw. Pure: no database, no habits import (a
// private habit arrives as a `nameHidden` flag), no clock (callers pass the
// day keys). Every word is from rewardVocabulary.ts.

import {
  HISTORY_LATE_SUB,
  HISTORY_PRIVATE_HABIT,
  HISTORY_TODAY,
  HISTORY_YESTERDAY,
  bonusFromText,
  historyRedeemedText,
  recentAdjustSub,
  recentBonusTitle,
  recentRedeemSub,
  recentRedeemedTitle,
  recentTakenTitle,
  signedStarsText,
  takenByText,
} from "../rewardVocabulary";

export type HistoryKind = "check" | "late" | "redeem" | "bonus" | "take";

/** One thing that moved a bank. `amount` is signed; `at` is the sort key (ms); `dayKey` is "YYYY-MM-DD" and `dayText` is that day already formatted ("Sat, Nov 21"). */
export type HistoryEntry = {
  id: string;
  kind: HistoryKind;
  amount: number;
  at: number;
  dayKey: string;
  dayText: string;
  /** The habit's name (check, late) or the reward's title (redeem); null for a bonus or take. */
  title: string | null;
  /** A check on a habit the viewer cannot see. */
  nameHidden: boolean;
  giverName: string | null;
  note: string | null;
  emoji: string | null;
};

export type HistoryLine = {
  id: string;
  kind: HistoryKind;
  text: string;
  sub: string | null;
  amount: number;
  amountText: string;
  tone: "plus" | "minus";
  emoji: string | null;
};

export type HistoryDay = { dayKey: string; label: string; lines: HistoryLine[] };

function dayLabel(dayKey: string, dayText: string, todayKey: string, yesterdayKey: string): string {
  if (dayKey === todayKey) return HISTORY_TODAY;
  if (dayKey === yesterdayKey) return HISTORY_YESTERDAY;
  return dayText;
}

function historyLine(entry: HistoryEntry): HistoryLine {
  let text: string;
  let sub: string | null = null;
  if (entry.kind === "check" || entry.kind === "late") {
    text = entry.nameHidden ? HISTORY_PRIVATE_HABIT : (entry.title ?? HISTORY_PRIVATE_HABIT);
    if (entry.kind === "late") sub = HISTORY_LATE_SUB;
  } else if (entry.kind === "redeem") {
    text = historyRedeemedText(entry.title ?? "");
  } else {
    text = entry.kind === "bonus" ? bonusFromText(entry.giverName) : takenByText(entry.giverName);
    sub = entry.note;
  }
  return {
    id: entry.id,
    kind: entry.kind,
    text,
    sub,
    amount: entry.amount,
    amountText: signedStarsText(entry.amount),
    tone: entry.amount < 0 ? "minus" : "plus",
    emoji: entry.kind === "redeem" ? entry.emoji : null,
  };
}

/** The history sheet's days, newest first, each with its lines newest first. */
export function starHistory(entries: HistoryEntry[], todayKey: string, yesterdayKey: string): HistoryDay[] {
  const byDay = new Map<string, HistoryEntry[]>();
  for (const entry of entries) byDay.set(entry.dayKey, [...(byDay.get(entry.dayKey) ?? []), entry]);
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([dayKey, group]) => {
      const sorted = [...group].sort((a, b) => b.at - a.at);
      return { dayKey, label: dayLabel(dayKey, sorted[0].dayText, todayKey, yesterdayKey), lines: sorted.map(historyLine) };
    });
}

/** One redemption or adjustment in Manage's Recent list. `amount` is signed (a redeem is minus its cost). */
export type RecentEntry = {
  id: string;
  kind: "redeem" | "bonus" | "take";
  amount: number;
  at: number;
  dayKey: string;
  dayText: string;
  personName: string;
  /** The reward's title (redeem only). */
  title: string | null;
  emoji: string | null;
  giverName: string | null;
  note: string | null;
};

export type RecentLine = { id: string; kind: "redeem" | "bonus" | "take"; title: string; sub: string; emoji: string | null };

/** Manage's Recent lines, newest first. */
export function recentLines(entries: RecentEntry[], todayKey: string, yesterdayKey: string): RecentLine[] {
  return [...entries]
    .sort((a, b) => b.at - a.at)
    .map((entry) => {
      const day = dayLabel(entry.dayKey, entry.dayText, todayKey, yesterdayKey);
      if (entry.kind === "redeem") {
        return {
          id: entry.id,
          kind: entry.kind,
          title: recentRedeemedTitle(entry.title ?? ""),
          sub: recentRedeemSub(entry.personName, Math.abs(entry.amount), day),
          emoji: entry.emoji,
        };
      }
      return {
        id: entry.id,
        kind: entry.kind,
        title: entry.kind === "bonus" ? recentBonusTitle(entry.note) : recentTakenTitle(entry.note),
        sub: recentAdjustSub(entry.personName, entry.amount, entry.giverName, day),
        emoji: null,
      };
    });
}
