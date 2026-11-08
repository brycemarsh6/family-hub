// The pure half of refresh-token encryption (mission 55): AES-256-GCM with
// the key passed in. Stored form is `v1.<iv>.<tag>.<ciphertext>`, each part
// base64url. The env reader lives in tokenCrypto.ts (server-only). Error
// messages name the step, never a value.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class TokenCryptoError extends Error {
  readonly reason: "format" | "auth";

  constructor(reason: "format" | "auth") {
    super(
      reason === "format"
        ? "Stored token is not in a readable format"
        : "Stored token could not be verified",
    );
    this.name = "TokenCryptoError";
    this.reason = reason;
  }
}

/** Turns a base64 key into 32 bytes; anything else throws. */
export function parseKey(base64: string): Buffer {
  const key = Buffer.from(base64, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(`Encryption key must be exactly ${KEY_BYTES} bytes`);
  }
  return key;
}

export function encryptToken(plain: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ct].map((p) =>
    typeof p === "string" ? p : p.toString("base64url"),
  ).join(".");
}

export function decryptToken(stored: string, key: Buffer): string {
  const parts = stored.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new TokenCryptoError("format");
  }
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const ct = Buffer.from(parts[3], "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new TokenCryptoError("format");
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    throw new TokenCryptoError("auth");
  }
}
