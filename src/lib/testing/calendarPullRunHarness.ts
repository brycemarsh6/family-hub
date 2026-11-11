import type { PullAccessResult, PullCalendarRow, PullRunDeps } from "../calendarPullRun";
import type { PullKnown } from "../calendarSyncPull";
import type { GoogleEventIn, ListEventsMode, ListEventsResult } from "../google/types";

// The fake pull steps shared by calendarPullRun.test.ts and
// calendarPullRunWrites.test.ts (not itself a test file). Nothing here
// reaches the network or a database.

export const NOW = new Date("2026-11-09T18:00:00Z");
export const CAL: PullCalendarRow = { id: "c1", googleCalendarId: "g-cal", accountId: "a1", linkerId: "u1", syncToken: null, createdAt: new Date("2026-11-01T00:00:00Z") };
export const EMPTY_KNOWN: PullKnown = { byGoogleId: new Map(), byMarsheeId: new Map() };

export function gEvent(over: Partial<GoogleEventIn> = {}): GoogleEventIn {
  return {
    id: "g1",
    status: "confirmed",
    etag: '"e1"',
    updated: "2026-11-09T17:00:00Z",
    summary: "Dentist",
    start: { dateTime: "2026-11-12T12:00:00-07:00" },
    end: { dateTime: "2026-11-12T13:00:00-07:00" },
    ...over,
  };
}

export type Fake = { deps: PullRunDeps; calls: string[]; listModes: ListEventsMode[] };

export function fake(
  over: Partial<PullRunDeps> & { calendars?: PullCalendarRow[]; lists?: ListEventsResult[]; claimResult?: boolean } = {},
): Fake {
  const calls: string[] = [];
  const listModes: ListEventsMode[] = [];
  const lists = [...(over.lists ?? [{ ok: true, events: [], nextSyncToken: "tok-new" } as ListEventsResult])];
  const deps: PullRunDeps = {
    isConfigured: () => true,
    loadCalendars: async () => {
      calls.push("loadCalendars");
      return over.calendars ?? [CAL];
    },
    claim: async (id, staleBefore) => {
      calls.push(`claim:${id}:${NOW.getTime() - staleBefore.getTime()}`);
      return over.claimResult ?? true;
    },
    getAccessToken: async (accountId): Promise<PullAccessResult> => {
      calls.push(`token:${accountId}`);
      return { ok: true, accessToken: "access" };
    },
    markNeedsRelink: async (id) => void calls.push(`relink:${id}`),
    list: async (_t, _g, mode) => {
      calls.push("list");
      listModes.push(mode);
      return lists.shift() ?? { ok: false, reason: "network" };
    },
    saveSyncToken: async (id, token) => void calls.push(`saveToken:${id}:${token}`),
    markPulledOk: async (id) => void calls.push(`markOk:${id}`),
    loadKnown: async () => EMPTY_KNOWN,
    writeInsert: async (i) => void calls.push(`insert:${i.googleEventId}`),
    writeUpdate: async (_c, u) => void calls.push(`update:${u.googleEventId}`),
    writeDelete: async (d, calendarId) => void calls.push(`delete:${d.eventId}:${calendarId}`),
    writeSeriesFill: async (_c, f) => void calls.push(`seriesFill:${f.eventId}:${f.googleSeriesId}`),
    pushBack: async (id, except) => void calls.push(except ? `pushBack:${id}:except=${except}` : `pushBack:${id}`),
    now: () => NOW,
    ...over,
  };
  return { deps, calls, listModes };
}
