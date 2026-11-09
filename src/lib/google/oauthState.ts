import { randomBytes, timingSafeEqual } from "node:crypto";

// The "state" value that ties Google's return trip to the browser that
// started it. Pure (no server-only) so it can be unit tested.

export const STATE_COOKIE_NAME = "google_oauth_state";
export const STATE_TTL_SECONDS = 600;

/** 32 random bytes, base64url, safe to put in a URL and a cookie. */
export function newOauthState(): string {
  return randomBytes(32).toString("base64url");
}

/** Constant-time comparison; different lengths or empty values never match. */
export function oauthStatesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
