// Mission 69 (C2): the calendar's one pure gesture machine. It replaces
// usePageSwipe.ts's copy of SwipeActions.tsx's machine (STRUCTURE.md, "The
// pointer-gesture machine has two definitions": this keeps the count at two).
//
// ONE OWNER. The September drag attempt put two hooks on one touch, and a
// tap left the hold machine pending forever. Here a single reducer owns every
// touch on the timeline: one set of thresholds, one hold timer (the reducer
// only SAYS "start" or "clear"; the caller runs it), one pointer capture.
// Every touch sequence ends back in "idle", and the tests prove it.
//
// `gestureStep(state, event, options)` returns the next state and a list of
// effects for the caller to carry out. It touches no DOM, no timer, no React.
//
// CARRIED FROM usePageSwipe.ts / SwipeActions.tsx, BY NAME:
//   - the undecided zone is DIRECTION_LOCK_PX (8px; one definition, here).
//   - The tie rule (usePageSwipe.ts `nextGestureMode`): at exactly equal
//     travel the slide wins, because only a STRICTLY larger vertical travel
//     reads as a scroll. Same comparison as SwipeActions.tsx.
//   - A second finger at any stage is a pinch (`pointerDownAction`'s "yield");
//     from a slide it also springs the track back.
//   - The click swallow is armed only by a slide that locked in, and every
//     pointer down clears it (`nextSwallowNextClick`, mission-19/F1: touch
//     gives no click after a drag, so a stale flag would eat the next tap).
//   - A primary pointer down resets everything, so a pointer-up that never
//     arrived can never leave a stale id (`nextActivePointers`).
//   - Capture is an EFFECT, so the caller wraps setPointerCapture in
//     try/catch (it throws when the pointer is not current).
// New in PR 3: pointer cancel never turns a page (it springs back).
//
// HOLD AND DRAG ARE OFF UNTIL PR 4. With `holdEnabled` false (the default)
// the states "holding" and "dragging" are never entered and no hold timer is
// ever requested.

/** The undecided zone: travel under this on both axes decides nothing. */
export const DIRECTION_LOCK_PX = 8;

/** How long a press on an event block must stay still before it becomes a
 * hold. Off until PR 4 (`holdEnabled`). */
export const HOLD_MS = 500;

/** How far a held press may wander before it counts as a move, not a hold.
 * The same distance as the direction lock, so there is one feel. Off until
 * PR 4. */
export const HOLD_SLOP_PX = DIRECTION_LOCK_PX;

/** A finger that rested this long before lifting is not a flick. */
const VELOCITY_STALE_MS = 100;

export type GestureKind =
  | "idle"
  | "undecided"
  | "scrolling"
  | "sliding"
  | "pinch"
  | "holding"
  | "dragging";

export type GestureState = {
  kind: GestureKind;
  /** The pointer driving the gesture (the first finger). */
  pointerId: number;
  /** Every pointer currently down, so a pinch ends only when all are up. */
  down: number[];
  startX: number;
  startY: number;
  /** Horizontal travel since the press, while sliding. */
  dx: number;
  /** Where and when the last move was seen, for the flick speed. */
  lastX: number;
  lastTime: number;
  /** Horizontal speed in px per ms, signed (negative = leftward). */
  velocity: number;
  onBlock: boolean;
  /** True while a hold timer is running, so it is cleared exactly once. */
  holdArmed: boolean;
  /** The next click is the tail of a committed slide: swallow it. */
  swallow: boolean;
};

export type GestureEvent =
  | {
      type: "down";
      pointerId: number;
      x: number;
      y: number;
      time: number;
      onBlock: boolean;
      /** Defaults to true. A touch's second finger is not primary. */
      isPrimary?: boolean;
    }
  | { type: "move"; pointerId: number; x: number; y: number; time: number }
  | { type: "up"; pointerId: number; x: number; y: number; time: number }
  | { type: "cancel"; pointerId: number }
  | { type: "holdFired" }
  | { type: "click" };

export type GestureEffect =
  | { type: "capture"; pointerId: number }
  | { type: "releaseCapture"; pointerId: number }
  | { type: "armSwallow" }
  /** A click arrived while the swallow was armed: stop it. */
  | { type: "swallowClick" }
  | { type: "startHoldTimer"; ms: number }
  | { type: "clearHoldTimer" }
  /** Move the track to this horizontal offset (px from rest). */
  | { type: "setOffset"; dx: number }
  /** The slide was released: ask `settlePage` what to do. */
  | { type: "settle"; dx: number; velocityPxPerMs: number }
  /** Ease the track back to zero without turning the page. */
  | { type: "springBack" }
  /** A second finger landed: the pinch (zoom) owns the touch now. */
  | { type: "handToPinch" }
  // PR 4 only (never emitted while holdEnabled is false):
  | { type: "holdStarted" }
  | { type: "dragMove"; x: number; y: number }
  | { type: "dragDrop"; x: number; y: number }
  | { type: "dragCancel" };

export type GestureOptions = {
  /** Hold and drag. Off until PR 4. */
  holdEnabled?: boolean;
};

export type GestureResult = { state: GestureState; effects: GestureEffect[] };

export const IDLE_GESTURE: GestureState = {
  kind: "idle",
  pointerId: -1,
  down: [],
  startX: 0,
  startY: 0,
  dx: 0,
  lastX: 0,
  lastTime: 0,
  velocity: 0,
  onBlock: false,
  holdArmed: false,
  swallow: false,
};

/** Back to rest. Keeps `swallow`: the click after a slide arrives later. */
function toIdle(state: GestureState): GestureState {
  return { ...IDLE_GESTURE, swallow: state.swallow };
}

function clearTimerIfArmed(state: GestureState, effects: GestureEffect[]) {
  if (state.holdArmed) effects.push({ type: "clearHoldTimer" });
}

/** Everything the interrupted gesture must undo when a second finger lands
 * or the gesture is abandoned. */
function unwind(state: GestureState, effects: GestureEffect[]) {
  clearTimerIfArmed(state, effects);
  if (state.kind === "sliding") {
    effects.push({ type: "springBack" });
    effects.push({ type: "releaseCapture", pointerId: state.pointerId });
  } else if (state.kind === "holding") {
    effects.push({ type: "releaseCapture", pointerId: state.pointerId });
  } else if (state.kind === "dragging") {
    effects.push({ type: "dragCancel" });
    effects.push({ type: "releaseCapture", pointerId: state.pointerId });
  }
}

export function gestureStep(
  state: GestureState,
  event: GestureEvent,
  options: GestureOptions = {},
): GestureResult {
  const holdEnabled = options.holdEnabled ?? false;
  const effects: GestureEffect[] = [];

  switch (event.type) {
    case "down": {
      const isPrimary = event.isPrimary ?? true;
      // A second finger (never primary) while one is active: a pinch. Once
      // in a pinch, further fingers are only counted.
      if (state.kind !== "idle" && !isPrimary) {
        const down = [...state.down.filter((id) => id !== event.pointerId), event.pointerId];
        if (state.kind === "pinch") return { state: { ...state, down }, effects };
        unwind(state, effects);
        effects.push({ type: "handToPinch" });
        return { state: { ...state, kind: "pinch", down, holdArmed: false, dx: 0 }, effects };
      }
      // A primary down is a fresh gesture. If something was still going (an
      // up that never arrived), undo it first so nothing leaks.
      if (state.kind !== "idle") unwind(state, effects);
      const next: GestureState = {
        ...IDLE_GESTURE,
        kind: "undecided",
        pointerId: event.pointerId,
        down: [event.pointerId],
        startX: event.x,
        startY: event.y,
        lastX: event.x,
        lastTime: event.time,
        onBlock: event.onBlock,
        // The swallow is cleared on every pointer down (mission-19/F1).
        swallow: false,
      };
      if (holdEnabled && event.onBlock) {
        next.holdArmed = true;
        effects.push({ type: "startHoldTimer", ms: HOLD_MS });
      }
      return { state: next, effects };
    }

    case "move": {
      if (state.kind === "idle" || state.kind === "pinch") return { state, effects };
      if (event.pointerId !== state.pointerId) return { state, effects };
      const dx = event.x - state.startX;
      const dy = event.y - state.startY;
      const dt = event.time - state.lastTime;
      const velocity = dt > 0 ? (event.x - state.lastX) / dt : state.velocity;
      const tracked = { lastX: event.x, lastTime: event.time, velocity };

      if (state.kind === "scrolling") return { state: { ...state, ...tracked }, effects };

      if (state.kind === "undecided") {
        // While a hold could still happen, wandering past the slop cancels it.
        const past = Math.abs(dx) >= DIRECTION_LOCK_PX || Math.abs(dy) >= DIRECTION_LOCK_PX;
        if (!past) return { state: { ...state, ...tracked }, effects };
        clearTimerIfArmed(state, effects);
        // Only a STRICTLY larger vertical travel scrolls; a tie slides.
        if (Math.abs(dy) > Math.abs(dx)) {
          return { state: { ...state, ...tracked, kind: "scrolling", holdArmed: false }, effects };
        }
        effects.push({ type: "capture", pointerId: state.pointerId });
        effects.push({ type: "armSwallow" });
        effects.push({ type: "setOffset", dx });
        return {
          state: { ...state, ...tracked, kind: "sliding", dx, holdArmed: false, swallow: true },
          effects,
        };
      }

      if (state.kind === "sliding") {
        effects.push({ type: "setOffset", dx });
        return { state: { ...state, ...tracked, dx }, effects };
      }

      if (state.kind === "holding") {
        if (Math.abs(dx) < HOLD_SLOP_PX && Math.abs(dy) < HOLD_SLOP_PX) {
          return { state: { ...state, ...tracked }, effects };
        }
        effects.push({ type: "dragMove", x: event.x, y: event.y });
        return { state: { ...state, ...tracked, kind: "dragging" }, effects };
      }

      // dragging
      effects.push({ type: "dragMove", x: event.x, y: event.y });
      return { state: { ...state, ...tracked }, effects };
    }

    case "up": {
      if (state.kind === "idle") return { state, effects };
      const down = state.down.filter((id) => id !== event.pointerId);
      // A finger is still down (the other half of a pinch): not over yet.
      if (down.length > 0) return { state: { ...state, down }, effects };
      if (state.kind === "pinch") return { state: toIdle(state), effects };
      if (event.pointerId !== state.pointerId) return { state: toIdle(state), effects };

      clearTimerIfArmed(state, effects);
      if (state.kind === "sliding") {
        const stale = event.time - state.lastTime > VELOCITY_STALE_MS;
        effects.push({
          type: "settle",
          dx: state.dx,
          velocityPxPerMs: stale ? 0 : state.velocity,
        });
        effects.push({ type: "releaseCapture", pointerId: state.pointerId });
      } else if (state.kind === "holding") {
        effects.push({ type: "releaseCapture", pointerId: state.pointerId });
      } else if (state.kind === "dragging") {
        effects.push({ type: "dragDrop", x: event.x, y: event.y });
        effects.push({ type: "releaseCapture", pointerId: state.pointerId });
      }
      return { state: toIdle(state), effects };
    }

    case "cancel": {
      if (state.kind === "idle") return { state, effects };
      const down = state.down.filter((id) => id !== event.pointerId);
      if (down.length > 0) return { state: { ...state, down }, effects };
      // Cancel never settles: the page never turns on a cancel.
      if (state.kind !== "pinch") unwind(state, effects);
      return { state: toIdle(state), effects };
    }

    case "holdFired": {
      // Only a still-undecided press on a block can become a hold, and only
      // when hold is on. Anything else means the timer outlived its press.
      if (!holdEnabled || state.kind !== "undecided") {
        return { state: state.holdArmed ? { ...state, holdArmed: false } : state, effects };
      }
      effects.push({ type: "capture", pointerId: state.pointerId });
      effects.push({ type: "holdStarted" });
      return { state: { ...state, kind: "holding", holdArmed: false }, effects };
    }

    case "click": {
      if (!state.swallow) return { state, effects };
      effects.push({ type: "swallowClick" });
      return { state: { ...state, swallow: false }, effects };
    }
  }
}
