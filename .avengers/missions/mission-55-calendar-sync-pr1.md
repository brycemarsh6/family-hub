# Mission 55: Calendar sync PR 1, link Google accounts

**Project:** family-hub (Marshee)
**Status:** BUILDING (Bryce approved the plan 2026-11-08)
**Started:** 2026-11-08 · **Updated:** 2026-11-08

Plan: `.avengers/plans/calendar-sync-v1.md` (read it first). Branch:
`claude/calendar-sync-v1-plan-7ee25b`, its own worktree, from `main` at
`375d14c`.

## Brief

- **Goal:** A parent can link one or more Google accounts to Marshee from
  Settings, see each account's calendars, set each calendar to "Not
  synced", "Marshee to Google only" or "Both ways", rename or unlink an
  account, with the Google refresh token encrypted at rest. Nothing syncs
  yet; this PR is the link and the storage, and it stops at the point that
  needs live Google credentials.
- **Done means:** With `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and
  `TOKEN_ENCRYPTION_KEY` set, a parent taps Settings → Synced calendars →
  Link a Google account, signs in at Google, and lands back on
  `/settings/calendars` seeing a card with that account's email and its
  calendars, all "Not synced"; changing a direction, renaming and Unlink
  work and persist; a second parent sees the card but gets "Only Bryce can
  change this account" on edit; with the env vars missing the page shows
  "Google sync isn't set up on this server yet" and no Google call is
  made; the Gauntlet passes. Without live credentials (this session), done
  means everything up to the Google sign-in is built and the feasibility
  test is written down for Bryce.
- **Out of scope:** pushing or pulling any event (PR 2, PR 3), the "Sync
  to" toggle, `CalendarEventSync`, tasks, attendees/RSVP, repeating series
  editing, Apple/iCloud, CD1 (PR #26), the Lists page, Winnie.
- **Order change recorded:** Bryce decided on 2026-11-08 that sync comes
  before the RSVP design and before repeating events, overriding
  `calendar-v2.md` ("RSVP must be settled before K6"). Google ids and etags
  are kept from PR 2 on so RSVP can be backfilled later.

## Danger register

From AGENTS.md, absolute for every agent:
- Never run `npm run db:seed` or `npm run db:reset`. Never write a
  clean/reset script for `User`.
- Never read, print or edit `.env`. Secrets live in `.env` and Vercel only.
  Bryce sets `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `TOKEN_ENCRYPTION_KEY` himself; no agent asks for their values in chat.
- Never log, return to the browser, or put in an error message a refresh
  token, access token, authorization code, client secret or the encryption
  key. Error text names the step, never the value.
- Migrations are additive only; the SQL is reviewed by Fury before it is
  applied. Fury alone runs `npx prisma migrate deploy` against the dev
  branch after review; no agent runs `prisma migrate dev` or `reset`.
- Never `git add -A` / `git add .`; stage by path; `git show --stat HEAD`
  after every commit. No direct push to `main`; branch → PR → Gauntlet →
  merge.
- The dev branch holds real family data; treat it as private.
- The callback route is public in `proxy.ts` by exact match only; the
  route's own session + state checks are the real gate.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`
- Record check: `node ~/.claude/skills/avengers/recordcheck.mjs`
- New: `src/lib/google/*.test.ts` joins `package.json`'s test script and
  both timezone steps in `.github/workflows/ci.yml` in the same commit as
  the first test file (AGENTS.md).

## Assembled

- Stark + Vision (always). Vision's pass is adversarial on the secrets
  path (encryption, state check, token never logged), like `/api/voice`.
- Banner: done (repo brief, 2026-11-08). A Sonnet research agent checked
  Google's docs (summary in the plan).
- Strange: yes, new Settings screens.
- Captain: yes, new tables, new lib modules, a new public route, auth.

## Bryce's setup (only Bryce can do these; plain clicks)

Do these in order. Nothing in the code needs them until step 6.

1. **Create the project.** Go to console.cloud.google.com, sign in with
   your personal Gmail (not Terros). Top-left project picker → New project
   → name it "Marshee" → Create. Make sure "Marshee" is the selected
   project before the next steps.
2. **Turn on the Calendar API.** Left menu → APIs & Services → Library →
   search "Google Calendar API" → open it → Enable.
3. **Consent screen.** Left menu → Google Auth platform → Branding (if it
   says not configured, Get started). App name "Marshee", support email
   your Gmail, audience **External**, contact email your Gmail, agree,
   Create.
4. **Scopes.** Google Auth platform → Data Access → Add or remove scopes.
   Tick these three (use the filter box):
   `.../auth/calendar.calendarlist.readonly`,
   `.../auth/calendar.events.owned`, and `.../auth/userinfo.email`.
   Update, then Save. Note which label Google shows beside the calendar
   scopes ("sensitive" is expected).
5. **Publish.** Google Auth platform → Audience → Publish app → Confirm.
   The status should read "In production". We leave it unverified on
   purpose (the plan explains why); when you link an account Google shows
   a one-time "Google hasn't verified this app" screen. Tap Advanced, then
   "Go to Marshee (unsafe)". That wording is Google's, and it is expected.
6. **OAuth client.** Google Auth platform → Clients → Create client →
   Application type **Web application** → name "Marshee web". Under
   Authorized redirect URIs add both, exactly:
   `http://localhost:3000/api/google/callback` and
   `https://family-hub-xi-fawn.vercel.app/api/google/callback`. Create.
   Copy the Client ID and the Client secret (download the JSON if offered;
   keep it out of the repo).
7. **Vercel.** Project → Settings → Environment Variables. Add
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (Production, Preview and
   Development). Add `TOKEN_ENCRYPTION_KEY` for Production only, generated
   in Terminal with your usual secret command (strip the newline):
   `node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))" | tr -d '\n' | pbcopy`
   then paste. Redeploy once the PR has merged.
8. **Local `.env`.** Add the same `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET` lines, and a separate dev `TOKEN_ENCRYPTION_KEY`
   made with the same command (a different key from production).
9. **Feasibility test (the gate).** Run the app locally, sign in as
   yourself, Settings → Synced calendars → Link a Google account, pick the
   **Terros** account. Pass: you come back to the page and see
   `bryce@terros...` with its calendars. Fail: Google shows "This app is
   blocked" or an `admin_policy_enforced` error; that means Terros's admin
   restricts third-party apps, and the work calendar needs the admin to
   allow "Marshee web" (give them the Client ID). Either way, tell the
   next chat the result; PR 2 is not started until this passes or we drop
   the work account from the plan.

## Fury's pre-dispatch checklist

Mechanical, because these are the failures that recur under load.

**Before writing a contract:**
- [ ] Grep what a file exports before forbidding it.
- [ ] No two parallel contracts may name the same file.
- [ ] Ask which file the fix actually lives in, not just where the symptom is.

**Before dispatching:**
- [ ] Run `node ~/.claude/skills/avengers/preflight.mjs <mission-file> <contract-id>` and read every line.
- [ ] The contract is written in the mission file, not only the prompt.
- [ ] Re-measure any number in the dispatch.
- [ ] Quote the real HEAD as the LAST thing before dispatch.

**After committing:** `git show --stat HEAD`.
**While a gate is running:** do not commit, do not dispatch a fix.
**Before handing over a record change:** `recordcheck.mjs`, read every REVIEW line.
**At the end of every report:** something is dispatched, or the report says why not.

## Contracts

Order: C1, then C2, then C3 and C4 in parallel (disjoint files), then gates.

### C1 - Tables, vocabulary and the encryption core
- **Status:** DONE (Stark; Fury re-ran the checks)
- **Objective:** Add `LinkedAccount` and `LinkedCalendar` to the schema
  with a hand-written additive migration, the sync vocabulary, and the
  AES-256-GCM token encryption split into a tested pure core and a
  `server-only` env reader.
- **Boundaries:** may touch: `prisma/schema.prisma` (append the two
  models and the `linkedAccounts LinkedAccount[]` back-relation on `User`
  only), new `prisma/migrations/20261113000000_linked_calendars/migration.sql`,
  new `src/lib/calendarSyncVocabulary.ts`, new `src/lib/tokenCryptoCore.ts`,
  new `src/lib/tokenCryptoCore.test.ts`, new `src/lib/tokenCrypto.ts`,
  new `src/lib/calendarSyncVocabulary.test.ts`.
  Must not touch: anything else; no `prisma migrate` command of any kind.
- **Spec:** models as in the plan's "Data model", PR 1 columns only
  (`syncToken` and `lastPulledAt` included as nullable now so PR 3 needs
  no migration for them). Strings, no enums. Vocabulary exports
  `SYNC_DIRECTIONS` (`"off" | "outbound" | "twoWay"`),
  `SYNC_DIRECTION_LABELS` ("Not synced", "Marshee to Google only",
  "Both ways"), `SYNC_DIRECTION_HINTS` (one short line each),
  `ACCOUNT_STATUSES` (`"ok" | "needs-relink"`), `isSyncDirection`,
  `toSyncDirection` (repairer), `SYNCED_CALENDARS_WORDS` (page title, row
  label "Synced calendars", "Link a Google account", "Unlink this
  account", the not-configured line "Google sync isn't set up on this
  server yet", the not-yours line "Only {name} can change this account").
  No imports in the vocabulary file. `tokenCryptoCore.ts`: `encryptToken(
  plain, key: Buffer): string` → `v1.<iv>.<tag>.<ct>` base64url with a
  fresh 12-byte iv per call; `decryptToken(stored, key): string` throws a
  typed `TokenCryptoError` (reason `format` | `auth`) on tampering or wrong
  key; `parseKey(base64: string): Buffer` requires exactly 32 bytes.
  `tokenCrypto.ts` (`server-only`): reads `TOKEN_ENCRYPTION_KEY` once,
  exports `isTokenKeyConfigured()`, `encryptSecret`, `decryptSecret`;
  never logs the key. Tests: round trip, wrong key fails with `auth`,
  flipped byte fails, bad prefix fails with `format`, two encryptions of
  the same text differ, `parseKey` rejects 31 and 33 bytes; vocabulary
  test pins the labels and the repairer.
- **Verification:** `npx prisma validate` → ok; `npx prisma generate` →
  ok; `npx tsc --noEmit` → clean; `npx eslint .` → clean; `npm test` →
  all pass with the new files counted; the migration SQL contains only
  `CREATE TABLE`, `CREATE INDEX`, `CREATE UNIQUE INDEX`, `ALTER TABLE ...
  ADD CONSTRAINT ... FOREIGN KEY` statements.
- **Evidence required:** the full migration SQL in the report; the test
  run output with the new test names; `wc -l` of each new file.
- **Done criteria:** Fury re-runs the verification, reads the SQL and
  compares it to `prisma migrate diff --from-schema-datamodel <main's
  schema> --to-schema-datamodel prisma/schema.prisma --script` output, then
  applies it to the dev branch with `npx prisma migrate deploy`.

### C2 - Google OAuth and the linked-calendar read/write modules
- **Status:** DONE (Stark; Fury re-ran the checks)
- **Objective:** Pure Google call wrappers (no auth) and the domain
  reader/writer for linked accounts and calendars.
- **Boundaries:** may touch: new `src/lib/google/oauth.ts`, new
  `src/lib/google/oauthState.ts`, new `src/lib/google/oauthState.test.ts`,
  new `src/lib/google/idToken.ts`, new `src/lib/google/idToken.test.ts`,
  new `src/lib/google/calendarApi.ts`, new `src/lib/google/types.ts`, new
  `src/lib/linkedCalendarWrites.ts`, new `src/lib/linkedCalendarsRead.ts`,
  `package.json` (the `test` script only: add the glob for test files in
  the new google directory),
  `.github/workflows/ci.yml` (both timezone test steps: the same glob).
  Must not touch: `prisma/`, `src/app/`, `src/components/`, `src/proxy.ts`.
- **Spec:** `oauth.ts` (`server-only`): `isGoogleConfigured()` (both env
  vars present), `googleAuthUrl({ state, redirectUri })` with scopes
  `openid email https://www.googleapis.com/auth/calendar.calendarlist.readonly
  https://www.googleapis.com/auth/calendar.events.owned`, `access_type=offline`,
  `prompt=consent`, `include_granted_scopes=true`; `exchangeCode({ code,
  redirectUri })` → `{ refreshToken, accessToken, idToken, scope }`;
  `refreshAccessToken(refreshToken)` → `{ accessToken, expiresIn }` or a
  typed `{ reason: "revoked" | "network" | "not-configured" }`;
  `revokeToken(token)`. `identityFromIdToken(idToken)` → `{ sub, email } |
  null` lives in pure `idToken.ts` (a `server-only` file cannot be imported
  by `node --test`), decoding the JWT payload (no signature check needed:
  it came straight from Google's token endpoint over TLS; say so in a
  comment). All network calls via
  `fetch` with a 10 s timeout; failure results never include response
  bodies that could carry tokens. `oauthState.ts` (pure): `newOauthState()`
  (32 random bytes base64url) and `oauthStatesMatch(a, b)` (constant time,
  length-safe); `STATE_COOKIE_NAME = "google_oauth_state"`,
  `STATE_TTL_SECONDS = 600`. `calendarApi.ts` (`server-only`):
  `listCalendars(accessToken)` → `{ id, summary, primary, backgroundColor,
  accessRole }[]` (follow `nextPageToken`). `linkedCalendarWrites.ts`
  (`server-only`, no auth, no `revalidatePath`): `saveLinkedAccount({
  userId, sub, email, scopes, encryptedRefreshToken })` upserting on
  `(userId, sub)`, `replaceCalendars(accountId, calendars)` keeping
  existing rows' `direction` by `googleCalendarId` and removing calendars
  Google no longer lists, `setCalendarDirection(calendarId, direction)`,
  `renameLinkedAccount(accountId, label | null)`, `unlinkAccount(accountId)`
  (delete the row; cascade removes calendars). `linkedCalendarsRead.ts`
  (`server-only`): `loadSyncedCalendarsPage()` → accounts with linker
  name (`User.displayName`), calendars ordered primary first then name,
  never the encrypted token; `loadAccountOwner(accountId)` →
  `{ userId } | null` and `loadCalendarOwner(calendarId)` for the actions'
  fresh membership check; `loadRefreshToken(accountId)` (decrypts via
  `tokenCrypto.ts`) for the callback/relink path only.
- **Verification:** `npx tsc --noEmit`, `npx eslint .`, `npm test` (the
  new `oauthState` tests appear), `grep -rn "@/app" src/lib/` empty,
  every new lib file except `oauthState.ts` starts with `import
  "server-only"`.
- **Evidence required:** test output, the grep output, `head -3` of each
  new file, the exact auth URL the builder generated with a dummy state
  (client id redacted) showing the scopes and the offline/consent params.
- **Done criteria:** Fury re-runs the commands; a unit test for
  `identityFromIdToken` with a hand-built unsigned JWT passes.

### C3 - The callback route, the proxy entry and the actions
- **Status:** DONE (Stark; Fury re-ran the checks)
- **Objective:** Start the link, receive Google's return, and expose the
  guarded actions for direction, rename and unlink.
- **Boundaries:** may touch: new `src/app/api/google/callback/route.ts`,
  `src/proxy.ts` (add the callback's exact path to `PUBLIC_ROUTES` only),
  new `src/app/actions/linkedCalendars.ts`. Must not touch: `src/lib/`
  (except importing), `src/components/`, `prisma/`.
- **Spec:** `startGoogleLink()` (guard a, `MANAGER_ROLES`, not devices):
  if `!isGoogleConfigured() || !isTokenKeyConfigured()` return `{ error:
  SYNCED_CALENDARS_WORDS.notConfigured }`; else make a state, set the
  httpOnly `google_oauth_state` cookie (secure in production, `sameSite:
  "lax"`, `maxAge` 600, `path: "/"`), return `{ url }`. Redirect URI is
  built from the request origin via `headers()` (`host` and
  `x-forwarded-proto`) so localhost and production both work with no extra
  env var. The callback `GET`: (1) `getVerifiedUser()`, manager role, else
  redirect `/settings/calendars?error=signin`; (2) read and clear the state
  cookie, compare with `?state` via `oauthStatesMatch`, else `?error=state`;
  (3) if `?error` from Google (e.g. `access_denied`,
  `admin_policy_enforced`) redirect with `?error=<that code>` (allowlisted
  characters only); (4) exchange the code, decode identity, encrypt the
  refresh token, `saveLinkedAccount`, `listCalendars` with the fresh access
  token, `replaceCalendars`; (5) `revalidatePath("/settings/calendars")`
  and redirect `?linked=<accountId>`. No token or code appears in any log,
  URL or error. `setCalendarDirection(calendarId, direction)`,
  `renameLinkedAccount(accountId, label)`, `unlinkAccount(accountId)`: guard
  a + `MANAGER_ROLES`, then the owner check reading
  `loadCalendarOwner`/`loadAccountOwner` fresh; a non-owner gets `{ error }`
  built from the not-yours line with the owner's name. `unlinkAccount`
  calls `revokeToken` best-effort (ignore failure) before deleting. Each
  action calls `revalidatePath("/settings/calendars")` and
  `revalidatePath("/settings")`.
- **Verification:** `npx tsc --noEmit`, `npx eslint .`, `npm test`; with
  the dev server up and no Google env vars, `curl -i
  http://localhost:3000/api/google/callback?state=x&code=y` without a
  session → 302 to `/login` from proxy is NOT the expected outcome (it is
  public); expected: 302 to `/settings/calendars?error=signin`. The
  signed-in paths (wrong state gives `?error=state`, and so on) cannot be
  curled without a session, so the gates check them by reading the route
  and in the running app. A failed exchange maps to `?error=exchange`, or
  `?error=no-refresh-token` for that `exchangeCode` reason.
- **Evidence required:** the curl outputs; `grep -n "console\." src/app/api/google/callback/route.ts` showing no log line prints a variable from the token exchange.
- **Done criteria:** Fury re-runs the curls and reads the route top to bottom.

### C4 - The Synced calendars page, its components and the Settings row
- **Status:** DONE (Stark; Fury re-ran the checks)
- **Objective:** The screens from Mock A.
- **Boundaries:** may touch: new `src/app/(app)/settings/calendars/page.tsx`,
  new `src/app/(app)/settings/calendars/loading.tsx`, new
  `src/components/SyncedCalendarsList.tsx`, new
  `src/components/LinkedAccountCard.tsx`, `src/app/(app)/settings/page.tsx`
  (one new row), `.env.example` (three commented names), `README.md` (one
  short "Google sync" paragraph naming the env vars),
  `src/lib/calendarSyncVocabulary.ts` and its test (the page's error words
  live there), new `prisma/seed-linked-calendars.ts`, new
  `prisma/clean-linked-calendars.ts`, `package.json` (two `db:` script
  lines only). Must not touch:
  `src/app/actions/`, `src/app/api/`, `src/proxy.ts`, `prisma/`.
- **Spec:** page: `requireRole(...MANAGER_ROLES)`, `BackLink href="/settings"
  label="Settings"`, title from the vocabulary, reads
  `loadSyncedCalendarsPage()` plus `isGoogleConfigured() &&
  isTokenKeyConfigured()` as a boolean prop. Shows `?linked=` as a quiet
  success line and `?error=` as a `text-warn` line with a next step
  (`state`: "That link expired. Try again."; `signin`: "Sign in to Marshee
  first, then link."; `access_denied`: "Google didn't allow it. Try
  again."; `admin_policy_enforced`: "Your work's Google admin has blocked
  Marshee. Ask them to allow it, or link a personal account.";
  `exchange`: "Google didn't finish the link. Try again.";
  `no-refresh-token`: "Google didn't give Marshee lasting access. Try
  again."; anything
  else: "Google returned an error ({code}). Try again."). Cards: email
  (or label with email under it), "linked by {name}", collapsed summary
  ("2 calendars, 1 both ways"), tap to expand; each calendar row 56px+
  with name and the direction label, tap opens `RadioSheet` with the three
  directions and their hints (owner only; others see the row with no
  chevron and the not-yours line once at the card bottom); "Rename"
  opens `TitleSheet`; "Unlink this account" is one tap, `text-danger`,
  waits for the server (destructive, not optimistic). Direction changes
  are optimistic via `useOptimisticRun`. 44px floor everywhere. Not
  configured: the Link button is replaced by the not-configured line. Empty
  state via `EmptyState` ("No calendars linked yet"). Settings row: for
  non-device managers, a `Link` to `/settings/calendars` styled like the
  Manage family row, label "Synced calendars". Lucide `CalendarSync` or
  `CalendarCog` icon.
- **Verification:** `npx tsc --noEmit`, `npx eslint .`, `npm test`, `npm run build`.
  A browser check needs a signed-in session, so screenshots move to
  Strange. The seed script makes two fake accounts (googleSubject starting
  `zz-m55-`, one per manager, a fake non-decryptable token) on the dev
  branch only, and the clean script removes only rows with that prefix.
- **Evidence required:** command output, `wc -l` of each component
  (soft cap 350).
- **Done criteria:** Fury opens the page in the preview and taps through.

### C5 - Gate fixes, pass 1 (everything that does not wait on Bryce)
- **Status:** DONE
- **Objective:** Fix Captain's code blockers, Strange's contrast blocker, and the gate notes worth fixing before the first real link.
- **Boundaries:** may touch: `src/app/api/google/callback/route.ts`, `src/app/actions/linkedCalendars.ts`, new `src/lib/google/redirectUri.ts`, new `src/lib/google/redirectUri.test.ts`, new `src/lib/google/scopes.ts`, new `src/lib/google/scopes.test.ts`, `src/lib/google/oauth.ts`, `src/lib/tokenCryptoCore.ts`, `src/lib/tokenCryptoCore.test.ts`, `src/lib/tokenCrypto.ts`, `src/lib/linkedCalendarWrites.ts`, `src/lib/linkedCalendarsRead.ts`, `src/lib/calendarSyncVocabulary.ts`, `src/lib/calendarSyncVocabulary.test.ts`, `src/components/LinkedAccountCard.tsx`, `src/components/RadioSheet.tsx`, `src/app/(app)/settings/calendars/page.tsx`, `prisma/seed-linked-calendars.ts`, `README.md`, `.env.example`, `AGENTS.md`. Must not touch: `STRUCTURE.md`, `src/proxy.ts`, `prisma/schema.prisma`, `prisma/migrations/`, `src/components/SyncedCalendarsList.tsx`.
- **Spec:**
  1. Captain: delete both `revalidatePath` calls and the import from the callback route (every `(app)` page is dynamic). New pure `redirectUri.ts` per Captain: `GOOGLE_CALLBACK_PATH`, `requestOriginFrom(host, forwardedProto)`, `googleRedirectUri(origin)`, with tests (localhost and 127.0.0.1 give http, a production host gives https, a comma list uses its first entry, a junk proto falls back, a null host gives null). Route and action each read `headers()` and pass the values in; no copy remains.
  2. Captain: a comment above `refreshAccessToken`: dormant until PR 2 of `calendar-sync-v1.md`, where the outbound push fetches an access token with it. Seed: `orderBy: [{ createdAt: "asc" }, { id: "asc" }]` and name `npm run db:bootstrap-users` in the error. `AGENTS.md`: add the google glob to the direct UTC command and correct "four-directory" to five. Fix the two wrong comments (`linkedCalendarsRead.ts` near `loadRefreshToken`, `linkedCalendarWrites.ts` header). Add `toAccountStatus` beside `toSyncDirection` and use it in the reader. Stop exporting `GOOGLE_SCOPES` if it moves (see 4).
  3. Strange: `text-muted` becomes `text-muted-strong` on the card's text lines inside pressable rows. `RadioSheet` gains optional `hint?: string` per option, under the label in `text-sm font-normal text-muted`, wrapping; the card passes `SYNC_DIRECTION_HINTS[value]` and the hint line under each calendar name goes. The card title is always the email, with the muted line under it ("Work, linked by Bryce"), so the label stops appearing twice. Unlink gets its own `useOptimisticRun` so a direction change does not dim it.
  4. Vision note 1: new pure `scopes.ts` with `GOOGLE_SCOPES`, `CALENDAR_SCOPES` (the two calendar ones) and `hasCalendarScopes(granted: string)`, with tests. Google expands `email` to `userinfo.email` in its answer, so compare only the calendar scopes. In the callback: if the granted scope string lacks them, redirect `?error=calendars` **before** saving, so a narrower re-link cannot overwrite a good token. If `listCalendars` or `replaceCalendars` fails after saving, redirect `?error=calendars` too (the saved account stays). `linkErrorMessage("calendars")`: "Google didn't share this account's calendars. Unlink it if it shows here, then try again and leave every box ticked."
  5. Vision notes 5, 6, 7, 10, 11: `parseKey` rejects anything but strict standard base64 of exactly 32 bytes (test: the 43-character passphrase is refused). `tokenCrypto.ts` caches only a good key, never the absence of one. The page shows `?error=` through the same strict shape as the callback, otherwise treats it as `google`. `replaceCalendars` gets an explicit 15000 ms transaction timeout. README and `.env.example` say the two Google values go in Vercel and local `.env`, and `TOKEN_ENCRYPTION_KEY` has one value per environment.
- **Verification:** `npx tsc --noEmit`, `npx eslint .`, `npm test`, `npm run build`; `grep -rn "x-forwarded-proto" src` hits only the two callers passing the header; `grep -n revalidatePath src/app/api/google/callback/route.ts` is empty.
- **Evidence required:** command output and the new test names.
- **Done criteria:** Fury re-runs the commands; Captain and Strange re-gate.
- **Waits on Bryce (C6, not in this contract):** the "Syncing isn't on yet" line, the outbound hint wording, the "1 syncing" summary, Captain's STRUCTURE.md amendments.
- **Report:** DONE at `2e8b263`. Fury re-ran `npx tsc --noEmit` (clean) and `npm test` (1483 pass, 0 fail).

### C6 - Bryce's three wording decisions
- **Status:** DONE
- **Objective:** Make the screen honest that syncing has not started, using the three wordings Bryce approved on 2026-11-08.
- **Boundaries:** may touch: `src/lib/calendarSyncVocabulary.ts`, `src/lib/calendarSyncVocabulary.test.ts`, `src/components/SyncedCalendarsList.tsx`, `src/components/LinkedAccountCard.tsx`. Must not touch: `STRUCTURE.md`, `prisma/schema.prisma`, `prisma/migrations/`, `src/proxy.ts`, `src/app/api/google/callback/route.ts`, `src/app/actions/linkedCalendars.ts`.
- **Spec:**
  1. New key `syncNotOn` in `SYNCED_CALENDARS_EXTRA_WORDS`: exactly "Syncing isn't on yet. Your choices are saved for when it starts." In `SyncedCalendarsList.tsx`, render it as a `text-sm text-muted` paragraph directly above the `ownerOnlyNote` paragraph, only when `accounts.length > 0`.
  2. `SYNC_DIRECTION_HINTS.outbound` becomes exactly "Events you choose to sync are copied to this calendar."
  3. `calendarsSummary(count, syncing)`: the second parameter is renamed and the phrase becomes `${syncing} syncing`, so "2 calendars, 1 syncing". Its doc comment follows. In `LinkedAccountCard.tsx` the count is every calendar whose direction is not "off" (both "outbound" and "twoWay"); rename the local to `syncing`.
  4. Update the tests to the new words. Add one test that an account with one outbound and one two-way calendar reads as 2 syncing, if that can be asserted against pure code; otherwise assert `calendarsSummary(2, 2)` and say so in the report.
- **Verification:** `npx tsc --noEmit`, `npx eslint .`, `npm test`; `grep -rn "both ways" src/lib/calendarSyncVocabulary.ts` hits only the `twoWay` label ("Both ways" is matched case-insensitively if you add `-i`).
- **Evidence required:** command output and the changed lines.
- **Done criteria:** Fury re-runs the commands; Strange sees the line and the summary on the running page.
- **Report:** DONE. The "one outbound plus one two-way" count lives inline in the card (from its optimistic state), so it has no pure test; `calendarsSummary(2, 2)` is asserted instead, as the contract allowed. Strange checks the real count on the page. STRUCTURE.md's three amendments and the story line were written by Fury alongside this contract, after Bryce approved them on 2026-11-08.

### C7 - Gate fixes, pass 2
- **Status:** DONE
- **Objective:** Fix Captain's two blockers and Strange's contrast blocker from pass 2, plus two small notes from Vision.
- **Boundaries:** may touch: `src/app/api/google/callback/route.ts`, `src/components/RadioSheet.tsx`, `src/lib/tokenCryptoCore.test.ts`, `src/lib/tokenCrypto.ts`. Must not touch: `STRUCTURE.md`, `src/proxy.ts`, `prisma/schema.prisma`, `prisma/migrations/`, `src/lib/calendarSyncVocabulary.ts`, `src/app/actions/linkedCalendars.ts`.
- **Spec:**
  1. Captain, callback route: `getVerifiedUser()` becomes the first lib call in `GET`, directly after the state cookie is read and deleted. Only then compute the origin and define `back`, then run the refusal check. Compute the origin once and use that one value both for `back` (falling back to `request.nextUrl.origin`) and for the redirect URI check; the second `requestOrigin()` call goes. The cookie is still cleared before either check, and no outcome changes.
  2. Captain, callback route: success returns `back("linked=1")`. `accountId` stays for `replaceCalendars`. This corrects C3, which named `?linked=<accountId>`; the page only tests whether `linked` is present. Confirm that by reading `src/app/(app)/settings/calendars/page.tsx`, which is read-only here.
  3. Strange, `RadioSheet.tsx`: on the hint span, `text-muted` becomes `text-muted-strong`.
  4. Vision note 4, `tokenCryptoCore.test.ts`: the test named for the 43-character passphrase uses a 42-character string. Use `correct-horse-battery-staple-correct-horse1`, which is 43, and confirm the length in your report.
  5. Vision note 6, `tokenCrypto.ts`: the comment that fixing the setting "never needs a restart" holds only for a missing or bad key. Reword it to say that replacing one good key with another takes effect on restart or redeploy. Comment only.
- **Verification:** `npx tsc --noEmit`, `npx eslint .`, `npm test`; `grep -n "accountId" src/app/api/google/callback/route.ts` shows no use inside a redirect.
- **Evidence required:** command output and the new order of the first lines of `GET`.
- **Done criteria:** Fury re-runs the commands; Captain and Strange confirm pass 3 on those lines.
- **Report:** DONE. `getVerifiedUser()` is the first lib call in `GET`; one origin computation; success is `linked=1`; hint is `text-muted-strong`; the test string is 43 characters. Pass 3 waits on Bryce's answer about "1 set to sync".
- **Follow-up, 2026-11-08:** Bryce chose "2 calendars, 1 set to sync" over "1 syncing", after Strange pointed out the clash with "Syncing isn't on yet". A one-phrase edit Fury made directly in `calendarSyncVocabulary.ts`, its test and the local name in `LinkedAccountCard.tsx`, then gated in pass 3.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | PASS | none | 16 notes; the ones not fixed in C5 are listed under Deliberate leftovers |
| 1 | Strange | BLOCKED | Screen claims syncing that does not exist yet (Bryce's wording); pressed-row contrast 4.33:1 | RadioSheet hints, card title, summary |
| 1 | Captain | BLOCKED | Callback shape needs an amendment; `revalidatePath` in the route; two redirect-URI copies; `refreshAccessToken` dormant with no comment; seed people rule | AGENTS.md glob, `toAccountStatus`, comments |
| 2 | Vision | PASS | none | 9 notes; notes 1 and 2 are the same two lines as Captain's blockers |
| 2 | Strange | BLOCKED | RadioSheet hint 4.33:1 on a pressed row, light theme | "1 syncing" sits above "Syncing isn't on yet" (asked Bryce) |
| 2 | Captain | BLOCKED | Callback runs a lib call before the guard; success redirect carries a database id | All five pass 1 blockers closed |

## Handoff log

- 2026-11-08: Chat opened on Fable. Banner's repo brief and a Sonnet
  research pass on Google's docs done. Bryce approved all eight interview
  recommendations (plan file). Plan and this mission written; awaiting
  Bryce's approval, then the chat switches to Opus 5.5 for the build.
- 2026-11-08: Bryce approved; build on Opus 5.5. C1 to C4 done. Migration
  `20261113000000_linked_calendars` matched `prisma migrate diff` word for
  word and was applied to dev after the `ep-hidden-pine-` host check.
  Preflight false alarms, recorded rather than absorbed: the schema file's
  hard cap (STRUCTURE.md exempts it by name), and two boundary strings that
  were not paths (reworded). Fake accounts (`zz-m55-`) are on dev for
  Strange; remove with `npm run db:clean-linked-calendars` before delivery.
  Gates next.

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** Before PR 2: two parents linking the same Google account (one Unlink revokes both, and events could push twice); store each calendar's `accessRole` so reader-only calendars cannot be set to sync. Low risk, left open: the state cookie is not tied to the Marshee user who started the link; a deactivated parent's account cannot be unlinked; Google sign-in from the installed home-screen app is unproven, so Bryce tries it after merge. iPad landscape width for Settings stays on L6.
