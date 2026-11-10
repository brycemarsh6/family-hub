import { toGoogleEvent, googleEventIdFor, type EventPayloadInput } from "@/lib/google/eventPayload";
import type {
  EventCallResult,
  GetEventResult,
  GoogleEventPayload,
} from "@/lib/google/types";
import { isReadOnlyRole, type SyncDirection, type SyncFailReason, type SyncRowStatus } from "@/lib/calendarSyncVocabulary";

// The decisions and the push steps for copying a Marshee event to Google
// (mission 56, design decisions 3 to 8). Pure: no database, no network, no
// `server-only` import, so a plain node test can run it. Every outside thing
// (Google calls, the access token, the sync rows) comes in as a parameter;
// calendarEventPush.ts binds the real ones. Failures are one of the fixed
// words, never a response body, and a caught error is dropped.

/** A linked calendar as the plan needs it. */
export type PlanCalendar = {
  /** The LinkedCalendar row id, not Google's calendar id. */
  id: string;
  googleCalendarId: string;
  accountId: string;
  direction: SyncDirection;
  /** Google's role for this calendar; null means unknown (linked before PR 2). */
  accessRole: string | null;
};

/** An existing CalendarEventSync row. */
export type PlanRow = {
  linkedCalendarId: string;
  googleEventId: string;
  etag: string | null;
  /** "removing" is an untick whose Google delete failed. */
  status: SyncRowStatus;
};

/** Only a calendar set to sync that Google lets Marshee write to. Unknown (null) is allowed. */
export function isPushable(calendar: { direction: SyncDirection; accessRole: string | null }): boolean {
  return calendar.direction !== "off" && !isReadOnlyRole(calendar.accessRole);
}

/** Whether a calendar starts ticked on a new event: the viewer's own "Both ways" ones. */
export function startsTicked(calendar: { direction: SyncDirection; isMine: boolean }): boolean {
  return calendar.isMine && calendar.direction === "twoWay";
}

/** A client list of calendar ids, or undefined when it is absent or not a list of strings. */
export function cleanRequestedIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((id): id is string => typeof id === "string");
}

/**
 * The `showBusyOnGoogle` column to write: only an all-day event stores it
 * (a timed event is always busy, so it is reset to false); undefined on an
 * all-day event leaves the column alone.
 */
export function busyColumn(allDay: boolean, showBusy: boolean | undefined): { showBusyOnGoogle?: boolean } {
  if (!allDay) return { showBusyOnGoogle: false };
  return showBusy === undefined ? {} : { showBusyOnGoogle: showBusy === true };
}

/** Why a token refresh failed, as a sync fail word: a revoked grant needs a reconnect, anything else is the network. */
export function tokenFailReason(refreshReason: string): "reconnect" | "network" {
  return refreshReason === "revoked" ? "reconnect" : "network";
}

/** People's display names in a stable order (name, then id), for the "For:" line. */
export function sortedPersonNames(people: { id: string; displayName: string }[]): string[] {
  return [...people]
    .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id))
    .map((person) => person.displayName);
}

export type SyncPlan = { create: string[]; update: string[]; remove: string[] };

/**
 * What to do, as LinkedCalendar ids. `requestedIds` undefined means "leave the
 * calendars alone": existing copies are updated, none added or removed. Every
 * requested id is checked against `calendars` here, so a tampered id for an
 * unknown, "off" or read-only calendar is ignored. A copy on a calendar that
 * is no longer pushable is left alone (decision 8).
 */
export function planSync(input: {
  rows: PlanRow[];
  calendars: PlanCalendar[];
  requestedIds?: string[];
}): SyncPlan {
  const pushable = new Set(input.calendars.filter(isPushable).map((c) => c.id));
  const existing = new Set(input.rows.map((r) => r.linkedCalendarId));
  const desired = new Set<string>();
  if (input.requestedIds === undefined) {
    for (const row of input.rows) {
      if (row.status !== "removing" && pushable.has(row.linkedCalendarId)) desired.add(row.linkedCalendarId);
    }
  } else {
    for (const id of input.requestedIds) if (pushable.has(id)) desired.add(id);
  }
  return {
    create: [...desired].filter((id) => !existing.has(id)),
    update: [...desired].filter((id) => existing.has(id)),
    remove: input.rows
      .map((r) => r.linkedCalendarId)
      .filter((id) => pushable.has(id) && !desired.has(id)),
  };
}

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

/** Update the copy with the saved etag. 412 saves Google's version and overwrites; 404 recreates. */
async function updateExisting(
  deps: SyncDeps,
  token: string,
  calendar: PlanCalendar,
  row: PlanRow,
  payload: GoogleEventPayload,
): Promise<Step> {
  const first = await deps.update(
    token,
    calendar.googleCalendarId,
    row.googleEventId,
    payload,
    row.etag ?? undefined,
  );
  if (first.ok) return first;
  if (first.reason === "gone") return insertOrRevive(deps, token, calendar, row.googleEventId, payload);
  if (first.reason !== "changed") return { ok: false, reason: failWord(first) };

  // Someone changed it in Google first: keep their version, then last write wins.
  let previousJson: string | null = null;
  const theirs = await deps.get(token, calendar.googleCalendarId, row.googleEventId);
  if (theirs.ok) previousJson = JSON.stringify(theirs.event);
  const second = await deps.update(token, calendar.googleCalendarId, row.googleEventId, payload);
  if (second.ok) return { ok: true, etag: second.etag, previousJson };
  if (second.reason === "gone") return insertOrRevive(deps, token, calendar, row.googleEventId, payload);
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
): Promise<boolean> {
  const key: RowKey = { eventId, linkedCalendarId: calendar.id, googleEventId };
  try {
    await deps.saveRow(key, { status: "pending", failReason: null });
    const token = await getToken(calendar.accountId);
    const step: Step = !token.ok
      ? { ok: false, reason: token.reason }
      : row?.etag
        ? await updateExisting(deps, token.accessToken, calendar, row, payload)
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
  },
): Promise<{ failed: number }> {
  const eventId = input.payloadInput.marsheeEventId;
  const plan = planSync(input);
  const byId = new Map(input.calendars.map((c) => [c.id, c]));
  const rowFor = new Map(input.rows.map((r) => [r.linkedCalendarId, r]));
  const payload = toGoogleEvent(input.payloadInput);
  const googleEventId = googleEventIdFor(eventId);
  const getToken = tokenSource(deps);

  const updates = input.retryOnly ? plan.update.filter((id) => rowFor.get(id)?.status !== "ok") : plan.update;
  const jobs: Promise<boolean>[] = [];
  for (const id of input.retryOnly ? [] : plan.create) {
    jobs.push(pushOne(deps, getToken, eventId, byId.get(id)!, undefined, payload, googleEventId));
  }
  for (const id of updates) {
    const row = rowFor.get(id)!;
    jobs.push(pushOne(deps, getToken, eventId, byId.get(id)!, row, payload, row.googleEventId));
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
