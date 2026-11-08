# Mission 53: iPad landscape L3 (Habits & Chores go wide)

**Project:** family-hub (Marshee)
**Status:** DELIVERING (all gates PASS: Vision 2, Strange 3, Captain 3; main merged at `2dc1eb2`; C5 records written; PR next)
**Started:** 2026-11-07 · **Updated:** 2026-11-07
**Branch:** `claude/habits-chores-ipad-landscape-f04eee` (cut from `944444b`; `origin/main` with PR #74 merged in at `1bb7645`)
**Plan:** `.avengers/plans/ipad-landscape-v1.md`, step L3 (section "Habits and Chores"; decisions 215 to 223, 230)
**Mocks:** canvas boards "Today" (`project/Today.dc.html`) and "Family" (`project/Family.dc.html`) on https://claude.ai/artifact/XpmoRsLuBuPUdwuRSzK25n

Numbering: 49 (`mission-49-dashboard-widgets-w2-calendar.md`) and 50
(`mission-50-assistant-plans-goals.md`) are taken on `origin/main`; no
branch claims 51 (checked `git branch -r`, 2026-11-07).

**Renumbered 2026-11-07 (before the PR):** L5 merged as mission 51
(`mission-51-ipad-landscape-l5.md`, PR #79) and L4 is mission 52 in its
own chat, so this mission is **53** (this file was
`mission-51-ipad-landscape-l3-habits.md`; commits and gate rows below say
"Mission 51" and mean this one). Decisions 233 to 243 belong to mission
49, and L5 and L4 used 244 to 254, so this mission's decisions move:
233 to 236 are now **255 to 258** (Bryce) and Hill's 237 to 240 are now
**259 to 262**; Hill's H5 (past-day empty words) is **263**. The old
numbers stay as written in the history below; the plan, the code
comments and the constitutions use the new ones.

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
- **H5 (263, medium, 2026-11-07):** a past day with nothing due says
  "Nothing due that day" / "You had no habits or chores to do"
  (`PAST_DAY_NOTHING_DUE_TITLE` / `_HINT`), replacing the builder's
  "Nothing was due" / "No habits or chores were due that day": same voice
  as "Nothing due today", and the hint adds a fact instead of repeating
  "due".
- For Bryce to look at first: H2's sentence, H3's count rule, H4's
  Anytime wording, H5.

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

### C2: Mine as time-of-day columns (DONE, `a11bb00`)
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

- **C3 amendments (Fury, before dispatch):** `HabitFamilyColumn.tsx` may
  also take a `keep` prop so the phone card's count stays the whole day
  while rows filter; `FamilyHabitRow` gets a `layout="card"` (tall card)
  for the wide columns; each wide column's scroll area reserves bottom
  room for the floating +.

### C3: Whole family fits everyone (DONE, `00181fb`)
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

### C4: Manage, Chore chart, Report Year, Stats, A-L2-3 (DONE, `854cc82`)
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

### C5: records (DONE, written by Fury after the gates; amendments as A-L3-1 to A-L3-10, A-L3-9 dropped because L5 moved the wide-page list out of the AppChrome comment)
- STRUCTURE.md "Wide pages": add the Habits pages and their containers, the
  `FloatingAddButton` wide rule, mark A-L2-3 done; file-size rows if any
  file passed 350. DESIGN.md: the Habits bar and the + on wide pages.
  Plan: decisions 233 to 236 and Hill's H1 to H4. CLAUDE.md "Current
  status": L3 line; Bryce's checklist gets an iPad check. Mission file
  final. Every claim checked by command (Vision rule).

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Strange | BLOCKED | (1) Whole family wide: an `sr-only` in the skipped marker escapes the column scroller, the page scrolls 33 to 57px (title under the hamburger after the hours sheet closes) and with classic scrollbars five people stop fitting; (2) Report Week at 375: cards 558px in a 343px grid (implicit auto track), counts and cells cut off; (3) Chore chart This week at 1180: a changed chore's title shrinks to 0px and its tag spills out; (4) phone Whole family checks no longer line up right (`HabitFamilyColumn.tsx:110`); (5) decision 233: phone family cards still group Habits / Chores with no Chore tag; (6) Stats at 1180: hours habit all on the left, solo habit leaves the right half empty (plan puts week, log, nudges, side by side right) | Session already signed in as Bryce in the pane; no data created. Passed: bar targets 44px+, past day has no buttons and the H2 line, sheets full screen, no sideways scroll elsewhere, skeleton matches, tint contrast light 4.91 / dark 6.46, header flame 5.64+ / 6.66+, fit rule at 924/1108/820 proxies, Goals and Recipes + unchanged. NOTES: + on a 375 phone sits over the bottom check (gate the right move to `md`); Mine columns stretch to the tallest (`items-start`); three card shapes; past-day not-done marker is `line-strong` (older); Time of day group hidden when one time; a one-person Together habit labelled Mine; truncated chore names on Default week; Report pager and Year picker span 1148; 375 bar orphans the Report icon; hours habits left out of counts (older). Not covered: real Sidebar/Rail (dev error `HabitInput is not defined` from `src/app/actions/habits.ts:36`, from main), tablet login, iPad Safari |
| 3 | Strange | PASS | None | Chore tags inside chip and card at 1180 with no menu, Rail and Sidebar (4 of 4 each); phone Whole family has no strip, one Together row per person card, Filter hides people right. Sweep: five 220px at 1180, page height equals viewport, + per A-51-2, dark clean. Menu style back to Menu button (reload checked). NOTES: unfitted 330px layout up to about 12s in a hidden pane (Bryce's iPad check: five columns appear right away); tag colour close to the chip's; chart titles cut to about 6 characters at 1180 with two-line tags; on phones the + covers row starts while scrolling (clears at the end); carried notes (dev N badge, tall Anytime cards with test data, hours not counted) |
| 2 | Vision | PASS | None | Gauntlet re-run: tsc, lint, build 0; `npm test` 1425; UTC 1418 + 7 skipped; LA 1425; record check 0 hard, 13 REVIEW. Pass-1 B1 (past days bounded; DST probe at 06:59Z/07:01Z right) and B2 (Report Week container) fixed. Boundaries clean for F1, F2, F2b, F3. NOTES: a person added to a habit after the day still gets a row on that day (`habitsToday.ts:222-301`; fix with a `joinedAt` skip, but Together's `members[0]` fallback must then pick someone who had joined); Together row built from `members[0]` without a join check (`habitsFamily.ts:139-147`, older); past-day columns for profiles made later; unused non-`md` `justify-end` CSS copy; `QUIT_TAG_CLASS` `whitespace-nowrap` on long Mine week tags (unmeasured); the ledger's `HabitFamilyView.tsx:70-71` line is history (F3 moved it) |
| 2 | Strange | BLOCKED | (1) Chore chart This week: tags still leave their card (`QUIT_TAG_CLASS` has `whitespace-nowrap` in an about 80px column; to 1182 on Saturday at 1180, clipped with the Rail); (2) phone Whole family shows each Together row two or three times (strip plus each card); decision 233 says one layout on every size | S1, S2, S4, S6 fixed; S3 titles fixed; S5 grouping and tags fixed. Sidebar and Rail now tested (Menu style set back to Menu button, checked after reload): + bottom right of content, no sideways scroll, fit rule and swipe right. NOTES: hours Stats lopsided (left 73px, right 800px; Hill suggestion: This week chart under the tiles); one-frame 330px layout before fit (dev compile?); dark scrollbars bright (`color-scheme`); Rail Mine tall cards with test data; 375 bar orphans Report icon; Default week names truncate; dev N badge over the +. Not covered: tablet, iPad Safari, dark with pinned menus |
| 3 | Captain | PASS | None | Pass-2 blocker cleared (`shownColumns`, `togetherRowShown` in `habitsReportScope.ts:177-185`, tested). F2 split of `HabitHoursStats`, phone cards on `groupColumnRows`, + right from `md`, F2b all pass; cheap notes cleared. NOTES: time-group heading lookup repeated in three components (next touch: `timeGroupLabel(key)`); phone Together row shows in the strip and each card (Strange/Vision to judge); `HabitForm.tsx` exactly 350 (next split); `groceriesRecipes.ts:35` and `groceriesPutAway.ts:28-33` re-export types from `"use server"` files (older; A-51-10); duplicate `Tile` (older). Final A-51-1 to A-51-10 text below |
| 2 | Captain | BLOCKED | `HabitFamilyView.tsx:70-71` still matches the people filter (columns hidden, Together row with all people hidden) in a component (STRUCTURE.md :918-919; F1 spec item 3): add `shownColumns` / `togetherRowShown` beside `stillHiddenPeople`, tested | Pass-1 B1, B2 and the strongest note cleared; new helpers pass; `buildTodayRows` bound placed right (`habitsToday.ts` 353 / 283 code, no split). NOTES: `HABITS_BAR_LABELS.report` retypes `REPORT_LABELS.title`; orphaned comment above `HABITS_BAR_LABELS` (`PAST_DAY_VIEW_ONLY` lost its comment); `habitStartDay` computed twice; `HabitsDayView`/`HabitTodayList` take the type from `habitsRead`; `sharing: string` could be `HabitSharing`. A-51-6 and A-51-8 text updated (below) |
| 1 | Vision | BLOCKED | (1) a past day is built from data after it: log and hours reads have no upper bound, habits created after the day show as due (probe: a 2-a-week habit checked Wed and Thu vanishes from Monday; a habit made Friday shows Monday as missed); (2) Report Week rows stretch about 1148px on the now-wide Report (STRUCTURE.md Wide pages rule 3) | Gauntlet green with real codes (1415; UTC 1408 + 7 skipped; LA 1415; record check 0 hard, 7 REVIEW; build 0); boundaries clean; built CSS holds lib-only classes. NOTES: phone family card says `NOTHING_DUE_TODAY` when the Filter emptied it; phone Together strip ignores hidden people; stale "14px" comment; one-frame reflow before the ResizeObserver fires; 752 to 767px screens show the strip without the frame (no real iPad); + bottom right on phones too (Strange to judge); Manage second grid puts both links side by side with no archive; habits archived after a past day are missing from it; habits loading covers New/Edit |
| 1 | Captain | BLOCKED | (1) `habitsFamilyColumns.ts:2` and its test import `HabitRowView` type from server-only `habitsRead.ts` (STRUCTURE.md dependency direction :815-817): import from `./habitsToday`; (2) `HabitsDayView.tsx:58,63` builds and matches filter options in a component (STRUCTURE.md :915-920 one filter rule) | Strongest NOTE: `habits/loading.tsx:17` copies Mine's grid and drifted (`gap-3.5` vs `gap-3`): `HABITS_DAY_GRID_CLASSES`. NOTES: vocabulary 420/252 (rule clauses contradict, A-51-8); second "Mine" literal; bar words inline in components; two copies of the read-only marker; `lockPage` and people filter untested in tsx; time key order written twice in `habitsFamilyColumns.ts`; stale comments ("14px", header); habits `loading.tsx` also covers New/Edit (narrow pages) and other subpages' shapes; ReportYear indentation; sheet frame copied (old debt). Amendments A-51-1 to A-51-9 drafted |

## Fix batch 1 (after pass 1)

### F1: past days true to the day; filter rules in lib; Week view; notes (DONE, `2d0fb63`)
- **Objective:** clear Vision's and Captain's four pass-1 blockers and
  Captain's strongest note, plus the cheap notes, in one dispatch.
- **May touch:** `src/lib/habitsRead.ts` and `src/lib/habitsStatsRead.ts`
  (only the `day` filters of `loadTodayPage` and `loadFamilyPage`'s
  `habitLog` and `habitTimeEntry` reads), `src/lib/habitsToday.ts`
  (`buildTodayRows` only) and its test file under `src/lib/` (or
  `src/lib/habits/`), `src/lib/habitsFamilyColumns.ts` + test,
  `src/lib/habitsReportScope.ts` + test, `src/lib/gridClasses.ts`,
  `src/lib/habitVocabulary.ts` (words only), `HabitsDayView.tsx`,
  `HabitsBar.tsx`, `HabitTodayList.tsx`, `src/app/(app)/habits/loading.tsx`,
  `ReportWeek.tsx`, `HabitFamilyColumn.tsx`, `HabitFamilyView.tsx`,
  `HabitFamilyWide.tsx` (comment only), `HabitManager.tsx`.
- **Must not touch:** other loaders or their callers (the dashboard's
  `loadDashboardHabits` must behave as today), `prisma/`, `package.json`,
  constitutions, `.env`.
- **Spec:**
  1. (Vision B1) Both loaders bound `habitLog.day` and
     `habitTimeEntry.day` with `lte: utcMidnightInstant(today)` next to
     the existing `gte`. `buildTodayRows` skips a habit whose
     `habitStartDay(createdAt)` is after `today` (`compareDays`), and
     treats a participant whose `joinedAt` day is after `today` as not on
     it for that day if that is a one-line change in the same loop (else
     leave and say so). Tests: a "2 times a week" habit with logs on Wed
     and Thu is open at 0 of 2 on the Monday before; a habit created
     Friday has no row on Monday; today's rows unchanged (an existing
     test still passes).
  2. (Captain B1) `habitsFamilyColumns.ts` and its test take
     `HabitRowView` from `./habitsToday`. One private helper holds the
     time key order and bucket test for both groupers. Fix the "14px"
     comment and the file header; `FIT_COLUMN_GAP` and
     `HabitFamilyWide`'s `gap-3` name each other in comments.
  3. (Captain B2) `habitsReportScope.ts`: `reportFilterOptions(...,
     { kinds, areas })` (`areas: false` leaves life areas out),
     `matchesHabitsFilter(row, { time, togetherOnly })`, and
     `narrowedFilterCount({ time, togetherOnly, hiddenPeople })`
     (decision 239), all tested. `HabitsDayView` only holds state and
     calls them; the people filter (columns hidden) moves to a tested
     pure helper beside them.
  4. (Captain strongest note) `HABITS_DAY_GRID_CLASSES` in
     `gridClasses.ts` (the list's `gap-3`), used by `HabitTodayList` and
     `habits/loading.tsx`.
  5. (Vision B2) `ReportWeek`: one `@container`; inside each section the
     item cards are a grid `grid gap-2 @min-[50rem]:grid-cols-2`; the S M
     T W T F S header shows once per column (a second copy
     `hidden @min-[50rem]:grid`). Phone unchanged.
  6. Notes: phone family card says `NOTHING_HERE_TODAY` when the Filter
     emptied rows it has; the phone Together strip hides a row whose
     people are all hidden; Manage's second grid keeps both links in the
     left column with or without Archived (fix the placement to match the
     comment); the bar's "Previous day", "Today", "Next day", "Manage",
     "Report" and H1's sr-only "chore streak" move to
     `habitVocabulary.ts`.
- **Verification:** gauntlet (tsc, lint, `npm test`, UTC and
  Los Angeles legs, build); the new tests; `grep -rn "grid-cols-1 gap-3
  @min-\[40rem\]" src` only in `gridClasses.ts`; `grep -n
  "startsWith(\"area:\")\|sharing === \"together\"" src/components/HabitsDayView.tsx`
  empty; `grep -n "habitsRead" src/lib/habitsFamilyColumns*.ts` empty.
- **Evidence:** outputs of each, `git show --stat HEAD`, line counts.
- **Done:** Vision, Captain and Strange pass 2.

## Fix batch 2 (after Strange pass 1 and Captain pass 2)

### F2: layout fixes, people filter in lib, dev error (DONE except the dev error, `78b9a05`)
- **Objective:** clear Strange's six pass-1 blockers and Captain's pass-2
  blocker, plus the cheap notes, in one dispatch.
- **May touch:** `HabitFamilyWideColumn.tsx`, `LogButton.tsx`,
  `ReportWeek.tsx`, `ChoreChart.tsx`, `HabitFamilyColumn.tsx`,
  `HabitFamilyView.tsx`, `HabitStats.tsx`, `HabitHoursStats.tsx`,
  `HabitsDayView.tsx`, `HabitTodayList.tsx`, `FloatingAddButton.tsx`,
  `src/lib/gridClasses.ts`, `src/lib/habitsReportScope.ts` + test,
  `src/lib/habitVocabulary.ts`, `src/lib/habitsToday.ts` (the duplicate
  `habitStartDay` only), `src/lib/habitsFamilyColumns.ts` + test (only if
  the phone grouping needs a helper), and **`src/app/actions/habits.ts`
  line 36 only** (`export type { HabitInput };`: nothing imports it from
  there, and Turbopack dev throws `HabitInput is not defined` on it,
  which blocked Strange's Sidebar and Rail checks; from mission 47).
- **Must not touch:** loaders, `prisma/`, `package.json`, constitutions,
  `.env`, any other action file.
- **Spec:**
  1. (S1) `relative` on the column scroller in `HabitFamilyWideColumn`
     and on `LogButton`'s skipped-marker span, so `sr-only` text stays in
     its box; `document.documentElement.scrollHeight` equals the
     viewport on Whole family wide.
  2. (S2) `ReportWeek` item grid and header grid `grid-cols-1` base
     (`minmax(0,1fr)`), so 375 cards fit 343px.
  3. (S3) Chore chart rows (This week and Default week): title and tag
     stack (title `w-full truncate`, tag under it), so no title is 0px and
     no tag leaves its card at about 146px columns.
  4. (S4) `FamilyHabitRow` row layout's inner flex is `min-w-0 flex-1`,
     so phone checks line up on the right.
  5. (S5, decision 233) Phone family person cards group by Morning,
     Afternoon, Evening, Anytime with `groupColumnRows` (empty groups
     dropped) and the same tags (`familyRowTag`: Chore, Together); the
     chore streak flame moves beside the person's count (as on the wide
     column header).
  6. (S6) Stats: the hours habit's This week, hours by day and Time logged
     go in the right column (split `HabitHoursStats` into exported parts
     or props, no copy of its markup); a habit with nothing for the right
     column renders one column capped at `max-w-3xl` (today's width), not
     a half-empty grid.
  7. (Captain pass 2) `shownColumns(columns, hiddenPeople)` and
     `togetherRowShown(row, hiddenPeople)` in `habitsReportScope.ts`,
     tested (hidden column drops; Together row with every person hidden
     drops; one shown person or no participants stays);
     `HabitFamilyView` calls them; `grep -n "hiddenPeople.includes"
     src/components/HabitFamilyView.tsx` is empty.
  8. Notes: the floating + moves bottom right only from `md` on wide
     pages (phones keep bottom left); `items-start` in
     `HABITS_DAY_GRID_CLASSES` so columns are their own height;
     `HABITS_BAR_LABELS.report` references `REPORT_LABELS.title`; the
     orphaned comment goes back above `PAST_DAY_VIEW_ONLY`; one
     `startDay` in `buildTodayRows`; `HabitsDayView` and `HabitTodayList`
     take `HabitRowView` from `@/lib/habitsToday`; `matchesHabitsFilter`
     types `sharing` as the sharing type if one exists.
- **Verification:** gauntlet (tsc, lint, `npm test`, UTC and Los Angeles
  legs, build); new tests; the grep in item 7; `grep -n "HabitInput"
  src/app/actions/habits.ts` shows only the import and its two uses.
- **Done:** Strange pass 2, Captain pass 3, Vision pass 2 all PASS.
- **F2b amendment (Fury):** Stark stopped correctly: `HabitForm.tsx:14-21`
  imports `type HabitInput` from `@/app/actions/habits` (Fury's grep missed
  the multi-line import). F2b may touch `src/components/HabitForm.tsx`
  (that import only: `HabitInput` from `@/lib/habitInput`) and delete
  `src/app/actions/habits.ts:36`.

## Fix batch 3 (after Strange pass 2)

### F3: two Strange pass-2 blockers (DONE, `4b98008`: 4 files; tsc, lint, build 0; 1425 tests, UTC 1418 + 7 skipped; LA leg left to Vision)
- **Objective:** chore chart tags stay inside their card, and the phone Whole family shows each Together row once per person, like the wide layout.
- **May touch:** `src/components/ChoreChart.tsx` (the tag in `WeekRow` only), `src/components/HabitFamilyView.tsx` (remove the phone Together strip), `src/lib/habitsReportScope.ts` and `.test.ts` (remove `togetherRowShown` and its test if nothing calls it).
- **Must not touch:** `HabitRow.tsx` (`QUIT_TAG_CLASS` stays: Today uses it), every other file, constitutions, `.env`, `prisma/`.
- **Spec:** (1) `ChoreChart.tsx:78`: the tag stops using `QUIT_TAG_CLASS`; use `max-w-full rounded-lg bg-surface-2 px-2 py-0.5 text-xs font-semibold leading-tight text-muted-strong` (no `whitespace-nowrap`, so it wraps); drop the import if unused. (2) `HabitFamilyView.tsx`: delete the phone-only `<section aria-label="Together">` block and `togetherShown`; drop the `Users`, `FamilyHabitRow` and `togetherRowShown` imports if unused; fix comments that name the strip (`applyToPage` and the two above `togetherShown`). The cards keep their Together rows (they carry the tag and follow the people filter). (3) Remove `togetherRowShown` and its test if no caller is left.
- **Verification:** the gauntlet (tsc, lint, `npm test`, UTC and LA direct runs, build); `grep -rn togetherRowShown src` empty; `grep -n 'aria-label="Together"' src/components/HabitFamilyView.tsx` empty.
- **Evidence:** exit codes and test counts, the greps, `git diff --stat` naming only may-touch files.
- **Done:** Strange pass 3 measures every tag inside its chip at 1180 (no menu, Rail, Sidebar) and one copy per person of each Together row at 375.

## Captain's amendments (final text, Captain pass 3; C5 writes them into STRUCTURE.md)

- **A-51-1 Wide pages.** Three pages are wide: the dashboard, the Calendar, and Habits & Chores. Habits & Chores means `/habits`, Manage, Chore chart, Report and Stats. New and Edit stay narrow until L6. Habits' containers: Mine has a top strip and a column grid. Whole family has one container round both layouts. Manage, Chore chart (and each of its day cards), Report Year and Stats have one each. Sheets stay siblings of the container. Whole family switches layouts at a 45rem container while `data-fills-width` reacts at `md`. They agree because a 768 screen (or 1024 with the Sidebar pinned) leaves a 736px container. Stats goes to two columns from a 50rem container only when its right column has something (nudges, Side by side, or an hours habit's `HabitHoursDetail`). Otherwise it is one column capped at `max-w-3xl`.
- **A-51-2 The floating +.** `FloatingAddButton` is the only floating +. It sits bottom left of the 768px column on non-wide pages, and on wide pages below `md` (phones stay clear of the last row's check). It sits bottom right on wide pages from `md`, through its own wrapper (`md:[body:has([data-page-width=wide])_&]`). Its props are `onClick` or `href`, plus `label`. Wide scroll areas reserve room for it (`pb-20`). There is no + on the tablet.
- **A-51-3 Shared class strings.** (A-L2-3, done here.) A class string that a component and its skeleton share is one exported constant in `src/lib/`, written as a whole literal so the Tailwind scan finds it: `DASHBOARD_GRID_CLASSES` / `DASHBOARD_CELL_CLASSES`, `YEAR_GRID_CLASSES`, `HABITS_DAY_GRID_CLASSES` (in `gridClasses.ts`). A skeleton that types its own copy is a BLOCKER.
- **A-51-4 The day browser.** `src/lib/habitsDay.ts` is the only home of the day browser (`resolveHabitsDay`) and the `/habits` URL builder (`habitsHref`). A past day's lock is display only; writes keep `isTapDayAllowed`. It imports only `householdDate.ts` and `habits/carryOver.ts`.
- **A-51-5 Time-of-day grouping.** `habitsFamilyColumns.ts` is the only time-of-day grouping (`groupColumnRows` for the family view on both the phone cards and the wide columns, `groupRowsByTime` for Mine) and the only fit rule. The fit rule is `fitsEveryone`, `FIT_COLUMN_MIN` 220 and `FIT_COLUMN_GAP` 12 (= `gap-3`), and both ends name each other. It is also the only home of a column's empty text (`emptyColumnText`). Row tags come from `familyRowTag` through `ColumnItem` / `TimeRowItem`. `HabitRow layout="auto"` and `FamilyHabitRow layout="card"` are the only tall cards. The file imports only vocabulary, `habitsFamily.ts` and types from `habitsToday.ts`.
- **A-51-6 The filter rule.** `HabitsDayView` is the one client owner of the Filter state for both views. `habitsReportScope.ts` holds every Today and Whole family filter rule: `reportFilterOptions(..., { kinds: false, areas: false })`, `matchesHabitsFilter`, `narrowedFilterCount` (decision 239), `stillHiddenPeople` and `shownColumns` (F3 removed `togetherRowShown` with the phone Together strip). Lists receive `keep(row)` only. A component that matches rows or columns against the Filter, people included, is a BLOCKER. `HabitFilterSheet.tsx` only draws each chip's on/off state.
- **A-51-7 The Habits bar.** `HabitsBar.tsx` is the only Habits bar, drawn through `bar(subtitle)`. `HabitFilterSheet.tsx` is the only filter sheet and the only Mine / Whole family switch. The bar icon is the only Report entry.
- **A-51-8 Habit vocabulary.** New habit words stay in `habitVocabulary.ts` while its code is well under the cap (425 total / about 254 code at F2). Past about 300 code lines, a concern gets its own file. A word that is already exported is referenced, never typed again (example: `HABITS_BAR_LABELS.report` is `REPORT_LABELS.title`). Fix the stale "380 lines" in the Size watch. Size watch: `habitVocabulary.ts` 425 / 254, `habitsToday.ts` 353 / 283, `habitsReportScope.ts` 280, `HabitForm.tsx` 350 (at the soft cap).
- **A-51-9 Page opt-outs.** The `AppChrome` comment above `<main>` names the three wide pages and Whole family's `data-fills-width`.
- **A-51-10 Types and Server Action files.** A component takes a type from its lib home (for example `HabitInput` from `@/lib/habitInput`), never through a `"use server"` file. A new type re-export in `src/app/actions/` is a BLOCKER, because Turbopack dev threw `HabitInput is not defined` on `export type { HabitInput };` (mission 51). Existing debt, to fix on the next touch: `groceriesRecipes.ts:35` and `groceriesPutAway.ts:28-33`. Add "type re-exports" to the forbidden column of the `src/app/actions/` layout row.
- Also: update the "Waiting for Bryce" line in the mission-46 file (A-L2-3 is done here).

## Delivery

**Records written (C5):** STRUCTURE.md "Wide pages" (A-L3-1 to A-L3-3),
the Habits & Chores page rules (A-L3-4 to A-L3-7), the Size watch
(A-L3-8), the `src/app/actions/` row (A-L3-10); DESIGN.md (the Habits bar,
Mine, Whole family, the + on wide pages); plan decisions 255 to 263;
CLAUDE.md "Current status" and Bryce's "Landscape Habits check"; the
mission-46 A-L2-3 line.

**Leftovers (NOTES, not this mission's job):**
- Past days: a person added to a habit after the day still gets a row
  on that day (`habitsToday.ts`, `buildTodayRows`; fix with a `joinedAt`
  skip, and Together's `members[0]` fallback must then pick someone who
  had joined); profiles made later show an empty column; habits archived
  after a past day are missing from it.
- The Whole family fit can show the 330px strip for a moment before the
  five columns (seen in a hidden browser pane; check on the iPad).
- Chore chart: titles cut to about 6 characters at 1180 with two-line
  tags; the tag colour sits close to the chip's.
- Stats for an hours habit is lopsided (left 73px, right 800px); Hill
  could move the This week chart under the tiles.
- The 375 bar puts the Report icon alone on a second row; on phones the +
  covers the start of rows while scrolling.
- The time-group heading lookup is repeated in three components (next
  touch: `timeGroupLabel(key)`); `HabitForm.tsx` is at 350 lines;
  `groceriesRecipes.ts` and `groceriesPutAway.ts` still re-export types
  from `"use server"` files (A-L3-10 debt); `habits/loading.tsx` also
  covers New and Edit.
- Hours habits are not counted in "N of M done" (older).
- Dark mode draws bright scrollbars in desktop Chrome (`color-scheme`).

**Not covered by any gate:** the tablet login, real iPad Safari.

## Handoff log

- 2026-11-07: F2 DONE except the dev error (`78b9a05`, 16 files,
  +121/-69). Stark: gauntlet green (1426; UTC 1419 + 7 skipped; LA 1426;
  build 0); two new people-filter tests. Notes: `sharing` stays `string`
  (the row type is `string`); phone family cards now also show Together
  rows inside each person's groups (as the wide columns do): Strange to
  judge. F2b sent to Stark for the `HabitInput` dev error.

- 2026-11-07: F1 DONE (`2d0fb63`, 19 files, +183/-60). Stark: gauntlet green
  (1424; UTC 1417 + 7 skipped; LA 1424; build 0); Vision's probe before:
  weekly habit missing from Monday, Friday habit due Monday; after: open
  at 0 of 2, Friday habit gone. `buildTodayRows` also drops logs after
  the day and members who joined later (a viewer who joined later still
  gets a row: NOTE). `habitVocabulary.ts` 425. Next: Strange pass 1 and
  Captain pass 2 together, then Vision pass 2.

- 2026-11-07: C4 DONE (`854cc82`, 14 files, +123/-64). Stark: gauntlet green,
  built CSS holds every new container class, each grid string has one
  home. **Branch base was `944444b`, not `7674730`:** the worktree was cut
  before PR #74 merged, so main (PR #74 and #78) was merged in via the
  app (`1bb7645`, no conflicts). After the merge: tsc 0, `npm test` 1415
  pass, grid strings still single-homed (Fury ran each).

- 2026-11-07: C3 DONE (`00181fb`, 7 files, +150/-83). Stark: gauntlet green
  (1387; UTC 1380 pass, 7 skipped; build 0). **Fury's contract was
  wrong:** 5 x 220 + 4 x 14 = 1156 > 1148, so `fitsEveryone(1148, 5)`
  could not be true. Stark kept the 220px minimum (decision 217) and made
  the gap 12 (`FIT_COLUMN_GAP`, strip `gap-3`): exactly 1148. Fury accepts
  (structural). Tint stays 12%: lowest pair light red `text-muted-strong`
  4.91:1 (all 8 swatches, both themes, computed). For Strange: card icon
  tile `bg-accent-soft` with `text-muted-strong` when finished; header
  flame on the tint unmeasured.

- 2026-11-07: C2 DONE (`a11bb00`, 6 files, +166/-62). Stark: gauntlet
  green (1386; UTC 1379 pass, 7 skipped; build 0); 3 new grouping tests;
  `HabitsTile` and `PlannedTodayCard` pass no `layout` (grep). Fury checked
  the file list. For Hill: `PAST_DAY_NOTHING_DUE_TITLE` / `_HINT`. For
  Strange: tall card check sits bottom right (`px-12` keeps text clear).

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
