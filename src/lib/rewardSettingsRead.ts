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
