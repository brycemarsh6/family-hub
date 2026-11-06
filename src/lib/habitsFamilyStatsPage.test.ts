// Pins the stats page builder in habitsFamily.ts (the family page builder
// and the done counts are in its sibling, habitsFamily.test.ts): who opens it, whose numbers
// it shows, the nudge list and perfect days. "Today" is Thursday 2026-11-05;
// the checks are plain calendar days, so the results are the same in every
// time zone.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "./householdDate";
import type { HabitActor, HabitLogDay, ScheduleSpec } from "./habits/types";
import {
  buildStatsData,
  perfectDayEntries,
  statsSubject,
  type StatsBuildInput,
  type StatsMemberInput,
} from "./habitsFamily";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const today = d(2026, 11, 5);
const old = new Date("2026-01-01T12:00:00Z");
const log = (userId: string, day: CalendarDate, status: HabitLogDay["status"] = "done"): HabitLogDay => ({ userId, day, status });

const amy: HabitActor = { userId: "amy", role: "parent" };
const ben: HabitActor = { userId: "ben", role: "kid" };
const tablet: HabitActor = { userId: "tablet", role: "device" };

// ---- Stats page ----

const joined = (userId: string, extra: Partial<StatsMemberInput> = {}): StatsMemberInput => ({
  userId,
  displayName: userId.toUpperCase(),
  avatarColor: "blue",
  joinedAt: old,
  deactivatedAt: null,
  currentStreak: 0,
  bestStreak: 0,
  streakAsOf: null,
  ...extra,
});

function statsInput(overrides: Partial<StatsBuildInput> = {}): StatsBuildInput {
  return {
    viewer: amy,
    habit: {
      id: "h1",
      title: "Read",
      icon: null,
      kind: "habit",
      mode: "build",
      sharing: "each",
      isPrivate: false,
      everyone: false,
      archivedAt: null,
      createdAt: old,
      schedule: "daily",
      weekdays: null,
      times: null,
      anchorWeek: null,
    },
    members: [joined("amy"), joined("ben")],
    logs: [],
    vacationsByUser: new Map(),
    subjectHabits: [],
    nudgedToday: [],
    today,
    month: today,
    ...overrides,
  };
}

test("statsSubject: the viewer when active on the habit, else the longest-joined active person, else null", () => {
  const members = [joined("ben", { joinedAt: new Date("2026-03-01") }), joined("cat", { joinedAt: new Date("2026-02-01") }), joined("old", { joinedAt: new Date("2025-01-01"), deactivatedAt: old })];
  assert.equal(statsSubject("ben", members), "ben");
  assert.equal(statsSubject("amy", members), "cat");
  assert.equal(statsSubject("amy", [members[2]]), null);
  assert.equal(statsSubject("old", members), "cat", "a deactivated viewer is not the subject");
});

test("buildStatsData: a private habit opens only for its participant; strangers get null", () => {
  const secret = { ...statsInput().habit, isPrivate: true };
  const members = [joined("amy")];
  assert.ok(buildStatsData(statsInput({ habit: secret, members })));
  assert.equal(buildStatsData(statsInput({ habit: secret, members, viewer: { userId: "boss", role: "admin" } })), null);
  assert.equal(buildStatsData(statsInput({ habit: secret, members, viewer: tablet })), null);
  assert.ok(buildStatsData(statsInput({ viewer: { userId: "boss", role: "admin" } })), "a parent opens a shared habit");
  assert.ok(buildStatsData(statsInput({ viewer: tablet })));
  assert.equal(buildStatsData(statsInput({ viewer: { userId: "kid2", role: "kid" } })), null);
});

test("buildStatsData: the tiles are the viewer's, or the first person's when a parent opens a kid's habit", () => {
  const members = [joined("ben", { currentStreak: 3, bestStreak: 6, streakAsOf: new Date(Date.UTC(2026, 10, 4)) })];
  const own = buildStatsData(statsInput({ viewer: ben, members, logs: [log("ben", d(2026, 11, 4)), log("ben", d(2026, 11, 3), "late")] }))!;
  assert.equal(own.subjectId, "ben");
  assert.deepEqual(own.tiles, { userId: "ben", current: 3, best: 6, total: 2, unit: "days" });
  const parent = buildStatsData(statsInput({ viewer: amy, members }))!;
  assert.equal(parent.subjectId, "ben");
  assert.equal(parent.canTap, true);
  assert.equal(buildStatsData(statsInput({ viewer: tablet, members }))!.canTap, true);
});

test("buildStatsData: subjectName is the subject's display name (the viewer's own, else the kid a parent is looking at)", () => {
  const members = [joined("ben"), joined("cat", { joinedAt: new Date("2025-01-01") })];
  assert.equal(buildStatsData(statsInput({ viewer: ben, members }))!.subjectName, "BEN", "the viewer when they are on the habit");
  assert.equal(buildStatsData(statsInput({ viewer: amy, members }))!.subjectName, "CAT", "the longest-joined person for a parent");
  assert.equal(buildStatsData(statsInput({ viewer: amy, members: [joined("ben")] }))!.subjectName, "BEN");
});

test("buildStatsData: dates leave as YYYY-MM-DD strings and the calendar is the month shown", () => {
  const data = buildStatsData(statsInput({ month: d(2026, 10, 17), logs: [log("amy", d(2026, 10, 31))] }))!;
  assert.equal(data.today, "2026-11-05");
  assert.equal(data.month, "2026-10-01");
  assert.equal(data.calendar.first, "2026-10-01");
  assert.equal(data.calendar.cells.length, 31);
  assert.equal(data.calendar.cells[30].day, "2026-10-31");
  assert.equal(data.calendar.cells[30].state, "done");
  assert.equal(data.calendar.cells[30].tappable, true, "Oct 31 is 5 days back");
  assert.equal(data.calendar.cells[27].tappable, false, "Oct 28 is 8 days back");
  const thisMonth = buildStatsData(statsInput())!.calendar.cells;
  assert.equal(thisMonth[5].tappable, false, "tomorrow (Nov 6) is future");
  assert.equal(thisMonth[3].tappable, true, "yesterday");
  assert.equal(thisMonth[4].state, "today");
});

test("buildStatsData: Side by side habits get the table and six weekly strips; Together and one-person habits do not", () => {
  const each = buildStatsData(statsInput())!;
  assert.equal(each.sideBySide?.rows.length, 2);
  assert.equal(each.sideBySide?.weekly.weeks.length, 6);
  assert.equal(each.sideBySide?.weekly.weeks[5], "2026-11-01");
  assert.equal(each.sideBySide?.weekly.people.length, 2);
  assert.equal(buildStatsData(statsInput({ habit: { ...statsInput().habit, sharing: "together" } }))!.sideBySide, null);
  assert.equal(buildStatsData(statsInput({ members: [joined("amy")] }))!.sideBySide, null);
  const hidden = buildStatsData(statsInput({ members: [joined("amy"), joined("ben", { deactivatedAt: old })] }))!;
  assert.equal(hidden.sideBySide, null, "a deactivated person does not count as a second person");
});

test("buildStatsData: nudgeable lists other active people not finished today, and marks those already nudged", () => {
  const members = [joined("amy"), joined("ben"), joined("cat"), joined("dan", { deactivatedAt: old })];
  const data = buildStatsData(statsInput({ members, logs: [log("cat", today, "skipped")], nudgedToday: ["ben"] }))!;
  assert.deepEqual(data.nudgeable, [{ userId: "ben", displayName: "BEN", nudged: true }]);
  const once = buildStatsData(statsInput({ members, logs: [log("ben", today)] }))!;
  assert.deepEqual(once.nudgeable.map((n) => n.userId), ["cat"], "Ben finished, so only Cat is left");
});

test("buildStatsData: no nudges for the tablet, a non-participant parent, a private, archived or Together habit", () => {
  assert.deepEqual(buildStatsData(statsInput({ viewer: tablet }))!.nudgeable, []);
  assert.deepEqual(buildStatsData(statsInput({ viewer: { userId: "boss", role: "admin" } }))!.nudgeable, []);
  assert.deepEqual(buildStatsData(statsInput({ habit: { ...statsInput().habit, archivedAt: old } }))!.nudgeable, []);
  assert.deepEqual(buildStatsData(statsInput({ habit: { ...statsInput().habit, sharing: "together" } }))!.nudgeable, []);
});

test("buildStatsData: a schedule that cannot be read gives null", () => {
  assert.equal(buildStatsData(statsInput({ habit: { ...statsInput().habit, schedule: "weekdays", weekdays: null } })), null);
});

// ---- Perfect days ----

const daily: ScheduleSpec = { schedule: "daily" };
const weekly: ScheduleSpec = { schedule: "weekly", times: 3 };

test("perfectDayEntries: a scheduled habit adds a required entry with the day's status; open kinds add none that are required", () => {
  const entries = perfectDayEntries([{ kind: "habit", spec: daily, since: d(2026, 11, 1), logs: [log("amy", d(2026, 11, 2), "late")] }, { kind: "habit", spec: weekly, since: d(2026, 11, 1), logs: [] }], []);
  assert.deepEqual(entries(d(2026, 11, 2)).filter((e) => e.state === "required"), [{ kind: "habit", state: "required", status: "late" }]);
  assert.equal(entries(d(2026, 11, 3)).filter((e) => e.state === "required")[0].status, null);
});

test("perfectDayEntries: days before the person joined and vacation days add nothing", () => {
  const habits = [{ kind: "habit" as const, spec: daily, since: d(2026, 11, 3), logs: [] }];
  const entries = perfectDayEntries(habits, [{ start: d(2026, 11, 4), end: d(2026, 11, 4) }]);
  assert.deepEqual(entries(d(2026, 11, 2)), []);
  assert.deepEqual(entries(d(2026, 11, 4)), []);
  assert.equal(entries(d(2026, 11, 3)).length, 1);
});

test("buildStatsData: perfect days this month count days where every required habit is done or skipped, stopping at today", () => {
  const subjectHabits = [
    { kind: "habit" as const, spec: daily, since: d(2026, 11, 1), logs: [log("amy", d(2026, 11, 1)), log("amy", d(2026, 11, 2), "skipped"), log("amy", d(2026, 11, 3), "late"), log("amy", d(2026, 11, 4))] },
    { kind: "habit" as const, spec: daily, since: d(2026, 11, 1), logs: [log("amy", d(2026, 11, 1)), log("amy", d(2026, 11, 2)), log("amy", d(2026, 11, 3)), log("amy", d(2026, 11, 5))] },
  ];
  const data = buildStatsData(statsInput({ subjectHabits }))!;
  assert.equal(data.perfectDays, 2, "Nov 1 and Nov 2 are perfect; Nov 3 is late, Nov 4 and Nov 5 each miss one");
});
