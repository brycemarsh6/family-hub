"use server";

// Signing in and out. See src/lib/session.ts for the cookie mechanics and
// src/lib/dal.ts for the check every other Server Action performs.
//
// `login` and `logout` are deliberately the ONLY actions in the app that
// don't open with a DAL guard: logging in is what you do when you don't
// have a session, and logging out doesn't need one to be safe. The one
// thing `logout` does read is whether the session is a device (the wall
// tablet): a device may not sign itself out with one tap, so it is sent to
// `logoutWithAdminPassword` instead, which IS guarded like everything else.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSession, deleteSession } from "@/lib/session";
import { getVerifiedUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { matchesAnyHash } from "@/lib/adminPasswordMatch";
import { isLoginRateLimited, recordLoginAttempt } from "@/lib/loginRateLimit";
import { toStartPage } from "@/lib/startPage";

export type LoginState = { error?: string };

// Identical copy for a wrong password and for a forged, unknown, or
// deactivated userId — there's nothing useful to distinguish, and a
// specific message ("no such user", "that account is disabled") would
// teach a prober which userIds are real accounts.
const WRONG_PASSWORD_ERROR = "That password isn't right.";

const RATE_LIMIT_ERROR =
  "Too many tries. Wait about 15 minutes, or ask Dad to reset your password.";

// The tablet's sign-out has its own lockout copy: the "ask Dad" line in
// RATE_LIMIT_ERROR makes no sense when the thing being guessed is an admin's
// password, not the tablet's own.
const ADMIN_RATE_LIMIT_ERROR = "Too many tries. Wait about 15 minutes, then try again.";

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
    select: {
      id: true,
      role: true,
      passwordHash: true,
      deactivatedAt: true,
      preferences: { select: { startPage: true } },
    },
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
  redirect(toStartPage(user!.preferences?.startPage));
}

export async function logout(): Promise<void> {
  // The database row decides, not the cookie's role hint (see dal.ts). A
  // deactivated or unknown cookie reads as null here and still signs out.
  // If the lookup fails, fall through: a person must always be able to sign out.
  let isDevice = false;
  try {
    isDevice = Boolean((await getVerifiedUser())?.isDevice);
  } catch {
    isDevice = false;
  }
  if (isDevice) {
    redirect("/settings");
  }

  await deleteSession();
  redirect("/login");
}

/**
 * Sign the tablet out, but only with an admin's password (mission 39, C4).
 * Guard form (a): a device session can trigger this from shipped UI, so a
 * refusal comes back as `{ error }` for the sheet to show, not a redirect.
 */
export async function logoutWithAdminPassword(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (!user.isDevice) return { error: "Only the tablet signs out this way." };

  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Enter an admin password." };

  const ip = clientIp(await headers());

  // Same order and same reasoning as `login`: the rate-limit check runs
  // before any bcrypt work, and a request it refuses isn't recorded.
  const rateLimit = await isLoginRateLimited(user.userId, ip);
  if (rateLimit.limited) {
    return { error: ADMIN_RATE_LIMIT_ERROR };
  }

  const admins = await db.user.findMany({
    where: { role: "admin", deactivatedAt: null, passwordHash: { not: null } },
    select: { passwordHash: true },
  });
  const hashes = admins.flatMap((admin) =>
    admin.passwordHash ? [admin.passwordHash] : [],
  );

  // With no admin to check against, this is just a failed match, recorded
  // and answered exactly like a wrong password.
  const passwordOk = await matchesAnyHash(password, hashes);
  await recordLoginAttempt({ userId: user.userId, ip, success: passwordOk });

  if (!passwordOk) {
    return { error: WRONG_PASSWORD_ERROR };
  }

  await deleteSession();
  redirect("/login");
}
