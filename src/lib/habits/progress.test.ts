// Pins progress.ts: the counts Plans & Goals shows ("3 of 7 this week"),
// including the daily "7 this week" target it has always had, and how a
// Together habit's fanned-out checks collapse to one per day. Plain calendar
// dates, so the results are the same in every time zone.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "../householdDate";
import { countDays, distinctDays, windowProgress } from "./progress";
import type { HabitLogDay } from "./types";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const done = (day: CalendarDate, userId?: string): HabitLogDay => ({ day, status: "done", userId });

test("windowProgress: a daily habit keeps the old '7 this week' target", () => {
  const today = d(2026, 11, 5); // Thursday of the week starting Sunday Nov 1
  const logs = [done(d(2026, 11, 1)), done(d(2026, 11, 3)), done(d(2026, 11, 5))];
  assert.deepEqual(windowProgress({ schedule: "daily" }, logs, today), {
    start: d(2026, 11, 1),
    end: d(2026, 11, 7),
    count: 3,
    target: 7,
    label: "this week",
    doneToday: true,
  });
});

test("windowProgress: weekly counts the week against N, doneToday false until today is checked", () => {
  const logs = [done(d(2026, 11, 2)), done(d(2026, 11, 4)), done(d(2026, 10, 31))];
  const progress = windowProgress({ schedule: "weekly", times: 3 }, logs, d(2026, 11, 5));
  assert.equal(progress.count, 2); // Oct 31 is last week's Saturday
  assert.equal(progress.target, 3);
  assert.equal(progress.label, "this week");
  assert.equal(progress.doneToday, false);
});

test("windowProgress: monthly counts the whole month, December rolls into January", () => {
  const logs = [done(d(2026, 12, 1)), done(d(2026, 12, 31)), done(d(2027, 1, 1)), done(d(2026, 11, 30))];
  const progress = windowProgress({ schedule: "monthly", times: 4 }, logs, d(2026, 12, 15));
  assert.deepEqual([progress.start, progress.end], [d(2026, 12, 1), d(2026, 12, 31)]);
  assert.equal(progress.count, 2);
  assert.equal(progress.target, 4);
  assert.equal(progress.label, "this month");
});

test("windowProgress: the week of the March clock change counts all seven days", () => {
  const week = [7, 8, 9, 10, 11, 12, 13].map((day) => done(d(2027, 3, day)));
  const progress = windowProgress({ schedule: "daily" }, week, d(2027, 3, 13));
  assert.equal(progress.count, 7);
  assert.equal(progress.target, 7);
});

test("windowProgress: a daily habit's week turns over on Sunday (moved from logWindow)", () => {
  const sat = windowProgress({ schedule: "daily" }, [], d(2026, 11, 7));
  assert.deepEqual([sat.start, sat.end, sat.target], [d(2026, 11, 1), d(2026, 11, 7), 7]);
  const sun = windowProgress({ schedule: "daily" }, [], d(2026, 11, 8));
  assert.deepEqual([sun.start, sun.end, sun.target], [d(2026, 11, 8), d(2026, 11, 14), 7]);
});

test("windowProgress: a month window ends on the month's last day, leap years and all (moved from logWindow)", () => {
  const monthly = { schedule: "monthly", times: 2 } as const;
  assert.deepEqual(windowProgress(monthly, [], d(2027, 1, 31)).end, d(2027, 1, 31));
  assert.deepEqual(windowProgress(monthly, [], d(2027, 2, 1)).end, d(2027, 2, 28));
  assert.deepEqual(windowProgress(monthly, [], d(2028, 2, 10)).end, d(2028, 2, 29));
});

test("countDays: both ends count, the day before and the day after do not (moved from countInWindow)", () => {
  const range = { start: d(2026, 11, 1), end: d(2026, 11, 7) };
  const logs = [d(2026, 10, 31), d(2026, 11, 1), d(2026, 11, 7), d(2026, 11, 8)].map((day) => done(day));
  assert.equal(countDays(logs, range), 2);
});

test("countDays: ends included, repeats on one day count once, a skip does not count, a late row does", () => {
  const range = { start: d(2026, 11, 1), end: d(2026, 11, 7) };
  const logs: HabitLogDay[] = [
    done(d(2026, 11, 1)),
    done(d(2026, 11, 7)),
    done(d(2026, 11, 7)),
    { day: d(2026, 11, 3), status: "skipped" },
    { day: d(2026, 11, 4), status: "late" },
    done(d(2026, 11, 8)),
  ];
  assert.equal(countDays(logs, range), 3);
});

test("distinctDays: three people's checks on one day are one day (Together, after fan-out)", () => {
  const logs = [
    done(d(2026, 11, 3), "a"),
    done(d(2026, 11, 3), "b"),
    done(d(2026, 11, 3), "c"),
    done(d(2026, 11, 2), "a"),
  ];
  assert.deepEqual(distinctDays(logs), [
    { day: d(2026, 11, 2), status: "done" },
    { day: d(2026, 11, 3), status: "done" },
  ]);
  const progress = windowProgress({ schedule: "daily" }, distinctDays(logs), d(2026, 11, 5));
  assert.equal(progress.count, 2);
});

test("distinctDays: the best status wins and the input is left alone", () => {
  const logs: HabitLogDay[] = [
    { day: d(2026, 11, 3), status: "skipped", userId: "a" },
    { day: d(2026, 11, 3), status: "done", userId: "b" },
    { day: d(2026, 11, 4), status: "skipped", userId: "a" },
    { day: d(2026, 11, 4), status: "late", userId: "b" },
  ];
  assert.deepEqual(distinctDays(logs), [
    { day: d(2026, 11, 3), status: "done" },
    { day: d(2026, 11, 4), status: "late" },
  ]);
  assert.equal(logs[0].userId, "a");
});
