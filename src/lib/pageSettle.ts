import { DIRECTION_LOCK_PX } from "./calendarGesture";

// Mission 69 (C2): what a released sideways slide does. Pure, so the quarter
// rule and the flick rule are tested without a screen.

/** Released past this share of the page width, the page turns. */
export const SETTLE_FRACTION = 0.25;

/** A flick at or above this speed (px per ms) turns the page on its own. */
export const FLICK_VELOCITY_PX_PER_MS = 0.5;

/**
 * 1 = go to the next page (finger moved left), -1 = the previous page
 * (finger moved right), 0 = spring back. Turns when the drag passed a
 * quarter of the page, or when it was flicked the same way it was dragged
 * (and moved at least the direction lock, so a twitch never turns).
 */
export function settlePage({
  dx,
  velocityPxPerMs,
  pageWidth,
}: {
  dx: number;
  velocityPxPerMs: number;
  pageWidth: number;
}): 1 | -1 | 0 {
  if (dx === 0) return 0;
  const turn: 1 | -1 = dx < 0 ? 1 : -1;
  if (pageWidth > 0 && Math.abs(dx) > pageWidth * SETTLE_FRACTION) return turn;
  const sameWay = Math.sign(velocityPxPerMs) === Math.sign(dx);
  if (
    sameWay &&
    Math.abs(velocityPxPerMs) >= FLICK_VELOCITY_PX_PER_MS &&
    Math.abs(dx) >= DIRECTION_LOCK_PX
  ) {
    return turn;
  }
  return 0;
}
