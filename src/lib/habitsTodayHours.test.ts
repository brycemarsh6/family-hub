// Pins habitsToday.ts's hours rows (mission 37, decisions 187 to 199): the
// week on the row, never required, vacation, Manage's line and the weeks
// streak label. The rest of habitsToday.ts is pinned in habitsToday.test.ts,
// whose fixtures these repeat. "Today" is Thursday 2026-11-05 throughout.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "./householdDate";
import type { HabitActor, HabitLogDay } from "./habits/types";
import { allRequiredDoneToday, buildTodayPage, buildTodayRows, type TodayHabitInput } from "./habitsToday";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const today = d(2026, 11, 5);
const friday = d(2026, 11, 6);
const me: HabitActor = { userId: "me", role: "kid" };
const old = new Date("2026-01-01T12:00:00Z");

function member(userId: string, sortOrder = 0) {
  return { userId, sortOrder, joinedAt: old, user: { displayName: userId, avatarColor: "#123456", deactivatedAt: null } };
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
    participants: [member("me")],
    ...overrides,
  };
}

const noLogs = new Map<string, HabitLogDay[]>();
const logsFor = (id: string, logs: HabitLogDay[]) => new Map([[id, logs]]);

const hoursHabit = (id: string, over: Partial<TodayHabitInput> = {}) =>
  habit({ id, schedule: "weekly", times: 1, track: "hours", weeklyMinutes: 600, paceDays: "monsat", ...over });
const entryOn = (day: CalendarDate, minutes: number, userId = "me") => ({ day, minutes, userId });
const timeFor = (id: string, ...entries: ReturnType<typeof entryOn>[]) => new Map([[id, entries]]);

test("hours: the row shows with its week, open and never required, every day of the week", () => {
  const rows = buildTodayRows(me, [hoursHabit("calls")], noLogs, today, new Map(), new Map(), timeFor("calls", entryOn(d(2026, 11, 2), 390)));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].dueState, "open");
  assert.equal(rows[0].hours?.doneText, "6½ of 10 hours this week");
  assert.equal(rows[0].hours?.leftText, "3½ hours left · about 1¼ a day"); // Thu, Fri, Sat: 210 / 3 = 70, up to 75
  assert.equal(rows[0].doneToday, false);
  assert.equal(rows[0].progress, null);
  assert.equal(rows[0].carriedFrom, null);
  assert.equal(rows[0].plannedToday, false);
  assert.equal(buildTodayRows(me, [hoursHabit("calls")], noLogs, d(2026, 11, 8), undefined, undefined, undefined)[0].hours?.daysLeft, 6, "Sunday still shows it");
});

test("hours: a met week reads done and stays on Today, even with old weekly checks that would have dropped a plain weekly habit", () => {
  const old = logsFor("calls", [{ userId: "me", day: d(2026, 11, 2), status: "done" }]);
  const rows = buildTodayRows(me, [hoursHabit("calls")], old, today, new Map(), new Map(), timeFor("calls", entryOn(d(2026, 11, 2), 600)));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].doneToday, true);
  assert.equal(rows[0].hours?.doneText, "10 of 10 hours this week · done");
  assert.equal(rows[0].hours?.leftText, null);
  assert.deepEqual(rows[0].participants.map((p) => p.done), [true]);
});

test("hours: a checks habit has hours null; an hours habit with no usable goal acts as a plain weekly habit", () => {
  assert.equal(buildTodayRows(me, [habit({ id: "plain" })], noLogs, today)[0].hours, null);
  assert.equal(buildTodayRows(me, [hoursHabit("broken", { weeklyMinutes: null })], noLogs, today)[0].hours, null);
});

test("hours: a vacation day still shows the row, unexcused", () => {
  const vacations = new Map([["me", [{ start: d(2026, 11, 1), end: d(2026, 11, 7) }]]]);
  const [row] = buildTodayRows(me, [hoursHabit("calls")], noLogs, today, vacations);
  assert.equal(row.onVacation, false);
  assert.equal(row.dueState, "open");
  assert.equal(row.hours?.daysLeft, 0);
  assert.equal(row.hours?.leftText, "10 hours left");
});

test("hours: never required, so never in the confetti rule; the page's confetti ignores an unmet hours row", () => {
  const rows = buildTodayRows(me, [hoursHabit("calls")], noLogs, today);
  assert.equal(allRequiredDoneToday(rows), false);
  const page = buildTodayPage(me, [habit({ id: "daily" }), hoursHabit("calls")], logsFor("daily", [{ userId: "me", day: today, status: "done" }]), today);
  assert.equal(page.confetti, true, "the one required habit is done; the unmet hours habit does not hold it back");
});

test("hours: the page asks no day for it, and Manage says '6 hours a week'", () => {
  const page = buildTodayPage(me, [hoursHabit("calls", { weeklyMinutes: 360 })], noLogs, friday);
  assert.deepEqual(page.prompts, []);
  assert.equal(page.manage[0].hours?.text, "6 hours a week");
  assert.equal(page.manage[0].hours?.paceDays, "monsat");
  assert.equal(buildTodayPage(me, [habit({ id: "plain" })], noLogs, friday).manage[0].hours, null);
});

test("hours: the page streak label is in weeks", () => {
  const withStreak = hoursHabit("calls", { participants: [{ ...member("me"), currentStreak: 3, bestStreak: 3, streakAsOf: new Date(Date.UTC(2026, 10, 5)) }] });
  const [row] = buildTodayRows(me, [withStreak], noLogs, today);
  assert.equal(row.streakLabel, "3 weeks");
  assert.equal(row.streakUnit, "weeks");
});
