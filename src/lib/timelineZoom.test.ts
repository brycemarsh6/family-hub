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
  locationLineFits,
  blockTextFit,
  TITLE_LINE_REM,
  COMPACT_NARROW_TITLE_LINE_REM,
  SMALL_TITLE_LINE_REM,
  SMALL_TITLE_LINE_MAX_PX,
  TIME_LINE_REM,
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

test("locationLineFits: title, time (when shown) and location lines must all fit", () => {
  const rest = { titleLinePx: 15, timeLinePx: 11.25 };
  assert.equal(locationLineFits({ heightPx: 37.5, timeShown: true, ...rest }), true);
  assert.equal(locationLineFits({ heightPx: 37.4, timeShown: true, ...rest }), false);
  assert.equal(locationLineFits({ heightPx: 26.25, timeShown: false, ...rest }), true);
  assert.equal(locationLineFits({ heightPx: 26.2, timeShown: false, ...rest }), false);
  assert.equal(locationLineFits({ heightPx: Number.NaN, timeShown: false, ...rest }), false);
});

test("locationLineFits: iPad Largest (root 24), 30 min at 150px/h with a location, worked through", () => {
  // heightPx 75, drawn 73, content 71. Scale 1 + (150-48)/144*0.5 = 1.354.
  const scale = zoomTextScale(150);
  const title = 0.9375 * 24 * scale; // 30.5
  const time = 0.703125 * 24 * scale; // 22.8
  // 30.5 + 22.8 + 22.8 = 76.1 > 71: the location line must not show.
  assert.equal(locationLineFits({ heightPx: 71, titleLinePx: title, timeLinePx: time, timeShown: true }), false);
});

test("blockTextFit: the small tier line is capped at 12px even at Largest", () => {
  // Root 24 at scale 1: 0.75rem is 18px, but the tier holds 12px, so a 30 minute
  // block at 32px an hour (content 12px) still fits its one title line.
  const fit = blockTextFit({ heightPx: 16, trueDurationMinutes: 30, rootPx: 24, scale: 1, compact: false, hasLocation: false });
  assert.equal(fit.tier, "small");
  assert.equal(fit.titleLines, 1);
  assert.equal(fit.timeShown, false);
});

test("blockTextFit: a compact column under 128px reserves no room for the hidden time line", () => {
  // 40px block, root 16, scale 1: content 36. Wide: 15 + 11.25 time = one line.
  // Narrow: no time line, 12.5px lines, so two whole lines.
  const fit = blockTextFit({ heightPx: 40, trueDurationMinutes: 60, rootPx: 16, scale: 1, compact: true, hasLocation: false });
  assert.equal(fit.timeShown, true);
  assert.equal(fit.titleLines, 1);
  assert.equal(fit.titleLinesNarrow, 2);
  const day = blockTextFit({ heightPx: 40, trueDurationMinutes: 60, rootPx: 16, scale: 1, compact: false, hasLocation: false });
  assert.equal(day.titleLinesNarrow, day.titleLines);
});

test("blockTextFit: at Normal and 48px an hour a 60 minute Day block keeps today's answer", () => {
  const fit = blockTextFit({ heightPx: 48, trueDurationMinutes: 60, rootPx: 16, scale: 1, compact: false, hasLocation: true });
  assert.deepEqual(fit, { tier: "full", titleLines: 2, titleLinesNarrow: 2, timeShown: true, locationShown: false });
});

test("blockTextFit grid: lines x line + time + location always fit the content box", () => {
  let cases = 0;
  for (const rootPx of [16, 17.6, 21.6, 24]) {
    for (let hourHeight = 32; hourHeight <= 192; hourHeight += 1) {
      const scale = zoomTextScale(hourHeight);
      for (let duration = 15; duration <= 120; duration += 5) {
        const heightPx = (Math.max(duration, 30) * hourHeight) / 60; // padded up to 30 minutes
        const contentPx = Math.max(0, heightPx - 2) - 2;
        for (const hasLocation of [false, true]) {
          for (const compact of [false, true]) {
            cases++;
            const fit = blockTextFit({ heightPx, trueDurationMinutes: duration, rootPx, scale, compact, hasLocation });
            const label = `root ${rootPx} hour ${hourHeight} min ${duration} loc ${hasLocation} compact ${compact}`;
            const timePx = TIME_LINE_REM * rootPx * scale;
            const smallPx = Math.min(SMALL_TITLE_LINE_REM * rootPx * scale, SMALL_TITLE_LINE_MAX_PX);
            const widePx = fit.tier === "small" ? smallPx : TITLE_LINE_REM * rootPx * scale;
            const narrowPx = fit.tier === "small" ? smallPx : COMPACT_NARROW_TITLE_LINE_REM * rootPx * scale;
            assert.ok(fit.titleLines >= 1 && fit.titleLinesNarrow >= 1, `lines >= 1: ${label}`);
            const wide = fit.titleLines * widePx + (fit.timeShown ? timePx : 0) + (fit.locationShown ? timePx : 0);
            assert.ok(wide <= contentPx + 1e-9, `wide fits: ${label} used ${wide} of ${contentPx}`);
            // Narrow compact: the time line is hidden by CSS, location never shows when compact.
            const narrow = fit.titleLinesNarrow * narrowPx;
            assert.ok(narrow <= contentPx + 1e-9, `narrow fits: ${label} used ${narrow} of ${contentPx}`);
            if (compact) assert.equal(fit.locationShown, false, label);
          }
        }
      }
    }
  }
  assert.equal(cases, 4 * 161 * 22 * 2 * 2);
});
