import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";

// Everything about "is this person allowed in" lives here and in dal.ts.
//
// The app currently has ONE shared family password rather than an account per
// person. That's a deliberate starting point, not an oversight — see the auth
// notes in CLAUDE.md. The important part is that the rest of the app never
// asks about passwords: it asks `verifySession()` (in dal.ts) whether there's
// a valid session, and gets a user-shaped answer back. Swapping this file for
// real per-person accounts later shouldn't require touching any of the twelve
// Server Actions that call it.
//
// "server-only" at the top makes the build fail loudly if any of this is ever
// imported into browser code by accident, which would leak the secret.

const COOKIE_NAME = "session";
const SESSION_DAYS = 30;

// While there's one shared password, everyone signing in is the same
// "household" user. When real accounts arrive this becomes a real user id and
// the callers of verifySession() carry on unchanged.
export const HOUSEHOLD_USER_ID = "household";

export type SessionPayload = {
  userId: string;
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

/** Is this the family password? */
export function isCorrectPassword(attempt: string): boolean {
  const actual = process.env.FAMILY_PASSWORD;
  if (!actual) {
    throw new Error(
      "FAMILY_PASSWORD is not set. Copy .env.example to .env, or set it in the host's environment variables.",
    );
  }

  // Compared digest-to-digest rather than string-to-string, for two reasons:
  // timingSafeEqual demands equal-length inputs (raw passwords rarely are),
  // and a plain `===` bails out at the first wrong character, so how long the
  // comparison takes leaks how much of the password was right.
  const a = createHash("sha256").update(attempt).digest();
  const b = createHash("sha256").update(actual).digest();
  return timingSafeEqual(a, b);
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
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
    return payload as SessionPayload;
  } catch {
    // A tampered, expired, or wrong-secret cookie all land here. There's
    // nothing useful to tell the visitor, so treat it as "not signed in".
    return null;
  }
}

export async function createSession(): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const session = await encrypt({
    userId: HOUSEHOLD_USER_ID,
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
