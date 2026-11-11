# Mission 71: Calendar full screen PR 5, repeating events ("This one" or "All of them")

- **Status:** MOCK SENT, waiting on Bryce's OK (no builder dispatched)
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

## Contracts

(written after Bryce's OK on the mock)

## Execution log

- 2026-11-11: branch already at `origin/main` `6656fed`; mission 70 record
  fixed (DELIVERED, PR #112); Banner dispatched; Google docs read; mock
  sent to Bryce.

## Gate verdicts

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Delivery

(pending)
