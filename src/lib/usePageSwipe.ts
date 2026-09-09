"use client";

import { useRef } from "react";

// The calendar's swipe-to-page gesture — mission-19 (CV6), contract C4.
// Timeline/Month/Year page by exactly what the header's Prev/Next arrows
// already do (`step(-1)`/`step(1)`, CalendarViews.tsx); this hook is what a
// horizontal drag on one of those three views turns into that same call.
//
// THIS IS A SIBLING OF SwipeActions.tsx's GESTURE MACHINE, NOT A SHARED
// IMPORT FROM IT — a deliberate call worth reading before touching either
// file:
//
//   - The two gestures commit to a swipe for different reasons and release
//     into different math. SwipeActions decides "reveal or hide a fixed
//     strip of buttons" (release compares the drag to `openWidth / 2`,
//     which depends on how many actions the row has); this hook decides
//     "which direction did the page turn" (release compares the drag to
//     ONE fixed distance, `SWIPE_PAGE_THRESHOLD_PX`, below). SwipeActions
//     also drives a live `translateX` while dragging so the row visibly
//     follows the finger; this hook has NO visual output at all — a swipe
//     here either turns the page on release or does nothing, so there is
//     nothing to animate mid-drag.
//   - SwipeActions is live today on Inventory rows, Shopping rows, and
//     cookbook swipe-to-unfile (RecipeList.tsx) — the first two used daily
//     by Bryce's wife. This project has twice recorded that synthetic
//     PointerEvents cannot drive this exact gesture to a settled state in
//     this environment's automated tooling, which means a refactor
//     entangling the two components' runtime state could not be verified
//     here beyond reading the code. Recreating the proven MACHINE (the
//     direction lock, the guarded pointer capture, the click swallow — see
//     the checklist below) gets the reuse this contract asks for without
//     that risk. `SwipeActions.tsx` is UNCHANGED by this contract —
//     confirmed by `git diff` showing zero lines touched (see the C4
//     report for the reasoning recorded at dispatch time).
//
// PRESERVED FROM SwipeActions.tsx, BY NAME (see that file's own header
// comment for the fuller rationale behind each):
//   - DIRECTION_LOCK_PX = 8 (SwipeActions.tsx:44) — the undecided zone a
//     gesture must clear before it's read as a swipe at all.
//   - The four-state GestureMode: idle / undecided / swiping / scrolling
//     (SwipeActions.tsx:46).
//   - A TRY/CAUGHT setPointerCapture (SwipeActions.tsx:118-124) — it throws
//     when the pointer isn't current, and an unguarded call once abandoned
//     a gesture mid-drag, leaving it stuck with no way to settle.
//   - touch-pan-y, so vertical scrolling stays the browser's job. This hook
//     doesn't own a style/className of its own — the caller applies the
//     class itself, exactly like SwipeActions does at its own root (:201);
//     see `usePageSwipe`'s own comment below for why keeping this hook's
//     surface to handlers-only matters here specifically.
//   - Swallowing the next click in the capture phase (SwipeActions.tsx:
//     145-152) — a swipe that ends over a Month day cell / Year month tile
//     / Timeline event block must not ALSO fire that element's own tap.
//
// THE RELEASE DECISION READS A REF, NEVER REACT STATE — same reasoning as
// SwipeActions.tsx's own `offsetRef` (:80-86): several pointermove events
// can land in one React task, so a value read from state at release can be
// stale and mis-resolve a swipe that clearly crossed the threshold.
//
// THE CD1 SEAM (long-press drag to reschedule — confirmed non-existent
// anywhere in src/ at this contract's dispatch-time preflight, 2026-09-08):
// `isGestureClaimed`, consulted before a gesture is allowed to LOCK into a
// swipe and again on every subsequent move, so a future long-press that
// starts claiming the pointer — even mid-drag — always wins. Defaults to
// "never claimed", so every current caller (which has no long-press) is
// completely unaffected by this option's mere existence.

/** Same value, same reasoning as SwipeActions.tsx:44. */
export const DIRECTION_LOCK_PX = 8;

/** Same shape as SwipeActions.tsx:46. */
export type PageSwipeGestureMode = "idle" | "undecided" | "swiping" | "scrolling";

/**
 * Given the gesture's current mode and its travel so far, decides whether
 * it's time to lock into a direction — and if so, which one. Pure and
 * exported so the direction-lock rule has real automated coverage: this
 * project's toolchain has no jsdom/browser test runner (plain `node:test`
 * only), so nothing that requires mounting a component or dispatching a
 * real PointerEvent sequence can be unit-tested here — but the DECISION
 * this makes needs no DOM at all. See usePageSwipe.test.ts.
 *
 * Mirrors SwipeActions.tsx's own inline logic (:105-115) exactly: while
 * `mode` isn't "undecided" it's already decided (or the caller has no
 * business asking again), and once both axes clear the lock distance,
 * whichever moved further wins.
 */
export function nextGestureMode(
  mode: PageSwipeGestureMode,
  dx: number,
  dy: number,
): PageSwipeGestureMode {
  if (mode !== "undecided") return mode;
  if (Math.abs(dx) < DIRECTION_LOCK_PX && Math.abs(dy) < DIRECTION_LOCK_PX) {
    return "undecided"; // too early to tell
  }
  return Math.abs(dy) > Math.abs(dx) ? "scrolling" : "swiping";
}

/** Which way a released swipe should page, if any — `"left"` means the
 * finger moved left (the iOS/Google-Calendar "reveal what's next"
 * direction), `"right"` means it moved right ("go back"). `null` means the
 * drag never crossed `thresholdPx` in either direction, so nothing pages. */
export type PageSwipeDirection = "left" | "right" | null;

/**
 * Pure and exported for the same reason `nextGestureMode` is — see its own
 * comment. `dx` is the gesture's TOTAL horizontal travel since it locked
 * into "swiping" (read from a ref at release, never React state — see this
 * file's header).
 */
export function resolveSwipeDirection(dx: number, thresholdPx: number): PageSwipeDirection {
  if (dx <= -thresholdPx) return "left";
  if (dx >= thresholdPx) return "right";
  return null;
}

/** The two things that change the click-swallow flag — see
 * `nextSwallowNextClick` immediately below. */
export type SwallowEvent = "pointerdown" | "lockToSwiping";

/**
 * The click-swallow flag's next value given what just happened —
 * mission-19/F1 (Vision blocker, gate pass 1, measured via real Chrome
 * Input.dispatchTouchEvent against the shipped hook). Pure and exported
 * for the same reason nextGestureMode/resolveSwipeDirection are: this
 * project's toolchain has no DOM, so this decision has no other way to
 * get real test coverage. The hook below is a thin ref wrapper around
 * this — see its two call sites.
 *
 * THE BUG: on TOUCH, a drag past Chrome's tap slop produces NO
 * compatibility click event, so a swipe that locked in and then released
 * left swallowNextClick TRUE with nothing left to clear it. The NEXT
 * gesture's own real click — a plain tap, or even a drag that never
 * reached the page threshold — then got eaten by a flag an entirely
 * earlier gesture set.
 *
 * THE FIX: "pointerdown" — the start of a NEW gesture — always clears
 * whatever the previous gesture left behind. Safe because pointerdown
 * always precedes pointermove within the SAME gesture, so this can never
 * clear a flag the CURRENT gesture itself is about to set. Verified this
 * doesn't defeat the swallow's real job either: a mouse drag starting on
 * a day cell still suppresses its own click, identically before and after.
 */
export function nextSwallowNextClick(current: boolean, event: SwallowEvent): boolean {
  if (event === "pointerdown") return false;
  return true; // "lockToSwiping" always arms it
}

/** Past this much horizontal travel, a released swipe pages. Deliberately
 * a plain constant rather than something derived from screen width or
 * SwipeActions' own `openWidth` math: this gesture has no live visual
 * feedback (see this file's header), so there's nothing on screen to
 * compare the drag against — a fixed distance tuned for "a confident
 * swipe, not an accidental brush" is all there is to tune. */
const SWIPE_PAGE_THRESHOLD_PX = 60;

export type UsePageSwipeOptions = {
  /** Called once on release if the gesture locked into a swipe AND the
   * finger's net travel crossed the threshold moving left — the same call
   * the header's Next arrow makes (`step(1)`). */
  onSwipeLeft: () => void;
  /** The mirror of `onSwipeLeft`, for a rightward swipe — the same call
   * the header's Prev arrow makes (`step(-1)`). */
  onSwipeRight: () => void;
  /**
   * The CD1 seam — see this file's header. Consulted at the start of every
   * gesture and on every move; a `true` answer means a long-press (or
   * whatever future gesture this becomes) already owns this pointer, so
   * this hook yields without ever calling `onSwipeLeft`/`onSwipeRight`.
   * Defaults to "never claimed" — exactly today's behaviour, since CD1
   * doesn't exist yet.
   */
  isGestureClaimed?: () => boolean;
};

export type PageSwipeHandlers = {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
  onPointerCancel: (event: React.PointerEvent) => void;
  onClickCapture: (event: React.MouseEvent) => void;
};

/**
 * Returns pointer handlers to spread onto whichever element should page on
 * a horizontal swipe. Does NOT return a `className`/`style` — the caller
 * applies `touch-pan-y` itself (the literal Tailwind utility class
 * SwipeActions.tsx:201 already uses, so it's already scanned into this
 * project's compiled CSS; nothing new to add there), the same way it
 * already owns every other class on that element. Keeping this hook's
 * surface to handlers-only is what lets CalendarViews.tsx wrap ONLY the
 * paging content (MonthGrid/TimelineGrid/YearView) and not, say, Month's
 * own MonthChips strip beside it — MonthChips scrolls itself HORIZONTALLY
 * (its own `overflow-x-auto`), so it must sit outside whatever element
 * these handlers are attached to, or dragging across it would fight its
 * own scroll for the same gesture.
 */
export function usePageSwipe({
  onSwipeLeft,
  onSwipeRight,
  isGestureClaimed,
}: UsePageSwipeOptions): PageSwipeHandlers {
  const mode = useRef<PageSwipeGestureMode>("idle");
  const start = useRef({ x: 0, y: 0 });
  // Ref, not state — see this file's header.
  const offsetRef = useRef(0);
  // Set the moment a gesture locks into "swiping"; read by the capture-
  // phase click handler to decide whether to swallow the click that
  // follows. Same shape as SwipeActions.tsx:89.
  const swallowNextClick = useRef(false);

  function handlePointerDown(event: React.PointerEvent) {
    // Mouse right/middle click has no business starting a page-swipe —
    // same guard as SwipeActions.tsx:93.
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (isGestureClaimed?.()) return; // CD1 seam — never even enters "undecided"
    // mission-19/F1: a NEW gesture starting always clears whatever the
    // PREVIOUS gesture left behind — see nextSwallowNextClick's own
    // comment for why a touch swipe can leave this flag stuck true with
    // no compat click ever arriving to clear it.
    swallowNextClick.current = nextSwallowNextClick(swallowNextClick.current, "pointerdown");
    mode.current = "undecided";
    start.current = { x: event.clientX, y: event.clientY };
    offsetRef.current = 0;
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (mode.current === "idle" || mode.current === "scrolling") return;

    if (isGestureClaimed?.()) {
      // CD1 seam: a long-press has claimed this pointer, whether it just
      // started claiming it now or claimed it before this move — yield
      // for the rest of the gesture exactly like losing the direction
      // lock to a vertical drag does below. No page turn fires; the
      // claiming gesture owns the pointer from here on.
      mode.current = "scrolling";
      return;
    }

    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;

    if (mode.current === "undecided") {
      const decided = nextGestureMode("undecided", dx, dy);
      if (decided === "undecided") return; // too early to tell
      if (decided === "scrolling") {
        mode.current = "scrolling";
        return;
      }
      mode.current = "swiping";
      swallowNextClick.current = nextSwallowNextClick(swallowNextClick.current, "lockToSwiping");
      // Same guard as SwipeActions.tsx:118-124 — setPointerCapture throws
      // when the pointer isn't current, and an unguarded call here would
      // abandon THIS gesture the same way an unguarded call there once
      // abandoned that one.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Not capturable — carry on uncaptured.
      }
    }

    offsetRef.current = dx;
  }

  function endGesture() {
    if (mode.current === "swiping") {
      const direction = resolveSwipeDirection(offsetRef.current, SWIPE_PAGE_THRESHOLD_PX);
      if (direction === "left") onSwipeLeft();
      else if (direction === "right") onSwipeRight();
    }
    mode.current = "idle";
    offsetRef.current = 0;
  }

  // Same shape as SwipeActions.tsx:147-152 — a click lands after
  // pointerup; if the gesture just committed to a swipe, stop that click
  // before any child (a day cell, a month tile, an event block) sees it.
  function handleClickCapture(event: React.MouseEvent) {
    if (!swallowNextClick.current) return;
    swallowNextClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: endGesture,
    onPointerCancel: endGesture,
    onClickCapture: handleClickCapture,
  };
}
