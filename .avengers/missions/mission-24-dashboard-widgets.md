# Mission: Dashboard widgets + Customize (navigation redesign PR 2 of 3)

**Project:** family-hub (Marshee)
**Status:** CONTRACTED
**Started:** 2026-11-02 · **Updated:** 2026-11-02

## Brief

- **Goal:** turn the dashboard's four fixed tiles into widgets that each
  person can show, hide and reorder from a Customize sheet, saved per person.
  This builds the system that later widgets (Plans & Goals, slices of other
  pages) plug into. Approved plan: `/Users/brycemarsh/.claude/plans/pasted-content-id-b382-okay-cool-reflective-hummingbird.md`,
  section "PR 2". Branch `claude/dashboard-widgets` from `origin/main` at
  `b05a972` (PR #32 merged).
- **Bryce's decisions (2026-11-02, final):**
  - The widgets are today's four tiles only: Today's meals, Inventory,
    Grocery, Recipes. New widgets come in later missions.
  - Customize is a bottom sheet. Each widget is one row with an on/off
    switch, then up and down arrow buttons. A "Reset to default" button sits
    at the bottom, and the sheet has a close (✕) button. Changes show on the
    dashboard at once and save on their own.
  - The "Customize" button sits right of the "Dashboard" heading.
  - Each person has their own layout. Device logins (the wall tablet) see
    the default layout and get no Customize button.
- **Fury's defaults (flagged to Bryce, change on his word):**
  - A half-width widget (Inventory or Grocery) with no half-width neighbor
    beside it stretches to full width, so hiding one never leaves a hole.
  - If every widget is off, the dashboard shows "Your dashboard is empty."
    with a "Customize" button.
- **Done means:**
  - Toggling a widget off hides it at once and survives a reload.
  - Reordering survives a reload.
  - A second person's layout is unaffected.
  - A corrupt or missing stored layout renders the default.
  - Device sessions have no Customize button, and the save action rejects
    them.
  - The gauntlet passes, and the migration applies cleanly to the Neon dev
    branch.
- **Out of scope:** new widget types; the nav-mode setting (PR 3); drag to
  reorder; widget sizes chosen by the user.

## Danger register

- `.env` points at the Neon **dev** branch. Verified 2026-11-02 by printing
  the hostname only: `ep-hidden-pine-…-pooler`, the dev host recorded in
  mission 21. Never print the URL or any row of family data. Count, don't
  quote.
- **Forbidden:** `npm run db:seed`, `npm run db:reset`,
  `prisma migrate reset`, `prisma db push`, and `prisma migrate dev`. The
  last one can offer to reset the database when it detects drift.
- **The migration is additive only:** one new table plus a relation field
  on `User` (no column on `User`). The SQL is written without touching any
  database. **Fury** reviews the SQL, then applies it to dev with
  `npx prisma migrate deploy`, which applies pending migrations and never
  resets.
- Merging to `main` applies the migration to **production** through the
  Vercel build. That's Bryce's call at the PR.
- **Never write a clean or reset script for `User`.**
- Server Actions are public POST endpoints. The save action checks the
  session itself (`src/lib/dal.ts`).
- Stage by explicit path, never `git add -A`. Agents never commit, push or
  stage. Fury commits.
- No em or en dashes in any new prose (Bryce's rule).

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts`
- `npm run build`

New tests live directly in `src/lib/` so the existing glob reaches them.

## Assembled

- **Stark + Vision** (always).
- **Strange:** the dashboard and a new sheet change on screen.
- **Captain:** new modules, a new table and a new action file.
- **Banner: out.** The dashboard is one 195-line page; Fury read it inline.
- **Model override (Bryce, 2026-11-02): all gates on Opus 5.5.** Passed as a
  per-dispatch `model: "opus"`.

## Contracts

### C1 — Widget registry and layout logic, with tests
- **Status:** BUILT (Stark). 21 new tests (440 → 461), gauntlet all exit 0. Deviations: non-boolean `enabled` falls back to the default; only version 1 accepted. Stark symlinked `node_modules` to the main checkout's (gitignored). **DONE, Vision C1-1 PASS.**
- **Objective:** pure modules that define the widgets and turn any stored value into a safe layout.
- **Boundaries:**
  - may touch: new `src/lib/dashboardWidgets.ts`, new `src/lib/dashboardLayout.ts`,
    new `src/lib/dashboardLayout.test.ts`.
  - must not touch: everything else.
- **Spec:**
  - `dashboardWidgets.ts`:
    - `DASHBOARD_WIDGET_IDS = ["todayMeals", "inventory", "grocery", "recipes"] as const`
    - `DashboardWidgetId`
    - `DASHBOARD_WIDGETS: Record<DashboardWidgetId, { label: string; width: "full" | "half"; defaultEnabled: boolean }>`
      - labels: "Today's meals", "Inventory", "Grocery", "Recipes"
      - widths: full, half, half, full
      - all enabled by default
    - The registry order is the default order.
    - No React imports. This must stay importable from a Server Action and
      a client component.
  - `dashboardLayout.ts`:
    - `DashboardLayout = { version: 1; widgets: { id: DashboardWidgetId; enabled: boolean }[] }`
    - `DEFAULT_DASHBOARD_LAYOUT`
    - `parseDashboardLayout(raw: unknown): DashboardLayout` never throws. It
      accepts a JSON string or an object. Bad input gives the default.
      Unknown ids are dropped, duplicates removed (first wins), and registry
      ids missing from the stored row are appended with their
      `defaultEnabled`.
    - `serializeDashboardLayout(layout): string`
    - `toggleWidget(layout, id)`
    - `moveWidget(layout, id, -1 | 1)`: clamped at the ends, so a move past
      either end returns an equal layout.
    - `widgetSpans(layout): { id; span: "full" | "half" }[]` gives the
      enabled widgets in order. A half widget renders half only when the
      previous or next enabled widget is half and they pair up left to
      right; otherwise it renders full. Pairing is greedy: two consecutive
      halves pair, and a lone half goes full.
    - Every function is pure and returns new objects.
  - Tests must cover:
    - the default
    - garbage (`null`, `"{"`, `42`, a wrong version, a non-array `widgets`)
    - unknown ids
    - duplicates
    - "an id added later shows up for an old stored row"
    - toggle
    - move at both ends
    - a serialize/parse round trip
    - spans: all on; Inventory off (so Grocery goes full); Grocery off; both
      halves moved apart; three halves can't happen with today's registry,
      so test the greedy rule using two halves separated by a full widget
- **Verification:** gauntlet → pass. The test count rises by the new tests.
- **Evidence required:** test names and counts; each gauntlet exit code.
- **Done criteria:** Vision PASS.

### C2 — Table, migration SQL and the save action
- **Status:** BUILT (Stark). The SQL is exactly `prisma migrate diff --from-schema --to-schema` output: one CREATE TABLE plus one FK with ON DELETE CASCADE, nothing dropped or altered. Fury reviewed it and confirmed the dev host (`ep-hidden-pine`, migrate status listed only this migration as pending), then ran `npx prisma migrate deploy`: applied, exit 0, "Database schema is up to date!". **DONE, Vision C2-1 PASS.**
- **Objective:** store one layout per person and save it through a session-checked Server Action.
- **Boundaries:**
  - may touch: `prisma/schema.prisma` (add `UserPreferences`; add the
    relation field `preferences UserPreferences?` to `User`, with no other
    `User` change), new
    `prisma/migrations/<timestamp>_add_user_preferences/migration.sql`, new
    `src/app/actions/preferences.ts`.
  - **Preflight exception:** preflight hard-fails `prisma/schema.prisma`
    (680 lines) on the 650 cap, but STRUCTURE.md's File-size caps exempt
    `schema.prisma` by name.
  - must not touch: every other file, and any database. No `migrate dev`,
    `db push`, `migrate reset`, `migrate deploy` or seed.
- **Spec:**
  - The model, following the plan:
    `UserPreferences { userId String @id; user User @relation(fields: [userId], references: [id], onDelete: Cascade); dashboardLayout String?; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt }`
    - A `///` doc says `dashboardLayout` is JSON as text (the
      `AssistantChange.summary` precedent) and is parsed only by
      `parseDashboardLayout`.
  - The SQL comes from `prisma migrate diff` between the `origin/main`
    schema and the new schema, with no database involved. Check this Prisma
    7's flag names in `node_modules/prisma` help output. The timestamp
    folder name follows the existing ones.
  - `preferences.ts` (`"use server"`):
    - `saveDashboardLayout(input: unknown): Promise<{ ok: true } | { ok: false; error: string }>`.
    - It calls `requireVerifiedUser()` (or `getVerifiedUser()` returning an
      error when null), rejects `isDevice`, and runs the input through
      `parseDashboardLayout`, treating it as a claim and never trusting it.
    - It upserts by `userId` from the session, never from the input, then
      calls `revalidatePath("/")`.
    - Follow the error and return shape of the existing actions in
      `src/app/actions/`.
- **Verification:**
  - `npx prisma validate` → ok
  - `npx prisma generate` → ok
  - gauntlet → pass
  - `cat` the migration SQL into the report. Expect one CREATE TABLE, one
    FK with ON DELETE CASCADE, and no DROP or ALTER of existing columns.
- **Evidence required:** the full SQL; the gauntlet exit codes.
- **Done criteria:** Fury has reviewed the SQL and applied it to dev with
  `npx prisma migrate deploy`; Vision PASS.

### C3 — Dashboard widget list and the Customize sheet
- **Status:** PENDING
- **Objective:** render the dashboard from each person's layout and let them change it instantly.
- **Boundaries:**
  - may touch: `src/app/(app)/(home)/page.tsx`, `src/app/(app)/(home)/loading.tsx`,
    new `src/components/DashboardWidgetList.tsx`, new
    `src/components/DashboardCustomizeSheet.tsx`,
    `src/components/DashboardTile.tsx` and `src/components/TodayMealsTile.tsx`
    (only to let the span come from the list instead of a hardcoded `wide`).
  - must not touch: everything else.
- **Spec:**
  - `page.tsx`:
    - `getVerifiedUser()`, then `db.userPreferences.findUnique` for that
      user (skipped for devices), then `parseDashboardLayout`.
    - Keep the one `Promise.all` for the tile data. Keep each tile's JSX
      the same.
    - Build `tiles: Record<DashboardWidgetId, ReactNode>`, so a missing
      renderer is a compile error.
    - Render `<DashboardWidgetList layout tiles canCustomize={!isDevice} />`.
  - `DashboardWidgetList` (client):
    - The heading row is `flex items-center justify-between`: the h1
      "Dashboard" left, the Customize button right (Lucide
      `SlidersHorizontal` 18 + "Customize", at least 44px tall, `rounded-xl`
      border).
    - Keep the subtitle "What's going on around the house."
    - Uses `useOptimistic(layout)`.
    - Renders `widgetSpans` in the same 2-column grid. A full span is
      `col-span-2`.
    - Empty state (every widget off): "Your dashboard is empty." plus the
      Customize button.
  - `DashboardCustomizeSheet` (client):
    - Copy the chrome of the existing sheets (`RadioSheet.tsx` or
      `ActionSheet.tsx`: backdrop, `role="dialog"`, Escape, z-index). Read
      them first and follow whichever pattern DESIGN.md names.
    - Title "Customize dashboard" with a ✕ close button.
    - One `min-h-14` row per registry widget, in layout order:
      - the label
      - a `role="switch"` `aria-checked` toggle, at least 44px
      - `ChevronUp` and `ChevronDown` 44px buttons with
        `aria-label="Move <label> up/down"`, disabled at the ends
    - A "Reset to default" button at the bottom.
    - Every change is `startTransition(() => { setOptimistic(next); saveDashboardLayout(next) })`.
      A failed save shows inline error text in the sheet.
  - `loading.tsx`: the skeleton gets a button-shaped block right of the
    heading.
  - Colors use tokens only. Icons are Lucide only. Touch targets follow
    DESIGN.md.
- **Verification:** gauntlet → pass. File sizes are under the 350 soft cap.
- **Evidence required:** gauntlet exit codes; `wc -l` of the touched files.
- **Done criteria:** Vision PASS, then Strange PASS. Strange signs in as
  needed in the dev server, using the existing session in the browser pane.

### C4 — Constitutions and CLAUDE.md
- **Status:** PENDING
- **Boundaries:**
  - may touch: `DESIGN.md` (component vocabulary: `DashboardWidgetList`,
    `DashboardCustomizeSheet`), `STRUCTURE.md` (one-source list:
    `src/lib/dashboardWidgets.ts`, created by C1, is the only widget registry, and
    `parseDashboardLayout` is the only reader of the stored JSON; the file
    must stay ≤699 lines; preflight's over-cap FAIL is the exception
    recorded in mission 23's C5: the overage predates both missions),
    `CLAUDE.md` ("What's built" Dashboard bullet only).
- **Verification:** gauntlet → pass; `wc -l STRUCTURE.md` ≤ 699; no em or en
  dashes in added lines.
- **Done criteria:** Captain PASS over the whole mission.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| C1-1 | Vision (Opus) | **PASS** | 0 | 4 |

**C1 Vision:** gauntlet all exit 0; 21/21 new tests. Probes passed:
- prototype keys
- non-string ids
- a 22MB input (133ms)
- all 384 order/mask combinations on a simulated 2-column grid (0 holes)
- purity

Notes:
- "never throws" doesn't hold for hostile getters/Proxies, which can't reach
  it via JSON or Server Action args.
- `widgetSpans` and the other helpers assume a *parsed* layout; C2/C3 must
  always parse, never cast.
- An optional early `break` in the parse loop.
| C2-1 | Vision (Opus) | **PASS** | 0 | 3 |

**C2 Vision:** gauntlet all exit 0. A fresh schema-to-schema diff is
byte-identical to migration.sql. The `User` change is a back-relation only.
`migrate status` on dev is up to date. Action probes: unauthenticated, device,
forged userId, `__proto__`, and 100k entries are all refused or normalised
(the stored value is always 158-159 bytes, the four ids only). The error
message is generic. Notes:
- The `{ok}` result shape differs from the house `{error?}`; it's
  spec-dictated, so C3 must check `result.ok`.
- The bare `catch` doesn't log; add `console.error` later.
- The success path is not live-tested; C3's Strange pass should toggle,
  reload and check a second person on dev.

## Handoff log

- 2026-11-02: mission opened. Bryce chose the four tiles, the switch + arrows
  sheet, and a layout per person. Fury verified the dev DB host and wrote
  C1 to C4.
- 2026-11-02: C1 built. Vision gating C1 while Stark builds C2.
- 2026-11-02: C1 PASS and committed. C2 built; migration applied to dev by Fury. Vision gating C2 while Stark builds C3.

## Delivery

- **Shipped:** —
- **Shipped check:** —
