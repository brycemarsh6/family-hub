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
import { consumePushedSearch, freezeFallbackView } from "./useCalendarNavigation";

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

// ---------------------------------------------------------------------------
// freezeFallbackView — mission-11/C3, the fix for Vision's pass-1 blocker.
//
// The hook read this device's stored view preference LIVE on every render, so
// a Back to a URL naming no built view (a bare "/calendar" — the one
// HUB_NAV_ITEMS links to — or a "?view=year") re-resolved it through the
// preference the picker tap being undone had just written. Back appeared to
// do nothing. What these cases pin is the one property that fixes it: once
// decided, the answer does not move, no matter what the store says later.
//
// WHAT THEY STRUCTURALLY CANNOT SEE, so nobody reads a green run as more than
// it is: that the hook calls this once per render with the ref it stores the
// result in, and that `todayResolved` is really the render the localStorage
// read resolves on. Both are wiring, need a renderer and a real popstate, and
// are verified in the running app instead — base-vs-HEAD transcripts of all
// three of Vision's scenarios are recorded in the C3 contract.

test("freezeFallbackView: nothing is frozen before `today` resolves — that render would freeze the ABSENCE of a preference", () => {
  assert.equal(freezeFallbackView(null, false, null, "week"), null);
  assert.equal(
    freezeFallbackView(null, false, "month", "week"),
    null,
    "even a readable store waits: on that render the URL parse has nothing to reconcile yet",
  );
});

test("freezeFallbackView: at first resolution it takes the stored preference", () => {
  assert.equal(freezeFallbackView(null, true, "month", "week"), "month");
});

test("freezeFallbackView: at first resolution with nothing stored it takes the default", () => {
  assert.equal(freezeFallbackView(null, true, null, "week"), "week");
});

test("freezeFallbackView: THE BLOCKER — a later write cannot move an already-frozen answer", () => {
  // The exact sequence: opened on a bare "/calendar" with nothing stored
  // (frozen "week"), then the picker tap that wrote "month" re-renders.
  assert.equal(
    freezeFallbackView("week", true, "month", "week"),
    "week",
    "Back to the bare URL must resolve to what that URL meant at open, not to the tap being undone",
  );
  // And the cross-tab case, which is the same call: another tab's write is
  // just as much a later write as this tab's own.
  assert.equal(freezeFallbackView("week", true, "day", "week"), "week");
});

test("freezeFallbackView: freezing to the same value as the default is still frozen, not undecided", () => {
  // The trap a `?? defaultView` guard would fall into: "week" frozen because
  // nothing was stored must NOT re-open the question once "month" is written.
  assert.equal(freezeFallbackView("week", true, "month", "week"), "week");
});

test("freezeFallbackView: a frozen answer survives `today` going unresolved again", () => {
  assert.equal(freezeFallbackView("month", false, null, "week"), "month");
});
