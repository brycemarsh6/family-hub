// Wraps bcryptjs so the whole app talks to exactly one file for password
// hashing — swapping algorithms later (or tuning the cost) touches this file
// only, not every caller.
//
// Deliberately no "server-only" guard: this has to be importable by
// prisma/bootstrap-users.ts, a plain Node script run via tsx, not just by
// Server Actions — the same reasoning src/lib/match.ts documents for why it
// carries no guard or imports of its own. Pure functions over inputs, no
// secrets, no database access.
//
// bcrypt's own limit, not something this wrapper adds: only the first 72
// bytes of the password are hashed. UTF-8 characters outside plain ASCII can
// take up to 4 bytes each, so a password heavy on emoji or non-Latin script
// could be silently truncated well before 72 characters. Not a practical
// concern for this household's passwords, but worth knowing before ever
// raising the length of what's accepted.

import bcrypt from "bcryptjs";

/** Work factor. Higher is slower (and safer against offline guessing) — 11
 * is a step above bcryptjs's own default of 10, chosen because this app's
 * real defense against *online* guessing is the rate limiter (Phase 2), not
 * hash cost alone. */
const COST = 11;

/**
 * Hash a plaintext password for storage. Rejects an empty string outright —
 * an "empty password" is never a valid account state, and bcrypt itself
 * would happily hash "" into something that looks like a real hash.
 */
export async function hashPassword(password: string): Promise<string> {
  if (password.length === 0) {
    throw new Error("Password must not be empty.");
  }
  return bcrypt.hash(password, COST);
}

/**
 * Check a plaintext password against a stored hash. Returns false (never
 * throws) for a wrong password, a malformed hash, or an empty attempt — a
 * login check should never crash on bad input, only say no.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (password.length === 0) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
