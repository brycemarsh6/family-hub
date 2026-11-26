// Pins access.ts: who sets stars, and who manages and redeems rewards.

import { test } from "node:test";
import assert from "node:assert/strict";
import { canAdjustStars, canManageRewards, canRedeemRewards, canSetStars } from "./access";

test("admin and parent may set stars", () => {
  assert.equal(canSetStars("admin"), true);
  assert.equal(canSetStars("parent"), true);
});

test("a kid, a device and anything unknown may not", () => {
  for (const role of ["kid", "device", "", "ADMIN", "guest"]) assert.equal(canSetStars(role), false);
});

test("only admins and parents may manage or redeem rewards", () => {
  for (const check of [canManageRewards, canRedeemRewards]) {
    assert.equal(check("admin"), true);
    assert.equal(check("parent"), true);
    for (const role of ["kid", "device", "", "ADMIN", "guest"]) assert.equal(check(role), false);
  }
});

test("only admins and parents may give or take stars", () => {
  assert.equal(canAdjustStars("admin"), true);
  assert.equal(canAdjustStars("parent"), true);
  for (const role of ["kid", "device", "", "ADMIN", "guest"]) assert.equal(canAdjustStars(role), false);
});
