import "server-only";

import { db } from "@/lib/db";

// The only reader that builds a RewardView. No login check: callers check who
// is asking. The settings read is rewardSettingsRead.ts; the bank is
// starBankRead.ts.

/** A reward as the Rewards page shows it. `redeemedCount` is how many times it has been redeemed. */
export type RewardView = {
  id: string;
  ownerId: string;
  title: string;
  emoji: string | null;
  cost: number | null;
  repeatable: boolean;
  redeemedCount: number;
};

/** The asked people's rewards, in the order they were arranged, then oldest first. */
export async function loadRewards(ownerIds: string[]): Promise<RewardView[]> {
  if (ownerIds.length === 0) return [];
  const rows = await db.reward.findMany({
    where: { ownerId: { in: ownerIds } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, ownerId: true, title: true, emoji: true, cost: true, repeatable: true, _count: { select: { redemptions: true } } },
  });
  return rows.map(({ _count, ...row }) => ({ ...row, redeemedCount: _count.redemptions }));
}

/**
 * The second reader of `Reward` rows (the first builds the page's `RewardView`):
 * just who owns one and whether it has a cost, so an action can work out the
 * gate (a wish has no cost) before it writes.
 */
export async function loadRewardFacts(id: string): Promise<{ ownerId: string; cost: number | null } | null> {
  return db.reward.findUnique({ where: { id }, select: { ownerId: true, cost: true } });
}
