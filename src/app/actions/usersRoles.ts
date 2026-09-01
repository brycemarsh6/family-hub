"use server";

// The two admin-only actions that can strand the household if they're
// wrong: changing someone's role and deactivating someone. Split out of
// users.ts (which was over the 350-line soft cap) specifically so the
// last-active-admin lockout guard lives in exactly ONE place, shared by
// both call sites in this one file, rather than being duplicated (and
// risking silent divergence) across two files. The small formatting/type
// helpers this file used to carry its own copies of (PERSON_SELECT,
// toPersonInfo, ASSIGNABLE_ROLES) now come from src/lib/personInfo.ts and
// src/lib/constants.ts instead — hoisted per mission-6's C4 contract, since
// PERSON_SELECT/toPersonInfo are the projection that strips passwordHash,
// and silent divergence there is the one place duplication actually
// mattered.
//
// The guard logic itself is now split in two, same C4 contract, same
// loginRateLimitPolicy.ts precedent: `otherActiveAdminCount` below still
// does the Prisma counting query (it must stay here, next to `db`), while
// the actual *decision* — would this leave nobody able to manage the
// household — is `canDemoteOrDeactivate` in src/lib/lastAdminGuard.ts, a
// pure function with its own `node:test` coverage. Both call sites below
// still go through it, so the decision still lives in exactly one place;
// it's just testable without a database now.
//
// Every export here opens with requireRole("admin") — see users.ts's
// header for why only the admin role reaches this file at all.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { isMissingRowError } from "@/lib/prismaErrors";
import { PERSON_SELECT, toPersonInfo, type PersonRow } from "@/lib/personInfo";
import { toRole, ASSIGNABLE_ROLES, type Role } from "@/lib/constants";
import { canDemoteOrDeactivate } from "@/lib/lastAdminGuard";
import type { PersonResult } from "./users";

function isAssignableRole(role: Role): boolean {
  return ASSIGNABLE_ROLES.includes(role);
}

function refreshFamilyViews() {
  revalidatePath("/settings/family");
}

/**
 * How many *other* active admins exist besides `excludeUserId` — the
 * exact question both guards below need answered. A read then a
 * separate write, not a transaction: the same accepted tradeoff
 * findOrCreateTag documents (tags.ts) — a household with one real admin
 * racing itself in the same instant isn't a real scenario, and the fix
 * (a serializable transaction) costs more than the disease.
 */
async function otherActiveAdminCount(excludeUserId: string): Promise<number> {
  return db.user.count({
    where: { role: "admin", deactivatedAt: null, id: { not: excludeUserId } },
  });
}

/**
 * Change someone's role. Two guards, both irrecoverable-lockout cases,
 * both enforced here regardless of what any UI does:
 *
 * - An admin can never change their OWN role through this action —
 *   there's no self-service path to undo it, so it's refused outright
 *   rather than only blocking the demotion direction specifically.
 * - The household's last active admin can never be moved off "admin" —
 *   doing so would leave nobody able to manage the household, including
 *   undoing the very change that caused it.
 */
export async function setRole(userId: string, role: string): Promise<PersonResult> {
  const admin = await requireRole("admin");

  if (userId === admin.userId) {
    return { error: "You can't change your own role." };
  }

  const nextRole = toRole(role);
  if (!isAssignableRole(nextRole)) {
    return { error: "That role can't be assigned here." };
  }

  const target = await db.user.findUnique({ where: { id: userId }, select: PERSON_SELECT });
  if (!target) return { error: "That person no longer exists." };

  const wasActiveAdmin = target.role === "admin" && target.deactivatedAt === null;
  const targetIsAdmin = wasActiveAdmin && nextRole !== "admin";
  const others = targetIsAdmin ? await otherActiveAdminCount(userId) : 0;
  if (!canDemoteOrDeactivate({ isSelf: false, targetIsAdmin, otherActiveAdminCount: others })) {
    return { error: "Can't change the last active admin's role — promote someone else first." };
  }

  let updated: PersonRow;
  try {
    updated = await db.user.update({
      where: { id: userId },
      data: { role: nextRole },
      select: PERSON_SELECT,
    });
  } catch (error) {
    if (isMissingRowError(error)) return { error: "That person no longer exists." };
    throw error;
  }

  refreshFamilyViews();
  return { person: toPersonInfo(updated) };
}

/**
 * Soft deactivation only — never a hard delete. A deactivated person
 * keeps every row they've ever touched (grocery items, voice changes,
 * eventually chores); they just can't sign in or act (dal.ts's
 * loadSessionUser refuses any row with deactivatedAt set) starting on
 * their very next request. Two guards, same reasoning and same shared
 * helper as setRole above: nobody can deactivate themselves, and the
 * last active admin can never be deactivated.
 */
export async function deactivatePerson(userId: string): Promise<PersonResult> {
  const admin = await requireRole("admin");

  if (userId === admin.userId) {
    return { error: "You can't deactivate yourself." };
  }

  const target = await db.user.findUnique({ where: { id: userId }, select: PERSON_SELECT });
  if (!target) return { error: "That person no longer exists." };

  const isActiveAdmin = target.role === "admin" && target.deactivatedAt === null;
  const others = isActiveAdmin ? await otherActiveAdminCount(userId) : 0;
  if (!canDemoteOrDeactivate({ isSelf: false, targetIsAdmin: isActiveAdmin, otherActiveAdminCount: others })) {
    return { error: "Can't deactivate the last active admin — promote someone else first." };
  }

  let updated: PersonRow;
  try {
    updated = await db.user.update({
      where: { id: userId },
      data: { deactivatedAt: new Date() },
      select: PERSON_SELECT,
    });
  } catch (error) {
    if (isMissingRowError(error)) return { error: "That person no longer exists." };
    throw error;
  }

  refreshFamilyViews();
  return { person: toPersonInfo(updated) };
}
