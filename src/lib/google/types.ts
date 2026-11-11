// Shapes shared by the Google call wrappers. Results carry a reason, never a
// response body, so a token cannot leak into a log through a failure.

export type GoogleCalendarSummary = {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor: string | null;
  accessRole: string;
};

export type ExchangeResult =
  | { ok: true; refreshToken: string; accessToken: string; idToken: string; scope: string }
  | { ok: false; reason: "not-configured" | "network" | "rejected" | "no-refresh-token" };

export type RefreshResult =
  | { ok: true; accessToken: string; expiresIn: number }
  | { ok: false; reason: "revoked" | "network" | "not-configured" };

export type ListCalendarsResult =
  | { ok: true; calendars: GoogleCalendarSummary[] }
  | { ok: false; reason: "unauthorized" | "network" };

// Google Calendar event copies. Same rule: a reason word, never a body.
export type GoogleEventPayload = {
  summary: string;
  /** Always sent, "" when empty, so a PATCH clears a field the person emptied. */
  location: string;
  description: string;
  start: { dateTime: string; timeZone: string } | { date: string };
  end: { dateTime: string; timeZone: string } | { date: string };
  status: "confirmed";
  /** Absent on an update that must leave Google's own busy/free choice alone. */
  transparency?: "opaque" | "transparent";
  extendedProperties: { private: { marsheeEventId: string } };
};

/** A series change: only the two times, so the PATCH leaves every other field of the parent alone. */
export type GoogleTimesPatch = {
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
};

export type EventCallFailReason = "conflict" | "changed" | "gone" | "unauthorized" | "network";

export type EventCallResult = { ok: true; etag: string | null } | { ok: false; reason: EventCallFailReason };

export type GetEventResult =
  | { ok: true; etag: string | null; event: Record<string, unknown> }
  | { ok: false; reason: EventCallFailReason };

// Reading events back (the pull). Only the fields Marshee reads are typed.
export type GoogleEventIn = {
  id: string;
  status?: string;
  etag?: string;
  updated?: string;
  summary?: string;
  description?: string;
  location?: string;
  eventType?: string;
  transparency?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  /** Set on an instance of a repeating event: the series parent's id. */
  recurringEventId?: string;
  /** Where the repeat rule put an instance, even if it was moved. */
  originalStartTime?: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties?: { private?: { marsheeEventId?: string } };
};

export type ListEventsMode = { syncToken: string } | { timeMin: string; timeMax: string };

export type ListEventsFailReason = "restart" | "unauthorized" | "network" | "too-many";

export type ListEventsResult =
  | { ok: true; events: GoogleEventIn[]; nextSyncToken: string | null }
  /** `status` is Google's HTTP status when there was one (for the server log only). */
  | { ok: false; reason: ListEventsFailReason; status?: number };
