"use server";

// The household's Rewards settings (mission 79, 82). Each action is for
// parents and admins on a real login (never a device); it checks the login
// itself and never throws. The rules are in src/lib/rewardVocabulary.ts and
// src/lib/rewards/pinPolicy.ts; the one read is src/lib/rewardSettingsRead.ts
// and the writes are in src/lib/rewardWrites.ts. The PIN is never logged or
// sent back.

import { revalidatePath } from "next/cache";

import { getVerifiedUser } from "@/lib/dal";
import { canSetRewardPin, canSetStars } from "@/lib/rewards/access";
import { PIN_LENGTH, isPinShaped } from "@/lib/rewards/pinPolicy";
import { LATE_STARS, LATE_STARS_OFF_LIST, LATE_STARS_REFUSAL, PIN_SWITCH_REFUSAL, REWARD_PARENT_REFUSAL, REWARD_SAVE_FAILED, pinShapeRefusal } from "@/lib/rewardVocabulary";
import { writeLateStars, writePinRequired, writeRewardPin } from "@/lib/rewardWrites";

export async function saveLateStars(value: unknown): Promise<{ error?: string }> {
  const user = await getVerifiedUser();
  if (!user || !canSetStars(user.role)) return { error: LATE_STARS_REFUSAL };
  const lateStars = LATE_STARS.find((choice) => choice === value);
  if (!lateStars) return { error: LATE_STARS_OFF_LIST };

  try {
    await writeLateStars(lateStars, user.userId);
  } catch (error) {
    console.error("Late stars save failed", error);
    return { error: REWARD_SAVE_FAILED };
  }
  revalidatePath("/settings");
  revalidatePath("/habits");
  return {};
}

/** Set or change the parent PIN (it also clears any wrong-try lock). Changing it does not ask for the old one. */
export async function setRewardPin(pin: unknown): Promise<{ error?: string }> {
  const user = await getVerifiedUser();
  if (!user || !canSetRewardPin(user.role)) return { error: REWARD_PARENT_REFUSAL };
  if (!isPinShaped(pin)) return { error: pinShapeRefusal(PIN_LENGTH) };

  try {
    await writeRewardPin(pin, user.userId);
  } catch {
    // Not logged with the error: nothing here may carry the PIN.
    console.error("Reward PIN save failed");
    return { error: REWARD_SAVE_FAILED };
  }
  revalidatePath("/settings");
  revalidatePath("/rewards");
  return {};
}

/** The "Ask for the PIN" switch. */
export async function saveRewardPinRequired(on: unknown): Promise<{ error?: string }> {
  const user = await getVerifiedUser();
  if (!user || !canSetRewardPin(user.role)) return { error: REWARD_PARENT_REFUSAL };
  if (typeof on !== "boolean") return { error: PIN_SWITCH_REFUSAL };

  try {
    await writePinRequired(on, user.userId);
  } catch (error) {
    console.error("Reward PIN switch save failed", error);
    return { error: REWARD_SAVE_FAILED };
  }
  revalidatePath("/settings");
  revalidatePath("/rewards");
  return {};
}
