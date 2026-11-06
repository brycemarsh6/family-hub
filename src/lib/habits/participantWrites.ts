import "server-only";

// Who takes part in a habit and in what order: the household list a Together
// habit is made with, where a new habit lands in each person's list, joining
// Everyone habits, one person's order, and replacing a participant set. Split
// from habitWrites.ts to keep both under the line cap. Same rules: no
// auth, no `revalidatePath`; a transaction client joins the caller's
// transaction, the default `db` opens its own.

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { loadHouseholdPeople } from "../householdPeople";

type Client = Prisma.TransactionClient;

/** Runs `work` in the caller's transaction, or in a fresh one when the caller gave only `db`. */
export function atomically<T>(client: Prisma.TransactionClient, work: (tx: Client) => Promise<T>): Promise<T> {
  if (client === (db as unknown)) return db.$transaction((tx) => work(tx), { timeout: 15000 });
  return work(client);
}

/** Every active person who can hold a habit: not deactivated, not a shared device login (`householdPeople.ts`). */
export async function householdParticipantIds(client: Prisma.TransactionClient = db): Promise<string[]> {
  return (await loadHouseholdPeople(client)).map((person) => person.id);
}

/**
 * Where a new habit goes in each person's own list: one past that person's
 * highest order, or 0 for someone with no habits yet. The one rule behind
 * creating a habit, replacing participants, and both joins.
 */
export async function nextSortOrders(client: Prisma.TransactionClient, userIds: readonly string[]): Promise<Map<string, number>> {
  const next = new Map<string, number>(userIds.map((userId) => [userId, 0]));
  if (userIds.length === 0) return next;
  const theirs = await client.habitParticipant.findMany({ where: { userId: { in: [...userIds] } }, select: { userId: true, sortOrder: true } });
  for (const row of theirs) next.set(row.userId, Math.max(next.get(row.userId) ?? 0, row.sortOrder + 1));
  return next;
}

/** Makes the habit's participants exactly `participantIds`: new people go to the end of their own list, dropped people lose only their row. */
export async function replaceParticipants(tx: Client, habitId: string, participantIds: readonly string[]): Promise<void> {
  const wanted = [...new Set(participantIds)];
  const current = await tx.habitParticipant.findMany({ where: { habitId }, select: { userId: true } });
  const have = new Set(current.map((p) => p.userId));
  await tx.habitParticipant.deleteMany({ where: { habitId, userId: { notIn: wanted } } });
  const added = wanted.filter((userId) => !have.has(userId));
  if (added.length === 0) return;
  const next = await nextSortOrders(tx, added);
  await tx.habitParticipant.createMany({
    data: added.map((userId) => ({ habitId, userId, sortOrder: next.get(userId) ?? 0 })),
    skipDuplicates: true,
  });
}

/**
 * Adds the person to every non-archived habit made with Everyone that they
 * are not already in (decision 87), at the end of their own list. Called when
 * a profile is created or turned back on. Returns how many habits they joined.
 */
export async function joinEveryoneHabits(userId: string, client: Prisma.TransactionClient = db): Promise<number> {
  return atomically(client, async (tx) => {
    const [habits, mine] = await Promise.all([
      tx.habit.findMany({ where: { everyone: true, archivedAt: null }, select: { id: true }, orderBy: { createdAt: "asc" } }),
      tx.habitParticipant.findMany({ where: { userId }, select: { habitId: true } }),
    ]);
    const inHabit = new Set(mine.map((p) => p.habitId));
    const joining = habits.filter((habit) => !inHabit.has(habit.id));
    if (joining.length === 0) return 0;
    const next = (await nextSortOrders(tx, [userId])).get(userId) ?? 0;
    const { count } = await tx.habitParticipant.createMany({
      data: joining.map((habit, i) => ({ habitId: habit.id, userId, sortOrder: next + i })),
      skipDuplicates: true,
    });
    return count;
  });
}

/**
 * Adds every current household person who is not yet on the habit, each at the
 * end of their own list. Used when an Everyone habit is brought back from the
 * archive, so people added while it was away are in it. Nobody is removed.
 * Returns how many people joined.
 */
export async function joinHouseholdToHabit(habitId: string, client: Prisma.TransactionClient = db): Promise<number> {
  return atomically(client, async (tx) => {
    const [household, inHabit] = await Promise.all([
      householdParticipantIds(tx),
      tx.habitParticipant.findMany({ where: { habitId }, select: { userId: true } }),
    ]);
    const have = new Set(inHabit.map((p) => p.userId));
    const joining = household.filter((userId) => !have.has(userId));
    if (joining.length === 0) return 0;
    const next = await nextSortOrders(tx, joining);
    const { count } = await tx.habitParticipant.createMany({
      data: joining.map((userId) => ({ habitId, userId, sortOrder: next.get(userId) ?? 0 })),
      skipDuplicates: true,
    });
    return count;
  });
}

/**
 * Writes `ids` as this person's order (0, 1, 2...) in their own list only.
 * Ids they do not take part in are ignored, repeats count once.
 */
export async function reorderHabits(userId: string, ids: readonly string[], client: Prisma.TransactionClient = db): Promise<void> {
  const wanted = [...new Set(ids)];
  if (wanted.length === 0) return;
  await atomically(client, async (tx) => {
    const mine = await tx.habitParticipant.findMany({ where: { userId, habitId: { in: wanted } }, select: { habitId: true } });
    const valid = new Set(mine.map((p) => p.habitId));
    let sortOrder = 0;
    for (const habitId of wanted) {
      if (!valid.has(habitId)) continue;
      await tx.habitParticipant.updateMany({ where: { userId, habitId }, data: { sortOrder } });
      sortOrder += 1;
    }
  });
}
