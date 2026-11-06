// Remembers, on this device, the last day the confetti fired (decision 76 and
// 99: once a day per device). Plain localStorage rather than the database, the
// same idea as `lastStore.ts`: it is a per-device nicety no one else needs.
// Every access is wrapped, because private browsing can refuse storage; a
// failure just means the confetti may fire again, never an error page.
//
// There is no hook here on purpose: the only reader is an effect that must see
// the real value (not the server render's `null`), so it calls the getter.

const KEY = "marsh-hub:confetti-day";

/** The "YYYY-MM-DD" day the confetti last fired on this device, or null. */
export function getConfettiDay(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setConfettiDay(day: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, day);
  } catch {
    // Storage refused: the confetti may repeat on a reload, which is harmless.
  }
}
