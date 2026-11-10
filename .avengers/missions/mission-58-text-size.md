# Mission: Text size setting (mission 58)

**Project:** family-hub (Marshee)
**Status:** AT-THE-GATES (F1 done; gate pass 2: Vision, Strange, Captain)
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

**T1 status: DONE** (Stark, 2026-11-09). Report: 4 new tests (1593 to 1597);
tsc, eslint, both test runs and build green; SQL exactly one `ADD COLUMN`.
Then Fury found `main` had moved: the screensaver chat merged PR #94 as
"mission 57" with migration `20261115000000_slideshow_photos`. This mission
was renamed to 58 and its migration to `20261116000000_add_text_size`;
committed as T1, then `origin/main` merged cleanly. After the merge:
`npm ci` (main added `@vercel/blob`), gauntlet green (1625 tests Denver; UTC
1618 pass + 7 skipped; build ok). SQL re-matched against `prisma migrate diff`
from main's schema: identical. Worktree `.env` symlinked to the main
checkout's (gitignored; never read); host check `ep-hidden-pine-` (dev);
Fury applied it with `npx prisma migrate deploy`.

### T2 — Sweep fixes

Became fix batch F1 below (F1a, F1b, F1c), from gate pass 1.

## Fix batch F1 (after gate pass 1)

Three contracts with disjoint files, dispatched in parallel. Builders run
tsc, eslint and both test runs; **not** `npm run build` (three builders and a
dev server share one `.next`). Fury runs the build once after all three.
Fury's calls, recorded: the Month view keeps its tablet layout at every text
size (a px container breakpoint) rather than falling back to the phone layout;
the pinned rail at Extra large in landscape may scroll vertically (noted for
Bryce); the Settings control is rebuilt as mocked (three "Aa" tiles inline,
no sheet), which also retires the RadioSheet-row duplication Captain noted.

**F1 preflight (2026-11-09):** 0 hard failures on all three. Soft-cap WARNs
on `CalendarHeader`, `ScheduleView`, `MonthCell`, `TimelineAllDayStrip`,
`TimelineGrid`: class-string edits, no growth. F1c's RadioSheet import REVIEW
is the import F1c removes. `lucide-react` adds class `lucide` to every icon
(`node_modules/lucide-react/dist/esm/Icon.mjs:35`), so `svg.lucide` reaches them.

**F1 status: DONE** (three Starks, 2026-11-09). F1a: row `3.5rem`, rail
`4.5rem`, sidebar `16rem`, `pinnedNavWidth` returns a CSS length, new
`useHamburgerInsetPx` for ScheduleView (open question: `SCHEDULE_HEADER_BAR_HEIGHT_PX`
130 is still px). F1b: all 17 files, 0 `text-[Npx]` left, MonthCell
`@min-[768px]`, TimelineDayColumn `@min-[128px]`. F1c: three "Aa" tiles
(radiogroup), `useOptimisticRun`, instant `data-text-size`, height
condition, `svg.lucide` zoom, `TEXT_SIZE_PREVIEW_REM`. Fury's combined
gauntlet: tsc, eslint, 1626 Denver, UTC 1619 + 7 skipped, build exit 0.
Fury filed Captain's bookkeeping in STRUCTURE.md (`textSize.ts` entry, hook
caller list). The portaled-sheets line no longer applies (no sheet). Captain's
two new rules (Wide pages rule 2 extension, DESIGN.md "size in rem") wait
for Bryce, as constitution rules have before.

### F1a — Menu chrome follows the text size
- **Objective:** the floating menu button's reserved row and the pinned
  rail/sidebar widths scale with the root font size, so nothing overlaps or
  clips at Large and Extra large, and nothing changes at Normal.
- **Boundaries:** may touch: `src/lib/appChrome.ts`, `src/lib/appChrome.test.ts`,
  `src/components/AppChrome.tsx`, `src/components/PinnedNav.tsx`,
  `src/components/HamburgerButton.tsx`, `src/components/CalendarHeader.tsx`,
  `src/app/(app)/calendar/loading.tsx`, `src/components/ScheduleView.tsx`.
  Must not touch: every file in F1b and F1c, `src/lib/useOptimisticRun.ts`,
  `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`.
- **Shape:** the row as a CSS length in rem (`3.5rem` = 0.5rem gap + 3rem
  button) wherever it is written into a style; the rail `4.5rem`, the sidebar
  `16rem`, with the width helper returning a CSS length so
  `--app-nav-width-lg` and the fixed bars follow. Keep a px number only where
  JavaScript needs one (the hook's first-paint seed, ScheduleView's math), and
  there derive it from the live root font size rather than assume 16.
  `useHamburgerRowHeight` already measures the real button; keep that.
  Update the comments that name 56/72/256 px. Update `appChrome.test.ts` to
  the new values.
- **Verification:** `npx tsc --noEmit`, `npx eslint .`, `npm test`, the
  AGENTS.md UTC run, all green.
- **Evidence required:** command tails; `git diff --stat`; every place a row
  height or nav width is now written, listed with file:line.
- **Done criteria:** Strange pass 2 measures the button bottom above every
  page's first line and the rail with no horizontal scroll at Large and
  Extra large, 820x1180 and 1180x820, and Normal unchanged.

### F1b — Fixed pixel text becomes rem
- **Objective:** every `text-[Npx]` in the app grows with Text size, and the
  Month and week-column views keep their tablet layout at every text size.
- **Boundaries:** may touch: `src/components/ActionCircle.tsx`,
  `src/components/HabitDayCell.tsx`, `src/components/HabitDayPill.tsx`,
  `src/components/HabitEditActions.tsx`, `src/components/HabitForm.tsx`,
  `src/components/HabitFormFields.tsx`, `src/components/HabitHoursStats.tsx`,
  `src/components/HabitMonthCalendar.tsx`, `src/components/HabitStats.tsx`,
  `src/components/MonthCell.tsx`, `src/components/NutritionSection.tsx`,
  `src/components/RecipeLetterRail.tsx`, `src/components/ScheduleMiniMonth.tsx`,
  `src/components/TimelineAllDayStrip.tsx`, `src/components/TimelineDayColumn.tsx`,
  `src/components/TimelineGrid.tsx`, `src/components/YearView.tsx`.
  Must not touch: every file in F1a and F1c; the hour timeline's px geometry
  (hour height, event top/height maths) stays px under DESIGN.md's exception.
- **Shape:** each `text-[Npx]` becomes its exact rem (`/16`, e.g. 9px is
  `text-[0.5625rem]`, 10px `text-[0.625rem]`, 11px `text-[0.6875rem]`, 7px
  `text-[0.4375rem]`), with any paired px `leading-[..]` or pill height
  (`h-[18px]`) converted the same way. In `MonthCell.tsx` the
  `@min-[48rem]` container variants become `@min-[768px]` (and in
  `TimelineDayColumn.tsx` its `@min-[8rem]` becomes `@min-[128px]`) so the
  layout switch no longer moves with text size; one comment at each says why
  (mission-58). Pixel values in prose comments stay.
- **Verification:** as F1a, plus
  `grep -rE 'text-\[[0-9.]+px\]' src | grep -v generated` prints nothing.
- **Evidence required:** command tails; the grep output; `git diff --stat`.
- **Done criteria:** Strange pass 2 measures Month pills at or above 12px at
  Large and Extra large on 820x1180, and calendar/habit labels growing in step.

### F1c — The Settings control as mocked, and the CSS block
- **Objective:** the Text size control is the mocked three "Aa" tiles,
  saves through `useOptimisticRun`, resizes the page at once, and the size
  rule leaves landscape phones alone and grows icons too.
- **Boundaries:** may touch: `src/components/TextSizeSetting.tsx`,
  `src/lib/textSize.ts`, `src/lib/textSize.test.ts`, `src/app/globals.css`
  (the mission-58 block only), `src/app/actions/preferences.ts` (header
  comment lines 1 to 12 only). Must not touch: every file in F1a and F1b,
  `src/lib/useOptimisticRun.ts`, `src/components/RadioSheet.tsx`,
  `NavModeSetting.tsx`, `src/app/(app)/settings/page.tsx`.
- **Shape (as mocked, Bryce's decision 1):** a card like the Menu style row
  with the Lucide `Type` icon and "Text size" label, then three equal tiles
  in a row, each a button at least 4.5rem tall: "Aa" drawn at 1rem, 1.25rem,
  1.5rem, the label ("Normal", "Large", "Extra large") under it. The chosen
  tile carries the accent border and `aria-pressed` (or a radiogroup with
  `aria-checked`); `TEXT_SIZE_HELP` under the tiles; the error line under
  that. No sheet, no portal. Preview sizes live in `src/lib/textSize.ts`
  beside the labels. Save via `const { run, error } = useOptimisticRun(...)`.
  On choose, set `document.documentElement.dataset.textSize = next` at once
  and put the previous value back if the save fails.
- **CSS:** the media query becomes
  `@media (min-width: 48rem) and (min-height: 40rem)` (an iPad is at least
  744px tall either way; a landscape phone is under 440px), and inside it
  `svg.lucide` gets `zoom: 1.25` / `zoom: 1.5` beside each font size, with
  a comment. Preferences header: "The menu style and the text size are
  different: devices may save them too".
- **Verification:** as F1a.
- **Evidence required:** command tails; the final CSS block; `git diff --stat`.
- **Done criteria:** Strange pass 2 sees the tiles, a tap resizing the page
  before the server answers, icons growing, and Captain sees no hand-written
  optimistic wrapper.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Captain | BLOCK | `TextSizeSetting.tsx:17-33` hand-writes the optimistic tap wrapper; STRUCTURE.md makes `useOptimisticRun` its only home (NavModeSetting is listed debt, not a pattern). Contract slip: T1 said copy NavModeSetting | Amendments proposed: Settings RadioSheet-row rule (third copy extracts), Wide pages rule 2 (container rem follows text size, media rem and `COLUMN_MIN_WIDTH_PX` do not), DESIGN.md "size in rem, not px", bookkeeping (textSize.ts entry, three portaled sheets, hook caller list); `preferences.ts:6-8` header wording; landscape large phones (about 930px) get the bigger size |
| 1 | Vision | PASS | none | Gauntlet re-run green (1625 Denver; UTC 1618 + 7 skipped; build; recordcheck 0 hard). Boundaries exact. No leak to `/privacy`, `/share` or signed-out pages. `saveTextSize` and `toTextSize` sound. Landscape large phones (about 932px) cross 768px and get the bigger size, against decision 2: fix with a height condition. Add the slideshow screensaver to the sweep |
| 1 | Strange | BLOCK | (1) floating menu button grows but the reserved row is a fixed 56px, so it covers every page's first line (`appChrome.ts:26`, `AppChrome.tsx:107`, `CalendarHeader.tsx:164-166`, `calendar/loading.tsx:248`, `ScheduleView.tsx:209`); (2) pinned rail/sidebar widths are px, so rem-sized links clip sideways and scroll (`appChrome.ts:100-112`, `AppChrome.tsx:131`, `PinnedNav.tsx:63`); (3) Month pills SHRINK to 9px at Large/XL because `@min-[48rem]` container queries now need 960/1152px (`MonthCell.tsx:196,356`, `TimelineDayColumn.tsx:195,214`); (4) every `text-[Npx]` stays put while everything else grows (17 files) | Lucide icons (px) do not grow; page resizes only after the server answers (172ms local); sheet shows a plain list, not the mocked "Aa" tiles (decision 1, Fury's contract slip); drawer and rail scroll at XL landscape; Inventory header wraps (readable); phone 390 pixel-identical at XL; iPad mini portrait (744) below the gate; 20+ pages at XL portrait: no h-scroll, no clipping, no target under 44px |

## Handoff log

- 2026-11-09: Bryce reported the tablet dashboard is too small to read and
  asked for options. Fury proposed a text size setting plus fewer, bigger
  widgets; Bryce said "Yes, plan it". Mission file written; waiting on the
  five questions.
- 2026-11-09: Bryce answered all five (Decisions above), each as recommended.
  Next: write T1 and T2 in full, run preflight, dispatch.
- 2026-11-09: Bryce said "Yes, build it" (model switched to Opus). T1 built,
  renumbered to mission 58, main merged, migration applied to dev. Gates next.

## Delivery

Not delivered.
