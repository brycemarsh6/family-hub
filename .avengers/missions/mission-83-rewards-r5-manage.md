# Mission: Rewards R5, Manage rewards, bonus stars and star history

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-11-25 · **Updated:** 2026-11-25
**Branch:** `claude/rewards-r5-manage-history-b55a63`, cut from main at
b4e32c8 (R1 PR #124, R2 PR #125, R3 PR #126 merged). R4 (mission 82) runs at
the same time in its own session and branch.

## Brief

- **Goal:** Fifth and last PR of `.avengers/plans/rewards-v1.md`
  (decisions 12 and 15). A new table `StarAdjustment` (person, signed
  amount, note, who gave it, when) is added into the star bank. A new page
  `/rewards/manage` for parents and admins shows wishes waiting for a cost
  (rewards with no cost), recent redemptions with Undo redeem (R3's
  action), and give or take stars with a note, set by +/- steppers only. A
  person's star history (checks, redemptions, adjustments) opens from
  their star bank; a private habit's name is hidden from anyone who cannot
  see that habit.
- **Done means:**
  1. A parent gives stars to a person with a note: that person's bank goes
     up by exactly that amount everywhere a bank shows, and the history
     shows the line with the note.
  2. A parent takes stars away the same way: the bank goes down (it may go
     below zero) and history shows it.
  3. Manage lists wishes (null cost) and recent redemptions; Undo redeem
     there puts the stars back and removes the redemption.
  4. Star history lists checks, redemptions and adjustments, newest first;
     a private habit's name shows only to people who can see that habit.
  5. Kids and the tablet cannot reach Manage or write an adjustment (the
     action refuses them, not just the page).
  6. The bank sum stays in `loadStarBanks` only; `shownBanks` stays the
     only shown-bank number.
  7. Gauntlet green in both timezones; Vision, Strange and Captain PASS.
  8. CLAUDE.md marks the Rewards plan finished.
- **Out of scope:** the parent PIN, kid and tablet redeem, wishes being
  created (R4 owns those, and owns `src/app/actions/rewards.ts`,
  `src/lib/rewardWrites.ts`, `RedeemSheet.tsx`, `RewardSheet.tsx`,
  `src/lib/tabletRules.ts`, `RewardsSettings.tsx`,
  `src/app/actions/rewardSettings.ts`, `src/lib/rewardSettingsRead.ts`:
  R5 never edits them); Winnie endpoints for rewards; a Stars dashboard
  widget; stars for hours habits and Calendar tasks.

## Danger register

Same as AGENTS.md, plus:
- `.env` is a symlink to the main checkout's `.env`; its `DATABASE_URL`
  host was checked as the Neon dev branch
  (`ep-hidden-pine-a6ajzk11-pooler`) on 2026-11-25. Never print `.env`
  beyond the hostname.
- **One migration, additive only**: folder
  `prisma/migrations/20261126100000_star_adjustments` (one new table). It
  must sort after R4's `20261126000000_reward_pin`. SQL is shown and read
  before it is applied with `npx prisma migrate deploy`. **Never
  `prisma migrate dev`** and never `db:seed` / `db:reset`. No clean or
  reset script for `User`.
- Stage by explicit path; `git show --stat HEAD` after each commit. Leave
  the untracked `.agents/` and `.codex/` folders out. No direct pushes to
  `main`; builders never push.
- Test data only through the app or a scoped scratchpad script that checks
  the dev host first and deletes only rows it made (exact "zz r5" notes or
  titles).

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (count goes up)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- `npm run build`
- `grep -rn "@/app" src/lib/` prints nothing
- `grep -n "import.*habit" src/lib/rewards/*.ts` prints nothing (no habits import in the pure rewards folder)

## Assembled

- Stark + Vision (always).
- Strange: a new page, a history view and a give or take sheet.
- Captain: a new table with its reader and writer, new read and write
  modules, new components.
- Banner: one brief on the code R5 builds on (bank, R3's undo, habit
  privacy rule, page patterns).

## Bryce's decisions (2026-11-25, from the mock, all "as mocked")

- **Manage page:** a parent-only "Manage" button at the top of Rewards
  opens `/rewards/manage` (BackLink "Rewards"), title "Manage rewards",
  three sections: **Give or take stars** (on the page, no sheet),
  **Wishes waiting for a cost (N)**, **Recent** (last 30 days:
  redemptions and bonus or taken stars, newest first, each with a one-tap
  **Undo**). Phone stacks them; wide (48rem container) is two columns:
  Give or take plus Wishes on the left, Recent on the right.
- **Give or take:** person chips (opens on the first kid, else the first
  person), Give / Take away, amount on `STAR_STEPS` (1, 2, 3, 4, 5, 10,
  15, 20, 25, 50) starting at 5 with the +/- stepper, optional note up to
  60 letters ("What for? (optional)"), button "Give (name) (N) stars" or
  "Take (N) stars from (name)". A take-away may push a bank below zero.
- **Wishes:** each row shows the picture, title and "(name)'s wish" with
  **Set cost**, which opens the existing reward sheet for that reward.
- **Recent wording:** "(title) redeemed" / "(name) · (cost) stars ·
  (day)"; "Bonus: (note)" or "Bonus stars" / "(name) · +N from (giver) ·
  (day)"; "Taken away: (note)" or "Stars taken away" / "(name) · −N from
  (giver) · (day)". Day is "Today", "Yesterday" or "Sat, Nov 21".
- **Star history:** a sheet titled "(name)'s stars" with the bank, the last
  30 days newest first, grouped by day ("Today", "Yesterday", "Sat, Nov
  21"), amounts with + (accent) or − (danger). Lines: a check is the
  habit's name; a late check adds **"Late"** under it (Bryce, 2026-11-25:
  the app never stored whether Full or Half applied, so "Late, half stars"
  could lie); a habit the viewer cannot see is **"A private habit"**; a
  bonus is "Bonus from (giver)" with the note under it; a take-away is
  "Taken away by (giver)" with the note; a redeem is the picture plus
  "Redeemed (title)". Checks that paid no stars are left out. Footer:
  "Showing the last 30 days. Older stars still count in the total." Done
  button. Everyone (kids and the Tablet too) may open anyone's history.
- **History opens from the Rewards page only:** wide, tap a person's star
  bank at the top of their column; phone, a "(name)'s star history" link
  under the chips. Habits & Chores banks unchanged.

## Contracts

Order: C1, then C2. Fury writes the docs (rewards.md, STRUCTURE.md,
DESIGN.md if needed, CLAUDE.md, status.md, the plan) after C2.

### C1 - StarAdjustment table, the bank, rules, reads, writes and actions (no UI)
- **Status:** PENDING
- **Objective:** add the `StarAdjustment` table and every server and pure
  piece R5's screens need, with tests, and no UI.
- **Boundaries:** may touch: `prisma/schema.prisma` (the model and two
  User back-fields; the schema is exempt from the size cap, STRUCTURE.md),
  new `prisma/migrations/20261126100000_star_adjustments/migration.sql`,
  new `src/lib/rewards/starAdjustments.ts`, new
  `src/lib/rewards/starAdjustments.test.ts`, new
  `src/lib/rewards/starHistory.ts`, new `src/lib/rewards/starHistory.test.ts`,
  new `src/lib/starHistoryRows.ts`, new `src/lib/starHistoryRows.test.ts`
  (top of `src/lib/`, so it may import `src/lib/habits/access.ts`), new
  `src/lib/starHistoryRead.ts`, new `src/lib/starAdjustmentWrites.ts`, new
  `src/app/actions/starAdjustments.ts`, new `src/app/actions/starHistory.ts`,
  `src/lib/starBankRead.ts` (the adjustment sum only),
  `src/lib/rewards/access.ts`, `src/lib/rewards/access.test.ts` (one new
  `canAdjustStars`), `src/lib/rewardVocabulary.ts`,
  `src/lib/rewardVocabulary.test.ts` (new words only, in an "R5" block),
  `src/lib/householdDate.ts`, `src/lib/householdDate.test.ts` (only if no
  "Sat, Nov 21" formatter exists) · must not touch:
  `src/app/actions/rewards.ts`, `src/lib/rewardWrites.ts`,
  `src/components/RedeemSheet.tsx`, `src/components/RewardSheet.tsx`,
  `src/lib/tabletRules.ts`, `src/components/RewardsSettings.tsx`,
  `src/app/actions/rewardSettings.ts`, `src/lib/rewardSettingsRead.ts` (R4
  owns them), `src/components/`, `src/app/(app)/`, `src/lib/habits/`,
  `docs/`, `package.json`.
- **What to build:**
  1. Model `StarAdjustment`: `id` cuid, `userId` (relation
     `"starAdjustments"`, Cascade), `amount Int` (signed, never 0), `note
     String?` (trimmed, null when empty), `createdById String?` (relation
     `"starAdjustmentsMade"`, SetNull), `createdAt DateTime @default(now())`,
     `@@index([userId, createdAt])`. Two User back-fields beside the reward
     ones. Write the migration SQL by hand or with `npx prisma migrate diff`
     (from the migrations folder to the schema), **print it in the report**,
     read it (one CREATE TABLE, its index, two foreign keys; nothing
     dropped or altered), then `npx prisma migrate deploy` and
     `npx prisma generate`. **Never `prisma migrate dev`.**
  2. `loadStarBanks` adds `starAdjustment.groupBy` `_sum.amount` per user
     inside its existing `Promise.all` and the same `client`. No other bank
     sum anywhere.
  3. `rewards/starAdjustments.ts` (pure): `ADJUST_DEFAULT_STARS = 5`;
     `nextAdjustStep(amount, dir)` walks `STAR_STEPS` and stays inside 1 to
     50 (never null); `ADJUST_NOTE_MAX = 60`; `toAdjustmentInput(raw)` checks
     a give or take direction, an amount on `STAR_STEPS`, a string note
     (trimmed, at most 60 characters, empty is null) and returns the signed
     amount or a refusal word. Tests cover the walk ends, off-list amounts,
     note trimming and length, and the sign.
  4. `rewards/starHistory.ts` (pure, no habits import): takes plain entries
     (`kind` check | late | redeem | bonus | take, `amount` signed, `at`
     sort key, `dayKey` "YYYY-MM-DD", `dayText` already formatted, `title`
     or `nameHidden`, giver name, note, emoji) plus `todayKey` and
     `yesterdayKey`, and returns days newest first with labels ("Today",
     "Yesterday", else `dayText`) and display lines in the approved wording
     (see Bryce's decisions); also the Recent list's lines (title and sub
     line). Every word comes from `rewardVocabulary.ts`. Tests cover each
     kind's wording, grouping and order, the private name, no-note bonus and
     take-away.
  5. `starHistoryRows.ts` (pure, top of `src/lib/`): turns read rows into
     those entries for a viewer (`HabitActor`), using `canSeeHabit` from
     `habits/access.ts` for `nameHidden` (participant ids from the habit),
     and the household-zone day for redemptions and adjustments
     (`calendarDateInZone` with `HOUSEHOLD_TIME_ZONE`) and
     `calendarDateFromUtcMidnight` for logs. Tests: a private habit's name
     is hidden from a non-participant and from the device role, shown to a
     participant; a late log becomes kind late; a redemption at 11:30 PM
     Denver lands on the Denver day in both TZ runs.
  6. `starHistoryRead.ts` (`server-only`, no auth): `loadStarHistory(userId,
     viewer, now)` reads the last 30 Denver days (today plus 29 before) of
     that user's `HabitLog` rows with `stars` not null (selecting only
     `day`, `status`, `stars`, `createdAt` and the habit's title, isPrivate
     and participant user ids), their redemptions and adjustments (with the
     giver's display name), and returns `starHistory` days.
     `loadRecentActivity(now)` reads the household's last 30 days of
     redemptions and adjustments (person name, giver name) for Manage,
     newest first, capped at 100 rows.
  7. `starAdjustmentWrites.ts` (`server-only`, no auth, no
     `revalidatePath`): `addStarAdjustment({ userId, amount, note,
     createdById })` refuses (returns a refusal, no throw) a `userId` that is
     not an active household person (not a device login); `removeStarAdjustment(id)`
     is `deleteMany` (already gone is fine).
  8. `actions/starAdjustments.ts` (`"use server"`): `giveOrTakeStars(raw)`
     and `undoStarAdjustment(id)`. Each calls `getVerifiedUser()` and
     `canAdjustStars(user.role)` itself, refuses non-string ids (the R3
     forged `{ not: "" }` blocker), runs `toAdjustmentInput`, writes, then
     `revalidatePath` for `/rewards`, `/rewards/manage` and `/habits`.
     `canAdjustStars` in `rewards/access.ts` is `MANAGER_ROLES` (refuses kid
     and device).
  9. `actions/starHistory.ts` (`"use server"`): `getStarHistory(userId)`:
     any verified login (kids and the Tablet included), a string id of an
     active household person, returns `{ name, bank, days }` from
     `loadStarHistory` and `loadStarBanks([userId])`, else an error word.
- **Verification:** the whole Gauntlet (mission file) green; Denver and UTC
  test counts both go up; the habits-import grep on `src/lib/rewards/`
  prints nothing; `git diff --stat main` names only may-touch files.
- **Evidence required:** the migration SQL, the `migrate deploy` output
  (applied, host is the dev branch; name only the hostname), test counts
  before and after in both zones, tsc/eslint/build tails, both greps, and a
  scratchpad probe against the dev database (dev host checked first) that
  adds a "zz r5 probe" +5 adjustment for one person, shows `loadStarBanks`
  rise by 5, deletes it by id, and shows the bank back.
- **Done criteria:** Fury re-reads the diff: one bank sum, no habits import
  in `src/lib/rewards/`, actions check roles themselves, no R4 file
  touched, the probe row gone.
- **Report:** (pending)

### C2 - The Manage page, the history sheet and the Rewards page links (UI)
- **Status:** PENDING (after C1)
- **Objective:** build the approved screens on top of C1.
- **Boundaries:** may touch (new): `src/app/(app)/rewards/manage/page.tsx`,
  `src/components/RewardsManage.tsx` (layout and sheet state),
  `src/components/StarAdjustForm.tsx`, `src/components/RewardActivityList.tsx`,
  `src/components/StarHistorySheet.tsx`, and one person-pick chip
  component only if no existing one fits (check `ReportPersonChips.tsx`
  first). May touch (edit, small): `src/app/(app)/rewards/page.tsx` (the
  Manage button, parents and admins only), `src/components/RewardsBoard.tsx`
  (the wide bank as a button opening history, the phone history link, the
  sheet), `src/lib/rewardVocabulary.ts` (new words in the R5 block).
  **Must not touch:** R4's files (C1 list), C1's lib and action files
  (call them), `StarBank.tsx`, `RewardPersonChips.tsx`, docs.
- **What to build:**
  1. `/rewards/manage`: `requireVerifiedUser()`, then
     `canManageRewards(user.role)` or `redirect("/rewards")`; wide page
     (`data-page-width="wide"`), `BackLink href="/rewards" label="Rewards"`,
     title "Manage rewards". Loads people, banks, rewards
     (`loadRewards`, wishes are `cost === null`), `loadRecentActivity`.
     The existing `rewards/loading.tsx` covers it.
  2. `RewardsManage.tsx`: one `@container`; stacked below 48rem, two
     columns from 48rem (container variant, never a screen breakpoint).
     Section headings and counts as approved.
  3. `StarAdjustForm.tsx`: person chips, a two-way Give / Take away choice
     (the app's existing segmented pattern), `LadderStepper` with
     `nextAdjustStep`, a 60-character note input, the primary button; calls
     `giveOrTakeStars`; on success resets the note, keeps the person, and
     the page refreshes (the action revalidates). Errors show inline in the
     app's error style. 48px targets.
  4. Wishes: rows with the emoji, title, "(name)'s wish" and **Set cost**,
     which opens `RewardSheet` as-is with that reward (same props the
     board passes). Empty: hide the section's list and show "No wishes
     waiting." (word in vocabulary).
  5. `RewardActivityList.tsx`: Recent rows (emoji for a redeem, an outline
     Lucide `Star` for bonus or take), Undo: a redeem calls R3's
     `undoRedeem(id)`, an adjustment `undoStarAdjustment(id)`; the row
     leaves at once (optimistic), comes back with an error on failure;
     `router.refresh()` after success (R3's action does not revalidate
     `/rewards/manage`). Empty: "Nothing in the last 30 days."
  6. `StarHistorySheet.tsx`: the app's bottom-sheet pattern; calls
     `getStarHistory(userId)` on open; shows "(name)'s stars", the bank as
     `starCountText` words (no second `StarBank`, so `data-star-bank` stays
     unique), the days, the footer and Done; a loading line while it loads;
     amounts use `text-accent` for + and `text-danger` for −.
  7. Rewards page: the Manage button (outline style, Lucide icon, 48px)
     beside the page heading for parents and admins; on wide, the column
     header's bank wrapped in a button labelled "(name)'s star history";
     on phone, a link-style button under the chips for the selected person.
     Both open `StarHistorySheet`. No change to `StarBank.tsx`.
- **Verification:** Gauntlet green; dev server: a parent sees Manage, a
  kid and the Tablet do not and get sent back from `/rewards/manage`;
  give and take move the bank and show in Recent and history; Undo on both
  kinds; Set cost opens the sheet; history from both phone and wide.
- **Evidence required:** Gauntlet tails, screenshots at 390 and 1180
  (light), the redirect for a kid login if one is available (else the
  page's guard code and the action guards), and a list of any "zz r5" dev
  rows made, for cleanup.
- **Done criteria:** Strange's screenshots match the approved mock; no
  R4 file in `git diff --stat main`.
- **Report:** (pending)

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-11-25 - Mission opened. `.env` linked (dev branch host confirmed),
  `npm ci` started. Banner dispatched for the research brief. Next: mock
  and questions to Bryce.
- 2026-11-25 - Banner's brief back. Key facts: `loadStarBanks`
  (starBankRead.ts:13) takes a client and sums logs minus redemptions;
  `shownBanks` is in rewards/starDiff.ts:57; `undoRedeem` (actions/rewards.ts:80)
  is callable as-is but revalidates only `/rewards` and `/habits`, so Manage
  refreshes itself; no read of recent redemptions exists (a new reader is
  needed, and rewards.md's "one reader" line must name it); habit privacy is
  `canSeeHabit` in habits/access.ts:18 (pure), so the history's name hiding
  lives in a server read outside `src/lib/rewards/` (the `choreChart.ts`
  precedent) and `rewards/starHistory.ts` takes a plain `nameHidden` flag;
  `RewardView` has `cost: null` for wishes; two `data-star-bank` nodes per
  person on /rewards already (one hidden by CSS). Mock written at
  `.avengers/mocks/rewards-r5-manage-mock.html` and sent to Bryce.

## Delivery

(Not yet.)
