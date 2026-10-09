import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adjustBody,
  bulkAdjustBody,
  expiringQuery,
  inventoryCreateBody,
  inventoryListQuery,
  inventoryPatchBody,
  leftoverBody,
} from "./schemas";

const ok = (r: { success: boolean }) => r.success;

test("inventoryListQuery: defaults, coercion, enums, bounds, strictness", () => {
  const r = inventoryListQuery.parse({});
  assert.equal(r.withinDays, 7);
  assert.equal(inventoryListQuery.parse({ withinDays: "14" }).withinDays, 14);
  assert.ok(ok(inventoryListQuery.safeParse({ location: "Fridge", status: "low", category: "Produce" })));
  assert.ok(!ok(inventoryListQuery.safeParse({ location: "Garage" })));
  assert.ok(!ok(inventoryListQuery.safeParse({ category: "Nope" })));
  assert.ok(!ok(inventoryListQuery.safeParse({ status: "stale" })));
  assert.ok(!ok(inventoryListQuery.safeParse({ withinDays: "0" })));
  assert.ok(!ok(inventoryListQuery.safeParse({ withinDays: "61" })));
  assert.ok(!ok(inventoryListQuery.safeParse({ withinDays: "1.5" })));
  assert.ok(ok(inventoryListQuery.safeParse({ q: "a".repeat(100) })));
  assert.ok(!ok(inventoryListQuery.safeParse({ q: "a".repeat(101) })));
  assert.ok(!ok(inventoryListQuery.safeParse({ date: "10/09/2026" })));
  assert.ok(!ok(inventoryListQuery.safeParse({ locaton: "Fridge" })));
});

test("inventoryCreateBody: defaults, trimming, bounds, strictness", () => {
  const r = inventoryCreateBody.parse({ name: "  Milk  " });
  assert.equal(r.name, "Milk");
  assert.equal(r.quantity, 1);
  assert.equal(r.allowDuplicate, false);
  assert.ok(!ok(inventoryCreateBody.safeParse({ name: "   " })));
  assert.ok(!ok(inventoryCreateBody.safeParse({ name: "a".repeat(121) })));
  assert.ok(!ok(inventoryCreateBody.safeParse({ name: "x", quantity: -1 })));
  assert.ok(!ok(inventoryCreateBody.safeParse({ name: "x", quantity: 10001 })));
  assert.ok(ok(inventoryCreateBody.safeParse({ name: "x", unit: null, expiresOn: null })));
  assert.ok(!ok(inventoryCreateBody.safeParse({ name: "x", unit: "u".repeat(31) })));
  assert.ok(!ok(inventoryCreateBody.safeParse({ name: "x", lowThreshold: -1 })));
  assert.ok(!ok(inventoryCreateBody.safeParse({ name: "x", expiresOn: "tomorrow" })));
  assert.ok(!ok(inventoryCreateBody.safeParse({ name: "x", extra: 1 })));
});

test("inventoryPatchBody: needs a key, strict, partial ok", () => {
  assert.ok(!ok(inventoryPatchBody.safeParse({})));
  assert.ok(ok(inventoryPatchBody.safeParse({ quantity: 0 })));
  assert.ok(ok(inventoryPatchBody.safeParse({ expiresOn: null })));
  assert.ok(!ok(inventoryPatchBody.safeParse({ quantity: 1, bogus: true })));
  assert.ok(!ok(inventoryPatchBody.safeParse({ name: "" })));
});

test("adjustBody: finite, non-zero, bounded", () => {
  assert.ok(ok(adjustBody.safeParse({ delta: -2, reason: "used" })));
  assert.ok(!ok(adjustBody.safeParse({ delta: 0 })));
  assert.ok(!ok(adjustBody.safeParse({ delta: 10001 })));
  assert.ok(!ok(adjustBody.safeParse({ delta: -10001 })));
  assert.ok(ok(adjustBody.safeParse({ delta: 10000 })));
  assert.ok(!ok(adjustBody.safeParse({ delta: Infinity })));
  assert.ok(!ok(adjustBody.safeParse({ delta: NaN })));
  assert.ok(!ok(adjustBody.safeParse({ delta: "1" })));
  assert.ok(!ok(adjustBody.safeParse({ delta: 1, reason: "r".repeat(201) })));
  assert.ok(!ok(adjustBody.safeParse({ delta: 1, extra: 1 })));
});

test("bulkAdjustBody: 1-100 entries, unique ids with a clear message", () => {
  const entry = (id: string) => ({ id, delta: 1 });
  assert.ok(!ok(bulkAdjustBody.safeParse({ adjustments: [] })));
  assert.ok(ok(bulkAdjustBody.safeParse({ adjustments: [entry("a")] })));
  const hundred = Array.from({ length: 100 }, (_, i) => entry(`id${i}`));
  assert.ok(ok(bulkAdjustBody.safeParse({ adjustments: hundred })));
  assert.ok(!ok(bulkAdjustBody.safeParse({ adjustments: [...hundred, entry("more")] })));
  const dup = bulkAdjustBody.safeParse({ adjustments: [entry("a"), entry("b"), entry("a")] });
  assert.ok(!dup.success);
  assert.match(dup.error.issues[0].message, /only once/);
  assert.ok(!ok(bulkAdjustBody.safeParse({ adjustments: [{ id: "a", delta: 0 }] })));
  assert.ok(!ok(bulkAdjustBody.safeParse({ adjustments: [entry("a")], extra: 1 })));
});

test("expiringQuery: default and bounds", () => {
  assert.equal(expiringQuery.parse({}).withinDays, 7);
  assert.ok(!ok(expiringQuery.safeParse({ withinDays: "90" })));
  assert.ok(!ok(expiringQuery.safeParse({ nope: "1" })));
  assert.ok(ok(expiringQuery.safeParse({ date: "2026-10-09" })));
});

test("leftoverBody: defaults and bounds", () => {
  const r = leftoverBody.parse({ name: "Chili" });
  assert.deepEqual([r.portions, r.daysGood, r.location], [1, 3, "Fridge"]);
  assert.ok(!ok(leftoverBody.safeParse({ name: "x", portions: 0.4 })));
  assert.ok(ok(leftoverBody.safeParse({ name: "x", portions: 0.5 })));
  assert.ok(!ok(leftoverBody.safeParse({ name: "x", portions: 51 })));
  assert.ok(!ok(leftoverBody.safeParse({ name: "x", daysGood: 0 })));
  assert.ok(!ok(leftoverBody.safeParse({ name: "x", daysGood: 15 })));
  assert.ok(!ok(leftoverBody.safeParse({ name: "x", daysGood: 2.5 })));
  assert.ok(ok(leftoverBody.safeParse({ name: "x", location: "Freezer" })));
  assert.ok(!ok(leftoverBody.safeParse({ name: "x", location: "Pantry" })));
  assert.ok(!ok(leftoverBody.safeParse({ name: "x", date: "nope" })));
  assert.ok(!ok(leftoverBody.safeParse({ name: "x", extra: 1 })));
});
