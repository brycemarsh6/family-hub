# Mission: Navigation redesign PR 1 — side drawer

**Project:** family-hub (Marshee)
**Branch:** `claude/nav-drawer` (from `origin/main` at `ee45851`)
**Status:** BUILDING
**Started:** 2026-11-02 · **Updated:** 2026-11-02

Numbered 23 because 20 (`claude/calendar-cd1`) and 22
(`claude/assistant-api-m22`) are taken on other branches.

## Brief

- **Goal:** Replace the bottom tab bar with a hamburger button (top-left) that
  opens a left side drawer listing every destination directly. Show the
  Marshee wordmark header only on the dashboard (`/`) and `/login`. Remove the
  profile circle; its contents (Profile, Settings, identity, Sign out) move
  into the drawer. Existing pages behave exactly as before; only navigation
  and chrome change.
- **Approved plan (the design source):**
  `~/.claude/plans/pasted-content-id-b382-okay-cool-reflective-hummingbird.md`,
  section "PR 1". Bryce's decisions in its Context section are final.
- **Done means:**
  1. On every signed-in page except `/`, there is no header bar and no bottom
     bar; a 48px hamburger floats top-left and `<main>` reserves room for it.
     On `/` the wordmark header shows with the hamburger at its left and no
     avatar. `/login` shows the header with no hamburger.
  2. The drawer lists, in order: Dashboard, Calendar, Routines, Plans & Goals,
     Lists; a "Kitchen" heading then Recipes, Meal Plan, Shopping, Inventory,
     Expiring; then Profile, Settings, an identity row, Sign out. The current
     page's row is lit; re-tapping it refreshes and scrolls to top.
  3. `/kitchen` → `/kitchen/inventory`, `/kitchen/cooking` →
     `/kitchen/cooking/recipes`, `/chores` → `/routines` (temporary redirects).
  4. `/profile` is the old settings page (name, colour, password).
     `/settings` is a new page holding "Manage family" (admins).
     `/routines` and `/plans` are "Coming soon" placeholders.
  5. Calendar's Today / view / Add circles sit top-right on the hamburger's
     row, at 44px. Schedule's pinned bar, the timeline scroller, the Recipes
     A-Z rail and sticky letters, Shopping/Inventory's AddItemBar and the
     Recipes "+" all sit correctly with no header and no bottom nav.
  6. DESIGN.md, STRUCTURE.md and CLAUDE.md describe the drawer, not the
     bottom nav. The gauntlet passes.
- **Out of scope:** the dashboard widget system and Customize (PR 2); pinned
  sidebar setting (PR 3); building Routines / Plans & Goals / Lists for real;
  any change to how an existing page works.

## Danger register

From AGENTS.md, absolute for every agent including Fury:
- `npm run db:seed` / `npm run db:reset`: never. No agent runs any `db:*`
  script in this mission (nothing here needs data).
- No Prisma migration in this mission. `prisma/` is must-not-touch.
- The `User` table: never written by any verification step.
- Never read, print or copy secrets. `.env` is linked into the worktree by
  Fury only (a symlink to the main checkout's file); no agent opens it.
- Never mint a session JWT or guess a password. Visual checks use the
  browser pane's existing sign-in; if there is none, the gate reports
  BLOCKED-ON-ENVIRONMENT and Fury asks Bryce to sign in.
- No push, no PR, no merge by any agent. Fury pushes only after Bryce's OK.
- `git add` by explicit path only; `git show --stat HEAD` after every commit.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts`
- `npm run build` (needs `.env`; Fury links it before C2)

New test files live directly in `src/lib/` so the existing glob reaches them.
No new test directories.

## Assembled

- **Stark + Vision** (always).
- **Strange:** every signed-in screen changes.
- **Captain:** new components/modules, deletions, ~30 files touched,
  constitution rewrites.
- **Banner: out.** Fury's Explore and Plan passes already produced the
  file:line map (in the plan file).
- **Model override (Bryce, 2026-11-02): all gates run on Opus 5.5 for this
  mission.** Passed as a per-dispatch `model: "opus"` override; the agent
  files are not edited. Vision normally runs on Fable, so watch for misses a
  re-read would catch and record them here.

## Contracts

Sequential: C1 → C2 → C3 → C4 → C5. Each contract leaves the gauntlet green.
Old exports are removed only in the contract that removes their last user.

### C1 — Add the new nav list, redirect map and hamburger-row chrome helpers, with tests
- **Status:** DONE — Vision PASS (C1-1)
- **Boundaries:**
  - may touch: `src/lib/nav.ts`, new `src/lib/nav.test.ts`,
    new `src/lib/routeRedirects.ts`, new `src/lib/routeRedirects.test.ts`,
    `src/lib/appChrome.ts`, new `src/lib/appChrome.test.ts`
  - must not touch: everything else.
- **Spec:**
  - `nav.ts`: ADD `NavItem`, `NavSection`, `NAV_SECTIONS`,
    `NAV_FOOTER_ITEMS`, `NAV_ITEMS`, `activeNavHref(pathname)` exactly as in
    the plan's "New / rewritten lib modules". Icons as listed there.
    KEEP `HUB_NAV_ITEMS` / `HubNavItem` for now (HubNav.tsx still imports
    them; C2 deletes both). `activeNavHref`: longest matching href wins
    (match = equal, or pathname starts with `href + "/"`); `/` only on exact
    match; null when nothing matches.
  - `routeRedirects.ts`: `LEGACY_ROUTE_REDIRECTS` as in the plan. Must have
    no imports at all (next.config.ts will import it by relative path).
  - `appChrome.ts`: ADD `HAMBURGER_ROW_HEIGHT_PX = 56`,
    `useHamburgerRowHeight()`, `showsWordmarkHeader(pathname)`. KEEP the four
    existing exports untouched (C4 deletes them). The hook measures the
    bottom edge of the FLOATING hamburger, selected by
    `[data-floating-menu-button]` (C2 puts that attribute on it), returns 0
    when absent, seeded with the constant, same ResizeObserver + resize
    shape as `useAppHeaderHeight`. Doc comment on the constant names its
    future dependents (list from the plan).
  - Tests per the plan: nav (hrefs unique and absolute, labels non-empty,
    the five `activeNavHref` cases), redirects (no source is a nav href,
    every destination is one, sources unique), appChrome
    (`showsWordmarkHeader` for `/`, `/login`, `/calendar`, `/kitchen/inventory`).
- **Verification:** full gauntlet except build → all pass; `npm test` count
  goes up by the new tests.
- **Evidence required:** test counts before/after; the gauntlet output tails;
  `git diff --stat`.
- **Done criteria:** Vision re-runs; only the six named files changed;
  `HUB_NAV_ITEMS` and the four old appChrome exports still exist.

### C2 — Build the drawer, hamburger and AppChrome; wire the layout; retire HubNav and UserMenu
- **Status:** PENDING
- **Boundaries:**
  - may touch: new `src/components/NavDrawer.tsx`,
    new `src/components/HamburgerButton.tsx`,
    new `src/components/AppChrome.tsx`, `src/app/(app)/layout.tsx`,
    `src/lib/nav.ts` (only to delete `HUB_NAV_ITEMS`/`HubNavItem` and fix
    its header comment); delete `src/components/HubNav.tsx`,
    `src/components/UserMenu.tsx`
  - must not touch: `src/lib/appChrome.ts`, any page under `src/app/(app)/`
    other than `layout.tsx`, every calendar/recipe component, docs.
- **Spec:** the plan's "New components" section, exactly. Load-bearing:
  - Drawer portals to `document.body` (copy UserMenu's comment explaining
    the `backdrop-filter` containing block).
  - Floating hamburger carries `data-floating-menu-button`; the in-header
    one does not.
  - `<main>` reserves `calc(env(safe-area-inset-top) + HAMBURGER_ROW_HEIGHT_PX px)`
    on non-wordmark pages; bottom padding
    `calc(6rem + env(safe-area-inset-bottom))`.
  - Move `isModifiedClick` and the re-tap refresh into NavDrawer for the
    row whose href equals the pathname exactly; keep its comments' substance.
  - Close via row `onClick`, never an effect on `usePathname`.
  - Header keeps its dependents comment, rewritten to say what still
    depends on it (CalendarHeader etc. move off it in C4; say so).
  - Each new file under 350 lines; split the list into `NavList.tsx` if
    NavDrawer would exceed it (then add it to may-touch in the report).
- **Verification:** gauntlet including build → pass. `grep -rn "HubNav\|UserMenu\|HUB_NAV_ITEMS" src`
  → only comment hits in files C5 owns.
- **Evidence required:** gauntlet tails; line counts of new files; the grep.
- **Done criteria:** Vision re-runs; Strange screenshots in C4's gate (the
  calendar is expected to look wrong until C4).

### C3 — Routes: profile, settings, routines, plans, redirects, retire landing pages
- **Status:** PENDING
- **Boundaries:**
  - may touch: new `src/app/(app)/profile/page.tsx`,
    `src/app/(app)/settings/page.tsx`, `src/components/SettingsForm.tsx`
    (`git mv` to new `src/components/ProfileForm.tsx`),
    `src/app/actions/account.ts`, new `src/app/(app)/routines/page.tsx`,
    new `src/app/(app)/plans/page.tsx`, `next.config.ts`;
    the five kitchen roots `src/app/(app)/kitchen/inventory/page.tsx`,
    `src/app/(app)/kitchen/shopping/page.tsx`,
    `src/app/(app)/kitchen/expiring/page.tsx`,
    `src/app/(app)/kitchen/cooking/recipes/page.tsx`,
    `src/app/(app)/kitchen/cooking/meal-plan/page.tsx`
    ONLY to remove the `BackLink` and its import;
    `src/app/actions/pantry.ts`, `src/app/actions/groceries.ts`,
    `src/app/actions/recipes.ts`, `src/app/actions/mealPlans.ts`,
    `src/app/actions/groceriesRecipes.ts`, `src/app/actions/irregularities.ts`,
    `src/app/actions/groceriesPutAway.ts` ONLY to delete the
    revalidatePath calls for "/kitchen" and "/kitchen/cooking" (dead after
    the redirect);
    delete `src/app/(app)/chores/page.tsx`, `src/app/(app)/kitchen/page.tsx`,
    `src/app/(app)/kitchen/loading.tsx`, `src/app/(app)/kitchen/cooking/page.tsx`,
    `src/app/(app)/kitchen/cooking/loading.tsx`, `src/components/BranchTile.tsx`,
    `src/components/PlanWeekTile.tsx`.
  - must not touch: `prisma/`, layout and chrome components, calendar and
    recipe components, docs.
- **Spec:** the plan's route bullets. Settings: h1 "Settings"; admins see a
  `min-h-14` row with Lucide `Users` linking `/settings/family` ("Manage
  family"); others see "Nothing to set up yet." Device sessions redirect to
  `/` on `/profile` as today. Profile: h1 "Profile", no BackLink.
  `revalidatePath("/profile")`. Redirects in `next.config.ts` from
  `LEGACY_ROUTE_REDIRECTS`, `permanent: false`; `devIndicators.position` →
  `"bottom-right"` with its comment updated. Placeholders match
  `lists/page.tsx`. Before deleting each "/kitchen…" revalidation, check
  that the action still revalidates the real page it changes; report each.
- **Verification:** gauntlet including build → pass; build output lists
  `/profile`, `/settings`, `/routines`, `/plans` and no `/kitchen` or
  `/chores` page. `grep -rn "BranchTile\|PlanWeekTile\|SettingsForm\|\"/kitchen\"\|\"/kitchen/cooking\"\|\"/chores\"" src`
  → only comment hits C5 owns, plus `routeRedirects.ts`.
- **Evidence required:** gauntlet tails; the build route table; the grep; a
  per-action list of revalidations kept.
- **Done criteria:** Vision re-runs and confirms every remaining
  revalidation still covers its page.

### C4 — Retune every chrome-height dependent to "no header, no bottom nav"
- **Status:** PENDING
- **Boundaries:**
  - may touch: `src/lib/appChrome.ts` (delete the four old exports + their
    comments), `src/components/CalendarHeader.tsx`,
    `src/components/ActionCircle.tsx`, `src/components/ScheduleView.tsx`,
    `src/components/TimelineGrid.tsx`, `src/components/CalendarViews.tsx`,
    `src/components/RecipeList.tsx`, `src/components/AddItemBar.tsx`,
    `src/components/FloatingAddButton.tsx`,
    `src/app/(app)/calendar/page.tsx` (move the h1 out only),
    `src/app/(app)/calendar/loading.tsx`, `src/components/AppChrome.tsx`
    (only its dependents comment).
  - must not touch: everything else; no behaviour change beyond positioning.
- **Spec:** the plan's "Files to modify" bullets for these files. Load-bearing:
  - Never call `useHamburgerRowHeight` from a component that lives in the
    layout and survives navigation (Vision C1 note 2): page-level only.
  - CalendarHeader action row: `justify-end gap-3 pl-14` on the hamburger
    row, lifted onto it with a negative top margin of
    `HAMBURGER_ROW_HEIGHT_PX` when not pinned; when pinned, `top: 0` with
    safe-area top padding. `ActionCircle` gains `size?: "md" | "sm"`
    (default `md` = today); calendar uses `sm` (44px circle, icon 20,
    `text-[11px]` label). Calendar h1 moves into CalendarHeader between the
    rows.
  - `SCHEDULE_HEADER_BAR_HEIGHT_PX` and the loading skeleton's `369`: compute
    the new values from the classes and state the arithmetic in the comment
    AND the report. Fury/Strange will measure in the browser; a mismatch is a
    fix contract, not a guess.
  - ScheduleView `rootMargin: "0px"`; TimelineGrid drops the nav query.
  - Shrink every comment narrating the bottom nav or the app header to what
    is now true.
  - ScheduleView.tsx, TimelineGrid.tsx, CalendarViews.tsx are already over
    the 350 soft cap: they must not grow. Report before/after line counts.
- **Verification:** gauntlet including build → pass;
  `grep -rn "APP_HEADER_HEIGHT_PX\|BOTTOM_NAV_HEIGHT_PX\|useAppHeaderHeight\|useBottomNavHeight\|aria-label=\\\"Sections\\\"\]" src`
  → no code hits.
- **Evidence required:** gauntlet tails; the grep; line counts before/after;
  the arithmetic for both measured numbers.
- **Done criteria:** Vision re-runs; Strange measures in the browser.

### C5 — Constitutions, CLAUDE.md and leftover comments
- **Status:** PENDING
- **Boundaries:**
  - may touch: `DESIGN.md`, `STRUCTURE.md`, `CLAUDE.md` ("What's built"
    only; Current status is Fury's at delivery), `src/components/BackLink.tsx`
    (comment), `src/components/DashboardTile.tsx` (comment),
    `src/components/TimelineDayColumn.tsx` (comment),
    `src/components/TimelineAllDayStrip.tsx` (comment),
    `src/lib/useScheduleMonthTitle.ts` (comment),
    `src/lib/useCanonicalCalendarUrl.ts` (comment),
    `src/lib/useCanonicalCalendarUrl.test.ts` (comment),
    `src/app/(app)/(home)/loading.tsx` (comment).
  - must not touch: code (comments only in the .ts/.tsx files above).
- **Spec:** the plan's "Doc amendments" replacement text. Name items, never
  count into lists. Every claim about a file names a file that exists after
  C1-C4.
- **Verification:** gauntlet → pass; `grep -rn "HubNav\|HUB_NAV_ITEMS\|BranchTile\|bottom nav\|bottom tab\|UserMenu" src *.md`
  → hits only where the text says they were replaced/removed;
  `node ~/.claude/skills/avengers/recordcheck.mjs origin/main..HEAD` read in full.
- **Evidence required:** the grep; recordcheck output.
- **Done criteria:** Captain reviews the constitution text.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| C1-1 | Vision (Opus) | **PASS** | 0 | 5 |

**C1 Vision notes:** (1) hook selects `[data-floating-menu-button]`, per the
contract (it deliberately revised the plan's aria-label selector): C2 must put
the attribute on the floating button only. (2) The hook queries once on mount,
so a component that outlives navigation could hold a stale 0: **carried into
C4: never call `useHamburgerRowHeight` from a layout-level component.**
(3) Longest-match in `activeNavHref` is not really exercised (no nav href is a
prefix of another); add a two-match test if a nested destination is ever
added. (4) Query strings are not stripped, which is harmless because
`usePathname()` never carries one. (5) A cosmetic double blank line in nav.ts,
which C2 rewrites anyway. The 7 UTC skips are the calendar DST tests skipping
by design, already present before C1.

Budget: 3 passes per gate, then STOP and surface. All gates on Opus (see
Assembled).

## Handoff log

- 2026-11-02 — Plan approved by Bryce; Avengers chosen ("Yes, use
  Avengers"); gates on Opus per Bryce. Branch created. Contracts written.
  Next: preflight C1, dispatch Stark.
- 2026-11-02 — Preflight: C1, C2, C3 clean (review items checked by hand). C4 fails only because it names `src/components/AppChrome.tsx`, which C2 creates: re-run preflight before C4. C5 flags STRUCTURE.md at 699 lines, already over the 650 cap: C5 must leave it no longer than it found it. C1 dispatched to Stark.
- 2026-11-02 — Stark reported C1 DONE: `npm test` 429 → 440, eslint clean,
  UTC run 440 (433 pass, 7 skipped, 0 fail). tsc failed only because
  `src/generated` was absent in this fresh worktree; Fury ran
  `npx prisma generate` (writes code only, no DB) and symlinked `.env` to
  the main checkout's file. tsc then exit 0. C1 sent to Vision (Opus).

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** Kitchen landing badges ("12 low", "Plan this
  week") go away with the landing pages (plan Risks); dashboard tiles still
  carry counts.
