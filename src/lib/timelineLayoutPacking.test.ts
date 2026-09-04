// Real unit tests (node:test, zero new dependencies) for the hour-timeline's
// pure layout helpers (timelineLayout.ts) — mission-12 (CV2), contract C2,
// covering the COLUMN PACKING + PARTITION half: assignColumns (side-by-side
// columns for overlapping blocks), belongsInAllDayRow and
// partitionForTimeline (routing events into the all-day row vs. the timed
// grid), and the composition case proving the all-day row partitionForTimeline
// produces is packed by monthLayout.assignLanes unchanged — no second packer.
// Block geometry and the DST policy live in the sibling timelineLayout.test.ts,
// apart from a few deliberate cross-check assertions pointing each way,
// which are what prove the two halves still agree — split by
// concern (never by number, per STRUCTURE.md), mission-12's C4, because that
// file was at 376 of the 350-line soft cap.
//
// Run with `npm test`, which pins TZ=America/Denver; the gauntlet re-runs
// this file directly under TZ=UTC too. Nothing in this file is zone-dependent
// on its own — it lives alongside its DST-testing sibling and is picked up by
// the same two invocations, which is exactly what the count-must-match check
// (mission-12's C4) is proving.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blockGeometry,
  belongsInAllDayRow,
  partitionForTimeline,
  assignColumns,
  type TimelineEvent,
  type TimelineBlock,
} from "./timelineLayout";
import { assignLanes } from "./monthLayout";
import { addDays } from "./mealPlanDates";

function d(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month, day, hour, minute);
}

/** A timed event; `id` doubles as the deterministic tiebreak everywhere. */
function ev(id: string, startAt: Date, endAt: Date, allDay = false): TimelineEvent {
  return { id, startAt, endAt, allDay };
}

/** A bare block for `assignColumns`, in minutes. */
function block(id: string, topMinutes: number, heightMinutes: number): TimelineBlock {
  return { id, topMinutes, heightMinutes };
}

// ---------------------------------------------------------------------------
// assignColumns

test("REGRESSION: touching events (9-10 and 10-11) are NOT an overlap — one column each", () => {
  const slots = assignColumns([block("a", 540, 60), block("b", 600, 60)]);
  assert.deepEqual(
    slots.map((s) => [s.block.id, s.column, s.columnCount]),
    [["a", 0, 1], ["b", 0, 1]],
  );
});

test("CONTROL: genuinely overlapping events (9-10 and 9:30-10:30) DO get two columns", () => {
  const slots = assignColumns([block("a", 540, 60), block("b", 570, 60)]);
  assert.deepEqual(
    slots.map((s) => [s.block.id, s.column, s.columnCount]),
    [["a", 0, 2], ["b", 1, 2]],
  );
});

test("assignColumns: a three-deep chain (9-10, 9:30-10:30, 10-11) resolves to TWO columns, not three", () => {
  const slots = assignColumns([block("a", 540, 60), block("b", 570, 60), block("c", 600, 60)]);
  assert.deepEqual(
    slots.map((s) => [s.block.id, s.column, s.columnCount]),
    [["a", 0, 2], ["b", 1, 2], ["c", 0, 2]],
  );
});

test("assignColumns: two independent clusters keep their OWN column counts", () => {
  const slots = assignColumns([
    block("a", 540, 60),
    block("b", 570, 60), // overlaps a -> cluster of 2
    block("c", 900, 60), // hours later, alone -> cluster of 1
  ]);
  const byId = new Map(slots.map((s) => [s.block.id, s]));
  assert.equal(byId.get("a")?.columnCount, 2);
  assert.equal(byId.get("b")?.columnCount, 2);
  assert.equal(byId.get("c")?.columnCount, 1);
  assert.equal(byId.get("c")?.column, 0);
});

test("assignColumns: the MIN_BLOCK_MINUTES pad counts as the VISUAL bottom, so two tiny events cannot paint over each other", () => {
  // Two 5-minute events at 9:00 and 9:10. Their real ends (9:05, 9:15) don't
  // overlap at all — but both are padded to 30 minutes to stay tappable, so
  // the drawn boxes genuinely collide and must be given separate columns.
  const day = d(2026, 8, 3);
  const first = blockGeometry(day, ev("a", d(2026, 8, 3, 9, 0), d(2026, 8, 3, 9, 5)));
  const second = blockGeometry(day, ev("b", d(2026, 8, 3, 9, 10), d(2026, 8, 3, 9, 15)));
  assert.ok(first && second);
  const slots = assignColumns([{ id: "a", ...first }, { id: "b", ...second }]);
  assert.deepEqual(
    slots.map((s) => [s.block.id, s.column, s.columnCount]),
    [["a", 0, 2], ["b", 1, 2]],
  );
});

test("assignColumns: identical input in a different order produces identical output — determinism is load-bearing", () => {
  const blocks = [
    block("a", 540, 60),
    block("b", 570, 60),
    block("c", 600, 60),
    block("d", 540, 120),
    block("e", 900, 30),
  ];
  const expected = assignColumns(blocks).map((s) => [s.block.id, s.column, s.columnCount]);
  const shuffles = [[4, 0, 3, 1, 2], [2, 3, 4, 0, 1], [3, 2, 1, 0, 4]];
  for (const order of shuffles) {
    const shuffled = order.map((index) => blocks[index]);
    assert.deepEqual(
      assignColumns(shuffled).map((s) => [s.block.id, s.column, s.columnCount]),
      expected,
      `order ${order.join(",")} must not reshuffle columns`,
    );
  }
});

test("assignColumns: no blocks means no slots", () => {
  assert.deepEqual(assignColumns([]), []);
});

// ---------------------------------------------------------------------------
// belongsInAllDayRow / partitionForTimeline

test("belongsInAllDayRow: allDay === true routes to the row without reading the times", () => {
  // Deliberately given stored times that LOOK like an ordinary 9-10 timed
  // event: the flag alone decides, which is what keeps the timed path off
  // the deferred all-day-storage-bug audit list.
  assert.equal(belongsInAllDayRow(ev("a", d(2026, 8, 3, 9, 0), d(2026, 8, 3, 10, 0), true)), true);
});

test("belongsInAllDayRow: Fri 10 PM -> Sat 2 AM stays in the GRID (it covers no whole day)", () => {
  assert.equal(belongsInAllDayRow(ev("a", d(2026, 8, 4, 22, 0), d(2026, 8, 5, 2, 0))), false);
});

test("belongsInAllDayRow: a timed event that fully covers a calendar day routes to the row", () => {
  // Fri 10 AM -> Sun 2 PM swallows Saturday whole.
  assert.equal(belongsInAllDayRow(ev("a", d(2026, 8, 4, 10, 0), d(2026, 8, 6, 14, 0))), true);
  // A plain single-day timed event does not.
  assert.equal(belongsInAllDayRow(ev("b", d(2026, 8, 3, 9, 0), d(2026, 8, 3, 17, 0))), false);
  // Nor does one that merely ends on the following midnight.
  assert.equal(belongsInAllDayRow(ev("c", d(2026, 8, 3, 20, 0), d(2026, 8, 4, 0, 0))), false);
});

test("partitionForTimeline: splits the week's events into the all-day row and the timed grid", () => {
  const columnDays = Array.from({ length: 7 }, (_, offset) => addDays(d(2026, 8, 6), offset)); // Sun Sep 6 .. Sat Sep 12
  const events = [
    ev("allday", d(2026, 8, 7), d(2026, 8, 8), true),
    ev("overnight", d(2026, 8, 11, 22, 0), d(2026, 8, 12, 2, 0)), // Fri 10 PM -> Sat 2 AM
    ev("meeting", d(2026, 8, 9, 9, 0), d(2026, 8, 9, 10, 0)),
    ev("trip", d(2026, 8, 7, 10, 0), d(2026, 8, 9, 14, 0)), // timed, swallows Tue whole
    ev("elsewhere", d(2026, 7, 1, 9, 0), d(2026, 7, 1, 10, 0)), // August, outside the window
  ];
  const { allDayRow, timed } = partitionForTimeline(columnDays, events);
  assert.deepEqual(allDayRow.map((e) => e.id), ["allday", "trip"]);
  assert.deepEqual(timed.map((e) => e.id), ["overnight", "meeting"]);
});

test("partitionForTimeline: the overnight event draws on BOTH days of the grid, clipped each way", () => {
  const columnDays = [d(2026, 8, 11), d(2026, 8, 12)];
  const { timed } = partitionForTimeline(columnDays, [ev("overnight", d(2026, 8, 11, 22, 0), d(2026, 8, 12, 2, 0))]);
  assert.equal(timed.length, 1);
  assert.equal(blockGeometry(columnDays[0], timed[0])?.clippedEnd, true);
  assert.equal(blockGeometry(columnDays[1], timed[0])?.clippedStart, true);
});

// DO NOT DELETE THIS TEST WHEN CV4 ADDS A REAL CALL SITE. Both gates on
// mission-12 independently proved it is load-bearing structure, not just
// coverage: each copied timelineLayout.ts and monthLayout.ts out of the repo,
// added a required field to MonthLayoutEvent, and got a compiler error
// (TS2345) at exactly this call — the only place anything checks that
// TimelineEvent stays assignable to MonthLayoutEvent, which is what lets the
// all-day row feed monthLayout.assignLanes with no conversion and no second
// packer. Once CV4 wires up a real TimelineGrid caller, this assertion will
// look redundant next to it. It isn't — the type-probe was verified in
// mission-12 pass 2, and CV4's caller doesn't repeat what this test proves.
test("COMPOSITION: the all-day row partitionForTimeline produces is packed by monthLayout.assignLanes unchanged — no second packer", () => {
  const columnDays = Array.from({ length: 7 }, (_, offset) => addDays(d(2026, 8, 6), offset));
  const events = [
    ev("allday", d(2026, 8, 7), d(2026, 8, 8), true), // Mon only
    ev("trip", d(2026, 8, 7, 10, 0), d(2026, 8, 9, 14, 0)), // Mon..Wed, timed but full-day-covering
    ev("meeting", d(2026, 8, 9, 9, 0), d(2026, 8, 9, 10, 0)), // timed -> grid, must NOT appear here
  ];
  const { allDayRow } = partitionForTimeline(columnDays, events);
  const { spans, overflowByDay } = assignLanes(columnDays, allDayRow);
  assert.deepEqual(spans.map((s) => s.event.id).sort(), ["allday", "trip"]);
  const trip = spans.find((s) => s.event.id === "trip");
  assert.equal(trip?.startCol, 1, "Monday");
  assert.equal(trip?.endCol, 3, "Wednesday");
  // Two entries collide on Monday, so they take different lanes; nothing
  // overflows at two entries against three visible lanes.
  const allday = spans.find((s) => s.event.id === "allday");
  assert.notEqual(trip?.lane, allday?.lane);
  assert.deepEqual(overflowByDay, [0, 0, 0, 0, 0, 0, 0]);
});
