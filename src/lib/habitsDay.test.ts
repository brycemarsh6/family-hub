import { test } from "node:test";
import assert from "node:assert/strict";
import { habitsHref, resolveHabitsDay } from "./habitsDay";
import { formatCalendarDate } from "./householdDate";

const today = { year: 2026, month: 11, day: 7 };

test("missing, malformed and impossible days are today", () => {
  for (const param of [undefined, "", "yesterday", "2026-11", "2026-13-01", "2026-02-30", "11/06/2026"]) {
    const result = resolveHabitsDay(param, today);
    assert.deepEqual(result.day, today, String(param));
    assert.equal(result.isToday, true);
  }
});

test("a future day is today", () => {
  assert.deepEqual(resolveHabitsDay("2026-11-08", today).day, today);
  assert.deepEqual(resolveHabitsDay("2027-01-01", today).day, today);
});

test("15 days back and further is today", () => {
  assert.deepEqual(resolveHabitsDay("2026-10-23", today).day, today);
  assert.deepEqual(resolveHabitsDay("2020-01-01", today).day, today);
});

test("0, 1 and 14 days back are that day", () => {
  assert.equal(formatCalendarDate(resolveHabitsDay("2026-11-07", today).day), "2026-11-07");
  assert.equal(formatCalendarDate(resolveHabitsDay("2026-11-06", today).day), "2026-11-06");
  const floor = resolveHabitsDay("2026-10-24", today);
  assert.equal(formatCalendarDate(floor.day), "2026-10-24");
  assert.equal(floor.isToday, false);
});

test("an array param uses its first value", () => {
  assert.equal(formatCalendarDate(resolveHabitsDay(["2026-11-05", "2026-11-01"], today).day), "2026-11-05");
});

test("prev and next at both bounds", () => {
  const onToday = resolveHabitsDay(undefined, today);
  assert.equal(onToday.next, null);
  assert.equal(onToday.prev, "2026-11-06");
  const middle = resolveHabitsDay("2026-11-03", today);
  assert.equal(middle.prev, "2026-11-02");
  assert.equal(middle.next, "2026-11-04");
  const floor = resolveHabitsDay("2026-10-24", today);
  assert.equal(floor.prev, null);
  assert.equal(floor.next, "2026-10-25");
  const aboveFloor = resolveHabitsDay("2026-10-25", today);
  assert.equal(aboveFloor.prev, "2026-10-24");
});

test("daylight saving days are ordinary days", () => {
  const spring = resolveHabitsDay("2026-03-08", { year: 2026, month: 3, day: 9 });
  assert.equal(formatCalendarDate(spring.day), "2026-03-08");
  assert.equal(spring.prev, "2026-03-07");
  assert.equal(spring.next, "2026-03-09");
  const fall = resolveHabitsDay("2026-11-01", { year: 2026, month: 11, day: 2 });
  assert.equal(formatCalendarDate(fall.day), "2026-11-01");
  assert.equal(fall.prev, "2026-10-31");
  assert.equal(fall.next, "2026-11-02");
  // 14 days back across the fall change is still allowed, 15 is not.
  const across = { year: 2026, month: 11, day: 8 };
  const floor = resolveHabitsDay("2026-10-25", across);
  assert.equal(formatCalendarDate(floor.day), "2026-10-25");
  assert.equal(floor.prev, null);
  assert.equal(resolveHabitsDay("2026-10-24", across).isToday, true);
  const springFloor = resolveHabitsDay("2026-03-01", { year: 2026, month: 3, day: 15 });
  assert.equal(formatCalendarDate(springFloor.day), "2026-03-01");
  assert.equal(springFloor.prev, null);
});

test("habitsHref keeps the view and person, and leaves today's day out", () => {
  assert.equal(habitsHref({ family: false }), "/habits");
  assert.equal(habitsHref({ family: false, day: "2026-11-05", person: "p1" }), "/habits?day=2026-11-05");
  assert.equal(habitsHref({ family: true }), "/habits?view=family");
  assert.equal(habitsHref({ family: true, person: "p1", day: "2026-11-05" }), "/habits?view=family&person=p1&day=2026-11-05");
});
