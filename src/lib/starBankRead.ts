import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { sumStars } from "@/lib/rewards/stars";

// The only place the star bank is added up. No login check: callers check
// who is asking. The bank is the stars on a person's check rows minus the
// cost of every reward redeemed for them; a later Rewards PR adds
// adjustments here. Pass a transaction as `client` to read the bank inside it.

/** Each asked person's star bank; everyone asked is in the answer (0 when they have none). It can go below 0 (un-checking a habit after a redeem). */
export async function loadStarBanks(userIds: string[], client: Prisma.TransactionClient = db): Promise<Record<string, number>> {
  const banks: Record<string, number> = Object.fromEntries(userIds.map((id) => [id, 0]));
  if (userIds.length === 0) return banks;
  const [earned, spent] = await Promise.all([
    client.habitLog.groupBy({ by: ["userId"], where: { userId: { in: userIds }, stars: { not: null } }, _sum: { stars: true } }),
    client.rewardRedemption.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _sum: { cost: true } }),
  ]);
  for (const group of earned) banks[group.userId] = sumStars([group._sum.stars]);
  for (const group of spent) banks[group.userId] -= group._sum.cost ?? 0;
  return banks;
}
