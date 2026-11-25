"use server";

// The household's Rewards settings (mission 79). saveLateStars is for parents
// and admins on a real login (never a device); it checks the login itself and
// never throws. The rules are in src/lib/rewardVocabulary.ts; the one read is
// src/lib/rewardSettingsRead.ts.

import { revalidatePath } from "next/cache";

import { getVerifiedUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { canSetStars } from "@/lib/rewards/access";
import { LATE_STARS, LATE_STARS_OFF_LIST, LATE_STARS_REFUSAL } from "@/lib/rewardVocabulary";

export async function saveLateStars(value: unknown): Promise<{ error?: string }> {
  const user = await getVerifiedUser();
  if (!user || !canSetStars(user.role)) return { error: LATE_STARS_REFUSAL };
  const lateStars = LATE_STARS.find((choice) => choice === value);
  if (!lateStars) return { error: LATE_STARS_OFF_LIST };

  try {
    await db.rewardSettings.upsert({
      where: { id: "household" },
      create: { id: "household", lateStars, updatedById: user.userId },
      update: { lateStars, updatedById: user.userId },
    });
  } catch (error) {
    console.error("Late stars save failed", error);
    return { error: "That didn't save. Please try again." };
  }
  revalidatePath("/settings");
  revalidatePath("/habits");
  return {};
}
