import "server-only";
import { db } from "@/lib/db";
import { refreshAccessToken } from "@/lib/google/oauth";
import { listGoogleEvents } from "@/lib/google/calendarApi";
import { isCalendarPushConfigured, loadPullCalendars, loadRefreshToken } from "@/lib/linkedCalendarsRead";
import { claimCalendarForPull, markAccountNeedsRelink, saveSyncToken } from "@/lib/linkedCalendarWrites";
import { pushEventCopies, removeEventCopies } from "@/lib/calendarEventPush";
import { runPull, type PullAccessResult, type PullRunDeps, type PullRunResult } from "@/lib/calendarPullRun";
import type { EventFields, KnownEvent, PullKnown } from "@/lib/calendarSyncPull";
import type { GoogleEventIn } from "@/lib/google/types";

// Binds calendarPullRun.ts to the real database and Google (mission 57). No
// auth here (the Server Action and the cron route check it first) and no
// decisions: the steps are in calendarPullRun.ts and the rules in
// calendarSyncPull.ts, where tests run them with fakes. This is the only
// writer of pulled events and of a calendar's syncToken and lastPulledAt
// (through linkedCalendarWrites.ts). Nothing here logs, returns or stores a
// token, and every catch drops its error, since it could quote one.

async function getAccessToken(accountId: string): Promise<PullAccessResult> {
  try {
    const refreshToken = await loadRefreshToken(accountId);
    if (refreshToken === null) return { ok: false, reason: "network" };
    const refreshed = await refreshAccessToken(refreshToken);
    if (refreshed.ok) return { ok: true, accessToken: refreshed.accessToken };
    return { ok: false, reason: refreshed.reason === "revoked" ? "revoked" : "network" };
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
): KnownEvent {
  return {
    eventId: event.id,
    hasRow: sync !== null,
    etag: sync?.etag ?? null,
    lastPushedAt: sync?.lastPushedAt ?? null,
    lastPulledAt: sync?.lastPulledAt ?? null,
    eventUpdatedAt: event.updatedAt,
    sourceLinkedCalendarId: event.sourceLinkedCalendarId,
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

/** What Marshee holds for this page: events with a row here, and Marshee-made copies with none yet. */
async function loadKnown(calendarId: string, events: GoogleEventIn[]): Promise<PullKnown> {
  const googleIds = events.map((event) => event.id);
  const rows = await db.calendarEventSync.findMany({
    where: { linkedCalendarId: calendarId, googleEventId: { in: googleIds } },
    select: { googleEventId: true, etag: true, lastPushedAt: true, lastPulledAt: true, event: { select: KNOWN_SELECT } },
  });
  const byGoogleId = new Map<string, KnownEvent>();
  for (const row of rows) byGoogleId.set(row.googleEventId, knownFrom(row.event, row));

  const marsheeIds = events
    .filter((event) => !byGoogleId.has(event.id))
    .map((event) => event.extendedProperties?.private?.marsheeEventId)
    .filter((id): id is string => typeof id === "string" && id !== "");
  const byMarsheeId = new Map<string, KnownEvent>();
  if (marsheeIds.length > 0) {
    const found = await db.calendarEvent.findMany({
      where: { id: { in: marsheeIds }, syncs: { none: { linkedCalendarId: calendarId } } },
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
  async pushBack(eventId) {
    await pushEventCopies({ eventId });
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
