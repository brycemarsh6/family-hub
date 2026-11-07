// The pure half of "sign the tablet out with an admin password" (mission 39,
// C4): does a typed password match any one of these stored hashes?
//
// Deliberately no "server-only" guard and no database access, same standing
// as password.ts: pure over its inputs, so the test can run under a plain
// `node --import tsx --test` process. The Server Action that wraps it
// (logoutWithAdminPassword in actions/auth.ts) does the guarding and the
// database read.

import { verifyPassword } from "./password";

/**
 * True if `password` matches at least one of `hashes`. Every hash is checked
 * even after a match is found, so how long this takes doesn't reveal which
 * admin (or how many) the password belonged to. An empty list is false, the
 * same answer as a wrong password: a caller must not be able to tell "no
 * admin has a password" from "that isn't an admin's password".
 */
export async function matchesAnyHash(
  password: string,
  hashes: readonly string[],
): Promise<boolean> {
  const results = await Promise.all(
    hashes.map((hash) => verifyPassword(password, hash)),
  );
  return results.some(Boolean);
}
