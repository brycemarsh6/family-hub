// Pins habitsStats.ts: the numbers, month calendar, side by side table and
// weekly series of the stats page. Plain calendar days, so the results are the
// same in every time zone. "Today" is Thursday 2026-11-05 unless a test says
// otherwise.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "./householdDate";
import type { DayEntry } from "./habits/perfectDays";
import type { HabitLogDay, ScheduleSpec, Vacation, WeekOverride } from "./habits/types";
import {
  completionRate,
  dayCellLabel,
  effectiveState,
  monthCalendar,
  perfectDaysInMonth,
  personTotals,
  sideBySideRows,
  statsMonthTitle,
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

test("monthCalendar: days not due or before joining are not missed, and an undone vacation day is skipped (decision 170)", () => {
  const mondays: ScheduleSpec = { schedule: "weekdays", days: [1] };
  const away = new Map([["amy", [{ start: d(2026, 11, 2), end: d(2026, 11, 2) }]]]);
  const cal = monthCalendar(input({ spec: mondays, vacationsByUser: away }), "amy", today)!;
  assert.equal(cal.cells[1].state, "skipped"); // Monday 2nd, on vacation
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

test("monthCalendar: days before the person joined are not tappable, the join day is", () => {
  const joined = person("amy", { since: d(2026, 11, 3) });
  const cal = monthCalendar(input({ people: [joined] }), "amy", today)!;
  assert.deepEqual(cal.cells.filter((cell) => cell.tappable).map((cell) => cell.day.day), [3, 4, 5]);
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

test("completionRate: a vacation day that was done counts as due and done; only an undone one is skipped (decision 127)", () => {
  const amy = person("amy", { since: d(2026, 11, 1) });
  const away = new Map([["amy", [{ start: d(2026, 11, 3), end: d(2026, 11, 4) }]]]);
  // Nov 1 and 2 missed, Nov 3 done on vacation, Nov 4 undone on vacation (skipped): 1 of 3.
  assert.equal(completionRate(input({ people: [amy], logs: [log("amy", d(2026, 11, 3))], vacationsByUser: away }), "amy"), 33);
  // The same days with no check on vacation: 0 of 2 due, so nothing but the missed days count.
  assert.equal(completionRate(input({ people: [amy], logs: [], vacationsByUser: away }), "amy"), 0);
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

test("statsMonthTitle: month name, with the year only outside the current year (decision 112)", () => {
  assert.equal(statsMonthTitle(2026, 11, 2026), "November");
  assert.equal(statsMonthTitle(2026, 1, 2026), "January");
  assert.equal(statsMonthTitle(2025, 12, 2026), "December 2025");
  assert.equal(statsMonthTitle(2027, 2, 2026), "February 2027");
});

// ---- Decision 170: vacations and this-week changes in the stats calendar ----

const chore: ScheduleSpec = { schedule: "weekdays", days: [1, 3] }; // Mon and Wed
const week = d(2026, 11, 1); // the Sunday of today's week
const skipMon: WeekOverride = { weekStart: week, fromWeekday: 1, action: "skipped", toWeekday: null };
const moveMonToTue: WeekOverride = { weekStart: week, fromWeekday: 1, action: "moved", toWeekday: 2 };
const moveWedToFri: WeekOverride = { weekStart: week, fromWeekday: 3, action: "moved", toWeekday: 5 };
const away = new Map([["amy", [{ start: d(2026, 11, 2), end: d(2026, 11, 3) } as Vacation]]]);
const novCell = (cal: ReturnType<typeof monthCalendar>, day: number) => cal!.cells[day - 1];

test("monthCalendar: an undone due vacation day is skipped (on vacation); a check on it wins", () => {
  const cal = monthCalendar(input({ vacationsByUser: away, logs: [log("amy", d(2026, 11, 3))] }), "amy", today);
  assert.equal(novCell(cal, 2).state, "skipped");
  assert.deepEqual(novCell(cal, 2).reason, { kind: "vacation" });
  assert.equal(novCell(cal, 3).state, "done");
  assert.deepEqual(novCell(cal, 3).reason, { kind: "vacation" }, "kept under the check, so an undo redraws Skipped");
  assert.equal(effectiveState(novCell(cal, 3)), "done");
  assert.equal(effectiveState({ ...novCell(cal, 3), state: "missed" }), "skipped", "the optimistic undo");
  assert.equal(novCell(cal, 4).state, "missed");
});

test("monthCalendar: a vacation day the habit never asked for stays not due, and so does one before joining", () => {
  const mondays: ScheduleSpec = { schedule: "weekdays", days: [1] };
  const cal = monthCalendar(input({ spec: mondays, vacationsByUser: away }), "amy", today);
  assert.equal(novCell(cal, 2).state, "skipped"); // Monday Nov 2
  assert.equal(novCell(cal, 3).state, "notDue"); // Tuesday
  assert.equal(novCell(cal, 3).reason, null);
  const joined = person("amy", { since: d(2026, 11, 3) });
  assert.equal(novCell(monthCalendar(input({ people: [joined], vacationsByUser: away }), "amy", today), 2).state, "notDue");
});

test("monthCalendar: today on vacation and undone is skipped; a future vacation day stays future", () => {
  const vacation = new Map([["amy", [{ start: d(2026, 11, 5), end: d(2026, 11, 6) } as Vacation]]]);
  const cal = monthCalendar(input({ vacationsByUser: vacation }), "amy", today);
  assert.equal(novCell(cal, 5).state, "skipped");
  assert.equal(novCell(cal, 6).state, "future");
});

test("monthCalendar: a chore's week-skipped day is skipped this week; a check wins; the other week is untouched", () => {
  const cal = monthCalendar(input({ spec: chore, overrides: [skipMon] }), "amy", today);
  assert.equal(novCell(cal, 2).state, "skipped");
  assert.deepEqual(novCell(cal, 2).reason, { kind: "weekSkip" });
  assert.equal(novCell(cal, 4).state, "missed");
  const done = monthCalendar(input({ spec: chore, overrides: [skipMon], logs: [log("amy", d(2026, 11, 2))] }), "amy", today);
  assert.equal(novCell(done, 2).state, "done");
  assert.deepEqual(novCell(done, 2).reason, { kind: "weekSkip" });
  const lastWeek: WeekOverride = { ...skipMon, weekStart: d(2026, 10, 25) };
  assert.equal(novCell(monthCalendar(input({ spec: chore, overrides: [lastWeek] }), "amy", today), 2).state, "missed");
});

test("monthCalendar: a moved-away day is not due (moved to Thu), the moved-to day is due", () => {
  const cal = monthCalendar(input({ spec: chore, overrides: [moveMonToTue] }), "amy", today);
  assert.equal(novCell(cal, 2).state, "notDue");
  assert.deepEqual(novCell(cal, 2).reason, { kind: "movedAway", toWeekday: 2 });
  assert.equal(novCell(cal, 3).state, "missed");
  assert.equal(novCell(cal, 3).reason, null);
  assert.equal(novCell(monthCalendar(input({ spec: chore, overrides: [moveMonToTue], logs: [log("amy", d(2026, 11, 3))] }), "amy", today), 3).state, "done");
  // A move to a day still ahead leaves the old day not due and the new day future.
  const ahead = monthCalendar(input({ spec: chore, overrides: [moveWedToFri] }), "amy", today);
  assert.equal(novCell(ahead, 4).state, "notDue");
  assert.equal(novCell(ahead, 6).state, "future");
});

test("monthCalendar: a check on a moved-away day wins and keeps the reason for an undo", () => {
  const cal = monthCalendar(input({ spec: chore, overrides: [moveMonToTue], logs: [log("amy", d(2026, 11, 2))] }), "amy", today);
  assert.equal(novCell(cal, 2).state, "done");
  assert.deepEqual(novCell(cal, 2).reason, { kind: "movedAway", toWeekday: 2 });
  assert.equal(effectiveState({ ...novCell(cal, 2), state: "missed" }), "notDue");
});

test("monthCalendar: a day skipped by a tap carries no reason, even on vacation", () => {
  const cal = monthCalendar(input({ vacationsByUser: away, logs: [log("amy", d(2026, 11, 2), "skipped")] }), "amy", today);
  assert.equal(novCell(cal, 2).state, "skipped");
  assert.equal(novCell(cal, 2).reason, null);
});

test("monthCalendar: a today that is not a due day is not due (decision 170)", () => {
  const mondays: ScheduleSpec = { schedule: "weekdays", days: [1] };
  const cal = monthCalendar(input({ spec: mondays }), "amy", today); // Thursday
  assert.equal(novCell(cal, 5).state, "notDue");
  const onMonday = monthCalendar(input({ spec: mondays, today: d(2026, 11, 2) }), "amy", d(2026, 11, 2));
  assert.equal(novCell(onMonday, 2).state, "today", "a due today stays today");
  const joined = person("amy", { since: d(2026, 11, 6) });
  assert.equal(novCell(monthCalendar(input({ people: [joined] }), "amy", today), 5).state, "notDue", "before joining");
});

test("effectiveState: a check wins; a reason redraws an undone day; a moved-away future day stays future", () => {
  assert.equal(effectiveState({ state: "late", reason: { kind: "vacation" } }), "late");
  assert.equal(effectiveState({ state: "today", reason: { kind: "weekSkip" } }), "skipped");
  assert.equal(effectiveState({ state: "future", reason: { kind: "movedAway", toWeekday: 4 } }), "future");
  assert.equal(effectiveState({ state: "missed" }), "missed");
});

test("dayCellLabel: the date, then the state or the reason in words (decision 170)", () => {
  assert.equal(dayCellLabel({ day: "2026-11-08", state: "done" }), "Nov 8, done");
  assert.equal(dayCellLabel({ day: "2026-11-08", state: "late" }), "Nov 8, done late");
  assert.equal(dayCellLabel({ day: "2026-11-08", state: "today" }), "Nov 8, not done yet");
  assert.equal(dayCellLabel({ day: "2026-11-08", state: "future" }), "Nov 8, not yet");
  assert.equal(dayCellLabel({ day: "2026-11-08", state: "missed" }), "Nov 8, missed");
  assert.equal(dayCellLabel({ day: "2026-11-08", state: "skipped" }), "Nov 8, skipped");
  assert.equal(dayCellLabel({ day: "2026-11-08", state: "skipped", reason: { kind: "vacation" } }), "Nov 8, skipped (on vacation)");
  assert.equal(dayCellLabel({ day: "2026-11-08", state: "missed", reason: { kind: "weekSkip" } }), "Nov 8, skipped this week");
  assert.equal(dayCellLabel({ day: "2026-11-09", state: "notDue", reason: { kind: "movedAway", toWeekday: 4 } }), "Nov 9, not due (moved to Thu)");
  assert.equal(dayCellLabel({ day: "2026-11-09", state: "notDue" }), "Nov 9, not due");
  assert.equal(dayCellLabel({ day: "2026-11-09", state: "done", reason: { kind: "vacation" } }), "Nov 9, done");
});

test("completionRate: a week-skipped chore day is not due, and counts when done anyway (decisions 130, 170)", () => {
  const amy = person("amy", { since: d(2026, 11, 1) });
  const base = { spec: chore, people: [amy] };
  assert.equal(completionRate(input({ ...base }), "amy"), 0);
  assert.equal(completionRate(input({ ...base, overrides: [skipMon] }), "amy"), 0); // Wed is due and missed
  assert.equal(completionRate(input({ ...base, overrides: [skipMon], logs: [log("amy", d(2026, 11, 4))] }), "amy"), 100);
  assert.equal(completionRate(input({ ...base, overrides: [skipMon], logs: [log("amy", d(2026, 11, 2))] }), "amy"), 50);
  assert.equal(completionRate(input({ ...base, overrides: [skipMon], logs: [log("amy", d(2026, 11, 2)), log("amy", d(2026, 11, 4))] }), "amy"), 100);
});

test("completionRate: a moved chore is due on its new day, not its old one", () => {
  const amy = person("amy", { since: d(2026, 11, 1) });
  const base = { spec: chore, people: [amy], overrides: [moveMonToTue] };
  assert.equal(completionRate(input({ ...base, logs: [log("amy", d(2026, 11, 3))] }), "amy"), 50); // Tue and Wed due
  assert.equal(completionRate(input({ ...base, logs: [log("amy", d(2026, 11, 3)), log("amy", d(2026, 11, 4))] }), "amy"), 100);
  assert.equal(completionRate(input({ ...base, logs: [log("amy", d(2026, 11, 2))] }), "amy"), 0); // a check on the old day is not a due day
});

test("completionRate: vacation days still leave the rate as before (no change from decision 170)", () => {
  const amy = person("amy", { since: d(2026, 11, 2) });
  assert.equal(completionRate(input({ people: [amy], vacationsByUser: away, logs: [log("amy", d(2026, 11, 4))] }), "amy"), 100);
});
