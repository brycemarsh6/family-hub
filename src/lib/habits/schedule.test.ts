// Pins schedule.ts: reading a row, scheduled versus open kinds, biweekly
// parity from the anchor week, due states, periods. Dates are plain calendar
// dates, so the results are the same in every time zone; the cases cross the
// November 2026 and March 2027 clock changes on purpose.

import { test } from "node:test";
import assert from "node:assert/strict";
import { dayOfWeek, type CalendarDate } from "../householdDate";
import {
  dueState,
  isDueWeek,
  isOpenKind,
  isScheduledDay,
  periodTarget,
  periodWindow,
  periodsInRange,
  scheduleFromRow,
  scheduledDaysInRange,
} from "./schedule";
import type { ScheduleSpec } from "./types";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });

test("fixture sanity: the dates these tests lean on fall on the weekdays they claim", () => {
  assert.equal(dayOfWeek(d(2026, 11, 1)), 0); // Sunday, the day clocks fell back
  assert.equal(dayOfWeek(d(2027, 3, 14)), 0); // Sunday, the day clocks spring forward
});

test("scheduleFromRow: reads each schedule, clamps times, rejects the unschedulable", () => {
  const row = { schedule: "daily", weekdays: null, times: null, anchorWeek: null };
  assert.deepEqual(scheduleFromRow(row), { schedule: "daily" });
  assert.deepEqual(scheduleFromRow({ ...row, schedule: "weekdays", weekdays: "0100100" }), {
    schedule: "weekdays",
    days: [1, 4],
  });
  assert.equal(scheduleFromRow({ ...row, schedule: "weekdays", weekdays: "0000000" }), null);
  assert.equal(scheduleFromRow({ ...row, schedule: "weekdays", weekdays: "bad" }), null);
  assert.deepEqual(scheduleFromRow({ ...row, schedule: "weekly", times: 99 }), { schedule: "weekly", times: 7 });
  assert.deepEqual(scheduleFromRow({ ...row, schedule: "weekly", times: 0 }), { schedule: "weekly", times: 1 });
  assert.deepEqual(scheduleFromRow({ ...row, schedule: "monthly", times: 40 }), { schedule: "monthly", times: 31 });
  assert.deepEqual(scheduleFromRow({ ...row, schedule: "monthly", times: null }), { schedule: "monthly", times: 1 });
  const anchorWeek = d(2026, 11, 1);
  assert.deepEqual(scheduleFromRow({ ...row, schedule: "biweekly", anchorWeek }), {
    schedule: "biweekly",
    days: [],
    anchorWeek,
  });
  assert.equal(scheduleFromRow({ ...row, schedule: "biweekly" }), null);
  assert.equal(scheduleFromRow({ ...row, schedule: "hourly" }), null);
});

test("isOpenKind: weekly, monthly and biweekly with no days are open", () => {
  const anchorWeek = d(2026, 11, 1);
  assert.equal(isOpenKind({ schedule: "daily" }), false);
  assert.equal(isOpenKind({ schedule: "weekdays", days: [1] }), false);
  assert.equal(isOpenKind({ schedule: "weekly", times: 3 }), true);
  assert.equal(isOpenKind({ schedule: "monthly", times: 3 }), true);
  assert.equal(isOpenKind({ schedule: "biweekly", days: [], anchorWeek }), true);
  assert.equal(isOpenKind({ schedule: "biweekly", days: [2], anchorWeek }), false);
});

test("biweekly parity counts from the anchor week, across the November clock change", () => {
  const spec: ScheduleSpec = { schedule: "biweekly", days: [2], anchorWeek: d(2026, 10, 25) };
  // Weeks starting Oct 25 (due), Nov 1 (off, clocks fall back), Nov 8 (due), Nov 15 (off).
  assert.equal(isDueWeek(spec, d(2026, 10, 27)), true);
  assert.equal(isDueWeek(spec, d(2026, 11, 3)), false);
  assert.equal(isDueWeek(spec, d(2026, 11, 10)), true);
  assert.equal(isDueWeek(spec, d(2026, 11, 17)), false);
  // The anchor week's Sunday and Saturday belong to it; the next Sunday does not.
  assert.equal(isDueWeek(spec, d(2026, 10, 25)), true);
  assert.equal(isDueWeek(spec, d(2026, 10, 31)), true);
  assert.equal(isDueWeek(spec, d(2026, 11, 1)), false);
  // Parity holds before the anchor too.
  assert.equal(isDueWeek(spec, d(2026, 10, 13)), true);
  assert.equal(isDueWeek(spec, d(2026, 10, 20)), false);
  // Tuesdays only, and only in due weeks.
  assert.equal(isScheduledDay(spec, d(2026, 10, 27)), true);
  assert.equal(isScheduledDay(spec, d(2026, 11, 3)), false);
  assert.equal(isScheduledDay(spec, d(2026, 11, 10)), true);
  assert.equal(isScheduledDay(spec, d(2026, 11, 11)), false);
});

test("biweekly parity across the March clock change", () => {
  const spec: ScheduleSpec = { schedule: "biweekly", days: [], anchorWeek: d(2027, 2, 28) };
  assert.equal(isDueWeek(spec, d(2027, 3, 3)), true); // Feb 28 week
  assert.equal(isDueWeek(spec, d(2027, 3, 10)), false); // Mar 7 week
  assert.equal(isDueWeek(spec, d(2027, 3, 14)), true); // Mar 14 week, the spring-forward Sunday
  assert.equal(isDueWeek(spec, d(2027, 3, 20)), true);
  assert.equal(isDueWeek(spec, d(2027, 3, 21)), false);
});

test("isScheduledDay: daily, certain days, and open kinds have no scheduled days", () => {
  assert.equal(isScheduledDay({ schedule: "daily" }, d(2026, 11, 5)), true);
  const mondayThursday: ScheduleSpec = { schedule: "weekdays", days: [1, 4] };
  assert.equal(isScheduledDay(mondayThursday, d(2026, 11, 5)), true); // Thursday
  assert.equal(isScheduledDay(mondayThursday, d(2026, 11, 6)), false);
  assert.equal(isScheduledDay({ schedule: "weekly", times: 3 }, d(2026, 11, 5)), false);
  assert.equal(isScheduledDay({ schedule: "monthly", times: 3 }, d(2026, 11, 5)), false);
});

test("dueState: scheduled kinds are required on their days, none otherwise", () => {
  assert.equal(dueState({ schedule: "daily" }, d(2026, 11, 5), false), "required");
  const mondayThursday: ScheduleSpec = { schedule: "weekdays", days: [1, 4] };
  assert.equal(dueState(mondayThursday, d(2026, 11, 5), false), "required");
  assert.equal(dueState(mondayThursday, d(2026, 11, 6), false), "none");
  const biweekly: ScheduleSpec = { schedule: "biweekly", days: [2], anchorWeek: d(2026, 10, 25) };
  assert.equal(dueState(biweekly, d(2026, 10, 27), false), "required");
  assert.equal(dueState(biweekly, d(2026, 11, 3), false), "none");
});

test("dueState: open kinds are open until the target is met, then none; a planned day is required", () => {
  const weekly: ScheduleSpec = { schedule: "weekly", times: 3 };
  const day = d(2026, 11, 5);
  assert.equal(dueState(weekly, day, false, 0), "open");
  assert.equal(dueState(weekly, day, false, 2), "open");
  assert.equal(dueState(weekly, day, false, 3), "none");
  assert.equal(dueState(weekly, day, true, 1), "required");
  assert.equal(dueState(weekly, day, true, 3), "none");
  const monthly: ScheduleSpec = { schedule: "monthly", times: 2 };
  assert.equal(dueState(monthly, day, false, 1), "open");
  assert.equal(dueState(monthly, day, false, 2), "none");
  // Biweekly with no days: open in a due week, none in an off week.
  const noDays: ScheduleSpec = { schedule: "biweekly", days: [], anchorWeek: d(2026, 10, 25) };
  assert.equal(dueState(noDays, d(2026, 10, 28), false, 0), "open");
  assert.equal(dueState(noDays, d(2026, 10, 28), false, 1), "none");
  assert.equal(dueState(noDays, d(2026, 11, 4), false, 0), "none");
  assert.equal(dueState(noDays, d(2026, 11, 4), true, 0), "none");
});

test("dueState: a planned day makes a scheduled kind required even off its days", () => {
  const mondays: ScheduleSpec = { schedule: "weekdays", days: [1] };
  assert.equal(dueState(mondays, d(2026, 11, 5), true), "required");
});

test("periodWindow and periodTarget: weeks run Sunday to Saturday, months run the whole month", () => {
  // The week of the November clock change.
  assert.deepEqual(periodWindow({ schedule: "daily" }, d(2026, 11, 3)), { start: d(2026, 11, 1), end: d(2026, 11, 7) });
  assert.deepEqual(periodWindow({ schedule: "weekly", times: 2 }, d(2026, 11, 1)), {
    start: d(2026, 11, 1),
    end: d(2026, 11, 7),
  });
  // The week of the March clock change.
  assert.deepEqual(periodWindow({ schedule: "weekly", times: 2 }, d(2027, 3, 13)), {
    start: d(2027, 3, 7),
    end: d(2027, 3, 13),
  });
  assert.deepEqual(periodWindow({ schedule: "monthly", times: 2 }, d(2026, 12, 31)), {
    start: d(2026, 12, 1),
    end: d(2026, 12, 31),
  });
  assert.deepEqual(periodWindow({ schedule: "monthly", times: 2 }, d(2027, 2, 10)), {
    start: d(2027, 2, 1),
    end: d(2027, 2, 28),
  });
  assert.equal(periodTarget({ schedule: "daily" }, d(2026, 11, 5)), 7);
  assert.equal(periodTarget({ schedule: "weekdays", days: [1, 3, 5] }, d(2026, 11, 5)), 3);
  assert.equal(periodTarget({ schedule: "weekly", times: 4 }, d(2026, 11, 5)), 4);
  assert.equal(periodTarget({ schedule: "monthly", times: 9 }, d(2026, 11, 5)), 9);
  const noDays: ScheduleSpec = { schedule: "biweekly", days: [], anchorWeek: d(2026, 10, 25) };
  assert.equal(periodTarget(noDays, d(2026, 10, 28)), 1);
  assert.equal(periodTarget(noDays, d(2026, 11, 4)), 0);
});

test("scheduledDaysInRange: lists the scheduled days across the clock change, ends included", () => {
  const mondayThursday: ScheduleSpec = { schedule: "weekdays", days: [1, 4] };
  assert.deepEqual(scheduledDaysInRange(mondayThursday, d(2026, 10, 29), d(2026, 11, 9)), [
    d(2026, 10, 29),
    d(2026, 11, 2),
    d(2026, 11, 5),
    d(2026, 11, 9),
  ]);
  assert.deepEqual(scheduledDaysInRange({ schedule: "weekly", times: 2 }, d(2026, 11, 1), d(2026, 11, 9)), []);
});

test("periodsInRange: open kinds list the due periods overlapping the range; scheduled kinds list none", () => {
  assert.deepEqual(periodsInRange({ schedule: "daily" }, d(2026, 11, 1), d(2026, 11, 30)), []);
  assert.deepEqual(periodsInRange({ schedule: "weekly", times: 2 }, d(2026, 10, 29), d(2026, 11, 9)), [
    { start: d(2026, 10, 25), end: d(2026, 10, 31) },
    { start: d(2026, 11, 1), end: d(2026, 11, 7) },
    { start: d(2026, 11, 8), end: d(2026, 11, 14) },
  ]);
  assert.deepEqual(periodsInRange({ schedule: "monthly", times: 2 }, d(2026, 11, 15), d(2027, 1, 2)), [
    { start: d(2026, 11, 1), end: d(2026, 11, 30) },
    { start: d(2026, 12, 1), end: d(2026, 12, 31) },
    { start: d(2027, 1, 1), end: d(2027, 1, 31) },
  ]);
  const noDays: ScheduleSpec = { schedule: "biweekly", days: [], anchorWeek: d(2027, 2, 28) };
  assert.deepEqual(periodsInRange(noDays, d(2027, 3, 1), d(2027, 3, 21)), [
    { start: d(2027, 2, 28), end: d(2027, 3, 6) },
    { start: d(2027, 3, 14), end: d(2027, 3, 20) },
  ]);
});
