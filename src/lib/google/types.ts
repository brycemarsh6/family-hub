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
