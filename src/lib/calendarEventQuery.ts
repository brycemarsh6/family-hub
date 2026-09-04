// The CalendarEvent SELECT + mapper — pulled out of `(app)/calendar/page.tsx`
// (mission-15/C1) because that query is about to get a SECOND caller
// (`fetchCalendarEvents` in actions/calendar.ts, for the Schedule view's
// endless scroll), and duplicating a Prisma `select` is exactly the
// "quietly drifts" failure this repo already fixed once for people rows —
// see personInfo.ts. This module follows that file's shape exactly: a
// constant SELECT, the raw row type it produces, and a mapper that builds
// the public `CalendarEventView` field by field — never `{ ...row }` — so a
// later-widened select (say, adding something private to a person's own
// User row) can't ride along here by accident. `createdBy` is already an
// instance of that same discipline: it's narrowed to `{ displayName: true
// }`, never the full User row, for the exact reason personInfo.ts exists.
//
// Unlike personInfo.ts, this module carries `server-only`: personInfo.ts is
// pure (select + mapper only, no db import — every caller runs its own
// `db.user.findMany`/`findUnique`), but this module also OWNS the query
// itself (`getCalendarEventsInRange`), so it imports `db` directly and
// falls under STRUCTURE.md's rule that any other lib module touching the
// database must carry the guard.

import "server-only";
import { db } from "./db";
import type { CalendarEventView } from "./types";

/** The exact `select` every caller needs to build a CalendarEventView. */
export const CALENDAR_EVENT_SELECT = {
  id: true,
  title: true,
  notes: true,
  location: true,
  startAt: true,
  endAt: true,
  allDay: true,
  people: {
    select: {
      user: { select: { id: true, displayName: true, avatarColor: true } },
    },
  },
  // Narrow select, never the full row — see the module comment.
  createdBy: { select: { displayName: true } },
} as const;

/** The shape CALENDAR_EVENT_SELECT produces. */
export type CalendarEventRow = {
  id: string;
  title: string;
  notes: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  people: { user: { id: string; displayName: string; avatarColor: string } }[];
  createdBy: { displayName: string } | null;
};

/**
 * Builds the public shape field by field — never `{ ...row }` — so a
 * `CALENDAR_EVENT_SELECT` widened later (say, to add a person's email for
 * some future feature) can't leak through here unnoticed. Same discipline,
 * same reason, as personInfo.ts's `toPersonInfo`.
 */
export function toCalendarEventView(row: CalendarEventRow): CalendarEventView {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    location: row.location,
    startAt: row.startAt,
    endAt: row.endAt,
    allDay: row.allDay,
    people: row.people.map((person) => ({
      userId: person.user.id,
      displayName: person.user.displayName,
      avatarColor: person.user.avatarColor,
    })),
    // See CalendarEventView's own comment (types.ts): folded in here rather
    // than threaded alongside events as a separate id-keyed map, per
    // mission-9's K2/C2a finding.
    createdByName: row.createdBy?.displayName ?? null,
  };
}

/**
 * Every CalendarEvent overlapping `[windowStart, windowEnd)` — an event is
 * in range if it starts before the window ends AND ends after the window
 * starts, which is what also catches a multi-day event that began before
 * `windowStart` but still runs into it. Ordered by start time. This is the
 * exact query `(app)/calendar/page.tsx` used to run inline; both it and the
 * new `fetchCalendarEvents` action call this now, so the where-clause and
 * select can't drift between the two.
 */
export async function getCalendarEventsInRange(
  windowStart: Date,
  windowEnd: Date,
): Promise<CalendarEventView[]> {
  const rows = await db.calendarEvent.findMany({
    where: {
      startAt: { lt: windowEnd },
      endAt: { gt: windowStart },
    },
    orderBy: { startAt: "asc" },
    select: CALENDAR_EVENT_SELECT,
  });
  return rows.map(toCalendarEventView);
}
