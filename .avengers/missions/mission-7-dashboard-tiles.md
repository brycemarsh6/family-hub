# Mission: Dashboard rebuild — four data tiles

**Project:** family-hub (Marshee)
**Status:** BUILDING
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
- **Status:** DISPATCHED
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
| — | Vision | — | — | — |
| — | Strange | — | — | — |

## Handoff log

- 2026-09-01 — Plan approved by Bryce (plan-mode; 4 AskUserQuestion
  decisions recorded in the plan's Context). Branch `dashboard-tiles`
  created. DB1 dispatched to Stark.
