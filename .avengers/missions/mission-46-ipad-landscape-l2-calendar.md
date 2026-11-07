# Mission 46: iPad landscape L2 (the Calendar goes wide)

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-11-07 · **Updated:** 2026-11-07
**Branch:** `claude/ipad-landscape-l2-calendar-46358d` (from `origin/main` at `174f74d`)
**Plan:** `.avengers/plans/ipad-landscape-v1.md`, step L2 (Calendar section; decisions 215 to 224)

Numbering: Bryce asked for "mission 45", but `mission-45-assistant-cookbooks.md`
already holds 45, so this is 46 (Fury, 2026-11-07, said in chat).

## Brief

- **Goal:** the Calendar page uses the full width of the kitchen iPad in
  landscape, per the plan: Schedule gets a tappable mini month beside the
  list; Month, Week, 3 Day and Day columns widen and their text becomes
  readable; Year shows 4 mini months across.
- **Done means:** at 1180x820 every Calendar view fills the width
  (Schedule: mini month about 440px on the left, list on the right; Month
  7 columns about 160px with readable chip titles; Week 7 columns about
  157px with 12px titles; Year 4 across). At 820x1180 and with the
  Sidebar or Rail at 1180 the views fit the room left. At 375 nothing
  changes. Every sheet still opens over the whole screen. The Gauntlet is
  green; PR merges; production shows it.
- **Out of scope:** the event and task forms (L6), the Calendar dashboard
  widget (W2), drag to reschedule (CD1), anything on other pages.

## Bryce's decisions

- From the plan (approved 2026-11-07): 215 covers the Calendar section
  and the "Calendar, Schedule" board.
- Hill is on break (Bryce, 2026-11-07): design calls go to Bryce with a
  mock. Open questions on the canvas boards "L2 Calendar: Month, wide"
  and "L2 Calendar: Schedule mini month" (posted 2026-11-07).

## Fury's structural calls

- `data-page-width="wide"` goes on the page root in `calendar/page.tsx`
  and `calendar/loading.tsx` (Banner: neither is a container, and every
  sheet renders inside `CalendarViews`, so the containers go lower down).
- Containers wrap only columns: the Year grid, each timeline day column
  (for its own text size), the Month grid, the Schedule two-panel row.
  Never the `CalendarViews` root, which holds every sheet.
- Timeline text size switches by the column's own width (a container on
  each `TimelineDayColumn`), not by how many columns there are, so a
  157px Week column reads like a 3 Day one and a 44px phone column stays
  as today.

## Danger register

From AGENTS.md, absolute for every agent:
- Local dev uses the Neon `dev` branch (`.env` is a symlink to the main
  checkout's; its live line is the dev endpoint, checked 2026-11-07). A
  `DATABASE_URL` whose host is not the dev endpoint: stop and say so. No
  agent edits `.env`.
- `npm run db:seed` and `npm run db:reset` are forbidden. No clean or
  reset script for `User`. No migration in this mission.
- The dev branch holds real family data: private.
- Never `git add -A` / `git add .`; stage by explicit path;
  `git show --stat HEAD` after each commit.
- Direct pushes to `main` are blocked; branch, PR, Gauntlet green, merge.

## Gauntlet

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always).
- Strange: every Calendar view changes visibly. Sizes: 1180x820,
  820x1180, 375, and 1180 with Sidebar and with Rail (Bryce).
- Captain: Bryce asked; the Schedule mini month is a new component and
  ScheduleView (532 lines) and CalendarViews (501) are near the hard cap.
- Banner: one brief (2026-11-07), facts used below.

## Contracts

### C1 - the page opts in; Week, 3 Day, Day and Year use the width
- **Status:** DONE (Stark: Gauntlet green, 1252 tests, UTC 1245 pass and 7 skipped, build exit 0; committed as C1; gates run after C2 and C3)
- **Boundaries:** may touch: `src/app/(app)/calendar/page.tsx`,
  `src/app/(app)/calendar/loading.tsx`, `src/components/YearView.tsx`,
  `src/components/TimelineDayColumn.tsx` · must not touch:
  `src/components/CalendarViews.tsx`, `src/components/ScheduleView.tsx`,
  `src/components/MonthGrid.tsx`, `src/components/MonthCell.tsx`,
  `src/lib/monthLayout.ts`, `src/components/TimelineGrid.tsx`,
  `src/components/CalendarHeader.tsx`, `src/components/AppChrome.tsx`,
  every sheet component, `prisma/`, `package.json`, `DESIGN.md`,
  `STRUCTURE.md`, `CLAUDE.md`, `.env`.
- **Spec:**
  1. `page.tsx`: the root `<div className="py-2 ...">` gains
     `data-page-width="wide"`. Keep the "py-2 is load-bearing" comment;
     add one line saying the attribute lifts the 768px cap (STRUCTURE.md
     "Wide pages", mission-46).
  2. `loading.tsx`: the same attribute on its root, so the skeleton is
     wide from the first paint. `YearGridSkeleton` matches the real Year
     grid's classes (below), inside the same `@container` wrapper.
  3. `YearView.tsx`: wrap the grid in `<div className="@container">`;
     the grid becomes `grid grid-cols-2 gap-3 @min-[40rem]:grid-cols-3
     @min-[60rem]:grid-cols-4`. (At 1180 the container is about 1148px:
     4 across. Sidebar about 892px and 820 upright about 788px: 3. Phone:
     2.) Update the comment that names `grid-cols-2`.
  4. `TimelineDayColumn.tsx`: the column's root (`relative border-l
     border-line`, around line 96) also gets `@container`. When `compact`
     is true, the title is `text-[10px] @min-[8rem]:text-xs` (today it is
     always 10px), and the time-range line, which today renders only when
     `!compact`, also renders for compact columns from an 8rem (128px)
     column width (`hidden @min-[8rem]:block` on that span when compact,
     under the same height gate). The location line stays Day only.
     Rewrite the "Day view only (D5)" comment to say the rule is now the
     column's own width: phone 3 Day and Week columns (about 44 to 100px)
     keep today's look, and a wide Week column (about 157px) reads like
     Day. Do not change `compact`'s definition in `TimelineGrid.tsx`.
  - No em or en dashes in anything written. Report total line counts of
    every touched file. Add no package.
- **Verification:** the whole Gauntlet passes. A dev server may be
  running on port 3000; do not start or stop one.
- **Evidence required:** each Gauntlet command's tail; `git diff --stat`;
  the exact new class strings; line counts.
- **Done criteria:** Strange sees Week at 1180 with 12px titles and time
  lines in 157px columns, phone Week unchanged, Year 4/3/2 across at the
  sizes above, skeleton wide.

### C2 - Month chips readable on wide (decision 225)
- **Status:** DISPATCHED (parallel with C3; boundaries disjoint)
- **Boundaries:** may touch: `src/components/MonthGrid.tsx`,
  `src/components/MonthCell.tsx`, `src/lib/monthLayout.ts`,
  `src/lib/monthLayout.test.ts`, `src/components/MonthGridSkeletonRows.tsx`
  · must not touch: everything in C3's may-touch list,
  `src/app/(app)/calendar/*`, `src/components/YearView.tsx`,
  `src/components/TimelineDayColumn.tsx`, `src/components/MonthChips.tsx`,
  every sheet, `prisma/`, `package.json`, `DESIGN.md`, `STRUCTURE.md`,
  `CLAUDE.md`, `.env`.
- **Spec:**
  1. The Month grid (the rows, not the sheets; MonthGrid renders none)
     sits inside one `@container` wrapper. "Wide" means a container of at
     least 48rem (768px: 820 upright, 1180 with or without the Sidebar).
  2. Wide: up to **4** chips a day, each with a **12px** title
     (`text-xs`), about 18px tall, then "+N more" in 12px. Below 48rem:
     exactly today's look (3 lanes, 9px, 16px tall, today's "+N more").
  3. Pure CSS, no measuring. `assignLanes` already tracks occupancy of
     hidden lanes, so lane numbers do not depend on the cap (prove it,
     below). Lay the month out once with a cap of 4; render the fourth
     lane `hidden @min-[48rem]:block` (its blank spacer too); render two
     "+N more" spans, the phone one (`@min-[48rem]:hidden`) with the
     3-lane count and the wide one (`hidden @min-[48rem]:inline`) with
     the 4-lane count, each only when its count is above 0. The phone
     count is the 4-lane overflow plus the lane-3 spans covering that
     day; derive it with one exported pure helper in `monthLayout.ts`,
     not inline arithmetic. Keep the "render lanes up to the last filled
     one" rule correct for both widths (a trailing lane-3 slot must not
     leave a 16px hole on the phone).
  4. `VISIBLE_LANES` is defined twice (`MonthGrid.tsx:65`,
     `monthLayout.ts:37`). Make `monthLayout.ts` the one home: export
     the phone and wide lane counts there and import them in MonthGrid.
  5. Tests in `monthLayout.test.ts`: lanes 0 to 2 from a cap of 4 equal
     a cap of 3 for a busy month fixture; the phone overflow helper
     equals `assignLanes(..., 3).overflowByDay` for that fixture; a day
     with five events shows "+1 more" wide and "+2 more" on the phone.
  6. `MonthGridSkeletonRows.tsx`: only if it hardcodes the lane count or
     chip height, match it; otherwise leave it.
  - MonthCell.tsx is at 350 lines: keep it at or under 380 by trimming
    stale comment text if needed. No em or en dashes. Add no package.
- **Verification:** the whole Gauntlet passes. Do not start or stop a
  dev server.
- **Evidence required:** Gauntlet tails (test counts); `git diff --stat`;
  the new class strings; the new tests' names; line counts.
- **Done criteria:** Strange sees 4 readable chips a day and correct
  "+N more" at 1180, 820 and Sidebar; 375 identical to `main`.

### C3 - Schedule mini month (decisions 226 to 228, the "Calendar, Schedule" board)
- **Status:** DISPATCHED (parallel with C2; boundaries disjoint)
- **Boundaries:** may touch: `src/components/ScheduleView.tsx`,
  new `src/components/ScheduleMiniMonth.tsx`,
  new `src/lib/useScheduleDayInView.ts`,
  new `src/lib/useScheduleDayInView.test.ts`,
  `src/components/CalendarViews.tsx` (prop wiring only, net +15 lines at
  most) · must not touch: everything in C2's may-touch list (it may
  import `monthGridDays` and `isTodayCell` from `monthLayout.ts`, not
  edit it), `src/components/CalendarHeader.tsx`,
  `src/lib/useScheduleMonthTitle.ts`, `src/lib/useScheduleWindow.ts`,
  `src/components/CalendarSheets.tsx`, `src/components/MonthJumpSheet.tsx`,
  `src/app/(app)/calendar/*`, `prisma/`, `package.json`, `DESIGN.md`,
  `STRUCTURE.md`, `CLAUDE.md`, `.env`.
- **Spec:**
  1. Layout: ScheduleView's list (not its two sheets, which stay outside)
     sits inside a `@container` wrapper holding a grid: one column below
     50rem (exactly today: no mini month rendered or hidden by
     `hidden`, list unchanged); from 50rem a `20rem` mini-month column
     plus the list; from 64rem the mini month is `27.5rem` (440px, the
     mock). Gap 20px. At 1180 (1148 container): 440 + list. Sidebar at
     1180 (about 892): 320 + list. 820 upright (788): list only, as
     today. The mini month is `sticky`, top aligned just under the
     pinned Schedule header bar (use `SCHEDULE_HEADER_BAR_HEIGHT_PX`
     and `useHamburgerRowHeight()` the way ScheduleView already places
     things; `align-self: start`).
  2. `ScheduleMiniMonth.tsx` (presentational, the mock's look: white
     card, 16px radius, month title with 44px previous and next arrows,
     S M T W T F S, a 7-column day grid with 44px or taller tap
     targets; days outside the shown month are blank, not dimmed
     numbers, as the mock). Today: filled accent circle. The day in view
     (not today): a 2px accent ring (226). Tapping a day calls
     `onPickDay(day)`. No dots (228). Real `<button>`s with
     `aria-label`s ("Jump to Friday, November 6"), `aria-current="date"`
     on today. Colors from the existing tokens (`bg-surface`,
     `border-line`, `bg-accent`, `text-accent-fg`, `text-muted`), Lucide
     `ChevronLeft`/`ChevronRight`.
  3. Shown month (227): follows the day in view's month; the arrows move
     a browse offset that resets to 0 whenever the day in view moves to
     a different month. Arrows never scroll the list.
  4. `useScheduleDayInView.ts`: export a pure
     `topmostVisibleDay(dayTops: {day: number; top: number | null}[],
     revealLineY: number): number | null` (the last day whose top is at
     or above the reveal line; the first loaded day if none is; mirror
     `topmostClearedMonth`'s rule and comments) with tests in the new
     test file (add no new test directory; `src/lib/*.test.ts` is in
     the glob already), and a hook that reads ScheduleView's `dayRefs`
     on scroll and resize (rAF-throttled, passive listener) only while
     the mini month is shown (a `matchMedia`-free check: pass `enabled`
     from whether the mini-month element has a non-zero width, read via
     a ref, or simply always run; say which you chose and why).
  5. Jumping: add `scrollToDay(day: Date): boolean` to
     `ScheduleViewHandle` (scrolls the window so that day's row sits
     just under the header bar, same offset `scrollToToday` uses; false
     when the row is not loaded). The mini month's `onPickDay` tries
     `scrollToDay` first; when it returns false, it falls back to the
     same `jumpToDay` CalendarViews already hands MonthJumpSheet (wire
     it to ScheduleView as a prop; that is CalendarViews' only change).
  6. Size: ScheduleView.tsx is 532 lines (hard cap 650). Its net growth
     must stay at or under 45 lines; the logic goes in the hook and the
     component. Report total and code lines for every touched file.
  - No em or en dashes anywhere. Add no package.
- **Verification:** the whole Gauntlet passes (`npm test` count rises by
  the new tests). Do not start or stop a dev server.
- **Evidence required:** Gauntlet tails; `git diff --stat`; the grid and
  sticky class strings; new test names; line counts.
- **Done criteria:** Strange at 1180: mini month 440px left, list right;
  tapping the 18th scrolls the list there and rings the 18th; scrolling
  into the next month flips the mini month; arrows browse without
  scrolling; tapping a day beyond the loaded window navigates there;
  Sidebar shows a 320px mini month; 820 upright and 375 unchanged;
  event and task sheets still open full screen.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-11-07: mission opened. Mission 44 marked DELIVERED. Banner brief
  in. Two mock boards posted for Bryce. C1 dispatched (needs no design
  call: the plan already settles it).
- 2026-11-07: C1 DONE and committed. Waiting on Bryce for the two
  canvas boards before C2 and C3.
- 2026-11-07: Bryce: "Yes, as recommended" (decisions 225 to 228 in the
  plan). C2 and C3 dispatched in parallel.
