import "server-only";

import { db } from "@/lib/db";
import { sumStars } from "@/lib/rewards/stars";

// The only place the star bank is added up. No login check: callers check
// who is asking. Today the bank is the stars on a person's check rows; later
// Rewards PRs add adjustments and redemptions here.

/** Each asked person's star bank; everyone asked is in the answer (0 when they have none). */
export async function loadStarBanks(userIds: string[]): Promise<Record<string, number>> {
  const banks: Record<string, number> = Object.fromEntries(userIds.map((id) => [id, 0]));
  if (userIds.length === 0) return banks;
  const groups = await db.habitLog.groupBy({ by: ["userId"], where: { userId: { in: userIds }, stars: { not: null } }, _sum: { stars: true } });
  for (const group of groups) banks[group.userId] = sumStars([group._sum.stars]);
  return banks;
}
