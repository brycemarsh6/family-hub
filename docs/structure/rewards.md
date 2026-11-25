# STRUCTURE.md companion: Rewards

Part of [STRUCTURE.md](../../STRUCTURE.md)'s "One source of truth" list,
started by mission 79 (Rewards R1). Every rule here binds exactly like
STRUCTURE.md; a second definition is a BLOCKER. Plan:
`.avengers/plans/rewards-v1.md`. Written 2026-11-24 from Captain's
mission-79 ruling; Bryce approved.

## One source of truth

### Stars and the star bank

**Words.** `src/lib/rewardVocabulary.ts` holds every rewards word and
list: `STAR_STEPS` (the only star values; a star value list or a 50 cap
typed anywhere else is a BLOCKER), `toStarValue` (the only repair: off
the list, 0 included, is null), `LATE_STARS` with `LATE_STARS_LABELS` and
`toLateStars`, `starCountText` / `starStepText`, and the field, section,
help and refusal words. It has **no imports** (the `habitVocabulary.ts`
pattern), so any lib file, the habit engine included, may take words
from it. New reward words (R3 to R5) go here until it passes about 300
code lines; past that a concern gets its own
`reward<Concern>Vocabulary.ts`.

**Pure rules: `src/lib/rewards/`**, a domain subdirectory under the
`src/lib/voice/` precedent. Every file there is pure: no `db`, no
`server-only`, no env or clock read (callers pass `today` and `now`).
- `stars.ts`: `starsForLog(habitStars, status, lateStars)` is the only
  "what does one check pay" rule (done pays the value; late pays full,
  half rounded up, or nothing; any other status or a null value pays
  null). `nextStarStep` is the only stepper walk. Halving stars or
  testing a log status to decide pay anywhere else is a BLOCKER.
- `access.ts`: `canSetStars(role)` (built on `MANAGER_ROLES`, so it
  already refuses the device role) is the only "who may set a star value
  or the Late checks setting" rule. Pages pass its answer to components as
  a boolean; actions call it themselves. A role or device test for stars
  anywhere else is a BLOCKER. Later reward policy (who redeems, approves,
  sets a PIN) joins this file as one named check each. Anything the
  tablet may do beyond the default goes in `src/lib/tabletRules.ts` as a
  `tabletMay...` check, never here.
- `starDiff.ts`: `starDiff(server, shown, lateStars)` is the only
  optimistic bank change; it pays through `starsForLog`, counts each
  habit id's flips once, and pays late by the tapped person's own carry
  (each family column's copy is built for its person). The shown bank is
  the server bank plus this delta, added by the one helper beside it
  (`shownBanks`); a component adding the two itself is a BLOCKER (R2's
  count-up reads the helper). `habitChanges.ts` never learns stars.
- R2 to R5 add `starMotion.ts`, `rewardRules.ts`, `rewardEmoji.ts`,
  `pinPolicy.ts` and `starHistory.ts` here, each pure with its own test.

**Dependency direction.** `src/lib/rewards/` imports only
`rewardVocabulary.ts`, `constants.ts`, its own files and types. It never
imports `src/lib/habits/`, a `habits*.ts` module or a `goals*.ts` module;
row shapes it reads are structural (`StarDiffRow` fits `HabitRowView`
and `FamilyRow` without importing them). The habit engine may import
`rewardVocabulary.ts` and `rewards/stars.ts`, and its write files
`rewardSettingsRead.ts` (habits.md, "The habit engine"); never the
reverse.

**Tables: one reader and one writer each.**
- `RewardSettings` (one row, id "household", the `ScreensaverSettings`
  precedent): `src/lib/rewardSettingsRead.ts` (`server-only`, no auth) is
  the only reader (`loadLateStars(client = db)`; a missing row or an
  off-list value reads as "full"). `saveLateStars` in
  `src/app/actions/rewardSettings.ts` (guard form a, `canSetStars`) is
  the only writer. A new household setting on this row gets a reader
  beside `loadLateStars` and an action beside `saveLateStars`; a
  per-login switch (R2's animation switch) is a preference, not this
  row. If a second caller appears (a Winnie route), the write moves into
  `src/lib/rewardWrites.ts` first (the `feedback.ts` precedent).
- `Habit.stars` is written only through `habitColumns` in
  `habits/habitRows.ts` (through `toStarValue`; an hours habit is forced
  to null). It arrives only from `checkHabitInput`, after
  `actions/habits.ts` drops it for a caller `canSetStars` refuses.
- `HabitLog.stars` is a snapshot, written only by `checkHabit` in
  `habits/habitWrites.ts` as `starsForLog(...)` at check time and never
  rewritten: a changed habit value or Late checks setting never repays
  old checks.
- **The star bank.** `loadStarBanks(userIds)` in `src/lib/starBankRead.ts`
  (`server-only`, no auth; callers decide who is shown) is the only bank
  sum and the one sanctioned `HabitLog` reader outside `habitsRead.ts` /
  `habitsStatsRead.ts`: it reads only `stars`, grouped by `userId`, and
  builds no habit row. The bank counts stars from private habits; only
  the number leaves the server (the chore-streak precedent). R3 and R5
  add redemptions and adjustments inside `loadStarBanks`; a second bank
  sum in a page, action, component or Winnie route is a BLOCKER.
- R3's reward catalogue: reads in `src/lib/rewardsRead.ts`, writes in
  `src/lib/rewardWrites.ts` (a domain write module: `server-only`, no
  auth, no `revalidatePath`), actions in `src/app/actions/rewards.ts`.
  The settings read stays in `rewardSettingsRead.ts`.

**Undo columns.** `LATE_COLUMNS` in `src/lib/assistant/undoModels.ts` is
the only list of columns added after audit copies existed: a copy
without one still plans as undoable and reads it as null.
`hasAllColumns` in `undoPlan.ts` is its only reader. A new column on an
undo model goes in this list in the same commit.

**Components.** `StarChip.tsx` (a row's value) and `StarBank.tsx` (a
person's total) are the only drawings of a star amount, and the filled
`text-star` star appears nowhere else (DESIGN.md's one exception to
outline icons). Whether a chip shows is `StarChip`'s own rule (it draws
nothing below 1); rows pass `row.stars` and never test it themselves.
`HabitStarsField.tsx` is the only stars stepper (a `LadderStepper`);
`RewardsSettings.tsx` is the Settings section. R2's
`StarFlightLayer.tsx` and R3's page components follow the flat
`src/components/` rule.

**Tests.** `src/lib/rewards/*.test.ts` is in `package.json`'s test
script, both CI timezone steps and the AGENTS.md command (mission-79/C1).
