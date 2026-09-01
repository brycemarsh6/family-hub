# Dashboard rebuild: four data tiles

## Context

The dashboard (`/`) is the least-developed surface in the app — a single Kitchen card with three counts, unchanged since before any branch was deep. Bryce wants it to be the family's real front door: at-a-glance info plus quick links to the most-used functions. Decisions already made with him: **Today's meals** full-width on top (the only daily-changing tile), **Inventory** + **Grocery** side by side, **Recipes** below; the old Kitchen card is replaced entirely (the bottom nav still reaches the Kitchen branch). Grocery shows count + per-store breakdown; Recipes shows count + newest title; Inventory shows stocked/low/expiring plus the 2–3 *most urgent* low item names (Out first — there's no "staples" concept in the data; flagged for the future).

## Files

**Create**
- `src/lib/dashboard.ts` — pure logic: `todaysMeals(plans, today)`, `storeBreakdown(items)`, `urgentLowItems(lowItems, max)`
- `src/lib/dashboard.test.ts` — node:test coverage (~12 cases). **Must live in `src/lib/`** — the `npm test` glob (`package.json:10`) only runs `src/lib/*.test.ts` + `src/lib/voice/*.test.ts`; a test elsewhere silently never runs
- `src/components/DashboardTile.tsx` — one shared tile shell (Link wrapper, header row with rendered-ReactNode icon, optional warn-soft badge, children body). No `"use client"` — usable from both sides; icons are pre-rendered elements per BranchTile's RSC lesson
- `src/components/TodayMealsTile.tsx` — `"use client"`; the only `useToday()` caller on the page
- `src/app/(app)/(home)/page.tsx` — the rebuilt dashboard (route `/` unchanged — groups are URL-invisible)
- `src/app/(app)/(home)/loading.tsx` — tile-shaped skeleton (meals h-56 wide / two h-36 / recipes h-24 wide)

**Delete:** `src/app/(app)/page.tsx` (and its private `BranchWidget` — nothing else imports it).
**Untouched:** `src/app/(app)/loading.tsx` stays the catch-all for calendar/chores/lists/settings.

**Why the `(home)` route group:** the dashboard needs its own tile-shaped `loading.tsx`, but `(app)/loading.tsx` is both the dashboard's boundary *and* the catch-all for four other placeholder routes. Reshaping it would mis-shape those; two `loading.tsx` can't share a segment. A route group gives `/` a private Suspense boundary.

## Data: one `Promise.all` (force-dynamic page, house performance rule)

Inside the component (per-request), `const serverNow = new Date()` — used for *window tolerance only*, never "today":

1. `db.pantryItem.findMany` — select `name, quantity, lowThreshold, category, location, expiresAt, restockedAt` (total = `.length`; the old separate `count()` is dropped as redundant)
2. `db.groceryItem.findMany({ where: { checked: false }, select: { store: true } })`
3. `db.recipe.count()`
4. `db.recipe.findFirst({ orderBy: { createdAt: "desc" }, select: { title: true } })`
5. `db.mealPlan.findMany` — `weekStart` within `[serverNow − 8d, serverNow + 8d]` (via pure `addDays`), include entries select `id, dayOffset, slot, title, recipeId`; map to `MealPlanView[]` exactly as `meal-plan/page.tsx` does. The ±8-day window always contains the client's true current week despite UTC/Mountain skew; **which** week is current stays client-side. New pattern — the page comment owns it (kitchen's tolerated server clock is the expiring window, not this)

Derivations (pure): low via **`isLow()`** from `constants.ts:216` (reuse, don't inline a third copy); expiring-soon exactly as `kitchen/page.tsx:53-63` (3-day window, `effectiveExpiry` + `daysUntil` from `src/lib/expiring.ts`; plain text, no `~` — matching kitchen's badge). No DAL call — nothing role-gated here.

## Hydration safety (the one real hazard)

"Today" is client-only (`useToday()` → null on SSR and first client render; Vercel UTC vs Mountain). `TodayMealsTile` renders a **stable frame**: the four `MEAL_SLOTS` labels always; while `today === null`, value areas are `aria-hidden` fixed-height placeholders (MealPlanList's precedent, per-row) — **no** "Nothing planned today" yet, or it flashes and flips. Once today resolves: `todaysMeals(plans, today)` → null or all-empty ⇒ "Nothing planned today"; else titles (+ `BookOpen` when `recipeId`, WeekCard's treatment), empty slots muted "—". Fixed `min-h` so no layout shift. The 60s poll in `useToday` rolls the wall tablet across midnight for free.

## Tile contents

1. **Today's meals** (wide) → `/kitchen/cooking/meal-plan`
2. **Inventory** → `/kitchen/inventory` — "N stocked" headline; badge `N low` when >0; "N expiring" muted line when >0; urgent names line: `urgentLowItems` (Out/qty-0 first, then qty asc, name tiebreak), `"Milk, Eggs, Grapes +35 more"`, truncated
3. **Grocery** → `/kitchen/shopping` — badge `N to buy`; body `"Costco 4 · Walmart 2 · Unassigned 1"` (only nonzero; count desc; ties by `STORES` order; Unassigned last; "Nothing to buy" when zero)
4. **Recipes** (wide) → `/kitchen/cooking/recipes` — "146 recipes · Newest: {title}", truncated; no "Newest" when zero recipes

Badges only where a count means "go look" (Inventory, Grocery) — BranchTile's badge philosophy. Job tokens only. Whole tile is the tap target, no inner interactive elements.

## Tests (`dashboard.test.ts`)

- `todaysMeals`: no plans → null; plans but none covering today → null; covered but empty day → 4 null slots; filled Dinner on right offset only; other-day entries don't leak; Sunday/Saturday boundaries; DST week (weekStart Nov 1 2026, today Nov 3 → offset 2 — calendar math)
- `storeBreakdown`: empty; mixed + nulls → Unassigned label, zero-count omitted; count-desc; STORES-order ties; Unassigned last even when largest
- `urgentLowItems`: under max; Out beats qty-1 regardless of input order; name tiebreak; 5-with-max-3 → `more: 2`

## Execution

Avengers mission (Stark builds against this plan as the contract; **Vision + Strange gate** — the whole feature is user-visible). Work lands **branch → PR → green Gauntlet → merge** per the new protection; Claude drives the PR via `gh`. Dev data: the Neon dev branch — no production risk; browser verification may freely tap around.

## Verification

- Gauntlet: `tsc`, `eslint`, `npm test` (90 → ~102), `build` (build also proves the route-group move didn't orphan `/`)
- Browser 375px, light + dark: no hydration warning; no flash of the empty state before data; no layout shift when titles populate; all four tiles navigate; hard reload shows the new tile skeleton while `/settings` keeps the list skeleton
- Count cross-checks against live pages: stocked/low vs `/kitchen/inventory`; expiring vs Kitchen's Expiring badge; to-buy + per-store vs Shopping's own chip counts (`GroceryList.tsx:116-123` computes them identically); meals vs today's row in the current WeekCard; add a recipe → "Newest" updates
- TZ skew spot-check: dev server with `TZ=UTC`, browser still shows the correct Mountain day
