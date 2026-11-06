// Pins habitsReportScope.ts: the URL params, the filter and the range the
// loader reads (decisions 164 to 169). Plain calendar days, so the results are
// the same in every time zone. "Today" is Thursday 2026-11-05.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "./householdDate";
import type { HabitActor } from "./habits/types";
import { matchesReportFilter, parseReportParams, reportFilterOptions, reportHref, reportScope, type ReportParams } from "./habitsReportScope";
import type { TodayHabitInput } from "./habitsToday";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const today = d(2026, 11, 5);
const OCT_1 = new Date("2026-10-01T18:00:00Z"); // Oct 1 in Denver

const people = [
  { id: "amy", displayName: "Amy Marsh", avatarColor: "blue" },
  { id: "bob", displayName: "Bob Marsh", avatarColor: "green" },
  { id: "cy", displayName: "Cy", avatarColor: "red" },
];
const parent: HabitActor = { userId: "amy", role: "parent" };

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

const scopeOf = (habits: TodayHabitInput[], p: Partial<ReportParams> = {}) => reportScope(parent, params(p), habits, people, today);
const ids = (scope: ReturnType<typeof reportScope>) => scope.items.map((item) => item.id);

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
  const lit = scopeOf(habits, { filter: "time:morning" });
  assert.deepEqual([lit.filter.value, ids(lit)], ["time:morning", ["a"]]);
  const gone = scopeOf(habits, { filter: "time:evening" });
  assert.deepEqual([gone.filter.value, ids(gone)], ["all", ["a", "b"]]);
  assert.equal(scopeOf(habits, { filter: "area:bogus" }).filter.value, "all");
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


test("reportHref: leaves out the defaults, keeps the rest, and reads back through parseReportParams", () => {
  assert.equal(reportHref({ view: "week" }), "/habits/report");
  assert.equal(reportHref({ view: "week", filter: "all", person: null, item: null }), "/habits/report");
  const href = reportHref({ view: "month", month: "2026-10", person: "bob", filter: "kind:chore", item: "h1" });
  assert.equal(href, "/habits/report?view=month&month=2026-10&person=bob&filter=kind%3Achore&item=h1");
  const query = Object.fromEntries(new URL(href, "http://x").searchParams);
  assert.deepEqual(parseReportParams(query, today), { view: "month", week: d(2026, 11, 1), month: d(2026, 10, 1), year: 2026, person: "bob", filter: "kind:chore", item: "h1" });
  assert.equal(reportHref({ view: "year", year: "2025" }), "/habits/report?view=year&year=2025");
});
