# Mission: Navigation redesign PR 1 — side drawer

**Project:** family-hub (Marshee)
**Branch:** `claude/nav-drawer` (from `origin/main` at `ee45851`)
**Status:** DELIVERED as PR #32 (pushed 2026-11-02 on Bryce's go-ahead); merge is Bryce's call after the Gauntlet check
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
- **Status:** DONE — Vision PASS (C2-1)
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
- **Status:** DONE — Vision PASS (C3-1)
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
- **Status:** DONE (Vision C4-2 PASS with F1; Strange blocker fixed in F2)
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
  - **Gate condition (Vision C2 note 1):** `grep -rn 'aria-label="Sections"' src`
    must return only NavDrawer.tsx. The old TimelineGrid query and
    `useBottomNavHeight` now match the open drawer's nav; if this slips,
    it is a BLOCKER.
  - Fix the `HAMBURGER_ROW_HEIGHT_PX` comment: the 8px gap is ABOVE the
    button (top offset), and the button's bottom edge is exactly where
    `<main>` content starts (Vision C2 note 3).
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

### F1 — (fix for C4) Fix Vision's C4 blocker: make the pinned h1 breakpoint-invariant
- **Status:** DONE (Vision C4-2 PASS)
- **Report:** `leading-8` added; the built CSS shows `--tw-leading` overrides
  the md:text-3xl line-height, so the box is 32px everywhere and 170 holds.
  Comment beside page.tsx `py-2` added. loading.tsx unchanged. Gauntlet and
  build pass (the build exit code was not captured in zsh, but the output
  completed with no error).
- **Boundaries:**
  - may touch: `src/components/CalendarHeader.tsx`,
    `src/app/(app)/calendar/page.tsx` (comment beside `py-2` only),
    `src/app/(app)/calendar/loading.tsx` (h1 skeleton only if needed to match)
  - must not touch: everything else.
- **Spec:** Add `leading-8` to the Calendar h1 inside CalendarHeader (keeps
  `md:text-3xl` font size; in Tailwind v4 `--tw-leading` overrides the
  text-3xl line-height, so the box is 32px at every breakpoint). Add a clause
  to `SCHEDULE_HEADER_BAR_HEIGHT_PX`'s comment saying the h1 is held at
  `leading-8` for exactly this reason. Add a short comment next to
  calendar/page.tsx's `py-2` naming CalendarHeader's lift/pinned margin and
  loading.tsx's 183 as dependents (Vision C4 note 2).
- **Verification:** full gauntlet incl. build → pass. Prove the h1 box from
  the BUILT CSS: show the generated rules for `leading-8` and
  `md:text-3xl` and why the computed line-height is 32px at ≥768px.
- **Evidence required:** gauntlet tails; the CSS excerpt; the diff.
- **Done criteria:** Vision re-gate (batched with any measurement fixes);
  Strange measures the pinned bar at 375 and 1024.

### F2 — (fix for C4) Remove the visible Calendar title (Bryce, 2026-11-02), plus Strange's pass-1 fixes
- **Status:** DONE (Vision C4-3 PASS, Strange S-2 PASS)
- **Bryce's decision (verbatim):** "Just get rid of the calendar label."
- **Boundaries:**
  - may touch: `src/components/CalendarHeader.tsx`,
    `src/app/(app)/calendar/loading.tsx`,
    `src/app/(app)/calendar/page.tsx`,
    `src/components/NavDrawer.tsx` (lit-row class only),
    `src/components/AppChrome.tsx`, `src/components/TimelineGrid.tsx`,
    `src/components/CalendarViews.tsx` (part C only)
  - must not touch: everything else. TimelineGrid.tsx and CalendarViews.tsx
    must not grow.
- **Spec, part A (Strange BLOCKER, lit row):** `src/components/NavDrawer.tsx`
  active row: `text-accent` becomes `bg-accent-soft text-accent font-semibold`.
  Keep `ROW_CLASS`'s `active:bg-surface-2`. Do NOT use
  `bg-accent text-accent-fg` (it breaks press-state legibility; see
  Strange's finding).
- **Spec, part C (Strange NOTE, Fury's call to fix now):** On the Week, Day
  and 3-Day timeline views the document must not scroll
  (`document.documentElement.scrollHeight === innerHeight` at 375 and 1024).
  The extra 105px is `<main>`'s bottom padding (6rem + inset), the page's
  `py-2` and a 1px border, under a scroller that already fills to the
  viewport bottom. Choose the smallest correct fix and say why.
  Constraints:
  - Month, Schedule and every other page keep their current bottom space.
  - No second hardcoded copy of the padding value.
  - If AppChrome gains a per-page switch, it must not be a pathname string
    list duplicated outside `src/lib/`.
- **Spec, part B (Bryce's decision):**
  - Remove the visible "Calendar" h1 from CalendarHeader. Keep a
    `sr-only` `<h1>Calendar</h1>` (absolutely positioned, zero layout) so
    the page still has a heading for screen readers; the `leading-8`
    rationale goes with the visible h1.
  - Recompute `SCHEDULE_HEADER_BAR_HEIGHT_PX` (expected 170 − 32 − 8 = 130)
    with the arithmetic in its comment.
  - loading.tsx: drop the h1 skeleton block and recompute the timeline
    offset (expected 183 − 40 = 143). Reword the header's "MEASURED" claim
    to cite the 2026-11-02 live measurement (Vision C4 notes).
  - The `py-2` dependents comment in page.tsx: update the 183 it names.
- **Verification:** full gauntlet incl. build; Fury re-measures the pinned
  bar at 375 and 1024 and the timeline scroller top.
- **Done criteria:** Vision pass 3 (budget's last) + Strange pass 2.

### C5 — Constitutions, CLAUDE.md and leftover comments
- **Status:** DONE (Vision C5-1 PASS; Captain blockers fixed in F3). Built by Stark, 2026-11-02. Gauntlet all exit 0; STRUCTURE.md 699 → 692. Fury replaced 7 dashes Stark added (Bryce's no-dash rule). Stark flagged 4 stale bottom-nav comments outside the boundary: recipes print page:19, share/layout.tsx:9, PantryItemEditSheet.tsx:81, GroceryItemEditSheet.tsx:87. Strange not re-run for C5: no visual change on desktop, and the safe-area padding can't be emulated.
- **Boundaries:**
  - may touch: `DESIGN.md`, `STRUCTURE.md`, `CLAUDE.md` ("What's built"
    only; Current status is Fury's at delivery), `src/components/BackLink.tsx`
    (comment), `src/components/DashboardTile.tsx` (comment),
    `src/components/TimelineDayColumn.tsx` (comment),
    `src/components/TimelineAllDayStrip.tsx` (comment),
    `src/lib/useScheduleMonthTitle.ts` (comment),
    `src/lib/useCanonicalCalendarUrl.ts` (comment),
    `src/lib/useCanonicalCalendarUrl.test.ts` (comment),
    `src/app/(app)/(home)/loading.tsx` (comment),
    `src/app/(app)/layout.tsx` (viewport comment only, Vision C3 note 6),
    `src/components/ProfileForm.tsx` (doc comment only, Vision C3 note 6),
    `src/components/CalendarHeader.tsx` (comment, lines ~44-46),
    `src/app/(app)/calendar/loading.tsx` (comments, ~38-41 and ~137).
  - may touch (code, folded in from the F2 gates, Fury 2026-11-02):
    `src/components/TimelineGrid.tsx`: the scroller div's
    `className="overflow-y-auto"` becomes
    `className="overflow-y-auto pb-[env(safe-area-inset-bottom)]"` (Vision
    C4-3 and Strange S-2 NOTE: the last hour can't scroll clear of the iPhone
    home indicator). No other change; the file must not grow.
    `src/components/NavDrawer.tsx`: move the font weight out of the shared
    row class so the active row carries only `font-semibold` and inactive
    rows only `font-medium` (Strange S-2 NOTE). No visual change.
  - must not touch: any other code (comments only in the other .ts/.tsx
    files above). `STRUCTURE.md` is at 699 lines, over its 650 cap: edits
    there must leave it at 699 or fewer.
  - **Preflight exception (Fury, 2026-11-02):** preflight hard-fails
    STRUCTURE.md for being over the cap *before* this contract.
    `git show origin/main:STRUCTURE.md | wc -l` = 699, so the overage
    predates mission 23. The edits here are replacements of stale nav lines
    (Layout map `(app)/` row, the `nav.ts` one-source line, the
    `APP_HEADER_HEIGHT_PX` open instance, the HubNav naming instance), net
    ≤0 lines. Trimming the file under the cap is a separate job, not this
    mission's. Captain judges the edits.
- **Comment rewording:** CalendarHeader ~44-46 and loading.tsx ~38-41 say
  "to be re-measured". Replace them with the measured facts: the pinned
  Schedule bar is 130 at 375 and 1024 (Strange S-2), and the timeline
  scroller top is 143. loading.tsx ~137 counts a border the skeleton doesn't
  have; correct it.
- **Spec:** the plan's "Doc amendments" replacement text. Name items, never
  count into lists. Every claim about a file names a file that exists after
  C1-C4.
- **Verification:** gauntlet → pass; `wc -l STRUCTURE.md` ≤ 699;
  `git diff --stat src/components/TimelineGrid.tsx` shows 1 line changed; `grep -rn "HubNav\|HUB_NAV_ITEMS\|BranchTile\|bottom nav\|bottom tab\|UserMenu" src *.md`
  → hits only where the text says they were replaced/removed;
  `node ~/.claude/skills/avengers/recordcheck.mjs origin/main..HEAD` read in full.
- **Evidence required:** the grep; recordcheck output.
- **Done criteria:** Captain reviews the constitution text.

### F3 — (fix for C5) Captain K-1 blockers plus the gates' cleanup notes
- **Status:** DONE (Vision F3-1 PASS, Captain K-2 PASS)
- **Objective:** close Captain's two chrome-dimension blockers and fold in the cheap comment/doc notes from Vision C5-1 and Captain K-1.
- **Boundaries:**
  - may touch: `src/app/(app)/calendar/loading.tsx`,
    `src/components/HamburgerButton.tsx` (comment only),
    `src/components/CalendarHeader.tsx` (comment only),
    `src/components/Skeleton.tsx`,
    `src/components/ReviewQueueButton.tsx` (comment only),
    `src/components/PantryItemEditSheet.tsx` (comment only),
    `src/components/GroceryItemEditSheet.tsx` (comment only),
    `src/app/(app)/kitchen/cooking/recipes/[id]/print/page.tsx` (comment only),
    `src/app/share/layout.tsx` (comment only),
    `src/app/(app)/(home)/loading.tsx` (comment only),
    `src/lib/useScheduleMonthTitle.ts` (comment only),
    `README.md`, `DESIGN.md`, `STRUCTURE.md`, `CLAUDE.md` ("What's built" only).
  - must not touch: everything else. No behaviour change anywhere except
    loading.tsx's margin, which must compute the same 56px.
- **Spec:**
  1. BLOCKER: `calendar/loading.tsx` ~242: replace `-mt-14` with
     `style={{ marginTop: -HAMBURGER_ROW_HEIGHT_PX }}`, importing the
     constant from `@/lib/appChrome`. Net growth: the import line at most.
  2. BLOCKER: `HamburgerButton.tsx`: add a 2 to 3 line comment at the floating
     wrapper. It says `h-12` plus the `0.5rem` top offset make up
     `HAMBURGER_ROW_HEIGHT_PX` in `src/lib/appChrome.ts`, and that a change
     here means updating that constant and checking the dependents listed
     there.
  3. `calendar/loading.tsx` comments: cite the 143 as "Fury's live
     measurement (F2)" and keep "Strange S-2" for the 130. Rewrite the
     ~127-129 header to say the skeleton is a borderless block approximating
     the real bordered wrapper, and drop the class quote.
  4. `CalendarHeader.tsx` ~68: update the quoted DESIGN.md sentence to the
     current wording ("Its list never changes as you move").
  5. Delete the dormant `SkeletonTiles` export and its doc from
     `Skeleton.tsx`. First prove it has zero importers with grep.
  6. Stale nav comments: each must describe the drawer world (or past
     tense) truthfully.
     - `ReviewQueueButton.tsx:21`
     - `PantryItemEditSheet.tsx:81`
     - `GroceryItemEditSheet.tsx:87`
     - print `page.tsx:19`
     - `share/layout.tsx:9`
     - `(home)/loading.tsx:7`: the placeholders are routines, plans and
       lists; settings is real, and calendar has its own loading.tsx
     - `README.md:38`
     - `useScheduleMonthTitle.ts:13`: fix the comma splice
  7. `STRUCTURE.md` ~228: replace with Captain's text: "`src/lib/nav.ts`:
     `NAV_SECTIONS` (+ `NAV_FOOTER_ITEMS`), the only nav list.
     `src/lib/routeRedirects.ts`: `LEGACY_ROUTE_REDIRECTS`, the only redirect
     map; it has **no imports at all**, because `next.config.ts` imports it by
     relative path". The file must stay ≤699 lines; the C5 preflight
     exception applies.
  8. `DESIGN.md`:
     - fold the duplicated BackLink rule (~126-130) into one bullet
     - word the nav-list line the same as STRUCTURE.md
       (`NAV_SECTIONS` + `NAV_FOOTER_ITEMS`)
  9. `CLAUDE.md` "What's built": list Recipes and Meal Plan flat in the
     Kitchen group, with no "Cooking" sub-bullet. Keep their descriptions.
  - No em or en dashes in any new text.
- **Verification:**
  - gauntlet → pass
  - `grep -rn "SkeletonTiles" src` → nothing
  - `grep -rn "\-mt-14" "src/app/(app)/calendar/loading.tsx"` → nothing
  - `wc -l STRUCTURE.md` ≤ 699
  - `git diff -U0 | grep '^+.*[—–]'` → nothing
- **Evidence required:** each command with its exit code and output; `git diff --stat`.
- **Done criteria:** Captain pass 2 and Vision gate F3 PASS.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| C1-1 | Vision (Opus) | **PASS** | 0 | 5 |
| C2-1 | Vision (Opus) | **PASS** | 0 | 6 |
| C3-1 | Vision (Opus) | **PASS** | 0 | 7 |
| C4-1 | Vision (Opus) | **BLOCKED** | 1 | 9 |
| C4-2 | Vision (Opus) | **PASS** (C4 + F1) | 0 | 4 |
| S-1 | Strange (Opus) | **BLOCKED** | 1 | 9 |
| C4-3 | Vision (Opus) | **PASS** (F2) | 0 | 5 |
| S-2 | Strange (Opus) | **PASS** (F2) | 0 | 5 |

**F2 Strange (pass 2):** the S-1 lit-row blocker is closed. Dark: 7.08:1,
weight 600, reads as "selected". Light: 4.65:1. Calendar has no visible
title (the h1 is sr-only), and circles at top 8. The pinned Schedule bar is
130 at both 375 and 1024. Week, Day and 3-Day have no document scroll at 375
or 1024. Month, Schedule and Year keep 96px. No regressions on Dashboard,
Inventory, Recipes or Settings.
- NOTE: the home-indicator overlap (same as Vision's). Fix:
  `pb-[env(safe-area-inset-bottom)]` on the TimelineGrid scroller div.
  **Folded into C5.**
- NOTE: the lit row carries both `font-medium` and `font-semibold`; it
  wins on emit order only. **Folded into C5.**
- NOTE, pre-existing: in dark mode at desktop the scrollbar track is white,
  because `:root` has no `color-scheme`. Follow-up, not this mission.
- NOTE, pre-existing: on a schedule deep link, Today is disabled while
  today is on screen. On record only.
| C5-1 | Vision (Opus) | **PASS** | 0 | 12 |

**C5 Vision pass 1:** gauntlet all exit 0; boundary exact; every doc claim
checked against code. Fury ratifies the two inert overreaches (the CLAUDE.md
Design rules word, the CalendarHeader:26 comment). Notes, all folded into F3:
- loading.tsx:42 and :135 cite Strange for the 143; it was Fury's
  measurement.
- loading.tsx:127-129 still calls the skeleton bordered.
- CalendarHeader:68 quotes a DESIGN.md sentence that C5 reworded.
- More stale nav comments: ReviewQueueButton.tsx:21, README.md:38,
  Skeleton.tsx:43 (the dormant `SkeletonTiles`), and (home)/loading.tsx:7.
- DESIGN.md and STRUCTURE.md word the nav-list line differently.
- CLAUDE.md still nests Recipes and Meal Plan under "Cooking".
- A comma splice at useScheduleMonthTitle.ts:13.

| K-1 | Captain (Opus) | **BLOCKED** | 2 | 10 |

**Captain pass 1 (whole mission + C5):**
- BLOCKER: `calendar/loading.tsx:242` `-mt-14` is a second hardcoded copy of
  `HAMBURGER_ROW_HEIGHT_PX` (CalendarHeader imports it). Fix: import the
  constant and use `style={{ marginTop: -HAMBURGER_ROW_HEIGHT_PX }}`.
- BLOCKER: `HamburgerButton.tsx:37-59` produces the 56 (`h-12` + the 0.5rem
  top offset) but never names `HAMBURGER_ROW_HEIGHT_PX` or its dependents.
  Fix: a comment only.
- NOTE: the 0.5rem offset is also encoded at CalendarHeader:163-164 and in
  the page's `py-2`. Proposed amendment: export `HAMBURGER_TOP_OFFSET_PX`.
- NOTE: CalendarHeader grew 381 → 392 (in scope; CD1 will touch it).
  STRUCTURE.md is still over its cap, and the cap clause doesn't say whether
  it covers .md files.
- NOTE: add `routeRedirects.ts` (import-free) to the one-source list.
- NOTE: `SkeletonTiles` (Skeleton.tsx:43-52) now has zero callers; delete it.
- NOTE: 4 stale bottom-nav comments outside C5 (same as Stark's list).
- NOTE: the `AppChrome.tsx` / `appChrome.ts` names differ only by case.
- NOTE: DESIGN.md:126-130 states the BackLink rule twice.
- Dependency direction, naming and new-file sizes all pass.
| K-2 | Captain (Opus) | **PASS** (F3) | 0 | 5 |

**Captain pass 2:** both K-1 blockers are closed. loading.tsx imports the
constant. HamburgerButton names it. STRUCTURE.md's "Closed in mission-23" is
true (no other hardcoded 56 or 3.5rem). STRUCTURE.md is 695 lines.
SkeletonTiles is gone. Open notes carried forward:
- `HAMBURGER_TOP_OFFSET_PX` amendment
- CalendarHeader split seam for CD1
- the .md cap clause
- AppChrome/appChrome case
- the (home)/loading.tsx:8 long line
| F3-1 | Vision (Opus) | **PASS** | 0 | 4 |

**F3 Vision:** gauntlet all exit 0 on the final tree (build included).
Boundary clean. The comment-only files have zero code change. The margin is
-56px, as before. Every new claim was checked. Notes for a later docs pass:
- the CalendarHeader:67-68 quote is now off-topic, with an orphan dash
- README.md:36 implies /login has the drawer
- README.md:39 "the nav bar"
- the (home)/loading.tsx:8 long line

**All assembled gates PASS: Vision, Strange, Captain.**

**F2 Vision (C4 pass 3):**
- Parts A, B and C are all verified in the built CSS. The `has-`
  override wins on specificity and source order. The `data-fills-viewport`
  marker exists only on TimelineGrid and its skeleton (Day, 3-Day, Week).
  The swap is stable. The 130 holds at every width (ActionCircle has no `md:`
  classes). sr-only takes zero layout. The press fill still shows on the lit
  row. LA timezone run also passes.
- NOTE: on Face ID iPhones the last 34px of the day (about 11:18 PM to
  midnight) can't be scrolled clear of the home indicator. Visible and
  tappable, cosmetic. Follow-up: `pb-[env(safe-area-inset-bottom)]` on the
  hours body.
- NOTE: a landscape phone hits the 320px minimum and ends on an open
  bottom edge.
- NOTE: the attribute shares a line with the class.
- NOTE: the "to be re-measured" comments in loading.tsx and CalendarHeader
  should cite Fury's 130/143 measurements (C5).
- NOTE: the 143 comment counts a border the skeleton doesn't have.

**Strange pass 1:**
- **BLOCKER:** in dark mode the drawer's lit row (`text-accent`,
  sage #b7c3a6) is the DIMMEST row next to the cream `text-fg` rows. It reads
  as disabled, the opposite of "you are here". In light mode it differs by
  hue alone (1.37:1). Fix: `bg-accent-soft text-accent font-semibold`
  (4.65:1 light, 7.08:1 dark; press state stays legible). → F2 part A.
- **Verified:** Bryce's decisions are all built as decided. The floating
  hamburger occludes no interactive element on 15 routes. There are no
  BackLinks on drawer destinations; recipe detail → "Recipes" and
  /settings/family → "Settings". The lit row is correct on every route
  tested. Drawer rows are all 48px. Sign out is reachable on a 560px-tall
  screen. The redirects work. Calendar circles are 44px and right-aligned;
  Today is disabled only on the current period. The pinned bar is 170 at
  375. Recipes letters pin at 56, and the rail and "+" don't collide.
  AddItemBar sits 12px off the bottom and the last row is reachable.
  Placeholders match /lists.
- **Notes:**
  1. On Week/Day the document scrolls 105px (circles leave the screen,
     hamburger over "Previous week"). Mostly pre-existing but twice as
     big and visible now → F2 part C.
  2. In the Recipes list, rows show through the transparent 0–56px band
     above the pinned letter (polish).
  3. Drawer: no focus move into the dialog, no scroll lock, no slide, no
     visible close control. Consistent with the house sheets. Recommended
     as a later polish pass.
  4. The identity circle looks like the old tappable avatar, but reads as
     non-interactive. For Bryce to glance at.
  5. Calendar circle labels are 11px, the smallest text in the app.
  6. The loading skeleton shows "Week" and an enabled Today before load.
     Pre-existing; follow-up.
  7. The hamburger is at top 12 on `/` and top 8 elsewhere, a 4px jump.
  8. Inventory shows about 138px of empty space at the bottom (could trim).
  9. Recipes has no `<h1>` (pre-existing).
  The month-title flip could not be exercised with live data (the window
  ends Nov 2). Re-check it when there is future data.

**C4 pass-2 Vision:** The blocker is closed, by the built CSS (`--tw-leading`
beats the text-3xl fallback) and by Fury's 170-at-375-and-1024
measurement. The unpinned h1 is now 32px at md+ too, so the skeleton's 183
holds on tablet/laptop. Build exit 0 captured. F1 stayed in bounds (mtimes
plus content). Notes: the two old-name comments are queued for C5; one long
comment line; the page.tsx comment sits above the `return`, which is
findable; reword loading.tsx's "MEASURED" header to cite the 2026-11-02
measurement (C5).

**C4 Vision BLOCKER:** `SCHEDULE_HEADER_BAR_HEIGHT_PX = 170` is right only
below 768px. The pinned h1 keeps `md:text-3xl`, whose v4 line-height makes
the box 36px at md and up (174 + inset). On the wall tablet or a laptop, in
Schedule view, Today or a deep link lands the day 4px behind the pinned bar
and the month title flips 4px early (the same class of bug as mission-16/C7).
Fix: `leading-8` (contract F1). **C4 Vision notes:** (1) the geometry
checks out by arithmetic: the pinned and unpinned rows both land at
inset + 8, and the hamburger clears `pl-14` with 8px spare. (2) The
`py-2` coupling is documented only in CalendarHeader and loading.tsx, not
at the `py-2` itself (in F1). (3) The month-jump overlay overlaps 1px of the
h1, which is harmless. (4) ActionCircle `md` is identical for existing
callers. (5) Strange should check dashboard → Schedule and dashboard →
Recipes via the drawer, to confirm the hook finds the floating button on
mount (otherwise RecipeList's sticky offset reads 0). (6) `rootMargin: 0px`
is correct. (7) The TimelineGrid seed overestimates, but this is not a
regression. (8) AddItemBar and FloatingAddButton clear `<main>`'s bottom
padding, and the Recipes "+" and rail don't collide. (9) The loading.tsx
header says "MEASURED" but the new rows are computed: reword after Strange
measures. C5 leftovers: TimelineDayColumn.tsx:35,
useScheduleMonthTitle.ts:12.

**C3 Vision notes:** (1) Settled: a rename on /profile refreshes the drawer identity without reload. Next 16 re-renders from the root on any Server Action that revalidates (revalidate.js, server-action-reducer.js), same as UserMenu before. (2) Every action still revalidates every page it changes, and the three redirects are in routes-manifest.json as 307, anchored. (3) A stale `.next/types` breaks only local tsc before a build; CI has no `.next/`, proven with a no-.next tsconfig. (4) A device session now sees "Nothing to set up yet." on /settings (only /profile redirects devices); whether the drawer hides Profile/Settings for devices is for P4. (5) The empty `chores/` dir was removed by Fury. (6) Comment leftovers for C5: `ProfileForm.tsx` doc ("Everyone's own settings"), `(app)/layout.tsx` viewport comment ("bottom tab bar (like Kitchen)"). (7) Predates this mission: mealPlans.ts and recipes.ts never revalidate `/`, and users*.ts revalidate only `/settings/family`. Hidden today by root re-render; worth a line when next touched.

**C2 Vision notes:** (1) the drawer's `<nav aria-label="Sections">` collides with TimelineGrid's inline query and `useBottomNavHeight` (open drawer + resize on a timeline view shrinks the scroller until the next resize); C4 removes both, made a C4 gate condition. (2) `useAppHeaderHeight` returns the seed or a page `<header>` on non-wordmark pages, as expected until C4. (3) The 8px gap is above the hamburger, not below as the constant's comment says; fix in C4, and Strange checks the spacing. (4) Cmd-click on a drawer row also closes the drawer, which is harmless. (5) No focus move into the dialog, no focus return, no scroll lock (same as UserMenu); for Strange. (6) `useCanonicalCalendarUrl.ts:26` still names HUB_NAV_ITEMS; C5.

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
- 2026-11-02 — Vision PASS on C1 (5 notes). Committed as `8ae0d52`. C2
  preflight: 0 failures (warnings are prose names). C2 dispatched to Stark.
- 2026-11-02 — Stark reported C2 DONE: lint/tsc/test (440)/build all exit
  0. New files: NavDrawer 209, HamburgerButton 67, AppChrome 84 lines.
  HubNav.tsx and UserMenu.tsx removed with `git rm`. Remaining name hits are
  comments in C4/C5 files. Stark's notes for later contracts: the old
  `useBottomNavHeight` and TimelineGrid's inline query select
  `nav[aria-label="Sections"]`, which the open drawer now also carries (C4
  removes both). There is no focus return or slide animation on the drawer
  (Strange may want them). C2 sent to Vision (Opus).
- 2026-11-02 — Vision PASS on C2 (6 notes; two carried into C4 as conditions). First commit attempt aborted: `git add` named the two already-`git rm`ed paths, so nothing was recorded; caught by `git show --stat`, re-staged by explicit path. C2 committed. C3 preflight 0 failures; C3 dispatched to Stark.
- 2026-11-02 — Stark reported C3 DONE: gauntlet + build exit 0. The route
  table has /profile, /settings, /routines, /plans and no /kitchen,
  /kitchen/cooking or /chores page. Deviations: `git mv` chores→routines and
  settings→profile (history kept), two false comments fixed in pantry.ts and
  groceries.ts. Open question for Vision: account.ts revalidates only
  `/profile`, so does a rename refresh the drawer's identity row (rendered
  from the layout)? Stark also noted that mealPlans.ts never revalidated `/`
  (this predates the mission). C3 sent to Vision (Opus).
- 2026-11-02 — Vision PASS on C3 (7 notes). Fury removed the empty `chores/` dir, added two comment leftovers to C5, and committed C3. C4 preflight: 0 failures; soft-cap warnings on the four calendar files are known (they must not grow, except CalendarHeader may take the h1). Line counts at dispatch: CalendarHeader 381, ScheduleView 532, TimelineGrid 555, CalendarViews 496, RecipeList 339. C4 dispatched to Stark.
- 2026-11-02 — Stark reported C4 DONE: gauntlet + build exit 0. The
  `aria-label="Sections"` grep finds only NavDrawer.tsx (gate condition met).
  Old chrome exports deleted; the remaining name hits are two comments in C5
  files. Line counts: ScheduleView 532→512, TimelineGrid 555→510,
  CalendarViews 496→496, CalendarHeader 381→388 (took the h1),
  RecipeList 339→322. Class-derived numbers, not yet measured:
  `SCHEDULE_HEADER_BAR_HEIGHT_PX` 154→170 (h1 now inside the pinned bar);
  skeleton 369→183. Deviation: the lift sits on the CalendarHeader wrapper,
  not the row, so the pinned and unpinned rows land at the same spot; the
  pinned margin is coupled to calendar/page.tsx's `py-2`. C4 sent to Vision
  (Opus); browser measurement and Strange follow.
- 2026-11-02 — Vision BLOCKED C4 (1 blocker: the pinned h1 is 36px at md+).
  F1 dispatched and DONE (`leading-8`). Port 3000 is held by Bryce's
  Forthright website dev server (another session), so Fury added a
  `family-hub-3001` config to `.claude/launch.json` (local only: **do not
  commit; revert at delivery**) and ran `next dev -p 3001`. Bryce signed in
  in the browser pane. **Fury's measurements (live, dev server):**
  - At 375: hamburger at top 8, 48×48, left 16. The Today/Week/Add circles
    are at top 8, 44 wide, row 66. The h1 is at top 82, 32 tall. The week
    timeline scroller top is 183 (it matches the skeleton's 183) and it
    fills to 812.
  - The pinned Schedule bar is 170 at 375 AND at 1024 (h1 30px font, 32px
    line). This proves F1.
  - Dashboard → Calendar and dashboard → Recipes via the drawer both work.
    The floating button exists on mount.
  - The Recipes "+" is at 740–796 (1rem above the bottom).
  - For Strange: on the week timeline the document still scrolls 105px past
    the scroller (`<main>`'s 6rem bottom padding plus `py-2`), so the page
    scrolls under an inner scroller.
  - The calendar loading skeleton shows a "Week" circle while the URL says
    schedule (a skeleton label; it likely predates this mission).
  C4+F1 sent to Vision (pass 2) and Strange (pass 1) in parallel.
- 2026-11-02 — Vision PASS on C4+F1 (pass 2). Strange BLOCKED (pass 1: the dark-mode lit row looks disabled). Bryce: "Just get rid of the calendar label." Fury committed C4+F1 as `81125e2` (no gate was running; Strange's blocker is outside C4's files). Renamed the fix contracts C4-F1/C4-F2 to F1/F2 because preflight's id pattern read "C4-" as C4. F2 batches: A the lit row (Strange BLOCKER), B removing the calendar title (Bryce), C the 105px timeline document scroll (Strange note, Fury's call). F2 preflight: 0 failures. Dispatched to Stark. Vision is on its last C4 pass (3 of 3).
- 2026-11-02 — Stark reported F2 DONE: gauntlet + build pass. Part C is
  CSS-only: `data-fills-viewport` on the TimelineGrid root (and the
  skeleton), plus `has-[[data-fills-viewport]]:pb-0` on `<main>` and the
  page div. No pathname list, no VIEW_CONFIG change. Grid becomes
  `rounded-t-xl border-b-0`. Trade-off Stark flagged: on notched phones the
  timeline's last rows sit under the home indicator (the inner scroller
  still scrolls). **Fury's live measurements:**
  - Week at 375 and Day at 1024: document height = viewport height (no
    page scroll).
  - Week scroller top 143 at 375; it fills to 812.
  - Month and Schedule keep `<main>` pb 96px.
  - Pinned Schedule bar 130 at 375. The 1024 read timed out; Strange
    re-measures.
  - The sr-only h1 is present (0 height).
  - The dark-mode drawer lit row now shows the accent-soft pill (screenshot
    sent to Bryce).
  F2 sent to Vision (pass 3, C4's last) and Strange (pass 2) in parallel.

## Delivery

- **Shipped:** pushed `claude/nav-drawer` and opened
  https://github.com/brycemarsh6/family-hub/pull/32 (2026-11-02). Not
  merged; it reaches the family only when Bryce merges it.
- **Shipped check:** after the push, `git status -sb` showed the branch even
  with `origin/claude/nav-drawer`.
- **Follow-ups (notes, not blockers):**
  - Strange pass-1 polish: drawer slide, focus trap, scroll lock, a visible
    close control, the Recipes band above the pinned letter, 11px circle
    labels, the skeleton's "Week"/enabled Today, the 4px hamburger jump,
    Inventory bottom space, Recipes h1, and /settings for device sessions.
  - Dark-mode white scrollbar on desktop (`color-scheme` on `:root`).
  - Captain amendments: `HAMBURGER_TOP_OFFSET_PX`; whether the .md cap
    applies; trim STRUCTURE.md under 650; give CalendarHeader a split seam
    before CD1.
  - Docs pass: the CalendarHeader:67-68 quote, README.md:36 and :39, and
    the (home)/loading.tsx:8 wrap.
  - Confirm the timeline's home-indicator padding on a real iPhone.
- **Deliberate leftovers:** Kitchen landing badges ("12 low", "Plan this
  week") go away with the landing pages (plan Risks); dashboard tiles still
  carry counts.
