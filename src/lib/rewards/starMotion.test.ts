// Pins starMotion.ts: the ring, the keyframes and the count-up.

import { test } from "node:test";
import assert from "node:assert/strict";
import { CONFETTI_Z_INDEX, COUNT_MS, FLIGHT_MS, POP_AT, RING_STARS, STAGGER_MS, countUpValue, flightKeyframes, landingClearsAfterMs, landsAfterMs, ringOffsets } from "./starMotion";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);

test("the ring is eight stars and the timings are positive", () => {
  assert.equal(RING_STARS, 8);
  assert.ok(FLIGHT_MS > 0 && STAGGER_MS > 0 && COUNT_MS > 0);
});

test("ringOffsets spreads stars evenly, the first straight up", () => {
  const spots = ringOffsets(4, 10);
  assert.equal(spots.length, 4);
  close(spots[0].x, 0);
  close(spots[0].y, -10);
  close(spots[1].x, 10);
  close(spots[1].y, 0);
  close(spots[2].y, 10);
  close(spots[3].x, -10);
});

test("every ring spot sits on the radius, and a zero or negative count is empty", () => {
  for (const spot of ringOffsets(RING_STARS, 24)) close(Math.hypot(spot.x, spot.y), 24);
  assert.deepEqual(ringOffsets(0, 10), []);
  assert.deepEqual(ringOffsets(-3, 10), []);
});

test("with a target the star pops out by POP_AT, then flies and shrinks to the target and fades", () => {
  const frames = flightKeyframes({ x: 100, y: 100 }, { x: 300, y: 50 }, { x: 0, y: -20 });
  assert.equal(frames[0].offset, 0);
  assert.equal(frames[0].opacity, 0);
  assert.equal(frames[1].offset, POP_AT);
  assert.equal(frames[1].transform, "translate(0px, -20px) scale(1)");
  assert.equal(frames[1].opacity, 1);
  const last = frames[frames.length - 1];
  assert.equal(last.offset, 1);
  assert.equal(last.opacity, 0);
  assert.equal(last.transform, "translate(200px, -50px) scale(0.3)");
  assert.deepEqual(frames.map((f) => f.offset), [...frames.map((f) => f.offset)].sort((a, b) => a - b));
});

test("with no target the star pops out and fades in place", () => {
  const frames = flightKeyframes({ x: 100, y: 100 }, null, { x: 5, y: 6 });
  const last = frames[frames.length - 1];
  assert.equal(last.transform, "translate(5px, 6px) scale(1)");
  assert.equal(last.opacity, 0);
  assert.ok(frames.every((f) => !f.transform.includes("200")));
});

test("landsAfterMs is the flight plus the stagger, and never negative", () => {
  assert.equal(landsAfterMs(0), FLIGHT_MS);
  assert.equal(landsAfterMs(3), FLIGHT_MS + 3 * STAGGER_MS);
  assert.equal(landsAfterMs(-2), FLIGHT_MS);
});

test("countUpValue climbs from the old number to the new one", () => {
  assert.equal(countUpValue(10, 20, 0, 400), 10);
  assert.equal(countUpValue(10, 20, 200, 400), 15);
  assert.equal(countUpValue(10, 20, 400, 400), 20);
});

test("countUpValue holds at the start for 0 or negative elapsed", () => {
  assert.equal(countUpValue(10, 20, -50, 400), 10);
  assert.equal(countUpValue(10, 20, Number.NaN, 400), 10);
});

test("countUpValue never goes past the target, even long after the end", () => {
  assert.equal(countUpValue(10, 20, 401, 400), 20);
  assert.equal(countUpValue(10, 20, 1e9, 400), 20);
  for (let t = 0; t <= 800; t += 7) {
    const v = countUpValue(3, 11, t, 400);
    assert.ok(Number.isInteger(v) && v >= 3 && v <= 11);
  }
});

test("countUpValue with from greater than to walks down and never below to", () => {
  assert.equal(countUpValue(20, 10, 200, 400), 15);
  assert.equal(countUpValue(20, 10, 999, 400), 10);
  for (let t = 0; t <= 800; t += 7) {
    const v = countUpValue(20, 10, t, 400);
    assert.ok(v >= 10 && v <= 20);
  }
});

test("countUpValue with no duration jumps straight to the target", () => {
  assert.equal(countUpValue(1, 9, 5, 0), 9);
});

test("landingClearsAfterMs is later than the last star landing plus the count", () => {
  assert.ok(landingClearsAfterMs() > landsAfterMs(RING_STARS - 1) + COUNT_MS);
});

test("CONFETTI_Z_INDEX sits above the sheets (61) and below the flight layer and words (70)", () => {
  assert.ok(CONFETTI_Z_INDEX > 61 && CONFETTI_Z_INDEX < 70);
});
