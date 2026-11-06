// Pins habitsHours.ts: the hours words (decisions 187 to 199), the row view,
// what an hours habit overrides on a Today row, the goal-plan view and the
// stats page's hours data. "Today" is Friday 2026-11-06 unless said otherwise;
// days are plain calendar days, so the results are the same in every time zone.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "./householdDate";
import type { HabitActor, TimeEntry } from "./habits/types";
import {
  addHoursMinutes,
  buildHoursStats,
  formatAmount,
  formatHours,
  goalHoursLine,
  goalLeftLine,
  hoursAWeek,
  hoursDoneText,
  hoursRowFields,
  hoursSpecOf,
  hoursViewFor,
  managerHours,
  planHoursView,
  type HoursSpec,
  type StatsTimeEntry,
} from "./habitsHours";
import { buildStatsData, type StatsBuildInput } from "./habitsFamily";
import type { GoalRow } from "./goals";
import type { PlanHabit, PlanItemRow } from "./goalsProgress";
import { weekRecap } from "./goalsRecap";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const friday = d(2026, 11, 6);
const saturday = d(2026, 11, 7);
const sunday = d(2026, 11, 8);
const spec: HoursSpec = { targetMinutes: 600, paceDays: "monsat", since: null };
const entry = (day: CalendarDate, minutes: number, userId = "me"): TimeEntry => ({ day, minutes, userId });

test("formatHours: whole hours plus quarters, under an hour as the fraction alone", () => {
  assert.equal(formatHours(0), "0");
  assert.equal(formatHours(15), "¼");
  assert.equal(formatHours(30), "½");
  assert.equal(formatHours(45), "¾");
  assert.equal(formatHours(60), "1");
  assert.equal(formatHours(90), "1½");
  assert.equal(formatHours(105), "1¾");
  assert.equal(formatHours(600), "10");
  assert.equal(formatHours(690), "11½");
});

test("formatAmount: minutes under an hour, else hours with the right unit", () => {
  assert.equal(formatAmount(30), "30 min");
  assert.equal(formatAmount(60), "1 hour");
  assert.equal(formatAmount(90), "1½ hours");
  assert.equal(formatAmount(120), "2 hours");
  assert.equal(formatAmount(720), "12 hours");
});

test("hoursAWeek: Manage's line, singular at one hour (decision 199)", () => {
  assert.equal(hoursAWeek(360), "6 hours a week");
  assert.equal(hoursAWeek(60), "1 hour a week");
});

test("the row view: '6½ of 10 hours this week', '3½ hours left · about 1¾ a day' and the bar", () => {
  const view = hoursViewFor(spec, "me", [entry(d(2026, 11, 2), 390)], friday, []);
  assert.equal(view.doneText, "6½ of 10 hours this week");
  assert.equal(view.leftText, "3½ hours left · about 1¾ a day"); // Friday and Saturday count: 210 / 2 = 105
  assert.equal(view.leftShort, "3½ hours left");
  assert.equal(view.met, false);
  assert.equal(view.fraction, 0.65);
  assert.equal(view.daysLeft, 2);
  assert.equal(view.paceDays, "monsat");
});

test("the row view: the last counted day reads '· today' (decision 188), and '1 hour left' is singular", () => {
  assert.equal(hoursViewFor(spec, "me", [entry(d(2026, 11, 2), 360)], saturday, []).leftText, "4 hours left · today");
  const one = hoursViewFor(spec, "me", [entry(d(2026, 11, 2), 540)], saturday, []);
  assert.equal(one.leftShort, "1 hour left");
  assert.equal(one.leftText, "1 hour left · today");
});

test("the row view: a Sunday with Mon to Sat counts six days; Every day counts seven", () => {
  assert.equal(hoursViewFor(spec, "me", [], sunday, []).daysLeft, 6, "the new week starts empty on Sunday the 8th: Mon to Sat");
  assert.equal(hoursViewFor(spec, "me", [], sunday, []).leftText, "10 hours left · about 1¾ a day"); // 600 / 6 = 100, up to 105
  assert.equal(hoursViewFor({ ...spec, paceDays: "every" }, "me", [], sunday, []).daysLeft, 7);
});

test("the row view: met reads done, with no left line (decision 189); over the goal keeps the real total", () => {
  const met = hoursViewFor(spec, "me", [entry(d(2026, 11, 2), 600)], friday, []);
  assert.equal(met.doneText, "10 of 10 hours this week · done");
  assert.equal(met.leftText, null);
  assert.equal(met.leftShort, null);
  assert.equal(met.met, true);
  const over = hoursViewFor(spec, "me", [entry(d(2026, 11, 2), 690)], friday, []);
  assert.equal(over.doneText, "11½ of 10 hours this week · done");
  assert.equal(over.fraction, 1);
});

test("the row view: under an hour reads as the fraction, one person's entries only, last week not counted", () => {
  assert.equal(hoursViewFor(spec, "me", [entry(d(2026, 11, 3), 30)], friday, []).doneText, "½ of 10 hours this week");
  const mixed = [entry(d(2026, 11, 3), 120, "you"), entry(d(2026, 10, 30), 300), entry(d(2026, 11, 2), 60)];
  assert.equal(hoursViewFor(spec, "me", mixed, friday, []).doneText, "1 of 10 hours this week");
  assert.equal(hoursDoneText(30, 60, "last week"), "½ of 1 hour last week");
});

test("a vacation leaves its days out of the pace but the row still shows (time can be logged)", () => {
  const view = hoursViewFor(spec, "me", [], friday, [{ start: friday, end: friday }]);
  assert.equal(view.daysLeft, 1);
  assert.equal(view.leftText, "10 hours left · today");
});

test("addHoursMinutes redraws the way the server would", () => {
  const before = hoursViewFor(spec, "me", [entry(d(2026, 11, 2), 390)], friday, []);
  const after = addHoursMinutes(before, 120);
  assert.deepEqual(after, hoursViewFor(spec, "me", [entry(d(2026, 11, 2), 390), entry(friday, 120)], friday, []));
  assert.equal(addHoursMinutes(after, 120).doneText, "10½ of 10 hours this week · done");
});

test("hoursSpecOf and managerHours: only a usable hours habit; the hours columns may be left off", () => {
  assert.equal(hoursSpecOf({}), null);
  assert.equal(hoursSpecOf({ track: "checks", weeklyMinutes: 300 }), null);
  assert.equal(hoursSpecOf({ track: "hours", weeklyMinutes: null }), null, "no goal: a plain weekly habit");
  assert.deepEqual(hoursSpecOf({ track: "hours", weeklyMinutes: 300, paceDays: "every" }), { targetMinutes: 300, paceDays: "every", since: null });
  assert.equal(managerHours({ track: "hours", weeklyMinutes: 360, paceDays: null })?.text, "6 hours a week");
  assert.equal(managerHours({ track: "checks" }), null);
});

test("hoursRowFields: nothing for a checks habit; for hours always open, never required, done mirrors met", () => {
  const members = [{ userId: "me", done: false, skipped: false }, { userId: "you", done: false, skipped: false }];
  assert.deepEqual(hoursRowFields(null, "me", [], friday, () => [], members), { hours: null });
  const fields = hoursRowFields(spec, "me", [entry(d(2026, 11, 2), 600), entry(d(2026, 11, 2), 60, "you")], friday, () => [], members);
  assert.ok("dueState" in fields);
  assert.equal(fields.dueState, "open");
  assert.equal(fields.doneToday, true);
  assert.equal(fields.carriedFrom, null);
  assert.equal(fields.progress, null);
  assert.equal(fields.plannedToday, false);
  assert.equal(fields.onVacation, false);
  assert.deepEqual(fields.participants.map((p) => p.done), [true, false], "each member's own week");
});

test("goal lines: 'Calling · 6½ of 10 hours this week' and 'Calling · 3½ hours left'", () => {
  const view = planHoursView({ targetMinutes: 600, paceDays: "monsat", entries: [entry(d(2026, 11, 2), 390)] }, friday);
  assert.equal(goalHoursLine("Calling", view), "Calling · 6½ of 10 hours this week");
  assert.equal(goalLeftLine("Calling", view), "Calling · 3½ hours left");
  const met = planHoursView({ targetMinutes: 600, paceDays: "monsat", entries: [entry(d(2026, 11, 2), 600)] }, friday);
  assert.equal(goalLeftLine("Calling", met), "Calling");
});

// ---- The stats page ----

const amy: HabitActor = { userId: "amy", role: "parent" };
const ben: HabitActor = { userId: "ben", role: "kid" };
const stored = (id: string, day: CalendarDate, minutes: number, userId = "amy"): StatsTimeEntry => ({ id, day, minutes, userId });
const everyone = [
  { userId: "amy", displayName: "Amy", avatarColor: "blue", deactivated: false },
  { userId: "ben", displayName: "Ben", avatarColor: "red", deactivated: false },
];

function hoursStats(entries: StatsTimeEntry[], extra: Partial<Parameters<typeof buildHoursStats>[0]> = {}) {
  return buildHoursStats({
    spec: { targetMinutes: 360, paceDays: "monsat", since: null },
    viewer: amy,
    access: { isPrivate: false, participantIds: ["amy", "ben"] },
    subjectId: "amy",
    entries,
    people: everyone,
    vacationsByUser: new Map(),
    today: friday,
    startDay: d(2026, 1, 1),
    streak: { current: 3, best: 5 },
    sideBySide: false,
    ...extra,
  });
}

test("hours stats: 'Last 4 weeks: 6 · 7 · 6½ · 2 so far' and the Total hours tile", () => {
  const data = hoursStats([stored("a", d(2026, 10, 12), 360), stored("b", d(2026, 10, 20), 420), stored("c", d(2026, 10, 27), 390), stored("d", d(2026, 11, 2), 120)]);
  assert.equal(data.lastWeeksText, "Last 4 weeks: 6 · 7 · 6½ · 2 so far");
  assert.deepEqual(data.tiles, { current: 3, best: 5, totalText: "21½" });
  assert.equal(data.view.doneText, "2 of 6 hours this week");
});

test("hours stats: the chart runs Sunday to Saturday with minutes per day", () => {
  const data = hoursStats([stored("a", d(2026, 11, 2), 60), stored("b", d(2026, 11, 2), 90), stored("c", d(2026, 11, 5), 30)]);
  assert.deepEqual(data.chartDays.map((x) => x.label), ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  assert.deepEqual(data.chartDays.map((x) => x.minutes), [0, 150, 0, 0, 30, 0, 0]);
  assert.equal(data.chartDays[0].day, "2026-11-01");
  assert.equal(data.chartDays[6].day, "2026-11-07");
});

test("hours stats: entries newest first in 'This week' and 'Last week', labelled 'Thu · 1½ hours'", () => {
  const data = hoursStats([
    stored("a", d(2026, 11, 2), 60),
    stored("b", d(2026, 11, 5), 90),
    stored("c", d(2026, 10, 30), 30),
    stored("d", d(2026, 10, 20), 60), // two weeks back: neither list
    stored("e", d(2026, 11, 5), 120, "ben"), // someone else's
  ]);
  assert.deepEqual(data.entries.thisWeek.map((e) => [e.id, e.label, e.canDelete]), [["b", "Thu · 1½ hours", true], ["a", "Mon · 1 hour", true]]);
  assert.deepEqual(data.entries.lastWeek.map((e) => [e.id, e.label, e.day]), [["c", "Fri · 30 min", "2026-10-30"]]);
});

test("hours stats: a viewer who may not log for the person cannot delete their entries", () => {
  const data = hoursStats([stored("a", d(2026, 11, 2), 60, "ben")], { viewer: { userId: "tablet", role: "kid" }, subjectId: "ben" });
  assert.equal(data.entries.thisWeek[0].canDelete, false);
});

test("hours stats: 'Switched to hours on Nov 6' only when the habit was a checks habit first", () => {
  assert.equal(hoursStats([], { spec: { targetMinutes: 360, paceDays: "monsat", since: friday } }).switchedText, "Switched to hours on Nov 6");
  assert.equal(hoursStats([], { spec: { targetMinutes: 360, paceDays: "monsat", since: d(2026, 1, 1) } }).switchedText, null, "made as hours");
  assert.equal(hoursStats([]).switchedText, null);
});

test("hours stats: one bar per active person for Side by side, none otherwise", () => {
  const entries = [stored("a", d(2026, 11, 2), 360), stored("b", d(2026, 11, 2), 60, "ben")];
  assert.equal(hoursStats(entries).perPerson, null);
  const per = hoursStats(entries, { sideBySide: true, people: [...everyone, { userId: "old", displayName: "Old", avatarColor: "x", deactivated: true }] }).perPerson!;
  assert.deepEqual(per.map((p) => [p.userId, p.view.met, p.view.doneText]), [["amy", true, "6 of 6 hours this week · done"], ["ben", false, "1 of 6 hours this week"]]);
});

function statsInput(over: Partial<StatsBuildInput["habit"]> = {}, rest: Partial<StatsBuildInput> = {}): StatsBuildInput {
  const old = new Date("2026-01-01T12:00:00Z");
  const member = (userId: string) => ({ userId, displayName: userId, avatarColor: "blue", joinedAt: old, deactivatedAt: null, currentStreak: 2, bestStreak: 4, streakAsOf: new Date(Date.UTC(2026, 10, 6)) });
  return {
    viewer: amy,
    habit: { id: "h1", title: "Calling", icon: null, kind: "habit", mode: "build", sharing: "each", isPrivate: false, everyone: false, archivedAt: null, createdAt: old, schedule: "weekly", weekdays: null, times: 1, anchorWeek: null, track: "hours", weeklyMinutes: 360, paceDays: "monsat", hoursSince: null, ...over },
    members: [member("amy"), member("ben")],
    logs: [],
    entries: [stored("a", d(2026, 11, 2), 120)],
    vacationsByUser: new Map(),
    subjectHabits: [],
    nudgedToday: [],
    today: friday,
    month: friday,
    ...rest,
  };
}

test("buildStatsData: an hours habit gets hours data, no month calendar, no check table, no perfect days, no nudges", () => {
  const data = buildStatsData(statsInput())!;
  assert.ok(data, "the stats page never 404s for an hours habit");
  assert.equal(data.habit.track, "hours");
  assert.equal(data.habit.scheduleLabel, "6 hours a week");
  assert.deepEqual(data.calendar.cells, []);
  assert.equal(data.calendar.nothingDue, null);
  assert.equal(data.sideBySide, null);
  assert.equal(data.perfectDays, 0);
  assert.deepEqual(data.nudgeable, []);
  assert.equal(data.hours!.view.doneText, "2 of 6 hours this week");
  assert.equal(data.hours!.tiles.current, 2);
  assert.equal(data.hours!.tiles.best, 4);
  assert.equal(data.hours!.perPerson!.length, 2, "Side by side: one bar per person");
});

test("buildStatsData: a checks habit has no hours data and keeps its month calendar", () => {
  const data = buildStatsData(statsInput({ track: "checks", weeklyMinutes: null, paceDays: null }, { entries: undefined }))!;
  assert.equal(data.hours, null);
  assert.equal(data.habit.track, "checks");
  assert.equal(data.calendar.cells.length, 30);
});

test("buildStatsData: a private hours habit is seen only by its person", () => {
  assert.equal(buildStatsData(statsInput({ isPrivate: true }, { viewer: { userId: "boss", role: "admin" } })), null);
  assert.ok(buildStatsData(statsInput({ isPrivate: true }, { viewer: ben })));
});

// ---- The Sunday recap ----

test("the recap carries an hours habit's last week as '6½ of 10 hours last week'", () => {
  const goal: GoalRow = {
    id: "g1", title: "Grow", area: "financial", why: null, targetDate: new Date(Date.UTC(2026, 11, 31)), ownerId: "me",
    owner: { id: "me", displayName: "Me", avatarColor: "sky" }, visibility: "shared", measureUnit: null, startValue: null,
    targetValue: null, currentValue: null, checkedInAt: null, completedAt: null, createdAt: new Date("2026-01-01T19:00:00Z"),
  };
  const row: PlanItemRow = { id: "i1", goalId: "g1", title: "Calling", kind: "habit", timesPerPeriod: 1, period: "week", habitId: "h1", doneAt: null, sortOrder: 0, createdAt: new Date("2026-01-01T19:00:00Z") };
  const habit: PlanHabit = { spec: { schedule: "weekly", times: 1 }, schedule: { schedule: "weekly", times: 1 }, logs: [], hours: { targetMinutes: 600, paceDays: "monsat", entries: [entry(d(2026, 10, 27), 390)] } };
  const recap = weekRecap([{ goal, items: [row], habits: new Map([["h1", habit]]), checkIns: [] }], d(2026, 10, 25))!;
  assert.equal(recap.habits[0].hoursText, "6½ of 10 hours last week");
  assert.equal(recap.habits[0].met, false);
  assert.deepEqual([recap.done, recap.total], [0, 1]);
});
