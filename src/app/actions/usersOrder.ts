"use server";

// Admin-only: save the household order set by dragging on Manage family.
// Writes ONLY `User.familyOrder` (the User table holds credentials, so the
// select and update here name no other column). The id list must be exactly
// the current household people, so a stale tab can't half-apply an order.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { HOUSEHOLD_PERSON_WHERE } from "@/lib/householdPeople";
import { isExactHouseholdOrder } from "@/lib/householdOrder";

export type OrderResult = { ok: true } | { error: string };

export async function setFamilyOrder(ids: string[]): Promise<OrderResult> {
  await requireRole("admin");

  // A Server Action is a public POST: the argument is whatever the caller sent.
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) return { error: "The family changed. Reload and try again." };

  const people = await db.user.findMany({ where: HOUSEHOLD_PERSON_WHERE, select: { id: true } });
  if (!isExactHouseholdOrder(ids, people.map((person) => person.id))) {
    return { error: "The family changed. Reload and try again." };
  }

  await db.$transaction(
    ids.map((id, index) =>
      db.user.update({ where: { id }, data: { familyOrder: index }, select: { id: true, familyOrder: true } }),
    ),
  );

  revalidatePath("/habits");
  revalidatePath("/settings/family");
  revalidatePath("/plans");
  return { ok: true };
}
