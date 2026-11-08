# Mission 51: iPad landscape L5 (Recipe page, Goal page, Plans tabs)

**Project:** family-hub (Marshee)
**Status:** DELIVERING (all three gates PASS on pass 2, 2026-11-07)
**Started:** 2026-11-07 · **Updated:** 2026-11-07
**Branch:** `claude/ipad-landscape-l5-c6ce5b` (worktree, from `origin/main` at `798c475`)
**Plan:** `.avengers/plans/ipad-landscape-v1.md`, step L5 of L1 to L6. Fury's
approved build plan for this step: `~/.claude/plans/moonlit-sprouting-umbrella.md`
(Bryce approved it 2026-11-07; its contracts are copied below).
**Models:** Fury planned on Fable; build, gates and delivery run on Opus 5.5
(Bryce's rule, 2026-11-07).

## Brief

- **Goal:** on the kitchen iPad in landscape (1180px) the Plans tabs, the
  Goal page and the Recipe page still sit in a 768px column. L5 makes them
  wide with the L1 rule: This week's goal cards in 2 columns (the Sunday
  recap across the top), the Goals board as 3 life-area columns, Vision's
  six cards 3 across, the Goal page as two panels (The result left, The
  plan right), and the Recipe page with Ingredients (400px) beside the
  Steps, the hero dropped for a small icon by the title (decision 216).
- **Done means:** at 1180x820 each page shows the columns above; at 1180
  with Menu style = Sidebar each steps down one column count on its own;
  at 820x1180 This week and the Goal page are 2 columns and the Goals
  board is 2 column-major columns; at 375 every page reads as it does
  today (the recipe page in the order Hill picks); every sheet still opens
  on the viewport; the public share and print recipe pages are unchanged;
  the Gauntlet is green; STRUCTURE.md and DESIGN.md carry the entries;
  the PR merges and production shows it.
- **Out of scope:** Kitchen lists, forms, Settings, Habits and Chores (L3,
  L4, L6, other chats); the `FloatingAddButton` corner change (L4's chat
  owns it: L5 waits for it to land on main and inherits it through
  `GoalsList`'s existing use); recipe photos; any data change.

## Bryce's decisions that bind this step

215 (page types and mocks), 216 (recipe hero dropped on wide, small icon
beside the title), 219 (Goals is the 3-column life-area board), 223 (the
11-inch iPad: 1180x820 and 820x1180; gates test both plus 1180 with the
Sidebar). Plan text: This week 2 columns with the recap spanning; Vision 3
across; Goal page two panels, More menu top right; Recipe page header row,
Ingredients 400px beside Steps, Nutrition and Rating under the ingredients,
Notes under the steps.

## Fury's structural calls

- The L1 rule exactly: `data-page-width="wide"` on page and loading roots;
  one `@container` div around the columns only, never around an element
  that renders a sheet; `@min-[48rem]:` for 2 columns and `@min-[64rem]:`
  for 3; never `md:`/`lg:` for column counts.
- **One screen breakpoint, documented:** `RecipeHero` hides its decorative
  block and shows the icon tile from `md`, because the hero sits in the
  header band (which holds the action sheets, so it cannot be a container)
  and `md` is exactly where `AppChrome` lifts the page's width cap.
- **Column dissolve on phones:** the recipe body's two column divs carry
  `@max-[48rem]:contents` and their children `order-N`, so one DOM gives the
  wide two-column layout and a different phone order. Allowed for a small
  fixed set of sections; never for a data list.
- **`RecipeBody` splits into `RecipeIngredientsSection`, `RecipeStepsSection`,
  `RecipeNotesSection`** (exported from the same file) and composes them, so the
  share and print pages keep one source and change nothing.
- **Goals board placement is pure CSS** (`grid-flow-col` with a fixed row
  count), no JS split helper: the six areas are a fixed list.

## Danger register

From AGENTS.md, absolute for every agent:
- Local dev uses the Neon `dev` branch. A `DATABASE_URL` whose host is not
  the dev endpoint: stop and say so. No agent edits `.env`.
- `npm run db:seed` and `npm run db:reset` are forbidden. No clean or reset
  script for `User`. No migration in this mission.
- The dev branch holds real family data: private.
- Never `git add -A` / `git add .`; stage by explicit path; `git show --stat HEAD` after each commit.
- Direct pushes to `main` are blocked; branch, PR, Gauntlet green, merge.
- Shared files (`STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`, `HubNav.tsx`,
  `package.json`) get small edits only; sync with main right before merging.

## Gauntlet

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts`
- `npm run build`

## Assembled

- Stark x3 (C1, C2, C3: disjoint files, in parallel) + Vision (always).
- Strange: every change is visible; measures 1180, 1180 + Sidebar, 820, 375.
- Captain: the `RecipeBody` split, a new cross-page layout pattern (the
  column dissolve), STRUCTURE.md amendments, a diff likely over 300 lines.
- Hill: eleven content and design calls (H1 to H11 below).
- No Banner: Fury read every file inline while planning.

## Contracts

### C1 - the Plans tabs (This week, Goals board, Vision, skeleton)
- **Status:** DONE (Stark: Gauntlet green; both arbitrary grid-rows classes in the compiled CSS; new recipe loading.tsx 17 lines)
- **Boundaries:** may touch: `src/app/(app)/plans/page.tsx`,
  `src/app/(app)/plans/loading.tsx`, `src/components/ThisWeekList.tsx`,
  `src/components/GoalsList.tsx`, `src/components/VisionBoard.tsx`,
  `src/lib/goalVocabulary.ts` (one new string only) · must not touch:
  `src/components/GoalCard.tsx`, `src/components/VisionCard.tsx`,
  `src/components/WeekRecapCard.tsx`, `src/components/FloatingAddButton.tsx`,
  `src/components/GoalDetail.tsx`, `src/app/(app)/plans/goals/`,
  `src/components/AppChrome.tsx`, `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`,
  `package.json`, `prisma/`.
- **Spec:**
  1. `plans/page.tsx`: both returned roots get `data-page-width="wide"`.
     `plans/loading.tsx`: root gets it too; the skeleton becomes header, the
     tab bar block, then `<div className="@container"><div className="grid
     grid-cols-1 gap-3 @min-[48rem]:grid-cols-2">` with four skeleton rows
     (use `SkeletonBlock`s shaped like a card, or `SkeletonList` per cell if
     it accepts a count of 1; keep the file tiny).
  2. `ThisWeekList.tsx`: the recap card, the week line, the filter chips and
     the error stay above, full width. The goal-card `flex flex-col gap-3`
     becomes `<div className="@container"><div className="grid grid-cols-1
     items-start gap-3 @min-[48rem]:grid-cols-2">…</div></div>`. The
     `EmptyState` may sit inside or outside the container (its choice);
     `HoursLogSheet` stays a sibling of the container, outside it.
  3. `GoalsList.tsx`: render all six `LIFE_AREAS` sections (not only those
     with goals) as children of `<div className="@container"><div
     className="grid grid-cols-1 items-start gap-x-4 gap-y-5
     @min-[48rem]:grid-cols-2 @min-[48rem]:grid-rows-3 @min-[48rem]:grid-flow-col
     @min-[64rem]:grid-cols-3 @min-[64rem]:grid-rows-2">`. An area with no
     goals under the current chip renders its heading plus one muted line,
     `GOAL_BOARD_EMPTY_AREA` from `goalVocabulary.ts` ("No goals here yet"),
     and the whole section carries `hidden @min-[64rem]:block` so below 3
     columns the board looks exactly as today (empty areas gone). The two
     `EmptyState`s (no goals at all, none under this chip) keep their
     current logic and stay outside the container. The Active/Done chips,
     the spacer and `FloatingAddButton` are unchanged and outside the
     container. Rewrite the header comment: column-major flow, why (the
     mock stacks fixed pairs), the empty-area rule.
  4. `VisionBoard.tsx`: wrap the card grid in `<div className="@container">`
     and make it `grid grid-cols-2 gap-3 @min-[64rem]:grid-cols-3`. The
     `VisionSheet` and the hint stay outside the container. Leave
     `VisionCard`'s `wide` prop as it is.
  - No em or en dashes anywhere. Each file under 350 lines. No new
    package. Container variants are built into Tailwind v4 (the repo uses
    `@container` and `@min-[…]` in `DashboardWidgetList.tsx`).
- **Verification:** the whole Gauntlet passes. A dev server may be running
  on port 3000; do not start or stop one.
- **Evidence required:** each Gauntlet command's tail; line counts of the
  touched files; `git status --short`; the exact class strings on the three
  grids and the skeleton.
- **Done criteria:** Strange measures This week (2 columns at 1180, 820 and
  Sidebar; 1 at 375), the Goals board (3 at 1180; 2 column-major at 820 and
  Sidebar; 1 at 375 with empty areas hidden), Vision (3 at 1180; 2
  otherwise); every sheet opens on the viewport.

### C2 - the Goal page as two panels
- **Status:** DONE (Stark: Gauntlet green, 1403 tests, build exit 0; GoalDetail 289 lines)
- **Boundaries:** may touch: `src/app/(app)/plans/goals/[id]/page.tsx`,
  `src/components/GoalDetail.tsx` · must not touch:
  `src/components/GoalResultCard.tsx`, `src/components/CheckInHistory.tsx`,
  `src/components/PlanItemRow.tsx`, any sheet component,
  `src/app/(app)/plans/page.tsx`, `src/app/(app)/plans/loading.tsx`,
  `src/components/ThisWeekList.tsx`, `src/components/GoalsList.tsx`,
  `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`, `package.json`, `prisma/`.
- **Spec:**
  1. `goals/[id]/page.tsx`: root gets `data-page-width="wide"`. Title, meta
     line and Why stay across the top; the "Part of … vision" line stays
     below `GoalDetail` as today (H4).
  2. `GoalDetail.tsx`: the More circle row stays first. Then
     `<div className="@container"><div className="grid grid-cols-1
     items-start gap-5 @min-[48rem]:grid-cols-2">` with two panel divs:
     left `GoalResultCard`; right "The plan" heading (`mt-5` becomes
     `mt-5 @min-[48rem]:mt-0` so the panels start level), the list or the
     "No plan yet" text, the error line, and the "Add to the plan" button.
     Every sheet (`HoursLogSheet`, `ActionSheet`, `CheckInSheet`,
     `PlanItemSheet`) stays after the container, outside it, as today.
     Update the component comment to name the two panels and the
     container rule.
  - No em or en dashes. `GoalDetail.tsx` stays under 350 lines (277 now).
- **Verification:** the whole Gauntlet passes. Dev server on 3000 may be
  running; do not start or stop one.
- **Evidence required:** Gauntlet tails; line counts; `git status --short`;
  the grid's class string.
- **Done criteria:** Strange measures two level panels at 1180, 820 and
  Sidebar, one column at 375; Check in, More, Add to the plan and the
  hours sheet all open on the viewport.

### C3 - the Recipe page: header band and two-column body
- **Status:** DONE (Stark: Gauntlet green; page 177 lines, RecipeBody 95, RecipeHero 31; `@max-[48rem]:contents` proven in compiled CSS, Tailwind emits `width <` so it never overlaps `@min-[48rem]`; Cookbooks and Tags sheets inside the body container, documented)
- **Boundaries:** may touch:
  `src/app/(app)/kitchen/cooking/recipes/[id]/page.tsx`,
  `src/components/RecipeHero.tsx`, `src/components/RecipeBody.tsx`,
  `src/components/RecipeActionCircles.tsx` (add an optional `className`
  prop only) · must not touch: `src/app/share/recipe/[token]/page.tsx`,
  `src/app/(app)/kitchen/cooking/recipes/[id]/print/page.tsx`,
  `src/components/RecipeMeta.tsx`, `src/components/NutritionSection.tsx`,
  `src/components/RecipeStars.tsx`, `src/components/RecipeCookedButton.tsx`,
  `src/components/RecipeCookbooksSection.tsx`,
  `src/components/RecipeTagsSection.tsx`,
  `src/components/RecipeDetailHeader.tsx`, `src/components/ActionCircle.tsx`,
  `src/components/RecipesBrowser.tsx`, `STRUCTURE.md`, `DESIGN.md`,
  `CLAUDE.md`, `package.json`, `prisma/`.
- **Spec:**
  1. `page.tsx`: root gets `data-page-width="wide"`. `RecipeDetailHeader`
     stays first. Then the **header band**, NOT a container (it holds the
     action sheets): `<div className="mb-6 flex flex-wrap items-start
     gap-4">` holding `RecipeHero`, then `<div className="min-w-0 flex-1
     basis-[20rem]">` with the `h1` (keep its classes, drop `mb-1` if the
     meta sits right under) and `RecipeMeta`, then `RecipeActionCircles`
     with `className="shrink-0 md:ml-auto"` (its own `mb-6` and
     `justify-around` may need to become `w-full justify-around md:w-auto
     md:gap-6`; keep the three circles, H5). On a phone the circles wrap
     onto their own full-width row.
  2. `RecipeHero.tsx`: render both looks and let CSS pick: the existing
     decorative block gets `md:hidden`; add `<div aria-hidden="true"
     className="hidden h-16 w-16 shrink-0 items-center justify-center
     rounded-2xl bg-accent-soft text-accent md:flex"><ChefHat size={30} /></div>`.
     Comment why this is a screen breakpoint and not a container variant:
     the hero sits in the header band (sheets, so no container) and `md` is
     where `AppChrome` lifts the page's width cap, so "wide" means the same
     thing to both (H9, decision 216).
  3. `RecipeBody.tsx`: export `RecipeIngredientsSection`, `RecipeStepsSection` and
     `RecipeNotesSection` (each one of today's three `<section>`s, same markup and
     classes, taking the string it needs; `RecipeNotesSection` returns null for
     null notes); `RecipeBody` composes the three so the share and print
     pages render byte-for-byte the same. Keep the shared-with-share-page
     comment and say why the split exists.
  4. **Body** in `page.tsx`: `<div className="@container"><div
     className="flex flex-col @min-[48rem]:grid
     @min-[48rem]:grid-cols-[25rem_minmax(0,1fr)] @min-[48rem]:items-start
     @min-[48rem]:gap-5">` holding two column divs, each `flex flex-col
     @max-[48rem]:contents`. Left column: `RecipeIngredientsSection` (`order-1`),
     `NutritionSection` (`order-4`), a **Rating card** `<section
     className="mb-6 rounded-2xl border border-line bg-surface p-4 flex
     flex-col gap-3">` with an `h2` "Rating" (same heading classes as
     Ingredients) holding `RecipeStars` and `RecipeCookedButton`
     (`order-5`, H6). Right column: `RecipeStepsSection` (`order-2`), `RecipeNotesSection`
     (`order-3`), `RecipeCookbooksSection` (`order-6`),
     `RecipeTagsSection` (`order-7`). Each ordered child is the section
     itself where the section is yours (`RecipeIngredientsSection` etc. accept a
     `className` for the order; or wrap each in a `<div className="order-N
     contents">`-free plain div: pick the one that keeps the sections'
     own `mb-6` spacing working in both layouts and say which). `order-*`
     classes only matter on the phone (when the columns dissolve); at
     48rem and up the column divs are real and the DOM order inside each
     is the visible order. Phone reading order (H8): Ingredients,
     Instructions, Notes, Nutrition, Rating + Cooked, Cookbooks, Tags.
  5. `RecipeCookbooksSection` and `RecipeTagsSection` open sheets and sit
     inside the body container. Preferred: keep them there and note it (the
     same known exception STRUCTURE.md lists for `HoursLogSheet`; current
     Chrome keeps fixed children on the viewport). Do not restructure those
     components.
  6. The top-of-file comment in `page.tsx` still describes the old
     top-to-bottom order; rewrite it for the header band and the two
     columns, and name the one screen breakpoint (`RecipeHero`).
  - No cookbook names or tags in the header line (H7). No em or en dashes.
    Each file under 350 lines. No new package.
- **Verification:** the whole Gauntlet passes. Also open
  `/share/recipe/<token>` logic by reading: confirm the share and print
  pages import only `RecipeBody` and `RecipeMeta` and that `RecipeBody`'s
  output markup is unchanged (diff the JSX). Dev server on 3000 may be
  running; do not start or stop one.
- **Evidence required:** Gauntlet tails; line counts; `git status --short`;
  the class strings on the header band, the body grid and the two column
  divs; the `order-N` on each section; the `RecipeBody` diff showing the
  composed output unchanged.
- **Done criteria:** Strange measures Ingredients at 400px beside the Steps
  at 1180, 820 and Sidebar; one column in Hill's order at 375; the hero
  gone and the icon tile present from 768px screens; Meal Plan, Groceries,
  Share, cookbook Add and tag Add sheets open on the viewport; the share
  page and print page look as before.

### C4 - rulebooks (Fury, after the gates)
- **Status:** PENDING
- **Boundaries:** `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`, this file,
  `.avengers/plans/ipad-landscape-v1.md`.
- **Spec:** STRUCTURE.md "Wide pages": the five new wide pages and their
  containers; the `@max-[48rem]:contents` column dissolve (fixed section
  sets only); the `RecipeHero` `md:` exception and why; the `RecipeBody`
  split. DESIGN.md: Goals board, Goal page panels, recipe header band.
  CLAUDE.md: Current status and an "L5 iPad check" on Bryce's checklist.
  Plan: decisions recorded, L5 delivered, the FloatingAddButton note.
- **Verification:** `node ~/.claude/skills/avengers/recordcheck.mjs` over
  the range before delivery.

## Hill's batch (H1 to H11)

Fury's recommendation first. Hill decides for Bryce; Bryce can overturn any.

- **H1** Show all six life areas on the 3-column board, empty ones with one
  muted line. Rec: yes.
- **H2** Two-column state (820 upright, Sidebar at 1180): column-major,
  three areas per column in the fixed order. Rec: column-major.
- **H3** Goal page panels: equal halves. Rec: equal.
- **H4** The "Part of … vision" line stays under both panels. Rec: yes.
- **H5** Recipe header actions stay the three circles, not pills. Rec: circles.
- **H6** Cooked today sits in the Rating card, not the header. Rec: card.
- **H7** No cookbook names or tags repeated in the header line. Rec: skip.
- **H8** Phone order: Ingredients, Instructions, Notes, Nutrition, Rating +
  Cooked, Cookbooks, Tags. Rec: that order.
- **H9** The hero hides from `md` (768px screens, upright iPad included).
  Rec: yes.
- **H10** This week stays 2 columns at every width. Rec: 2.
- **H11** Ingredients column fixed at 25rem (400px, the mock). Rec: yes.

## Hill's decisions (2026-11-07; numbering continues from mission 49's 243)

Hill agreed with Fury's recommendation on H1 to H7 and H9 to H11, and
changed H8. Medium calls for Bryce to glance at: H5, H6, H8.
- **244 (H1, small):** all six life areas show on the 3-column board,
  empty ones with "No goals here yet"; hidden below 3 columns as today.
- **245 (H2, small):** the 2-column state is column-major, three areas per
  column in LIFE_AREAS order.
- **246 (H3, small):** Goal page panels are equal halves.
- **247 (H4, small):** the "Part of ... vision" line stays under both panels.
- **248 (H5, medium):** the recipe header keeps the three ActionCircles,
  not the mock's pills (one shared control, 56px targets, one DOM).
- **249 (H6, medium):** Cooked today sits in the Rating card with the
  stars, not in the header (it is a record like the rating, and the mock
  drew a state the button does not have).
- **250 (H7, small):** no cookbook names or tags repeated in the header
  meta line (duplicate information with live Add sheets elsewhere).
- **251 (H8, medium, changed from Fury's order):** phone order is
  Ingredients, Instructions, Notes, Rating + Cooked, Nutrition, Cookbooks,
  Tags ("Mark as cooked" is what you do right after the steps; Nutrition
  can be a tall panel). Applied by Fury: `order-4` and `order-5` swapped in
  the recipe page and its comment; tsc clean.
- **252 (H9, small):** the hero hides from `md` (upright iPad included).
- **253 (H10, small):** This week is 2 columns at every width.
- **254 (H11, small):** the Ingredients column is fixed at 25rem.
Hill's watch items: the Goals board's shared grid rows leave a gap under a
short first-row area (Strange to judge; fallback is three fixed column divs
at 64rem and one stack below); DESIGN.md's "the gradient + ChefHat hero is
the permanent treatment" must be narrowed to phones in C4; the Rating card
is the one card among divider sections on the phone (Strange to judge).

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | BLOCKED | `GoalsList.tsx:84`: `grid-rows-3`/`grid-rows-2` compile to `repeat(n, minmax(0,1fr))`, so with no fixed height every row grows to the tallest life area (headless Chrome: 1120px board vs 680 with `auto` rows at 800px; 1220 vs 740 at 3 columns). Fix: `grid-rows-[repeat(3,auto)]` and `grid-rows-[repeat(2,auto)]`. | Gauntlet re-run green (1403 tests; UTC 1396 + 7 skipped; build exit 0); boundaries clean (`.claude/launch.json` is a local dev-port entry, never staged); share and print pages identical; `@max-[48rem]:contents` compiles to `@container not (min-width:48rem)`, so no overlap; `mb-6` survives the dissolve. NOTES: `NutritionSection`'s `ConfirmServingsSheet` is a third sheet inside the recipe body container (document it, iPad check); screen readers and focus follow DOM order on the phone, not the `order-N` order (for Captain); wrappers not re-indented. |
| 1 | Captain | BLOCKED | `NutritionSection`'s Confirm servings sheet (`fixed inset-0`) sits inside the recipe body container, undeclared in the page comment, the contract and the planned C4 entry. Fix: the page comment names Nutrition, Cookbooks and Tags; A-L5-4 lists all three; Strange checks it on the viewport. | NOTES: overclaiming comments (`RecipeBody.tsx:11,19`, `GoalDetail.tsx:31`, `GoalsList.tsx:21`, `RecipeHero.tsx:6-8`); `RecipeActionCircles` `className` replaces the whole layout where the repo convention (`HabitFilterChips`, `DaySectionHeader`) keeps the component's own `flex` and defaults spacing only (optional A-L5-9, Fury adopts it); skeleton string copy waits for A-L2-3 in L3 (shared strings must live in a non-client module, not `ThisWeekList`); `AppChrome` `<main>` comment names no `data-page-width` users (A-L5-8 moves the list to Wide pages). Amendments A-L5-1 to A-L5-9 and the DESIGN.md hero sentence drafted in Captain's report (kept in this file under C4 when applied). |
| 1 | Strange | BLOCKED | Goals board at 2 columns (820, and 1180 + Sidebar) with 3 or fewer non-empty areas: the fixed `grid-rows-[repeat(3,auto)]` with `grid-flow-col` stacks 1 to 3 areas in the left column and leaves the right half blank (reproduced at 820; the normal Done-chip case). Fix: a computed `--board-rows` (ceil(visible areas / 2), min 1) on the grid and `grid-rows-[repeat(var(--board-rows),auto)]` at 48rem; 3 columns keep `repeat(2,auto)` since all six render there. | Measured clean: This week 2 x 568 / 440 / 388, 1 at 375; Goals 3 x 367 at 1180 (rows auto 378/288 after the 1fr fix), 2 x 430 at 924, 2 x 379 at 820, column-major, empty line at 3 columns only; Vision 3 x 375 then 2; Goal page 564+564, 436+436, 384+384, level at y=274; recipe Ingredients 400 at every wide width, Instructions 713/457/353, hero hidden and icon tile 64x64 from 768, phone order matches 251, no sideways scroll; share and print unchanged; skeleton 2 columns; every sheet centered on the viewport at 1180 and bottom-anchored at 375, including the three inside the recipe body container. 1180 + Sidebar was a 924px stand-in: the Menu style save fails in dev (N1). NOTES: uneven board reads as two bands, not broken (Hill's watch item closed); + floats over the Health card until L4; phone Goal page doubles a gap (`gap-5` + the heading's `mt-5`: make it `mt-0`); Rating sits above Nutrition at wide too (the `order-N` applies inside the real column) and the DOM no longer matches the wide screen; at 820 Ingredients (400) is wider than Instructions (353), Bryce's glance; the recipe page inherits `(app)/loading.tsx` at 768px so `main` jumps 768 to 1165 on load; the More circle has its own row; the Rating card is one bordered card between a filled box and a divider, acceptable; **N1 (older than L5):** in dev every server action crashes with "RecipeIngredientSuggestion is not defined" from `export type` in the "use server" file `src/app/actions/groceriesRecipes.ts:35` (same class as the open HabitInput item), so the Groceries sheet is unverified and Menu style cannot be saved in dev; check production. |
| 2 | Vision | PASS | none | Gauntlet re-run green (1403; UTC 1396 + 7 skipped; build exit 0); boundaries clean; both `grid-rows` classes in the compiled CSS inside their `@container` rules, the 64rem one later so it wins; `--board-rows` renders as `style="--board-rows:n"`; 1 to 6 visible areas never make a third column and use the right column from 2 up; share and print identical; `RecipeActionCircles` default equals the old classes. NOTES: `[id]/edit` and `[id]/print` inherited the wide skeleton (print fixed by Fury with its own `print/loading.tsx`; edit waits for L6); two stale comment lines in the recipe page (fixed by Fury); the DESIGN.md hero line kept its old em dash (fixed by Fury); Tailwind also emits unprefixed `grid-rows-[...]` rules picked up from comment text, unused; Strange's N1 (`groceriesRecipes.ts` `export type` in a "use server" file) is older than L5 and needs a production check. |
| 2 | Captain | PASS | none | A-L5-1 to A-L5-8 landed where they belong and read true against the code; the wide-pages list is in one place (STRUCTURE.md; DESIGN.md and AppChrome point to it); `className` convention holds. NOTES applied by Fury: N1 two stale recipe-page comments; N2 the em dash in the DESIGN.md hero line; N3 a plain `print/loading.tsx` (edit carries to L6); N6 A-L5-9 written into Naming. Left as notes: N4 the recipe skeleton mirrors the body grid string (second mirrored string; A-L2-3 in L3 should list both, shared strings must live in a non-client module); N7 STRUCTURE.md is 1534 lines, 2.4 times its own 650-line housekeeping trigger: a separate one-PR cleanup mission is due. |
| 2 | Strange | PASS | none | Goals board at 820: 2 columns of 386px; 5 areas 3+2, 4 give 2+2, 3 give 2+1, 2 give 1+1, 1 left only, never a third track; 924 the same; 1180 still 3 columns of all six with the empty line; the real 5-area state rendered `--board-rows: 3` on its own (2 and 3 areas simulated in the DOM; a real Done filter with 2 or 3 areas is a one-glance device check once finished goals exist). Phone Goal page gap 20px. Recipe skeleton wide from first paint at 1180 (400 + 728), 820 (400 + 368), one column at 375; the 768 to 1165 jump is gone. Circles row full width under the title at 375, right of the title at 1180. Left column Ingredients, Rating card, Nutrition with one divider. Dark mode correct after reload. NOTES: the 3+2 board keeps the two-bands look (accepted in pass 1); a dev theme-switch artifact left a few chips in the other theme until reload. |

## Fix batch 2 (after pass 1 of all three gates)

### F1 - gate fixes, one builder
- **Status:** DONE (Stark: Gauntlet green; both arbitrary grid-rows classes in the compiled CSS; new recipe loading.tsx 17 lines)
- **Boundaries:** may touch: `src/components/GoalsList.tsx`,
  `src/components/GoalDetail.tsx`, `src/components/RecipeBody.tsx`,
  `src/components/RecipeHero.tsx`, `src/components/RecipeActionCircles.tsx`,
  `src/app/(app)/kitchen/cooking/recipes/[id]/page.tsx`,
  new `src/app/(app)/kitchen/cooking/recipes/[id]/loading.tsx` ·
  must not touch: `src/components/NutritionSection.tsx`,
  `src/app/actions/groceriesRecipes.ts`, `src/components/AppChrome.tsx`,
  `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`, `package.json`, `prisma/`, and
  every other file.
- **Spec:**
  1. **Strange's blocker, `GoalsList.tsx`:** compute `const boardRows =
     Math.max(1, Math.ceil(groups.filter((g) => g.goals.length > 0).length / 2))`
     (groups = the six areas under the current chip); put
     `style={{ "--board-rows": boardRows } as React.CSSProperties}` on the
     grid div; replace `@min-[48rem]:grid-rows-[repeat(3,auto)]` with
     `@min-[48rem]:grid-rows-[repeat(var(--board-rows),auto)]`; keep
     `@min-[64rem]:grid-rows-[repeat(2,auto)]` and `grid-flow-col`. Fix the
     header comment (Captain): "2 columns of 3 at 48rem" is only true with
     six visible areas; say the row count is ceil(visible / 2) at 2 columns
     (5 areas give 3+2, 4 give 2+2, 3 give 2+1, 2 give 1+1) and 2 rows of
     all six at 3 columns, column-major.
  2. **`GoalDetail.tsx`:** "The plan" `h2` class `mt-5 @min-[48rem]:mt-0`
     becomes `mt-0` (the grid's `gap-5` already gives 20px in both layouts;
     Strange measured 40 on the phone). Comment line 31: replace "the
     sidebar and the 820 iPad step down on their own" with "so 1180, the
     Sidebar and the 820 iPad all get two panels and a phone gets one, with
     no extra code".
  3. **Recipe `page.tsx`:** (a) the comment at lines 35 to 37 says
     "Nutrition (Confirm servings), Cookbooks and Tags open sheets from
     inside the container" (Captain's blocker). (b) In the left column,
     move the Rating card block ABOVE the `NutritionSection` block in the
     DOM (keep `order-4` on Rating and `order-5` on Nutrition), so the DOM
     order matches the wide screen: Ingredients, Rating + Cooked,
     Nutrition. Update the comment's phone order line if needed (it already
     reads Ingredients, Instructions, Notes, Rating + Cooked, Nutrition,
     Cookbooks, Tags). (c) `RecipeActionCircles` call: pass
     `className="w-full shrink-0 justify-around md:ml-auto md:w-auto md:gap-6"`
     (see 5).
  4. **New `recipes/[id]/loading.tsx`:** a skeleton shaped like the page,
     root `<div className="py-2" data-page-width="wide" role="status"
     aria-label="Loading">`: a header-row block, a title block, then
     `<div className="@container"><div className="flex flex-col gap-5
     @min-[48rem]:grid @min-[48rem]:grid-cols-[25rem_minmax(0,1fr)]">` with
     a tall skeleton block in each column. Use the `Skeleton*` helpers in
     `src/components/Skeleton.tsx` (read it first). Keep it under 30 lines.
     Note in a one-line comment that `edit/` and `print/` under `[id]`
     inherit it until they get their own (edit goes wide in L6).
  5. **`RecipeActionCircles.tsx` (Captain's A-L5-9 convention):** keep
     `flex items-center` inside the component; the prop becomes
     `className = "mb-6 justify-around"` as a spacing-only default, applied
     as `className={\`flex items-center ${className}\`}`. With 3(c) the
     page's row keeps today's measured look (full width, wrapped, on the
     phone; right of the title from `md`).
  6. **Comments (Captain):** `RecipeBody.tsx` lines 11 and 19: "Rendered
     whole by the share page and the print page; the private detail page
     places the three sections itself." (drop the "Both pages render
     RecipeMeta immediately before" claim). `RecipeHero.tsx` lines 6 to 8:
     C7 was dropped, so the hero is the permanent phone treatment; the
     detail page is its one user; from `md` the icon tile (decision 216).
  - No em or en dashes in added lines. Every file under 350 lines.
- **Verification:** the full Gauntlet; then confirm in the compiled CSS
  (`.next/static/chunks/*.css` after the build) that
  `grid-rows-[repeat(var(--board-rows),auto)]` and
  `grid-rows-[repeat(2,auto)]` are generated.
- **Evidence required:** Gauntlet tails; the grep hits in the compiled CSS;
  the new grid class string and the `style` attribute; line counts;
  `git status --short`.
- **Done criteria:** Strange re-measures the board at 820 with 2 and 3
  visible areas (2 columns used), the phone Goal page gap (20px), the
  recipe loading skeleton wide from first paint, and the circles row at
  375 and 1180; Captain re-checks the comments and the `className`
  convention; Vision re-runs the Gauntlet and the compiled-CSS check.

## Fix batch 1 (after Vision pass 1)

Vision's blocker: applied by Fury as a two-class edit in `GoalsList.tsx:84` (Vision named the exact classes; tsc clean; dev server hot-reloaded for Strange). Needs Vision's re-check that both arbitrary classes are in the compiled CSS, batched with any Strange or Captain fixes.

## Handoff log

- 2026-11-07: Fury (Fable) read the plan, L1 and L2 missions, the two
  mocks and every file involved; wrote the build plan; Bryce approved it
  and switched the chat to Opus 5.5. L4's FloatingAddButton change has not
  landed on main (checked `origin/main`, no L4 branch on origin). Mission
  file opened, C1 to C3 dispatched in parallel, Hill's batch sent.
- 2026-11-07: C1 to C3 built in parallel (one Stark each); Hill decided
  H1 to H11 (decisions 244 to 254, H8 changed). Pass 1: all three gates
  BLOCKED (Vision: 1fr rows; Captain: the undeclared Nutrition sheet;
  Strange: the 2-column board with 3 or fewer areas). F1 fixed all three
  plus the notes. Pass 2: all three PASS. C4 rulebooks written by Fury
  (STRUCTURE.md A-L5-1 to A-L5-9, DESIGN.md, CLAUDE.md, the plan).
  Final Gauntlet green (1403 tests). L4 still not on main; Bryce chose to
  merge L5 now (the board inherits L4's button later).
