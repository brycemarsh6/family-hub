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

### Gate-fix calls (Hill, 2026-11-06, after pass 1)

- **209 (medium, amends 201):** grid rows are `auto`; each cell has
  `min-h-[9.5rem]`, and `loading.tsx` follows the same rule. Large and
  Extra large still span 2 rows, so a Large alone fits its content instead
  of stretching. Default sizes unchanged.
- **210 (high):** each back control names the view it returns to. Add kind
  view: "Back to Add a widget". Pick: "Back to {widget name}". Edit view and
  Add list keep "Back to Customize". Words live in `DASHBOARD_WIDGET_WORDS`.
- **211 (high):** at the 30-widget cap the Add button stays disabled with a
  muted line under it: "Your dashboard is full. Remove a widget to add
  another."
- **212 (medium):** telling same-kind widgets apart is a required W3
  outcome (written into the plan's W3): the style name joins the size line;
  if two still read the same, later ones are numbered ("Habits 2").
- **213 (high):** keep 204 (Remove is optimistic), recorded in DESIGN.md as
  a named exception beside the delete carve-out, in Hill's words.

For Bryce first: 209, 212.

- **214 (Bryce, 2026-11-06, after Strange pass 2):** Chores today defaults
  to Medium, not Large, so an empty Chores tile is not a big blank card on
  the iPad. Bryce: "we can start with medium and I can change it manually
  in the app after if I want to". Applies to new and upgraded layouts.

Bryce (2026-11-06, back from away): shown 200, 203, 209 and 212; said
"please continue", so all of Hill's calls stand. Design calls go to Bryce
again from here.

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

### C4 - gate fixes, pass 1 (Captain 1 blocker, Strange 5 blockers, chosen notes)
- **Status:** DONE (Gauntlet green per Stark: 1191 tests before and after the split; visual items await Strange)
- **Boundaries:** may touch: `src/lib/dashboardLayout.test.ts` (rename
  away), new `src/lib/dashboardLayoutParse.test.ts`,
  new `src/lib/dashboardLayoutEdits.test.ts`,
  new `src/lib/dashboardWidgets.test.ts`,
  `src/lib/dashboardLayoutUpgrade.test.ts`,
  `src/lib/dashboardLayoutItems.test.ts`, `src/lib/dashboardPicks.test.ts`,
  `src/lib/dashboardGrid.test.ts`, `src/lib/dashboardWidgets.ts` (words
  object only), `src/lib/dashboardLoaders.ts` (comments only),
  `src/components/DashboardWidgetList.tsx`,
  `src/components/DashboardCustomizeSheet.tsx`,
  `src/components/DashboardWidgetEditor.tsx`,
  `src/components/DashboardAddWidget.tsx`,
  `src/components/DashboardWidgetGallery.tsx`,
  `src/components/DashboardWidgetPreview.tsx`,
  `src/components/DashboardItemPicker.tsx` (a `backLabel` prop only),
  `src/components/DashboardTile.tsx` (its header comment only),
  `src/app/(app)/(home)/loading.tsx`, `src/app/(app)/(home)/page.tsx` ·
  must not touch: `src/lib/dashboardLayout.ts`, `src/lib/dashboardGrid.ts`,
  `src/lib/dashboardPicks.ts`, `src/lib/habitsRead.ts`,
  `src/lib/goalsRead.ts`, `src/app/actions/`, `prisma/`, `package.json`,
  `DESIGN.md`, `STRUCTURE.md`, `CLAUDE.md`, `.env`.
- **Spec:**
  1. **Tests renamed by concern (Captain blocker).** Split the bare
     dashboardLayout test file into `dashboardLayoutParse.test.ts` (parsing,
     snapping, uid repair, cap, default) and `dashboardLayoutEdits.test.ts`
     (add, remove, resize, setWidgetItems, reorder, nextWidgetUid); move the
     registry assertions into `dashboardWidgets.test.ts`. Delete the old file
     with `git mv` or `git rm` (no copy left behind). Each file's header
     names the module it tests; the Upgrade header names `dashboardLayout.ts`.
     The total test count from `npm test` is unchanged; report before and
     after counts.
  2. **Gallery (Strange 1).** The strip is `relative`, so card offsets are
     measured from it. Dots show only when `scrollWidth > clientWidth`,
     re-measured on resize (a `ResizeObserver`). After a tap scrolls a card
     into view, the in-view dot updates (re-run the onScroll measure on
     `scrollend` or after the smooth scroll).
  3. **Preview shapes (Strange 2).** `SHAPES`: `s` `aspect-square w-[88px]`,
     `m` `aspect-[2/1] w-44`, `l` `aspect-square w-44`, `xl` stays wider
     than `m` at 2:1. At Small the icon stacks above the label so the label
     never truncates.
  4. **No squashed buttons (Strange 3).** Every direct child of the sheet's
     scrolling column is `shrink-0` (`[&>*]:shrink-0` or per element): the
     list wrapper, Add widget, Reset, the editor's buttons, the gallery
     wrapper. Buttons stay at least 48px with 30 widgets in the list.
  5. **Back labels (decision 210, Strange 4).** Add to
     `DASHBOARD_WIDGET_WORDS`: `backToCustomize` ("Back to Customize"),
     `backToAdd` ("Back to Add a widget"), `backTo(name)` ("Back to
     {name}"). The Add kind view uses `backToAdd`; `DashboardItemPicker`
     gets an optional `backLabel` prop (default its current text) and the
     editor passes `backTo(widget label)`.
  6. **Grid rows (decision 209, Strange 5).** `DashboardWidgetList`: rows
     `auto` (`auto-rows-auto` or no auto-rows class), each cell
     `min-h-[9.5rem]`; Large and Extra large keep their 2-row span from the
     packer. `loading.tsx` uses the same rule.
  7. **Cap line (decision 211).** When the layout holds
     `MAX_DASHBOARD_WIDGETS`, the Add button stays disabled and a muted line
     under it reads `DASHBOARD_WIDGET_WORDS.full` = "Your dashboard is full.
     Remove a widget to add another."
  8. **Notes taken.** "Customize dashboard" and "Reset to default" move into
     `DASHBOARD_WIDGET_WORDS`; `page.tsx` uses `moreRows` for the inventory
     "+N more" and `DASHBOARD_WIDGETS[kind].label` for tile titles where they
     match; the sheet's fallback (widget gone) also resets the view to list;
     a one-line comment where the client saves the filtered `renderable`
     layout saying why that is safe; `dashboardLoaders.ts` comments no longer
     cite `kitchen/page.tsx` (name the Inventory page or say what the rule
     is); the `DashboardTile.tsx` header no longer says "full or half width".
  - No em or en dashes. Each file under 350 lines.
- **Verification:** the whole Gauntlet passes.
- **Evidence required:** each Gauntlet command's tail; test counts before
  and after the split; line counts of touched files; `git status --short`.
- **Done criteria:** Strange re-gates in the browser at 375 and 820 wide
  (dots, previews, 30-widget list, back labels, Large tiles, cap line);
  Captain re-checks the test names; Vision re-runs the Gauntlet.

### C5 - gate fixes, pass 2 (Strange's blocker via decision 214, notes)
- **Status:** OPEN
- **Boundaries:** may touch: `src/lib/dashboardWidgets.ts`,
  `src/lib/dashboardLayout.ts` (the `nextWidgetUid` comment only),
  `src/lib/dashboardLayoutParse.test.ts`, `src/lib/dashboardLayoutEdits.test.ts`,
  `src/lib/dashboardLayoutUpgrade.test.ts`, `src/lib/dashboardLayoutItems.test.ts`,
  `src/lib/dashboardWidgets.test.ts`, `src/lib/dashboardGrid.test.ts`,
  `src/components/DashboardWidgetGallery.tsx`,
  `src/components/DashboardItemPicker.tsx`,
  `src/app/(app)/(home)/loading.tsx` (its comment only),
  `src/app/(app)/(home)/page.tsx` (one comment only) · must not touch:
  `src/lib/dashboardGrid.ts`, `src/lib/dashboardPicks.ts`,
  `src/components/DashboardWidgetList.tsx`, `src/app/actions/`, `prisma/`,
  `package.json`, `DESIGN.md`, `STRUCTURE.md`, `CLAUDE.md`, `.env`.
- **Spec:**
  1. **Decision 214.** `DASHBOARD_WIDGETS.chores.defaultSize` becomes `"m"`
     (sizes stay `["m","l"]`). Update test expectations that assumed Large
     Chores in the default or the v1 upgrade, and add one assertion that a
     v1 layout with Chores enabled upgrades to Chores at `"m"`.
  2. **Tap scrolls into view.** In the gallery card's onClick, after
     selecting, call `scrollIntoView({ behavior: "smooth", inline:
     "center", block: "nearest" })` on that card, so the existing
     `onScrollEnd` moves the dot to it. Keep the comment true.
  3. **One scroll indicator.** Hide the strip's scrollbar
     (`[scrollbar-width:none]` plus `[&::-webkit-scrollbar]:hidden`).
  4. **True comments.** `loading.tsx`: say the skeleton follows the same
     packer and row minimum, not that the page "does not jump".
     `dashboardLayout.ts`: the `nextWidgetUid` comment says "the parser's
     repair and Add", not "the upgrade". `page.tsx` around line 74: drop
     "like habits".
  5. **One phrase once.** `DASHBOARD_PICKER_LABELS.back` points at
     `DASHBOARD_WIDGET_WORDS.backToCustomize` (or is removed with
     `backLabel` made required), so "Back to Customize" is written once.
  - No em or en dashes. Each file under 350 lines.
- **Verification:** the whole Gauntlet passes.
- **Evidence required:** each Gauntlet command's tail; the test count
  (1191 plus any added); `git status --short`.
- **Done criteria:** Strange re-checks the default dashboard at 820 and the
  gallery tap at 375; Vision re-runs the Gauntlet.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Captain | BLOCKED | 1: second test split keeps the bare dashboardLayout.test.ts name (STRUCTURE.md test-split rule); Upgrade header does not name dashboardLayout.ts | uid-rule overclaim (default and upgradeV1 hand-write uid: kind); goals load wording; habitsRead 365/277; KIND_ICONS second icon map; inline "+N more" and tile titles in page.tsx; sheet header row x4; DESIGN.md ToggleSwitch example stale; dashboardLoaders comments cite gone kitchen/page.tsx; proposed dependency clause for dashboardGrid/dashboardLoaders; naming of DashboardAddWidget (no action) |
| 1 | Vision | PASS | none | exhaustive v1 differential (1,935,360 rows) identical; v2 and packer fuzz clean. NOTES: uid reuse in flight shows old tile briefly; client saves the filtered `renderable` layout (inert today); sheet fallback does not reset `view`; re-tap of selected size re-saves; inline "Customize dashboard" / "Reset to default"; Large Habits/Chores taller (for Strange); layout read now serial; goals-load doc wording; habitsRead 365/277 |
| 1 | Strange | BLOCKED | 5: (1) gallery dots light the wrong card, offsetLeft measured from the dialog, dots shown when the strip cannot scroll; (2) preview SHAPES draw Large narrower than Medium, Small label truncates; (3) sheet buttons squash below 48px with long lists (flex col + max-h, no shrink-0); (4) back controls "Back to Customize" go elsewhere from the Add kind view and from Pick; (5) Large Habits/Chores with little content are big empty cards on the default dashboard (Chores 343x320, 67% empty) | iPad 4-col collage for everyone (Bryce iPad check); cap disabled with no words; pressed accent button contrast 3.37 (app-wide sweep); duplicate kinds indistinguishable; Remove optimistic needs DESIGN.md exception; loading.tsx jump (pre-existing); Grocery Small line-clamp; tapped card half hidden; faint dark dots; DESIGN.md ToggleSwitch line stale |
| 2 | Captain | PASS | none | 20 test cases before and after the split; all doc claims true. NOTES: "Back to Customize" defined twice in dashboardWidgets.ts; nextWidgetUid comment still says "the upgrade"; page.tsx:74 "like habits"; DESIGN.md ToggleSwitch list omits HabitForm and GoalForm |
| 2 | Vision | PASS | none | Gauntlet re-run green (1191; UTC 1184 + 7 existing skips; build ok); 44 test names identical before and after the split, no assertion lost. NOTES: setView during render is safe (own state, one re-render); ResizeObserver watches only the strip (safe, gallery remounts per kind); onScrollEnd valid, onScroll still covers Safari without scrollend; label swap byte-identical; process: Fury's doc edits shared Stark's commit, next time commit them apart |
| 2 | Strange | BLOCKED | 1: blocker 5 fixed at 375 but not at 820: default Chores today Large is 360x267 with 81px of content (about 70% empty) because its 2 rows are set by Habits and Goals beside it; needs a design call (Strange recommends Chores default Medium) | blockers 1 to 4 and the cap line FIXED with measurements; tapped half-hidden card not scrolled into view and the gallery comment claims it is; loading skeleton now taller than real tiles; gallery shows a scrollbar line plus dots; dark inactive dot faint; no regressions |

## Handoff log

- 2026-11-06: pass 1 gates done (Captain and Strange blocked). Hill decided
  209 to 213; Fury made the doc fixes; C4 written for Stark.
- 2026-11-06: mission opened from the approved plan; Hill dispatched with
  nine design calls (200 to 208); C1 written.
