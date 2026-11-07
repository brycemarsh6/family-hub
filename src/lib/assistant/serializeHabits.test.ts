import { test } from "node:test";
import assert from "node:assert/strict";
import type { HabitRowView } from "@/lib/habitsToday";
import type { ChoreChartData } from "@/lib/choreChart";
import {
  habitChanges,
  logChange,
  timeEntryChange,
  toChart,
  toHabit,
  toHabitDetail,
  toTodayRow,
  type HabitRow,
  type StreakContext,
} from "./serializeHabits";

const TODAY = { year: 2026, month: 11, day: 6 };
const ctx: StreakContext = { today: TODAY, vacationsOf: () => [], choreStreakOf: () => ({ current: 4, best: 9 }) };

const part = (userId: string, over: Partial<HabitRow["participants"][number]> = {}) => ({
  userId,
  currentStreak: 3,
  bestStreak: 5,
  streakAsOf: new Date("2026-11-06T00:00:00Z"),
  user: { deactivatedAt: null },
  ...over,
});

const row: HabitRow = {
  id: "h1",
  title: "Read",
  kind: "habit",
  mode: "build",
  icon: null,
  lifeArea: "growth",
  timeOfDay: null,
  schedule: "daily",
  weekdays: null,
  times: null,
  anchorWeek: null,
  carryOver: false,
  sharing: "each",
  isPrivate: false,
  everyone: false,
  archivedAt: null,
  track: "checks",
  weeklyMinutes: null,
  paceDays: null,
  hoursSince: null,
  participants: [part("a"), part("b", { user: { deactivatedAt: new Date() } })],
  // Columns that must never reach the wire:
  ...({ createdAt: new Date(), createdById: "secret" } as object),
};

test("toHabit: exact key set, deactivated people left out, createdById never shown", () => {
  const out = toHabit(row, ctx);
  assert.deepEqual(Object.keys(out).sort(), [
    "anchorWeek", "archived", "carryOver", "everyone", "icon", "id", "isPrivate", "kind", "lifeArea", "mode",
    "paceDays", "participants", "schedule", "sharing", "timeOfDay", "times", "title", "track", "weekdays", "weeklyMinutes",
  ]);
  assert.deepEqual(out.participants, [{ personId: "a", streak: 3, bestStreak: 5 }]);
  assert.ok(!JSON.stringify(out).includes("secret"));
});

test("toHabit: a streak is the cache aged to today (a missed day since breaks it)", () => {
  const stale = { ...row, participants: [part("a", { streakAsOf: new Date("2026-11-03T00:00:00Z") })] };
  assert.deepEqual(toHabit(stale, ctx).participants, [{ personId: "a", streak: 0, bestStreak: 5 }]);
});

test("toHabit: a chore shows the person's chore streak, not the habit's own", () => {
  assert.deepEqual(toHabit({ ...row, kind: "chore" }, ctx).participants, [{ personId: "a", streak: 4, bestStreak: 9 }]);
});

test("toHabit: dates leave as YYYY-MM-DD and archived is a boolean", () => {
  const out = toHabit({ ...row, anchorWeek: new Date("2026-11-01T00:00:00Z"), archivedAt: new Date() }, ctx);
  assert.equal(out.anchorWeek, "2026-11-01");
  assert.equal(out.archived, true);
});

const hoursRow: HabitRow = {
  ...row,
  track: "hours",
  schedule: "weekly",
  times: 1,
  weeklyMinutes: 600,
  paceDays: "monsat",
  hoursSince: new Date("2026-10-01T00:00:00Z"),
  participants: [part("a", { currentStreak: 2, bestStreak: 2, streakAsOf: new Date("2026-11-06T00:00:00Z") })],
};

test("toHabitDetail: an hours habit's week per person with this week's entries; checks habit is null", () => {
  const extras = {
    entries: [
      { id: "e1", userId: "a", day: new Date("2026-11-05T00:00:00Z"), minutes: 90 },
      { id: "e2", userId: "a", day: new Date("2026-11-06T00:00:00Z"), minutes: 60 },
    ],
    madeByAssistant: new Set(["e2"]),
    logs: [{ userId: "a", day: new Date("2026-11-05T00:00:00Z"), status: "done" }],
    createdByAssistant: true,
  };
  const out = toHabitDetail(hoursRow, extras, ctx);
  const week = out.hoursWeek?.[0];
  assert.equal(week?.doneMinutes, 150);
  assert.equal(week?.leftMinutes, 450);
  assert.equal(week?.targetMinutes, 600);
  assert.equal(week?.weekStart, "2026-11-01");
  assert.deepEqual(week?.entries, [
    { id: "e1", day: "2026-11-05", minutes: 90, loggedByAssistant: false },
    { id: "e2", day: "2026-11-06", minutes: 60, loggedByAssistant: true },
  ]);
  assert.deepEqual(out.recentLogs, [{ personId: "a", day: "2026-11-05", status: "done" }]);
  assert.equal(out.createdByAssistant, true);
  assert.equal(toHabitDetail(row, { ...extras, entries: [] }, ctx).hoursWeek, null);
});

const today = (over: object): HabitRowView => ({
  id: "h1", title: "Read", kind: "habit", dueState: "required", doneToday: false, skippedToday: false,
  carriedFrom: null, onVacation: false, skippedThisWeek: false, hours: null, isPrivate: false, ...over,
}) as unknown as HabitRowView;

test("toTodayRow: left, done, skipped, the carried day, and the hours bar", () => {
  assert.equal(toTodayRow(today({})).state, "left");
  assert.equal(toTodayRow(today({ doneToday: true })).state, "done");
  assert.equal(toTodayRow(today({ skippedToday: true })).state, "skipped");
  assert.equal(toTodayRow(today({ carriedFrom: { year: 2026, month: 11, day: 3 } })).carriedFrom, "2026-11-03");
  const bar = toTodayRow(today({ hours: { done: 90, target: 600, met: false } })).hours;
  assert.deepEqual(bar, { doneMinutes: 90, targetMinutes: 600, leftMinutes: 510, met: false });
  assert.deepEqual(Object.keys(toTodayRow(today({}))).sort(), [
    "carriedFrom", "dueState", "habitId", "hours", "kind", "onVacation", "skippedThisWeek", "state", "title",
  ]);
});

test("toChart: ids, titles and what this week did; no names, chips or editing flags", () => {
  const chart = {
    personId: "p", personName: "Emily", subtitle: "Emily's week", chips: [{ id: "x" }], today: "2026-11-06",
    defaultWeek: [{ weekday: 1, name: "Monday", short: "Mon", chores: [{ id: "c1", title: "Trash", icon: "Trash2", who: null }] }],
    thisWeek: {
      start: "2026-11-01", end: "2026-11-07",
      days: [{ weekday: 1, name: "Monday", short: "Mon", date: "2026-11-02", isToday: false, chores: [
        { id: "c1", title: "Trash", icon: "Trash2", who: null, fromWeekday: 1, state: "skipped", tag: "Skipped this week", changed: true, canChange: true, askParent: false, originalDayPast: true, moveTargets: [] },
      ] }],
    },
  } as unknown as ChoreChartData;
  const out = toChart(chart);
  assert.deepEqual(out.defaultWeek[0].chores, [{ id: "c1", title: "Trash" }]);
  assert.deepEqual(out.thisWeek.days[0].chores, [{ id: "c1", title: "Trash", state: "skipped", tag: "Skipped this week" }]);
  assert.ok(!JSON.stringify(out).includes("Emily"));
  assert.deepEqual(Object.keys(out).sort(), ["defaultWeek", "personId", "thisWeek", "today"]);
});

const logRow = {
  id: "l1", habitId: "h1", userId: "a", day: new Date("2026-11-05T00:00:00Z"), status: "done",
  loggedById: null, createdAt: new Date("2026-11-06T10:00:00Z"),
};

test("logChange and timeEntryChange: a full copy on the right side, Dates as ISO", () => {
  const made = logChange("create", logRow);
  assert.equal(made.model, "HabitLog");
  assert.equal(made.before, null);
  assert.equal(made.after?.day, "2026-11-05T00:00:00.000Z");
  assert.equal(made.after?.loggedById, null);
  assert.deepEqual(made.summary, { habitId: "h1", personId: "a", day: "2026-11-05", status: "done" });
  const gone = logChange("delete", logRow);
  assert.equal(gone.after, null);
  assert.equal(gone.before?.id, "l1");
  const entry = timeEntryChange("create", { id: "e1", habitId: "h1", userId: "a", day: logRow.day, minutes: 60, loggedById: null, createdAt: logRow.createdAt });
  assert.equal(entry.model, "HabitTimeEntry");
  assert.equal(entry.after?.minutes, 60);
});

const habitRowDb = (over: object = {}) => ({
  id: "h1", title: "Read", kind: "habit", mode: "build", icon: null, lifeArea: null, timeOfDay: null, schedule: "daily",
  weekdays: null, times: null, anchorWeek: null, carryOver: false, track: "checks", weeklyMinutes: null, paceDays: null,
  hoursSince: null, sharing: "each", isPrivate: false, everyone: false, archivedAt: null, createdById: null,
  createdAt: new Date("2026-11-01T00:00:00Z"), updatedAt: new Date("2026-11-01T00:00:00Z"), ...over,
});
const partDb = (id: string, userId: string, over: object = {}) => ({
  id, habitId: "h1", userId, sortOrder: 0, currentStreak: 0, bestStreak: 0, streakAsOf: null,
  joinedAt: new Date("2026-11-01T00:00:00Z"), ...over,
});

test("habitChanges: a create records the habit and each participant", () => {
  const after = { habit: habitRowDb(), participants: [partDb("p1", "a"), partDb("p2", "b")] };
  const out = habitChanges(null, after);
  assert.deepEqual(out.map((c) => `${c.model}:${c.action}`), ["Habit:create", "HabitParticipant:create", "HabitParticipant:create"]);
  assert.equal(out[0].before, null);
  assert.equal(out[0].after?.title, "Read");
});

test("habitChanges: an edit records the Habit (title) and the people who joined or left", () => {
  const before = { habit: habitRowDb(), participants: [partDb("p1", "a"), partDb("p2", "b")] };
  const after = {
    habit: habitRowDb({ title: "Reread", updatedAt: new Date("2026-11-06T00:00:00Z") }),
    participants: [partDb("p1", "a"), partDb("p3", "c")],
  };
  const out = habitChanges(before, after);
  assert.deepEqual(out.map((c) => `${c.model}:${c.action}:${c.recordId}`), ["Habit:update:h1", "HabitParticipant:create:p3", "HabitParticipant:delete:p2"]);
  assert.deepEqual(out[0].summary, { changed: ["title"] });
});

test("habitChanges: nothing changed, or only updatedAt and the streak caches, records nothing", () => {
  const before = { habit: habitRowDb(), participants: [partDb("p1", "a")] };
  assert.deepEqual(habitChanges(before, before), []);
  const bumped = {
    habit: habitRowDb({ updatedAt: new Date("2026-11-06T00:00:00Z") }),
    participants: [partDb("p1", "a", { currentStreak: 7, bestStreak: 9, streakAsOf: new Date("2026-11-06T00:00:00Z") })],
  };
  assert.deepEqual(habitChanges(before, bumped), []);
});

test("habitChanges: a sort order change on a participant is recorded as an update", () => {
  const before = { habit: habitRowDb(), participants: [partDb("p1", "a")] };
  const after = { habit: habitRowDb(), participants: [partDb("p1", "a", { sortOrder: 3 })] };
  assert.deepEqual(habitChanges(before, after).map((c) => `${c.model}:${c.action}`), ["HabitParticipant:update"]);
});

test("habitChanges: archiving records an archivedAt update", () => {
  const before = { habit: habitRowDb(), participants: [] };
  const after = { habit: habitRowDb({ archivedAt: new Date("2026-11-06T00:00:00Z") }), participants: [] };
  const out = habitChanges(before, after);
  assert.deepEqual(out[0].summary, { changed: ["archivedAt"] });
});
