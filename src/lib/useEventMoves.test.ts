// Mission 70 (C4): the pure parts of useEventMoves.ts, the Undo bar's words
// and the optimistic move. Its save goes through useOptimisticRun's `run`,
// tested in useOptimisticRun.test.ts. Dates are built from local parts and
// read back with local getters (the same clock the timeline draws), so these
// hold under TZ=America/Denver and TZ=UTC alike. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMove, movedToText } from "./useEventMoves";
import type { CalendarEventView } from "./types";

test("movedToText names the weekday and the clock time", () => {
  // Wed 11 Nov 2026, 2:15 PM local.
  assert.equal(movedToText(new Date(2026, 10, 11, 14, 15)), "Moved to Wed 2:15 PM");
});

test("movedToText drops :00 like the rest of the calendar", () => {
  assert.equal(movedToText(new Date(2026, 10, 15, 9, 0)), "Moved to Sun 9 AM");
});

const event = (id: string, h: number): CalendarEventView => ({
  id,
  title: id,
  notes: null,
  location: null,
  startAt: new Date(2026, 10, 11, h),
  endAt: new Date(2026, 10, 11, h + 1),
  allDay: false,
  people: [],
  createdByName: null,
  syncs: [],
});

test("applyMove moves only the named event and leaves the list order", () => {
  const list = [event("a", 9), event("b", 12)];
  const startAt = new Date(2026, 10, 11, 14, 15);
  const endAt = new Date(2026, 10, 11, 15, 15);
  const moved = applyMove(list, { id: "a", startAt, endAt });
  assert.deepEqual(moved.map((e) => e.id), ["a", "b"]);
  assert.equal(moved[0].startAt, startAt);
  assert.equal(moved[0].endAt, endAt);
  assert.equal(moved[1], list[1]);
  assert.equal(list[0].startAt.getHours(), 9, "the server's list is not changed");
});

test("applyMove with an unknown id changes nothing", () => {
  const list = [event("a", 9)];
  const moved = applyMove(list, { id: "gone", startAt: new Date(), endAt: new Date() });
  assert.deepEqual(moved, list);
});
