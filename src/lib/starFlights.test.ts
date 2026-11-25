// Pins starFlights.ts: what a tap pays, through the real reducer and the one pay rule.

import { test } from "node:test";
import assert from "node:assert/strict";
import { starPayments } from "./starFlights";
import type { HabitMemberState, HabitRowState } from "./habitChanges";
import type { StarDiffRow } from "./rewards/starDiff";

type R = HabitRowState & StarDiffRow;
const members = (...flags: [string, boolean][]): HabitMemberState[] => flags.map(([userId, done]) => ({ userId, done, skipped: false }));
const CARRIED = { year: 2026, month: 11, day: 23 };

function row(over: Partial<R> & { id: string }): R {
  return {
    sharing: "each",
    viewerId: "a",
    doneToday: false,
    skippedToday: false,
    carriedFrom: null,
    dueState: "required",
    stars: 4,
    participants: members(["a", false], ["b", false]),
    ...over,
  };
}

test("a check pays the habit's value to the person who checked", () => {
  assert.deepEqual(starPayments([row({ id: "h" })], { type: "check", habitId: "h", userId: "b" }, "full"), { b: 4 });
});

test("an uncheck is negative", () => {
  const done = row({ id: "h", doneToday: true, participants: members(["a", true], ["b", false]) });
  assert.deepEqual(starPayments([done], { type: "uncheck", habitId: "h" }, "full"), { a: -4 });
});

test("a Together habit pays every participant who flips", () => {
  const together = row({ id: "t", sharing: "together", stars: 2, participants: members(["a", false], ["b", false], ["c", true]) });
  assert.deepEqual(starPayments([together], { type: "check", habitId: "t" }, "full"), { a: 2, b: 2 });
});

test("a carried row under Half pays half rounded up", () => {
  const carried = row({ id: "c", stars: 5, carriedFrom: CARRIED, viewerId: "a" });
  assert.deepEqual(starPayments([carried], { type: "check", habitId: "c", userId: "a" }, "half"), { a: 3 });
});

test("a carried row under None pays nothing", () => {
  const carried = row({ id: "c", carriedFrom: CARRIED });
  assert.deepEqual(starPayments([carried], { type: "check", habitId: "c", userId: "a" }, "none"), {});
});

test("a skip pays nothing", () => {
  assert.deepEqual(starPayments([row({ id: "h" })], { type: "skip", habitId: "h", userId: "a" }, "full"), {});
});

test("a habit with no stars, or 0 stars, pays nothing", () => {
  assert.deepEqual(starPayments([row({ id: "h", stars: null })], { type: "check", habitId: "h", userId: "a" }, "full"), {});
  assert.deepEqual(starPayments([row({ id: "h", stars: 0 })], { type: "check", habitId: "h", userId: "a" }, "full"), {});
});

test("a change to another habit pays nothing", () => {
  assert.deepEqual(starPayments([row({ id: "h" })], { type: "check", habitId: "other", userId: "a" }, "full"), {});
});
