import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gestureStep,
  IDLE_GESTURE,
  DIRECTION_LOCK_PX,
  HOLD_MS,
  HOLD_SLOP_PX,
  type GestureEffect,
  type GestureEvent,
  type GestureOptions,
  type GestureState,
} from "./calendarGesture";

// Feed a whole touch sequence; return the final state and every effect.
function run(events: GestureEvent[], options?: GestureOptions) {
  let state: GestureState = IDLE_GESTURE;
  const effects: GestureEffect[] = [];
  for (const e of events) {
    const r = gestureStep(state, e, options);
    state = r.state;
    effects.push(...r.effects);
  }
  return { state, effects };
}
const types = (effects: GestureEffect[]) => effects.map((e) => e.type);

const down = (x = 100, y = 100, onBlock = false, t = 0, id = 1, isPrimary = true): GestureEvent => ({
  type: "down", pointerId: id, x, y, time: t, onBlock, isPrimary,
});
const move = (x: number, y: number, t: number, id = 1): GestureEvent => ({
  type: "move", pointerId: id, x, y, time: t,
});
const up = (x: number, y: number, t: number, id = 1): GestureEvent => ({
  type: "up", pointerId: id, x, y, time: t,
});
const cancel = (id = 1): GestureEvent => ({ type: "cancel", pointerId: id });

test("tap: down then up ends idle with no effects and the click is not swallowed", () => {
  const r = run([down(), up(100, 100, 50), { type: "click" }]);
  assert.equal(r.state.kind, "idle");
  assert.deepEqual(r.effects, []);
});

test("tap then hold (hold off): a stray holdFired does nothing", () => {
  const r = run([down(100, 100, true), { type: "holdFired" }, up(100, 100, 600)]);
  assert.equal(r.state.kind, "idle");
  assert.deepEqual(r.effects, []);
});

test("hold off: no hold timer is ever requested, even on a block", () => {
  const r = run([down(100, 100, true)]);
  assert.equal(r.state.kind, "undecided");
  assert.deepEqual(r.effects, []);
});

test("a move of 7px stays undecided and a lift is a tap", () => {
  const r = run([down(), move(107, 100, 10), up(107, 100, 20)]);
  assert.equal(r.state.kind, "idle");
  assert.deepEqual(r.effects, []);
});

test("a move of exactly 8px locks into a slide: capture, swallow armed, offset", () => {
  const r = run([down(), move(100 + DIRECTION_LOCK_PX, 100, 10)]);
  assert.equal(r.state.kind, "sliding");
  assert.deepEqual(types(r.effects), ["capture", "armSwallow", "setOffset"]);
});

test("a move of 9px sideways slides; 9px down scrolls", () => {
  assert.equal(run([down(), move(109, 100, 10)]).state.kind, "sliding");
  const s = run([down(), move(100, 109, 10), up(100, 109, 20)]);
  assert.equal(s.state.kind, "idle");
  assert.deepEqual(s.effects, []);
});

test("diagonal where vertical wins scrolls: no capture, no swallow", () => {
  const r = run([down(), move(110, 125, 10)]);
  assert.equal(r.state.kind, "scrolling");
  assert.deepEqual(r.effects, []);
  assert.equal(run([down(), move(110, 125, 10), up(110, 125, 20), { type: "click" }]).state.kind, "idle");
});

test("an exact tie slides, as usePageSwipe does today", () => {
  assert.equal(run([down(), move(110, 110, 10)]).state.kind, "sliding");
});

test("a slide that starts on a block still slides and swallows the click", () => {
  const r = run([down(100, 100, true), move(140, 102, 10), up(140, 102, 400), { type: "click" }]);
  assert.equal(r.state.kind, "idle");
  assert.ok(types(r.effects).includes("swallowClick"));
});

test("slide then lift emits settle with the travel and releases capture, never springBack", () => {
  const r = run([down(), move(150, 100, 10), move(200, 100, 20), up(200, 100, 25)]);
  assert.equal(r.state.kind, "idle");
  const settle = r.effects.find((e) => e.type === "settle");
  assert.deepEqual(settle, { type: "settle", dx: 100, velocityPxPerMs: 5 });
  assert.ok(!types(r.effects).includes("springBack"));
  assert.ok(types(r.effects).includes("releaseCapture"));
});

test("a finger that rested before lifting has no flick speed", () => {
  const r = run([down(), move(150, 100, 10), up(150, 100, 500)]);
  const settle = r.effects.find((e) => e.type === "settle");
  assert.deepEqual(settle, { type: "settle", dx: 50, velocityPxPerMs: 0 });
});

test("second finger at undecided hands to pinch and ends idle when both lift", () => {
  const r = run([down(), down(200, 100, false, 5, 2, false)]);
  assert.equal(r.state.kind, "pinch");
  assert.deepEqual(types(r.effects), ["handToPinch"]);
  const end = run([down(), down(200, 100, false, 5, 2, false), up(0, 0, 9, 1), up(0, 0, 10, 2)]);
  assert.equal(end.state.kind, "idle");
});

test("second finger at scrolling hands to pinch", () => {
  const r = run([down(), move(100, 130, 10), down(200, 100, false, 15, 2, false)]);
  assert.equal(r.state.kind, "pinch");
  assert.deepEqual(types(r.effects), ["handToPinch"]);
});

test("second finger at sliding springs back, releases capture, hands to pinch, never settles", () => {
  const r = run([
    down(), move(150, 100, 10), down(200, 100, false, 15, 2, false),
    up(0, 0, 20, 1), up(0, 0, 21, 2),
  ]);
  assert.equal(r.state.kind, "idle");
  const t = types(r.effects);
  assert.ok(t.includes("springBack") && t.includes("handToPinch") && t.includes("releaseCapture"));
  assert.ok(!t.includes("settle"));
});

test("a pinch is not a swipe: moves in a pinch do nothing, and lifting one finger stays pinch", () => {
  const r = run([down(), down(200, 100, false, 5, 2, false), move(300, 100, 10), up(0, 0, 11, 2)]);
  assert.equal(r.state.kind, "pinch");
  assert.deepEqual(types(r.effects), ["handToPinch"]);
});

test("cancel at undecided ends idle", () => {
  const r = run([down(), cancel()]);
  assert.equal(r.state.kind, "idle");
  assert.deepEqual(r.effects, []);
});

test("cancel at scrolling ends idle", () => {
  const r = run([down(), move(100, 140, 10), cancel()]);
  assert.equal(r.state.kind, "idle");
  assert.deepEqual(r.effects, []);
});

test("cancel at sliding springs back and never settles", () => {
  const r = run([down(), move(200, 100, 10), cancel()]);
  assert.equal(r.state.kind, "idle");
  const t = types(r.effects);
  assert.ok(t.includes("springBack") && t.includes("releaseCapture"));
  assert.ok(!t.includes("settle"));
});

test("a second pointer down is not a new gesture while one is active: start point survives", () => {
  const r = run([down(100, 100), down(300, 300, false, 5, 2, false), up(0, 0, 9, 2)]);
  assert.equal(r.state.kind, "pinch");
  assert.equal(r.state.startX, 100);
});

test("the click after a committed slide is swallowed once; the next is not", () => {
  const r = run([down(), move(160, 100, 10), up(160, 100, 400), { type: "click" }, { type: "click" }]);
  assert.equal(r.effects.filter((e) => e.type === "swallowClick").length, 1);
});

test("a swallow left unclicked (touch gives no click) is cleared by the next pointer down", () => {
  const r = run([down(), move(160, 100, 10), up(160, 100, 400), down(), up(100, 100, 450), { type: "click" }]);
  assert.equal(r.state.kind, "idle");
  assert.ok(!types(r.effects).includes("swallowClick"));
});

test("a primary down mid-gesture (lost up) resets cleanly", () => {
  const r = run([down(), move(160, 100, 10), down(50, 50, false, 20, 3), up(50, 50, 30, 3)]);
  assert.equal(r.state.kind, "idle");
  assert.ok(types(r.effects).includes("springBack"));
});

// ---- hold and drag, switched on (PR 4 will use these) ----

const ON = { holdEnabled: true };

test("hold on: a press on a block starts the hold timer; a tap clears it and ends idle", () => {
  const r = run([down(100, 100, true), up(100, 100, 50)], ON);
  assert.equal(r.state.kind, "idle");
  assert.deepEqual(r.effects, [{ type: "startHoldTimer", ms: HOLD_MS }, { type: "clearHoldTimer" }]);
});

test("hold on: a press off a block never arms the timer", () => {
  assert.deepEqual(run([down(100, 100, false)], ON).effects, []);
});

test("hold on: holdFired then lift is holding, then idle", () => {
  const held = run([down(100, 100, true), { type: "holdFired" }], ON);
  assert.equal(held.state.kind, "holding");
  const r = run([down(100, 100, true), { type: "holdFired" }, up(100, 100, 600)], ON);
  assert.equal(r.state.kind, "idle");
  assert.ok(types(r.effects).includes("releaseCapture"));
});

test("hold on: holding then a move past the slop drags; drop ends idle", () => {
  const mid = run([down(100, 100, true), { type: "holdFired" }, move(100 + HOLD_SLOP_PX, 100, 700)], ON);
  assert.equal(mid.state.kind, "dragging");
  const r = run(
    [down(100, 100, true), { type: "holdFired" }, move(140, 120, 700), up(140, 120, 800)],
    ON,
  );
  assert.equal(r.state.kind, "idle");
  assert.ok(types(r.effects).includes("dragDrop"));
});

test("hold on: moving before the hold fires cancels the timer and slides", () => {
  const r = run([down(100, 100, true), move(120, 100, 100), { type: "holdFired" }, up(120, 100, 600)], ON);
  assert.equal(r.state.kind, "idle");
  assert.ok(types(r.effects).includes("clearHoldTimer"));
  assert.ok(types(r.effects).includes("settle"));
});

test("hold on: cancel while dragging cancels the drag and ends idle", () => {
  const r = run([down(100, 100, true), { type: "holdFired" }, move(140, 120, 700), cancel()], ON);
  assert.equal(r.state.kind, "idle");
  assert.ok(types(r.effects).includes("dragCancel"));
});

test("hold on: a second finger while holding hands to pinch and ends idle", () => {
  const r = run(
    [down(100, 100, true), { type: "holdFired" }, down(200, 100, false, 600, 2, false), up(0, 0, 700, 1), up(0, 0, 701, 2)],
    ON,
  );
  assert.equal(r.state.kind, "idle");
  assert.ok(types(r.effects).includes("handToPinch"));
});
