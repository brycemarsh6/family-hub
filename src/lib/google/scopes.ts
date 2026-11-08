// What Marshee asks Google for (mission 55). Pure, so node --test can import
// it. Google lists the scopes it granted in a space-separated string and may
// expand "email" to ".../auth/userinfo.email", so only the two calendar
// scopes are compared; the sign-in ones are not.

export const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events.owned",
];

export const GOOGLE_SCOPES = ["openid", "email", ...CALENDAR_SCOPES];

/** True only if the granted scope string holds every calendar scope. */
export function hasCalendarScopes(granted: string): boolean {
  const have = new Set(granted.split(/\s+/).filter(Boolean));
  return CALENDAR_SCOPES.every((scope) => have.has(scope));
}
