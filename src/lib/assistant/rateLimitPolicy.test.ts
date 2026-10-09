import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, LIMIT, WINDOW_MS } from "./rateLimitPolicy";

const now = new Date("2026-10-09T12:00:00Z");

test("constants", () => {
  assert.equal(LIMIT, 120);
  assert.equal(WINDOW_MS, 60_000);
});

test("119 recorded requests: not limited", () => {
  assert.deepEqual(evaluate(119, new Date(now.getTime() - 1000), now), { limited: false });
});

test("exactly 120 recorded requests: limited", () => {
  const oldest = new Date(now.getTime() - 20_000);
  assert.deepEqual(evaluate(120, oldest, now), { limited: true, retryAfterSeconds: 40 });
});

test("retry-after rounds up and never drops below 1", () => {
  assert.deepEqual(evaluate(130, new Date(now.getTime() - 59_500), now), {
    limited: true,
    retryAfterSeconds: 1,
  });
  assert.deepEqual(evaluate(130, new Date(now.getTime() - 60_000), now), {
    limited: true,
    retryAfterSeconds: 1,
  });
});

test("limited count with no oldest row is treated as not limited", () => {
  assert.deepEqual(evaluate(500, null, now), { limited: false });
});
