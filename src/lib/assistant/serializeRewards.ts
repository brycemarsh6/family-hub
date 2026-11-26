import { isWish, orderRewards, rewardStatus } from "@/lib/rewards/rewardRules";
import type { HistoryDay, RecentLine } from "@/lib/rewards/starHistory";
import type { RewardView } from "@/lib/rewardsRead";
import type { LateStars } from "@/lib/rewardVocabulary";
import type { HouseholdPerson } from "@/lib/householdPeople";
import type { ChangeInput } from "./audit";
import { toCopy } from "./undoPlan";

// Reader output -> wire format for the Assistant API's Rewards routes. Pure,
// and every output is built field by field: never a spread of a row, so a
// column added later can't leak onto the wire by default. The bank, the
// rewards and the history lines come from the app's own readers; this file
// only shapes them.

export type RewardPerson = Pick<HouseholdPerson, "id" | "displayName">;

/** `GET /rewards`: each person (household order) with their bank and their rewards, earned ones last. */
export function toRewardsAnswer(input: {
  people: readonly RewardPerson[];
  banks: Readonly<Record<string, number>>;
  rewards: readonly RewardView[];
  createdByAssistant: ReadonlySet<string>;
  lateStars: LateStars;
}) {
  return {
    lateStars: input.lateStars,
    people: input.people.map((person) => {
      const bank = input.banks[person.id] ?? 0;
      return {
        personId: person.id,
        name: person.displayName,
        stars: bank,
        rewards: orderRewards(input.rewards.filter((reward) => reward.ownerId === person.id)).map((reward) => {
          const status = rewardStatus(reward, bank);
          return {
            id: reward.id,
            title: reward.title,
            emoji: reward.emoji,
            cost: reward.cost,
            repeatable: reward.repeatable,
            timesRedeemed: reward.redeemedCount,
            status: status.kind,
            progress: status.text === "" ? null : status.text,
            createdByAssistant: input.createdByAssistant.has(reward.id),
          };
        }),
      };
    }),
  };
}

/** `GET /rewards/history`: one person's last 30 days of star lines, newest day first, and their bank. */
export function toHistoryAnswer(person: RewardPerson, stars: number, days: readonly HistoryDay[]) {
  return {
    personId: person.id,
    name: person.displayName,
    stars,
    days: days.map((day) => ({
      date: day.dayKey,
      label: day.label,
      lines: day.lines.map((line) => ({
        id: line.id,
        kind: line.kind,
        text: line.text,
        sub: line.sub,
        amount: line.amount,
        emoji: line.emoji,
      })),
    })),
  };
}

/** `GET /rewards/recent`: the household's redeems and bonuses, newest first. */
export function toRecentAnswer(lines: readonly RecentLine[]) {
  return {
    lines: lines.map((line) => ({ id: line.id, kind: line.kind, title: line.title, sub: line.sub, emoji: line.emoji })),
  };
}

/** `/summary`'s `stars`: each person's bank (household order) and how many of their rewards are wishes still waiting for a cost. */
export function toStarSummary(people: readonly RewardPerson[], banks: Readonly<Record<string, number>>, rewards: readonly RewardView[]) {
  return {
    banks: people.map((person) => ({ personId: person.id, name: person.displayName, stars: banks[person.id] ?? 0 })),
    wishesWaiting: rewards.filter(isWish).length,
  };
}

/** The one star adjustment as `POST /rewards/adjustments` answers it. */
export function toAdjustmentAnswer(row: { id: string; userId: string; amount: number; note: string | null; createdAt: Date }) {
  return { id: row.id, personId: row.userId, amount: row.amount, note: row.note, createdAt: row.createdAt.toISOString() };
}

// ---- Audit copies ----

type Row = Record<string, unknown> & { id: string };

/** A reward write's entry: the whole row before and after (`update` needs both, `create` only after, `delete` only before). */
export function rewardChange(action: ChangeInput["action"], before: Row | null, after: Row | null): ChangeInput {
  const row = (after ?? before)!;
  return {
    model: "Reward",
    recordId: row.id,
    action,
    summary: { title: row.title, cost: row.cost ?? null },
    before: before ? toCopy("Reward", before) : null,
    after: after ? toCopy("Reward", after) : null,
  };
}

/** A bonus or taken-away line that was just added. */
export function adjustmentChange(row: Row & { amount: number }): ChangeInput {
  return {
    model: "StarAdjustment",
    recordId: row.id,
    action: "create",
    summary: { amount: row.amount },
    before: null,
    after: toCopy("StarAdjustment", row),
  };
}
