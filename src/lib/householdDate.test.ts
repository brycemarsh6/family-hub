import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addCalendarDays,
  calendarDaysBetween,
  calendarDateFromUtcMidnight,
  calendarDateInZone,
  dayOfWeek,
  formatCalendarDate,
  formatHouseholdClock,
  formatShortCalendarDate,
  formatWeekTitle,
  hourInZone,
  instantAtWallClock,
  shiftWallClockInZone,
  wallClockMs,
  minuteOfDayInZone,
  parseDateParam,
  startOfMonth,
  startOfWeek,
  utcMidnightInstant,
  zoneMidnightInstant,
} from "./householdDate";

const DENVER = "America/Denver";

test("zoneMidnightInstant: Denver offsets across the 2026 DST transitions", () => {
  const iso = (y: number, m: number, d: number) =>
    zoneMidnightInstant({ year: y, month: m, day: d }, DENVER).toISOString();
  assert.equal(iso(2026, 3, 8), "2026-03-08T07:00:00.000Z");
  assert.equal(iso(2026, 3, 9), "2026-03-09T06:00:00.000Z");
  assert.equal(iso(2026, 11, 1), "2026-11-01T06:00:00.000Z");
  assert.equal(iso(2026, 11, 2), "2026-11-02T07:00:00.000Z");
});

test("zoneMidnightInstant: result is independent of the process TZ", () => {
  // Would fail under TZ=UTC / America/Los_Angeles if built from the
  // process-local `new Date(y, m - 1, d)`.
  const got = zoneMidnightInstant({ year: 2026, month: 7, day: 4 }, DENVER);
  assert.equal(got.toISOString(), "2026-07-04T06:00:00.000Z");
});

test("calendarDateInZone: 05:30Z on Nov 2 is still Nov 1 in Denver", () => {
  assert.deepEqual(calendarDateInZone(new Date("2026-11-02T05:30:00Z"), DENVER), {
    year: 2026,
    month: 11,
    day: 1,
  });
});

test("calendarDateInZone: 6-7 pm Mountain is already tomorrow in UTC, but not in Denver", () => {
  const evening = new Date("2026-07-05T01:30:00Z"); // 7:30 pm MDT on Jul 4
  assert.deepEqual(calendarDateInZone(evening, DENVER), { year: 2026, month: 7, day: 4 });
  assert.deepEqual(calendarDateInZone(evening, "UTC"), { year: 2026, month: 7, day: 5 });
});

test("calendarDateInZone: year boundary", () => {
  assert.deepEqual(calendarDateInZone(new Date("2027-01-01T06:59:59Z"), DENVER), {
    year: 2026,
    month: 12,
    day: 31,
  });
  assert.deepEqual(calendarDateInZone(new Date("2027-01-01T07:00:00Z"), DENVER), {
    year: 2027,
    month: 1,
    day: 1,
  });
});

test("zoneMidnightInstant round-trips through calendarDateInZone", () => {
  for (const d of [
    { year: 2026, month: 3, day: 8 },
    { year: 2026, month: 11, day: 1 },
    { year: 2026, month: 12, day: 31 },
    { year: 2027, month: 1, day: 1 },
  ]) {
    const at = zoneMidnightInstant(d, DENVER);
    assert.deepEqual(calendarDateInZone(at, DENVER), d);
    // one millisecond earlier is the previous day
    assert.notDeepEqual(calendarDateInZone(new Date(at.getTime() - 1), DENVER), d);
  }
});

test("parseDateParam: strict YYYY-MM-DD", () => {
  assert.deepEqual(parseDateParam("2026-02-28"), { year: 2026, month: 2, day: 28 });
  assert.deepEqual(parseDateParam("2028-02-29"), { year: 2028, month: 2, day: 29 });
  for (const bad of ["2026-02-30", "2026-13-01", "2026-1-5", "", "2026-02-29", "20260205", "2026-02-05T00:00"]) {
    assert.equal(parseDateParam(bad), null, bad);
  }
});

test("formatCalendarDate pads", () => {
  assert.equal(formatCalendarDate({ year: 2026, month: 3, day: 8 }), "2026-03-08");
});

test("addCalendarDays: crosses month/year boundaries both ways", () => {
  assert.deepEqual(addCalendarDays({ year: 2026, month: 12, day: 31 }, 1), { year: 2027, month: 1, day: 1 });
  assert.deepEqual(addCalendarDays({ year: 2026, month: 3, day: 1 }, -1), { year: 2026, month: 2, day: 28 });
  assert.deepEqual(addCalendarDays({ year: 2026, month: 11, day: 1 }, 7), { year: 2026, month: 11, day: 8 });
});

test("dayOfWeek: 0 = Sunday", () => {
  assert.equal(dayOfWeek({ year: 2026, month: 11, day: 1 }), 0);
  assert.equal(dayOfWeek({ year: 2026, month: 3, day: 8 }), 0);
  assert.equal(dayOfWeek({ year: 2026, month: 10, day: 9 }), 5);
});

test("utcMidnightInstant is UTC midnight regardless of process TZ", () => {
  assert.equal(utcMidnightInstant({ year: 2026, month: 11, day: 1 }).toISOString(), "2026-11-01T00:00:00.000Z");
});

test("calendarDateFromUtcMidnight reads a stored day back as the same calendar day", () => {
  const day = { year: 2027, month: 3, day: 14 };
  assert.deepEqual(calendarDateFromUtcMidnight(utcMidnightInstant(day)), day);
  assert.deepEqual(calendarDateFromUtcMidnight(new Date("2026-11-01T00:00:00.000Z")), { year: 2026, month: 11, day: 1 });
});

test("calendarDaysBetween: signed whole days, across a year end and a leap day", () => {
  assert.equal(calendarDaysBetween({ year: 2026, month: 12, day: 31 }, { year: 2027, month: 1, day: 1 }), 1);
  assert.equal(calendarDaysBetween({ year: 2027, month: 1, day: 1 }, { year: 2026, month: 12, day: 31 }), -1);
  assert.equal(calendarDaysBetween({ year: 2028, month: 2, day: 28 }, { year: 2028, month: 3, day: 1 }), 2);
  assert.equal(calendarDaysBetween({ year: 2026, month: 11, day: 1 }, { year: 2026, month: 11, day: 1 }), 0);
});

test("startOfWeek: a Sunday is unchanged, a Saturday goes back six days", () => {
  assert.deepEqual(startOfWeek({ year: 2026, month: 11, day: 1 }), { year: 2026, month: 11, day: 1 });
  assert.deepEqual(startOfWeek({ year: 2026, month: 11, day: 7 }), { year: 2026, month: 11, day: 1 });
});

test("startOfWeek: crosses a year boundary (Fri Jan 1 2027 is in the week of Dec 27)", () => {
  assert.deepEqual(startOfWeek({ year: 2027, month: 1, day: 1 }), { year: 2026, month: 12, day: 27 });
});

test("startOfMonth: first of the same month, any day", () => {
  assert.deepEqual(startOfMonth({ year: 2026, month: 11, day: 4 }), { year: 2026, month: 11, day: 1 });
  assert.deepEqual(startOfMonth({ year: 2028, month: 2, day: 29 }), { year: 2028, month: 2, day: 1 });
  assert.deepEqual(startOfMonth({ year: 2026, month: 12, day: 1 }), { year: 2026, month: 12, day: 1 });
});

test("formatShortCalendarDate: short month name and day, no year, no padding", () => {
  assert.equal(formatShortCalendarDate({ year: 2026, month: 11, day: 3 }), "Nov 3");
  assert.equal(formatShortCalendarDate({ year: 2026, month: 1, day: 1 }), "Jan 1");
  assert.equal(formatShortCalendarDate({ year: 2026, month: 12, day: 31 }), "Dec 31");
});

test("formatWeekTitle: no dash; the year only outside the current year (decisions 112, 166)", () => {
  const title = (y: number, m: number, day: number, current = 2026) => formatWeekTitle({ year: y, month: m, day }, current);
  assert.equal(title(2026, 11, 1), "Nov 1 to 7");
  assert.equal(title(2026, 10, 26), "Oct 26 to Nov 1");
  assert.equal(title(2025, 12, 28), "Dec 28, 2025 to Jan 3");
  assert.equal(title(2025, 11, 2), "Nov 2 to 8, 2025");
  assert.equal(title(2025, 10, 26), "Oct 26 to Nov 1, 2025");
  assert.equal(title(2026, 12, 27, 2026), "Dec 27 to Jan 2, 2027");
  assert.equal(title(2024, 12, 29), "Dec 29, 2024 to Jan 4, 2025");
  for (const text of [title(2026, 11, 1), title(2025, 12, 28), title(2026, 10, 26), title(2024, 12, 29)]) assert.doesNotMatch(text, /[-\u2013\u2014]/);
});

// Nov 13 2026 is MST (UTC-7); Jul 10 2026 is MDT (UTC-6).
const mst = (h: number, m = 0, s = 0) => new Date(Date.UTC(2026, 10, 13, h + 7, m, s));
const mdt = (h: number, m = 0, s = 0) => new Date(Date.UTC(2026, 6, 10, h + 6, m, s));

test("hourInZone reads the wall-clock hour in MST and MDT", () => {
  assert.equal(hourInZone(mst(8, 59, 59), DENVER), 8);
  assert.equal(hourInZone(mst(9), DENVER), 9);
  assert.equal(hourInZone(mst(23, 59), DENVER), 23);
  assert.equal(hourInZone(mst(0), DENVER), 0);
  assert.equal(hourInZone(mdt(8, 59, 59), DENVER), 8);
  assert.equal(hourInZone(mdt(9), DENVER), 9);
  assert.equal(hourInZone(mdt(23, 59), DENVER), 23);
  assert.equal(hourInZone(mdt(0), DENVER), 0);
});

test("minuteOfDayInZone reads minutes after midnight in MST and MDT", () => {
  assert.equal(minuteOfDayInZone(mst(0), DENVER), 0);
  assert.equal(minuteOfDayInZone(mst(7, 42), DENVER), 7 * 60 + 42);
  assert.equal(minuteOfDayInZone(mst(23, 59, 59), DENVER), 23 * 60 + 59);
  assert.equal(minuteOfDayInZone(mdt(0), DENVER), 0);
  assert.equal(minuteOfDayInZone(mdt(22), DENVER), 1320);
  assert.equal(minuteOfDayInZone(mdt(5, 59, 59), DENVER), 5 * 60 + 59);
});

test("minuteOfDayInZone across the Denver DST nights", () => {
  // 2026-03-08: 2:00 MST jumps to 3:00 MDT. 08:59Z is 1:59 MST, 09:00Z is 3:00 MDT.
  assert.equal(minuteOfDayInZone(new Date(Date.UTC(2026, 2, 8, 8, 59)), DENVER), 119);
  assert.equal(minuteOfDayInZone(new Date(Date.UTC(2026, 2, 8, 9, 0)), DENVER), 180);
  // 2026-11-01: 2:00 MDT falls back to 1:00 MST. 07:30Z is 1:30 MDT, 08:30Z is 1:30 MST.
  assert.equal(minuteOfDayInZone(new Date(Date.UTC(2026, 10, 1, 7, 30)), DENVER), 90);
  assert.equal(minuteOfDayInZone(new Date(Date.UTC(2026, 10, 1, 8, 30)), DENVER), 90);
  assert.equal(minuteOfDayInZone(new Date(Date.UTC(2026, 10, 1, 9, 0)), DENVER), 120);
});

test("formatHouseholdClock drops :00 only when asked", () => {
  const drop = { dropZeroMinutes: true };
  const keep = { dropZeroMinutes: false };
  assert.equal(formatHouseholdClock(mst(10), DENVER, drop), "10 AM");
  assert.equal(formatHouseholdClock(mst(18, 30), DENVER, drop), "6:30 PM");
  assert.equal(formatHouseholdClock(mst(12), DENVER, drop), "12 PM");
  assert.equal(formatHouseholdClock(mst(0), DENVER, drop), "12 AM");
  assert.equal(formatHouseholdClock(mst(0, 15), DENVER, drop), "12:15 AM");
  assert.equal(formatHouseholdClock(mst(10), DENVER, keep), "10:00 AM");
  assert.equal(formatHouseholdClock(mdt(18, 30), DENVER, keep), "6:30 PM");
  assert.equal(formatHouseholdClock(mdt(23, 30), DENVER, keep), "11:30 PM");
});

test("formatHouseholdClock uses a plain ASCII space, never U+202F", () => {
  for (const options of [{ dropZeroMinutes: true }, { dropZeroMinutes: false }]) {
    assert.doesNotMatch(formatHouseholdClock(mst(18, 30), DENVER, options), /\u202f/);
    assert.match(formatHouseholdClock(mst(18, 30), DENVER, options), /^6:30 PM$/);
  }
});

test("wallClockMs and instantAtWallClock are inverses in Denver, summer and winter", () => {
  for (const iso of ["2026-07-01T13:00:00Z", "2026-11-12T14:00:00Z", "2026-03-08T08:30:00Z", "2026-11-01T14:00:00Z"]) {
    const instant = new Date(iso);
    assert.equal(instantAtWallClock(wallClockMs(instant, DENVER), DENVER).toISOString(), instant.toISOString());
  }
  // 7:00 AM on the wall is 13:00Z in July (MDT) and 14:00Z in November (MST).
  assert.equal(instantAtWallClock(Date.UTC(2026, 6, 1, 7), DENVER).toISOString(), "2026-07-01T13:00:00.000Z");
  assert.equal(instantAtWallClock(Date.UTC(2026, 10, 12, 7), DENVER).toISOString(), "2026-11-12T14:00:00.000Z");
});

test("shiftWallClockInZone keeps the clock reading across both 2026 clock changes", () => {
  // Spring change (2 AM becomes 3 AM): 1:30 AM MST + 90 minutes is 3:00 AM MDT.
  assert.equal(shiftWallClockInZone(new Date("2026-03-08T08:30:00Z"), 90, DENVER).toISOString(), "2026-03-08T09:00:00.000Z");
  // Fall change: 7:00 AM MST + 30 is 7:30 AM MST; and 1:30 AM MDT + 60 is 2:30 AM MST (the wall clock, not 60 real minutes).
  assert.equal(shiftWallClockInZone(new Date("2026-11-01T14:00:00Z"), 30, DENVER).toISOString(), "2026-11-01T14:30:00.000Z");
  assert.equal(shiftWallClockInZone(new Date("2026-11-01T07:30:00Z"), 60, DENVER).toISOString(), "2026-11-01T09:30:00.000Z");
  // Summer, and a negative shift.
  assert.equal(shiftWallClockInZone(new Date("2026-07-01T13:00:00Z"), -30, DENVER).toISOString(), "2026-07-01T12:30:00.000Z");
  // Same answer for any process TZ: only the zone argument matters.
  assert.equal(shiftWallClockInZone(new Date("2026-07-01T13:00:00Z"), 30, "UTC").toISOString(), "2026-07-01T13:30:00.000Z");
});
