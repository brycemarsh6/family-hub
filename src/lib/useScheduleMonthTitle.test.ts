// Real unit tests (node:test, zero new dependencies) for the pure kernel
// behind the Schedule view's pinned month title — mission-16/C10. Both
// Vision and Captain filed this independently at C9's gate: the decision
// "of these months, which one has genuinely cleared the reveal line" is
// pure over `(tops, revealLineY)`, but shipped unexported and untested in a
// directory `npm test` already reaches — the exact CV3 `VIEW_CONFIG` lesson
// (CLAUDE.md) repeated verbatim. The REST of useScheduleMonthTitle.ts (the
// portal, the scroll/resize subscription, the render-loop guard) still has
// no test file here, for the reason its own header states: it has no
// meaning against a fake DOM node with no layout. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { topmostClearedMonth, type MonthTop } from "./useScheduleMonthTitle";

const REVEAL_LINE_Y = 227;

function d(year: number, month: number, day: number): Date {
  return new Date(year, month, day);
}

test("topmostClearedMonth: no month has cleared the line yet returns null", () => {
  const tops: MonthTop[] = [
    { monthStart: d(2026, 8, 1), top: 400 },
    { monthStart: d(2026, 9, 1), top: 900 },
  ];
  assert.equal(topmostClearedMonth(tops, REVEAL_LINE_Y), null);
});

test("topmostClearedMonth: returns the LAST month whose top has cleared the line", () => {
  const tops: MonthTop[] = [
    { monthStart: d(2026, 7, 1), top: -500 },
    { monthStart: d(2026, 8, 1), top: 10 },
    { monthStart: d(2026, 9, 1), top: 900 },
  ];
  const result = topmostClearedMonth(tops, REVEAL_LINE_Y);
  assert.equal(result?.getTime(), d(2026, 8, 1).getTime());
});

test("topmostClearedMonth: a top exactly ON the reveal line counts as cleared", () => {
  // The hook's own `break` condition is `top > revealLineY` — so a top
  // exactly equal to the line is NOT greater, and must still count.
  const tops: MonthTop[] = [{ monthStart: d(2026, 8, 1), top: REVEAL_LINE_Y }];
  const result = topmostClearedMonth(tops, REVEAL_LINE_Y);
  assert.equal(result?.getTime(), d(2026, 8, 1).getTime());
});

test("topmostClearedMonth: `continue`s past a missing top rather than stopping the scan", () => {
  // A month with no rendered node yet (`top: null` — out of the currently-
  // loaded window) must not freeze the scan on whatever came before it: a
  // LATER month that DOES have a node and HAS cleared the line must still
  // win. This is the exact bug class `break` on a missing node would cause.
  const tops: MonthTop[] = [
    { monthStart: d(2026, 7, 1), top: -500 },
    { monthStart: d(2026, 8, 1), top: null },
    { monthStart: d(2026, 9, 1), top: 10 },
  ];
  const result = topmostClearedMonth(tops, REVEAL_LINE_Y);
  assert.equal(result?.getTime(), d(2026, 9, 1).getTime());
});

test("topmostClearedMonth: an all-missing list returns null", () => {
  const tops: MonthTop[] = [
    { monthStart: d(2026, 8, 1), top: null },
    { monthStart: d(2026, 9, 1), top: null },
  ];
  assert.equal(topmostClearedMonth(tops, REVEAL_LINE_Y), null);
});

test("topmostClearedMonth: `break` relies on DOM-order monotonicity — an out-of-order list can stop early", () => {
  // The function assumes its CALLER hands tops in chronological/DOM order,
  // where a later month's top can never be higher on screen than an
  // earlier one's. This test doesn't validate that assumption (the
  // function has no way to) — it documents what happens if it's violated:
  // an EARLIER entry that hasn't cleared the line stops the scan before an
  // out-of-order LATER entry that would have. If this test ever starts
  // failing, something changed the `break` into a scan that no longer
  // depends on ordering — worth knowing, not necessarily wrong, but this
  // function's real callers (this hook's own `syncVisibleMonth`) rely on
  // exactly this short-circuit for its performance story ("a handful of
  // nodes per scroll frame," not the whole loaded window every time).
  const outOfOrderTops: MonthTop[] = [
    { monthStart: d(2026, 9, 1), top: 900 }, // hasn't cleared — triggers break
    { monthStart: d(2026, 8, 1), top: 10 }, // would have cleared, never reached
  ];
  assert.equal(topmostClearedMonth(outOfOrderTops, REVEAL_LINE_Y), null);
});

test("topmostClearedMonth: an empty list returns null", () => {
  assert.equal(topmostClearedMonth([], REVEAL_LINE_Y), null);
});
