// Reads who a Google id token says the person is. Pure (no server-only) so it
// can be unit tested.
//
// No signature check on purpose: the token came straight from Google's token
// endpoint, over TLS, in reply to our own request, so it is not something a
// stranger could have handed us. Never use this on a token from a browser.

export type GoogleIdentity = { sub: string; email: string };

/** Returns null (never throws) for anything that is not a usable token. */
export function identityFromIdToken(idToken: string): GoogleIdentity | null {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    if (!/^[A-Za-z0-9_-]+$/.test(payload)) return null;
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const claims: unknown = JSON.parse(json);
    if (typeof claims !== "object" || claims === null) return null;
    const { sub, email } = claims as { sub?: unknown; email?: unknown };
    if (typeof sub !== "string" || sub === "") return null;
    if (typeof email !== "string" || email === "") return null;
    return { sub, email };
  } catch {
    return null;
  }
}
