import "server-only";

// The nudge writes (decisions 96 and 97), the shape of `habitWrites.ts`: a
// `server-only` module with NO auth check of its own. `actions/habitNudges.ts`
// carries the session and the rules, and `revalidatePath` stays there.

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { utcMidnightInstant, type CalendarDate } from "../householdDate";

/**
 * One nudge per sender, recipient, habit and day. A second one for the same
 * key is a no-op (`skipDuplicates`, so no error to catch). `created` is 1 for
 * a new nudge and 0 when it already existed.
 */
export async function createNudge(
  input: { habitId: string; fromUserId: string; toUserId: string; day: CalendarDate },
  client: Prisma.TransactionClient = db,
): Promise<{ created: number }> {
  const { count } = await client.nudge.createMany({
    data: [{ habitId: input.habitId, fromUserId: input.fromUserId, toUserId: input.toUserId, day: utcMidnightInstant(input.day) }],
    skipDuplicates: true,
  });
  return { created: count };
}

/** Marks the nudge seen, but only for its recipient and only the first time. False when nothing changed. */
export async function markNudgeSeen(id: string, userId: string, client: Prisma.TransactionClient = db): Promise<boolean> {
  const { count } = await client.nudge.updateMany({ where: { id, toUserId: userId, seenAt: null }, data: { seenAt: new Date() } });
  return count > 0;
}
