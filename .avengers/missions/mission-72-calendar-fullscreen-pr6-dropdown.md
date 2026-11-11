# Mission 72: Calendar full screen PR 6, the month dropdown and the iPad side panel

- **Status:** CONTRACTED (Bryce OK'd the mock and all seven recommendations 2026-11-11: "Yes")
- **Started:** 2026-11-11 · **Updated:** 2026-11-11
- **Plan:** `.avengers/plans/calendar-fullscreen-v1.md`, "PR 6: The month dropdown (decisions 8, 12, 14; small calls D, E)"
- **Branch:** `claude/calendar-fullscreen-pr6-0e927b`, cut from `origin/main` `a1bd34a` (PR 5 merged as #113)
- **Mock:** `.avengers/mocks/calendar-pr6-dropdown-mock.html` (sent to Bryce 2026-11-11)

## Brief

- **Goal:** tapping the month title ("November") stops opening the
  `MonthJumpSheet` and instead opens an inline panel. Phone: it drops down
  under the top bar and pushes the calendar down (chips plus a swipeable
  little month on Schedule, Day, 3 Day, Week; chips only on Month and Year);
  picking a day jumps there in the same view and closes it. iPad (from
  `md`): on Schedule, Day, 3 Day and Week it is a column on the left, the
  calendar moves over, it stays open until the title is tapped again, and
  its open state is remembered per device and per person; on Month and Year
  only the chip row drops down. While the side panel is open a pinned
  sidebar shows as the icon rail (CSS only, `navMode` never changes).
- **Done means:** the above on a 393 by 852 phone and on iPad 1024 by 768
  and 768 by 1024 at Normal and Largest text, light and dark; the timeline
  loses no row and shows no blank band when the panel opens or closes, at
  every zoom; the zoom anchor survives; chips and dates are 44px targets;
  `MonthJumpSheet` is gone; one small-month component (or a recorded reason
  for two); the gauntlet passes; merged, deploy checked, phone test in
  `.avengers/status.md`.
- **Out of scope:** the all-day row (PR 7), search (PR 8), anything in the
  gesture machine beyond what a second `PagedTrack` needs, event data in the
  little month beyond the loaded fetch window.

## Danger register

From AGENTS.md, absolute: no `db:seed`/`db:reset`; never a clean script for
`User`; migrations additive only (none expected here); secrets never in
git or chat; never `git add -A`/`.`; direct pushes to `main` blocked;
merging deploys to the family. This PR needs no database writes.

## Gauntlet

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always).
- Strange: everything here is visible.
- Captain: a new component, a deleted one, a possible merge of two small
  months, a new page marker and CSS rule; the plan names Captain for the
  dropdown PR.
- Banner: before contracts, to map MonthJumpSheet, ScheduleMiniMonth,
  PagedTrack, the timeline's height measurement and the AppChrome rail.

## Bryce's calls (2026-11-11, "Yes" to all of Fury's recommendations)

1. The mock as sent.
2. Phone: the dropdown closes only by tapping the title again or picking a
   day; tapping the calendar below does nothing special.
3. Swiping the little month moves only the little month.
4. iPad Schedule: the right-hand little month moves into the new left
   panel; the panel rings Schedule's day in view and a tap scrolls the list
   (falls back to a jump).
5. Dots only where events are loaded (the fetch window); further out, no dots.
6. The phone does **not** remember the dropdown (always starts closed); the
   iPad (container 768px and wider) remembers its panel per person per device.
7. The squeezed rail keeps its "Show menu names" button.

Fury's reading of the mock, recorded so the gates can check it: on Month the
always-on chip row (mission 18, `CalendarViews.tsx` month branch) moves
into the dropdown, so Month at rest shows no chips (small call D, the mock).
On Month a chip tap still navigates Month (`handlePickMonth`); on Year a
chip tap calls `jumpToDay` with that month's 1st (the Year view shows that
year). A chip tap never closes the dropdown; a day tap closes it on the
phone only. Out-of-month cells in the little month are blank (the mock).

## Captain's pre-build rulings (2026-11-11, consult, not a gate)

1. **One small month:** new `src/components/MiniMonth.tsx` (weekday
   letters + 42 cells from `monthGridDays`, `isTodayCell`; props `month`,
   `today`, `selected?`, `onPickDay`). Out-of-month cells blank (the mock).
   If Bryce moves Schedule's month into the panel: delete
   `ScheduleMiniMonth.tsx`, Schedule's two-column wrapper
   (`ScheduleView.tsx:445-460`) and `miniMonthRef`; Schedule hands its day
   in view up through one callback so the panel can ring it and scroll the
   list (`if (!scrollToDay(day)) jumpToDay(day)`).
2. **Panel:** `src/components/MonthJumpPanel.tsx` (MonthChips + a
   `PagedSwipeArea` of `MiniMonth`, local shown month). **Open state:**
   `src/lib/monthPanelOpen.ts`, `useMonthPanelOpen(viewerId)`, copying
   `lastCalendarView.ts` / the zoom's per-person key, pure key/parse with
   `monthPanelOpen.test.ts`; null viewer = closed, never saved. Called in
   `CalendarViews` in place of `pickingMonth`. Root carries
   `data-month-panel="open"` only while open. If the phone must not
   remember: honour the stored value only when `useContainerWidth` on the
   calendar container is at least `COLUMN_MIN_WIDTH_PX[2]`; never
   `matchMedia`/`innerWidth`.
3. **Swipe:** reuse `PagedSwipeArea` unchanged, no drag callbacks,
   `pageKey` = year*12+month. Must be a sibling of the timeline root and the
   Month/Year swipe areas, never nested in one.
4. **Height:** new `src/lib/useFillViewportHeight.ts`; `TimelineGrid.tsx`
   248-285 moves into it word for word, plus a ResizeObserver on the
   timeline root's `parentElement`. Keep the synchronous `style.height`
   write. TimelineGrid shrinks.
5. **Rail look:** `PinnedNav`'s aside width reads `var(--app-nav-width-lg)`;
   AppChrome also sets `--app-nav-rail-width: NAV_RAIL_WIDTH`; one override
   in sidebar mode only:
   `lg:[body:has([data-month-panel=open])_&]:[--app-nav-width-lg:var(--app-nav-rail-width)]!`.
   In sidebar mode PinnedNav renders both bodies (sidebar and rail) and the
   marker shows one; `NavList` unchanged; `navMode` untouched.
6. **Layout:** container variant `@min-[768px]:` (px, listed in layout.md's
   mission-58 list), not `md:`. The container wraps only the panel and the
   period content; sheets, + dial, Undo bar outside. Mind the timeline's
   left bleed into the gap beside the panel.
7. **Dead code:** MonthJumpSheet; CalendarSheets' sheet props and mount;
   `pickingMonth`; CalendarHeader prop renamed `onToggleMonthPanel` with
   `aria-expanded`; comments in `monthLayout.ts:58-60`,
   `monthLayout.test.ts:227`.
8. **Must not grow:** CalendarViews.tsx (494), ScheduleView.tsx (580),
   TimelineGrid.tsx (shrinks), usePagedSwipe.ts and useTimelineZoom.ts (no
   edits). PinnedNav and AppChrome small edits only.

### Captain's rulebook drafts (to land with the code; adjust to what Bryce picks)

**docs/structure/calendar.md**, new section after "The pointer-gesture machine":

> ## The small month and the month panel
>
> - **One small month.** `src/components/MiniMonth.tsx` is the only
>   navigation grid of days: weekday letters and the 42 cells from
>   `monthGridDays`, today from `isTodayCell`, an optional `selected` ring,
>   `onPickDay`. Its callers add their own header (`MonthJumpPanel`'s
>   `MonthChips`). A second day grid built from `monthGridDays` for
>   navigation is a BLOCKER; `MonthGrid`/`MonthCell` and `YearView` draw
>   events and are not navigation grids.
> - **The month panel** is `src/components/MonthJumpPanel.tsx`: on a phone it
>   drops down above the view, from 768px of container width it is a column
>   beside it (docs/structure/layout.md, rule 2). Its open state is
>   `useMonthPanelOpen(viewerId)` (`src/lib/monthPanelOpen.ts`): one boolean
>   per person per device in localStorage, read with `useSyncExternalStore`,
>   closed on the server and when nobody is signed in. Its root carries
>   `data-month-panel="open"` while open, and that marker is the only signal
>   the app chrome reads (layout.md, "The month panel marker").
> - **A second paging surface is allowed, never a nested one.** The panel's
>   little month pages with `PagedSwipeArea` (no drag callbacks), like Month
>   and Year. Because `--page-dx` is inherited, `[data-glide=true]` matches
>   any ancestor and React handlers bubble, a `PagedSwipeArea` or
>   `PagedTrack` inside another swipe root (the timeline's
>   `data-fills-viewport` root, Month's or Year's swipe area) is a BLOCKER.
> - **The timeline fills to the screen's bottom through
>   `useFillViewportHeight`** (`src/lib/useFillViewportHeight.ts`): it
>   measures on mount, window resize, a view change, and whenever the
>   timeline root's parent changes size (the panel opening or closing above
>   it). A second height measurement of the scroller is a BLOCKER.
>   (Added mission-72, on Captain's ruling.)

**docs/structure/layout.md**: (a) in the mission-58 px list after
`TimelineDayColumn.tsx`: "and the Calendar's month-panel container
(`@min-[768px]:`, the panel beside the view; the phone dropdown below it,
mission-72)". (b) New paragraph after "Edge to edge":

> **The month panel marker (mission-72, Captain's ruling).** While
> `data-month-panel="open"` is on the page, a pinned Sidebar draws as the
> icon rail without changing the person's Menu style: `PinnedNav` renders
> its sidebar and rail bodies and the marker picks one, and `AppChrome`'s
> row overrides `--app-nav-width-lg` with `--app-nav-rail-width`
> (`NAV_RAIL_WIDTH`) in sidebar mode only. The pinned aside's width reads
> `var(--app-nav-width-lg)`, so the aside and every fixed bar move together.
> That override is the one `!important` in the chrome (it must beat the
> inline variable); a second, a hard-coded nav width, or a page changing
> `navMode` to get this look is a BLOCKER.

**STRUCTURE.md**, "One source of truth", near the gesture pointer:

> - **One small month, one month-panel marker.** `MiniMonth.tsx` is the only
>   navigation day grid; `data-month-panel` is the only page-to-chrome signal
>   for the rail look. (Rules: docs/structure/calendar.md, "The small month
>   and the month panel"; docs/structure/layout.md, "The month panel marker".)

Plus the calendar trend lines (STRUCTURE.md ~897-918) with post-build counts.

## Contracts

Order: C1 and C2 in parallel (disjoint files); then C3 (needs C1); then C4
(needs C3; both touch CalendarViews). Every builder: run `npm ci` only if
`node_modules` is missing; no `.env` exists in this worktree and none is
needed; stage by explicit path; one commit per contract; `git show --stat
HEAD` after.

### C1 - the open-state hook and the height hook
- **Status:** PENDING
- **Objective:** add `useMonthPanelOpen` and move the timeline's height
  measurement into `useFillViewportHeight`, which also re-measures when the
  calendar body above or around the timeline changes size.
- **Boundaries:** may touch new `src/lib/monthPanelOpen.ts`,
  new `src/lib/monthPanelOpen.test.ts`, new `src/lib/useFillViewportHeight.ts`, `src/components/TimelineGrid.tsx`.
- **Must not touch:** everything else, in particular `usePagedSwipe.ts`,
  `useTimelineZoom.ts`, `calendarGesture.ts`, `CalendarViews.tsx`.
- **Work:**
  1. `monthPanelOpen.ts`: copy the shape of `src/lib/lastCalendarView.ts`
     and the per-person key of `timelineZoom.ts` `hourHeightKey`. Pure
     `monthPanelOpenKey(personId)` (prefix `marshee:calendar-month-panel:`)
     and `parseMonthPanelOpen(raw: string | null): boolean` ("1" is open,
     anything else closed). A same-tab change event. Storage reads and
     writes in try/catch. `useMonthPanelOpen(viewerId: string | null)`
     returns `[open: boolean, setOpen: (open: boolean) => void]` via
     `useSyncExternalStore` with server snapshot `false`; a null viewer
     reads `false` and `setOpen` is a no-op. Tests for the key and parse.
  2. `useFillViewportHeight.ts`: move `TimelineGrid.tsx`'s sizing block
     (the `measuredHeightPx` state, the layout effect with `measure()`, the
     synchronous `style.height` write and its comment, the `calc()` seed)
     into it **unchanged in behaviour**. Signature roughly
     `useFillViewportHeight(scrollerRef, { minPx, chromeOffsetPx, resetKey })`
     returning the height style string. Keep the mount, window `resize`
     and `[view]` (`resetKey`) triggers. Add one `ResizeObserver` on
     `scroller.closest("[data-calendar-body]") ?? scroller.parentElement`
     (C3 puts `data-calendar-body` on the box holding the panel and the
     view), calling the same `measure()`; disconnect on cleanup. Never call
     `setState` when the value is unchanged (no render loop).
  3. `TimelineGrid.tsx` calls the hook; it must get shorter. The
     scroll-to-now effect still runs after the synchronous height write in
     the same commit.
- **Verification:** `npx tsc --noEmit`; `npm run lint`; `npm test`; the UTC
  line; `npm run build`. All exit 0.
- **Evidence:** the five exit codes and test counts; `wc -l` of the three
  new files and of TimelineGrid before and after; the moved block shown as
  a diff that adds no new behaviour besides the observer.
- **Done:** gates can see one height measurement of the scroller, in the new
  hook, and TimelineGrid shorter.

### C2 - the pinned menu squeezes to the rail while the panel is open
- **Status:** PENDING
- **Objective:** while `[data-month-panel=open]` is anywhere on the page, a
  pinned **sidebar** draws as the icon rail (with its "Show menu names"
  button and drawer), and every fixed bar follows; `navMode` never changes.
- **Boundaries:** may touch `src/components/PinnedNav.tsx`, `src/components/AppChrome.tsx`,
  `src/lib/appChrome.ts` (only if a constant must be exported).
- **Must not touch:** `NavList.tsx`, `NavDrawer.tsx`, any calendar file,
  `FloatingAddButton.tsx`, `UndoBar.tsx`, `HamburgerButton.tsx`.
- **Work:** per Captain's ruling 5 in this file. AppChrome's wrapper also
  sets `--app-nav-rail-width: NAV_RAIL_WIDTH` inline and, in sidebar mode
  only, carries the one override class
  `lg:[body:has([data-month-panel=open])_&]:[--app-nav-width-lg:var(--app-nav-rail-width)]!`
  (check the compiled CSS really has `!important` and the selector you
  expect). PinnedNav's aside width becomes `var(--app-nav-width-lg)`. In
  sidebar mode PinnedNav renders both bodies, the sidebar body hidden and
  the rail body (button, divider, compact NavList, NavDrawer) shown while
  the marker is present, by CSS `body:has(...)` variants on their wrappers.
  Rail mode and hamburger mode render exactly as today. No hard-coded px
  width anywhere.
- **Verification:** the gauntlet (five commands). Plus a harness check:
  build, then serve a static HTML page that loads the compiled CSS from
  `.next/static/css`, and measure with a headless browser at 1024x768:
  without the marker the sidebar aside is 256px and `--app-nav-width`
  resolves to 256px; with `<div data-month-panel="open">` added it is 72px
  and resolves to 72px; in rail mode it is 72px either way. (The project has
  no DOM test harness; keep the script in the scratchpad, not the repo.)
- **Evidence:** exit codes; the compiled CSS rule text; the measured widths.
- **Done:** the widths above, and NavList untouched.

### C3 - the month panel replaces the sheet
- **Status:** PENDING (after C1)
- **Objective:** tapping the title toggles an inline `MonthJumpPanel` built
  from one new `MiniMonth`; `MonthJumpSheet` is deleted.
- **Boundaries:** may touch new `src/components/MiniMonth.tsx`,
  new `src/components/MonthJumpPanel.tsx`, `src/components/CalendarViews.tsx`,
  `src/components/CalendarHeader.tsx`, `src/components/CalendarSheets.tsx`,
  `src/components/MonthJumpSheet.tsx` (delete), `src/lib/gridClasses.ts`,
  `src/lib/monthLayout.ts` and `src/lib/monthLayout.test.ts` (comments only).
- **Must not touch:** `ScheduleView.tsx`, `ScheduleMiniMonth.tsx` (C4),
  `TimelineGrid.tsx`, `usePagedSwipe.ts`, `PagedTrack.tsx`, `MonthChips.tsx`,
  `MonthGrid.tsx`, `calendarGesture.ts`, the C1 and C2 files.
- **Work:** Bryce's calls and Fury's reading above are the spec; the mock
  `.avengers/mocks/calendar-pr6-dropdown-mock.html` is the look.
  1. `MiniMonth.tsx`: props `month`, `today`, `selected?: Date | null`,
     `onPickDay`, `dotDays?: ReadonlySet<string>` (local date strings of
     days that have an event or task). Weekday letters, cells from
     `monthGridDays`, out-of-month cells blank, today filled accent
     (`isTodayCell`, `aria-current="date"`), `selected` ringed, a small
     muted dot under a day in `dotDays` (not on today). Each day a button at
     least 44px (2.75rem) tall, aria label with full day and month names,
     "(showing)" on the ringed one. Sizes in rem.
  2. `MonthJumpPanel.tsx`: props roughly `{ view, anchor, today, selected,
     dotDays, chipsOnly, onPickDay, onPickMonth }`. Local shown month
     (starts at the anchor's month each time it opens). `MonthChips`
     (unchanged) on top; below it, unless `chipsOnly`, a `PagedSwipeArea`
     (unchanged, no drag callbacks, `pageKey` year*12+month) whose pages are
     `MiniMonth`s for the previous, shown and next month, `onTurn` stepping
     the shown month. With `chipsOnly` a chip tap calls `onPickMonth`;
     otherwise it only reframes the little month. Root carries
     `data-month-panel="open"` (it is mounted only while open).
  3. `CalendarViews.tsx`: replace `pickingMonth` with the open state. Wrap
     the panel and `renderPeriodContent()` in one `@container` box carrying
     `data-calendar-body` (sheets, + dial, Undo bar, RepeatMoveSheet stay
     outside it). Measure that box with `useContainerWidth`; `wide` is
     width >= `COLUMN_MIN_WIDTH_PX[2]`. Open = `wide ? stored : phoneOpen`
     where stored is `useMonthPanelOpen(viewerId)` and `phoneOpen` is a
     plain `useState(false)`; the title toggles whichever applies. Layout:
     below 768px container width, and on Month and Year at any width, the
     panel sits above the view (pushes it down); from `@min-[768px]:` on
     Schedule, Day, 3 Day and Week it is a left column of 18rem beside the
     view with a line between (put long class strings in `gridClasses.ts`).
     Keep the timeline's edge-to-edge look; where the panel sits beside it,
     the timeline's left bleed must not run under the panel (cancel it on
     that side or give a gap; no overlap). Month: remove the always-on
     `MonthChips` above `PagedMonth`; `chipsOnly` panel's `onPickMonth` is
     `handlePickMonth`. Year: `chipsOnly`, `onPickMonth` = `jumpToDay` of
     that month's 1st. Other views: `onPickDay` = `jumpToDay`, and on the
     phone also close. `selected` = the anchor for Day/3 Day/Week (C4 gives
     Schedule its day in view). `dotDays` from the loaded `events` and
     `tasks` (a small pure helper with a test is welcome in `monthLayout.ts`
     if needed; then that file may change beyond comments, with a test).
     **CalendarViews.tsx must not grow** (494 lines now): the removed
     sheet wiring and comments pay for it.
  4. `CalendarHeader.tsx`: prop `onOpenMonthJump` becomes
     `onToggleMonthPanel` plus `monthPanelOpen: boolean`; the title button
     gets `aria-expanded`; the small down arrow turns up while open
     (instant under reduce motion).
  5. `CalendarSheets.tsx`: remove the sheet's import, props, mount and
     comment. Delete `MonthJumpSheet.tsx`. Point the comments in
     `monthLayout.ts:58-60` and `monthLayout.test.ts:227` at `MiniMonth.tsx`.
- **Verification:** the gauntlet (five commands). `rg MonthJumpSheet src`
  finds nothing. A browser harness (scratchpad, not repo) mounting the real
  components is welcome but the gates will run the app themselves.
- **Evidence:** exit codes and counts; `wc -l` of every touched file before
  and after; the grep.
- **Done:** sheet gone; panel opens and closes from the title; the files
  above at or under their old sizes where required.

### C4 - Schedule's little month moves into the panel
- **Status:** PENDING (after C3)
- **Objective:** the wide Schedule's right-hand `ScheduleMiniMonth` and its
  two-column wrapper go; the panel rings Schedule's day in view and a day
  tap scrolls the list (or jumps).
- **Boundaries:** may touch `src/components/ScheduleView.tsx`,
  `src/components/ScheduleMiniMonth.tsx` (delete),
  `src/lib/useScheduleDayInView.ts`, `src/lib/useScheduleDayInView.test.ts`,
  `src/components/CalendarViews.tsx`.
- **Must not touch:** everything else.
- **Work:** delete `ScheduleMiniMonth.tsx` and the wrapper at
  `ScheduleView.tsx:445-460` (`@container`, the `@min-[50rem]` grid,
  `miniMonthRef`). Decide what `useScheduleDayInView`'s skip-ref argument
  becomes (removed, with its test updated, is expected; state what you did).
  ScheduleView reports its day in view up through one callback prop (no
  second copy of the tracking); `ScheduleViewHandle` (already exposed via
  `scheduleRef`) or the callback carries `scrollToDay` so CalendarViews'
  panel day tap on Schedule is `if (!scrollToDay(day)) jumpToDay(day)`.
  `selected` on Schedule = that day in view. ScheduleView.tsx must shrink;
  CalendarViews.tsx must not grow past its pre-C3 494 lines.
- **Verification:** the gauntlet; `rg "ScheduleMiniMonth|miniMonthRef" src`
  finds nothing.
- **Evidence:** exit codes and counts; `wc -l` before and after.
- **Done:** as the objective, with the sizes held.

(Rulebooks: Fury lands Captain's drafts in calendar.md, layout.md and
STRUCTURE.md after C4; Strange drafts the DESIGN.md exception at the gate.)

## Gate log

| Pass | Gate | Verdict | Findings |
|---|---|---|---|

## Delivery

(pending)
