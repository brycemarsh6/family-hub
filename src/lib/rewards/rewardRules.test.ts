// Pins rewardRules.ts: the cost stepper, earned and ready, the refusals, the
// sheet's input check and the redeem sheet's words.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  celebrationLines,
  checkRewardInput,
  isEarned,
  nextCostStep,
  redeemConfirmLines,
  redeemRefusal,
  rewardStatus,
  visibleRewards,
} from "./rewardRules";

test("nextCostStep walks the list and stops at both ends", () => {
  assert.equal(nextCostStep(20, "up"), 25);
  assert.equal(nextCostStep(20, "down"), 15);
  assert.equal(nextCostStep(5, "down"), 5);
  assert.equal(nextCostStep(1000, "up"), 1000);
  assert.equal(nextCostStep(125, "up"), 150);
});

test("nextCostStep snaps an off-list cost to the nearest step", () => {
  assert.equal(nextCostStep(22, "up"), 20);
  assert.equal(nextCostStep(23, "down"), 25);
  assert.equal(nextCostStep(0, "up"), 5);
  assert.equal(nextCostStep(5000, "down"), 1000);
  assert.equal(nextCostStep(null, "up"), 20);
});

test("isEarned: only a redeemed one-time reward", () => {
  assert.equal(isEarned({ repeatable: false, redeemedCount: 1 }), true);
  assert.equal(isEarned({ repeatable: false, redeemedCount: 0 }), false);
  assert.equal(isEarned({ repeatable: true, redeemedCount: 5 }), false);
});

test("rewardStatus: saving, ready, earned and wish", () => {
  const base = { repeatable: false, redeemedCount: 0, cost: 150 };
  const saving = rewardStatus(base, 55);
  assert.equal(saving.kind, "saving");
  assert.equal(saving.text, "55 of 150");
  assert.ok(Math.abs(saving.fraction - 55 / 150) < 1e-9);
  assert.equal(rewardStatus(base, 150).kind, "ready");
  assert.equal(rewardStatus(base, 150).fraction, 1);
  assert.equal(rewardStatus(base, 400).fraction, 1);
  assert.equal(rewardStatus({ ...base, redeemedCount: 1 }, 400).kind, "earned");
  assert.equal(rewardStatus({ ...base, cost: null }, 400).kind, "wish");
  assert.equal(rewardStatus({ ...base, repeatable: true, redeemedCount: 3 }, 10).kind, "saving");
});

test("a negative bank reads 0 and fills nothing", () => {
  const status = rewardStatus({ repeatable: false, redeemedCount: 0, cost: 20 }, -7);
  assert.equal(status.text, "0 of 20");
  assert.equal(status.fraction, 0);
});

test("visibleRewards drops earned ones only when hiding", () => {
  const list = [
    { id: "a", repeatable: false, redeemedCount: 1 },
    { id: "b", repeatable: true, redeemedCount: 1 },
    { id: "c", repeatable: false, redeemedCount: 0 },
  ];
  assert.deepEqual(visibleRewards(list, true).map((r) => r.id), ["b", "c"]);
  assert.deepEqual(visibleRewards(list, false).map((r) => r.id), ["a", "b", "c"]);
});

test("redeemRefusal: earned first, then no cost, then not enough, else null", () => {
  assert.equal(redeemRefusal({ repeatable: false, redeemedCount: 1, cost: null }, 0, "Ellie"), "Already earned.");
  assert.equal(redeemRefusal({ repeatable: false, redeemedCount: 0, cost: null }, 99, "Ellie"), "This reward needs a cost first.");
  assert.equal(redeemRefusal({ repeatable: false, redeemedCount: 0, cost: 20 }, 5, "Ellie"), "Ellie needs 15 more stars.");
  assert.equal(redeemRefusal({ repeatable: false, redeemedCount: 0, cost: 20 }, 19, "Ellie"), "Ellie needs 1 more star.");
  assert.equal(redeemRefusal({ repeatable: false, redeemedCount: 0, cost: 20 }, 20, "Ellie"), null);
  assert.equal(redeemRefusal({ repeatable: true, redeemedCount: 4, cost: 20 }, 20, "Ellie"), null);
});

const GOOD = { title: "  Cupcake ", emoji: "🧁", cost: 20, repeatable: false, ownerId: "u1" };

test("checkRewardInput returns the clean value", () => {
  assert.deepEqual(checkRewardInput(GOOD), { ok: true, value: { title: "Cupcake", emoji: "🧁", cost: 20, repeatable: false, ownerId: "u1" } });
  const noPic = checkRewardInput({ ...GOOD, emoji: null });
  assert.ok(noPic.ok && noPic.value.emoji === null);
  const blankPic = checkRewardInput({ ...GOOD, emoji: "  " });
  assert.ok(blankPic.ok && blankPic.value.emoji === null);
  const max = checkRewardInput({ ...GOOD, title: "x".repeat(60) });
  assert.ok(max.ok);
});

test("checkRewardInput refuses in the house words", () => {
  const error = (patch: Record<string, unknown>) => {
    const result = checkRewardInput({ ...GOOD, ...patch });
    return result.ok ? null : result.error;
  };
  assert.equal(error({ title: "   " }), "Give the reward a name.");
  assert.equal(error({ title: "x".repeat(61) }), "Give the reward a name.");
  assert.equal(error({ title: 5 }), "Give the reward a name.");
  assert.equal(error({ cost: 21 }), "Pick a cost from the list.");
  assert.equal(error({ cost: null }), "Pick a cost from the list.");
  assert.equal(error({ emoji: "abc" }), "That isn't an emoji.");
  assert.equal(error({ emoji: 5 }), "Pick an emoji, or No picture.");
  assert.equal(error({ repeatable: "yes" }), "That didn't save. Please try again.");
  assert.equal(error({ ownerId: "" }), "That didn't save. Please try again.");
  assert.equal(checkRewardInput(null).ok, false);
});

test("celebrationLines puts the date in the asked zone", () => {
  const redeemedAt = new Date("2026-11-25T03:30:00Z");
  const base = { title: "Cupcake", ownerName: "Ellie", cost: 20, redeemedAt };
  assert.deepEqual(celebrationLines(base, "America/Denver"), {
    heading: "Great work!",
    title: "Cupcake redeemed.",
    by: "By Ellie for 20 stars on Tuesday, November 24.",
  });
  assert.equal(celebrationLines(base, "UTC").by, "By Ellie for 20 stars on Wednesday, November 25.");
});

test("redeemConfirmLines are the mock's words", () => {
  assert.deepEqual(redeemConfirmLines({ title: "Cupcake", cost: 20 }, "Ellie", 55), {
    question: "Redeem Cupcake for Ellie?",
    spend: "This spends 20 of Ellie's 55 stars. 35 left after.",
  });
});
