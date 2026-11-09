# Mission 56: Calendar sync PR 2, copy Marshee events to Google

**Project:** family-hub (Marshee)
**Status:** BUILDING (Bryce approved the plan, the mock and the wording 2026-11-09)
**Started:** 2026-11-09 · **Updated:** 2026-11-09

Plan: `.avengers/plans/calendar-sync-v1.md`, "PR split" item 2. Previous PR:
`.avengers/missions/mission-55-calendar-sync-pr1.md`. Branch:
`claude/marshee-calendar-sync-pr2-dee89b`, from `main` at `0e31431`.

## Brief

- **Goal:** When a parent adds, edits or deletes a Marshee event, the copies
  on the Google calendars ticked for that event follow it. Which calendars
  can be ticked comes from each calendar's direction on the Synced calendars
  page.
- **Done means:** On the event form a parent sees "Sync to" with every
  calendar that is set to sync and that Google lets Marshee write to. Their
  own "Both ways" calendars start ticked, "Marshee to Google only" ones never
  do. Saving creates a copy on each ticked calendar, editing updates it,
  unticking removes it, deleting the event removes every copy. The event's
  detail sheet shows where it is synced and any failure, with Try again. With
  the Google env vars or `TOKEN_ENCRYPTION_KEY` missing, the form shows no
  "Sync to" and no Google call is made. The Gauntlet passes. Bryce's real
  test on production is under "Bryce's test".
- **Out of scope:** pulling anything from Google (PR 3), filters for work
  calendars (PR 3 or later, Bryce to design), tasks, attendees and RSVP,
  repeating series, Apple, CD1 (draft PR #26), the Lists page, Winnie, any
  copying of events that already exist (only an event someone ticks is sent).

## Bryce's setup on 2026-11-09 (facts this plan relies on)

- Bryce linked his personal Gmail on production. Terros is dropped as the
  account to sync. Seven calendars listed.
- `bryce.r.marsh@gmail.com` (his main calendar, the one his appointment
  setting software reads) is "Marshee to Google only". The other six are
  "Not synced". Both Terros calendars stay off.
- So a family event ticked to the main calendar blocks setter availability.
  That is why all-day events need a rule (open question 2).

## Danger register

From AGENTS.md, absolute for every agent:
- Never run `npm run db:seed` or `npm run db:reset`. Never write a clean or
  reset script for `User`.
- Never read, print or edit `.env`. Secrets live in `.env` and Vercel only.
- Never log, return to the browser, or put in an error message a refresh
  token, access token, authorization code, client secret or the encryption
  key. Failures carry a fixed reason word, never a Google response body.
- Migrations are additive only; Fury reviews the SQL and alone runs
  `npx prisma migrate deploy` against the dev branch after checking the host.
  No agent runs `prisma migrate dev` or `reset`.
- Never `git add -A` or `git add .`; stage by path; `git show --stat HEAD`
  after every commit. Branch, PR, Gauntlet, merge.
- The dev branch holds real family data; treat it as private.
- New here: no agent or test ever makes a real call to Google Calendar. The
  linked calendar is live and his setters read it. Tests inject a fake fetch.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`
- `wc -l CLAUDE.md` under 250 if touched
- Record check: `node ~/.claude/skills/avengers/recordcheck.mjs`

## Assembled

- Stark + Vision (always). Vision is adversarial on doubled pushes, failed
  deletes, time zones, all-day dates and token handling.
- Strange: yes, the event form, detail sheet and Synced calendars change.
- Captain: yes, a new table, new lib modules, a sync step inside
  `actions/calendar.ts`.
- Banner: no. Fury read the code directly.

## Fury's design decisions (structure, Fury recommends)

1. **The push is awaited inside the Server Action**, not put in `after()`,
   for the reason `assistantRoute.ts` records: `after()` cannot tell the
   caller what happened. The form already shows "Saving…" and delete already
   waits for the server (DESIGN.md).
2. **The Marshee write comes first and always stands.** A Google failure
   never undoes it or shows as a form error. It is recorded on the sync row.
3. **Google event ids are chosen by Marshee**: the hex of the Marshee event
   id, which only uses letters Google allows. Known before the call, so a
   retry can never make a second copy. `409` means the copy already exists
   (or was deleted, because Google reserves the id), so answer it with an
   update that sets `status: "confirmed"`.
4. **A row is written as `pending` before the call**, then set to `ok` or
   `failed`, so a function that dies midway leaves a visible truth.
5. **Etags.** Update sends `If-Match`. On `412` (someone changed it in Google
   first) the Google version is saved to `previousJson` and Marshee's version
   is sent without `If-Match`: last write wins, loser recorded (plan decision
   9). A copy deleted in Google (`404`) is recreated on the next Marshee edit,
   because this direction means Marshee is the source. Delete sends no
   `If-Match`, and `404` or `410` count as success.
6. **Delete asks Google first, then deletes the row**, because the cascade
   removes the ids needed to find the copies. If Google fails the Marshee
   event is still deleted and the person is told.
7. **`syncCalendarIds` is optional on the input.** Undefined means "leave the
   calendars alone", so no future caller wipes copies by forgetting it. Every
   id is re-read on the server (real, set to sync, writable). A client value
   is never trusted.
8. **A calendar switched to "Not synced" after an event was copied** stops
   getting updates and its copy is left alone. Deleting the event still
   removes copies on every calendar (plan decision 6).
9. **`accessRole`** is stored from Google's list. Only `owner` can be written
   with the `calendar.events.owned` scope. `null` (rows linked before this PR)
   means unknown and is allowed; Google's own refusal shows as a failure.
10. **One Google account, one Marshee link.** The callback refuses a Google
    account another person already linked, closing the PR 1 leftover where one
    Unlink would revoke both and events could push twice.
11. **Who an event is for** goes on the last line of the Google description,
    "For: Bryce, Emily" (plan decision 8, no attendees).
12. **The access token** is fetched once per account per action, lives only in
    memory, and is never stored.

## Bryce's decisions (2026-11-09)

1. The form and detail sheet mock: approved.
2. All-day events are free in Google by default, and each all-day event can
   be switched to busy. Timed events are always busy. Bryce asked for the
   switch; his setters read the calendar these copies land on.
3. Unticking a calendar on an edit removes that Google copy.
4. All wording in contract C4: approved as written, except the label of the
   busy switch, which is Fury's proposal and Bryce can change until C4 runs.

## Fury's pre-dispatch checklist

Run `node ~/.claude/skills/avengers/preflight.mjs` per contract and read every
line. Contracts run one at a time because later ones build on earlier ones.

## Contracts

### C1 - Sync table, accessRole column and the schema comment fix
- **Status:** DONE (Stark; Fury matched the SQL to prisma migrate diff and applied it to dev after the host check)
- **Objective:** Add the `CalendarEventSync` table and
  `LinkedCalendar.accessRole` with a hand-written additive migration, and
  correct the wrong "local midnight" comment on `CalendarEvent`.
- **Boundaries:** may touch: `prisma/schema.prisma` (the new model, the
  column, back-relations on `CalendarEvent` and `LinkedCalendar`, the
  `showBusyOnGoogle` column, the comment above the start time field), new
  `prisma/migrations/20261114000000_calendar_event_sync/migration.sql`.
  Must not touch: anything else; no `prisma migrate` command of any kind.
- **Spec:** `CalendarEventSync`: `id` cuid, `eventId` to `CalendarEvent`
  Cascade, `linkedCalendarId` to `LinkedCalendar` Cascade, `googleEventId`
  String, `etag` String?, `status` String default `"pending"`, `failReason`
  String?, `lastPushedAt` DateTime?, `lastPulledAt` DateTime?, `previousJson`
  String?, `createdAt`, `updatedAt`. `@@unique([eventId, linkedCalendarId])`,
  `@@index([linkedCalendarId])`. `accessRole String?` on `LinkedCalendar`.
  `showBusyOnGoogle Boolean @default(false)` on `CalendarEvent`. The
  comment must say all-day events are stored at UTC midnight, matching
  `calendarDates.ts`.
- **Verification:** `npx prisma validate`, `npx prisma generate`,
  `npx tsc --noEmit`, `npx eslint .`, `npm test` all pass. The SQL holds only
  `CREATE TABLE`, `CREATE INDEX`, `CREATE UNIQUE INDEX`, `ALTER TABLE ... ADD
  COLUMN` and `ADD CONSTRAINT ... FOREIGN KEY`.
- **Evidence required:** the full SQL; validate and test output.
- **Done criteria:** Fury compares the SQL to `prisma migrate diff` output and
  applies it to dev with `npx prisma migrate deploy` after the host check.

### C2 - Pure event mapping and the Google events calls
- **Status:** NOT STARTED
- **Objective:** Turn a Marshee event into Google's shape in tested pure code
  and add the insert, update, delete calls to `calendarApi.ts`.
- **Boundaries:** may touch: new `src/lib/google/eventPayload.ts`, new
  `src/lib/google/eventPayload.test.ts`, new `src/lib/google/calendarEventCalls.ts`, new `src/lib/google/calendarEventCalls.test.ts`, `src/lib/google/calendarApi.ts`,
  `src/lib/google/types.ts`. Must not touch: `src/lib/google/oauth.ts`,
  `src/app/`, `src/components/`, `prisma/`.
- **Spec:** `googleEventIdFor(marsheeId)`: lowercase hex of the id's bytes,
  length 5 to 1024, only `a-v0-9`. `toGoogleEvent(input)`: `summary`;
  `location` when set; `description` is notes, then a blank line, then
  `For: A, B` (just the For line with no notes); timed events use
  `start.dateTime` and `end.dateTime` with `timeZone: HOUSEHOLD_TIME_ZONE`;
  all-day events use `start.date` and `end.date` as `YYYY-MM-DD` through
  `calendarDateFromUtcMidnight`, end exclusive; `status: "confirmed"`;
  `extendedProperties.private.marsheeEventId`; no `attendees`, no
  `recurrence`; `transparency` is `opaque` for a timed event or an all-day
  event with `showBusyOnGoogle`, and `transparent` for any other all-day
  event. A `server-only` file cannot be imported by a test, so the calls live in pure `calendarEventCalls.ts`, taking `fetch` as a parameter, and `calendarApi.ts` only binds them to the global `fetch`. The calls are `insertEvent`, `updateEvent` (optional `ifMatch`), `getEvent`,
  `deleteEvent`, each URL-encoding the calendar id, taking the access token as
  an argument, with a 10 second timeout and `sendUpdates=none`. Results are
  `{ ok: true, etag }` or `{ ok: false, reason }` where reason is one of
  `conflict` (409), `changed` (412), `gone` (404, 410), `unauthorized` (401,
  403), `network`. A caught error is dropped, as in `listCalendars`.
- **Verification:** the five Gauntlet steps. Tests must cover a timed event
  across daylight saving, a one-day and a multi-day all-day event in both
  time zones, empty notes, and each status code through an injected fake
  `fetch` (never a real call).
- **Evidence required:** test names and counts in both time zones; a sample
  payload for one timed and one all-day event.
- **Done criteria:** Fury re-runs the tests and reads the payload.

### C3 - The push, wired into the event actions
- **Status:** NOT STARTED
- **Objective:** Create, update, remove and retry Google copies from
  `actions/calendar.ts`, store `accessRole`, and refuse a Google account
  someone else already linked.
- **Boundaries:** may touch: new `src/lib/calendarSyncPlan.ts`, new
  `src/lib/calendarSyncPlan.test.ts`, new `src/lib/calendarEventPush.ts`, `src/lib/linkedCalendarWrites.ts`,
  `src/lib/linkedCalendarsRead.ts`, `src/app/actions/calendar.ts`,
  `src/app/api/google/callback/route.ts`, `src/lib/calendarSyncVocabulary.ts`
  (fail reasons and the new error code only). Must not touch:
  `src/components/`, `prisma/`, `src/lib/google/oauth.ts`.
- **Spec:** implements design decisions 1 to 10. `calendarSyncPlan.ts` is
  pure: from existing rows, requested ids and each calendar's direction it
  returns what to create, update and remove, and it holds the push steps (including the 409, 412 and 404 handling) with its Google calls, token source and row writes passed in as parameters, so the tests can fake them (a `server-only` file cannot be imported by a test). `calendarEventPush.ts` (`server-only`, no auth) binds those parameters to the real database and Google calls and has no logic of its own; `calendarSyncPlan.test.ts` carries every case. Calendars push in parallel.
  `loadSyncTargets(viewerId)` returns the calendars a form may list, with
  owner name, whether it is the viewer's, and whether it starts ticked; it
  returns nothing when Google or the key is not configured. Actions:
  `createCalendarEvent` and `updateCalendarEvent` take `syncCalendarIds?` and
  `showBusyOnGoogle?` (stored only for an all-day event, false otherwise;
  undefined on an update leaves it alone);
  `deleteCalendarEvent` returns `googleCopyLeft?: true`; new guarded
  `retryEventSync(eventId)` re-pushes rows not `ok`. Fixed fail reasons:
  `network`, `reconnect`, `refused`. `replaceCalendars` saves `accessRole`.
  The callback checks for another user's row with the same `googleSubject`
  after the state check and before saving, and redirects with
  `error=already-linked`.
- **Verification:** the five Gauntlet steps. Tests with fakes must prove:
  a retry after a `409` makes no second copy; a `412` records `previousJson`
  and overwrites; `404` on update recreates; a revoked token marks `failed`
  with `reconnect` and the Marshee event still saves; a tampered id for an
  "off" or read-only calendar is ignored; undefined `syncCalendarIds` changes
  nothing; delete with a Google failure still deletes and reports it; no test
  output contains a token.
- **Evidence required:** test names and counts in both time zones; `grep` of
  the new files showing no `console.` call that takes a token or response.
- **Done criteria:** Fury re-runs the tests and reads the action diff.

### C4 - The form, the detail sheet and the words
- **Status:** NOT STARTED
- **Objective:** Show "Sync to" on the event form and sync status on the
  detail sheet, and ship the approved wording on the Synced calendars and
  privacy pages.
- **Boundaries:** may touch: new `src/components/EventSyncToField.tsx`,
  `src/components/EventForm.tsx`, `src/components/EventDetailSheet.tsx`,
  `src/components/SyncedCalendarsList.tsx`, `src/components/LinkedAccountCard.tsx`,
  `src/components/MonthGrid.tsx` (the empty value only),
  `src/app/(app)/calendar/new/page.tsx`,
  `src/app/(app)/calendar/[id]/edit/page.tsx`, `src/lib/calendarEventQuery.ts`,
  `src/lib/types.ts`, `src/lib/calendarSyncVocabulary.ts`,
  `src/lib/calendarSyncVocabulary.test.ts`, `src/app/privacy/page.tsx`.
  Must not touch: `src/app/actions/`, `src/lib/google/`, `prisma/`.
- **Spec:** every word lives in `calendarSyncVocabulary.ts`. **Form:**
  `EventSyncToField` sits below Notes in the right column, is not rendered
  when there are no targets, and is headed "Sync to" with the hint "Optional"
  (the `Field` label style). Each target is a 48px+ row like the "All day"
  row: calendar name, a checkbox, and the owner's name as a second muted line
  ("Emily's") when it is someone else's. New event: `startsTicked` targets
  are ticked. Edit: ticked means it has a sync row. When All day is on and at
  least one calendar is ticked, one more row appears under them, off by
  default: "Show as busy on Google". **Detail sheet:** above Edit, one line
  per copy with a check icon, "On Google: <calendar name>"; a failed or
  pending copy shows a warn box "Couldn't copy to <calendar name>." or, for
  reason `reconnect`, "Google stopped letting Marshee in. Unlink this account
  and link it again.", and "Try again" (48px+) calling `retryEventSync`, except
  for `reconnect`. After a delete with `googleCopyLeft`, the sheet stays open
  showing "Deleted from Marshee. Its copy in Google couldn't be removed, so
  delete it there." with a Done button that calls `onDeleted`. **Synced
  calendars page:** under the Link button, "Google may say it hasn't verified
  this app. That's expected for a private family app. Tap Advanced, then
  \"Go to themarshandco.com (unsafe)\"." The `syncNotOn` key is replaced by
  `syncHowItWorks`: "Marshee copies an event to a calendar when that calendar
  is set to sync and you tick it on the event. Google events don't come into
  Marshee yet." A calendar whose `accessRole` is known and not `owner` shows
  "Read only", cannot be opened, and is not offered. The callback error
  `already-linked` reads "Someone else in the family already linked this
  Google account." **Privacy page:** use sentence becomes "Marshee uses these
  to copy events you choose from Marshee into a Google calendar you pick, and
  to update or delete those copies when you change or delete the event in
  Marshee. For events you choose to copy, Google receives the title, time,
  place, notes and who the event is for." In What Marshee keeps, the last
  sentence becomes "For each event copied to Google, Marshee keeps Google's ID
  for that copy, so it can update it later. Marshee keeps nothing else from
  Google." In Unlinking, "Settings, then Calendars" becomes "Settings, then
  Synced calendars", and after the sentence on deleting details add "Events
  already copied to Google stay there. Unlink stops Marshee from changing
  them." Last updated: November 9, 2026.
- **Verification:** the five Gauntlet steps; Strange reviews the running app.
- **Evidence required:** screenshots of the form with and without targets, and
  of the sheet for ok and failed rows.
- **Done criteria:** Strange PASS.

### C5 - Records
- **Status:** NOT STARTED
- **Objective:** Bring `STRUCTURE.md`, `CLAUDE.md` and `.avengers/status.md`
  up to date.
- **Boundaries:** may touch: `STRUCTURE.md` (the "Google calendar link"
  entry), `CLAUDE.md` (the Google Calendar link line and Current status),
  `.avengers/status.md`, this file. Must not touch: code.
- **Spec:** the STRUCTURE.md text comes from Captain's ruling; Bryce approves
  amendments. `wc -l CLAUDE.md` under 250.
- **Verification:** the record check; `wc -l CLAUDE.md`.
- **Evidence required:** the record check output.
- **Done criteria:** Fury reads every REVIEW line.

## Bryce's test (production, after merge)

1. Add an event called "Marshee test", tomorrow at a quiet time, tick your
   main calendar, save. Check it appears in Google Calendar.
2. Edit its title in Marshee. Check Google follows.
3. Delete it in Marshee. Check it leaves Google.
4. If all good, switch the main calendar to "Both ways" so it starts ticked.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-11-09: Bryce linked his Gmail on production after a redeploy (Vercel
  still held a deleted client id). Plan written on Opus 5.5.
- 2026-11-09: Bryce approved the plan, mock and wording, and added the
  per-event busy switch for all-day events. Preflight on C1 reports
  `prisma/schema.prisma` over the hard cap: false alarm, STRUCTURE.md exempts
  that file by name (recorded the same way in mission 55).

## Delivery
