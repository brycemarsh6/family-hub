// Real unit tests (node:test, zero new dependencies) for useNowMinute.ts's
// one piece of real arithmetic — mission-17 (CV4), contract C2. The hook
// itself (`useNowMinute`) is a thin useSyncExternalStore wrapper with no
// arithmetic of its own (same split useCalendarPeriod.test.ts's own header
// describes), so this file tests the exported pure function,
// `nowMinuteTimestamp`, headlessly — no React, no fake timers, no DOM.
//
// Run with `npm test`. No timezone dependency at all: this is plain
// millisecond flooring against a fixed epoch, not calendar-component
// arithmetic — see nowMinuteTimestamp's own header comment for why this is
// NOT one of this codebase's "never do date math with milliseconds" cases.
// A minute is exactly 60 real seconds in every zone, DST or not, so these
// assertions hold identically under TZ=America/Denver, TZ=UTC, and
// TZ=America/Los_Angeles — confirmed by running this file directly under
// all three (see the gauntlet's direct TZ=UTC / TZ=America/Los_Angeles
// legs).

import { test } from "node:test";
import assert from "node:assert/strict";
import { nowMinuteTimestamp } from "./useNowMinute";

const MINUTE_MS = 60_000;

test("floors to the start of the current minute", () => {
  // 2026-01-15T12:34:56.789Z — well inside its own minute, not on a
  // boundary, so a naive implementation that rounds instead of floors
  // would fail this one.
  const raw = Date.UTC(2026, 0, 15, 12, 34, 56, 789);
  const expected = Date.UTC(2026, 0, 15, 12, 34, 0, 0);
  assert.equal(nowMinuteTimestamp(raw), expected);
});

test("a timestamp already exactly on a minute boundary is unchanged", () => {
  const raw = Date.UTC(2026, 0, 15, 12, 34, 0, 0);
  assert.equal(nowMinuteTimestamp(raw), raw);
});

test("one millisecond before the next minute still floors to the CURRENT minute", () => {
  const raw = Date.UTC(2026, 0, 15, 12, 34, 59, 999);
  const expected = Date.UTC(2026, 0, 15, 12, 34, 0, 0);
  assert.equal(nowMinuteTimestamp(raw), expected);
});

test("one millisecond into the next minute floors to THAT minute, not the previous one", () => {
  const raw = Date.UTC(2026, 0, 15, 12, 35, 0, 1);
  const expected = Date.UTC(2026, 0, 15, 12, 35, 0, 0);
  assert.equal(nowMinuteTimestamp(raw), expected);
});

test("crossing an hour boundary floors correctly", () => {
  const raw = Date.UTC(2026, 0, 15, 12, 59, 59, 999);
  const expected = Date.UTC(2026, 0, 15, 12, 59, 0, 0);
  assert.equal(nowMinuteTimestamp(raw), expected);
});

test("crossing a calendar-day boundary floors correctly (plain ms math, no calendar concept involved)", () => {
  const raw = Date.UTC(2026, 0, 15, 23, 59, 59, 999);
  const expected = Date.UTC(2026, 0, 15, 23, 59, 0, 0);
  assert.equal(nowMinuteTimestamp(raw), expected);
});

test("idempotent: flooring an already-floored timestamp a second time is a no-op", () => {
  const once = nowMinuteTimestamp(Date.UTC(2026, 0, 15, 12, 34, 56, 789));
  const twice = nowMinuteTimestamp(once);
  assert.equal(twice, once);
});

test("epoch zero floors to itself", () => {
  assert.equal(nowMinuteTimestamp(0), 0);
});

test("every millisecond in a sample minute floors to the same value", () => {
  const minuteStart = Date.UTC(2026, 5, 1, 8, 15, 0, 0);
  for (const offsetMs of [0, 1, 500, 30_000, 59_999]) {
    assert.equal(
      nowMinuteTimestamp(minuteStart + offsetMs),
      minuteStart,
      `offset ${offsetMs}ms into the minute should still floor to its start`,
    );
  }
  // And the very next millisecond (the following minute's first) must NOT
  // floor to the same value — this is what actually proves flooring is
  // happening, rather than e.g. a no-op that always returns its input.
  assert.notEqual(nowMinuteTimestamp(minuteStart + MINUTE_MS), minuteStart);
});
