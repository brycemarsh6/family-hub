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

### C4 - (fix batch 1) Gate pass 1 fixes
- **Status:** DONE (Stark 2026-11-10: Schedule pinned title via `formatMonthHeading` with the old text while `today` is null; row `text-muted-strong`; strip grid `items-start` when `corner` is set, covering event, task and habit bars; three comments; tsc, lint, 1819 tests, TZ=UTC, build green before the follow-up, tsc, lint, tests after)
- **Boundaries:** may touch: `src/lib/useScheduleMonthTitle.ts`,
  `src/components/CalendarViewRow.tsx`, `src/components/TimelineAllDayStrip.tsx`,
  `src/components/MonthChips.tsx` (comment only),
  `src/components/TimelineDayHeader.tsx` (comment only),
  `src/components/ScheduleView.tsx` (comment only). · must not touch:
  everything else, including DESIGN.md, STRUCTURE.md, `docs/**` (Fury's).
- **Work:**
  1. Strange B1: Schedule's pinned month title (the portaled text built in
     `useScheduleMonthTitle.ts`, today `formatMonthTitle(visibleMonthAnchor)`)
     uses `formatMonthHeading(visibleMonthAnchor, today)` so this year's
     months drop the year, like every other view (Bryce's decision 3). Keep
     the per-month `sr-only` h2 in `ScheduleView.tsx` as it is. If `today`
     can be null there, keep the old text until it resolves.
  2. Strange B2: `CalendarViewRow` unselected segments use
     `text-muted-strong` instead of `text-muted` (4.33:1 to 4.74:1 on
     `bg-surface-2`). Selected pill unchanged.
  3. Strange and Vision NOTE (approved mock shows a slim bar): in Day view
     with the corner, all-day bars keep their 24px height and sit at the
     top of their row instead of stretching to the corner's height. 3 Day
     and Week unchanged.
  4. Comments: `MonthChips.tsx:46` drop the clause naming the deleted
     `formatThreeDayRange`; `TimelineDayHeader.tsx` "this file's own worded
     banner" becomes "TimelineGrid.tsx's worded banner and DaySection.tsx's
     `NotLoadedCard`"; `ScheduleView.tsx` ~209 bar height comment becomes
     86px at 16 and 129px at Largest (5.375rem).
- **Verification:** `npx tsc --noEmit`, `npm run lint`, `npm test`, the
  AGENTS.md `TZ=UTC` line, `npm run build`; all green. `git diff --stat`
  shows only the may-touch files (plus Fury's uncommitted DESIGN.md,
  STRUCTURE.md, layout.md, mission file and calendar-v2.md).
- **Evidence required:** the diff of items 1 to 3; command output.
- **Done criteria:** green; Strange pass 2 measures the Schedule title,
  the row contrast and the Day bar height.

### C5 - (fix batch 2) Gate pass 2 fixes
- **Status:** DONE (Stark 2026-11-10: short month plus year via `MONTH_NAMES`; tests updated; Day corner bars `h-6`; tsc, lint, 1819 tests, TZ=UTC, build green)
- **Boundaries:** may touch: `src/lib/mealPlanDates.ts`,
  `src/lib/mealPlanDates.test.ts`, `src/lib/calendarViewConfig.test.ts`,
  `src/components/CalendarHeader.tsx` (comment only),
  `src/components/TimelineAllDayStrip.tsx`. · must not touch: everything
  else, including DESIGN.md, `docs/**` and this mission file (Fury's).
- **Work:**
  1. Strange pass 2 BLOCKER, Bryce's call 2026-11-10 ("Jan 2027" when the
     year shows): `formatMonthHeading(day, today)` returns the full month
     name in today's year ("November") and the short name plus year
     otherwise ("Jan 2027"), using the existing `MONTH_NAMES`. It is only
     used by the Calendar top bar (VIEW_CONFIG titles and
     `useScheduleMonthTitle.ts`), so change it in place and update its doc
     comment. Leave `formatMonthTitle` and the sr-only h2s alone (screen
     readers keep the full name). Update the tests that expect
     "January 2027", "September 2025", "December 2026" for the new form.
  2. `CalendarHeader.tsx` title comment: "January 2027" becomes "Jan 2027"
     and say why (a long month plus a year did not fit beside three circles
     at 393px).
  3. Strange NOTE: in Day view with the corner, bordered all-day bars are
     26px; make them 24px (`h-6`, or equivalent) when `corner` is set, so
     they match Week. Bars without the corner unchanged.
- **Verification:** `npx tsc --noEmit`, `npm run lint`, `npm test`, the
  AGENTS.md `TZ=UTC` line, `npm run build`; all green. `git diff --stat`
  shows only the may-touch files (plus Fury's DESIGN.md and mission file).
- **Evidence required:** the diff; command output; a grep showing no
  other caller of `formatMonthHeading`.
- **Done criteria:** green; Strange pass 3 measures "Sep 2027" fitting at
  393 with Refresh on every view, and the Day bar height.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 3 | Strange (HEAD 3ba8609) | PASS | none | Pass 2 blocker cleared: at 393 with Refresh "Jan 2027" 77/77, "Feb 2027" 78/78, "Sep 2027" 80/80 on Day, 3 Day, Week, Month and Schedule; "November", "September" in full. Day corner event bar 24px; Week, 3 Day 24px. + 56px, 16px clear right and bottom at 393 and 1024; grids 0px edge gap. Notes: Day corner habit pills still 26px (`HabitDayPill.tsx`, follow-up); Schedule 2027 pinned title measured in place, not by scrolling (no 2027 dev data); pre-load frame marks Week (older) |
| 3 | Vision (HEAD 3ba8609) | PASS | none | Gauntlet re-run: 1819 Denver, 1812 pass plus 7 DST skips in UTC (same 7 on main); build exit 0; boundaries clean; year-boundary cases hold. Notes: DESIGN.md bottom-left sentence lost the non-wide-from-md case (Fury fixed); "always fits" rests on Strange's measure (done); Schedule null-today frame still uses `formatMonthTitle` briefly |
| 2 | Strange (HEAD 229d626) | BLOCK | Next-year titles truncate at 393 for logins that see Refresh ("January 20..." on Schedule; "February 2027", "September 2027" on every view): the year is what gets cut. A wording call, asked of Bryce 2026-11-10 (recommend "Jan 2027" when the year shows) | B2 cleared (4.74:1 light, 6.51:1 dark); B3 cleared; this year's months fit with Refresh. Notes: Day all-day bars 26px not 24px (border; `h-6` fixes); corner label right; pre-load frame marks Week (older); edge to edge still 0px |
| 2 | Vision (HEAD 229d626) | PASS | none | Gauntlet green (1819 both zones, build exit 0); every rulebook claim checked true against code; Schedule title correct at null today and year boundary. Notes: first frame of a cold Schedule load shows "November 2026" then "November"; DESIGN.md "36px on an iPad at Largest" was computed, not measured; bottom-left sentence could read "every other page" |
| 1 | Strange (HEAD d2b19d7) | BLOCK | (1) Schedule's "September 2026" truncates at 393 for logins that see Refresh; (2) view row unselected text 4.33:1 in light; (3) `CalendarViewRow` is a second view switcher without a vocabulary entry | Edge to edge 0px on both sides everywhere; title fits without Refresh; row shows at 1024 Normal/Large, falls back at 1024 Larger/Largest and 768; + bottom right on all views, Month last row 32px clear; Schedule flip within 1 to 4px; zoom floor 0px band in 7 iPad states. Notes: skeleton controls slide 52px for logins without Refresh (Fury: accept until PR 9); Month skeleton taller than grid (older); iPad Largest hour labels wrap and touch the edge (older px gutter; PR 7 follow-up); Day single all-day bar stretches (fixed in C4); 768 Normal shows the circle; kid, Tablet and pinned menu not seen |
| 1 | Vision (HEAD d2b19d7) | BLOCK | DESIGN.md lacks the Calendar + exception to "a target must also be unoccluded" and still says the + is bottom-left below `md` (doc only, no code) | Gauntlet all green (1819; build exit 0). Title tests hold in both zones. Notes: Day corner with exactly one all-day lane stretches that pill to about 49px; not-loaded label at Largest may spill past the 48px gutter; stale comments `ScheduleView.tsx:209` (130/195px) and `MonthChips.tsx:46`; skeleton always draws Refresh (jump for logins without a link); skeleton corner 3.25rem vs 48px gutter; Day h2 now reads only the month (plan's intent) |
| 1 | Captain (HEAD d2b19d7) | PASS | none | Stale STRUCTURE.md range-formatter and month-name lines (Fury applied Captain's text); layout.md shared-class list (applied); layout.md points at a DESIGN.md exception that must land in this PR; two stale comments (`MonthChips.tsx:46` names the deleted `formatThreeDayRange`, `TimelineDayHeader.tsx` says "this file's own worded banner") for the fix batch; strip 417 and loading 342 over the soft cap, not split candidates |

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

- 2026-11-10: gate pass 2: Vision PASS, Strange BLOCK on next-year title truncation with Refresh. Asked Bryce: "Jan 2027" or accept the cut until PR 9.
- 2026-11-10: Bryce: "use Jan 2027 when the year shows". C5 written; Fury
  updated DESIGN.md (example, the bottom-left sentence, dropped the
  unmeasured 36px).
- 2026-11-10: gate pass 3: Strange PASS, Vision PASS. Delivery next.

## Delivery

- **Shipped:** C1 to C5 on `claude/calendar-fullscreen-pr1`: one-row top
  bar (month title, Today, View, Refresh), iPad view row from 48rem, the +
  bottom right at every width, edge to edge grids, the Day label in the
  corner, matching loading frame, "Jan 2027" when the year shows. Rulebook
  updates in DESIGN.md, STRUCTURE.md, `docs/structure/layout.md`,
  `.avengers/plans/calendar-v2.md`; phone test in `.avengers/status.md`.
- **Gates:** Captain PASS (pass 1), Vision PASS (pass 3), Strange PASS
  (pass 3).
- **Shipped check:** see the PR and the deploy check in the Handoff log.
- **Deliberate leftovers:** Day corner habit pills 26px (`HabitDayPill.tsx`);
  skeleton controls slide 52px for logins without Refresh (until PR 9);
  iPad portrait shows the View circle; iPad Largest hour labels wrap (PR 7);
  Month skeleton taller than the grid (older); cold Schedule first frame
  shows the full month and year until `today` resolves.
