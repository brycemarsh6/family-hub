// Unit tests for the push-guard rule inside useCalendarNavigation —
// mission-10/CV0, contract C1. The hook itself needs a renderer, but the
// part that has actually been wrong twice (C8's counter drifted; C9 removed
// it) is a pure reconciliation over strings, so it lives as an exported
// function and is tested here without React.
//
// What each case pins is the failure the counter version had: a URL that is
// one of our own late-arriving pushes must NOT re-point the cursor, and
// nothing may be left behind afterwards that could swallow a later Back.
//
// WHAT THESE CASES STRUCTURALLY CANNOT SEE, so nobody reads a green run as
// more than it is: every one of them assumes the reconciliation RAN. The
// blocker mission-10's C4 fixed was that it doesn't — two fast taps in
// opposite directions leave the URL's params unchanged, so the effect keyed
// on those params never fires, and a correct answer nobody asks for is worth
// nothing. That failure lives in effect scheduling, not in this function, and
// the fix for it (the settle effect, keyed on a `useTransition` pending flag)
// needs a router and a real navigation to exercise. It is verified in the
// running app instead — the reproduction and its before/after are recorded in
// the C4 contract — and this file deliberately does not pretend to cover it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { consumePushedSearch } from "./useCalendarNavigation";

const S0 = "date=2026-09-02&view=week";
const S1 = "date=2026-09-09&view=week";
const S2 = "date=2026-09-16&view=week";

test("consumePushedSearch: with nothing in flight, any URL is external", () => {
  const { ours, remaining } = consumePushedSearch([], S1);
  assert.equal(ours, false);
  assert.deepEqual(remaining, []);
});

test("consumePushedSearch: the double-tap case — the FIRST push landing while a second is in flight is ours, and the second stays pending", () => {
  const { ours, remaining } = consumePushedSearch([S1, S2], S1);
  assert.equal(ours, true, "the cursor must not be re-pointed back to S1: state is already at S2");
  assert.deepEqual(remaining, [S2], "S2 hasn't landed yet, so it must stay pending");
});

test("consumePushedSearch: the last of several pushes landing consumes every older one with it", () => {
  const { ours, remaining } = consumePushedSearch([S0, S1, S2], S2);
  assert.equal(ours, true);
  assert.deepEqual(
    remaining,
    [],
    "S0/S1 were superseded by S2 and can never legitimately match a later URL — " +
      "leaving them behind is exactly what would let a stale entry swallow a Back",
  );
});

test("consumePushedSearch: an external navigation (Back/Forward, a deep link) discards everything in flight", () => {
  const { ours, remaining } = consumePushedSearch([S1, S2], S0);
  assert.equal(ours, false, "S0 is nobody's push, so the cursor must follow the URL");
  assert.deepEqual(remaining, []);
});

test("consumePushedSearch: a Back to a search we pushed EARLIER and already consumed is treated as external", () => {
  // The realistic sequence: we pushed S1, it landed and was consumed (list
  // emptied), the user later pressed Back onto S1 again. Nothing is in
  // flight, so it must re-point the cursor rather than be skipped.
  const { ours, remaining } = consumePushedSearch([], S1);
  assert.equal(ours, false);
  assert.deepEqual(remaining, []);
});

test("consumePushedSearch: never mutates the list it was given", () => {
  const pushed = [S1, S2];
  consumePushedSearch(pushed, S1);
  assert.deepEqual(pushed, [S1, S2]);
});
