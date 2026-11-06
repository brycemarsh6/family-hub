// Pins hours.ts: the week's minutes, minutes left, the pace per day and the
// weeks-hit streak of an hours habit. Plain calendar dates, so the results are
// the same in every time zone. November 2026: the 1st is a Sunday.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "../householdDate";
import { countedDaysLeft, hoursStreakAfter, hoursStreaks, hoursWeek, paceMinutesPerDay, weekTotals } from "./hours";
import type { TimeEntry, Vacation } from "./types";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const entry = (day: CalendarDate, minutes: number): TimeEntry => ({ day, minutes, userId: "a" });
const H = 60;

const SUNDAY = d(2026, 11, 1);
const MONDAY = d(2026, 11, 2);
const SATURDAY = d(2026, 11, 7);

test("countedDaysLeft: a Sunday with monsat leaves Monday to Saturday, 6 days", () => {
  assert.equal(countedDaysLeft(SUNDAY, "monsat"), 6);
  assert.equal(countedDaysLeft(SUNDAY, "every"), 7);
});

test("countedDaysLeft: Saturday leaves 1 day, Monday leaves 6 (monsat) or 6 (every)", () => {
  assert.equal(countedDaysLeft(SATURDAY, "monsat"), 1);
  assert.equal(countedDaysLeft(SATURDAY, "every"), 1);
  assert.equal(countedDaysLeft(MONDAY, "monsat"), 6);
});

test("countedDaysLeft: vacation days today or later are not counted", () => {
  const away: Vacation[] = [{ start: d(2026, 11, 4), end: d(2026, 11, 5) }];
  assert.equal(countedDaysLeft(MONDAY, "monsat", away), 4);
});

test("paceMinutesPerDay: rounds up to the next 15 minutes; nothing left or no day left is null", () => {
  assert.equal(paceMinutesPerDay(4 * H, 3), 90);
  assert.equal(paceMinutesPerDay(4 * H, 4), 60);
  assert.equal(paceMinutesPerDay(1, 6), 15);
  assert.equal(paceMinutesPerDay(0, 3), null);
  assert.equal(paceMinutesPerDay(H, 0), null);
});

test("hoursWeek: 4 hours left over 3 days rounds the pace up to 1 h 30 min", () => {
  const week = hoursWeek({
    entries: [entry(d(2026, 11, 2), 6 * H)],
    targetMinutes: 10 * H,
    paceDays: "monsat",
    today: d(2026, 11, 4), // Wednesday: Wed, Thu, Fri, Sat = 4 days
    vacations: [{ start: d(2026, 11, 6), end: d(2026, 11, 6) }], // Friday off: 3 days
  });
  assert.equal(week.leftMinutes, 4 * H);
  assert.equal(week.perDayMinutes, 90); // 80 minutes rounded up to the next 15
  assert.equal(week.met, false);
  assert.equal(week.doneMinutes, 6 * H);
  assert.deepEqual(week.weekStart, SUNDAY);
});

test("hoursWeek: an exact split is not rounded further", () => {
  const week = hoursWeek({ entries: [], targetMinutes: 6 * H, paceDays: "monsat", today: SUNDAY, vacations: [] });
  assert.equal(week.perDayMinutes, 60);
  assert.equal(week.leftMinutes, 6 * H);
});

test("hoursWeek: met means no pace and nothing left; over the target never goes negative", () => {
  const met = hoursWeek({
    entries: [entry(MONDAY, 5 * H), entry(MONDAY, 30)],
    targetMinutes: 5 * H,
    paceDays: "monsat",
    today: d(2026, 11, 3),
    vacations: [],
  });
  assert.equal(met.met, true);
  assert.equal(met.leftMinutes, 0);
  assert.equal(met.perDayMinutes, null);
  assert.equal(met.doneMinutes, 5 * H + 30);
  assert.deepEqual(met.byDay, [0, 5 * H + 30, 0, 0, 0, 0, 0]);
});

test("hoursWeek: no counted day left gives no pace (a Sunday with everything left on vacation)", () => {
  const week = hoursWeek({
    entries: [],
    targetMinutes: 2 * H,
    paceDays: "monsat",
    today: SATURDAY,
    vacations: [{ start: SATURDAY, end: SATURDAY }],
  });
  assert.equal(week.perDayMinutes, null);
  assert.equal(week.met, false);
});

test("hoursWeek: an entry on last week's Saturday or next week's Sunday does not count", () => {
  const week = hoursWeek({
    entries: [entry(d(2026, 10, 31), 3 * H), entry(d(2026, 11, 8), 3 * H), entry(d(2026, 11, 3), 30)],
    targetMinutes: 5 * H,
    paceDays: "every",
    today: d(2026, 11, 4),
    vacations: [],
  });
  assert.equal(week.doneMinutes, 30);
});

const never: Vacation[] = [];

test("hoursStreaks: weeks in a row, broken by a missed week", () => {
  const entries = [
    entry(d(2026, 10, 5), 5 * H), // week of Oct 4 hit
    entry(d(2026, 10, 12), 5 * H), // Oct 11 hit
    entry(d(2026, 10, 19), 4 * H), // Oct 18 missed
    entry(d(2026, 10, 26), 5 * H), // Oct 25 hit
  ];
  const result = hoursStreaks({ entries, targetMinutes: 5 * H, startWeek: d(2026, 10, 4), today: d(2026, 11, 3), vacations: never });
  // Nov 1 week (this week) not yet met; the run through Oct 25 is 1.
  assert.deepEqual(result, { current: 1, best: 2, asOf: d(2026, 10, 31) });
});

test("hoursStreaks: this week counts once met and never breaks the run while unmet", () => {
  const entries = [entry(d(2026, 10, 27), 5 * H)];
  const unmet = hoursStreaks({ entries, targetMinutes: 5 * H, startWeek: d(2026, 10, 25), today: d(2026, 11, 3), vacations: never });
  assert.equal(unmet.current, 1);
  const met = hoursStreaks({
    entries: [...entries, entry(d(2026, 11, 2), 5 * H)],
    targetMinutes: 5 * H,
    startWeek: d(2026, 10, 25),
    today: d(2026, 11, 3),
    vacations: never,
  });
  assert.deepEqual([met.current, met.best], [2, 2]);
  assert.deepEqual(met.asOf, d(2026, 11, 3)); // met this week: the cache holds from today
  assert.deepEqual(unmet.asOf, d(2026, 10, 31)); // unmet: the Saturday before this week
});

test("hoursStreaks: a week wholly on vacation neither counts nor breaks", () => {
  const entries = [entry(d(2026, 10, 5), 5 * H), entry(d(2026, 10, 19), 5 * H)];
  const away: Vacation[] = [{ start: d(2026, 10, 12), end: d(2026, 10, 17) }]; // Mon to Sat of the Oct 11 week
  const result = hoursStreaks({ entries, targetMinutes: 5 * H, startWeek: d(2026, 10, 4), today: d(2026, 10, 27), vacations: away });
  assert.deepEqual([result.current, result.best], [2, 2]);
  // With "every", Monday to Saturday is not the whole week, so the miss breaks it.
  const every = hoursStreaks({
    entries,
    targetMinutes: 5 * H,
    startWeek: d(2026, 10, 4),
    today: d(2026, 10, 27),
    vacations: away,
    paceDays: "every",
  });
  assert.deepEqual([every.current, every.best], [1, 1]);
});

test("hoursStreaks: weeks before startWeek are ignored, even mid-week", () => {
  const entries = [entry(d(2026, 10, 6), 5 * H), entry(d(2026, 10, 13), 5 * H), entry(d(2026, 10, 20), 5 * H)];
  const result = hoursStreaks({ entries, targetMinutes: 5 * H, startWeek: d(2026, 10, 22), today: d(2026, 11, 3), vacations: never });
  // Only the Oct 18 week (it holds Oct 22) and later count; Oct 25 week has no entries and missed.
  assert.deepEqual([result.current, result.best], [0, 1]);
});

test("hoursStreaks: a switch mid-history ignores earlier weeks (the 'since' week)", () => {
  // Hit three weeks, then a long miss before the habit became hours habit again.
  const entries = [entry(d(2026, 9, 8), 5 * H), entry(d(2026, 9, 15), 5 * H), entry(d(2026, 11, 3), 5 * H)];
  const since = hoursStreaks({ entries, targetMinutes: 5 * H, startWeek: d(2026, 11, 3), today: d(2026, 11, 4), vacations: never });
  assert.deepEqual([since.current, since.best], [1, 1]);
  const all = hoursStreaks({ entries, targetMinutes: 5 * H, startWeek: d(2026, 9, 1), today: d(2026, 11, 4), vacations: never });
  assert.deepEqual([all.current, all.best], [1, 2]);
});

test("weekTotals: the last n weeks oldest first, this week last", () => {
  const entries = [entry(d(2026, 10, 20), 2 * H), entry(d(2026, 10, 27), 30), entry(d(2026, 11, 3), H), entry(d(2026, 11, 4), H)];
  assert.deepEqual(weekTotals(entries, d(2026, 11, 5), 3), [2 * H, 30, 2 * H]);
  assert.deepEqual(weekTotals(entries, d(2026, 11, 5), 1), [2 * H]);
  assert.deepEqual(weekTotals([], d(2026, 11, 5), 2), [0, 0]);
});

// hoursStreakAfter: Vision's two F1 scenarios (mission 37).
const WEEK = 10 * H;
const hit = (...days: CalendarDate[]) => days.map((day) => entry(day, WEEK));
const cacheOf = (entries: TimeEntry[], today: CalendarDate, vacations: Vacation[] = []) =>
  hoursStreaks({ entries, targetMinutes: WEEK, startWeek: d(2026, 10, 18), today, vacations, paceDays: "monsat" });

test("hoursStreakAfter: a missed week breaks the shown streak (Oct 18 and 25 met, 2 h on Nov 2, then nothing)", () => {
  const entries = [...hit(d(2026, 10, 19), d(2026, 10, 26)), entry(d(2026, 11, 2), 2 * H)];
  const cache = cacheOf(entries, d(2026, 11, 2));
  assert.deepEqual(cache, { current: 2, best: 2, asOf: d(2026, 10, 31) });
  for (const today of [d(2026, 11, 2), d(2026, 11, 7)]) assert.equal(hoursStreakAfter(cache, never, "monsat", today).current, 2); // this week is still open
  for (const today of [d(2026, 11, 9), d(2026, 11, 12), d(2026, 11, 15), d(2026, 11, 16)]) {
    assert.equal(hoursStreakAfter(cache, never, "monsat", today).current, hoursStreaks({ entries, targetMinutes: WEEK, startWeek: d(2026, 10, 18), today, vacations: never }).current);
    assert.equal(hoursStreakAfter(cache, never, "monsat", today).current, 0);
  }
});

test("hoursStreakAfter: a Monday to Saturday vacation week keeps the run (3, not 0)", () => {
  const away: Vacation[] = [{ start: d(2026, 11, 9), end: d(2026, 11, 14) }];
  const entries = hit(d(2026, 10, 19), d(2026, 10, 26), d(2026, 11, 2));
  const cache = cacheOf(entries, d(2026, 11, 2), away);
  assert.deepEqual(cache, { current: 3, best: 3, asOf: d(2026, 11, 2) });
  assert.equal(hoursStreakAfter(cache, away, "monsat", d(2026, 11, 15)).current, 3);
  assert.equal(hoursStreakAfter(cache, never, "monsat", d(2026, 11, 15)).current, 0); // no vacation: the week broke it
  assert.equal(hoursStreakAfter(cache, away, "every", d(2026, 11, 15)).current, 0); // "every" needs the Sunday covered too
});

test("hoursStreakAfter: a met week keeps counting through the week and the next one stays open", () => {
  const cache = cacheOf(hit(d(2026, 10, 19), d(2026, 10, 26), d(2026, 11, 2)), d(2026, 11, 2));
  assert.equal(hoursStreakAfter(cache, never, "monsat", d(2026, 11, 7)).current, 3);
  assert.equal(hoursStreakAfter(cache, never, "monsat", d(2026, 11, 8)).current, 3); // next week just began
  assert.equal(hoursStreakAfter(cache, never, "monsat", d(2026, 11, 15)).current, 0); // the Nov 8 week passed with nothing
});

test("hoursStreakAfter: never grows, keeps best, and passes a zero or uncached streak through", () => {
  const aged = hoursStreakAfter({ current: 2, best: 5, asOf: d(2026, 10, 31) }, never, "monsat", d(2026, 11, 20));
  assert.deepEqual([aged.current, aged.best], [0, 5]);
  assert.equal(hoursStreakAfter({ current: 0, best: 4, asOf: d(2026, 10, 31) }, never, "monsat", d(2026, 11, 20)).current, 0);
  assert.equal(hoursStreakAfter({ current: 3, best: 3, asOf: null }, never, "monsat", d(2026, 11, 20)).current, 3);
});
