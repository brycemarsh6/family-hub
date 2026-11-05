// Pins streaks.ts against the rules written at the top of that file
// (decision 80, audit D3): due days only for scheduled kinds, periods for
// open kinds, excused skips and vacations, "late" breaks, today never breaks.
// Plain calendar dates; the windows cross the November 2026 and March 2027
// clock changes, and the results are the same in every time zone.

import { test } from "node:test";
import assert from "node:assert/strict";
import { addCalendarDays, type CalendarDate } from "../householdDate";
import { computeStreaks, streakAfter } from "./streaks";
import type { HabitLogDay, ScheduleSpec, Vacation } from "./types";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const done = (...days: CalendarDate[]): HabitLogDay[] => days.map((day) => ({ day, status: "done" }));
const run = (from: CalendarDate, n: number) => done(...Array.from({ length: n }, (_, i) => addCalendarDays(from, i)));
const daily: ScheduleSpec = { schedule: "daily" };
const none: Vacation[] = [];

function summary(spec: ScheduleSpec, logs: HabitLogDay[], today: CalendarDate, vacations = none) {
  const { current, best } = computeStreaks(spec, logs, vacations, today);
  return { current, best };
}

test("daily: consecutive done days grow the streak, across the November clock change", () => {
  // Oct 29 through Nov 4, today Nov 4, all done.
  assert.deepEqual(summary(daily, run(d(2026, 10, 29), 7), d(2026, 11, 4)), { current: 7, best: 7 });
});

test("daily: a day with no row breaks it; best keeps the old run", () => {
  const logs = done(d(2026, 11, 1), d(2026, 11, 2), d(2026, 11, 3));
  assert.deepEqual(summary(daily, logs, d(2026, 11, 5)), { current: 0, best: 3 });
  assert.deepEqual(summary(daily, [...logs, ...done(d(2026, 11, 5))], d(2026, 11, 5)), { current: 1, best: 3 });
});

test("today never breaks a streak until it is over", () => {
  const logs = done(d(2026, 11, 1), d(2026, 11, 2), d(2026, 11, 3), d(2026, 11, 4));
  assert.deepEqual(summary(daily, logs, d(2026, 11, 5)), { current: 4, best: 4 });
  assert.deepEqual(summary(daily, logs, d(2026, 11, 6)), { current: 0, best: 4 });
});

test("a skipped day is excused: the streak survives and does not grow", () => {
  const logs: HabitLogDay[] = [
    ...done(d(2026, 11, 1)),
    { day: d(2026, 11, 2), status: "skipped" },
    ...done(d(2026, 11, 3)),
  ];
  assert.deepEqual(summary(daily, logs, d(2026, 11, 3)), { current: 2, best: 2 });
});

test("a vacation day is excused, with or without a row, and a done row on it does not grow", () => {
  const vacation: Vacation[] = [{ start: d(2026, 11, 2), end: d(2026, 11, 3) }];
  const logs = done(d(2026, 11, 1), d(2026, 11, 4));
  assert.deepEqual(summary(daily, logs, d(2026, 11, 4), vacation), { current: 2, best: 2 });
  assert.deepEqual(summary(daily, [...logs, ...done(d(2026, 11, 3))], d(2026, 11, 4), vacation), {
    current: 2,
    best: 2,
  });
});

test("a late row keeps its day missed and breaks the streak", () => {
  const logs: HabitLogDay[] = [
    ...done(d(2026, 11, 1)),
    { day: d(2026, 11, 2), status: "late" },
    ...done(d(2026, 11, 3)),
  ];
  assert.deepEqual(summary(daily, logs, d(2026, 11, 3)), { current: 1, best: 1 });
});

test("certain days: only due days count; a non-due day never breaks or grows", () => {
  const mondayThursday: ScheduleSpec = { schedule: "weekdays", days: [1, 4] };
  // Mon Nov 2 and Thu Nov 5 done; Tue to Wed and Fri to Sun have no rows.
  const logs = done(d(2026, 10, 29), d(2026, 11, 2), d(2026, 11, 5));
  assert.deepEqual(summary(mondayThursday, logs, d(2026, 11, 8)), { current: 3, best: 3 });
  // Monday Nov 9 passes unchecked and breaks it.
  assert.deepEqual(summary(mondayThursday, logs, d(2026, 11, 10)), { current: 0, best: 3 });
  // A done row on a non-due day does not grow it.
  assert.deepEqual(summary(mondayThursday, [...logs, ...done(d(2026, 11, 3))], d(2026, 11, 8)), {
    current: 3,
    best: 3,
  });
});

test("biweekly with days: only the due week's days count, across the March clock change", () => {
  // Sundays of due weeks: Feb 28, Mar 14. Tuesdays: Mar 2 and Mar 16.
  const spec: ScheduleSpec = { schedule: "biweekly", days: [2], anchorWeek: d(2027, 2, 28) };
  const logs = done(d(2027, 3, 2), d(2027, 3, 16));
  assert.deepEqual(summary(spec, logs, d(2027, 3, 20)), { current: 2, best: 2 });
  assert.deepEqual(summary(spec, done(d(2027, 3, 2)), d(2027, 3, 20)), { current: 0, best: 1 });
  // The off-week Tuesday (Mar 9) is not due, so it never broke anything.
  assert.deepEqual(summary(spec, logs, d(2027, 3, 10)), { current: 1, best: 1 });
});

test("weekly: periods count once N is reached, the current period as soon as it is met", () => {
  const weekly: ScheduleSpec = { schedule: "weekly", times: 2 };
  // Week Oct 25 met (2), week Nov 1 met (2) on Nov 3, today Nov 3.
  const logs = done(d(2026, 10, 26), d(2026, 10, 30), d(2026, 11, 2), d(2026, 11, 3));
  assert.deepEqual(summary(weekly, logs, d(2026, 11, 3)), { current: 2, best: 2 });
  // Current week short of N: neutral, previous week still counted.
  assert.deepEqual(summary(weekly, logs.slice(0, 3), d(2026, 11, 5)), { current: 1, best: 1 });
  // A finished week short of N breaks it.
  assert.deepEqual(summary(weekly, logs.slice(0, 3), d(2026, 11, 9)), { current: 0, best: 1 });
});

test("monthly: counts whole months, December into January", () => {
  const monthly: ScheduleSpec = { schedule: "monthly", times: 2 };
  const logs = done(d(2026, 11, 3), d(2026, 11, 20), d(2026, 12, 5), d(2026, 12, 6), d(2027, 1, 4));
  assert.deepEqual(summary(monthly, logs, d(2027, 1, 10)), { current: 2, best: 2 });
  assert.deepEqual(summary(monthly, logs, d(2027, 2, 1)), { current: 0, best: 2 });
});

test("biweekly with no days: off weeks are neutral", () => {
  const spec: ScheduleSpec = { schedule: "biweekly", days: [], anchorWeek: d(2027, 2, 28) };
  const logs = done(d(2027, 3, 1), d(2027, 3, 15)); // one check in each due week; Mar 7 week is off
  assert.deepEqual(summary(spec, logs, d(2027, 3, 18)), { current: 2, best: 2 });
});

test("a vacation excuses a weekly period that cannot reach N, and no row means no streak", () => {
  const weekly: ScheduleSpec = { schedule: "weekly", times: 3 };
  const vacation: Vacation[] = [{ start: d(2026, 11, 3), end: d(2026, 11, 7) }]; // leaves 2 days, short of 3
  const logs = done(d(2026, 10, 26), d(2026, 10, 27), d(2026, 10, 28));
  assert.deepEqual(summary(weekly, logs, d(2026, 11, 9), vacation), { current: 1, best: 1 });
  assert.deepEqual(summary(weekly, logs, d(2026, 11, 9)), { current: 0, best: 1 });
  assert.deepEqual(summary(daily, [], d(2026, 11, 9)), { current: 0, best: 0 });
});

test("asOf: today, or the day before an unmet current period starts", () => {
  const weekly: ScheduleSpec = { schedule: "weekly", times: 2 };
  assert.deepEqual(computeStreaks(daily, done(d(2026, 11, 3)), none, d(2026, 11, 5)).asOf, d(2026, 11, 5));
  const unmet = computeStreaks(weekly, done(d(2026, 11, 3)), none, d(2026, 11, 5));
  assert.deepEqual(unmet.asOf, d(2026, 10, 31));
  const met = computeStreaks(weekly, done(d(2026, 11, 3), d(2026, 11, 4)), none, d(2026, 11, 5));
  assert.deepEqual(met.asOf, d(2026, 11, 5));
});

test("streakAfter: a daily cache breaks on a passed due day, holds while only today is open", () => {
  const cache = { current: 5, best: 9, asOf: d(2026, 11, 3) };
  assert.deepEqual(streakAfter(daily, cache, none, d(2026, 11, 4)), { current: 5, best: 9, asOf: d(2026, 11, 4) });
  assert.deepEqual(streakAfter(daily, cache, none, d(2026, 11, 5)), { current: 0, best: 9, asOf: d(2026, 11, 5) });
  const vacation: Vacation[] = [{ start: d(2026, 11, 4), end: d(2026, 11, 4) }];
  assert.equal(streakAfter(daily, cache, vacation, d(2026, 11, 5)).current, 5);
});

test("streakAfter: certain days ignore non-due gaps", () => {
  const mondayThursday: ScheduleSpec = { schedule: "weekdays", days: [1, 4] };
  const cache = { current: 3, best: 3, asOf: d(2026, 11, 2) }; // Monday
  assert.equal(streakAfter(mondayThursday, cache, none, d(2026, 11, 5)).current, 3); // Thu is today
  assert.equal(streakAfter(mondayThursday, cache, none, d(2026, 11, 6)).current, 0); // Thu passed
});

test("streakAfter: weekly holds through the met week, breaks after an unlogged due week", () => {
  const weekly: ScheduleSpec = { schedule: "weekly", times: 2 };
  const cache = { current: 2, best: 2, asOf: d(2026, 11, 3) }; // week Nov 1 met on Nov 3
  assert.equal(streakAfter(weekly, cache, none, d(2026, 11, 9)).current, 2);
  assert.equal(streakAfter(weekly, cache, none, d(2026, 11, 16)).current, 0);
  const unmetCache = { current: 1, best: 1, asOf: d(2026, 10, 31) }; // current week was short of N
  assert.equal(streakAfter(weekly, unmetCache, none, d(2026, 11, 6)).current, 1);
  assert.equal(streakAfter(weekly, unmetCache, none, d(2026, 11, 9)).current, 0);
});

test("streakAfter: a cache never computed, or already today's, comes back unchanged", () => {
  assert.deepEqual(streakAfter(daily, { current: 4, best: 6, asOf: null }, none, d(2026, 11, 5)), {
    current: 4,
    best: 6,
    asOf: d(2026, 11, 5),
  });
  const cache = { current: 4, best: 6, asOf: d(2026, 11, 5) };
  assert.deepEqual(streakAfter(daily, cache, none, d(2026, 11, 5)), cache);
});

test("streakAfter agrees with computeStreaks on the same logs, at every later day", () => {
  const specs: ScheduleSpec[] = [
    daily,
    { schedule: "weekdays", days: [1, 4] },
    { schedule: "weekly", times: 2 },
    { schedule: "monthly", times: 2 },
  ];
  const logs = done(d(2026, 10, 26), d(2026, 10, 29), d(2026, 11, 2), d(2026, 11, 3));
  const at = d(2026, 11, 3);
  for (const spec of specs) {
    const cached = computeStreaks(spec, logs, none, at);
    for (let n = 0; n <= 70; n++) {
      const later = addCalendarDays(at, n);
      assert.equal(
        streakAfter(spec, cached, none, later).current,
        computeStreaks(spec, logs, none, later).current,
        `${spec.schedule} on day +${n}`,
      );
    }
  }
});
