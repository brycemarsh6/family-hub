# Rewards v1: stars for habits and chores, and a Rewards page

## Context

Bryce wants kids (and adults) to get excited about habits and chores. The idea,
modeled on Skylight Calendar's Rewards: a habit or chore can carry a star
value, checking it off pays those stars into the person's **star bank**, and
stars are spent on rewards (a cake pop, the zoo, a toy) on a new **Rewards**
page. Nothing exists for this today. The habits plan parked it on purpose
("Rewards come later"), and the groundwork is live: chore streaks, per-person
check-offs, the wall tablet checking off for anyone.

This plan is the first step of the build. Step 0 is to save it in the repo as
`.avengers/plans/rewards-v1.md` (it rides in the first PR), then build it as
five small PRs through the Avengers process, one chat per PR.

## Decisions Bryce made (do not re-ask)

1. New drawer row **Rewards** (`/rewards`): one column per person with avatar,
   name and star bank; reward cards below with a picture, title and either a
   progress bar ("55 of 150") or a **Redeem** button once they have enough.
2. A habit or chore has an optional star value. Only check-off habits and
   chores earn in v1. Hours habits and Calendar tasks do not.
3. Everyone earns and spends, kids and adults.
4. Un-checking takes the stars back, even after a redeem (the bank can go
   below zero).
5. **Late checks:** a household setting, Full stars, Half stars (rounded up)
   or No stars. Default Full. Skips earn nothing.
6. **Who sets star values and reward costs:** parents and admins on their own
   login, plus the wall tablet after the parent PIN.
7. **Earn animation:** a ring of gold stars appears at the check, slides and
   shrinks into that person's star bank, and the number counts up. A setting
   turns it off.
8. **Redeem celebration:** stars rain behind a card "Great work! (reward)
   redeemed. By (name) for (N) stars on (date)" with Done and Undo redeem.
9. **All done for the day:** keep today's confetti and add a short line of
   words (Bryce approves the wording).
10. **Reward pictures:** a preloaded set of about 60 colorful emoji, or No
    picture. No photo uploads.
11. Each reward is **Repeatable** (bar starts over) or **One time**. A redeemed
    one-time reward stays on the page in an **Earned** look (glow plus the
    word "Earned"), with a **Hide earned** switch.
12. **Undo redeem:** on the celebration card, and for parents in **Manage
    rewards**. Stars go back to the star bank and the reward returns to how
    it was.
13. **Parent PIN:** one 4 digit PIN set in Settings. Asked on the wall tablet
    and on a kid's login. A parent on their own login is never asked. A
    Settings switch turns the PIN off.
14. **Wishes:** a kid adds a reward with no cost; a parent sets the cost
    before it can be redeemed.
15. **Bonus stars:** parents can give or take stars with a short note. It
    shows in the person's star history.

Defaults I chose (structure, or small rules; say so if you want different):
"Together" habits pay every participant. Changing a star value never rewrites
the past. No back-pay for old checks. Everyone can see everyone's stars and
rewards. Star numbers are set with the existing +/- steppers, never typed.

## How it works underneath (structure, my recommendation)

- **Stars ride on the check itself.** Add `Habit.stars Int?` and a snapshot
  `HabitLog.stars Int?` written at check time in the one place checks are
  written (`checkHabit` in `src/lib/habits/habitWrites.ts`). Un-check, habit
  delete and Winnie's undo all already delete or restore that row, so the
  stars follow with no extra bookkeeping.
- **Star bank is always added up, never stored:** sum of `HabitLog.stars`
  plus sum of `StarAdjustment.amount` minus sum of `RewardRedemption.cost`.
  It cannot drift out of sync.
- **New tables (all additive):**
  - `RewardSettings` (one row, id "household", like `ScreensaverSettings`):
    `lateStars` text (full, half, none) in R1; `pinHash`, `pinRequired`,
    `pinFailCount`, `pinLockedUntil` added in R4.
  - `Reward`: owner, title, emoji key (null is No picture), `cost Int?`
    (null is a wish), repeatable, sortOrder, createdBy.
  - `RewardRedemption`: user, reward (SetNull), title, emoji and cost
    snapshots, redeemedBy, redeemedAt. Undo redeem deletes the row.
    "Earned" is worked out (one-time and a redemption exists).
  - `StarAdjustment`: user, signed amount, note, createdBy.
  - `UserPreferences.starAnimations Boolean @default(true)`.
- **Winnie's undo:** add `stars` to `HABIT_COLUMNS` and `HABIT_LOG_COLUMNS`
  in `src/lib/assistant/undoModels.ts`. `hasAllColumns` in
  `src/lib/assistant/undoPlan.ts` would refuse the last 30 days of saved
  copies (they lack the new column), so R1 also adds a small "late columns"
  list that check skips. Tested in `undoPlanHabits.test.ts`.
- **Where rules live (STRUCTURE.md):** pure, tested files in a new
  `src/lib/rewards/` (`stars.ts`, `access.ts`, `rewardRules.ts`,
  `rewardEmoji.ts`, `pinPolicy.ts`, `starMotion.ts`, `starHistory.ts`); words
  in `src/lib/rewardVocabulary.ts`; writes in `src/lib/rewardWrites.ts`;
  reads in `src/lib/starBankRead.ts` and `src/lib/rewardsRead.ts`; actions in
  `src/app/actions/rewards.ts`; tablet permissions only in
  `src/lib/tabletRules.ts`. The new test folder is added to the test glob in
  `package.json`, both timezone steps in `.github/workflows/ci.yml` and the
  quoted command in `AGENTS.md`, in the same commit as its first test.

## The PR ladder

Each PR is its own chat and worktree, goes branch, PR, Gauntlet green, merge,
then a production check. Each starts with a mock and the open questions for
that PR, and builds after Bryce confirms.

**R1. Stars on habits and the star bank** (migration 1)
- Schema: `Habit.stars`, `HabitLog.stars`, `RewardSettings.lateStars`.
- `checkHabit` writes the snapshot (late setting applied, null for skips);
  `habitRows.ts` forces no stars on hours habits; `habitInput.ts` checks the
  value; `src/app/actions/habits.ts` drops `stars` unless the actor is a
  parent or admin (kids can edit habits they are on).
- `HabitForm.tsx`: a Stars stepper (`LadderStepper`), parents only, hidden
  for hours habits.
- Display: new `StarBank.tsx`; a "star 10" chip on rows (`HabitRow.tsx`,
  `HabitFamilyColumn.tsx`); the bank beside each name in the family views
  and Today. The number moves at once on check and un-check (server bank
  plus a small pure `starDiff`, no change to `habitChanges.ts`).
- Settings: the Late checks choice, parents only.
- Winnie undo changes above. Save this plan to `.avengers/plans/rewards-v1.md`.
- Bryce sees: set stars on a chore, the chip on its row, his star bank going
  up and down.

**R2. Earn animation, its switch, and the all-done words** (no migration)
- New `StarFlightLayer.tsx` (fixed, never takes taps), built with the
  browser's own animation API, no new library. `useCountUp.ts` for the
  number. If no bank is on screen (dashboard tile) the ring pops in place.
- `LogButton.tsx`, `HabitsTile.tsx`, `HabitTodayList.tsx`,
  `HabitFamilyView.tsx` hand the tapped button to the layer.
- Switch: `starAnimations` through `dal.ts`, `actions/preferences.ts`,
  `HabitsChoresSettings.tsx`; the tablet's switch on `/settings/wall-tablet`.
  Reduce Motion always wins (`usePrefersReducedMotion`).
- Add the approved words to the daily confetti (`HabitConfetti.tsx`).

**R3. Rewards page** (migration 2: `Reward`, `RewardRedemption`)
- `src/app/(app)/rewards/page.tsx` (wide page), `RewardsBoard.tsx`,
  `RewardCard.tsx` (reuses `ProgressBar`), `RewardSheet.tsx`,
  `RewardEmojiPicker.tsx` (the `HabitIconPicker` grid pattern),
  `RedeemSheet.tsx` (one sheet: confirm, then celebration with Done and Undo
  redeem), `StarRain.tsx` (the confetti library already installed has a star
  shape).
- Redeem runs in one database transaction that re-reads the bank, so two
  quick taps cannot double-spend.
- One nav row in `src/lib/nav.ts`; `startPage.test.ts` goes from 9 to 10.
- Earned look and the Hide earned switch (remembered per device).
- In R3 only parents and admins add rewards and redeem. Kids and the tablet
  see the page and "Ask a parent" until R4.

**R4. Parent PIN, kid and tablet redeem, wishes** (migration 3: PIN columns)
- `PinPad.tsx`, a Rewards section in Settings (set PIN, PIN on or off), a PIN
  step in `RedeemSheet`. Hash with `src/lib/password.ts`. Five wrong tries
  locks PIN entry for 5 minutes (its own counter, so it can never lock the
  family out of signing in).
- No PIN set yet and the switch on: kid and tablet redeem says "A parent
  needs to set a PIN first".
- `tabletRules.ts` gains the tablet's reward permissions. With the PIN, the
  tablet may also change star values and reward costs (decision 6).
  **Bryce, 2026-11-25 (mission 82):** reward costs only in R4; tablet habit
  star values are parked for a later PR (the tablet cannot open the habit
  editor at all today).
- Wishes: a kid for themselves, the tablet for anyone; no cost until a
  parent sets one.

**R5. Manage rewards, bonus stars, star history** (migration 4:
`StarAdjustment`)
- `/rewards/manage` for parents and admins: wishes waiting for a cost, recent
  redemptions with Undo redeem, give or take stars with a note.
- Star history opens from a person's star bank. A private habit's name is
  hidden from people who cannot see that habit.

**Later, not in this plan's ladder:** a Stars dashboard widget, Winnie
endpoints for rewards, stars for hours habits and Calendar tasks.

## Rule changes Bryce approves along the way

- **DESIGN.md:** an exception to "Outline icons only" for reward emoji (one
  fixed list, shown only on reward cards and the picker); a filled gold star
  for the star bank; new `--star` and `--star-soft` color tokens; the star
  ring and redeem rain named as allowed motion beside the daily confetti.
- **STRUCTURE.md:** the `src/lib/rewards/` homes and the rewards notes (a new
  `docs/structure/rewards.md` if it runs long).
- **Habits plan:** decision 99 ("confetti has no words") is replaced by the
  approved line.

## Small questions saved for the start of each PR (with a mock)

- R1: the star value steps (suggest 1 to 5, then 10, 15, 20, 25, 50).
- R2: the all-done wording; whether the animation switch also silences the
  daily confetti.
- R3: the emoji list (there is no cake pop emoji; cupcake and lollipop are
  closest); reward cost steps; the phone layout (people stacked, or one
  person at a time).
- R4: the lockout wording, and whether 5 tries and 5 minutes feel right.

## Verification (every PR)

- `npx tsc --noEmit`, `npx eslint .`, `npm test` (confirm the test count
  went up), `npm run build`.
- Both timezones, with the new folder:
  `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- Review migration SQL before applying: write the migration file by hand
  (or `prisma migrate diff` to print it), read it, then apply with
  `npx prisma migrate deploy`. Never `prisma migrate dev` (on drift it offers
  to reset the dev branch); additive only. Stage files by explicit path; `git show --stat HEAD` after
  each commit.
- Avengers gates: Vision (correctness), Strange (design, with screenshots on
  phone and iPad sizes), Captain (structure).
- In the running app (dev server, dev database):
  - R1: a parent sets stars and a kid login cannot; check, un-check and a
    Together habit move the right banks; late setting pays full, half or
    none; a skip pays nothing; a Winnie check then undo returns the bank.
  - R2: the stars land on the right person on the iPad family view; fast
    taps are never blocked; switch off or Reduce Motion means no flight.
  - R3: redeem, celebration, Undo redeem, a repeatable bar restarting,
    Earned and Hide earned; un-check afterward and the bank goes negative.
  - R4: tablet and kid are asked for the PIN, a parent's phone is not; five
    wrong tries locks; switch off removes the prompt.
  - R5: bonus and take-away show in history; private habit names stay hidden.
- After each merge: `git log origin/main..HEAD` is empty and the production
  deploy is checked. Bryce's phone and tablet test items go in
  `.avengers/status.md`.
