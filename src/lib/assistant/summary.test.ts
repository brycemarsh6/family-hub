import { test } from "node:test";
import assert from "node:assert/strict";
import { bucketEventsByDay, findPlanForWeek, sundayOfCalendarDate, summarizeInventory } from "./summary";
import { addCalendarDays, formatCalendarDate, utcMidnightInstant, zoneMidnightInstant } from "@/lib/householdDate";

const DENVER = "America/Denver";
const sun = (y: number, m: number, d: number) => ({ year: y, month: m, day: d });

test("sundayOfCalendarDate", () => {
  assert.deepEqual(sundayOfCalendarDate(sun(2026, 10, 10)), sun(2026, 10, 4)); // Saturday
  assert.deepEqual(sundayOfCalendarDate(sun(2026, 10, 4)), sun(2026, 10, 4));
  assert.deepEqual(sundayOfCalendarDate(sun(2026, 11, 3)), sun(2026, 11, 1));
});

test("findPlanForWeek: plans stored at any US zone's midnight match, across the Nov 1 week", () => {
  for (const sunday of [sun(2026, 10, 25), sun(2026, 11, 1), sun(2026, 11, 8)]) {
    for (const zone of ["America/Denver", "America/Los_Angeles", "America/New_York", "Pacific/Honolulu"]) {
      const plan = { id: `${zone}`, weekStart: zoneMidnightInstant(sunday, zone) };
      const other = { id: "other", weekStart: zoneMidnightInstant(addCalendarDays(sunday, 7), zone) };
      assert.equal(findPlanForWeek([other, plan], sunday, DENVER)?.id, zone, `${zone} ${formatCalendarDate(sunday)}`);
      assert.equal(findPlanForWeek([other], sunday, DENVER), null);
    }
  }
});

test("findPlanForWeek: nearest wins, empty is null", () => {
  const sunday = sun(2026, 10, 4);
  const exact = { id: "exact", weekStart: zoneMidnightInstant(sunday, DENVER) };
  const far = { id: "far", weekStart: zoneMidnightInstant(sunday, "Pacific/Honolulu") };
  assert.equal(findPlanForWeek([far, exact], sunday, DENVER)?.id, "exact");
  assert.equal(findPlanForWeek([], sunday, DENVER), null);
});

const days = [sun(2026, 10, 9), sun(2026, 10, 10), sun(2026, 10, 11), sun(2026, 10, 12)];
const ids = (m: Map<string, { id: string }[]>, key: string) => m.get(key)!.map((e) => e.id);

test("bucketEventsByDay: all-day on day+2 lands only there", () => {
  const e = { id: "ad", allDay: true, startAt: utcMidnightInstant(sun(2026, 10, 11)), endAt: utcMidnightInstant(sun(2026, 10, 12)) };
  const m = bucketEventsByDay([e], days, DENVER);
  assert.deepEqual(ids(m, "2026-10-09"), []);
  assert.deepEqual(ids(m, "2026-10-10"), []);
  assert.deepEqual(ids(m, "2026-10-11"), ["ad"]);
  assert.deepEqual(ids(m, "2026-10-12"), []);
});

test("bucketEventsByDay: multi-day all-day covers [start, end)", () => {
  const e = { id: "trip", allDay: true, startAt: utcMidnightInstant(sun(2026, 10, 10)), endAt: utcMidnightInstant(sun(2026, 10, 12)) };
  const m = bucketEventsByDay([e], days, DENVER);
  assert.deepEqual(ids(m, "2026-10-09"), []);
  assert.deepEqual(ids(m, "2026-10-10"), ["trip"]);
  assert.deepEqual(ids(m, "2026-10-11"), ["trip"]);
  assert.deepEqual(ids(m, "2026-10-12"), []);
});

test("bucketEventsByDay: timed event crossing Denver midnight covers both days", () => {
  // 11 pm Oct 10 Denver (05:00Z Oct 11) to 1 am Oct 11 Denver (07:00Z)
  const e = { id: "late", allDay: false, startAt: new Date("2026-10-11T05:00:00Z"), endAt: new Date("2026-10-11T07:00:00Z") };
  const m = bucketEventsByDay([e], days, DENVER);
  assert.deepEqual(ids(m, "2026-10-10"), ["late"]);
  assert.deepEqual(ids(m, "2026-10-11"), ["late"]);
  assert.deepEqual(ids(m, "2026-10-09"), []);
  assert.deepEqual(ids(m, "2026-10-12"), []);
});

test("bucketEventsByDay: 6 pm Denver event is its Denver day, not UTC's next", () => {
  const e = { id: "dinner", allDay: false, startAt: new Date("2026-10-11T00:00:00Z"), endAt: new Date("2026-10-11T01:00:00Z") };
  const m = bucketEventsByDay([e], days, DENVER);
  assert.deepEqual(ids(m, "2026-10-10"), ["dinner"]);
  assert.deepEqual(ids(m, "2026-10-11"), []);
});

test("bucketEventsByDay: ending exactly at midnight excludes that day; zero-length covers its start", () => {
  const midnight = zoneMidnightInstant(sun(2026, 10, 11), DENVER);
  const a = { id: "a", allDay: false, startAt: new Date(midnight.getTime() - 3600_000), endAt: midnight };
  const z = { id: "z", allDay: false, startAt: midnight, endAt: midnight };
  const m = bucketEventsByDay([a, z], days, DENVER);
  assert.deepEqual(ids(m, "2026-10-10"), ["a"]);
  assert.deepEqual(ids(m, "2026-10-11"), ["z"]);
});

test("summarizeInventory: total, out, low, expiring (incl. overdue), no double count", () => {
  const today = sun(2026, 10, 9);
  const base = { name: "Zzz Widget", category: "Other", location: "Pantry", lowThreshold: 1, restockedAt: new Date("2026-10-01T12:00:00Z") };
  const items = [
    { ...base, quantity: 0, expiresAt: null },
    { ...base, quantity: 1, expiresAt: null },
    { ...base, quantity: 5, expiresAt: null },
    { ...base, quantity: 5, expiresAt: new Date("2026-10-11T18:00:00Z") },
    { ...base, quantity: 5, expiresAt: new Date("2026-10-01T18:00:00Z") },
    { ...base, quantity: 5, expiresAt: new Date("2026-12-25T18:00:00Z") },
  ];
  assert.deepEqual(summarizeInventory(items, today, DENVER, 7), { total: 6, low: 1, out: 1, expiring: 2 });
});
