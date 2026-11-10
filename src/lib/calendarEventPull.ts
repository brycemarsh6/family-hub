import "server-only";
import { db } from "@/lib/db";
import { refreshAccessToken } from "@/lib/google/oauth";
import { marsheeIdOf } from "@/lib/google/eventFromGoogle";
import { listGoogleEvents } from "@/lib/google/calendarApi";
import { isCalendarPushConfigured, loadPullCalendars, loadRefreshToken } from "@/lib/linkedCalendarsRead";
import { claimCalendarForPull, markAccountNeedsRelink, saveSyncToken } from "@/lib/linkedCalendarWrites";
import { pushEventCopies, removeEventCopies } from "@/lib/calendarEventPush";
import { tokenFailReason } from "@/lib/calendarSyncRules";
import { runPull, type PullAccessResult, type PullRunDeps, type PullRunResult } from "@/lib/calendarPullRun";
import type { EventFields, KnownEvent, PullKnown } from "@/lib/calendarSyncPull";
import type { GoogleEventIn } from "@/lib/google/types";

// Binds calendarPullRun.ts to the real database and Google (mission 60). No
// auth here (its callers check it first: Refresh and the on-open pull in
// actions/calendarPull.ts, the cron route, the unlink action and the Google
// callback route for removePulledEvents) and no
// decisions: the steps are in calendarPullRun.ts and the rules in
// calendarSyncPull.ts, where tests run them with fakes. This is the only
// writer of pulled events and of a calendar's syncToken, lastPulledAt and
// lastPulledOkAt (through linkedCalendarWrites.ts). Nothing here logs, returns or stores a
// token, and every catch drops its error, since it could quote one.

async function getAccessToken(accountId: string): Promise<PullAccessResult> {
  try {
    const refreshToken = await loadRefreshToken(accountId);
    if (refreshToken === null) return { ok: false, reason: "network" };
    const refreshed = await refreshAccessToken(refreshToken);
    if (refreshed.ok) return { ok: true, accessToken: refreshed.accessToken };
    return { ok: false, reason: tokenFailReason(refreshed.reason) };
  } catch {
    return { ok: false, reason: "network" };
  }
}

const KNOWN_SELECT = {
  id: true,
  updatedAt: true,
  sourceLinkedCalendarId: true,
  title: true,
  notes: true,
  location: true,
  startAt: true,
  endAt: true,
  allDay: true,
} as const;

type KnownEventRow = {
  id: string;
  updatedAt: Date;
  sourceLinkedCalendarId: string | null;
} & EventFields;

function knownFrom(
  event: KnownEventRow,
  sync: { etag: string | null; lastPushedAt: Date | null; lastPulledAt: Date | null } | null,
  hasOtherCopies = false,
): KnownEvent {
  return {
    eventId: event.id,
    hasRow: sync !== null,
    etag: sync?.etag ?? null,
    lastPushedAt: sync?.lastPushedAt ?? null,
    lastPulledAt: sync?.lastPulledAt ?? null,
    eventUpdatedAt: event.updatedAt,
    sourceLinkedCalendarId: event.sourceLinkedCalendarId,
    hasOtherCopies,
    current: {
      title: event.title,
      notes: event.notes,
      location: event.location,
      startAt: event.startAt,
      endAt: event.endAt,
      allDay: event.allDay,
    },
  };
}

/**
 * What Marshee holds for this page: events with a row here, and Marshee-made
 * copies with no row yet. One link per Google calendar is enforced when a
 * direction is set, so no other link's rows are read.
 */
async function loadKnown(calendar: { id: string }, events: GoogleEventIn[]): Promise<PullKnown> {
  const googleIds = events.map((event) => event.id);
  const rows = await db.calendarEventSync.findMany({
    where: { linkedCalendarId: calendar.id, googleEventId: { in: googleIds } },
    select: {
      googleEventId: true,
      etag: true,
      lastPushedAt: true,
      lastPulledAt: true,
      event: {
        select: { ...KNOWN_SELECT, syncs: { where: { linkedCalendarId: { not: calendar.id } }, select: { linkedCalendarId: true }, take: 1 } },
      },
    },
  });
  const byGoogleId = new Map<string, KnownEvent>();
  for (const row of rows) byGoogleId.set(row.googleEventId, knownFrom(row.event, row, row.event.syncs.length > 0));

  const marsheeIds = events
    .filter((event) => !byGoogleId.has(event.id))
    .map(marsheeIdOf)
    .filter((id): id is string => id !== undefined);
  const byMarsheeId = new Map<string, KnownEvent>();
  if (marsheeIds.length > 0) {
    const found = await db.calendarEvent.findMany({
      where: { id: { in: marsheeIds }, syncs: { none: { linkedCalendarId: calendar.id } } },
      select: KNOWN_SELECT,
    });
    for (const event of found) byMarsheeId.set(event.id, knownFrom(event, null));
  }
  return { byGoogleId, byMarsheeId };
}

const deps: PullRunDeps = {
  isConfigured: isCalendarPushConfigured,
  loadCalendars: loadPullCalendars,
  claim: claimCalendarForPull,
  getAccessToken,
  markNeedsRelink: markAccountNeedsRelink,
  list: listGoogleEvents,
  saveSyncToken,
  loadKnown,
  async writeInsert({ event, sync, googleEventId }) {
    const { personIds, ...fields } = event;
    await db.$transaction(async (tx) => {
      // updatedAt is passed on purpose: the pull's own write must not look like a Marshee edit.
      const created = await tx.calendarEvent.create({
        data: { ...fields, people: { create: personIds.map((userId) => ({ userId })) } },
        select: { id: true },
      });
      await tx.calendarEventSync.create({ data: { ...sync, googleEventId, eventId: created.id } });
    });
  },
  async writeUpdate(calendarId, update) {
    await db.$transaction(async (tx) => {
      if (update.fields) await tx.calendarEvent.update({ where: { id: update.eventId }, data: update.fields });
      if (update.createRow) {
        await tx.calendarEventSync.create({
          data: { eventId: update.eventId, linkedCalendarId: calendarId, googleEventId: update.googleEventId, ...update.row },
        });
      } else {
        await tx.calendarEventSync.update({
          where: { eventId_linkedCalendarId: { eventId: update.eventId, linkedCalendarId: calendarId } },
          data: update.row,
        });
      }
    });
  },
  async writeDelete({ eventId }) {
    // Its copies come off other calendars first; the delete then cascades the rows.
    await removeEventCopies(eventId);
    await db.calendarEvent.deleteMany({ where: { id: eventId } });
  },
  async pushBack(eventId, exceptLinkedCalendarId) {
    await pushEventCopies({ eventId, exceptLinkedCalendarId });
  },
  now: () => new Date(),
};

/**
 * Pull every due "Both ways" calendar. `force` is Refresh (a 30 second
 * lease); otherwise a calendar is pulled at most every 5 minutes. Never
 * throws; does nothing at all when Google or the key is missing.
 */
export function pullCalendars(opts: { force: boolean }): Promise<PullRunResult> {
  return runPull(deps, opts);
}

/**
 * Unlinking an account, or Google no longer listing a calendar, removes the
 * events pulled from those calendars (Bryce, 2026-11-09), so a relink imports
 * them once, not twice. Only events whose source is in the list: an event
 * Marshee made has no source and is never touched. Each event's copies on
 * other calendars come off first; its original on the source calendar stays,
 * since it still lives in Google. Returns how many could not be removed (the
 * caller stops, so nothing is left to come back after the unlink); never throws.
 * It counts only database failures: a copy Google would not delete follows PR 2's
 * delete-anyway rule (the event goes, the copy may stay in Google) and is not counted.
 */
export async function removePulledEvents(linkedCalendarIds: string[]): Promise<{ failed: number }> {
  if (linkedCalendarIds.length === 0) return { failed: 0 };
  let failed = 0;
  try {
    const events = await db.calendarEvent.findMany({
      where: { sourceLinkedCalendarId: { in: linkedCalendarIds } },
      select: { id: true, sourceLinkedCalendarId: true },
    });
    for (const event of events) {
      try {
        // Explicit: the source calendar's copy is Google's own and is not deleted.
        await removeEventCopies(event.id, { exceptLinkedCalendarId: event.sourceLinkedCalendarId });
        await db.calendarEvent.deleteMany({ where: { id: event.id, sourceLinkedCalendarId: { in: linkedCalendarIds } } });
      } catch {
        // Deliberately drops the error: it could quote a value from Google.
        failed += 1;
      }
    }
  } catch {
    failed += 1;
  }
  return { failed };
}
