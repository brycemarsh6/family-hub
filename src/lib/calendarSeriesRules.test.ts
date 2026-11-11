import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planSeriesCleanup, planSeriesShift, shiftParentTimes, type SeriesRow } from "./calendarSeriesRules";

// Pure rules, so every case runs the same under TZ=America/Denver and TZ=UTC
// (the Gauntlet runs both): nothing here reads the process's zone.

const DENVER = "America/Denver";
const at = (iso: string) => new Date(iso);
const stored = (start: string, end: string, allDay = false) => ({ startAt: at(start), endAt: at(end), allDay });

describe("planSeriesShift", () => {
  it("is +30 wall-clock minutes for 7:00 to 7:30", () => {
    // 2026-07-01 07:00 MDT = 13:00Z
    assert.deepEqual(planSeriesShift(stored("2026-07-01T13:00:00Z", "2026-07-01T14:00:00Z"), at("2026-07-01T13:30:00Z"), DENVER), { minutes: 30 });
  });

  it("is -30 for the opposite drop", () => {
    assert.deepEqual(planSeriesShift(stored("2026-07-01T13:30:00Z", "2026-07-01T14:30:00Z"), at("2026-07-01T13:00:00Z"), DENVER), { minutes: -30 });
  });

  it("is the wall-clock difference on the spring-forward day (2026-03-08)", () => {
    // 07:00 MDT = 13:00Z; 07:30 MDT = 13:30Z. The jump at 02:00 is before both.
    assert.deepEqual(planSeriesShift(stored("2026-03-08T13:00:00Z", "2026-03-08T14:00:00Z"), at("2026-03-08T13:30:00Z"), DENVER), { minutes: 30 });
  });

  it("is the wall-clock difference on the fall-back day (2026-11-01)", () => {
    // 07:00 MST = 14:00Z; 07:30 MST = 14:30Z.
    assert.deepEqual(planSeriesShift(stored("2026-11-01T14:00:00Z", "2026-11-01T15:00:00Z"), at("2026-11-01T14:30:00Z"), DENVER), { minutes: 30 });
  });

  it("refuses all-day, multi-day and a different day with plain words", () => {
    assert.deepEqual(planSeriesShift(stored("2026-07-01T00:00:00Z", "2026-07-02T00:00:00Z", true), at("2026-07-01T13:30:00Z"), DENVER), {
      error: "All-day events can't be dragged.",
    });
    assert.deepEqual(planSeriesShift(stored("2026-07-01T13:00:00Z", "2026-07-03T13:00:00Z"), at("2026-07-01T13:30:00Z"), DENVER), {
      error: "Events that last more than a day can't be dragged.",
    });
    assert.deepEqual(planSeriesShift(stored("2026-07-01T13:00:00Z", "2026-07-01T14:00:00Z"), at("2026-07-02T13:00:00Z"), DENVER), {
      error: "Only this one can move to another day.",
    });
  });

  it("reads the day in the household zone, not UTC (9 PM Denver is already tomorrow in UTC)", () => {
    // 21:00 MDT = 03:00Z next day; 21:30 MDT is the same Denver day.
    assert.deepEqual(planSeriesShift(stored("2026-07-02T03:00:00Z", "2026-07-02T04:00:00Z"), at("2026-07-02T03:30:00Z"), DENVER), { minutes: 30 });
  });
});

const parent = (startIso: string, endIso: string, tz = DENVER) => ({
  start: { dateTime: startIso, timeZone: tz },
  end: { dateTime: endIso, timeZone: tz },
});

describe("shiftParentTimes", () => {
  it("moves start and end by the minutes and keeps the timeZone", () => {
    const r = shiftParentTimes(parent("2026-07-01T07:00:00-06:00", "2026-07-01T08:00:00-06:00"), 30, DENVER);
    assert.deepEqual(r, {
      patch: {
        start: { dateTime: "2026-07-01T07:30:00-06:00", timeZone: DENVER },
        end: { dateTime: "2026-07-01T08:30:00-06:00", timeZone: DENVER },
      },
    });
  });

  it("keeps wall time for a parent dated in summer and a drop in winter", () => {
    // The parent started in July (MDT, -06:00); the drop was in January. 7:00 -> 7:30 must stay 7:30 local.
    const r = shiftParentTimes(parent("2026-07-01T07:00:00-06:00", "2026-07-01T08:00:00-06:00"), 30, DENVER);
    assert.ok("patch" in r && r.patch.start.dateTime === "2026-07-01T07:30:00-06:00");
  });

  it("keeps wall time for a parent dated in winter (offset -07:00) too", () => {
    const r = shiftParentTimes(parent("2026-01-05T07:00:00-07:00", "2026-01-05T08:00:00-07:00"), 30, DENVER);
    assert.ok("patch" in r);
    assert.equal(r.patch.start.dateTime, "2026-01-05T07:30:00-07:00");
    assert.equal(r.patch.end.dateTime, "2026-01-05T08:30:00-07:00");
  });

  it("gives the new date's own offset when the shift crosses a clock change (a parent on the spring-forward day, 01:30 + 60)", () => {
    // 2026-03-08 01:30 MST (-07:00) + 60 wall minutes = 02:30 wall, which does not exist; it lands on 03:30 MDT.
    const r = shiftParentTimes(parent("2026-03-08T01:30:00-07:00", "2026-03-08T02:30:00-07:00"), 60, DENVER);
    assert.ok("patch" in r);
    assert.match(r.patch.start.dateTime, /^2026-03-08T0[23]:30:00-0[67]:00$/);
  });

  it("works across the fall-back day both ways (opposite shifts give the original back)", () => {
    const original = parent("2026-11-01T07:00:00-07:00", "2026-11-01T08:00:00-07:00");
    const there = shiftParentTimes(original, 30, DENVER);
    assert.ok("patch" in there);
    assert.equal(there.patch.start.dateTime, "2026-11-01T07:30:00-07:00");
    const back = shiftParentTimes(there.patch, -30, DENVER);
    assert.deepEqual(back, { patch: { start: original.start, end: original.end } });
  });

  it("uses the parent's own zone, not the household's", () => {
    // 09:00 in New York (-04:00 in July) +30 stays 09:30 in New York.
    const r = shiftParentTimes(parent("2026-07-01T09:00:00-04:00", "2026-07-01T10:00:00-04:00", "America/New_York"), 30, DENVER);
    assert.deepEqual(r, {
      patch: {
        start: { dateTime: "2026-07-01T09:30:00-04:00", timeZone: "America/New_York" },
        end: { dateTime: "2026-07-01T10:30:00-04:00", timeZone: "America/New_York" },
      },
    });
  });

  it("falls back to the household zone when Google sends none", () => {
    const r = shiftParentTimes({ start: { dateTime: "2026-07-01T07:00:00-06:00" }, end: { dateTime: "2026-07-01T08:00:00-06:00" } }, 30, DENVER);
    assert.ok("patch" in r);
    assert.equal(r.patch.start.timeZone, DENVER);
    assert.equal(r.patch.start.dateTime, "2026-07-01T07:30:00-06:00");
  });

  it("reads a dateTime with no offset as the parent's wall clock", () => {
    const r = shiftParentTimes(parent("2026-07-01T07:00:00", "2026-07-01T08:00:00"), 30, DENVER);
    assert.ok("patch" in r);
    assert.equal(r.patch.start.dateTime, "2026-07-01T07:30:00-06:00");
  });

  it("refuses an all-day parent or one with no readable time", () => {
    const refusal = { error: "That event doesn't have a set time to move." };
    assert.deepEqual(shiftParentTimes({ start: { date: "2026-07-01" }, end: { date: "2026-07-02" } }, 30, DENVER), refusal);
    assert.deepEqual(shiftParentTimes({}, 30, DENVER), refusal);
    assert.deepEqual(shiftParentTimes(parent("garbage", "2026-07-01T08:00:00-06:00"), 30, DENVER), refusal);
  });
});

describe("planSeriesCleanup", () => {
  const series = { linkedCalendarId: "c1", googleSeriesId: "S" };
  const row = (eventId: string, googleEventId: string, over: Partial<SeriesRow> = {}): SeriesRow => ({
    eventId,
    googleEventId,
    linkedCalendarId: "c1",
    googleSeriesId: "S",
    ...over,
  });

  it("returns only the rows of that series and calendar that Google no longer lists", () => {
    const rows = [
      row("e1", "S_a"),
      row("e2", "S_b"),
      row("e3", "S_c", { linkedCalendarId: "c2" }),
      row("e4", "T_a", { googleSeriesId: "T" }),
      row("e5", "x", { googleSeriesId: null }),
    ];
    assert.deepEqual(planSeriesCleanup(rows, series, ["S_a"]), [{ eventId: "e2", googleEventId: "S_b" }]);
  });

  it("returns nothing when Google lists every row", () => {
    assert.deepEqual(planSeriesCleanup([row("e1", "S_a")], series, ["S_a", "S_z"]), []);
  });

  it("returns every row of the series when Google lists none of them", () => {
    assert.equal(planSeriesCleanup([row("e1", "S_a"), row("e2", "S_b")], series, []).length, 2);
  });
});
