"use server";

// The Rewards page's writes (mission 81, 82). Each action checks the login and
// the role itself (a Server Action is a public POST) and never throws on bad
// input. Who may do what, and whether the parent PIN is asked, is answered
// only by src/lib/rewardGates.ts; the PIN is checked here, on the server, on
// every call that needs it. The rules are in src/lib/rewards/rewardRules.ts and
// the words in src/lib/rewardVocabulary.ts; the writes are in
// src/lib/rewardWrites.ts. The PIN is never logged or sent back.

import { revalidatePath } from "next/cache";

import { getVerifiedUser } from "@/lib/dal";
import { loadHouseholdPeople } from "@/lib/householdPeople";
import { canUndoRedeem } from "@/lib/rewards/access";
import { checkRewardInput, checkWishInput } from "@/lib/rewards/rewardRules";
import { manageGate, mayChangeWish, redeemGate, type Gate } from "@/lib/rewardGates";
import { loadRewardFacts } from "@/lib/rewardsRead";
import { loadPinStatus } from "@/lib/rewardSettingsRead";
import {
  PIN_LOCKED_TITLE,
  PIN_NEEDED,
  PIN_NOT_SET_TITLE,
  PIN_WRONG,
  REDEEM_UNDO_REFUSAL,
  REWARD_GONE_REFUSAL,
  REWARD_NEEDS_COST_REFUSAL,
  REWARD_PARENT_REFUSAL,
  REWARD_SAVE_FAILED,
} from "@/lib/rewardVocabulary";
import {
  checkRewardPin,
  createReward,
  createWish,
  deleteReward as deleteRewardRow,
  redeemReward as writeRedemption,
  undoRedemption,
  updateReward,
  updateWish,
} from "@/lib/rewardWrites";
import { isWriteConflictError } from "@/lib/prismaErrors";

/**
 * What an action says back when it refuses. `pin` tells the pad what to do:
 * needed (no PIN was sent), wrong (clear the dots), locked (grey the keys; `lockMs`
 * is how long), notSet (no parent has set a PIN yet).
 */
export type RewardRefusal = { error: string; pin?: "needed" | "wrong" | "locked" | "notSet"; lockMs?: number };

function refreshRewards() {
  revalidatePath("/rewards");
  revalidatePath("/habits");
}

/** Turns a gate plus the sent PIN into null (go ahead) or the refusal to return. */
async function passGate(gate: Gate, pin: unknown): Promise<RewardRefusal | null> {
  if (gate === "open") return null;
  if (gate === "no") return { error: REWARD_PARENT_REFUSAL };
  if (gate === "noPin") return { error: PIN_NOT_SET_TITLE, pin: "notSet" };
  if (pin === undefined || pin === null || pin === "") return { error: PIN_NEEDED, pin: "needed" };
  const checked = await checkRewardPin(pin, new Date());
  if (checked.ok) return null;
  if (checked.reason === "wrong") return { error: PIN_WRONG, pin: "wrong" };
  if (checked.reason === "notSet") return { error: PIN_NOT_SET_TITLE, pin: "notSet" };
  return { error: PIN_LOCKED_TITLE, pin: "locked", lockMs: checked.lockMs };
}

/** Add a reward, or change the one named by `id`. A parent is never asked for the PIN; the tablet is (when the switch is on). */
export async function saveReward(raw: unknown, id?: string, pin?: string): Promise<{ error?: string } | RewardRefusal> {
  const user = await getVerifiedUser();
  if (!user) return { error: REWARD_PARENT_REFUSAL };
  if (id !== undefined && (typeof id !== "string" || id.length === 0)) return { error: REWARD_GONE_REFUSAL };

  try {
    const gate = manageGate(user, await loadPinStatus());
    if (gate === "no") return { error: REWARD_PARENT_REFUSAL };
    const checked = checkRewardInput(raw);
    if (!checked.ok) return { error: checked.error };
    const refusal = await passGate(gate, pin);
    if (refusal) return refusal;

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

/** Delete a reward. A wish its login may change goes with no PIN; anything else follows `manageGate`. */
export async function deleteReward(id: string, pin?: string): Promise<{ error?: string } | RewardRefusal> {
  const user = await getVerifiedUser();
  if (!user) return { error: REWARD_PARENT_REFUSAL };
  if (typeof id !== "string" || id.length === 0) return { error: REWARD_GONE_REFUSAL };
  try {
    const facts = await loadRewardFacts(id);
    if (facts === null) return {};
    const ownWish = facts.cost === null && mayChangeWish(user, facts.ownerId);
    if (!ownWish) {
      const refusal = await passGate(manageGate(user, await loadPinStatus()), pin);
      if (refusal) return refusal;
    }
    await deleteRewardRow(id, ownWish);
  } catch (error) {
    console.error("Reward delete failed", error);
    return { error: REWARD_SAVE_FAILED };
  }
  refreshRewards();
  return {};
}

/** Add a wish (a reward with no cost), or rename and re-picture the one named by `id`. No PIN. A kid does it for themselves, the tablet for anyone. */
export async function saveWish(raw: unknown, id?: string): Promise<{ error?: string }> {
  const user = await getVerifiedUser();
  if (!user) return { error: REWARD_PARENT_REFUSAL };
  if (id !== undefined && (typeof id !== "string" || id.length === 0)) return { error: REWARD_GONE_REFUSAL };
  const checked = checkWishInput(raw);
  if (!checked.ok) return { error: checked.error };

  try {
    if (id === undefined) {
      const people = await loadHouseholdPeople();
      if (!people.some((person) => person.id === checked.value.ownerId)) return { error: REWARD_SAVE_FAILED };
      if (!mayChangeWish(user, checked.value.ownerId)) return { error: REWARD_PARENT_REFUSAL };
      await createWish(checked.value, user.userId);
    } else {
      const facts = await loadRewardFacts(id);
      if (facts === null || facts.cost !== null) return { error: REWARD_GONE_REFUSAL };
      if (!mayChangeWish(user, facts.ownerId)) return { error: REWARD_PARENT_REFUSAL };
      if ((await updateWish(id, { title: checked.value.title, emoji: checked.value.emoji })) === null) return { error: REWARD_GONE_REFUSAL };
    }
  } catch (error) {
    console.error("Wish save failed", error);
    return { error: REWARD_SAVE_FAILED };
  }
  refreshRewards();
  return {};
}

/** Spend the owner's stars on a reward. Returns the redemption for the celebration (its date as an ISO string, so it crosses to the browser). */
export async function redeemReward(
  rewardId: string,
  pin?: string,
): Promise<RewardRefusal | { redemption: { id: string; title: string; emoji: string | null; cost: number; ownerName: string; redeemedAt: string } }> {
  const user = await getVerifiedUser();
  if (!user) return { error: REWARD_PARENT_REFUSAL };
  if (typeof rewardId !== "string" || rewardId.length === 0) return { error: REWARD_GONE_REFUSAL };
  try {
    const facts = await loadRewardFacts(rewardId);
    if (facts === null) return { error: REWARD_GONE_REFUSAL };
    const gate = redeemGate(user, facts.ownerId, await loadPinStatus());
    if (gate === "no") return { error: REWARD_PARENT_REFUSAL };
    // A wish can't be redeemed, so say so before a PIN try is spent on it.
    if (facts.cost === null) return { error: REWARD_NEEDS_COST_REFUSAL };
    const refusal = await passGate(gate, pin);
    if (refusal) return refusal;

    const result = await writeRedemption(rewardId, user.userId);
    if (!result.ok) return { error: result.error };
    refreshRewards();
    return { redemption: { ...result.redemption, redeemedAt: result.redemption.redeemedAt.toISOString() } };
  } catch (error) {
    console.error(isWriteConflictError(error) ? "Reward redeem lost every retry" : "Reward redeem failed", error);
    return { error: REWARD_SAVE_FAILED };
  }
}

/** Undo a redeem: the stars go back in the bank. A parent may undo any; anyone else only their own, soon after (canUndoRedeem). */
export async function undoRedeem(redemptionId: string): Promise<{ error?: string }> {
  const user = await getVerifiedUser();
  if (!user) return { error: REWARD_PARENT_REFUSAL };
  if (typeof redemptionId !== "string" || redemptionId.length === 0) return {};
  try {
    const result = await undoRedemption(redemptionId, (redemption) => canUndoRedeem(user, redemption, new Date()));
    if (!result.ok) return { error: REDEEM_UNDO_REFUSAL };
  } catch (error) {
    console.error("Reward undo failed", error);
    return { error: REWARD_SAVE_FAILED };
  }
  refreshRewards();
  return {};
}
