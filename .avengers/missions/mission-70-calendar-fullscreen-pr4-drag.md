# Mission 70: Calendar full screen PR 4, drag to reschedule

- **Status:** DELIVERING (all gates PASS: Vision pass 3, Captain pass 3, Strange pass 3) (Bryce OK'd the mock 2026-11-10: "Looks great. Lets start"; gutter marker added at his request)
- **Started:** 2026-11-10 · **Updated:** 2026-11-10
- **Plan:** `.avengers/plans/calendar-fullscreen-v1.md`, "PR 4: Drag to reschedule (decisions 17 to 22; small call H; answers 5, 6)"
- **Branch:** `claude/calendar-fullscreen-pr4-drag`, cut from `origin/main` `f8289db` (PR 3 merged as #111)
- **Mock:** `.avengers/mocks/calendar-pr4-drag-mock.html` (sent to Bryce 2026-11-10)

## Brief

Press and hold a timed event on the hour timeline for 400 ms without moving
8px and it lifts (a little bigger, a shadow, an accent outline, its time line
showing the new range). Drag it up or down (15-minute snap) or across to
another day column. Holding near the top or bottom edge scrolls the hours.
Let go and it stays (optimistic), the server saves it through the same write
and Google push that editing uses, and a shared bar says "Moved to Wed
2:15 PM" with Undo for 5 seconds. A refused drop glides back with a one-line
reason in the warn colour. A quick touch still scrolls, swipes or opens.

## Done means

- Hold and drag switched on in `calendarGesture.ts` (`HOLD_MS` 400), driven
  only by `usePagedSwipe.ts`. No second hook, no second timer.
- Committed sequence tests, each ending idle: hold, move, lift; hold then a
  second finger; hold then cancel; hold then lift without moving; a drop
  outside the grid; exactly 8px before the hold fires (scroll or slide, never
  a hold); a tap after a drag still opens.
- Pure drop maths (`timelineDrag.ts`, `resolveDrop`) with tests: live
  pixels-per-minute, column under the finger, 15-minute snap, clamp in the
  day, DST days.
- One Server Action `moveCalendarEvent(id, newStart)`: parents only, the
  server computes the end from the stored length, bounds the date, refuses
  all-day and multi-day, and reaches the database and Google through the
  same code path as `updateCalendarEvent`.
- Nothing lifts for a kid or the Tablet login, nor all-day, multi-day or
  tasks. Repeating (Google-pulled) events lift and move that one day.
- No React render per move (transform on the element). Text selection and
  the iPhone long-press menu off on blocks. Page cannot slide, hours cannot
  scroll natively while lifted; edge strips auto-scroll.
- Undo bar (shared component) for 5 seconds; refusal in warn, never red.
- Database check: drag 9 to 10 AM onto 2:15 PM, the row reads 2:15 to 3:15.
- DESIGN.md and STRUCTURE.md updated in this PR (drafted by Strange and
  Captain, quoted to Bryce).
- Gauntlet green, gates pass, merged, production deploy checked,
  `git log origin/main..HEAD` empty, Bryce's screen-recording phone test in
  `.avengers/status.md`.

**Out of scope:** "This one / All of them" (PR 5); dragging past the screen
edge to another page; resizing an event's length; dragging in Month,
Schedule or the all-day row; moving `SwipeActions.tsx` onto the machine.

## Facts (Banner, at `f8289db`)

- Old branch `origin/claude/calendar-cd1`: `src/lib/timelineDrag.ts` (180,
  pure: `SNAP_MINUTES`, `minutesFromPixels`, `snapMinutes`,
  `clampStartMinutes`, `minutesOfDayToDate` (DST safe),
  `columnIndexFromOffset`, `columnDateForIndex`), its test (27 cases), and
  `src/lib/testing/withTimeZone.ts` port as-is (their imports are
  byte-identical on main). `useLongPressDrag.ts` must NOT be ported (source
  of the 8px two-hook blocker). Its `moveCalendarEvent` never pushed to
  Google, re-validated people needlessly, did not bound the date.
- `updateCalendarEvent` (`src/app/actions/calendar.ts:193-252`): guard
  `getVerifiedUser` + `MANAGER_ROLES` ("Only parents can do that."),
  `validateEventInput`, a transaction, then `pushEventCopies` (:248) and
  `refreshCalendarViews` (:250). No shared calendar write module exists.
  `planSync` keeps the source calendar of a pulled event while it is
  pushable (`calendarSyncRules.ts:96-97`), so a time change goes back to it.
- `MANAGER_ROLES = ["admin","parent"]`; the Tablet (`device`) and kids are
  not parents.
- Blocks: `TimelineDayColumn.tsx:139-233`, one `<button>` per block, no
  data attribute. Geometry `blockGeometry` (`timelineLayout.ts:135`) pads to
  `MIN_BLOCK_MINUTES` 30. Live hour height from `useTimelineZoom`;
  `pxPerMinute` at `TimelineGrid.tsx:205`. Multi-day: `belongsInAllDayRow`
  (`timelineLayout.ts:217`). Tasks live in the all-day strip.
- `usePagedSwipe.ts`: `isOnBlock` option exists (:52), unused; `feed()`
  passes no options (:275); `apply()` drops hold and drag effects at
  `default` (:268); capture on `event.currentTarget` (the grid root).
- Optimistic pattern: `PantryList.tsx:75` (`useOptimistic`). No toast or
  undo bar exists. Warn pattern `bg-warn-soft text-warn` with `role="alert"`
  (`EventDetailSheet.tsx`).
- The worktree has a `.env` whose host is the dev branch
  (`ep-hidden-pine-…-pooler`, hostname only), so the database check can run
  here with `db:seed-calendar` / `db:clean-calendar`.
- `HOLD_MS` is 500 in code; the plan (decision 17) says 400. C1 sets 400.

## Danger register

Same as AGENTS.md: never `npm run db:seed` / `db:reset`; never a clean or
reset script for `User`; no migrations expected (stop and ask if one seems
needed); never print `.env` (hostname only); stage by explicit path, run
`git show --stat HEAD` after each commit; no direct pushes to `main`. Test
data only through `db:seed-calendar` / `db:clean-calendar`. No real Google
calendar is touched by any agent.

## Gauntlet

`npx tsc --noEmit`, `npm run lint`, `npm test`,
`TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`,
`npm run build`.

## Assembled

- Banner (done): brief above.
- Stark + Vision: always.
- Strange: all of it is visible.
- Captain: new files, a new write path rule, the gesture machine rule.

## Contracts

### C1 — The pure parts (machine on, drop maths)
- **Status:** DONE `6b9ad33` (55 new tests: 41 in timelineDrag.test.ts (27 ported, 14 `resolveDrop`), 14 in calendarGesture.test.ts; npm test 1858 to 1913 counting C2's 13; UTC run 10 skips = the 7 before plus 3 ported DST skips; `dragCancel` is the one put-down for every hold exit except a lifted drag; `resolveDrop` also takes `visibleHeightPx` to tell "outside the grid"; `npm run build` not run)
- **Objective:** switch hold and drag on in the gesture machine and bring the
  drop maths over, all pure and tested.
- **Boundaries:** may touch `src/lib/calendarGesture.ts`, `src/lib/calendarGesture.test.ts`,
  new `src/lib/timelineDrag.ts`, new `src/lib/timelineDrag.test.ts`, new
  `src/lib/testing/withTimeZone.ts` (the three new files are ported from the CD1 branch named in Facts). · must not touch everything else.
- **Work:** `HOLD_MS` 400. Review the hold and drag branches of `gestureStep`
  and make sure: a second finger during holding or dragging cancels the drag
  and hands to pinch; cancel during dragging emits `dragCancel`; a hold that
  lifts without moving emits a distinct effect so the caller can put the
  block down (add `holdEnded` or reuse `dragCancel`, document which); while
  holding or dragging no `setOffset`/`settle` is ever emitted; the click
  after a hold or drag is swallowed (a lifted block must not also open).
  Keep the one rule at exactly 8px. Add `resolveDrop(...)` (pure, in
  `timelineDrag.ts`): given the grab offset, finger position relative to the
  grid, scroll top, live px per minute, column count and width, column days,
  the event's original start and length in minutes, return the new start
  `Date` or `null` (no move, or outside the grid). Snap 15, clamp inside the
  day, DST safe via `minutesOfDayToDate`.
- **Verification:** `npm test` and the UTC line pass; new sequence tests
  listed in "Done means", each asserting the final state is `idle`.
- **Evidence:** test counts before and after, the names of the new tests,
  line counts of touched files.
- **Done:** Vision can read every sequence test ending in idle.

### C2 — The save (one write path)
- **Status:** DONE `54bcb60` (shared `afterEventSaved` at calendar.ts:41, called by update :257 and move :293; pure rules in new `calendarMoveRules.ts` 69 + 13 tests; calendar.ts 420 to 463; DB check moved a seeded 9 to 10 AM row to 2:15 to 3:15 via the action's body in a script, not the action itself (needs a cookie session), so C4 repeats it through the app; Stark ran `npx prisma generate` and a no-save install of `@vercel/blob@2.9.0`, a worktree env gap. Extra refusal "That move would cover a whole day" for the spring-forward edge)
- **Objective:** `moveCalendarEvent(id, newStartIso)` that shares
  `updateCalendarEvent`'s write and Google push.
- **Boundaries:** may touch `src/app/actions/calendar.ts`, a new server-only helper in
  `src/lib/` if the shared step needs one (name it in the report), its test. · must not touch `prisma/schema.prisma`, the sync files'
  behaviour (`calendarEventPush.ts`, `calendarSync*.ts`), any client file.
- **Work:** guard as `updateCalendarEvent`; parse and bound the date
  (refuse outside 2000-01-01 to 2100-01-01); load the row; refuse missing,
  all-day, and multi-day (same rule as `belongsInAllDayRow` on the stored
  times); do not refuse on `rrule` (decision 22); end = new start + stored
  length (the client sends no length); write only `startAt`/`endAt`; then
  the same `pushEventCopies` + `refreshCalendarViews` step as
  `updateCalendarEvent`, extracted so both call one function. Do not
  re-validate people. Return the existing `CalendarEventActionResult` shape
  with a one-line plain reason on refusal. Pure checks (bound, length, the
  multi-day rule) are testable in a pure module.
- **Verification:** gauntlet; a test that a crafted length is impossible
  (signature takes no length) and the pure checks; database check: seed with
  `npm run db:seed-calendar`, call the write path from a script or the
  running app as a parent for a 9 to 10 AM seeded event moved to 2:15 PM,
  read the row (2:15 to 3:15), then `npm run db:clean-calendar`. If the
  Server Action cannot be called from a script (`server-only`), do the
  database check through the running app in C4 instead and say so.
- **Evidence:** diff summary, test names, the one shared function's name and
  both call sites.
- **Done:** `grep -n pushEventCopies src/app/actions/calendar.ts` shows the
  update and move paths reach the push through one function.

### C3 — The lift (wire the machine to the blocks)
- **Status:** DONE `be15b35` (usePagedSwipe 342 to 393, over the soft cap; new useTimelineDrag 327; TimelineGrid 407; TimelineDayColumn 261; TimelinePage 295; CalendarViews 483; gauntlet and build green. Real CDP touch, 13/13 probes, on a stand-alone page mounting the real `TimelineGrid` tree with the production build's CSS (the mission 19 harness pattern), because no agent can sign in: the app has no test login and only Bryce's real passwords exist. Not covered by the probe: the real `canManage` for kid and Tablet logins, the app shell. Notes: header tint covers the all-day strip too; shadow is `shadow-lg`, lighter than the mock; an event crossing midnight does not lift; time line hidden in narrow columns, the marker shows the time; probe first attached to another session's Chrome on port 9333, re-run clean on 9471)
- **Objective:** a held block lifts and follows the finger with its new time,
  with no React render per move.
- **Boundaries:** may touch `src/lib/usePagedSwipe.ts`, `src/components/TimelineGrid.tsx`,
  `src/components/TimelinePage.tsx`, `src/components/TimelineDayColumn.tsx`,
  `src/components/CalendarViews.tsx` (passing `canManage` down only), a new `src/lib/useTimelineDrag.ts` (or similar, the DOM side of the lift,
  NOT a second gesture machine: it only carries out effects), `src/app/globals.css`
  only if a class is needed. · must not touch `calendarGesture.ts` (C1 owns it), the server, sheets.
- **Work:** blocks that may lift carry `data-drag-id` (only when the viewer
  can edit, the event is timed, single-day, not a task). `isOnBlock` reads
  it. `usePagedSwipe` passes `holdEnabled` and runs the hold timer (one
  `window.setTimeout`, element stored in a ref, cleared on
  `clearHoldTimer`), and forwards `holdStarted`/`dragMove`/`dragDrop`/
  `dragCancel` to callbacks. The lift: scale and shadow and accent outline
  per the mock, transform follows the finger snapped to 15 minutes and to a
  column, the time line text updated directly, the target day's header
  tinted. A gutter marker (Bryce, 2026-11-10, from a Google Calendar
  screenshot): while lifted, a small accent time ("4:30", no AM/PM) sits in
  the hour column at the block's new start and moves with it in 15-minute
  steps; an hour label it would overlap is hidden until the drop. Written
  directly to the DOM like the block, no React render per move. Edge strips (44px) at top and bottom scroll the hours with
  `requestAnimationFrame` while held there. While lifted the page cannot
  slide and the scroller cannot scroll natively. iOS decides "this touch
  scrolls" at touchstart, so toggling `touch-action` after the hold does
  nothing (Bryce saw exactly this in the first mock: the hours scrolled
  under the lifted block). The fix: one non-passive `touchmove` listener on
  the grid root that calls `preventDefault()` only while the machine is
  holding or dragging. Do NOT put `touch-action: none` on blocks: a
  vertical scroll that starts on a block must still scroll; prove both. `user-select: none` and `-webkit-touch-callout: none` on
  blocks. Reduce motion: the glide back is instant. On drop calls an
  `onDrop(eventId, newStart)` prop (C4 fills it); in C3 it may log.
- **Verification:** gauntlet; real touch with CDP `Input.dispatchTouchEvent`
  on `npm run build && npm start` (or dev): hold 450 ms then drag, the block
  follows, label updates; a quick tap opens; a vertical drag from a block
  scrolls; a sideways drag from a block slides the page; exactly 8px before
  400 ms is not a hold; after all of that a page swipe still turns.
- **Evidence:** the probe script (kept in the scratchpad, path named), its
  output, line counts.
- **Done:** every probe above passes with numbers.

### C4 — The drop (optimistic move, Undo bar, refusal)
- **Status:** DONE `1540015` (new useEventMoves 131 + 4 tests, UndoBar 72, CalendarViews 483 to 490; npm test 1913 to 1917, UTC 10 skips unchanged; gauntlet and build green. Real CDP touch 15/15 on a stand-alone harness mounting the real TimelineGrid, useEventMoves, UndoBar and CalendarAddDial with a stubbed moveCalendarEvent (ok, refused, slow 1 s): first frame after release already at 2:15 PM, no frame at 9 AM; Undo sends the 9 AM ISO; bar gone at 5.2 s; refusal glides back (FLIP, about 260 ms) with a warn bar; bar 16px clear of the + on phone and iPad. The bar appears when the save lands, not at the drop. Database check through the app not run: no agent can sign in, so it goes on Bryce's phone list; C2 proved the write on the dev database)
- **Objective:** a drop moves the event at once, saves, offers Undo for 5
  seconds, and a refusal glides back with a warn line.
- **Boundaries:** may touch `src/components/CalendarViews.tsx`, a shared
  new `src/components/UndoBar.tsx`, new `src/lib/useEventMoves.ts` and its test (amended after Vision pass 1: Fury's dispatch allowed a new lib hook to keep CalendarViews small, but the contract never named it), the files C3 created, `TimelineGrid.tsx` /
  `TimelinePage.tsx` props only. · must not touch server files, `calendarGesture.ts`.
- **Work:** `useOptimistic` over the events list (the `PantryList` pattern);
  drop calls `moveCalendarEvent`; Undo calls it again with the original
  start; bar text "Moved to Wed 2:15 PM" (the household's format helpers),
  Undo button 48px target, bottom left of the +, 5 seconds, `role="status"`;
  refusal: glide back, `bg-warn-soft text-warn`, `role="alert"`, the
  server's reason. The bar is generic (message, optional action) so PR 8
  reuses it.
- **Verification:** gauntlet; real CDP touch on the C3 stand-alone harness (extend `probe-c3.mjs`) with a stubbed `moveCalendarEvent` (ok, refused, slow): the block lands at the new spot in the same frame as release (no flash of the old spot), the bar reads "Moved to ...", Undo calls the action with the original start and restores, the bar leaves after 5 s, a refusal glides back and shows the warn line. No agent can sign in to the app (no test login exists), so the in-app parent check (drag 9 to 10 AM onto 2:15 PM, reload, row reads 2:15 to 3:15) goes on Bryce's phone checklist; C2 already proved the write itself on the dev database.
- **Evidence:** the row before and after (times only), screenshots of the
  lift and the bar, the clean script's output.
- **Done:** the database check passes or the file says why it could not.

### F1 — Pass 1 fixes (all three gates, batched)
- **Status:** DONE `6236bc2` (all seven items; npm test 1917 to 1924 (+3 canLiftOnTimeline, +3 settleAction, +1 formatClockDigits; the splits keep 44 and 41), UTC 1914 + 10 skips; tsc, lint, build green. Probes on harnesses rebuilt from this tree with esbuild and the new build's CSS: probe-c4 15/15, probe-vision 12/12, probe-marker every marker left 5.6px (8.3 at Normal) and the 12-case large/xl/xxl x 1024x768/768x1024 x 3 Day/Day matrix all 5.6px, probe-strange 50/50 cases agree (marker on the block top 0px, marker = block = saved time); only diffs vs pass 1: marker font 16.5px to 12px at Largest, the extra 11 AM label no longer hidden. `run`'s await half is the exported `settleAction`, tested in useEventMoves.test.ts (no React test tooling, and no useOptimisticRun test file existed); formatClockDigits test sits in calendarDates.test.ts, the named file)
- **Boundaries:** may touch `src/lib/useOptimisticRun.ts`, `src/lib/useEventMoves.ts`, `src/lib/useEventMoves.test.ts`, `src/components/TimelineGrid.tsx`, `src/components/TimelineDayColumn.tsx`, `src/lib/timelineDrag.ts`, `src/lib/timelineDrag.test.ts`, new `src/lib/timelineDragPixels.test.ts`, `src/lib/calendarGesture.test.ts`, new `src/lib/calendarGestureHold.test.ts`, `src/lib/useTimelineDrag.ts`, `src/lib/calendarDates.ts`, `src/lib/calendarDates.test.ts`, any existing test of `useOptimisticRun` · must not touch `src/lib/calendarGesture.ts`, `src/lib/usePagedSwipe.ts`, `src/app/**`, `prisma/**`, DESIGN.md, STRUCTURE.md, `docs/**` (Fury applies the rulebook drafts).
- **Work:**
  1. (Captain blocker) `useOptimisticRun`'s `run` gains optional `onError(message)`, called inside the transition where the error is set today, with `result.error` or `SAVE_FAILED`; `useEventMoves` uses `run` and drops its own transition and catch. Its existing callers are unchanged. A test proves `onError` gets the server's reason.
  2. (Strange blocker) the gutter marker fits the 48px gutter at every Text size: `text-[min(0.6875rem,12px)]`, `px-[2px]`, wrapper `pr-[2px]` (`TimelineGrid.tsx` marker).
  3. (Captain, recommended) `canLiftOnTimeline(event)` in `timelineDrag.ts` replaces the inline `isSameDay(start, end - 1ms)` in `TimelineDayColumn.tsx`, with three tests (same day, crosses midnight, ends exactly at midnight).
  4. (Captain, recommended) split the hold and drag tests of `calendarGesture.test.ts` into `calendarGestureHold.test.ts`, and the ported pixel and column tests of `timelineDrag.test.ts` into `timelineDragPixels.test.ts`; each header names its sibling. Test count unchanged.
  5. (Captain note) marker text from a `formatClockTime` option or `formatClockDigits` in `calendarDates.ts`, not a split on the space; drop the `export` on `EDGE_STRIP_PX` if nothing else reads it.
  6. (Vision notes, hardening) in `useTimelineDrag`, put the block down without a drop when it is no longer connected or the column days changed since the hold; `useEventMoves`'s `blockFor` skips blocks inside `inert`; clear a parked glide when a newer drop of the same event starts.
  7. (Strange notes) `data-lifted:origin-top-left` on the block so the lifted top equals the marker line; the marker hides only an hour label it actually overlaps ((marker height + label height) / 2).
- **Verification:** gauntlet green (count may only grow); `probe-c4.mjs` 15/15; Strange's `strange/probe-marker.mjs` shows every marker `left >= 0` at large, xl and xxl on 1024x768 and 768x1024 in 3 Day and Day; Strange's `strange/probe-strange.mjs` still agrees in all cases; Vision's `vision/probe-vision.mjs` 12/12.
- **Evidence:** test counts, the three probe outputs, line counts.
- **Done:** all three probe runs pass and the gauntlet is green.

### F2 — Pass 2 fixes (Strange and Captain)
- **Status:** DONE `fac62dc` (all four items; drift before/after: phone 393x852 Day 6 h, drawn top minus marker centre 11.5px to 0px; iPad 1024x768 3 Day 2 columns, drawn left minus target column left 27px to 1px (the 1px inset), top 3.8px to 0px. Also `restTopPx` (the block's fractional inline top) replaces the rounded `offsetTop` in `useTimelineDrag.ts`: the drawn-top probe found 0.1 to 0.4px misses in 5 of 50 cases at fractional hour heights. npm test 1924 to 1925 (+1 allDay; the three settleAction tests moved, the six gesture helpers moved), UTC 1915 + 10 skips; tsc, lint, build green; built CSS: `scale-104` emits `scale`, the block sets no other `translate`. Probes on bundles rebuilt from this tree: probe-c4 15/15, probe-vision 12/12 (both now also require `translate` empty), probe-strange 50/50 agree by drawn top, model top, drawn left = target column + 1 and no `transform`; probe-marker and the 12-case full matrix all left >= 5.6px)
- **Boundaries:** may touch `src/lib/useTimelineDrag.ts`, `src/lib/useEventMoves.ts`, `src/lib/useEventMoves.test.ts`, `src/components/TimelineDayColumn.tsx`, `src/lib/timelineDrag.ts`, `src/lib/timelineDrag.test.ts`, `src/lib/useOptimisticRun.ts`, new `src/lib/useOptimisticRun.test.ts`, `src/lib/calendarGesture.test.ts`, `src/lib/calendarGestureHold.test.ts`, new `src/lib/testing/gestureSteps.ts` · must not touch `src/lib/calendarGesture.ts`, `src/lib/usePagedSwipe.ts`, `src/app/**`, `prisma/**`, DESIGN.md, STRUCTURE.md, `docs/**`, `.avengers/**` except the F2 status line.
- **Work:**
  1. (Strange blocker) move the lifted block and the glide with the CSS `translate` property, never `transform`, so the `scale` lift does not multiply the move: `useTimelineDrag.ts` (set and clear), `useEventMoves.ts` (the glide), and `TimelineDayColumn.tsx`'s transition list (`translate`, `scale`, `box-shadow`). Update the probes that read `style.transform` (`probe-c4.mjs`, `strange/probe-strange.mjs` `__state`, `vision/probe-vision.mjs`) to read the new property, and make the Strange probe measure the block's real drawn top (`getBoundingClientRect`) against the marker centre.
  2. (Captain blocker) move the `settleAction` tests and their helper from `useEventMoves.test.ts` into new `useOptimisticRun.test.ts` (header names `useOptimisticRun.ts`); fix `useEventMoves.test.ts`'s header; JSDoc in `useOptimisticRun.ts` reads "Exported for useOptimisticRun.test.ts; callers use `run`".
  3. (Captain note) move the six repeated helpers (`run`, `types`, `down`, `move`, `up`, `cancel`) shared by `calendarGesture.test.ts` and `calendarGestureHold.test.ts` into `src/lib/testing/gestureSteps.ts`; both import them.
  4. (Vision note) `canLiftOnTimeline` also returns false for an all-day event, with a test.
- **Verification:** gauntlet green, count may only grow; on the phone (393x852) after a 6-hour Day drag the block's drawn top equals the marker centre within 1px; on 1024x768 3 Day after a 2-column move the block's drawn left equals the target column's left + 1 within 1px; `probe-c4.mjs` 15/15, `vision/probe-vision.mjs` 12/12, `strange/probe-strange.mjs` all agree by drawn position, `strange/probe-marker.mjs` all left >= 0.
- **Evidence:** the drift numbers before and after, test counts, probe outputs.
- **Done:** the drift is under 1px in both checks and every probe passes.

## Execution log

- 2026-11-10: branch cut; mission 69 record fixed (DELIVERED, PR #111);
  Banner brief; mock sent to Bryce. Waiting on his OK.

## Gate verdicts

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 3 | Strange (HEAD b191f4c) | PASS | none | Drift fixed: drawn top on the marker at 0px at every one of 24 drag steps (phone Day 6 h; iPad 3 Day 2 columns, drawn left = column + 1); no jump on release. Refusal glide via `translate`: holds ~70 ms for the save, glides home ~185 to 200 ms, ends 0px off, light and dark; cancel the same; reduce motion snaps in one frame. probe-strange 50/50 by drawn position; marker left 5.6 in all large cases; builder's probe edits only stricter. status.md line true. Notes: refused block waits for the save before gliding (honest); px hour labels wrap at Largest on iPad (pre-existing) |
| 3 | Vision (HEAD b191f4c, scoped to F2) | PASS | none | Gauntlet re-run green (1925; UTC 1915 + 10 skips; build 0). F2 diff exactly its 11 files. probe-vision 12/12 on a fresh bundle (4 `style.translate`, 0 transform writes); builder's probe edits only stricter. `restTopPx` cannot read a wrong value today (top always written in px; pinch puts the block down first). Helper move: test names, count and bodies identical. Note: `restTopPx` relies on TimelineDayColumn writing `top` in px |
| 3 | Captain (HEAD b191f4c) | PASS | none | Pass-2 blocker closed (`useOptimisticRun.test.ts`); `testing/gestureSteps.ts` follows the testing rule, no copies left; glob fine; applied texts match the code; sizes recorded right. Notes applied by Fury: calendar.md says `translate`, never `transform`, and names `allDay` |
| 2 | Vision (HEAD 466752a, code same at 956dcc4) | PASS | none | Gauntlet re-run green (1924; UTC 1914 + 10 skips; build 0 on retry, first try collided with another gate's build). F1 diff exactly its 13 declared files. probe-vision 12/12 on a fresh bundle. `run`'s change proven inert for all 20 callers; stale-lift check cannot fire in a normal drag (V7, V8 pass). Rulebook text matches the code. Notes: `canLiftOnTimeline` alone does not check `allDay` (add `!event.allDay` or reword the doc); TimelineGrid count 411 not 407; settleAction tests placement (Captain's call) |
| 2 | Strange (HEAD 466752a) | BLOCK | (1) The lifted block drifts from the marker by 4% of the drag: `translate` in `style.transform` is multiplied by the separate CSS `scale` (11.5px after 6 h on the phone, about 21 min at 32px/h; 26px inside the target column after 2 columns); jumps back on release. Fix: use the `translate` property in `useTimelineDrag.ts` and the glide in `useEventMoves.ts`, transition `translate` in TimelineDayColumn. (2) status.md says "orange"; the marker is `--accent` sage green | Pass-1 marker blocker fixed (left 5.6 in all 12 large cases); 50/50 agreement by offsetTop (the probe that missed the drift); Day lift grows right only; DESIGN.md drafts read right. Notes: marker shows "3" on the hour (house style); px gutter wraps "10 PM" at Largest (pre-existing) |
| 2 | Captain (HEAD 466752a) | BLOCK | `useEventMoves.test.ts:53-75` tests `useOptimisticRun.ts`'s `settleAction` in another module's test file (one test file per module). Fix: move to new `useOptimisticRun.test.ts`, fix both headers and the JSDoc | Pass-1 blocker closed; `settleAction` is a legitimate seam (`run` is built on it). Applied rulebook text matches the code. Notes with exact text: STRUCTURE.md useOptimisticRun entry names `settleAction`; clock entry names `formatClockDigits`; trend line TimelineGrid 411, useTimelineDrag 344/271; companion sizes re-measured. `calendarGestureHold.test.ts` repeats six helpers from `calendarGesture.test.ts` (move to `src/lib/testing/gestureSteps.ts`) |
| 1 | Strange (HEAD fcf9239) | BLOCK | Gutter marker clipped at Larger and Largest Text size on iPad (shows "2:45" for 12:45; left edge -9.2px at Largest in the 48px gutter). Fix `TimelineGrid.tsx:392-393`: `text-[min(0.6875rem,12px)]`, `px-[2px]`, wrapper `pr-[2px]`, plus a DESIGN.md px carve-out | 51 lift cases: block, marker and saved ISO agree exactly, marker 0.0px on the true top; lift look, tint, hidden labels pass; kid/Tablet and all-day/overnight/task never lift; bar 16px clear of +, Undo 64x48, contrast 6.96/15.23; refusal exactly warn tokens (4.53 light), glides back; reduce motion instant. Notes: Day-view lift grows over the gutter (`data-lifted:origin-top-left`); dark shadow invisible (outline carries it); narrow columns show only the marker, no AM/PM; one extra hour label hidden at Largest min zoom; pre-existing px gutter wraps "10 AM" at Largest (follow-up); bar covers a 48px band for 5 s (transient). Drafts 1 to 4 for DESIGN.md. Not coverable: app shell, real iOS safe area, real kid/Tablet sessions |
| 1 | Vision (HEAD fcf9239) | BLOCK | Boundary: `useEventMoves.ts` and its test not in C4's may-touch list (fix: amend the contract; done) | Gauntlet re-run green (1917; UTC 1907 + 10 skips; build 0). probe-c4 re-run 15/15; own CDP probe 12/12 (tap after drop, hold-lift-no-move, second finger, cancel, two quick drops with slow save, cross two columns, edge scroll stops, refused-then-drag, press during glide). DB check re-run on the dev branch: 9 to 10 AM moved to 2:15 to 3:15, cleaned. Server guard, no client length, bounds, one push path confirmed by reading. Notes: a view or period change during a hold (second finger) leaves stale columns (harden: `putDown` when the block is disconnected or the column key changed); stale glide rect after refused-then-redrop; `blockFor` searches the whole document (scope to non-inert); timer can lift if both up and cancel are lost (recovers next touch); device-zone vs Denver only differs for ~24h events, never lifted; real iOS pre-hold scroll decision is Bryce's recording |
| 1 | Captain (HEAD fcf9239) | BLOCK | `useEventMoves.ts:68-99` copies `useOptimisticRun`'s save shape (STRUCTURE.md :281-292). Fix: `run` gains optional `onError(message)` called inside the transition; `useEventMoves` uses `run` | Machine count two (pass); placement, dependency direction, glob, constants pass. Recommends in this PR: `canLiftOnTimeline(event)` in `timelineDrag.ts` with tests (lift rule now inline in TimelineDayColumn:144); split `calendarGesture.test.ts` (437) and `timelineDrag.test.ts` (495). Notes: usePagedSwipe 393/302 split candidate next touch (`pagedTurn.ts`); calendar.ts 463/228 not a candidate; marker text cuts `formatClockTime` at the space; UndoBar hardcodes the + footprint; STRUCTURE.md :995 names the wrong test file. Drafts (a) to (e): gesture and write-path rules move to new `docs/structure/calendar.md`, wrapper list, test helper, trend |

## Delivery

- **Gates:** Vision PASS (pass 2, re-checked pass 3 after F2), Captain
  PASS (pass 3), Strange PASS (pass 3). Fix contracts F1 (pass 1, all three
  gates) and F2 (pass 2: the scale-multiplied drift, test placement).
- **Built:** hold and drag on in the one gesture machine (`HOLD_MS` 400);
  `timelineDrag.ts` (`resolveDrop`, `canLiftOnTimeline`) ported and
  extended; `moveCalendarEvent` through the shared `afterEventSaved` with
  pure rules in `calendarMoveRules.ts`; `useTimelineDrag.ts` (the lift,
  gutter marker, edge scroll, native scroll lock); `useEventMoves.ts`
  (optimistic move through `useOptimisticRun`'s `run` and `onError`);
  shared `UndoBar.tsx`.
- **Bryce's design calls:** the mock ("Looks great"), the gutter marker
  from his Google Calendar screenshots, the native scroll lock after his
  first try of the mock, green marker ("Let's match the app"), the five
  rulebook entries ("Yes I agree with those").
- **Rulebook:** DESIGN.md (gesture never the only way, the lifted block,
  `UndoBar`, a refused move is warn, the px gutter marker carve-out);
  STRUCTURE.md points to new `docs/structure/calendar.md` (gesture machine,
  one write path); the old gesture bullet moved word for word to
  docs/history/structure-rationale.md.
- **Tests:** npm test 1845 to 1925; UTC 1915 pass plus 10 DST skips.
- **Database check:** a seeded 9 to 10 AM row moved to 2:15 to 3:15 PM on
  the dev branch (C2 and Vision pass 1), through the action's body in a
  script; the action itself (guard, Google push) is proven only by reading
  and goes on Bryce's phone test, since no agent can sign in.
- **Left for later (notes, not blockers):** `usePagedSwipe.ts` 393 and
  `useTimelineDrag.ts` 358 are split candidates on their next touch; the px
  hour labels wrap at Largest on iPad (pre-existing); `UndoBar` hardcodes
  the + footprint; a view or period change by a second finger during a hold
  is hardened but untested on iOS; `restTopPx` relies on `top` written in
  px.
- **Phone test:** added to `.avengers/status.md` (screen recording; the in-app parent drag, kid and Tablet logins, and the real iOS scroll lock are only provable there).
- Bryce gave permission on 2026-11-10 to merge once every gate passes and the Gauntlet is green, unless a big decision comes up.
