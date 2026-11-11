# Mission 69: Calendar full screen PR 3, the sliding swipe

- **Status:** DELIVERING (all gates PASS: Captain pass 2, Vision pass 4, Strange pass 4)
- **Started:** 2026-11-10 · **Updated:** 2026-11-10
- **Plan:** `.avengers/plans/calendar-fullscreen-v1.md`, "PR 3: Sliding swipe (decision 7; small call A)"
- **Branch:** `claude/calendar-fullscreen-pr3-096354`, synced to `origin/main` `2c2d7df` (PR 1 #109 and PR 2 #110 merged)
- **Mock:** `.avengers/mocks/calendar-pr3-slide-mock.html` (swipeable with a finger; sent to Bryce 2026-11-10)

## Brief

Swiping sideways on Day, 3 Day, Week, Month and Year moves the page with
the finger, the next page coming in beside it. Released past a quarter of
the page width, or flicked, it glides one whole page; released early it
springs back. The hours keep their scroll position on a page turn. One pure
gesture machine owns every touch on the timeline, with hold and drag states
present but switched off (PR 4 switches them on).

## Done means

- The slide above on all five views, phone and iPad, every login including
  the Tablet.
- No React render during a drag (one CSS variable written per frame).
- Reduce motion: the page turns instantly, no glide.
- A second finger hands over to pinch and springs the track back to zero.
- Pointer cancel springs back (it never turns the page; today it can).
- A swipe that ends on an event still swallows the tap.
- Scroll to now runs on opening, on a view change and on Today, never on a
  page turn.
- Month neighbours outside the fetch window show the existing "not loaded"
  glyph, never a blank month.
- Committed Node tests: the machine as whole touch sequences, each ending
  idle; the settle rule.
- Gauntlet green, gates pass, merged after PR 1 (done), production deploy
  checked, `git log origin/main..HEAD` empty, Bryce's screen-recording phone
  test in `.avengers/status.md`.

**Out of scope:** drag to reschedule (PR 4: hold and drag stay off);
migrating `SwipeActions.tsx` onto the new machine (see "Structure call");
Schedule (it never swiped); every later PR.

## Facts that differ from the plan (Banner, at `2c2d7df`)

- Month is always 6 rows (`GRID_ROWS = 6`, `monthLayout.ts:34`), so Month
  needs no height easing. Year mini months are 42 days too.
- `TimelineGrid.tsx` is 471 lines (soft cap 350), `CalendarViews.tsx` 498.
- Only `partitionForTimeline` is memoised in `TimelineGrid.tsx` (298-303).
- The pinch anchor reads the rail's top; the header height is read by the
  zoom floor (ResizeObserver) and by scroll-to-now.
- Pointer cancel commits a page today (`usePageSwipe.ts:334`).
- `handleStep` reads `period` from its render (`useCalendarNavigation.ts:321`):
  two steps before a re-render would compute from the same period, so the
  track accepts a new swipe only after its commit.
- `globals.css:168-174` zeroes CSS transitions under reduce motion; there is
  no JS reduce-motion hook in `src/lib`.
- `package.json` test glob covers `src/lib/*.test.ts`, not `src/components`.

## Structure call (Fury, 2026-11-10)

STRUCTURE.md, "The pointer-gesture machine has two definitions": a third
copy is a BLOCKER. PR 3's machine **replaces** `usePageSwipe.ts`'s copy (the
file is deleted in C4), so the count stays at two. `DIRECTION_LOCK_PX`
collapses to one definition: `SwipeActions.tsx` imports it from the new
machine file (a one-line change, no behaviour change). Moving
`SwipeActions` itself onto the machine stays open debt: it is live on
Inventory and Shopping rows every day and needs Bryce's real-device check,
which is not this PR's job. Captain rules on this at the gate and the
STRUCTURE.md bullet is updated in this PR.

## Danger register

Same as AGENTS.md: never `npm run db:seed` / `db:reset`; never a clean or
reset script for `User`; no migrations expected; never print `.env`; stage
by explicit path, run `git show --stat HEAD` after each commit; no direct
pushes to `main`.

## Gauntlet

`npx tsc --noEmit`, `npm run lint`, `npm test`,
`TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`,
`npm run build`.

## Assembled

- Banner (done): research brief summarised above.
- Stark + Vision: always.
- Strange: the whole PR is visible.
- Captain: new files, a split of `TimelineGrid.tsx`, and the gesture-machine
  rule.

## Contracts

### C1 - Split TimelineGrid, behaviour unchanged
- **Status:** DONE `84a354a` (TimelineGrid 471 to 342, TimelinePage 236; gauntlet green per Stark; ran `npx prisma generate` for a stale local client)

- **Objective:** Move "one page of columns" out of `TimelineGrid.tsx` so the
  track can render three of them, with no visible change.
- **Boundaries:** may touch: `src/components/TimelineGrid.tsx`; new
  `src/components/TimelinePage.tsx`.
  · must not touch: everything else, including `CalendarViews.tsx`,
  `usePageSwipe.ts`, `useTimelineZoom.ts`.
- **Shape:** `TimelinePage.tsx` exports `TimelinePageHeader` (the weekday
  row, the all-day strip, the banner: today's `TimelineGrid.tsx` 356-430
  content inside the sticky header) and `TimelinePageColumns` (today's
  453-466), both taking `columnDays` plus the props they use, each computing
  its own layout (`partitionForTimeline`, outside flags, slots, grid
  template) memoised on the day key. `TimelineGrid` keeps the scroller,
  sizing, zoom, scroll-to-now, the gutter and the sticky header wrapper, and
  renders one header and one columns page.
- **Verification:** the gauntlet; `wc -l` on both files (each under 350
  preferred, under 650 required); a diff read showing moved code, not
  rewritten code.
- **Evidence:** gauntlet output tails, line counts, a list of every moved
  block with old and new line ranges.
- **Done:** gauntlet green; `TimelineGrid.tsx` no longer contains the column
  or header-row JSX; no prop or behaviour change visible to `CalendarViews`.

### C2 - The pure gesture machine, the settle rule, a reduce-motion hook
- **Status:** DONE `5857a23` (36 new tests, npm test 1819 to 1855; UTC run has the same 7 non-passes as before the mission; flick speed is the last two moves, 0 after a 100ms rest)

- **Objective:** Build and test the pure decisions, with no UI wired.
- **Boundaries:** may touch: new `src/lib/calendarGesture.ts`,
  new `src/lib/calendarGesture.test.ts`, new `src/lib/pageSettle.ts`,
  new `src/lib/pageSettle.test.ts`, new `src/lib/usePrefersReducedMotion.ts`.
  · must not touch: every existing file.
- **Shape:**
  - `calendarGesture.ts`: a pure reducer `gestureStep(state, event, options)`
    returning the next state and a list of effects (capture pointer, release
    capture, arm click swallow, start or clear the hold timer, set slide
    offset, settle, spring back, hand to pinch). States: idle, undecided,
    scrolling, sliding, pinch, holding, dragging. Events: pointer down
    (with id, x, y, time, whether it started on a block), move, up, cancel,
    hold timer fired, click. `options.holdEnabled` defaults to false; with
    it false, holding and dragging are never entered. Exports
    `DIRECTION_LOCK_PX = 8` (the one definition). Carries `usePageSwipe`'s
    rules by name: 8px lock where only a strictly larger vertical travel
    scrolls and an exact tie slides, as today (`usePageSwipe.ts:97`;
    corrected after C2, Stark followed the code), a second pointer at any stage goes to pinch (from sliding it
    also emits spring back), swallow armed only by a committed slide and
    cleared on every pointer down.
  - `pageSettle.ts`: `settlePage({ dx, velocityPxPerMs, pageWidth })`
    returns 1, -1 or 0. Turns when `|dx| > pageWidth / 4`, or on a flick
    (`|velocity| >= 0.5` px/ms in the same direction as `dx`, and
    `|dx| >= DIRECTION_LOCK_PX`). Left drag (negative dx) means next (1).
  - `usePrefersReducedMotion.ts`: `useSyncExternalStore` over
    `matchMedia("(prefers-reduced-motion: reduce)")`, server snapshot false.
- **Tests (sequences, each must end idle):** tap; tap then hold (hold off:
  nothing happens); hold then lift; a move of exactly 7, 8 and 9px; a
  diagonal where vertical wins; a slide that starts on a block; slide then
  lift (settle emitted); second finger at undecided, scrolling and sliding;
  cancel at undecided, scrolling and sliding (cancel from sliding emits
  spring back, never settle); a second pointer down ignored while one is
  active; the click after a committed slide is swallowed and the click
  after a plain tap is not. `holdEnabled: true` gets a small set showing
  holding and dragging are reachable and also end idle. Settle: quarter
  boundary both sides, flick both directions, a flick against the drag
  direction, zero width.
- **Verification:** the gauntlet; `npm test` count rises by the new tests.
- **Evidence:** test names and pass count before and after; gauntlet tails.
- **Done:** all new tests pass in Denver and UTC; no existing file changed.

### C3 - PagedTrack and the slide for Month and Year
- **Status:** DONE `a3c1014` (usePagedSwipe 258, PagedTrack 60, new PagedPeriodViews 56, CalendarViews 498 to 491; gauntlet green per Stark; no browser run. Neighbours use anchor ±1 month or year because CalendarViews has no `period`; C4 adds `neighbourAnchor`)

- **Depends on:** C2.
- **Objective:** Month and Year slide with the finger using the machine.
- **Boundaries:** may touch: new `src/components/PagedTrack.tsx`, new
  `src/lib/usePagedSwipe.ts`; `src/components/CalendarViews.tsx` (Month
  and Year wrappers only); `src/components/MonthGrid.tsx` and
  `src/components/YearView.tsx` only if a neighbour needs a prop.
  · must not touch: `TimelineGrid.tsx`, `TimelinePage.tsx`,
  `usePageSwipe.ts` (the timeline keeps it until C4), `SwipeActions.tsx`.
- **Shape:** `usePagedSwipe` feeds pointer events to `gestureStep`, applies
  its effects, and writes `--page-dx` on one ancestor at most once per
  animation frame (no React state per move). On release it asks
  `settlePage`; on a turn it eases the track to a full page (CSS transition,
  about 260ms), and on `transitionend` (with a timeout fallback) commits
  `step()` inside `flushSync` and resets `--page-dx` to 0 in the same frame;
  a new swipe is ignored until then. Reduce motion: commit at once, no
  ease. Spring back eases to 0. `PagedTrack` renders previous, current and
  next panels side by side, translated by the variable. Neighbour anchors
  come from `stepPeriod(period, ±1)`; Month neighbours pass the same
  `windowStart`/`windowEnd`, so days outside show the existing glyph.
- **Verification:** the gauntlet; `wc -l CalendarViews.tsx` must not grow
  past 498 (extract if needed, into a file named in the report).
- **Evidence:** gauntlet tails; line counts; the commit path quoted (where
  `flushSync` and the reset sit).
- **Done:** gauntlet green; Month and Year render three panels; the
  timeline is untouched.

### C4 - The timeline slide, scroll to now, retire usePageSwipe
- **Status:** DONE `8d5f07c` (TimelineGrid 382, TimelinePage 246, CalendarViews 481; npm test 1845, UTC 1838 + 7 DST skips; scroll-to-now deps `[view, scrollToNowSignal]`; gutter is now a fixed overlay over the rail. The `grep -rn usePageSwipe src` check is accepted with 4 comment-only hits in `calendarGesture.ts` and its test, naming the retired file as the source of its rules; no import or code reference remains)

- **Depends on:** C1, C3.
- **Objective:** Day, 3 Day and Week slide with the finger; the hours stay
  put on a turn; `usePageSwipe.ts` is gone.
- **Boundaries:** may touch: `src/components/TimelineGrid.tsx`,
  `src/components/TimelinePage.tsx`, `src/components/CalendarViews.tsx`,
  `src/lib/usePagedSwipe.ts`, `src/components/PagedTrack.tsx`,
  `src/components/PagedPeriodViews.tsx` (switch to `neighbourAnchor`),
  `src/lib/useCalendarPeriod.ts` (add one exported pure
  `neighbourAnchor(view, anchor, direction)` built on `VIEW_CURSOR`, so the
  step size has one home), `src/lib/useCalendarPeriod.test.ts` (its tests); delete
  `src/lib/usePageSwipe.ts` and `src/lib/usePageSwipe.test.ts` (any pure
  case not already covered moves into `calendarGesture.test.ts`);
  `src/components/SwipeActions.tsx` (only: import `DIRECTION_LOCK_PX` from
  `calendarGesture.ts` and delete its own). The STRUCTURE.md
  pointer-gesture bullet is NOT in C4: Captain drafts it at the gate
  (preflight: STRUCTURE.md is a document past the code cap).
  · must not touch: `useTimelineZoom.ts`, `timelineZoom.ts`, everything
  else.
- **Shape:** two `PagedTrack`s (the sticky header's pages and the column
  pages) read the one `--page-dx` on `TimelineGrid`'s root, so they cannot
  disagree. The gutter and the vertical scroller do not move. The header's
  height is the current page's; neighbours are clipped to it during a drag
  and it settles to the new page's height after the turn. Pinch still
  works: the zoom keeps its touch listeners; a second finger springs the
  track back. Scroll to now moves off `columnDaysKey`: it runs on mount, on
  a view change and on Today.
- **Verification:** the gauntlet; `wc -l` for every touched file;
  `grep -rn usePageSwipe src` returns nothing;
  `grep -rn "DIRECTION_LOCK_PX = " src` returns exactly one line.
- **Evidence:** gauntlet tails, grep output, line counts, where scroll to
  now's dependencies now sit.
- **Done:** gauntlet green; all five views slide; no file past 650.

### F1 - Pass 1 fixes for the shared track (Month bleed, in-flight turn, notes)

- **Status:** DONE `8365f16` (usePagedSwipe 338; `pageKey` required on PagedSwipeArea; gauntlet green per Stark, also LA zone; greps clean; not run on a device)
- **Objective:** Fix Captain's Month bleed BLOCKER and Vision's in-flight turn BLOCKER in the shared track, plus the cheap notes on the same files.
- **Boundaries:** may touch: `src/lib/usePagedSwipe.ts`,
  `src/components/PagedTrack.tsx`, `src/components/PagedPeriodViews.tsx`,
  `src/components/MonthGrid.tsx` (drop `PAGE_BLEED_CLASSES` from its root
  only), `src/app/(app)/calendar/loading.tsx` (only if the Month skeleton no
  longer lines up), `src/lib/calendarGesture.ts` (comment at line 15 only),
  `src/lib/calendarGesture.test.ts` (the test name at line 83 only)
  · must not touch: `src/components/TimelineGrid.tsx`,
  `src/components/TimelinePage.tsx`, `src/components/CalendarViews.tsx`,
  `src/components/TimelineDayColumn.tsx`, `STRUCTURE.md`, `docs/**`.
- **Work:**
  1. Captain B1: `PagedSwipeArea` takes an optional `className`; `PagedMonth`
     passes `PAGE_BLEED_CLASSES`; `MonthGrid`'s root drops it (bleed on the
     outermost root, never inside `overflow-hidden`). `PagedYear` passes
     nothing (Year stays inside the padding).
  2. Vision B3: `usePagedSwipe` takes a `pageKey` option. A
     `useLayoutEffect([pageKey])` aborts a turn in flight when the key
     changes and the change did not come from this hook's own commit (a
     `committing` ref set around the `flushSync`): clear the timeout and
     listener, glide off, `--page-dx` to 0, `turning` false. `PagedMonth`
     and `PagedYear` pass their anchor's time.
  3. Optional `widthRef` option: the element whose `clientWidth` is the page
     width (default `varRef`). The timeline will pass its columns viewport
     in F2.
  4. Captain note: one glide length. Export `GLIDE_MS` and drive the track's
     transition duration from it (inline style or a CSS variable), so the
     timeout and the ease cannot drift.
  5. Strange and Vision notes: a press during a spring-back takes the track
     from where it is (read the current transform before removing the glide)
     instead of snapping; clear `data-glide` when a spring-back ends; fix the
     "same DOM node" comment in `PagedTrack.tsx` and `usePagedSwipe.ts`
     (panels stay, contents shift by one period).
  6. Vision note: reword `calendarGesture.ts:15` so
     `grep -rn "DIRECTION_LOCK_PX = " src` returns one line; reword the test
     name at `calendarGesture.test.ts:83` so it no longer names a deleted
     file as current.
- **Verification:** the gauntlet;
  `grep -rn "DIRECTION_LOCK_PX = " src` returns exactly one line;
  `grep -n PAGE_BLEED_CLASSES src/components/MonthGrid.tsx` returns nothing.
- **Evidence:** gauntlet tails, the greps, the abort path quoted, line counts.
- **Done:** gauntlet green; the timeline files are untouched.

### F2 - Pass 1 fixes for the timeline (sideways scroll, mock structure, header clip)

- **Status:** DONE `7b92452` (TimelineGrid 383, TimelinePage 282; new `TimelineHourLabels`; one `isDay` switch; now-line dot offset removed; 3 Day and Week all-day strip keeps a 0px first cell, so its bars may sit 2px right; gauntlet green per Stark, no app run) (Bryce: "Slides with its day", with a Google Calendar mid-swipe screenshot of Day view)
- **Objective:** Day, 3 Day and Week turn with a real finger and look like the approved mock mid-drag.
- **Boundaries:** may touch: `src/components/TimelineGrid.tsx`,
  `src/components/TimelinePage.tsx`, `src/components/TimelineDayColumn.tsx`
  (the now-line dot's offset only), `src/components/TimelineAllDayStrip.tsx`
  (only if the Day corner label must move)
  · must not touch: `src/lib/useTimelineZoom.ts`, `src/lib/timelineZoom.ts`,
  `src/lib/usePagedSwipe.ts`, `src/components/PagedTrack.tsx`,
  `src/components/CalendarViews.tsx`, `STRUCTURE.md`, `docs/**`.
- **Work:**
  1. Vision B1 and Strange B1: the scroller gets `overflow-x-hidden
     touch-pan-y`.
  2. Strange B2 (the mock's structure): the header has a fixed 48px corner;
     the header track sits in an `overflow-hidden` viewport that starts at
     the gutter's right edge. The columns track sits in the same kind of
     viewport beside a plain, non-overlay gutter. Each page renders only its
     day columns (the template without the 48px first column). Turn
     distance is that viewport's width (`widthRef`).
  3. Vision B2: the header clips neighbours to the current page's height
     (`overflow-hidden` on the header viewport).
  4. Pass `pageKey` = view plus anchor time.
  5. Strange note: the now-line dot is no longer hidden by the gutter (start
     it at the column's edge, or let the plain gutter make that moot).
  6. Day view (Bryce, 2026-11-10, "Slides with its day", with a Google
     Calendar Day screenshot mid-swipe): in Day the WHOLE page slides, each
     page carrying its own hour labels column and its own corner date above
     it, like Google. The outgoing day's column exits left while the
     incoming page's hour labels and date ride in beside it. So Day has no
     fixed gutter and no fixed corner: both tracks span the full width and
     each page is [its hour labels | its day column], header page [its
     corner date | its all-day strip]. 3 Day and Week keep item 2's fixed
     gutter and corner (the approved mock). One structure switch keyed on
     the view, not two copies of the page code.
- **Verification:** the gauntlet; pinch zoom still anchors (read
  `useTimelineZoom`'s rail and header reads against the new structure).
- **Evidence:** gauntlet tails, line counts, how the zoom's refs map to the new DOM.
- **Done:** gauntlet green; Strange pass 2 measures a real-finger turn and no blank band.

### F3 - Pass 2 fixes (glide-only transition, stuck pickup, Today key, tidy notes)

- **Status:** DONE `80f46b1` (usePagedSwipe 342, CalendarViews 482, TimelineGrid 385, TimelinePage 290, PagedTrack 70, PagedPeriodViews 61; idle spring-back at `usePagedSwipe.ts:281`; gauntlet green per Stark and re-run by Vision pass 3)
- **Objective:** Fix the two F1 regressions Vision and Strange found in pass 2, plus four one-line notes.
- **Boundaries:** may touch: `src/components/PagedTrack.tsx`,
  `src/lib/usePagedSwipe.ts`, `src/components/PagedPeriodViews.tsx`,
  `src/components/TimelineGrid.tsx`, `src/components/TimelinePage.tsx`,
  `src/components/CalendarViews.tsx` (pass the existing `todayTaps` to
  `PagedMonth` and `PagedYear` only)
  · must not touch: `src/lib/calendarGesture.ts`, `src/lib/pageSettle.ts`,
  `src/lib/useTimelineZoom.ts`, `src/components/TimelineAllDayStrip.tsx`,
  `STRUCTURE.md`, `docs/**`.
- **Work:**
  1. Vision B1 and Strange B1: the track's transition applies only while
     `data-glide=true`. Put `--glide-ms` (from `GLIDE_MS`) in the inline
     style and use `[[data-glide=true]_&]:duration-(--glide-ms)` with
     `transition-transform` only under the glide; at rest the computed
     transition is none or 0s.
  2. Vision B2: when the machine returns to idle from a gesture that never
     reached sliding (tap, vertical scroll, cancel, pinch from undecided)
     and `baseDx` is not 0, spring back to 0.
  3. Vision note: the timeline's `pageKey` includes `scrollToNowSignal`, and
     `PagedMonth`/`PagedYear` take the same Today counter into their
     `pageKey`, so Today during a glide on the current period aborts the
     turn.
  4. Captain notes: one gutter decision passed from `TimelineGrid` into both
     page components (e.g. `ownGutter={isDay}`) instead of the second
     `columnDays.length > 1` test; `timelineGridTemplate`'s comment matches
     what 3 Day and Week actually do (or the columns go through it too);
     the hour-label count derives from `MINUTES_PER_DAY / 60`.
- **Verification:** the gauntlet; `wc -l` on every touched file
  (usePagedSwipe under 350 preferred, CalendarViews at or under 481 plus
  the two props).
- **Evidence:** gauntlet tails, line counts, the idle spring-back path
  quoted, the computed-style reasoning for item 1.
- **Done:** gauntlet green; gate pass 3 measures m41 going from minus a page
  to 0 in one frame at hand-over, m41 equal to `--page-dx` in every drag
  frame, and `--page-dx` 0 after a tap or scroll during a spring-back.

### F4 - Reduce-motion hand-over flicker (Bryce allowed a fourth, focused pass)
- **Status:** DONE `9e211bc` (one class, `transition-none`, on the track; built CSS shows the glide variant later and more specific; gauntlet green per Stark)
- **Status:** dispatched 2026-11-10
- **Objective:** Under Reduce Motion the track never transitions, so the hand-over paints the target at 0 in its first frame.
- **Boundaries:** may touch: `src/components/PagedTrack.tsx` (the track's
  `className` only)
  · must not touch: every other file, including `src/app/globals.css`.
- **Work:** the track's resting `transition-property` is `none`
  (`transition-none`), and `[[data-glide=true]_&]:transition-transform`
  still applies during a glide. Confirm in the built CSS that the glide
  variant outranks `transition-none` (same specificity is not enough if
  source order puts `transition-none` later).
- **Verification:** the gauntlet; the built CSS rule order for both classes.
- **Evidence:** gauntlet tails; the two CSS rules quoted with their order or
  specificity.
- **Done:** gauntlet green; pass 4 (Vision and Strange, reduce motion only,
  plus one normal-motion glide) sees the target at 0 in the first frame
  after release and normal glides unchanged.

## Execution log

- 2026-11-10: synced to `origin/main` `2c2d7df`. Banner brief in. Mock sent
  to Bryce. Contracts written.
- 2026-11-10: Bryce OKed the mock ("Looks good"). C1 and C2 dispatched to
  Stark in parallel (disjoint files).
- 2026-11-10: C1 and C2 DONE and committed. C3 dispatched.
- 2026-11-10: C3 DONE and committed. C4 dispatched with `neighbourAnchor` added to its boundary.
- 2026-11-10: C4 DONE and committed (`8d5f07c`). Gate pass 1: Vision, Strange, Captain in parallel.
- 2026-11-10: Captain pass 1 BLOCK (Month bleed). Bryce approved Captain's
  "Reduce motion has one JS reader" STRUCTURE.md amendment ("Yea"); Fury
  applies it with the other STRUCTURE.md and layout.md drafts.
- 2026-11-10: Vision and Strange pass 1 BLOCK. F1 (shared track) and F2
  (timeline; Bryce chose "Slides with its day" for Day from a Google
  screenshot; Fury kept 3 Day and Week on the approved mock's fixed hours)
  done. Fury applied Captain's drafts: STRUCTURE.md gesture bullet
  rewritten, reduce-motion bullet added (Bryce approved), Calendar trend
  line, layout.md bleed instances; the old bullet moved word for word to
  docs/history/structure-rationale.md. Gate pass 2 dispatched.
- 2026-11-10: the 7 UTC non-passes checked: all 7 are DST tests
  (spring-forward Mar 8 and fall-back Nov 1, in the fetch chunking and the
  timeline rail) that skip on purpose under UTC ("ambient zone has no
  fall-back transition") and pass in the Denver run. Pre-existing, not a
  failure. UTC run at that point (before C4): tests 1855, pass 1848, skipped 7, fail 0, exit 0. After C4: 1845, 1838, 7.

## Gate verdicts

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Captain (HEAD cbecb1e) | BLOCK | Month bleed clipped: `PagedSwipeArea` is `overflow-hidden` and `MonthGrid`'s `-mx-4` hangs outside it (layout.md "Edge to edge"). Fix: bleed on `PagedSwipeArea` via `PagedMonth`, drop it from `MonthGrid`, check the Month skeleton | Machine count exactly two (PASS); one `DIRECTION_LOCK_PX`; step sizes and settle one source; lib imports clean. Notes: TimelineGrid 382 total / 156 code; `GLIDE_MS` 260 duplicated in `PagedTrack` class; second JS reduce-motion reader in `HabitConfetti` (amendment drafted, needs Bryce); rename `calendarGesture.ts` when SwipeActions migrates; test name at `calendarGesture.test.ts:83` names a deleted file. Drafts for STRUCTURE.md 676-706 and 903 and layout.md 258 held by Fury |
| 1 | Vision (HEAD cbecb1e) | BLOCK | (1) timeline scroller has implicit overflow-x auto, so a sideways drag scrolls the hours box natively, pointercancel fires, no turn (proved with real CDP touch input; fix `overflow-x-hidden` on the scroller); (2) neighbour headers not clipped to the current header height (fix `overflow-hidden` on the sticky header); (3) Today or any navigation during the 260ms glide is overridden by the delayed commit stepping from the new period (fix: `pageKey` option, abort an in-flight turn when it changes outside the commit) | Gauntlet re-run green (1845; UTC 1838 + 7 DST skips; build 0); boundaries clean. Notes: `calendarGesture.ts:15` comment makes the one-definition grep return 2; gutter overlay covers half the now-line dot; page width from root `clientWidth` vs track width (classic scrollbars); `data-glide` lingers after spring-back; PagedTrack comment on DOM reuse inaccurate; Month and Year now inside overflow-hidden (focus rings); log line UTC count pre-C4 |
| 1 | Strange (HEAD cbecb1e) | BLOCK | (1) Vision's sideways-scroll blocker, seen with real CDP touch; (2) mid-drag does not match the approved mock: header labels slide over the gutter corner while their columns hide under it, and a 48px blank band sits between pages (fix: the mock's structure, fixed corner, clipped track viewports, pages of day columns only) | Tracks agree to 0px in every frame (about 110 per drag, five viewport sets); no flash at hand-over; scrollTop holds on turns, goes to now on Today and opening; Month and Year slide with a real finger; not-loaded glyph on the Jan 2027 neighbour before refetch; reduce motion zero glide frames; pinch mid-slide springs back, zoom takes over; cancel springs back; + placement unchanged, Tablet draws none. Notes: now-line dot 3px under the gutter; Month pages abut (as the mock); press during spring-back snaps; Month swipes only on the grid (as main). Not seen: kid login, pinned menu, real iOS |
| 2 | Captain (HEAD b57ffba) | PASS | none | B1 fixed, Month skeleton still matches; drafts applied as written; history moved word for word; TimelineHourLabels placement, one isDay switch and one GLIDE_MS approved. Notes: two gutter tests (`isDay` vs `columnDays.length > 1`); `timelineGridTemplate` comment now inaccurate for 3 Day/Week; hardcoded 24 hours in TimelinePage; usePagedSwipe 338 near the soft cap; trend line lacks usePagedSwipe and TimelinePage |
| 2 | Vision (HEAD b57ffba) | BLOCK | (1) F1 regression: `PagedTrack` sets `transitionDuration` inline and always on with property `all`, so every `--page-dx` write eases: the reset to 0 after a turn animates (the next panel shows for about 250ms: slide, jump a page, slide back) and the track lags the finger mid-drag (fix: scope the duration to the glide, e.g. a `--glide-ms` variable used only under `data-glide`); (2) F1 regression: the spring-back pickup writes `--page-dx = held` on any press, but a tap, a vertical scroll, a cancel or a pinch from undecided never springs back, so the track stays shifted (reproduced, -24px after a tap; fix: when the machine returns to idle without having slid and `baseDx` is not 0, spring back) | All three pass-1 blockers fixed and proved with real touch; gauntlet re-run green; boundaries clean; docs claims all check out. Notes: Today during a glide while already on today's period still commits (add `todayTaps` to the timeline `pageKey`); pickup settle uses raw dx (debatable, not wrong); all-day bars sit 6px right in 3 Day/Week, same as before F2 |
| 2 | Strange (HEAD b57ffba) | BLOCK | F1 regression (same as Vision 1): inline always-on 260ms transition, so after a turn the day after the target flashes and slides back, and the drag trails the finger (-111 at a -192 finger) | Real-finger turns on Day, 3 Day, Week both ways at every viewport and Tablet; tracks agree 0px; no blank band; Day matches Bryce's Google picture; 3 Day/Week match the mock; header clipped; hours hold on turns, go to now on open, Today, view change; pinch zooms with labels 0px from gridlines; now-line dot whole; Month reaches both edges (Captain B1 fixed); spring-back pickup smooth. Notes: 3 Day/Week all-day bars 6px right, pre-existing; Month skeleton not seen rendered; Month swipes only on the grid (as main) |
| 3 | Vision (HEAD 26555c5) | PASS | none | Gauntlet re-run green, build exit 0 captured; boundaries clean (23 files, all declared). Real touch on a production build: at rest transition 0s; one-frame hand-over with correct content on Day, 3 Day, Week, Month, Year, phone and Tablet iPad sizes; m41 equals `--page-dx` every drag frame (13 runs); 20 pickup runs (tap, scroll, cancel, pinch, hold) all end at 0; Today mid-glide from another period lands on today. Done-means audit: items 1 to 9 proven (kid/parent logins and real iOS not seen). Notes: reduce-motion commit frame may sample the old offset for 0.01ms (`motion-reduce:transition-none` would close it); `todayTaps` in pageKey unreachable (Today is disabled on the current period), harmless; tap during a spring-back on Month/Year opens the cell (a tap is a tap) |
| 3 | Strange (HEAD 26555c5) | BLOCK | Reduce Motion only: for one painted frame after release the page shows the period after the target at the old drag offset (Day and Month screencasts). Cause: globals.css forces `transition-duration: 0.01ms !important` and the track's resting `transition-property` is `all`. Fix: `transition-none` at rest on the track in `PagedTrack.tsx`, glide class still wins under `data-glide` | Normal motion fixed in all 40 real-finger turns (5 views, 393 and 1024, admin and Tablet, both directions): drag 1:1 (0px), tracks agree, 16 glide frames, one-frame hand-over with correct content (hash and pixel checked). Day matches Bryce's Google picture; 3 Day/Week fixed hours; hours hold; pinch; Month edges; spring-back and pickup end at 0; Larger and Largest text pass. Notes: tap during spring-back on Month/Year opens the cell; Week header growth keeps hours still (correct) |
| 4 | Strange (HEAD 31fd581, scoped to the pass-3 blocker, Bryce allowed) | PASS | none | Reduce motion: first painted frame after release shows the target at 0 on Day, Month and Week (screencasts). Normal motion: 1:1 drag, glide, one-frame hand-over on Day and Month. Note: for one frame (2 to 3 on Month) the "today" marker and the Today button's disabled state lag the incoming page; pre-existing, frame-capture only |
| 4 | Vision (HEAD 31fd581, scoped to F4, Bryce allowed) | PASS | none | Gauntlet re-run green, build exit 0 captured; diff exactly one class; built CSS order and specificity confirmed and measured live (rest `none`, glide `transform 0.26s`). Real touch, production build: reduce motion Day both ways, Month both ways, Tablet 1024 all go from the drag offset to 0 with the target in one sample; normal Day both ways 16 glide frames, one-frame hand-over, 0 mismatches. Pass-3 reduce-motion note closed |

## Delivery

- **Gates:** Captain PASS (pass 2), Vision PASS (pass 4), Strange PASS
  (pass 4). Pass 4 was a fourth, focused pass Bryce allowed
  (2026-11-10, "Yes, one more round") after Strange's pass-3 blocker on
  the reduce-motion hand-over.
- **Built:** one pure gesture machine (`calendarGesture.ts`, hold and drag
  off for PR 4), the settle rule (`pageSettle.ts`), `usePagedSwipe.ts`
  driving `PagedTrack`, Month and Year in `PagedPeriodViews.tsx`, the
  timeline split into `TimelineGrid.tsx` and `TimelinePage.tsx`,
  `neighbourAnchor`, `usePrefersReducedMotion`. `usePageSwipe.ts` deleted;
  one `DIRECTION_LOCK_PX`.
- **Bryce's design calls:** the mock ("Looks good"); Day slides whole with
  its own hours and date ("Slides with its day", from a Google
  screenshot); 3 Day and Week keep fixed hours (the approved mock, Fury's
  call, Bryce told); the reduce-motion rule in STRUCTURE.md ("Yea").
- **Rulebook:** STRUCTURE.md gesture bullet rewritten and reduce-motion
  bullet added; layout.md bleed instances; the old bullet moved word for
  word to docs/history/structure-rationale.md.
- **Tests:** npm test 1845 pass; UTC 1838 pass plus the 7 DST skips.
- **Phone test:** in `.avengers/status.md` (screen recording).
- **Left for later (notes, not blockers):** move `SwipeActions.tsx` onto
  `gestureStep` after Bryce's real-device F3 check (STRUCTURE.md names it);
  3 Day and Week all-day bars sit about 6px right of their columns
  (pre-existing, `TimelineAllDayStrip.tsx`); a tap during a spring-back on
  Month or Year opens the cell; the "today" marker and the Today button's
  disabled state lag the incoming page for one frame; Month swipes only on
  the grid (as before); `usePagedSwipe.ts` is 342 lines, near the soft cap;
  not seen: kid login, pinned menu, real iOS Safari.
