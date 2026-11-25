# Mission: Rewards R1, stars on habits and the star bank

**Project:** family-hub (Marshee)
**Status:** DELIVERED (all gates PASS; PR and deploy in Delivery)
**Started:** 2026-11-24 · **Updated:** 2026-11-24
**Branch:** R1's own session and branch, cut from the Rewards planning
branch `claude/marshee-rewards-feature-87a687` (Bryce, 2026-11-24: the
planning chat stays separate; R1 to R5 each get their own session, branch
and PR).

## Brief

- **Goal:** First PR of `.avengers/plans/rewards-v1.md` (approved by Bryce
  2026-11-24). A habit or chore can carry an optional star value. A check
  pays a snapshot of it into the person's star bank; un-checking takes it
  back. A household "Late checks" setting pays full, half (rounded up) or no
  stars for a late check. The star bank shows beside each person's name in
  Habits & Chores.
- **Done means:**
  1. A parent or admin sees a Stars stepper on the habit form (values
     None, 1, 2, 3, 4, 5, 10, 15, 20, 25, 50: Bryce, 2026-11-24). A kid
     login does not, and a kid's save never changes stars. Hours habits
     never carry stars.
  2. A row with stars shows a star chip with the value.
  3. Checking a star item raises that person's star bank by the value
     (every participant on a Together habit); un-checking lowers it; a skip
     pays nothing; a late check pays per the Late checks setting.
  4. The bank number moves at once on tap (optimistic) and matches the
     server after refresh.
  5. Settings has a parents-only "Late checks" choice: Full stars, Half
     stars, No stars (default Full).
  6. Winnie's check then undo leaves the bank where it started; undo still
     works for Winnie requests saved before this deploy.
  7. Gauntlet green in both timezones, with the new `src/lib/rewards/`
     test folder in the glob.
- **Out of scope:** the earn animation and its switch (R2); the Rewards
  page, nav row, redeem (R3); PIN, tablet setting stars, wishes (R4);
  bonus stars, history, Manage rewards (R5); Assistant API reading or
  setting stars; a dashboard Stars tile; stars on hours habits or Calendar
  tasks; back-pay for checks made before a value was set.

## Danger register

Same as AGENTS.md, plus:
- `.env` is a symlink to the main checkout's `.env`; its `DATABASE_URL`
  host was checked as the Neon dev branch
  (`ep-hidden-pine-a6ajzk11-pooler`) on 2026-11-24. Never print `.env`
  beyond the hostname.
- **One migration, additive only** (two nullable columns, one new table).
  SQL is shown in the report before it is applied, and it is applied with
  `npx prisma migrate deploy` only. **Never `prisma migrate dev`** (on
  drift it offers to reset the dev branch) and never `db:seed` /
  `db:reset`. No clean or reset script for `User`.
- Stage by explicit path, never `git add -A` / `.`; `git show --stat HEAD`
  after each commit. No direct pushes to `main`; nothing is pushed by a
  builder.
- Test data only through the scoped `db:seed-*` / `db:clean-*` scripts.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- `npm run build`
- `grep -rn "@/app" src/lib/` prints nothing

## Assembled

- Stark + Vision (always).
- Strange: the form stepper, the star chip, the star bank and the Settings
  row are all visible.
- Captain: a new lib folder (`src/lib/rewards/`), new vocabulary and read
  files, and three habit read files already over the 350-line soft cap.
- Banner: one brief on the habits display path (how rows and per-person
  headers get their data, phone and wide layouts) before C3 is written.

## Fury's pre-dispatch checklist

Template list applies (grep exports before forbidding, no shared files
across parallel contracts, contract written here first, real HEAD last,
`git show --stat HEAD` after commits, no commits during a gate).

## Contracts

### C1 - Star data, rules and the check snapshot (no UI)
- **Status:** DISPATCHED 2026-11-24 at HEAD 4863f19 (preflight re-run in the R1 session: only the exempt schema cap fails)
- **Objective:** Add `Habit.stars`, `HabitLog.stars` and a household
  `RewardSettings` row, the pure star rules, the snapshot written by every
  check, the input and column plumbing with a parents-only gate, and Winnie
  undo compatibility.
- **Boundaries:** may touch: `prisma/schema.prisma`, new `prisma/migrations/20261124000000_reward_stars/migration.sql`, new `src/lib/rewardVocabulary.ts`, new `src/lib/rewardVocabulary.test.ts`, new `src/lib/rewards/stars.ts`, new `src/lib/rewards/stars.test.ts`, new `src/lib/rewards/access.ts`, new `src/lib/rewards/access.test.ts`, `src/lib/habits/habitWrites.ts`, `src/lib/habits/habitRows.ts`, `src/lib/habits/habitRows.test.ts`, `src/lib/habitInput.ts`, `src/lib/habitInput.test.ts`, `src/app/actions/habits.ts`, `src/lib/assistant/undoModels.ts`, `src/lib/assistant/undoPlan.ts`, `src/lib/assistant/undoPlanHabits.test.ts`, `package.json` (test script only), `.github/workflows/ci.yml` (two TZ lines only), `AGENTS.md` (the quoted test command only) · must not touch: `src/components/`, `src/app/(app)/`, `src/lib/habitsRead.ts`, `src/lib/habitsToday.ts`, `src/lib/habitsFamily.ts`, `src/lib/habitTapWrites.ts`, `src/lib/assistant/schemasHabits.ts`, `src/app/api/`, `DESIGN.md`, `STRUCTURE.md`.
- **What to build (detail per file):**
  - `prisma/schema.prisma`: `Habit.stars Int?` and `HabitLog.stars Int?`
    (doc comments: null means no stars; the log value is a snapshot taken
    at check time and never rewritten); new `model RewardSettings` on the
    `ScreensaverSettings` precedent: `id String @id @default("household")`,
    `lateStars String @default("full")`, `updatedAt DateTime @updatedAt`,
    `updatedById String?`.
  - new `prisma/migrations/20261124000000_reward_stars/migration.sql`
  - new `src/lib/rewardVocabulary.ts` + `src/lib/rewardVocabulary.test.ts`:
    `STAR_STEPS = [1, 2, 3, 4, 5, 10, 15, 20, 25, 50]`, `toStarValue`
    (anything not on the list, including 0, becomes null), `LATE_STARS`
    ("full", "half", "none") with labels "Full stars", "Half stars",
    "No stars", `toLateStars` (unknown becomes "full"), and the refusal
    text "Pick a star value from the list." No imports (STRUCTURE.md
    vocabulary-file pattern).
  - new `src/lib/rewards/stars.ts` + `stars.test.ts`: `starsForLog(habitStars,
    status, lateStars)` (done pays the value; late pays full, half rounded
    up, or null; skipped and a null value pay null), `nextStarStep(value,
    dir)` for the stepper (None below 1, stops at 50), `sumStars(values)`.
  - new `src/lib/rewards/access.ts` + `access.test.ts`: `canSetStars(role)`
    (admin and parent only; kid and device false). Reuse `MANAGER_ROLES`
    from `src/lib/constants.ts`.
  - `src/lib/habits/habitWrites.ts`: `checkHabit` reads the habit's `stars`
    (extend the existing `targetUserIds` read rather than adding a second
    habit query) and the `RewardSettings` row (`id: "household"`, missing
    means "full"), and writes `stars: starsForLog(...)` on every created row.
    Nothing else in the file changes.
  - `src/lib/habits/habitRows.ts` (+ `habitRows.test.ts`): `stars?: number |
    null` on `HabitFields` and `HabitColumns`; `habitColumns` passes it
    through `toStarValue`; giving `track: "hours"` forces `stars: null`.
  - `src/lib/habitInput.ts` (+ `habitInput.test.ts`): optional `stars?:
    number | null` on `HabitInput` (undefined means leave as is); a value
    that is not null and not in `STAR_STEPS` returns the refusal; an hours
    habit's stars come out null.
  - `src/app/actions/habits.ts`: in `createHabit` and `updateHabit`, drop
    `stars` from the checked fields unless `canSetStars(user.role)`, so a
    kid's save never changes stars (kids may edit habits they are on).
  - `src/lib/assistant/undoModels.ts`: `stars: "value"` in `HABIT_COLUMNS`
    and `HABIT_LOG_COLUMNS`, and an exported `LATE_COLUMNS` list
    (`Habit: ["stars"]`, `HabitLog: ["stars"]`) with a comment: columns
    added after saved copies existed; a copy without them is read as null.
  - `src/lib/assistant/undoPlan.ts`: `hasAllColumns` skips `LATE_COLUMNS`.
  - `src/lib/assistant/undoPlanHabits.test.ts`: a pre-feature HabitLog copy
    (no `stars` key) still plans as undoable; a new copy with `stars` round
    trips.
  - Test glob, all in the same commit as the first `src/lib/rewards/` test:
    `package.json` `test` script, both TZ steps in `.github/workflows/ci.yml`,
    and the quoted command in `AGENTS.md`, each gaining
    `src/lib/rewards/*.test.ts`.
- **Must not touch:** anything under `src/components/` or `src/app/(app)/`;
  `src/lib/habitsRead.ts`, `habitsToday.ts`, `habitsFamily.ts` (C3);
  `src/lib/habitTapWrites.ts` (no change needed: it calls `checkHabit`);
  the Assistant API schemas and routes (`src/lib/assistant/schemasHabits.ts`,
  `src/app/api/`); `User` anything; `DESIGN.md`, `STRUCTURE.md`.
- **Verification:**
  1. Show the migration SQL in the report: only `ALTER TABLE "Habit" ADD
     COLUMN "stars" INTEGER;`, `ALTER TABLE "HabitLog" ADD COLUMN "stars"
     INTEGER;` and `CREATE TABLE "RewardSettings" (...)`. Then confirm the
     `.env` host (hostname only) is `ep-hidden-pine-a6ajzk11-pooler...`,
     run `npx prisma migrate deploy`, `npx prisma generate`, and
     `npx prisma migrate status`.
  2. Full gauntlet. Record `npm test` and the UTC run's counts before and
     after; both must go up.
- **Evidence required:** the SQL text; `migrate status` output; test names
  added and counts before and after; `wc -l` of every touched file; the
  diff of `checkHabit`.
- **Done criteria:** gauntlet green re-run by Vision; no file outside the
  boundary in `git diff --stat`; one commit, stats checked.
- **Report:** DONE, commit dcf418b. Migration `20261124000000_reward_stars`
  applied to the dev branch with `migrate deploy` (SQL reviewed: two
  ADD COLUMN, one CREATE TABLE); `migrate status` up to date, 40
  migrations. Tests 2128 to 2150 (Denver) and 2118 to 2140 pass, 10
  skipped (UTC). Gauntlet green. 20 files, all inside the boundary. Note: a
  kid who switches a checks habit to hours clears its stars (hours never
  carry stars, so this follows the rule).

### C1b - One reader for RewardSettings
- **Status:** DONE, commit a29b7a9 (`loadLateStars(client = db)`, the only `rewardSettings.` read in src; gauntlet green, 2150 tests)
- **Objective:** One place reads the `RewardSettings` table, so C2 (the
  Settings card) and C3 (the habits page, for the optimistic late number)
  can both import it in parallel.
- **Boundaries:** may touch: new `src/lib/rewardSettingsRead.ts`,
  `src/lib/habits/habitWrites.ts` (the one `tx.rewardSettings` line only).
  Must not touch anything else.
- **What to build:** `src/lib/rewardSettingsRead.ts` (`import "server-only"`,
  header comment "the only place the RewardSettings table is read; no
  login check, callers check who is asking", on the `screensaverRead.ts`
  pattern): `export async function loadLateStars(client: <the Prisma
  client or transaction type habitWrites already uses> = db):
  Promise<LateStars>`, a missing row or an off-list value reads as "full"
  through `toLateStars`. `checkHabit` calls `loadLateStars(tx)` in place of
  its own `findUnique`.
- **Verification:** full gauntlet; `grep -rn "rewardSettings\." src | grep -v generated`
  shows only `rewardSettingsRead.ts`.
- **Evidence required:** the grep output, the diff, gauntlet tails, `git show --stat HEAD`.
- **Done criteria:** one commit, two files, gauntlet green, test count unchanged (2150).

### C2 - Stars on the form, the Rewards settings card, and stars on the views (UI)
- **Status:** DONE (see Report)
- **Bryce's decisions (2026-11-24, from the mock):** the Stars stepper sits
  under Icon in the "What" column, label "Stars", hint "Paid into the star
  bank each time it's checked off", shown as "None", "1 star", "10 stars".
  "Late checks" sits in a new **Rewards** section in Settings, under Habits
  and Chores, three tiles Full stars / Half stars / No stars, help line "A
  late check is a carried-over item checked off the next day. Half rounds
  up." The star is a filled gold star (new tokens and the DESIGN.md
  exception land in C3).
- **Objective:** Parents and admins set a habit's stars on the form; a
  parents-only Rewards section in Settings sets Late checks; a habit's
  `stars` reaches every row view and the edit form.
- **Boundaries:** may touch: `src/lib/rewardVocabulary.ts`,
  `src/lib/rewardVocabulary.test.ts`, new `src/components/HabitStarsField.tsx`,
  `src/components/HabitForm.tsx`, `src/app/(app)/habits/new/page.tsx`,
  `src/app/(app)/habits/[id]/edit/page.tsx`, new
  `src/components/RewardsSettings.tsx`, new `src/app/actions/rewardSettings.ts`,
  `src/app/(app)/settings/page.tsx`, `src/lib/habitsToday.ts` (stars
  plumbing only) · must not touch: `src/lib/habitsRead.ts`,
  `src/lib/habitsFamily.ts`, `src/lib/habitChanges.ts`, every other
  component, `src/app/globals.css`, `DESIGN.md`, `STRUCTURE.md`,
  `prisma/`, the C1 files other than `rewardVocabulary.ts` and its test.
- **What to build:**
  - `rewardVocabulary.ts` (+ test): `STARS_FIELD_LABEL` "Stars",
    `STARS_FIELD_HINT` "Paid into the star bank each time it's checked off",
    `starCountText(n)` ("1 star", "-1 star", otherwise "N stars"; C3 uses it
    for screen-reader labels), `starStepText(value)` ("None" for null, else
    `starCountText`), `REWARDS_SETTINGS_TITLE` "Rewards",
    `LATE_STARS_TITLE` "Late checks", `LATE_STARS_HELP` (Bryce's line above,
    word for word), `LATE_STARS_REFUSAL` "Only parents and admins can change
    this.", and an off-list refusal "That choice isn't on the list." Still no
    imports.
  - new `HabitStarsField.tsx`: `Field` (from `HabitFormFields.tsx`) with the
    label and hint, a `LadderStepper` showing `starStepText(value)`,
    `atMin` when null, `atMax` at 50, `onStep` through `nextStarStep`.
  - `HabitForm.tsx`: prop `canSetStars: boolean`; `FormInitial` gains
    `{ stars?: number | null }`; state from `initial?.stars ?? null`; the
    field renders right after the Icon field when `canSetStars && !hours`;
    `toInput()` sends `stars: canSetStars ? (hours ? null : stars) : undefined`.
    Update the header comment's field order. Keep the file under 350 lines.
  - both habit pages pass `canSetStars={canSetStars(user.role)}` (from
    `src/lib/rewards/access.ts`).
  - `src/lib/habitsToday.ts`: `stars?: number | null` on `TodayHabitInput`,
    `HabitRowView` and `HabitManagerItem`; `buildTodayRows` and
    `managerItem` set `stars: habit.stars ?? null`. Nothing else in the file.
    (Both readers use `include`, so the column already arrives: Banner,
    habitsRead.ts:141-158, habitsStatsRead.ts:133-137.)
  - new `src/app/actions/rewardSettings.ts`: `saveLateStars(value: unknown):
    Promise<{ error?: string }>`. `getVerifiedUser`; refuse unless
    `!user.isDevice && canSetStars(user.role)`; refuse a value not in
    `LATE_STARS` (strict, not `toLateStars`); upsert `RewardSettings`
    id "household" with `updatedById` (the `actions/screensaver.ts`
    shape); log and return a plain error on a failed write;
    `revalidatePath("/settings")` and `revalidatePath("/habits")`. (This is
    the one write; `rewardSettingsRead.ts` stays the one read.)
  - new `RewardsSettings.tsx`: a `<section className="mt-6">` with an h2
    `REWARDS_SETTINGS_TITLE` (the `HabitsChoresSettings` heading look), then
    one card on the `TextSizeSetting` pattern: Lucide `Star` outline
    `text-muted` + `LATE_STARS_TITLE`, a `role="radiogroup"` of three
    `role="radio"` tiles (labels from `LATE_STARS_LABELS`, the selected
    tile `border-accent bg-accent-soft`, min 48px tall), the help line,
    and the error under it. Optimistic through `useOptimisticRun`.
  - `settings/page.tsx`: when `!user.isDevice && canSetStars(user.role)`,
    load `loadLateStars()` and render `<RewardsSettings>` in the right
    column right after Habits and Chores, sharing its `order-5` (source order
    keeps it after Habits and Chores on a phone). Update the page's header
    comment (the section list and phone order).
- **Verification:** full gauntlet; test count up from 2150 in both runs.
  In the running app (dev server, dev database), logged in as a parent:
  the Stars stepper shows under Icon, walks None, 1 to 5, 10 to 50, hides
  when Track is Hours; a saved value comes back on Edit; Settings shows
  the Rewards section and a tap on Half stars survives a reload (then set
  it back to Full stars). Use only existing logins; if you cannot log in as
  a parent and a kid in the dev app, say so and skip the in-app part
  rather than create or change any account.
- **Evidence required:** `wc -l` of touched files, test names and counts,
  gauntlet tails, `git show --stat HEAD`, and what the in-app check showed
  (or why it was skipped).
- **Done criteria:** one commit, only boundary files, gauntlet green.
- **Report:** DONE, one commit, 10 files, all in the boundary. Tests 2150
  to 2153 (Denver) and 2140 to 2143 pass, 10 skipped (UTC). Gauntlet green.
  `rewardSettings.` appears only in the one write (`actions/rewardSettings.ts`)
  and the one read (`rewardSettingsRead.ts`). In-app check skipped (no
  test logins without touching accounts): Strange checks the stepper, Hours
  hiding, the Edit round trip and the Half stars tap. `habitsToday.ts` now
  361 lines (was 353, already over the soft cap): a NOTE for Captain.

### C3 - Star chip, star bank and the optimistic number (UI)
- **Status:** DONE (see Report)
- **Bryce's decisions (2026-11-24, design mock "Marshee star bank on
  Mine"):** on Mine the bank sits at the right end of the count line, and
  the word "Mine" comes off that line: it reads "2 of 5 done" (then the
  streak if shown) with "★ 42" at the right. On Whole family (phone and
  iPad) the bank sits at the right of each person's header. A row with
  stars shows a small chip "★ 10" beside the streak; no chip without
  stars; hours rows never. The star is a filled gold star.
- **Objective:** Show each habit's stars on its row, each person's star
  bank in Habits & Chores, and move the bank number at once on a tap.
- **Boundaries:** may touch: new `src/lib/starBankRead.ts`, new
  `src/lib/rewards/starDiff.ts`, new `src/lib/rewards/starDiff.test.ts`,
  new `src/components/StarBank.tsx`, new `src/components/StarChip.tsx`,
  `src/components/HabitRow.tsx`, `src/components/HabitFamilyColumn.tsx`,
  `src/components/HabitFamilyWideColumn.tsx`,
  `src/components/HabitFamilyWide.tsx`, `src/components/HabitFamilyView.tsx`,
  `src/components/HabitTodayList.tsx`, `src/components/HabitsDayView.tsx`,
  `src/app/(app)/habits/page.tsx`, `src/app/globals.css` (one new token
  pair), `DESIGN.md` (the star rules only) · must not touch:
  `src/lib/habitChanges.ts`, `src/lib/habitsToday.ts`,
  `src/lib/habitsRead.ts`, `src/lib/habitsFamily.ts`,
  `src/lib/habitsStatsRead.ts`, `src/components/LogButton.tsx` (C4),
  `src/components/HabitsTile.tsx`, every C1/C2 file, `STRUCTURE.md`,
  `prisma/`.
- **What to build:**
  - `src/app/globals.css`: a `--star` token (light and dark), the filled
    star's colour, a gold from the Butter family; measured at 3:1 or more
    against `--surface` and `--bg` in both themes (it is a graphic, not
    text; the number beside it stays `text-fg`). Comment the ratios the
    way the file already does, and map `--color-star`.
  - `DESIGN.md`: the exception to "Outline icons only": one filled star,
    `--star`, used only for stars (the row chip and the star bank), and
    the `--star` token entry with its ratios. Record Bryce's two layout
    decisions above and that "Mine" left the count line (Bryce,
    2026-11-24, overriding the "Mine · 2 of 7 done" wording).
  - `StarChip.tsx`: `{ stars: number }`, a Lucide `Star` with
    `fill="currentColor"` in `text-star`, size 14, then the number in
    `text-sm font-semibold text-fg`, the streak chip's shape
    (`HabitRow.tsx:74-79`); `aria-label` from `starCountText`. Never
    rendered for null or 0.
  - `StarBank.tsx`: `{ stars: number }`, the same star at 20 and the
    number `text-lg font-bold tabular-nums`; `aria-label` from
    `starCountText`. A negative number shows as is.
  - `src/lib/starBankRead.ts` (`server-only`, the `rewardSettingsRead.ts`
    header style): `loadStarBanks(userIds: string[]): Promise<Record<string,
    number>>`, one `habitLog.groupBy` by `userId` summing `stars`, every
    asked id present (0 when none). Later PRs add adjustments and
    redemptions here.
  - `src/lib/rewards/starDiff.ts` (+ test): `starDiff(server, shown,
    lateStars)` over rows shaped `{ id, stars?, carriedFrom, participants:
    { userId, done }[] }` returns `Record<userId, delta>`. Each habit id
    counts once (the family page holds a Together habit in `together` and
    in columns, and an Each habit in several columns). For each
    participant whose `done` flips: pay is `starsForLog(stars, carriedFrom ?
    "late" : "done", lateStars) ?? 0`, plus when it turns on, minus when
    it turns off. Tests: Each check pays only that person; Together pays
    every participant; a habit present twice counts once; late under full,
    half (rounded up) and none; un-check takes back; skip (done stays
    false) pays nothing; no stars pays nothing; rows unchanged give an
    empty or all-zero result. Check that the real family row shapes fit
    (Banner: `FamilyRow`, `applyToPage` in `HabitFamilyView.tsx:16-22`).
  - `habits/page.tsx`: load `loadLateStars()` and `loadStarBanks(ids)`
    (family: every column's person id; Mine: `[user.userId]`), pass
    `banks` and `lateStars` to `HabitsDayView`, which passes them on.
  - `HabitTodayList.tsx`: drop `HABITS_VIEW_LABELS.mine` and its " · "
    from the subtitle (leave the word in the vocabulary: the view switch
    still uses it); the count line shows the bank at its right end:
    `banks[viewer] + starDiff(rows, live, lateStars)[viewer]`. Fix the
    comment that quotes "Mine · 2 of 7 done". If the `bar(subtitle)` shape
    makes "right end" awkward, put the bank in the subtitle node as a
    `ml-auto` item and say what you did.
  - `HabitFamilyView.tsx` computes the diff once from its server page and
    optimistic page and hands each column `bank`; `HabitFamilyColumn.tsx`
    and `HabitFamilyWideColumn.tsx` render `StarBank` at the right of
    the header (`HabitFamilyColumn.tsx:162-177`,
    `HabitFamilyWideColumn.tsx:42-66`); `HabitFamilyWide.tsx` passes it.
  - `HabitRow.tsx` and `FamilyHabitRow` (`HabitFamilyColumn.tsx:42-134`):
    `StarChip` beside the streak when `row.stars`. Hours rows untouched.
    The dashboard tiles get the chip through `HabitRow` (no tile change).
- **Verification:** full gauntlet; test count up from 2153 in both runs;
  every touched file under 350 lines (say any that is not).
- **Evidence required:** the token values and measured ratios (show the
  calculation or tool), test names and counts, `wc -l`, gauntlet tails,
  `git show --stat HEAD`.
- **Done criteria:** one commit, only boundary files, gauntlet green.
- **Report:** DONE, commit 20cb7b7, 15 files in the boundary. `--star`
  light #a87500 (4.03:1 surface, 3.56:1 bg, 3.25:1 surface-2), dark
  #f4d26b (10.53 / 11.72 / 9.33). Tests 2153 to 2163 (Denver), 2143 to
  2153 pass, 10 skipped (UTC); 10 starDiff tests including one through the
  real `applyHabitChange`. Gauntlet green. Added a `viewerId` prop to
  `HabitsDayView` and `HabitTodayList` (TodayPage has none). Open for
  Strange: from `md` up the Mine bank sits just after the count line, not
  at the far right edge, because `HabitsBar.tsx` (outside C3) sizes that
  block to its content.

### C4 - Smaller check circles (UI)
- **Status:** DONE (see Report)
- **Bryce's decision (2026-11-24, on the design mock):** the check circle
  is drawn about 30px, everywhere (Mine, Whole family, the tablet, the
  dashboard tiles, Plans rows), and the skip and hours buttons that share
  its shape follow. The tap area stays 44px.
- **Objective:** Every habit check circle draws a 30px circle inside an
  unchanged 44px tap target.
- **Boundaries:** may touch: `src/components/LogButton.tsx`,
  `src/components/HabitRow.tsx` and `src/components/HabitFamilyColumn.tsx`
  (their read-only done markers only), `src/components/HoursHabitRow.tsx`
  (only if it draws its own circle), `DESIGN.md` (the check size wording
  only) · must not touch anything else.
- **What to build:** in `LogButton.tsx` keep the button `h-11 w-11` (44px)
  and draw the visible circle as an inner 30px (`h-[1.875rem]`, rem per
  the text-size rule) span: empty ring, done fill with `Check` at about
  16, plus with `Plus` at about 16, the dashed skip marker at the same 30px
  with a smaller icon. Export one small `CheckMarker` (the read-only done
  or not-done circle) from `LogButton.tsx` and use it for the two
  duplicated read-only markers (`HabitRow.tsx:180-187`,
  `HabitFamilyColumn.tsx:122-129`), same 44px box, same 30px circle,
  same screen-reader text. Update DESIGN.md wherever it says the check is
  44px so it says a 30px circle in a 44px target (Bryce, 2026-11-24).
- **Verification:** full gauntlet, test count unchanged; `grep` shows no
  habit check circle left at `h-11 w-11` as its drawn size.
- **Evidence required:** the diff, gauntlet tails, `git show --stat HEAD`.
- **Done criteria:** one commit, only boundary files, gauntlet green.
- **Report:** DONE, commit 8e48e79, 5 files in the boundary. `LogButton` keeps
  the 44px button and draws a 30px circle (Check and Plus at 16, skip icon
  14); new `CheckMarker` replaces the two duplicated read-only markers;
  `HoursLogButton` drew its own 48px circle and now draws 30px inside its
  48px target. DESIGN.md wording updated in three entries. Tests unchanged
  (2163; UTC 2153 pass, 10 skipped). Gauntlet green.

### F1 - Gate fixes (Vision pass 2 blocker, Captain notes)
- **Status:** DONE, commit 9204265 (see Report)
- **Objective:** The optimistic bank pays late by the tapped person's own
  carry, and the gates' cheap notes are cleared.
- **Boundaries:** may touch: `src/lib/rewards/starDiff.ts`,
  `src/lib/rewards/starDiff.test.ts`, `src/components/StarChip.tsx`,
  `src/components/HabitRow.tsx` and `src/components/HabitFamilyColumn.tsx`
  (the chip guard only), `src/components/HabitTodayList.tsx` and
  `src/components/HabitFamilyView.tsx` (the shown-bank addition only),
  `src/components/LogButton.tsx`, `src/components/HoursHabitRow.tsx`,
  `src/app/actions/rewardSettings.ts`, `src/app/(app)/settings/page.tsx`
  (the device test only) · must not touch anything else (Fury writes the
  STRUCTURE.md and docs/structure changes).
- **What to fix:**
  1. **BLOCKER (Vision, `starDiff.ts:33`).** Pay is taken from the first
     server copy's `carriedFrom`, but on the family page each column's copy
     of an Each habit is built for that column's person, and the server
     decides late for the tapped person (`habitTapWrites.ts:103`).
     Scenario: Each habit, 4 stars, carry-over, Dad's column first, only
     Kid's copy carried; the tablet taps Kid: Half shows +4 then +2, None
     +4 then 0; reverse case under None the bank does not move on the tap.
     Fix: optional `viewerId?: string` on `StarDiffRow`; while scanning
     `server`, record each copy's `carriedFrom` per habit id per
     `viewerId`; pay each flipped participant with
     `starsForLog(stars, (carried for that habit and that participant ??
     the first copy's carriedFrom) ? "late" : "done", lateStars) ?? 0`;
     keep counting each habit id's flips once. Tests: Each copies that
     differ in `carriedFrom`, under half and none, both directions, plus
     the kid-first control. (Vision's probes:
     scratchpad/probe/carried.test.ts and reverse.test.ts.)
  2. One shown-bank rule (Captain): `shownBanks(banks, diff)` (or one
     equivalent helper) beside `starDiff` in `starDiff.ts`, used by both
     `HabitTodayList` and `HabitFamilyView` in place of their inline
     additions; a test.
  3. One chip rule (Captain): `StarChip` takes `stars?: number | null` and
     draws nothing below 1; `HabitRow.tsx` and `FamilyHabitRow` render it
     without their own test (hours rows still never reach it).
  4. One circle size (Captain): one exported class constant for the 30px
     circle in `LogButton.tsx`, used at its three sites and in
     `HoursHabitRow.tsx`; put `rounded-full` back on the `HoursLogButton`
     button so its focus ring is round (Vision).
  5. Drop the redundant `user.isDevice ||` in
     `actions/rewardSettings.ts:17` and the device half of the Settings
     page test (`canSetStars` already refuses the device role; Captain).
- **Verification:** full gauntlet; tests up from 2163; Vision's two
  scenarios pass.
- **Evidence required:** test names and counts, gauntlet tails, `git show --stat HEAD`.
- **Done criteria:** one commit, only boundary files, gauntlet green.
- **Report:** DONE. One commit, 11 boundary files (+84 / -22).
  `StarDiffRow.viewerId` (set by `habitsToday.ts` from `viewer.userId`;
  `habitsFamily.ts` builds each column for its person), per-person carry
  in `starDiff`, `shownBanks` used by both views, `StarChip` owns the
  below-1 rule, `CHECK_CIRCLE_CLASS` at all four sites, `rounded-full`
  back on `HoursLogButton`, both device tests dropped. tsc and eslint
  exit 0; `npm test` 2171 pass (up 8 from 2163); UTC 2161 pass, 10
  skipped; build exit 0. Stark did not show the new tests failing on the
  old code (Vision's probes did that at pass 2).
- **Docs (Fury, Captain's amendments, Bryce approved):**
  `docs/structure/habits.md` (the `loadStarBanks` exception, the
  engine's rewards imports, size watch), `STRUCTURE.md` (Rewards
  headline, Forms trend, companion sizes), new
  `docs/structure/rewards.md` (108 lines).

### F2 - Gate fixes round 2 (Captain pass 2, Strange pass 1)
- **Status:** DONE, commit 7940a7c (see Report)
- **Bryce's answers (2026-11-24):** a carried row's chip shows what the
  late tap pays (Half: 3 shows 2; None: no chip); Rewards moves after
  Vacation mode in Settings; on iPad (md up) the Mine bank follows the
  count with a small gap, the phone keeps it at the far right; the one
  dev-branch late log Strange could not undo is left as is.
- **Objective:** the five gate blockers are fixed with no change to pay
  rules.
- **Boundaries:** may touch: `src/lib/rewards/stars.ts`,
  `src/lib/rewards/stars.test.ts`, `src/lib/rewards/starDiff.test.ts`,
  new `src/lib/starDiffReducer.test.ts`, `src/components/HabitRow.tsx`,
  `src/components/HabitFamilyColumn.tsx`,
  `src/components/HabitFamilyWideColumn.tsx`,
  `src/components/HabitFamilyWide.tsx`, `src/components/HabitFamilyView.tsx`,
  `src/components/HabitTodayList.tsx`, `src/components/LogButton.tsx`,
  `src/app/(app)/settings/page.tsx` · must not touch anything else (Fury
  writes DESIGN.md, STRUCTURE.md, docs/structure and the plan).
- **What to fix:**
  1. **BLOCKER (Captain).** `src/lib/rewards/starDiff.test.ts:6` imports
     `applyHabitChange` from `../habitChanges`, against rewards.md
     "Dependency direction". Move every test that uses the real reducer
     (the "fits the real reducer" test, the `CARRIED` / `members` /
     `eachCopy` / `tapKid` helpers and the carried-copy tests from F1)
     into new `src/lib/starDiffReducer.test.ts` (top-level lib may import
     both; `src/lib/*.test.ts` is already in every glob). Drop the
     `habitChanges` import from `starDiff.test.ts`. Total test count
     unchanged by the move.
  2. **BLOCKER (Strange) + Bryce's pick.** A carried row's chip shows what
     the late tap pays. Add one pure helper to `rewards/stars.ts`, for
     example `rowStars(stars, carried, lateStars)`: when `carried` is true
     it returns `starsForLog(stars, "late", lateStars)`, otherwise `stars`
     (tests: Full, Half rounded up, None, null stars, not carried). A row
     counts as carried when `row.carriedFrom` is set (done or not, so the
     optimistic done row keeps showing what it paid). Thread `lateStars`
     down to `HabitRow` (from `HabitTodayList`) and `FamilyHabitRow` (from
     `HabitFamilyColumn` and `HabitFamilyWideColumn`, fed by
     `HabitFamilyView` / `HabitFamilyWide`) and pass
     `rowStars(row.stars, !!row.carriedFrom, lateStars)` to `StarChip`.
     `HabitRow`'s carried branch (`row.carriedFrom && !row.doneToday`,
     about line 131) must render `{starChip}` after "counts as done late".
     `StarChip` still owns the below-1 rule (None shows no chip).
  3. **BLOCKER (Strange) + Bryce's pick.** Settings: render
     `{canSetRewards && <RewardsSettings .../>}` after `<VacationCard>`
     inside the order-6 div, not in order-5; update the header comment's
     order (5 Habits & Chores, 6 Vacation then Rewards).
  4. **BLOCKER (Strange).** `LogButton.tsx:76`: add `rounded-full` to the
     `<button>` so its focus ring is round, like `HoursLogButton`.
  5. **BLOCKER (Strange) + Bryce's pick.** `HabitTodayList.tsx:137`: the
     bank's class becomes `ml-auto pl-3 md:ml-3 md:pl-0` (phone: far
     right; md up: follows the count with a gap).
  6. NOTE (Vision): `HabitFamilyWide.tsx:52` passes `banks[column.id]`
     with no `?? 0`; match the narrow layout.
- **Verification:** full gauntlet (tsc, eslint, `npm test`, the UTC
  command from AGENTS.md, `npm run build`); `grep -rn "habitChanges"
  src/lib/rewards/` gives nothing; test count = 2171 + the new
  `rowStars` tests.
- **Evidence required:** test names and counts, gauntlet tails, the grep,
  `git show --stat HEAD`.
- **Done criteria:** one commit, only boundary files, gauntlet green.
- **Report:** DONE. One commit, 12 boundary files (+114 / -65).
  `rowStars` in `stars.ts` (3 tests), reducer tests moved to
  `src/lib/starDiffReducer.test.ts` (no `habitChanges` in
  `src/lib/rewards/`), carried branch renders the chip, `lateStars`
  threaded through the family views, `?? 0` on the wide bank, Rewards
  after Vacation, `rounded-full` on LogButton, bank `md:ml-3`. tsc and
  eslint exit 0; `npm test` 2174 pass; UTC 2164 pass, 10 skipped; build
  printed its route table (exit code not captured). Stark's deviation:
  `lateStars` defaults to "full", so `HabitsTile` and `PlannedTodayCard`
  (the dashboard) still show a carried row's full value. F3 closes it.

### F3 - Late pay on the dashboard's habit rows
- **Status:** DONE, commit 8d3ea2b (see Report)
- **Objective:** every carried row with stars, on every screen, shows what
  the late tap pays (Bryce's rule, F2.2).
- **Boundaries:** may touch: `src/components/HabitRow.tsx`,
  `src/components/HabitFamilyColumn.tsx`,
  `src/components/HabitFamilyWideColumn.tsx` (the `lateStars` prop
  only), `src/components/HabitsTile.tsx` (`HabitsTile` and
  `HabitTileRows`), `src/components/ChoresTile.tsx` (added after Stark's
  BLOCKED-ON-CONTRACT: it renders `HabitTileRows` too),
  `src/components/PlannedTodayCard.tsx`, `src/app/(app)/(home)/page.tsx`
  · must not touch anything else.
- **What to do:** make `lateStars: LateStars` required (no default) on
  `HabitRow`, `FamilyHabitRow`, `HabitFamilyColumn` and
  `HabitFamilyWideColumn`, so the type checker names every caller. The
  dashboard page reads `loadLateStars()` (from
  `@/lib/rewardSettingsRead`, the only reader) alongside its other loads
  (in the same `Promise.all` if there is one) and passes it to
  `HabitsTile`, `ChoresTile` and `PlannedTodayCard`, which pass it
  (through `HabitTileRows`) to `HabitRow`.
- **Verification:** full gauntlet; `grep -n 'lateStars = "full"'
  src/components/*.tsx` gives nothing; test count 2174.
- **Evidence required:** gauntlet tails with the build's exit code, the
  grep, `git show --stat HEAD`.
- **Done criteria:** one commit, only boundary files, gauntlet green.
- **Report:** DONE after one BLOCKED-ON-CONTRACT (Fury's boundary missed
  `ChoresTile`, which also renders `HabitTileRows`; boundary widened).
  One commit, 7 files (+31 / -15). `lateStars` required on `HabitRow`,
  `FamilyHabitRow`, `HabitFamilyColumn`, `HabitFamilyWideColumn`,
  `HabitTileRows`, `HabitsTile`, `ChoresTile`, `PlannedTodayCard`; the
  dashboard adds `loadLateStars()` to its `Promise.all`. tsc exit 0 with
  the props required (every caller covered); eslint exit 0; `npm test`
  2174 pass; UTC 2164 pass, 10 skipped; build EXIT=0; the grep for a
  "full" default gives nothing.
- **Docs (Fury, gate NOTEs):** DESIGN.md (carried chip and iPad bank
  decisions, the `HabitsBar` subtitle wording), rewards.md (`rowStars`,
  `sumStars`, the test-file rule, wording), habits.md wording,
  STRUCTURE.md companion sizes, plan's migration line no longer says
  `prisma migrate dev`.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 2 | Strange (running app, HEAD d0ccecc) | PASS | none (carried chip right under Full, Half, None on Mine, family narrow and wide, dashboard Chores tile; bank moves by the chip's number; Settings order; round focus rings; iPad bank after the count) | a checked carried row vanishes from Today with no Undo (stats page can undo for 7 days); PlannedTodayCard not seen (same path); stats calendar draws late like on time |
| F2/F3 | Vision (new fix contracts only, HEAD d0ccecc; his 3-pass budget covered C1 to F1, so Fury gated F2 and F3 as new contracts) | PASS | none (chip matches pay on Mine, family narrow and wide, dashboard tiles; boundaries clean; moved tests identical) | dashboard reads loadLateStars even for the Tablet login; redundant parens stars.ts:25; past day chip shows today's setting |
| 3 | Captain (F2, F3, docs; HEAD d0ccecc) | PASS | none (pass-2 blocker fixed; docs match code) | sibling headers between starDiff.test.ts and starDiffReducer.test.ts (amendment proposed for Bryce); habitsToday.ts 361 not yet in STRUCTURE.md's size record; habitWrites.ts 329, undoModels.ts 302; redundant parens stars.ts:25; hours-no-stars and habitInput.ts:82 left for R2 |
| 1 | Strange (running app, phone + iPad, light + dark) | FAIL | carried row shows no star chip (HabitRow and FamilyHabitRow carried branch); Rewards heading now sits over Vacation mode in Settings; LogButton focus ring square (rounded-full only on the inner span); Mine bank from md up floats under the date, not at the end of the count line | DESIGN.md:419 still quotes "Mine · 2 of 7 done"; past day shows today's bank; done chip shows current value not saved pay; three chip placements; one dev-branch late log (Bryce, zz m31 days, 2026-11-23, 2 stars) could not be undone through the app |
| 3 | Vision (F1 + whole branch, HEAD 2e338a6) | PASS | none (pass-2 blocker fixed; new tests fail 5 of 18 on 8e48e79, pass 18 of 18 now) | plan rewards-v1.md:192 says `prisma migrate dev --create-only`, against the danger register; HabitFamilyWide.tsx:52 has no `?? 0` fallback; earlier notes stand; build's container-query warning is from main |
| 2 | Captain (amendments + branch, HEAD 2e338a6) | FAIL | `rewards/starDiff.test.ts:6` imports `applyHabitChange` from `../habitChanges`, against rewards.md's dependency rule; move the reducer tests to `src/lib/starDiffReducer.test.ts` (F2.1) | garbled wording habits.md:48 and rewards.md:55; record habits.md 309 at STRUCTURE.md:920; name `sumStars` in rewards.md; hours-no-stars written in four places; habitInput.ts:82 could use toStarValue; habitsToday.ts 361 trend |
| 2 | Vision (C3, C4) | FAIL | starDiff late pay from the first copy, not the tapped person (F1.1) | un-check takes back current value, corrects on refresh; past day shows today's bank; iPad tint contrast 3.30:1 min, passes; HoursLogButton square focus ring (F1.4) |
| 1 | Captain (whole branch) | FAIL | habit engine imports rewards files; starBankRead is a third HabitLog reader. Both fixed by amendment (Bryce approved 2026-11-24: update the rules) | habitsToday 361, HabitForm 339; redundant device test (F1.5); two chip guards (F1.3); two shown-bank additions (F1.2); 30px typed four times (F1.4); plan names rewardsRead.ts for R3 |
| 1 | Vision (C1, C1b, C2) | PASS | none | habitsToday.ts 361 lines (soft cap); C1b's import-line change needed by its one line; loadLateStars runs on every check even with no stars; signed-out saveLateStars wording |

## Handoff log

- 2026-11-24: Plan approved; star steps confirmed by Bryce. Mission file
  and C1 written in the planning chat; preflight on C1 passes apart from
  `prisma/schema.prisma` over the hard cap, which STRUCTURE.md exempts.
  Nothing dispatched yet. Next: the R1 session links `.env`, checks the
  dev host, runs `npm ci`, dispatches Stark on C1 and Banner on the
  display path (for C3) together, then writes C2 and C3.

## Delivery

- **Shipped:** stars on habits and chores (None to 50), the star bank
  on Mine and Whole family, the optimistic bank, Late checks in Settings,
  carried rows' chips showing what the late tap pays, 30px check circles,
  and `docs/structure/rewards.md`. PR #124. Gauntlet at
  d0ccecc: tsc, eslint, build exit 0; npm test 2174/2174; TZ=UTC 2164
  pass, 10 skipped, 0 fail. Gates: Vision PASS (pass 3 on C1 to F1, then
  F2/F3), Captain PASS (pass 3), Strange PASS (pass 2).
- **Shipped check:** run at merge; reported in the R1 chat (the mission
  file cannot record its own merge commit).
- **Deliberate leftovers:** Assistant API does not read or set stars yet
  (later rung). A kid's edit leaves stars as they were. One dev-branch late
  log left in place with Bryce's OK (zz m31 days, 2026-11-23, 2 stars;
  its stats page can undo it until 2026-11-30). Gate NOTEs moved to
  `.avengers/status.md` "Open, not scheduled".
