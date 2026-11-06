import "server-only";

// The planned-day writes (decisions 36 to 38, 144), the shape of
// `nudgeWrites.ts`: the only writer of the `HabitPlannedDay` table, a
// `server-only` module with NO auth check of its own. `actions/habitPlans.ts`
// carries the session, the `access.ts` rules and the day rules
// (`isPlannableDay`), and `revalidatePath` stays there.

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { utcMidnightInstant, type CalendarDate } from "../householdDate";
import { checkTargetUserIds } from "./habitRows";

/**
 * Saves a planned day: one row for a Side by side habit (the person it is
 * for), one per participant for Together (decision 144), the same fan-out as
 * a check. A day that is already planned is left alone (`skipDuplicates`), so
 * a second tap is a no-op. `created` counts new rows; `userIds` is who it was aimed at.
 */
export async function planHabitDay(
  input: { habitId: string; forUserId: string; day: CalendarDate },
  client: Prisma.TransactionClient = db,
): Promise<{ created: number; userIds: string[] }> {
  const habit = await client.habit.findUnique({
    where: { id: input.habitId },
    select: { sharing: true, participants: { select: { userId: true } } },
  });
  if (!habit) return { created: 0, userIds: [] };
  const userIds = checkTargetUserIds(habit.sharing, habit.participants.map((p) => p.userId), input.forUserId);
  if (userIds.length === 0) return { created: 0, userIds };
  const { count } = await client.habitPlannedDay.createMany({
    data: userIds.map((userId) => ({ habitId: input.habitId, userId, day: utcMidnightInstant(input.day) })),
    skipDuplicates: true,
  });
  return { created: count, userIds };
}
