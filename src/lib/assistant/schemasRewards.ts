import { z } from "zod";
import { checkRewardInput, checkWishInput, type RewardInput, type WishInput } from "@/lib/rewards/rewardRules";
import { REWARD_NEEDS_COST_REFUSAL } from "@/lib/rewardVocabulary";
import { invalid, type WriteError } from "@/lib/writeError";
import type { RewardEdit } from "@/lib/rewardWrites";

// Request shapes for the Assistant API's Rewards routes. Pure (zod and the
// app's pure reward rules), `.strict()`: an unknown key is a 400, not ignored.

export const rewardsQuery = z.object({ personId: z.string().min(1).optional() }).strict();

export const rewardsHistoryQuery = z.object({ personId: z.string().min(1) }).strict();

// ---- Writes (mission 85) ----
// Bodies are strict and generous: the app's own checks (`checkRewardInput`,
// `checkWishInput`, `toAdjustmentInput`) give the words and the cost and star
// lists, so nothing is repeated here beyond the three sentences only Winnie
// is ever told.

/** 403: Winnie's delete is for what she added. */
export const REWARD_NOT_HERS = "Winnie can only delete a reward or wish she added herself.";
/** 409: a redeemed reward is part of the family's history. */
export const REWARD_REDEEMED = "That reward has already been redeemed, so it can't be deleted.";
/** 400: an hours habit is measured in time, not checks. */
export const HOURS_NO_STARS = "Hours habits don't pay stars.";

const emoji = z.string().max(100).nullable();

export const rewardCreateBody = z
  .object({
    personId: z.string().min(1),
    title: z.string().max(500),
    emoji: emoji.optional(),
    cost: z.number().int().nullable().optional(),
    repeatable: z.boolean().optional(),
  })
  .strict();

export const rewardPatchBody = z
  .object({
    title: z.string().max(500).optional(),
    emoji: emoji.optional(),
    cost: z.number().int().optional(),
    repeatable: z.boolean().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: "Send at least one field to change." });

export const adjustmentBody = z
  .object({
    personId: z.string().min(1),
    direction: z.enum(["give", "take"]),
    amount: z.number().int(),
    note: z.string().max(500).nullable().optional(),
  })
  .strict();

export type RewardCreateBody = z.output<typeof rewardCreateBody>;
export type RewardPatchBody = z.output<typeof rewardPatchBody>;

/** A new reward (cost given) or wish (no cost), checked by the app's own rules; or the refusal. */
export function newRewardInput(body: RewardCreateBody): { kind: "reward"; value: RewardInput } | { kind: "wish"; value: WishInput } | WriteError {
  const raw = { title: body.title, emoji: body.emoji, ownerId: body.personId };
  if (body.cost === undefined || body.cost === null) {
    if (body.repeatable === true) return invalid(REWARD_NEEDS_COST_REFUSAL);
    const wish = checkWishInput(raw);
    return wish.ok ? { kind: "wish", value: wish.value } : invalid(wish.error);
  }
  const reward = checkRewardInput({ ...raw, cost: body.cost, repeatable: body.repeatable ?? false });
  return reward.ok ? { kind: "reward", value: reward.value } : invalid(reward.error);
}

/**
 * The edit body laid over the reward as it is now (a field left out keeps its
 * value). No cost after that is a wish: it can't repeat, so `repeatable: true`
 * sent is refused. A cost makes it a reward, checked as the reward sheet does.
 */
export function patchedRewardInput(
  current: { title: string; emoji: string | null; cost: number | null; repeatable: boolean; ownerId: string },
  body: RewardPatchBody,
): RewardEdit | WriteError {
  const merged = {
    title: body.title === undefined ? current.title : body.title,
    emoji: body.emoji === undefined ? current.emoji : body.emoji,
    cost: body.cost === undefined ? current.cost : body.cost,
    repeatable: body.repeatable === undefined ? current.repeatable : body.repeatable,
    ownerId: current.ownerId,
  };
  if (merged.cost === null) {
    if (body.repeatable === true) return invalid(REWARD_NEEDS_COST_REFUSAL);
    const wish = checkWishInput(merged);
    return wish.ok ? { ...wish.value, cost: null, repeatable: false } : invalid(wish.error);
  }
  const reward = checkRewardInput(merged);
  return reward.ok ? reward.value : invalid(reward.error);
}
