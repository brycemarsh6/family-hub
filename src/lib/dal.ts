import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import { db } from "./db";
import { toRole, type Role } from "./constants";

// The Data Access Layer: the single place the rest of the app asks "is this
// request allowed?".
//
// Why this exists rather than just checking in proxy.ts: a Server Action is a
// real POST endpoint on the public internet. Anyone can call one directly with
// curl — they don't have to go through our buttons. So the check has to sit
// next to the data, in every action, not only in front of the pages. The
// Next.js auth guide is blunt about it: proxy "should not be your only line of
// defense".
//
// `cache()` memoises the result for the duration of a single render pass, so
// a page that calls this in several places still only verifies once.

export type Session = {
  isAuth: true;
  userId: string;
};

export type VerifiedUser = {
  userId: string;
  role: Role;
  displayName: string;
  avatarColor: string;
  isDevice: boolean;
};

/**
 * The one place a session cookie turns into a real, currently-active
 * database row. This is the DB-verifying half of Family Accounts v1: the
 * JWT's own `role` claim is a UX hint (see session.ts), but this lookup is
 * the authority. A user who's been deactivated — or whose row is gone
 * entirely — fails here even though the cookie itself still verifies
 * cleanly, which is what makes deactivation take effect on the very next
 * Server Action rather than waiting for the cookie to expire.
 *
 * One indexed primary-key lookup, `cache()`-wrapped so a page reading this
 * in several places (header + page body, say) still only hits the database
 * once per render pass.
 */
const loadSessionUser = cache(async (): Promise<VerifiedUser | null> => {
  const session = await getSession();
  if (!session?.userId) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      role: true,
      displayName: true,
      avatarColor: true,
      deactivatedAt: true,
    },
  });

  if (!user || user.deactivatedAt) return null;

  return {
    userId: user.id,
    role: toRole(user.role),
    displayName: user.displayName,
    avatarColor: user.avatarColor,
    isDevice: user.role === "device",
  };
});

/**
 * The same check every one of the app's existing 52 guarded Server Actions
 * already calls. Its signature and return shape are unchanged by the
 * accounts cutover on purpose — every call site compiles and behaves the
 * same as before, just backed by a real database lookup instead of "is
 * there any cookie at all".
 *
 * Server Actions use this over requireVerifiedUser(): `redirect()` inside an
 * action throws a control-flow signal the caller may not expect, and an
 * unauthenticated write should simply not happen rather than bounce
 * someone's browser mid-request.
 */
export async function getVerifiedSession(): Promise<Session | null> {
  const user = await loadSessionUser();
  if (!user) return null;
  return { isAuth: true, userId: user.userId };
}

/**
 * The richer read: who is this, not just "is someone signed in". Pages that
 * want a name/avatar/role (the header, Settings, a future kid-hiding check)
 * call this instead of getVerifiedSession().
 */
export async function getVerifiedUser(): Promise<VerifiedUser | null> {
  return loadSessionUser();
}

/**
 * Require a signed-in, active visitor. Redirects to /login if there isn't
 * one, so callers can assume a valid user on the line after. Replaces the
 * old (dead) `verifySession` — same "redirect rather than return null"
 * shape, now backed by the same DB-verifying lookup as everything else here.
 *
 * Use this in pages and anywhere a redirect is the right response.
 */
export async function requireVerifiedUser(): Promise<VerifiedUser> {
  const user = await loadSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Require a signed-in, active visitor whose role is one of `roles`. Not
 * called from any action yet — role gates on existing Server Actions are
 * Phase 3a's work, deliberately not part of this change. This exists now so
 * that phase (and any page-level gate before it, e.g. a future
 * /settings/family) has a single place to add to rather than reinventing
 * the redirect-on-wrong-role check per caller.
 */
export async function requireRole(...roles: Role[]): Promise<VerifiedUser> {
  const user = await requireVerifiedUser();
  if (!roles.includes(user.role)) {
    redirect("/");
  }
  return user;
}
