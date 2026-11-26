// The pure reward rules (mission 81): the cost stepper, earned and ready,
// what a redeem is refused for, the sheet's input check and the words of the
// redeem sheet. No database, no `server-only`, no clock (callers pass times).

import {
  COST_STEPS,
  REWARD_CELEBRATION_HEADING,
  REWARD_COST_REFUSAL,
  REWARD_EARNED_REFUSAL,
  REWARD_EMOJI_REFUSAL,
  REWARD_NAME_REFUSAL,
  REWARD_NEEDS_COST_REFUSAL,
  REWARD_NOT_EMOJI_REFUSAL,
  REWARD_SAVE_FAILED,
  REWARD_TITLE_MAX,
  DEFAULT_REWARD_COST,
  notEnoughStarsText,
  progressText,
  redeemQuestionText,
  redeemSpendText,
  redeemedByText,
  redeemedTitleText,
  toRewardCost,
} from "../rewardVocabulary";
import { toRewardEmoji } from "./rewardEmoji";

/** One stepper tap: up or down the cost list, stopping at both ends. A cost off the list (or none) snaps to the nearest step instead of walking. */
export function nextCostStep(cost: number | null, dir: "up" | "down"): number {
  const at = toRewardCost(cost);
  if (at === null) {
    const target = typeof cost === "number" && Number.isFinite(cost) ? cost : DEFAULT_REWARD_COST;
    return COST_STEPS.reduce((best, step) => (Math.abs(step - target) < Math.abs(best - target) ? step : best));
  }
  const index = COST_STEPS.indexOf(at);
  return COST_STEPS[dir === "up" ? Math.min(index + 1, COST_STEPS.length - 1) : Math.max(index - 1, 0)];
}

/** A one-time reward that has been redeemed once is earned for good; a repeatable one never is. */
export function isEarned(reward: { repeatable: boolean; redeemedCount: number }): boolean {
  return !reward.repeatable && reward.redeemedCount >= 1;
}

export type RewardStatus = {
  kind: "earned" | "wish" | "ready" | "saving";
  /** 0 to 1: how much of the cost the bank covers (a negative bank is 0). */
  fraction: number;
  /** "55 of 150" for a card still being saved for, else "". */
  text: string;
};

export function rewardStatus(reward: { repeatable: boolean; redeemedCount: number; cost: number | null }, bank: number): RewardStatus {
  if (isEarned(reward)) return { kind: "earned", fraction: 1, text: "" };
  if (reward.cost === null) return { kind: "wish", fraction: 0, text: "" };
  const fraction = Math.min(Math.max(bank, 0) / reward.cost, 1);
  if (bank >= reward.cost) return { kind: "ready", fraction, text: "" };
  return { kind: "saving", fraction, text: progressText(bank, reward.cost) };
}

/** Earned rewards go after the rest; the added order holds inside each group. */
export function orderRewards<T extends { repeatable: boolean; redeemedCount: number }>(rewards: readonly T[]): T[] {
  return [...rewards.filter((reward) => !isEarned(reward)), ...rewards.filter(isEarned)];
}

/** Hide earned: drops earned rewards when the switch is on; otherwise earned ones sit last. */
export function visibleRewards<T extends { repeatable: boolean; redeemedCount: number }>(rewards: readonly T[], hideEarned: boolean): T[] {
  return hideEarned ? rewards.filter((reward) => !isEarned(reward)) : orderRewards(rewards);
}

/** Why a redeem is refused, or null when it may go ahead: earned first, then no cost, then not enough stars. */
export function redeemRefusal(
  reward: { repeatable: boolean; redeemedCount: number; cost: number | null },
  bank: number,
  ownerName: string,
): string | null {
  if (isEarned(reward)) return REWARD_EARNED_REFUSAL;
  if (reward.cost === null) return REWARD_NEEDS_COST_REFUSAL;
  if (bank < reward.cost) return notEnoughStarsText(ownerName, reward.cost - bank);
  return null;
}

export type RewardInput = { title: string; emoji: string | null; cost: number; repeatable: boolean; ownerId: string };

/** The reward sheet's input, checked: the clean value or the refusal to show. */
export function checkRewardInput(raw: unknown): { ok: true; value: RewardInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: REWARD_SAVE_FAILED };
  const input = raw as Record<string, unknown>;

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (title.length === 0 || title.length > REWARD_TITLE_MAX) return { ok: false, error: REWARD_NAME_REFUSAL };

  let emoji: string | null = null;
  if (input.emoji !== null && input.emoji !== undefined) {
    if (typeof input.emoji !== "string") return { ok: false, error: REWARD_EMOJI_REFUSAL };
    if (input.emoji.trim().length > 0) {
      emoji = toRewardEmoji(input.emoji);
      if (emoji === null) return { ok: false, error: REWARD_NOT_EMOJI_REFUSAL };
    }
  }

  const cost = toRewardCost(input.cost);
  if (cost === null) return { ok: false, error: REWARD_COST_REFUSAL };
  if (typeof input.repeatable !== "boolean") return { ok: false, error: REWARD_SAVE_FAILED };
  if (typeof input.ownerId !== "string" || input.ownerId.length === 0) return { ok: false, error: REWARD_SAVE_FAILED };

  return { ok: true, value: { title, emoji, cost, repeatable: input.repeatable, ownerId: input.ownerId } };
}

/** The celebration's three lines; `dateText` is the already-formatted day ("Tuesday, November 24"). */
export function celebrationLines(
  redemption: { title: string; ownerName: string; cost: number },
  dateText: string,
): { heading: string; title: string; by: string } {
  return { heading: REWARD_CELEBRATION_HEADING, title: redeemedTitleText(redemption.title), by: redeemedByText(redemption.ownerName, redemption.cost, dateText) };
}

/** The confirm sheet's question and spend line. */
export function redeemConfirmLines(reward: { title: string; cost: number }, ownerName: string, bank: number): { question: string; spend: string } {
  return { question: redeemQuestionText(reward.title, ownerName), spend: redeemSpendText(reward.cost, ownerName, bank) };
}
