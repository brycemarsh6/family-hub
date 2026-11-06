# Mission: Habits & Chores PR E1, the dashboard tiles (mission 34)

**Project:** family-hub (Marshee)
**Status:** GATING (C1 to C3 built; Hill decided 131 to 146)
**Started:** 2026-11-05 · **Updated:** 2026-11-05
**Branch:** `claude/habits-e-dashboard` (from origin/main b2654b4)

## Brief

- **Goal:** the first half of "PR E, mission 34: the dashboard" in
  `.avengers/plans/habits-chores-build.md`, with decisions 13, 30, 34, 44,
  48, 49, 51 and 61 in `.avengers/plans/habits-chores-v1.md`.
- **Split (Fury's structure call, 2026-11-05):** the build plan's PR E is
  two PRs so each dispatch and each gate pass stays small. **E1 (this
  mission):** the Habits and Chores tiles, the item picker for Habits and
  Goals (44, 49), drag to reorder in Customize (61), the nudge note and the
  Sunday card on the dashboard (34, 51). **E2 (mission 35):** plan-the-day
  prompts, planned-today rows, planned days on the Calendar (36 to 41).
  PR F (report and idea library) becomes mission 36.
- **Done means:** on production a person sees the Habits and Chores tiles
  on the dashboard, checks an item there, opens Customize, drags a tile to
  reorder it, and chooses which habits and goals their tiles show; the
  nudge note and Sunday card show at the top when they apply. Gauntlet
  green; Vision, Strange and Captain PASS.
- **Out of scope:** everything in E2; PR D leftovers except those in a
  contract below; the greeting from the mock unless Hill rules it in.
- **Never blocks on Bryce.** Hill decides; Bryce's phone check goes on his
  checklist after merge.

## Danger register

- Same as mission 33. Local dev is the Neon `dev` branch; **before any
  Prisma command that reaches a database, Fury confirms `DATABASE_URL`'s
  hostname starts `ep-hidden-pine-`** (hostname only, never print `.env`).
- Forbidden: `npm run db:seed`, `npm run db:reset`, `prisma migrate reset`,
  `prisma db push`, `prisma migrate dev`. Stark never touches the database.
- **No migration expected** (the layout JSON lives in an existing column;
  `HabitPlannedDay` already exists for E2). If one turns out to be needed,
  additive only, Fury reads it line by line and applies with `migrate
  deploy`.
- The dev branch holds real family data. **No script touches `User` rows.**
- Stage by explicit path; `git show --stat HEAD` after every commit. Merge
  is Fury's once every gate passes and the Gauntlet is green.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (842 at origin/main b2654b4; must rise)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts` (7 old DST skips)
- the same with `TZ=America/Los_Angeles`
- `DATABASE_URL=postgresql://u:p@invalid.invalid:5432/none DIRECT_URL=<same> npm run build >/dev/null 2>&1; echo EXIT=$?`
- `node ~/.claude/skills/avengers/recordcheck.mjs origin/main..HEAD`

## Assembled

Stark; Vision (`model: "fable"`), Strange and Captain (`model: "opus"`);
Hill (Fable, xhigh) for every would-be Bryce decision. Banner ran once.
3 passes per gate.

## Facts (Banner, 2026-11-05, at origin/main b2654b4)

- Registry `src/lib/dashboardWidgets.ts:7` has five ids; layout
  `dashboardLayout.ts:14-17` is `{ version: 1, widgets: { id, enabled }[] }`
  and the parser rebuilds entries as `{ id, enabled }` (`:65`), so an
  `items` field would be dropped today. It never imports `db` (`:7-10`), so
  item ids are checked in the loader, not the parser. Missing registry ids
  are spliced in after the nearest earlier id (`:67-73`).
- `(home)/page.tsx:62` `isDevice`; `:69-107` one `Promise.all` of loaders;
  `:153-221` the tiles record; `:223` `DashboardWidgetList`.
- `DashboardWidgetList.tsx:36-52` saves with its own `useOptimistic`, not
  `useOptimisticRun` (STRUCTURE.md:235-237 left it out on purpose).
  `DashboardCustomizeSheet.tsx:87-104` has up/down arrows; `moveWidget`
  (`dashboardLayout.ts:93`) has one caller.
- `SortableList.tsx` is generic (`items`, `label`, `onReorder`,
  `renderItem(item, { grip, dragging })`), has a KeyboardSensor, and is the
  only `@dnd-kit` importer; one consumer (`HabitManager.tsx:142`).
- Goals tile: `goalsRead.ts:155-162` `loadGoalsTile` -> `weekTodo(inScope,
  3)`; ids are PlanItem ids (`goalsProgress.ts:141`). No flat list of a
  person's plan items exists for a picker.
- Habits: `habitsRead.ts:121-169` `loadTodayPage` -> `TodayPage` with
  `rows` (`HabitRowView`, `habitsToday.ts:54-82`), `manage`, `nudges`,
  `choreStreak`, `shoutOut`. `buildTodayRows` drops "none" rows unless
  carried, done or skipped (`:249`). Nudge cards `NudgeCard.tsx:15`; the
  Sunday card is inline in `HabitTodayList.tsx:124-127`.
- Habit actions revalidate `/habits` and `/plans`, not `/`
  (`habitChecks.ts:55-56`).
- STRUCTURE.md: `habitsRead.ts` and `habitsStatsRead.ts` are the only
  habit readers (`:347-350`, a third is a BLOCKER); `dashboardWidgets.ts`
  the only registry and `parseDashboardLayout` the only layout reader
  (`:446-452`); components never gate on role (`:169-173`).
- Sizes: `habitsRead.ts` 265, `habitsToday.ts` 339, `(home)/page.tsx` 224,
  `DashboardCustomizeSheet.tsx` 126, `dashboardLayout.ts` 124,
  `HabitTodayList.tsx` 204, `habitWrites.ts` 364 (over the soft cap).
- E2 facts kept for mission 35: `isPromptDay` (`planPrompts.ts:20-31`)
  ignores the period of a planned day; `habitsToday.ts:214` always passes
  `planned = false`; `HabitPlannedDay` exists (`schema.prisma:1048`) with
  no reader or writer; `CalendarTaskView` has no `href` and its tap opens
  `TaskDetailSheet`, so a planned habit needs its own calendar item type;
  calendar queries need `canSeeHabit` for private habits.

## Structure calls (Fury)

- `loadDashboardHabits` lives in `habitsRead.ts` (keeps the two-reader
  rule; about 305 lines after). A pure builder for the tiles goes in a new
  `src/lib/habitsDashboard.ts` with tests, so `habitsToday.ts` (339) does
  not grow.
- `items` is parsed by `parseDashboardLayout` as a list of strings (shape
  only); the page's loader drops ids that are not that person's.
- Habit check actions also `revalidatePath("/")`.
- `DashboardWidgetList` moves onto `useOptimisticRun` while it is open
  (closes the STRUCTURE.md leftover).

Hill decided 131 to 146 (plan, "Before PR E"); E1 uses 131 to 140.
Fury added the DashboardTile second-shape line to DESIGN.md (132).

## Contracts

### C1 - Layout items and tile builders, pure, with tests
- **Status:** DONE (Stark; Fury re-ran tsc, 862 tests Denver, 862 with 7 DST skips UTC). With picks the tile never says "All done for today" (done picked rows stay visible); a null tile still leaves an empty grid cell until C2.
- **Objective:** the registry gains `habits` ("Habits") and `chores`
  ("Chores today"), full, on by default, after `todayMeals` (131); the
  layout keeps an optional `items: string[]` per widget; pure builders for
  the two tiles and for the Goals tile with picks.
- **Boundaries:** `src/lib/dashboardWidgets.ts`, `src/lib/dashboardLayout.ts`
  (+test): `items` parsed as an array of unique non-empty strings, capped
  at 50, kept on round trip, only on `habits` and `goals`; a pure
  `setWidgetItems(layout, id, items)`. New `src/lib/habitsDashboard.ts`
  (+ `habitsDashboard.test.ts`): `habitsTileRows(rows, picks)` (132),
  `choresTileRows(rows)` (133), the empty-line choice (132, 133), and
  `pickableHabits(manage)` (137: kind habit, not archived). Goals: a pure
  `weekTodoForGoals(...)` beside `weekTodo` in `src/lib/goalsProgress.ts`
  (+test) (136). Words in `habitVocabulary.ts` and the goals vocabulary
  file they belong to.
- **Must not touch:** components, pages, actions, `prisma/`, records.
- **Verification:** full gauntlet; tests cover: an old layout gains both
  tiles after todayMeals; `items` survives a round trip and is dropped on
  other widgets and on bad shapes; picked order kept; a picked habit with
  nothing due is left out; no picks gives at most three due and not done
  (carried counts); both empty lines; chores leave out skipped, week-skipped
  and vacation rows and keep done ones; goals with picks.

### C2 - Reader, page, cards, revalidation
- **Status:** DONE (Stark; Fury re-ran tsc, 867 tests, build EXIT=0). Added `src/lib/dashboardPicks.ts` (+test: `keepOwnPicks`, `layoutForViewer`), `HabitsTile.tsx` (exports `HabitTileRows`), `ChoresTile.tsx`, `ChoreShoutOutCard.tsx`, `DashboardTile` `shape="panel"`, a `notes` slot on `DashboardWidgetList`. The layout is read before the other loaders. `pickable` lists returned for C3, not yet wired.
- **Objective:** the dashboard renders the two tiles, the Goals tile with
  picks, and the nudge and Sunday cards (139); the tablet gets neither
  tile (138); a check on the dashboard updates it.
- **Boundaries:** `src/lib/habitsRead.ts` (`loadDashboardHabits(viewer,
  today)`, built on the Today loader, returns tile rows, chore streak,
  nudges, shoutOut, pickable habits), `src/lib/goalsRead.ts` (the Goals
  tile with picks and the goal list for the picker: Mine and Together, not
  completed, by target date), `src/app/(app)/(home)/page.tsx` (drop ids
  that are not the viewer's; device layout leaves out habits and chores),
  `src/components/DashboardTile.tsx` (the second shape), new
  `HabitsTile.tsx` and `ChoresTile.tsx` (use `HabitRow` and the same
  check actions and `useOptimisticRun` as `HabitTodayList`),
  `GoalsTile.tsx`, the Sunday card moved into its own component used by
  both `HabitTodayList.tsx` and the dashboard, `NudgeCard.tsx` reuse,
  `src/app/actions/habitChecks.ts` and `habitNudges.ts`
  (`revalidatePath("/")` too).
- **Must not touch:** `prisma/`, the Customize sheet (C3), records.
- **Rules:** 131 to 134, 136, 138, 139; DESIGN.md's DashboardTile second
  shape; components never gate on role; private habits follow
  `habits/access.ts`.

### C3 - Customize: drag to reorder and the picker
- **Status:** DONE (Stark; Fury re-ran tsc, eslint ., 875 tests, build EXIT=0). New `dashboardPicker.ts` (+8 tests), `DashboardItemPicker.tsx`. Stark's own words: "No habits yet.", "No goals yet.", "Back to Customize" (screen reader). A failed layout save now shows the shared `SAVE_FAILED` message.
- **Objective:** Customize reorders with `SortableList` (140) and the
  Habits and Goals rows open the picker view (137).
- **Boundaries:** `src/components/DashboardCustomizeSheet.tsx` (may split
  into a `DashboardItemPicker.tsx`), `src/components/DashboardWidgetList.tsx`
  (moves onto `useOptimisticRun`; closes the STRUCTURE.md leftover),
  `src/app/actions/preferences.ts` only if the save needs it.
- **Rules:** 137, 140; one sheet, a back control; ToggleSwitch per item;
  grips 44px; no stacked modals.

### C4 - Records
- Mission ledger, plan, CLAUDE.md status and Bryce's checklist, STRUCTURE.md
  homes (`habitsDashboard.ts`, the new tiles, the picker, the
  `DashboardWidgetList` leftover closed).

## Gate ledger

### Pass 1 (at 4c0caca): all three BLOCKED
- **Vision (Fable): 1 blocker.** With picks, `habitsTileRows` drops
  `dueState === "open"` rows that Today shows (132 says open rows show);
  the test pins the wrong behaviour. Notes: a toggle and a drag in one
  frame would last-write-win (unproven); a drag in the picker drops stale
  picks; a chore done on a vacation day leaves the Chores tile (to Hill).
- **Captain (Opus): 2 blockers.** (1) `(home)/page.tsx` awaits the layout
  read before its `Promise.all` (the DAL session read is the only
  sanctioned sequential read); chain the two pick loaders onto one layout
  promise inside the `Promise.all`. (2) `DashboardCustomizeSheet` repeats
  the pickable list (`=== "habits" || === "goals"` and a cast); use one
  `isPickableWidget` guard and `PickableWidgetId` from
  `dashboardWidgets.ts`. Notes: fold `splitPicks`/`togglePick` into
  `dashboardPicks.ts` and `reorderWidgets` into `dashboardLayout.ts`,
  delete `moveWidget` and its tests; `dashboardLayout.test.ts` 373 lines;
  a third chore-flame copy (use `streakLabel`/`STREAK_MIN_SHOWN`, with an
  amendment); `HabitsTile` copies Today's tap routing (one `habitRowTaps`);
  three STRUCTURE.md text corrections; `HabitsTile` type name clash;
  `DASHBOARD_PICKER_LABELS` belongs beside the registry.
- **Strange (Opus): 2 blockers.** (1) A chore skipped from the tile
  vanishes in about 3s (the "/" refresh is not "the next load", 133); same
  for a no-picks habit checked from the tile. Keep tapped rows in place
  until a real load. (2) "Reset to default" shows inside the picker views
  and resets everything. Notes: an empty 16px strip under the last tile
  row; a switch jumps sideways between Showing and Not showing (spacer);
  the panel header gives no sign it is a link (to Hill); Goals tile with
  picks has no "picked" label (to Hill); the dialog's name stays
  "Customize dashboard" in the picker. Not covered: nudge card, Sunday
  card, chore flame at 2+, tablet, real touch drag in the sheet.
- **Danger register (Strange, outside scope):** `.env` holds a
  commented-out production `DATABASE_URL` line (host `ep-hidden-surf-`).
  Not active, but AGENTS.md says no dev environment holds it. Surfaced to
  Bryce; no agent edits `.env`.

Hill decided 147 to 150 on the pass 1 notes (plan, "Before PR E").

### F1 - Every pass 1 blocker, Hill's 147 to 150, the cheap notes
- **Status:** DONE (Stark; Fury re-ran tsc, eslint ., 879 tests Denver, 879 with 7 DST skips UTC, build EXIT=0). `keepShownRows` in `habitsDashboard.ts` (+5 tests); `habitRowTaps` lives in `HabitsTile.tsx`; a `key` from the picks on `HabitsTile` in page.tsx (not asked: remounts the tile when picks change); `dashboardPicker.ts` folded away; items tests in `dashboardLayoutItems.test.ts`. Fury wrote Captain's STRUCTURE.md corrections and the streak-label rule.
- **Vision:** `habitsTileRows` with picks keeps every row Today produced
  (open rows included); fix the test that pinned the wrong behaviour.
- **Captain 1:** `(home)/page.tsx` starts the layout read as a promise
  inside the one `Promise.all`; only the Goals and Habits loaders chain on
  it; nothing else waits.
- **Captain 2:** `dashboardWidgets.ts` exports `PickableWidgetId` and
  `isPickableWidget`; `dashboardLayout.ts`, `DashboardCustomizeSheet.tsx`
  (no cast, `PICKERS` typed by it) use them (`DashboardWidgetList.tsx` needs neither; Captain pass 2).
- **Strange 1 / 147:** `HabitTileRows` keeps the rows shown at load until
  a real page load: a tapped row stays in place with its optimistic change
  when a refresh drops it, and no new row slides in. Put the pure part
  (merge of shown rows with fresh rows) in `src/lib/` with tests.
- **Strange 2:** "Reset to default" renders only on the main Customize
  view, never inside a picker.
- **148:** panel header gets the `ChevronRight` (18, `text-muted`,
  `aria-hidden`, `ml-auto`, `shrink-0`).
- **149:** Goals tile heading "Still to do in the goals you picked:" when
  goal picks exist (word in the goals vocabulary).
- **150:** `choresTileRows` keeps any chore done today; only undone
  excused rows leave; test.
- **Cheap notes:** fold `splitPicks`/`togglePick` into `dashboardPicks.ts`
  (delete `dashboardPicker.ts`, merge tests) and `reorderWidgets` into
  `dashboardLayout.ts`; delete `moveWidget` and its tests; if
  `dashboardLayout.test.ts` is still over 350, move the `items` cases to
  `dashboardLayoutItems.test.ts` with a header naming its sibling. Use
  `streakLabel`/`STREAK_MIN_SHOWN` in the three chore-flame copies
  (`HabitTodayList`, `HabitFamilyColumn`, `ChoresTile`). One
  `habitRowTaps(row, run)` used by both `HabitTodayList` and
  `HabitTileRows`. Rename the lib type `HabitsTile<T>` to `TileRows<T>`.
  Move `DASHBOARD_PICKER_LABELS` beside the registry in
  `dashboardWidgets.ts`. Tile lists: no empty strip under the last row
  (`-mb-4 border-t` and `overflow-hidden` on the panel). Picker: a
  `w-11 shrink-0` spacer on Not showing rows so switches don't jump; the
  dialog's accessible name follows the picker title.
- **Boundaries (may touch):** every file in the pass 1 diff
  (`git diff --name-only origin/main...HEAD -- src`), plus
  `src/components/HabitFamilyColumn.tsx`, new tests in `src/lib/`.
  Must not touch: `prisma/`, `.env*`, `package.json`, records
  (STRUCTURE.md, DESIGN.md, plan, mission, CLAUDE.md).
- **Verification:** full gauntlet in three zones, `npx eslint .`, build
  EXIT=0; `git grep -n 'moveWidget' src` empty; `git grep -n
  '"habits" ||' src/components` empty.

### Pass 2 (at 5d7bcfc)
- **Captain (Opus): BLOCKED, 1.** `dashboardLayout.test.ts` header did not
  name its new sibling; Fury added the line (comment only). Both pass 1
  blockers and every note verified; STRUCTURE.md text matches the code.
  Fury applied the two wording fixes (`habitRowTaps` scoped to Today rows
  with `HabitFamilyView` named as the family-row twin; a stray full stop).
  Notes: move `habitRowTaps` to its own file if a third user appears;
  `habitsRead.ts`, `dashboardLayout.test.ts`, `habitVocabulary.ts` and
  `(home)/page.tsx` are each 50 to 65 lines under the soft cap.
- **Vision (Fable): BLOCKED, 1.** `HabitTileRows` updates `held` at tap
  time, so a failed save leaves a held-only row in a state the server never
  had (check succeeds, refresh drops it, offline undo fails: row shows
  undone under the error). Fix: update `held` in `useOptimisticRun`'s
  onSuccess. Notes: a held-only row freezes its streak label one behind;
  an archived habit stays until reload; the chained layout promise is
  sound; `key` uses raw picks (harmless).
- **Strange (Opus): PASS.** Both blockers fixed and 148, 149, 150, the
  strip, the switch spacer, the dialog name, picks updating the tile and
  open-kind picks all seen at 375 and 820, light and dark. Notes: the kept
  row's streak lags (same as Vision's); one full page reload after a chore
  skip in dev (likely the dev server's live reload; watch on the phone);
  the dialog's height changes at 820; Today's dashed skip marker looks
  tappable (pre-existing). Not covered: real finger drag, 150 with an
  excuse, nudge and Sunday cards, flame at 2+, the tablet.

### F2 - Held rows follow the server
- **Status:** OPEN.
- **Vision blocker:** in `HabitTileRows` (`src/components/HabitsTile.tsx`)
  update `held` only on a successful save (`useOptimisticRun`'s third
  argument); the optimistic change stays eager. Fix the `held` comment.
- **Streak lag (both gates' note):** `loadDashboardHabits`
  (`src/lib/habitsRead.ts`) also returns the viewer's full Today rows for
  the tile's shown ids (or all of them), and `keepShownRows`
  (`src/lib/habitsDashboard.ts`) prefers that server row for a shown id
  the tile filter dropped, falling back to `held` only when the server no
  longer has the row. Tests for both paths.
- **Boundaries:** `src/components/HabitsTile.tsx`, `src/components/ChoresTile.tsx`,
  `src/lib/habitsDashboard.ts` (+test), `src/lib/habitsRead.ts`,
  `src/app/(app)/(home)/page.tsx` (passing the extra rows only). Must not
  touch: `prisma/`, `.env*`, records.
- **Verification:** full gauntlet in three zones, build EXIT=0.
