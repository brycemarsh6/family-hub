# Mission 43: Dashboard widgets v2, step W1 (sizes, grid, Customize sheet)

**Project:** family-hub (Marshee)
**Status:** AT-THE-GATES
**Started:** 2026-11-06 · **Updated:** 2026-11-06
**Branch:** `claude/dashboard-customizable-widgets-a9d4c0` (from `origin/main` at `a1f9b6e`)
**Plan:** `.avengers/plans/dashboard-widgets-v2.md` (W1 of W1 to W5)

## Brief

- **Goal:** the dashboard becomes a collage of widgets the person sizes
  themselves, like iPhone widgets. Each widget is its own instance (a kind
  may be added more than once), has a size (Small 1x1, Medium 2x1, Large
  2x2, Extra large full width x2), and is added, resized, picked, reordered
  and removed in the Customize sheet through swipeable size previews. The
  grid is 2 columns on phones and 4 from `md` (768px) up.
- **Done means:** the Gauntlet passes; a person's saved v1 layout opens
  looking the same as before (same widgets, same order, same widths); in
  Customize they can add a widget (including a second Habits widget with its
  own picks), change a widget's size, reorder, remove, and Reset, and every
  change saves and survives a reload; the grid packs correctly at 375 / 390
  (2 columns) and 820 / 1180 (4 columns); the wall tablet still gets the
  default layout minus Habits and Chores and no Customize button.
- **Out of scope:** new widget content (calendar W2, habit styles W3,
  kitchen W4, goals W5); per-size *styles* (the registry gains them in W3);
  per-kind `options` (W2); widening the page past `max-w-3xl` (decision 203);
  mission 39's tablet layout; any database migration.

## Bryce's decisions (2026-11-06, this chat)

1. Four sizes: Small, Medium, Large, Extra large.
2. Duplicates allowed; widgets are added and removed (no on/off switch).
3. Size and style are chosen in the Customize sheet with swipeable previews.
4. Ship in steps, one PR each (W1 to W5).
5. Bryce asked Hill to decide this mission's design calls (he is busy).

## Hill's decisions (200 onward)

Decided by Hill 2026-11-06 (Bryce delegated: "Please call agent hill I'm busy").

- **200 (medium):** W1 sizes: Inventory S/M, Grocery S/M, Recipes S/M,
  Today's meals M only, Goals M only, Habits M/L, Chores M/L. Habits and
  Chores at Medium show up to 3 rows plus a muted "+N more" line; Large shows
  every row the tile lists today. Defaults keep today's dashboard: meals M,
  habits L, chores L, goals M, inventory S, grocery S, recipes M. Meals and
  Goals gain Large in W4 / W5. (Narrows the plan's M/L for those two.)
- **201 (medium):** rows are `minmax(~150px, auto)`: they grow to fit, nothing
  is ever cut; Large and Extra large span two rows. (Amends the plan's
  fixed row height.)
- **202 (high):** a later Small fills an earlier hole; order otherwise kept;
  explicit placement from `packWidgets`, never `grid-auto-flow: dense`.
- **203 (medium):** keep the 768px cap in W1 (4 columns of ~172px). Widening,
  through a new opt-out attribute and not `data-fills-width`, comes with the
  first Extra large widget (W2).
- **204 (high):** "Remove widget" at the bottom of the edit view: one tap, no
  confirmation, optimistic; a failed save puts it back with the inline error.
- **205 (high):** every kind may be added more than once; in "Add a widget" a
  kind already on the dashboard shows a muted second line "On your dashboard".
- **206 (high):** edit view: horizontal swipe strip of drawn previews (not live
  data), one per allowed size, dots under it, current size marked; tap picks
  and saves at once. Add: tap a kind, same strip with its default size
  selected, tap a size, a 48px "Add widget" button appends at the end and
  returns to the list. One size: one preview, no dots. Previews are real
  buttons.
- **207 (high):** wording. Title "Customize dashboard"; row = name with the
  size in muted text under it; sizes "Small" / "Medium" / "Large" / "Extra
  large"; buttons "Add widget" (bottom of the list, above "Reset to
  default"), "Remove widget", "Back to Customize", "Reset to default", "Pick"
  (in the edit view, above Remove widget); Add view title "Add a widget";
  edit view title = the widget's name; strip label "Size"; empty dashboard
  "Your dashboard is empty." / "Tap Customize to add widgets."; Medium
  overflow "+2 more" as plain muted text, no link.
- **208 (high):** drag grip stays on the right of each row; tapping elsewhere
  on the row opens its edit view; the row shows a right chevron; rows stay at
  least 56px tall.

For Bryce first: 200, 201, 203.

## Fury's structural calls (Bryce: "You recommend on structure")

- **No `data-fills-width`.** The plan named it, but that attribute also
  pins `<main>` to one screen height for Whole family's scrolling columns
  (`AppChrome.tsx:92`). The dashboard keeps `max-w-3xl`; 4 columns fit.
- **Layout JSON v2, same text column, no migration.** `parseDashboardLayout`
  upgrades v1 on read using v1's own pairing rule, so a lone half widget that
  rendered full keeps rendering full (as Medium).
- **Deterministic uids** (`habits`, `habits-2`, ...), made by one pure
  helper, so the parser, the upgrade and Add share one rule and tests need
  no randomness.
- **The packer owns placement.** `packWidgets` returns explicit rows and
  columns for 2 and 4 columns; the DOM stays in the person's list order and
  CSS custom properties place each cell per breakpoint.
- **Loaders load per kind, picks apply per instance.** `loadDashboardHabits`
  and `loadGoalsTile` lose their `picks` argument; pure per-instance helpers
  apply each widget's picks to the one load.

## Danger register

From AGENTS.md, absolute for every agent:
- Local dev uses the Neon `dev` branch. A `DATABASE_URL` whose host is not
  the dev endpoint: stop and say so. No agent edits `.env`.
- `npm run db:seed` and `npm run db:reset` are forbidden. No clean or reset
  script for `User`. No migration in this mission at all.
- The dev branch holds real family data: private.
- Never `git add -A` / `git add .`; stage by explicit path; `git show --stat HEAD` after each commit.
- Direct pushes to `main` are blocked; branch, PR, Gauntlet green, merge.

## Gauntlet

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always).
- Strange: the dashboard and the Customize sheet change visibly.
- Captain: new files (`dashboardGrid.ts`, `dashboardLoaders.ts`, gallery and
  preview components), a registry and parser rewrite, a large diff.
- No Banner: two Explore briefs were already gathered in planning.

## Contracts

### C1 - the pure engine (registry v2, layout v2 with v1 upgrade, packer, picks)
- **Status:** DONE (1191 tests pass, Fury re-ran; tsc errors only in page.tsx, DashboardCustomizeSheet.tsx, DashboardWidgetList.tsx)
- **Boundaries:** may touch: `src/lib/dashboardWidgets.ts`,
  `src/lib/dashboardLayout.ts`, `src/lib/dashboardPicks.ts`,
  new `src/lib/dashboardGrid.ts`, `src/lib/dashboardLayout.test.ts`,
  new `src/lib/dashboardLayoutUpgrade.test.ts`,
  `src/lib/dashboardLayoutItems.test.ts`, `src/lib/dashboardPicks.test.ts`,
  new `src/lib/dashboardGrid.test.ts` · must not touch: anything under
  `src/app/`, `src/components/`, `prisma/`, `package.json`, any other file under src/lib/.
- **Spec:**
  - `dashboardWidgets.ts`: `DASHBOARD_WIDGET_KINDS` (renamed from
    `DASHBOARD_WIDGET_IDS`, same 7 values, same default order) and
    `DashboardWidgetKind`. `WIDGET_SIZES = ["s","m","l","xl"]`,
    `WidgetSize`, `WIDGET_SIZE_LABELS` (`Small`, `Medium`, `Large`,
    `Extra large`). Each `DASHBOARD_WIDGETS[kind]`:
    `{ label, sizes (non-empty, in WIDGET_SIZES order), defaultSize, onTablet }`.
    Sizes (decision 200): inventory s,m (default s); grocery s,m (s);
    recipes s,m (m); todayMeals m (m); goals m (m); habits m,l (l);
    chores m,l (l). `onTablet` is false for habits and chores only.
    Keep `PICKABLE_WIDGET_IDS` / `isPickableWidget` / `PickableWidgetId`
    (typed over kinds), `DASHBOARD_PICKER_LABELS`, `MAX_WIDGET_ITEMS`. Add
    `MAX_DASHBOARD_WIDGETS = 30`. Remove `width` and `defaultEnabled`.
  - `dashboardLayout.ts`: `DashboardWidget = { uid; kind; size; items? }`,
    `DashboardLayout = { version: 2; widgets: DashboardWidget[] }`.
    `DEFAULT_DASHBOARD_LAYOUT`: every kind in default order at its
    `defaultSize`, uid = the kind.
    `nextWidgetUid(taken: Iterable<string>, kind)`: the kind itself if free,
    else `${kind}-2`, `-3`, ... the smallest free.
    `parseDashboardLayout(raw)` never throws:
    - string: JSON.parse, failure gives the default; non-object gives the default.
    - `version: 1`: repair exactly as today's v1 parser does (unknown ids
      dropped, duplicates removed first wins, missing registry ids inserted
      enabled after the nearest earlier present id), then keep enabled
      widgets in order, sized by v1's pairing rule: two consecutive enabled
      half widgets (inventory, grocery) become `s`; a half widget with no
      half neighbour becomes `m`; full widgets get their `defaultSize`. uid =
      kind. Picks kept for pickable kinds.
    - `version: 2`: keep entries in order; drop non-objects and unknown
      kinds; a size not in the kind's `sizes` snaps to the nearest allowed by
      position in `WIDGET_SIZES` (a tie goes to the smaller); a missing or
      invalid size gives `defaultSize`; a uid that is not a string matching
      `/^[A-Za-z0-9_-]{1,40}$/`, or repeats an earlier uid, is replaced by
      `nextWidgetUid`; `items` cleaned as today (pickable kinds only);
      at most `MAX_DASHBOARD_WIDGETS` entries. Missing kinds are NOT
      inserted (removal is deliberate). An empty list stays empty.
    - any other version: the default.
    Edits (all pure, return new layouts, never mutate): `addWidget(layout,
    kind, size)` (appends with `nextWidgetUid`, snaps size, no-op at the
    cap), `removeWidget(layout, uid)`, `resizeWidget(layout, uid, size)`
    (snaps), `setWidgetItems(layout, uid, items)` (pickable kinds only, empty
    clears), `reorderWidgets(layout, uids)` (same stale-drop safety as
    today). Remove `toggleWidget` and `widgetSpans`.
  - `dashboardPicks.ts`: `picksOf(widget)` takes one widget and returns its
    items or `[]`. `layoutForViewer(layout, isDevice)` drops kinds whose
    `onTablet` is false. `keepOwnPicks`, `splitPicks`, `togglePick`
    unchanged. Imports only `dashboardLayout.ts` / `dashboardWidgets.ts`.
  - `dashboardGrid.ts` (new, pure): `cellsOf(size, columns)` gives
    `{ w, h }`: s 1x1, m 2x1, l 2x2, xl `columns`x2 (so 2x2 at 2 columns).
    `packWidgets(sizes: WidgetSize[], columns: 2 | 4)` returns one
    `{ row, col, w, h }` per input, same order, 1-based for CSS. First fit
    (decision 202): each widget takes the top-most, then left-most, free spot
    its cells fit, so a later Small fills an earlier hole. Also export
    `gridAreaVars(sizes)` (or similar) that returns, per widget, the CSS
    custom properties for both column counts:
    `--dash-r2`, `--dash-c2`, `--dash-r4`, `--dash-c4` as `"<start> / span <n>"`.
- **Verification:** `npm test` passes; new tests cover: default layout
  shape; every v1 shape (default, one half off, both halves off, halves
  apart, reordered, picks kept, unknown ids, junk); v2 snapping, bad uids,
  duplicate uids, cap, empty list stays empty, unknown version; each edit;
  `nextWidgetUid`; `layoutForViewer`; packer: default layout at 2 and 4
  columns, S M S backfill, L beside S S at 4 columns, xl at 2 and 4,
  empty input. `npx tsc --noEmit` errors only in files C2 and C3 own (list
  them). Test files under 350 lines each (split by concern if needed).
- **Evidence required:** the test run tail with counts; the tsc error list
  grouped by file; line counts of every touched file.
- **Done criteria:** Fury re-runs `npm test` and reads the v1 upgrade tests
  against today's `widgetSpans` cases.

### C2 - server side (per-kind loaders, per-instance tiles, page, Medium row cap)
- **Status:** DONE (1191 tests, lint clean, tsc errors only in the two C3 components; NOTE: habitsRead.ts 365 lines, past its own 350 split note, pre-existing at 351)
- **Boundaries:** may touch: `src/app/(app)/(home)/page.tsx`,
  new `src/lib/dashboardLoaders.ts`, `src/lib/habitsRead.ts`,
  `src/lib/goalsRead.ts`, `src/lib/dashboardWidgets.ts` (words only, see
  spec), `src/components/HabitsTile.tsx`, `src/components/ChoresTile.tsx`,
  `src/app/actions/preferences.ts` (comments only) · must not touch:
  `src/components/DashboardWidgetList.tsx`,
  `src/components/DashboardCustomizeSheet.tsx`,
  `src/app/(app)/(home)/loading.tsx`, `src/lib/dashboardLayout.ts`,
  `src/lib/dashboardPicks.ts`, `src/lib/dashboardGrid.ts`,
  `src/lib/habitsDashboard.ts`, `prisma/`, `package.json`, any test file.
- **Spec:**
  - `dashboardWidgets.ts`: add one `DASHBOARD_WIDGET_WORDS` object holding
    every W1 string from decision 207 (`addWidget` "Add widget",
    `addTitle` "Add a widget", `removeWidget` "Remove widget", `size` "Size",
    `onDashboard` "On your dashboard", `emptyTitle` "Your dashboard is
    empty.", `emptyHint` "Tap Customize to add widgets.", and
    `moreRows(n)` giving `+${n} more`). Nothing else in that file changes.
  - `habitsRead.ts`: `loadDashboardHabits(viewer, today)` loses `picks`;
    `DashboardHabits` drops `habits` and `habitsToday` and gains `rows`
    (the viewer's full Today rows). Add exported `habitsTileFor(data,
    picks)` returning `{ tile: TileRows<HabitRowView>; todayRows:
    HabitRowView[] }`: own picks via `keepOwnPicks` against `data.pickable`,
    then `habitsTileRows(data.rows, own)`, and todayRows = habit rows that
    are picked (or all habit rows when none are). Same results per instance
    as today's single-picks loader. No second habit reader (STRUCTURE.md).
  - `goalsRead.ts`: `loadGoalsTile(viewer, today)` loses `picks` and
    returns the data a tile needs before picks (in-scope goals, `done`,
    `total`, `pickable`); add exported `goalsTileFor(data, picks)` returning
    `{ done, total, todo, picked }` exactly as today's picks branch does.
  - new `dashboardLoaders.ts` (server only, `db`): the kitchen reads moved
    out of `page.tsx` with their explaining comments, one function per kind:
    inventory summary (stocked, low count, expiring-soon count, urgent
    names), grocery summary (to buy, store breakdown), recipes summary
    (count, newest title), meal plans (the +/-8 day `MealPlanView[]`).
    Reuse `isLow`, `isExpiringWithin`, `urgentLowItems`, `storeBreakdown`.
  - `page.tsx`: read the layout as today (device rules unchanged), then
    load ONLY the kinds present in the layout, all in one `Promise.all`
    (habits and chores share one `loadDashboardHabits`). Build
    `tiles: Record<string, ReactNode>` keyed by widget uid, one per
    instance, each from its kind's data and its own picks (`picksOf(widget)`)
    and size. Habits and Chores at size `m` get `limit={3}`; at `l` no
    limit. Every widget in the layout handed to `DashboardWidgetList` has a
    tile (the page filters out any it cannot render). The notes (nudges,
    shout out, Planned today, Pick a day) are unchanged and load whenever the
    viewer is not a device, even with no Habits widget on the layout.
    `pickable` is still `{ habits, goals }`.
  - `HabitsTile.tsx` / `ChoresTile.tsx`: optional `limit` prop.
    `HabitTileRows` shows the first `limit` live rows and, when more exist,
    one plain muted line `DASHBOARD_WIDGET_WORDS.moreRows(n)` under the list
    (no link, decision 207). Without `limit` it is unchanged.
- **Verification:** `npm test` passes unchanged in count (no new tests:
  `habitsTileFor` and `goalsTileFor` are thin wrappers over tested pure
  rules); `npx tsc --noEmit` errors only in `DashboardWidgetList.tsx`,
  `DashboardCustomizeSheet.tsx`, `loading.tsx` or the page's
  `<DashboardWidgetList>` call (C3 owns that interface); `npm run lint`
  clean on touched files.
- **Evidence required:** test tail, tsc error list by file, line counts of
  touched files (page.tsx must shrink), `git status --short`.
- **Done criteria:** Fury reads the diff of `habitsRead.ts` and
  `goalsRead.ts` against today's single-picks behavior.

### C3 - client side (grid, Customize sheet views, gallery, previews, skeleton)
- **Status:** DONE (full Gauntlet green per Stark; Fury drove 375px: sheet, edit, resize and Add persist across reload)
- **Boundaries:** may touch: `src/components/DashboardWidgetList.tsx`,
  `src/components/DashboardCustomizeSheet.tsx`,
  new `src/components/DashboardWidgetEditor.tsx`,
  new `src/components/DashboardAddWidget.tsx`,
  new `src/components/DashboardWidgetGallery.tsx`,
  new `src/components/DashboardWidgetPreview.tsx`,
  `src/app/(app)/(home)/loading.tsx`, `src/app/(app)/(home)/page.tsx`
  (its `<DashboardWidgetList>` call, and the goals load: see spec) · must not touch: `src/lib/`,
  `src/app/actions/`, `src/components/DashboardItemPicker.tsx`,
  `src/components/SortableList.tsx`, `src/components/DashboardTile.tsx`,
  `src/components/HabitsTile.tsx`, `src/components/ChoresTile.tsx`,
  `src/components/AppChrome.tsx`, `prisma/`, `package.json`.
- **Spec:**
  - `DashboardWidgetList`: props `{ layout, tiles: Record<string,
    ReactNode>, notes?, pickable?, canCustomize }`. Grid `grid-cols-2`,
    `md:grid-cols-4`, `gap-4`, rows `minmax(9.5rem, auto)` (decision 201).
    DOM in layout order; each cell placed by C1's CSS variables for 2 and 4
    columns (`[grid-row:var(--dash-r2)]` ... `md:[grid-row:var(--dash-r4)]`),
    `min-w-0`, tile filling the cell. A uid with no tile yet (an optimistic
    Add before the server answers) shows a `SkeletonBlock` filling its cell.
    Empty layout: `EmptyState` with decision 207's words. Every edit goes
    through the existing `change()` (optimistic, `saveDashboardLayout`):
    add, remove, resize, reorder, set picks, reset.
  - `DashboardCustomizeSheet`: same chrome as today (backdrop, dialog,
    Escape, z-index, max height, safe area). One internal view state:
    list, edit (uid), pick (uid), add, add kind. List view: `SortableList`
    over the widgets (ids = uids); each row is a button (at least 56px)
    with the label, the size name in muted text under it and a right
    chevron, opening edit; the grip stays on the right (decision 208). Under
    the list: "Add widget" (48px), the inline error, "Reset to default".
    An edit view whose widget is gone returns to the list.
  - new `DashboardWidgetEditor`: "Back to Customize" control, the widget's
    label as title, "Size" with the gallery (tap saves at once), "Pick"
    (pickable kinds; opens the existing `DashboardItemPicker` for THIS
    widget's picks, its Back returning to this editor), then "Remove
    widget" (48px, one tap, no confirmation; returns to the list).
  - new `DashboardAddWidget`: "Add a widget" view listing every kind
    available to this viewer as 56px rows (label, muted "On your dashboard"
    when one exists, chevron); tapping opens the kind view: back control,
    the kind's label, "Size" gallery with the default size selected, and a
    48px "Add widget" button that adds it at the end and returns to the list.
  - new `DashboardWidgetGallery`: horizontal swipe strip (CSS scroll snap,
    no new library) of preview buttons, one per allowed size, each a real
    button with `aria-pressed` and an accessible name of the size, the
    selected one marked (accent ring plus a check), the size name under each
    card; dots under the strip showing which card is in view, only when there
    are 2 or more sizes; the selected card scrolled into view on open.
  - new `DashboardWidgetPreview`: a drawn miniature (not live data) whose
    shape follows the size (Small square, Medium 2:1, Large square,
    Extra large 2:1 wider), with the kind's icon (the same Lucide icon the
    real tile uses: CalendarDays, ListChecks, House, Target, Package,
    ShoppingCart, BookOpen) and its label, plus two or three neutral
    placeholder lines. Job tokens only; `aria-hidden`.
  - `loading.tsx`: the skeleton follows the default layout through the same
    packer and CSS variables at both column counts.
  - `page.tsx` (Fury, after C2 report): load the Goals tile data for every
    non-device viewer, like habits, so `pickable.goals` is filled even when
    no Goals widget is on the layout yet (a Goals widget added in Customize
    must be pickable before any reload).
  - All words come from `DASHBOARD_WIDGET_WORDS`, `WIDGET_SIZE_LABELS`,
    `DASHBOARD_WIDGETS[kind].label` and `DASHBOARD_PICKER_LABELS`; none
    inline. No em or en dashes. Each file under 350 lines.
- **Verification:** the whole Gauntlet passes (tsc, lint, `npm test`, the
  UTC test run, `npm run build`).
- **Evidence required:** each Gauntlet command's tail; line counts of
  touched files; `git status --short`.
- **Done criteria:** Fury and Strange drive it in the browser at 375 and
  820 wide: add, resize, pick, reorder, remove and Reset all save and
  survive a reload.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-11-06: mission opened from the approved plan; Hill dispatched with
  nine design calls (200 to 208); C1 written.
