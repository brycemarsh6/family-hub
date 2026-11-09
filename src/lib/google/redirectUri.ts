// The one place that builds Google's redirect URI (mission 55). Pure, so
// node --test can import it. Google compares the URI sent at the start of the
// link with the one sent when the code is swapped, character for character,
// so the Server Action and the callback route must both build it here.

export const GOOGLE_CALLBACK_PATH = "/api/google/callback";

/**
 * The request's own origin from its Host header and, if present, the
 * X-Forwarded-Proto header. Null when there is no host. Localhost and
 * 127.0.0.1 default to http, everything else to https. A comma list uses its
 * first entry; anything but "http" or "https" is ignored.
 */
export function requestOriginFrom(host: string | null, forwardedProto: string | null): string | null {
  if (!host) return null;
  const forwarded = forwardedProto?.split(",")[0]?.trim();
  const isLocal = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  const proto = forwarded === "http" || forwarded === "https" ? forwarded : isLocal ? "http" : "https";
  return `${proto}://${host}`;
}

export function googleRedirectUri(origin: string): string {
  return `${origin}${GOOGLE_CALLBACK_PATH}`;
}
