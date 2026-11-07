# Mission 44: iPad landscape L1 (the width rule, the chrome, the dashboard)

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-11-07 · **Updated:** 2026-11-07
**Branch:** `claude/ipad-landscape-plan` (from `origin/main` at `3aabe35`), PR #62
**Plan:** `.avengers/plans/ipad-landscape-v1.md` (step L1 of L1 to L6), approved by Bryce 2026-11-07 (decisions 215 to 223)

## Brief

- **Goal:** every Marshee page sits in a centered 768px column today. On
  the kitchen iPad in landscape (1180px wide) a third of the screen is
  empty. L1 builds the mechanism that lets a page go wide, and makes the
  dashboard the first wide page: its 4-column widget grid fills the
  screen, with no page title (decision 221) and Customize up in the
  wordmark header row.
- **Done means:** at 1180x820 the dashboard grid spans the screen with 4
  columns about 275px wide; at 820x1180 it is 4 columns as before; at
  375 it is 2 columns; with Menu style set to Sidebar at 1180 it fits
  beside the sidebar; every other page is unchanged at every size; the
  Customize sheet still opens, saves and reloads; the loading skeleton
  has the same shape; the Gauntlet is green; STRUCTURE.md and DESIGN.md
  carry the rule; PR #62 merges and production shows it.
- **Out of scope:** every other page (L2 to L6); the FloatingAddButton
  corner rule (it lands with the first wide page that has one, L4 or L5,
  where Strange can see it); the dashboard widgets' own content.

## Bryce's decisions (plan, 2026-11-07)

215 (page types and mocks), 221 (no dashboard title or subtitle on any
size; Customize in the wordmark header row), 223 (the reference iPad is
the 11-inch: 1180x820 landscape, 820x1180 upright).

## Fury's structural calls

- **The opt-in attribute is `data-page-width="wide"`** on a page's root
  element. `<main>` lifts its `max-w-3xl` with
  `has-[[data-page-width=wide]]:md:max-w-none`; the wordmark header's
  inner row and the floating hamburger's row lift theirs with
  `md:[body:has([data-page-width=wide])_&]:max-w-none` (the pattern
  `HamburgerButton.tsx` already uses for `data-fills-width`). Not
  `data-fills-width`: that one also pins the page to one screen height.
- **The container wrapper holds the columns only, never `<main>`.** A
  CSS container (`@container`) applies layout containment, which makes it
  the positioning parent of every `position: fixed` descendant. `<main>`
  holds every bottom sheet and fixed bar, so a container there would pin
  them inside the page. Each wide page therefore wraps just its grid or
  columns in a `@container` element and renders its sheets outside that
  element. The dashboard's wrapper holds the grid; the Customize sheet is
  its sibling.
- **Column counts come from container variants, never screen
  breakpoints.** The dashboard grid: 2 columns, and 4 from a 45rem (720px)
  container width (`@min-[45rem]:grid-cols-4`). Why 45rem: at a 768px
  viewport the grid's content box is 736px, and today's `md:grid-cols-4`
  gives 4 columns there; a 48rem threshold would drop that to 2. With the
  Sidebar on at 1180 the box is about 860px: still 4.
- **Customize moves into the header through a portal.** The sheet's open
  state lives in `DashboardWidgetList`; `AppChrome` renders an empty slot
  `<div id={WORDMARK_HEADER_ACTIONS_ID} className="ml-auto">` at the right
  end of the wordmark header row, and `DashboardWidgetList` portals the
  button into it. The slot lookup is browser-only, so it goes through
  `useSyncExternalStore` (DESIGN.md's rule), not `setState` in an effect.
  On `/login` the slot is empty. Device logins have no Customize, so the
  slot stays empty for them too.
- **The loading skeleton carries the attribute too**, so the page is wide
  from the first paint and never jumps from narrow to wide.

## Danger register

From AGENTS.md, absolute for every agent:
- Local dev uses the Neon `dev` branch. A `DATABASE_URL` whose host is not
  the dev endpoint: stop and say so. No agent edits `.env`.
- `npm run db:seed` and `npm run db:reset` are forbidden. No clean or reset
  script for `User`. No migration in this mission.
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
- Strange: the dashboard and the app chrome change visibly at every size.
- Captain: a new cross-cutting rule (the attribute, the container wrapper,
  the header slot) that every later step builds on; STRUCTURE.md changes.
- No Banner: three read-only briefs were gathered for the plan.

## Contracts

### C1 - the width rule, the header slot and the wide dashboard
- **Status:** OPEN
- **Boundaries:** may touch: `src/components/AppChrome.tsx`,
  `src/components/HamburgerButton.tsx`, `src/lib/appChrome.ts`,
  `src/components/DashboardWidgetList.tsx`,
  `src/app/(app)/(home)/loading.tsx`, `src/lib/dashboardWidgets.ts`
  (words only) · must not touch: `src/app/(app)/(home)/page.tsx`,
  `src/components/DashboardCustomizeSheet.tsx`,
  `src/components/DashboardTile.tsx`, `src/components/FloatingAddButton.tsx`,
  `src/components/AddItemBar.tsx`, `src/components/PinnedNav.tsx`,
  `src/lib/dashboardGrid.ts`, `src/lib/dashboardLayout.ts`, `prisma/`,
  `package.json`, `DESIGN.md`, `STRUCTURE.md`, `CLAUDE.md`, `.env`.
- **Spec:**
  1. `src/lib/appChrome.ts`: export `WORDMARK_HEADER_ACTIONS_ID =
     "wordmark-header-actions"` with a comment naming its two users
     (AppChrome's slot, DashboardWidgetList's portal). Export
     `useWordmarkHeaderActionsTarget(): HTMLElement | null`, built on
     `useSyncExternalStore` (subscribe is a no-op returning a no-op;
     the client snapshot is `document.getElementById(...)`; the server
     snapshot is `null`). Precedent for a header slot plus portal:
     `SCHEDULE_TITLE_SLOT_ID` in `CalendarHeader.tsx` and the portal in
     `useScheduleMonthTitle.ts` (read its "why a portal, not a prop"
     comment; match the naming, but use `useSyncExternalStore` for the
     target lookup, not state set in an effect).
  2. `AppChrome.tsx`: the wordmark header's inner row gets
     `md:[body:has([data-page-width=wide])_&]:max-w-none` and, as its last
     child, `<div id={WORDMARK_HEADER_ACTIONS_ID} className="ml-auto flex
     items-center" />`. `<main>` gets
     `has-[[data-page-width=wide]]:md:max-w-none`. Update the comment
     above `<main>` to name the new attribute beside the two existing ones.
  3. `HamburgerButton.tsx`: the floating wrapper's inner row selector
     becomes `md:[body:has([data-fills-width],[data-page-width=wide])_&]:max-w-none`.
  4. `DashboardWidgetList.tsx`: root `<div data-page-width="wide" ...>`.
     Remove the `<h1>` "Dashboard" and the "What's going on around the
     house." paragraph and their wrapper row; the notes (when present) are
     now the first thing in the page, then the grid. The Customize button
     renders through `createPortal` into the header slot when the target
     exists (and nowhere when it does not); it keeps its current classes
     and words. Wrap the grid (and the empty state) in `<div
     className="@container">`; the grid becomes `grid-cols-2
     @min-[45rem]:grid-cols-4` and each cell's 4-column placement uses
     `@min-[45rem]:[grid-column:var(--dash-c4)]
     @min-[45rem]:[grid-row:var(--dash-r4)]` instead of `md:`. The
     Customize sheet stays OUTSIDE the `@container` element (a sibling).
     Rewrite the header comment to say the grid is 2 columns and 4 from a
     45rem container, why the container wraps only the grid, and where the
     button goes.
  5. `loading.tsx`: root gets `data-page-width="wide"`; drop the title and
     subtitle skeleton blocks (keep the top spacing so the grid sits where
     the real one does); the grid uses the same `@container` wrapper and
     the same container variants as the list.
  6. Words: if `DASHBOARD_WIDGET_WORDS` holds a page title or subtitle
     string that is now unused, remove it; `customizeTitle` (the sheet's
     title) stays.
  - No em or en dashes. Each file under 350 lines. Tailwind v4 container
    variants are built in (the repo already uses `@container` and
    `@min-[...]` in `TimelineAllDayStrip.tsx`); add no package.
- **Verification:** the whole Gauntlet passes. A dev server is running on
  port 3000; do not start or stop one.
- **Evidence required:** each Gauntlet command's tail; line counts of the
  touched files; `git status --short`; the exact class strings on
  `<main>`, the header row and the grid.
- **Done criteria:** Strange measures the dashboard at 1180x820, 820x1180,
  375 and 1180 with the Sidebar on; the sheet opens, a resize saves and
  survives a reload; the skeleton matches; every other page is unchanged.

### C2 - rulebooks (Fury)
- **Status:** DONE (commit below; recordcheck at delivery)
- **Boundaries:** `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`, this file,
  `.avengers/plans/ipad-landscape-v1.md` (the amendments below).
- **Spec:** STRUCTURE.md gains a "Wide pages" entry: the attribute, the
  container-wraps-columns-only rule with the fixed-positioning reason, the
  container-variants-not-breakpoints rule, the header slot. The dashboard
  entry notes the grid's container rule. DESIGN.md: the page-width rule
  (touch-first still holds; rows never stretch past a readable width) and
  the dashboard entry (no title, Customize in the header). CLAUDE.md:
  Current status and Bryce's checklist. Plan amendments: the container
  rule is per page, not on `<main>`; the FloatingAddButton rule moves to
  L4 or L5.
- **Verification:** `node ~/.claude/skills/avengers/recordcheck.mjs` over
  the range before delivery.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-11-07: Bryce chose to build L1 in the plan's chat. Mission opened;
  C1 written for Stark; branch `claude/ipad-landscape-plan` and PR #62
  (opened for the plan alone) carry L1.
