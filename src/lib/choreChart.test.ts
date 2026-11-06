// Pins choreChart.ts: the chore header (streak, Sunday shout-out, vacation
// line), the chart page (who may open it, the chips, the Default week, This
// week with its tags) and the vacation list order. Thursday 2026-11-05 unless
// a test says otherwise; days are plain calendar dates, so the results are the
// same in every time zone.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "./householdDate";
import type { HabitActor, HabitLogDay } from "./habits/types";
import { buildChoreChart, choreCacheFromRow, choreHeader, orderVacations } from "./choreChart";
import { buildFamilyPage } from "./habitsFamily";
import { buildTodayPage, type TodayHabitInput } from "./habitsToday";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const today = d(2026, 11, 5); // Thursday
const sunday = d(2026, 11, 8);
const old = new Date("2026-01-01T12:00:00Z");
const utc = (day: CalendarDate) => new Date(Date.UTC(day.year, day.month - 1, day.day));
const done = (userId: string, day: CalendarDate): HabitLogDay => ({ userId, day, status: "done" });

const amy: HabitActor = { userId: "amy", role: "parent" };
const ben: HabitActor = { userId: "ben", role: "kid" };
const tablet: HabitActor = { userId: "tablet", role: "device" };
const people = [
  { id: "amy", displayName: "Amy Smith", avatarColor: "blue" },
  { id: "ben", displayName: "Ben", avatarColor: "red" },
  { id: "cat", displayName: "Cat", avatarColor: "green" },
];

function chore(id: string, weekdays: string, extra: Partial<TodayHabitInput> & { who?: string[] } = {}): TodayHabitInput {
  const { who = ["ben"], ...rest } = extra;
  return {
    id, title: id, icon: null, kind: "chore", mode: "build", timeOfDay: null, lifeArea: null, sharing: "each", isPrivate: false,
    everyone: false, carryOver: false, createdAt: old, archivedAt: null, schedule: "weekdays", weekdays, times: null, anchorWeek: null,
    participants: who.map((userId) => ({ userId, sortOrder: 0, joinedAt: old, user: { displayName: userId, avatarColor: "blue", deactivatedAt: null } })),
    ...rest,
  };
}

const TUE_THU = "0010100"; // Tuesday and Thursday (Sunday first)
const noLogs = new Map<string, HabitLogDay[]>();
const week = (from: CalendarDate, days: number[]) => days.map((n) => d(from.year, from.month, from.day + n));
const override = (weekStart: CalendarDate, fromWeekday: number, action: string, toWeekday: number | null = null) => ({ weekStart: utc(weekStart), fromWeekday, action, toWeekday });

// ---- the header ----

test("choreHeader: the cached streak is aged to today, and no cache means 0", () => {
  const dishes = chore("dishes", "1111111");
  const cache = { current: 4, best: 6, asOf: d(2026, 11, 4) };
  assert.equal(choreHeader("ben", [dishes], noLogs, today, [], cache).choreStreak, 4); // yesterday counted, today still open
  assert.equal(choreHeader("ben", [dishes], noLogs, today, [], { current: 4, best: 6, asOf: d(2026, 11, 2) }).choreStreak, 0); // Nov 3 and 4 passed undone
  assert.equal(choreHeader("ben", [dishes], noLogs, today, [], choreCacheFromRow(null)).choreStreak, 0);
});

test("choreHeader: a vacation day covering the gap keeps the streak", () => {
  const dishes = chore("dishes", "1111111");
  const vacation = [{ start: d(2026, 11, 3), end: d(2026, 11, 4) }];
  assert.equal(choreHeader("ben", [dishes], noLogs, today, vacation, { current: 4, best: 4, asOf: d(2026, 11, 2) }).choreStreak, 4);
});

test("choreHeader: the vacation line is the end of the period holding today, else null", () => {
  const dishes = chore("dishes", "1111111");
  const cache = choreCacheFromRow(null);
  assert.equal(choreHeader("ben", [dishes], noLogs, today, [{ start: d(2026, 11, 4), end: d(2026, 11, 12) }], cache).vacationThrough, "2026-11-12");
  assert.equal(choreHeader("ben", [dishes], noLogs, today, [{ start: d(2026, 11, 6), end: d(2026, 11, 12) }], cache).vacationThrough, null);
  assert.equal(choreHeader("ben", [dishes], noLogs, today, [], cache).vacationThrough, null);
});

test("choreHeader: the shout-out is Sundays only, after a clean week with a chore done", () => {
  const sundayChore = chore("trash", "1000000", { who: ["ben"] }); // Sundays
  const logs = new Map([["trash", [done("ben", d(2026, 11, 1))]]]); // last week's Sunday
  const cache = choreCacheFromRow(null);
  assert.equal(choreHeader("ben", [sundayChore], logs, sunday, [], cache).shoutOut, true);
  assert.equal(choreHeader("ben", [sundayChore], logs, d(2026, 11, 9), [], cache).shoutOut, false); // Monday
  assert.equal(choreHeader("ben", [sundayChore], noLogs, sunday, [], cache).shoutOut, false); // missed
  assert.equal(choreHeader("ben", [], noLogs, sunday, [], cache).shoutOut, false); // nothing was due
});

test("choreHeader: only the person's own live chores count", () => {
  const sundayChore = chore("trash", "1000000", { who: ["amy"] });
  const logs = new Map([["trash", [done("amy", d(2026, 11, 1))]]]);
  assert.equal(choreHeader("ben", [sundayChore], logs, sunday, [], choreCacheFromRow(null)).shoutOut, false); // Ben is not on it
  assert.equal(choreHeader("amy", [{ ...sundayChore, archivedAt: old }], logs, sunday, [], choreCacheFromRow(null)).shoutOut, false); // archived
});

test("buildTodayPage and buildFamilyPage carry the header fields", () => {
  const sundayChore = chore("trash", "1000000", { who: ["ben"] });
  const logs = new Map([["trash", [done("ben", d(2026, 11, 1))]]]);
  const vacations = new Map([["ben", [{ start: d(2026, 11, 8), end: d(2026, 11, 10) }]]]);
  const cache = { current: 3, best: 3, asOf: sunday };
  const page = buildTodayPage(ben, [sundayChore], logs, sunday, vacations, [], cache);
  assert.deepEqual([page.choreStreak, page.shoutOut, page.vacationThrough], [3, true, "2026-11-10"]);
  const family = buildFamilyPage(amy, [sundayChore], people, logs, sunday, vacations, new Map([["ben", cache]]));
  const column = family.columns.find((c) => c.id === "ben")!;
  assert.deepEqual([column.choreStreak, column.shoutOut, column.onVacation], [3, true, true]);
  const other = family.columns.find((c) => c.id === "cat")!;
  assert.deepEqual([other.choreStreak, other.shoutOut, other.onVacation], [0, false, false]);
});

// ---- the chart ----

test("buildChoreChart: null unless the viewer may edit that chart, or the person is not in the household", () => {
  assert.equal(buildChoreChart(ben, "amy", people, [], today), null); // a kid edits only their own
  assert.equal(buildChoreChart(tablet, "ben", people, [], today), null);
  assert.equal(buildChoreChart(amy, "ghost", people, [], today), null);
  assert.ok(buildChoreChart(amy, "ben", people, [], today)); // a parent edits anyone
  assert.ok(buildChoreChart(ben, "ben", people, [], today));
});

test("buildChoreChart: chips are first names, the viewer first and selected by default, a kid sees only themselves", () => {
  const chart = buildChoreChart(amy, "amy", people, [], today)!;
  assert.deepEqual(chart.chips.map((c) => [c.name, c.selected]), [["Amy", true], ["Ben", false], ["Cat", false]]);
  const asBen = buildChoreChart(ben, "ben", people, [], today)!;
  assert.deepEqual(asBen.chips.map((c) => c.id), ["ben"]);
  const reordered = buildChoreChart({ userId: "cat", role: "parent" }, "ben", people, [], today)!;
  assert.deepEqual(reordered.chips.map((c) => [c.id, c.selected]), [["cat", false], ["amy", false], ["ben", true]]);
  assert.equal(chart.subtitle, "Amy's week");
});

test("buildChoreChart: the Default week lists each weekdays chore under its days, shared ones with a who label", () => {
  const sheets = chore("sheets", TUE_THU);
  const trash = chore("trash", "0001000", { who: ["ben", "cat"], sharing: "together" }); // Wednesday
  const water = chore("water", "1111111", { kind: "habit" }); // a habit, not a chore
  const everyDay = chore("sweep", "1111111", { schedule: "daily", weekdays: null }); // not a weekdays chore
  const gone = chore("gone", TUE_THU, { archivedAt: old });
  const chart = buildChoreChart(amy, "ben", people, [sheets, trash, water, everyDay, gone], today)!;
  const titles = chart.defaultWeek.map((day) => day.chores.map((c) => c.title));
  assert.deepEqual(titles, [[], [], ["sheets"], ["trash"], ["sheets"], [], []]);
  assert.equal(chart.defaultWeek[2].name, "Tuesday");
  assert.equal(chart.defaultWeek[3].chores[0].who, "Together");
  assert.equal(chart.defaultWeek[2].chores[0].who, null);
});

test("buildChoreChart: a chore of another person, or another person's private chore, does not show", () => {
  const theirs = chore("theirs", TUE_THU, { who: ["cat"] });
  const secret = chore("secret", TUE_THU, { who: ["ben"], isPrivate: true });
  assert.deepEqual(buildChoreChart(amy, "ben", people, [theirs, secret], today)!.defaultWeek.flatMap((day) => day.chores), []);
  assert.deepEqual(buildChoreChart(ben, "ben", people, [secret], today)!.defaultWeek[2].chores.map((c) => c.title), ["secret"]); // their own
});

test("buildChoreChart: This week runs Sunday to Saturday with no changes, and a past day cannot change", () => {
  const sheets = chore("sheets", TUE_THU);
  const chart = buildChoreChart(amy, "ben", people, [sheets], today)!;
  assert.deepEqual([chart.thisWeek.start, chart.thisWeek.end, chart.today], ["2026-11-01", "2026-11-07", "2026-11-05"]);
  assert.deepEqual(chart.thisWeek.days.map((day) => day.date), week(d(2026, 11, 1), [0, 1, 2, 3, 4, 5, 6]).map((x) => `2026-11-0${x.day}`));
  const tuesday = chart.thisWeek.days[2];
  assert.equal(tuesday.chores[0].canChange, false); // Nov 3 is past
  const thursday = chart.thisWeek.days[4];
  assert.equal(thursday.isToday, true);
  assert.deepEqual(thursday.chores[0], { id: "sheets", title: "sheets", icon: null, who: null, fromWeekday: 4, state: "required", tag: null, changed: false, canChange: true, moveTargets: [5, 6] });
});

test("buildChoreChart: a move shows on both days, a skip on its own, with the tags", () => {
  const sheets = chore("sheets", TUE_THU, { weekOverrides: [override(d(2026, 11, 1), 4, "moved", 6)] });
  const mop = chore("mop", TUE_THU, { weekOverrides: [override(d(2026, 11, 1), 4, "skipped")] });
  const chart = buildChoreChart(amy, "ben", people, [sheets, mop], today)!;
  const [thu, sat] = [chart.thisWeek.days[4], chart.thisWeek.days[6]];
  assert.deepEqual(thu.chores.map((c) => [c.id, c.state, c.tag, c.changed]), [["sheets", "moved-away", "Moved to Sat", true], ["mop", "skipped", "Skipped this week", true]]);
  assert.deepEqual(sat.chores.map((c) => [c.id, c.state, c.tag, c.fromWeekday, c.changed, c.canChange]), [["sheets", "required", "This week only", 4, true, true]]);
  assert.deepEqual(sat.chores[0].moveTargets, [5, 6]); // today and later except its own Thursday (Saturday is where it sits now)
});

test("buildChoreChart: an override from an earlier week changes nothing", () => {
  const sheets = chore("sheets", TUE_THU, { weekOverrides: [override(d(2026, 10, 25), 4, "skipped")] });
  const thursday = buildChoreChart(amy, "ben", people, [sheets], today)!.thisWeek.days[4];
  assert.deepEqual(thursday.chores.map((c) => [c.state, c.tag]), [["required", null]]);
});

// ---- the vacation list ----

test("orderVacations: current, then upcoming soonest first, then past newest first", () => {
  const row = (id: string, from: CalendarDate, to: CalendarDate) => ({ id, startDay: utc(from), endDay: utc(to) });
  const list = orderVacations(
    [
      row("past-old", d(2026, 8, 1), d(2026, 8, 5)),
      row("later", d(2026, 12, 20), d(2026, 12, 28)),
      row("past-new", d(2026, 10, 1), d(2026, 10, 3)),
      row("now", d(2026, 11, 4), d(2026, 11, 12)),
      row("soon", d(2026, 11, 20), d(2026, 11, 22)),
    ],
    today,
  );
  assert.deepEqual(list.map((v) => [v.id, v.status]), [["now", "current"], ["soon", "upcoming"], ["later", "upcoming"], ["past-new", "past"], ["past-old", "past"]]);
  assert.deepEqual([list[0].from, list[0].through], ["2026-11-04", "2026-11-12"]);
});

test("orderVacations: a vacation ending today is current, one starting tomorrow is upcoming", () => {
  const row = (id: string, from: CalendarDate, to: CalendarDate) => ({ id, startDay: utc(from), endDay: utc(to) });
  const list = orderVacations([row("a", d(2026, 11, 1), today), row("b", d(2026, 11, 6), d(2026, 11, 7))], today);
  assert.deepEqual(list.map((v) => v.status), ["current", "upcoming"]);
});
