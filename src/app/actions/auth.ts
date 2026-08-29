"use server";

// Signing in and out. See src/lib/session.ts for the cookie mechanics and
// src/lib/dal.ts for the check every other Server Action performs.
//
// These two are deliberately the ONLY actions in the app that don't call
// getVerifiedSession() first — logging in is what you do when you don't
// have a session, and logging out doesn't need one to be safe.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSession, deleteSession } from "@/lib/session";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { isLoginRateLimited, recordLoginAttempt } from "@/lib/loginRateLimit";

export type LoginState = { error?: string };

// Identical copy for a wrong password and for a forged, unknown, or
// deactivated userId — there's nothing useful to distinguish, and a
// specific message ("no such user", "that account is disabled") would
// teach a prober which userIds are real accounts.
const WRONG_PASSWORD_ERROR = "That password isn't right.";

const RATE_LIMIT_ERROR =
  "Too many tries. Wait about 15 minutes, or ask Dad to reset your password.";

/** First hop of x-forwarded-for — best-effort, not a guarantee (see the
 * plan's "honest limits": the per-user cap is the real bound). Empty
 * string locally, where there's no proxy in front of the dev server to
 * set the header at all. */
function clientIp(headerList: Awaited<ReturnType<typeof headers>>): string {
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
}

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!userId || !password) {
    return { error: "Choose your name and enter your password." };
  }

  const ip = clientIp(await headers());

  // Look the user up first — this alone decides whether there's a real
  // password to check at all, but doesn't yet decide whether we're
  // *allowed* to check it (that's the rate-limit gate right after).
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, passwordHash: true, deactivatedAt: true },
  });
  const canAttempt = !!user && !user.deactivatedAt && !!user.passwordHash;

  // Rate-limit check runs BEFORE verifyPassword, on the submitted userId —
  // real or forged — so a locked-out attempt never reaches bcrypt whether
  // or not the account behind it actually exists. A request refused here
  // isn't recorded as an attempt of its own: it never checked anything, and
  // recording it would let an attacker who already tripped the lock keep
  // extending someone else's lockout for free by continuing to hit this
  // (instant) blocked response.
  const rateLimit = await isLoginRateLimited(userId, ip);
  if (rateLimit.limited) {
    return { error: RATE_LIMIT_ERROR };
  }

  const passwordOk = canAttempt
    ? await verifyPassword(password, user!.passwordHash!)
    : false;

  // Recorded regardless of whether there was a real password to check —
  // an unknown, deactivated, or non-login-profile userId still counts as a
  // failure against this IP, exactly as much as a real wrong password
  // would, since a forged userId is just as much a guess.
  await recordLoginAttempt({ userId, ip, success: passwordOk });

  if (!passwordOk) {
    return { error: WRONG_PASSWORD_ERROR };
  }

  await createSession({ id: user!.id, role: user!.role });

  // redirect() works by throwing a signal Next.js catches, so it must sit
  // outside any try/catch — there isn't one here, which is why.
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
