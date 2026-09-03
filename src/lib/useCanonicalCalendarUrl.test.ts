// Unit tests for `canonicalSearchFor` — mission-11/C4, the fix for Vision's
// pass-2 blocker. What they pin is the rule's shape, not its wiring: which
// URLs are ambiguous, which are already honest, and exactly what an ambiguous
// one is rewritten to.
//
// WHAT THEY STRUCTURALLY CANNOT SEE, so nobody reads a green run as more than
// it is. Three things, all of which need a router and a real popstate:
//   - that the effect runs LAST, after the two the hook already had, so the
//     write lands on a URL both have finished reading;
//   - that `window.history.replaceState` adds no history entry and costs no
//     server GET on a "force-dynamic" page;
//   - that a rewritten entry still reads back correctly after a reload or a
//     cross-branch Back — which is the entire point of the change.
// All three are verified in the running app instead; the base-vs-fixed
// transcripts and the GET count are recorded in the C4 contract.

import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalSearchFor } from "./useCanonicalCalendarUrl";

const WEEK = { view: "week", anchor: new Date(2026, 8, 3) } as const;
const MONTH = { view: "month", anchor: new Date(2026, 8, 3) } as const;

test("canonicalSearchFor: nothing is written before `today` resolves — there is no answer yet", () => {
  assert.equal(canonicalSearchFor(null, null), null);
  assert.equal(canonicalSearchFor("year", null), null);
});

test("canonicalSearchFor: a URL already naming a built view is left completely alone", () => {
  // The common case by far, and the one that must stay free: every URL this
  // hook itself pushes names a built view, so a push can never trigger a
  // rewrite of its own arrival.
  for (const built of ["day", "week", "month"]) {
    assert.equal(canonicalSearchFor(built, WEEK), null, `${built} needs no rewrite`);
  }
});

test("canonicalSearchFor: THE BLOCKER — a bare '/calendar' is rewritten to the view it resolved to", () => {
  // The URL HUB_NAV_ITEMS links to. Its meaning came from the stored
  // preference; writing that meaning down is what stops a later picker tap
  // from changing what the entry means when Back returns to it.
  assert.equal(canonicalSearchFor(null, MONTH), "date=2026-09-03&view=month");
  assert.equal(canonicalSearchFor(null, WEEK), "date=2026-09-03&view=week");
});

test("canonicalSearchFor: an unbuilt view name is rewritten too, not just a missing one", () => {
  // "?view=year" is a real name with no renderer (BUILT_VIEWS) — a bookmark
  // from a future build, or a phone running ahead of this deploy. It resolves
  // through the same preference a bare URL does, so it is ambiguous the same
  // way and is made honest rather than left saying "year" over a Week screen.
  assert.equal(canonicalSearchFor("year", WEEK), "date=2026-09-03&view=week");
  assert.equal(canonicalSearchFor("schedule", MONTH), "date=2026-09-03&view=month");
  assert.equal(canonicalSearchFor("threeDay", WEEK), "date=2026-09-03&view=week");
});

test("canonicalSearchFor: garbage and prototype-chain names are rewritten, never trusted", () => {
  for (const junk of ["", " week", "week\n", "WEEK", "Day", "toString", "__proto__", "constructor"]) {
    assert.equal(
      canonicalSearchFor(junk, WEEK),
      "date=2026-09-03&view=week",
      `${JSON.stringify(junk)} names no built view, so the URL must be corrected`,
    );
  }
});

test("canonicalSearchFor: the rewrite always pins the date as well as the view", () => {
  // Not because a missing "?date=" is ambiguous — it resolves through `today`,
  // which no user action can move — but because it travels in the same string,
  // and a half-written URL would be a second shape for the parser to know.
  const search = canonicalSearchFor(null, { view: "day", anchor: new Date(2026, 10, 1) });
  assert.equal(search, "date=2026-11-01&view=day");
});

test("canonicalSearchFor: the rewrite is exactly what the hook would have pushed", () => {
  // The string shape has to match `buildCalendarSearch` byte for byte, or the
  // push guard's own comparisons (`consumePushedSearch`) would stop matching.
  assert.equal(canonicalSearchFor("year", MONTH), canonicalSearchFor(null, MONTH));
});
