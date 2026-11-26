import "server-only";

import { db } from "@/lib/db";
import { serializeStoreList } from "@/lib/storeList";
import { AVATAR_COLORS, MEAL_SLOTS } from "@/lib/constants";

// The database work behind the household's settings (today the Stores screen).
// No login check: the Server Actions in src/app/actions/householdStores.ts
// check who is asking and have already decided the next list with the pure
// helpers in storeList.ts.

/** The one write of the saved store list (the row is made on first save). */
function upsertStores(names: readonly string[], actorUserId: string) {
  const stores = serializeStoreList(names);
  return db.householdSettings.upsert({
    where: { id: "household" },
    create: { id: "household", stores, updatedById: actorUserId },
    update: { stores, updatedById: actorUserId },
  });
}

/** Save the whole list. */
export async function saveStoreList(names: readonly string[], actorUserId: string): Promise<void> {
  await upsertStores(names, actorUserId);
}

/**
 * Save the list with `from` already replaced by `to`, and move every grocery
 * item on `from` to `to`, in one transaction so the two never disagree.
 */
export async function renameStore(
  nextNames: readonly string[],
  from: string,
  to: string,
  actorUserId: string,
): Promise<void> {
  await db.$transaction([
    upsertStores(nextNames, actorUserId),
    db.groceryItem.updateMany({ where: { store: from }, data: { store: to } }),
  ]);
}

/** Prisma's "two transactions collided" (P2034) and "already exists" (P2002)
 * errors, read by their code so no Prisma class import is needed. */
function isConflict(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === "P2034" || code === "P2002";
}

/**
 * First-run setup: makes the first admin, the family name and the meal-slot
 * tags in ONE serializable transaction. The user count inside is the gate, so
 * two submits at the same moment can make only one admin; the loser (or a
 * submit after setup) gets `{ closed: true }` and nothing is written.
 */
export async function createFamilyAndFirstAdmin(params: {
  familyName: string;
  displayName: string;
  passwordHash: string;
  recoveryCodeHash: string;
}): Promise<{ userId: string } | { closed: true }> {
  try {
    return await db.$transaction(
      async (tx) => {
        if ((await tx.user.count()) > 0) return { closed: true as const };
        const user = await tx.user.create({
          data: {
            displayName: params.displayName,
            role: "admin",
            passwordHash: params.passwordHash,
            avatarColor: AVATAR_COLORS[0].name,
          },
          select: { id: true },
        });
        await tx.householdSettings.upsert({
          where: { id: "household" },
          create: {
            id: "household",
            familyName: params.familyName,
            setupFinishedAt: new Date(),
            recoveryCodeHash: params.recoveryCodeHash,
            updatedById: user.id,
          },
          update: {
            familyName: params.familyName,
            setupFinishedAt: new Date(),
            recoveryCodeHash: params.recoveryCodeHash,
            updatedById: user.id,
          },
        });
        for (const slot of MEAL_SLOTS) {
          await tx.tag.upsert({ where: { name: slot }, create: { name: slot }, update: {} });
        }
        return { userId: user.id };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (isConflict(error)) return { closed: true };
    throw error;
  }
}

class RecoveryCodeAlreadyUsed extends Error {}

/**
 * Uses a recovery code up: swaps the stored code hash for a new one only if it
 * still equals `oldCodeHash`, then sets the new password. Compare-and-swap in
 * one transaction, so two requests with the same code at the same moment
 * cannot both succeed. Returns false when the code was already replaced.
 */
export async function replaceRecoveryCodeAndPassword(params: {
  userId: string;
  oldCodeHash: string;
  newCodeHash: string;
  newPasswordHash: string;
}): Promise<boolean> {
  try {
    await db.$transaction(async (tx) => {
      const swapped = await tx.householdSettings.updateMany({
        where: { id: "household", recoveryCodeHash: params.oldCodeHash },
        data: { recoveryCodeHash: params.newCodeHash, updatedById: params.userId },
      });
      if (swapped.count !== 1) throw new RecoveryCodeAlreadyUsed();
      await tx.user.update({
        where: { id: params.userId },
        data: { passwordHash: params.newPasswordHash },
      });
    });
    return true;
  } catch (error) {
    if (error instanceof RecoveryCodeAlreadyUsed) return false;
    throw error;
  }
}

/** Saves the hash of a freshly made recovery code (the row is made if missing). */
export async function saveRecoveryCodeHash(hash: string, actorUserId: string): Promise<void> {
  await db.householdSettings.upsert({
    where: { id: "household" },
    create: { id: "household", recoveryCodeHash: hash, updatedById: actorUserId },
    update: { recoveryCodeHash: hash, updatedById: actorUserId },
  });
}

/** Hides the "Finish setting up" card for the whole family (the row is made if missing). */
export async function dismissSetupChecklist(actorUserId: string): Promise<void> {
  const now = new Date();
  await db.householdSettings.upsert({
    where: { id: "household" },
    create: { id: "household", checklistDismissedAt: now, updatedById: actorUserId },
    update: { checklistDismissedAt: now, updatedById: actorUserId },
  });
}
