import "server-only";

// The one definition of every reward write (mission 81). A `server-only` lib
// module with NO auth check of its own, in the shape of pantryWrites.ts: the
// Server Actions in actions/rewards.ts carry the login and role gate and
// `revalidatePath` (route strings never live in lib), and a later caller (a
// Winnie route) brings its own gate. Input is checked by `checkRewardInput`
// before it gets here. Rewards R4 (mission 82) also moved every
// `RewardSettings` write here, and added the parent PIN's check.

import { db } from "@/lib/db";
import { Prisma, type Reward } from "@/generated/prisma/client";
import { atomically } from "@/lib/habits/participantWrites";
import { isMissingRowError, isWriteConflictError } from "@/lib/prismaErrors";
import { loadStarBanks } from "@/lib/starBankRead";
import { isPinShaped, pinLockActive, pinLockAfterWrong, pinLockEnded } from "@/lib/rewards/pinPolicy";
import { redeemRefusal, type RewardInput, type WishInput } from "@/lib/rewards/rewardRules";
import { loadPinCheck } from "@/lib/rewardSettingsRead";
import { REWARD_GONE_REFUSAL, REWARD_SAVE_FAILED, type LateStars } from "@/lib/rewardVocabulary";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { WriteError } from "@/lib/writeError";

/** The owner's next list position, read inside the same block as the create that uses it. */
async function nextSortOrder(tx: Prisma.TransactionClient, ownerId: string): Promise<number> {
  const last = await tx.reward.aggregate({ where: { ownerId }, _max: { sortOrder: true } });
  return (last._max.sortOrder ?? -1) + 1;
}

/** Lock one reward's row until the transaction ends, so a second write waits (as `lockGoal` does). */
async function lockReward(tx: Prisma.TransactionClient, id: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Reward" WHERE "id" = ${id} FOR UPDATE`;
}

/** Add a reward at the end of its owner's list. `createdById` is null when the Assistant API adds it. Returns the whole row. */
export async function createReward(value: RewardInput, createdById: string | null, client: Prisma.TransactionClient = db): Promise<Reward> {
  return atomically(client, async (tx) =>
    tx.reward.create({ data: { ...value, createdById, sortOrder: await nextSortOrder(tx, value.ownerId) } }),
  );
}

/** What a reward can be changed to. A `RewardInput` (cost a number) is one; a wish may keep a null cost. */
export type RewardEdit = { title: string; emoji: string | null; cost: number | null; repeatable: boolean; ownerId: string };

/**
 * Change a reward's picture, name, cost, repeat setting and owner. Null when
 * it is gone. `edit` is the new values, or a function that gets the locked
 * row and returns them (or a refusal, handed back as is). When nothing would
 * change, nothing is written and both rows are the same. Past redemptions
 * keep their snapshots.
 */
export async function updateReward(
  id: string,
  edit: RewardEdit | ((current: Reward) => RewardEdit | WriteError),
  client: Prisma.TransactionClient = db,
): Promise<{ before: Reward; after: Reward } | WriteError | null> {
  try {
    return await atomically(client, async (tx) => {
      await lockReward(tx, id);
      const before = await tx.reward.findUnique({ where: { id } });
      if (!before) return null;
      const next = typeof edit === "function" ? edit(before) : edit;
      if ("code" in next) return next;
      const same =
        before.title === next.title && before.emoji === next.emoji && before.cost === next.cost &&
        before.repeatable === next.repeatable && before.ownerId === next.ownerId;
      if (same) return { before, after: before };
      const after = await tx.reward.update({
        where: { id },
        data: { title: next.title, emoji: next.emoji, cost: next.cost, repeatable: next.repeatable, ownerId: next.ownerId },
      });
      return { before, after };
    });
  } catch (error) {
    if (isMissingRowError(error)) return null;
    throw error;
  }
}

/**
 * Delete a reward. Its redemptions stay (their `rewardId` goes null). Already
 * gone is not an error: `removed` is null. `wishOnly` deletes only while it
 * still has no cost (a reward then is the same quiet no-op). `guard` sees the
 * locked row and how many times it was redeemed; a refusal it returns is
 * handed back and nothing is deleted (a guard may also throw, which rolls back).
 */
export async function deleteReward(
  id: string,
  options: {
    wishOnly?: boolean;
    guard?: (row: Reward, redeemedCount: number) => Promise<WriteError | null> | WriteError | null;
  } = {},
  client: Prisma.TransactionClient = db,
): Promise<{ removed: Reward | null } | WriteError> {
  try {
    return await atomically(client, async (tx) => {
      await lockReward(tx, id);
      const found = await tx.reward.findUnique({ where: { id }, include: { _count: { select: { redemptions: true } } } });
      if (!found) return { removed: null };
      const { _count, ...row } = found;
      if (options.wishOnly && row.cost !== null) return { removed: null };
      const refusal = await options.guard?.(row, _count.redemptions);
      if (refusal) return refusal;
      await tx.reward.deleteMany({ where: { id } });
      return { removed: row };
    });
  } catch (error) {
    if (isMissingRowError(error)) return { removed: null };
    throw error;
  }
}

/** Add a wish: a reward with no cost, one time, at the end of its owner's list. `createdById` is null when the Assistant API adds it. Returns the whole row. */
export async function createWish(value: WishInput, createdById: string | null, client: Prisma.TransactionClient = db): Promise<Reward> {
  return atomically(client, async (tx) =>
    tx.reward.create({
      data: { ...value, cost: null, repeatable: false, createdById, sortOrder: await nextSortOrder(tx, value.ownerId) },
    }),
  );
}

/** Change a wish's picture and name only. Null when it is gone or already has a cost (it is a reward now). */
export async function updateWish(id: string, value: { title: string; emoji: string | null }): Promise<{ id: string } | null> {
  const result = await db.reward.updateMany({ where: { id, cost: null }, data: { title: value.title, emoji: value.emoji } });
  return result.count === 0 ? null : { id };
}

export type Redeemed = { id: string; title: string; emoji: string | null; cost: number; ownerName: string; redeemedAt: Date };

const MAX_TRIES = 3;

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
          // A wish (no cost) is refused by `redeemRefusal`; the `typeof` is for the type.
          if (refusal !== null || typeof reward.cost !== "number") return { ok: false as const, error: refusal ?? REWARD_SAVE_FAILED };
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
      if (isWriteConflictError(error) && attempt < MAX_TRIES) continue;
      throw error;
    }
  }
}

/**
 * Undo a redeem: delete the row, which puts the stars back. The row is read
 * inside the same transaction as the delete, and `may` (access.ts's
 * `canUndoRedeem`, bound to the login) decides. Already gone is not an error.
 */
export async function undoRedemption(
  id: string,
  may: (redemption: { redeemedById: string | null; redeemedAt: Date }) => boolean,
): Promise<{ ok: true } | { ok: false }> {
  return db.$transaction(async (tx) => {
    const row = await tx.rewardRedemption.findUnique({ where: { id }, select: { redeemedById: true, redeemedAt: true } });
    if (!row) return { ok: true as const };
    if (!may(row)) return { ok: false as const };
    await tx.rewardRedemption.deleteMany({ where: { id } });
    return { ok: true as const };
  });
}

/** Save the Late checks setting (the one `RewardSettings` row). */
export async function writeLateStars(lateStars: LateStars, userId: string): Promise<void> {
  await db.rewardSettings.upsert({
    where: { id: "household" },
    create: { id: "household", lateStars, updatedById: userId },
    update: { lateStars, updatedById: userId },
  });
}

/** Set or change the parent PIN: store only its hash, and clear the wrong-try count and any lock. */
export async function writeRewardPin(pin: string, userId: string): Promise<void> {
  const pinHash = await hashPassword(pin);
  await db.rewardSettings.upsert({
    where: { id: "household" },
    create: { id: "household", pinHash, pinFailCount: 0, pinLockedUntil: null, updatedById: userId },
    update: { pinHash, pinFailCount: 0, pinLockedUntil: null, updatedById: userId },
  });
}

/** The "Ask for the PIN" switch. */
export async function writePinRequired(pinRequired: boolean, userId: string): Promise<void> {
  await db.rewardSettings.upsert({
    where: { id: "household" },
    create: { id: "household", pinRequired, updatedById: userId },
    update: { pinRequired, updatedById: userId },
  });
}

export type PinCheck = { ok: true } | { ok: false; reason: "wrong" | "locked" | "notSet"; lockMs?: number };

/** Longest a PIN check may wait for the row lock, and run once it has it. Past either, the try is refused. */
const PIN_CHECK_MAX_WAIT_MS = 10_000;
const PIN_CHECK_TIMEOUT_MS = 15_000;

/**
 * Check a PIN a kid or the tablet typed. The whole check is ONE transaction
 * that first locks the settings row (`FOR UPDATE`), so a burst of simultaneous
 * tries is checked one at a time and the count and lock cannot be raced. An
 * ended lock is cleared first (the count goes back to 0); a live lock refuses
 * before any bcrypt work; a badly shaped PIN is a wrong try without bcrypt; a
 * wrong try adds 1 with an atomic increment and, at the limit, sets the lock
 * (and answers "locked" at once); a right one resets the count. A check that
 * times out waiting, or fails for any reason, is refused as "wrong" and never
 * lets a try through. This is the PIN's own lock, separate from the sign-in
 * lock (no sign-in table is touched). Nothing stays unlocked afterwards.
 */
export async function checkRewardPin(pin: unknown, now: Date): Promise<PinCheck> {
  try {
    return await db.$transaction(
      async (tx) => {
        // No row means no PIN: the lock selects nothing and the read says notSet.
        await tx.$queryRaw`SELECT 1 FROM "RewardSettings" WHERE id = 'household' FOR UPDATE`;
        const row = await loadPinCheck(tx);
        if (row.pinHash === null) return { ok: false as const, reason: "notSet" as const };

        let failCount = row.pinFailCount;
        let lockedUntil = row.pinLockedUntil;
        if (pinLockEnded(lockedUntil, now)) {
          await tx.rewardSettings.updateMany({ where: { id: "household" }, data: { pinFailCount: 0, pinLockedUntil: null } });
          failCount = 0;
          lockedUntil = null;
        }
        if (lockedUntil !== null && pinLockActive(lockedUntil, now)) {
          return { ok: false as const, reason: "locked" as const, lockMs: lockedUntil.getTime() - now.getTime() };
        }

        const right = isPinShaped(pin) && (await verifyPassword(pin, row.pinHash));
        if (right) {
          if (failCount !== 0) await tx.rewardSettings.updateMany({ where: { id: "household" }, data: { pinFailCount: 0 } });
          return { ok: true as const };
        }

        const updated = await tx.rewardSettings.update({
          where: { id: "household" },
          data: { pinFailCount: { increment: 1 } },
          select: { pinFailCount: true },
        });
        const lock = pinLockAfterWrong(updated.pinFailCount, now);
        if (lock === null) return { ok: false as const, reason: "wrong" as const };
        await tx.rewardSettings.updateMany({ where: { id: "household" }, data: { pinLockedUntil: lock } });
        return { ok: false as const, reason: "locked" as const, lockMs: lock.getTime() - now.getTime() };
      },
      { maxWait: PIN_CHECK_MAX_WAIT_MS, timeout: PIN_CHECK_TIMEOUT_MS },
    );
  } catch {
    return { ok: false, reason: "wrong" };
  }
}
