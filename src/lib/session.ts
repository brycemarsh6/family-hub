import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Everything about "is this person allowed in" lives here and in dal.ts.
//
// Family Accounts v1 (see .avengers/plans/family-accounts-v1.md) replaced the
// single shared family password with per-person accounts in the database
// (the User table). This file only produces and reads the signed cookie —
// dal.ts is what turns a valid cookie into a real, currently-active user row.
// The rest of the app never asks about passwords: it asks getVerifiedSession()
// (in dal.ts) whether there's a valid session, and gets a user-shaped answer
// back.
//
// "server-only" at the top makes the build fail loudly if any of this is ever
// imported into browser code by accident, which would leak the secret.

export const COOKIE_NAME = "session";

const PERSON_SESSION_DAYS = 30;
// Device mode (a User with role "device" — the wall tablet) isn't built
// until Phase 4, but a long-lived session is cheap to support now and
// pointless to add later as a special case. Harmless until something
// actually creates a device-role user.
const DEVICE_SESSION_DAYS = 365;

// Bumped whenever the session payload's shape changes. decrypt() below
// rejects any token whose `v` doesn't match this exactly — which is the
// whole mechanism for the accounts cutover: a pre-cutover cookie was signed
// under the old shape ({ userId: "household", expiresAt }, no `v` at all),
// so `payload.v !== SESSION_VERSION` is true for it and it's rejected with
// zero database reads, before anything about the (now-meaningless)
// "household" user id is even looked at.
export const SESSION_VERSION = 2;

export type SessionPayload = {
  v: typeof SESSION_VERSION;
  userId: string;
  // A UX hint copied from the User row at sign-in time, not the authority —
  // dal.ts always re-reads the real row before trusting anything about a
  // request, so a role in this cookie going stale (someone's role changed
  // after they signed in) is cosmetic only, never a security gap.
  role: string;
  expiresAt: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  // Failing loudly beats signing sessions with `undefined`, which would let
  // anyone forge a cookie. This throws at request time on a misconfigured
  // deploy rather than silently accepting everybody.
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Copy .env.example to .env, or set it in the host's environment variables.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(payload.expiresAt))
    .sign(secretKey());
}

export async function decrypt(
  session: string | undefined,
): Promise<SessionPayload | null> {
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, secretKey(), {
      algorithms: ["HS256"],
    });
    // The version gate. This alone is what kills every pre-cutover cookie —
    // a v1 payload has no `v` field, so `payload.v` is `undefined` here and
    // this check fails exactly the same way a genuinely tampered payload
    // would, with no special-casing needed.
    if (payload.v !== SESSION_VERSION) return null;
    return payload as unknown as SessionPayload;
  } catch {
    // A tampered, expired, or wrong-secret cookie all land here. There's
    // nothing useful to tell the visitor, so treat it as "not signed in".
    return null;
  }
}

/**
 * Sign a fresh cookie for a specific person (or the device-mode tablet).
 * The only caller is `login` in src/app/actions/auth.ts.
 */
export async function createSession(user: {
  id: string;
  role: string;
}): Promise<void> {
  const days =
    user.role === "device" ? DEVICE_SESSION_DAYS : PERSON_SESSION_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const session = await encrypt({
    v: SESSION_VERSION,
    userId: user.id,
    role: user.role,
    expiresAt: expiresAt.toISOString(),
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, session, {
    // The browser won't hand this to JavaScript, so a script injected into
    // the page can't read it.
    httpOnly: true,
    // HTTPS-only in production. Deliberately off in development, because
    // testing on a phone over the home WiFi uses plain http on a LAN address
    // — a Secure cookie would silently never be stored and login would
    // appear to do nothing.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decrypt(cookieStore.get(COOKIE_NAME)?.value);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
