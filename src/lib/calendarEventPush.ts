import "server-only";
import { db } from "@/lib/db";
import { refreshAccessToken } from "@/lib/google/oauth";
import {
  deleteGoogleEvent,
  getGoogleEvent,
  insertGoogleEvent,
  updateGoogleEvent,
} from "@/lib/google/calendarApi";
import { isCalendarPushConfigured, loadPushCalendars, loadRefreshToken } from "@/lib/linkedCalendarsRead";
import { toSyncRowStatus } from "@/lib/calendarSyncVocabulary";
import { removeAllCopies, syncEventCopies, type SyncDeps } from "@/lib/calendarSyncPlan";
import { sortedPersonNames, tokenFailReason, type PlanRow } from "@/lib/calendarSyncRules";

// Binds calendarSyncPlan.ts to the real database and Google (mission 56). No
// auth here (the Server Actions check it first) and no logic of its own: the
// decisions and the push steps live in the plan file, where tests run them
// with fakes. Nothing in here logs, returns or stores a token, and every
// catch drops its error, since it could quote one.

async function getAccessToken(accountId: string): ReturnType<SyncDeps["getAccessToken"]> {
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

const deps: SyncDeps = {
  getAccessToken,
  insert: insertGoogleEvent,
  update: updateGoogleEvent,
  get: getGoogleEvent,
  remove: deleteGoogleEvent,
  async saveRow(key, patch) {
    await db.calendarEventSync.upsert({
      where: { eventId_linkedCalendarId: { eventId: key.eventId, linkedCalendarId: key.linkedCalendarId } },
      create: { ...key, ...patch },
      update: { googleEventId: key.googleEventId, ...patch },
    });
  },
  async deleteRow(eventId, linkedCalendarId) {
    await db.calendarEventSync.deleteMany({ where: { eventId, linkedCalendarId } });
  },
  now: () => new Date(),
};

async function loadRows(eventId: string): Promise<PlanRow[]> {
  const rows = await db.calendarEventSync.findMany({
    where: { eventId },
    select: { linkedCalendarId: true, googleEventId: true, etag: true, status: true },
  });
  return rows.map((row) => ({ ...row, status: toSyncRowStatus(row.status) }));
}

/**
 * Copy, update or remove the event's Google copies. Reads the event and its
 * people fresh from the database. Returns how many copies did not get
 * through; a Google problem never throws. Does nothing at all, with no
 * database write and no Google call, when Google or the key is missing.
 */
export async function pushEventCopies(input: {
  eventId: string;
  requestedIds?: string[];
  retryOnly?: boolean;
  /** Leave this calendar's copy alone, neither updated nor removed (a pull's push out, for its source). */
  exceptLinkedCalendarId?: string | null;
}): Promise<{ failed: number }> {
  if (!isCalendarPushConfigured()) return { failed: 0 };
  try {
    const event = await db.calendarEvent.findUnique({
      where: { id: input.eventId },
      select: {
        id: true,
        title: true,
        notes: true,
        location: true,
        startAt: true,
        endAt: true,
        allDay: true,
        showBusyOnGoogle: true,
        sourceLinkedCalendarId: true,
        people: { select: { user: { select: { id: true, displayName: true } } } },
      },
    });
    if (!event) return { failed: 0 };
    const forNames = sortedPersonNames(event.people.map((person) => person.user));
    const [rows, calendars] = await Promise.all([loadRows(event.id), loadPushCalendars()]);
    return await syncEventCopies(deps, {
      payloadInput: {
        marsheeEventId: event.id,
        title: event.title,
        notes: event.notes,
        location: event.location,
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        showBusyOnGoogle: event.showBusyOnGoogle,
        forNames,
      },
      rows,
      calendars,
      requestedIds: input.requestedIds,
      retryOnly: input.retryOnly,
      sourceLinkedCalendarId: event.sourceLinkedCalendarId,
      exceptLinkedCalendarId: input.exceptLinkedCalendarId,
    });
  } catch {
    // Dropped on purpose; the Marshee event already stands.
    return { failed: 1 };
  }
}

/**
 * Ask Google to remove every copy of the event, before the Marshee delete
 * cascades the rows away. `left` is how many copies may remain. With Google
 * or the key missing nothing is called, and `left` counts the rows.
 * `exceptLinkedCalendarId` keeps one calendar's copy: a pulled event's source.
 */
export async function removeEventCopies(
  eventId: string,
  opts: { exceptLinkedCalendarId?: string | null } = {},
): Promise<{ left: number }> {
  try {
    const rows = (await loadRows(eventId)).filter((row) => row.linkedCalendarId !== opts.exceptLinkedCalendarId);
    if (rows.length === 0) return { left: 0 };
    if (!isCalendarPushConfigured()) return { left: rows.length };
    return await removeAllCopies(deps, { eventId, rows, calendars: await loadPushCalendars(), exceptLinkedCalendarId: opts.exceptLinkedCalendarId });
  } catch {
    return { left: 1 };
  }
}
