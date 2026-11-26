// The motion and timing of the star flight (mission 80). Pure: it turns
// points into keyframe objects and elapsed time into a count, and never
// touches the DOM. StarFlightLayer and useCountUp do the animating.

/** Stars in one ring. */
export const RING_STARS = 8;
/** How long one star is in the air, pop-out included. */
export const FLIGHT_MS = 800;
/** The gap between one star leaving and the next. */
export const STAGGER_MS = 30;
/** How long the number takes to climb once the stars land. */
export const COUNT_MS = 400;
/** How far through a flight the star has popped out to its ring spot. */
export const POP_AT = 0.3;
/** The ring's radius round the tapped button, in rem so a larger Text size grows it too. */
export const RING_RADIUS_REM = 2.25;
/** The easing every star's flight uses. */
export const FLIGHT_EASING = "ease-in-out";
/** Keeps the count-up's landing time after the count is over, in case a late render reads it. */
export const LANDING_GRACE_MS = 200;
/** How long the all-done words stay up. */
export const ALL_DONE_WORDS_MS = 3000;
/** The confetti's z-index: above the sheets (z-60, z-61), below the all-done words and the flight layer (z-70). */
export const CONFETTI_Z_INDEX = 65;

export type Point = { x: number; y: number };

/** A plain keyframe: what `element.animate` takes, with no DOM type needed here. */
export type StarKeyframe = { offset: number; transform: string; opacity: number };

/** `count` spots evenly round a circle of `radius`, the first straight up, going clockwise. */
export function ringOffsets(count: number, radius: number): Point[] {
  if (!(count > 0)) return [];
  const spots: Point[] = [];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    spots.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return spots;
}

function at(p: Point, scale: number): string {
  return `translate(${p.x}px, ${p.y}px) scale(${scale})`;
}

/**
 * One star's flight, drawn from the point it starts at (the star sits on
 * `from`, so every move is relative to it). It pops out to its ring spot by
 * `POP_AT`. With a target it then flies and shrinks to it and fades at the
 * end; with null it fades where it popped.
 */
export function flightKeyframes(from: Point, to: Point | null, ringOffset: Point): StarKeyframe[] {
  const pop: StarKeyframe[] = [
    { offset: 0, transform: at({ x: 0, y: 0 }, 0.3), opacity: 0 },
    { offset: POP_AT, transform: at(ringOffset, 1), opacity: 1 },
  ];
  if (to === null) return [...pop, { offset: 1, transform: at(ringOffset, 1), opacity: 0 }];
  const end = { x: to.x - from.x, y: to.y - from.y };
  return [...pop, { offset: 0.9, transform: at(end, 0.4), opacity: 1 }, { offset: 1, transform: at(end, 0.3), opacity: 0 }];
}

/** When the count-up should start, counted from the tap: star `index` has landed by then. */
export function landsAfterMs(index: number): number {
  return Math.max(0, index) * STAGGER_MS + FLIGHT_MS;
}

/** How long after a tap a person's landing is kept: the last star lands, the count runs, then a short grace. */
export function landingClearsAfterMs(): number {
  return landsAfterMs(RING_STARS - 1) + COUNT_MS + LANDING_GRACE_MS;
}

/** The number to show `elapsedMs` into a count from `from` to `to`: a whole number, never past `to`, at `from` for a 0 or negative elapsed. */
export function countUpValue(from: number, to: number, elapsedMs: number, durationMs: number): number {
  if (!(elapsedMs > 0)) return from;
  if (!(durationMs > 0) || elapsedMs >= durationMs) return to;
  const value = Math.round(from + (to - from) * (elapsedMs / durationMs));
  return Math.min(Math.max(value, Math.min(from, to)), Math.max(from, to));
}
