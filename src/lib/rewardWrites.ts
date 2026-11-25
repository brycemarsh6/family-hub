import "server-only";

// The one definition of every reward write (mission 81). A `server-only` lib
// module with NO auth check of its own, in the shape of pantryWrites.ts: the
// Server Actions in actions/rewards.ts carry the login and role gate and
// `revalidatePath` (route strings never live in lib), and a later caller (a
// Winnie route) brings its own gate. Input is checked by `checkRewardInput`
// before it gets here.

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { isWriteConflictError } from "@/lib/prismaErrors";
import { loadStarBanks } from "@/lib/starBankRead";
import { redeemRefusal, type RewardInput } from "@/lib/rewards/rewardRules";
import { REWARD_GONE_REFUSAL, REWARD_SAVE_FAILED } from "@/lib/rewardVocabulary";

/** Add a reward at the end of its owner's list. */
export async function createReward(value: RewardInput, createdById: string): Promise<{ id: string }> {
  const last = await db.reward.aggregate({ where: { ownerId: value.ownerId }, _max: { sortOrder: true } });
  return db.reward.create({
    data: { ...value, createdById, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    select: { id: true },
  });
}

/** Change a reward's picture, name, cost, repeat setting and owner. Null when it is gone. Past redemptions keep their snapshots. */
export async function updateReward(id: string, value: RewardInput): Promise<{ id: string } | null> {
  const result = await db.reward.updateMany({ where: { id }, data: value });
  return result.count === 0 ? null : { id };
}

/** Delete a reward. Its redemptions stay (their `rewardId` goes null). Already gone is not an error. */
export async function deleteReward(id: string): Promise<void> {
  await db.reward.deleteMany({ where: { id } });
}

export type Redeemed = { id: string; title: string; emoji: string | null; cost: number; ownerName: string; redeemedAt: Date };

const MAX_TRIES = 3;

/**
 * A serialization failure caught when the transaction COMMITS arrives as a
 * bare DriverAdapterError (not a PrismaClientKnownRequestError), so
 * `isWriteConflictError` misses it. Seen live in the dev database with two
 * quick redeems: name "DriverAdapterError", cause.originalCode "40001".
 */
function isCommitConflict(error: unknown): boolean {
  if (!(error instanceof Error) || error.name !== "DriverAdapterError") return false;
  const code = (error as { cause?: { originalCode?: unknown } }).cause?.originalCode;
  return code === "40001" || code === "40P01";
}

/**
 * Redeem a reward for its owner. One Serializable transaction reads the
 * reward, re-reads the bank inside it, asks `redeemRefusal`, then writes the
 * redemption, so two quick taps cannot both spend the same stars: the second
 * either sees the lower bank and is refused, or is aborted by Postgres and
 * retried (up to 3 tries in all). A refusal is returned, not thrown.
 */
export async function redeemReward(rewardId: string, redeemedById: string): Promise<{ ok: true; redemption: Redeemed } | { ok: false; error: string }> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          const reward = await tx.reward.findUnique({
            where: { id: rewardId },
            select: {
              id: true,
              ownerId: true,
              title: true,
              emoji: true,
              cost: true,
              repeatable: true,
              owner: { select: { displayName: true } },
              _count: { select: { redemptions: true } },
            },
          });
          if (!reward) return { ok: false as const, error: REWARD_GONE_REFUSAL };
          const bank = (await loadStarBanks([reward.ownerId], tx))[reward.ownerId] ?? 0;
          const refusal = redeemRefusal({ ...reward, redeemedCount: reward._count.redemptions }, bank, reward.owner.displayName);
          if (refusal !== null || reward.cost === null) return { ok: false as const, error: refusal ?? REWARD_SAVE_FAILED };
          const row = await tx.rewardRedemption.create({
            data: { userId: reward.ownerId, rewardId: reward.id, title: reward.title, emoji: reward.emoji, cost: reward.cost, redeemedById },
            select: { id: true, redeemedAt: true },
          });
          return {
            ok: true as const,
            redemption: { id: row.id, title: reward.title, emoji: reward.emoji, cost: reward.cost, ownerName: reward.owner.displayName, redeemedAt: row.redeemedAt },
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if ((isWriteConflictError(error) || isCommitConflict(error)) && attempt < MAX_TRIES) continue;
      throw error;
    }
  }
}

/** Undo a redeem: delete the row, which puts the stars back. Already gone is not an error. */
export async function undoRedemption(id: string): Promise<void> {
  await db.rewardRedemption.deleteMany({ where: { id } });
}
