// Mission 70 (C4): the pure parts of useEventMoves.ts, the Undo bar's words
// and the optimistic move. Its save goes through useOptimisticRun's `run`,
// tested in useOptimisticRun.test.ts. Dates are built from local parts and
// read back with local getters (the same clock the timeline draws), so these
// hold under TZ=America/Denver and TZ=UTC alike. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyMove,
  applySeriesShift,
  movedAllText,
  movedToText,
  isSeriesNoShift,
  seriesShiftMinutes,
  seriesUndoRequest,
  shiftWallClock,
} from "./useEventMoves";
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

// Mission 71: the pure parts of "All of them". Instants are real UTC instants
// for Denver wall times (MST is UTC-7, MDT UTC-6), so they read the same under
// both TZ runs.
const at = (iso: string) => new Date(iso);
const day = (id: string, seriesId: string | null, startIso: string, endIso: string): CalendarEventView => ({
  ...event(id, 7),
  seriesId,
  startAt: at(startIso),
  endAt: at(endIso),
});

test("movedAllText names the series and the new clock time", () => {
  assert.equal(movedAllText("Wake Up", new Date(2026, 10, 12, 7, 30)), "Moved every Wake Up to 7:30 AM");
});

test("seriesShiftMinutes is the wall-clock change on the same household day", () => {
  const wake = day("a", "s", "2026-11-12T14:00:00Z", "2026-11-12T14:45:00Z"); // Thu 7:00 AM Denver
  assert.equal(seriesShiftMinutes(wake, at("2026-11-12T14:30:00Z")), 30);
  assert.equal(seriesShiftMinutes(wake, at("2026-11-12T13:00:00Z")), -60);
});

test("seriesShiftMinutes is null on another household day, even a few minutes after midnight", () => {
  const wake = day("a", "s", "2026-11-12T14:00:00Z", "2026-11-12T14:45:00Z");
  assert.equal(seriesShiftMinutes(wake, at("2026-11-13T14:30:00Z")), null);
  // Thu 11:50 PM Denver to Fri 12:10 AM Denver: a new day, not +20.
  const late = day("b", "s", "2026-11-13T06:50:00Z", "2026-11-13T07:30:00Z");
  assert.equal(seriesShiftMinutes(late, at("2026-11-13T07:10:00Z")), null);
});

test("a drop that changes nothing is no shift: no sheet, and the minutes rule is the server's", () => {
  const wake = day("a", "s", "2026-11-12T14:00:00Z", "2026-11-12T14:45:00Z");
  assert.equal(isSeriesNoShift(wake, at("2026-11-12T14:00:00Z")), true);
  assert.equal(isSeriesNoShift(wake, at("2026-11-12T14:30:00Z")), false);
  assert.equal(isSeriesNoShift(wake, at("2026-11-13T14:00:00Z")), false);
  assert.equal(seriesShiftMinutes(wake, at("2026-11-12T14:00:00Z")), null);
});

test("shiftWallClock keeps the clock reading across both clock changes", () => {
  // Sun 8 Mar 2026, the spring change (2 AM becomes 3 AM): 1:30 AM MST + 90 is 3:00 AM MDT.
  assert.equal(shiftWallClock(at("2026-03-08T08:30:00Z"), 90).toISOString(), "2026-03-08T09:00:00.000Z");
  // Sun 1 Nov 2026, the fall change: 7:00 AM MST + 30 is 7:30 AM MST.
  assert.equal(shiftWallClock(at("2026-11-01T14:00:00Z"), 30).toISOString(), "2026-11-01T14:30:00.000Z");
  // A summer day: 7:00 AM MDT + 30 is 7:30 AM MDT.
  assert.equal(shiftWallClock(at("2026-07-01T13:00:00Z"), 30).toISOString(), "2026-07-01T13:30:00.000Z");
});

test("applySeriesShift moves every day of the series by the same wall clock and nothing else", () => {
  const winter = day("w", "s", "2026-11-12T14:00:00Z", "2026-11-12T14:45:00Z");
  const summer = day("u", "s", "2026-07-01T13:00:00Z", "2026-07-01T13:45:00Z");
  const other = day("o", "t", "2026-11-12T14:00:00Z", "2026-11-12T15:00:00Z");
  const plain = day("p", null, "2026-11-12T14:00:00Z", "2026-11-12T15:00:00Z");
  const list = [winter, summer, other, plain];
  const moved = applySeriesShift(list, { seriesId: "s", minutes: 30 });
  assert.equal(moved[0].startAt.toISOString(), "2026-11-12T14:30:00.000Z");
  assert.equal(moved[0].endAt.toISOString(), "2026-11-12T15:15:00.000Z");
  assert.equal(moved[1].startAt.toISOString(), "2026-07-01T13:30:00.000Z");
  assert.equal(moved[2], other, "another series is untouched");
  assert.equal(moved[3], plain, "an event that does not repeat is untouched");
  assert.equal(list[0].startAt.toISOString(), "2026-11-12T14:00:00.000Z", "the server's list is not changed");
});

test("seriesUndoRequest sends the server's event id and original start, shifting back", () => {
  assert.deepEqual(seriesUndoRequest({ eventId: "new-id", startIso: "2026-11-12T14:00:00.000Z" }, 30), {
    eventId: "new-id",
    startIso: "2026-11-12T14:00:00.000Z",
    minutes: -30,
  });
});
