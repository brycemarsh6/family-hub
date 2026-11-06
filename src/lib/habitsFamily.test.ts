// Pins habitsFamily.ts: the family page (who appears, in whose order, who may
// tick, vacation and chore rows) and the done counts. Also the Today page's
// nudge and confetti fields. The stats page builder is in habitsFamilyStatsPage.test.ts.
// "Today" is Thursday 2026-11-05; the checks are plain calendar days, so the
// results are the same in every time zone.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "./householdDate";
import type { HabitActor, HabitLogDay } from "./habits/types";
import {
  buildFamilyPage,
  countedRows,
  doneCountLabel,
  doneCounts,
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

test("doneCounts: undone vacation rows and rows skipped this week leave both numbers; a done vacation row counts in both (decisions 109, 115, 127)", () => {
  const rows = [
    { doneToday: true, skippedToday: false },
    { doneToday: false, skippedToday: false },
    { doneToday: false, skippedToday: false, onVacation: true },
    { doneToday: true, skippedToday: false, onVacation: true },
    { doneToday: false, skippedToday: false, skippedThisWeek: true },
  ];
  assert.deepEqual(doneCounts(rows), { done: 2, total: 3 });
  assert.equal(doneCountLabel(rows), "2 of 3 done");
  assert.equal(doneCountLabel(rows.slice(2)), "1 of 1 done");
  assert.equal(doneCountLabel([rows[2], rows[4]]), "0 of 0 done");
});

test("buildFamilyPage: a person on vacation has excused rows and their card counts nothing; the others are untouched", () => {
  const h = habit({ id: "h" });
  const away = new Map([["amy", [{ start: d(2026, 11, 3), end: d(2026, 11, 12) }]]]);
  const page = buildFamilyPage(amy, [h], people, logs([]), today, away);
  const [a, b] = page.columns;
  assert.equal(a.rows[0].onVacation, true);
  assert.equal(a.totalCount, 0);
  assert.equal(b.rows[0].onVacation, false);
  assert.equal(b.totalCount, 1);
});

test("buildFamilyPage: one person's vacation never marks the Together strip row; only their own count leaves it out", () => {
  const together = habit({ id: "t", sharing: "together", participants: [member("amy"), member("ben")] });
  const away = new Map([["amy", [{ start: d(2026, 11, 3), end: d(2026, 11, 12) }]]]);
  const page = buildFamilyPage(amy, [together], people, logs([]), today, away);
  assert.equal(page.together[0].onVacation, false, "the strip row is built for amy but is not on vacation");
  const [a, b] = page.columns;
  assert.equal(a.totalCount, 0, "amy is away: the undone Together row leaves her count");
  assert.equal(b.totalCount, 1, "ben's count keeps it");
  // Ben is the one who is away, amy is the row's subject: the strip row still carries no onVacation.
  const benAway = buildFamilyPage(amy, [together], people, logs([]), today, new Map([["ben", [{ start: d(2026, 11, 3), end: d(2026, 11, 12) }]]]));
  assert.equal(benAway.together[0].onVacation, false);
  assert.deepEqual(benAway.columns.map((c) => c.totalCount), [1, 0, 0]);
});

test("buildFamilyPage: a chore row carries no streak label (decision 120)", () => {
  const chore = habit({ id: "c", kind: "chore", participants: [{ ...member("amy"), currentStreak: 9, bestStreak: 9, streakAsOf: new Date("2026-11-04T00:00:00Z") }] });
  const page = buildFamilyPage(amy, [chore], people, logs([]), today);
  assert.equal(page.columns[0].rows[0].streak, 9);
  assert.equal(page.columns[0].rows[0].streakLabel, null);
});

test("buildFamilyPage: a private chore feeds the card's chore streak and Sunday flag but never makes a row (decision 78)", () => {
  const sunday = d(2026, 11, 8);
  const secret = habit({ id: "secret", kind: "chore", isPrivate: true, schedule: "weekdays", weekdays: "1000000", participants: [member("ben")] });
  const shared = habit({ id: "shared", kind: "chore", schedule: "weekdays", weekdays: "1000000", participants: [member("ben")] });
  const cache = { current: 3, best: 3, asOf: sunday };
  const doneLast = (id: string) => [id, [log("ben", d(2026, 11, 1))]] as [string, HabitLogDay[]];

  // Only the private chore was due and done last week: the flag still shows, with no row anywhere.
  const only = buildFamilyPage(amy, [secret], people, logs([doneLast("secret")]), sunday, new Map(), new Map([["ben", cache]]));
  const benOnly = only.columns.find((c) => c.id === "ben")!;
  assert.deepEqual([benOnly.choreStreak, benOnly.shoutOut], [3, true]);
  assert.equal(benOnly.rows.length, 0);
  assert.equal(only.together.length, 0);

  // The public chore was done but the private one was missed: the card must not claim a clean week.
  const mixed = buildFamilyPage(amy, [shared, secret], people, logs([doneLast("shared")]), sunday, new Map(), new Map([["ben", cache]]));
  const benMixed = mixed.columns.find((c) => c.id === "ben")!;
  assert.equal(benMixed.shoutOut, false);
  assert.deepEqual(benMixed.rows.map((row) => row.id), ["shared"]);
});
