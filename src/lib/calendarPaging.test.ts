// Real unit tests (node:test, zero new dependencies) for the Calendar
// branch's unbounded-navigation plumbing — mission-9 (K2), contract C6.
// Run with `npm test`.
//
// The `periodWindowEdges` tests below are the red-then-green ones this
// contract requires: before this file (and calendarPaging.ts) existed,
// `import { periodWindowEdges } from "./calendarPaging"` failed outright
// — `npm test` reported the whole suite red (module not found). Stark's
// C6 report pastes that exact transcript, taken before this file was
// created, next to the green run taken after. What the tests THEMSELVES
// prove, once they run at all, is stronger than "the import resolves":
// each of the two invariants is checked against a scenario where the
// NAIVE version of the predicate (no direction/skew awareness — just
// `!canStepToPeriod(candidateEdgeDay, windowStart, windowEnd)`, which is
// literally what `calendarDates.ts` exports on its own) gets the wrong
// answer, so the guard is shown to be load-bearing, not decorative.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseDateParam,
  buildFetchWindow,
  resolveServerFetchWindow,
  periodWindowEdges,
  CALENDAR_FETCH_WINDOW_DAYS,
} from "./calendarPaging";
import { canStepToPeriod } from "./calendarDates";
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

// ---------------------------------------------------------------------------
// periodWindowEdges — red-then-green for the two invariants named in the
// contract. See this file's own header for what "red" meant here: before
// this module existed, every test below failed on the import alone.

test("[proves the guard is necessary] the RAW predicate alone, with no direction awareness, WOULD block a step toward today", () => {
  // Same narrow window every test in this block reuses: Jul 1 - Jul 10.
  const windowStart = d(2026, 6, 1);
  const windowEnd = d(2026, 6, 10);
  const nextPeriodStart = d(2026, 6, 11); // one day past windowEnd
  assert.equal(
    canStepToPeriod(nextPeriodStart, windowStart, windowEnd),
    false,
    "sanity check: calendarDates.ts's own predicate, used alone with no " +
      "direction-of-travel awareness, says this candidate day is NOT loaded",
  );
});

test("periodWindowEdges: C7 direction-of-travel — a step TOWARD today is never flagged, even at a narrow window's edge", () => {
  const windowStart = d(2026, 6, 1);
  const windowEnd = d(2026, 6, 10);
  // today is well past the window — anchor is in the "past" relative to
  // today, so stepping FORWARD moves toward today, not away from it.
  const today = d(2026, 6, 20);
  const anchor = d(2026, 6, 10); // anchored right at windowEnd
  const edges = periodWindowEdges({ view: "day", anchor, weekStart: null, today, windowStart, windowEnd });
  assert.equal(
    edges.atWindowEnd,
    false,
    "stepping forward (toward today) must never be flagged, even though the " +
      "candidate day (Jul 11) is genuinely outside the loaded window — the " +
      "previous test proves the raw predicate alone WOULD have said otherwise",
  );
});

test("periodWindowEdges: C7 direction-of-travel, the symmetric backward case", () => {
  const windowStart = d(2026, 6, 1);
  const windowEnd = d(2026, 6, 10);
  // today is well BEFORE the window this time — anchor is in the
  // "future" relative to today, so stepping BACKWARD moves toward today.
  const today = d(2026, 5, 20);
  const anchor = d(2026, 6, 1); // anchored right at windowStart
  const edges = periodWindowEdges({ view: "day", anchor, weekStart: null, today, windowStart, windowEnd });
  assert.equal(
    edges.atWindowStart,
    false,
    "stepping backward (toward today) must never be flagged, even though " +
      "the candidate day (Jun 30) is genuinely outside the loaded window",
  );
});

test("periodWindowEdges: Vision pass-3 skewed clock — a device clock stuck BEFORE the window never blocks the forward arrow", () => {
  const windowStart = d(2026, 6, 1);
  const windowEnd = d(2026, 6, 10);
  // The device clock itself is skewed, sitting before the loaded window —
  // anchor === today, as it would be right when the app opens.
  const today = d(2026, 5, 1);
  const anchor = today;

  // What the formula would compute WITHOUT the anchorBeforeWindow guard —
  // reproduced by hand to prove the guard is load-bearing, not decorative.
  const nextPeriodStart = addDays(anchor, 1);
  const naiveWouldBlock =
    today !== null &&
    nextPeriodStart.getTime() > today.getTime() &&
    !canStepToPeriod(nextPeriodStart, windowStart, windowEnd);
  assert.equal(
    naiveWouldBlock,
    true,
    "sanity check: without the skewed-clock guard, this scenario reads as " +
      "'stepping forward moves away from today AND lands outside the " +
      "window', which would incorrectly block the ONLY direction that " +
      "actually leads toward real data",
  );

  const edges = periodWindowEdges({ view: "day", anchor, weekStart: null, today, windowStart, windowEnd });
  assert.equal(
    edges.atWindowEnd,
    false,
    "the real function must not block it: anchorBeforeWindow overrides the " +
      "naive direction check above",
  );
});

test("periodWindowEdges: Vision pass-3 skewed clock, the symmetric AFTER-window case", () => {
  const windowStart = d(2026, 6, 1);
  const windowEnd = d(2026, 6, 10);
  const today = d(2026, 7, 1); // skewed clock, sitting after the window
  const anchor = today;

  const previousPeriodEnd = addDays(anchor, -1);
  const naiveWouldBlock =
    today !== null &&
    previousPeriodEnd.getTime() < today.getTime() &&
    !canStepToPeriod(previousPeriodEnd, windowStart, windowEnd);
  assert.equal(naiveWouldBlock, true, "sanity check: the naive formula would block the only useful direction");

  const edges = periodWindowEdges({ view: "day", anchor, weekStart: null, today, windowStart, windowEnd });
  assert.equal(edges.atWindowStart, false, "anchorAfterWindow must override the naive direction check");
});

test("periodWindowEdges: a period fully inside a wide window is never flagged in either direction (the ordinary case)", () => {
  const windowStart = d(2026, 0, 1);
  const windowEnd = d(2026, 11, 31);
  const today = d(2026, 5, 15);
  const anchor = d(2026, 5, 15);
  const edges = periodWindowEdges({ view: "week", anchor, weekStart: d(2026, 5, 14), today, windowStart, windowEnd });
  assert.equal(edges.atWindowStart, false);
  assert.equal(edges.atWindowEnd, false);
});

test("periodWindowEdges: month view uses the 1st of next month / last day of previous month as its own edges", () => {
  const windowStart = d(2026, 6, 1);
  const windowEnd = d(2026, 6, 10); // narrow window, entirely inside July
  const today = d(2026, 6, 20); // Jul 20 — AFTER the next period's own edge
  const anchor = d(2026, 6, 5); // July 5 — Month view
  const edges = periodWindowEdges({ view: "month", anchor, weekStart: null, today, windowStart, windowEnd });
  // Next period's near edge is Aug 1: outside the narrow window AND after
  // today (Aug 1 > Jul 20), so stepping forward moves AWAY from today —
  // this is the genuine "real edge" case, correctly flagged.
  assert.equal(edges.atWindowEnd, true, "Aug 1 is both outside the window and past today: a real edge");
});
