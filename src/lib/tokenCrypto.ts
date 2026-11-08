import "server-only";
import {
  decryptToken,
  encryptToken,
  parseKey,
} from "@/lib/tokenCryptoCore";

// Reads TOKEN_ENCRYPTION_KEY and hands it to the pure core. Never logs the
// key; a missing or malformed key is reported as "not configured". Only a
// good key is remembered, so fixing the setting never needs a restart to be
// noticed.
let cachedKey: Buffer | undefined;

function readKey(): Buffer | null {
  if (cachedKey) return cachedKey;
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  try {
    cachedKey = parseKey(raw);
    return cachedKey;
  } catch {
    return null;
  }
}

export function isTokenKeyConfigured(): boolean {
  return readKey() !== null;
}

function requireKey(): Buffer {
  const key = readKey();
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  return key;
}

export function encryptSecret(plain: string): string {
  return encryptToken(plain, requireKey());
}

export function decryptSecret(stored: string): string {
  return decryptToken(stored, requireKey());
}
