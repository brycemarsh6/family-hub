"use server";

// Admin-only Server Actions for managing household people: creating an
// account or a passwordless profile, resetting a password, renaming,
// changing avatar colour, upgrading a profile to an account, and
// reactivating someone. See .avengers/plans/family-accounts-v1.md
// (Phase 3a) and mission-6's C2 contract for the full design.
//
// setRole and deactivatePerson live in usersRoles.ts instead of here —
// see that file's header for why the split is drawn exactly there (it's
// about where the last-active-admin lockout guard lives, not line count
// alone, even though this file was also over the 350-line soft cap
// before the split).
//
// Every export here opens with requireRole("admin") — these actions
// create login credentials and can lock a real person out of the app
// entirely, so only the admin role reaches any of them (unlike the
// existing action files, which stay reachable by any signed-in session
// or, per Phase 3a's C1 contract, by admin/parent). Voice-token
// issue/revoke are Phase 5, not built here. Device-mode (role "device")
// creation and management is Phase 4's own flow, not this one — see
// ASSIGNABLE_ROLES below.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { isMissingRowError } from "@/lib/prismaErrors";
import { PERSON_SELECT, toPersonInfo, type PersonInfo, type PersonRow } from "@/lib/personInfo";
import {
  toRole,
  toAvatarColor,
  ASSIGNABLE_ROLES,
  AVATAR_COLORS,
  type Role,
  type AvatarColor,
} from "@/lib/constants";

// PersonInfo/PERSON_SELECT/toPersonInfo now live in src/lib/personInfo.ts.
// This file only imports PersonInfo for its own internal use (PersonResult
// below) — it does NOT re-export it. A `"use server"` module's exports all
// become server-reference bindings under the Next dev transform, and a bare
// `export type { X }` re-export clause survives that transform as a runtime
// reference to a name type-erasure has already removed (see the C5 fix
// note in CLAUDE.md — this exact line crashed every action in this file
// with "ReferenceError: PersonInfo is not defined"). Components that need
// the type import it directly from "@/lib/personInfo" instead, same as
// settings/family/page.tsx already does.
export type PersonResult = { person?: PersonInfo; error?: string };
export type ActionResult = { error?: string };

function isAssignableRole(role: Role): boolean {
  return ASSIGNABLE_ROLES.includes(role);
}

function refreshFamilyViews() {
  revalidatePath("/settings/family");
}

/**
 * Create a household member: a login account when `password` is given
 * (and long enough), a non-login profile when it's omitted or empty.
 * This is the UI equivalent of prisma/bootstrap-users.ts's "add a
 * person" flow — read that script first; this mirrors its semantics
 * (role restricted to non-device, no password = profile) rather than
 * inventing new ones.
 */
export async function createPerson(
  displayName: string,
  role: string,
  password?: string | null,
): Promise<PersonResult> {
  await requireRole("admin");

  const trimmedName = displayName.trim();
  if (!trimmedName) return { error: "Give this person a name." };

  const nextRole = toRole(role);
  if (!isAssignableRole(nextRole)) {
    return { error: "That role can't be assigned here." };
  }

  let passwordHash: string | null = null;
  if (password) {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return { error: `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.` };
    }
    passwordHash = await hashPassword(password);
  }

  // A little visual variety across people created in the same sitting —
  // the same idea as bootstrap-users.ts's colorIndex. Not load-bearing;
  // setPersonAvatarColor is how an admin picks a specific one afterward.
  const existingCount = await db.user.count();
  const avatarColor: AvatarColor = AVATAR_COLORS[existingCount % AVATAR_COLORS.length].name;

  const created = await db.user.create({
    data: { displayName: trimmedName, role: nextRole, passwordHash, avatarColor },
    select: PERSON_SELECT,
  });

  refreshFamilyViews();
  return { person: toPersonInfo(created) };
}

/**
 * Admin sets a brand-new password for someone who already has an
 * account. Deliberately refuses a passwordless profile — turning a
 * profile into an account is upgradeProfileToAccount's job, one action,
 * not this one wearing two hats.
 */
export async function resetPassword(userId: string, newPassword: string): Promise<ActionResult> {
  await requireRole("admin");

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!target) return { error: "That person no longer exists." };
  if (target.passwordHash === null) {
    return { error: "This person has no account yet — upgrade their profile first." };
  }

  const passwordHash = await hashPassword(newPassword);
  try {
    await db.user.update({ where: { id: userId }, data: { passwordHash } });
  } catch (error) {
    if (isMissingRowError(error)) return { error: "That person no longer exists." };
    throw error;
  }

  return {};
}

export async function renamePerson(userId: string, displayName: string): Promise<PersonResult> {
  await requireRole("admin");

  const trimmed = displayName.trim();
  if (!trimmed) return { error: "Give this person a name." };

  let updated: PersonRow;
  try {
    updated = await db.user.update({
      where: { id: userId },
      data: { displayName: trimmed },
      select: PERSON_SELECT,
    });
  } catch (error) {
    if (isMissingRowError(error)) return { error: "That person no longer exists." };
    throw error;
  }

  refreshFamilyViews();
  return { person: toPersonInfo(updated) };
}

export async function setPersonAvatarColor(userId: string, color: string): Promise<PersonResult> {
  await requireRole("admin");

  const avatarColor = toAvatarColor(color);

  let updated: PersonRow;
  try {
    updated = await db.user.update({
      where: { id: userId },
      data: { avatarColor },
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
 * The un-do side of usersRoles.ts's deactivatePerson. No lockout guard
 * needed here — reactivating someone can never strand the household, it
 * can only add back an admin.
 */
export async function reactivatePerson(userId: string): Promise<PersonResult> {
  await requireRole("admin");

  let updated: PersonRow;
  try {
    updated = await db.user.update({
      where: { id: userId },
      data: { deactivatedAt: null },
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
 * "Ledger is old enough now" — give a passwordless profile a password,
 * turning it into a real account with one write. Deliberately not
 * delete-and-recreate: that would mint a new id and orphan every row
 * (grocery items, voice changes) already attributed to this person.
 */
export async function upgradeProfileToAccount(
  userId: string,
  password: string,
): Promise<PersonResult> {
  await requireRole("admin");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const target = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!target) return { error: "That person no longer exists." };
  if (target.passwordHash !== null) {
    return { error: "This person already has an account — use Reset password instead." };
  }

  const passwordHash = await hashPassword(password);

  let updated: PersonRow;
  try {
    updated = await db.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: PERSON_SELECT,
    });
  } catch (error) {
    if (isMissingRowError(error)) return { error: "That person no longer exists." };
    throw error;
  }

  refreshFamilyViews();
  return { person: toPersonInfo(updated) };
}
