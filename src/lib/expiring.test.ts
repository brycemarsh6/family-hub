import { test } from "node:test";
import assert from "node:assert/strict";
import { isExpiringWithin } from "./expiring";

const today = new Date(2026, 5, 10, 12); // local noon, Jun 10 2026
const base = {
  name: "ZZZ Unmatched Thing",
  category: "Other" as const,
  location: "Pantry" as const,
  expiresAt: null,
  restockedAt: today,
};
const inDays = (n: number) => new Date(2026, 5, 10 + n, 9);

test("isExpiringWithin: a real date wins, including the boundary", () => {
  assert.equal(isExpiringWithin({ ...base, expiresAt: inDays(3) }, 3, today), true);
  assert.equal(isExpiringWithin({ ...base, expiresAt: inDays(4) }, 3, today), false);
  assert.equal(isExpiringWithin({ ...base, expiresAt: inDays(-2) }, 3, today), true);
});

test("isExpiringWithin: no date and no estimate never matches", () => {
  assert.equal(isExpiringWithin(base, 3650, today), false);
});

test("isExpiringWithin: falls back to the shelf-life estimate", () => {
  // Fresh produce in the fridge has a category estimate of about a week.
  const produce = {
    name: "ZZZ Unmatched Greens",
    category: "Produce" as const,
    location: "Fridge" as const,
    expiresAt: null,
    restockedAt: new Date(2026, 5, 3, 9), // restocked 7 days ago
  };
  assert.equal(isExpiringWithin(produce, 3, today), true);
  const fresh = { ...produce, restockedAt: today };
  assert.equal(isExpiringWithin(fresh, 1, today), false);
});
