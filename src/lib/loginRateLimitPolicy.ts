// The pure half of login rate limiting — no imports at all, no database, no
// Date.now(). Split out of loginRateLimit.ts (Family Accounts v1 P2 cutover,
// C4) so the DB-touching half can carry "server-only" without breaking this
// file's own unit tests, which run under a plain `node --import tsx --test`
// process and must never construct a PrismaClient just by being imported.
//
// This sits squarely inside STRUCTURE.md's rule for skipping "server-only":
// pure over its inputs, reads no env var, holds no secret of its own — same
// standing as match.ts, duplicates.ts, and password.ts.

/** Sliding window: how far back an attempt still counts against either cap. */
export const WINDOW_MS = 15 * 60 * 1000;

/** Failed attempts for one user, inside the window, before login is refused.
 * This is the real bound (see the plan's own "honest limits": per-IP
 * limiting below is best-effort on top of it, not a replacement for it). */
export const USER_FAILURE_LIMIT = 5;

/** Failed attempts from one IP (against any userId), inside the window,
 * before login is refused — a broader net for one visitor hammering
 * several different account names from the same connection. */
export const IP_FAILURE_LIMIT = 20;

/** The shape evaluateRateLimit needs from a LoginAttempt row — a subset,
 * so the pure function below never has to import a Prisma type. */
export type AttemptRow = {
  userId: string | null;
  ip: string;
  success: boolean;
  createdAt: Date;
};

export type RateLimitStatus =
  | { limited: false }
  | { limited: true; reason: "user" | "ip" };

/**
 * The actual policy, as a pure function over a list of attempt rows and a
 * clock — no database, no Date.now(). This is what
 * loginRateLimitPolicy.test.ts exercises with injected timestamps;
 * isLoginRateLimited (loginRateLimit.ts) is the thin wrapper that fetches
 * real rows and hands them here.
 *
 * Only failed attempts count toward either cap. A successful login doesn't
 * retroactively "use up" a slot in this window, and it doesn't reset one
 * either — a fresh failure a minute after a success still counts fully;
 * that's what pruning (24h later, unrelated to this 15-minute window) is
 * for, not this function.
 */
export function evaluateRateLimit(
  attempts: readonly AttemptRow[],
  params: { userId: string; ip: string; now: Date },
): RateLimitStatus {
  const windowStart = params.now.getTime() - WINDOW_MS;

  const isRecentFailure = (a: AttemptRow) =>
    !a.success && a.createdAt.getTime() > windowStart;

  const userFailures = attempts.filter(
    (a) => isRecentFailure(a) && a.userId === params.userId,
  ).length;
  if (userFailures >= USER_FAILURE_LIMIT) {
    return { limited: true, reason: "user" };
  }

  const ipFailures = attempts.filter(
    (a) => isRecentFailure(a) && a.ip === params.ip,
  ).length;
  if (ipFailures >= IP_FAILURE_LIMIT) {
    return { limited: true, reason: "ip" };
  }

  return { limited: false };
}
