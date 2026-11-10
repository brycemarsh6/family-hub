# STRUCTURE.md companion: Calendar sync

Part of [STRUCTURE.md](../../STRUCTURE.md)'s "One source of truth" list,
cut from it word for word at commit e62056c on 2026-11-09 by mission 59.
Every rule here binds exactly like STRUCTURE.md; a second definition is a
BLOCKER. Each entry continues the headline kept in STRUCTURE.md.

## One source of truth

### Google calendar link, copying events to Google and bringing them back

  `src/lib/calendarSyncVocabulary.ts` (no imports, beside `constants.ts`
  under the `navMode.ts` precedent) is the only home of `SYNC_DIRECTIONS`,
  `ACCOUNT_STATUSES`, `SYNC_FAIL_REASONS`, `SYNC_ROW_STATUSES`, their labels,
  hints and repairers, `isReadOnlyRole` (the only test of whether Google's
  role lets Marshee write to a calendar), the Synced calendars page's words,
  the event form's and detail sheet's sync words, `linkErrorMessage` (the
  only wording for a callback `?error=` code), the pull's words
  (`PULL_WORDS`, `relinkLine`, `fromGoogleLine`, `lastCheckedLine`,
  `alreadySyncedThrough`), and Marshee's "For: ..." line both ways:
  `forLine` writes it and `withoutForLine` is the only code that strips it.
  `src/lib/tokenCryptoCore.ts` is pure, with the key passed in, and
  `src/lib/tokenCrypto.ts` (`server-only`) is the only reader of
  `TOKEN_ENCRYPTION_KEY`; nothing else encrypts or decrypts a stored Google
  token. In `src/lib/google/`, `oauth.ts` (`server-only`, no auth) is the only
  reader of `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` and the only caller
  of Google's auth endpoints; `calendarApi.ts` (`server-only`, no auth) is the
  only file that gives the Calendar API a real `fetch`.
  `calendarEventCalls.ts` is pure, takes `fetch` as a parameter (the
  `winnieEvents.ts` shape), holds the event insert, update, get, delete and
  list (with its page cap), and is imported only by `calendarApi.ts` and its
  own test. `eventPayload.ts` is pure and is the only mapping of a Marshee
  event to Google's shape and the only builder of a Google event id.
  `eventFromGoogle.ts` is pure and is the only mapping of a Google event back
  to Marshee's fields: `marsheeIdOf` is the only reader of the Marshee id a
  Google event carries back, and `textFromDescription` the only turning of a
  Google HTML description into text. `oauthState.ts`, `idToken.ts`,
  `redirectUri.ts` and `scopes.ts` are pure. `redirectUri.ts` is the only
  builder of the redirect URI, because Google compares it letter by letter
  and the start and return must match; a second copy is a BLOCKER.
  `src/lib/linkedCalendarWrites.ts` (`server-only`, no auth, no
  `revalidatePath`) is the domain write module and the only writer of
  `LinkedAccount` and `LinkedCalendar`, including a calendar's `syncToken`,
  its pull lease (`claimCalendarForPull`, one conditional update) and an
  account's `needs-relink`. Its callers are `actions/linkedCalendars.ts` and
  the callback route, each carrying its own gate, and `calendarEventPull.ts`,
  which runs only under a guarded caller. `src/lib/linkedCalendarsRead.ts`
  (`server-only`, no auth) is the only reader of both tables for pages,
  actions, routes and lib modules, including `loadSyncTargets`,
  `loadPushCalendars`, `loadPullCalendars`, `loadAccountCalendarIds`,
  `loadCalendarPullState` and `loadSiblingCalendars`;
  `loadSyncedCalendarsPage` never selects `encryptedRefreshToken`, and
  `loadRefreshToken` is the one read that decrypts. The exceptions are
  `EVENT_SYNC_SELECT` (a calendar's `name`) and `EVENT_SOURCE_SELECT` (a
  source calendar's `id` and `name`) in `calendarEventQuery.ts`, read through
  the relation, and nothing else of those tables; no other file filters or
  selects through a `linkedCalendar` relation. A second reader or writer is a
  BLOCKER (scoped `prisma/` scripts are outside this rule).
  **One link per Google calendar (mission-60, Bryce).** Two `LinkedCalendar`
  rows may share a `googleCalendarId` (a shared calendar linked by two
  people), but only one may be set to anything but "off". `canTurnOn` in
  `calendarSyncRules.ts` is the only home of that rule. `setCalendarDirection`
  in `actions/linkedCalendars.ts` checks it, through `loadSiblingCalendars`,
  before it writes, and any new code that turns a calendar on does the same;
  that action and `loadSyncedCalendarsPage` (`syncedThrough`, shown as
  `alreadySyncedThrough` on a row with no control) only pick which email to
  show. Because of the rule, the pull never reads another link's rows or
  adopts its events: a sibling lookup in the pull is a BLOCKER, and `runPull`'s
  once-per-`googleCalendarId` skip stays only as a guard. A new copy of the
  rule elsewhere is a BLOCKER. When a calendar is switched to "Both ways",
  `setCalendarDirection` hands the switched-off siblings' pulled events and
  sync rows to it through `adoptSiblingPulls` in `linkedCalendarWrites.ts`
  (one transaction; rows are moved, never copied, and `planHandover` picks
  which), so a handover never imports twice. `lastPulledOkAt` is set only by
  `saveSyncToken` and is what "Last checked" shows; `lastPulledAt` is the
  pull lease only.
  **The push (mission-56).** `src/lib/calendarSyncRules.ts` is pure (no `db`,
  no env read, no `server-only`) and is the only home of the sync decisions:
  `isPushable`, `startsTicked`, `cleanRequestedIds`, `busyColumn`,
  `tokenFailReason`, `sortedPersonNames`, `planSync` (with the source
  calendar kept and `exceptLinkedCalendarId` left out of create, update and
  remove), `canTurnOn`, `planHandover` and `raceWinner`. `src/lib/calendarSyncPlan.ts` is pure, with its
  Google calls, token source and row writes passed in as parameters, and is
  the only home of the push steps (`syncEventCopies`, `removeAllCopies`) and
  the 409, 412 and 404 handling.
  `src/lib/calendarEventPush.ts` (`server-only`, no auth, no `revalidatePath`)
  binds it to the real database and Google, and makes no decision beyond the
  "not configured" early returns and its guards for a missing row or a caught
  error. It and `calendarEventPull.ts` are the only writers of
  `CalendarEventSync`: the push for copies, the pull for the rows of pulled
  events (scoped `prisma/` scripts are outside this rule). Its guarded callers
  today are `actions/calendar.ts` and `calendarEventPull.ts`; like a domain
  write module it may have more, each carrying its own gate, and any new code
  path that writes a `CalendarEvent` calls it rather than re-implementing it.
  `exceptLinkedCalendarId` is passed only by the pull's push out, with the
  event's source calendar, so Google's original is never patched with
  Marshee's fields; a push back (Marshee won) passes none.
  **The pull (mission-60).** `src/lib/calendarSyncPull.ts` is pure (no `db`,
  no network, no clock: `now` is passed in) and is the only home of the pull
  decisions: `planPull` (inserts, updates, deletes, conflicts, skipped Google
  kinds, `pushOut`) and `PULL_SKIP_REASONS`. `src/lib/calendarPullRun.ts` is
  pure, with every database and Google call injected (`PullRunDeps`); it holds
  the steps in order, `PULL_WINDOW_DAYS`, `PULL_LEASE_MS`,
  `PULL_FORCE_LEASE_MS` and the once-per-Google-calendar guard, and never
  logs or returns a token. `src/lib/calendarEventPull.ts` (`server-only`, no
  auth, no `revalidatePath`) binds it to the database and Google, makes no
  decision, and through `pullCalendars` and `removePulledEvents` is the only
  writer of pulled events (a `CalendarEvent` with `sourceLinkedCalendarId`).
  Its guarded callers are `actions/calendarPull.ts`,
  `api/cron/calendar-pull/route.ts`, the unlink in `actions/linkedCalendars.ts`
  and the callback route; it may have more, each carrying its own gate. A
  copy of a pull decision, a second writer of pulled events, or a token in a
  log or an answer is a BLOCKER.
  `EVENT_SYNC_SELECT`, `EVENT_TICKED_SYNC_SELECT` (the edit form's ticks:
  `linkedCalendarId` only, never a `removing` row), `EVENT_SOURCE_SELECT` and
  `toEventSyncViews` in `calendarEventQuery.ts` are the only sync-row and
  source selects and view mapping for screens;
  `CalendarEventSyncView` is built field by field and never carries a Google
  id, an etag or `previousJson`. A second writer, a second view mapping or a
  copy of a push decision is a BLOCKER.
  **Dependency direction:** `src/lib/google/` imports only its own files, node
  built-ins and the pure `constants.ts`, `householdDate.ts` and
  `calendarSyncVocabulary.ts`, never `db`, `tokenCrypto.ts` or a `*Read` or
  `*Writes` module; a token reaches it as an argument.
  `calendarSyncRules.ts` imports only the vocabulary. `calendarSyncPlan.ts`
  and `calendarSyncPull.ts` import only the pure files of `src/lib/google/`,
  `calendarSyncRules.ts` and the vocabulary; `calendarPullRun.ts` imports only
  `calendarSyncPull.ts` and `google/types.ts`. None of these imports `db`, a
  `*Read` or `*Writes` module or a `server-only` file.
  `linkedCalendarsRead.ts` may import `calendarSyncRules.ts` and types from
  `calendarPullRun.ts`, never the reverse. `calendarEventPush.ts` is imported
  only by Server Actions and `calendarEventPull.ts`; `calendarEventPull.ts`
  only by Server Actions, the cron route and the callback route. Shared fakes
  for these tests live in `src/lib/testing/calendarSyncPlanHarness.ts`.
  `src/lib/google/*.test.ts` is in `package.json`'s test script and both CI
  timezone steps.
  (Added 2026-11-08, mission-55, on Captain's ruling; Bryce approved. Widened
  2026-11-09, mission-56, on Captain's ruling; Bryce approved. Widened
  2026-11-09, mission-60, on Captain's ruling; Bryce approved.) (Story:
  docs/history/structure-rationale.md, "One link per Google calendar".)
