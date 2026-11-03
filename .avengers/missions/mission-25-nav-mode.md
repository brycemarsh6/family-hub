# Mission: Menu style setting (navigation redesign PR 3 of 3)

**Project:** family-hub (Marshee)
**Status:** DELIVERED (all gates PASS; awaiting Bryce's go to push)
**Started:** 2026-11-02 · **Updated:** 2026-11-02

## Brief

- **Goal:** a per-login "Menu style" setting. On wide screens it can pin the
  side drawer open as an icon rail or a full sidebar. Phones, and screens
  under the breakpoint, always use the menu button.
  - Approved plan: `/Users/brycemarsh/.claude/plans/pasted-content-id-b382-okay-cool-reflective-hummingbird.md`,
    section "PR 3".
  - Branch `claude/nav-mode` from `origin/main` at `062eb50` (PR #33
    merged).
- **Bryce's decisions (2026-11-02, final):**
  - **Settings row:** a "Menu style" row on /settings, styled like "Manage
    family" (Lucide `Menu` icon, the current choice shown under the title,
    `ChevronRight`). Tapping it opens a `RadioSheet` titled "Menu style"
    with three options:
    - "Menu button" (the default)
    - "Always open, icons only"
    - "Always open, icons + names"

    Under the options: "Applies on wide screens. Phones always use the menu
    button."
  - **Breakpoint:** `lg` (1024px). Laptops and sideways tablets get the
    pinned menu; an upright iPad keeps the menu button.
  - **Wall tablet:** the device login gets the row too and saves its own
    choice. "Manage family" stays admin-only. The old "Nothing to set up
    yet." line goes away, because everyone now has a row.
  - **Icons-only rail:** about 72px wide, icons only, each with an
    `aria-label`. **Icons + names:** the drawer's rows, about 256px wide.
- **Fury's structure calls:**
  - **The setting lives in the `UserPreferences` table** as a nullable
    `navMode` text column: one additive migration. It is read through the
    DAL's existing `User` query (one extra `select` of the relation), so
    there's no new database round trip.
  - **Pinned mode keeps the reserved hamburger row.** The floating
    hamburger stays rendered but becomes `lg:invisible`. It still takes up
    its space, `useHamburgerRowHeight()` still measures it, and every
    dependent listed in `src/lib/appChrome.ts` keeps working unchanged. (If
    it were not rendered at all, the measurement would read 0 and skew
    ScheduleView's math.) The wordmark header's in-line hamburger is
    `lg:hidden` instead, since nothing measures it.
  - **One CSS variable `--app-nav-width`** (0 / 72px / 256px at `lg`) is set
    by AppChrome. The fixed full-width bars use it as their left edge so they
    line up with the content column, not the window: `AddItemBar`,
    `FloatingAddButton`, and HamburgerButton's floating wrapper. The pixel
    numbers have one home in `src/lib/appChrome.ts`.
  - **The drawer's list is extracted into `NavList`** (with a `compact`
    prop for the rail), so the drawer and the pinned menu share one list.
- **Done means:**
  - On a ≥1024px screen each mode renders, with nothing overlapping:
    - dashboard
    - calendar (timeline width, header circles, Schedule pinned bar)
    - Recipes (A to Z rail at the right edge)
    - Shopping (AddItemBar under the content column)
  - Crossing 1024 flips cleanly.
  - Phones are unchanged.
  - The setting survives a reload.
  - A second login is unaffected.
  - The gauntlet passes, and the migration applies on the dev branch.
- **Out of scope:**
  - collapsing or expanding the pinned menu by hand
  - a mode for upright tablets
  - any change to the phone drawer's look

## Danger register

Same as mission 24 (read it there); the key points:
- `.env` points at the dev host `ep-hidden-pine`. Fury re-checks before
  migrating.
- **Forbidden:** `db:seed`, `db:reset`, `migrate reset`, `db push`,
  `migrate dev`.
- **Migrations are additive only.** The SQL comes from a schema-to-schema
  `prisma migrate diff`. Fury reviews it and applies it to dev with
  `migrate deploy`. Merging applies it to production through
  `prisma/migrate-on-production.mjs`.
- **Vercel previews use the LIVE database** and never migrate, so a preview
  of this PR shows errors until merge. Never test against a preview.
- **`src/lib/dal.ts` is the auth core.** Its change is limited to selecting
  `preferences.navMode` and mapping it, so no guard behaviour changes.
- Never write a clean/reset script for `User`.
- Stage by explicit path. Agents never commit, push or stage.
- No em or en dashes in new prose (Bryce's rule).

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts`
- `npm run build`

## Assembled

- **Stark + Vision** (always).
- **Strange:** every signed-in screen changes at ≥1024.
- **Captain:** new modules, a DAL change, an extracted component.
- **Banner: out.** Fury mapped the chrome and the fixed elements inline.
- **All gates on Opus 5.5** (Bryce, 2026-11-02).

## Contracts

### C1: Menu-style vocabulary and pinned widths, with tests
- **Status:** DONE (Stark; Vision C1-1 PASS). Tests 461 to 466.
- **Boundaries:**
  - may touch: new `src/lib/navMode.ts`, new `src/lib/navMode.test.ts`,
    `src/lib/appChrome.ts` (add constants and a pure helper only),
    `src/lib/appChrome.test.ts`.
  - must not touch: everything else.
- **Spec:**
  - `navMode.ts`:
    - `NAV_MODES = ["hamburger", "rail", "sidebar"] as const` and
      `NavMode`.
    - `NAV_MODE_LABELS: Record<NavMode, string>` with exactly "Menu
      button", "Always open, icons only", "Always open, icons + names".
    - `NAV_MODE_HELP = "Applies on wide screens. Phones always use the menu button."`
    - `DEFAULT_NAV_MODE = "hamburger"`.
    - `toNavMode(raw: unknown): NavMode` never throws; anything unknown
      returns the default.
    - No React imports.
  - `appChrome.ts`:
    - `NAV_RAIL_WIDTH_PX = 72` and `NAV_SIDEBAR_WIDTH_PX = 256`, each with
      a comment naming its dependents (AppChrome's `--app-nav-width`, the
      pinned aside).
    - `pinnedNavWidthPx(mode: NavMode): number` returns 0, 72 or 256.
    - Keep the file's existing style.
  - Tests:
    - labels are complete and exact
    - `toNavMode` handles garbage (`null`, `42`, `"Rail"`, `"__proto__"`)
      and every valid value
    - `pinnedNavWidthPx` returns the right value for each mode
- **Verification:** gauntlet → pass.
- **Done criteria:** Vision PASS.

### C2: navMode column, DAL read, save action
- **Status:** BUILT (Stark). The SQL is exactly `ALTER TABLE "UserPreferences" ADD COLUMN "navMode" TEXT;`. Fury confirmed the dev host and that only this migration was pending, then ran `migrate deploy`: applied, up to date. DONE (Vision C2-1 PASS).
- **Boundaries:**
  - may touch: `prisma/schema.prisma` (add `navMode String?` to
    `UserPreferences` with a `///` doc, nothing else), new
    `prisma/migrations/<timestamp>_add_nav_mode/migration.sql`,
    `src/lib/dal.ts` (`VerifiedUser` gains `navMode: NavMode`;
    `loadSessionUser`'s existing `findUnique` adds
    `preferences: { select: { navMode: true } }` to its select and maps it
    through `toNavMode`; nothing else), `src/app/actions/preferences.ts`
    (add `saveNavMode`).
  - **Preflight exception:** `schema.prisma` is over 650 lines but is
    exempt by name in STRUCTURE.md's File-size caps.
  - must not touch: everything else, and any database.
- **Spec:**
  - SQL from a schema-to-schema `prisma migrate diff`. Stark copies the
    mission 24 C2 method; the old schema comes from
    `git show origin/main:prisma/schema.prisma`. Expected:
    `ALTER TABLE "UserPreferences" ADD COLUMN "navMode" TEXT;` only.
  - `saveNavMode(input: unknown): Promise<PreferencesResult>`:
    - calls `getVerifiedUser()`; a null user gets `{ error: "Not signed in." }`
    - **devices are allowed** (Bryce's decision)
    - the value must be one of `NAV_MODES` exactly (an unknown value gets
      an error, not a silent default)
    - upsert by the session's `userId`, setting only `navMode`
    - `revalidatePath("/", "layout")`
    - `console.error` in the catch, same as `saveDashboardLayout`
  - `VerifiedUser.navMode` defaults to `"hamburger"` when there's no
    preferences row.
- **Verification:**
  - `npx prisma validate` → ok
  - `npx prisma generate` → ok
  - gauntlet → pass
  - full SQL in the report
- **Done criteria:** Fury reviews the SQL and runs `migrate deploy` on dev;
  Vision PASS.

### C3: NavList, pinned menu, alignment variable, Settings row
- **Status:** BUILT (Stark). Gauntlet all exit 0. Deviations, accepted: the wrapper is `flex flex-col lg:flex-row`; there are two CSS vars (`--app-nav-width-lg` inline, copied into `--app-nav-width` by an `lg:` class); HamburgerButton gained a `pinned` prop; there was a type-only NavList/NavDrawer cycle (wrongly accepted; Captain blocked it, F2 removed it); no left safe-area padding on PinnedNav. DONE (Vision C3-1 PASS, Strange C3-2 PASS after F1).
- **Boundaries:**
  - may touch:
    - `src/components/NavDrawer.tsx`
    - new `src/components/NavList.tsx`
    - new `src/components/PinnedNav.tsx`
    - `src/components/AppChrome.tsx`
    - `src/components/HamburgerButton.tsx`
    - `src/app/(app)/layout.tsx` (pass `navMode`)
    - `src/components/AddItemBar.tsx` (left edge only)
    - `src/components/FloatingAddButton.tsx` (left edge only)
    - `src/app/(app)/settings/page.tsx`
    - new `src/components/NavModeSetting.tsx` (the client row plus
      `RadioSheet`)
  - must not touch: everything else (including `RadioSheet.tsx` and
    `src/lib/appChrome.ts`).
- **Spec:**
  - **`NavList`:** the drawer's sections, footer items, identity row and
    Sign out, moved out of `NavDrawer` with the same markup, the same
    re-tap refresh on the current row, and the same `activeNavHref`
    lighting. It takes an `onNavigate` callback (the drawer closes; the
    pinned menu does nothing).
    - `compact` mode renders 48×48 icon-only rows centered, each with
      `aria-label` = the label.
    - In compact mode the Kitchen heading becomes a thin divider, and the
      identity row is the avatar only (`aria-label` = name).
    - Sign out is an icon button with `aria-label="Sign out"`.
    - `NavDrawer` renders `NavList`, with its behaviour unchanged.
  - **`PinnedNav`:**
    - an `<aside aria-label="Menu">`, `hidden lg:flex`
    - `sticky top-0 h-dvh shrink-0 overflow-y-auto border-r border-line bg-surface print:hidden`
    - safe-area top padding
    - width from `NAV_RAIL_WIDTH_PX` / `NAV_SIDEBAR_WIDTH_PX`
    - renders `NavList` (compact for the rail)
  - **`AppChrome`:**
    - Takes `navMode`. When signed in and the mode isn't hamburger, it
      wraps everything in `lg:flex` with `PinnedNav` first and the
      header-plus-main column `min-w-0 flex-1` (main keeps its
      `mx-auto max-w-3xl`).
    - It sets `--app-nav-width` to `pinnedNavWidthPx(navMode)` px at `lg`
      only, and 0 below. A style plus a `lg:` arbitrary property, or an
      equivalent.
    - The floating `HamburgerButton` gets `lg:invisible` when pinned. Keep
      it rendered: the reserved row and the measurements depend on it.
    - The header hamburger gets `lg:hidden` when pinned.
    - The `hamburger` mode is unchanged.
  - **`AddItemBar`, `FloatingAddButton` and HamburgerButton's floating
    wrapper:** replace `inset-x-0` with `right-0 left-[var(--app-nav-width,0px)]`
    (or equivalent), so they center on the content column. With no
    variable set they behave as today.
  - **`settings/page.tsx`:**
    - Every signed-in user (devices included) sees `NavModeSetting` first.
    - Admins also see "Manage family" below it.
    - Remove "Nothing to set up yet."
  - **`NavModeSetting` (client):**
    - a row styled like Manage family: `min-h-14`, Lucide `Menu` 22,
      "Menu style" with the current label beneath it in `text-sm text-muted`,
      and `ChevronRight`
    - opens `RadioSheet` titled "Menu style" with the three
      `NAV_MODE_LABELS`
    - shows `NAV_MODE_HELP` in `text-sm text-muted`. If `RadioSheet` has no
      slot for it, put the help text under the row on the Settings page
      instead. Don't edit `RadioSheet`.
    - on select: `useOptimistic` plus `startTransition(saveNavMode)`, with
      an inline error on failure (try/catch, like the dashboard)
  - Colors use tokens only. Icons are Lucide only. Targets are at least
    44px.
  - **`PinnedNav` is imported only from `AppChrome` (client).** Never import
    it from `(app)/layout.tsx` or another server file: `src/lib/appChrome.ts`
    is `"use client"`, and its constants would arrive as client references
    in a Server Component (Vision C1 note).
- **Verification:** gauntlet → pass; touched files ≤350 lines.
- **Done criteria:** Vision PASS, then Strange PASS. Strange checks each
  mode at 1280 and 1024, the 1023/1024 flip, 375 unchanged, light/dark,
  calendar/Recipes/Shopping/dashboard alignment, and the setting surviving
  a reload.

### F1: close the drawer when the menu pins (Strange C3-1 blocker)
- **Status:** BUILT (Stark; gauntlet exit 0). Stark had no browser tools, so the browser checks move to Strange C3-2. DONE (Strange C3-2 PASS).
- **Objective:** when `pinned` is true and the window starts matching
  `(min-width: 1024px)` while the drawer is open, the drawer closes, so a
  modal drawer never sits over the pinned menu (DESIGN.md "exactly one
  navigation surface"; Brief: "crossing 1024 flips cleanly").
- **Boundaries:** may touch `src/components/HamburgerButton.tsx` only. Must
  not touch NavDrawer, AppChrome, `appChrome.ts` or anything else. The
  breakpoint must not become a second literal home if one already exists;
  if Tailwind's `lg` has no JS constant, a local `"(min-width: 1024px)"` with
  a comment naming Tailwind's `lg` is fine.
- **Approach:** an effect, active only when `pinned`, that subscribes to
  `window.matchMedia("(min-width: 1024px)")` and calls `setOpen(false)` from
  the change listener when it starts matching. No `setState` directly in the
  effect body (the drawer is closed on mount anyway, and the lint rule
  forbids it). Clean up the listener. Hamburger mode behaves exactly as now.
- **Verification:** gauntlet exit 0. In the browser (port 3001, tab-1, dev
  DB): rail mode at 1023, open the drawer, resize to 1024 → drawer gone, no
  scroll lock left on `body`; resize back to 1023 → hamburger visible, drawer
  closed, opens again normally. Hamburger mode at 1280 → drawer still opens.
  Reset Bryce's menu style to "Menu button" and the viewport to desktop after.
- **Evidence required:** the diff, gauntlet exit codes, and the measured
  browser results above.
- **Done criteria:** Strange C3-2 PASS.

### C4: Constitutions and CLAUDE.md
- **Status:** DONE (Stark; STRUCTURE.md held at 699; Captain pass 2 PASS).
- **Boundaries:** `DESIGN.md` (the drawer rule: on screens ≥ `lg` a
  per-login setting may pin the drawer as a rail or sidebar, and phones
  never pin; vocabulary: `NavList`, `PinnedNav`, `NavModeSetting`),
  `STRUCTURE.md` (`src/lib/navMode.ts`, created by C1, in the one-source list; the chrome-dimension
  instance adds `NAV_RAIL_WIDTH_PX`, `NAV_SIDEBAR_WIDTH_PX` and
  `--app-nav-width`; must stay ≤699 lines, with the mission 23 C5 exception),
  `CLAUDE.md` ("What's built" drawer bullet only),
  `src/app/actions/preferences.ts` (header comment only: it now holds two
  settings and devices may save the menu style; Stark and Vision C2 notes),
  `src/lib/dal.ts` (the `loadSessionUser` doc comment only: two queries now;
  Vision C2 note), `src/lib/appChrome.test.ts` (header comment only;
  Vision C1 note).
- **Verification:** gauntlet → pass; `wc -l STRUCTURE.md` ≤ 699; no dashes
  added.
- **Done criteria:** Captain PASS over the whole mission.

### F2: break the NavList/NavDrawer cycle, plus C4 wording (Captain K-1)
- **Status:** BUILT (Stark; gauntlet exit 0, cycle scan 0 of 287). DONE (Captain pass 2 PASS).
- **Objective:** no import cycle in `src/` (STRUCTURE.md "No cycles, ever";
  the C3 acceptance of a type-only cycle was wrong, mission-21 B1 precedent),
  and the C4 wording Captain flagged is accurate.
- **Boundaries:** may touch `src/components/NavList.tsx`, `NavDrawer.tsx`,
  `PinnedNav.tsx`, `AppChrome.tsx`, `HamburgerButton.tsx` (imports only,
  plus PinnedNav's width), `DESIGN.md` (the two sentences below),
  `src/lib/dal.ts` (the `loadSessionUser` comment only), `CLAUDE.md` (rewrap
  the drawer bullet's last line only). Nothing else.
- **Work:**
  1. Move `DrawerUser` (and its `Role` import) from NavDrawer into NavList,
     the leaf. Point NavDrawer, PinnedNav, AppChrome and HamburgerButton at
     NavList. No re-export from NavDrawer. Keep the name (no rename).
  2. PinnedNav's width uses `pinnedNavWidthPx(mode)` from `appChrome.ts`
     instead of its own ternary, so mode to width is mapped once.
  3. DESIGN.md: "all three render `NavList`" becomes "`NavDrawer` and
     `PinnedNav` both render `NavList`"; "Pinned bars that span the screen
     (`AddItemBar`, `FloatingAddButton`)" becomes "Fixed bars that span the
     screen (`AddItemBar`, `FloatingAddButton`, the floating hamburger's
     row)".
  4. dal.ts: "still only hits the database once per render pass" becomes
     "still runs this lookup only once per render pass".
  5. CLAUDE.md: rewrap the drawer bullet's new last line to about 80 columns.
- **Verification:** gauntlet exit 0 (tsc, eslint, npm test); Captain's cycle
  scan `node <scratchpad>/cycles.mjs` reports 0 cycles; no dashes added.
- **Done criteria:** Captain pass 2 PASS.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| C1-1 | Vision (Opus) | **PASS** | 0 | 3 |
| C2-1 | Vision (Opus) | **PASS** | 0 | 4 |
| C3-1 | Vision (Opus) | **PASS** | 0 | 6 |
| C3-1 | Strange (Opus) | **BLOCKED** | 1 | 6 |
| C3-2 | Strange (Opus) | **PASS** | 0 | 1 |
| M-1 | Captain (Opus) | **BLOCKED** | 1 | 7 |
| M-2 | Captain (Opus) | **PASS** | 0 | 4 |

**C1 Vision:** gauntlet all exit 0 (466). The labels and help text match the
Brief exactly. `toNavMode` uses strict equality and passed every hostile
input. `navMode.ts` is importable server and client side. Notes:
- `appChrome.ts` is `"use client"`; a Server Component importing the new
  constants would break quietly. Folded into C3.
- The `appChrome.test.ts` header comment is now slightly inaccurate
  (cosmetic, docs pass).

**C2 Vision:** gauntlet all exit 0 (466; UTC 459 + 7 DST skips). A fresh
`migrate diff` matches the migration byte for byte; `migrate status` on the
dev host says up to date. `saveNavMode` refused every hostile input and can't
touch `dashboardLayout` or another person's row. Notes:
- The DAL now makes two queries per request for a signed-in person (Prisma
  loads the preferences relation separately). Accepted: one primary-key
  lookup, cached per render. Not turning on `relationJoins`.
- `dal.ts`'s `loadSessionUser` comment still says "one lookup". Fixed in C4.
- `preferences.ts`'s header still says devices are refused. Fixed in C4.
- A Vercel preview against the live DB will error everywhere until merge
  (the column doesn't exist there yet). Known; Bryce told.

**C3 Vision:** gauntlet all exit 0 (466; UTC 459 + 7 skips; build ok).
Boundary clean (10 declared files). No server file imports `appChrome.ts` or
`PinnedNav`. The `lg:invisible` hamburger keeps its box for
`useHamburgerRowHeight` but takes no focus or clicks. `--app-nav-width` is
unset below lg and in hamburger mode. An offline save shows an inline alert,
not the error boundary. Notes (follow-ups, not this mission's job):
- Switching hamburger to pinned changes AppChrome's root, so the page
  remounts. Only happens on /settings after a save; harmless today.
- A drawer left open while the window widens past 1024 in a pinned mode
  stays open with its button invisible (Escape and backdrop still close it).
- Type-only NavList/NavDrawer cycle (accepted).
- No left safe-area padding on PinnedNav (accepted; no real device hits it).
- The rail's avatar has no visible name for sighted users. Design question
  for Bryce at delivery.

**C3 Strange:** every mode checked at 1280, 1024 and 375, light and dark;
fixed bars, Schedule bar, Recipes letters and A to Z rail all sit in the
content column; the choice survives reloads; Bryce reset to "Menu button".
- BLOCKER: drawer opened below 1024, window widened past 1024 in a pinned
  mode → the modal drawer stays open over the pinned menu, its button now
  invisible. Fix contract F1.
- Notes (follow-ups): N1 pinned mode keeps an empty 56px band at the top of
  non-dashboard pages; N2 the pinned menu overflows 1280x800 and 1024x768 by
  15 to 20px (Sign out scrolls), and a classic scrollbar shifts rail icons;
  N3 light scrollbar in dark mode (`color-scheme` on `:root`); N4 no tooltips
  on rail icons; N5 the settings row icon is the same glyph as the hamburger
  (Bryce's choice); N6 dev badge covers AddItemBar's Add (dev only).

**C3-2 Strange (F1):** rail and sidebar, drawer open at 1023, widened to
1024 → 0 dialogs, only the pinned menu; back to 1023 the button works.
Hamburger mode at 1280 and 375 unchanged. Note: the drawer never locked
scroll, so "no lock left" passed trivially. F1's 12-line diff had no
separate Vision pass; Stark's gauntlet was green and Captain's whole-mission
pass plus the delivery gauntlet cover it.

**Mission Captain pass 1:** gauntlet all exit 0 including build; recordcheck
0 hard fails, 2 REVIEW lines settled (the `<timestamp>` placeholder; countable
claims spot-checked). F1 read as correct. STRUCTURE.md attribution trim ruled
acceptable.
- BLOCKER K-1: type-only cycle NavDrawer → NavList → NavDrawer, the only cycle
  in `src/`. Fix contract F2.
- Notes: PinnedNav maps mode to width separately from `pinnedNavWidthPx`
  (folded into F2); DESIGN.md wording (folded into F2); dal.ts comment says
  "once" (folded into F2); the dashboard reads the `UserPreferences` row twice
  on `/` (follow-up: take `dashboardLayout` from the DAL select); STRUCTURE.md
  sequential-read clause could mention the second query (next touch with room);
  `MediaQueryList.addEventListener` needs Safari 14+ (fine for our devices).

## Handoff log

- 2026-11-02: mission opened. Bryce chose the "Menu style" row and sheet,
  the 1024 breakpoint, and a per-login choice for the wall tablet. Fury
  mapped the chrome dependents and the fixed bars, and wrote C1 to C4.
- 2026-11-02: C1 PASS and committed. Stark building C2.
- 2026-11-02: C2 built; migration applied to dev. Vision gating C2 while Stark builds C3.
- 2026-11-02: C2 PASS and committed. C3 built; Vision and Strange gating.
- 2026-11-02: C3 Vision PASS, Strange blocked (drawer over pinned menu); F1 fixed it, Strange C3-2 PASS. C3 + F1 committed. Stark on C4.
- 2026-11-02: C4 built. Captain blocked on the NavList/NavDrawer cycle; F2 removed it and fixed wording; Captain pass 2 PASS. C4 + F2 committed. Dev server stopped, launch.json reverted.

## Delivery

- **Shipped:** branch `claude/nav-mode`, 4 commits (C1; C2; C3+F1; C4+F2).
  Not pushed yet: waiting on Bryce. Merging applies the additive
  `add_nav_mode` migration to production in the Vercel build.
- **Shipped check:** run `git log origin/main..HEAD` after push.
- **Preview warning:** a Vercel preview uses the live DB, which has no
  `navMode` column until merge, and the DAL selects it on every page, so the
  PR preview will error everywhere. Skip the preview; the dev branch was
  tested.
- **Follow-ups (not this mission):**
  - Pinned mode keeps an empty 56px band at the top of non-dashboard pages
    (Strange N1).
  - The pinned menu overflows 1280x800 and 1024x768 by 15 to 20px; tighten
    spacing or move identity and Sign out into a footer (Strange N2).
  - `color-scheme: light dark` on `:root` for dark scrollbars (Strange N3,
    also a mission 23 follow-up).
  - Rail icons have no tooltip, and the rail's avatar shows no name
    (Strange N4, Vision). A design question for Bryce.
  - The dashboard reads the `UserPreferences` row twice on `/`; take
    `dashboardLayout` from the DAL select (Captain).
  - Switching hamburger to pinned remounts the page (AppChrome root changes
    shape); always render the wrapper (Vision).
  - STRUCTURE.md is at its 699 limit; the next amendment needs a trim.
