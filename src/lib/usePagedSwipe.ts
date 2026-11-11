"use client";

import { useEffect, useRef, type RefObject } from "react";
import { flushSync } from "react-dom";
import {
  gestureStep,
  IDLE_GESTURE,
  type GestureEffect,
  type GestureEvent,
  type GestureState,
} from "./calendarGesture";
import { settlePage } from "./pageSettle";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

// Mission 69 (C3): the sliding swipe. Feeds pointer events to the pure gesture
// machine (calendarGesture.ts), carries out its effects, and moves the page
// with ONE CSS variable, `--page-dx`, written on `varRef`'s element at most
// once per animation frame. No React state, so no render, during a drag.
//
// The element on `varRef` carries the variable; the tracks under it
// (PagedTrack.tsx) read it. They are descendants, so the timeline (C4) can
// put two tracks under one root and they cannot disagree.
//
// THE TURN. On a release past the settle rule the root gets `data-glide`
// (PagedTrack's CSS eases transform while it is set) and the variable goes to
// a full page. When the ease ends (transitionend, or a timeout if it never
// fires) `commit` runs: glide off, `onTurn(dir)` inside flushSync, variable
// back to 0, all in the same task, so no frame shows the old page at 0 or
// the new page at a page's width. The tracks key their panels by position
// (prev, current, next), so after the flush the current panel already shows
// the new period. Until then new touches are ignored.

/** How long the glide runs (matches PagedTrack's duration class). */
const GLIDE_MS = 260;
/** If transitionend never arrives (an interrupted transition), commit anyway. */
const GLIDE_TIMEOUT_MS = GLIDE_MS + 140;

export type PagedSwipeOptions = {
  /** The element that carries `--page-dx` (and `data-glide`). */
  varRef: RefObject<HTMLElement | null>;
  /** Called, inside flushSync, when a page turn commits. 1 = next. */
  onTurn: (direction: 1 | -1) => void;
  /** True when the press began on something that could be held (PR 4). */
  isOnBlock?: (target: EventTarget) => boolean;
};

export type PagedSwipe = {
  /** Spread onto the swiped element (it also needs `touch-action: pan-y`). */
  handlers: {
    onPointerDown: (event: React.PointerEvent) => void;
    onPointerMove: (event: React.PointerEvent) => void;
    onPointerUp: (event: React.PointerEvent) => void;
    onPointerCancel: (event: React.PointerEvent) => void;
    onClickCapture: (event: React.MouseEvent) => void;
  };
  /** The width of one page right now (px), 0 before mount. */
  getPageWidth: () => number;
  /** Ease the track back to rest without turning (for an outside pinch). */
  springBack: () => void;
};

export function usePagedSwipe({ varRef, onTurn, isOnBlock }: PagedSwipeOptions): PagedSwipe {
  const reduceMotion = usePrefersReducedMotion();
  const machine = useRef<GestureState>(IDLE_GESTURE);
  // The latest props, read by handlers that outlive a render (timers).
  const latest = useRef({ onTurn, reduceMotion });
  useEffect(() => {
    latest.current = { onTurn, reduceMotion };
  });
  const frame = useRef(0);
  const pendingDx = useRef(0);
  // True from the release that turns a page until its commit.
  const turning = useRef(false);
  const cleanupTurn = useRef<(() => void) | null>(null);

  function getPageWidth() {
    return varRef.current?.clientWidth ?? 0;
  }

  function writeDx(dx: number) {
    varRef.current?.style.setProperty("--page-dx", `${dx}px`);
  }

  function cancelFrame() {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
  }

  // Coalesces moves: the latest offset is written once per frame.
  function scheduleDx(dx: number) {
    pendingDx.current = dx;
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      writeDx(pendingDx.current);
    });
  }

  function setGlide(on: boolean) {
    const el = varRef.current;
    if (!el) return;
    if (on) el.setAttribute("data-glide", "true");
    else el.removeAttribute("data-glide");
  }

  function springBack() {
    cancelFrame();
    if (latest.current.reduceMotion) {
      setGlide(false);
      writeDx(0);
      return;
    }
    setGlide(true);
    writeDx(0);
  }

  function commit(direction: 1 | -1) {
    cleanupTurn.current?.();
    cleanupTurn.current = null;
    // Glide off BEFORE the variable resets, or the reset would animate.
    setGlide(false);
    flushSync(() => latest.current.onTurn(direction));
    writeDx(0);
    turning.current = false;
  }

  function startTurn(direction: 1 | -1) {
    turning.current = true;
    cancelFrame();
    const el = varRef.current;
    if (latest.current.reduceMotion || !el) {
      commit(direction);
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      commit(direction);
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.propertyName === "transform") finish();
    };
    el.addEventListener("transitionend", onEnd);
    const timer = window.setTimeout(finish, GLIDE_TIMEOUT_MS);
    cleanupTurn.current = () => {
      done = true;
      el.removeEventListener("transitionend", onEnd);
      window.clearTimeout(timer);
    };
    setGlide(true);
    writeDx(-direction * getPageWidth());
  }

  function apply(effects: GestureEffect[], event: React.SyntheticEvent) {
    const target = event.currentTarget as HTMLElement;
    for (const effect of effects) {
      switch (effect.type) {
        case "capture":
          // setPointerCapture throws when the pointer is not current.
          try {
            target.setPointerCapture(effect.pointerId);
          } catch {
            // Not capturable: carry on uncaptured.
          }
          break;
        case "releaseCapture":
          try {
            target.releasePointerCapture(effect.pointerId);
          } catch {
            // Already released.
          }
          break;
        case "swallowClick":
          event.preventDefault();
          event.stopPropagation();
          break;
        case "setOffset":
          scheduleDx(effect.dx);
          break;
        case "settle": {
          const direction = settlePage({
            dx: effect.dx,
            velocityPxPerMs: effect.velocityPxPerMs,
            pageWidth: getPageWidth(),
          });
          if (direction === 0) springBack();
          else startTurn(direction);
          break;
        }
        case "springBack":
          springBack();
          break;
        // armSwallow: the machine keeps the flag. handToPinch: the zoom owns
        // the touch. Hold and drag effects: off until PR 4.
        default:
          break;
      }
    }
  }

  function feed(gesture: GestureEvent, event: React.SyntheticEvent) {
    const result = gestureStep(machine.current, gesture);
    machine.current = result.state;
    apply(result.effects, event);
  }

  useEffect(
    () => () => {
      cancelFrame();
      cleanupTurn.current?.();
    },
    // Teardown only.
    [],
  );

  const handlers: PagedSwipe["handlers"] = {
    onPointerDown(event) {
      // A turn is in flight: its commit must land before anything new starts.
      if (turning.current) return;
      // A new press during a spring-back takes the track from where it is.
      if (machine.current.kind === "idle") setGlide(false);
      feed(
        {
          type: "down",
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          time: event.timeStamp,
          onBlock: isOnBlock?.(event.target) ?? false,
          isPrimary: event.isPrimary,
        },
        event,
      );
    },
    onPointerMove(event) {
      if (turning.current) return;
      feed(
        { type: "move", pointerId: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp },
        event,
      );
    },
    onPointerUp(event) {
      feed(
        { type: "up", pointerId: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp },
        event,
      );
    },
    onPointerCancel(event) {
      feed({ type: "cancel", pointerId: event.pointerId }, event);
    },
    onClickCapture(event) {
      feed({ type: "click" }, event);
    },
  };

  return { handlers, getPageWidth, springBack };
}
