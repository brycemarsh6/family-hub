"use server";

// Give or take stars, and undo one (mission 83). Each action checks the login
// and the role itself (a Server Action is a public POST) and never throws on
// bad input. Rules: src/lib/rewards/starAdjustments.ts; words:
// src/lib/rewardVocabulary.ts; writes: src/lib/starAdjustmentWrites.ts.

import { revalidatePath } from "next/cache";

import { getVerifiedUser } from "@/lib/dal";
import { canAdjustStars } from "@/lib/rewards/access";
import { toAdjustmentInput } from "@/lib/rewards/starAdjustments";
import { ADJUST_PERSON_REFUSAL, REWARD_PARENT_REFUSAL, REWARD_SAVE_FAILED } from "@/lib/rewardVocabulary";
import { addStarAdjustment, removeStarAdjustment } from "@/lib/starAdjustmentWrites";

function refreshStars() {
  revalidatePath("/rewards");
  revalidatePath("/rewards/manage");
  revalidatePath("/habits");
}

/** Give or take stars: `raw` is `{ userId, direction: "give" | "take", amount, note }`. */
export async function giveOrTakeStars(raw: unknown): Promise<{ error?: string }> {
  const user = await getVerifiedUser();
  if (!user || !canAdjustStars(user.role)) return { error: REWARD_PARENT_REFUSAL };
  const input = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  if (typeof input.userId !== "string" || input.userId.length === 0) return { error: ADJUST_PERSON_REFUSAL };
  const checked = toAdjustmentInput(raw);
  if (!checked.ok) return { error: checked.error };
  try {
    const result = await addStarAdjustment({ userId: input.userId, ...checked.value, createdById: user.userId });
    if (!result.ok) return { error: result.error };
  } catch (error) {
    console.error("Star adjustment failed", error);
    return { error: REWARD_SAVE_FAILED };
  }
  refreshStars();
  return {};
}

/** Undo a bonus or taken-away line: the bank goes back. */
export async function undoStarAdjustment(id: string): Promise<{ error?: string }> {
  const user = await getVerifiedUser();
  if (!user || !canAdjustStars(user.role)) return { error: REWARD_PARENT_REFUSAL };
  if (typeof id !== "string" || id.length === 0) return {};
  try {
    await removeStarAdjustment(id);
  } catch (error) {
    console.error("Star adjustment undo failed", error);
    return { error: REWARD_SAVE_FAILED };
  }
  refreshStars();
  return {};
}
