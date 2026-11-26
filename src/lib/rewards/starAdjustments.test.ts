// Pins starAdjustments.ts: the stepper walk and the input check.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ADJUST_AMOUNT_REFUSAL, ADJUST_DIRECTION_REFUSAL, ADJUST_NOTE_REFUSAL, STAR_STEPS } from "../rewardVocabulary";
import { ADJUST_DEFAULT_STARS, ADJUST_NOTE_MAX, nextAdjustStep, toAdjustmentInput } from "./starAdjustments";

test("the default is on the list", () => {
  assert.ok((STAR_STEPS as readonly number[]).includes(ADJUST_DEFAULT_STARS));
});

test("nextAdjustStep walks the list and stops at both ends", () => {
  assert.equal(nextAdjustStep(5, "up"), 10);
  assert.equal(nextAdjustStep(5, "down"), 4);
  assert.equal(nextAdjustStep(50, "up"), 50);
  assert.equal(nextAdjustStep(1, "down"), 1);
  assert.equal(nextAdjustStep(1, "up"), 2);
  assert.equal(nextAdjustStep(25, "up"), 50);
});

test("nextAdjustStep snaps an off-list amount to the nearest step and is never null", () => {
  assert.equal(nextAdjustStep(7, "up"), 5);
  assert.equal(nextAdjustStep(0, "up"), 1);
  assert.equal(nextAdjustStep(500, "down"), 50);
  assert.equal(nextAdjustStep(Number.NaN, "up"), ADJUST_DEFAULT_STARS);
});

test("toAdjustmentInput signs the amount by direction", () => {
  assert.deepEqual(toAdjustmentInput({ direction: "give", amount: 5, note: "Chores" }), { ok: true, value: { amount: 5, note: "Chores" } });
  assert.deepEqual(toAdjustmentInput({ direction: "take", amount: 10, note: "" }), { ok: true, value: { amount: -10, note: null } });
});

test("toAdjustmentInput refuses an unknown direction and an off-list or zero amount", () => {
  assert.deepEqual(toAdjustmentInput({ direction: "up", amount: 5 }), { ok: false, error: ADJUST_DIRECTION_REFUSAL });
  assert.deepEqual(toAdjustmentInput(null), { ok: false, error: ADJUST_DIRECTION_REFUSAL });
  for (const amount of [0, -5, 6, 51, "5", null, undefined, Number.NaN]) {
    assert.deepEqual(toAdjustmentInput({ direction: "give", amount }), { ok: false, error: ADJUST_AMOUNT_REFUSAL });
  }
});

test("toAdjustmentInput trims the note, makes empty null, and caps it at 60 letters", () => {
  assert.deepEqual(toAdjustmentInput({ direction: "give", amount: 1, note: "  Nice  " }), { ok: true, value: { amount: 1, note: "Nice" } });
  assert.deepEqual(toAdjustmentInput({ direction: "give", amount: 1, note: "   " }), { ok: true, value: { amount: 1, note: null } });
  assert.deepEqual(toAdjustmentInput({ direction: "give", amount: 1 }), { ok: true, value: { amount: 1, note: null } });
  assert.equal(toAdjustmentInput({ direction: "give", amount: 1, note: "a".repeat(ADJUST_NOTE_MAX) }).ok, true);
  assert.deepEqual(toAdjustmentInput({ direction: "give", amount: 1, note: "a".repeat(ADJUST_NOTE_MAX + 1) }), { ok: false, error: ADJUST_NOTE_REFUSAL });
  assert.deepEqual(toAdjustmentInput({ direction: "give", amount: 1, note: 5 }), { ok: false, error: ADJUST_NOTE_REFUSAL });
});
