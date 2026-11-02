# Mission: Menu style setting (navigation redesign PR 3 of 3)

**Project:** family-hub (Marshee)
**Status:** CONTRACTED
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

### C1 — Menu-style vocabulary and pinned widths, with tests
- **Status:** DONE (Stark; Vision C1-1 PASS). Tests 461 → 466.
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

### C2 — navMode column, DAL read, save action
- **Status:** DISPATCHED (Stark, in parallel with C1's gate)
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

### C3 — NavList, pinned menu, alignment variable, Settings row
- **Status:** PENDING
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

### C4 — Constitutions and CLAUDE.md
- **Status:** PENDING
- **Boundaries:** `DESIGN.md` (the drawer rule: on screens ≥ `lg` a
  per-login setting may pin the drawer as a rail or sidebar, and phones
  never pin; vocabulary: `NavList`, `PinnedNav`, `NavModeSetting`),
  `STRUCTURE.md` (`src/lib/navMode.ts`, created by C1, in the one-source list; the chrome-dimension
  instance adds `NAV_RAIL_WIDTH_PX`, `NAV_SIDEBAR_WIDTH_PX` and
  `--app-nav-width`; must stay ≤699 lines, with the mission 23 C5 exception),
  `CLAUDE.md` ("What's built" drawer bullet only).
- **Verification:** gauntlet → pass; `wc -l STRUCTURE.md` ≤ 699; no dashes
  added.
- **Done criteria:** Captain PASS over the whole mission.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| C1-1 | Vision (Opus) | **PASS** | 0 | 3 |

**C1 Vision:** gauntlet all exit 0 (466). The labels and help text match the
Brief exactly. `toNavMode` uses strict equality and passed every hostile
input. `navMode.ts` is importable server and client side. Notes:
- `appChrome.ts` is `"use client"`; a Server Component importing the new
  constants would break quietly. Folded into C3.
- The `appChrome.test.ts` header comment is now slightly inaccurate
  (cosmetic, docs pass).

## Handoff log

- 2026-11-02: mission opened. Bryce chose the "Menu style" row and sheet,
  the 1024 breakpoint, and a per-login choice for the wall tablet. Fury
  mapped the chrome dependents and the fixed bars, and wrote C1 to C4.
- 2026-11-02: C1 PASS and committed. Stark building C2.

## Delivery

- **Shipped:** —
- **Shipped check:** —
