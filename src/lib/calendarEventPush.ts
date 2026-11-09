import "server-only";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/tokenCrypto";
import { refreshAccessToken } from "@/lib/google/oauth";
import {
  deleteGoogleEvent,
  getGoogleEvent,
  insertGoogleEvent,
  updateGoogleEvent,
} from "@/lib/google/calendarApi";
import { isCalendarPushConfigured } from "@/lib/linkedCalendarsRead";
import { toSyncDirection } from "@/lib/calendarSyncVocabulary";
import { removeAllCopies, syncEventCopies, type PlanCalendar, type PlanRow, type SyncDeps } from "@/lib/calendarSyncPlan";

// Binds calendarSyncPlan.ts to the real database and Google (mission 56). No
// auth here (the Server Actions check it first) and no logic of its own: the
// decisions and the push steps live in the plan file, where tests run them
// with fakes. Nothing in here logs, returns or stores a token, and every
// catch drops its error, since it could quote one.

async function getAccessToken(accountId: string): ReturnType<SyncDeps["getAccessToken"]> {
  try {
    const account = await db.linkedAccount.findUnique({
      where: { id: accountId },
      select: { encryptedRefreshToken: true },
    });
    if (!account) return { ok: false, reason: "network" };
    const refreshed = await refreshAccessToken(decryptSecret(account.encryptedRefreshToken));
    if (refreshed.ok) return { ok: true, accessToken: refreshed.accessToken };
    return { ok: false, reason: refreshed.reason === "revoked" ? "reconnect" : "network" };
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

async function loadCalendars(): Promise<PlanCalendar[]> {
  const calendars = await db.linkedCalendar.findMany({
    select: { id: true, googleCalendarId: true, accountId: true, direction: true, accessRole: true },
  });
  return calendars.map((calendar) => ({ ...calendar, direction: toSyncDirection(calendar.direction) }));
}

async function loadRows(eventId: string): Promise<PlanRow[]> {
  return db.calendarEventSync.findMany({
    where: { eventId },
    select: { linkedCalendarId: true, googleEventId: true, etag: true, status: true },
  });
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
        people: { select: { user: { select: { id: true, displayName: true } } } },
      },
    });
    if (!event) return { failed: 0 };
    const forNames = event.people
      .map((person) => person.user)
      .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id))
      .map((user) => user.displayName);
    const [rows, calendars] = await Promise.all([loadRows(event.id), loadCalendars()]);
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
 */
export async function removeEventCopies(eventId: string): Promise<{ left: number }> {
  try {
    const rows = await loadRows(eventId);
    if (rows.length === 0) return { left: 0 };
    if (!isCalendarPushConfigured()) return { left: rows.length };
    return await removeAllCopies(deps, { eventId, rows, calendars: await loadCalendars() });
  } catch {
    return { left: 1 };
  }
}
