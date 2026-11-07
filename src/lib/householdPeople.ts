import "server-only";

import { db } from "@/lib/db";
import { MANAGER_ROLES, toRole, type Role } from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";

// The one rule for "the family": every active person who is not a shared
// device login (the wall tablet). Habit participants, the habit pickers and
// the vision boards all ask here, so a new kind of login only has to be
// decided once. No auth: the page or action calling it has already guarded.

/** The `User` filter for a household person: not deactivated, not a device. Query it only through this file. */
export const HOUSEHOLD_PERSON_WHERE = { deactivatedAt: null, role: { not: "device" } } satisfies Prisma.UserWhereInput;

/** A household person, as a list needs them. */
export type HouseholdPerson = { id: string; displayName: string; avatarColor: string };

/** The household order: placed people by `familyOrder`, then the unplaced by oldest profile. */
const HOUSEHOLD_ORDER_BY = [
  { familyOrder: { sort: "asc", nulls: "last" } },
  { createdAt: "asc" },
] satisfies Prisma.UserOrderByWithRelationInput[];

/** Every household person, in the household order (an admin sets it on Manage family). */
export async function loadHouseholdPeople(client: Prisma.TransactionClient = db): Promise<HouseholdPerson[]> {
  return client.user.findMany({
    where: HOUSEHOLD_PERSON_WHERE,
    orderBy: HOUSEHOLD_ORDER_BY,
    select: { id: true, displayName: true, avatarColor: true },
  });
}

/** A household adult (admin or parent), as the morning briefing needs them. */
export type HouseholdAdult = { id: string; displayName: string; role: Role };

/** Every active adult (role admin or parent, never a kid or the device login), in the household order. */
export async function loadHouseholdAdults(client: Prisma.TransactionClient = db): Promise<HouseholdAdult[]> {
  const rows = await client.user.findMany({
    where: { AND: [HOUSEHOLD_PERSON_WHERE, { role: { in: [...MANAGER_ROLES] } }] },
    orderBy: HOUSEHOLD_ORDER_BY,
    select: { id: true, displayName: true, role: true },
  });
  return rows.map((row) => ({ ...row, role: toRole(row.role) }));
}
