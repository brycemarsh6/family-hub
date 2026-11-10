# Mission 58: Calendar sync PR 3, bring Google events into Marshee

**Project:** family-hub (Marshee)
**Status:** INTERROGATING (plan and mocks waiting on Bryce)
**Started:** 2026-11-09 · **Updated:** 2026-11-09

Plan: `.avengers/plans/calendar-sync-v1.md`, "PR split", the PR 3 entry.
Previous PR: `.avengers/missions/mission-56-calendar-sync-pr2.md` (merged as
brycemarsh6/family-hub#93). Branch: `claude/marshee-calendar-sync-pr3`, from
`main` at `dd6eb34`.

## Brief

- **Goal:** Events on a Google calendar set to "Both ways" show up in
  Marshee, and later changes on either side follow.
- **Done means:** After Bryce switches `bryce.r.marsh@gmail.com` to "Both
  ways", opening the Calendar brings its events in within a few seconds,
  shown in Bryce's color with "Added by Bryce" and a "From Google" line. An
  edit or delete in Google shows in Marshee on the next open or Refresh. An
  edit or delete in Marshee goes back to Google (the PR 2 push). When both
  sides changed, the later change wins and the other is kept in
  `previousJson`. A revoked Google link marks the account "needs relink" and
  says so. No Google call is made when the env vars are missing. The
  privacy page matches every Google field stored. Gauntlet green, all
  assembled gates PASS, PR merged, production checked.
- **Out of scope:** filters for work calendars, tasks, attendees and RSVP,
  editing a whole repeating series (each occurrence arrives as its own
  event), Apple, CD1 (PR #26), Winnie, the "failed copy is silent after
  Save" marker, a pull more often than once a day by cron (Hobby plan).

## Danger register

From AGENTS.md and mission 56, absolute for every agent:
- Never run `npm run db:seed` or `npm run db:reset`. Never write a clean or
  reset script for `User`.
- Never read, print or edit `.env`.
- Never log, return to the browser, or put in an error message a refresh
  token, access token, authorization code, client secret, the encryption key
  or a sync token. Failures carry a fixed reason word, never a Google body.
- Migrations additive only; Fury reviews the SQL and alone runs
  `npx prisma migrate deploy` against the dev branch after checking the host.
- Never `git add -A` or `git add .`; stage by path; `git show --stat HEAD`.
- The dev branch holds real family data; treat it as private.
- **No agent or test ever calls Google Calendar for real.** Bryce's main
  calendar is live and his setters read it. Tests inject a fake fetch.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`
- `wc -l CLAUDE.md` under 250 if touched
- Record check: `node ~/.claude/skills/avengers/recordcheck.mjs`

## Assembled

- Stark + Vision (always). Vision is adversarial on echo loops (a pull
  pushing back, a push pulled again), duplicates, conflict order, all-day
  dates, 410 handling and token handling.
- Strange: yes, the Calendar header, the event sheet and form, Synced
  calendars and the privacy page change.
- Captain: yes, the planned splits, new lib modules, a cron route.
- Banner: done (code brief 2026-11-09, facts used below).

## Google facts re-checked 2026-11-09

- `events.list` reference: `syncToken` cannot be combined with `timeMin`,
  `timeMax`, `orderBy`, `q`, `updatedMin`, `iCalUID` or the extended
  property filters. `410` means drop the token and pull in full again.
  Deleted events always come back on token pulls, with `status:
  "cancelled"`. Page size 250 by default, 2500 at most.
- Sync guide: the first full pull may be limited with `timeMin`. Its
  official Java sample (`googleworkspace/java-samples`, `SyncTokenSample`)
  sets `timeMin` **only when there is no token** and `syncToken` alone
  afterwards. That settles the plan's open question without a live call:
  **later pulls send `syncToken` and never `timeMin`**, and anything outside
  the window is skipped locally. A `400` on a token pull is handled like
  `410`, so the design holds whichever page is right. No live test is
  needed, so Bryce's calendar is never touched by an agent.
- Vercel: Hobby cron jobs run at most once a day (anything more often fails
  the deploy), timing within the hour. Up to 100 cron jobs per project.

## Fury's design decisions (structure, Fury recommends)

1. **Split before adding.** `calendarSyncPlan.ts` keeps the push steps;
   the pure rules (`isPushable`, `startsTicked`, `cleanRequestedIds`,
   `busyColumn`, `tokenFailReason`, `sortedPersonNames`, `planSync`) move to
   `calendarSyncRules.ts`. `calendarSyncPlanPush.test.ts` splits into
   create/update and failures/edge cases files. Contract C1, no behavior
   change, run first, gated by Captain.
2. **Pure pull logic** in `src/lib/calendarSyncPull.ts` (decides insert,
   update, delete, skip, conflict for each Google event) and
   `src/lib/google/eventFromGoogle.ts` (Google JSON to Marshee fields, the
   inverse of `eventPayload.ts`). `src/lib/google/calendarEventCalls.ts`
   gains `listEvents` (injected fetch, paging, `410`/`400` as "restart").
3. **Binding** in `src/lib/calendarEventPull.ts` (`server-only`, the
   `calendarEventPush.ts` shape). It is the only writer of pulled events and
   of `LinkedCalendar.syncToken` / `lastPulledAt`. A pull never calls the
   push, so nothing echoes.
4. **Migration (additive):** `CalendarEvent.sourceLinkedCalendarId?`
   (SetNull) only; the sync row's `etag`, `lastPulledAt` and
   `previousJson` already hold the rest. A pulled event gets a
   `CalendarEventSync` row with Google's own event id, so the PR 2 push
   updates it in place. Its source calendar shows ticked and locked on the
   form (it cannot be unticked, since that would delete the original).
5. **Echoes:** a Google event whose etag equals the stored etag is skipped.
   An event Marshee created and pushed is matched by its sync row (or by
   `extendedProperties.private.marsheeEventId`), never imported twice.
6. **Conflicts:** if both sides changed since the last sync, the later of
   Google's `updated` and the Marshee event's `updatedAt` wins. The loser is
   written to `previousJson`. If Marshee wins, the pull calls nothing; the
   next push (or Try again) sends it.
7. **A pulled copy missing in Google (404 on push)** is not recreated under
   a new id; the next pull's "cancelled" handles it.
8. **When:** the Calendar page (and the dashboard Calendar widget) fire a
   pull after they load, at most once every 5 minutes per calendar, then
   refresh the view only if something changed. Refresh skips the 5 minutes.
   One Vercel cron, daily at about 3 AM Denver, keeps tokens fresh and finds
   broken links; it checks `CRON_SECRET` like the briefing cron.
9. **needs-relink:** a refresh-token `invalid_grant` sets the account to
   `needs-relink`; it goes back to `ok` on relink (already written in PR 1).
10. **Window:** the first pull asks from 30 days back (Bryce to confirm),
    everything ahead. A page cap (20 pages) stops a runaway pull and records
    a failure instead.

## Questions for Bryce (content, his call)

Asked 2026-11-09 with mocks A to E (Refresh button, "From Google" line on
the event sheet, locked source row in Sync to, the reconnect banner, new
Synced calendars words). Fury's recommendation in brackets.

1. How far back the first pull reaches [30 days back, everything ahead].
2. Deleting a Google event in Marshee also deletes it in Google [yes, that
   is what "Both ways" means and matches plan decision 6].
3. Switching a calendar off "Both ways" [its events stay in Marshee and stop
   updating; nothing disappears by surprise].
4. Mocks A to E and the privacy wording [approve]. Proposed privacy addition,
   replacing "Marshee keeps nothing else from Google.": "For each calendar
   set to Both ways, Marshee keeps a bookmark from Google so it can ask only
   for what changed, and when it last checked. Events from those calendars
   are saved in Marshee like any other event (title, time, place and notes),
   with Google's ID and version marker. Marshee keeps nothing else from
   Google." (Goes through the humanizer before it ships.)

**Answers (Bryce, 2026-11-09): all four as recommended.** 30 days back;
deleting a Google event in Marshee deletes it in Google; switching off
"Both ways" keeps pulled events and stops updating them; mocks A to E and
the privacy wording approved.

5. **(Asked after the contracts were started.)** An event made in Marshee
   and deleted in Google on a "Both ways" calendar. **Bryce: delete it in
   Marshee too**, with its copies on other calendars.
6. **(After Vision pass 1.)** Unlinking an account, or Google no longer
   listing a calendar, leaves pulled events that a relink would import a
   second time. **Bryce: remove them.** Events made in Marshee are never
   touched; the pulled ones come back once on relink.

## Fury's design decisions, revised after Bryce's answers

These replace decisions 5 to 8 above where they differ.

- **Pulled events:** `createdById` and the one person are the account's
  linker (so the existing person colors show the owner).
  `sourceLinkedCalendarId` is the calendar it came from. A sync row holds
  Google's own event id, `etag`, `status "ok"`, `lastPulledAt`.
- **Row lookup:** additive `@@unique([linkedCalendarId, googleEventId])` on
  `CalendarEventSync` (true by construction today; Fury checks dev for
  duplicates before deploying the migration). It also stops two pulls
  racing into a double import.
- **Lease:** a pull claims each calendar with one conditional update
  (`lastPulledAt` null or older than 5 minutes, or 30 seconds for Refresh);
  a claim that updates 0 rows skips the calendar. So two devices opening the
  Calendar together never pull the same calendar twice.
- **Notes:** the "For: ..." line Marshee adds to a Google description is
  stripped when pulling, so it never piles up in Marshee's notes.
- **Skipped Google kinds:** `eventType` "workingLocation" and "focusTime"
  (not events). Status "tentative" counts as confirmed.
- **Conflicts:** Google changed = etag differs from the row. Marshee changed
  = the event's `updatedAt` is later than the row's last push and last pull.
  Both changed: the later of Google's `updated` and Marshee's `updatedAt`
  wins; the loser's fields go to `previousJson`. If Marshee wins, the pull
  binding calls `pushEventCopies({ eventId })` for that event (a push from a
  pull, not an echo: the push saves the new etag, so the next pull skips).
- **Deletes from Google** ("cancelled"): the Marshee event is deleted, and
  `removeEventCopies` takes its copies off other calendars first (Bryce,
  answer 5). Cancelled ids Marshee never knew are skipped.
- **The push for pulled rows:** a `gone` on update of a row whose event's
  `sourceLinkedCalendarId` is that calendar is recorded as failed "network"
  and never re-inserted (the next pull deletes it). The source calendar is
  always kept in `requestedIds` on the server, so it cannot be unticked.
- **Window:** a full pull sends `timeMin` = now minus 30 days,
  `singleEvents=true`, `showDeleted=true`, `maxResults=250`; token pulls
  send `syncToken`, `singleEvents=true`, `showDeleted=true`,
  `maxResults=250` only. An unknown event that ends before the window is
  skipped. More than 20 pages stops and records a failure. `410` or `400`
  on a token pull clears the token and does a full pull in the same run;
  existing events are matched by row, so nothing doubles.
- **needs-relink:** `refreshAccessToken` answering "revoked" during a pull
  sets the account `needs-relink`. Push failures keep their PR 2 behavior.
- **Calendar off "Both ways":** pulls stop; pulled events and their rows
  stay (Bryce, answer 3). The PR 2 push already leaves a copy on a calendar
  that is no longer pushable alone.

## Contracts

C1 and C2 have disjoint boundaries and run in parallel. The rest run in
order.

### C1 - Split the push plan and its test by concern (no behavior change)

- **Objective:** move the pure rules out of `calendarSyncPlan.ts` and split
  its push test, so the pull has room, with no behavior change.
- **Boundaries:** may touch `src/lib/calendarSyncPlan.ts`, new
  `src/lib/calendarSyncRules.ts`, `src/lib/calendarSyncPlan.test.ts`
  (moved by git rename to new `src/lib/calendarSyncRules.test.ts`),
  `src/lib/calendarSyncPlanPush.test.ts`, new
  `src/lib/calendarSyncPlanPushFailures.test.ts`, and the import lines only
  of `src/lib/calendarEventPush.ts`, `src/lib/linkedCalendarsRead.ts`,
  `src/app/actions/calendar.ts`. Must not touch anything else. No
  re-exports: each importer imports from the file that owns the name.
- **Spec:** `calendarSyncRules.ts` (pure, imports only the vocabulary) owns
  `PlanCalendar`, `PlanRow`, `SyncPlan`, `isPushable`, `startsTicked`,
  `cleanRequestedIds`, `busyColumn`, `tokenFailReason`,
  `sortedPersonNames`, `planSync`. `calendarSyncPlan.ts` keeps the push
  steps and their types (`RowKey`, `RowPatch`, `TokenResult`, `SyncDeps`,
  `syncEventCopies`, `removeAllCopies`). The push test splits into
  create/update (stays) and failures, `removeAllCopies` and Try again/412
  edge cases (new file); the shared harness moves to the top of each file or
  a small `calendarSyncPlanTestHarness.ts` (not `*.test.ts`). Each split
  file opens with a one-line header naming its sibling. Header comments in
  the moved code keep their meaning.
- **Verification:** the full Gauntlet; the test count equals the count on
  `main` (1593 in Denver).
- **Evidence required:** before and after test counts, `wc -l` of every
  touched file, `git diff --stat`.
- **Done criteria:** same count, no file over 350 lines, no logic line
  changed (a reviewer can read the diff as moves).

### C2 - Google side of the pull: list events and read them back

- **Objective:** a pure `listEvents` call and a pure mapping of a Google
  event to Marshee's fields.
- **Boundaries:** may touch `src/lib/google/calendarEventCalls.ts`,
  `src/lib/google/calendarEventCalls.test.ts`, `src/lib/google/types.ts`,
  `src/lib/google/calendarApi.ts` (one new binding line, `listGoogleEvents`),
  new `src/lib/google/eventFromGoogle.ts` and its test,
  `src/lib/calendarSyncVocabulary.ts` (only if a "For:" parse helper belongs
  beside `forLine`; add a test in its existing test file). Must not touch
  anything outside `src/lib/google/` except the vocabulary and its test.
- **Spec:** `listEvents(fetchFn, accessToken, calendarId, { syncToken } |
  { timeMin })` pages with `pageToken`, max 20 pages, returns `{ ok: true,
  events: GoogleEventIn[], nextSyncToken }` or `{ ok: false, reason:
  "restart" | "unauthorized" | "network" | "too-many" }` (`410` and `400`
  are "restart"). The query is exactly as in "Window" above: never
  `timeMin` with `syncToken`. `GoogleEventIn` types only the fields we read
  (`id`, `status`, `etag`, `updated`, `summary`, `description`, `location`,
  `start`, `end`, `eventType`, `extendedProperties.private.marsheeEventId`).
  `eventFromGoogle(event)` returns `{ kind: "cancelled", id }`,
  `{ kind: "skip", id }` (workingLocation, focusTime, missing start), or
  `{ kind: "event", id, etag, updated: Date, marsheeEventId?, title (empty
  becomes "(No title)"), notes (with Marshee's own trailing "For:" line
  removed), location, startAt, endAt, allDay }`. All-day: `start.date`
  to UTC midnight via the existing helpers in `householdDate.ts` /
  `calendarDates.ts`, end exclusive as stored today. Timed: `dateTime`
  parsed with its offset. Must round-trip with `toGoogleEvent` (a test
  sends a Marshee event out and back and gets the same fields).
- **Verification:** the Gauntlet. Tests use a fake fetch only; one test
  asserts no request URL ever holds both `syncToken` and `timeMin`, one
  asserts paging stops at 20.
- **Evidence required:** test names and counts, both timezones.
- **Done criteria:** round-trip test passes in Denver and UTC; DST dates
  covered (an all-day event on 2026-11-01 and a timed one across it).

### C3 - Migration and the pure pull planner

- **Objective:** decide, with no database or network, what one pulled page
  of Google events does to Marshee.
- **Boundaries:** may touch `prisma/schema.prisma` (the two additions
  only), new `prisma/migrations/20261116000000_calendar_pull/migration.sql`,
  new `src/lib/calendarSyncPull.ts`, new `src/lib/calendarSyncPull.test.ts`.
  (Preflight flags `prisma/schema.prisma` over the hard cap: STRUCTURE.md
  exempts it by name, as in missions 55 and 56.)
  Stark writes the SQL with `prisma migrate diff`; he never runs a
  migration. Fury applies it to the dev branch.
- **Spec:** schema: `CalendarEvent.sourceLinkedCalendarId String?` with a
  relation to `LinkedCalendar` (`onDelete: SetNull`) and an index;
  `CalendarEventSync @@unique([linkedCalendarId, googleEventId])`.
  `planPull({ calendar, linkerId, windowStart, googleEvents, known })`
  where `known` maps googleEventId (and marsheeEventId) to `{ eventId,
  etag, lastPushedAt, lastPulledAt, eventUpdatedAt, sourceLinkedCalendarId }`.
  Returns `{ inserts, updates, deletes, pushBacks, skipped }` following
  "Fury's design decisions, revised" exactly: echoes skipped by etag,
  conflicts by time with `previousJson` for the loser, cancelled known
  events deleted, unknown cancelled and out-of-window skipped, a Google
  copy of a Marshee event matched by `marsheeEventId` when no row matches.
- **Verification:** the Gauntlet; `npx prisma validate`; `npx prisma
  migrate diff` output pasted (additive only).
- **Evidence required:** the SQL; a test per branch (insert, echo skip,
  Google-only change, Marshee-only change, both changed each way, cancelled
  known, cancelled unknown, out of window, marsheeEventId match, all-day).
- **Done criteria:** every decision bullet has a named test.

### C4a - Make the push safe for events that came from Google

Found by Fury after C3: `updateEvent` sends a `PUT`, which replaces the
whole Google event. On a pulled event that would erase its guests,
reminders, video link and color the first time anyone edits it in Marshee,
on Bryce's live calendar. And the push always sends a busy/free value, which
would flip Google's own choice. Both are fixed before the pull exists.

- **Objective:** a Marshee edit changes only the fields Marshee carries,
  keeps Google's busy/free on pulled timed events, and can never recreate or
  untick the original of a pulled event.
- **Boundaries:** may touch `src/lib/google/calendarEventCalls.ts` and its
  test, `src/lib/google/types.ts`, `src/lib/google/eventPayload.ts` and its
  test, `src/lib/google/eventFromGoogle.ts` and its test,
  `src/lib/calendarSyncPull.ts` and its test, `src/lib/calendarSyncPlan.ts`,
  `src/lib/calendarSyncPlanPush.test.ts`,
  `src/lib/calendarSyncPlanPushFailures.test.ts`,
  `src/lib/calendarSyncPlanTestHarness.ts`, `src/lib/calendarSyncRules.ts`
  and its test, `src/lib/calendarEventPush.ts`. Nothing else.
- **Spec:**
  1. `updateEvent` uses `PATCH` (same URL, body, `If-Match` and results).
     The 409 revive and the 412 overwrite keep working through it. A test
     asserts the method.
  2. `GoogleEventIn` gains `transparency`. `eventFromGoogle` returns
     `showBusyOnGoogle = transparency !== "transparent"` for all-day events
     (Google's default when the field is missing is busy) and `false` for
     timed ones (the column's meaning). `planPull` carries it on inserts and
     on Google-wins updates.
  3. `toGoogleEvent` takes an optional `keepGoogleBusy: boolean`; when true
     the payload has no `transparency`, so the `PATCH` leaves Google's value.
     The push sets it for a timed event sent to its own source calendar
     (`sourceLinkedCalendarId === calendar.id`). All-day pulled events send
     `showBusyOnGoogle` as today.
  4. `planSync`: the source calendar is always desired when it is still
     pushable, whatever `requestedIds` says (it cannot be unticked). When it
     is no longer pushable its row is left alone (decision 8).
  5. On a `gone` while updating a row on the event's source calendar, the
     push records `failed`/"network" and never inserts (no recreated
     original); the next pull's "cancelled" deletes it.
  6. `calendarEventPush.ts` reads `sourceLinkedCalendarId` with the event and
     passes it to the plan.
- **Verification:** the Gauntlet (tsc, eslint, `npm test`, the TZ=UTC
  command). New tests for each spec item.
- **Evidence required:** test names, counts both timezones, diff stat.
- **Done criteria:** a test proves an update request is a `PATCH` without
  `transparency` for a timed pulled event on its source calendar.

### C4b - Bind the pull: database, Google, action, cron

- **Objective:** run `planPull` against the real database and Google.
- **Boundaries:** may touch new `src/lib/calendarEventPull.ts`
  (`server-only`), `src/lib/linkedCalendarWrites.ts` (add
  `markAccountNeedsRelink`, `claimCalendarForPull`, `saveSyncToken`),
  `src/lib/linkedCalendarsRead.ts` (add `loadPullCalendars`), new
  `src/app/actions/calendarPull.ts` (guard: `MANAGER_ROLES` for Refresh;
  the on-open pull allows any signed-in family login but only pulls),
  new `src/app/api/cron/calendar-pull/route.ts`, new
  `src/lib/calendarPullRun.ts` and its test (amended by Fury after Vision
  pass 1: the pure orchestrator the fake-deps tests needed, which the
  dispatch allowed but the contract had not named),
  (`CRON_SECRET` check: move the briefing route's `isAuthorized` into new
  `src/lib/cronAuth.ts` and have both routes import it, so
  `src/app/api/cron/briefing/route.ts` changes only that import),
  `src/proxy.ts` (`PUBLIC_ROUTES` entry), `vercel.json` (one cron,
  `0 10 * * *`, which is 3 AM Denver in winter, 4 AM in summer).
- **Spec:** the revised decisions. `pullCalendars({ force })` returns `{
  changed: boolean, failed: number }` and never throws; nothing is called
  and nothing written when `isCalendarPushConfigured()` is false. Writes of
  one Google event happen in one transaction (event, person, sync row). The
  sync token is saved only after every event of the run is written, and
  never when `listEvents` gives `nextSyncToken: null`. Pulled writes set
  the event's `updatedAt` to the plan's `now` explicitly (C3's rule, or
  the next pull mistakes the pull's own write for a Marshee change). A
  delete calls `removeEventCopies` before deleting the event. `pushBacks`
  call `pushEventCopies({ eventId })` after the run's writes. No token or
  sync token is logged or returned. The cron returns counts only.
- **Verification:** the Gauntlet; a fake-deps test of the binding where it
  is pure enough, otherwise the planner tests plus a dev-branch run with
  Google unconfigured that proves `pullCalendars` returns at once with no
  write (Fury reads the query log or row counts).
- **Evidence required:** diff stat, the cron file, the proxy line, the
  guard lines.
- **Done criteria:** Vision can trace each revised decision to a line.

### C5 - Screens and words

- **Objective:** build mocks A to E and the privacy addition exactly as
  Bryce approved.
- **Boundaries:** may touch `src/components/CalendarHeader.tsx`, a new
  small client component for the Refresh button and the on-open pull
  (new `src/components/CalendarPullButton.tsx`, keeping
  `CalendarViews.tsx` untouched), `src/app/(app)/calendar/page.tsx`,
  `src/components/CalendarWidgetTile.tsx` (fire the on-open pull only),
  `src/components/EventDetailSheet.tsx` and the sheet's caller,
  `src/components/EventSyncToField.tsx`, `src/components/EventForm.tsx`,
  `src/app/(app)/calendar/[id]/edit/page.tsx` (source calendar to the form),
  `src/lib/calendarEventQuery.ts`
  (expose the source calendar name to views), `src/lib/types.ts`,
  `src/lib/calendarSyncVocabulary.ts`, the Synced calendars components
  (`src/components/SyncedCalendarsList.tsx`,
  `src/components/LinkedAccountCard.tsx`), `src/lib/linkedCalendarsRead.ts`
  (`lastPulledAt` and account status for the page and banner),
  `src/app/privacy/page.tsx`.
- **Spec:** mocks A to E in this mission (chat, 2026-11-09). Words go in
  the vocabulary. Refresh shows only to parents and admins when some
  calendar is "Both ways"; the on-open pull runs for any login, at most
  once per page view, and calls `router.refresh()` only when `changed`.
  The banner (D) shows to the linker of a `needs-relink` account. "Last
  checked" on Synced calendars reads `lastPulledAt`. Privacy: replace the
  last sentence of "What Marshee keeps" with this text (Bryce's approved
  wording after Fury's humanizer pass, which only fixed what "when it last
  checked" belongs to): "For each calendar set to Both ways, Marshee keeps a
  bookmark from Google, so it can ask only for what changed, and the time
  it last checked. Events from those calendars are saved in Marshee like
  any other event (title, time, place and notes), with Google's ID and
  version marker. Marshee keeps nothing else from Google."
  Touch targets 48px, Lucide outline icons (`RefreshCw`, `Lock`,
  `TriangleAlert`), colors by job (DESIGN.md).
- **Verification:** the Gauntlet; Strange's screenshots.
- **Evidence required:** files touched, the words added.
- **Done criteria:** Strange PASS.

### C7b - Gate fixes, pass 1: structure (Captain)

- **Objective:** clear Captain's two code blockers and two cheap notes.
- **Boundaries:** may touch `src/lib/calendarSyncPlanTestHarness.ts`
  (moved by git rename to new `src/lib/testing/calendarSyncPlanHarness.ts`),
  `src/lib/calendarSyncPlanPush.test.ts`,
  `src/lib/calendarSyncPlanPushFailures.test.ts`,
  `src/lib/calendarSyncRules.test.ts` (header only),
  `src/lib/calendarEventQuery.ts`, `src/lib/types.ts`,
  `src/app/(app)/calendar/[id]/edit/page.tsx`, `src/lib/cronAuth.ts`.
- **Spec:** (1) move the harness, fix its imports and the two tests' imports
  and headers. (2) `export const EVENT_SOURCE_SELECT = { select: { id: true,
  name: true } } as const;` in `calendarEventQuery.ts`, used in
  `CALENDAR_EVENT_SELECT` and the edit page; `CalendarEventRow` widened;
  the view still carries the name only. (3) `import "server-only"` in
  `cronAuth.ts` (check the briefing route's tests still run; if a pure test
  imports it, report BLOCKED-ON-CONTRACT).
- **Verification:** tsc, eslint, `npm test`, TZ=UTC command.
- **Done criteria:** same test count (1677), no reader of `LinkedCalendar`
  outside the named exceptions.

### C7a - Gate fixes, pass 1: correctness (Vision) and Bryce's answer 6

- **Objective:** clear Vision's four code blockers and Bryce's unlink rule.
- **Boundaries:** may touch `src/lib/google/eventPayload.ts` and its test,
  `src/lib/google/types.ts`, `src/lib/google/eventFromGoogle.ts` and its
  test, `src/lib/google/calendarEventCalls.test.ts`,
  `src/lib/calendarSyncPull.ts` and its test, `src/lib/calendarPullRun.ts`
  and its test, `src/lib/calendarEventPull.ts`,
  `src/lib/linkedCalendarsRead.ts`, `src/lib/calendarSyncPlanPush.test.ts`,
  `src/lib/calendarSyncPlanPushFailures.test.ts`,
  `src/lib/testing/calendarSyncPlanHarness.ts`,
  `src/app/actions/linkedCalendars.ts`,
  `src/app/api/google/callback/route.ts`.
- **Spec:**
  1. **Cleared fields clear.** `toGoogleEvent` always sends `location` and
     `description`, as `""` when empty; `GoogleEventPayload` types them as
     required strings. Test: an update with null notes and location sends
     both keys as `""`.
  2. **A Google change reaches the other calendars.** A Google-wins update
     with `changed: true` on an event that has sync rows on other calendars
     is pushed after the run's writes (`pushEventCopies({ eventId })`, the
     same path as `pushBacks`). Test in `calendarPullRun.test.ts` or the
     planner.
  3. **One Google calendar, one import.** `runPull` pulls each
     `googleCalendarId` once per run (first in a stable order: oldest
     `LinkedCalendar.createdAt`, then id). Before an insert, an existing
     `CalendarEventSync` with the same `googleEventId` on any LinkedCalendar
     with the same `googleCalendarId` is adopted (a row on this calendar
     pointing at that event) instead of inserting. Tests for both.
  4. **Unlink removes pulled events (Bryce, answer 6).** New
     `removePulledEvents(linkedCalendarIds)` in `calendarEventPull.ts`: for
     each event whose `sourceLinkedCalendarId` is in the list, call
     `removeEventCopies` for its copies on other calendars (not the source:
     it still lives in Google) and delete the event. Called by the unlink
     action before the unlink write, and by the callback route before
     `replaceCalendars` for the calendars Google no longer lists (read those
     ids through `linkedCalendarsRead.ts`). Events made in Marshee are never
     touched. The source-calendar exclusion must be explicit in code.
  5. **Notes from Google's web editor** (Vision note, Fury's call):
     `eventFromGoogle` turns an HTML description into text: `<br>` and
     `</p>`/`</div>` to new lines, other tags removed, `&amp; &lt; &gt;
     &quot; &#39; &nbsp;` decoded, then `withoutForLine`. Plain text is left
     alone. Tests.
  6. **Captain notes:** `marsheeIdOf(event)` exported from
     `eventFromGoogle.ts` and used by `calendarEventPull.ts` instead of its
     own read; the binding's revoked/network mapping uses
     `tokenFailReason` (or a sibling in `calendarSyncRules.ts`, which C7a
     may then touch) instead of its own.
- **Verification:** the full gauntlet except build (Fury builds).
- **Evidence required:** test names per item, counts both timezones.
- **Done criteria:** each item has a named test, or for item 4 a test of
  the pure part plus the call sites quoted.

### C6 - Records

- STRUCTURE.md's "Google calendar link" entry widened for the new files
  (Captain's text, Bryce approves); CLAUDE.md's Google Calendar line and
  Current status updated (`wc -l` under 250); `.avengers/status.md` gets
  Bryce's phone test; this file's Delivery; the record check.

## Bryce's test (production, after merge)

1. On Synced calendars, switch `bryce.r.marsh@gmail.com` to "Both ways".
2. Open the Calendar. Within a few seconds your Google events from the last
   30 days onward appear in your color.
3. In Google, add "Marshee pull test" tomorrow. In Marshee tap Refresh: it
   appears. Rename it in Google, Refresh: the name follows.
4. Rename it in Marshee: Google follows. Delete it in Marshee: it leaves
   Google.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Captain | BLOCKED | Test harness belongs in `src/lib/testing/`; two new readers of `LinkedCalendar` outside `linkedCalendarsRead.ts` (needs `EVENT_SOURCE_SELECT`); the STRUCTURE.md entry's closed lists no longer match (amendment drafted, Bryce to approve) | Second reader of `marsheeEventId`; pull binding repeats `tokenFailReason`; `cronAuth.ts` lacks `server-only`; "Just now" has two homes; STRUCTURE.md housekeeping due soon |
| 1 | Vision | BLOCKED | PATCH keeps cleared notes/location in Google; a Google change never reaches other calendars; a shared calendar linked twice imports twice; unlink then relink duplicates pulled events; `calendarPullRun.ts` outside C4b's list | Gauntlet green (1677, UTC and LA too, build ok); echoes, lease, restart, secrets all check out; Google HTML descriptions show raw `<br>`; a failed Marshee delete of a pulled event can come back; mission number 57 already used on main |

## Handoff log

- 2026-11-09: C1 and C2 done and committed (tests 1593 to 1621). C2 notes for C4: `listEvents` gives `nextSyncToken: null` when Google sends none (do not save a token then); a typed "For: ..." last paragraph in Google is stripped too (accepted edge). The worktree's Prisma client was stale; Fury ran `npx prisma generate` (local only).

- 2026-11-09: Mission opened on Opus 5.5. Banner's code brief: `syncToken`
  and `lastPulledAt` already exist on `LinkedCalendar`, `lastPulledAt` and
  `previousJson` on `CalendarEventSync`; nothing sets `needs-relink` yet;
  events are colored by their people, so "colored by owner" means the
  linker is put on the event. Bryce's PR 2 production test is still on his
  checklist in `.avengers/status.md`.
