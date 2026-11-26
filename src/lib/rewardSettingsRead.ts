import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { toLateStars, type LateStars } from "@/lib/rewardVocabulary";

// The only place the RewardSettings table is read. No login check: callers
// check who is asking. A missing row, or a value off its list, reads as "full".

export async function loadLateStars(client: Prisma.TransactionClient = db): Promise<LateStars> {
  const row = await client.rewardSettings.findUnique({ where: { id: "household" }, select: { lateStars: true } });
  return toLateStars(row?.lateStars);
}

/** What the Settings card and the Rewards page need about the PIN. Never the hash. A missing row is "no PIN yet, switch on". */
export async function loadPinStatus(client: Prisma.TransactionClient = db): Promise<{ pinSet: boolean; pinRequired: boolean }> {
  const row = await client.rewardSettings.findUnique({ where: { id: "household" }, select: { pinHash: true, pinRequired: true } });
  return { pinSet: row?.pinHash != null, pinRequired: row?.pinRequired ?? true };
}

export type PinCheckRow = { pinHash: string | null; pinRequired: boolean; pinFailCount: number; pinLockedUntil: Date | null };

/**
 * The PIN's hash, switch, wrong-try count and lock, for `checkRewardPin` in
 * rewardWrites.ts ONLY. The hash must never reach a page, an action's result
 * or a log; everything else asks `loadPinStatus`.
 */
export async function loadPinCheck(client: Prisma.TransactionClient = db): Promise<PinCheckRow> {
  const row = await client.rewardSettings.findUnique({
    where: { id: "household" },
    select: { pinHash: true, pinRequired: true, pinFailCount: true, pinLockedUntil: true },
  });
  return row ?? { pinHash: null, pinRequired: true, pinFailCount: 0, pinLockedUntil: null };
}
