# Dashboard widgets v2: sizes, styles, and a collage dashboard

## Context

Bryce wants the dashboard (`/`) to work like iPhone home-screen widgets.
Each widget can be one of four sizes and, where it makes sense, one of a few
styles: a habit can show as a ring, as bars, or as a week of dots. A widget
kind can be added more than once, and the result should feel like the
reference dashboards he sent: a clean collage of cards.

Today the dashboard already has most of the plumbing:
- A registry: `src/lib/dashboardWidgets.ts`, with 7 fixed ids and a fixed `width: "full" | "half"`.
- A saved per-person layout, stored as JSON text in `UserPreferences.dashboardLayout`.
- A parser that repairs bad data: `parseDashboardLayout` in `src/lib/dashboardLayout.ts`.
- A Customize sheet with on/off switches, drag grips and Pick for habits and goals (`DashboardCustomizeSheet`, `DashboardItemPicker`).
- A 2-column grid in `DashboardWidgetList`, with pairing decided by `widgetSpans`.
- One tile shell, `DashboardTile`, in two shapes: `link` and `panel`.

The person cannot choose any size today. Mission 24 left that out of scope on
purpose.

**Bryce's decisions (2026-11-06):**
- **Four sizes:** Small square, Medium wide, Large big square, and Extra large full width.
- **Duplicates allowed:** each widget is its own instance and can be added or removed.
- **Editing happens in the Customize sheet:** swipe through size and style previews, like the iOS widget gallery.
- **Ship in steps, one PR each.**

Recipes stays roughly as it is: small count tiles only. Lists comes later,
once Lists itself exists.

## The model (built in PR W1, used by every later PR)

### Sizes and grid

| Size | Phone (2 columns) | iPad (4 columns, `md`+) |
|---|---|---|
| `s` Small | 1×1 | 1×1 |
| `m` Medium | 2×1 | 2×1 |
| `l` Large | 2×2 | 2×2 |
| `xl` Extra large | 2×2 (same as Large) | 4×2 |

- **Cells are square-ish:** rows have a fixed height per breakpoint. Tune it on the real 375, 390, 820 and 1180 px viewports, starting near the column width.
- **Contents never scroll inside a tile** (DESIGN.md: no nested scroll). Overflow shows "+N more".
- **A pure packer decides placement:** a tested `packWidgets(widgets, columns)` in a new `src/lib/dashboardGrid.ts`. It keeps list order and fills holes with later small tiles in a predictable way. This replaces `widgetSpans`.
  - Placement is set on each cell as an explicit `gridRow`/`gridColumn`. CSS `grid-auto-flow: dense` is not used, because reading order and layout would drift apart.
- **The iPad gets the full width:** the dashboard opts out of `max-w-3xl` through the existing `data-fills-width` mechanism (STRUCTURE.md around line 882), so 4 columns fit.

### Saved layout, version 2 (no database migration)

The layout stays in the same text column, as a new JSON shape:

```ts
{ version: 2, widgets: [{ uid, kind, size, style?, items?, options? }] }
```

- `uid` is a short random id, so two widgets of the same kind can coexist.
- `kind` replaces `id`.
- `enabled` is gone. A hidden widget is simply removed.
- `options` holds per-kind settings, such as the calendar's view or "tasks only".
- `parseDashboardLayout` stays the only reader. It upgrades version 1 on read:
  - Each enabled v1 widget becomes an instance at today's look: `full` maps to Medium or Large per kind, and `half` maps to Small.
  - Its `items` (picks) are kept.
  - Disabled widgets are dropped.
  - The v1 insertion rule (STRUCTURE.md:576) is retired, because new kinds now arrive only through Add widget.
- The registry entry for each kind becomes: `{ label, sizes, defaultSize, styles?: per size, pickable, maxItems, device: boolean }`. The parser snaps any size or style the kind doesn't allow to the nearest allowed one.
- `layoutForViewer` (wall tablet) keeps stripping the personal kinds (habits, chores).

### Customize sheet (one sheet, internal views, per DESIGN.md)

The sheet has three views:

1. **Your widgets:** the current list with drag grips (`SortableList`), each row showing kind, size and style. Tapping a row opens Edit.
2. **Edit:** a swipeable strip of previews, one card per allowed size and style, with dots under it like the iOS gallery. It also holds:
   - Pick for habits and goals (the existing `DashboardItemPicker`).
   - Per-kind options (calendar view).
   - A one-tap **Remove widget** button (single-tap delete rule).
3. **Add widget:** a list of kinds. Tapping one opens the same preview strip, and **Add** appends the widget.

- Previews are drawn shapes with sample content, not live data. That keeps them instant and needs no extra loading.
- Reset to default stays.
- The save path is unchanged: `saveDashboardLayout`, with optimistic updates through `useOptimisticRun`.

### Data loading

- **Each kind has one loader.** A new `src/lib/dashboardLoaders.ts` holds them, so `page.tsx` (293 lines now) stops growing.
- **Loading happens per kind, not per instance.** A kind is loaded only when at least one instance is on the layout, and all loaders run in one `Promise.all`.
- **Instances share their kind's data.** Each instance then filters it, for example by its own habit picks.

## The steps (one PR and one chat each, per CLAUDE.md)

Each step is an Avengers mission. Starting at mission 43, plans go in
`.avengers/plans/dashboard-widgets-v2.md`. Hill makes the small design calls
inside a step and lists them for Bryce; anything big comes back to Bryce
with a mock.

**W1: Engine, grid and sheet (this chat).**
- Builds everything in "The model" above.
- The existing 7 widgets get the sizes they can fill honestly today:
  - Inventory: S, M
  - Grocery: S, M
  - Recipes: S, M
  - Today's meals: M, L
  - Goals: M, L
  - Habits: M, L
  - Chores: M, L
- Nothing looks different until someone changes a size; the v1 → v2 upgrade keeps everyone's current dashboard.

**W2: Calendar widget.**
- Small: the next event.
- Medium: today's list.
- Large: today's schedule, with events, tasks and planned habits.
- Extra large: a 3-day view, or the week as columns.
- Options: "Tasks only" and "Whole day".
- Reuses:
  - `DaySection`, `EventCard` and `TaskCard`
  - `getCalendarEventsInRange` (`src/lib/calendarEventQuery.ts`)
  - `loadPlannedHabitDays`
- Moves the inline task query from `calendar/page.tsx` into one lib helper, so the page and the widget share it.

**W3: Habits and chores styles** (from Bryce's Habit app screenshots).
- Small: one habit as a ring with its streak.
- Medium: 4 rings, or 3 bars.
- Large: 8 to 10 rings, 6 bars, or a week of dots.
- Extra large: a bars grid, or a week report.
- Chores: list (M, L).
- **Required (decision 212):** a Customize row's muted second line must tell
  two same-kind widgets apart (the style name joins the size); when two still
  read the same, number the later ones in list order ("Habits 2").
- Live check-off stays at 44px rows, through `habitRowTaps` and `HabitTileRows`.
- **Open for this step:** whether a habit gets its own color for rings and bars. That needs a design call and possibly a field.

**W4: Kitchen widgets.**
- Meal plan:
  - Small: the next meal.
  - Medium and Large: today.
  - Large and Extra large: the week, reusing `WeekCard` and `todaysMeals`.
- Shopping:
  - Small: the count.
  - Medium: the stores to visit.
  - Large: the full list with check-off.
- Inventory: Small and Medium stats.
- Expiring:
  - Small: the count and the top two.
  - Large: the full list, sorted by urgency.
- Pulls one expiring-list helper out of the Expiring page and the Assistant route. Pulls one shopping read out of `assistant/shoppingReads.ts`.

**W5: Goals.**
- Small: one goal's progress ring.
- Medium: this week.
- Large: the goals list with bars.
- Reuses `loadGoalsTile`, `GoalsTile` and `ProgressBar`.

**Later:** Lists widgets, once Lists is built.

## Files W1 touches

- `src/lib/dashboardWidgets.ts`: registry v2.
- `src/lib/dashboardLayout.ts`: v2 type, parser and v1 upgrade, add, remove, resize, restyle.
- `src/lib/dashboardPicks.ts`: picks per instance.
- `src/lib/dashboardGrid.ts` (new): `packWidgets`.
- `src/lib/dashboardLoaders.ts` (new): per-kind loaders, pulled out of `page.tsx`.
- `src/app/(app)/(home)/page.tsx` and `loading.tsx`: the skeleton follows the grid.
- `src/components/DashboardWidgetList.tsx`: grid rendering.
- `src/components/DashboardCustomizeSheet.tsx`: split into its views. New `DashboardWidgetGallery.tsx` (preview strip) and `DashboardWidgetPreview.tsx`.
- `src/components/DashboardTile.tsx`: a size-aware padding and type scale.
- `src/app/actions/preferences.ts`: unchanged apart from the type.
- Tests:
  - `dashboardLayout.test.ts`: v1 upgrade cases. The file is at 304 lines, so split by concern per STRUCTURE.md: `dashboardLayoutUpgrade.test.ts`.
  - `dashboardGrid.test.ts` (new).
  - `dashboardPicks.test.ts`.
- Docs:
  - DESIGN.md: the component vocabulary entry for the sheet and sizes.
  - STRUCTURE.md: the registry and parser entry, rewritten for v2.
  - CLAUDE.md: Current status.

## Verification (W1)

- **Gauntlet:** `tsc`, `eslint`, `npm test`, `build`. Also run the direct UTC test command from AGENTS.md, so both time zones are proven.
- **Unit tests:**
  - Every v1 shape upgrades, including picks, disabled widgets and garbage input.
  - Disallowed sizes snap to allowed ones.
  - The packer: order is kept, holes are filled, and Extra large falls back to Large at 2 columns.
  - Two instances of one kind keep separate picks.
- **Browser (preview, dev branch data):**
  - Run at 375 and 390 (phone), 820 portrait and 1180 landscape (iPad), in light and dark.
  - Existing layouts look unchanged after the upgrade.
  - Add, resize, restyle, reorder, remove and Reset all save and survive a reload.
  - There's no layout shift and no hydration warning.
  - Every control is at least 44px and reachable.
  - A device login sees the default layout and no Customize button.
- **Gates:** Vision (correctness), Strange (design, with screenshots), Captain (new files, structure).
- **After merge:** `git log origin/main..HEAD` is empty and the production deploy is green. Add a phone and iPad check to Bryce's checklist.
- **Next:** offer W2 as a New task card in a fresh chat.
