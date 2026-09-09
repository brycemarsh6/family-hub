"use client";

import { useRef, useState } from "react";

// mission-20 (CD1)/C4 — long-press-then-drag on a timed calendar block, so
// it can be rescheduled by dragging it to a new time on the hour timeline.
// This file is the GESTURE half only: it decides WHEN a touch becomes a
// drag and exposes that claim through CV6's existing seam
// (usePageSwipe.ts's `isGestureClaimed`). It knows nothing about pixels
// meaning minutes (that's `timelineDrag.ts`, C2 — already built, this file
// does not import it) and nothing about rendering a lift or calling
// `moveCalendarEvent` (that's C5's wiring, inside
// TimelineDayColumn.tsx/TimelineGrid.tsx/CalendarViews.tsx — none of which
// this file touches).
//
// THE SHAPE, FOR WHOEVER WIRES THIS UP (C5):
//
//   const longPress = useLongPressDrag<string>({
//     onDragStart: (eventId) => { /* hold elapsed, now dragging */ },
//     onDragMove: (eventId, dx, dy) => { /* live pixel offset */ },
//     onDragEnd: (eventId, dx, dy) => { /* only for a REAL drag */ },
//     onDragCancel: (eventId) => { /* browser took the pointer away */ },
//   });
//
//   // once per draggable block, inside whatever renders the list of
//   // timed blocks (a `<button>` per TimelineDayColumn.tsx:106-217):
//   <button {...longPress.getHandlers(event.id)}>...
//
//   // once, on the SAME element usePageSwipe's own handlers are already
//   // spread onto (CalendarViews.tsx:338-351's grid wrapper):
//   usePageSwipe({ ..., isGestureClaimed: longPress.isGestureClaimed });
//
// WHY THIS NEEDS NO preventDefault/touch-action OF ITS OWN: a plain
// vertical drag (scrolling) and a plain horizontal drag (CV6's
// page-swipe) both keep working with ZERO special-casing here, simply
// because this hook never calls preventDefault/stopPropagation on a
// pointerdown/pointermove and never captures the pointer until AFTER it
// has already committed to a drag. Before that moment ("pending"), every
// pointer event this hook sees also reaches the browser's native scroll
// handling and CV6's swipe hook (via normal DOM bubbling) completely
// untouched — so if the finger moves enough to start a real scroll or a
// real page-swipe before the hold elapses, that gesture simply wins,
// usually via a `pointercancel` landing on this hook, which is handled
// exactly like a deliberate release: nothing was ever claimed, so nothing
// needs undoing.
//
// FOUR HOUSE GESTURE LAWS THIS FOLLOWS — same reasoning as
// SwipeActions.tsx / usePageSwipe.ts; see those files' own headers for the
// fuller history behind each:
//   1. The release decision reads a REF (`offsetRef`), never React state
//      — state batching can leave several pointermove events landing in
//      one React task, so a value read from state at release can be
//      stale and mis-resolve where the drag actually ended.
//   2. `setPointerCapture` is try/caught — an unguarded call elsewhere in
//      this codebase once abandoned a gesture mid-drag, leaving it stuck
//      with no way to settle.
//   3. The click-swallow clear is the FIRST statement of the pointerdown
//      handler, ahead of every early return — mission-20/C1's fix to
//      usePageSwipe.ts, applied here from the start rather than
//      discovered again later by a gate. See
//      `nextLongPressPointerDownDecision`'s own comment below.
//   4. The 400ms/8px thresholds are named constants, not inline numbers.

/** Hold this long, without exceeding the slop below, to claim the pointer
 * as a drag rather than a tap, a scroll, or CV6's page-swipe. */
export const LONG_PRESS_HOLD_MS = 400;

/** Past this many pixels of travel, on EITHER axis, before the hold
 * elapses, the gesture is not a long press at all — it's handed back to
 * whatever the browser (scrolling) or CV6's page-swipe wants to do with
 * it. */
export const LONG_PRESS_SLOP_PX = 8;

/** `idle` — no gesture in progress. `pending` — the pointer is down, the
 * hold hasn't elapsed yet, and movement is still under the slop.
 * `dragging` — the hold elapsed while under the slop; this pointer is now
 * claimed as a drag. */
export type LongPressDragPhase = "idle" | "pending" | "dragging";

/** Pure input to `nextLongPressPhase` — deliberately NOT the raw
 * `PointerEvent`, so the phase machine has no DOM to reach for and can be
 * exercised by `node:test` with plain objects. */
export type LongPressDragEvent =
  | { type: "pointerDown" }
  | { type: "move"; dx: number; dy: number }
  | { type: "holdElapsed" }
  | { type: "release" }
  | { type: "cancel" };

/**
 * True once travel on EITHER axis exceeds `slopPx`. A long press has no
 * "winning axis" the way CV6's page-swipe or Inventory's row-swipe do
 * (each locks into whichever direction travelled further) — a long press
 * isn't trying to become a scroll or a swipe, it's trying to stay still,
 * so ANY direction exceeding the slop cancels it.
 */
export function hasExceededLongPressSlop(
  dx: number,
  dy: number,
  slopPx: number = LONG_PRESS_SLOP_PX,
): boolean {
  return Math.abs(dx) > slopPx || Math.abs(dy) > slopPx;
}

/**
 * The whole phase machine, pure and exported for the same reason
 * `nextGestureMode` is exported from usePageSwipe.ts — this project's
 * toolchain has no jsdom/browser test runner (plain `node:test` only), so
 * nothing that mounts a hook and dispatches real PointerEvents can be
 * exercised in a test here. But the DECISION this makes needs no DOM at
 * all. The hook below calls this directly rather than reimplementing it
 * inline, so a passing test here is a test of the real code path, not a
 * parallel model that could drift from it.
 */
export function nextLongPressPhase(
  phase: LongPressDragPhase,
  event: LongPressDragEvent,
): LongPressDragPhase {
  if (phase === "idle") {
    return event.type === "pointerDown" ? "pending" : "idle";
  }
  if (phase === "pending") {
    if (event.type === "move") {
      return hasExceededLongPressSlop(event.dx, event.dy) ? "idle" : "pending";
    }
    if (event.type === "holdElapsed") return "dragging";
    // `release` here is an ordinary tap: pointerdown, then release before
    // the hold elapsed — the single most common gesture on this screen (it
    // fires every time someone taps a block to open its detail sheet). It
    // must yield to idle exactly like `cancel` does, or the phase can never
    // return to idle and every long press after the first tap is silently
    // disabled for the rest of the page's life. Only a genuinely stray
    // extra `pointerDown` (a second finger touching down, or a duplicate
    // event) falls through below, and it is a true no-op: nothing about
    // this gesture's state changes.
    if (event.type === "release" || event.type === "cancel") return "idle";
    return "pending"; // a stray extra pointerDown while already pending — no-op
  }
  // dragging: once claimed, movement no longer has a "slop" to exceed —
  // that's the whole point of having claimed it. Only release/cancel end
  // it; anything else (a stray pointerDown, a holdElapsed that couldn't
  // recur in practice since the timer only fires once) is a no-op.
  if (event.type === "release" || event.type === "cancel") return "idle";
  return "dragging";
}

/** The two things that change this hook's OWN click-swallow flag — mirrors
 * usePageSwipe.ts's `SwallowEvent`, with `"lockToSwiping"` replaced by
 * `"holdElapsed"`: the moment THIS gesture commits to being a drag. */
export type LongPressSwallowEvent = "pointerdown" | "holdElapsed";

/**
 * Same shape and same reasoning as `nextSwallowNextClick` in
 * usePageSwipe.ts (mission-19/F1): a genuine drag's release is followed by
 * a `click` on the SAME block — pointer capture retargets compatibility
 * mouse events to the capturing element, spec-guaranteed — and that click
 * must not ALSO fire the block's own tap behaviour (opening the event
 * detail sheet). `"holdElapsed"` arms the flag; a fresh `"pointerdown"`
 * always clears whatever an earlier gesture left armed, which matters on
 * touch specifically: a drag that ends via touch can leave no
 * compatibility click at all to clear it (the exact bug mission-19/F1
 * found in usePageSwipe.ts), so the NEXT gesture's pointerdown is the only
 * remaining place that can.
 */
export function nextLongPressSwallowNextClick(
  current: boolean,
  event: LongPressSwallowEvent,
): boolean {
  if (event === "pointerdown") return false;
  return true; // "holdElapsed" always arms it
}

/** A minimal shape of the two `PointerEvent` fields the pointerdown
 * decision actually reads — narrowed so it can be unit-tested with a
 * plain object, no DOM. Same shape as usePageSwipe.ts's
 * `PointerDownEventLike`. */
export type LongPressPointerDownEventLike = {
  pointerType: string;
  button: number;
};

/**
 * The whole of the pointerdown handler's decision-making, pulled out pure
 * — same shape and same reasoning as usePageSwipe.ts's
 * `nextPointerDownDecision` (mission-20/C1). THE FIX THAT FUNCTION EXISTS
 * TO PROVE, applied here from the start rather than waiting for a gate to
 * resurrect the identical bug: the click-swallow clear must run for EVERY
 * pointerdown, including one this function is about to reject (a
 * non-primary mouse button, or a pointer that's already mid-gesture) —
 * otherwise a swallow flag an EARLIER gesture armed and never got a
 * compatibility click to clear (see `nextLongPressSwallowNextClick`'s own
 * comment) would still be sitting there, ready to eat a later, completely
 * unrelated tap.
 */
export function nextLongPressPointerDownDecision(
  event: LongPressPointerDownEventLike,
  currentPhase: LongPressDragPhase,
  currentSwallowNextClick: boolean,
): { swallowNextClick: boolean; shouldStartGesture: boolean } {
  // The clear is the FIRST thing that happens — before either guard below
  // gets a chance to return early and skip it.
  const swallowNextClick = nextLongPressSwallowNextClick(currentSwallowNextClick, "pointerdown");

  // Mouse right/middle click has no business starting a long press — same
  // guard as usePageSwipe.ts/SwipeActions.tsx.
  if (event.pointerType === "mouse" && event.button !== 0) {
    return { swallowNextClick, shouldStartGesture: false };
  }
  // Something is already pending or dragging on this hook instance (a
  // second finger touching down, or a stray extra pointerdown) — don't
  // stomp it.
  if (currentPhase !== "idle") {
    return { swallowNextClick, shouldStartGesture: false };
  }
  return { swallowNextClick, shouldStartGesture: true };
}

/** Handlers to spread onto ONE draggable block. */
export type LongPressDragHandlers = {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
  onPointerCancel: (event: React.PointerEvent) => void;
  onClickCapture: (event: React.MouseEvent) => void;
};

export type UseLongPressDragOptions<TPayload> = {
  /** Fires once the hold elapses without exceeding the slop — the
   * pointer is now claimed. `isGestureClaimed()` (below) is already true
   * by the time this runs. */
  onDragStart?: (payload: TPayload) => void;
  /** Fires on every pointermove once dragging, with the raw pixel delta
   * since pointerDOWN (never since the previous move) — a stable origin
   * is what `timelineDrag.ts`'s math wants; an accumulating one would
   * double-count every frame. */
  onDragMove?: (payload: TPayload, dx: number, dy: number) => void;
  /** Fires once on release, ONLY if the gesture had already become a
   * drag — a plain tap, or a press that never held long enough, never
   * calls this. */
  onDragEnd?: (payload: TPayload, dx: number, dy: number) => void;
  /** Fires if a CLAIMED drag is interrupted by a pointercancel (the
   * browser taking the pointer away) rather than a normal release. */
  onDragCancel?: (payload: TPayload) => void;
};

export type UseLongPressDragResult<TPayload> = {
  /** Bind to ONE draggable block — call this once per block (inside
   * whatever renders the list of timed blocks), passing whatever
   * identifies that block to the callbacks above (its event id, say). */
  getHandlers: (payload: TPayload) => LongPressDragHandlers;
  /**
   * Pass directly as `usePageSwipe`'s `isGestureClaimed` option — see
   * this file's header for the exact call shape a caller uses. True for
   * exactly the window between the hold elapsing and the gesture ending
   * (release or cancel); false the entire time it's merely "pending"
   * (held under 400ms, or already moved past the slop), which is what
   * lets an ordinary scroll or page-swipe still win during that window.
   */
  isGestureClaimed: () => boolean;
  /** React state (deliberately NOT the ref the decisions above read —
   * house law 1) for rendering the lift: which payload is currently
   * claimed, and its live pixel offset since pointerdown. `null`
   * whenever nothing is claimed as a drag. */
  activeDrag: { payload: TPayload; dx: number; dy: number } | null;
};

export function useLongPressDrag<TPayload>(
  options: UseLongPressDragOptions<TPayload> = {},
): UseLongPressDragResult<TPayload> {
  const { onDragStart, onDragMove, onDragEnd, onDragCancel } = options;

  const phase = useRef<LongPressDragPhase>("idle");
  const start = useRef({ x: 0, y: 0 });
  // Ref, not state — house law 1. Read at release/cancel so a
  // batched-stale state value can never mis-resolve where the drag
  // actually ended.
  const offsetRef = useRef({ dx: 0, dy: 0 });
  const swallowNextClick = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Captured at pointerdown so the setTimeout callback below — which has
  // no event object of its own — can still try to capture the pointer
  // once the hold elapses.
  const targetRef = useRef<{ element: Element; pointerId: number } | null>(null);

  const [activeDrag, setActiveDrag] = useState<{
    payload: TPayload;
    dx: number;
    dy: number;
  } | null>(null);

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function getHandlers(payload: TPayload): LongPressDragHandlers {
    function handlePointerDown(event: React.PointerEvent) {
      // House law 3, applied from the start: the clear is the very first
      // thing that happens, computed by a function that itself puts the
      // clear ahead of both early-return guards. See
      // `nextLongPressPointerDownDecision`'s own comment.
      const decision = nextLongPressPointerDownDecision(
        event,
        phase.current,
        swallowNextClick.current,
      );
      swallowNextClick.current = decision.swallowNextClick;
      if (!decision.shouldStartGesture) return;

      phase.current = nextLongPressPhase(phase.current, { type: "pointerDown" });
      start.current = { x: event.clientX, y: event.clientY };
      offsetRef.current = { dx: 0, dy: 0 };
      targetRef.current = { element: event.currentTarget, pointerId: event.pointerId };

      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        // The pointer may have already moved past the slop, or already
        // released/cancelled, between this timer being scheduled and it
        // firing — only a still-"pending" phase actually claims the
        // drag; anything else means the gesture already resolved another
        // way and this timer is simply late.
        if (phase.current !== "pending") return;

        phase.current = nextLongPressPhase(phase.current, { type: "holdElapsed" });
        swallowNextClick.current = nextLongPressSwallowNextClick(
          swallowNextClick.current,
          "holdElapsed",
        );
        // House law 2: try/caught, same reasoning as
        // SwipeActions.tsx/usePageSwipe.ts — an unguarded call here would
        // abandon this gesture mid-drag, leaving the lift stuck to the
        // finger with no way to settle.
        try {
          targetRef.current?.element.setPointerCapture(targetRef.current.pointerId);
        } catch {
          // Not capturable — carry on uncaptured.
        }
        setActiveDrag({ payload, dx: 0, dy: 0 });
        onDragStart?.(payload);
      }, LONG_PRESS_HOLD_MS);
    }

    function handlePointerMove(event: React.PointerEvent) {
      if (phase.current === "idle") return;

      const dx = event.clientX - start.current.x;
      const dy = event.clientY - start.current.y;

      if (phase.current === "pending") {
        phase.current = nextLongPressPhase(phase.current, { type: "move", dx, dy });
        if (phase.current === "idle") clearTimer(); // slop exceeded — yield for good
        return;
      }

      // dragging
      offsetRef.current = { dx, dy };
      setActiveDrag({ payload, dx, dy });
      onDragMove?.(payload, dx, dy);
    }

    function endGesture(kind: "release" | "cancel") {
      clearTimer();
      const wasDragging = phase.current === "dragging";
      const finalOffset = offsetRef.current;
      phase.current = nextLongPressPhase(phase.current, { type: kind });
      setActiveDrag(null);
      if (wasDragging) {
        if (kind === "release") onDragEnd?.(payload, finalOffset.dx, finalOffset.dy);
        else onDragCancel?.(payload);
      }
    }

    function handlePointerUp() {
      endGesture("release");
    }

    function handlePointerCancel() {
      endGesture("cancel");
    }

    // Same shape and reasoning as usePageSwipe.ts/SwipeActions.tsx — a
    // click lands after pointerup; if THIS gesture just committed to a
    // drag, stop that click before the block's own onClick (opening the
    // event) ever sees it.
    function handleClickCapture(event: React.MouseEvent) {
      if (!swallowNextClick.current) return;
      swallowNextClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    }

    return {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onClickCapture: handleClickCapture,
    };
  }

  return {
    getHandlers,
    isGestureClaimed: () => phase.current === "dragging",
    activeDrag,
  };
}
