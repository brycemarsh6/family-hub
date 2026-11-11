import type {
  EventCallFailReason,
  EventCallResult,
  GetEventResult,
  GoogleEventIn,
  GoogleEventPayload,
  GoogleTimesPatch,
  ListEventsMode,
  ListEventsResult,
} from "./types";

// Insert, update (a PATCH), get and delete for one Google calendar event. Pure: `fetch`
// is a parameter so tests never reach Google (calendarApi.ts binds the real
// one). No auth logic: the caller passes a fresh access token. Failures carry
// a reason word only, never a response body, and a caught error is dropped,
// since it could quote the Authorization header.

const EVENTS_BASE = "https://www.googleapis.com/calendar/v3/calendars";
export const TIMEOUT_MS = 10_000;
export const MAX_LIST_PAGES = 20;

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

function eventUrl(calendarId: string, googleEventId?: string): string {
  const base = `${EVENTS_BASE}/${encodeURIComponent(calendarId)}/events`;
  const path = googleEventId === undefined ? base : `${base}/${encodeURIComponent(googleEventId)}`;
  return `${path}?sendUpdates=none`;
}

function failReason(status: number): EventCallFailReason {
  if (status === 409) return "conflict";
  if (status === 412) return "changed";
  if (status === 404 || status === 410) return "gone";
  if (status === 401 || status === 403) return "unauthorized";
  return "network";
}

async function call(
  fetchFn: FetchLike,
  url: string,
  accessToken: string,
  method: string,
  extra: { body?: unknown; ifMatch?: string } = {},
): Promise<{ ok: true; res: Response } | { ok: false; reason: EventCallFailReason }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
  if (extra.body !== undefined) headers["Content-Type"] = "application/json";
  if (extra.ifMatch) headers["If-Match"] = extra.ifMatch;
  try {
    const res = await fetchFn(url, {
      method,
      headers,
      body: extra.body === undefined ? undefined : JSON.stringify(extra.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, reason: failReason(res.status) };
    return { ok: true, res };
  } catch {
    // Deliberately drops the error: it could quote the Authorization header.
    return { ok: false, reason: "network" };
  }
}

async function etagOf(res: Response): Promise<string | null> {
  try {
    const data = (await res.json()) as { etag?: unknown };
    return typeof data.etag === "string" ? data.etag : null;
  } catch {
    return null;
  }
}

/** Create the copy under the id Marshee chose. 409 means it already exists (or was deleted). */
export async function insertEvent(
  fetchFn: FetchLike,
  accessToken: string,
  calendarId: string,
  googleEventId: string,
  payload: GoogleEventPayload,
): Promise<EventCallResult> {
  const r = await call(fetchFn, eventUrl(calendarId), accessToken, "POST", {
    body: { ...payload, id: googleEventId },
  });
  if (!r.ok) return r;
  return { ok: true, etag: await etagOf(r.res) };
}

/**
 * Change the copy. A PATCH, not a PUT: only the fields in the payload change,
 * so a pulled event keeps its guests, reminders, video link and color. With
 * `ifMatch`, 412 means someone changed it in Google first.
 */
export async function updateEvent(
  fetchFn: FetchLike,
  accessToken: string,
  calendarId: string,
  googleEventId: string,
  payload: GoogleEventPayload | GoogleTimesPatch,
  ifMatch?: string,
): Promise<EventCallResult> {
  const r = await call(fetchFn, eventUrl(calendarId, googleEventId), accessToken, "PATCH", {
    body: { ...payload, id: googleEventId },
    ifMatch,
  });
  if (!r.ok) return r;
  return { ok: true, etag: await etagOf(r.res) };
}

export async function getEvent(
  fetchFn: FetchLike,
  accessToken: string,
  calendarId: string,
  googleEventId: string,
): Promise<GetEventResult> {
  const r = await call(fetchFn, eventUrl(calendarId, googleEventId), accessToken, "GET");
  if (!r.ok) return r;
  try {
    const event = (await r.res.json()) as Record<string, unknown>;
    return { ok: true, etag: typeof event.etag === "string" ? event.etag : null, event };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** Delete the copy. No If-Match; the caller treats `gone` as success. */
export async function deleteEvent(
  fetchFn: FetchLike,
  accessToken: string,
  calendarId: string,
  googleEventId: string,
): Promise<EventCallResult> {
  const r = await call(fetchFn, eventUrl(calendarId, googleEventId), accessToken, "DELETE");
  if (!r.ok) return r;
  return { ok: true, etag: null };
}

function listUrl(calendarId: string, mode: ListEventsMode, pageToken: string | null): string {
  const url = new URL(`${EVENTS_BASE}/${encodeURIComponent(calendarId)}/events`);
  // Google rejects syncToken combined with timeMin, so a token pull never
  // sends a window; the caller skips anything outside it locally. A full pull
  // is closed at both ends: with no timeMax, Google expands every
  // forever-repeating event into instances and the list overflows.
  if ("syncToken" in mode) url.searchParams.set("syncToken", mode.syncToken);
  else {
    url.searchParams.set("timeMin", mode.timeMin);
    url.searchParams.set("timeMax", mode.timeMax);
  }
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("showDeleted", "true");
  url.searchParams.set("maxResults", "250");
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  return url.toString();
}

/**
 * Every event Google returns for a calendar: all pages of a full pull
 * (`timeMin`) or of a changes pull (`syncToken`). 410 and 400 mean the token
 * is no good ("restart": drop it and pull in full). More than 20 pages is
 * "too-many". Cancelled events come back too (showDeleted).
 */
export async function listEvents(
  fetchFn: FetchLike,
  accessToken: string,
  calendarId: string,
  mode: ListEventsMode,
): Promise<ListEventsResult> {
  const events: GoogleEventIn[] = [];
  let pageToken: string | null = null;
  for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
    try {
      const res = await fetchFn(listUrl(calendarId, mode, pageToken), {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 410 || res.status === 400) return { ok: false, reason: "restart", status: res.status };
      if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized", status: res.status };
      if (!res.ok) return { ok: false, reason: "network", status: res.status };
      const data = (await res.json()) as { items?: unknown; nextPageToken?: unknown; nextSyncToken?: unknown };
      for (const raw of Array.isArray(data.items) ? data.items : []) {
        if (typeof raw === "object" && raw !== null && typeof (raw as { id?: unknown }).id === "string") {
          events.push(raw as GoogleEventIn);
        }
      }
      pageToken = typeof data.nextPageToken === "string" && data.nextPageToken ? data.nextPageToken : null;
      if (!pageToken) {
        return { ok: true, events, nextSyncToken: typeof data.nextSyncToken === "string" ? data.nextSyncToken : null };
      }
    } catch {
      // Deliberately drops the error: it could quote the Authorization header.
      return { ok: false, reason: "network" };
    }
  }
  return { ok: false, reason: "too-many" };
}

function instancesUrl(calendarId: string, googleEventId: string, timeMin: string, timeMax: string, pageToken: string | null): string {
  const url = new URL(`${EVENTS_BASE}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}/instances`);
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("maxResults", "250");
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  return url.toString();
}

/**
 * Every instance Google currently lists for one repeating event inside a
 * window (cancelled ones are left out: no showDeleted). Used after a series
 * change to see which Marshee rows Google no longer has. Same failure words
 * as `listEvents`; there is no sync token, so `nextSyncToken` is always null.
 */
export async function listInstances(
  fetchFn: FetchLike,
  accessToken: string,
  calendarId: string,
  googleEventId: string,
  timeMin: string,
  timeMax: string,
): Promise<ListEventsResult> {
  const events: GoogleEventIn[] = [];
  let pageToken: string | null = null;
  for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
    try {
      const res = await fetchFn(instancesUrl(calendarId, googleEventId, timeMin, timeMax, pageToken), {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized", status: res.status };
      if (!res.ok) return { ok: false, reason: "network", status: res.status };
      const data = (await res.json()) as { items?: unknown; nextPageToken?: unknown };
      for (const raw of Array.isArray(data.items) ? data.items : []) {
        if (typeof raw === "object" && raw !== null && typeof (raw as { id?: unknown }).id === "string") {
          events.push(raw as GoogleEventIn);
        }
      }
      pageToken = typeof data.nextPageToken === "string" && data.nextPageToken ? data.nextPageToken : null;
      if (!pageToken) return { ok: true, events, nextSyncToken: null };
    } catch {
      // Deliberately drops the error: it could quote the Authorization header.
      return { ok: false, reason: "network" };
    }
  }
  return { ok: false, reason: "too-many" };
}
