// Pins habitsStats.ts: the numbers, month calendar, side by side table and
// weekly series of the stats page. Plain calendar days, so the results are the
// same in every time zone. "Today" is Thursday 2026-11-05 unless a test says
// otherwise.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "./householdDate";
import type { DayEntry } from "./habits/perfectDays";
import type { HabitLogDay, ScheduleSpec, Vacation } from "./habits/types";
import {
  completionRate,
  monthCalendar,
  perfectDaysInMonth,
  personTotals,
  sideBySideRows,
  statsStreakUnit,
  weeklySeries,
  type StatsInput,
  type StatsPerson,
} from "./habitsStats";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const today = d(2026, 11, 5);
const daily: ScheduleSpec = { schedule: "daily" };

function person(userId: string, overrides: Partial<StatsPerson> = {}): StatsPerson {
  return {
    userId,
    displayName: userId,
    avatarColor: "#123456",
    since: d(2026, 10, 1),
    deactivated: false,
    cache: { current: 0, best: 0, asOf: null },
    ...overrides,
  };
}

const log = (userId: string, day: CalendarDate, status: HabitLogDay["status"] = "done"): HabitLogDay => ({ userId, day, status });

function input(overrides: Partial<StatsInput> = {}): StatsInput {
  return { spec: daily, people: [person("amy")], logs: [], vacationsByUser: new Map(), today, ...overrides };
}

test("personTotals: current is the cache aged by streakAfter, best never drops below it, total counts done and late", () => {
  const amy = person("amy", { cache: { current: 5, best: 9, asOf: d(2026, 11, 4) } });
  const logs = [log("amy", d(2026, 11, 2)), log("amy", d(2026, 11, 3), "late"), log("amy", d(2026, 11, 4), "skipped"), log("bob", d(2026, 11, 4))];
  const totals = personTotals(input({ people: [amy], logs }), "amy");
  assert.deepEqual(totals, { userId: "amy", current: 5, best: 9, total: 2, unit: "days" });
});

test("personTotals: a streak that went stale ages to zero, a missed day with no vacation breaks it", () => {
  const stale = person("amy", { cache: { current: 5, best: 5, asOf: d(2026, 11, 2) } });
  assert.equal(personTotals(input({ people: [stale] }), "amy")?.current, 0);
  const excused = new Map([["amy", [{ start: d(2026, 11, 3), end: d(2026, 11, 4) } as Vacation]]]);
  assert.equal(personTotals(input({ people: [stale], vacationsByUser: excused }), "amy")?.current, 5);
});

test("personTotals: someone who is not on the habit gets null", () => {
  assert.equal(personTotals(input(), "stranger"), null);
});

test("statsStreakUnit: days for scheduled kinds, weeks for weekly and open biweekly, months for monthly", () => {
  assert.equal(statsStreakUnit({ spec: daily }), "days");
  assert.equal(statsStreakUnit({ spec: { schedule: "weekdays", days: [1] } }), "days");
  assert.equal(statsStreakUnit({ spec: { schedule: "weekly", times: 3 } }), "weeks");
  assert.equal(statsStreakUnit({ spec: { schedule: "biweekly", days: [], anchorWeek: d(2026, 11, 1) } }), "weeks");
  assert.equal(statsStreakUnit({ spec: { schedule: "monthly", times: 2 } }), "months");
});

test("monthCalendar: every state, today and the future", () => {
  const logs = [log("amy", d(2026, 11, 1)), log("amy", d(2026, 11, 2), "late"), log("amy", d(2026, 11, 3), "skipped")];
  const cal = monthCalendar(input({ logs }), "amy", today)!;
  const state = (day: number) => cal.cells[day - 1].state;
  assert.equal(state(1), "done");
  assert.equal(state(2), "late");
  assert.equal(state(3), "skipped");
  assert.equal(state(4), "missed");
  assert.equal(state(5), "today");
  assert.equal(state(6), "future");
  assert.equal(state(30), "future");
});

test("monthCalendar: a checked today shows its check, not 'today'", () => {
  const cal = monthCalendar(input({ logs: [log("amy", today)] }), "amy", today)!;
  assert.equal(cal.cells[4].state, "done");
});

test("monthCalendar: days not due, on vacation or before joining are not missed", () => {
  const mondays: ScheduleSpec = { schedule: "weekdays", days: [1] };
  const away = new Map([["amy", [{ start: d(2026, 11, 2), end: d(2026, 11, 2) }]]]);
  const cal = monthCalendar(input({ spec: mondays, vacationsByUser: away }), "amy", today)!;
  assert.equal(cal.cells[1].state, "notDue"); // Monday 2nd, on vacation
  assert.equal(cal.cells[2].state, "notDue"); // Tuesday 3rd, not a scheduled day
  const joined = person("amy", { since: d(2026, 11, 10) });
  assert.equal(monthCalendar(input({ people: [joined] }), "amy", d(2026, 10, 20))!.cells[4].state, "notDue"); // Oct 5, before joining
  const early = monthCalendar(input({ spec: mondays }), "amy", today)!;
  assert.equal(early.cells[1].state, "missed"); // Monday 2nd, scheduled, nothing logged
});

test("monthCalendar: an open kind has no missed days", () => {
  const weekly: ScheduleSpec = { schedule: "weekly", times: 3 };
  const cal = monthCalendar(input({ spec: weekly }), "amy", today)!;
  assert.equal(cal.cells[0].state, "notDue");
});

test("monthCalendar: tappable only within the last 7 days and never in the future", () => {
  const cal = monthCalendar(input(), "amy", today)!;
  const tappable = cal.cells.filter((cell) => cell.tappable).map((cell) => cell.day.day);
  assert.deepEqual(tappable, [1, 2, 3, 4, 5]); // Nov 5 minus 7 days is Oct 29, so the whole visible month part
  const oct = monthCalendar(input(), "amy", d(2026, 10, 15))!;
  assert.deepEqual(oct.cells.filter((cell) => cell.tappable).map((cell) => cell.day.day), [29, 30, 31]); // 8 days back is not tappable
  assert.equal(oct.cells[27].tappable, false);
});

test("monthCalendar: month boundaries, 30 and 31 days, a leap February and the leading blanks", () => {
  const nov = monthCalendar(input(), "amy", d(2026, 11, 15))!;
  assert.equal(nov.cells.length, 30);
  assert.equal(nov.leading, 0); // Nov 1 2026 is a Sunday
  const oct = monthCalendar(input(), "amy", d(2026, 10, 1))!;
  assert.equal(oct.cells.length, 31);
  assert.equal(oct.leading, 4); // Oct 1 2026 is a Thursday
  const dec = monthCalendar(input(), "amy", d(2026, 12, 31))!;
  assert.deepEqual(dec.first, d(2026, 12, 1));
  assert.equal(dec.cells.length, 31);
  assert.equal(monthCalendar(input(), "amy", d(2028, 2, 10))!.cells.length, 29);
  assert.equal(monthCalendar(input(), "amy", d(2027, 2, 10))!.cells.length, 28);
});

test("monthCalendar: null for someone not on the habit", () => {
  assert.equal(monthCalendar(input(), "stranger", today), null);
});

test("completionRate: whole percent of due days since joining, today only once done", () => {
  const amy = person("amy", { since: d(2026, 11, 1) });
  // Nov 1 to 4 due (4 days); 3 done.
  const logs = [log("amy", d(2026, 11, 1)), log("amy", d(2026, 11, 2)), log("amy", d(2026, 11, 3), "late")];
  assert.equal(completionRate(input({ people: [amy], logs }), "amy"), 75);
  // Done today too: 4 of 5.
  assert.equal(completionRate(input({ people: [amy], logs: [...logs, log("amy", today)] }), "amy"), 80);
});

test("completionRate: rounds, ignores skipped and vacation days, null before anything was due", () => {
  const amy = person("amy", { since: d(2026, 11, 1) });
  const logs = [log("amy", d(2026, 11, 1)), log("amy", d(2026, 11, 2), "skipped")];
  // Nov 1 done, Nov 2 skipped (not due), Nov 3 and 4 missed: 1 of 3.
  assert.equal(completionRate(input({ people: [amy], logs }), "amy"), 33);
  const away = new Map([["amy", [{ start: d(2026, 11, 3), end: d(2026, 11, 4) }]]]);
  assert.equal(completionRate(input({ people: [amy], logs, vacationsByUser: away }), "amy"), 100);
  const justJoined = person("amy", { since: today });
  assert.equal(completionRate(input({ people: [justJoined] }), "amy"), null);
});

test("completionRate: due days start the day the person joined, not the habit", () => {
  const late = person("amy", { since: d(2026, 11, 4) });
  assert.equal(completionRate(input({ people: [late], logs: [log("amy", d(2026, 11, 4))] }), "amy"), 100);
});

test("completionRate: an open kind counts checks against finished periods' targets", () => {
  const weekly: ScheduleSpec = { schedule: "weekly", times: 3 };
  const amy = person("amy", { since: d(2026, 10, 25) });
  // Week of Oct 25: 2 of 3. This week (Nov 1) is not over and short, so it is left out.
  const logs = [log("amy", d(2026, 10, 26)), log("amy", d(2026, 10, 28)), log("amy", d(2026, 11, 2))];
  assert.equal(completionRate(input({ spec: weekly, people: [amy], logs }), "amy"), 67);
});

test("sideBySideRows: total, rate and streak label per person; deactivated people are left out", () => {
  const amy = person("amy", { since: d(2026, 11, 1), cache: { current: 12, best: 12, asOf: d(2026, 11, 4) } });
  const bob = person("bob", { since: d(2026, 11, 1), cache: { current: 1, best: 4, asOf: d(2026, 11, 4) } });
  const gone = person("gone", { deactivated: true });
  const logs = [log("amy", d(2026, 11, 1)), log("amy", d(2026, 11, 2)), log("bob", d(2026, 11, 1))];
  const rows = sideBySideRows(input({ people: [amy, gone, bob], logs }));
  assert.deepEqual(rows.map((r) => r.userId), ["amy", "bob"]);
  assert.deepEqual(rows[0], { userId: "amy", displayName: "amy", avatarColor: "#123456", total: 2, rate: 50, streak: 12, streakLabel: "12 days" });
  assert.equal(rows[1].streakLabel, null);
  assert.equal(rows[1].rate, 25);
});

test("weeklySeries: the last 6 Sunday-to-Saturday weeks, the last holding today", () => {
  const series = weeklySeries(input());
  assert.deepEqual(series.weeks, [d(2026, 9, 27), d(2026, 10, 4), d(2026, 10, 11), d(2026, 10, 18), d(2026, 10, 25), d(2026, 11, 1)]);
  assert.equal(series.axisMax, 7);
});

test("weeklySeries: Saturday and Sunday fall in different weeks, counting done and late only", () => {
  const logs = [
    log("amy", d(2026, 10, 31)), // Saturday, week of Oct 25
    log("amy", d(2026, 11, 1)), // Sunday, week of Nov 1
    log("amy", d(2026, 11, 2), "late"),
    log("amy", d(2026, 11, 3), "skipped"),
    log("bob", d(2026, 11, 1)),
    log("amy", d(2026, 9, 26)), // Saturday before the first week shown
  ];
  const series = weeklySeries(input({ people: [person("amy"), person("bob")], logs }));
  assert.deepEqual(series.people[0].counts, [0, 0, 0, 0, 1, 2]);
  assert.deepEqual(series.people[1].counts, [0, 0, 0, 0, 0, 1]);
});

test("weeklySeries: when today is a Sunday the last week is just that day; deactivated people are left out", () => {
  const sunday = d(2026, 11, 8);
  const series = weeklySeries(input({ today: sunday, people: [person("amy"), person("gone", { deactivated: true })], logs: [log("amy", sunday)] }));
  assert.deepEqual(series.weeks[5], sunday);
  assert.deepEqual(series.people.map((p) => p.userId), ["amy"]);
  assert.equal(series.people[0].counts[5], 1);
});

test("weeklySeries: weeks cross a month and year boundary", () => {
  const series = weeklySeries(input({ today: d(2027, 1, 2) }));
  assert.deepEqual(series.weeks[0], d(2026, 11, 22));
  assert.deepEqual(series.weeks[5], d(2026, 12, 27));
});

test("perfectDaysInMonth: counts perfect days up to today, never a future day", () => {
  const entries = (): DayEntry[] => [{ kind: "habit", state: "required", status: "done" }];
  assert.equal(perfectDaysInMonth(today, today, entries).length, 5);
  const mixed = (day: CalendarDate): DayEntry[] =>
    day.day === 2 ? [{ kind: "habit", state: "required", status: null }] : day.day === 3 ? [] : [{ kind: "habit", state: "required", status: "skipped" }];
  assert.deepEqual(perfectDaysInMonth(today, today, mixed).map((x) => x.day), [1, 4, 5]);
});

test("perfectDaysInMonth: a past month runs to its last day, month boundary included", () => {
  const entries = (): DayEntry[] => [{ kind: "habit", state: "required", status: "done" }];
  assert.equal(perfectDaysInMonth(d(2026, 10, 12), today, entries).length, 31);
  assert.equal(perfectDaysInMonth(d(2026, 12, 12), today, entries).length, 0);
  assert.equal(perfectDaysInMonth(d(2026, 12, 12), d(2026, 12, 31), entries).length, 31);
});
