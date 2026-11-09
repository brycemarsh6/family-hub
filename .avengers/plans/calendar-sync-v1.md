# Calendar sync v1: Google Calendar, two way

Written 2026-11-08. This is the plan for phases K6 and K7 of
`calendar-v1.md` / `calendar-v2.md`, in three PRs. Decisions here were made
with Bryce on 2026-11-08 (the interview in the first sync chat). Mission
files record what each PR actually shipped.

## What changed in the order of work

The old plans said RSVP (per-person accept/decline) and repeating events
(K4) must come before Google sync. **Bryce overrode that on 2026-11-08:
sync comes first.** RSVP arrives later as an additive migration; to make
that backfill possible, every synced event keeps its Google event id and
etag from day one, so a one-time re-pull can fill in attendee answers.
Repeating Google events arrive as separate single events (Google expands
them when asked with `singleEvents=true`); "edit the whole series" waits
for the repeating-events build.

## Decisions settled with Bryce (2026-11-08)

Earlier decisions (calendar-v1.md "Decisions settled", items 3 to 5) still
hold: each parent links their own Google account(s), as rows under a User;
direction is per linked calendar; sync is chosen per event with a "Sync to"
toggle list; any parent may push to any linked calendar using its owner's
token; `createdById` is always recorded and shown; kids' events live only
in Marshee; Apple/iCloud is skipped.

New this plan:

1. **The Google app is published "In production" and left unverified.**
   Google's docs: an app in "Testing" status gets refresh tokens that die
   after 7 days; a published, unverified app is allowed for personal use
   (100 users lifetime cap, a one-time "unverified app" warning per account
   that the person clicks past). No formal review.
2. **Narrow scopes.** `calendar.calendarlist.readonly` (see which calendars
   exist) plus `calendar.events.owned` (read and write events on calendars
   the person owns), plus `openid email` to label the account. Widen to
   `calendar.events` only if the feasibility test shows a calendar someone
   needs is shared with them rather than owned.
3. **Page shape.** A Settings row "Synced calendars" (parents and admins,
   not kids, not the tablet) opens `/settings/calendars`. Each linked
   account is a card: email, optional nickname, "linked by <name>",
   expanding to one row per Google calendar with its direction, then
   "Unlink this account".
4. **Everyone's accounts show; only the linker edits.** Every parent sees
   every linked account (PR 2 lets anyone push to any of them), but
   direction changes, renaming and Unlink are allowed only for the person
   who linked it. The check reads the account row fresh (membership guard
   form).
5. **Direction words and default.** Per calendar: "Not synced",
   "Marshee to Google only", "Both ways". After linking, every calendar is
   "Not synced" until switched on, so a work account never pulls its
   meetings into Marshee by accident.
6. **Delete and unlink.** Deleting an event in Marshee deletes its Google
   copies on every calendar it was synced to (PR 2). Unlinking an account
   keeps every Marshee event and every Google copy; only the connection and
   the stored token go.
7. **Imported events' people.** An event pulled from a personal calendar is
   "for" the account's owner and reads "Added by <owner>"; people can be
   added in Marshee afterward (PR 3).
8. **First-version scope.** Events only (no tasks). Fields carried: title,
   start/end, all-day, location, notes, who it is for. No guest lists, no
   accept/decline. Outgoing events carry no attendees.
9. **Conflicts: last write wins, and the loser is recorded** (PR 3 keeps
   the previous values in the sync row so nothing is silently lost).

## Google facts that shape the design (checked 2026-11-08)

Sources: developers.google.com (OAuth 2.0, Calendar API reference, sync
guide), support.google.com/cloud. The research brief is summarized here;
re-check before PR 3 since Google renames things.

- Refresh tokens: need `access_type=offline` and `prompt=consent`. Up to
  100 refresh tokens per account per client; the oldest is silently
  dropped. Calendar-only tokens survive a password change. Revoke with
  `POST https://oauth2.googleapis.com/revoke`.
- Redirect URIs must match exactly; `http://localhost:3000/...` is allowed,
  production must be https, no wildcards. Vercel preview URLs change per
  deploy, so only localhost and the production URL are registered.
- A Google Workspace admin can block third-party apps per app or set
  Calendar to "Restricted". Not blocked by default. If blocked, the sign-in
  shows an `admin_policy_enforced` error, so the feasibility test settles it
  on day one.
- `events.list` with `singleEvents=true` returns each occurrence of a
  repeating event as its own event; `orderBy=startTime` needs it.
- Incremental sync: `nextSyncToken` arrives on the last page of a full
  list; later calls pass `syncToken` with the same other parameters and
  always include cancelled events. A `410` means start over with a full
  list. `syncToken` cannot be combined with `timeMin`/`timeMax`,
  `orderBy`, `q` or the extended-property filters. The sync guide's own
  example limits only the first full list with `timeMin`; whether a
  `syncToken` call then accepts the same `timeMin` is in tension between
  two Google pages. **PR 3 tests it on the dev branch before choosing.**
- All-day events: `start.date` / `end.date` as `YYYY-MM-DD`, end
  exclusive. That matches Marshee's stored shape (UTC midnight, exclusive
  end) via `calendarDateFromUtcMidnight` / `utcMidnightInstant`.
  **The schema comment at `CalendarEvent` still says "local midnight"; the
  code (`calendarDates.ts`) writes UTC midnight. Follow the code; PR 2
  fixes the comment.**
- Timed events: `start.dateTime` with an offset, plus `timeZone`
  (`HOUSEHOLD_TIME_ZONE`).
- We may set our own event `id` (lowercase a-v and 0-9, 5 to 1024 chars) and
  tag events with `extendedProperties.private` (key `marsheeEventId`).
- Etag: send `If-Match` on update/delete; `412` means Google changed first.
- Quotas: 10,000 requests per minute per project, 600 per user per minute,
  far above a family's use. Free today; Google has announced charges for
  exceeding limits later in 2026.

## Data model (additive migrations only)

PR 1:

```
LinkedAccount
  id, userId (→ User, Cascade), provider "google", googleSubject (stable
  account id from the id token), email, label?, encryptedRefreshToken,
  keyVersion Int (1), scopes, status "ok" | "needs-relink", linkedAt,
  lastCheckedAt?, createdAt, updatedAt
  @@unique([userId, googleSubject])

LinkedCalendar
  id, accountId (→ LinkedAccount, Cascade), googleCalendarId, name,
  colorHex?, isPrimary, direction "off" | "outbound" | "twoWay" (default
  "off"), syncToken? (PR 3), lastPulledAt? (PR 3), createdAt, updatedAt
  @@unique([accountId, googleCalendarId])
```

PR 2 adds `CalendarEventSync (eventId → CalendarEvent Cascade,
linkedCalendarId → LinkedCalendar Cascade, googleEventId, etag,
lastPushedAt, lastPulledAt?, previousJson?)` with
`@@unique([eventId, linkedCalendarId])`. PR 3 adds
`CalendarEvent.sourceLinkedCalendarId?`.

No Prisma enums: direction and status are strings checked by
`calendarSyncVocabulary.ts`.

## Secrets and the token at rest

Env vars (Vercel; local `.env` for the two Google values only):
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`
(32 random bytes, base64, set in Vercel only; a dev key may live in local
`.env`). No agent edits `.env`; `.env.example` lists the names.

Refresh tokens are encrypted with AES-256-GCM (`node:crypto`), stored as
`v1.<iv>.<tag>.<ciphertext>` (base64url). The pure core
(`tokenCryptoCore.ts`) takes the key as an argument and is unit tested;
`tokenCrypto.ts` (`server-only`) reads the env var once. `keyVersion` on the
row allows a later key rotation. When any of the three env vars is
missing, the Link button shows "Google sync isn't set up on this server
yet" and no Google call is made (the `winnieNotify` "not-configured"
pattern). Access tokens are never stored; they are fetched per request from
the refresh token and live only in memory.

## Modules (follow STRUCTURE.md's guarded-action / pure-call split)

- `src/lib/calendarSyncVocabulary.ts` (no imports): directions, their
  labels and one-line hints, account statuses, the page's words.
- `src/lib/tokenCryptoCore.ts` (pure) and `src/lib/tokenCrypto.ts`
  (`server-only`).
- `src/lib/google/oauth.ts` (`server-only`, no auth): auth URL, code
  exchange, refresh, revoke, id-token decode for `sub` and `email`.
  `src/lib/google/oauthState.ts` (pure): make and check the one-time state.
  `src/lib/google/calendarApi.ts` (`server-only`, no auth): `listCalendars`
  in PR 1; events calls in PR 2 and PR 3. Plain `fetch`, no Google SDK.
- `src/lib/linkedCalendarWrites.ts` (`server-only`, domain write module):
  `saveLinkedAccount`, `replaceCalendars`, `setCalendarDirection`,
  `renameLinkedAccount`, `unlinkAccount`. `src/lib/linkedCalendarsRead.ts`
  (`server-only`): the only reader of both tables for pages and actions.
- `src/app/actions/linkedCalendars.ts` (guard form a, `MANAGER_ROLES`):
  `startGoogleLink` (returns the Google URL and sets the state cookie),
  `setCalendarDirection`, `renameLinkedAccount`, `unlinkAccount`. The last
  three also require the caller to be the row's linker (read fresh).
- `src/app/api/google/callback/route.ts`: the OAuth return. Exact entry in
  `PUBLIC_ROUTES`. Order inside: session (`getVerifiedUser`, manager role)
  → state cookie matches `state` query → exchange code → fetch calendars →
  save → redirect to `/settings/calendars` with `?linked=` or `?error=`.
  Never logs tokens.
- `src/app/(app)/settings/calendars/page.tsx` (`requireRole(...MANAGER_ROLES)`,
  `BackLink` to Settings) with `SyncedCalendarsList.tsx`,
  `LinkedAccountCard.tsx`; direction picked with `RadioSheet`, nickname
  with `TitleSheet`, Unlink one tap (house rule). Settings row on
  `/settings` beside Manage family.

## PR split (one chat per PR)

1. **PR 1, link accounts** (mission 55): schema, encryption, OAuth link
   and callback, Synced calendars page, directions, rename, unlink. Stops
   where live Google credentials are needed; Bryce's feasibility test
   follows (link the Terros work account).
2. **PR 2, outbound**: `CalendarEventSync`, the "Sync to" toggle in the
   event form (creator's own "Both ways" calendars pre-ticked, outbound
   never pre-ticked), push on create/update/delete, etag handling,
   per-event sync status in the detail sheet, the schema comment fix.
3. **PR 3, inbound**: full pull then `syncToken` pulls for "Both ways"
   calendars, sync on opening the Calendar (throttled), a manual Refresh,
   a Vercel cron if the Hobby plan allows the cadence, imported events
   colored by account owner, last-write-wins with the loser recorded,
   `needs-relink` handling.

Later, not planned here: RSVP backfill from saved Google ids, repeating
series editing, Tasks as Google Tasks, Apple/iCloud.

## Bryce's part (only he can do these)

See `mission-55-calendar-sync-pr1.md`, "Bryce's setup", for the exact
clicks. In short: create the Google Cloud project, enable the Calendar
API, set up the consent screen (External, then Publish), add the scopes,
create a Web application OAuth client with the two redirect URIs, put the
client id and secret in Vercel and local `.env`, generate
`TOKEN_ENCRYPTION_KEY` for Vercel, then link the work account.
