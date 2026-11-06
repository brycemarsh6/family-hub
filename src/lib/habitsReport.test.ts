// Pins habitsReport.ts: whose items show, the filter, the pager bounds, the
// URL params, the week, month and year data, and the dash-free week title
// (decisions 163 to 171). Plain calendar days, so the results are the same in
// every time zone. "Today" is Thursday 2026-11-05 unless a test says otherwise.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "./householdDate";
import type { HabitActor, HabitLogDay, Vacation, WeekOverride } from "./habits/types";
import {
  buildHabitReport,
  matchesReportFilter,
  parseReportParams,
  reportFilterOptions,
  reportScope,
  type HabitReport,
  type ReportData,
  type ReportMonthCard,
  type ReportParams,
  type ReportWeekRow,
} from "./habitsReport";
import type { TodayHabitInput } from "./habitsToday";
import { formatWeekTitle } from "./mealPlanDates";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const today = d(2026, 11, 5);
const OCT_1 = new Date("2026-10-01T18:00:00Z"); // Oct 1 in Denver

const people = [
  { id: "amy", displayName: "Amy Marsh", avatarColor: "blue" },
  { id: "bob", displayName: "Bob Marsh", avatarColor: "green" },
  { id: "cy", displayName: "Cy", avatarColor: "red" },
];
const parent: HabitActor = { userId: "amy", role: "parent" };
const kid: HabitActor = { userId: "bob", role: "kid" };

function member(userId: string, sortOrder = 0, joinedAt = OCT_1) {
  return { userId, sortOrder, joinedAt, user: { displayName: userId, avatarColor: "blue", deactivatedAt: null } };
}

function habit(id: string, overrides: Partial<TodayHabitInput> = {}): TodayHabitInput {
  return {
    id,
    title: id,
    icon: null,
    kind: "habit",
    mode: "build",
    timeOfDay: null,
    lifeArea: null,
    sharing: "each",
    isPrivate: false,
    everyone: false,
    carryOver: false,
    schedule: "daily",
    weekdays: null,
    times: null,
    anchorWeek: null,
    createdAt: OCT_1,
    archivedAt: null,
    participants: [member("amy")],
    ...overrides,
  };
}

function params(overrides: Partial<ReportParams> = {}): ReportParams {
  return { view: "week", week: d(2026, 11, 1), month: d(2026, 11, 1), year: 2026, person: null, filter: "all", item: null, ...overrides };
}

const log = (day: CalendarDate, status: HabitLogDay["status"] = "done"): HabitLogDay => ({ day, status });
const noData: ReportData = { logsByHabit: new Map(), overridesByHabit: new Map(), vacations: [] };

function report(viewer: HabitActor, habits: TodayHabitInput[], p: Partial<ReportParams> = {}, data: ReportData = noData): HabitReport {
  return buildHabitReport(reportScope(viewer, params(p), habits, people, today), data, today);
}

const rowsOf = (r: HabitReport) => r.sections.flatMap((section) => section.rows);
const ids = (r: HabitReport) => rowsOf(r).map((row) => row.id);

// ---- Params ----

test("parseReportParams: defaults, valid values, week and month snapped, arrays take the first", () => {
  const empty = parseReportParams({}, today);
  assert.deepEqual(empty, { view: "week", week: d(2026, 11, 1), month: d(2026, 11, 1), year: 2026, person: null, filter: "all", item: null });
  const full = parseReportParams({ view: "month", week: "2026-10-14", month: "2025-12", year: "2024", person: "bob", filter: "kind:chore", item: "h1" }, today);
  assert.deepEqual(full, { view: "month", week: d(2026, 10, 11), month: d(2025, 12, 1), year: 2024, person: "bob", filter: "kind:chore", item: "h1" });
  assert.equal(parseReportParams({ view: ["year", "week"] }, today).view, "year");
});

test("parseReportParams: garbage falls back to today's period", () => {
  const bad = parseReportParams({ view: "decade", week: "soon", month: "2026-13", year: "26" }, today);
  assert.equal(bad.view, "week");
  assert.deepEqual(bad.week, d(2026, 11, 1));
  assert.deepEqual(bad.month, d(2026, 11, 1));
  assert.equal(bad.year, 2026);
});

// ---- The week title ----

test("formatWeekTitle: no dash; the year only outside the current year (decisions 112, 166)", () => {
  const title = (y: number, m: number, day: number, current = 2026) => formatWeekTitle(new Date(y, m - 1, day), current);
  assert.equal(title(2026, 11, 1), "Nov 1 to 7");
  assert.equal(title(2026, 10, 26), "Oct 26 to Nov 1");
  assert.equal(title(2025, 12, 28), "Dec 28, 2025 to Jan 3");
  assert.equal(title(2025, 11, 2), "Nov 2 to 8, 2025");
  assert.equal(title(2025, 10, 26), "Oct 26 to Nov 1, 2025");
  assert.equal(title(2026, 12, 27, 2026), "Dec 27 to Jan 2, 2027");
  assert.equal(title(2024, 12, 29), "Dec 29, 2024 to Jan 4, 2025");
  for (const text of [title(2026, 11, 1), title(2025, 12, 28), title(2026, 10, 26), title(2024, 12, 29)]) assert.doesNotMatch(text, /[-\u2013\u2014]/);
});

test("pager titles: week, month and year, across years", () => {
  assert.equal(report(parent, [habit("a")]).pager.title, "Nov 1 to 7");
  const sunday = { week: d(2026, 10, 25) };
  assert.equal(report(parent, [habit("a")], sunday).pager.title, "Oct 25 to 31");
  const old = habit("a", { createdAt: new Date("2025-11-20T18:00:00Z"), participants: [member("amy", 0, new Date("2025-11-20T18:00:00Z"))] });
  assert.equal(report(parent, [old], { week: d(2025, 12, 28) }).pager.title, "Dec 28, 2025 to Jan 3");
  assert.equal(report(parent, [old], { view: "month", month: d(2025, 12, 1) }).pager.title, "December 2025");
  assert.equal(report(parent, [old], { view: "month" }).pager.title, "November");
  assert.equal(report(parent, [old], { view: "year", year: 2025 }).pager.title, "2025");
});

// ---- Whose items ----

test("items: the shown person's live items, Habits then Chores, each in Manage order", () => {
  const habits = [
    habit("chore1", { kind: "chore", participants: [member("amy", 0)] }),
    habit("late", { participants: [member("amy", 2)] }),
    habit("early", { participants: [member("amy", 1)] }),
    habit("old", { archivedAt: new Date("2026-10-20T00:00:00Z") }),
    habit("bobs", { participants: [member("bob")] }),
    habit("chore0", { kind: "chore", participants: [member("amy", -1)] }),
  ];
  const r = report(parent, habits);
  assert.deepEqual(ids(r), ["early", "late", "chore0", "chore1"]);
  assert.deepEqual(r.sections.map((section) => [section.kind, section.title]), [["habit", "Habits"], ["chore", "Chores"]]);
  assert.equal(r.empty, null);
});

test("items: a parent viewing a kid sees the kid's items, not their own, and not the kid's private ones", () => {
  const habits = [
    habit("bobs", { participants: [member("bob")] }),
    habit("bobs-secret", { isPrivate: true, participants: [member("bob")] }),
    habit("mine", { participants: [member("amy")] }),
    habit("both", { participants: [member("amy"), member("bob")], sharing: "together" }),
  ];
  const r = report(parent, habits, { person: "bob" });
  assert.equal(r.personId, "bob");
  assert.equal(r.isSelf, false);
  assert.deepEqual(ids(r).sort(), ["both", "bobs"].sort());
});

test("items: your own private habit shows to you, someone else's never does (even a shared private one)", () => {
  const secret = habit("secret", { isPrivate: true, participants: [member("amy")] });
  assert.deepEqual(ids(report(parent, [secret])), ["secret"]);
  assert.deepEqual(ids(report(parent, [secret], { person: "bob" })), []);
  const shared = habit("shared-secret", { isPrivate: true, participants: [member("amy"), member("bob")] });
  assert.deepEqual(ids(report(parent, [shared], { person: "bob" })), []);
  assert.deepEqual(ids(report(kid, [shared])), ["shared-secret"]);
});

test("items: a kid or member cannot ask for someone else; the parent's chips are viewer first, first names, no Kids chip", () => {
  const habits = [habit("amys"), habit("bobs", { participants: [member("bob")] })];
  const asked = report(kid, habits, { person: "amy" });
  assert.equal(asked.personId, "bob");
  assert.equal(asked.chips, null);
  assert.deepEqual(ids(asked), ["bobs"]);
  const chips = report(parent, habits, { person: "bob" }).chips!;
  assert.deepEqual(chips.map((chip) => [chip.id, chip.name, chip.selected]), [["amy", "Amy", false], ["bob", "Bob", true], ["cy", "Cy", false]]);
  const viewerCy: HabitActor = { userId: "cy", role: "admin" };
  assert.deepEqual(report(viewerCy, habits).chips!.map((chip) => chip.id), ["cy", "amy", "bob"]);
  // A person who is not in the household falls back to the viewer.
  assert.equal(report(parent, habits, { person: "ghost" }).personId, "amy");
});

test("items: the title links only when the viewer may open the stats page (decision 114)", () => {
  const habits = [habit("bobs", { participants: [member("bob")] })];
  assert.equal(rowsOf(report(parent, habits, { person: "bob" }))[0].canOpenStats, true);
  assert.equal(rowsOf(report(kid, habits))[0].canOpenStats, true);
});

test("items: a Side by side row shows only the shown person's checks; a Together row shows the shared check", () => {
  const sideBySide = habit("walk", { participants: [member("amy"), member("bob")] });
  // The reader fetches the shown person's own checks only, so what it hands over reads as theirs.
  const mine: ReportData = { ...noData, logsByHabit: new Map([["walk", [log(d(2026, 11, 2))]]]) };
  const row = rowsOf(report(parent, [sideBySide], {}, mine))[0] as ReportWeekRow;
  assert.deepEqual([row.cells[1].state, row.cells[2].state], ["done", "missed"]);
  assert.equal(rowsOf(report(parent, [sideBySide], { person: "bob" }, noData)).length, 1);
  const together = habit("dishes", { sharing: "together", participants: [member("amy"), member("bob")] });
  const shared = rowsOf(report(parent, [together], {}, { ...noData, logsByHabit: new Map([["dishes", [log(d(2026, 11, 3))]]]) }))[0];
  assert.equal((shared as ReportWeekRow).cells[2].state, "done");
});

test("items: an unreadable schedule is left out; no items gives the empty states (decision 171)", () => {
  const broken = habit("broken", { schedule: "weekdays", weekdays: null });
  const mine = report(parent, [broken]);
  assert.deepEqual(mine.empty, { emoji: "📊", title: "Nothing to report yet", hint: "Add a habit or chore in Manage and it shows up here." });
  assert.equal(mine.sections.length, 0);
  assert.equal(report(parent, [], { person: "bob" }).empty!.hint, "Bob has no habits or chores yet.");
  assert.equal(report(parent, [], { view: "year" }).empty!.title, "Nothing to report yet");
});

// ---- The filter ----

test("filter: All, Habits and Chores only when both, times of day, then life areas in the order met (decision 169)", () => {
  const items = [
    { kind: "habit" as const, timeOfDay: "evening", lifeArea: "fun" },
    { kind: "habit" as const, timeOfDay: "morning", lifeArea: "health" },
    { kind: "chore" as const, timeOfDay: null, lifeArea: "fun" },
  ];
  assert.deepEqual(reportFilterOptions(items).map((option) => option.key), ["all", "kind:habit", "kind:chore", "time:morning", "time:evening", "area:fun", "area:health"]);
  assert.deepEqual(reportFilterOptions(items).map((option) => option.label), ["All", "Habits", "Chores", "Morning", "Evening", "Fun", "Health"]);
  assert.deepEqual(reportFilterOptions([items[0], items[1]]).map((option) => option.key), ["all", "time:morning", "time:evening", "area:fun", "area:health"]);
  assert.deepEqual(reportFilterOptions([]).map((option) => option.key), ["all"]);
});

test("filter: matching, and a filter that matches nothing falls back to All", () => {
  const item = { kind: "chore" as const, timeOfDay: "morning", lifeArea: "health" };
  assert.equal(matchesReportFilter(item, "all"), true);
  assert.equal(matchesReportFilter(item, "kind:chore"), true);
  assert.equal(matchesReportFilter(item, "kind:habit"), false);
  assert.equal(matchesReportFilter(item, "time:morning"), true);
  assert.equal(matchesReportFilter(item, "time:evening"), false);
  assert.equal(matchesReportFilter(item, "area:health"), true);
  assert.equal(matchesReportFilter(item, "area:fun"), false);
  const habits = [habit("a", { timeOfDay: "morning" }), habit("b", { kind: "chore" })];
  const lit = report(parent, habits, { filter: "time:morning" });
  assert.deepEqual([lit.filter.value, ids(lit)], ["time:morning", ["a"]]);
  const gone = report(parent, habits, { filter: "time:evening" });
  assert.deepEqual([gone.filter.value, ids(gone)], ["all", ["a", "b"]]);
  assert.equal(report(parent, habits, { filter: "area:bogus" }).filter.value, "all");
});

// ---- The pager ----

test("pager: next is disabled on the current period, previous before the earliest start", () => {
  const habits = [habit("a")]; // started Oct 1 (a Thursday), so the first week starts Sun Sep 27
  const now = report(parent, habits).pager;
  assert.deepEqual(now, { title: "Nov 1 to 7", current: "2026-11-01", prev: "2026-10-25", next: null, pill: null });
  const past = report(parent, habits, { week: d(2026, 10, 25) }).pager;
  assert.deepEqual([past.prev, past.next, past.pill], ["2026-10-18", "2026-11-01", "This week"]);
  const first = report(parent, habits, { week: d(2026, 9, 27) }).pager;
  assert.deepEqual([first.prev, first.current], [null, "2026-09-27"]);
  const tooEarly = report(parent, habits, { week: d(2024, 1, 7) }).pager;
  assert.equal(tooEarly.current, "2026-09-27");
  const tooLate = report(parent, habits, { week: d(2027, 3, 7) }).pager;
  assert.deepEqual([tooLate.current, tooLate.next], ["2026-11-01", null]);
});

test("pager: the earliest start is among the shown items (the filter moves it), and a month and a year page the same way", () => {
  const early = habit("early", { createdAt: new Date("2025-08-10T18:00:00Z"), timeOfDay: "morning", participants: [member("amy", 0, new Date("2025-08-10T18:00:00Z"))] });
  const recent = habit("recent", { timeOfDay: "evening" });
  assert.equal(report(parent, [early, recent], { week: d(2025, 1, 5) }).pager.current, "2025-08-10");
  assert.equal(report(parent, [early, recent], { week: d(2025, 1, 5), filter: "time:evening" }).pager.current, "2026-09-27");
  const month = report(parent, [early, recent], { view: "month", month: d(2025, 9, 1) }).pager;
  assert.deepEqual([month.title, month.current, month.prev, month.next, month.pill], ["September 2025", "2025-09", "2025-08", "2025-10", "This month"]);
  assert.equal(report(parent, [early, recent], { view: "month", month: d(2024, 1, 1) }).pager.current, "2025-08");
  const nowMonth = report(parent, [early], { view: "month" }).pager;
  assert.deepEqual([nowMonth.next, nowMonth.pill, nowMonth.prev], [null, null, "2026-10"]);
  const year = report(parent, [early], { view: "year", year: 2025 }).pager;
  assert.deepEqual([year.title, year.prev, year.next, year.pill], ["2025", null, "2026", null]);
  assert.equal(report(parent, [early], { view: "year", year: 2030 }).pager.next, null);
});

test("scope: reads only the range shown, for the items drawn", () => {
  const habits = [habit("a"), habit("b", { kind: "chore" })];
  const week = reportScope(parent, params({ week: d(2026, 10, 25) }), habits, people, today);
  assert.deepEqual([week.from, week.to, week.items.map((item) => item.id)], [d(2026, 10, 25), d(2026, 10, 31), ["a", "b"]]);
  const month = reportScope(parent, params({ view: "month", month: d(2026, 10, 1) }), habits, people, today);
  assert.deepEqual([month.from, month.to], [d(2026, 10, 1), d(2026, 10, 31)]);
  const year = reportScope(parent, params({ view: "year", item: "b" }), habits, people, today);
  assert.deepEqual([year.from, year.to, year.items.map((item) => item.id)], [d(2026, 1, 1), d(2026, 12, 31), ["b"]]);
});

// ---- Week view ----

test("week: seven cells Sunday first, with the marks and the count of done of due so far", () => {
  const data: ReportData = { ...noData, logsByHabit: new Map([["a", [log(d(2026, 11, 1)), log(d(2026, 11, 3), "late"), log(d(2026, 11, 4), "skipped")]]]) };
  const row = rowsOf(report(parent, [habit("a")], {}, data))[0] as ReportWeekRow;
  assert.deepEqual(row.cells.map((cell) => cell.day), ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"]);
  assert.deepEqual(row.cells.map((cell) => cell.state), ["done", "missed", "late", "skipped", "today", "future", "future"]);
  assert.equal(row.cells.every((cell) => cell.tappable === false), true);
  assert.equal(row.count, "2 of 3"); // done, late done, and one missed; skipped and today are out
  const doneToday: ReportData = { ...noData, logsByHabit: new Map([["a", [log(d(2026, 11, 5))]]]) };
  assert.equal((rowsOf(report(parent, [habit("a")], {}, doneToday))[0] as ReportWeekRow).count, "1 of 5");
});

test("week: a week crossing a month reads both months, and a past week counts its own days", () => {
  const row = rowsOf(report(parent, [habit("a")], { week: d(2026, 10, 25) }))[0] as ReportWeekRow;
  assert.deepEqual(row.cells.map((cell) => cell.day), ["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"]);
  assert.equal(row.count, "0 of 7");
  const cross = habit("a", { createdAt: new Date("2025-08-10T18:00:00Z"), participants: [member("amy", 0, new Date("2025-08-10T18:00:00Z"))] });
  const wrap = rowsOf(report(parent, [cross], { week: d(2026, 5, 31) }))[0] as ReportWeekRow;
  assert.deepEqual([wrap.cells[0].day, wrap.cells[1].day, wrap.cells.length], ["2026-05-31", "2026-06-01", 7]);
});

test("week: days before the item started are plain, and the count text follows the kind (decision 166)", () => {
  const weekly = habit("w", { schedule: "weekly", times: 3 });
  const monthly = habit("m", { schedule: "monthly", times: 4 });
  const data: ReportData = { ...noData, logsByHabit: new Map([["w", [log(d(2026, 11, 2)), log(d(2026, 11, 3))]], ["m", [log(d(2026, 11, 2))]]]) };
  const rows = rowsOf(report(parent, [weekly, monthly], {}, data)) as ReportWeekRow[];
  assert.deepEqual(rows.map((row) => row.count), ["2 of 3", "1 this week"]);
  const capped: ReportData = { ...noData, logsByHabit: new Map([["w", [1, 2, 3, 4].map((day) => log(d(2026, 11, day)))]]) };
  assert.equal((rowsOf(report(parent, [weekly], {}, capped))[0] as ReportWeekRow).count, "3 of 3");
  const young = habit("y", { createdAt: new Date("2026-11-03T18:00:00Z"), participants: [member("amy", 0, new Date("2026-11-03T18:00:00Z"))] });
  const row = rowsOf(report(parent, [young]))[0] as ReportWeekRow;
  assert.deepEqual(row.cells.map((cell) => cell.state), ["notDue", "notDue", "missed", "missed", "today", "future", "future"]);
});

test("week: a vacation day and a week-skipped chore draw Skipped, a moved chore reads right, a check wins (decision 170)", () => {
  const chore = habit("c", { kind: "chore", schedule: "weekdays", weekdays: "0101000" }); // Mon and Wed
  const skip: WeekOverride = { weekStart: d(2026, 11, 1), fromWeekday: 1, action: "skipped", toWeekday: null };
  const move: WeekOverride = { weekStart: d(2026, 11, 1), fromWeekday: 3, action: "moved", toWeekday: 5 };
  const vacation: Vacation = { start: d(2026, 11, 3), end: d(2026, 11, 3) };
  const data: ReportData = { logsByHabit: new Map(), overridesByHabit: new Map([["c", [skip, move]]]), vacations: [vacation] };
  const row = rowsOf(report(parent, [chore], {}, data))[0] as ReportWeekRow;
  assert.equal(row.cells[1].state, "skipped"); // Mon, skipped this week
  assert.deepEqual(row.cells[1].reason, { kind: "weekSkip" });
  assert.equal(row.cells[3].state, "notDue"); // Wed, moved away
  assert.deepEqual(row.cells[3].reason, { kind: "movedAway", toWeekday: 5 });
  assert.equal(row.cells[5].state, "future"); // Fri, moved here
  assert.equal(row.count, "0 of 0");
  const daily = rowsOf(report(parent, [habit("a")], {}, { ...noData, vacations: [vacation] }))[0] as ReportWeekRow;
  assert.deepEqual([daily.cells[2].state, daily.cells[2].reason], ["skipped", { kind: "vacation" }]);
  const checked = rowsOf(report(parent, [habit("a")], {}, { ...noData, vacations: [vacation], logsByHabit: new Map([["a", [log(d(2026, 11, 3))]]]) }))[0] as ReportWeekRow;
  assert.deepEqual([checked.cells[2].state, checked.cells[2].reason], ["done", null]);
});

// ---- Month view ----

test("month: one card per item with the leading blanks, the cells and the count (decision 167)", () => {
  const data: ReportData = { ...noData, logsByHabit: new Map([["a", [log(d(2026, 11, 1)), log(d(2026, 11, 2)), log(d(2026, 11, 4))]], ["w", [log(d(2026, 11, 2))]], ["m", [log(d(2026, 11, 2))]]]) };
  const cards = rowsOf(report(parent, [habit("a"), habit("w", { schedule: "weekly", times: 3 }), habit("m", { schedule: "monthly", times: 4 })], { view: "month" }, data)) as ReportMonthCard[];
  assert.equal(cards[0].leading, 0); // Nov 1, 2026 is a Sunday
  assert.equal(cards[0].cells.length, 30);
  assert.deepEqual(cards.map((card) => card.count), ["3 of 4", "1 this month", "1 of 4"]);
  const october = rowsOf(report(parent, [habit("a")], { view: "month", month: d(2026, 10, 1) }))[0] as ReportMonthCard;
  assert.equal(october.leading, 4);
  assert.equal(october.cells.length, 31);
  assert.equal(october.cells[0].state, "missed"); // Oct 1, the start day, nothing checked
});

// ---- Year view ----

test("year: the first shown item by default, the chosen one by id, twelve grids and the totals line (decision 168)", () => {
  const habits = [habit("a"), habit("b", { kind: "chore" })];
  const data: ReportData = { ...noData, logsByHabit: new Map([["a", [log(d(2026, 11, 1)), log(d(2026, 11, 2), "skipped"), log(d(2026, 10, 3), "late")]]]) };
  const first = report(parent, habits, { view: "year" }, data);
  assert.equal(first.sections.length, 0);
  assert.equal(first.year!.chosenId, "a");
  assert.deepEqual(first.year!.choices.map((choice) => choice.id), ["a", "b"]);
  assert.deepEqual(first.year!.months.map((month) => month.name).slice(0, 2), ["January", "February"]);
  assert.equal(first.year!.months.length, 12);
  assert.equal(first.year!.months[10].cells.length, 30);
  // Oct 1 to Nov 4 are due and not done except Oct 3 (late), Nov 1 (done) and Nov 2 (skipped).
  assert.equal(first.year!.totals, "2 done · 32 missed · 1 skipped");
  const chosen = report(parent, habits, { view: "year", item: "b" }, data);
  assert.equal(chosen.year!.chosenId, "b");
  assert.equal(report(parent, habits, { view: "year", item: "nope" }).year!.chosenId, "a");
  assert.equal(report(parent, habits, { view: "year", filter: "kind:chore" }).year!.chosenId, "b");
  assert.deepEqual(report(parent, habits, { view: "year", filter: "kind:chore" }).year!.choices.map((choice) => choice.id), ["b"]);
});

test("year: months before the item started draw plain, and the past year's grids are complete", () => {
  const old = habit("a", { createdAt: new Date("2025-11-20T18:00:00Z"), participants: [member("amy", 0, new Date("2025-11-20T18:00:00Z"))] });
  const r = report(parent, [old], { view: "year", year: 2025 });
  assert.equal(r.year!.months[0].cells.every((cell) => cell.state === "notDue"), true);
  assert.equal(r.year!.months[11].cells[0].state, "missed");
  assert.equal(r.year!.totals, "0 done · 42 missed · 0 skipped");
  assert.equal(r.pager.prev, null);
});
