"use server";

// The Rewards page's writes (mission 81). Each action checks the login and
// the role itself (a Server Action is a public POST) and never throws on bad
// input. The rules are in src/lib/rewards/rewardRules.ts and the words in
// src/lib/rewardVocabulary.ts; the writes are in src/lib/rewardWrites.ts.

import { revalidatePath } from "next/cache";

import { getVerifiedUser } from "@/lib/dal";
import { loadHouseholdPeople } from "@/lib/householdPeople";
import { canManageRewards, canRedeemRewards } from "@/lib/rewards/access";
import { checkRewardInput } from "@/lib/rewards/rewardRules";
import { REWARD_GONE_REFUSAL, REWARD_PARENT_REFUSAL, REWARD_SAVE_FAILED } from "@/lib/rewardVocabulary";
import { createReward, deleteReward as deleteRewardRow, redeemReward as writeRedemption, undoRedemption, updateReward } from "@/lib/rewardWrites";
import { isWriteConflictError } from "@/lib/prismaErrors";

function refreshRewards() {
  revalidatePath("/rewards");
  revalidatePath("/habits");
}

/** Add a reward, or change the one named by `id`. */
export async function saveReward(raw: unknown, id?: string): Promise<{ error?: string }> {
  const user = await getVerifiedUser();
  if (!user || !canManageRewards(user.role)) return { error: REWARD_PARENT_REFUSAL };
  if (id !== undefined && (typeof id !== "string" || id.length === 0)) return { error: REWARD_GONE_REFUSAL };
  const checked = checkRewardInput(raw);
  if (!checked.ok) return { error: checked.error };

  try {
    const people = await loadHouseholdPeople();
    if (!people.some((person) => person.id === checked.value.ownerId)) return { error: REWARD_SAVE_FAILED };
    if (id === undefined) {
      await createReward(checked.value, user.userId);
    } else if ((await updateReward(id, checked.value)) === null) {
      return { error: REWARD_GONE_REFUSAL };
    }
  } catch (error) {
    console.error("Reward save failed", error);
    return { error: REWARD_SAVE_FAILED };
  }
  refreshRewards();
  return {};
}

export async function deleteReward(id: string): Promise<{ error?: string }> {
  const user = await getVerifiedUser();
  if (!user || !canManageRewards(user.role)) return { error: REWARD_PARENT_REFUSAL };
  if (typeof id !== "string" || id.length === 0) return { error: REWARD_GONE_REFUSAL };
  try {
    await deleteRewardRow(id);
  } catch (error) {
    console.error("Reward delete failed", error);
    return { error: REWARD_SAVE_FAILED };
  }
  refreshRewards();
  return {};
}

/** Spend the owner's stars on a reward. Returns the redemption for the celebration (its date as an ISO string, so it crosses to the browser). */
export async function redeemReward(
  rewardId: string,
): Promise<{ error: string } | { redemption: { id: string; title: string; emoji: string | null; cost: number; ownerName: string; redeemedAt: string } }> {
  const user = await getVerifiedUser();
  if (!user || !canRedeemRewards(user.role)) return { error: REWARD_PARENT_REFUSAL };
  if (typeof rewardId !== "string" || rewardId.length === 0) return { error: REWARD_GONE_REFUSAL };
  try {
    const result = await writeRedemption(rewardId, user.userId);
    if (!result.ok) return { error: result.error };
    refreshRewards();
    return { redemption: { ...result.redemption, redeemedAt: result.redemption.redeemedAt.toISOString() } };
  } catch (error) {
    console.error(isWriteConflictError(error) ? "Reward redeem lost every retry" : "Reward redeem failed", error);
    return { error: REWARD_SAVE_FAILED };
  }
}

/** Undo a redeem: the stars go back in the bank. */
export async function undoRedeem(redemptionId: string): Promise<{ error?: string }> {
  const user = await getVerifiedUser();
  if (!user || !canRedeemRewards(user.role)) return { error: REWARD_PARENT_REFUSAL };
  if (typeof redemptionId !== "string" || redemptionId.length === 0) return {};
  try {
    await undoRedemption(redemptionId);
  } catch (error) {
    console.error("Reward undo failed", error);
    return { error: REWARD_SAVE_FAILED };
  }
  refreshRewards();
  return {};
}
