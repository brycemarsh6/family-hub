// The pure half of the Assistant API's rate limit — no imports, no database,
// no Date.now(). rateLimit.ts fetches the two numbers this needs; this file
// decides (the loginRateLimit / loginRateLimitPolicy split, for the same
// reason: the DB half carries "server-only" and must stay out of tests).

/** Sliding window length. */
export const WINDOW_MS = 60_000;

/** Requests allowed inside one window. The 121st is refused. */
export const LIMIT = 120;

export type RateLimitStatus =
  | { limited: false }
  | { limited: true; retryAfterSeconds: number };

/**
 * `countInWindow` is how many already-recorded requests fall inside the
 * window; `oldestInWindow` is the earliest of them. Once LIMIT are recorded
 * the next is refused, until the oldest one ages out of the window.
 */
export function evaluate(
  countInWindow: number,
  oldestInWindow: Date | null,
  now: Date,
): RateLimitStatus {
  if (countInWindow < LIMIT || oldestInWindow === null) return { limited: false };
  const msUntilFree = oldestInWindow.getTime() + WINDOW_MS - now.getTime();
  return { limited: true, retryAfterSeconds: Math.max(1, Math.ceil(msUntilFree / 1000)) };
}
