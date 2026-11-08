# Mission 52: iPad landscape L4 (Kitchen lists go wide)

**Project:** family-hub (Marshee)
**Status:** AT-THE-GATES (C0 to C4 committed 2026-11-07; Fury's Gauntlet run, then Vision)
**Started:** 2026-11-07 · **Updated:** 2026-11-07
**Branch:** `claude/ipad-landscape-l4-kitchen-1af045` (from `origin/main` at `798c475`)
**Plan:** `.avengers/plans/ipad-landscape-v1.md`, step L4 (Kitchen section)

Plan written by Fury on Fable (Bryce's ask, 2026-11-07); approved by Bryce
2026-11-07. Build and gates run on Opus 5.5. Mission number: 51 is L3
(another chat's worktree), so this is 52.

## Context

Every Kitchen list page still sits in a 768px column. On the kitchen iPad in
landscape (1180x820) a third of the screen is empty. L1 (mission 44) built the
width rule (`data-page-width="wide"`, containers around columns only, column
counts from container variants) and L2 (mission 46) used it for the Calendar.
L4 applies it to seven Kitchen pages from the approved plan
(`.avengers/plans/ipad-landscape-v1.md`, Kitchen section, decisions 215 and
218) and lands the one shared change the plan parked for "the first wide page
with a + button": `FloatingAddButton` moves to the bottom-right corner of the
content area on wide pages.

Branch `claude/ipad-landscape-l4-kitchen-1af045` is at `origin/main`
(`798c475`). `.env` is symlinked to the main checkout's (dev endpoint
`ep-hidden-pine`, checked). No dev server is running yet.

## Done means

At 1180x820 with no pinned menu: Inventory and Shopping groups in 2 columns
(rows about 560px), Expiring in 3 columns, All recipes letter groups in 3
columns with the A-Z rail still jumping, Cookbooks 4 cards across, Cookbook
detail rows in 3 columns, Meal plan's current week as a 7-column grid. At 1180
with the Sidebar (892px of content) each page steps down one column count on
its own. At 820 upright: 2 columns where a 768px container allows it, else
one. At 375 nothing changes. The + on Recipes sits bottom-right on wide pages
and bottom-left on phones; Goals and Manage family (not wide yet) are
unchanged. Every sheet and `AddItemBar` is unchanged. Gauntlet green; PR
merges; production shows it.

## Out of scope

Recipe page, Goal page, Plans tabs, every form, Settings, Habits and Chores
(L3, L5, L6 run in parallel). Recipe photos, new meal plan features (no
"Suggest meals" button: it does not exist). The shared `(app)/loading.tsx`
stays as it is (it covers routes that are not wide yet).

## Fury's structural calls

1. **Stable split is a pure helper plus a measured column count.** A CSS
   container cannot tell JavaScript how many columns it has, and the split
   must be decided in JavaScript (which group goes in which column). So:
   - `src/lib/splitColumns.ts` (new, pure, tested): `splitByWeight(items,
     columns, weightOf)` returns `columns` arrays in order, cutting where the
     running weight crosses each k/columns share of the total. Weight of a
     group is its row count plus one (its header). Stable: depends only on
     order and counts, never on open/closed state or on heights. Exports
     `COLUMN_MIN_WIDTH_PX = { 2: 768, 3: 1024 }` once (the same thresholds the
     plan gives container variants).
   - `src/lib/useContainerWidth.ts` (new): `useContainerWidth(ref)` measures
     the wrapper's own width with a `ResizeObserver` inside
     `useLayoutEffect`, returns 0 on the server and before the first measure.
     `columnCountFor(widthPx, maxColumns)` in `splitColumns.ts` (pure, tested)
     turns that into 1, 2 or 3 from `COLUMN_MIN_WIDTH_PX`; the Meal plan
     compares the width to the same 1024 constant for its grid.
     Precedent: `RecipeList.tsx` already measures with a `ResizeObserver` for
     the rail. Measuring the wrapper (not the screen) keeps the plan's rule 2:
     the Sidebar just leaves less room.
   - Known cost: on a hard reload the list paints at 1 column and goes to 2 or
     3 right after hydration (client-side navigation measures before paint,
     so no jump). Same class of note as L1's Customize pop-in. Recorded for
     Strange as expected, not a blocker.
   - Pages with a fixed small set of columns (Expiring's 3 sections, the
     Meal plan's 7 days, Cookbooks' grid) use pure container variants and
     never the hook.
2. **Wide opt-in on every page root and skeleton.** `SkeletonPage` gets a
   `wide?: boolean` prop that puts `data-page-width="wide"` on its root.
   Inventory, Shopping and Expiring `loading.tsx` pass it. Recipes, Cookbook
   detail and Meal plan get their own `loading.tsx` (`<SkeletonPage wide />`)
   so the shared `(app)/loading.tsx` is untouched.
3. **FloatingAddButton** keeps its fixed wrapper; the inner box lifts its
   768px cap and right-aligns on wide pages with the selector the chrome
   already uses: `md:[body:has([data-page-width=wide])_&]:max-w-none
   md:[body:has([data-page-width=wide])_&]:justify-end`. Phones and non-wide
   pages: unchanged. Own commit, first, so L5 picks it up cleanly.
4. **Meal plan picks one layout from its measured width.** `MealPlanList`
   measures its list wrapper (`useContainerWidth`); at 1024px and up it
   renders the current week as `WeekGrid` (new), "Coming up" as compact cards
   2 across beside collapsed "Past weeks" headers, and one tapped week open
   as a `WeekGrid` under that row (Hill Q5); below 1024px it renders exactly
   what it renders today. Nothing is rendered twice, so STRUCTURE.md's
   dual-render limit is not needed. `CreatePlanSheet` and `SlotEditSheet` stay
   siblings at the root, outside the measured wrapper.
7. **Header rows switch with `md:`, not a container.** Hill moved Log
   leftovers, Add recipe, Put away, Just clear, N to review and Add N low
   items into the header row on wide pages. Two of those buttons render their
   sheet inline (`PutAwayButton`, `ReviewQueueButton`), and STRUCTURE.md rule
   1 forbids a container around an element that holds a sheet. A header row
   is not a column count (rule 2), these pages are all wide from `md`, and a
   title plus two buttons fits in the 736px the Sidebar leaves at 1024px, so
   the header rows use `md:flex-row md:items-center md:justify-between`.
   Captain weighs this.
5. **Containers never wrap a sheet.** Each list's sheets already sit as
   siblings after the list markup (Banner, every page). Stark wraps only the
   grid.
6. **Soft cap.** `PantryList.tsx` (379) and `RecipeList.tsx` (322) are at or
   over 350. If the change pushes a file further, Stark extracts the obvious
   seam (`PantryCategorySection`, `RecipeLetterRail`) in the same contract.
   Captain decides whether more is needed.

## Hill's decisions (design; Bryce can overturn any)

Hill, 2026-11-07 (Fable, xhigh). Numbers 244 to 253 provisionally (last
recorded is 243; L3 runs in parallel, re-check at sync). Confidence in
brackets; Bryce looks at the medium ones first.

- **244 (Q1, high):** Expiring's "Log leftovers" sits in the header row right
  of the title on wide pages, hugging its text, keeping today's accent fill;
  phones keep the full-width button.
- **245 (Q2, high):** Cookbook detail's "Add recipe" (Plus icon, accent
  fill) sits in the header row immediately left of the "Cookbook actions"
  button on wide; phones unchanged; the empty-state hint stays true.
- **246 (Q3, high):** on wide pages the A-Z rail keeps the right edge and its
  top, but ends above the + button (bottom about 5.5rem plus safe area);
  phones unchanged.
- **247 (Q4, high):** cookbook card: at least 7rem tall, rounded-xl,
  border-line, bg-surface, active:bg-surface-2, whole card tappable; title
  up to 2 lines (line-clamp-2); count at the bottom in muted text-sm with
  today's words ("12 recipes", "1 recipe", "0 recipes"); no icon; 2 across
  from a 768px container, 4 from 1024px, never 3; phones keep rows; Sort
  stays above the grid.
- **248 (Q5, medium, overturns Fury's (a)):** on wide, "Coming up" is a row
  of compact cards 2 across in the left half (min 72px: week range in
  text-base semibold, under it "12 of 28 meals planned" or "Nothing planned
  yet" in muted text-sm); "Past weeks" keeps its collapsed headers in the
  right half; tapping a card or a past-week header opens that week as the
  same 7-column grid at full width under that row, one open at a time,
  tapping again closes it. No dashed placeholder cards; "Plan a week" stays
  the only way to add a week. Phones unchanged. Week ranges read "Nov 8 to
  14" and "Nov 29 to Dec 5", changed in `formatWeekRange` itself so every
  week header agrees (today it prints an en dash).
- **249 (Q6, medium):** week grid: day headers "Sun 1", "Mon 2"; today's
  column tinted accent-soft (header and cells) with its header in accent, no
  "Today" pill in the grid (phones keep it); a recipe-backed meal keeps the
  small BookOpen icon in accent before the title; empty cell transparent
  with dashed border-line and muted "Add"; filled cell bg-surface-2,
  border-line, title text-sm font-medium wrapping to 2 lines then ellipsis;
  cells at least 64px; row labels Breakfast, Lunch, Dinner, Snacks on the
  left in today's uppercase muted style; the week header (range, delete)
  stays above the grid.
- **250 (Q7, high):** Expiring sections fill fixed columns from the left; a
  missing section leaves its column empty. (Idea for later: always show all
  three headers with a quiet "Nothing" line.)
- **251 (Q8, medium):** Inventory header row on wide: title left; right "N
  to review" (when the queue is not empty) then, outermost, "Add N low items
  to the list"; both hug their text with today's fills. Search and the five
  location chips share one row only from a 1024px container (search first,
  never under about 16rem; chips keep their sideways scroll); below that
  the chips stay under the search box.
- **252 (Q9, medium):** All recipes: the same 1024px gate; search first,
  tag chips after it ("All (N)" first, sideways scroll kept); below 1024px
  and on phones the chips stay above the search box. The rail still starts
  under that row.
- **253 (Q10, high):** Shopping's "In the trolley (N)" keeps its heading
  across the section and splits its rows into the same two stable columns at
  today's 60% opacity; the "Everything on the list is in the trolley" note
  stays one column wide, left; "Put away N into the pantry" and "Just clear"
  sit in the header row right of the title on wide (they live in the header
  today).

## Assembled

- Stark + Vision (always).
- Strange: seven pages change visibly. Sizes: 1180x820 plain, 1180 with
  Sidebar, 1180 with Rail, 820x1180, 375.
- Captain: two new `src/lib` files used by four pages, a new component, six
  loading files, STRUCTURE.md changes.
- Banner: done (brief above, 2026-11-07).
- Hill: design batch Q1 to Q10.

## Danger register

From AGENTS.md, absolute: dev Neon branch only (host `ep-hidden-pine`, checked
2026-11-07); no agent edits `.env`; `db:seed` and `db:reset` forbidden; no
`User` clean script; no migration in this mission; never `git add -A`, stage by
path, `git show --stat HEAD` after each commit; `main` only through a PR with
the Gauntlet green.

## Gauntlet

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts`
- `npm run build`

## Contracts (one Stark dispatch each)

Order: C0 and C1 in parallel (disjoint). Commit C0 alone. Then C2, C3, C4 in
parallel (disjoint; all import C1). Then C5 (Fury).

### C0 - the + button corner (own commit)
- **Status:** DONE (commit `4ff2568`; tsc and lint exit 0; Strange checks it in the browser at the gates)
- **Boundaries:** may touch: `src/components/FloatingAddButton.tsx`, `src/components/RecipeList.tsx` (the rail's bottom only) · must not touch: `src/components/GoalsList.tsx`, `src/components/FamilyList.tsx`, `src/components/AppChrome.tsx`, `src/components/HamburgerButton.tsx`, `src/components/AddItemBar.tsx`, `package.json`, `DESIGN.md`, `STRUCTURE.md`, `CLAUDE.md`, `.env`
- **Spec:** wrapper unchanged (`fixed right-0 left-[var(--app-nav-width,0px)]`).
  Inner box: `w-full max-w-3xl px-4 flex` plus
  `md:[body:has([data-page-width=wide])_&]:max-w-none` and
  `md:[body:has([data-page-width=wide])_&]:justify-end`. Rewrite the header
  comment: bottom-left on phones (the rail reason stays), bottom-right of the
  content area on wide pages (plan rule 4), and that the rail ends above it
  on wide pages. In `RecipeList.tsx` the rail's `bottom` moves from the
  inline style to classes: `bottom-[calc(1rem+env(safe-area-inset-bottom))]`
  and `md:[body:has([data-page-width=wide])_&]:bottom-[calc(5.5rem+env(safe-area-inset-bottom))]`
  (per Hill Q3; if Hill picks (b), the button gets the padding instead and the
  rail is untouched).
- **Verification:** `npx tsc --noEmit`, `npm run lint`. **Evidence required:** the two class strings,
  `git diff --stat`.

### C1 - shared pieces
- **Status:** DONE (commit `804b5a0`; Gauntlet green: 1403 tests before, 1412 after, UTC 1405 pass and 7 skipped, build exit 0)
- **Boundaries:** may touch: `src/components/Skeleton.tsx`, `src/app/(app)/kitchen/inventory/loading.tsx`, `src/app/(app)/kitchen/shopping/loading.tsx`, `src/app/(app)/kitchen/expiring/loading.tsx`; may create (new): new `src/lib/splitColumns.ts`, new `src/lib/splitColumns.test.ts`, new `src/lib/useContainerWidth.ts`, new `src/app/(app)/kitchen/cooking/recipes/loading.tsx`, new `src/app/(app)/kitchen/cooking/recipes/cookbooks/[id]/loading.tsx`, new `src/app/(app)/kitchen/cooking/meal-plan/loading.tsx` · must not touch: `src/app/(app)/loading.tsx`, `package.json`, `prisma/`, `DESIGN.md`, `STRUCTURE.md`, `CLAUDE.md`, `.env`
- **Spec:** as structural call 1 and 2. Tests: empty list; one item; weights all
  1 split 2 and 3 ways (sizes differ by at most one); heavy first group goes
  alone in column 1; order preserved across columns; `columns` 1 returns the
  list itself; `columnCountFor`: 0 and 767 give 1, 768 gives 2, 1023 gives 2,
  1024 gives 3, and `maxColumns` 2 caps 1024 at 2.
- **Verification:** full Gauntlet. **Evidence required:** test count before and after; tails.

### C2 - Inventory and Shopping
- **Status:** DONE (commit `ed57b98`; tsc and lint exit 0; PantryList 376 lines, PantryCategorySection new 80, GroceryList 263; the measured wrapper holds the whole results area so an empty pantry still measures)
- **Boundaries:** may touch: `src/components/PantryList.tsx`, `src/components/GroceryList.tsx`, `src/app/(app)/kitchen/inventory/page.tsx`, `src/app/(app)/kitchen/shopping/page.tsx`, `src/components/AddLowItemsButton.tsx`, `src/components/ReviewQueueButton.tsx`, `src/components/PutAwayButton.tsx` (header placement only); may create (new): new `src/components/PantryCategorySection.tsx` · must not touch: `src/components/PantryAddFlow.tsx`, `src/components/AddItemBar.tsx`, `src/components/PantryItemEditSheet.tsx`, `src/components/StorePickerSheet.tsx`, `src/components/GroceryItemEditSheet.tsx`, `src/components/PutAwayReviewSheet.tsx`, `src/components/PantryRow.tsx`, `src/components/GroceryRow.tsx`, new `src/lib/splitColumns.ts`, new `src/lib/useContainerWidth.ts`, `package.json`, `DESIGN.md`, `STRUCTURE.md`, `CLAUDE.md`, `.env`
- **Spec:** page roots get `data-page-width="wide"`. Header rows per structural
  call 7 and decisions 251 and 253. Inventory: search + chips row in a
  `@container` wrapper, one row from `@min-[64rem]` (251); groups grid
  wrapped in a `ref` div, `columnCountFor(useContainerWidth(ref), 2)`,
  `splitByWeight(groups, n, g => g.items.length + 1)`, grid `gap-x-4
  items-start` with `gridTemplateColumns: repeat(n, minmax(0,1fr))` inline;
  each column a `space-y-2` stack; search results split the same way with
  weight 1. Shopping: to-buy groups the same; trolley per 253. Sheets stay
  outside the grid wrapper.
- **Verification:** Gauntlet. **Evidence required:** line counts, class strings, `git status --short`.

### C3 - Expiring and Meal plan
- **Status:** DONE (commit `ffbd3d1`; Fury updated three Calendar week-title assertions in `src/lib/calendarViewConfig.test.ts` to the "to" wording, outside C3's boundary, as a Fury fix: one formatter, one spelling; the Calendar Week title now reads "Nov 1 to 7"; MealPlanList 346 lines)
- **Boundaries:** may touch: `src/components/ExpiringList.tsx`, `src/app/(app)/kitchen/expiring/page.tsx`, `src/components/LogLeftoverButton.tsx`, `src/components/MealPlanList.tsx`, `src/components/WeekCard.tsx`, `src/app/(app)/kitchen/cooking/meal-plan/page.tsx`, `src/components/PastMealWeeks.tsx`, `src/lib/mealPlanDates.ts`, `src/lib/mealPlanDates.test.ts`; may create (new): new `src/components/WeekGrid.tsx`, new `src/components/WeekSummaryCard.tsx` · must not touch: `src/components/CreatePlanSheet.tsx`, `src/components/SlotEditSheet.tsx`, `src/components/ExpiringRow.tsx`, `src/components/PantryItemEditSheet.tsx`, new `src/lib/splitColumns.ts`, new `src/lib/useContainerWidth.ts`, `src/lib/constants.ts`, `package.json`, `DESIGN.md`, `STRUCTURE.md`, `CLAUDE.md`, `.env`
- **Spec:** Expiring sections in a `@container` grid `@min-[48rem]:grid-cols-2
  @min-[64rem]:grid-cols-3 gap-x-4 items-start`; the "now" section
  `@min-[48rem]:col-span-2 @min-[64rem]:col-span-1` (250); Log leftovers per
  244 and call 7. Meal plan: structural call 4; `WeekGrid` per 249 (slot
  taps call the same `onSlotTap` as `WeekCard`); Coming up and Past weeks
  per 248 (`WeekSummaryCard`; one `openWeekId` state in `MealPlanList`; the
  opened week renders `WeekGrid` under the row); `formatWeekRange` prints
  "to" instead of the en dash and its test is updated to match. Below
  1024px everything renders exactly as today.
- **Verification:** Gauntlet. **Evidence required:** as C2.

### C4 - Recipes list, Cookbooks, Cookbook detail
- **Status:** DONE (commit `51c3f34`; RecipeList 346 after the rail moved to RecipeLetterRail.tsx; the column count measures the outer wrapper, 32px wider than the letter block, so 2 and 3 columns start 32px early; Add recipe rendered twice with md:hidden / hidden md:flex)
- **Boundaries:** may touch: `src/components/RecipesBrowser.tsx`, `src/components/RecipeList.tsx`, `src/components/CookbookList.tsx`, `src/components/CookbookDetail.tsx`, `src/components/FlatRecipeRows.tsx`, `src/components/TagFilterChips.tsx`, `src/app/(app)/kitchen/cooking/recipes/page.tsx`, `src/app/(app)/kitchen/cooking/recipes/cookbooks/[id]/page.tsx`; may create (new): new `src/components/RecipeLetterRail.tsx` · must not touch: `src/components/RecipeFilterBar.tsx`, `src/components/FloatingAddButton.tsx`, new `src/lib/splitColumns.ts`, new `src/lib/useContainerWidth.ts`, `package.json`, `DESIGN.md`, `STRUCTURE.md`, `CLAUDE.md`, `.env`
- **Spec:** roots wide. All recipes: letter sections split with
  `columnCountFor(useContainerWidth(ref), 3)` and weight `recipes.length + 1`;
  every letter section stays mounted and keyed by letter so `sectionRefs`
  and the jump keep working; sticky headers keep `top: stickyOffset` inside
  their own section; the rail is outside the grid (fixed). Search + chips
  row per 252 (a `filters` slot in `RecipeList`'s measured search wrapper,
  which becomes a `@container`; chips `order-first` below `@min-[64rem]`).
  Cookbooks per 247 (`@container` grid `@min-[48rem]:grid-cols-2
  @min-[64rem]:grid-cols-4`). Cookbook detail: `FlatRecipeRows` gains the
  same split (3 columns, weight 1); Add recipe per 245 and call 7.
- **Verification:** Gauntlet. **Evidence required:** as C2, plus the rail jump proven in the browser
  by Strange.

### C5 - rulebooks (Fury, after gates)
- STRUCTURE.md "Wide pages": the measured-width rule (when and why), the
  header-row `md:` exception (call 7), the + button corner rule,
  the seven pages added to the wide list; the file-size trend row if a file
  crossed 350. DESIGN.md: the + corner rule beside `AddItemBar`'s line.
  CLAUDE.md: Current status and Bryce's checklist. Plan: one line pointing to
  mission 52 for L4's decisions (numbers assigned at sync to avoid colliding
  with L3). Small edits only; sync with `main` right before merging.

## Gates

Vision first (re-runs the Gauntlet, audits boundaries, hunts failure
scenarios: the hook on the server, a letter with one recipe in column 3,
empty sections, an empty inventory, the rail bottom with and without the
Sidebar). Then Strange (sizes above; proves the rail jump, the sheet positions
inside wide pages, no row over 600px, the + corner on Recipes and unchanged on
Goals) and Captain (new files, one source for the thresholds, soft caps). 3
passes each, fixes batched.

## Delivery

Gauntlet green, Vision PASS, Strange PASS, Captain PASS; recordcheck over the
range; `git log origin/main..HEAD` empty after push; PR merges after the
Gauntlet check; production deploy READY. Report to Bryce: what shipped, Hill's
decisions to look at, the iPad check for his list (the hard-reload column
jump; the rail above the + on All recipes; Safari sticky headers in columns).

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Captain | BLOCKED | the `AppChrome.tsx` comment above `<main>` names `data-page-width` but none of its users (rule at STRUCTURE.md ~1063); fix: one line pointing at "Wide pages" (A-L4-8) | Measured width is a legitimate extension (A-L4-1); header rows on `md:` acceptable (A-L4-2); + corner rule (A-L4-3); recipes `loading.tsx` scope: move the list page and skeleton into a route group `recipes/(browse)/` (A-L4-4); split-grid pattern written 7 times in 4 files: pending `SplitColumnGrid` (A-L4-5); STRUCTURE.md lines 676 to 679 now wrong about `formatWeekRange` (A-L4-6, 3 Day dash grandfathered); size trend row (A-L4-7); nine wide pages (A-L4-9); `splitColumns.ts` comment overclaims "one place" (CSS mirror classes); `RecipeLetterRail` lacks "use client"; `WeekGrid` repeats WeekCard's header; stale comments `calendarViewConfig.ts:209` and its test line 150; no new dependency direction |
| 1 | Vision | BLOCKED | (1) `RecipeList.tsx` wide: chips render left of the search box (markup order wins once `order-none` applies; decision 252 says search first); (2) new `recipes/loading.tsx` also covers `recipes/[id]`, `[id]/edit`, `[id]/print`, `new` and its four children, so out-of-scope pages flash wide then snap to 768px | Gauntlet re-run green (1415 tests; UTC 1408 pass, 7 skipped; build exit 0); every commit inside its boundary; Fury's `calendarViewConfig.test.ts` fix judged inert and recorded. NOTES: `splitByWeight` `while` can leave an empty middle column when one group is huge (change to `if`, add a test); hook comment should say attach to an always-rendered element; 3 Day title keeps an en dash (`formatThreeDayRange`) while Week says "to"; GroceryList comment overclaims stability under check-off; empty trolley grid adds a 24px margin above the "Everything" note on phones; Inventory's empty button wrapper adds 12px under the title on phones when both buttons are absent; tab order reversed on the Inventory header (touch only); WeekGrid cells lack a day/slot accessible name; a week open past Saturday midnight renders twice until tapped; `PantryList` search block not re-indented |

## Fix batch 1 (after pass 1)

### F1 - Vision's two blockers and the cheap notes
- **Status:** TODO
- **Boundaries:** may touch: `src/components/RecipeList.tsx`, `src/components/RecipeLetterRail.tsx`, `src/lib/splitColumns.ts`, `src/lib/splitColumns.test.ts`, `src/lib/useContainerWidth.ts`, `src/components/MealPlanList.tsx`, `src/components/WeekGrid.tsx`, `src/components/GroceryList.tsx`, `src/app/(app)/kitchen/inventory/page.tsx`, `src/lib/calendarViewConfig.ts` (one comment line only), `src/lib/calendarViewConfig.test.ts` (one comment line only); may move (git mv): `src/app/(app)/kitchen/cooking/recipes/page.tsx` and `src/app/(app)/kitchen/cooking/recipes/loading.tsx` into new `src/app/(app)/kitchen/cooking/recipes/(browse)/page.tsx` and new `src/app/(app)/kitchen/cooking/recipes/(browse)/loading.tsx` · must not touch: `src/components/AppChrome.tsx` (Fury, C5), `src/components/RecipesBrowser.tsx`, `src/components/PantryList.tsx`, `src/components/WeekCard.tsx`, `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`, `package.json`, `.env`
- **Spec:** (1) `RecipeList.tsx`: the `{filters && ...}` block moves after the search `<div className="relative ...">`, keeping `order-first @min-[64rem]:order-none`, so phones keep chips above the search and from a 1024px container the search comes first (decision 252; Vision blocker 1). (2) Route group: `git mv` the recipes list `page.tsx` and `loading.tsx` into `recipes/(browse)/`; the URL `/kitchen/cooking/recipes` is unchanged; `recipes/[id]`, `[id]/edit`, `[id]/print`, `new` and its children fall back to the shared narrow `(app)/loading.tsx` again (Vision blocker 2, Captain A-L4-4). Check imports still resolve (they are `@/` imports). (3) `splitByWeight`: the `while` that advances the cut becomes `if`, so a column advances at most one step per item and no empty column sits before a non-empty one; add a test "no empty column before a non-empty one" with the two probes `[a(1000), b, c, d]` 3 ways and `[a(1), b(100), c(1)]` 3 ways. (4) Comments: `useContainerWidth.ts` gains "attach the ref to an element that is always rendered (the effect depends only on the ref)"; `splitColumns.ts` header says `COLUMN_MIN_WIDTH_PX` is the one JavaScript home and that `@min-[48rem]:` and `@min-[64rem]:` are its CSS mirror; `MealPlanList.tsx` one line at the `COLUMN_MIN_WIDTH_PX[3]` compare saying the week grid needs the 3-column width; `GroceryList.tsx` comment says the split is stable as groups open and close, and that checking off rows can move a group because weights are unchecked counts; `calendarViewConfig.ts` around line 209 and its test around line 150: the two stale comments stop claiming the same shape or the en dash example (comment text only, no code). (5) `GroceryList.tsx`: when there are no to-buy groups, do not render the empty grid div, so the "Everything on the list is in the trolley" note keeps its old spacing on phones. (6) `inventory/page.tsx`: render the header button wrapper only when at least one button will render (no low items not yet listed and an empty review queue leaves no extra gap on phones). (7) `RecipeLetterRail.tsx` gets `"use client"` like its siblings. (8) `WeekGrid.tsx`: each cell button gets an `aria-label` like "Mon 2, Dinner: Tacos" (empty: "Mon 2, Dinner: Add"), using the same short day header helper. No em or en dashes anywhere.
- **Verification:** `npx tsc --noEmit`, `npm run lint`, `npm test` exit 0; `npm run build` exit 0 (you are the only builder now); `curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/kitchen/cooking/recipes` is 200 or 307 (the route still exists), and `find "src/app/(app)/kitchen/cooking/recipes" -name loading.tsx` lists only the `(browse)` one.
- **Evidence required:** tails of every command with counts; the `find` output; `git status --short` (expect the two renames); `wc -l` of touched files; the final order of the search and filters blocks (a 6-line excerpt).

## Handoff log

- 2026-11-07: mission opened from the L4 chat; Banner brief and Hill batch done; contracts C0 to C5 written.
- 2026-11-07: C0 to C4 built and committed (`4ff2568`, `804b5a0`, `ffbd3d1`, `51c3f34`, `ed57b98`). Dev server for the gates runs on port 3001 (3000 is another chat's). Fury's call on the way: `formatWeekRange` is shared with the Calendar Week title, so that title also reads "Nov 1 to 7" now (one source, one spelling, no en dashes).

## Model switch

Bryce asked: planning on Fable (done here), build and gates on Opus 5.5. After
plan approval the first step is to prompt Bryce to switch the model back to
Opus 5.5 before dispatching C0 and C1.
