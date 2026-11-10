# STRUCTURE.md companion: Calendar sync

Part of [STRUCTURE.md](../../STRUCTURE.md)'s "One source of truth" list,
cut from it word for word at commit e62056c on 2026-11-09 by mission 59.
Every rule here binds exactly like STRUCTURE.md; a second definition is a
BLOCKER. Each entry continues the headline kept in STRUCTURE.md.

## One source of truth

### Google calendar link and copying events to Google

`src/lib/calendarSyncVocabulary.ts` (no imports, beside
  `constants.ts` under the `navMode.ts` precedent) is the only home of
  `SYNC_DIRECTIONS`, `ACCOUNT_STATUSES`, `SYNC_FAIL_REASONS`,
  `SYNC_ROW_STATUSES`, their labels, hints and repairers, `isReadOnlyRole`
  (the only test of whether Google's role lets Marshee write to a calendar),
  the Synced calendars page's words, the event form's and detail sheet's sync
  words and `linkErrorMessage`, the only wording for a callback `?error=`
  code. `src/lib/tokenCryptoCore.ts` is pure, with the key passed in, and
  `src/lib/tokenCrypto.ts` (`server-only`) is the only reader of
  `TOKEN_ENCRYPTION_KEY`; nothing else encrypts or decrypts a stored Google
  token. In `src/lib/google/`, `oauth.ts` (`server-only`, no auth) is the only
  reader of `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` and the only caller
  of Google's auth endpoints; `calendarApi.ts` (`server-only`, no auth) is the
  only file that gives the Calendar API a real `fetch`.
  `calendarEventCalls.ts` is pure, takes `fetch` as a parameter (the
  `winnieEvents.ts` shape), holds the event insert, update, get and delete,
  and is imported only by `calendarApi.ts` and its own test. `eventPayload.ts`
  is pure and is the only mapping of a Marshee event to Google's shape and
  the only builder of a Google event id. `oauthState.ts`, `idToken.ts`,
  `redirectUri.ts` and `scopes.ts` are pure. `redirectUri.ts` is the only
  builder of the redirect URI, because Google compares it letter by letter
  and the start and return must match; a second copy is a BLOCKER.
  `src/lib/linkedCalendarWrites.ts` (`server-only`, no auth, no
  `revalidatePath`) is the domain write module and the only writer of
  `LinkedAccount` and `LinkedCalendar`; its callers are
  `actions/linkedCalendars.ts` and the callback route, each carrying its own
  gate. `src/lib/linkedCalendarsRead.ts` (`server-only`, no auth) is the only
  reader of both tables for pages, actions, routes and lib modules, including
  `loadSyncTargets` and `loadPushCalendars`; `loadSyncedCalendarsPage` never
  selects `encryptedRefreshToken`, and `loadRefreshToken` is the one read that
  decrypts. The one exception is `EVENT_SYNC_SELECT` in
  `calendarEventQuery.ts`, which reads a calendar's `name` through the
  relation and nothing else of those tables. A second reader or writer is a
  BLOCKER (scoped `prisma/` scripts are outside this rule).
  **The push (mission-56).** `src/lib/calendarSyncPlan.ts` is pure: no `db`,
  no env read, no `server-only`, with its Google calls, token source and row
  writes passed in as parameters. It is the only home of the push decisions:
  `isPushable`, `startsTicked`, `planSync`, and the 409, 412 and 404 handling.
  `src/lib/calendarEventPush.ts` (`server-only`, no auth, no `revalidatePath`)
  binds it to the real database and Google, makes no decision beyond the "not
  configured" early returns and its guards for a missing row or a caught
  error, and is the only writer of `CalendarEventSync` (scoped `prisma/`
  scripts are outside this rule).
  Its guarded caller today is `actions/calendar.ts`; like a domain write
  module it may have more, each carrying its own gate, and any new code path
  that writes a `CalendarEvent` calls it rather than re-implementing it.
  `EVENT_SYNC_SELECT`, `EVENT_TICKED_SYNC_SELECT` (the edit form's ticks:
  `linkedCalendarId` only, never a `removing` row) and `toEventSyncViews` in
  `calendarEventQuery.ts` are the only sync-row selects and view mapping for
  screens;
  `CalendarEventSyncView` is built field by field and never carries a Google
  id, an etag or `previousJson`. A second writer, a second view mapping or a
  copy of a push decision is a BLOCKER.
  **Dependency direction:** `src/lib/google/` imports only its own files, node
  built-ins and the pure `constants.ts`, `householdDate.ts` and
  `calendarSyncVocabulary.ts`, never `db`, `tokenCrypto.ts` or a `*Read` or
  `*Writes` module; a token reaches it as an argument. `calendarSyncPlan.ts`
  imports only the pure files of `src/lib/google/` and the vocabulary.
  `linkedCalendarsRead.ts` may import `calendarSyncPlan.ts`, never the
  reverse, and `calendarEventPush.ts` is imported only by Server Actions.
  `src/lib/google/*.test.ts` is in `package.json`'s test script and both CI
  timezone steps.
  (Added 2026-11-08, mission-55, on Captain's ruling; Bryce approved. Widened
  2026-11-09, mission-56, on Captain's ruling; Bryce approved.)
