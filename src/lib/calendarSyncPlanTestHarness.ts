import { googleEventIdFor, type EventPayloadInput } from "./google/eventPayload";
import type { EventCallResult, GetEventResult, GoogleEventPayload } from "./google/types";
import type { RowKey, RowPatch, SyncDeps } from "./calendarSyncPlan";
import type { PlanCalendar, PlanRow } from "./calendarSyncRules";

// The fake Google and fake rows shared by calendarSyncPlanPush.test.ts and
// calendarSyncPlanPushFailures.test.ts (not itself a test file). Nothing here
// reaches the network or a database.

export const TOKEN = "ya29.SECRET-ACCESS-TOKEN";
export const EVENT_ID = "cmevent0123456789abcdefgh";
export const GOOGLE_ID = googleEventIdFor(EVENT_ID);

export function cal(id: string, over: Partial<PlanCalendar> = {}): PlanCalendar {
  return {
    id,
    googleCalendarId: `${id}@group.calendar.google.com`,
    accountId: `acct-${id}`,
    direction: "outbound",
    accessRole: "owner",
    ...over,
  };
}

export function row(linkedCalendarId: string, over: Partial<PlanRow> = {}): PlanRow {
  return { linkedCalendarId, googleEventId: GOOGLE_ID, etag: '"e1"', status: "ok", ...over };
}

export const PAYLOAD_INPUT: EventPayloadInput = {
  marsheeEventId: EVENT_ID,
  title: "Dentist",
  notes: null,
  location: null,
  startAt: new Date("2026-03-07T19:00:00Z"),
  endAt: new Date("2026-03-07T20:00:00Z"),
  allDay: false,
  showBusyOnGoogle: false,
  forNames: ["Bryce"],
};

export type Call = { op: string; calendarId: string; ifMatch?: string };

/** A fake Google plus fake rows. Nothing here reaches the network or a database. */
export function harness(script: {
  insert?: EventCallResult[];
  update?: EventCallResult[];
  get?: GetEventResult[];
  remove?: EventCallResult[];
  token?: { ok: true; accessToken: string } | { ok: false; reason: "reconnect" | "network" };
}) {
  const calls: Call[] = [];
  const payloads: { op: string; calendarId: string; payload: GoogleEventPayload }[] = [];
  const saves: { key: RowKey; patch: RowPatch }[] = [];
  const deleted: string[] = [];
  let tokenFetches = 0;
  const next = <T>(list: T[] | undefined, fallback: T): T => (list && list.length > 0 ? list.shift()! : fallback);
  const deps: SyncDeps = {
    async getAccessToken() {
      tokenFetches += 1;
      return script.token ?? { ok: true, accessToken: TOKEN };
    },
    async insert(_t, calendarId, _g, payload) {
      calls.push({ op: "insert", calendarId });
      payloads.push({ op: "insert", calendarId, payload });
      return next(script.insert, { ok: true, etag: '"new"' });
    },
    async update(_t, calendarId, _g, payload, ifMatch) {
      calls.push({ op: "update", calendarId, ifMatch });
      payloads.push({ op: "update", calendarId, payload });
      return next(script.update, { ok: true, etag: '"upd"' });
    },
    async get(_t, calendarId) {
      calls.push({ op: "get", calendarId });
      return next(script.get, { ok: true, etag: '"theirs"', event: { summary: "Their edit" } });
    },
    async remove(_t, calendarId) {
      calls.push({ op: "remove", calendarId });
      return next(script.remove, { ok: true, etag: null });
    },
    async saveRow(key, patch) {
      saves.push({ key, patch });
    },
    async deleteRow(_e, linkedCalendarId) {
      deleted.push(linkedCalendarId);
    },
    now: () => new Date("2026-03-01T00:00:00Z"),
  };
  return { deps, calls, payloads, saves, deleted, tokenFetches: () => tokenFetches };
}

export function lastPatch(h: ReturnType<typeof harness>): RowPatch {
  return h.saves[h.saves.length - 1].patch;
}
