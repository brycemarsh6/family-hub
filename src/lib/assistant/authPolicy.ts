// The pure half of the Assistant API's bearer-token check — no database, no
// env var read. The route wrapper (route.ts) reads ASSISTANT_API_TOKEN_HASH
// and passes it in, which is what lets authPolicy.test.ts exercise every
// case without touching process.env.
//
// The env var holds the SHA-256 *hash* of the token, never the token itself,
// so a leaked environment dump doesn't hand out a working credential.

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Pull the token out of an `Authorization: Bearer <token>` header.
 * The scheme is case-insensitive; there must be exactly one token after it.
 * Anything else — no header, `Basic …`, a bare `Bearer`, two tokens — is
 * null, and the caller treats null as "not authorised".
 */
export function parseBearer(header: string | null): string | null {
  if (!header) return null;
  const parts = header.trim().split(" ");
  if (parts.length !== 2) return null;
  const [scheme, token] = parts;
  if (scheme.toLowerCase() !== "bearer" || token === "") return null;
  return token;
}

/** SHA-256 of a token, as lowercase hex — what `npm run assistant:token` prints. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const HEX_SHA256 = /^[0-9a-fA-F]{64}$/;

/**
 * Hash what the caller sent and compare the two 32-byte digests in constant
 * time. Hashing first means the comparison is always the same length, so a
 * wrong-length token can't make timingSafeEqual throw or leak its length.
 * A malformed expected hash (not 64 hex characters) is simply false — a
 * misconfigured env var must lock everyone out, never throw or match.
 */
export function isTokenValid(provided: string, expectedHashHex: string): boolean {
  if (!HEX_SHA256.test(expectedHashHex)) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = Buffer.from(expectedHashHex, "hex");
  return timingSafeEqual(a, b);
}
