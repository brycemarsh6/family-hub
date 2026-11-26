# STRUCTURE.md companion: Rewards

Part of [STRUCTURE.md](../../STRUCTURE.md)'s "One source of truth" list,
started by mission 79 (Rewards R1). Every rule here binds exactly like
STRUCTURE.md; a second definition is a BLOCKER. Plan:
`.avengers/plans/rewards-v1.md`. Written 2026-11-24 from Captain's
mission-79 ruling; Bryce approved.

## One source of truth

### Stars and the star bank

**Words.** `src/lib/rewardVocabulary.ts` holds every rewards word and
list except the picture list (`rewards/rewardEmoji.ts`, below): `STAR_STEPS` (the only star values; a star value list or a 50 cap
typed anywhere else is a BLOCKER), `toStarValue` (the only repair: off
the list, 0 included, is null), `LATE_STARS` with `LATE_STARS_LABELS` and
`toLateStars`, `starCountText` / `starStepText`, and the field, section,
help and refusal words. It has **no imports** (the `habitVocabulary.ts`
pattern), so any lib file, the habit engine included, may take words
from it. A word that states a rule's number (the PIN length, lock
minutes) is a small function taking that number, and its caller passes
the rule's constant (`pinLockedText`, `pinSheetHint`); the number is never
typed in the sentence (Captain, mission 82). New reward words (R3 to R5) go here until it passes about 300
code lines; past that a concern gets its own
`reward<Concern>Vocabulary.ts`.

**Pure rules: `src/lib/rewards/`**, a domain subdirectory under the
`src/lib/voice/` precedent. Every file there is pure: no `db`, no
`server-only`, no env or clock read (callers pass `today` and `now`).
- `stars.ts`: `starsForLog(habitStars, status, lateStars)` is the only
  "what does one check pay" rule (done pays the value; late pays full,
  half rounded up, or nothing; any other status or a null value pays
  null). `nextStarStep` is the only stepper walk. `rowStars` is the only
  "what does this row's chip show" rule (a carried row shows what the
  late tap pays, through `starsForLog`). `sumStars` is the bank's adder,
  called only by `loadStarBanks`. Halving stars or testing a log status
  to decide pay anywhere else is a BLOCKER.
- `access.ts`: `canSetStars(role)` (built on `MANAGER_ROLES`, so it
  already refuses the device role) is the only "who may set a star value
  or the Late checks setting" rule. Pages pass its answer to components as
  a boolean; actions call it themselves. A role or device test for stars
  anywhere else is a BLOCKER. Later reward policy (who redeems, approves,
  sets a PIN) joins this file as one named check each. Anything the
  tablet may do beyond the default goes in `src/lib/tabletRules.ts` as a
  `tabletMay...` check, never here. R4 added `canSetRewardPin`,
  `kidMayRedeem`, `kidMayWish` and `canUndoRedeem` (with
  `REDEEM_UNDO_WINDOW_MS`); none tests the device role.
- `starDiff.ts`: `starDiff(server, shown, lateStars)` is the only
  optimistic bank change; it pays through `starsForLog`, counts each
  habit id's flips once, and pays late by the tapped person's own carry
  (each family column's copy is built for its person). The shown bank is
  the server bank plus this delta, added by the one helper beside it
  (`shownBanks`); a component adding the two itself is a BLOCKER (R2's
  count-up reads the helper). `habitChanges.ts` never learns stars.
- `starMotion.ts` (mission 80): the star flight's numbers and shapes
  (`RING_STARS`, `RING_RADIUS_REM`, the timings and `FLIGHT_EASING`,
  `ringOffsets`, `flightKeyframes`, `landsAfterMs`,
  `landingClearsAfterMs`), `ALL_DONE_WORDS_MS` (the all-done words),
  `CONFETTI_Z_INDEX` (the confetti canvas), and `countUpValue`, the only
  count-up step. A flight timing, ring shape or the confetti's `zIndex`
  typed in a component is a BLOCKER; the two celebration layers keep the
  `z-[70]` class (the sheets' `z-[60]` precedent), and
  `CONFETTI_Z_INDEX`'s test pins it between 61 and 70.
- `rewardRules.ts` and `rewardEmoji.ts` arrived in R3 (below);
  `pinPolicy.ts` in R4 (mission 82, "The parent PIN and wishes" below); R5
  adds `starHistory.ts` here, pure with its own test.

**Dependency direction.** `src/lib/rewards/` imports only
`rewardVocabulary.ts`, `constants.ts`, its own files and types. It never
imports `src/lib/habits/`, a `habits*.ts` module or a `goals*.ts` module;
row shapes it reads are structural (`StarDiffRow` fits `HabitRowView`
and `FamilyRow` without importing them). The habit engine may import
`rewardVocabulary.ts` and `rewards/stars.ts`, and, in its write files
only, `rewardSettingsRead.ts` (habits.md, "The habit engine"); never the
reverse. Test files obey the same rule: a test that needs the real habit
reducer lives at the top of `src/lib/` (`starDiffReducer.test.ts`).

**Tables: one reader and one writer each.**
- `RewardSettings` (one row, id "household", the `ScreensaverSettings`
  precedent): `src/lib/rewardSettingsRead.ts` (`server-only`, no auth) is
  the only reader (`loadLateStars(client = db)`; a missing row or an
  off-list value reads as "full"; R4's `loadPinStatus` and `loadPinCheck`,
  below). Since R4 the PIN check gave the row a second caller, so every
  write of it lives in `src/lib/rewardWrites.ts` (`writeLateStars`,
  `writeRewardPin`, `writePinRequired`, `checkRewardPin`); the actions in
  `src/app/actions/rewardSettings.ts` (guard form a: `saveLateStars` with
  `canSetStars`, `setRewardPin` and `saveRewardPinRequired` with
  `canSetRewardPin`) and `actions/rewards.ts` call them. A new household
  setting on this row gets a reader beside these and a write beside
  them; a per-login switch (R2's animation switch) is a preference, not
  this row.
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
  the number leaves the server (the chore-streak precedent). R3 added
  redemptions inside `loadStarBanks`; R5 adds adjustments there; a second bank
  sum in a page, action, component or Winnie route is a BLOCKER.
- **R3's reward catalogue (mission 81).** `Reward` and `RewardRedemption`
  each have one reader of rows and one writer: `loadRewards` in
  `src/lib/rewardsRead.ts` is the only reader that builds a `RewardView`;
  the only other reads are `loadStarBanks`'s cost sum and the reads inside
  `rewardWrites.ts`'s own writes, plus R4's `loadRewardFacts(id)` in
  `rewardsRead.ts` (owner and cost only, so an action can work out its
  gate before it writes); another is a BLOCKER. Writes in `src/lib/rewardWrites.ts` (a domain write
  module: `server-only`, no auth, no `revalidatePath`), actions in
  `src/app/actions/rewards.ts` (`saveReward`, `deleteReward`,
  `saveWish`, `redeemReward`, `undoRedeem`; since R4 the first four ask
  `rewardGates.ts` themselves and `undoRedeem` asks `canUndoRedeem`
  inside its write, below). A redemption row snapshots the title, emoji
  and cost and is never rewritten; Undo redeem deletes it. **The redeem is
  one serializable transaction** (`redeemReward` in `rewardWrites.ts`): it
  re-reads the reward and the bank through `loadStarBanks([ownerId], tx)`,
  asks `redeemRefusal`, then creates the row, retrying a write conflict (via
  `isWriteConflictError`) up to three tries in all, so two quick taps cannot
  spend the same stars. `loadStarBanks` now subtracts each person's redeemed
  costs (it can go below 0); it is still the only bank sum. The settings
  read stays in `rewardSettingsRead.ts`.
- `src/lib/rewards/rewardEmoji.ts` is the only list of reward pictures
  (`REWARD_EMOJI_GROUPS`) and the only emoji check (`toRewardEmoji`: one
  grapheme that is an emoji). `rewardRules.ts` is the only home of the cost
  stepper walk (`nextCostStep`), earned (`isEarned`), a card's state
  (`rewardStatus`), Hide earned (`visibleRewards`), the board's order
(`orderRewards`: earned last, added order kept inside each group;
`visibleRewards` uses it, Hill's H2), the redeem refusal, the
  sheet's input check and the redeem sheet's lines (the date arrives
  formatted, by `formatLongCalendarDate` in `householdDate.ts`). `access.ts` has
  `canManageRewards` (add, edit, delete) and `canRedeemRewards` (a
  parent's redeem); since R4 undo is `canUndoRedeem`, and kid and tablet
  redeem go through `rewardGates.ts`. `isWish` (a null cost) is the one
  wish test.
- `src/lib/hideEarned.ts` is the only home of the Hide earned switch on a
  device (the `lastStore.ts` pattern, key `marshee.rewards.hideEarned`).

**The parent PIN and wishes (mission 82, R4).** Bryce's calls are in the
mission-82 file.
- `src/lib/rewards/pinPolicy.ts` (pure) is the only home of the PIN's
  shape (`isPinShaped`: exactly 4 ASCII digits), its numbers
  (`PIN_LENGTH`, `PIN_MAX_TRIES` 5, `PIN_LOCK_MS` 5 minutes), when it is
  asked (`pinGate`) and the lock's arithmetic (active, ended, minutes
  left, the lock to write after a wrong try). A PIN number or lock time
  typed anywhere else is a BLOCKER.
- `src/lib/rewardGates.ts` (pure, top of `src/lib/` because it combines
  `rewards/access.ts`, `rewards/pinPolicy.ts` and `tabletRules.ts`; the
  `starFlights.ts` precedent) is the only answer to "may this login do
  this, and does it need the PIN": `redeemGate`, `manageGate`,
  `mayChangeWish`, and `rewardRights` (plain data the page hands the
  board). The tablet's own rules are `tabletMayRedeemRewards`,
  `tabletMayManageRewards` and `tabletMayAddWishes` in `tabletRules.ts`.
  A role, device or PIN-switch test for rewards in a page, action or
  component is a BLOCKER.
- **The PIN is checked only on the server**, by `checkRewardPin` in
  `rewardWrites.ts`, called from the actions' one gate helper on every
  call that needs it; nothing stays unlocked. The hash is made and
  compared only by `src/lib/password.ts`; `pinHash` leaves the reader
  only through `loadPinCheck` (for `checkRewardPin`); `loadPinStatus`
  reads it only to answer `pinSet`, and pages see only `{ pinSet,
  pinRequired }`. The lock is its own
  columns on this row and never reads or writes `LoginAttempt`. A wrong
  check is one transaction that first locks the row (`FOR UPDATE`), so
  simultaneous tries wait in line and a burst cannot pass the limit
  (Vision, mission 82 pass 1); a timeout or error answers refused. A wrong
  try is an atomic `increment`; a live lock refuses before any bcrypt
  work; a new PIN clears the lock.
- A wish is a `Reward` with a null `cost`, made by `createWish` (no cost,
  one time) through `saveWish` and `checkWishInput`; only its title and
  picture change (`updateWish`), and a no-PIN delete goes only while the
  cost is still null. Setting a cost is an ordinary `saveReward`.
- Kid and tablet Undo redeem: only a redemption that login made, within
  `REDEEM_UNDO_WINDOW_MS` (`canUndoRedeem`, checked inside
  `undoRedemption`'s own transaction). Parents and admins undo any.
- `rewardRights` also answers `addWish` per person (the board never
  decides a tile itself).
- Components: `PinPad.tsx` is the only PIN keypad (no text input, so no
  autofill; it calls no action), used by `SetPinSheet.tsx` (Settings),
  `RedeemSheet` and `RewardSheet`. `WishSheet.tsx` is the wish sheet.

**Rewards page components (R3).** `/rewards` is a wide page
(`data-page-width="wide"`). `RewardsBoard.tsx` owns the sheet state and
the layout: one `@container`, chips and one person below 48rem, a column
per person from it up (a container variant, never a screen breakpoint). It
keeps a copy of the open redeem sheet's reward, owner name and bank, so the
refresh after a redeem never closes the celebration. `RewardCard.tsx`
draws one reward, `RewardPersonChips.tsx` the phone's people row.
`RewardSheet` (with `RewardEmojiPicker` inside it) and `RedeemSheet` are the sheets (rendered
outside the container); `StarRain.tsx` is the second importer of
`canvas-confetti` (habits.md names both). Colour emoji and `--star-soft` are
allowed only here (DESIGN.md).

**Undo columns.** `LATE_COLUMNS` in `src/lib/assistant/undoModels.ts` is
the only list of columns added after audit copies existed: a copy
without one still plans as undoable and reads it as null.
`hasAllColumns` in `undoPlan.ts` is its only reader. A new column on an
undo model goes in this list in the same commit.

**Components.** `StarChip.tsx` (a row's value) and `StarBank.tsx` (a
person's total) are the only drawings of a star amount. The filled
`text-star` star appears only in those two, in `StarFlightLayer.tsx`'s
ring (mission 80) and in `RewardCard.tsx`'s Earned mark (mission 81);
DESIGN.md's star exception names all four, and a fifth place is a BLOCKER.
The Rewards page draws one visible `StarBank` per person (the chip below
48rem, the column header from it up), so `data-star-bank` stays unique on
screen. Whether a chip shows is `StarChip`'s own rule (it draws
nothing below 1); rows pass `rowStars(...)` and never test the number
themselves.
`HabitStarsField.tsx` is the only stars stepper (a `LadderStepper`);
`RewardsSettings.tsx` is the Settings section. R3's page components
follow the flat `src/components/` rule.

**The star flight (mission 80).** `src/lib/starFlights.ts`
(`starPayments`, and `takeBackPayments` for a failed check's cancel) is
the only "who gains what from this tap" answer: it is
`starDiff` over the row before and after `applyHabitChange`, so a tap's
flight and the bank's optimistic number come from the one pay rule. It
sits at the top of `src/lib/` because it imports `habitChanges.ts`, which
`src/lib/rewards/` may not. `StarFlightLayer.tsx` is the only animator: a
provider mounted once in the `(app)` layout, with one tap-proof layer.
Taps reach it only through `useStarFlight().fly(button, starPayments(...))`,
called before `run(...)`; a component animating stars itself is a BLOCKER.
`useCountUp.ts` is the only count-up and `StarBank` its only caller; it
reads the `stars` prop, which callers pass from `shownBanks`. A bank is
found by `data-star-bank={userId}`, which only `StarBank` writes.

**The Celebrations switch (mission 80).** `UserPreferences.celebrations`
is a per-login preference (not a `RewardSettings` column): read in
`dal.ts`, saved by `saveCelebrations` (people) and
`saveTabletCelebrations` (every active device login, the tablet start
page precedent), and the tablet's value is read only by
`loadTabletCelebrations` in `src/lib/tabletCelebrationsRead.ts`.
`StarFlightLayer` is the only client entry for the switch: the `(app)`
layout passes `user.celebrations` in as `enabled`. Everything else takes
it from there: the flight itself, the count-up through `useStarLanding`,
and `HabitConfetti` through `useCelebrations()`. A component reading the
preference any other way is a BLOCKER. The actions live in `src/app/actions/preferences.ts`. Reduce
Motion always wins over the switch and has two readers:
`StarFlightLayer` uses `src/lib/usePrefersReducedMotion.ts`, and
`HabitConfetti` calls `matchMedia` once when it fires, on purpose (the
hook's first value on a fresh load is the server's guess, false).

**Tests.** `src/lib/rewards/*.test.ts` is in `package.json`'s test
script, both CI timezone steps and the AGENTS.md command (mission-79/C1).
