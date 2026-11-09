import "server-only";
import type { GoogleCalendarSummary, ListCalendarsResult } from "./types";

// Thin wrappers over Google Calendar's REST API. No auth logic here: the
// caller passes a fresh access token. Failures carry a reason only, never a
// response body or the token.

const CALENDAR_LIST_URL = "https://www.googleapis.com/calendar/v3/users/me/calendarList";
const TIMEOUT_MS = 10_000;
const MAX_PAGES = 20;

export async function listCalendars(accessToken: string): Promise<ListCalendarsResult> {
  const calendars: GoogleCalendarSummary[] = [];
  let pageToken: string | null = null;
  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const url = new URL(CALENDAR_LIST_URL);
      url.searchParams.set("maxResults", "250");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized" };
      if (!res.ok) return { ok: false, reason: "network" };
      const data = (await res.json()) as { items?: unknown; nextPageToken?: unknown };
      const items = Array.isArray(data.items) ? data.items : [];
      for (const raw of items) {
        const item = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
        if (typeof item.id !== "string" || item.id === "") continue;
        calendars.push({
          id: item.id,
          summary:
            typeof item.summaryOverride === "string" && item.summaryOverride
              ? item.summaryOverride
              : typeof item.summary === "string" && item.summary
                ? item.summary
                : item.id,
          primary: item.primary === true,
          backgroundColor: typeof item.backgroundColor === "string" ? item.backgroundColor : null,
          accessRole: typeof item.accessRole === "string" ? item.accessRole : "reader",
        });
      }
      pageToken = typeof data.nextPageToken === "string" && data.nextPageToken ? data.nextPageToken : null;
      if (!pageToken) break;
    }
    return { ok: true, calendars };
  } catch {
    // Deliberately drops the error: it could quote the Authorization header.
    return { ok: false, reason: "network" };
  }
}
