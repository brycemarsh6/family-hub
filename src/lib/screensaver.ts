// The wall tablet's screensaver rules, pure on purpose (imports only the date
// helpers and constants): the settings and their allowed values, what state
// the screen is in, the no-repeat shuffle (with "on this day" photos first),
// the date lines, and the words. Tested in
// screensaver.test.ts. The row is read in screensaverRead.ts and written by
// actions/screensaver.ts.

import { HOUSEHOLD_TIME_ZONE } from "./constants";
import {
  calendarDateInZone,
  dayOfWeek,
  formatHouseholdClock,
  minuteOfDayInZone,
  parseDateParam,
  type CalendarDate,
} from "./householdDate";
import { FULL_DAY_NAMES, FULL_MONTH_NAMES } from "./mealPlanDates";

export type ScreensaverSettings = {
  startAfterMinutes: number;
  secondsPerPhoto: number;
  showClock: boolean;
  showCaption: boolean;
  showTakenOn: boolean;
  sleepEnabled: boolean;
  /** Minutes after midnight on the Denver wall clock. 1320 is 10 PM. */
  sleepStartMinute: number;
  sleepEndMinute: number;
  backToBlackMinutes: number;
};

export type ScreensaverField = keyof ScreensaverSettings;
export type ScreensaverState = "awake" | "slideshow" | "sleep";

export const SCREENSAVER_DEFAULTS: ScreensaverSettings = {
  startAfterMinutes: 30,
  secondsPerPhoto: 15,
  showClock: true,
  showCaption: true,
  showTakenOn: true,
  sleepEnabled: true,
  sleepStartMinute: 1320,
  sleepEndMinute: 360,
  backToBlackMinutes: 2,
};

export const START_AFTER_STEPS = [1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120] as const;
export const SECONDS_PER_PHOTO_STEPS = [5, 10, 15, 20, 30, 45, 60] as const;
export const BACK_TO_BLACK_STEPS = [1, 2, 3, 5, 10, 15, 30] as const;
export const SLEEP_MINUTE_STEP = 30;

const MINUTES_PER_DAY = 24 * 60;
const MS_PER_MINUTE = 60 * 1000;

const LADDERS = {
  startAfterMinutes: START_AFTER_STEPS,
  secondsPerPhoto: SECONDS_PER_PHOTO_STEPS,
  backToBlackMinutes: BACK_TO_BLACK_STEPS,
} as const;
const BOOLEAN_FIELDS = ["showClock", "showCaption", "showTakenOn", "sleepEnabled"] as const;
const SLEEP_FIELDS = ["sleepStartMinute", "sleepEndMinute"] as const;

/** One step along a fixed list. Stops at the ends. A value off the list moves to the nearest step in that direction. */
export function stepLadder(steps: readonly number[], value: number, dir: 1 | -1): number {
  if (dir === 1) return steps.find((s) => s > value) ?? steps[steps.length - 1];
  return [...steps].reverse().find((s) => s < value) ?? steps[0];
}

/**
 * One 30-minute step round the clock; wraps past midnight both ways. A step
 * that would land on `avoid` (the other end of the sleep window) goes one
 * further, so the two ends are never equal. Starting on `avoid` just steps off.
 */
export function stepSleepMinute(minute: number, dir: 1 | -1, avoid?: number): number {
  const step = (m: number) => (((m + dir * SLEEP_MINUTE_STEP) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const next = step(minute);
  return next === avoid ? step(next) : next;
}

function isSleepMinute(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1410 && value % SLEEP_MINUTE_STEP === 0;
}

function isOnLadder(field: keyof typeof LADDERS, value: unknown): value is number {
  return typeof value === "number" && (LADDERS[field] as readonly number[]).includes(value);
}

/** A saved row (or none) as clean settings. Anything off its list becomes the default. Never throws. */
export function toScreensaverSettings(row: Partial<Record<ScreensaverField, unknown>> | null | undefined): ScreensaverSettings {
  const clean: ScreensaverSettings = { ...SCREENSAVER_DEFAULTS };
  if (!row || typeof row !== "object") return clean;
  for (const field of Object.keys(LADDERS) as (keyof typeof LADDERS)[]) {
    const value = row[field];
    if (isOnLadder(field, value)) clean[field] = value;
  }
  for (const field of BOOLEAN_FIELDS) {
    const value = row[field];
    if (typeof value === "boolean") clean[field] = value;
  }
  for (const field of SLEEP_FIELDS) {
    const value = row[field];
    if (isSleepMinute(value)) clean[field] = value;
  }
  return clean;
}

/** The save action's validator: the clean `{ field, value }`, or null for anything not allowed. */
export function parseScreensaverField(
  field: unknown,
  value: unknown,
): { field: ScreensaverField; value: number | boolean } | null {
  if (typeof field !== "string") return null;
  if ((BOOLEAN_FIELDS as readonly string[]).includes(field)) {
    return typeof value === "boolean" ? { field: field as ScreensaverField, value } : null;
  }
  if ((SLEEP_FIELDS as readonly string[]).includes(field)) {
    return isSleepMinute(value) ? { field: field as ScreensaverField, value } : null;
  }
  if (Object.prototype.hasOwnProperty.call(LADDERS, field)) {
    return isOnLadder(field as keyof typeof LADDERS, value) ? { field: field as ScreensaverField, value } : null;
  }
  return null;
}

/** Is `minuteOfDay` inside the sleep hours? Wraps midnight; start equal to end, or sleep off, means never. */
export function isSleepTime(minuteOfDay: number, settings: ScreensaverSettings): boolean {
  if (!settings.sleepEnabled) return false;
  const { sleepStartMinute: start, sleepEndMinute: end } = settings;
  if (start === end) return false;
  if (start < end) return minuteOfDay >= start && minuteOfDay < end;
  return minuteOfDay >= start || minuteOfDay < end;
}

/**
 * What the screen should be. In sleep hours: black once idle for
 * backToBlackMinutes, else awake. Outside them: the slideshow once idle for
 * startAfterMinutes and there is at least one photo, else awake.
 */
export function screensaverState(args: {
  now: Date;
  lastTapAt: Date;
  settings: ScreensaverSettings;
  hasPhotos: boolean;
  timeZone: string;
}): ScreensaverState {
  const { now, lastTapAt, settings, hasPhotos, timeZone } = args;
  const idleMs = now.getTime() - lastTapAt.getTime();
  if (isSleepTime(minuteOfDayInZone(now, timeZone), settings)) {
    return idleMs >= settings.backToBlackMinutes * MS_PER_MINUTE ? "sleep" : "awake";
  }
  return hasPhotos && idleMs >= settings.startAfterMinutes * MS_PER_MINUTE ? "slideshow" : "awake";
}

/**
 * The next photo of a shuffled slideshow: random among photos not yet shown
 * this round. When every photo has shown, a new round starts, never opening
 * with `lastId` when two or more photos exist. `shownIds` for the next call
 * comes back; ids no longer in `currentIds` are dropped. Null when there are
 * no photos. `random` returns [0, 1) and is passed in so tests are fixed.
 * `firstIds` (the "on this day" photos) are picked before any other while one
 * is still unshown this round.
 */
export function pickNextPhoto(
  currentIds: readonly string[],
  shownIds: readonly string[],
  lastId: string | null,
  random: () => number,
  firstIds: readonly string[] = [],
): { id: string; shownIds: string[] } | null {
  if (currentIds.length === 0) return null;
  const current = new Set(currentIds);
  const shown = shownIds.filter((id) => current.has(id));
  let pool = currentIds.filter((id) => !shown.includes(id));
  let round = shown;
  if (pool.length === 0) {
    round = [];
    pool = currentIds.length >= 2 ? currentIds.filter((id) => id !== lastId) : [...currentIds];
  }
  const first = pool.filter((id) => firstIds.includes(id));
  if (first.length > 0) pool = first;
  const id = pool[Math.min(Math.floor(random() * pool.length), pool.length - 1)];
  return { id, shownIds: [...round, id] };
}

/** "10:00 PM" for a sleep time (minutes after midnight). */
export function formatSleepMinute(minute: number): string {
  return formatHouseholdClock(new Date(Date.UTC(2026, 0, 1, 0, minute)), "UTC", { dropZeroMinutes: false });
}

/** "Sunday, November 9": the date line under the clock. */
export function formatScreensaverDate(now: Date, timeZone: string = HOUSEHOLD_TIME_ZONE): string {
  const date = calendarDateInZone(now, timeZone);
  return `${FULL_DAY_NAMES[dayOfWeek(date)]}, ${FULL_MONTH_NAMES[date.month - 1]} ${date.day}`;
}

/** "June 14, 2023" from a stored YYYY-MM-DD (no timezone); null for null or bad text. */
export function formatTakenOn(takenOn: string | null): string | null {
  if (takenOn === null) return null;
  const date = parseDateParam(takenOn);
  if (!date) return null;
  return `${FULL_MONTH_NAMES[date.month - 1]} ${date.day}, ${date.year}`;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Whole years since the photo when it was taken on today's month and day in an
 * earlier year, else null. A February 29 photo counts on February 28 in a year
 * with no leap day. Null or bad text gives null.
 */
export function yearsAgoToday(takenOn: string | null, today: CalendarDate): number | null {
  if (takenOn === null) return null;
  const date = parseDateParam(takenOn);
  if (!date || date.year >= today.year) return null;
  const sameDay = date.month === today.month && date.day === today.day;
  const leapDayOnFeb28 =
    date.month === 2 && date.day === 29 && today.month === 2 && today.day === 28 && !isLeapYear(today.year);
  return sameDay || leapDayOnFeb28 ? today.year - date.year : null;
}

/** The slide's date line: the "ago" words on today's anniversary, else the taken date; null when there is none. */
export function formatTakenLine(
  takenOn: string | null,
  today: CalendarDate,
): { text: string; onThisDay: boolean } | null {
  const years = yearsAgoToday(takenOn, today);
  if (years !== null) {
    return { text: years === 1 ? SCREENSAVER_WORDS.yearAgoToday : SCREENSAVER_WORDS.yearsAgoToday(years), onThisDay: true };
  }
  const text = formatTakenOn(takenOn);
  return text === null ? null : { text, onThisDay: false };
}

/** The Wall tablet page's words, in one place. */
export const SCREENSAVER_WORDS = {
  title: "Wall tablet",
  sub: "These change the kitchen tablet. They save as you tap.",
  slideshowSection: "Slideshow",
  startAfter: "Start after",
  eachPhoto: "Each photo",
  photosRow: "Slideshow photos",
  overlaySection: "On the photo",
  showClock: "Clock and date",
  showCaption: "Caption",
  showTakenOn: "When it was taken",
  sleepSection: "Sleep",
  sleepEnabled: "Go black at night",
  sleepFrom: "Black from",
  sleepUntil: "Until",
  backToBlack: "Back to black after",
  backToBlackHelp:
    "When someone taps the tablet at night, how long with no taps before it goes black again.",
  wakeLabel: "Wake Marshee",
  minUnit: "min",
  secUnit: "sec",
  saveFailed: "That didn't save. Check your connection and try again.",
  yearAgoToday: "A year ago today",
  yearsAgoToday: (years: number) => `${years} years ago today`,
} as const;
