// Unit tests for calendarMoveRules.ts: the checks `moveCalendarEvent` runs
// before a dragged event is saved. Instants are written in UTC with their
// Denver wall time beside them, so the answers hold under either test TZ.
// Run with `npm test`.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOVE_EARLIEST, MOVE_LATEST, coversWholeDay, parseMoveStart, planMove } from "./calendarMoveRules";

const TZ = "America/Denver";
const at = (iso: string) => new Date(iso);

// Nov 10 2026, 9 to 10 AM Denver (MST, UTC-7).
const nineToTen = { startAt: at("2026-11-10T16:00:00Z"), endAt: at("2026-11-10T17:00:00Z"), allDay: false };

describe("parseMoveStart", () => {
  it("reads an ISO instant with Z or an offset", () => {
    assert.equal(parseMoveStart("2026-11-10T21:15:00.000Z")?.toISOString(), "2026-11-10T21:15:00.000Z");
    assert.equal(parseMoveStart("2026-11-10T14:15-07:00")?.toISOString(), "2026-11-10T21:15:00.000Z");
  });

  it("refuses text without a zone, junk, impossible dates and non-strings", () => {
    assert.equal(parseMoveStart("2026-11-10T14:15"), null);
    assert.equal(parseMoveStart("next tuesday"), null);
    assert.equal(parseMoveStart("2026-13-40T99:99Z"), null);
    assert.equal(parseMoveStart(""), null);
    assert.equal(parseMoveStart(1762809300000), null);
    assert.equal(parseMoveStart(new Date()), null);
    assert.equal(parseMoveStart(null), null);
  });
});

describe("planMove", () => {
  it("moves 9 to 10 AM onto 2:15 PM and keeps the hour (2:15 to 3:15)", () => {
    const plan = planMove(nineToTen, at("2026-11-10T21:15:00Z"), TZ);
    assert.deepEqual(plan, { startAt: at("2026-11-10T21:15:00Z"), endAt: at("2026-11-10T22:15:00Z") });
  });

  it("moves to another day with the same length", () => {
    const plan = planMove(nineToTen, at("2026-11-12T15:30:00Z"), TZ);
    assert.deepEqual(plan, { startAt: at("2026-11-12T15:30:00Z"), endAt: at("2026-11-12T16:30:00Z") });
  });

  it("keeps the stored length in real time across the spring DST change", () => {
    // 90 minutes stored; dropped at 1:30 AM MST on Mar 8 2026 it ends 4 AM MDT.
    const ninety = { startAt: at("2026-03-01T16:00:00Z"), endAt: at("2026-03-01T17:30:00Z"), allDay: false };
    const plan = planMove(ninety, at("2026-03-08T08:30:00Z"), TZ);
    assert.deepEqual(plan, { startAt: at("2026-03-08T08:30:00Z"), endAt: at("2026-03-08T10:00:00Z") });
  });

  it("lets an evening event run past midnight (it stays in the grid)", () => {
    const plan = planMove(nineToTen, at("2026-11-11T06:30:00Z"), TZ); // 11:30 PM Nov 10
    assert.ok(!("error" in plan));
  });

  it("refuses all-day events", () => {
    const allDay = { startAt: at("2026-11-10T00:00:00Z"), endAt: at("2026-11-11T00:00:00Z"), allDay: true };
    assert.deepEqual(planMove(allDay, at("2026-11-12T16:00:00Z"), TZ), { error: "All-day events can't be dragged." });
  });

  it("refuses a timed event that covers a whole day", () => {
    // Fri 10 AM to Sun 2 PM Denver.
    const weekend = { startAt: at("2026-11-13T17:00:00Z"), endAt: at("2026-11-15T21:00:00Z"), allDay: false };
    assert.deepEqual(planMove(weekend, at("2026-11-20T17:00:00Z"), TZ), {
      error: "Events that last more than a day can't be dragged.",
    });
  });

  it("refuses a start before 2000 or an end after 2100", () => {
    const tooEarly = new Date(MOVE_EARLIEST.getTime() - 60_000);
    assert.deepEqual(planMove(nineToTen, tooEarly, TZ), { error: "That date is too far away." });
    const endsTooLate = new Date(MOVE_LATEST.getTime() - 30 * 60_000);
    assert.deepEqual(planMove(nineToTen, endsTooLate, TZ), { error: "That date is too far away." });
    assert.ok(!("error" in planMove(nineToTen, MOVE_EARLIEST, TZ)));
  });

  it("refuses a move that would swallow the 23-hour spring-forward day", () => {
    // 23 hours long, dropped at midnight Mar 8 2026 (07:00Z), ends midnight Mar 9.
    const long = { startAt: at("2026-03-01T08:00:00Z"), endAt: at("2026-03-02T07:00:00Z"), allDay: false };
    assert.deepEqual(planMove(long, at("2026-03-08T07:00:00Z"), TZ), { error: "That move would cover a whole day." });
  });

  it("takes no length: the end always comes from the stored row", () => {
    // A field a forged caller might smuggle in is never read.
    const forged = { ...nineToTen, lengthMinutes: 600 } as typeof nineToTen;
    const plan = planMove(forged, at("2026-11-10T21:15:00Z"), TZ);
    assert.deepEqual(plan, { startAt: at("2026-11-10T21:15:00Z"), endAt: at("2026-11-10T22:15:00Z") });
    // planMove has no length or end parameter to fill: stored row, start, zone.
    assert.equal(planMove.length, 3);
  });
});

describe("coversWholeDay", () => {
  it("matches belongsInAllDayRow's cases in Denver", () => {
    // Fri 10 PM to Sat 2 AM: no whole day.
    assert.equal(coversWholeDay({ startAt: at("2026-11-14T05:00:00Z"), endAt: at("2026-11-14T09:00:00Z") }, TZ), false);
    // Midnight to midnight: one whole day.
    assert.equal(coversWholeDay({ startAt: at("2026-11-10T07:00:00Z"), endAt: at("2026-11-11T07:00:00Z") }, TZ), true);
    // Midnight to 11 PM the same day: not whole.
    assert.equal(coversWholeDay({ startAt: at("2026-11-10T07:00:00Z"), endAt: at("2026-11-11T06:00:00Z") }, TZ), false);
  });

  it("reads Denver's days, not UTC's", () => {
    // 6 PM to 11 PM Denver Nov 10 crosses UTC midnight but stays one Denver day.
    assert.equal(coversWholeDay({ startAt: at("2026-11-11T01:00:00Z"), endAt: at("2026-11-11T06:00:00Z") }, TZ), false);
    // Denver midnight Nov 10 to midnight Nov 11 is a whole Denver day, though not UTC-aligned.
    assert.equal(coversWholeDay({ startAt: at("2026-11-10T07:00:00Z"), endAt: at("2026-11-11T07:00:00Z") }, "UTC"), false);
  });
});
