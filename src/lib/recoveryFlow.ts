import "server-only";

import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isLoginRateLimited, recordLoginAttempt } from "@/lib/loginRateLimit";
import { recoveryCodeHash } from "@/lib/householdSettingsRead";
import {
  replaceRecoveryCodeAndPassword,
  saveRecoveryCodeHash,
} from "@/lib/householdSettingsWrites";
import { newRecoveryCode, normalizeRecoveryCode } from "@/lib/recoveryCode";
import { checkNewPassword } from "@/lib/setupGate";

// Forgot-password for admins, and making a new recovery code. No login check:
// someone who forgot their password has no session, so the recovery code is
// the gate, limited per account like a password guess. Every failure gives
// the same message, so a guesser learns nothing about which part was wrong.

export type RecoveryResult = { error: string } | { recoveryCode: string };

export const RECOVERY_WRONG = "That recovery code isn't right.";
export const RECOVERY_LIMITED = "Too many tries. Wait about 15 minutes, then try again.";

export async function resetWithRecoveryCodeFlow(
  input: { userId: string; code: string; newPassword: string; newPasswordAgain: string },
  ip: string,
): Promise<RecoveryResult> {
  const passwordError = checkNewPassword(input.newPassword, input.newPasswordAgain);
  if (passwordError) return { error: passwordError };

  const limit = await isLoginRateLimited(input.userId, ip);
  if (limit.limited) return { error: RECOVERY_LIMITED };

  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { role: true, passwordHash: true, deactivatedAt: true },
  });
  const eligible = !!user && user.role === "admin" && !user.deactivatedAt && !!user.passwordHash;
  const normalized = normalizeRecoveryCode(input.code);
  const hash = await recoveryCodeHash();

  const ok = eligible && !!normalized && !!hash && (await verifyPassword(normalized, hash));
  await recordLoginAttempt({ userId: input.userId, ip, success: ok });
  if (!ok || !hash) return { error: RECOVERY_WRONG };

  const fresh = newRecoveryCode();
  const swapped = await replaceRecoveryCodeAndPassword({
    userId: input.userId,
    oldCodeHash: hash,
    newCodeHash: await hashPassword(fresh.plain),
    newPasswordHash: await hashPassword(input.newPassword),
  });
  if (!swapped) return { error: RECOVERY_WRONG };
  return { recoveryCode: fresh.code };
}

/** Makes a new recovery code for a signed-in admin (the caller checked who
 * is asking) and saves its hash, which retires the old code. */
export async function makeRecoveryCodeFlow(actorUserId: string): Promise<{ recoveryCode: string }> {
  const fresh = newRecoveryCode();
  await saveRecoveryCodeHash(await hashPassword(fresh.plain), actorUserId);
  return { recoveryCode: fresh.code };
}
