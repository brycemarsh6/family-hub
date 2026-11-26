// The recovery code an admin is shown once at the end of setup, and the rules
// for reading one back when they forgot their password. The code looks like
// XXXX-XXXX-XXXX-XXXX and avoids look-alike characters (no 0, 1, I, L, O) so
// it survives being copied by hand from a screen to paper.
//
// Same standing as loginRateLimitPolicy.ts: no database, no env var, no
// "server-only". The caller hashes and stores it; this file only makes and
// reads the text.

import { randomInt } from "node:crypto";

export const RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const CODE_LENGTH = 16;

/** A fresh random code, 16 characters in four dashed groups. randomInt keeps
 * every character equally likely (no modulo bias). */
export function generateRecoveryCode(): string {
  let raw = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    raw += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
  }
  return raw.match(/.{4}/g)!.join("-");
}

/** Turns whatever someone typed into the plain 16 characters, or null if it
 * cannot be a recovery code. Case, spaces and dashes are ignored. */
export function normalizeRecoveryCode(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[\s-]/g, "");
  if (cleaned.length !== CODE_LENGTH) return null;
  for (const ch of cleaned) {
    if (!RECOVERY_ALPHABET.includes(ch)) return null;
  }
  return cleaned;
}

/** A fresh code in both forms: `code` as shown to a person (dashed), `plain`
 * as hashed and stored. The one place the two are made together. */
export function newRecoveryCode(): { code: string; plain: string } {
  const code = generateRecoveryCode();
  const plain = normalizeRecoveryCode(code);
  if (!plain) throw new Error("A fresh recovery code did not normalize.");
  return { code, plain };
}
