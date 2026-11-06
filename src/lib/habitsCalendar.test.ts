// Pins habitsCalendar.ts (decision 146): who sees a planned habit day on the
// Calendar, and when it reads as done.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCalendarHabitDays, plannedPeriodsRange, type PlannedDayRow } from "./habitsCalendar";
import type { HabitActor } from "./habits/types";

const emily: HabitActor = { userId: "emily", role: "parent" };
const bryce: HabitActor = { userId: "bryce", role: "admin" };
const MON = new Date(Date.UTC(2026, 10, 9));
const TUE = new Date(Date.UTC(2026, 10, 10));

function row(over: Partial<PlannedDayRow> = {}): PlannedDayRow {
  return { schedule: "weekly", weekdays: null, times: 1, anchorWeek: null, habitId: "h1", userId: "emily", title: "Run", icon: "Bike", kind: "habit", isPrivate: false, participantIds: ["emily", "bryce"], day: MON, ...over };
}

test("a participant sees their own planned day, undone and plain", () => {
  const items = buildCalendarHabitDays(emily, [row()], []);
  assert.equal(items.length, 1);
  assert.deepEqual({ id: items[0].id, habitId: items[0].habitId, icon: items[0].icon, done: items[0].done }, { id: "h1:2026-11-09", habitId: "h1", icon: "Bike", done: false });
});

test("a Together habit shows once, from the viewer's own row only", () => {
  const rows = [row(), row({ userId: "bryce" })];
  assert.equal(buildCalendarHabitDays(emily, rows, []).length, 1);
  assert.equal(buildCalendarHabitDays(bryce, rows, []).length, 1);
});

test("someone not on the habit never sees it, even a manager", () => {
  // A person removed from a habit keeps their planned rows: this is the participant rule, not the owner rule.
  assert.deepEqual(buildCalendarHabitDays(emily, [row({ userId: "emily", participantIds: ["bryce"] })], []), []);
  assert.deepEqual(buildCalendarHabitDays(bryce, [row({ userId: "bryce", participantIds: ["emily"] })], []), []);
  // Another person's row (even on a habit the viewer is on) is not the viewer's day.
  assert.deepEqual(buildCalendarHabitDays(bryce, [row()], []), []);
});

test("the tablet sees none", () => {
  const tablet: HabitActor = { userId: "tablet", role: "device" };
  assert.deepEqual(buildCalendarHabitDays(tablet, [row({ userId: "tablet", participantIds: ["tablet"] })], []), []);
});

test("a private habit shows only to its person", () => {
  const mine = row({ isPrivate: true, participantIds: ["emily"] });
  assert.equal(buildCalendarHabitDays(emily, [mine], []).length, 1);
  assert.equal(buildCalendarHabitDays(bryce, [mine], []).length, 0);
});

test("done or late for the viewer on that day is done; skipped, another day or another person is not", () => {
  const rows = [row({ times: 2 }), row({ times: 2, day: TUE })];
  assert.equal(buildCalendarHabitDays(emily, rows, [{ habitId: "h1", userId: "emily", day: MON, status: "done" }])[0].done, true);
  assert.equal(buildCalendarHabitDays(emily, rows, [{ habitId: "h1", userId: "emily", day: MON, status: "late" }])[0].done, true);
  assert.equal(buildCalendarHabitDays(emily, rows, [{ habitId: "h1", userId: "emily", day: MON, status: "skipped" }])[0].done, false);
  assert.equal(buildCalendarHabitDays(emily, rows, [{ habitId: "h1", userId: "bryce", day: MON, status: "done" }])[0].done, false);
  const tue = buildCalendarHabitDays(emily, rows, [{ habitId: "h1", userId: "emily", day: MON, status: "done" }]);
  assert.deepEqual(tue.map((i) => i.done), [true, false]);
});

test("items come out in day then title order, a chore keeps its kind", () => {
  const items = buildCalendarHabitDays(emily, [row({ habitId: "b", title: "Zed", day: MON }), row({ habitId: "a", title: "Ann", kind: "chore", day: MON }), row({ habitId: "c", title: "Aaa", day: TUE })], []);
  assert.deepEqual(items.map((i) => i.title), ["Ann", "Zed", "Aaa"]);
  assert.equal(items[0].kind, "chore");
});

// --- A met period draws its planned days done (decision 160) ---------------

const FRI = new Date(Date.UTC(2026, 10, 13));
const SAT = new Date(Date.UTC(2026, 10, 14));
const check = (day: Date, status = "done", userId = "emily") => ({ habitId: "h1", userId, day, status });

test("period met: Saturday planned and Friday checked, weekly target 1, draws done", () => {
  const [item] = buildCalendarHabitDays(emily, [row({ day: SAT })], [check(FRI)]);
  assert.equal(item.done, true);
});

test("period not met: a target of 2 with one check stays plain", () => {
  const [item] = buildCalendarHabitDays(emily, [row({ day: SAT, times: 2 })], [check(FRI)]);
  assert.equal(item.done, false);
  assert.equal(buildCalendarHabitDays(emily, [row({ day: SAT, times: 2 })], [check(FRI), check(MON, "late")])[0].done, true);
});

test("period met: a monthly habit checked earlier in the month draws done, but not next month's", () => {
  const monthly = row({ schedule: "monthly", day: new Date(Date.UTC(2026, 10, 20)) });
  assert.equal(buildCalendarHabitDays(emily, [monthly], [check(new Date(Date.UTC(2026, 10, 3)))])[0].done, true);
  assert.equal(buildCalendarHabitDays(emily, [monthly], [check(new Date(Date.UTC(2026, 9, 28)))])[0].done, false);
});

test("period met: a skip never counts, nor does another person's check or another week", () => {
  assert.equal(buildCalendarHabitDays(emily, [row({ day: SAT })], [check(FRI, "skipped")])[0].done, false);
  assert.equal(buildCalendarHabitDays(emily, [row({ day: SAT })], [check(FRI, "done", "bryce")])[0].done, false);
  assert.equal(buildCalendarHabitDays(emily, [row({ day: SAT })], [check(new Date(Date.UTC(2026, 10, 6)))])[0].done, false);
});

test("plannedPeriodsRange: the union of each planned day's whole period, end exclusive; null with no rows", () => {
  assert.equal(plannedPeriodsRange([]), null);
  const range = plannedPeriodsRange([row({ day: SAT }), row({ schedule: "monthly", day: new Date(Date.UTC(2026, 11, 10)) })]);
  assert.equal(range?.from.toISOString(), "2026-11-08T00:00:00.000Z");
  assert.equal(range?.to.toISOString(), "2027-01-01T00:00:00.000Z");
});

test("an hours habit never shows as a planned day (decision 197), even from an old planned row", () => {
  assert.deepEqual(buildCalendarHabitDays(emily, [row({ track: "hours" })], []), []);
  assert.equal(buildCalendarHabitDays(emily, [row({ track: "checks" })], []).length, 1);
});
