// The hour timeline's zoom, as pure maths (mission-65, pinch to zoom). The
// hour height used to be a fixed 48px in TimelineGrid.tsx; it is now a live
// value a two-finger pinch changes, kept between MIN and MAX below (Google
// Calendar on Bryce's iPhone runs about 32pt to about 128pt per hour; Bryce
// chose 192 as the zoomed-in end so a 4 hour stretch fills the phone).
// Everything that needs no DOM lives here so node:test can cover it; the
// touch listeners and the storage wiring are in useTimelineZoom.ts.

import { MIN_BLOCK_MINUTES } from "./timelineLayout";

export const MIN_HOUR_HEIGHT_PX = 32;
export const MAX_HOUR_HEIGHT_PX = 192;
export const DEFAULT_HOUR_HEIGHT_PX = 48;

/** Localstorage key prefix; the person's id is appended, so two people on one
 * device keep their own zoom. */
export const HOUR_HEIGHT_KEY_PREFIX = "marshee:timeline-hour-height:";

export function hourHeightKey(personId: string): string {
  return `${HOUR_HEIGHT_KEY_PREFIX}${personId}`;
}

/** The smallest hour height that still lets the whole day fill the visible
 * rail, so zooming out never leaves a blank band under 11 PM (an iPad in
 * portrait). `visibleRailPx` is the scroller's height minus the sticky
 * header's. Never below MIN_HOUR_HEIGHT_PX; a phone rail (about 681px) gives
 * 32, an iPad rail (about 960px) gives 40. */
export function minHourHeightFor(visibleRailPx: number): number {
  if (!Number.isFinite(visibleRailPx)) return MIN_HOUR_HEIGHT_PX;
  return Math.max(MIN_HOUR_HEIGHT_PX, visibleRailPx / 24);
}

/** Pins a height to the allowed range (the floor defaults to
 * MIN_HOUR_HEIGHT_PX; pass minHourHeightFor's answer for the whole-day floor);
 * a non-finite number falls back to the default. */
export function clampHourHeight(heightPx: number, minPx: number = MIN_HOUR_HEIGHT_PX): number {
  if (!Number.isFinite(heightPx)) return Math.min(MAX_HOUR_HEIGHT_PX, Math.max(minPx, DEFAULT_HOUR_HEIGHT_PX));
  return Math.min(MAX_HOUR_HEIGHT_PX, Math.max(minPx, heightPx));
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
 * clamped (to `minPx` and MAX), and rounded to 2 decimals so what is stored
 * equals what was drawn. A zero start distance cannot scale anything, so it
 * keeps the start height. */
export function pinchHourHeight(
  startHeightPx: number,
  startDistance: number,
  currentDistance: number,
  minPx: number = MIN_HOUR_HEIGHT_PX,
): number {
  if (!(startDistance > 0) || !Number.isFinite(currentDistance)) return clampHourHeight(startHeightPx, minPx);
  const scaled = clampHourHeight((startHeightPx * currentDistance) / startDistance, minPx);
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

/** Whether an event block's title can use the normal text-xs size. A block
 * shorter than 20px has a content box under 16px (the 2px gap and the 1px
 * borders come off), so its title drops to a 12px line that fits whole,
 * descenders included. At 20px and up nothing changes. */
export function titleFitsFullSize(heightPx: number): boolean {
  return heightPx >= 20;
}

/** The most the text grows when zoomed all the way in (mission-73): 1.5x at
 * MAX_HOUR_HEIGHT_PX. */
export const ZOOM_TEXT_SCALE_MAX = 1.5;

/** How much the event text scales at a given hour height: 1 at or below the
 * default 48px, rising in a straight line to ZOOM_TEXT_SCALE_MAX at 192px,
 * and held there above it. A non-finite height means no scaling (1). */
export function zoomTextScale(hourHeightPx: number): number {
  if (!Number.isFinite(hourHeightPx) || hourHeightPx <= DEFAULT_HOUR_HEIGHT_PX) return 1;
  if (hourHeightPx >= MAX_HOUR_HEIGHT_PX) return ZOOM_TEXT_SCALE_MAX;
  const progress = (hourHeightPx - DEFAULT_HOUR_HEIGHT_PX) / (MAX_HOUR_HEIGHT_PX - DEFAULT_HOUR_HEIGHT_PX);
  return 1 + progress * (ZOOM_TEXT_SCALE_MAX - 1);
}

/** How many whole title lines fit in `availablePx`. Never below 1 (a title
 * always gets a line); a zero, negative or non-finite line height gives 1. */
export function titleLineCount({
  availablePx,
  lineHeightPx,
}: {
  availablePx: number;
  lineHeightPx: number;
}): number {
  if (!Number.isFinite(availablePx) || !Number.isFinite(lineHeightPx) || lineHeightPx <= 0) return 1;
  return Math.max(1, Math.floor(availablePx / lineHeightPx));
}

/** Whether one title line plus one time line plus padding fit in a block's
 * real height. Measured in pixels, not guessed from the Normal text size. */
export function timeLineFits({
  heightPx,
  titleLinePx,
  timeLinePx,
  paddingPx,
}: {
  heightPx: number;
  titleLinePx: number;
  timeLinePx: number;
  paddingPx: number;
}): boolean {
  const needed = titleLinePx + timeLinePx + paddingPx;
  if (!Number.isFinite(heightPx) || !Number.isFinite(needed)) return false;
  return heightPx >= needed;
}

/** Whether the location line fits under the title (and the time line, when it
 * shows) in a block's real height. The location line is the same size as the
 * time line. Measured in pixels, like timeLineFits. */
export function locationLineFits({
  heightPx,
  titleLinePx,
  timeLinePx,
  timeShown,
}: {
  heightPx: number;
  titleLinePx: number;
  timeLinePx: number;
  timeShown: boolean;
}): boolean {
  const needed = titleLinePx + (timeShown ? timeLinePx : 0) + timeLinePx;
  if (!Number.isFinite(heightPx) || !Number.isFinite(needed)) return false;
  return heightPx >= needed;
}

// Today's rem line heights (font size times leading-tight's 1.25), kept in rem
// so the pixel maths matches the CSS. CHANGE TOGETHER with the class strings
// on the title, time and location spans in TimelineDayColumn.tsx: the full
// title's text-[length:calc(0.75rem*...)], the compact narrow tier's
// calc(0.625rem*...), the small tier's min(calc(0.75rem*...),12px) leading and
// the time line's calc(0.5625rem*...).
export const TITLE_LINE_REM = 0.9375;
export const COMPACT_NARROW_TITLE_LINE_REM = 0.78125;
export const SMALL_TITLE_LINE_REM = 0.75;
export const TIME_LINE_REM = 0.703125;
/** The small tier never grows past mission 65's 12px line (10px font). */
export const SMALL_TITLE_LINE_MAX_PX = 12;

export type BlockTextFit = {
  /** "small" is the 10px font on a 12px line; "full" is the normal size. */
  tier: "small" | "full";
  /** Whole title lines in a wide column (and always outside compact mode). */
  titleLines: number;
  /** Whole title lines in a compact column under 128px, where the time line is
   * hidden by CSS and so reserves no room. Equals titleLines when not compact. */
  titleLinesNarrow: number;
  timeShown: boolean;
  locationShown: boolean;
};

/** Everything a timeline block's text needs decided, in real pixels: which
 * title tier, how many whole title lines, and whether the time and location
 * lines show. The component only renders this answer. `heightPx` is the block's
 * computed height (before the 2px trim); the content box is that minus the 2px
 * trim and the two 1px borders. Lines x line height + time + location never
 * exceed the content box, and the title always gets at least one line. */
export function blockTextFit({
  heightPx,
  trueDurationMinutes,
  rootPx,
  scale,
  compact,
  hasLocation,
}: {
  heightPx: number;
  trueDurationMinutes: number;
  rootPx: number;
  scale: number;
  /** 3 Day and Week columns; the Day view is not compact. */
  compact: boolean;
  hasLocation: boolean;
}): BlockTextFit {
  const contentPx = Math.max(0, heightPx - 2) - 2;
  const fullLinePx = TITLE_LINE_REM * rootPx * scale;
  // The small tier also applies when a full title line would not fit the content
  // box, so g, y and p never lose their tails.
  const small = !titleFitsFullSize(heightPx) || fullLinePx > contentPx;
  const smallLinePx = Math.min(SMALL_TITLE_LINE_REM * rootPx * scale, SMALL_TITLE_LINE_MAX_PX);
  const titleLinePx = small ? smallLinePx : fullLinePx;
  const timeLinePx = TIME_LINE_REM * rootPx * scale;
  const timeShown =
    showsTimeLine(heightPx, trueDurationMinutes) &&
    timeLineFits({ heightPx: contentPx, titleLinePx, timeLinePx, paddingPx: 0 });
  const locationShown =
    !compact &&
    hasLocation &&
    heightPx >= 72 &&
    locationLineFits({ heightPx: contentPx, titleLinePx, timeLinePx, timeShown });
  const titleLines = titleLineCount({
    availablePx: contentPx - (timeShown ? timeLinePx : 0) - (locationShown ? timeLinePx : 0),
    lineHeightPx: titleLinePx,
  });
  const narrowLinePx = small ? smallLinePx : COMPACT_NARROW_TITLE_LINE_REM * rootPx * scale;
  const titleLinesNarrow = compact
    ? titleLineCount({ availablePx: contentPx, lineHeightPx: narrowLinePx })
    : titleLines;
  return { tier: small ? "small" : "full", titleLines, titleLinesNarrow, timeShown, locationShown };
}
