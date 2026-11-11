// The pure rules behind "All of them" (mission 71, C2): dragging one day of a
// repeating Google event moves the whole series. `calendarSeriesMove.ts` runs
// the steps and asks these three questions; nothing here reaches a database
// or Google, so tests run them directly.
//
// The shift is wall-clock minutes, not milliseconds: a series set up in summer
// and dragged in winter must keep 7:30 meaning 7:30 on the clock. Every answer
// is the same whatever the process's TZ is (days and clocks are read in the
// zone passed in, never with process-local getters).

import { calendarDateInZone, calendarDaysBetween, minuteOfDayInZone, zoneOffsetMs } from "./householdDate";
import { planMove, type StoredTimes } from "./calendarMoveRules";
import type { GoogleTimesPatch } from "./google/types";

const MS_PER_MINUTE = 60 * 1000;

export type SeriesShiftPlan = { error: string } | { minutes: number };

/**
 * How many wall-clock minutes the drop moves the day's event by (7:00 to 7:30
 * is +30 on any day, including the two clock-change days), or the plain line
 * saying why it can't. The refusals for all-day, multi-day and out-of-range
 * drops are `planMove`'s own; a drop to another day is refused here, since a
 * whole series has no single "other day" to move to.
 */
export function planSeriesShift(stored: StoredTimes, newStart: Date, timeZone: string): SeriesShiftPlan {
  const move = planMove(stored, newStart, timeZone);
  if ("error" in move) return { error: move.error };
  const sameDay = calendarDaysBetween(calendarDateInZone(stored.startAt, timeZone), calendarDateInZone(newStart, timeZone)) === 0;
  if (!sameDay) return { error: "Only this one can move to another day." };
  return { minutes: minuteOfDayInZone(newStart, timeZone) - minuteOfDayInZone(stored.startAt, timeZone) };
}

/** Google's wall clock as if it were UTC: a text with an offset is read at that offset's instant, one without is taken as written. */
function wallMsOf(dateTime: string, timeZone: string): number | null {
  const hasOffset = /(Z|[+-]\d{2}:\d{2})$/.test(dateTime);
  const parsed = Date.parse(hasOffset ? dateTime : `${dateTime}Z`);
  if (Number.isNaN(parsed)) return null;
  return hasOffset ? parsed + zoneOffsetMs(new Date(parsed), timeZone) : parsed;
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

/** A wall-clock reading in `timeZone` as RFC 3339 text with its own offset, so it is never ambiguous. */
function dateTimeAt(wallMs: number, timeZone: string): string {
  // Same two-step fixed point as zoneMidnightInstant: guess, then re-read the offset at the guess.
  const first = wallMs - zoneOffsetMs(new Date(wallMs), timeZone);
  const instant = wallMs - zoneOffsetMs(new Date(first), timeZone);
  const offsetMin = Math.round((wallMs - instant) / MS_PER_MINUTE);
  const wall = new Date(wallMs);
  const sign = offsetMin < 0 ? "-" : "+";
  const abs = Math.abs(offsetMin);
  return (
    `${pad(wall.getUTCFullYear(), 4)}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}` +
    `T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}:${pad(wall.getUTCSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

type ParentTimes = { start?: { date?: string; dateTime?: string; timeZone?: string }; end?: { date?: string; dateTime?: string; timeZone?: string } };

export type ParentShift = { error: string } | { patch: GoogleTimesPatch };

/**
 * The parent's start and end moved by `minutes` of wall clock in the parent's
 * own time zone (the household's when Google sends none), keeping the
 * `timeZone` field. Only these two fields are ever sent back. An all-day
 * parent (or one with no readable time) is refused.
 */
export function shiftParentTimes(parent: ParentTimes, minutes: number, householdZone: string): ParentShift {
  const refusal = { error: "That event doesn't have a set time to move." };
  const startText = parent.start?.dateTime;
  const endText = parent.end?.dateTime;
  if (typeof startText !== "string" || typeof endText !== "string") return refusal;
  const startZone = parent.start?.timeZone || householdZone;
  const endZone = parent.end?.timeZone || startZone;
  const startWall = wallMsOf(startText, startZone);
  const endWall = wallMsOf(endText, endZone);
  if (startWall === null || endWall === null) return refusal;
  const delta = minutes * MS_PER_MINUTE;
  return {
    patch: {
      start: { dateTime: dateTimeAt(startWall + delta, startZone), timeZone: startZone },
      end: { dateTime: dateTimeAt(endWall + delta, endZone), timeZone: endZone },
    },
  };
}

export type SeriesRow = { eventId: string; googleEventId: string; linkedCalendarId: string; googleSeriesId: string | null };

/**
 * The Marshee rows of this series on this calendar that Google no longer
 * lists: stale copies left behind when Google gave the moved days new ids.
 * Rows of other series or other calendars are never returned, whatever the
 * list holds.
 */
export function planSeriesCleanup(
  rows: SeriesRow[],
  series: { linkedCalendarId: string; googleSeriesId: string },
  listedGoogleIds: Iterable<string>,
): { eventId: string; googleEventId: string }[] {
  const listed = new Set(listedGoogleIds);
  return rows
    .filter(
      (row) =>
        row.linkedCalendarId === series.linkedCalendarId &&
        row.googleSeriesId === series.googleSeriesId &&
        !listed.has(row.googleEventId),
    )
    .map(({ eventId, googleEventId }) => ({ eventId, googleEventId }));
}
