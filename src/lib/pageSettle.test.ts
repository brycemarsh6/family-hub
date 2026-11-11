import { test } from "node:test";
import assert from "node:assert/strict";
import { settlePage } from "./pageSettle";

const W = 400; // a quarter is 100

test("settlePage: a drag just under a quarter springs back, both sides", () => {
  assert.equal(settlePage({ dx: -100, velocityPxPerMs: 0, pageWidth: W }), 0);
  assert.equal(settlePage({ dx: 100, velocityPxPerMs: 0, pageWidth: W }), 0);
});

test("settlePage: a drag just past a quarter turns, left is next, right is previous", () => {
  assert.equal(settlePage({ dx: -101, velocityPxPerMs: 0, pageWidth: W }), 1);
  assert.equal(settlePage({ dx: 101, velocityPxPerMs: 0, pageWidth: W }), -1);
});

test("settlePage: a flick in the drag direction turns a short drag, both ways", () => {
  assert.equal(settlePage({ dx: -20, velocityPxPerMs: -0.5, pageWidth: W }), 1);
  assert.equal(settlePage({ dx: 20, velocityPxPerMs: 0.5, pageWidth: W }), -1);
});

test("settlePage: a flick just under the speed does not turn", () => {
  assert.equal(settlePage({ dx: -20, velocityPxPerMs: -0.49, pageWidth: W }), 0);
});

test("settlePage: a flick against the drag direction does not turn", () => {
  assert.equal(settlePage({ dx: -20, velocityPxPerMs: 0.9, pageWidth: W }), 0);
  assert.equal(settlePage({ dx: 20, velocityPxPerMs: -0.9, pageWidth: W }), 0);
});

test("settlePage: a flick shorter than the direction lock does not turn", () => {
  assert.equal(settlePage({ dx: -7, velocityPxPerMs: -2, pageWidth: W }), 0);
  assert.equal(settlePage({ dx: -8, velocityPxPerMs: -2, pageWidth: W }), 1);
});

test("settlePage: zero width never divides or turns on distance alone; a flick still can", () => {
  assert.equal(settlePage({ dx: -50, velocityPxPerMs: 0, pageWidth: 0 }), 0);
  assert.equal(settlePage({ dx: -50, velocityPxPerMs: -1, pageWidth: 0 }), 1);
  assert.equal(settlePage({ dx: 0, velocityPxPerMs: -1, pageWidth: 0 }), 0);
});
