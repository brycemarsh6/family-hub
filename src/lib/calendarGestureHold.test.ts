// Real unit tests (node:test) for calendarGesture.ts with the hold on
// (mission 70, drag to reschedule): the hold timer, holding, dragging, the
// put-downs and the sequences that each end idle. The hold-off tests (tap,
// slide, scroll, pinch, cancel) live in the sibling
// `calendarGesture.test.ts`; the small helpers below are repeated from it so
// each file reads on its own. Run with `npm test`.

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
import { resolveDrop } from "./timelineDrag";

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

// ---- PR 4 (mission 70): the drag sequences, each ending idle ----

const held = (x = 100, y = 100): GestureEvent[] => [down(x, y, true), { type: "holdFired" }];
/** While holding or dragging the page must never slide or settle. */
const noPageMotion = (effects: GestureEffect[]) =>
  assert.ok(
    !types(effects).some((t) => t === "setOffset" || t === "settle" || t === "springBack"),
    `no page motion, got ${types(effects).join(", ")}`,
  );
/** A hold always ends in exactly one put-down: a drop or a cancel. */
const putDowns = (effects: GestureEffect[]) =>
  effects.filter((e) => e.type === "dragDrop" || e.type === "dragCancel").map((e) => e.type);

test("HOLD_MS is 400 (decision 17) and the hold slop is the one 8px rule", () => {
  assert.equal(HOLD_MS, 400);
  assert.equal(HOLD_SLOP_PX, DIRECTION_LOCK_PX);
  assert.equal(HOLD_SLOP_PX, 8);
});

test("sequence: hold, move, lift: lifts, follows, drops once, swallows the click, ends idle", () => {
  const r = run([...held(), move(130, 160, 500), move(140, 220, 520), up(140, 220, 540), { type: "click" }], ON);
  assert.equal(r.state.kind, "idle");
  assert.deepEqual(types(r.effects), [
    "startHoldTimer",
    "capture",
    "armSwallow",
    "holdStarted",
    "dragMove",
    "dragMove",
    "dragDrop",
    "releaseCapture",
    "swallowClick",
  ]);
  assert.deepEqual(r.effects.find((e) => e.type === "dragDrop"), { type: "dragDrop", x: 140, y: 220 });
  noPageMotion(r.effects);
});

test("sequence: hold then a second finger: puts the block down, hands to pinch, ends idle", () => {
  const r = run(
    [...held(), down(200, 100, false, 500, 2, false), move(250, 100, 510, 2), up(0, 0, 600, 1), up(0, 0, 601, 2)],
    ON,
  );
  assert.equal(r.state.kind, "idle");
  assert.deepEqual(putDowns(r.effects), ["dragCancel"]);
  const t = types(r.effects);
  assert.ok(t.indexOf("dragCancel") < t.indexOf("handToPinch"));
  assert.ok(t.includes("releaseCapture"));
  noPageMotion(r.effects);
});

test("sequence: dragging then a second finger: cancels the drag (no drop), hands to pinch, ends idle", () => {
  const r = run(
    [...held(), move(140, 160, 500), down(300, 100, false, 510, 2, false), up(0, 0, 600, 1), up(0, 0, 601, 2)],
    ON,
  );
  assert.equal(r.state.kind, "idle");
  assert.deepEqual(putDowns(r.effects), ["dragCancel"]);
  assert.ok(types(r.effects).includes("handToPinch"));
  noPageMotion(r.effects);
});

test("sequence: hold then cancel: puts the block down, ends idle", () => {
  const r = run([...held(), cancel()], ON);
  assert.equal(r.state.kind, "idle");
  assert.deepEqual(types(r.effects).slice(-2), ["dragCancel", "releaseCapture"]);
  assert.deepEqual(putDowns(r.effects), ["dragCancel"]);
  noPageMotion(r.effects);
});

test("sequence: dragging then cancel: dragCancel, never a drop, ends idle", () => {
  const r = run([...held(), move(150, 180, 500), cancel()], ON);
  assert.equal(r.state.kind, "idle");
  assert.deepEqual(putDowns(r.effects), ["dragCancel"]);
  noPageMotion(r.effects);
});

test("sequence: hold then lift without moving: dragCancel once, no drop, the click is swallowed, ends idle", () => {
  // A wobble under 8px while held is still "not moving".
  const r = run([...held(), move(107, 93, 450), up(107, 93, 600), { type: "click" }], ON);
  assert.equal(r.state.kind, "idle");
  assert.deepEqual(types(r.effects), [
    "startHoldTimer",
    "capture",
    "armSwallow",
    "holdStarted",
    "dragCancel",
    "releaseCapture",
    "swallowClick",
  ]);
});

test("sequence: a drop outside the grid: the machine still drops once and ends idle; resolveDrop says no move", () => {
  // The grid's columns start at (60, 40) on screen, 7 columns of 100px,
  // 600px of visible hours. The finger is dragged up onto the header.
  const r = run([...held(200, 300), move(220, 200, 500), move(230, 10, 520), up(230, 10, 540)], ON);
  assert.equal(r.state.kind, "idle");
  const drop = r.effects.find((e) => e.type === "dragDrop");
  assert.ok(drop && drop.type === "dragDrop");
  assert.deepEqual(putDowns(r.effects), ["dragDrop"]);
  noPageMotion(r.effects);
  const columnDays = [0, 1, 2, 3, 4, 5, 6].map((i) => new Date(2026, 8, 6 + i));
  const target = resolveDrop({
    fingerX: drop.x - 60,
    fingerY: drop.y - 40,
    grabOffsetY: 20,
    scrollTop: 900,
    visibleHeightPx: 600,
    pxPerMinute: 2,
    columnCount: 7,
    columnWidthPx: 100,
    columnDays,
    originalStart: new Date(2026, 8, 7, 9, 0),
    durationMinutes: 60,
  });
  assert.equal(target, null, "outside the grid: nothing to save, the caller puts the block back");
});

test("sequence: exactly 8px before the hold fires is a scroll or a slide, never a hold, and ends idle", () => {
  // Straight down exactly 8px: a scroll. The late timer then does nothing.
  const scroll = run([down(100, 100, true), move(100, 100 + DIRECTION_LOCK_PX, 300), { type: "holdFired" }, up(100, 108, 500)], ON);
  assert.equal(scroll.state.kind, "idle");
  assert.deepEqual(types(scroll.effects), ["startHoldTimer", "clearHoldTimer"]);

  // Sideways exactly 8px: a slide, settled on lift. Still never a hold.
  const slide = run([down(100, 100, true), move(100 + DIRECTION_LOCK_PX, 100, 300), { type: "holdFired" }, up(108, 100, 500)], ON);
  assert.equal(slide.state.kind, "idle");
  const t = types(slide.effects);
  assert.ok(t.includes("settle"));
  assert.ok(!t.includes("holdStarted") && !t.includes("dragMove") && putDowns(slide.effects).length === 0);

  // 7px stays undecided, so the timer fires a hold.
  const still = run([down(100, 100, true), move(107, 100, 300), { type: "holdFired" }], ON);
  assert.equal(still.state.kind, "holding");
});

test("sequence: once held, exactly 8px from the press point starts the drag; 7px does not", () => {
  assert.equal(run([...held(), move(107, 100, 500)], ON).state.kind, "holding");
  assert.equal(run([...held(), move(100, 100 + HOLD_SLOP_PX, 500)], ON).state.kind, "dragging");
});

test("sequence: a tap after a drag still opens (its click is not swallowed) and ends idle", () => {
  const drag = [...held(), move(140, 200, 500), up(140, 200, 600)];
  // With the drag's own click arriving (swallowed), then a fresh tap.
  const r = run([...drag, { type: "click" }, down(300, 300, true, 2000, 4), up(300, 300, 2050, 4), { type: "click" }], ON);
  assert.equal(r.state.kind, "idle");
  assert.equal(r.effects.filter((e) => e.type === "swallowClick").length, 1, "only the drag's click");
  assert.deepEqual(types(r.effects).slice(-2), ["startHoldTimer", "clearHoldTimer"], "the tap's click passes");
  // And when touch sends no click after the drag, the tap's click still passes.
  const noClick = run([...drag, down(300, 300, true, 2000, 4), up(300, 300, 2050, 4), { type: "click" }], ON);
  assert.equal(noClick.state.kind, "idle");
  assert.ok(!types(noClick.effects).includes("swallowClick"));
});

test("sequence: a fresh primary down while held or dragging (a lost up) puts the block down first", () => {
  for (const before of [held(), [...held(), move(150, 150, 500)]]) {
    const r = run([...before, down(50, 50, false, 900, 3), up(50, 50, 950, 3)], ON);
    assert.equal(r.state.kind, "idle");
    assert.deepEqual(putDowns(r.effects), ["dragCancel"]);
    noPageMotion(r.effects);
  }
});

test("sequence: every way out of a hold ends idle with exactly one put-down after holdStarted", () => {
  const exits: Record<string, GestureEvent[]> = {
    "lift still": [up(100, 100, 600)],
    "drag and lift": [move(150, 150, 500), up(150, 150, 600)],
    "cancel while held": [cancel()],
    "cancel while dragging": [move(150, 150, 500), cancel()],
    "second finger while held": [down(200, 100, false, 500, 2, false), up(0, 0, 600, 1), up(0, 0, 601, 2)],
    "second finger while dragging": [move(150, 150, 500), down(200, 100, false, 510, 2, false), up(0, 0, 600, 2), up(0, 0, 601, 1)],
    "fresh primary down": [down(10, 10, false, 900, 5), up(10, 10, 950, 5)],
  };
  for (const [name, tail] of Object.entries(exits)) {
    const r = run([...held(), ...tail], ON);
    assert.equal(r.state.kind, "idle", name);
    const t = types(r.effects);
    assert.equal(t.filter((x) => x === "holdStarted").length, 1, name);
    assert.equal(putDowns(r.effects).length, 1, `${name}: exactly one put-down`);
    assert.ok(t.indexOf("holdStarted") < t.indexOf(putDowns(r.effects)[0]), name);
    assert.ok(!t.includes("setOffset") && !t.includes("settle"), `${name}: no page motion`);
  }
});

test("hold on: a holdFired after the timer was cleared (the press already scrolled) does nothing", () => {
  const r = run([down(100, 100, true), move(100, 140, 100), up(100, 140, 200), { type: "holdFired" }], ON);
  assert.equal(r.state.kind, "idle");
  assert.ok(!types(r.effects).includes("holdStarted"));
});
