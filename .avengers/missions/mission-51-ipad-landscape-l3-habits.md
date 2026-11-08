# Mission 51: iPad landscape L3 (Habits & Chores go wide)

**Project:** family-hub (Marshee)
**Status:** EXECUTING (contracts written; Hill's H1 to H4 next, then C1)
**Started:** 2026-11-07 · **Updated:** 2026-11-07
**Branch:** `claude/habits-chores-ipad-landscape-f04eee` (from `origin/main` at `7674730`, after PR #74 merged)
**Plan:** `.avengers/plans/ipad-landscape-v1.md`, step L3 (section "Habits and Chores"; decisions 215 to 223, 230)
**Mocks:** canvas boards "Today" (`project/Today.dc.html`) and "Family" (`project/Family.dc.html`) on https://claude.ai/artifact/XpmoRsLuBuPUdwuRSzK25n

Numbering: 49 (`mission-49-dashboard-widgets-w2-calendar.md`) and 50
(`mission-50-assistant-plans-goals.md`) are taken on `origin/main`; no
branch claims 51 (checked `git branch -r`, 2026-11-07).

## Brief

- **Goal:** Habits & Chores uses the full width of the kitchen iPad, per
  the plan: Mine as time-of-day columns, Whole family fitting everyone,
  Manage two cards side by side, Chore chart as 7 day columns, Report
  Year 4 across by a container rule, Stats in two columns.
- **Done means:** Habits & Chores (Mine, Whole family, Manage, Chore
  chart, Report, Stats) reads well at 1180x820, 820x1180, 375, and 1180
  with the Sidebar and with the Rail. Every sheet still opens over the
  whole screen. Vision, Strange and Captain pass; the Gauntlet is green;
  the PR merges; production shows it.
- **Out of scope:** New and Edit habit forms (L6), checking off a past
  day (decision 222), the habit and chore dashboard widget styles (W3),
  other pages.

## Bryce's decisions

- From the plan (approved 2026-11-07): 215 (direction and mocks), 217
  (Whole family fits everyone at 220px minimum columns), 222 (day arrows
  show past days read-only in the first build), 223 (reference sizes).
- 230 (decided by Hill, mission 46): Captain's A-L2-3 lands here: a
  container class string a skeleton mirrors is exported once from its
  component; the Dashboard 45rem and Year 40/60rem pairs come into line.
- Hill decides for Bryce on design calls (`.claude/agents/hill.md`),
  recorded below as "decided by Hill".

## Banner's brief (2026-11-07, facts for the contracts)

- `/habits` page (`src/app/(app)/habits/page.tsx`, 92 lines): h1 "Habits
  & Chores" with Manage and New pills (`:32-50`), `HabitViewChips`
  (`:52`), family branch `HabitFamilyView` (`:53-58`), Mine branch
  `HabitTodayList` (`:60-72`), Report card at the foot (`:79-89`,
  `md:hidden` in family). No `loading.tsx` under `habits/`.
- Day is always `householdToday` (`page.tsx:17`); no `date` param on any
  habits route. Loaders take `today` and derive every window from it:
  `loadTodayPage` (`habitsRead.ts:138`), `loadFamilyPage`
  (`habitsStatsRead.ts:127`), `loadChoreChart` (`habitsRead.ts:271`). A
  past day view means threading a date through all three plus
  `buildTodayPage`. Writes already accept a past day (7 back,
  `carryOver.ts:64,71-75`); no read renders one.
- Whole family splits on `md:` today: phone cards
  (`HabitFamilyView.tsx:79-104`), iPad strip `HabitFamilyWide.tsx` (82,
  `data-fills-width` at `:39`, strip `:67`) of 330px untinted columns
  (`HabitFamilyWideColumn.tsx:41`). Rows grouped by `groupColumnRows`
  (`src/lib/habitsFamilyColumns.ts`, tested). Avatar colour:
  `User.avatarColor`, `avatarColorHex` (`constants.ts:311-332`).
- `HoursLogSheet` renders inline from both views
  (`HabitFamilyView.tsx:106`, `HabitTodayList.tsx:177`): a container must
  not wrap it (STRUCTURE.md Wide pages rule 1).
- Wide mechanics: `AppChrome.tsx:67,98-99`, `HamburgerButton.tsx:90`
  react to `[data-page-width=wide]`; literal attribute users are the
  dashboard and calendar pages and loadings. No shared helper for the
  container class strings (A-L2-3 is due here).
- `FloatingAddButton.tsx` (36): fixed, bottom-left of a 768px centred
  wrapper by design (`:5-9`, `:20-24`); used by Recipes, Goals, Family.
  Bottom-right on wide pages needs a change to this file.
- Report Year: `ReportYear.tsx:17` `grid-cols-2 sm:grid-cols-3
  lg:grid-cols-4` (screen breakpoints, to become a container rule).
- Stats (`HabitStats.tsx`, 137), Manage (`HabitManager.tsx`, 226),
  Chore chart (`ChoreChart.tsx`, 273) are single column today.
- No component or e2e tests; unit tests via the four-glob `npm test`.
  CI also runs a Los Angeles leg and the record check.
- Sizes: `HabitForm.tsx` 350 (soft cap); lib files over soft cap:
  `habitVocabulary.ts` 395, `habitsStats.ts` 387, `habitsRead.ts` 365,
  `habitsFamily.ts` 360, `habitsToday.ts` 350. Nothing near 650.

## Bryce's decisions in this mission (2026-11-07, numbers 233 to 236)

- **233:** one layout on every size: phones get the same bar (wrapping to
  two rows) and the same Morning / Afternoon / Evening / Anytime grouping;
  chores carry a "Chore" tag (`familyRowTag`). No separate phone layout.
- **234:** Mine's columns use one neutral tint (`bg-surface-2`) with
  `bg-surface` cards; the time icons carry the time of day. No new colours.
- **235:** no per-column toggles on Whole family; the bar's Filter (people,
  time of day, Together only) applies to every column.
- **236:** the Report entry is one 44px bar-chart icon button at the right of
  the bar on both views, hidden on the tablet login. The foot card and the
  family toolbar button go.

Still Hill's (dispatched read-only after approval, recorded "decided by
Hill"): H1 subtitle wording ("Mine · 2 of 7 done · 5 day streak"), H2 how a
past day says it is view only, H3 Filter sheet title and group labels, H4
empty-column wording ("Nothing this afternoon" from the mock vs the existing
`NOTHING_DUE_TODAY`).

## Hill's calls (decided by Hill, 2026-11-07; Bryce may overturn any)

- **H1 (237):** Mine subtitle "Mine · 2 of 7 done" (`doneCountLabel`),
  then " · " and the flame with `streakLabel(choreStreak, "days")` when
  Show streaks is on and the streak is 2+ (flame has `sr-only` "chore
  streak"); "Mine" alone with no live rows; no flame on a past day.
  Whole family: "Whole family" alone.
- **H2 (238):** a past day shows one `text-sm text-muted` line under the
  bar: "Looking back. Past days are view only." Plain markers, no buttons.
- **H3 (239):** Filter sheet title "Filter"; groups "Show" (Mine, Whole
  family links), "Time of day", the "Together only" switch, "People"
  (family only, all on by default). Button reads "Filter · N", N counting
  narrowed groups (time not All, Together only on, any person off); Show
  never counts.
- **H4 (240):** empty Mine columns stay on wide: "Nothing this morning." /
  "Nothing this afternoon." / "Nothing this evening." / Anytime uses
  `NOTHING_HERE_TODAY`; filter-emptied columns all say
  `NOTHING_HERE_TODAY`; an empty column shows no count.
- Words for `habitVocabulary.ts`: `HABITS_VIEW_LABELS`,
  `PAST_DAY_VIEW_ONLY`, `HABIT_FILTER_LABELS`, `filterButtonLabel(n)`,
  `nothingInColumnLabel(key)`.
- For Bryce to look at first: H2's sentence, H3's count rule, H4's
  Anytime wording.

## Fury's structural calls (written on Fable at Bryce's request, 2026-11-07)

1. **Day browsing is read-only and bounded.** `?day=YYYY-MM-DD`; a new pure
   `resolveHabitsDay(param, today)` (`src/lib/habitsDay.ts`, tested) returns
   today for anything missing, malformed, after today or more than 14 days
   back (the data window, `CARRY_LOOKBACK_DAYS`). The existing loaders are
   called with that day as their `today`. On a past day the page passes
   `readOnly`: no check buttons (the plain marker `FamilyHabitRow` already
   draws for `canLog=false`), no swipe, no hours log, no Pick a day,
   nudges, confetti, shout-out or vacation banner, streaks hidden (the
   cached streak is "as of" a later day). Forward arrow disabled on today;
   back arrow disabled at the floor. Decision 222.
2. **One client owner for the bar and the list.** New
   `HabitsDayView.tsx` (client) holds the filter state (time of day,
   Together only, people) and the sheet flag, renders `HabitsBar` and then
   `HabitTodayList` or `HabitFamilyView`, passing a `keep(row)` predicate.
   The lists drop their own chip rows. `HabitViewChips.tsx` is deleted (the
   Mine / Whole family switch is two links in the Filter sheet, keeping
   `day`).
3. **Containers wrap columns only.** Mine: one container round the top
   strip (cards two across from 45rem, decision 224's pattern) and one round
   the column grid. Family: one round the two layouts. Stats, Manage, Chore
   chart, Report Year: one round their grid. `HoursLogSheet` and
   `ChoreChartSheet` stay siblings of the containers.
4. **No second row DOM.** `HabitRow` gets an opt-in `layout="auto"` that
   adds container-variant classes for the tall card (icon above the title)
   from a 60rem container; the dashboard's `HabitsTile` does not pass it,
   so tiles are untouched. Mine's grid: `grid-cols-1 @min-[40rem]:grid-cols-2
   @min-[60rem]:grid-cols-4`. Rows are cards (`rounded-2xl bg-surface`)
   inside a `bg-surface-2` column.
5. **Whole family switches by container, fits everyone by measurement.**
   The `md:` split becomes `@min-[45rem]` (720px: a 768 screen leaves 736,
   so the one-screen `data-fills-width` frame and the wide layout still
   switch together; 820 upright and the Rail stay wide). Fit rule
   `fitsEveryone(width, count)` (pure, in `habitsFamilyColumns.ts`, tested):
   `width >= count * 220 + (count - 1) * 14`. A `ResizeObserver` on the
   strip (the `RecipeList.tsx:77` pattern) measures; default is the 330px
   swipe strip. Column tint: `color-mix(in srgb, <avatar hex> 12%,
   var(--surface))` inline; muted text inside uses `text-muted-strong`.
6. **The + is a `FloatingAddButton` that moves right on wide pages**
   (plan rule 4): the wrapper's inner div gets
   `md:[body:has([data-page-width=wide])_&]:max-w-none` and
   `[body:has([data-page-width=wide])_&]:justify-end`; the button accepts
   `href` as well as `onClick`. Recipes, Goals and Family are not wide pages
   and do not move. Hidden on the tablet login.
7. **A-L2-3 lands:** `DASHBOARD_GRID_CLASSES` in `src/lib/dashboardGrid.ts`
   and `YEAR_GRID_CLASSES` in a new `src/lib/gridClasses.ts` (plain lib
   files, so server `loading.tsx` files can import them), used by the
   component and its skeleton.
8. One `src/app/(app)/habits/loading.tsx` with `data-page-width="wide"`
   covers `/habits` and its children (none has its own).

## Gate plan
Vision after C4 (one pass over C1 to C4, gauntlet re-run, boundary audit,
past-day hunting: streak cache "as of" after the day, logs after the day
counted, DST days, `?day=` beside `?view=family`). Then Strange (1180x820,
820x1180, 375, 1180 + Sidebar, 1180 + Rail; light and dark; every sheet
over the whole screen; 44px targets on the bar; tint contrast) and Captain
(new files placement, `HabitRow` and `HabitTodayList` sizes, A-L2-3, one
grouping rule). Three passes per gate; fixes batched.


## Danger register

From AGENTS.md, absolute for every agent:
- Local dev uses the Neon `dev` branch (`.env` is a symlink to the main
  checkout's). A `DATABASE_URL` whose host is not the dev endpoint: stop
  and say so. No agent edits `.env`.
- `npm run db:seed` and `npm run db:reset` are forbidden. No clean or
  reset script for `User`. No migration in this mission.
- The dev branch holds real family data: private. Test habits made for
  gates are named "zz m51 ..." and removed after.
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
- Strange: every Habits & Chores view changes visibly. Sizes: 1180x820,
  820x1180, 375, and 1180 with Sidebar and with Rail.
- Captain: a large diff with new components; several habits files are
  near their caps.
- Banner: one brief before contracts.
- Hill: the design calls the plan leaves open.

## Contracts (one Stark dispatch each; C1 to C4 in sequence, disjoint files)

Status per contract is kept on its heading line.

### C1: shell, bar, day browsing, Filter sheet, + (DONE, `907e401`)
- **Objective:** `/habits` is a wide page with the new bar, a bounded
  read-only day browser, a Filter sheet and a floating +.
- **May touch:** `src/app/(app)/habits/page.tsx`, new `habits/loading.tsx`,
  new `src/components/HabitsDayView.tsx`, new `HabitsBar.tsx`, new
  `HabitFilterSheet.tsx` (built on `RadioSheet`'s frame), delete
  `HabitViewChips.tsx`, `FloatingAddButton.tsx`, new `src/lib/habitsDay.ts`
  + `.test.ts`, `src/lib/habitVocabulary.ts` (new words only),
  `HabitTodayList.tsx` and `HabitFamilyView.tsx` **only** for the new props
  (`keep`, `readOnly`, removing their chip rows and Report links).
- **Must not touch:** loaders in `src/lib/habitsRead.ts`,
  `habitsStatsRead.ts`, `habitsToday.ts`, `habitsFamily.ts`; `HabitRow.tsx`,
  `HabitFamilyWide*.tsx`, `AppChrome.tsx`, `prisma/`, `package.json`,
  constitutions, `.env`.
- **Spec:** bar row: `h1` date ("Friday, November 7", `formatDayLabel`
  style, 2xl / 3xl) with subtitle; Filter (`ListFilter`), ‹ (44px), Today,
  › (44px), Manage (`SlidersHorizontal`), Report icon (`BarChart3`,
  `aria-label` "Report"); `flex-wrap` so a 375 phone gets two rows. Arrows
  and Today are links (`?day=`, keeping `view`), with `aria-disabled` at the
  bounds. Filter sheet groups: Show (Mine / Whole family links), When (time
  chips from `reportFilterOptions(..., {kinds:false})` minus life areas),
  Together only, People (family view only, from `page.columns`). The +
  (`FloatingAddButton href="/habits/new"`) only when `canManage`. Tablet
  logins: no Manage, no Report, no +, family view as today.
- **Verification:** gauntlet; `npx tsx --test src/lib/habitsDay.test.ts`
  (today for malformed, future, 15 days back; exact day for 0 to 14 back);
  `curl -s localhost:3000/habits?day=2020-01-01` renders today's date.
- **Evidence:** test output, the rendered `<h1>` for `?day=` yesterday with
  no `<button>` checks in the list, screenshot-free DOM dump at 375 showing
  two bar rows.
- **Done:** Vision reproduces the above; `git diff --stat` only names the
  may-touch files.

- **C1 amendments (Fury, before dispatch, 2026-11-07):** may also touch
  `HabitRow.tsx` and `HoursHabitRow.tsx` (a `readOnly` prop only: a plain
  marker, no swipe, no log button) and `HabitFamilyWide.tsx` (remove its
  Filter / Report toolbar and own filter state; it takes `keep`). The bar
  is drawn by each list through a `bar(subtitle)` render prop from
  `HabitsDayView`, so the count follows the optimistic rows. Signed-in
  DOM checks move to Strange (a `curl` gets the login redirect); Stark's
  evidence is the gauntlet, unit tests and the diff.

### C2: Mine as time-of-day columns
- **May touch:** `HabitTodayList.tsx`, `HabitRow.tsx`,
  `src/lib/habitsFamilyColumns.ts` + its test (add `groupRowsByTime(rows)`
  for `HabitRowView`, reusing the same key order), `HoursHabitRow.tsx` (card
  classes only), `habitVocabulary.ts` (words only).
- **Must not touch:** `HabitsTile.tsx`, `PlanDayCard.tsx`, `HabitsBar.tsx`,
  anything in C1's list besides `HabitTodayList.tsx`, loaders.
- **Spec:** strip container (nudges, vacation, shout-out, Pick a day;
  `@min-[45rem]:grid-cols-2` when 2+); column grid per call 4; column
  header: time icon (`TIME_ICONS`, `Clock` for Anytime), name, "1 of 2
  done" (`doneCountLabel`); empty column text (H4); cards per call 4 with
  the Chore tag; chore streak moves to the subtitle via a prop to C1's bar
  (H1); the foot Report card and the two "Habits / Chores" sections go;
  `HoursLogSheet` stays outside both containers; swipe to skip still works
  on a card; `readOnly` renders markers and no swipe.
- **Verification:** gauntlet; column tests; dev server DOM at 1180 shows
  4 `[data-time-column]`, at 820 upright 2, at 375 1; the dashboard's
  Habits tile DOM unchanged (diff of `curl /` before and after).
- **Evidence:** the three DOM counts, the tile diff (empty), test output.

### C3: Whole family fits everyone
- **May touch:** `HabitFamilyView.tsx`, `HabitFamilyWide.tsx`,
  `HabitFamilyWideColumn.tsx`, `HabitFamilyColumn.tsx` (card styling only),
  `habitsFamilyColumns.ts` + test (`fitsEveryone`), `AppChrome.tsx` comment
  above `<main>` only (names the habits page as a `data-page-width` user).
- **Must not touch:** C1/C2 files, loaders, `AppChrome.tsx` class strings.
- **Spec:** per call 5. Column header keeps avatar, name, count, flame,
  Plane, shout-out; rows become cards in groups (Morning … Anytime) on the
  tinted column; the old toolbar (Filter, Report) is removed (C1's bar);
  `keep` from C1 filters rows and `people` hides columns;
  `focusPersonId` scrolling stays. Fit: 5 people at 1148 → 5 equal columns
  (about 215 to 220px each, no sideways scroll); beside the Sidebar (892) →
  330px swipe strip; 820 upright (788) → 3 people fit, 4+ swipe.
- **Verification:** gauntlet; `fitsEveryone` tests (1148/5 true, 892/5
  false, 788/3 true, 788/4 false); DOM at each size.
- **Evidence:** test output; computed widths of `[data-family-person]` at
  1180, 1180+Sidebar, 820 (from a `javascript_tool` or Playwright-free
  `getBoundingClientRect` dump Stark runs in the preview).

### C4: Manage, Chore chart, Report Year, Stats, A-L2-3
- **May touch:** `HabitManager.tsx`, `ChoreChart.tsx`, `ReportYear.tsx`,
  `HabitStats.tsx`, `habits/manage|chart|report|[id]/page.tsx` (root gets
  `data-page-width="wide"`), `src/lib/dashboardGrid.ts`, new
  `src/lib/gridClasses.ts`, `DashboardWidgetList.tsx` + `(home)/loading.tsx`
  + `YearView.tsx` + `calendar/loading.tsx` (swap literal grid strings for
  the constants, nothing else).
- **Spec:** Manage: container, `@min-[45rem]:grid-cols-2` Habits left /
  Chores right, Chore chart link, Archived and settings span. Chore chart:
  day grid `grid-cols-1 @min-[36rem]:grid-cols-2 @min-[64rem]:grid-cols-7`;
  the add form stacks (`flex-col`) below 12rem per column; sheet outside
  the container. Report Year: `grid-cols-2 @min-[40rem]:grid-cols-3
  @min-[60rem]:grid-cols-4`. Stats: header spans; `@min-[50rem]:grid-cols-2`
  with tiles + month (or `HabitHoursStats`) left, nudges + Side by side +
  week strips right.
- **Verification:** gauntlet; DOM column counts at 1180 / 820 / 375 for the
  four pages; `grep -rn "grid-cols-2 gap-4 @min-\[45rem\]" src` returns
  only the constant's home.
- **Evidence:** counts, grep output, `git diff --stat`.

### C5: records (after gates pass)
- STRUCTURE.md "Wide pages": add the Habits pages and their containers, the
  `FloatingAddButton` wide rule, mark A-L2-3 done; file-size rows if any
  file passed 350. DESIGN.md: the Habits bar and the + on wide pages.
  Plan: decisions 233 to 236 and Hill's H1 to H4. CLAUDE.md "Current
  status": L3 line; Bryce's checklist gets an iPad check. Mission file
  final. Every claim checked by command (Vision rule).

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-11-07: C1 DONE (`907e401`, 15 files, +706/-219). Gauntlet green per
  Stark (1383 tests; UTC 1376 pass, 7 skipped; build 0); Fury re-ran
  `habitsDay.test.ts` (8 pass) and checked the file list. Notes: past-day
  empty words are inline in `HabitTodayList` (C2 moves them to the
  vocabulary; Hill to review); phone family cards' counts narrow with the
  filter (C3); `habitVocabulary.ts` 416 lines.

- 2026-11-07: mission opened; PR #74 confirmed on `origin/main`
  (`7674730`); Banner dispatched.
- 2026-11-07: Banner brief in; Bryce answered four design calls (233 to
  236); plan written on Fable and approved by Bryce; chat back on Opus.
