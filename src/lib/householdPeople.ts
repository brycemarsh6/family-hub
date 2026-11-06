import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

// The one rule for "the family": every active person who is not a shared
// device login (the wall tablet). Habit participants, the habit pickers and
// the vision boards all ask here, so a new kind of login only has to be
// decided once. No auth: the page or action calling it has already guarded.

/** The `User` filter for a household person: not deactivated, not a device. Query it only through this file. */
export const HOUSEHOLD_PERSON_WHERE = { deactivatedAt: null, role: { not: "device" } } satisfies Prisma.UserWhereInput;

/** A household person, as a list needs them. */
export type HouseholdPerson = { id: string; displayName: string };

/** Every household person, the oldest profile first. */
export async function loadHouseholdPeople(client: Prisma.TransactionClient = db): Promise<HouseholdPerson[]> {
  return client.user.findMany({
    where: HOUSEHOLD_PERSON_WHERE,
    orderBy: { createdAt: "asc" },
    select: { id: true, displayName: true },
  });
}
