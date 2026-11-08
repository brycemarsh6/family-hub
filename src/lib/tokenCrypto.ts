import "server-only";
import {
  decryptToken,
  encryptToken,
  parseKey,
} from "@/lib/tokenCryptoCore";

// Reads TOKEN_ENCRYPTION_KEY once and hands it to the pure core. Never logs
// the key; a missing or malformed key is reported as "not configured".
let cachedKey: Buffer | null | undefined;

function readKey(): Buffer | null {
  if (cachedKey !== undefined) return cachedKey;
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    cachedKey = null;
    return cachedKey;
  }
  try {
    cachedKey = parseKey(raw);
  } catch {
    cachedKey = null;
  }
  return cachedKey;
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
