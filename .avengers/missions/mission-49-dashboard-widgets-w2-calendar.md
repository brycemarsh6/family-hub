# Mission 49: Dashboard widgets v2, step W2 (the Calendar widget)

**Project:** family-hub (Marshee)
**Status:** BUILDING
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

- **Status:** PENDING
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

- **Status:** PENDING (after C1)

### C3 - Customize options (editor section, row second line, wiring)

- **Status:** PENDING (after C1, parallel with C2: disjoint files)

## Gate ledger

(empty)

## Handoff log

- 2026-11-07: mission opened. Mission 46 marked DELIVERED. Banner brief
  in. Hill's calls 233 to 239 in. C1 dispatched.
