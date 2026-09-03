// Real unit tests (node:test, zero new dependencies) for the Calendar
// branch's unbounded-navigation plumbing — mission-9 (K2), contract C6.
// Run with `npm test`.
//
// `periodWindowEdges`' own tests lived here until mission-10/CV0 (C1)
// deleted the function: it had gone two missions with no application
// caller, so it went with `calendarDates.ts`'s `canStepToPeriod`, which
// nothing else called either. The window-edge behaviour those tests
// described is not merely untested now — it no longer exists, because
// paging is unbounded and a day outside the fetch window renders honestly
// (`isOutsideWindow`, still live and still tested in calendarDates.test.ts)
// rather than being refused.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseDateParam,
  buildFetchWindow,
  resolveServerFetchWindow,
  CALENDAR_FETCH_WINDOW_DAYS,
} from "./calendarPaging";
import { addDays, toLocalDateString } from "./mealPlanDates";

function d(year: number, month: number, day: number): Date {
  return new Date(year, month, day);
}

// ---------------------------------------------------------------------------
// parseDateParam — semantic (round-trip) validation, not lexical (shape-only)

test("parseDateParam: a real date round-trips to the exact same components", () => {
  const parsed = parseDateParam("2026-09-02");
  assert.ok(parsed);
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 8); // September
  assert.equal(parsed.getDate(), 2);
});

test("parseDateParam: rejects a day that doesn't exist (2026-02-30), rather than rolling it over to Mar 2", () => {
  assert.equal(parseDateParam("2026-02-30"), null);
});

test("parseDateParam: rejects another rollover case (2026-04-31 — April has 30 days)", () => {
  assert.equal(parseDateParam("2026-04-31"), null);
});

test("parseDateParam: rejects malformed shapes and empty/missing input", () => {
  assert.equal(parseDateParam("2026-9-2"), null); // not zero-padded
  assert.equal(parseDateParam("09-02-2026"), null); // wrong order
  assert.equal(parseDateParam("2026/09/02"), null); // wrong separator
  assert.equal(parseDateParam(""), null);
  assert.equal(parseDateParam(undefined), null);
  assert.equal(parseDateParam(null), null);
});

test("parseDateParam: round trips through toLocalDateString exactly, both directions", () => {
  const original = "2026-11-01"; // the real US DST fall-back date
  const parsed = parseDateParam(original);
  assert.ok(parsed);
  assert.equal(toLocalDateString(parsed), original);
});

// ---------------------------------------------------------------------------
// buildFetchWindow / resolveServerFetchWindow — the fetch window is a RANGE

test("buildFetchWindow: pads CALENDAR_FETCH_WINDOW_DAYS + 1 (the tz-skew pad) on each side", () => {
  const anchor = d(2026, 8, 2); // Sep 2, 2026
  const { windowStart, windowEnd } = buildFetchWindow(anchor);
  const expectedStart = addDays(anchor, -(CALENDAR_FETCH_WINDOW_DAYS + 1));
  const expectedEnd = addDays(anchor, CALENDAR_FETCH_WINDOW_DAYS + 1);
  assert.equal(windowStart.getTime(), expectedStart.getTime());
  assert.equal(windowEnd.getTime(), expectedEnd.getTime());
});

test("buildFetchWindow: fully contains the anchor day itself", () => {
  const anchor = d(2026, 8, 2);
  const { windowStart, windowEnd } = buildFetchWindow(anchor);
  assert.ok(anchor.getTime() >= windowStart.getTime());
  assert.ok(anchor.getTime() <= windowEnd.getTime());
});

test("resolveServerFetchWindow: a valid ?date= centers the window on THAT day, not on serverNow", () => {
  const serverNow = d(2026, 0, 1); // Jan 1, 2026 — nowhere near the param below
  const { windowStart, windowEnd } = resolveServerFetchWindow("2027-06-15", serverNow);
  const expected = buildFetchWindow(d(2027, 5, 15));
  assert.equal(windowStart.getTime(), expected.windowStart.getTime());
  assert.equal(windowEnd.getTime(), expected.windowEnd.getTime());
});

test("resolveServerFetchWindow: missing/invalid ?date= falls back to the server's own clock (pre-C6 behavior)", () => {
  const serverNow = d(2026, 3, 10); // Apr 10, 2026
  const missing = resolveServerFetchWindow(undefined, serverNow);
  const invalid = resolveServerFetchWindow("2026-02-30", serverNow);
  const expected = buildFetchWindow(serverNow);
  assert.equal(missing.windowStart.getTime(), expected.windowStart.getTime());
  assert.equal(missing.windowEnd.getTime(), expected.windowEnd.getTime());
  assert.equal(invalid.windowStart.getTime(), expected.windowStart.getTime());
  assert.equal(invalid.windowEnd.getTime(), expected.windowEnd.getTime());
});
