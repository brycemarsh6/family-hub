# Mission 69: Calendar full screen PR 3, the sliding swipe

- **Status:** CONTRACTED, waiting for Bryce's OK on the mock before any builder runs
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
    rules by name: 8px lock where vertical wins a tie toward scrolling as
    today, a second pointer at any stage goes to pinch (from sliding it
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

- **Depends on:** C1, C3.
- **Objective:** Day, 3 Day and Week slide with the finger; the hours stay
  put on a turn; `usePageSwipe.ts` is gone.
- **Boundaries:** may touch: `src/components/TimelineGrid.tsx`,
  `src/components/TimelinePage.tsx`, `src/components/CalendarViews.tsx`,
  `src/lib/usePagedSwipe.ts`, `src/components/PagedTrack.tsx`; delete
  `src/lib/usePageSwipe.ts` and `src/lib/usePageSwipe.test.ts` (any pure
  case not already covered moves into `calendarGesture.test.ts`);
  `src/components/SwipeActions.tsx` (only: import `DIRECTION_LOCK_PX` from
  `calendarGesture.ts` and delete its own); `STRUCTURE.md` (the
  pointer-gesture bullet only, to say the copies are now
  `calendarGesture.ts` and `SwipeActions.tsx` and the lock is one constant).
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

## Execution log

- 2026-11-10: synced to `origin/main` `2c2d7df`. Banner brief in. Mock sent
  to Bryce. Contracts written. Waiting for Bryce's OK.

## Gate verdicts

(none yet)

## Delivery

(not yet)
