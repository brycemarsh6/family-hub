// Pins habitsFamily.ts: the family page (who appears, in whose order, who may
// tick) and the stats page builder (who sees it, whose numbers, the nudge
// list, perfect days). Also the Today page's new nudge and confetti fields.
// "Today" is Thursday 2026-11-05; the checks are plain calendar days, so the
// results are the same in every time zone.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "./householdDate";
import type { HabitActor, HabitLogDay, ScheduleSpec } from "./habits/types";
import {
  buildFamilyPage,
  buildStatsData,
  countedRows,
  doneCountLabel,
  doneCounts,
  perfectDayEntries,
  statsSubject,
  type StatsBuildInput,
  type StatsMemberInput,
} from "./habitsFamily";
import { buildTodayPage, type TodayHabitInput } from "./habitsToday";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const today = d(2026, 11, 5);
const old = new Date("2026-01-01T12:00:00Z");
const log = (userId: string, day: CalendarDate, status: HabitLogDay["status"] = "done"): HabitLogDay => ({ userId, day, status });

const amy: HabitActor = { userId: "amy", role: "parent" };
const ben: HabitActor = { userId: "ben", role: "kid" };
const tablet: HabitActor = { userId: "tablet", role: "device" };
const people = [
  { id: "amy", displayName: "Amy", avatarColor: "blue" },
  { id: "ben", displayName: "Ben", avatarColor: "red" },
  { id: "cat", displayName: "Cat", avatarColor: "green" },
];

function member(userId: string, sortOrder = 0, extra: { joinedAt?: Date; deactivatedAt?: Date | null } = {}) {
  return {
    userId,
    sortOrder,
    joinedAt: extra.joinedAt ?? old,
    user: { displayName: userId, avatarColor: "blue", deactivatedAt: extra.deactivatedAt ?? null },
  };
}

function habit(overrides: Partial<TodayHabitInput> & { id: string }): TodayHabitInput {
  return {
    title: overrides.id,
    icon: null,
    kind: "habit",
    mode: "build",
    timeOfDay: null,
    lifeArea: null,
    sharing: "each",
    isPrivate: false,
    everyone: false,
    carryOver: false,
    createdAt: old,
    archivedAt: null,
    schedule: "daily",
    weekdays: null,
    times: null,
    anchorWeek: null,
    participants: [member("amy"), member("ben")],
    ...overrides,
  };
}

const logs = (pairs: [string, HabitLogDay[]][]) => new Map(pairs);

// ---- Today page: nudges and confetti ----

test("buildTodayPage: the nudges pass through and the confetti flag is on only when every required row is done or skipped", () => {
  const h = habit({ id: "h1", participants: [member("amy")] });
  const nudges = [{ id: "n1", fromName: "Ben", habitTitle: "h1" }];
  const open = buildTodayPage(amy, [h], logs([]), today, new Map(), nudges);
  assert.deepEqual(open.nudges, nudges);
  assert.equal(open.confetti, false);
  const finished = buildTodayPage(amy, [h], logs([["h1", [log("amy", today)]]]), today);
  assert.equal(finished.confetti, true);
  assert.deepEqual(finished.nudges, []);
});

// ---- Family page ----

test("buildFamilyPage: private and archived habits never appear, even for their own participant", () => {
  const habits = [
    habit({ id: "shown" }),
    habit({ id: "secret", isPrivate: true, participants: [member("amy")] }),
    habit({ id: "gone", archivedAt: old }),
  ];
  const page = buildFamilyPage(amy, habits, people, logs([]), today);
  const ids = page.columns.flatMap((c) => c.rows.map((r) => r.id));
  assert.deepEqual(ids, ["shown", "shown"]);
  assert.equal(page.today, "2026-11-05");
});

test("buildFamilyPage: Together habits go in the strip once, not in the columns", () => {
  const together = habit({ id: "tog", sharing: "together" });
  const page = buildFamilyPage(amy, [together, habit({ id: "mine" })], people, logs([]), today);
  assert.deepEqual(page.together.map((r) => r.id), ["tog"]);
  assert.ok(page.columns.every((c) => c.rows.every((r) => r.id !== "tog")));
});

test("buildFamilyPage: the strip row is ticked for the viewer when on it, else for the first member", () => {
  const together = habit({ id: "tog", sharing: "together", participants: [member("ben"), member("cat")] });
  const asBen = buildFamilyPage(ben, [together], people, logs([]), today);
  assert.equal(asBen.together[0].logForId, "ben");
  assert.equal(asBen.together[0].canLog, true);
  const asAmy = buildFamilyPage(amy, [together], people, logs([]), today);
  assert.equal(asAmy.together[0].logForId, "ben");
  assert.equal(asAmy.together[0].canLog, true, "a parent may tick for anyone");
  const dad: HabitActor = { userId: "dad", role: "kid" };
  assert.equal(buildFamilyPage(dad, [together], people, logs([]), today).together[0].canLog, false);
});

test("buildFamilyPage: each column follows that person's own order, and the counts are done of total", () => {
  const first = habit({ id: "first", participants: [member("amy", 1), member("ben", 0)] });
  const second = habit({ id: "second", participants: [member("amy", 0), member("ben", 1)] });
  const page = buildFamilyPage(amy, [first, second], people, logs([["first", [log("ben", today)]]]), today);
  const [a, b, c] = page.columns;
  assert.deepEqual(a.rows.map((r) => r.id), ["second", "first"]);
  assert.deepEqual(b.rows.map((r) => r.id), ["first", "second"]);
  assert.equal(b.doneCount, 1);
  assert.equal(b.totalCount, 2);
  assert.equal(a.doneCount, 0);
  assert.deepEqual(c.rows, [], "a person with no habits still gets a column");
});

test("doneCounts: a skipped row leaves both numbers (decision 109), and the label reads from them", () => {
  const rows = [
    { doneToday: true, skippedToday: false },
    { doneToday: false, skippedToday: false },
    { doneToday: false, skippedToday: true },
  ];
  assert.deepEqual(doneCounts(rows), { done: 1, total: 2 });
  assert.equal(doneCountLabel(rows), "1 of 2 done");
  assert.equal(doneCountLabel([]), "0 of 0 done");
  assert.equal(doneCountLabel([{ doneToday: false, skippedToday: true }]), "0 of 0 done");
});

test("buildFamilyPage: a skipped habit leaves both of a person's column numbers, the same as on Today", () => {
  const a = habit({ id: "a" });
  const b = habit({ id: "b" });
  const c = habit({ id: "c" });
  const page = buildFamilyPage(amy, [a, b, c], people, logs([["a", [log("ben", today)]], ["b", [log("ben", today, "skipped")]]]), today);
  const benColumn = page.columns[1];
  assert.equal(benColumn.doneCount, 1);
  assert.equal(benColumn.totalCount, 2);
  assert.equal(benColumn.rows.length, 3, "the skipped row still shows");
});

test("buildFamilyPage: a card's count includes the Together rows the person is on, and only those", () => {
  const together = habit({ id: "tog", sharing: "together", participants: [member("amy"), member("ben")] });
  const mine = habit({ id: "mine", participants: [member("amy"), member("ben"), member("cat")] });
  const page = buildFamilyPage(amy, [together, mine], people, logs([["tog", [log("amy", today)]]]), today);
  const [a, b, c] = page.columns;
  assert.deepEqual(a.togetherIds, ["tog"]);
  assert.deepEqual(c.togetherIds, []);
  assert.equal(a.rows.length, 1, "the Together row is in the strip, not the column's rows");
  assert.deepEqual([a.doneCount, a.totalCount], [1, 2], "the one Together check counts for everyone on it");
  assert.deepEqual([b.doneCount, b.totalCount], [1, 2]);
  assert.deepEqual([c.doneCount, c.totalCount], [0, 1], "Cat is not on the Together habit");
  const done = buildFamilyPage(amy, [together, mine], people, logs([["tog", [log("amy", today)]], ["mine", [log("amy", today)]]]), today);
  assert.equal(doneCountLabel(countedRows(done.columns[0], done.together)), "2 of 2 done");
  assert.deepEqual([done.columns[0].doneCount, done.columns[0].totalCount], [2, 2]);
});

test("buildFamilyPage: a skipped Together row leaves the card's numbers like any skipped row", () => {
  const together = habit({ id: "tog", sharing: "together", participants: [member("amy"), member("ben")] });
  const page = buildFamilyPage(amy, [together], people, logs([["tog", [log("amy", today, "skipped")]]]), today);
  assert.deepEqual([page.columns[0].doneCount, page.columns[0].totalCount], [0, 0]);
});

test("buildFamilyPage: canOpenStats follows canSeeHabitStats (a non-participant kid cannot, a parent and the tablet can)", () => {
  const h = habit({ id: "h", participants: [member("amy"), member("cat")] });
  const together = habit({ id: "tog", sharing: "together", participants: [member("amy"), member("cat")] });
  const opens = (viewer: HabitActor) => {
    const page = buildFamilyPage(viewer, [h, together], people, logs([]), today);
    return [page.columns[0].rows[0].canOpenStats, page.together[0].canOpenStats];
  };
  assert.deepEqual(opens(ben), [false, false]);
  assert.deepEqual(opens(amy), [true, true]);
  assert.deepEqual(opens(tablet), [true, true]);
  assert.deepEqual(opens({ userId: "cat", role: "kid" }), [true, true]);
});

test("buildFamilyPage: canLog is the policy per column (self, the tablet, a parent; not a sibling)", () => {
  const h = habit({ id: "h" });
  const rowFor = (viewer: HabitActor, col: number) => buildFamilyPage(viewer, [h], people, logs([]), today).columns[col].rows[0].canLog;
  assert.equal(rowFor(ben, 1), true);
  assert.equal(rowFor(ben, 0), false);
  assert.equal(rowFor(tablet, 0), true);
  assert.equal(rowFor(amy, 1), true);
});

test("buildFamilyPage: the family list decides the columns, so a deactivated person is not in one", () => {
  const h = habit({ id: "h", participants: [member("amy"), member("ben", 0, { deactivatedAt: old })] });
  const page = buildFamilyPage(amy, [h], people.filter((p) => p.id !== "ben"), logs([]), today);
  assert.deepEqual(page.columns.map((c) => c.id), ["amy", "cat"]);
  assert.equal(page.columns[0].rows[0].participants.length, 1);
});

test("buildFamilyPage: a streak shows on the row (always computed; the page hides it by the viewer's switch)", () => {
  const h = habit({ id: "h", participants: [{ ...member("amy"), currentStreak: 4, bestStreak: 4, streakAsOf: new Date(Date.UTC(2026, 10, 4)) } as never] });
  const page = buildFamilyPage(amy, [h], people, logs([]), today);
  assert.equal(page.columns[0].rows[0].streakLabel, "4 days");
});

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
