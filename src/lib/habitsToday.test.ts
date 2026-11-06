// Pins habitsToday.ts: which habits reach the Today list, in whose order, and
// what each row says. "Today" is Thursday 2026-11-05 throughout; the checks
// are plain calendar days, so the results are the same in every time zone.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "./householdDate";
import type { HabitActor, HabitLogDay } from "./habits/types";
import {
  buildTodayPage,
  buildTodayRows,
  carrySince,
  habitStartDay,
  participantsAllowed,
  isTapDayAllowed,
  todayLogsFrom,
  visibleInViewerOrder,
  type TodayHabitInput,
} from "./habitsToday";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const today = d(2026, 11, 5);
const me: HabitActor = { userId: "me", role: "kid" };
const stranger: HabitActor = { userId: "stranger", role: "admin" };
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

const MONDAYS_ONLY = "0100000";
const noLogs = new Map<string, HabitLogDay[]>();
const logsFor = (id: string, logs: HabitLogDay[]) => new Map([[id, logs]]);

test("buildTodayRows: a habit not due today stays out", () => {
  const rows = buildTodayRows(me, [habit({ id: "mondays", schedule: "weekdays", weekdays: MONDAYS_ONLY })], noLogs, today);
  assert.deepEqual(rows, []);
});

test("buildTodayRows: a not-due habit appears when it is carried over", () => {
  const h = habit({ id: "mondays", schedule: "weekdays", weekdays: MONDAYS_ONLY, carryOver: true });
  const rows = buildTodayRows(me, [h], noLogs, today);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].carriedFrom, d(2026, 11, 2));
  assert.equal(rows[0].dueState, "none");
});

test("buildTodayRows: a not-due habit appears when already checked or skipped today", () => {
  const h = habit({ id: "mondays", schedule: "weekdays", weekdays: MONDAYS_ONLY });
  const checked = buildTodayRows(me, [h], logsFor("mondays", [{ day: today, status: "done", userId: "me" }]), today);
  assert.equal(checked.length, 1);
  assert.equal(checked[0].doneToday, true);
  const skipped = buildTodayRows(me, [h], logsFor("mondays", [{ day: today, status: "skipped", userId: "me" }]), today);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].skippedToday, true);
  assert.equal(skipped[0].doneToday, false);
});

test("buildTodayRows: someone else's check does not bring a not-due habit back", () => {
  const h = habit({ id: "mondays", schedule: "weekdays", weekdays: MONDAYS_ONLY, participants: [member("me"), member("sib")] });
  const rows = buildTodayRows(me, [h], logsFor("mondays", [{ day: today, status: "done", userId: "sib" }]), today);
  assert.deepEqual(rows, []);
});

test("buildTodayRows: decision 85, a daily habit made today counts only the days left in the week", () => {
  const made = new Date("2026-11-05T19:00:00Z"); // midday Thursday in Denver
  const rows = buildTodayRows(me, [habit({ id: "new", createdAt: made })], noLogs, today);
  assert.equal(rows[0].progress?.target, 3);
  const older = buildTodayRows(me, [habit({ id: "older" })], noLogs, today);
  assert.equal(older[0].progress?.target, 7);
});

test("buildTodayRows: the row carries the everyone flag", () => {
  const rows = buildTodayRows(me, [habit({ id: "kitchen", everyone: true }), habit({ id: "solo" })], noLogs, today);
  assert.deepEqual(rows.map((r) => r.everyone), [true, false]);
});

test("visibleInViewerOrder: a private habit is hidden from someone who is not on it", () => {
  const secret = habit({ id: "secret", isPrivate: true, participants: [member("me")] });
  assert.deepEqual(visibleInViewerOrder(stranger, [secret]).map((h) => h.id), []);
  assert.deepEqual(visibleInViewerOrder(me, [secret]).map((h) => h.id), ["secret"]);
});

test("visibleInViewerOrder: a shared habit the viewer is not on is left out", () => {
  const theirs = habit({ id: "theirs", participants: [member("sib")] });
  assert.deepEqual(visibleInViewerOrder(me, [theirs]), []);
});

test("visibleInViewerOrder: the viewer's own sort order wins, then the oldest habit", () => {
  const a = habit({ id: "a", participants: [member("me", 2), member("sib", 0)] });
  const b = habit({ id: "b", participants: [member("me", 0), member("sib", 5)] });
  const c = habit({ id: "c", participants: [member("me", 0)], createdAt: new Date("2025-06-01T12:00:00Z") });
  assert.deepEqual(visibleInViewerOrder(me, [a, b, c]).map((h) => h.id), ["c", "b", "a"]);
});

test("buildTodayPage: rows follow the viewer's order and archived habits go to their own list, newest first", () => {
  const first = habit({ id: "first", participants: [member("me", 1)] });
  const second = habit({ id: "second", participants: [member("me", 0)] });
  const gone1 = habit({ id: "gone1", archivedAt: new Date("2026-10-01T12:00:00Z") });
  const gone2 = habit({ id: "gone2", archivedAt: new Date("2026-10-20T12:00:00Z") });
  const page = buildTodayPage(me, [first, second, gone1, gone2], noLogs, today);
  assert.deepEqual(page.rows.map((r) => r.id), ["second", "first"]);
  assert.deepEqual(page.manage.map((m) => m.id), ["second", "first"]);
  assert.deepEqual(page.archived.map((m) => m.id), ["gone2", "gone1"]);
  assert.equal(page.archived[0].archived, true);
});

test("todayLogsFrom: fourteen days back or the 1st of the month, whichever is earlier", () => {
  assert.deepEqual(todayLogsFrom(d(2026, 11, 5)), d(2026, 10, 22));
  assert.deepEqual(todayLogsFrom(d(2026, 11, 20)), d(2026, 11, 1));
});

test("isTapDayAllowed: today and the last week are fine, the future is not", () => {
  assert.equal(isTapDayAllowed(today, today, null), true);
  assert.equal(isTapDayAllowed(d(2026, 10, 29), today, null), true); // 7 days back
  assert.equal(isTapDayAllowed(d(2026, 11, 6), today, null), false);
});

test("isTapDayAllowed: a day 8 to 14 back is allowed only when it is the carried day", () => {
  const carried = d(2026, 10, 25); // 11 days back
  assert.equal(isTapDayAllowed(carried, today, carried), true);
  assert.equal(isTapDayAllowed(carried, today, null), false);
  assert.equal(isTapDayAllowed(carried, today, d(2026, 10, 26)), false);
  assert.equal(isTapDayAllowed(d(2026, 10, 22), today, d(2026, 10, 22)), true); // 14 days back
});

test("isTapDayAllowed: nothing older than the 14-day lookback, even if carried", () => {
  const tooOld = d(2026, 10, 21); // 15 days back
  assert.equal(isTapDayAllowed(tooOld, today, tooOld), false);
});

test("habitStartDay: the household (Denver) day a habit was made, not the UTC day", () => {
  assert.deepEqual(habitStartDay(new Date("2026-11-05T15:00:00Z")), d(2026, 11, 5)); // 8:00 in Denver
  assert.deepEqual(habitStartDay(new Date("2026-11-06T04:00:00Z")), d(2026, 11, 5)); // 9pm in Denver, already the 6th in UTC
});

test("carrySince: the later of the day the habit was made and the day the person joined", () => {
  const start = d(2026, 11, 2);
  assert.deepEqual(carrySince(new Date("2026-11-04T15:00:00Z"), start), d(2026, 11, 4)); // joined later
  assert.deepEqual(carrySince(new Date("2026-10-30T15:00:00Z"), start), start); // joined before it was made
  assert.deepEqual(carrySince(new Date("2026-11-02T15:00:00Z"), start), start); // same day
  assert.deepEqual(carrySince(undefined, start), start);
  assert.deepEqual(carrySince(null, start), start);
});

test("buildTodayRows: the people on a row come in the same order for every viewer", () => {
  const later = new Date("2026-02-01T12:00:00Z");
  const people = [
    { ...member("zed"), joinedAt: old },
    { ...member("amy"), joinedAt: later },
    { ...member("bob"), joinedAt: old },
    member("me"),
  ];
  const shared = habit({ id: "shared", sharing: "together", participants: people });
  const reversed = habit({ id: "shared", sharing: "together", participants: [...people].reverse() });
  const order = (h: TodayHabitInput) => buildTodayRows(me, [h], noLogs, today)[0].participants.map((p) => p.userId);
  assert.deepEqual(order(shared), ["bob", "me", "zed", "amy"]);
  assert.deepEqual(order(reversed), order(shared));
});

test("participantsAllowed: household people pass, a stranger does not", () => {
  assert.equal(participantsAllowed(["a", "b"], ["a", "b", "c"]), true);
  assert.equal(participantsAllowed(["a", "x"], ["a", "b", "c"]), false);
});

test("participantsAllowed: someone already on the habit passes even if no longer in the household", () => {
  assert.equal(participantsAllowed(["a", "gone"], ["a", "b"], ["gone"]), true);
  assert.equal(participantsAllowed(["a", "gone"], ["a", "b"], []), false);
});

test("participantsAllowed: an empty pick is never allowed", () => {
  assert.equal(participantsAllowed([], ["a"], ["a"]), false);
});
