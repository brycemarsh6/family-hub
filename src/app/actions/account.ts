"use server";

// Self-service Server Actions: change your own name, avatar colour, or
// password. Any signed-in ACCOUNT may call these — the operative word is
// "account". A device-mode session (the wall tablet, role "device") is
// refused outright: a shared kitchen tablet "editing its own" name or
// password would actually be editing whichever real person's session it
// happens to be standing in for, which is never the right outcome. See
// .avengers/plans/family-accounts-v1.md (Phase 3a) and mission-6's C2
// contract.
//
// Unlike users.ts, these open with getVerifiedUser() rather than
// requireRole() — there's no role restriction (any real account may
// manage its own identity), and dal.ts's own doc comment on
// getVerifiedSession() explains why a Server Action prefers a
// null-returning check over a redirect()-based one: an unauthenticated
// write should simply not happen, not bounce the caller's browser
// mid-request.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedUser } from "@/lib/dal";
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { isMissingRowError } from "@/lib/prismaErrors";
import { toAvatarColor, type AvatarColor } from "@/lib/constants";

export type AccountResult = { error?: string };

const DEVICE_REFUSED_ERROR = "A shared device can't edit an account.";

function refreshAccountViews() {
  revalidatePath("/settings");
}

/**
 * Change your own password. Requires the CURRENT password, verified
 * through verifyPassword — this is the one self-service action that can
 * lock someone out if it goes wrong, so it's the one that double-checks
 * who's really asking before acting, rather than trusting the session
 * cookie alone.
 */
export async function changeMyPassword(
  currentPassword: string,
  newPassword: string,
): Promise<AccountResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (user.isDevice) return { error: DEVICE_REFUSED_ERROR };

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const row = await db.user.findUnique({
    where: { id: user.userId },
    select: { passwordHash: true },
  });
  if (!row) return { error: "Your account no longer exists." };
  if (row.passwordHash === null) {
    // Not reachable in practice — a passwordless profile has no way to
    // sign in and hold a session in the first place — but answered
    // plainly rather than left to throw if that ever changes.
    return { error: "This profile has no password to change." };
  }

  const currentOk = await verifyPassword(currentPassword, row.passwordHash);
  if (!currentOk) return { error: "That current password isn't right." };

  const passwordHash = await hashPassword(newPassword);
  try {
    await db.user.update({ where: { id: user.userId }, data: { passwordHash } });
  } catch (error) {
    if (isMissingRowError(error)) return { error: "Your account no longer exists." };
    throw error;
  }

  return {};
}

export async function updateMyName(displayName: string): Promise<AccountResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (user.isDevice) return { error: DEVICE_REFUSED_ERROR };

  const trimmed = displayName.trim();
  if (!trimmed) return { error: "Give yourself a name." };

  try {
    await db.user.update({ where: { id: user.userId }, data: { displayName: trimmed } });
  } catch (error) {
    if (isMissingRowError(error)) return { error: "Your account no longer exists." };
    throw error;
  }

  refreshAccountViews();
  return {};
}

export async function updateMyAvatarColor(color: string): Promise<AccountResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (user.isDevice) return { error: DEVICE_REFUSED_ERROR };

  const avatarColor: AvatarColor = toAvatarColor(color);

  try {
    await db.user.update({ where: { id: user.userId }, data: { avatarColor } });
  } catch (error) {
    if (isMissingRowError(error)) return { error: "Your account no longer exists." };
    throw error;
  }

  refreshAccountViews();
  return {};
}
