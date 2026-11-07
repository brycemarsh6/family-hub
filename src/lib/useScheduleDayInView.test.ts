// Real unit tests for the pure kernel behind the wide Schedule's mini-month
// ring (mission-46/C3). The hook's DOM reads have no meaning against a fake
// node with no layout, same as useScheduleMonthTitle.ts. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { topmostVisibleDay, type DayTop } from "./useScheduleDayInView";

const REVEAL_LINE_Y = 227;

test("topmostVisibleDay: returns the LAST day whose top is at or above the line", () => {
  const tops: DayTop[] = [
    { day: 1, top: -300 },
    { day: 2, top: 100 },
    { day: 3, top: 227 },
    { day: 4, top: 400 },
  ];
  assert.equal(topmostVisibleDay(tops, REVEAL_LINE_Y), 3);
});

test("topmostVisibleDay: no day has cleared the line returns the first loaded day", () => {
  const tops: DayTop[] = [
    { day: 1, top: 300 },
    { day: 2, top: 600 },
  ];
  assert.equal(topmostVisibleDay(tops, REVEAL_LINE_Y), 1);
});

test("topmostVisibleDay: a null top is skipped, never ends the scan", () => {
  const tops: DayTop[] = [
    { day: 1, top: null },
    { day: 2, top: null },
    { day: 3, top: 50 },
    { day: 4, top: null },
    { day: 5, top: 900 },
  ];
  assert.equal(topmostVisibleDay(tops, REVEAL_LINE_Y), 3);
});

test("topmostVisibleDay: the first loaded day skips leading null tops", () => {
  const tops: DayTop[] = [
    { day: 1, top: null },
    { day: 2, top: 500 },
  ];
  assert.equal(topmostVisibleDay(tops, REVEAL_LINE_Y), 2);
});

test("topmostVisibleDay: nothing loaded returns null", () => {
  assert.equal(topmostVisibleDay([], REVEAL_LINE_Y), null);
  assert.equal(topmostVisibleDay([{ day: 1, top: null }], REVEAL_LINE_Y), null);
});
