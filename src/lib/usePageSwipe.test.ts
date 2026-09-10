// Unit tests for usePageSwipe's pure decision functions — mission-19 (CV6),
// contract C4. The hook itself needs a renderer (it calls `useRef`), and
// this project's toolchain has no jsdom/browser test runner (plain
// `node:test` only) — so nothing that requires mounting a component or
// dispatching a real PointerEvent sequence can be exercised here. But the
// two decisions that actually resolve a gesture (which way the direction
// lock goes; whether a release crossed the page-turn threshold) are pure
// and need no DOM at all. Same split useCalendarNavigation.test.ts already
// established for consumePushedSearch/jumpToDayTargets.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextGestureMode,
  resolveSwipeDirection,
  nextSwallowNextClick,
  nextPointerDownDecision,
  DIRECTION_LOCK_PX,
} from "./usePageSwipe";

test("nextGestureMode: stays undecided while BOTH axes are still under the lock distance", () => {
  assert.equal(nextGestureMode("undecided", 3, 2), "undecided");
  assert.equal(
    nextGestureMode("undecided", DIRECTION_LOCK_PX - 1, DIRECTION_LOCK_PX - 1),
    "undecided",
  );
});

test("nextGestureMode: locks to swiping once horizontal travel wins", () => {
  assert.equal(nextGestureMode("undecided", DIRECTION_LOCK_PX, 0), "swiping");
  assert.equal(nextGestureMode("undecided", 20, 5), "swiping");
});

test("nextGestureMode: locks to scrolling once vertical travel wins", () => {
  assert.equal(nextGestureMode("undecided", 0, DIRECTION_LOCK_PX), "scrolling");
  assert.equal(nextGestureMode("undecided", 5, 20), "scrolling");
});

test("nextGestureMode: an exact tie (|dx| === |dy|) resolves to swiping, matching SwipeActions.tsx's own `>` comparison for which axis 'won'", () => {
  assert.equal(nextGestureMode("undecided", 10, 10), "swiping");
});

test("nextGestureMode: a mode that already decided is left alone, not re-evaluated", () => {
  assert.equal(nextGestureMode("swiping", 0, 100), "swiping");
  assert.equal(nextGestureMode("scrolling", 100, 0), "scrolling");
  assert.equal(nextGestureMode("idle", 100, 0), "idle");
});

test("resolveSwipeDirection: below the threshold in either direction pages nothing", () => {
  assert.equal(resolveSwipeDirection(30, 60), null);
  assert.equal(resolveSwipeDirection(-30, 60), null);
  assert.equal(resolveSwipeDirection(0, 60), null);
});

test("resolveSwipeDirection: a leftward drag past the threshold resolves left", () => {
  assert.equal(resolveSwipeDirection(-60, 60), "left");
  assert.equal(resolveSwipeDirection(-200, 60), "left");
});

test("resolveSwipeDirection: a rightward drag past the threshold resolves right", () => {
  assert.equal(resolveSwipeDirection(60, 60), "right");
  assert.equal(resolveSwipeDirection(200, 60), "right");
});


// ---------------------------------------------------------------------------
// nextSwallowNextClick — mission-19/F1 (Vision blocker, gate pass 1). Vision
// measured this through real Chrome Input.dispatchTouchEvent against the
// SHIPPED hook, positive control first: a touch swipe left over 60px
// produces NO compat click at all (Chrome), so the flag it sets on locking
// into "swiping" survived into the NEXT gesture with nothing to clear it —
// eating that gesture's own real tap, even one that never crossed the page
// threshold. See nextSwallowNextClick's own comment in usePageSwipe.ts for
// the fuller reasoning.

test("nextSwallowNextClick: pointerdown clears a swallow flag left over from an EARLIER gesture's touch swipe", () => {
  // This is the bug itself: gesture 1 locks into swiping (arms the flag),
  // releases with no compat click to clear it, then gesture 2 starts.
  // Gesture 2's own pointerdown must clear what gesture 1 left behind.
  assert.equal(nextSwallowNextClick(true, "pointerdown"), false);
});

test("nextSwallowNextClick: pointerdown is a no-op when nothing needed clearing", () => {
  assert.equal(nextSwallowNextClick(false, "pointerdown"), false);
});

test("nextSwallowNextClick: locking into a swipe arms the swallow regardless of its prior value", () => {
  assert.equal(nextSwallowNextClick(false, "lockToSwiping"), true);
  assert.equal(nextSwallowNextClick(true, "lockToSwiping"), true);
});

// ---------------------------------------------------------------------------
// nextPointerDownDecision — mission-20 (CD1)/C1, the precondition Vision
// named at mission-19 pass 2. `nextSwallowNextClick` itself is UNCHANGED by
// this fix — its contract ("pointerdown" always returns false) already
// holds and a test that only calls it directly cannot go red for this bug.
// What changes is whether `handlePointerDown` ever REACHES that call on a
// pointerdown it's about to reject — before this fix, the two early-return
// guards (a non-primary mouse button; `isGestureClaimed()`) sat BEFORE the
// clear, so a rejected pointerdown skipped it entirely. These tests call
// `nextPointerDownDecision` — the exact function `handlePointerDown` calls,
// not a parallel model of it — so they exercise the real ordering, not a
// restatement of `nextSwallowNextClick`'s own already-true contract.

test("nextPointerDownDecision: clears a stale swallow flag even on a pointerdown a long-press has ALREADY claimed", () => {
  // This is the resurrection Vision named: gesture 1 (a touch swipe) arms
  // the flag and releases with no compat click to clear it; gesture 2 is a
  // long-press that claims the pointer BEFORE this decision is reached.
  // The clear must still run, even though shouldStartGesture is false.
  const decision = nextPointerDownDecision(
    { pointerType: "touch", button: 0 },
    /* isGestureClaimed */ true,
    /* currentSwallowNextClick */ true,
  );
  assert.equal(decision.swallowNextClick, false);
  assert.equal(decision.shouldStartGesture, false);
});

test("nextPointerDownDecision: clears a stale swallow flag even on a non-primary mouse button", () => {
  // The other early return — same guard as SwipeActions.tsx:93 — is ahead
  // of the clear too, for the same reason: "a new gesture always clears
  // what the last one left" shouldn't have exceptions.
  const decision = nextPointerDownDecision(
    { pointerType: "mouse", button: 2 },
    /* isGestureClaimed */ false,
    /* currentSwallowNextClick */ true,
  );
  assert.equal(decision.swallowNextClick, false);
  assert.equal(decision.shouldStartGesture, false);
});

test("nextPointerDownDecision: an ordinary pointerdown clears the flag AND starts the gesture", () => {
  const decision = nextPointerDownDecision(
    { pointerType: "touch", button: 0 },
    /* isGestureClaimed */ false,
    /* currentSwallowNextClick */ true,
  );
  assert.equal(decision.swallowNextClick, false);
  assert.equal(decision.shouldStartGesture, true);
});

test("nextPointerDownDecision: no-op clear when nothing needed clearing, gesture still starts", () => {
  const decision = nextPointerDownDecision(
    { pointerType: "touch", button: 0 },
    /* isGestureClaimed */ false,
    /* currentSwallowNextClick */ false,
  );
  assert.equal(decision.swallowNextClick, false);
  assert.equal(decision.shouldStartGesture, true);
});
