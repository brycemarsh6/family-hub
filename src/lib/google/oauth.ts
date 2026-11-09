import "server-only";
import { GOOGLE_SCOPES } from "./scopes";
import type { ExchangeResult, RefreshResult } from "./types";

// The one place that reads GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. Same
// rules as winnieNotify.ts: a missing setting is a "not-configured" result,
// never a throw, and caught errors are dropped because they could quote a
// token or the secret. No result here ever carries a response body.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const TIMEOUT_MS = 10_000;

function credentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function isGoogleConfigured(): boolean {
  return credentials() !== null;
}

export function googleAuthUrl({ state, redirectUri }: { state: string; redirectUri: string }): string | null {
  const creds = credentials();
  if (!creds) return null;
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function postForm(url: string, body: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function exchangeCode({ code, redirectUri }: { code: string; redirectUri: string }): Promise<ExchangeResult> {
  const creds = credentials();
  if (!creds) return { ok: false, reason: "not-configured" };
  try {
    const res = await postForm(TOKEN_URL, {
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    if (!res.ok) return { ok: false, reason: "rejected" };
    const data: unknown = await res.json();
    const record = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
    const refreshToken = str(record.refresh_token);
    const accessToken = str(record.access_token);
    const idToken = str(record.id_token);
    if (!accessToken || !idToken) return { ok: false, reason: "rejected" };
    if (!refreshToken) return { ok: false, reason: "no-refresh-token" };
    return { ok: true, refreshToken, accessToken, idToken, scope: str(record.scope) };
  } catch {
    // Deliberately drops the error: it could quote the code or the secret.
    return { ok: false, reason: "network" };
  }
}

// Dormant until PR 2 of calendar-sync-v1.md, where the outbound push fetches
// an access token with it. Nothing calls it yet.
export async function refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
  const creds = credentials();
  if (!creds) return { ok: false, reason: "not-configured" };
  try {
    const res = await postForm(TOKEN_URL, {
      refresh_token: refreshToken,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "refresh_token",
    });
    // Google answers 400 invalid_grant when the person revoked access.
    if (res.status === 400 || res.status === 401) return { ok: false, reason: "revoked" };
    if (!res.ok) return { ok: false, reason: "network" };
    const data: unknown = await res.json();
    const record = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
    const accessToken = str(record.access_token);
    if (!accessToken) return { ok: false, reason: "network" };
    const expiresIn = typeof record.expires_in === "number" ? record.expires_in : 3600;
    return { ok: true, accessToken, expiresIn };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** Best effort: true if Google accepted the revoke, false for anything else. */
export async function revokeToken(token: string): Promise<boolean> {
  try {
    const res = await postForm(REVOKE_URL, { token });
    return res.ok;
  } catch {
    return false;
  }
}
