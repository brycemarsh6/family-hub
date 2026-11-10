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
  nextActivePointers,
  pointerDownAction,
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
// nextActivePointers / pointerDownAction — mission-64 (pinch to zoom). A
// pinch must never turn the page, so a second finger's pointerdown makes the
// gesture yield instead of restarting it.

test("pointerDownAction: one finger down starts a gesture", () => {
  assert.equal(pointerDownAction([1]), "start");
});

test("pointerDownAction: a second finger down yields", () => {
  assert.equal(pointerDownAction([1, 2]), "yield");
  assert.equal(pointerDownAction([1, 2, 3]), "yield");
});

test("nextActivePointers: a second finger is added, a primary one resets", () => {
  assert.deepEqual(nextActivePointers([], "down", 1, true), [1]);
  assert.deepEqual(nextActivePointers([1], "down", 2, false), [1, 2]);
  // A fresh first finger after a lost pointerup: the stale ids are dropped.
  assert.deepEqual(nextActivePointers([1, 2], "down", 7, true), [7]);
});

test("nextActivePointers: lifting removes only that finger", () => {
  assert.deepEqual(nextActivePointers([1, 2], "up", 1), [2]);
  assert.deepEqual(nextActivePointers([2], "up", 2), []);
  assert.deepEqual(nextActivePointers([2], "up", 9), [2]); // unknown id: no change
});

test("a pinch, both fingers lift, then a fresh first finger: the gesture starts again", () => {
  let ids = nextActivePointers([], "down", 1, true);
  assert.equal(pointerDownAction(ids), "start");
  ids = nextActivePointers(ids, "down", 2, false);
  assert.equal(pointerDownAction(ids), "yield");
  ids = nextActivePointers(ids, "up", 1);
  ids = nextActivePointers(ids, "up", 2);
  assert.deepEqual(ids, []);
  ids = nextActivePointers(ids, "down", 3, true);
  assert.equal(pointerDownAction(ids), "start");
});
