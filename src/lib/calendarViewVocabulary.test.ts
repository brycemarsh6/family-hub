// Unit tests for the Calendar's view vocabulary — mission-11/CV1, contract
// C2. Run with `npm test`.
//
// Most of what this module guarantees is a COMPILE-time property (every
// `Record<CalendarPeriodView, …>` in the branch is total, so a seventh view
// name is an error until it has a row everywhere). What is left for runtime
// is the BUILT_VIEWS gate — the one thing standing between a URL naming an
// unbuilt view and a renderer that does not exist — and the derivations
// hanging off it.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUILT_CALENDAR_VIEWS,
  BUILT_VIEWS,
  CALENDAR_VIEW_OPTIONS,
  DEFAULT_CALENDAR_VIEW,
  VIEW_LABELS,
  toBuiltCalendarView,
  type CalendarPeriodView,
} from "./calendarViewVocabulary";

const ALL_VIEWS: CalendarPeriodView[] = [
  "schedule",
  "day",
  "threeDay",
  "week",
  "month",
  "year",
];

test("every view name has a label and a BUILT_VIEWS answer, and nothing else does", () => {
  assert.deepEqual(Object.keys(VIEW_LABELS), ALL_VIEWS);
  assert.deepEqual(Object.keys(BUILT_VIEWS).sort(), [...ALL_VIEWS].sort());
  for (const view of ALL_VIEWS) {
    assert.equal(typeof VIEW_LABELS[view], "string");
    assert.ok(VIEW_LABELS[view].length > 0, `${view} has an empty label`);
  }
});

test("exactly three views are built today — Day, Week and Month", () => {
  // CV3/CV4/CV5 each flip one entry in the same commit that adds its
  // renderer; this assertion is meant to fail then, and to be updated then.
  assert.deepEqual([...BUILT_CALENDAR_VIEWS], ["day", "week", "month"]);
  for (const view of ["schedule", "threeDay", "year"] as const) {
    assert.equal(BUILT_VIEWS[view], false, `${view} has no renderer yet`);
  }
});

test("the picker offers exactly the built views, labelled from the one label map", () => {
  assert.deepEqual(CALENDAR_VIEW_OPTIONS, [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ]);
  // Not a second hand-written list: whatever is built is offered, and
  // whatever is offered is labelled the same way the header labels it.
  assert.equal(CALENDAR_VIEW_OPTIONS.length, BUILT_CALENDAR_VIEWS.length);
  for (const option of CALENDAR_VIEW_OPTIONS) {
    assert.equal(option.label, VIEW_LABELS[option.value]);
    assert.equal(BUILT_VIEWS[option.value], true);
  }
});

test("the default view is itself built — the fallback can never point at a missing renderer", () => {
  assert.equal(DEFAULT_CALENDAR_VIEW, "week");
  assert.equal(BUILT_VIEWS[DEFAULT_CALENDAR_VIEW], true);
});

test("toBuiltCalendarView accepts built views and rejects everything else", () => {
  for (const view of BUILT_CALENDAR_VIEWS) {
    assert.equal(toBuiltCalendarView(view), view);
  }
  // Real view names with no renderer are rejected exactly like nonsense is:
  // that is what keeps `?view=year` off a page that cannot draw it.
  for (const view of ["schedule", "threeDay", "year"] as const) {
    assert.equal(toBuiltCalendarView(view), null, `${view} is not built yet`);
  }
  for (const value of ["", " week", "WEEK", "Week", "weekly", "3day", null, undefined]) {
    assert.equal(toBuiltCalendarView(value), null, `rejected: ${String(value)}`);
  }
});

test("toBuiltCalendarView is immune to prototype keys — `in` would not have been", () => {
  // `"toString" in BUILT_VIEWS` is true and `BUILT_VIEWS["toString"]` is a
  // function (truthy), so a membership test written with `in` would have let
  // `?view=toString` through as a real view. This is why the lookup scans
  // the built list instead.
  for (const key of ["toString", "constructor", "valueOf", "hasOwnProperty", "__proto__"]) {
    assert.equal(toBuiltCalendarView(key), null, `rejected: ${key}`);
  }
});
