// Real unit tests (node:test, zero new dependencies) for the login
// rate-limit policy behind Family Accounts v1's auth cutover. Run with
// `npm test`. Exercises evaluateRateLimit directly with injected
// timestamps — no database involved, per the mission's own requirement
// that the window/threshold logic be testable without one.
//
// Imports only loginRateLimitPolicy.ts, which has zero imports of its own —
// this is what keeps db.ts (and its process.env.DATABASE_URL read) out of
// this test's import graph entirely. The DB-touching half of rate limiting
// (isLoginRateLimited/recordLoginAttempt) lives in loginRateLimit.ts, which
// carries "server-only" and is deliberately not imported here.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateRateLimit,
  USER_FAILURE_LIMIT,
  IP_FAILURE_LIMIT,
  type AttemptRow,
} from "./loginRateLimitPolicy";

const NOW = new Date("2026-08-28T12:00:00.000Z");
const WITHIN_WINDOW = new Date("2026-08-28T11:50:00.000Z"); // 10 min ago
const OUTSIDE_WINDOW = new Date("2026-08-28T11:40:00.000Z"); // 20 min ago

function attempt(overrides: Partial<AttemptRow>): AttemptRow {
  return {
    userId: "user-1",
    ip: "1.1.1.1",
    success: false,
    createdAt: WITHIN_WINDOW,
    ...overrides,
  };
}

test("evaluateRateLimit: no attempts at all is never limited", () => {
  const result = evaluateRateLimit([], { userId: "user-1", ip: "1.1.1.1", now: NOW });
  assert.deepEqual(result, { limited: false });
});

test("evaluateRateLimit: fewer than the user limit is not limited", () => {
  const attempts = Array.from({ length: USER_FAILURE_LIMIT - 1 }, () => attempt({}));
  const result = evaluateRateLimit(attempts, { userId: "user-1", ip: "1.1.1.1", now: NOW });
  assert.deepEqual(result, { limited: false });
});

test("evaluateRateLimit: exactly the user limit's worth of recent failures is limited", () => {
  const attempts = Array.from({ length: USER_FAILURE_LIMIT }, () => attempt({}));
  const result = evaluateRateLimit(attempts, { userId: "user-1", ip: "1.1.1.1", now: NOW });
  assert.deepEqual(result, { limited: true, reason: "user" });
});

test("evaluateRateLimit: more than the user limit stays limited", () => {
  const attempts = Array.from({ length: USER_FAILURE_LIMIT + 3 }, () => attempt({}));
  const result = evaluateRateLimit(attempts, { userId: "user-1", ip: "1.1.1.1", now: NOW });
  assert.deepEqual(result, { limited: true, reason: "user" });
});

test("evaluateRateLimit: successful attempts never count toward the user cap", () => {
  const attempts = Array.from({ length: USER_FAILURE_LIMIT + 5 }, () =>
    attempt({ success: true }),
  );
  const result = evaluateRateLimit(attempts, { userId: "user-1", ip: "1.1.1.1", now: NOW });
  assert.deepEqual(result, { limited: false });
});

test("evaluateRateLimit: failures outside the 15-minute window don't count", () => {
  const attempts = Array.from({ length: USER_FAILURE_LIMIT + 5 }, () =>
    attempt({ createdAt: OUTSIDE_WINDOW }),
  );
  const result = evaluateRateLimit(attempts, { userId: "user-1", ip: "1.1.1.1", now: NOW });
  assert.deepEqual(result, { limited: false });
});

test("evaluateRateLimit: a different user's failures don't count against this user", () => {
  const attempts = Array.from({ length: USER_FAILURE_LIMIT + 5 }, () =>
    attempt({ userId: "someone-else" }),
  );
  const result = evaluateRateLimit(attempts, { userId: "user-1", ip: "9.9.9.9", now: NOW });
  assert.deepEqual(result, { limited: false });
});

test("evaluateRateLimit: the IP cap trips even with several different userIds", () => {
  const attempts = Array.from({ length: IP_FAILURE_LIMIT }, (_, i) =>
    attempt({ userId: `fake-user-${i}`, ip: "5.5.5.5" }),
  );
  const result = evaluateRateLimit(attempts, {
    userId: "fake-user-does-not-matter",
    ip: "5.5.5.5",
    now: NOW,
  });
  assert.deepEqual(result, { limited: true, reason: "ip" });
});

test("evaluateRateLimit: the IP cap doesn't trip on someone else's IP", () => {
  const attempts = Array.from({ length: IP_FAILURE_LIMIT + 5 }, () =>
    attempt({ userId: "someone-else", ip: "6.6.6.6" }),
  );
  const result = evaluateRateLimit(attempts, { userId: "user-1", ip: "7.7.7.7", now: NOW });
  assert.deepEqual(result, { limited: false });
});

test("evaluateRateLimit: the user cap trips before the IP cap when both would eventually", () => {
  // Fewer than IP_FAILURE_LIMIT total, but all against one user — user
  // reason should win since it's the tighter, checked-first cap.
  const attempts = Array.from({ length: USER_FAILURE_LIMIT }, () => attempt({}));
  const result = evaluateRateLimit(attempts, { userId: "user-1", ip: "1.1.1.1", now: NOW });
  assert.deepEqual(result, { limited: true, reason: "user" });
});

test("evaluateRateLimit: a null userId (a malformed/device-chip attempt) only ever matches by IP", () => {
  const attempts = Array.from({ length: IP_FAILURE_LIMIT }, () =>
    attempt({ userId: null, ip: "8.8.8.8" }),
  );
  const result = evaluateRateLimit(attempts, { userId: "user-1", ip: "8.8.8.8", now: NOW });
  assert.deepEqual(result, { limited: true, reason: "ip" });
});

test("evaluateRateLimit: an attempt exactly at the window boundary does not count", () => {
  // WINDOW_MS is 15 minutes; an attempt from exactly 15 minutes ago is not
  // "more recent than" the window start, so evaluateRateLimit's strict `>`
  // comparison correctly excludes it.
  const exactlyAtBoundary = new Date(NOW.getTime() - 15 * 60 * 1000);
  const attempts = Array.from({ length: USER_FAILURE_LIMIT + 5 }, () =>
    attempt({ createdAt: exactlyAtBoundary }),
  );
  const result = evaluateRateLimit(attempts, { userId: "user-1", ip: "1.1.1.1", now: NOW });
  assert.deepEqual(result, { limited: false });
});
