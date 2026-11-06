import "server-only";

// Vacation periods (decisions 57, 115, 123): the only writer of the
// `VacationPeriod` table. Same rules as habitWrites.ts: no auth, no
// `revalidatePath`; a transaction client joins the caller's transaction, the
// default `db` opens its own. A vacation excuses its days, so saving or
// deleting one rebuilds that person's habit streaks and chore streak in the
// same transaction. Days go in through `utcMidnightInstant`.

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { VACATION_OVERLAP_MESSAGE } from "../habitVocabulary";
import { utcMidnightInstant, type CalendarDate } from "../householdDate";
import { recomputeChoreStreak } from "./choreWrites";
import { recomputeStreaks } from "./habitWrites";
import { atomically } from "./participantWrites";
import { compareDays } from "./schedule";

type Client = Prisma.TransactionClient;

export type SaveVacationResult = { ok: true; id: string } | { ok: false; error: string };

/** Every live habit and chore of one person, then their chore streak, rebuilt for `today`. */
async function recomputePerson(tx: Client, userId: string, today: CalendarDate): Promise<void> {
  const mine = await tx.habitParticipant.findMany({ where: { userId, habit: { archivedAt: null } }, select: { habitId: true } });
  for (const { habitId } of mine) await recomputeStreaks(habitId, [userId], today, tx);
  await recomputeChoreStreak(userId, today, tx);
}

/**
 * Saves a vacation for `userId`, both ends inclusive. `from` may be in the
 * past. Refuses a Through before From, and any overlap with a vacation the
 * person already has (they touch if they share even one day).
 */
export async function saveVacation(
  userId: string,
  from: CalendarDate,
  through: CalendarDate,
  today: CalendarDate,
  client: Prisma.TransactionClient = db,
): Promise<SaveVacationResult> {
  if (compareDays(through, from) < 0) return { ok: false, error: "Through can't be before From." };
  return atomically(client, async (tx): Promise<SaveVacationResult> => {
    const start = utcMidnightInstant(from);
    const end = utcMidnightInstant(through);
    const clash = await tx.vacationPeriod.findFirst({ where: { userId, startDay: { lte: end }, endDay: { gte: start } }, select: { id: true } });
    if (clash) return { ok: false, error: VACATION_OVERLAP_MESSAGE };
    const row = await tx.vacationPeriod.create({ data: { userId, startDay: start, endDay: end }, select: { id: true } });
    await recomputePerson(tx, userId, today);
    return { ok: true, id: row.id };
  });
}

/** Deletes one of `userId`'s own vacations; false when it is not theirs or is gone. */
export async function deleteVacation(id: string, userId: string, today: CalendarDate, client: Prisma.TransactionClient = db): Promise<boolean> {
  return atomically(client, async (tx) => {
    const { count } = await tx.vacationPeriod.deleteMany({ where: { id, userId } });
    if (count > 0) await recomputePerson(tx, userId, today);
    return count > 0;
  });
}
