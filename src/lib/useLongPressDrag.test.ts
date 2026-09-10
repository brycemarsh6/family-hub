// Unit tests for useLongPressDrag's pure decision functions — mission-20
// (CD1), contract C4. The hook itself needs a renderer (it calls `useRef`/
// `useState`), and this project's toolchain has no jsdom/browser test
// runner (plain `node:test` only) — so nothing that mounts the hook or
// dispatches a real PointerEvent sequence can be exercised here. But the
// three decisions that actually resolve the gesture (whether a phase
// transition happens; whether the click-swallow flag should be armed or
// cleared; what a pointerdown should do given the current phase) are pure
// and need no DOM at all. Same split usePageSwipe.test.ts already
// established for nextGestureMode/resolveSwipeDirection/
// nextSwallowNextClick/nextPointerDownDecision — this file mirrors that
// suite's shape deliberately.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasExceededLongPressSlop,
  nextLongPressPhase,
  nextLongPressSwallowNextClick,
  nextLongPressPointerDownDecision,
  shouldReleaseCaptureOnPhaseChange,
  LONG_PRESS_SLOP_PX,
} from "./useLongPressDrag";
import type { LongPressDragPhase, LongPressDragEvent } from "./useLongPressDrag";

// ---------------------------------------------------------------------------
// hasExceededLongPressSlop

test("hasExceededLongPressSlop: false while both axes are within the slop", () => {
  assert.equal(hasExceededLongPressSlop(0, 0), false);
  assert.equal(hasExceededLongPressSlop(LONG_PRESS_SLOP_PX, 0), false);
  assert.equal(hasExceededLongPressSlop(0, LONG_PRESS_SLOP_PX), false);
  assert.equal(hasExceededLongPressSlop(-LONG_PRESS_SLOP_PX, 0), false);
});

test("hasExceededLongPressSlop: true the instant EITHER axis exceeds the slop", () => {
  assert.equal(hasExceededLongPressSlop(LONG_PRESS_SLOP_PX + 1, 0), true);
  assert.equal(hasExceededLongPressSlop(0, LONG_PRESS_SLOP_PX + 1), true);
  assert.equal(hasExceededLongPressSlop(-(LONG_PRESS_SLOP_PX + 1), 0), true);
  assert.equal(hasExceededLongPressSlop(0, -(LONG_PRESS_SLOP_PX + 1)), true);
});

test("hasExceededLongPressSlop: a custom slop overrides the default constant", () => {
  assert.equal(hasExceededLongPressSlop(5, 0, 4), true);
  assert.equal(hasExceededLongPressSlop(5, 0, 6), false);
});

// ---------------------------------------------------------------------------
// nextLongPressPhase — the whole phase machine.

test("nextLongPressPhase: idle + pointerDown starts pending", () => {
  assert.equal(nextLongPressPhase("idle", { type: "pointerDown" }), "pending");
});

test("nextLongPressPhase: idle ignores anything other than pointerDown", () => {
  assert.equal(nextLongPressPhase("idle", { type: "move", dx: 0, dy: 0 }), "idle");
  assert.equal(nextLongPressPhase("idle", { type: "holdElapsed" }), "idle");
  assert.equal(nextLongPressPhase("idle", { type: "release" }), "idle");
  assert.equal(nextLongPressPhase("idle", { type: "cancel" }), "idle");
});

test("nextLongPressPhase: pending stays pending while movement is under the slop", () => {
  assert.equal(nextLongPressPhase("pending", { type: "move", dx: 0, dy: 0 }), "pending");
  assert.equal(
    nextLongPressPhase("pending", { type: "move", dx: LONG_PRESS_SLOP_PX, dy: 0 }),
    "pending",
  );
});

test("nextLongPressPhase: pending is cancelled to idle the instant movement exceeds the slop, on either axis", () => {
  assert.equal(
    nextLongPressPhase("pending", { type: "move", dx: LONG_PRESS_SLOP_PX + 1, dy: 0 }),
    "idle",
  );
  assert.equal(
    nextLongPressPhase("pending", { type: "move", dx: 0, dy: LONG_PRESS_SLOP_PX + 1 }),
    "idle",
  );
});

test("nextLongPressPhase: pending + holdElapsed claims the drag", () => {
  assert.equal(nextLongPressPhase("pending", { type: "holdElapsed" }), "dragging");
});

test("nextLongPressPhase: pending + cancel yields to idle without ever claiming", () => {
  assert.equal(nextLongPressPhase("pending", { type: "cancel" }), "idle");
});

test("nextLongPressPhase: pending ignores a stray extra pointerDown", () => {
  assert.equal(nextLongPressPhase("pending", { type: "pointerDown" }), "pending");
});

test("nextLongPressPhase: dragging has no slop to exceed — any move stays dragging", () => {
  assert.equal(nextLongPressPhase("dragging", { type: "move", dx: 500, dy: 500 }), "dragging");
});

test("nextLongPressPhase: dragging ends on release or cancel", () => {
  assert.equal(nextLongPressPhase("dragging", { type: "release" }), "idle");
  assert.equal(nextLongPressPhase("dragging", { type: "cancel" }), "idle");
});

test("nextLongPressPhase: dragging ignores a stray pointerDown or a second holdElapsed", () => {
  assert.equal(nextLongPressPhase("dragging", { type: "pointerDown" }), "dragging");
  assert.equal(nextLongPressPhase("dragging", { type: "holdElapsed" }), "dragging");
});

// ---------------------------------------------------------------------------
// nextLongPressPhase — the FULL (phase × event) matrix, asserted
// exhaustively. mission-20/F1: this hook shipped with 20 tests and still
// hid a defect (pending + release fell through to "pending" instead of
// "idle" — an ordinary tap permanently disabled dragging) because no test
// exercised that one pair. Every phase had a test, every event type had a
// test — just never every combination of the two at once. Every dedicated
// test above stays (each documents WHY a transition is what it is); this
// table exists so a missing pair can't hide again — every cell below is
// asserted, including the ones that are genuine no-ops. `move` uses a
// representative under-slop delta (0, 0) here; the slop-crossing behavior
// itself already has its own dedicated tests above and isn't re-derived
// per phase in this table.
const LONG_PRESS_PHASES: LongPressDragPhase[] = ["idle", "pending", "dragging"];
const LONG_PRESS_EVENTS: LongPressDragEvent[] = [
  { type: "pointerDown" },
  { type: "move", dx: 0, dy: 0 },
  { type: "holdElapsed" },
  { type: "release" },
  { type: "cancel" },
];

const EXPECTED_LONG_PRESS_PHASE: Record<
  LongPressDragPhase,
  Record<LongPressDragEvent["type"], LongPressDragPhase>
> = {
  idle: {
    pointerDown: "pending",
    move: "idle", // ignored — no gesture in progress
    holdElapsed: "idle", // ignored — nothing pending to elapse
    release: "idle", // ignored — nothing to release
    cancel: "idle", // ignored — nothing to cancel
  },
  pending: {
    pointerDown: "pending", // a genuinely stray extra pointerDown — no-op
    move: "pending", // under the slop
    holdElapsed: "dragging",
    release: "idle", // mission-20/F1: the fix this contract exists for
    cancel: "idle",
  },
  dragging: {
    pointerDown: "dragging", // a stray extra pointerDown once already claimed — no-op
    move: "dragging", // no slop left to exceed once claimed
    holdElapsed: "dragging", // the timer only fires once in practice — no-op if it recurred
    release: "idle",
    cancel: "idle",
  },
};

test("nextLongPressPhase: the full (phase × event) matrix — every pair asserted, so a missing case cannot hide again", () => {
  for (const phase of LONG_PRESS_PHASES) {
    for (const event of LONG_PRESS_EVENTS) {
      const expected = EXPECTED_LONG_PRESS_PHASE[phase][event.type];
      assert.equal(
        nextLongPressPhase(phase, event),
        expected,
        `${phase} + ${event.type} should resolve to ${expected}, got a different phase`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// nextLongPressSwallowNextClick — same shape as usePageSwipe.ts's
// nextSwallowNextClick, with "lockToSwiping" replaced by "holdElapsed".

test("nextLongPressSwallowNextClick: pointerdown clears a swallow flag left over from an earlier gesture", () => {
  assert.equal(nextLongPressSwallowNextClick(true, "pointerdown"), false);
});

test("nextLongPressSwallowNextClick: pointerdown is a no-op when nothing needed clearing", () => {
  assert.equal(nextLongPressSwallowNextClick(false, "pointerdown"), false);
});

test("nextLongPressSwallowNextClick: holdElapsed arms the swallow regardless of its prior value", () => {
  assert.equal(nextLongPressSwallowNextClick(false, "holdElapsed"), true);
  assert.equal(nextLongPressSwallowNextClick(true, "holdElapsed"), true);
});

// ---------------------------------------------------------------------------
// nextLongPressPointerDownDecision — mission-20/C1's fix (usePageSwipe.ts's
// nextPointerDownDecision), applied here from the start. The scenario these
// tests exercise is the exact resurrection C1 fixed: a completed drag whose
// release, on touch, produces no compatibility click to clear the swallow
// flag it armed — so the flag survives into a LATER, unrelated gesture,
// whose own pointerdown must still clear it even though that pointerdown
// is itself about to be rejected (a second finger already mid-gesture, or
// a non-primary mouse button).

test("nextLongPressPointerDownDecision: clears a stale swallow flag even when a gesture is already mid-flight (currentPhase !== idle)", () => {
  const decision = nextLongPressPointerDownDecision(
    { pointerType: "touch", button: 0 },
    /* currentPhase */ "dragging",
    /* currentSwallowNextClick */ true,
  );
  assert.equal(decision.swallowNextClick, false);
  assert.equal(decision.shouldStartGesture, false);
});

test("nextLongPressPointerDownDecision: clears a stale swallow flag even on a non-primary mouse button", () => {
  const decision = nextLongPressPointerDownDecision(
    { pointerType: "mouse", button: 2 },
    /* currentPhase */ "idle",
    /* currentSwallowNextClick */ true,
  );
  assert.equal(decision.swallowNextClick, false);
  assert.equal(decision.shouldStartGesture, false);
});

test("nextLongPressPointerDownDecision: an ordinary pointerdown clears the flag AND starts the gesture", () => {
  const decision = nextLongPressPointerDownDecision(
    { pointerType: "touch", button: 0 },
    /* currentPhase */ "idle",
    /* currentSwallowNextClick */ true,
  );
  assert.equal(decision.swallowNextClick, false);
  assert.equal(decision.shouldStartGesture, true);
});

test("nextLongPressPointerDownDecision: no-op clear when nothing needed clearing, gesture still starts", () => {
  const decision = nextLongPressPointerDownDecision(
    { pointerType: "touch", button: 0 },
    /* currentPhase */ "idle",
    /* currentSwallowNextClick */ false,
  );
  assert.equal(decision.swallowNextClick, false);
  assert.equal(decision.shouldStartGesture, true);
});

test("nextLongPressPhase: pending + release resolves to idle — an ordinary tap (pointerDown then release before the hold elapses)", () => {
  assert.equal(nextLongPressPhase("pending", { type: "release" }), "idle");
});

// ---------------------------------------------------------------------------
// shouldReleaseCaptureOnPhaseChange — mission-20/F5. Vision measured that an
// aborted gesture (press, move past the slop, release outside the block)
// still opened the block's detail sheet: capture taken at pointerdown
// (mission-20/F3) retargets the compatibility `click` a later pointerup
// generates back onto the abandoned block, and nothing released it. Full
// (nextPhase × event) matrix asserted, same discipline mission-20/F1
// established for `nextLongPressPhase` itself — a state machine tested by
// rows and columns is not tested; every cell below is asserted.
//
// THE RULE THE FUNCTION ENCODES is deliberately general, not "only a
// `move` counts": release capture whenever the gesture just reached `idle`
// by something OTHER than the pointer itself going up or being cancelled
// (`release`/`cancel` already auto-release capture per spec the instant
// that happens, so an explicit release there is harmless but pointless).
// Today the ONLY event that can land on `idle` through `nextLongPressPhase`
// without being `release`/`cancel` is a slop-exceeding `move` — so
// `pointerDown`/`holdElapsed` reaching `idle` below are cells that cannot
// currently occur (the phase machine's own matrix, above, proves that),
// but the function is TOTAL and answers `true` for them too, on purpose:
// if a future event type is ever added that also ends a gesture without
// the pointer going up, the general rule already does the right thing for
// it with no edit needed here — narrowing this to "only `move`" would trade
// that safety margin for no real benefit, since the false-positive cost of
// releasing capture on a genuinely unreachable cell is zero.

const RELEASE_CAPTURE_PHASES: LongPressDragPhase[] = ["idle", "pending", "dragging"];
const RELEASE_CAPTURE_EVENTS: LongPressDragEvent[] = [
  { type: "pointerDown" },
  { type: "move", dx: 0, dy: 0 },
  { type: "holdElapsed" },
  { type: "release" },
  { type: "cancel" },
];

const EXPECTED_SHOULD_RELEASE_CAPTURE: Record<
  LongPressDragPhase,
  Record<LongPressDragEvent["type"], boolean>
> = {
  // nextPhase="idle": false ONLY for release/cancel — the pointer itself
  // going up or being cancelled already auto-releases capture per spec.
  // Every other event type is `true`, including the two (pointerDown,
  // holdElapsed) that can never actually reach "idle" through
  // `nextLongPressPhase` — see the general-rule comment above for why
  // that's the right answer anyway, not an oversight.
  idle: {
    pointerDown: true, // unreachable in practice — true is still correct
    move: true, // mission-20/F5's whole reason to exist
    holdElapsed: true, // unreachable in practice — true is still correct
    release: false, // pointerup already released capture — spec, not us
    cancel: false, // pointercancel already released capture — spec, not us
  },
  // nextPhase="pending" or "dragging": the gesture hasn't ended, so nothing
  // should ever release capture regardless of which event produced it.
  pending: {
    pointerDown: false,
    move: false,
    holdElapsed: false,
    release: false,
    cancel: false,
  },
  dragging: {
    pointerDown: false,
    move: false,
    holdElapsed: false,
    release: false,
    cancel: false,
  },
};

test("shouldReleaseCaptureOnPhaseChange: the full (nextPhase × event) matrix — every pair asserted, so a missing case cannot hide again", () => {
  for (const phase of RELEASE_CAPTURE_PHASES) {
    for (const event of RELEASE_CAPTURE_EVENTS) {
      const expected = EXPECTED_SHOULD_RELEASE_CAPTURE[phase][event.type];
      assert.equal(
        shouldReleaseCaptureOnPhaseChange(phase, event),
        expected,
        `nextPhase=${phase} + event=${event.type} should resolve to ${expected}, got a different answer`,
      );
    }
  }
});

test("shouldReleaseCaptureOnPhaseChange: the real call site's shape — pending + move exceeding the slop resolves nextPhase to idle, which must release capture", () => {
  const phase: LongPressDragPhase = "pending";
  const event: LongPressDragEvent = { type: "move", dx: LONG_PRESS_SLOP_PX + 1, dy: 0 };
  const nextPhase = nextLongPressPhase(phase, event);
  assert.equal(nextPhase, "idle");
  assert.equal(shouldReleaseCaptureOnPhaseChange(nextPhase, event), true);
});

test("shouldReleaseCaptureOnPhaseChange: the real call site's shape — pending + move UNDER the slop resolves nextPhase to pending, which must NOT release capture", () => {
  const phase: LongPressDragPhase = "pending";
  const event: LongPressDragEvent = { type: "move", dx: 0, dy: 0 };
  const nextPhase = nextLongPressPhase(phase, event);
  assert.equal(nextPhase, "pending");
  assert.equal(shouldReleaseCaptureOnPhaseChange(nextPhase, event), false);
});
