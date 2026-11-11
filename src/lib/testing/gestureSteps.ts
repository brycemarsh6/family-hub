// Shared test helper: the touch-sequence steps that calendarGesture.ts's two
// test files feed its machine (`calendarGesture.test.ts`, hold off, and
// `calendarGestureHold.test.ts`, hold on). Moved here in mission 70 (F2)
// from the copy each file carried. Lives in `src/lib/testing/`, per
// STRUCTURE.md's exemption of that directory from the dormant-export rule:
// its tests are its callers.

import {
  gestureStep,
  IDLE_GESTURE,
  type GestureEffect,
  type GestureEvent,
  type GestureOptions,
  type GestureState,
} from "../calendarGesture";

// Feed a whole touch sequence; return the final state and every effect.
export function run(events: GestureEvent[], options?: GestureOptions) {
  let state: GestureState = IDLE_GESTURE;
  const effects: GestureEffect[] = [];
  for (const e of events) {
    const r = gestureStep(state, e, options);
    state = r.state;
    effects.push(...r.effects);
  }
  return { state, effects };
}
export const types = (effects: GestureEffect[]) => effects.map((e) => e.type);

export const down = (x = 100, y = 100, onBlock = false, t = 0, id = 1, isPrimary = true): GestureEvent => ({
  type: "down", pointerId: id, x, y, time: t, onBlock, isPrimary,
});
export const move = (x: number, y: number, t: number, id = 1): GestureEvent => ({
  type: "move", pointerId: id, x, y, time: t,
});
export const up = (x: number, y: number, t: number, id = 1): GestureEvent => ({
  type: "up", pointerId: id, x, y, time: t,
});
export const cancel = (id = 1): GestureEvent => ({ type: "cancel", pointerId: id });
