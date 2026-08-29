import "server-only";

// Login rate limiting for src/app/actions/auth.ts's `login`. DB-backed via
// the LoginAttempt table (see prisma/schema.prisma) rather than an in-memory
// counter, because an in-memory counter dies with every serverless
// invocation — Vercel doesn't guarantee the same process handles the next
// request, so a running count kept only in a module variable would reset
// constantly and never actually limit anything.
//
// Carries "server-only" because it touches the database — same standing as
// dal.ts and voice/apply.ts, both of which import db and both of which carry
// this guard. (An earlier version of this file claimed the password.ts
// precedent for skipping the guard; that claim was wrong — password.ts has
// no database access at all, which this file does. The pure policy this
// file wraps — evaluateRateLimit and friends — lives in
// loginRateLimitPolicy.ts instead, which genuinely has zero imports and is
// what loginRateLimitPolicy.test.ts exercises directly, keeping db.ts
// (and its process.env.DATABASE_URL read) out of the test's import graph
// entirely.)

import { db } from "./db";
import {
  evaluateRateLimit,
  WINDOW_MS,
  type RateLimitStatus,
} from "./loginRateLimitPolicy";

/** Rows older than this are opportunistically deleted on a successful
 * login (see recordLoginAttempt) — comfortably outside the 15-minute
 * window, so pruning can never remove a row a concurrent check still
 * needs. */
const PRUNE_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * The DB-reading wrapper `login` actually calls, before it ever verifies a
 * password. One query for every failed attempt in the last 15 minutes that
 * matches either this userId or this IP — a single `OR`, not two separate
 * queries, so a row that matches both (this user, from this IP) is counted
 * once, not twice.
 */
export async function isLoginRateLimited(
  userId: string,
  ip: string,
): Promise<RateLimitStatus> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  const attempts = await db.loginAttempt.findMany({
    where: {
      success: false,
      createdAt: { gt: windowStart },
      OR: [{ userId }, { ip }],
    },
    select: { userId: true, ip: true, success: true, createdAt: true },
  });

  return evaluateRateLimit(attempts, { userId, ip, now });
}

/**
 * Write one row for a login attempt that actually happened — i.e. one that
 * got far enough to check (or skip, for an unknown/deactivated/profile
 * userId) a password. A request the rate limiter itself refused is
 * deliberately NOT recorded here: it never checked anything, and recording
 * it anyway would let an attacker who already tripped the lock keep
 * extending the lockout window indefinitely just by continuing to hit the
 * (instant, no-bcrypt) blocked response — which would turn a defense against
 * the real account holder's own retries into a tool for locking them out
 * for good.
 */
export async function recordLoginAttempt(params: {
  userId: string | null;
  ip: string;
  success: boolean;
}): Promise<void> {
  await db.loginAttempt.create({ data: params });

  if (params.success) {
    // Opportunistic: a successful login is a natural, infrequent moment to
    // sweep old rows so the table doesn't grow forever, without needing a
    // separate cron/cleanup job. 24h is comfortably outside the 15-minute
    // window this file cares about, so this can never race a concurrent
    // rate-limit check into missing a row it still needed.
    const cutoff = new Date(Date.now() - PRUNE_AGE_MS);
    await db.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
  }
}
