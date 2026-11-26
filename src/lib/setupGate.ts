// The decisions behind the first-run setup page (/setup), kept as plain
// functions so they can be tested without a database. A relative opens their
// private copy of Marshee, enters a setup code, names their family and makes
// the first admin login. Everything here only looks at what it is handed.
//
// Same standing as loginRateLimitPolicy.ts: pure over its inputs, reads no env
// var, holds no secret of its own, so it skips "server-only". The caller reads
// SETUP_CODE and counts users, then asks these functions what to do.

import { createHash, timingSafeEqual } from "node:crypto";
import { MIN_PASSWORD_LENGTH } from "./password";

export const FAMILY_NAME_MAX = 60;
export const DISPLAY_NAME_MAX = 40;

/** The LoginAttempt.userId value that setup tries are counted under. */
export const SETUP_RATE_LIMIT_KEY = "setup";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** True when the code someone typed equals the code configured for this copy.
 * Both sides are hashed first so the compare takes the same time whatever the
 * lengths, and never throws. A missing or blank configured code never matches. */
export function setupCodeMatches(
  given: string,
  configured: string | undefined | null,
): boolean {
  if (configured == null) return false;
  const want = configured.trim();
  const got = given.trim();
  if (want === "" || got === "") return false;
  return timingSafeEqual(digest(got), digest(want));
}

/** Setup is open only on a fresh family copy: not Bryce's own copy, a setup
 * code is configured, nobody has an account yet, and setup was never finished. */
export function setupIsOpen(params: {
  ownerCopy: boolean;
  configuredCode: string | undefined | null;
  userCount: number;
  setupFinished: boolean;
}): boolean {
  if (params.ownerCopy) return false;
  if (params.configuredCode == null || params.configuredCode.trim() === "") {
    return false;
  }
  if (params.userCount !== 0) return false;
  if (params.setupFinished) return false;
  return true;
}

/** Checks the setup form. Names are trimmed, passwords are left exactly as
 * typed. Returns the first problem found, in the order the form is read. */
export function checkSetupInput(input: {
  familyName: string;
  displayName: string;
  password: string;
  passwordAgain: string;
}):
  | { ok: true; familyName: string; displayName: string }
  | { ok: false; error: string } {
  const familyName = input.familyName.trim();
  const displayName = input.displayName.trim();
  if (familyName === "") return { ok: false, error: "Give your family a name." };
  if (familyName.length > FAMILY_NAME_MAX) {
    return {
      ok: false,
      error: `Keep the family name under ${FAMILY_NAME_MAX} characters.`,
    };
  }
  if (displayName === "") return { ok: false, error: "Enter your name." };
  if (displayName.length > DISPLAY_NAME_MAX) {
    return {
      ok: false,
      error: `Keep your name under ${DISPLAY_NAME_MAX} characters.`,
    };
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (input.password !== input.passwordAgain) {
    return { ok: false, error: "Those passwords don't match." };
  }
  return { ok: true, familyName, displayName };
}
