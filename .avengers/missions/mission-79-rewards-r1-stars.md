# Mission: Rewards R1, stars on habits and the star bank

**Project:** family-hub (Marshee)
**Status:** CONTRACTED (C1 ready to dispatch)
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
- **Status:** PENDING
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
- **Report:** (pending)

### C2 - Stars on the form and the Late checks setting (UI)
- **Status:** PENDING (written after C1 reports; boundaries: `HabitForm.tsx`,
  the new and edit habit pages, a new Settings card and its action, a new
  `RewardSettings` reader)

### C3 - Star chip, star bank and the optimistic number (UI)
- **Status:** PENDING (written after Banner's display-path brief; disjoint
  from C2)

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | — | — | — |

## Handoff log

- 2026-11-24: Plan approved; star steps confirmed by Bryce. Mission file
  and C1 written in the planning chat; preflight on C1 passes apart from
  `prisma/schema.prisma` over the hard cap, which STRUCTURE.md exempts.
  Nothing dispatched yet. Next: the R1 session links `.env`, checks the
  dev host, runs `npm ci`, dispatches Stark on C1 and Banner on the
  display path (for C3) together, then writes C2 and C3.

## Delivery

- **Shipped:** (pending)
- **Shipped check:** (pending)
- **Deliberate leftovers:** Assistant API does not read or set stars yet
  (later rung). A kid's edit leaves stars as they were.
