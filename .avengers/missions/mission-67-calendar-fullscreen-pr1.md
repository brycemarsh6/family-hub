# Mission: Calendar full screen PR 1, the full screen layout

**Project:** family-hub (Marshee)
**Status:** AT-THE-GATES
**Started:** 2026-11-10 · **Updated:** 2026-11-10

## Brief

- **Goal:** PR 1 of `.avengers/plans/calendar-fullscreen-v1.md`. The
  Calendar stops looking like a window inside the page and becomes the
  page: edge to edge, one top bar, no date bar or arrows, "November" at the
  top left, a round + at the bottom right.
- **Done means:**
  1. Timeline (Day, 3 Day, Week) and Month run to both screen edges at
     every width: no rounded box, no outer border on the left or right, no
     side margin. Lines between hours and between days stay.
  2. `CalendarHeader` is one row: menu, title with a small down arrow, then
     Today, View, Refresh on the right. No < > arrows; `showArrows`,
     `prevLabel`, `nextLabel` are gone from `VIEW_CONFIG` with no reader left.
  3. The title is a pure, tested function: the first visible day's month,
     the year added only when it is not the current Denver year, Year view
     shows the year. Schedule keeps its pinned bar and scroll-driven month
     title. Tapping the title still opens `MonthJumpSheet`.
  4. From iPad width a segmented row of the six `VIEW_LABELS` replaces the
     View circle, decided by a container query in rem on the bar's own
     width, so a bigger Text size falls back to the circle by itself.
  5. Day view: weekday and date sit in the gutter corner of the sticky
     header, the all-day strip beside it. 3 Day and Week keep labels over
     the columns. `GUTTER_WIDTH_PX` stays one constant.
  6. A round accent + floats bottom right on the Calendar at every width,
     for logins that can add (`canManage`), and opens the existing Add
     sheet. Other pages keep theirs where it is.
  7. `calendar/loading.tsx` matches the new shape.
  8. `TimelineGrid.tsx` does not grow; `CalendarHeader.tsx` lands under the
     350 line soft cap.
  9. DESIGN.md and STRUCTURE.md changes (drafted by Strange and Captain,
     quoted to Bryce) land in this PR.
  10. Gauntlet green, gates pass, PR merged, production deploy checked,
      `git log origin/main..HEAD` empty, phone test in `.avengers/status.md`.
- **Out of scope:** the + bubbles (PR 2), the sliding swipe and the hours
  staying put on a page turn (PR 3), drag (PR 4), repeating events (PR 5),
  the month dropdown and iPad side panel (PR 6), the all-day "+N" row and
  zooming text (PR 7), task Undo (PR 8), Search and removing Refresh (PR 9).

## Danger register

From AGENTS.md, absolute for every agent:
- Never `npm run db:seed` or `npm run db:reset`. Never a clean or reset
  script for `User`. Migrations additive only (this PR has none).
- Secrets only in `.env` and Vercel. A worktree has no `.env`.
- Never `git add -A` or `git add .`; stage by path, then `git show --stat HEAD`.
- Direct pushes to `main` are blocked: branch, PR, Gauntlet green, merge.
  Merging deploys to the family.

## Gauntlet

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always).
- Strange: everything here is visible.
- Captain: new files, a split, a STRUCTURE.md "Wide pages" mechanism.
- Banner: out (plan says Banner only on the slide, drag, repeating and
  search PRs; Captain's pre-build ruling covers the reading).

## Mock

`.avengers/mocks/calendar-pr1-topbar-mock.html` (real sizes: iPhone 393
Day and 3 Day, iPad 1024 Week with the row of six, iPad 768 at Largest
text falling back to the View circle). Sent to Bryce 2026-11-10.

## Captain's pre-build ruling (2026-11-10, summary)

- **Bleed:** a negative margin on the calendar's own bleeding roots through
  a new constant `PAGE_BLEED_CLASSES = "-mx-4"` in `src/lib/gridClasses.ts`
  (shared by component and skeleton, `docs/structure/layout.md` rule). No
  new page marker. `<main>` is uncapped from `md` on wide pages and a phone
  is under the 768px cap, so `-mx-4` reaches the edge at every width.
- **Title:** `formatMonthHeading(day, today)` in `src/lib/mealPlanDates.ts`
  (the one home for month names). `VIEW_CONFIG.title` becomes
  `(anchor, today) => string`: Week uses `sundayOf(anchor)`, Day and 3 Day
  `anchor`, Month `anchor` (never `days(anchor)[0]`), Year stays the year.
- **View row:** new `src/components/CalendarViewRow.tsx`, reads
  `CALENDAR_VIEW_OPTIONS`, shown by `@container` on the header row with a
  rem threshold (precedent `FORM_EYEBROW_CLASSES` in `gridClasses.ts`).
- **Day label:** extract the weekday row from `TimelineGrid.tsx` into new
  `src/components/TimelineDayHeader.tsx`; Day view passes the label into
  `TimelineAllDayStrip` as a `corner` prop (chosen by the existing
  one-column test, not by passing the view).
- **+:** `FloatingAddButton` gains `placement?: "auto" | "right"`; mounted
  in `CalendarViews` with `canManage`.
- **Fury's calls on Captain's open notes** (told to Bryce): the + keeps
  the existing Add sheet's date (the day being viewed, `addSheetDateParam`),
  which is "the existing Add sheet" the plan names; Schedule's scrolling
  title keeps its year as now; `MonthChips` above Month stays in PR 1 (PR 6
  moves it under the title tap, decision D).

## Contracts

A and B run in parallel (disjoint files). C runs after both. Rulebook text
(`docs/structure/layout.md`, DESIGN.md) is written by Fury from Captain's
and Strange's drafts, not by a builder.

Shared rules for every contract: sizes in rem (mission 58), touch only, no
new px text; stage by explicit path, never `git add -A`; do not commit
(Fury commits); a worktree has no `.env`, so nothing touches the database.
`npm run build` is run by Fury after A and B, not by the builders (they
share one worktree).

### C1 - (A) One-row top bar, title function, iPad view row, the +
- **Status:** DONE (Stark report 2026-11-10: CalendarHeader 404 to 179, CalendarViews 507 to 502, calendarViewConfig 391 to 318; new CalendarViewRow 41; threshold N = 48rem from a headless width measurement (row worst case about 47.3rem), so iPad 768 portrait falls back to the circle even at Normal; title `text-lg`, `text-xl` from a 30rem bar so "January 2027" fits at 393; `SCHEDULE_HEADER_BAR_HEIGHT_REM` 8.125 to 5.375 from classes, not measured live; row calls a new `onSelectView={setView}` because `onPickView` only opens the sheet; tests 1819 pass both runs)
- **Boundaries:** may touch: `src/lib/calendarViewConfig.ts`,
  `src/lib/calendarViewConfig.test.ts`, `src/lib/mealPlanDates.ts`,
  `src/lib/mealPlanDates.test.ts`, `src/lib/useCalendarPeriod.ts` (comment
  only), `src/components/CalendarHeader.tsx`, new
  `src/components/CalendarViewRow.tsx`, `src/components/CalendarViews.tsx`,
  `src/components/FloatingAddButton.tsx`, `src/lib/gridClasses.ts` (only to
  add a container-row class constant if needed; contract B adds
  `PAGE_BLEED_CLASSES`, so append, never rewrite). · must not touch:
  `src/components/TimelineGrid.tsx`, `src/components/TimelineAllDayStrip.tsx`,
  `src/components/MonthGrid.tsx`, `src/app/(app)/calendar/**`,
  `src/components/ScheduleView.tsx`, `src/components/MonthJumpSheet.tsx`,
  `src/components/CalendarPullButton.tsx`, `prisma/**`, any DESIGN.md or
  STRUCTURE.md or `docs/**`.
- **Work:**
  1. `formatMonthHeading(day, today)` in `mealPlanDates.ts`: full month
     name of `day`; add " YYYY" only when `day`'s year differs from
     `today`'s year. Tests: same year, previous year, next year, Dec 31 /
     Jan 1 edges.
  2. `VIEW_CONFIG.title` becomes `(anchor, today) => string`: Day and
     3 Day use `anchor`, Week `sundayOf(anchor)` (first visible day),
     Month `anchor`, Year the year string, Schedule unchanged in meaning
     (its pinned bar keeps its own scroll-driven title). Rewrite the title
     asserts in `calendarViewConfig.test.ts`, including a Week that spans
     two months (shows the first day's month) and a year-boundary week.
  3. Remove `showArrows`, `prevLabel`, `nextLabel` from `ViewConfig` and
     every entry, delete their test, and fix every reader Captain listed
     (`CalendarHeader.tsx`, `CalendarViews.tsx` header props,
     `useCalendarPeriod.ts` comment). `grep -rn "showArrows\|prevLabel\|nextLabel" src`
     must return nothing.
  4. `CalendarHeader.tsx` becomes ONE row beside the fixed hamburger: the
     title (with a small `ChevronDown`, still opening `MonthJumpSheet` as
     now) at the left, then at the right Today, View (picker circle), and
     the Refresh circle (`CalendarPullButton`, unchanged). The arrows and
     the Add circle are gone, with the props only they used (`onPrev`,
     `onNext`, `prevDisabled`, `nextDisabled`, `onAdd`, and `canManage` if
     nothing else reads it). The relink banner stays. Re-derive
     `SCHEDULE_HEADER_BAR_HEIGHT_REM` for the new bar (show the sum in its
     comment, all rem). The title must not clip: it may shrink and
     truncate only as a last resort; "September" and "January 2027" must
     fit at 393px wide at Largest text (report how).
  5. New `CalendarViewRow.tsx`: a segmented row of the six views from
     `CALENDAR_VIEW_OPTIONS` (no second list of names), the current one
     selected, each segment at least 2.75rem tall, calling the same
     `onPickView`. The header row is a `@container`; the row shows only
     from a rem threshold (`@min-[Nrem]:flex`) and the picker circle hides
     at the same threshold, so a bigger Text size falls back by itself.
     Pick N from the row's real natural width so that iPad landscape 1024
     at Normal text shows the row and a 393 phone never does; report N and
     the measurement behind it.
  6. `FloatingAddButton` gains `placement?: "auto" | "right"` (default
     `"auto"`, unchanged behaviour). `"right"` sits bottom right at every
     width. `CalendarViews` mounts it with `placement="right"` only when
     `canManage`, opening the existing Add sheet (`setAddingEvent(true)`),
     on all six views. Label "Add".
  7. `CalendarViews.tsx` must not grow (now 507 lines).
- **Verification:** `npx tsc --noEmit` (errors only in contract B's files
  may appear while B is in flight; list them separately), `npm run lint`,
  `npm test`, and the AGENTS.md `TZ=UTC node --import tsx --test ...` line;
  all pass. `wc -l` of every touched file. The grep in item 3.
- **Evidence required:** command output for each check; `wc -l` before and
  after for `CalendarHeader.tsx`, `CalendarViews.tsx`; the new test names;
  N and how it was found; the new `SCHEDULE_HEADER_BAR_HEIGHT_REM` sum.
- **Done criteria:** `CalendarHeader.tsx` under 350 lines;
  `CalendarViews.tsx` at or under 507; grep empty; tests green in both
  timezones; no file outside the may-touch list in `git status`.

### C2 - (B) Edge to edge grid and the Day label in the corner
- **Status:** DONE (Stark report 2026-11-10: TimelineGrid 527 to 471, strip 398 to 417, new TimelineDayHeader 128; roots `overflow-hidden -mx-4` and `@container -mx-4`; Day corner via `compact` false; Month had no box, lines or own bottom padding, `<main>`'s 6rem bottom padding is its clearance; lint clean, own tests green, not browser-checked)
- **Boundaries:** may touch: `src/components/TimelineGrid.tsx`, new
  `src/components/TimelineDayHeader.tsx`,
  `src/components/TimelineAllDayStrip.tsx`, `src/components/MonthGrid.tsx`,
  `src/lib/gridClasses.ts` (add `PAGE_BLEED_CLASSES` only; contract A may
  append another constant, so add, never rewrite). · must not touch:
  `src/components/CalendarHeader.tsx`, `src/components/CalendarViews.tsx`,
  `src/lib/calendarViewConfig.ts`, `src/app/(app)/calendar/**`,
  `src/lib/timelineZoom.ts`, `src/lib/useTimelineZoom.ts`, `prisma/**`, any
  DESIGN.md or STRUCTURE.md or `docs/**`.
- **Work:**
  1. `PAGE_BLEED_CLASSES = "-mx-4"` in `gridClasses.ts` with a comment
     saying it cancels `<main>`'s `px-4` (`AppChrome.tsx`) and the two
     change together.
  2. `TimelineGrid`'s root: drop `rounded-t-xl border border-b-0
     border-line` (the box), add `PAGE_BLEED_CLASSES`. Lines between hours
     and between day columns stay; no line on the outer left or right
     (the first column's left line next to the hour gutter stays, it is
     inside the grid). Same for `MonthGrid`'s root: bleed, no rounded box,
     no outer left or right line, inner lines kept. Keep Month's bottom
     padding so its last row can scroll clear of a bottom-right 3.5rem +
     (report the padding value).
  3. Extract the weekday label row (today `TimelineGrid.tsx` ~355-433,
     including the not-loaded label) into new `TimelineDayHeader.tsx`,
     exporting `TimelineDayLabel` (one day) and the row used by 3 Day and
     Week. Behaviour unchanged for 3 Day and Week.
  4. Day view (one column, the existing `compact`/column-count test in
     `TimelineGrid`, do not pass the view in): no row above the column;
     the `TimelineDayLabel` goes into the gutter corner of the sticky
     header through a new `corner?: ReactNode` prop on
     `TimelineAllDayStrip`, drawn in its gutter cell spanning all its rows,
     with the all-day lanes beside it. The strip renders when it has lanes
     OR a corner. Its height must fit the label (min height) without
     clipping at Largest text.
  5. `GUTTER_WIDTH_PX` stays one constant. The mission 65 zoom must still
     work: the anchor maths reads the sticky header's height and a
     ResizeObserver re-measures the floor; do not break either (do not
     touch the zoom files).
  6. `TimelineGrid.tsx` must shrink (now 527 lines).
- **Verification:** `npx tsc --noEmit` (errors only in contract A's files
  may appear while A is in flight; list them separately), `npm run lint`,
  `npm test`, the AGENTS.md `TZ=UTC` line; all pass. `wc -l` before and
  after of every touched file. `grep -n "rounded-t-xl" src/components/TimelineGrid.tsx src/components/MonthGrid.tsx`
  returns nothing.
- **Evidence required:** command output; before/after line counts; the
  class lists of both roots after the change; how the Day corner chooses
  itself.
- **Done criteria:** `TimelineGrid.tsx` under 527; `TimelineAllDayStrip.tsx`
  not past the 650 hard cap; tests green in both timezones; no file
  outside the may-touch list in `git status`.

### C3 - (C) Loading frame matches the new shape
- **Status:** DONE (Stark report 2026-11-10: `TopBarSkeleton` shares the C1 constants; header offset 143px to `calc(100dvh - 5.125rem - env(safe-area-inset-top))` from classes; Day corner mark; Month rows wrapped in the bleed; no + in the skeleton because the role is unknown there; Refresh always drawn; tsc, lint, 1819 tests, build green)
- **Boundaries:** may touch: `src/app/(app)/calendar/loading.tsx`,
  `src/app/(app)/calendar/page.tsx` (comments only). · must not touch:
  everything else.
- **Work:** the skeleton uses the one-row bar (title left, three circles
  right, the row of six at the same container threshold as C1), the
  bleeding grid with `PAGE_BLEED_CLASSES` and no box, the Day corner shape,
  and re-measures the header height constant (the `143` and its comment in
  `page.tsx`). No layout jump between skeleton and page.
- **Verification:** `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Evidence required:** output; the re-measured header height and how.
- **Done criteria:** green; Strange's capture shows no jump.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-11-10: branch `claude/calendar-fullscreen-pr1` cut from
  `origin/main` (`ea6cbd4`). Mission number 67 (last on `origin/main` was
  66). PR 1 mock drawn and sent to Bryce. Captain dispatched for the
  pre-build structure ruling (read-only). No builder dispatched.
- 2026-11-10: Bryce OK'd the mock ("Yes, build it"). Contracts next, from
  Captain's ruling.
- 2026-11-10: preflight C1 and C2: 0 hard failures. REVIEW settled by grep:
  `FloatingAddButton` and `placement` in AppChrome, layout, CalendarHeader
  and CalendarViews are comments only (no second + mounted anywhere);
  `TimelineDayColumn.tsx` mentions the strip and gutter in comments only;
  C2's zoom import is read, not changed. Dispatched C1 and C2 in parallel
  at HEAD `ea6cbd4`.

## Delivery

- **Shipped:**
- **Shipped check:**
- **Deliberate leftovers:**
