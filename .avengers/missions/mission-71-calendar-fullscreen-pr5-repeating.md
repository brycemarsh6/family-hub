# Mission 71: Calendar full screen PR 5, repeating events ("This one" or "All of them")

- **Status:** GATES pass 2/3 (C1, C2, C2a, C3, F1, F2 built; rulebook applied; worktree has its own `node_modules` (npm ci) and a generated Prisma client; no `.env` here (export from the main checkout, hostname only). (Bryce OK'd the mock 2026-11-11: "Looks good, build it", after asking for a draggable mock)
- **Started:** 2026-11-11 · **Updated:** 2026-11-11
- **Plan:** `.avengers/plans/calendar-fullscreen-v1.md`, "PR 5: Repeating events, "This one" or "All of them" (decision 22; small call I; Q1, Q2)"
- **Branch:** `claude/calendar-fullscreen-pr5-dc232e`, cut from `origin/main` `6656fed` (PR 4 merged as #112)
- **Mock:** `.avengers/mocks/calendar-pr5-repeating-mock.html` (sent to Bryce 2026-11-11)

## Brief

Drop a repeating event (one Google pulled in with a series id) on the hour
timeline and a sheet slides up: "This one", "All of them", Cancel. "This
one" is PR 4's save, unchanged. "All of them" asks the server to shift the
whole Google series by the minutes of the drop: the server computes the
shift from the stored row, patches Google's series parent (start and end,
keeping its own time zone field), then pulls that calendar so Marshee's rows
match Google. Undo sends the opposite shift through the same action. A drop
on another day offers "This one" only, with one line saying why (Q1). No
"This and following" (Q2). Events that do not repeat never see the sheet.

## Done means

- Additive migration: one nullable column on `CalendarEventSync` for
  Google's `recurringEventId`. SQL reviewed before it is applied.
- The pull writes the series id on every insert and update, and onto rows
  that lack it even when the etag is unchanged. Each "Both ways" calendar
  gets one full pull to backfill; nothing is deleted; a second run changes
  nothing.
- The sheet: house sheet, three targets 48px or more, parents only, Cancel
  and the scrim put the block back with nothing saved.
- `shiftCalendarSeries` (name final in the contract): guarded Server Action,
  parents only, takes event id and new start; the server computes the
  minutes; refuses a calendar now "Off" or unlinked; if Google's save fails
  nothing in Marshee changes and the block glides back with the warn reason;
  the push is not sent twice.
- Undo reverses "All of them" through the same action.
- Tests: shift across the March and November clock changes in both `TZ`
  runs; backfill idempotent; refusal paths.
- docs/structure/calendar.md gains the series rule; calendar-sync.md the
  new column and who fills it (drafted by Captain, quoted to Bryce).
- Gauntlet green, gates pass, merged, production deploy checked,
  `git log origin/main..HEAD` empty, Bryce's phone test in
  `.avengers/status.md` (throwaway event first).

**Out of scope:** the question in the edit form and on delete; "This and
following"; making repeating events in Marshee; dragging past the screen
edge.

## Google's behaviour (Fury read the docs, 2026-11-11)

- Google's recurring events guide: an instance carries `recurringEventId`
  (the parent's id) and `originalStartTime` (where the rule put it, even if
  moved). With `singleEvents=true` the list returns instances, never the
  parent. Changing a whole series is done on the parent, never instance by
  instance (that makes exceptions).
- **The docs do not say what happens to days already moved one by one
  (exceptions) when the parent's start changes.** Community reports
  disagree (kept vs dropped). So the phone test decides it on a throwaway
  event, and this file records the answer. Marshee follows whatever Google
  does, because the pull runs right after the save.

## Danger register

Same as AGENTS.md: never `npm run db:seed` / `db:reset`; never a clean or
reset script for `User`; **this mission has one migration: additive only,
SQL shown to Fury before it is applied to the dev branch**; never print
`.env` (hostname only); stage by explicit path, `git show --stat HEAD`
after each commit; no direct pushes to `main`. Test data only through the
scoped `db:seed-*` / `db:clean-*` scripts. **No agent touches a real Google
calendar**: Google calls are tested against a fake client; the real series
change is Bryce's phone test, on a throwaway event first.

## Gauntlet

`npx tsc --noEmit`, `npm run lint`, `npm test`,
`TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`,
`npm run build`.

## Assembled

- Banner: the pull's write path, `GoogleEventIn`, etag handling, the Google
  client, the client-side drop.
- Stark + Vision: always.
- Strange: the sheet is visible.
- Captain: a new column, a new action and a new write rule.

## Facts (Banner, at `6656fed`)

- Pull files live in `src/lib/` (`calendarEventPull.ts` binding and only
  writer, `calendarPullRun.ts` steps, `calendarSyncPull.ts` `planPull`
  :163). Insert `writeInsert` :126-136, update `writeUpdate` :137-151.
- **Unchanged etag is skipped with no write** (`calendarSyncPull.ts`
  :145-148, :227-229). So the backfill needs a new small write for skipped
  rows that lack the series id (sync row only, never `CalendarEvent`).
- Sync token on `LinkedCalendar.syncToken`; saved only after a clean run
  (`calendarPullRun.ts:127-131`). No token: window now-30 to now+365 days.
  Token cleared today only by a 410/400 restart and account handover.
- **The pull never deletes rows Google stops listing**; only `cancelled`
  items delete (`calendarSyncPull.ts:172-175`).
- `GoogleEventIn` (`google/types.ts:47-60`) does not type
  `recurringEventId`, `originalStartTime`, `start.timeZone`; the raw data
  carries them (`calendarEventCalls.ts:179-180`). The list asks
  `singleEvents=true`, so each day is its own row with Google's instance id.
- Google client `calendarEventCalls.ts`: `getEvent`, `updateEvent` (PATCH,
  optional If-Match), all `sendUpdates=none`; `fetchFn` injected, tests use
  a fake.
- Push: `afterEventSaved` (`actions/calendar.ts:41-44`) to `pushEventCopies`
  to `planSync`; a drag of a pulled event PATCHes its own instance. The pull
  never calls `afterEventSaved`. **Double-push risk is inside the new
  action:** patching the parent and also calling `afterEventSaved` would be
  two Google writes for one drop.
- Directions `off | outbound | twoWay` (`calendarSyncVocabulary.ts:7`);
  unlinked means no `LinkedCalendar` row. The action checks the event's
  `sourceLinkedCalendarId` row is `twoWay` with account status ok.
- Client: `CalendarEventView` (`types.ts:105-139`) has no series id; add via
  `CALENDAR_EVENT_SELECT` and `toCalendarEventView`
  (`calendarEventQuery.ts`). Drop path `useEventMoves.ts` `drop` :125-133,
  `save` :75-103. `ConfirmSheet.tsx` is the closest house sheet.
- `moveCalendarEvent(id, newStartIso)` (`actions/calendar.ts:268`); pure
  rules `calendarMoveRules.ts` (`parseMoveStart`, `planMove`).
- Tests: pull harness `testing/calendarPullRunHarness.ts`, push harness
  `testing/calendarSyncPlanHarness.ts`, Google call fakes in
  `google/calendarEventCalls.test.ts`.

## Fury's structure calls (from the facts)

- **Google instance ids change when a series' start time changes** (an
  instance id carries its original start). So after "All of them", the
  dragged row may be deleted and re-inserted by the pull with a new id.
  Undo therefore cannot hold the old event id: the action returns the id of
  the dragged day's row after the pull, and Undo calls the same action with
  that id and the original start. The server still computes the minutes.
- **The shift is wall-clock minutes**, computed in the household zone from
  the stored row and the new start (same day only, Q1 enforced on the
  server too), then applied to the parent's start and end in the parent's
  own `timeZone`. Pure function, tested across both clock changes.
- **Safety net for stale rows:** the pull deletes only what Google marks
  cancelled. After the pull, the action lists the series' current instances
  in the pull window (`events.instances`) and removes only Marshee rows of
  that series and calendar that Google no longer lists. One reconcile in a
  pure planner, never a hand loop over rows.
- The action does not call `afterEventSaved`; it writes Google once (the
  parent), then pulls. One Google write per drop.

## Fury's calls on pass 1

- **The migration's token clear stays.** Vision: safe for Marshee's data,
  but unneeded and it drops an unread token. It is already applied on the
  dev branch; editing an applied migration makes a checksum mismatch, and
  `prisma migrate dev` on drift offers a reset of the dev branch (the
  danger register). The loss needs an event moved far outside the window
  in the minutes between the last pull and the deploy, the same exposure as
  a 410 restart. Kept, recorded here.
- **A dead Google grant during "All of them"** (Captain, the action's own
  `getAccessToken` drops `tokenFailReason`): fixed in F1 by marking the
  account needs-relink the way the pull does.

## Contracts

Common to every contract: the danger register above binds; stage by
explicit path; `git show --stat HEAD` after each commit; commit message
ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No
agent calls the real Google API: every Google call is tested with an
injected fake `fetchFn` or fake deps. Sizes: report `wc -l` for every file
touched; STRUCTURE.md caps apply.

### C1: The series id column, the pull fills it, the one-time backfill
- **Status:** DONE `15cf257` (migration applied to the dev branch, host `ep-hidden-pine-…-pooler` checked; SQL: ADD COLUMN plus the twoWay token clear; `planPull` gains `seriesFills`, written by `writeSeriesFill` (sync row field only, counts no change, a failed fill keeps the token unsaved); +10 tests, npm test 1935, UTC 1925 + 10 skips; tsc and build blocked by a worktree with no `node_modules` of its own, Fury ran `npm ci` in the worktree; commit trailer says Sonnet 5.5, left as is)
- **Objective:** every pulled event row knows its Google series id, for
  new pulls and for rows already here, without deleting or rewriting
  anything else.
- **May touch:** `prisma/schema.prisma` (one field on `CalendarEventSync`:
  `googleSeriesId String?`), a new migration folder
  `prisma/migrations/20261120000000_calendar_series_id/migration.sql`,
  `src/lib/google/types.ts` (`GoogleEventIn` gains `recurringEventId?`,
  `originalStartTime?`, `start.timeZone?`/`end.timeZone?`),
  `src/lib/calendarSyncPull.ts`, `src/lib/calendarEventPull.ts`,
  `src/lib/calendarPullRun.ts` (only if the deps type needs the new write),
  their tests (`calendarSyncPull.test.ts`, `calendarPullRun*.test.ts`),
  `src/lib/testing/calendarPullRunHarness.ts`,
  `docs/structure/calendar-sync.md` (the column and who fills it).
- **Must not touch:** anything under `src/app/`, `src/components/`, the
  push path (`calendarEventPush.ts`, `calendarSyncPlan.ts`,
  `calendarSyncRules.ts`), `User` anything, `package.json`.
- **Work:**
  1. Migration SQL, two statements only: `ALTER TABLE "CalendarEventSync"
     ADD COLUMN "googleSeriesId" TEXT;` and the backfill trigger
     `UPDATE "LinkedCalendar" SET "syncToken" = NULL WHERE "direction" =
     'twoWay';` (a cleared token makes the next pull a full-window pull;
     the token is rebuilt by that pull; nothing is deleted). Show the SQL
     in the report. Apply to the dev branch with `npx prisma migrate
     deploy` only after `.env`'s host is confirmed the dev branch (print
     the hostname only). Then `npx prisma generate`.
  2. `planPull`: inserts and updates carry `googleSeriesId` (Google's
     `recurringEventId`, or null). A row whose etag is unchanged but whose
     stored `googleSeriesId` differs from Google's gets a new plan entry
     that writes **only the sync row's `googleSeriesId`** (never
     `CalendarEvent`, never `updatedAt` of the event, never `etag`). The
     known-row shape `planPull` reads gains `googleSeriesId`. A second
     identical run plans nothing for those rows.
  3. `calendarEventPull.ts` performs that write.
- **Verification:** gauntlet (all five commands). New tests: insert carries
  the id; update carries it; unchanged etag with missing id writes the id
  only; unchanged etag with the id already set plans nothing; a
  non-repeating event stays null; cancelled items still delete as before.
  `npx prisma migrate status` on the dev branch shows it applied.
- **Evidence:** the SQL text; test names and counts before and after (npm
  test and the UTC run); `prisma migrate status` output; `wc -l`.
- **Done:** all of the above, one commit.

### C2: The "All of them" action, server side
- **Status:** DONE `ec0389f` (new `calendarSeriesRules.ts` 113, `calendarSeriesMove.ts` 123, action `actions/calendarSeries.ts` 101 holding the db and Google bindings; `runPull`/`pullCalendars` take `onlyCalendarId`; `deletePulledEvent` exported from calendarEventPull.ts = the pull's `writeDelete`; `listInstances` in calendarEventCalls.ts 244; npm test 1988, UTC 1978 + 10 skips, tsc, lint, build green; captured PATCH `{"start":{"dateTime":"2026-06-01T07:30:00-06:00","timeZone":"America/Denver"},...}` to the parent with If-Match. `revalidatePath("/calendar")` direct (`refreshCalendarViews` is private in calendar.ts). Stark's note led to C2a)

### C2a: The pull after "All of them" is never skipped by the lease
- **Status:** DONE `e8f0b87` (`runPull` option `ignoreLease`: claim with staleBefore now+1 ms, still stamps the lease and still needs twoWay; the series action passes it; +1 test (claimed 5 s ago: series path pulls, plain force skips); npm test 1989, UTC 1979 + 10 skips, tsc, lint, build green)
- **Why:** the series pull goes through the 30 second force lease. Opening
  the Calendar pulls, so a drop within 30 seconds finds the lease taken: no
  pull, the page refresh redraws the old times over the optimistic move, and
  no Undo comes back. Concrete and likely.
- **May touch:** `src/lib/calendarPullRun.ts`, `src/lib/calendarEventPull.ts`,
  `src/lib/calendarSeriesMove.ts` only if its pull dep's shape changes,
  `src/app/actions/calendarSeries.ts` (binding only), their tests.
- **Work:** the one-calendar pull used by the series action claims the
  calendar whatever the lease says (it still stamps the lease, so the
  regular pull waits behind it). Existing callers unchanged. A second pull
  running at the same moment is acceptable: writes are keyed by the unique
  (calendar, Google id) pair, a clash counts as a failed write, the token is
  then not saved and the next pull settles it; say so in a comment.
- **Verification:** gauntlet; a test that a calendar claimed 5 seconds ago
  is still pulled by the series path and still skipped by the normal force
  pull.

- **Objective:** `moveCalendarSeries(eventId, newStartIso)` shifts the
  whole Google series by the drop's wall-clock minutes, with one Google
  write, then makes Marshee match Google.
- **May touch:** new `src/lib/calendarSeriesRules.ts` (pure) and test; new
  `src/lib/calendarSeriesMove.ts` (the body, deps injected so tests use
  fakes) and test; new `src/app/actions/calendarSeries.ts` (`"use server"`,
  guard plus a thin call); `src/lib/google/calendarEventCalls.ts` and its
  test (add `listInstances(calendarId, eventId, timeMin, timeMax)` if
  needed, and `getEvent` / `updateEvent` reuse); `src/lib/google/types.ts`
  (only what C1 did not add); `src/lib/calendarEventPull.ts` and
  `src/lib/calendarPullRun.ts` (an option to pull **one** linked calendar
  by id, force lease; the existing callers unchanged); their tests.
- **Must not touch:** `src/app/actions/calendar.ts`, `src/components/`,
  the push path, `prisma/`.
- **Rules (pure, in `calendarSeriesRules.ts`):**
  - `planSeriesShift(stored, newStart, timeZone)`: refuses all-day and
    multi-day (reuse `planMove`'s refusals from `calendarMoveRules.ts`,
    never copy them); refuses a different household day with **"Only this
    one can move to another day."**; returns the shift as wall-clock
    minutes (7:00 to 7:30 is +30 on any day, including the clock-change
    days).
  - `shiftParentTimes(parent, minutes)`: moves the parent's `start` and
    `end` `dateTime` by those wall-clock minutes **in the parent's own
    `timeZone`** (fall back to the household zone if Google sends none),
    keeping the `timeZone` field. Refuses an all-day parent.
  - `planSeriesCleanup(rows, googleInstanceIds)`: the Marshee rows of that
    series and calendar whose Google id Google no longer lists.
- **The body, in order:** read the row (`startAt`, `endAt`, `allDay`,
  `sourceLinkedCalendarId`, its sync row's `googleSeriesId`); no series id
  means **"That event doesn't repeat."**; the source calendar must exist,
  be `twoWay` and its account ok, else **"That calendar isn't syncing
  both ways any more."**; `planSeriesShift`; get an access token; `getEvent`
  the parent (`googleSeriesId`); `shiftParentTimes`; `updateEvent` the
  parent (PATCH start and end only, If-Match its etag). Any Google failure
  returns **"Couldn't change Google Calendar. Nothing moved."** and writes
  nothing to the database. On success: pull that one calendar; then list
  the series' instances for the pull window and delete (through the pull's
  `writeDelete`, which takes copies off first) only the rows from
  `planSeriesCleanup`; then find the dragged day's row after the pull (same
  calendar and series, `startAt` equal to the new start) and return
  `{ undo: { eventId, startIso } }` with `startIso` the original start, or
  `{}` with no undo if that row is not found. **It never calls
  `afterEventSaved` or `pushEventCopies`** (one Google write per drop).
- **The action:** `getVerifiedUser` and `MANAGER_ROLES` exactly as
  `moveCalendarEvent` ("Only parents can do that."), `parseMoveStart`,
  then the body, then `revalidatePath` the calendar the same way
  `afterEventSaved` does (import, do not copy, if a shared helper exists).
  Returns `{ error?: string; undo?: { eventId: string; startIso: string } }`.
- **Verification:** gauntlet. Tests with fakes: kid refused (guard path by
  reading is acceptable; the body's tests take a role-free path);
  non-repeating refused; Off and unlinked calendar refused; different day
  refused; Google 412/404/500 on get or patch writes nothing (assert the
  fake db saw no write); success makes exactly one PATCH, to the parent
  id, with start and end moved +30 wall-clock minutes and `timeZone`
  kept; shift across 2026-03-08 and 2026-11-01 in America/Denver (a
  parent first dated in summer, drop in winter, and the reverse) under
  both `TZ` runs; cleanup deletes only listed-missing rows of that series
  and calendar; Undo is the same call with the opposite drop and gives the
  original times back; no call to the push path.
- **Evidence:** test names and counts; the PATCH body a test captured;
  `wc -l`.
- **Done:** one or two commits, all above.

### C3: The sheet, the client side
- **Status:** DONE `32696a8` (RepeatMoveSheet 70; useEventMoves 131 to 307 with pure `seriesShiftMinutes`, `shiftWallClock`, `applySeriesShift`, `movedAllText`, `seriesUndoRequest`; CalendarViews 490 to 494; seriesId from the source calendar's sync row; +6 tests, npm test 1995, UTC 1985 + 10 skips, tsc, lint, build green. CDP probe 112/112 on a harness mounting the real TimelineGrid, useEventMoves, RepeatMoveSheet, UndoBar with stubbed actions, 393x852 and 1024x768, light and dark; harness and 16 shots in the session scratchpad `harness-c3/`. Notes for the gates: `shiftWallClock` uses the same zone arithmetic as the server's `shiftParentTimes` (one source of truth?); Google's series id now reaches the browser; reduce motion and the real actions not probed)
- **Objective:** a drop of a repeating event asks "This one", "All of
  them", Cancel, as in the approved mock.
- **May touch:** `src/lib/types.ts` (`CalendarEventView.seriesId?:
  string | null`), `src/lib/calendarEventQuery.ts` (select and map it from
  the source calendar's sync row), `src/lib/useEventMoves.ts` and its test,
  new `src/components/RepeatMoveSheet.tsx`, `src/components/CalendarViews.tsx`
  (wiring only, stay within its size), `src/components/ConfirmSheet.tsx`
  only if a shared piece is lifted out of it, DESIGN.md text drafted by
  Strange later (not this contract).
- **Must not touch:** server files from C1 and C2 except importing
  `moveCalendarSeries`; the gesture machine files.
- **Work:** a drop of an event with a `seriesId` pauses: the block stays
  where it was dropped, lifted look kept, and `RepeatMoveSheet` opens with
  title "Move a repeating event", line "<title>, to <Thu 7:30 AM>.", and
  buttons **This one** (accent, top), **All of them**, **Cancel**, each 48px
  or more. Scrim tap = Cancel. Cancel glides the block back, saves
  nothing. Drop on another household day: no All of them, and the line
  "Only this one can move to another day. To move every <title>, drop it on
  the same day at the new time." **This one** = PR 4's save unchanged.
  **All of them**: every visible event with that `seriesId` shifts
  optimistically by the same wall-clock minutes; the action runs; success
  shows the UndoBar "Moved every <title> to <7:30 AM>" with Undo, which
  calls `moveCalendarSeries(undo.eventId, undo.startIso)` (no Undo button
  when the server returned none); failure puts every block back (glide)
  and shows the warn bar with the server's words. Kids and the Tablet
  never reach this (no drag). Events without a `seriesId` behave exactly as
  in PR 4. Reduce motion: no animation.
- **Verification:** gauntlet; unit tests for the new pure bits in
  `useEventMoves` (which events shift, the bar text, the undo call
  arguments); a real-touch probe on a harness page mounting the real
  `TimelineGrid`, `useEventMoves`, `RepeatMoveSheet` and `UndoBar` with
  stubbed actions (ok, refused, slow), the mission 70 harness pattern, at
  393x852 and 1024x768, light and dark: hold, drag, drop, sheet; each
  button; scrim; another day; non-repeating event never sees the sheet.
- **Evidence:** test counts; probe output; screenshots path; `wc -l`.
- **Done:** all above, committed.

## Execution log

- 2026-11-11: branch already at `origin/main` `6656fed`; mission 70 record
  fixed (DELIVERED, PR #112); Banner dispatched; Google docs read; mock
  sent to Bryce.
- 2026-11-11: Bryce asked for a draggable mock (done), then "Looks good,
  build it". Contracts C1 to C3 written.
- 2026-11-11: C1 done (`15cf257`). `npm ci` in the worktree. C2 dispatched,
  then stopped before it wrote anything when Bryce asked to pause for a
  restart. Next: C2, then C3, then the gates.

## Gate verdicts

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 3 | Vision (HEAD 10cee5e, scoped to F2, rulebook, status.md) | PASS | none | Gauntlet re-run green (2001; UTC 1991 + 10 skips; build exit 0). F2 touched only its two files. Every backticked name in the rulebook text exists (`useSeriesMove.ts` is the named future split). Phone test: repeat mark after a Refresh is true (insert writes the series id); the bar says "8 AM", not "8:00 AM" (Fury fixed status.md). Notes: the repeat mark's legibility on the event colour is Strange's; a never-ending daily test event leans on the mission-60 page cap, so the test event ends after two weeks |
| 2 | Vision (HEAD 2180a67, F1 ab3c648) | PASS | none | Gauntlet re-run green (2001; UTC 1991 + 10 skips; build exit 0). F1 diff within its list. Probe on the real `removeAllCopies`: source-only cleanup makes no call; a copy on another calendar still comes off when the source cancels. householdDate helpers identical to the old maths in both TZ runs. `getAccountAccessToken` marks needs-relink only on reconnect. Notes: fall-back-hour drop 1:30 MDT to 1:30 MST now ignored (no This one either; one hour a year); a same-day drop `planMove` refuses shows the another-day line (wording only); no repo test for the binding's no-Google-call; standing: regular-pull race, un-backfilled rows, token clear |
| 1 | Strange (HEAD cacb6c1) | PASS | none | 48px at Normal, 72 at Largest, nothing covers them; bottom sheet on phone (thumb zone), centred dialog on iPad; words match the mock; warn bar warn tokens, never red; reduce motion instant; lifted look kept. Harness had no `<main>` padding (artifact, fixed in Strange's copy). N1: on iPad the centred dialog covers the dropped block (ask Bryce: dock at bottom from md up?). N2: the mock's repeat mark is not on blocks (ask Bryce). N3: no gutter marker or tint while the sheet asks (write into DESIGN.md). N4: focus stays on body (as ConfirmSheet); px gutter wraps at Largest (pre-existing). DESIGN.md `RepeatMoveSheet` bullet drafted |
| 1 | Vision (HEAD cacb6c1) | BLOCK | `deletePulledEvent` (calendarEventPull.ts:201) runs `removeEventCopies` with no exception, so the series cleanup sends a real Google DELETE (and a token refresh) to the source calendar for every stale row: a renamed daily series is ~395 calls in one request, breaks one-write-per-drop, can outlive the function so the client glides back after Google already moved (a retry shifts twice). Fix: exclude the source calendar in the series cleanup (and in the pull's `writeDelete`), test zero Google calls | Gauntlet re-run green (1995; UTC 1985 + 10 skips; build 0); boundaries clean. Token clear in the migration: no data loss, but unneeded (the daily `rewindow` cron backfills) and drops an unread token (tiny loss window); Fury keeps it, see below. Cleanup runs even if the pull failed (gate on `failed === 0`). Zero-minute shift on the fall-back hour PATCHes a no-op (refuse 0 both sides). Spring-forward gap on a parent first dated 2026-03-08 moves end only (extreme). Regular-pull race can resurrect old rows (accepted in C2a). Un-backfilled rows invisible to cleanup. Client and server shifts agree on every probe |
| 1 | Captain (HEAD cacb6c1) | BLOCK | (1) `actions/calendarSeries.ts:40` reads `LinkedCalendar` itself; calendar-sync.md makes `linkedCalendarsRead.ts` the only reader (fix: `loadSeriesCalendar`). (2) `:21,:61` imports `listInstances` and gives it `fetch`; only `calendarApi.ts` may (fix: `listGoogleInstances` there). (3) wall-clock fixed point three times (`zoneMidnightInstant`, `dateTimeAt`, `shiftWallClock`); STRUCTURE.md `householdDate.ts` rule (fix: `wallClockMs`, `instantAtWallClock`, `shiftWallClockInZone` in householdDate.ts, tests there) | Hook should call `planSeriesShift` instead of restating it; action holding bindings allowed; `getAccessToken` third copy and drops `tokenFailReason` (a dead grant never marks needs-relink: Vision's call); `seriesId` in the browser breaks no rule, write it down; rulebook must name `deletePulledEvent`, `planSeriesCleanup`, `onlyCalendarId`/`ignoreLease`; trend lines useEventMoves 307/218, CalendarViews 494/214. Drafts (a) calendar.md series section and (b) calendar-sync.md edits saved for Bryce |

## Delivery

(pending)

### F1: Pass 1 fixes (Vision and Captain blockers, Vision notes)
- **Status:** DONE `ab3c648` (all seven items; `writeDelete(del, calendarId)` excludes the pulled calendar, so the pull's cancelled delete and the series cleanup never call Google for the source; cleanup gated on the pull's `failed === 0`; `SHIFT_NOTHING_ERROR` "That's already its time." and the client's `isSeriesNoShift`; `loadSeriesCalendar` in linkedCalendarsRead.ts; `listGoogleInstances` in calendarApi.ts; `wallClockMs`, `instantAtWallClock`, `shiftWallClockInZone` in householdDate.ts (zoneMidnightInstant uses it; the hook uses `planSeriesShift`); `getAccountAccessToken` in calendarEventPull.ts marks needs-relink. npm test 2001, UTC 1991 + 10 skips, tsc, lint, build ran (exit not captured; Vision re-runs). useEventMoves 310)
- **Objective:** the series cleanup never touches Google; the series move
  follows the readers and Google-call rules; the wall-clock shift has one
  home.
- **May touch:** `src/lib/calendarEventPull.ts`, `src/lib/calendarPullRun.ts`,
  `src/lib/calendarSyncPull.ts` (only if `writeDelete`'s input needs the
  calendar id), `src/lib/calendarSeriesMove.ts`, `src/lib/calendarSeriesRules.ts`,
  `src/app/actions/calendarSeries.ts`, `src/lib/google/calendarApi.ts`,
  `src/lib/linkedCalendarsRead.ts`, `src/lib/householdDate.ts`,
  `src/lib/useEventMoves.ts`, and the tests of each
  (`householdDate.test.ts`, `calendarSeriesMove.test.ts`,
  `calendarSeriesRules.test.ts`, `calendarPullRun*.test.ts`,
  `useEventMoves.test.ts`), `src/lib/testing/calendarPullRunHarness.ts`.
- **Must not touch:** docs, DESIGN.md, STRUCTURE.md (Fury applies the
  approved text), components, the gesture files, `prisma/`.
- **Work:**
  1. (Vision blocker) The series cleanup removes only Marshee rows: delete
     with the series' own calendar excluded from `removeEventCopies`
     (`exceptLinkedCalendarId`), then the event row. A row with no other
     copies makes no token call and no Google call. The pull's own
     `writeDelete` for a cancelled item excludes the pulled calendar the
     same way (Google already removed it there). Test: a cleanup of a row
     whose only sync row is the source makes zero Google calls (through
     fake push deps or the binding).
  2. (Vision note) The cleanup runs only when the pull reported
     `failed === 0`; `pullCalendar` returns the result.
  3. (Vision note) A shift of 0 minutes is refused on the server
     (`planSeriesShift`: "That's already its time.") and on the client the
     drop puts the block back with nothing saved and no sheet.
  4. (Captain 1) `loadSeriesCalendar(calendarId)` in
     `linkedCalendarsRead.ts`; the action uses it.
  5. (Captain 2) `listGoogleInstances` in `calendarApi.ts`; the action
     stops importing `calendarEventCalls.ts`.
  6. (Captain 3) `wallClockMs`, `instantAtWallClock` and
     `shiftWallClockInZone` in `householdDate.ts` (`zoneMidnightInstant`
     uses `instantAtWallClock`), tests there across both 2026 clock
     changes; `shiftParentTimes` uses them and keeps only Google's text
     parsing and RFC 3339 formatting; `useEventMoves.ts` calls
     `shiftWallClockInZone` with `HOUSEHOLD_TIME_ZONE` and reads a drop's
     minutes through `planSeriesShift` (no restated rule).
  7. (Captain note, Fury's call) A dead grant during "All of them" marks
     the account needs-relink, reusing the pull's token-failure handling
     (no new copy of that step; if that needs a shared helper, it goes in a
     `server-only` lib file the pull and the action both use).
- **Verification:** full gauntlet; all series tests green in both TZ runs;
  `wc -l` of touched files.
- **Done:** committed, evidence reported.

## Bryce's answers after pass 1 (2026-11-11: "I agree with all those recommendations")

- Rulebook additions approved (Captain's drafts (a) and (b), Strange's
  `RepeatMoveSheet` bullet).
- N1: on the iPad the sheet docks at the bottom like the phone, so the
  dropped block stays visible.
- N2: repeating events show a small repeat mark in this PR.

### F2: The sheet docks at the bottom on the iPad; the repeat mark
- **Status:** DONE `80febc1` (sheet bottom-aligned at every width, `md:max-w-md` centred, rounded top; Lucide `Repeat` 1em, muted, inside the truncating title span, sr-only ", repeats"; TimelineDayColumn 265 to 275, RepeatMoveSheet 71; npm test 2001, UTC 1991 + 10 skips, tsc, lint, build exit 0. Probe 12 configs: sheet bottom = viewport bottom, icon on Wake Up only, kept when lifted. Stark reported FAILED on one condition: at 1024x768 Largest the 390px-tall sheet covers a 7:30 block at the harness's scroll. **Fury's call: accepted.** A bottom sheet covers whatever sits in the lower part of the screen, on the phone too (Strange pass 1, N1); the sheet's line says the time in words; Bryce's choice was the bottom so the block shows in most cases. Not a scroll-into-view in this PR: it would touch the gesture-side hook. Told to Bryce in the final report.)
- **May touch:** `src/components/RepeatMoveSheet.tsx`,
  `src/components/TimelineDayColumn.tsx` (the block), and only if the mark
  needs a shared piece, `src/lib/types.ts`. Tests if any pure helper is added.
- **Must not touch:** docs, DESIGN.md, STRUCTURE.md (Fury applies them),
  server files, the gesture files, `ConfirmSheet.tsx`.
- **Work:**
  1. `RepeatMoveSheet` stays a bottom sheet at every width: from `md` up it
     sits at the bottom, centred, the same `max-w-md` width, rounded top,
     with the safe-area bottom padding the phone has. Scrim, Escape, focus
     and reduce motion unchanged.
  2. A timed block on the hour timeline whose event has a `seriesId` shows
     Lucide's `Repeat` icon (outline, the house icon set) after the title,
     sized in rem to the title's text, `text-muted`-style colour on the
     block, `aria-hidden` with the block's accessible name gaining
     ", repeats". It never pushes the title out: when the block is too
     narrow for title and icon, the title wins (the icon is the part that
     clips or hides). The lifted block keeps it.
- **Verification:** gauntlet; the harness-c3 probe re-run (Strange's padded
  copy at `harness-c3/strange/`) at 393x852, 1024x768, 768x1024, Normal and
  Largest, light and dark: the sheet's bottom edge at the viewport bottom
  on iPad, the dropped block not covered on a 7:30 AM drop; the icon on
  Wake Up blocks, not on Dentist; screenshots saved there.
- **Done:** committed with evidence.

