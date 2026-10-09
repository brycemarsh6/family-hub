import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "./errors";
import { daysUntilInZone, householdToday, requireHouseholdToday } from "./today";

const DENVER = "America/Denver";

test("householdToday: a Denver evening that is already tomorrow in UTC stays on the Denver day", () => {
  // 2026-10-10T01:30Z is 7:30 pm on Oct 9 in Denver (MDT).
  assert.deepEqual(householdToday(new Date("2026-10-10T01:30:00Z")), {
    year: 2026,
    month: 10,
    day: 9,
  });
  // 6:00 pm Denver = 00:00Z next day
  assert.deepEqual(householdToday(new Date("2026-10-10T00:00:00Z")), {
    year: 2026,
    month: 10,
    day: 9,
  });
  // Denver midnight itself rolls over
  assert.deepEqual(householdToday(new Date("2026-10-10T06:00:00Z")), {
    year: 2026,
    month: 10,
    day: 10,
  });
});

test("householdToday: dateParam overrides, invalid gives null", () => {
  const now = new Date("2026-10-10T01:30:00Z");
  assert.deepEqual(householdToday(now, "2026-12-25"), { year: 2026, month: 12, day: 25 });
  assert.equal(householdToday(now, "2026-02-30"), null);
  assert.equal(householdToday(now, "garbage"), null);
  assert.equal(householdToday(now, ""), null);
});

test("daysUntilInZone: Denver-midnight instants count in calendar days", () => {
  const today = { year: 2026, month: 10, day: 9 };
  // Oct 12 at Denver midnight (06:00Z) -> 3 days
  assert.equal(daysUntilInZone(new Date("2026-10-12T06:00:00Z"), today, DENVER), 3);
  // 11:59 pm Denver Oct 9 is still today
  assert.equal(daysUntilInZone(new Date("2026-10-10T05:59:00Z"), today, DENVER), 0);
  assert.equal(daysUntilInZone(new Date("2026-10-08T06:00:00Z"), today, DENVER), -1);
});

test("daysUntilInZone: whole days across the Nov 1 fall-back (25-hour day)", () => {
  const today = { year: 2026, month: 10, day: 31 };
  // Nov 2 Denver midnight is 07:00Z (MST) -> 2 days despite 49 elapsed hours
  assert.equal(daysUntilInZone(new Date("2026-11-02T07:00:00Z"), today, DENVER), 2);
});

test("requireHouseholdToday: a real override works, an impossible one is a 400 ApiError", () => {
  const now = new Date("2026-06-10T12:00:00Z");
  assert.deepEqual(requireHouseholdToday(now, "2026-07-04"), { year: 2026, month: 7, day: 4 });
  assert.deepEqual(requireHouseholdToday(now), householdToday(now));
  assert.throws(
    () => requireHouseholdToday(now, "2026-02-30"),
    (e) => e instanceof ApiError && e.status === 400 && e.code === "validation",
  );
});
