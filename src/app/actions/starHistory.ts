"use server";

// A person's star history for the sheet (mission 83). Any signed-in login may
// read anyone's history, the Tablet included; a private habit's name is
// hidden inside the reader. The bank sum is loadStarBanks.

import { getVerifiedUser } from "@/lib/dal";
import { loadHouseholdPeople } from "@/lib/householdPeople";
import type { HistoryDay } from "@/lib/rewards/starHistory";
import { HISTORY_FAILED } from "@/lib/rewardVocabulary";
import { loadStarBanks } from "@/lib/starBankRead";
import { loadStarHistory } from "@/lib/starHistoryRead";

/** `{ name, bank, days }` for an active household person, else `{ error }`. */
export async function getStarHistory(userId: string): Promise<{ error: string } | { name: string; bank: number; days: HistoryDay[] }> {
  const user = await getVerifiedUser();
  if (!user) return { error: HISTORY_FAILED };
  if (typeof userId !== "string" || userId.length === 0) return { error: HISTORY_FAILED };
  try {
    const person = (await loadHouseholdPeople()).find((p) => p.id === userId);
    if (!person) return { error: HISTORY_FAILED };
    const [days, banks] = await Promise.all([
      loadStarHistory(userId, { userId: user.userId, role: user.role }, new Date()),
      loadStarBanks([userId]),
    ]);
    return { name: person.displayName, bank: banks[userId] ?? 0, days };
  } catch (error) {
    console.error("Star history failed", error);
    return { error: HISTORY_FAILED };
  }
}
