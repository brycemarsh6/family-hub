// Pins access.ts: who sets stars, and who manages and redeems rewards.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REDEEM_UNDO_WINDOW_MS,
  canManageRewards,
  canRedeemRewards,
  canSetRewardPin,
  canSetStars,
  canUndoRedeem,
  kidMayRedeem,
  kidMayWish,
  type RewardActor,
} from "./access";

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

test("only admins and parents may set the PIN", () => {
  assert.equal(canSetRewardPin("admin"), true);
  assert.equal(canSetRewardPin("parent"), true);
  for (const role of ["kid", "device", "", "ADMIN", "guest"]) assert.equal(canSetRewardPin(role), false);
});

test("kidMayRedeem and kidMayWish: a kid and their own id only", () => {
  const kid: RewardActor = { userId: "k1", role: "kid" };
  for (const check of [kidMayRedeem, kidMayWish]) {
    assert.equal(check(kid, "k1"), true);
    assert.equal(check(kid, "k2"), false);
    assert.equal(check({ userId: "p1", role: "parent" }, "p1"), false);
    assert.equal(check({ userId: "d1", role: "device" }, "d1"), false);
  }
});

const NOW = new Date("2026-11-25T18:00:00Z");
const redeemedAgo = (ms: number, by: string | null) => ({ redeemedById: by, redeemedAt: new Date(NOW.getTime() - ms) });

test("canUndoRedeem: managers always, anyone else only their own within 10 minutes", () => {
  assert.equal(REDEEM_UNDO_WINDOW_MS, 600000);
  const old = redeemedAgo(24 * 3600 * 1000, "someone");
  assert.equal(canUndoRedeem({ userId: "p1", role: "parent" }, old, NOW), true);
  assert.equal(canUndoRedeem({ userId: "a1", role: "admin" }, redeemedAgo(0, null), NOW), true);

  const kid: RewardActor = { userId: "k1", role: "kid" };
  assert.equal(canUndoRedeem(kid, redeemedAgo(1000, "k1"), NOW), true);
  assert.equal(canUndoRedeem(kid, redeemedAgo(REDEEM_UNDO_WINDOW_MS, "k1"), NOW), true);
  assert.equal(canUndoRedeem(kid, redeemedAgo(REDEEM_UNDO_WINDOW_MS + 1, "k1"), NOW), false);
  assert.equal(canUndoRedeem(kid, redeemedAgo(1000, "k2"), NOW), false);
  assert.equal(canUndoRedeem(kid, redeemedAgo(1000, null), NOW), false);

  const tablet: RewardActor = { userId: "d1", role: "device" };
  assert.equal(canUndoRedeem(tablet, redeemedAgo(1000, "d1"), NOW), true);
  assert.equal(canUndoRedeem(tablet, redeemedAgo(1000, "k1"), NOW), false);
  assert.equal(canUndoRedeem(tablet, redeemedAgo(REDEEM_UNDO_WINDOW_MS + 1, "d1"), NOW), false);
});
