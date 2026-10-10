import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addCalendarDays,
  calendarDaysBetween,
  calendarDateInZone,
  dayOfWeek,
  formatCalendarDate,
  parseDateParam,
  sundayOfCalendarDate,
  utcCalendarDate,
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

test("calendarDaysBetween: signed whole days, across a year end and a leap day", () => {
  assert.equal(calendarDaysBetween({ year: 2026, month: 12, day: 31 }, { year: 2027, month: 1, day: 1 }), 1);
  assert.equal(calendarDaysBetween({ year: 2027, month: 1, day: 1 }, { year: 2026, month: 12, day: 31 }), -1);
  assert.equal(calendarDaysBetween({ year: 2028, month: 2, day: 28 }, { year: 2028, month: 3, day: 1 }), 2);
  assert.equal(calendarDaysBetween({ year: 2026, month: 11, day: 1 }, { year: 2026, month: 11, day: 1 }), 0);
});

test("sundayOfCalendarDate", () => {
  const d = (year: number, month: number, day: number) => ({ year, month, day });
  assert.deepEqual(sundayOfCalendarDate(d(2026, 10, 10)), d(2026, 10, 4)); // Saturday
  assert.deepEqual(sundayOfCalendarDate(d(2026, 10, 4)), d(2026, 10, 4));
  assert.deepEqual(sundayOfCalendarDate(d(2026, 11, 3)), d(2026, 11, 1));
});

test("utcCalendarDate: round-trips utcMidnightInstant and reads the UTC day, not the local one", () => {
  const d = { year: 2026, month: 11, day: 1 };
  assert.deepEqual(utcCalendarDate(utcMidnightInstant(d)), d);
  assert.deepEqual(utcCalendarDate(new Date("2026-11-01T23:59:59.999Z")), d);
  assert.deepEqual(utcCalendarDate(new Date("2026-12-31T23:30:00.000Z")), { year: 2026, month: 12, day: 31 });
});
