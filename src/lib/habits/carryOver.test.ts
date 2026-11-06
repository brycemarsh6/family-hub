// Pins carryOver.ts: carry-over for scheduled kinds only, the latest missed
// scheduled day, absorbed when today is itself scheduled (decision 72), and
// which status a tap writes. Plain calendar dates, so time-zone independent.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "../householdDate";
import { CARRY_LOOKBACK_DAYS, carriedFrom, carrySince, habitStartDay, statusForTap } from "./carryOver";
import type { HabitLogDay, ScheduleSpec } from "./types";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const row = (day: CalendarDate, status: HabitLogDay["status"] = "done"): HabitLogDay => ({ day, status });

const wedSat: ScheduleSpec = { schedule: "weekdays", days: [3, 6] };

test("carriedFrom: the latest scheduled day before today with no row", () => {
  // Wednesday Nov 4 missed; Thursday Nov 5 is not scheduled.
  assert.deepEqual(carriedFrom(wedSat, true, [], d(2026, 11, 5)), d(2026, 11, 4));
  // Still carried the next day, until done.
  assert.deepEqual(carriedFrom(wedSat, true, [], d(2026, 11, 6)), d(2026, 11, 4));
});

test("carriedFrom: null when carry-over is off", () => {
  assert.equal(carriedFrom(wedSat, false, [], d(2026, 11, 5)), null);
});

test("carriedFrom: null once the missed day has a row, of any status", () => {
  for (const status of ["done", "late", "skipped"] as const) {
    assert.equal(carriedFrom(wedSat, true, [row(d(2026, 11, 4), status)], d(2026, 11, 5), d(2026, 11, 1)), null, status);
  }
});

test("carriedFrom: absorbed when today is itself scheduled", () => {
  // Saturday Nov 7 is scheduled: Wednesday's miss is absorbed, no done-late row.
  assert.equal(carriedFrom(wedSat, true, [], d(2026, 11, 7)), null);
  assert.equal(carriedFrom({ schedule: "daily" }, true, [], d(2026, 11, 5)), null);
});

test("carriedFrom: open kinds never carry", () => {
  assert.equal(carriedFrom({ schedule: "weekly", times: 3 }, true, [], d(2026, 11, 5)), null);
  assert.equal(carriedFrom({ schedule: "monthly", times: 3 }, true, [], d(2026, 11, 5)), null);
  const noDays: ScheduleSpec = { schedule: "biweekly", days: [], anchorWeek: d(2026, 10, 25) };
  assert.equal(carriedFrom(noDays, true, [], d(2026, 11, 5)), null);
});

test("carriedFrom: biweekly with days carries from its due week only", () => {
  const tuesdays: ScheduleSpec = { schedule: "biweekly", days: [2], anchorWeek: d(2026, 10, 25) };
  // Tuesday Oct 27 was due and missed; Tuesday Nov 3 was an off week.
  assert.deepEqual(carriedFrom(tuesdays, true, [], d(2026, 11, 5)), d(2026, 10, 27));
  assert.equal(carriedFrom(tuesdays, true, [row(d(2026, 10, 27))], d(2026, 11, 5)), null);
});

test("carriedFrom: an older missed day is absorbed when the newest scheduled day has a row", () => {
  const logs = [row(d(2026, 11, 4))];
  // Saturday Oct 31 was missed, Wednesday Nov 4 was done; today Thursday Nov 5.
  assert.equal(carriedFrom(wedSat, true, logs, d(2026, 11, 5)), null);
});

test("carriedFrom: Mon+Wed habit, Mon missed, Wed done, Thursday carries nothing", () => {
  const monWed: ScheduleSpec = { schedule: "weekdays", days: [1, 3] };
  assert.equal(carriedFrom(monWed, true, [row(d(2026, 11, 4))], d(2026, 11, 5)), null);
  // Wed not done either: the newest miss (Wed) is the one carried.
  assert.deepEqual(carriedFrom(monWed, true, [], d(2026, 11, 5)), d(2026, 11, 4));
});

test("carriedFrom: not before `since`, and not past the lookback", () => {
  assert.equal(carriedFrom(wedSat, true, [], d(2026, 11, 5), d(2026, 11, 5)), null);
  assert.deepEqual(carriedFrom(wedSat, true, [], d(2026, 11, 5), d(2026, 11, 4)), d(2026, 11, 4));
  // A habit scheduled only on one old day, further back than the lookback, is not carried.
  const monthStart: ScheduleSpec = { schedule: "weekdays", days: [1] };
  assert.equal(CARRY_LOOKBACK_DAYS, 14);
  assert.equal(carriedFrom(monthStart, true, [row(d(2026, 11, 2)), row(d(2026, 10, 26))], d(2026, 11, 5)), null);
});

test("carriedFrom: across the November clock change", () => {
  // Saturday Oct 31 missed; Sunday Nov 1 the clocks fell back; Monday Nov 2.
  assert.deepEqual(carriedFrom(wedSat, true, [], d(2026, 11, 2)), d(2026, 10, 31));
});

test("statusForTap: late only for the carried day, done for today and back-fills", () => {
  const carried = d(2026, 11, 4);
  assert.equal(statusForTap(carried, carried), "late");
  assert.equal(statusForTap(d(2026, 11, 5), carried), "done"); // today's own tap
  assert.equal(statusForTap(d(2026, 11, 2), carried), "done"); // back-fill of another day
  assert.equal(statusForTap(d(2026, 11, 5), null), "done");
});

test("habitStartDay: the household (Denver) day a habit was made, not the UTC day", () => {
  assert.deepEqual(habitStartDay(new Date("2026-11-05T15:00:00Z")), d(2026, 11, 5)); // 8:00 in Denver
  assert.deepEqual(habitStartDay(new Date("2026-11-06T04:00:00Z")), d(2026, 11, 5)); // 9pm in Denver, already the 6th in UTC
});

test("carrySince: the later of the day the habit was made and the day the person joined", () => {
  const start = d(2026, 11, 2);
  assert.deepEqual(carrySince(new Date("2026-11-04T15:00:00Z"), start), d(2026, 11, 4)); // joined later
  assert.deepEqual(carrySince(new Date("2026-10-30T15:00:00Z"), start), start); // joined before it was made
  assert.deepEqual(carrySince(new Date("2026-11-02T15:00:00Z"), start), start); // same day
  assert.deepEqual(carrySince(undefined, start), start);
  assert.deepEqual(carrySince(null, start), start);
});
