# Mission: Dashboard rebuild — four data tiles

**Project:** family-hub (Marshee)
**Status:** DELIVERED
**Started:** 2026-09-01 · **Updated:** 2026-09-01

## Brief

- **Goal:** Replace the dashboard's lone Kitchen card with four data tiles —
  Today's meals (wide, top), Inventory + Grocery (2-up), Recipes (wide).
  Full approved plan: `.avengers/plans/dashboard-tiles.md` (the contract's
  authoritative text; agreed with Bryce through AskUserQuestion, including
  tile contents and layout).
- **Done means:** the four tiles render with live data at 375px light+dark,
  no hydration warning, counts cross-check against their source pages, and
  the gauntlet passes (90 → ~102 tests).
- **Out of scope:** any new dashboard tiles beyond these four (Bryce: "in
  the future I will be adding more"); a "staple items" concept (flagged to
  Bryce — needs a per-item flag someday); changes to the pages the tiles
  link to.

## Danger register

- Local dev now runs on the **Neon dev branch** (see AGENTS.md) — writes
  cannot reach the family's production data. Still: no `db:seed`/`db:reset`
  (wipes the realistic dev copy), nothing under `prisma/` executed.
- Work lands **branch → PR → green Gauntlet → merge**; never push to main
  (it's protected and will refuse anyway). Fury drives the PR via `gh`.

## Gauntlet

- `npx tsc --noEmit` · `npx eslint .` · `npm test` · `npm run build`
- (iCloud note: if tsc fails on duplicate identifiers, delete
  `.next/types/* [0-9].ts` conflict copies first and re-run.)

## Assembled

- Stark + Vision (always) + **Strange** (entirely user-visible). Captain
  OUT: 4 new files follow existing documented patterns, no boundary
  changes — Vision carries the cheap structure subset. Banner OUT:
  exploration done via plan-mode agents; findings baked into the plan.

## Contracts

### DB1 — Build the dashboard per the approved plan
- **Status:** DONE — gauntlet clean, 90 → 106 tests, boundaries exact
  (verified by Vision). Fury then applied gate fixes on top; see below.
- **Boundaries:** may touch: `src/lib/dashboard.ts` (new),
  `src/lib/dashboard.test.ts` (new), `src/components/DashboardTile.tsx`
  (new), `src/components/TodayMealsTile.tsx` (new),
  `src/app/(app)/(home)/page.tsx` (new, replaces `(app)/page.tsx` which is
  deleted), `src/app/(app)/(home)/loading.tsx` (new), and optionally
  `src/lib/expiring.ts` (the SOON_WINDOW_DAYS lift) +
  `src/app/(app)/kitchen/page.tsx` (only to consume that constant) ·
  must not touch: anything else.
- **Verification:** the gauntlet; browser verification is Fury/Strange's.
- **Evidence required:** gauntlet output incl. new test count; `git diff
  --stat`; the todaysMeals implementation quoted.
- **Done criteria:** gauntlet clean; boundaries exact; hydration-safety
  design implemented as specified (stable frame while today===null).

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | BLOCK | 1 | 5 |
| 1 | Strange | BLOCK | 2 | 6 |
| 2 | Vision | **PASS** | 0 | 3 |
| 2 | Strange | **PASS** | 0 | 2 |

**Pass 2 — both PASS.** Vision confirmed the row fix is *stronger* than the
one it asked for: with `h-5` pinned on the row `div` itself, row height no
longer depends on its children in either branch, so the loading and
resolved frames are equal **by construction rather than by coincidence of
child metrics** — the pass-1 failure mode is structurally gone, not
patched. It re-verified the ±8-day window, the single `Promise.all`, the
pure functions, and re-ran the live count cross-checks (all still
byte-identical to the served SSR).
Strange re-measured every icon at a true 20×20px and the skeleton at
164/182/182/108 — matching the real tiles to the pixel — and **endorsed
Fury's badge-wrap fix over its own suggested option**: both narrow tiles
wrap identically so the page stays symmetric, and the pill's rounded
`warn-soft` shape reads as a placed chip wherever it sits, where bare text
would have looked fallen-off. Keeping icons on all four tiles also removes
the mobile/desktop inconsistency it originally flagged.

Pass-2 notes, all recorded rather than actioned except the first:
1. *Latent `ml-auto` consequence* — a future badge on a **wide** tile would
   now sit inline after the title rather than pinned right, and the obvious
   "fix" (re-adding `ml-auto`) would silently bring back the crushed icons.
   **Actioned:** written into `DashboardTile.tsx` as a comment so whoever
   adds the first wide-tile badge decides rather than discovers.
2. *Skeleton heights are right for the current data shape* — 0 expiring, a
   1-line urgent list, or 0 recipes would shrink the real tiles ~20–44px
   and the skeleton would drift. The file's own comment owns this, and
   approximate skeletons are the house norm.
3. *`SkeletonHeader` is ~12px shorter than the real h1 + subtitle*
   app-wide — pre-existing, out of scope, imperceptible beside the 60px
   jump this mission fixed.

**Both gates independently found the same defect** — the meals tile shifted
the page ~16px when `today` resolved — from opposite directions: Strange by
measuring rendered rows in a browser, Vision by reading the compiled CSS
(`h-4` placeholder = 16px vs `text-sm` resolved line box = 20px). Two
methods, one bug, and the contract had promised "fixed min-h so no layout
shift" in writing. That agreement is the strongest signal either gate has
produced so far.

**Strange's second blocker, which only a browser could find:** the icon on
Inventory and Grocery was **flex-crushed to zero width at 375px**. A
half-width tile's header has ~131px; icon + title + badge want ~161px, so
flex resolved it by erasing the icon — two of four tiles silently lost
their icon on the exact screen DESIGN.md names as the target, while
rendering correctly on a laptop. Fixed with `flex-wrap` + a `shrink-0` icon
slot (badge drops to its own line instead).

**Fury's fixes (commit `ad36afa` + follow-up):**
- Both meals-tile branches now pin `h-5` rows. Verified empirically, not
  reasoned: both row variants built with the component's exact classes
  against the app's live CSS measure **20px / 20px, delta 0 across four
  rows**.
- `loading.tsx` heights replaced with the tiles' **measured** heights
  (164/182/182/108). The originals were guesses — the meals block was
  `h-56` (224px) for a 164px tile, snapping the page up ~60px per cold
  load, the precise failure skeletons exist to prevent.
- Non-breaking space in the store breakdown (Vision + Strange both saw
  "Amazon 2" orphan a bare "2").
- Removed an unreachable `count > 0` filter in `dashboard.ts` (Vision).
- **Plan file reconciled with what shipped** (Vision): its spec still
  described the superseded "Nothing planned today" line, and overstated
  that the dashboard's per-store counts match Shopping's chips — they
  agree only while nothing is checked, because the dashboard deliberately
  counts *unchecked* items.

**Strange PASSED the design question the mission was least sure about:** an
unplanned day showing four "—" rows reads as honest, not broken, because
the app now has two distinct vocabularies here — loading is grey bars,
*nothing* is a crisp glyph — and a genuine failure throws to the error
boundary rather than rendering dashes.

## Handoff log

- 2026-09-01 — Plan approved by Bryce (plan-mode; 4 AskUserQuestion
  decisions recorded in the plan's Context). Branch `dashboard-tiles`
  created. DB1 dispatched to Stark.
