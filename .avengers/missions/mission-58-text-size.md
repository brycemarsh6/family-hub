# Mission: Text size setting (mission 58)

**Project:** family-hub (Marshee)
**Status:** FOLLOW-UP BUILDING (PR 97 merged and live; Bryce's iPad test asked for new sizes, branch `claude/text-size-tune`)
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

## Fix batch F2 (after gate pass 2)

One contract, one builder (all small). Then gate pass 3, the last in budget.

### F2 — Schedule bar, rollback, bare grids
- **Objective:** Schedule's scroll offset follows the bar's real height at
  every text size; a failed text size save always puts `<html>` back to the
  saved size; Habits Manage and the dashboard grid never grow wider than
  their column.
- **Boundaries:** may touch: `src/components/CalendarHeader.tsx` (the
  `SCHEDULE_HEADER_BAR_HEIGHT_PX` constant, its new rem twin, and its comment only),
  `src/components/ScheduleView.tsx`, `src/lib/appChrome.ts`,
  `src/lib/appChrome.test.ts`, `src/components/TextSizeSetting.tsx`,
  `src/lib/textSize.ts` (a comment only), `src/app/globals.css` (the
  mission-58 block comment only), `src/components/HabitManager.tsx` (lines
  137 and 176 class strings only), `src/components/DashboardWidgetList.tsx`
  (line 99 class string only). Must not touch: anything else; `STRUCTURE.md`,
  `DESIGN.md` and the mission file are Fury's.
- **Shape:**
  1. Bar: `SCHEDULE_HEADER_BAR_HEIGHT_REM = 8.125` (130 / 16) replaces the
     px constant; comment updated (every part of the bar is rem). In
     `appChrome.ts`, give ScheduleView the live root font size from the same
     measuring setup (for example `useHamburgerInsetPx` returning
     `{ insetPx, rootPx }`, or one shared internal measuring helper that both
     hooks use, which also answers Captain's "third hook extracts" note).
     ScheduleView computes `insetPx + SCHEDULE_HEADER_BAR_HEIGHT_REM * rootPx`.
     At 16px it must equal 130 + inset exactly.
  2. `appChrome.ts` tidy (Captain pass 2): derive `HAMBURGER_ROW_HEIGHT`
     from `HAMBURGER_ROW_HEIGHT_REM` and the seed `HAMBURGER_ROW_HEIGHT_PX`
     from `HAMBURGER_ROW_HEIGHT_REM * 16`; make the seed file-private if
     nothing outside imports it.
  3. Rollback: on `result.error` or a throw, put `<html>` back to the
     server-confirmed `textSize` prop, never the tap-time value. Add an
     effect that writes `optimisticSize` to
     `document.documentElement.dataset.textSize`, so `<html>` always ends
     equal to the selected tile (keep the instant write in `choose`; the
     effect is the safety net). Lint rule `react-hooks/immutability` forbids
     writing `document` inside the component body; an effect or the
     existing module helper is fine.
  4. Cross-reference comments: `TEXT_SIZE_PREVIEW_REM` and the CSS block
     each name the other so 1 / 1.25 / 1.5 change together.
  5. `grid-cols-1` on `HabitManager.tsx:137` and `:176` and
     `DashboardWidgetList.tsx:99` (as `HabitTodayList.tsx:137` does).
- **Verification:** `npx tsc --noEmit`, `npx eslint .`, `npm test`, the
  AGENTS.md UTC run, `npm run build`, all green.
- **Evidence required:** command tails; `git diff --stat`; the ScheduleView
  maths line; a short trace of the two-fast-failing-taps case through the
  new code ending with `<html>` equal to the saved size.
- **Done criteria:** Strange pass 3 at XL 820x1180: Today puts the day row
  top at or below the bar bottom (195), the month title switches as a
  heading crosses the bar, Habits Manage grips on screen. Vision pass 3:
  the fast-tap trace holds.

**F2 status: DONE** (Stark, 2026-11-09). `SCHEDULE_HEADER_BAR_HEIGHT_REM`
8.125; `useHamburgerInsetPx` returns `{ insetPx, rootPx }` through one shared
private `useFloatingButtonMeasure`; ScheduleView `insetPx + 8.125 * rootPx`
(130 at 16px); row constants derived from `HAMBURGER_ROW_HEIGHT_REM`, the px
seed file-private; TextSizeSetting rolls back to the saved prop via a ref plus
an effect syncing `<html>` to the selected tile; cross-reference comments;
`grid-cols-1` on three grids. Fury: three stale comments renamed to the REM
constant (`CalendarHeader.tsx:331,350`, `useScheduleMonthTitle.ts:12`), and
the stale `HAMBURGER_ROW_HEIGHT_PX` / `NAV_*_WIDTH_PX` names fixed in
STRUCTURE.md's chrome-dimension rule and DESIGN.md:44,138. Gauntlet: tsc,
eslint, 1627 Denver, UTC 1620 + 7 skipped, build exit 0.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Captain | BLOCK | `TextSizeSetting.tsx:17-33` hand-writes the optimistic tap wrapper; STRUCTURE.md makes `useOptimisticRun` its only home (NavModeSetting is listed debt, not a pattern). Contract slip: T1 said copy NavModeSetting | Amendments proposed: Settings RadioSheet-row rule (third copy extracts), Wide pages rule 2 (container rem follows text size, media rem and `COLUMN_MIN_WIDTH_PX` do not), DESIGN.md "size in rem, not px", bookkeeping (textSize.ts entry, three portaled sheets, hook caller list); `preferences.ts:6-8` header wording; landscape large phones (about 930px) get the bigger size |
| 1 | Vision | PASS | none | Gauntlet re-run green (1625 Denver; UTC 1618 + 7 skipped; build; recordcheck 0 hard). Boundaries exact. No leak to `/privacy`, `/share` or signed-out pages. `saveTextSize` and `toTextSize` sound. Landscape large phones (about 932px) cross 768px and get the bigger size, against decision 2: fix with a height condition. Add the slideshow screensaver to the sweep |
| 1 | Strange | BLOCK | (1) floating menu button grows but the reserved row is a fixed 56px, so it covers every page's first line (`appChrome.ts:26`, `AppChrome.tsx:107`, `CalendarHeader.tsx:164-166`, `calendar/loading.tsx:248`, `ScheduleView.tsx:209`); (2) pinned rail/sidebar widths are px, so rem-sized links clip sideways and scroll (`appChrome.ts:100-112`, `AppChrome.tsx:131`, `PinnedNav.tsx:63`); (3) Month pills SHRINK to 9px at Large/XL because `@min-[48rem]` container queries now need 960/1152px (`MonthCell.tsx:196,356`, `TimelineDayColumn.tsx:195,214`); (4) every `text-[Npx]` stays put while everything else grows (17 files) | Lucide icons (px) do not grow; page resizes only after the server answers (172ms local); sheet shows a plain list, not the mocked "Aa" tiles (decision 1, Fury's contract slip); drawer and rail scroll at XL landscape; Inventory header wraps (readable); phone 390 pixel-identical at XL; iPad mini portrait (744) below the gate; 20+ pages at XL portrait: no h-scroll, no clipping, no target under 44px |
| 2 | Captain | PASS | none (pass 1 blocker closed) | Stale facts to fix before merge: STRUCTURE.md:1376-1382 chrome-dimension rule names `HAMBURGER_ROW_HEIGHT_PX` as the positioning dimension and the deleted `NAV_*_WIDTH_PX`; DESIGN.md:44,138 same. `appChrome.ts` types the row three times (derive from `HAMBURGER_ROW_HEIGHT_REM`), `HAMBURGER_ROW_HEIGHT_PX` could be file-private; `useHamburgerInsetPx` copies the measuring setup (third hook extracts); size factors in `textSize.ts` and `globals.css` should cross-reference; `SCHEDULE_HEADER_BAR_HEIGHT_PX` 130 still px; Naming suffix convention proposed. Rules A (Wide pages rule 2) and B (DESIGN.md rem) restated with exact text, waiting for Bryce |
| 2 | Vision | BLOCK | (1) `SCHEDULE_HEADER_BAR_HEIGHT_PX` 130 (`CalendarHeader.tsx:48`) used by `ScheduleView.tsx:209`: the bar is all rem (about 162px Large, 195px XL), so a jump to a day lands under the sticky bar, mini month tucks under, month title flips late. Fix: bar height in rem times the live root px. (2) `TextSizeSetting.tsx:30-44` rolls back to the tap-time value: two fast failing taps (offline) leave `<html>` at an unsaved size while the Normal tile shows selected, and tapping Normal is a no-op. Fix: roll back to the server-confirmed prop, optionally sync html to the optimistic value in an effect | Gauntlet green (1626; UTC 1619 + 7; build; recordcheck 0 hard). Boundaries clean. Normal pixel-identical (every conversion is exact /16). `useHamburgerInsetPx` correct. Month `@min-[768px]` needs a 768px grid: 820 portrait XL leaves 772px, an 810-wide iPad (10.2 inch) drops to the phone layout. All-day strip chips `leading-[1.5rem]` in 24px rows: eyeball. Skeleton `h-[66px]` jumps (cosmetic) |
| 2 | Strange | BLOCK | All four pass 1 blockers closed with measurements. New: (1) Schedule bar 195px at XL (162.5 Large) but scroll offset and month-title switch stay 130 (same as Vision's); (2) Habits Manage at XL (820 and 1180 sidebar): bare `grid` column grows to the longest title, card 911px wide in 805, every drag grip off screen (`HabitManager.tsx:137,176`) | Tiles as mocked (radiogroup, 72px tall, Aa 16/20/24, accent selected, resize 1ms after tap, save 209ms). Rail/sidebar: no sideways scroll, vertical accepted (rail XL 1029/820, sidebar XL 1051/820, sidebar XL is 384 of 1180). Month pills 12/15/18px. Labels grow in step; icons exactly x1.25 / x1.5. Phone landscape 844x390 stays 16px. Normal unchanged. Month with sidebar at XL 1180 drops below 768 and uses the phone layout (pills 13.5px). `DashboardWidgetList.tsx:99` same bare grid, no clip yet. Menu style change showed only after reload (hidden pane, outside mission). Calendar loading showed "Week" for month (pre-existing?) |
| 3 | Captain | PASS | none | One source of truth holds (`HAMBURGER_ROW_HEIGHT_REM` the only number; measuring setup once in `useFloatingButtonMeasure`; `SCHEDULE_HEADER_BAR_HEIGHT_PX` gone everywhere). Docs match code. No cap breached (`CalendarHeader` 398, `ScheduleView` 580, both over soft cap before this mission). Wording: `appChrome.ts:29-30` dependents line should say Schedule's whole chrome offset; STRUCTURE.md:1379 should name `useHamburgerInsetPx`; root 16 written three times in `appChrome.ts` (fine until a fourth) |
| 3 | Vision | PASS | none (both pass 2 blockers closed, traced) | Gauntlet green (1627; UTC 1620 + 7; build; recordcheck 0 hard). Boundaries exact. Schedule offset 130 / 162.5 / 195; `rootPx` re-read through the rem button's ResizeObserver. Rollback traced through two failing taps, fail then succeed, succeed then fail, three taps, tap back to saved in flight: `<html>` always ends at the saved size (proof: `savedRef` equals the layout prop from the same commit). `useHamburgerRowHeight` unchanged for its four other callers. `grid-cols-1` pixel-identical at Normal. Notes: `useHamburgerInsetPx` returns a new object per measure, so Schedule re-renders on every resize (perf only; return the old object when equal); brief tile/size mismatch in fail-then-succeed, settles correctly |

## Handoff log

- 2026-11-09: Bryce reported the tablet dashboard is too small to read and
  asked for options. Fury proposed a text size setting plus fewer, bigger
  widgets; Bryce said "Yes, plan it". Mission file written; waiting on the
  five questions.
- 2026-11-09: Bryce answered all five (Decisions above), each as recommended.
  Next: write T1 and T2 in full, run preflight, dispatch.
- 2026-11-09: Bryce said "Yes, build it" (model switched to Opus). T1 built,
  renumbered to mission 58, main merged, migration applied to dev. Gates next.

## Follow-up after Bryce's iPad test (2026-11-09)

Bryce tested PR 97 on the wall iPad (Tablet login, landscape, icon rail) and
sent three screenshots. At Large (125%) the dashboard's bottom row
(Inventory, Grocery, Recipes) is cut off (the Inventory tile ends about
885 to 905 points down, the screen is 820), and the rail's 13 icons no
longer fit, so it scrolls and Send feedback (or the top icon) is hidden. At
Extra large (150%) the dashboard drops to one widget per row, because the
grid's 45rem container switch moves to 1080px.

### Decisions by Bryce, round 2 (2026-11-09)

6. **Four sizes:** Normal 100%, Large 110% (the whole dashboard fits in
   landscape), Larger 135% (the side-by-side layout, bigger, a short
   scroll), Largest 150% (today's Extra large: one widget per row). Saved
   keys stay `normal`, `large`, `xl` and gain `xxl`; a login saved on `xl`
   becomes Larger (135%).
7. **Names:** "Normal", "Large", "Larger", "Largest" (four Aa tiles).
8. **The pinned menu never grows:** rail and sidebar stay Normal size at
   every text size, icons included, so all 13 destinations always fit.
   (Bryce: "I'm totally okay if the icons are just a little bit smaller. I
   don't have to scroll on the side of the icon tab.")

### F3 — Four sizes, the pinned menu stays Normal
- **Objective:** Text size has four steps (100, 110, 135, 150%) named per
  decision 7, and the pinned rail and sidebar render at exactly their Normal
  size at every step.
- **Boundaries:** may touch: `src/lib/textSize.ts`, `src/lib/textSize.test.ts`,
  `src/app/globals.css` (the mission-58 block only), `src/components/TextSizeSetting.tsx`,
  `src/components/PinnedNav.tsx`, `src/lib/appChrome.ts`, `src/lib/appChrome.test.ts`,
  `src/components/CalendarHeader.tsx` and `src/components/ScheduleView.tsx`
  (comments that quote the old Large/XL pixel figures only). Must not touch:
  `src/components/NavList.tsx`, `src/components/NavDrawer.tsx`,
  `src/components/AppChrome.tsx`, `prisma/`, `DESIGN.md`, `STRUCTURE.md`,
  `docs/`, `CLAUDE.md`, the mission file (Fury's).
- **Shape:**
  1. `TEXT_SIZES` becomes `normal, large, xl, xxl`; labels Normal, Large,
     Larger, Largest; `TEXT_SIZE_PREVIEW_REM` 1, 1.1, 1.35, 1.5. `toTextSize`
     and `saveTextSize` need no other change (they read `TEXT_SIZES`). Tests
     updated, including `xxl` as valid.
  2. CSS: `large` 110%, `xl` 135%, `xxl` 150%, with `svg.lucide` zoom 1.1,
     1.35, 1.5. Inside the same media query, a rule cancels the size on an
     element marked `data-text-size-reset`: `zoom` 1/1.1, 1/1.35, 1/1.5
     (write the decimals to 4 places, with a comment), so rem lengths and
     zoomed icons inside it come out at their Normal size.
  3. `PinnedNav.tsx`: the `<aside>` keeps its width and scrolling, and its
     width becomes a fixed px value again; its padding and `NavList` (and
     the rail's menu button and divider) move into one inner wrapper marked
     `data-text-size-reset`. The rail's `NavDrawer` stays outside the
     wrapper (it is a fixed overlay, unchanged behaviour).
  4. `appChrome.ts`: `NAV_RAIL_WIDTH` and `NAV_SIDEBAR_WIDTH` become `"72px"`
     and `"256px"` again, with a comment: px on purpose, the pinned menu
     stays Normal at every text size (mission-58 follow-up), so
     `--app-nav-width` and the aside agree. Test updated.
  5. Tiles: four in a row (`grid-cols-4`), still at least 4.5rem tall.
  6. Comments quoting the old 125/150% or 162/195px figures updated.
- **Verification:** `npx tsc --noEmit`, `npx eslint .`, `npm test`, the
  AGENTS.md UTC run, `npm run build`.
- **Evidence required:** command tails; `git diff --stat`; the final CSS
  block; the PinnedNav wrapper markup.
- **Done criteria:** Strange at 1180x820 with the rail: at every size the
  rail's links are the Normal size (rail 72 wide, links 48px), no rail
  scroll, Send feedback visible; dashboard fits whole at Large (default
  tablet layout or the closest available), side by side at Larger, one per
  row at Largest; four tiles fit on a 390px phone.
- **Build result (Stark, 2026-11-09):** DONE. tsc, eslint, 1749 tests,
  the UTC run and the build all green. One deviation from Shape step 3,
  accepted by Fury: the padding stays on the `<aside>` in px (12px plus
  `env(safe-area-inset-*)`) instead of moving into the wrapper, so the
  iPad's safe-area spacing is never shrunk by the reset zoom. The wrapper
  holds the menu button, divider and `NavList`.

## Delivery

- **What shipped:** a per-login Text size (Normal, Large, Extra large) in
  Settings as three "Aa" tiles under Menu style, saved in
  `UserPreferences.textSize` (additive migration
  `20261116000000_add_text_size`), applied as `data-text-size` on `<html>`;
  `globals.css` raises the root font size to 125% / 150% (and Lucide icons
  by `zoom`) only on screens at least 48rem wide and 40rem tall, so phones in
  either orientation are unchanged. Every px text size in the app became rem;
  the menu row, rail and sidebar widths and the Schedule bar offset follow
  the root size; Month and week columns keep their tablet layout at every
  size (px container breakpoints).
- **Gates:** Vision PASS (pass 3), Strange PASS (pass 3), Captain PASS (pass
  2 and 3). Ledger above. Gauntlet at merge time recorded in the PR.
- **Mid-mission merges:** main moved twice (PR #94 took "mission 57" and the
  20261115 migration stamp, so this became mission 58 with 20261116; PR #95
  split STRUCTURE.md, so the chrome-dimension rule edit moved to
  `docs/structure/layout.md`).
- **Filed 2026-11-09 on Bryce's yes ("I agree with all your
  recommendations"):** rule A at the end of Wide pages rule 2 in
  `docs/structure/layout.md`, rule B in DESIGN.md's Hard rules before
  "Quantities change only by tapping". Was: Captain's rule A (Wide pages, now in
  `docs/structure/layout.md` after mission 59: rem container thresholds follow Text size; Month and week columns
  are the px exceptions) and rule B (DESIGN.md: sizes in rem, not px, with
  the listed px exceptions). Exact text is in Captain's pass 2 report,
  summarised in the pass 2 ledger row; Fury files them on Bryce's yes.
- **The wall tablet is an iPad Air 4th generation** (Bryce, 2026-11-09):
  820 x 1180, the exact viewport every Strange pass measured. Month keeps its
  tablet layout at Extra large in portrait (grid about 772px).
- **Deliberate leftovers (follow-ups, not this mission):** tablet's own
  3 or 4 big widgets is mission 39 PR B (C5); Schedule first load scrolls to
  today before habit days load (pre-existing); Schedule's Today button
  ignores the pinned bar in its observer (pre-existing, bigger gap at XL);
  `useHamburgerInsetPx` returns a new object per measure (perf only);
  calendar loading skeleton `h-[66px]` jumps at Large/XL; Month with the
  sidebar at XL uses the phone layout; Menu style change seen only after a
  reload in the hidden pane (unconfirmed, outside mission).

