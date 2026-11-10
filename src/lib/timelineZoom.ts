// The hour timeline's zoom, as pure maths (mission-64, pinch to zoom). The
// hour height used to be a fixed 48px in TimelineGrid.tsx; it is now a live
// value a two-finger pinch changes, kept between MIN and MAX below (measured
// from Google Calendar on Bryce's iPhone: about 32pt to about 128pt per hour).
// Everything that needs no DOM lives here so node:test can cover it; the
// touch listeners and the storage wiring are in useTimelineZoom.ts.

import { MIN_BLOCK_MINUTES } from "./timelineLayout";

export const MIN_HOUR_HEIGHT_PX = 32;
export const MAX_HOUR_HEIGHT_PX = 128;
export const DEFAULT_HOUR_HEIGHT_PX = 48;

/** Localstorage key prefix; the person's id is appended, so two people on one
 * device keep their own zoom. */
export const HOUR_HEIGHT_KEY_PREFIX = "marshee:timeline-hour-height:";

export function hourHeightKey(personId: string): string {
  return `${HOUR_HEIGHT_KEY_PREFIX}${personId}`;
}

/** Pins a height to the allowed range; a non-finite number falls back to the default. */
export function clampHourHeight(heightPx: number): number {
  if (!Number.isFinite(heightPx)) return DEFAULT_HOUR_HEIGHT_PX;
  return Math.min(MAX_HOUR_HEIGHT_PX, Math.max(MIN_HOUR_HEIGHT_PX, heightPx));
}

/** A stored string to a valid height. Missing, empty or non-numeric text
 * means the default; a number outside the range is clamped into it. */
export function parseStoredHourHeight(raw: string | null): number {
  if (raw === null || raw.trim() === "") return DEFAULT_HOUR_HEIGHT_PX;
  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_HOUR_HEIGHT_PX;
  return clampHourHeight(value);
}

/** The new hour height while two fingers are down: the height when the pinch
 * began, scaled by how much the finger distance has grown (or shrunk),
 * clamped, and rounded to 2 decimals so what is stored equals what was drawn.
 * A zero start distance cannot scale anything, so it keeps the start height. */
export function pinchHourHeight(startHeightPx: number, startDistance: number, currentDistance: number): number {
  if (!(startDistance > 0) || !Number.isFinite(currentDistance)) return clampHourHeight(startHeightPx);
  const scaled = clampHourHeight((startHeightPx * currentDistance) / startDistance);
  return Math.round(scaled * 100) / 100;
}

/** Where the hour rail starts inside the scroller's content: the sticky
 * weekday header and the all-day strip sit above it. Measured from the DOM
 * (bounding rects and the current scrollTop), never a constant. */
export function railOffsetPx(railTop: number, scrollerTop: number, scrollTop: number): number {
  return railTop - scrollerTop + scrollTop;
}

/** The minute of the day under a point `pointY` pixels below the scroller's
 * top edge, at `pxPerMinute`, given the current scrollTop and rail offset. */
export function minuteUnderPoint(scrollTop: number, pointY: number, railOffset: number, pxPerMinute: number): number {
  return (scrollTop + pointY - railOffset) / pxPerMinute;
}

/** The scrollTop that puts `anchorMinute` under `pointY` at the new scale:
 *   scrollTop = railOffset + anchorMinute * pxPerMinute - pointY
 * (the inverse of minuteUnderPoint). Never negative; the browser clamps the
 * top end itself. */
export function anchorScrollTop(anchorMinute: number, pxPerMinute: number, railOffset: number, pointY: number): number {
  return Math.max(0, railOffset + anchorMinute * pxPerMinute - pointY);
}

/** Whether an event block draws its time line under the title. Shown when
 * the block is 40px or taller, or when the event is really under
 * MIN_BLOCK_MINUTES (the block height is then padding, not a fact) AND the
 * block is at least 24px tall. Shorter than that: title only. At the default
 * 48px/hour this is exactly the old rule. */
export function showsTimeLine(heightPx: number, trueDurationMinutes: number): boolean {
  if (heightPx >= 40) return true;
  return trueDurationMinutes < MIN_BLOCK_MINUTES && heightPx >= 24;
}
