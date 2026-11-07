# Mission 49: Dashboard widgets v2, step W2 (the Calendar widget)

**Project:** family-hub (Marshee)
**Status:** GATES PASSED (delivering)
**Started:** 2026-11-07 · **Updated:** 2026-11-07
**Branch:** `claude/dashboard-w2-calendar-widget-40bbe6` (from `origin/main` at `7d5ea69`)
**Plan:** `.avengers/plans/dashboard-widgets-v2.md`, step W2

Numbering: the handoff asked for "mission 48", but
`mission-48-winnie-briefing.md` already holds 48, so this is 49 (Fury,
2026-11-07, said in chat).

## Brief

- **Goal:** a Calendar widget on the dashboard, in all four sizes, with
  per-widget options, built on the Calendar's own cards.
- **Done means:** in Customize, a person adds a Calendar widget, picks any
  of the four sizes and sets Tasks only, Whole day and (Extra large) Days;
  each saves and survives a reload. Small shows the next item, Medium and
  Large show today, Extra large shows 3 or 7 days as columns on the iPad
  and stacked on a phone. Taps open the Calendar's Schedule at that day.
  The wall tablet's default layout shows the Calendar first, at Large.
  Calendar page and its scroll fetch behave exactly as before, now through
  one shared task query. Gauntlet green; gates pass; PR merged; production
  checked.
- **Out of scope:** checking off tasks on the dashboard; an hour timeline
  inside a widget; recurrence; habit and chore styles (W3); kitchen (W4);
  goals (W5); the tablet's own dashboard (mission 39 PR B); any migration.

## Decisions (Hill, 2026-11-07, decided for Bryce)

Hill ran from `.claude/agents/hill.md` through a general-purpose agent on
Fable (the `hill` agent type is not registered in this chat).

- **233 (high; medium on the phone cap):** Small: the next item that has
  not ended in the next 7 days, title up to 2 lines, muted line "Today,
  3:00 PM" / "Tomorrow, 9:00 AM" / "Thu, All day" (weekday from
  `SHORT_DAY_NAMES`, times from `formatTimeRange` / `formatAllDayLabel`).
  Medium: today, up to 3 rows then "+N more". Large: today as `DaySection`
  draws it (tasks, planned habits, events), up to 6 rows then "+N more".
  Extra large: one column per day, up to 5 rows each then "+N more". At
  phone width the days stack as rows, each day capped at 3 rows; an empty
  day is its header plus one muted "Nothing" line.
- **234 (high):** Extra large option "Days": "3 days" (default) and
  "7 days", both starting today.
- **235 (medium):** two `ToggleSwitch` rows in an "Options" section under
  Size in the edit view, off by default, saved in the widget's `options`.
  "Tasks only": tasks alone at every size; Small shows the next undone task
  due today through 6 days out. "Whole day": off hides events that have
  ended (completed tasks and done planned habits stay, struck); on keeps
  the whole day. Applies to Medium, Large and the today column of Extra
  large; Small always shows what is next. "Days" shows only while the size
  is Extra large; its value is kept across size changes.
- **236 (high):** Small is the link-shape `DashboardTile`: the whole tile
  opens `/calendar?date=YYYY-MM-DD&view=schedule` at the item's day (via
  `buildCalendarSearch`); with nothing coming up it opens `/calendar`.
  Medium, Large and Extra large are the panel shape: the header opens
  `/calendar`; a task or event row opens the Schedule at its day; a planned
  habit row keeps `HabitDayCard`'s link to `/habits/[id]`. No check-off.
- **237 (high):** `calendar` has `onTablet: true`, joins
  `DEFAULT_DASHBOARD_LAYOUT` first at Large; Add widget starts it at
  Large. Saved layouts do not change.
- **238 (high; medium on "Nothing else today"):** words, exact: kind label
  "Calendar". "Options", "Tasks only", "Whole day", "Days", "3 days",
  "7 days". Small empty "Nothing in the next 7 days"; Tasks only "No tasks
  in the next 7 days". Medium and Large empty "Nothing today"; items exist
  but all ended with Whole day off: "Nothing else today"; Tasks only "No
  tasks today". Extra large empty column "Nothing"; Tasks only "No tasks".
  Overflow via `DASHBOARD_WIDGET_WORDS.moreRows`. Customize second line:
  size, then ", Tasks only" when on ("Large, Tasks only"). Icon
  `CalendarDays`; Today's meals switches to `UtensilsCrossed` on its tile
  and preview (the drawer's Meal Plan icon).
- **239 (high):** Add shows the size strip only, as W1; options are set in
  the edit view afterwards.

For Bryce first: 235 (what "Whole day" means, done tasks stay), then 233's
phone stacking cap and 238's "Nothing else today".

Bryce (2026-11-07, after Fury explained the sizes, both options and the
tablet default in chat): "All your recommendations look good". So 233 to
239 are approved by Bryce, not only decided by Hill.

### After Strange pass 1 (Hill, 2026-11-07, decided for Bryce)

- **240 (medium):** Extra large "7 days" on a wide tile wraps:
  `repeat(auto-fill, minmax(13rem, 1fr))`, date order left to right then
  the next row (5+2 at 1180, 4+3 with Rail or Sidebar, 3+3+1 at 820
  upright). Phone keeps stacking. "3 days" stays one column per day.
  Caps unchanged (5, then "+N more"). Fallback if Bryce dislikes the half
  row: cap the grid at 4 columns.
- **241 (medium):** within each day's list (Medium, Large, every Extra
  large column), still to do first in Schedule's order (open tasks,
  planned habits not done, events; ended events kept in time order with
  Whole day on), then done things last (completed tasks, then done
  planned habits). The cap cuts from the end, so "+N more" hides done
  items first.
- **242 (high):** in the Calendar widget only, "+N more" is a tappable
  row at least 44px tall, full width, muted, left aligned, opening that
  day's Schedule via `buildCalendarSearch("schedule", day)`. Words
  unchanged (`DASHBOARD_WIDGET_WORDS.moreRows`). Habits and Chores tiles
  unchanged (decision 207; W3's call).
- **243 (high):** TaskCard's checkbox stays display only.

For Bryce first: 240 (the 3+3+1 upright look) and 241.

## Fury's structural calls

- **One task query:** new `src/lib/calendarTaskQuery.ts` (`server-only`,
  beside `calendarEventQuery.ts`): `getTasksInDueRange(dueStart, dueEnd,
  viewerUserId)` holds the select and the `CalendarTaskView` mapping. It
  takes the due-date bounds as given; each caller keeps its own bounds
  rule (the page's padded window, `fetchTasks`'s
  `localDayToAllDayInstant` conversion), so neither caller changes
  behavior.
- **The browser decides "today" and "now",** as the Calendar does
  (`useToday`, `useNowMinute`). The server loads a padded range (Denver
  today minus 1 day to plus 9 days); the widget's client component groups
  and filters it after hydration through a pure, tested
  `src/lib/calendarWidget.ts`, reusing `daysEventCovers` and the
  Calendar's own task and habit day matching. Before hydration the widget
  shows a skeleton the size of its cell (no hydration mismatch: event
  times are formatted with local getters).
- **Options are per kind:** `DashboardWidget` gains `options?`. A new pure
  `src/lib/dashboardWidgetOptions.ts` owns each kind's option shape,
  defaults and cleaner; `parseDashboardLayout` calls it, so bad or foreign
  options are dropped and only the calendar kind keeps any.
- **Extra large columns follow the tile's own container,** never `md:`:
  the tile is a `@container`, and its days sit side by side once it is
  wide (the 4 column grid), stacked otherwise.

## Danger register

From AGENTS.md, absolute for every agent:
- Local dev uses the Neon `dev` branch. A `DATABASE_URL` whose host is not
  the dev endpoint: stop and say so. No agent edits `.env`.
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
- Strange: a new visible widget and Customize controls. Viewports
  1180x820, 820x1180, 375, and 1180 with Sidebar and Rail.
- Captain: new lib files, a shared query moved out of a page, a parser
  change.
- Banner: one brief (2026-11-07), facts used below.

## Contracts

### C1 - the pure engine and the shared task query

- **Status:** DONE (commit after `7d5ea69`; Fury re-ran: 1354 tests pass in
  Denver and UTC, tsc errors only in DashboardWidgetPreview.tsx, the C2 file).
  Amended once (BLOCKED-ON-CONTRACT): may also export `compareEvents` from
  `scheduleWindow.ts` and add `formatClockTime` to `calendarDates.ts`.
  Judgment kept: times read "3 PM" (house style drops ":00").
- **Boundaries:** may touch: new `src/lib/calendarTaskQuery.ts`,
  `src/app/(app)/calendar/page.tsx` (its task query only),
  `src/app/actions/tasks.ts` (`fetchTasks` only), new
  `src/lib/dashboardWidgetOptions.ts`, `src/lib/dashboardWidgets.ts`,
  `src/lib/dashboardLayout.ts`, new `src/lib/calendarWidget.ts`, test
  files `src/lib/dashboardWidgets.test.ts`,
  `src/lib/dashboardLayoutParse.test.ts`,
  `src/lib/dashboardLayoutEdits.test.ts`,
  `src/lib/dashboardLayoutUpgrade.test.ts`, `src/lib/dashboardPicks.test.ts`,
  `src/lib/dashboardGrid.test.ts`, new
  `src/lib/dashboardWidgetOptions.test.ts`, new
  `src/lib/calendarWidget.test.ts` · must not touch: `src/components/`,
  `src/app/(app)/(home)/`, `prisma/`, `package.json`, `.env`, any doc.
- See the dispatch for the full spec.

### C2 - the widget on the dashboard (loader, tile, previews)

- **Status:** DONE (`3de21e9`; spec in the dispatch: loader with a padded
  Denver range, `CalendarWidgetTile` deciding today and now in the browser,
  container-variant columns for Extra large, Today's meals icon swap).

### C3 - Customize options (editor section, row second line, wiring)

- **Status:** DONE (`dc3a845`; parallel with C2: Options section with two
  ToggleSwitch rows and a Days Segmented while Extra large; row second line
  from `widgetRowDetail`).

### C4 - fix batch after pass 1

- **Status:** DONE (`ab035ff`, `b91e9e3`).
- **Objective:** fix Strange's B1 (decision 240) and B2, apply 241 and
  242, and the cheap Captain and Vision notes.
- **Fury's reading of 241:** `DaySection` draws tasks, then habit days,
  then events as groups, so 241 is applied to *which* items the cap keeps
  (priority: open tasks, open habit days, events, done tasks, done habit
  days) and, inside the tasks and habit groups, open before done. The
  groups keep DaySection's order on screen. Recorded for Bryce.
- **B2 approach:** Strange's cheaper version: the skeleton draws a day
  header plus rows up to each size's cap (Medium 3, Large 6, Extra large
  per column), so the tile never grows on load; it can only shrink on a
  light day. The server-count version was not taken: the loader runs in
  UTC on Vercel and the day matching uses local getters.
- **Boundaries:** may touch `src/components/CalendarWidgetTile.tsx`,
  `src/components/DaySection.tsx` (export the header only),
  `src/lib/calendarWidget.ts`, `src/lib/calendarWidget.test.ts`,
  `src/lib/dashboardLayout.ts` (comment and DEFAULT literal only),
  `src/lib/dashboardLoaders.ts` (imports only),
  `src/components/CalendarViews.tsx` (the stale comment only) · must not
  touch anything else.

## Gate ledger

Pass 1 (on `3de21e9`):
- **Vision: PASS.** Full Gauntlet re-run green (1354 tests; UTC 1347 pass
  plus 7 old skips; build OK; also run in 4 extra zones). Notes: Small
  ignores tasks unless Tasks only (as planned); a multi-day timed event
  reads "Today, All day" on Small; the ordering test uses `includes` and
  should pin the id; stacked doc comment in `dashboardLayout.ts`; 7
  columns at 820 are about 100px.
- **Captain: PASS.** Notes: export `DaySectionHeader` from `DaySection`
  instead of the drifted local copy; the "All day" word is defined twice;
  stacked comment; DEFAULT literal back to the plain map; merge the two
  constants imports in `dashboardLoaders.ts`; stale comment at
  `CalendarViews.tsx:44`. Drafted STRUCTURE.md amendments A-49-1 to
  A-49-4 (written at delivery).
- **Strange: BLOCKED.** B1: Extra large at 7 days is unreadable on every
  iPad width (147px columns at 1180, 95px at 820, titles break mid-word).
  B2: the skeleton is one `h-24` block, so the dashboard jumps about
  300px when Large loads (every wall tablet load). Notes: finished items
  use the row limit before events still to come; "+N more" can't be
  tapped; TaskCard's checkbox looks live; Whole day doesn't dim ended
  events (older, Schedule does the same); `nextItemWhen` "All day" for a
  timed event begun yesterday; older dev bug: Settings actions 500 with
  "HabitInput is not defined" (`src/app/actions/habits.ts:36`, follow-up).
  B1, and the order and "+N more" notes, go to Hill as design calls.

Pass 2 (on C4, `ab035ff` and `b91e9e3`):
- **Vision: BLOCKED** on B2 only (Gauntlet green, 1357 tests; boundaries
  clean; sort reaches no other caller; `more` never negative; no nested
  link; DEFAULT unchanged; skeleton hydration safe). The skeleton's 48px
  rows and `gap-1` under-size the real 72px cards and `gap-2`.
- **Strange: BLOCKED** on B2 only. B1 PASS (no column under 208px:
  210 at 1180, 238 at 820, 248 Rail, 273 Sidebar), 241 PASS, 242 PASS
  (44px link, not nested, lands on the day), headers PASS, 375 light and
  dark PASS. Measured growth on load: Large +200, XL 3 days at 820 +240.
  Note: with Sidebar at 1180 the 7 days are 3+3+1, not 4+3 as 240 says
  (the rule is right, the wording was off).
- Fury chose Strange's option (b): rows reserve the two-line event card
  (96px), plus header and "+N more", so the tile only shrinks. C5.

### C5 - skeleton reserves the tallest rows

- **Status:** DONE (`d591902`). May touch only `CalendarSkeleton` in
  `src/components/CalendarWidgetTile.tsx`.

Pass 3 (on `d591902`):
- **Vision: PASS.** Gauntlet green (1357). Boundary clean. Skeleton equals
  the real tallest shape for Medium (352px) and Large; XL cells are the
  maximum. Notes: task and planned-habit titles have no line clamp, so a
  3+ line title can still grow a row a few px (follow-up: `line-clamp-2`
  when `compact`); the Small skeleton is 48px against up to 60px real
  (older than B2).

- **Strange: PASS** (pass 3, `d591902`). The tile only shrinks on load
  in every case measured (Medium 1180 430 to 318; Large 778 to 618; XL 3
  days 820 674 to 606; XL 7 days 820 1890 to 1174). Note: for 7 days the
  skeleton is 500 to 760px taller than the loaded tile (shown about 15ms);
  reserving fewer rows per day for 7 days would shorten that.
- Captain was not re-run: his pass 1 PASS stands, and C4/C5 applied his
  notes. STRUCTURE.md amendments A-49-1 to A-49-4 written at delivery
  (A-49-4 adopted, since `DaySectionHeader` now exists).

## Delivery

- Commits: `14560ae` C1, `dc3a845` C3, `3de21e9` C2, `ab035ff` and
  `b91e9e3` C4, `d591902` C5, then the records commit.
- Records: STRUCTURE.md A-49-1 to A-49-4; CLAUDE.md Current status and a
  Calendar widget check on Bryce's checklist.
- For Bryce to look at first: 240 (the wrapped 7 days, 3+3+1 upright),
  241 (done items sink), then Fury's reading of 241 (groups keep
  DaySection's order; done items lose their spot first).
- Leftovers (not this mission):
  - Task and planned-habit titles have no line clamp in `compact`, so a
    long title can still grow a row a few px on load.
  - The Small skeleton is 48px against up to 60px real.
  - 7 days' skeleton is much taller than a light week.
  - Small reads "Today, All day" for a timed event that began yesterday.
  - Whole day does not dim ended events (Schedule does the same).
  - Dev only: Settings actions fail with "HabitInput is not defined"
    (`export type { HabitInput }` in the "use server" file
    `src/app/actions/habits.ts`).

## Handoff log

- 2026-11-07: mission opened. Mission 46 marked DELIVERED. Banner brief
  in. Hill's calls 233 to 239 in. C1 dispatched.
- 2026-11-07: Bryce approved 233 to 239. C1 DONE and committed. Fresh
  worktree needed `npx prisma generate` and `npm ci` (no file changes).
  C2 and C3 dispatched in parallel.
- 2026-11-07: C4 and C5 fixed Strange's B1 and B2 and applied 240 to
  242. All gates PASS. Records written.
