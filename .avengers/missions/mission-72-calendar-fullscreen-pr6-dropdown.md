# Mission 72: Calendar full screen PR 6, the month dropdown and the iPad side panel

- **Status:** DELIVERING (all gates PASS: Vision pass 3, Captain pass 2, Strange pass 3 plus a scoped fourth check Bryce approved) (Bryce OK'd the mock and all seven recommendations 2026-11-11: "Yes"; after Strange's budget: "Yes, fix and finish")
- **Started:** 2026-11-11 · **Updated:** 2026-11-11 (delivery)
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
6. **Layout:** container variant `@min-[768px]:` (Fury changed this to 700px after C3, see C4 part A) (px, listed in layout.md's
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
- **Status:** DONE `585cae5` (tsc, lint, npm test 2004 pass, UTC line all exit 0; build left to Fury; TimelineGrid 411 to 375 lines)
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
- **Status:** DONE 2126158 (tsc, lint, test 2004 pass, UTC 0 fail, build all exit 0; compiled override has !important; Chrome 1024x768: sidebar 256px, marker 72px, rail 72px both ways)
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
- **Status:** DONE `9aca236` (tsc, lint, npm test 2005 pass, UTC line all exit 0; build left to Fury; CalendarViews 494 to 493)
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
- **Status:** DONE `fc27454` (tsc, lint, test 2006 pass, UTC 0 fail 10 skipped, build all exit 0; CalendarViews 493 to 494, ScheduleView 580 to 559; rg finds nothing)
- **Objective:** (A) the side panel's container cutoff becomes 700px; (B) the wide Schedule's right-hand `ScheduleMiniMonth` and its
  two-column wrapper go; the panel rings Schedule's day in view and a day
  tap scrolls the list (or jumps).
- **Boundaries:** may touch `src/components/ScheduleView.tsx`,
  `src/components/ScheduleMiniMonth.tsx` (delete),
  `src/lib/useScheduleDayInView.ts`, `src/lib/useScheduleDayInView.test.ts`,
  `src/components/CalendarViews.tsx`.
  Added after C3 (Fury, 2026-11-11): `src/lib/gridClasses.ts`, new `src/lib/gridClasses.test.ts`.
- **Must not touch:** everything else.
- **Work, part A (the width cutoff, found after C3):** C3 used a 768px
  container cutoff (`COLUMN_MIN_WIDTH_PX[2]`). `<main>` keeps `px-4` on wide
  pages, so the Calendar body is 32px narrower than the window: an upright
  iPad (768) gives 736, an iPad held sideways with a pinned Sidebar
  (1024 - 256) gives 736. With 768 the side panel never appears on Bryce's
  iPad in either case. New cutoff **700px**: one exported constant
  `MONTH_PANEL_BESIDE_MIN_PX = 700` in `gridClasses.ts` beside the class
  strings, which become `@min-[700px]:` (literal, Tailwind cannot read an
  interpolated class); CalendarViews compares against the constant (drop the
  `COLUMN_MIN_WIDTH_PX` import if unused); a small test asserts every
  month-panel class string's container variant is
  `@min-[${MONTH_PANEL_BESIDE_MIN_PX}px]`. Update the comments that say 768.
  (Phones stay under it: the widest phone upright is about 440, less 32.)
- **Work, part B:** delete `ScheduleMiniMonth.tsx` and the wrapper at
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

### F1 - Pass 1 fixes (Vision, Strange and Captain blockers, chosen notes)
- **Status:** DONE `9a2c419` (tsc, lint, npm test 2012 pass, UTC 0 fail 10 skipped, build all exit 0; CalendarViews 494, ScheduleView 559; harness: phone open mid-list holds the reader's row at 274px, side panel stays at top 86 after scroll and day tap, side days 44.42 x 44, 768 Largest stacked and 768 Normal beside)
- **Objective:** the panel never moves the reader's place and stays in view
  on Schedule; side-panel days reach 44px; the side layout appears only when
  the view keeps usable columns; a day tap on the phone closes before it
  scrolls; Captain's comment.
- **Boundaries:** may touch `src/components/CalendarViews.tsx`,
  `src/components/MonthJumpPanel.tsx`, `src/components/MiniMonth.tsx`,
  `src/components/MonthChips.tsx`, `src/components/ScheduleView.tsx`,
  `src/lib/gridClasses.ts`, `src/lib/gridClasses.test.ts`,
  `src/lib/monthPanelOpen.ts`, `src/lib/monthPanelOpen.test.ts`.
  Must not touch: `usePagedSwipe.ts`, `PagedTrack.tsx`, `useTimelineZoom.ts`,
  `TimelineGrid.tsx`, `useFillViewportHeight.ts`, `PinnedNav.tsx`,
  `AppChrome.tsx`, `NavList.tsx`, the rulebooks (Fury lands those).
- **Work:**
  1. **MonthChips jump (Strange B1 part 1).** Replace
     `scrollIntoView({inline:"center", block:"nearest"})` with a scroll of
     the strip only (`strip.scrollLeft = chip.offsetLeft -
     (strip.clientWidth - chip.offsetWidth) / 2` on its `overflow-x-auto`
     div, `behavior` instant). Opening the panel must never change
     `window.scrollY`.
  2. **Panel stays in view while the page scrolls (Vision B1, Strange B1
     part 2).** The stacked panel (phone, and Month and Year at every
     width) and the side panel on Schedule are `sticky` under the page's
     pinned chrome: on Schedule `top` = Schedule's chrome height + 0.5rem
     (`useHamburgerInsetPx().insetPx + SCHEDULE_HEADER_BAR_HEIGHT_REM *
     rootPx`, the value ScheduleView already computes; one source, not a
     second copy), stacked gets an opaque `bg-bg` and a z-index above the
     list and below the sheets. The side column is `self-start`. Pick one
     home for the top value and say which.
  3. **Hold the reader's place on open and close (Vision B1).** When the
     panel mounts or unmounts while `window.scrollY > 0`, keep the content
     still: record the document height before the toggle and add the
     difference to the scroll position in a layout effect after it (the
     `useScrollAnchor` `prepareAdjustment` pattern; reuse it if it fits).
     At `scrollY == 0` the panel pushes the view down as the mock shows.
  4. **Phone day tap closes first (Vision B2).** Close (`flushSync`) before
     `scrollToDay`/`jumpToDay`, so the picked day lands under the header.
  5. **Side width and when to go beside (Strange B2).** The side column is
     `21rem` (days (336 - padding) / 7 >= 44px at Normal; measure, do not
     trust the sum). Beside is decided in JS, not by a bare container
     query: `beside = view is Schedule/Day/3 Day/Week && width >=
     MONTH_PANEL_BESIDE_MIN_PX && width - sideWidthPx >= 7 * 49 + 48`,
     using the live root font size for `sideWidthPx` (DESIGN.md px case
     (c)); put this as a pure function in `gridClasses.ts` with tests (at
     least: 736 Normal beside; 736 Largest stacked; 920 Largest beside;
     690 stacked). Apply side or stacked class strings from `beside`
     (no `@min-[700px]:` variants left, or keep the constant's test true
     to whatever remains). Remembering is unchanged: `wide` (width >=
     700) still decides stored vs phone state; `beside` only decides the
     layout, and the `data-month-panel` marker is set only when beside.
  6. **Little month follows the view (Vision note).** The panel's shown
     month resets to the anchor's month whenever the anchor's month
     changes (Today, a swipe, a view switch) while it is open.
  7. **Ringed day's dot (Strange note).** The dot never hides in the ring:
     hide it on the ringed day, or move it clear; say which.
  8. **Phone dropdown line full width (Strange note).** The stacked panel's
     bottom line runs edge to edge like the calendar under it (cancel
     `<main>`'s padding with `PAGE_BLEED_CLASSES` on the stacked wrapper,
     keeping the chips' and month's own inner padding).
  9. **Captain's blocker.** The comment on the cutoff constant names
     mission-58 and why it is px (rem would move with Text size and drop
     the side panel on an iPad at Large and above), pointing at
     docs/structure/layout.md, Wide pages rule 2.
  10. **Tidy (Captain notes).** Move the "Year: a chip shows that year"
      comment to the prop it describes; reindent ScheduleView's list
      children one level.
  **Size:** CalendarViews.tsx stays at or under 494. Move the panel's
  state and decisions (`wide`, `beside`, open state, toggle, the place-hold
  effect) out of it into a hook, `useMonthPanel` in
  `src/lib/monthPanelOpen.ts` (which already owns the open state), so the
  file shrinks. ScheduleView.tsx must not grow (559).
- **Verification:** the five gauntlet commands, exit 0. Then rerun Strange's
  harness against the new build (scripts and instructions in the session
  scratchpad `strange/`: `build.mjs`, `cdp.mjs`, `probe.mjs`,
  `sched*.mjs`, `zoom.mjs`; rebuild the app first and copy the new CSS the
  way `build.mjs` expects) and report: `window.scrollY` before and after
  opening on Schedule mid-list (phone and 1024 sidebar); the panel's top on
  screen after a Schedule day tap (iPad) and after scrolling; the picked
  day's top vs the header after a phone day tap; side-panel day button
  sizes at 1024 and 768 Normal; Week column width at 768 Largest (stacked
  expected) and 768 Normal (beside); timeline bottom gap still 0px open
  and closed.
- **Evidence:** exit codes and counts, `wc -l` before and after, the
  measurements above with screenshot paths.
- **Done:** every measurement above as expected, gauntlet green.

### F2 - Pass 2 fixes (Vision and Strange blockers)
- **Status:** DONE `28a9d10` (tsc, lint, npm test 2017 pass, UTC 0 fail 10 skipped, build all exit 0; CalendarViews 494, ScheduleView 564; harness: Sidebar 1024x768 and 1180x820 beside at every size with rail 72px, page scroll 0, gap 0; 768 Normal beside, Large and up stacked; Schedule stacked: tapped row lands at the panel's bottom, Today enabled while its row is behind the panel)
- **Objective:** a landscape iPad with a pinned Sidebar decides beside as if
  the Sidebar were already the rail; on Schedule a stacked panel never hides
  the row Schedule scrolls to, the ring's day or today's visibility.
- **Boundaries:** may touch `src/lib/monthPanelOpen.ts`,
  `src/lib/monthPanelOpen.test.ts`, `src/lib/gridClasses.ts`,
  `src/lib/gridClasses.test.ts`, `src/components/CalendarViews.tsx`,
  `src/components/ScheduleView.tsx`, `src/lib/useScheduleDayInView.ts`.
  Must not touch: `PinnedNav.tsx`, `AppChrome.tsx`, `appChrome.ts` (read its
  exports only), `TimelineGrid.tsx`, `useFillViewportHeight.ts`,
  `usePagedSwipe.ts`, the rulebooks and DESIGN.md (Fury).
- **Work:**
  1. **Beside allows for the squeeze (Strange B).** While the panel is not
     beside, if the pinned Sidebar is what is showing, `monthPanelBeside`
     gets the body width plus the difference between the Sidebar and the
     rail widths (`NAV_SIDEBAR_WIDTH` and `NAV_RAIL_WIDTH` from
     `appChrome.ts`, parsed to px; no new numbers). Detect "Sidebar
     showing" from the page itself, not from `navMode` props threading
     through the page: e.g. read the inherited `--app-nav-width` custom
     property on the body element (it is set only at lg and only for a
     pinned menu; 256px means the Sidebar is showing). Once beside, the
     measured width already includes the rail, so no flip. Make the width
     adjustment a pure function with tests: 1024 landscape Sidebar at Large
     and Largest goes beside; 1180 Sidebar Largest beside; 768 upright at
     Large stacks; the beside state with rail width stays beside.
  2. **One reveal line on Schedule (Vision B).** When Schedule shows a
     stacked (not beside) open panel, measure the panel wrapper's height
     (ResizeObserver; 0 otherwise) and pass it to ScheduleView as one prop
     (e.g. `revealExtraPx`). Schedule uses `scheduleChromeHeight +
     revealExtraPx` everywhere it means "the line under the pinned chrome":
     the rows' `scrollMarginTop`, the `useScheduleDayInView` line, the
     landed-short check, and the Today-visible observer's top rootMargin.
     The panel's sticky `top` stays the chrome height alone.
  3. **Hold only when something changes (Vision note).** `toggle` records
     the held top only when the open state will really change (with no
     viewer on a wide body nothing changes, so nothing is held).
  4. **Header comment (Captain note).** `monthPanelOpen.ts`'s header says
     the file owns both the stored value and `useMonthPanel`.
  **Size:** CalendarViews.tsx at or under 494; ScheduleView.tsx at or under
  565 (a prop and one shared line value; no logic copied).
- **Verification:** the five gauntlet commands. Then the harness in the
  session scratchpad `strange/` (Strange's `p2*.mjs` and `css-p2.mjs`,
  `build.mjs`): 1024x768 and 1180x820 pinned Sidebar at Normal, Large,
  Larger, Largest on Week: beside, rail 72px, page scroll 0, timeline gap 0;
  768x1024 Normal beside, Large and Largest stacked; on Schedule with a
  stacked open panel (phone, and 768 Large): tap a day in the little month
  (iPad) and tap Today (phone) and report the target row's top against the
  panel's bottom (must be at or below it), and that the Today circle is
  enabled while today's row is hidden behind the panel.
- **Evidence:** exit codes and counts, `wc -l` before and after, the
  measurements with screenshot paths.
- **Done:** every measurement as expected, gauntlet green.

### F3 - Strange pass 3 blocker (approved by Bryce 2026-11-11)
- **Status:** DONE be1b716 (tsc 0, lint 0, test 2017, UTC 2007 + 10 skips, build 0; k.mjs after scroll to December: 1024 beside month Dec, ring Dec 5 visible; phone Dec, ring Dec 9 visible; CalendarViews 494)
- **Objective:** on Schedule the little month shows the month of the day
  the list is showing, so the ring is visible, like main's ScheduleMiniMonth.
- **Boundaries:** may touch `src/components/CalendarViews.tsx` (the
  `MonthJumpPanel` `anchor` prop only), `DESIGN.md` (Fury: "mid-list on a
  phone or an upright iPad"). Must not touch anything else.
- **Work:** `anchor={isSchedule && scheduleDay !== null ? new Date(scheduleDay) : anchor}`
  (or the equivalent with the file's names); the panel's existing
  `seenAnchorMonth` reset follows it. CalendarViews stays at or under 494.
- **Verification:** the five gauntlet commands; Strange's `p3/k.mjs` after a
  scroll into December: visible month December, ring visible, on 1024
  Sidebar beside and on the phone.
- **Evidence:** exit codes, the k.mjs output and shots.
- **Done:** as verification.

**Fury's calls after F1:** (superseded by F2, which fixed it: page scroll 0 at every size) accepted the one missed measurement (1024x768, pinned Sidebar, Largest: the panel stacks, 535px tall, the timeline hits its 320px floor and the page scrolls 234px; returns to 0 on close; nothing hidden; told to Bryce). Accepted the sticky top at exactly the chrome height (the +0.5rem let list text show through) and sticky on Schedule only. Rulebooks updated to the JS `monthPanelBeside` decision.

(Rulebooks: Fury lands Captain's drafts in calendar.md, layout.md and
STRUCTURE.md after C4; Strange drafts the DESIGN.md exception at the gate.)

## Gate log

| Pass | Gate | Verdict | Findings |
|---|---|---|---|
| 4 (scoped, Bryce) | Strange (HEAD 88f2250) | PASS | F3 measured: Schedule panel follows the list into December and back to November with the ring visible, iPad beside and phone; Day and Week unaffected (start at the anchor's month); DESIGN.md paragraph matches. Note: at a week boundary the ring can lead the first fully visible row by a day (day-in-view rule, accepted) |
| 3 | Strange (HEAD 72179d1) | BLOCK | Every F2 fix measured PASS (1024 and 1180 pinned Sidebar beside at all four sizes, rail 72, scroll 0, gap 0; 768 Normal beside, Large and up stacked; Schedule reveal line exact on phone, 768 Large and Largest; pass 1 sweep clean). B (present since C4, missed by passes 1 and 2): on Schedule the little month stays on the URL anchor's month while the list moves (list in December, panel shows November, no ring visible), breaking DESIGN.md's MiniMonth "the day on screen ringed"; regression from main's ScheduleMiniMonth. Fix: `MonthJumpPanel` `anchor` = Schedule's day in view on Schedule. Notes: DESIGN.md "mid-list on a phone" also applies to an upright iPad at Large and up; 1024 Largest beside Week columns 54px (titles clip) |
| 3 | Vision (HEAD 72179d1) | PASS | Gauntlet green (tsc 0, lint 0, test 2017, UTC 2007 + 10 skips, build 0); boundary clean; pass 2 blocker fixed (`revealLine` used for scroll margin, landed-short, Today observer, day-in-view; sticky top stays chrome only). No flip between beside and stacked (effective width equal before and after the squeeze). Structure subset: CalendarViews 494, ScheduleView 564, no new numbers, lib imports appChrome only. Notes: Schedule month title still uses the chrome line (cosmetic); first-commit child-effect order unproven on device; build CSS warning comes from mission-67's file on main; Sidebar width read from the live variable |
| 2 | Strange (HEAD b8b4180) | BLOCK | All F1 fixes measured PASS (Schedule hold and sticky on phone and iPad, phone tap closes first, 44.42x44 days, 768 Normal beside 53px / Largest stacked 103px, timeline gap 0 everywhere but one, dot clear, line full width). B: landscape iPad with a pinned Sidebar at any size above Normal stacks (1024x768 Large 52px / Larger 166 / Largest 234px page scroll; 1180x820 Largest 182), because `monthPanelBeside` is given the width measured with the 256px Sidebar, before the squeeze to the 72px rail; Rail rows show beside fits (54 to 74px columns). B (text): DESIGN.md parenthetical (768 upright stacks from Large) and "stays in view while the page scrolls" (Schedule only). Notes: phone Schedule dropdown covers the list top (reads fine), empty day rings the next |
| 2 | Vision (HEAD b8b4180) | BLOCK | Gauntlet green (build 0, tsc 0, lint 0, test 2012, UTC 2002 + 10 skips); boundary clean; pass 1 B1 and B2 fixed. New B (introduced by F1): a stacked panel on Schedule is sticky at the chrome height, but Schedule still reveals rows at the chrome height, so a scrolled-to row lands behind the panel: upright iPad at Large and above (wide but stacked, stays open) day tap; phone Today with the dropdown open; the Today-visible observer and the day-in-view ring read behind the panel. Fix: one reveal line, `scheduleChromeHeight + revealExtraPx` (the stacked panel's measured height on Schedule) for scrollMarginTop, the day-in-view line, the landed-short check and the Today observer's rootMargin. Notes: null-viewer hold on a wide body; Month/Year not sticky (accepted); upright iPad stacks at Large too |
| 2 | Captain (HEAD b8b4180) | PASS | Blocker fixed. JS `monthPanelBeside` from the measured container is allowed by layout.md rule 2 (wording right); `scheduleChromeHeightPx` in ScheduleView fine (one formula). Notes: monthPanelOpen.ts header out of date; `BESIDE_VIEW_MIN_PX`'s 48 copies `GUTTER_WIDTH_PX` (move it to lib on next timeline touch); DESIGN.md "stays in view while the page scrolls" broader than sticky-on-Schedule |
| 1 | Strange (HEAD 6639dd8) | BLOCK | Harness of real AppChrome + CalendarViews with production CSS, 128 shots in the session scratchpad `strange/`. PASS: timeline gap 0px closed/open/re-closed at zoom 32/96/192; rail squeeze 256 to 72 with fixed bars; arrow and aria-expanded; chips 44px; no bleed overlap; Month at rest no chips; phone close and swipe; iPad remember; dots. B1 Schedule: `MonthChips` `scrollIntoView` scrolls the document (list jumped from December to Oct 1); phone dropdown 4110px above the screen; iPad side panel not sticky (old one was). B2: side-panel days 38x44 at Normal (under the 44 floor); 768 Largest beside leaves Week columns 38px. Notes: no slide (fine, Bryce's call); 6-row months; dot under ringed day hides in the ring; phone dropdown line inset 16px; Year chip highlights a month; Schedule empty day rings the next day. DESIGN.md text drafted |
| 1 | Vision (HEAD 6639dd8) | BLOCK | Gauntlet all green (build 0, tsc 0, lint 0, test 2006, UTC 1996 + 10 skips); boundaries clean. B1: on Schedule the panel is an ordinary block at the page top while the page scrolls: iPad beside, a day tap scrolls the panel away (the old ScheduleMiniMonth was `sticky self-start`); phone mid-list, the dropdown opens above the screen and the list jumps ~350px (Schedule turns scroll anchoring off). B2: phone `pickDay` scrolls then closes, so the picked day ends ~350px above the header. Notes: RO loop warning once per toggle (harmless); phone held sideways (body ~900) counts as wide and remembers; panel's shown month not reset when the anchor's month changes; `daysWithItems` 62-day cap from start, thin tests; PinnedNav both bodies mounted |
| 1 | Captain (HEAD 6639dd8) | BLOCK | B: `gridClasses.ts:45-52` px threshold comment must name mission-58 and why (layout.md Wide pages rule 2). Notes: layout.md "these two files" should be "these files"; CalendarViews:425 Year chip comment sits above `pickDay`; ScheduleView 447-482 dedented one level too far; PinnedNav keeps both bodies mounted in sidebar mode (as ruled). Sizes, one source of truth, dependency direction, rulebooks all PASS |

## Delivery

- **Gates:** Vision PASS (pass 3), Captain PASS (pass 2), Strange PASS
  (scoped fourth check after F3, approved by Bryce once pass 3 used the
  budget). Fix contracts F1 (pass 1: Schedule place and stickiness, phone
  close-then-scroll, 44px side days, JS beside decision, Captain's comment),
  F2 (pass 2: rail-aware beside, one Schedule reveal line), F3 (pass 3: the
  Schedule panel follows the list's month).
- **Built:** `MonthJumpPanel` (chips plus a swipeable `MiniMonth`) replaces
  `MonthJumpSheet`; one small month (`MiniMonth`; `ScheduleMiniMonth` and
  Schedule's two-column wrapper deleted); `useMonthPanel` and
  `useMonthPanelOpen` (`monthPanelOpen.ts`): phone plain state, iPad per
  person per device; `monthPanelBeside` and `widthWithRailNav`
  (`gridClasses.ts`); `useFillViewportHeight` (moved out of TimelineGrid,
  plus an observer on `data-calendar-body`); the pinned Sidebar squeezes to
  the rail through `data-month-panel` (AppChrome, PinnedNav); dots from
  `daysWithItems`; Month's always-on chips moved into the dropdown.
- **Bryce's design calls:** the mock and seven recommendations ("Yes");
  "Yes, fix and finish" after the budget; keep the sideways iPad at Largest
  (54px Week columns, titles clip while the panel is open).
- **Rulebook:** docs/structure/calendar.md "The small month and the month
  panel"; docs/structure/layout.md "The month panel marker" and the px
  list; STRUCTURE.md pointer and trend lines; DESIGN.md the month panel
  exception, `MiniMonth`, the title arrow.
- **Tests:** npm test 2001 to 2017; UTC 2007 pass + 10 skips.
- **Not proven by any agent:** real iOS Safari and the signed-in app (no
  agent login); all visuals came from harnesses mounting the real
  components with production CSS (session scratchpad `strange/`).
- **Left for later:** Schedule's header month title still uses the chrome
  line, not the reveal line (cosmetic); `BESIDE_VIEW_MIN_PX`'s 48 copies
  `GUTTER_WIDTH_PX` (move it to lib on the next timeline touch);
  `daysWithItems` counts its 62-day cap from an event's start; Month and
  Year chip rows are not sticky; the dropdown appears without a slide;
  six-row little months; Year's chip row highlights a month.
- **Phone test:** in `.avengers/status.md`.
