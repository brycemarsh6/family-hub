// The parent PIN's pure rules (mission 82, Rewards R4): its shape, when it is
// asked for, and its wrong-try lock. No database, no `server-only`, no clock
// (callers pass `now`). The lock is the PIN's own, never the sign-in lock.

export const PIN_LENGTH = 4;
/** Wrong tries in a row that lock PIN entry (Bryce, 2026-11-25). */
export const PIN_MAX_TRIES = 5;
/** How long PIN entry stays locked: 5 minutes. */
export const PIN_LOCK_MS = 5 * 60 * 1000;

const PIN_SHAPE = new RegExp(`^[0-9]{${PIN_LENGTH}}$`);

/** Exactly four ASCII digits, nothing else (no spaces, no full-width digits). */
export function isPinShaped(raw: unknown): raw is string {
  return typeof raw === "string" && PIN_SHAPE.test(raw);
}

/** Does this action need the PIN? Not asked, or the switch off, is open; asked and on with no PIN set is noPin. */
export function pinGate(asked: boolean, pinRequired: boolean, pinSet: boolean): "open" | "pin" | "noPin" {
  if (!asked || !pinRequired) return "open";
  return pinSet ? "pin" : "noPin";
}

/** Is PIN entry locked right now? A lock that ends exactly at `now` is over. */
export function pinLockActive(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

/** Has a lock run out, so the wrong-try count should go back to 0? */
export function pinLockEnded(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil.getTime() <= now.getTime();
}

/** Whole minutes for the words, rounded up and never below 1. */
export function pinMinutesFromMs(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60000));
}

/** Minutes left on a lock, for "Try again in N minutes". */
export function pinMinutesLeft(lockedUntil: Date, now: Date): number {
  return pinMinutesFromMs(lockedUntil.getTime() - now.getTime());
}

/** The `pinLockedUntil` to write after a wrong try: set once the new count reaches the limit, else null. */
export function pinLockAfterWrong(newFailCount: number, now: Date): Date | null {
  return newFailCount >= PIN_MAX_TRIES ? new Date(now.getTime() + PIN_LOCK_MS) : null;
}
