import { toGoogleEvent, googleEventIdFor, type EventPayloadInput } from "@/lib/google/eventPayload";
import type {
  EventCallResult,
  GetEventResult,
  GoogleEventPayload,
} from "@/lib/google/types";
import { planSync, type PlanCalendar, type PlanRow } from "@/lib/calendarSyncRules";
import type { SyncFailReason, SyncRowStatus } from "@/lib/calendarSyncVocabulary";

// The push steps for copying a Marshee event to Google
// (mission 56, design decisions 3 to 8); the pure rules they use are in
// calendarSyncRules.ts. Pure: no database, no network, no
// `server-only` import, so a plain node test can run it. Every outside thing
// (Google calls, the access token, the sync rows) comes in as a parameter;
// calendarEventPush.ts binds the real ones. Failures are one of the fixed
// words, never a response body, and a caught error is dropped.

export type RowKey = { eventId: string; linkedCalendarId: string; googleEventId: string };
export type RowPatch = {
  etag?: string | null;
  status?: SyncRowStatus;
  failReason?: SyncFailReason | null;
  lastPushedAt?: Date | null;
  previousJson?: string | null;
};
export type TokenResult = { ok: true; accessToken: string } | { ok: false; reason: "reconnect" | "network" };

export type SyncDeps = {
  getAccessToken(accountId: string): Promise<TokenResult>;
  insert(
    accessToken: string,
    calendarId: string,
    googleEventId: string,
    payload: GoogleEventPayload,
  ): Promise<EventCallResult>;
  update(
    accessToken: string,
    calendarId: string,
    googleEventId: string,
    payload: GoogleEventPayload,
    ifMatch?: string,
  ): Promise<EventCallResult>;
  get(accessToken: string, calendarId: string, googleEventId: string): Promise<GetEventResult>;
  remove(accessToken: string, calendarId: string, googleEventId: string): Promise<EventCallResult>;
  /** Create or update the sync row (an upsert on event + calendar). */
  saveRow(key: RowKey, patch: RowPatch): Promise<void>;
  deleteRow(eventId: string, linkedCalendarId: string): Promise<void>;
  now(): Date;
};

/** One fetch of the access token per account per run, shared by parallel calendars. */
function tokenSource(deps: SyncDeps): (accountId: string) => Promise<TokenResult> {
  const cache = new Map<string, Promise<TokenResult>>();
  return (accountId) => {
    let pending = cache.get(accountId);
    if (!pending) {
      pending = deps.getAccessToken(accountId).catch((): TokenResult => ({ ok: false, reason: "network" }));
      cache.set(accountId, pending);
    }
    return pending;
  };
}

function failWord(result: { ok: false; reason: string }): SyncFailReason {
  return result.reason === "unauthorized" ? "refused" : "network";
}

type Step = { ok: true; etag: string | null; previousJson?: string | null } | { ok: false; reason: SyncFailReason };

/** Create the copy; 409 means it already exists (or was deleted), so update it back to confirmed. */
async function insertOrRevive(
  deps: SyncDeps,
  token: string,
  calendar: PlanCalendar,
  googleEventId: string,
  payload: GoogleEventPayload,
): Promise<Step> {
  const inserted = await deps.insert(token, calendar.googleCalendarId, googleEventId, payload);
  if (inserted.ok) return inserted;
  if (inserted.reason !== "conflict") return { ok: false, reason: failWord(inserted) };
  const revived = await deps.update(token, calendar.googleCalendarId, googleEventId, payload);
  return revived.ok ? revived : { ok: false, reason: failWord(revived) };
}

/**
 * Update the copy with the saved etag. 412 saves Google's version and overwrites;
 * 404 recreates, except on the event's source calendar: that original is gone in
 * Google, so it is never recreated (the next pull deletes the Marshee event).
 */
async function updateExisting(
  deps: SyncDeps,
  token: string,
  calendar: PlanCalendar,
  row: PlanRow,
  payload: GoogleEventPayload,
  isSource: boolean,
): Promise<Step> {
  const first = await deps.update(
    token,
    calendar.googleCalendarId,
    row.googleEventId,
    payload,
    row.etag ?? undefined,
  );
  if (first.ok) return first;
  if (first.reason === "gone") {
    return isSource ? { ok: false, reason: "network" } : insertOrRevive(deps, token, calendar, row.googleEventId, payload);
  }
  if (first.reason !== "changed") return { ok: false, reason: failWord(first) };

  // Someone changed it in Google first: keep their version, then last write wins.
  let previousJson: string | null = null;
  const theirs = await deps.get(token, calendar.googleCalendarId, row.googleEventId);
  if (theirs.ok) previousJson = JSON.stringify(theirs.event);
  const second = await deps.update(token, calendar.googleCalendarId, row.googleEventId, payload);
  if (second.ok) return { ok: true, etag: second.etag, previousJson };
  if (second.reason === "gone") {
    return isSource ? { ok: false, reason: "network" } : insertOrRevive(deps, token, calendar, row.googleEventId, payload);
  }
  return { ok: false, reason: failWord(second) };
}

async function pushOne(
  deps: SyncDeps,
  getToken: (accountId: string) => Promise<TokenResult>,
  eventId: string,
  calendar: PlanCalendar,
  row: PlanRow | undefined,
  payload: GoogleEventPayload,
  googleEventId: string,
  isSource: boolean,
): Promise<boolean> {
  const key: RowKey = { eventId, linkedCalendarId: calendar.id, googleEventId };
  try {
    await deps.saveRow(key, { status: "pending", failReason: null });
    const token = await getToken(calendar.accountId);
    const step: Step = !token.ok
      ? { ok: false, reason: token.reason }
      : row?.etag
        ? await updateExisting(deps, token.accessToken, calendar, row, payload, isSource)
        : await insertOrRevive(deps, token.accessToken, calendar, googleEventId, payload);
    if (step.ok) {
      await deps.saveRow(key, {
        status: "ok",
        failReason: null,
        etag: step.etag,
        lastPushedAt: deps.now(),
        ...(step.previousJson ? { previousJson: step.previousJson } : {}),
      });
      return true;
    }
    await deps.saveRow(key, { status: "failed", failReason: step.reason });
    return false;
  } catch {
    // Dropped on purpose: it could quote a token. The row stays "pending" or
    // is marked failed below; the Marshee event already stands.
    try {
      await deps.saveRow(key, { status: "failed", failReason: "network" });
    } catch {
      // Nothing more to record.
    }
    return false;
  }
}

/** Take a copy off Google and drop its row. Failure keeps the row as "removing" so Try again finishes it. */
async function removeOne(
  deps: SyncDeps,
  getToken: (accountId: string) => Promise<TokenResult>,
  eventId: string,
  calendar: PlanCalendar,
  row: PlanRow,
): Promise<boolean> {
  const key: RowKey = { eventId, linkedCalendarId: calendar.id, googleEventId: row.googleEventId };
  try {
    const token = await getToken(calendar.accountId);
    let failed: SyncFailReason | null = null;
    if (!token.ok) {
      failed = token.reason;
    } else {
      const res = await deps.remove(token.accessToken, calendar.googleCalendarId, row.googleEventId);
      if (!res.ok && res.reason !== "gone") failed = failWord(res);
    }
    if (failed === null) {
      await deps.deleteRow(eventId, calendar.id);
      return true;
    }
    await deps.saveRow(key, { status: "removing", failReason: failed });
    return false;
  } catch {
    return false;
  }
}

/**
 * Bring the Google copies in line with the event. Calendars run in parallel.
 * Returns how many copies did not get through; each is recorded on its row.
 * `retryOnly` re-pushes just the rows that are not "ok" (Try again).
 */
export async function syncEventCopies(
  deps: SyncDeps,
  input: {
    payloadInput: EventPayloadInput;
    rows: PlanRow[];
    calendars: PlanCalendar[];
    requestedIds?: string[];
    retryOnly?: boolean;
    /** The calendar a pulled event came from: always kept, busy/free left to Google, never recreated. */
    sourceLinkedCalendarId?: string | null;
  },
): Promise<{ failed: number }> {
  const eventId = input.payloadInput.marsheeEventId;
  const plan = planSync(input);
  const byId = new Map(input.calendars.map((c) => [c.id, c]));
  const rowFor = new Map(input.rows.map((r) => [r.linkedCalendarId, r]));
  const sourceId = input.sourceLinkedCalendarId ?? null;
  // A timed event on its own source calendar leaves Google's busy/free alone.
  const payloadFor = (calendarId: string) =>
    toGoogleEvent(input.payloadInput, calendarId === sourceId && !input.payloadInput.allDay);
  const googleEventId = googleEventIdFor(eventId);
  const getToken = tokenSource(deps);

  const updates = input.retryOnly ? plan.update.filter((id) => rowFor.get(id)?.status !== "ok") : plan.update;
  const jobs: Promise<boolean>[] = [];
  for (const id of input.retryOnly ? [] : plan.create) {
    jobs.push(pushOne(deps, getToken, eventId, byId.get(id)!, undefined, payloadFor(id), googleEventId, id === sourceId));
  }
  for (const id of updates) {
    const row = rowFor.get(id)!;
    jobs.push(pushOne(deps, getToken, eventId, byId.get(id)!, row, payloadFor(id), row.googleEventId, id === sourceId));
  }
  for (const id of plan.remove) {
    jobs.push(removeOne(deps, getToken, eventId, byId.get(id)!, rowFor.get(id)!));
  }
  const results = await Promise.all(jobs);
  return { failed: results.filter((ok) => !ok).length };
}

/**
 * Delete: ask Google to remove the copy on every calendar (even ones since
 * switched off, decision 8 and plan decision 6). Returns how many copies are
 * left. The caller deletes the Marshee event either way.
 */
export async function removeAllCopies(
  deps: SyncDeps,
  input: { eventId: string; rows: PlanRow[]; calendars: PlanCalendar[] },
): Promise<{ left: number }> {
  const byId = new Map(input.calendars.map((c) => [c.id, c]));
  const getToken = tokenSource(deps);
  const results = await Promise.all(
    input.rows.map(async (row) => {
      const calendar = byId.get(row.linkedCalendarId);
      if (!calendar) return false;
      try {
        const token = await getToken(calendar.accountId);
        if (!token.ok) return false;
        const res = await deps.remove(token.accessToken, calendar.googleCalendarId, row.googleEventId);
        return res.ok || res.reason === "gone";
      } catch {
        return false;
      }
    }),
  );
  return { left: results.filter((ok) => !ok).length };
}
