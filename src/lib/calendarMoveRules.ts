// The pure rules behind dragging an event to a new time (mission 70, C2).
// `moveCalendarEvent` in actions/calendar.ts is the only caller: it guards,
// reads the row, asks `planMove`, and writes what comes back. Living here,
// outside the `"use server"` file, is what lets `npm test` reach them.
//
// The client sends only the new start, as text. The end is always the new
// start plus the STORED length, so a forged request cannot stretch an event.
//
// Every answer is the same whatever the process's TZ is: days are read in
// the household's time zone (passed in), never with process-local getters.

import { addCalendarDays, calendarDateInZone, calendarDaysBetween, zoneMidnightInstant } from "./householdDate";

/** A drag may land from 2000-01-01 up to 2100-01-01 (UTC), no further. */
export const MOVE_EARLIEST = new Date(Date.UTC(2000, 0, 1));
export const MOVE_LATEST = new Date(Date.UTC(2100, 0, 1));

// ISO 8601 with an explicit zone ("Z" or "+hh:mm"), so the server never
// guesses which clock a bare "2026-11-10T14:15" meant.
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

/** The requested start, or null for anything that is not a real ISO instant. */
export function parseMoveStart(text: unknown): Date | null {
  if (typeof text !== "string" || !ISO_WITH_ZONE.test(text)) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export type StoredTimes = { startAt: Date; endAt: Date; allDay: boolean };
export type MovePlan = { error: string } | { startAt: Date; endAt: Date };

/**
 * Whether a timed range swallows at least one whole calendar day in
 * `timeZone`. The same rule as `belongsInAllDayRow` (timelineLayout.ts),
 * which reads the device's own days; this one reads the household's, since
 * the server runs in UTC.
 */
export function coversWholeDay(range: { startAt: Date; endAt: Date }, timeZone: string): boolean {
  const startDay = calendarDateInZone(range.startAt, timeZone);
  const startsAtMidnight = zoneMidnightInstant(startDay, timeZone).getTime() === range.startAt.getTime();
  // The first day it could cover end to end: its own day if it starts at
  // midnight, otherwise the next one.
  const firstFullDay = startsAtMidnight ? startDay : addCalendarDays(startDay, 1);
  return calendarDaysBetween(firstFullDay, calendarDateInZone(range.endAt, timeZone)) >= 1;
}

/**
 * Where the event ends up, or the one plain line saying why it can't move.
 * A repeating event is not refused (decision 22): it moves that one row.
 */
export function planMove(stored: StoredTimes, newStart: Date, timeZone: string): MovePlan {
  if (stored.allDay) return { error: "All-day events can't be dragged." };
  if (coversWholeDay(stored, timeZone)) return { error: "Events that last more than a day can't be dragged." };

  // A plain duration between two stored instants, not a calendar date, so
  // millisecond arithmetic is right here.
  const lengthMs = stored.endAt.getTime() - stored.startAt.getTime();
  const endAt = new Date(newStart.getTime() + lengthMs);

  if (newStart.getTime() < MOVE_EARLIEST.getTime() || endAt.getTime() > MOVE_LATEST.getTime()) {
    return { error: "That date is too far away." };
  }
  // A short event dropped onto a 23-hour spring-forward day can end up
  // covering it whole; the timeline would then lose it to the all-day row.
  if (coversWholeDay({ startAt: newStart, endAt }, timeZone)) {
    return { error: "That move would cover a whole day." };
  }
  return { startAt: newStart, endAt };
}
