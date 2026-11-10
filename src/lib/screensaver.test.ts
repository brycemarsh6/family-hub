import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BACK_TO_BLACK_STEPS,
  SCREENSAVER_DEFAULTS,
  SECONDS_PER_PHOTO_STEPS,
  START_AFTER_STEPS,
  formatScreensaverDate,
  formatSleepMinute,
  formatTakenLine,
  formatTakenOn,
  isSleepTime,
  parseScreensaverField,
  pickNextPhoto,
  screensaverState,
  stepLadder,
  stepSleepMinute,
  toScreensaverSettings,
  yearsAgoToday,
  type ScreensaverSettings,
} from "./screensaver";

const DENVER = "America/Denver";
const settings = (over: Partial<ScreensaverSettings> = {}): ScreensaverSettings => ({ ...SCREENSAVER_DEFAULTS, ...over });
const MIN = 60 * 1000;

test("stepLadder: ends, middle, and off-list values", () => {
  assert.equal(stepLadder(START_AFTER_STEPS, 1, -1), 1);
  assert.equal(stepLadder(START_AFTER_STEPS, 120, 1), 120);
  assert.equal(stepLadder(START_AFTER_STEPS, 30, 1), 45);
  assert.equal(stepLadder(START_AFTER_STEPS, 30, -1), 20);
  assert.equal(stepLadder(START_AFTER_STEPS, 1, 1), 2);
  assert.equal(stepLadder(SECONDS_PER_PHOTO_STEPS, 5, -1), 5);
  assert.equal(stepLadder(SECONDS_PER_PHOTO_STEPS, 60, 1), 60);
  assert.equal(stepLadder(SECONDS_PER_PHOTO_STEPS, 15, 1), 20);
  assert.equal(stepLadder(BACK_TO_BLACK_STEPS, 2, -1), 1);
  assert.equal(stepLadder(BACK_TO_BLACK_STEPS, 30, 1), 30);
  assert.equal(stepLadder(BACK_TO_BLACK_STEPS, 3, 1), 5);
  assert.equal(stepLadder(BACK_TO_BLACK_STEPS, 4, 1), 5);
  assert.equal(stepLadder(BACK_TO_BLACK_STEPS, 4, -1), 3);
});

test("stepSleepMinute wraps round midnight both ways", () => {
  assert.equal(stepSleepMinute(1320, 1), 1350);
  assert.equal(stepSleepMinute(1320, -1), 1290);
  assert.equal(stepSleepMinute(1410, 1), 0);
  assert.equal(stepSleepMinute(0, -1), 1410);
  assert.equal(stepSleepMinute(0, 1), 30);
});

test("stepSleepMinute skips the other end, up, down and across midnight", () => {
  assert.equal(stepSleepMinute(1320, 1, 1350), 1380);
  assert.equal(stepSleepMinute(1320, -1, 1290), 1260);
  assert.equal(stepSleepMinute(1410, 1, 0), 30);
  assert.equal(stepSleepMinute(30, -1, 0), 1410);
  assert.equal(stepSleepMinute(1320, 1, 600), 1350);
});

test("stepSleepMinute steps off an already-equal pair normally", () => {
  assert.equal(stepSleepMinute(1320, 1, 1320), 1350);
  assert.equal(stepSleepMinute(1320, -1, 1320), 1290);
  assert.equal(stepSleepMinute(0, -1, 0), 1410);
});

test("toScreensaverSettings: no row, a good row, junk repaired", () => {
  assert.deepEqual(toScreensaverSettings(null), SCREENSAVER_DEFAULTS);
  assert.deepEqual(toScreensaverSettings(undefined), SCREENSAVER_DEFAULTS);
  assert.deepEqual(toScreensaverSettings({ startAfterMinutes: 5, showClock: false, sleepStartMinute: 1350 }), settings({ startAfterMinutes: 5, showClock: false, sleepStartMinute: 1350 }));
  const junk = toScreensaverSettings({
    startAfterMinutes: 7,
    secondsPerPhoto: "15",
    showClock: "yes",
    showCaption: 1,
    sleepStartMinute: 1321,
    sleepEndMinute: -30,
    backToBlackMinutes: null,
  });
  assert.deepEqual(junk, SCREENSAVER_DEFAULTS);
  assert.deepEqual(toScreensaverSettings("nonsense" as never), SCREENSAVER_DEFAULTS);
});

test("parseScreensaverField accepts good values and refuses the rest", () => {
  assert.deepEqual(parseScreensaverField("startAfterMinutes", 45), { field: "startAfterMinutes", value: 45 });
  assert.deepEqual(parseScreensaverField("showClock", false), { field: "showClock", value: false });
  assert.deepEqual(parseScreensaverField("sleepEndMinute", 0), { field: "sleepEndMinute", value: 0 });
  assert.deepEqual(parseScreensaverField("sleepStartMinute", 1410), { field: "sleepStartMinute", value: 1410 });
  assert.equal(parseScreensaverField("updatedById", "x"), null);
  assert.equal(parseScreensaverField("id", "household"), null);
  assert.equal(parseScreensaverField("toString", 1), null);
  assert.equal(parseScreensaverField(42, 1), null);
  assert.equal(parseScreensaverField(undefined, 1), null);
  assert.equal(parseScreensaverField("showClock", "true"), null);
  assert.equal(parseScreensaverField("showClock", 1), null);
  assert.equal(parseScreensaverField("startAfterMinutes", "30"), null);
  assert.equal(parseScreensaverField("startAfterMinutes", 31), null);
  assert.equal(parseScreensaverField("startAfterMinutes", true), null);
  assert.equal(parseScreensaverField("secondsPerPhoto", 25), null);
  assert.equal(parseScreensaverField("backToBlackMinutes", 4), null);
  assert.equal(parseScreensaverField("sleepStartMinute", 1335), null);
  assert.equal(parseScreensaverField("sleepStartMinute", 1440), null);
  assert.equal(parseScreensaverField("sleepStartMinute", -30), null);
  assert.equal(parseScreensaverField("sleepStartMinute", 30.5), null);
  assert.equal(parseScreensaverField("sleepEndMinute", 45), null);
  assert.equal(parseScreensaverField("sleepEndMinute", NaN), null);
});

test("isSleepTime: across midnight, same-day window, start equals end, sleep off", () => {
  const overnight = settings(); // 10 PM to 6 AM
  assert.equal(isSleepTime(1319, overnight), false);
  assert.equal(isSleepTime(1320, overnight), true);
  assert.equal(isSleepTime(0, overnight), true);
  assert.equal(isSleepTime(359, overnight), true);
  assert.equal(isSleepTime(360, overnight), false);
  assert.equal(isSleepTime(720, overnight), false);
  const nap = settings({ sleepStartMinute: 780, sleepEndMinute: 900 }); // 1 PM to 3 PM
  assert.equal(isSleepTime(779, nap), false);
  assert.equal(isSleepTime(780, nap), true);
  assert.equal(isSleepTime(899, nap), true);
  assert.equal(isSleepTime(900, nap), false);
  assert.equal(isSleepTime(0, nap), false);
  const same = settings({ sleepStartMinute: 600, sleepEndMinute: 600 });
  assert.equal(isSleepTime(600, same), false);
  assert.equal(isSleepTime(0, same), false);
  assert.equal(isSleepTime(1380, settings({ sleepEnabled: false })), false);
});

// Nov 13 2026 is MST (UTC-7).
const mst = (h: number, m = 0, s = 0) => new Date(Date.UTC(2026, 10, 13, h + 7, m, s));
const stateAt = (now: Date, idleMin: number, over: Partial<ScreensaverSettings> = {}, hasPhotos = true) =>
  screensaverState({ now, lastTapAt: new Date(now.getTime() - idleMin * MIN), settings: settings(over), hasPhotos, timeZone: DENVER });

test("screensaverState: daytime branches", () => {
  const noon = mst(12);
  assert.equal(stateAt(noon, 0), "awake");
  assert.equal(stateAt(noon, 29.99), "awake");
  assert.equal(stateAt(noon, 30), "slideshow"); // exactly at the threshold
  assert.equal(stateAt(noon, 500), "slideshow");
  assert.equal(stateAt(noon, 500, {}, false), "awake"); // no photos (Q7)
  assert.equal(stateAt(noon, 1, { startAfterMinutes: 1 }), "slideshow");
});

test("screensaverState: sleep hours", () => {
  assert.equal(stateAt(mst(21, 59, 59), 600), "slideshow"); // 9:59 PM
  assert.equal(stateAt(mst(22, 0), 600), "sleep"); // 10:00 PM
  assert.equal(stateAt(mst(22, 0), 1), "awake");
  assert.equal(stateAt(mst(22, 0), 2), "sleep"); // exactly at the threshold
  assert.equal(stateAt(mst(3), 600, {}, false), "sleep"); // black even with no photos
  assert.equal(stateAt(mst(5, 59, 59), 600), "sleep"); // 5:59 AM
  assert.equal(stateAt(mst(6, 0), 600), "slideshow"); // 6:00 AM: black turns into the slideshow
  assert.equal(stateAt(mst(23), 600, { sleepEnabled: false }), "slideshow");
  // Back-to-black wait applies in sleep hours even when the day wait is longer.
  assert.equal(stateAt(mst(23), 5, { startAfterMinutes: 60, backToBlackMinutes: 5 }), "sleep");
});

test("screensaverState: Denver DST nights, chosen so a UTC mistake fails", () => {
  // 2026-03-08 spring forward: 02:00 MST becomes 03:00 MDT. 10 PM MST on Mar 7 is 05:00Z Mar 8 (MST is UTC-7).
  assert.equal(stateAt(new Date(Date.UTC(2026, 2, 8, 4, 59)), 600), "slideshow"); // 9:59 PM MST
  assert.equal(stateAt(new Date(Date.UTC(2026, 2, 8, 5, 0)), 600), "sleep"); // 10:00 PM MST
  // 6 AM on Mar 8 is MDT (UTC-6): 12:00Z. 11:59Z is 5:59 AM MDT.
  assert.equal(stateAt(new Date(Date.UTC(2026, 2, 8, 11, 59)), 600), "sleep");
  assert.equal(stateAt(new Date(Date.UTC(2026, 2, 8, 12, 0)), 600), "slideshow");
  // 2026-11-01 fall back: 10 PM Oct 31 is MDT, 04:00Z Nov 1. 6 AM Nov 1 is MST, 13:00Z.
  assert.equal(stateAt(new Date(Date.UTC(2026, 10, 1, 3, 59)), 600), "slideshow"); // 9:59 PM MDT
  assert.equal(stateAt(new Date(Date.UTC(2026, 10, 1, 4, 0)), 600), "sleep");
  assert.equal(stateAt(new Date(Date.UTC(2026, 10, 1, 12, 59)), 600), "sleep"); // 5:59 AM MST
  assert.equal(stateAt(new Date(Date.UTC(2026, 10, 1, 13, 0)), 600), "slideshow");
});

test("pickNextPhoto: no repeat within a round, new round after all shown", () => {
  const ids = ["a", "b", "c", "d", "e"];
  let seed = 7;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  let shown: string[] = [];
  let last: string | null = null;
  for (let round = 0; round < 20; round++) {
    const seen = new Set<string>();
    for (let i = 0; i < ids.length; i++) {
      const pick = pickNextPhoto(ids, shown, last, random);
      assert.ok(pick);
      assert.ok(!seen.has(pick.id), "repeated within a round");
      assert.notEqual(pick.id, last, "same photo twice in a row");
      seen.add(pick.id);
      shown = pick.shownIds;
      last = pick.id;
    }
    assert.equal(seen.size, ids.length);
  }
});

test("pickNextPhoto: edges", () => {
  assert.equal(pickNextPhoto([], [], null, () => 0), null);
  assert.deepEqual(pickNextPhoto(["a"], [], null, () => 0.5), { id: "a", shownIds: ["a"] });
  assert.deepEqual(pickNextPhoto(["a"], ["a"], "a", () => 0.5), { id: "a", shownIds: ["a"] }); // one photo repeats by necessity
  // Two photos always alternate.
  assert.equal(pickNextPhoto(["a", "b"], ["a", "b"], "b", () => 0.99)?.id, "a");
  assert.equal(pickNextPhoto(["a", "b"], ["a", "b"], "a", () => 0)?.id, "b");
  // random() near 1 stays in range.
  assert.equal(pickNextPhoto(["a", "b", "c"], [], null, () => 0.9999999)?.id, "c");
  // A deleted id is never picked and is dropped from the round.
  const afterDelete = pickNextPhoto(["a", "c"], ["b"], "b", () => 0);
  assert.deepEqual(afterDelete, { id: "a", shownIds: ["a"] });
  // A new id is picked within its round.
  const added = pickNextPhoto(["a", "b", "new"], ["a", "b"], "b", () => 0);
  assert.deepEqual(added, { id: "new", shownIds: ["a", "b", "new"] });
});

test("formatters", () => {
  assert.equal(formatSleepMinute(1320), "10:00 PM");
  assert.equal(formatSleepMinute(360), "6:00 AM");
  assert.equal(formatSleepMinute(0), "12:00 AM");
  assert.equal(formatSleepMinute(750), "12:30 PM");
  assert.equal(formatSleepMinute(1410), "11:30 PM");
  // 2026-11-09 is a Monday; 03:00Z is still Sunday Nov 8 in Denver.
  assert.equal(formatScreensaverDate(new Date(Date.UTC(2026, 10, 9, 3, 0)), DENVER), "Sunday, November 8");
  assert.equal(formatScreensaverDate(new Date(Date.UTC(2026, 10, 9, 15, 0)), DENVER), "Monday, November 9");
  assert.equal(formatTakenOn("2023-06-14"), "June 14, 2023");
  assert.equal(formatTakenOn("2024-02-29"), "February 29, 2024");
  assert.equal(formatTakenOn(null), null);
  assert.equal(formatTakenOn("2023-02-30"), null);
  assert.equal(formatTakenOn("June 14"), null);
  assert.equal(formatTakenOn(""), null);
});

test("yearsAgoToday: same month and day in an earlier year", () => {
  const today = { year: 2026, month: 11, day: 10 };
  assert.equal(yearsAgoToday("2025-11-10", today), 1);
  assert.equal(yearsAgoToday("2023-11-10", today), 3);
  assert.equal(yearsAgoToday("2026-11-10", today), null); // earlier today is not a memory
  assert.equal(yearsAgoToday("2027-11-10", today), null);
  assert.equal(yearsAgoToday("2025-11-09", today), null);
  assert.equal(yearsAgoToday("2025-10-10", today), null);
  assert.equal(yearsAgoToday(null, today), null);
  assert.equal(yearsAgoToday("not a date", today), null);
  assert.equal(yearsAgoToday("2023-02-30", today), null);
});

test("yearsAgoToday: a February 29 photo counts on February 28 only when the year has no leap day", () => {
  assert.equal(yearsAgoToday("2024-02-29", { year: 2026, month: 2, day: 28 }), 2);
  assert.equal(yearsAgoToday("2024-02-29", { year: 2028, month: 2, day: 28 }), null); // 2028 is a leap year
  assert.equal(yearsAgoToday("2024-02-29", { year: 2028, month: 2, day: 29 }), 4);
  assert.equal(yearsAgoToday("2024-02-29", { year: 2026, month: 3, day: 1 }), null);
  assert.equal(yearsAgoToday("2023-02-28", { year: 2026, month: 2, day: 28 }), 3);
});

test("formatTakenLine: the ago words on the day, the date otherwise", () => {
  const today = { year: 2026, month: 11, day: 10 };
  assert.deepEqual(formatTakenLine("2025-11-10", today), { text: "A year ago today", onThisDay: true });
  assert.deepEqual(formatTakenLine("2023-11-10", today), { text: "3 years ago today", onThisDay: true });
  assert.deepEqual(formatTakenLine("2023-06-14", today), { text: "June 14, 2023", onThisDay: false });
  assert.deepEqual(formatTakenLine("2026-11-10", today), { text: "November 10, 2026", onThisDay: false });
  assert.equal(formatTakenLine(null, today), null);
  assert.equal(formatTakenLine("bad", today), null);
});

test("pickNextPhoto: firstIds are picked before the rest, then the rest shuffle", () => {
  const ids = ["a", "b", "c", "d"];
  // random 0 would pick "a"; the first-ids rule narrows the pool to b and d.
  const one = pickNextPhoto(ids, [], null, () => 0, ["b", "d"]);
  assert.equal(one?.id, "b");
  const two = pickNextPhoto(ids, one!.shownIds, one!.id, () => 0, ["b", "d"]);
  assert.equal(two?.id, "d");
  const three = pickNextPhoto(ids, two!.shownIds, two!.id, () => 0, ["b", "d"]);
  assert.equal(three?.id, "a"); // both memories have shown: back to the normal pool
  assert.deepEqual(three?.shownIds, ["b", "d", "a"]);
  // An id in firstIds that is not in the usable list is ignored.
  assert.equal(pickNextPhoto(["a", "b"], [], null, () => 0, ["zzz"])?.id, "a");
  // Empty firstIds changes nothing.
  assert.deepEqual(pickNextPhoto(ids, [], null, () => 0, []), pickNextPhoto(ids, [], null, () => 0));
});

test("pickNextPhoto: a new round still avoids lastId, and memories lead it", () => {
  const ids = ["a", "b", "c"];
  // Round over; "b" is both the last shown and a memory, with "c" another memory.
  const next = pickNextPhoto(ids, ["a", "b", "c"], "b", () => 0, ["b", "c"]);
  assert.equal(next?.id, "c");
  assert.deepEqual(next?.shownIds, ["c"]);
  // Only memory is lastId: the round opens with another photo instead.
  assert.equal(pickNextPhoto(ids, ["a", "b", "c"], "b", () => 0, ["b"])?.id, "a");
  // A single photo repeats by necessity.
  assert.deepEqual(pickNextPhoto(["a"], ["a"], "a", () => 0, ["a"]), { id: "a", shownIds: ["a"] });
});
