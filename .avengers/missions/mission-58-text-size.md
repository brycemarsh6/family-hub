# Mission: Text size setting (mission 58)

**Project:** family-hub (Marshee)
**Status:** BUILDING (T1 dispatched)
**Started:** 2026-11-09 · **Updated:** 2026-11-09

## Brief

- **Goal:** The dashboard text is too small to read on the kitchen wall
  tablet. Add a per-login "Text size" setting (Normal, Large, Extra large)
  that magnifies the app evenly, so the tablet login can run large while
  phones stay normal. The design must keep its proportions.
- **Done means:** Settings shows a Text size control; choosing a size saves
  it for that login (the Tablet device login included), survives a reload,
  and every page on an iPad viewport renders with text, spacing and tap
  targets scaled together with nothing clipped or overlapping. Gauntlet green.
- **Out of scope:**
  - The tablet choosing its own widgets. That is mission 39 PR B, contract C5
    (the tablet gets Customize). After C5 the tablet trims to 3 or 4 big
    widgets with the sizes that already exist (Large, Extra large).
  - A tablet-only dashboard design or new widget sizes.
  - Following the iOS system text size.
  - Per-page or per-widget text sizes.

## Danger register

As AGENTS.md, in full. For this mission in particular:
- One **additive** migration (a nullable text column on `UserPreferences`).
  Review the SQL before applying. It runs on production at merge.
- Local dev is the Neon `dev` branch, which holds real family data. No
  `db:seed`, no `db:reset`, nothing that cleans the `User` table.
- No agent enters the real Tablet password or any family password.
- Never `git add -A` or `git add .`; stage by path.

## Gauntlet

`npx tsc --noEmit`, `npx eslint .`, `npm test`, the UTC direct run from
AGENTS.md, `npm run build`, recordcheck. T1 adds `src/lib/textSize.test.ts`
(it sits in `src/lib/`, already in the test glob).

## Assembled

- Stark + Vision (always).
- Strange: yes. Every page changes appearance at Large and Extra large.
- Captain: yes. New lib file, new component, a schema column.
- Banner: no. Fury read the relevant code inline (facts below).

## Research facts (2026-11-09, origin/main dd6eb34)

- Dashboard text and spacing are in Tailwind's rem-based classes. A grep of
  `src/components/Dashboard*.tsx` found no fixed pixel text sizes (one
  `w-[88px]`). So raising the root font size scales the dashboard evenly.
- The dashboard grid switches from 2 to 4 columns on a **container query** at
  45rem (`DashboardWidgetList.tsx:33-45`), with a 9.5rem minimum cell height.
  Container-query rem follows the root font size, so the grid re-flows by
  itself as text grows. To be measured, not assumed, by Strange.
- Tailwind `md:` style **media** queries do not follow the root font size.
  Pages that lay out on those (the pinned menu, wide forms) are where
  cramping could appear. This is the main risk and Strange's sweep target.
- "Menu style" is the pattern to copy: vocabulary and repair in
  `src/lib/navMode.ts`, a nullable text column `UserPreferences.navMode`
  (`prisma/schema.prisma:748-750`), `saveNavMode` in
  `src/app/actions/preferences.ts:58` (device logins may save it), read in
  `src/app/(app)/layout.tsx:85`, control in `NavModeSetting.tsx`.
- The app's `<html>` element is rendered in `src/app/(app)/layout.tsx:79`,
  which already knows the signed-in user. That is where the size is applied.
- The tablet today cannot customize widgets (`preferences.ts:33`). PR B C5
  lifts that.

## Approach (Fury's structure recommendation)

- Store the choice as text in a new nullable `UserPreferences.textSize`
  column. Null means Normal. One vocabulary file, `src/lib/textSize.ts`, with
  a never-throwing repair function, mirroring `navMode.ts`.
- Apply it as a `data-text-size` attribute on `<html>`; `globals.css` maps
  each value to a root font-size percentage. One dial, whole app.
- Ship this mission **before** PR B. The tablet gets readable text right
  away; PR B then lets it cut down to 3 or 4 big widgets.

## Decisions by Bryce (2026-11-09)

1. **Steps and wording:** "Text size" with Normal, Large, Extra large (about
   100%, 125%, 150%), as mocked: three "Aa" choices. Tuned on the real
   tablet before it ships.
2. **Where it applies:** wide screens only (tablets), with the help line
   "Applies on wide screens." Phones are unchanged.
3. **What grows:** the whole app on that login, not only the dashboard.
4. **Where in Settings:** directly under Menu style.
5. **The wall tablet:** a regular-size iPad (10 to 11 inch). Strange measures
   that viewport, landscape and portrait.

## Contracts

T1 and T2 of the sketch are merged into one contract (small, one file set,
and T2 imports T1's vocabulary, so they could not run in parallel anyway).

### T1 — Text size setting, end to end

- **Objective:** a per-login Text size (Normal, Large, Extra large) that is
  saved, read on every page, and magnifies the whole app on wide screens only.
- **Boundaries:** may touch:
  - new `src/lib/textSize.ts`: `TEXT_SIZES = ["normal", "large", "xl"]`,
    `TextSize` type, `TEXT_SIZE_LABELS` ("Normal", "Large", "Extra large"),
    `TEXT_SIZE_HELP = "Applies on wide screens."`, `DEFAULT_TEXT_SIZE`
    ("normal"), `toTextSize(raw)` that never throws. No React imports (same
    header shape as `src/lib/navMode.ts`).
  - new `src/lib/textSize.test.ts`: `toTextSize` on every valid value, null,
    undefined, a number, an unknown string; labels exist for every size.
  - `prisma/schema.prisma`: one nullable `textSize String?` on
    `UserPreferences`, with a `///` comment like `navMode`'s.
  - new `prisma/migrations/20261116000000_add_text_size/migration.sql`,
    hand-written: `ALTER TABLE "UserPreferences" ADD COLUMN "textSize" TEXT;`
  - `src/lib/dal.ts`: select `textSize`, expose `textSize: TextSize` via
    `toTextSize`, beside `navMode`.
  - `src/app/actions/preferences.ts`: new `saveTextSize(input: unknown)`,
    a copy of `saveNavMode`'s shape (session checked, device allowed, exact
    match against `TEXT_SIZES` or `{ error: "That isn't a text size." }`,
    upsert, `revalidatePath("/", "layout")`).
  - `src/app/(app)/layout.tsx`: `data-text-size={user?.textSize ?? DEFAULT_TEXT_SIZE}`
    on `<html>`.
  - `src/app/globals.css`: one commented block, wide screens only:
    `@media (min-width: 48rem) { html[data-text-size="large"] { font-size: 125%; } html[data-text-size="xl"] { font-size: 150%; } }`.
    Percent, not px, so it still respects the device's own default.
  - new `src/components/TextSizeSetting.tsx`: a row plus the house
    `RadioSheet`, a copy of `NavModeSetting.tsx`'s shape (optimistic, error
    under the row, portaled sheet). Icon: Lucide `Type` (outline). Row label
    "Text size", current size under it, help line `TEXT_SIZE_HELP` beneath.
  - `src/app/(app)/settings/page.tsx`: render `TextSizeSetting` directly
    under `NavModeSetting` (Bryce, decision 4), visible to every login
    including the Tablet device.
  - Any test fixture `tsc` names because `VerifiedUser` gained `textSize`.
  Must not touch: `src/lib/navMode.ts`, `NavModeSetting.tsx`, `RadioSheet.tsx`,
  `src/app/privacy/`, `src/app/share/`, any other migration, `package.json`,
  `CLAUDE.md`, `STRUCTURE.md`, `DESIGN.md`. **No `prisma migrate` command of
  any kind** (Fury applies it). `npx prisma generate` is allowed.
- **Verification:** `npx prisma generate` ok; `npx tsc --noEmit` 0 errors;
  `npx eslint .` 0 errors; `npm test` all pass with the new file counted;
  the AGENTS.md UTC direct run all pass; `npm run build` ok.
- **Evidence required:** each command with its last lines of output; the
  test count before and after; `git diff --stat`; the exact CSS block; the
  migration SQL in full.
- **Done criteria:** Fury re-runs the gauntlet, matches the SQL to
  `prisma migrate diff`, applies it to dev with `npx prisma migrate deploy`
  after the host check, then Strange sees the control and the scaling in the
  running app.

**Preflight (2026-11-09):** 2 hard failures, both read and overruled with
reasons: `prisma/schema.prisma` over the cap is exempt (STRUCTURE.md:1555);
`revalidatePath("/", "layout")` is a code call the tool read as a path.
REVIEW lines read: the may-touch files import `navMode.ts`/`RadioSheet.tsx`
only to copy their shape, nothing there decides this behaviour. `textSize`
already exists as a local variable in `QuantityStepper.tsx:29`, unrelated.

### T2 — Sweep fixes

Whatever Strange's sweep at Large and Extra large on a regular iPad
(820 x 1180 and 1180 x 820) finds. Boundaries named once findings exist.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-11-09: Bryce reported the tablet dashboard is too small to read and
  asked for options. Fury proposed a text size setting plus fewer, bigger
  widgets; Bryce said "Yes, plan it". Mission file written; waiting on the
  five questions.
- 2026-11-09: Bryce answered all five (Decisions above), each as recommended.
  Next: write T1 and T2 in full, run preflight, dispatch.

## Delivery

Not delivered.
