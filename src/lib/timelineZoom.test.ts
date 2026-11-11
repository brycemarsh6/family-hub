// Unit tests for the timeline zoom's pure maths — mission-65 (pinch to zoom).
// The touch listeners in useTimelineZoom.ts need a real device; these cover
// the decisions: clamp, storage parse, the anchor formula, the time-line rule.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_HOUR_HEIGHT_PX,
  MAX_HOUR_HEIGHT_PX,
  DEFAULT_HOUR_HEIGHT_PX,
  hourHeightKey,
  clampHourHeight,
  parseStoredHourHeight,
  pinchHourHeight,
  railOffsetPx,
  minuteUnderPoint,
  anchorScrollTop,
  showsTimeLine,
  minHourHeightFor,
  titleFitsFullSize,
  ZOOM_TEXT_SCALE_MAX,
  zoomTextScale,
  titleLineCount,
  timeLineFits,
} from "./timelineZoom";

test("range constants: 32 to 192 with a 48 default", () => {
  assert.equal(MIN_HOUR_HEIGHT_PX, 32);
  assert.equal(MAX_HOUR_HEIGHT_PX, 192);
  assert.equal(DEFAULT_HOUR_HEIGHT_PX, 48);
});

test("hourHeightKey: prefix plus the person id", () => {
  assert.equal(hourHeightKey("abc"), "marshee:timeline-hour-height:abc");
});

test("clampHourHeight: pins to the range and rescues non-finite numbers", () => {
  assert.equal(clampHourHeight(10), 32);
  assert.equal(clampHourHeight(500), 192);
  assert.equal(clampHourHeight(80), 80);
  assert.equal(clampHourHeight(32), 32);
  assert.equal(clampHourHeight(192), 192);
  assert.equal(clampHourHeight(128), 128);
  assert.equal(clampHourHeight(Number.NaN), 48);
  assert.equal(clampHourHeight(Number.POSITIVE_INFINITY), 48);
});

test("parseStoredHourHeight: missing, empty and garbage mean the default", () => {
  assert.equal(parseStoredHourHeight(null), 48);
  assert.equal(parseStoredHourHeight(""), 48);
  assert.equal(parseStoredHourHeight("   "), 48);
  assert.equal(parseStoredHourHeight("tall"), 48);
  assert.equal(parseStoredHourHeight("12px"), 48);
  assert.equal(parseStoredHourHeight("NaN"), 48);
  assert.equal(parseStoredHourHeight("Infinity"), 48);
});

test("parseStoredHourHeight: a number is kept, or clamped into the range", () => {
  assert.equal(parseStoredHourHeight("96"), 96);
  assert.equal(parseStoredHourHeight("72.5"), 72.5);
  assert.equal(parseStoredHourHeight("5"), 32);
  assert.equal(parseStoredHourHeight("9999"), 192);
});

test("pinchHourHeight: fingers twice as far apart doubles the height, clamped", () => {
  assert.equal(pinchHourHeight(48, 100, 200), 96);
  assert.equal(pinchHourHeight(48, 100, 100), 48);
  assert.equal(pinchHourHeight(48, 100, 50), 32); // 24 clamps up to 32
  assert.equal(pinchHourHeight(96, 100, 400), 192); // 384 clamps down to 192
  assert.equal(pinchHourHeight(48, 90, 100), 53.33); // rounded to 2 decimals
});

test("pinchHourHeight: a zero start distance keeps the start height", () => {
  assert.equal(pinchHourHeight(60, 0, 200), 60);
});

test("railOffsetPx: rail top inside the scroll content", () => {
  // Scroller top at 100, rail top at 160 on screen, scrolled 0: header is 60 tall.
  assert.equal(railOffsetPx(160, 100, 0), 60);
  // Scrolled 300: the rail top has moved up 300 on screen, offset is unchanged.
  assert.equal(railOffsetPx(-140, 100, 300), 60);
});

test("anchorScrollTop is the inverse of minuteUnderPoint", () => {
  const railOffset = 60;
  const minute = minuteUnderPoint(400, 200, railOffset, 0.8);
  assert.equal(minute, (400 + 200 - 60) / 0.8);
  assert.equal(anchorScrollTop(minute, 0.8, railOffset, 200), 400);
});

test("anchorScrollTop worked example: 2 PM stays under the fingers across 48 to 96", () => {
  // Rail offset 60, scrollTop 500, fingers at y=180 inside the scroller, 48px/hour.
  const railOffset = 60;
  const minute = minuteUnderPoint(500, 180, railOffset, 48 / 60); // (500+180-60)/0.8 = 775
  assert.equal(minute, 775);
  // Zoom to 96px/hour (1.6 px/min): 60 + 775*1.6 - 180 = 1120.
  assert.equal(anchorScrollTop(minute, 96 / 60, railOffset, 180), 1120);
  // Moving the midpoint to y=230 pans: the same minute now sits at 230: 1070.
  assert.equal(anchorScrollTop(minute, 96 / 60, railOffset, 230), 1070);
});

test("anchorScrollTop never goes negative", () => {
  assert.equal(anchorScrollTop(0, 1, 60, 300), 0);
});

test("showsTimeLine: 40px or taller always shows it", () => {
  assert.equal(showsTimeLine(40, 60), true);
  assert.equal(showsTimeLine(96, 120), true);
});

test("showsTimeLine: a 30-minute event at 48px/hour (24px) shows title only, as before", () => {
  assert.equal(showsTimeLine(24, 30), false);
});

test("showsTimeLine: a real 15-minute event shows the time only with 24px of room", () => {
  assert.equal(showsTimeLine(24, 15), true); // 48px/hour, today's behaviour
  assert.equal(showsTimeLine(23.9, 15), false);
  assert.equal(showsTimeLine(16, 15), false); // 32px/hour zoomed out: title only
});

test("showsTimeLine: zoomed out, a 45-minute event (24px at 32px/hour) is title only", () => {
  assert.equal(showsTimeLine(24, 45), false);
});

test("minHourHeightFor: the whole day fills the visible rail, never below 32", () => {
  assert.equal(minHourHeightFor(681), 32); // phone rail: 28.4 rounds up to the minimum
  assert.equal(minHourHeightFor(960), 40); // iPad rail
  assert.equal(minHourHeightFor(0), 32);
  assert.equal(minHourHeightFor(-50), 32);
  assert.equal(minHourHeightFor(NaN), 32);
});

test("the floor lifts clamp and pinch, and the cap stays 192", () => {
  assert.equal(clampHourHeight(32, 40), 40);
  assert.equal(clampHourHeight(300, 40), 192);
  assert.equal(pinchHourHeight(48, 100, 10, 40), 40); // pinching in stops at the floor
  assert.equal(pinchHourHeight(96, 100, 400, 40), 192);
});

test("titleFitsFullSize: 20px and up keeps the normal title", () => {
  assert.equal(titleFitsFullSize(19.9), false);
  assert.equal(titleFitsFullSize(20), true);
  assert.equal(titleFitsFullSize(16), false);
  assert.equal(titleFitsFullSize(24), true);
});

test("zoomTextScale: 1 up to 48, linear to the 1.5 ceiling at 192, clamped above", () => {
  assert.equal(ZOOM_TEXT_SCALE_MAX, 1.5);
  assert.equal(zoomTextScale(32), 1);
  assert.equal(zoomTextScale(48), 1);
  assert.equal(zoomTextScale(120), 1.25);
  assert.equal(zoomTextScale(192), 1.5);
  assert.equal(zoomTextScale(300), 1.5);
  assert.equal(zoomTextScale(Number.NaN), 1);
  assert.equal(zoomTextScale(Number.POSITIVE_INFINITY), 1);
  assert.ok(zoomTextScale(49) > 1 && zoomTextScale(191) < 1.5);
});

test("titleLineCount: whole lines that fit, never below one", () => {
  assert.equal(titleLineCount({ availablePx: 60, lineHeightPx: 15 }), 4);
  assert.equal(titleLineCount({ availablePx: 44, lineHeightPx: 15 }), 2);
  assert.equal(titleLineCount({ availablePx: 5, lineHeightPx: 15 }), 1);
  assert.equal(titleLineCount({ availablePx: -10, lineHeightPx: 15 }), 1);
  assert.equal(titleLineCount({ availablePx: 60, lineHeightPx: 0 }), 1);
  assert.equal(titleLineCount({ availablePx: 60, lineHeightPx: Number.NaN }), 1);
  assert.equal(titleLineCount({ availablePx: Number.NaN, lineHeightPx: 15 }), 1);
});

test("timeLineFits: one title line, one time line and padding must fit", () => {
  const rest = { titleLinePx: 16, timeLinePx: 14, paddingPx: 4 };
  assert.equal(timeLineFits({ heightPx: 34, ...rest }), true);
  assert.equal(timeLineFits({ heightPx: 33.9, ...rest }), false);
  assert.equal(timeLineFits({ heightPx: 24, ...rest }), false);
  assert.equal(timeLineFits({ heightPx: Number.NaN, ...rest }), false);
});
