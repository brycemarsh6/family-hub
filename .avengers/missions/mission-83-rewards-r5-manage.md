# Mission: Rewards R5, Manage rewards, bonus stars and star history

**Project:** family-hub (Marshee)
**Status:** AT-THE-GATES
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
- **Status:** DONE, commit de63305
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
- **Report:** DONE at de63305 (19 files, all may-touch). Migration SQL
  hand-written (shadow DB needed for `migrate diff`): one CREATE TABLE, one
  index, two foreign keys (Cascade on userId, SetNull on createdById);
  `migrate deploy` applied only it on the dev host. Tests Denver 2224 to
  2248, UTC 2214 to 2238 pass (+24, same 10 DST skips); tsc, eslint, build,
  both greps clean. Probe: bank 2, 7 with a +5 "zz r5 probe", history and
  Recent showed it, a device target refused, deleted by id, bank 2, 0 rows
  left. Notes: minus amounts use an ASCII hyphen ("-20") through
  `signedStarsText`/`amountText`; new `formatWeekdayShortDate` in
  householdDate.ts; `rewardVocabulary.ts` is 292 lines (near rewards.md's
  ~300 split note); `getStarHistory` returns one error word for every
  failure.

### C2 - The Manage page, the history sheet and the Rewards page links (UI)
- **Status:** DONE, commit f102738
- **Objective:** build the approved screens on top of C1.
- **Boundaries:** may touch: new `src/app/(app)/rewards/manage/page.tsx`,
  new `src/components/RewardsManage.tsx` (layout and sheet state), new
  `src/components/StarAdjustForm.tsx`, new
  `src/components/RewardActivityList.tsx`, new
  `src/components/StarHistorySheet.tsx`, one new person-pick chip component
  only if no existing one fits (check `src/components/ReportPersonChips.tsx`
  first), `src/app/(app)/rewards/page.tsx` (the Manage button, parents and
  admins only), `src/components/RewardsBoard.tsx` (the wide bank as a
  button opening history, the phone history link, the sheet),
  `src/lib/rewardVocabulary.ts`, `src/lib/rewardVocabulary.test.ts` (new
  words in the R5 block) · must not touch: R4's files (C1's list), C1's
  lib and action files (call them; if one needs a change, report
  BLOCKED-ON-CONTRACT), `src/components/StarBank.tsx`,
  `src/components/RewardPersonChips.tsx` (both imported by RewardsBoard,
  unchanged), `docs/`, `DESIGN.md`, `STRUCTURE.md`.
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
- **Evidence required:** Gauntlet tails, the page's guard code and the
  action guards, a dev-server check that `/rewards/manage` renders for a
  signed-out request only as the sign-in redirect, and a list of any "zz r5"
  dev rows made, for cleanup. Screenshots are Strange's job.
- **Done criteria:** Strange's screenshots match the approved mock; no
  R4 file in `git diff --stat main`.
- **Report:** DONE at f102738 (9 files, all may-touch; no R4 file).
  Gauntlet green (Denver 2248/2248, UTC 2238 + 10 DST skips; added
  assertions, not tests), build lists `/rewards/manage`; signed out it
  redirects to `/login`. Inline person chips (ReportPersonChips are links,
  RewardPersonChips draw StarBank); RewardSheet-style 48px radio tiles for
  Give / Take away. Not run: the signed-in checks (no dev login), left to
  Strange. Flags: colour emoji now also on Manage's wish and Recent rows and
  history redeem lines (DESIGN.md exception to widen, Fury); no "zz r5" rows.

### F0 - The history's check rows come from the habit reader (Fury's pre-gate catch)
- **Status:** DONE, commit d06fcb3
- **Objective:** `starHistoryRead.ts` stops querying `HabitLog`/`Habit`
  itself; the rows come from a new export in `habitsStatsRead.ts`, so the
  habit tables keep their two readers (docs/structure/habits.md, "A third
  reader is a BLOCKER").
- **Boundaries:** may touch: `src/lib/habitsStatsRead.ts` (one new export,
  `loadStarLogs(userId, from)` returning the same `select` C1 uses),
  `src/lib/starHistoryRead.ts` (call it), `src/lib/starHistoryRows.ts`
  (types only if needed) · must not touch: everything else.
- **Verification:** the Gauntlet green, same counts as C2; `grep -n
  "habitLog\|db.habit" src/lib/starHistoryRead.ts` prints nothing.
- **Evidence required:** the diff, the Gauntlet tails, the grep.
- **Done criteria:** Fury reads the diff; no behaviour change.
- **Report:** DONE at d06fcb3: `loadStarLogs(userId, from)` in
  habitsStatsRead.ts, called by starHistoryRead.ts; Gauntlet same counts;
  the habitLog grep empty.

### F1 - One "Sat, Nov 21" formatter (Fury's pre-gate catch)
- **Status:** DONE, commit d2ac530
- **Objective:** `feedbackTimeLabel` builds its date with C1's
  `formatWeekdayShortDate` instead of its own copy of the same pattern
  (STRUCTURE.md's date-formatter homes; the R3 screensaver precedent).
- **Boundaries:** may touch: `src/lib/feedbackTime.ts` · must not touch:
  everything else (its test must pass unchanged).
- **Verification:** the Gauntlet green, same counts; `feedbackTime.test.ts`
  unchanged and passing in both zones.
- **Evidence required:** the diff and the Gauntlet tails.
- **Done criteria:** output unchanged (the existing tests pin it).
- **Report:** DONE at d2ac530: one import line and one return line;
  `feedbackTime.test.ts` unchanged and passing in both zones; same counts.
- **Fury's in-app check (2026-11-25, dev server on 3000, dev branch,
  signed in as Bryce, a parent):** Rewards shows Manage and "Bryce's star
  history" under the chips (phone width). Manage renders the three
  sections; Give Ledger 5 with note "zz r5 fury": Recent shows "Bonus: zz r5
  fury / Ledger · +5 from Bryce · Today" with Undo, and Ledger's chip bank
  went 0 to 5. Ledger's history sheet: "Ledger's stars", "5 stars", Today,
  "Bonus from Bryce" / "zz r5 fury" +5, the footer, Done. **Test data left
  for the gates:** that one adjustment (note "zz r5 fury"); Fury removes it
  after the gates.

### F2 - Gate fixes, pass 1 (Captain, Strange, Vision notes)
- **Status:** DONE, commit fa8833c
- **Objective:** fix every pass-1 code blocker and the cheap notes in one
  batch, so pass 2 re-gates once.
- **Boundaries:** may touch: `src/components/RewardActivityList.tsx`,
  `src/components/StarAdjustForm.tsx`, `src/components/RewardsBoard.tsx`,
  `src/lib/rewardVocabulary.ts`, `src/lib/rewardVocabulary.test.ts`,
  `src/lib/rewards/starAdjustments.ts`,
  `src/lib/rewards/starAdjustments.test.ts` · must not touch: R4's files
  (C1's list), `src/lib/useOptimisticRun.ts` (use it), docs, every other
  file.
- **What to fix:**
  1. (Captain BLOCKER) `RewardActivityList.tsx`: drop its own error state
     and `useTransition`; use `useOptimisticRun<string>` (hide the row as
     the change; `run(key, action, () => router.refresh(), restore)` where
     restore brings the row back). A thrown action now shows `SAVE_FAILED`
     and restores the row.
  2. (Strange BLOCKER) `StarAdjustForm.tsx`: add `placeholder:text-muted`
     to the note input.
  3. (Strange BLOCKER) `RewardsBoard.tsx`: the wide column bank button
     looks tappable: `gap-1 border border-line` (the Manage button's
     outline, still 48px) and a `ChevronRight` (16, `text-muted`,
     aria-hidden) after the `StarBank`.
  4. (Strange NOTE) `StarAdjustForm.tsx`: the chip row wraps from 48rem
     (`@min-[48rem]:flex-wrap`) so every person shows in the narrow left
     column.
  5. (Strange NOTE) `RewardActivityList.tsx`: a redeem with no picture uses
     the outline `Gift`, not `Star`.
  6. (Captain NOTE) `rewardVocabulary.ts`: delete `ADJUSTING_LABEL`, use
     `REWARD_SAVING_LABEL`.
  7. (Captain NOTE) move `ADJUST_NOTE_MAX` into `rewardVocabulary.ts` and
     build `ADJUST_NOTE_REFUSAL` from it; `starAdjustments.ts` imports it.
  8. (Captain and Vision NOTE) `StarAdjustForm.tsx`: wrap the save in
     `useOptimisticRun`'s `run(null, ...)` (no on-screen change) so a
     network failure shows `SAVE_FAILED` instead of the error page; keep
     the "Saving…" button state and the reset of the note on success.
  9. (Vision and Strange NOTE) the wide bank button's label includes the
     count, e.g. "Ledger's star history, 5 stars" (word function in the
     vocabulary, using `starCountText`); each Recent Undo gets an
     `aria-label` naming its row, e.g. "Undo: Bonus: zz r5 fury" (word
     function in the vocabulary).
- **Verification:** the Gauntlet green (counts may rise with the new word
  tests); `grep -n "useTransition" src/components/RewardActivityList.tsx`
  prints nothing.
- **Evidence required:** per-item file:line, Gauntlet tails both zones,
  `git show --stat HEAD`.
- **Done criteria:** pass-2 gates.
- **Report:** DONE at fa8833c (7 files, all may-touch). All nine items
  made: RewardActivityList and StarAdjustForm on `useOptimisticRun`;
  placeholder muted; wide bank button outlined with a chevron; chips wrap
  from 48rem; Gift for a no-picture redeem; `ADJUSTING_LABEL` gone;
  `ADJUST_NOTE_MAX` moved to the vocabulary with the refusal built from it
  (Fury dropped it from rewards.md's `starAdjustments.ts` list);
  `historyBankLabelText` and `recentUndoLabelText`. Denver 2248/2248, UTC
  2238 + 10 skips; tsc clean; eslint run on `src` only and build not run
  (pass-2 Vision runs both).

### F3 - Gate fixes, pass 2 (Vision, Strange; Bryce's header call)
- **Status:** DISPATCHED
- **Objective:** Recent's Undo hides the row the moment it is tapped, and
  the wide column header never cuts a name.
- **Boundaries:** may touch: `src/components/RewardActivityList.tsx`,
  `src/components/RewardsBoard.tsx` · must not touch: everything else
  (`src/lib/useOptimisticRun.ts` included).
- **What to fix:**
  1. (Vision BLOCKER) `RewardActivityList.tsx`: `const [optimisticLines,
     hide] = useOptimistic<RecentLine[], string>(lines, (list, key) =>
     list.filter((l) => keyOf(l) !== key))`; pass `hide` to
     `useOptimisticRun<string>(hide)`; render `optimisticLines` minus the
     `gone` set; `run(key, action, () => { add key to gone;
     router.refresh(); })` with no `onError` restore (useOptimistic drops the
     hide itself when the transition ends on an error or a throw). The
     `gone` set, added to only on success, keeps the row hidden until the
     refreshed lines arrive.
  2. (Strange BLOCKER, Bryce's call 2026-11-25: "Bank on its own line")
     `RewardsBoard.tsx` wide header: first line avatar and the full name
     (wrapping, never truncated); second line the bank button (outline,
     48px, `StarBank` plus `ChevronRight`, its label unchanged), left
     aligned under the name. Phone layout unchanged.
- **Verification:** the Gauntlet green, same counts.
- **Evidence required:** the diff, the Gauntlet tails, `git show --stat HEAD`.
- **Done criteria:** pass-3 gates (each gate's last pass).
- **Report:** (pending)

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision (HEAD 1c11de5; Denver 2248/2248, UTC 2238 + 10 DST skips) | PASS | none | Read-only dev probes: bank counts adjustments (Ledger 0 + 5 - 10 = -5, below zero works); forged and non-string ids refused; device/unknown targets refused by HOUSEHOLD_PERSON_WHERE; note 60 code points ok, 61 refused; 30-day edges right in both zones; Recent 100 cap merge correct; the redeem transaction sees adjustments (same tx client). NOTES: RewardActivityList Undo does not restore the row if the action call itself rejects (offline); Done item 8 only partly met while R4 is open, plan file not updated yet; minus shown as ASCII hyphen; the wide bank button's label hides "N stars" from screen readers; `nextAdjustStep(Infinity)` gives 5; sync schema.prisma with R4 before merging; dev rows "zz r5 fury" (+5) and "zz r5 strange take" (-10) to clean |
| 1 | Captain (HEAD 1c11de5) | BLOCKED | (1) RewardActivityList.tsx:19-42 hand-writes the optimistic tap (STRUCTURE.md: `useOptimisticRun` is its only home), and loses the row on a network throw; (2) rewards.md:30 "nextStarStep is the only stepper walk" and :200 "HabitStarsField is the only stars stepper" now false (doc, Fury); (3) layout.md "Wide pages" lacks Manage rewards (doc, Fury) | Homes all correct; one bank sum holds; no loading.tsx needed in manage/; amendments: formatWeekdayShortDate needs "zone-explicit" plus CalendarSearch's browser twin; "one write module per table" wrong (rewardWrites writes two); DESIGN.md emoji wording to name Recent rows exactly; NOTES: outline star in text-star by the stepper; `ADJUSTING_LABEL` duplicates `REWARD_SAVING_LABEL`; `ADJUST_NOTE_MAX` vs the typed "60" in the refusal; StarAdjustForm could use `run(null, ...)`; three person-chip drawings; vocabulary is 194 code lines. Fury's doc fixes (2), (3) and the amendments made, uncommitted while Strange runs |
| 1 | Strange (HEAD 1c11de5; 390, 820 portrait, 1180; light and dark forced and verified) | BLOCKED | (1) note placeholder 2.39:1 (no `placeholder:text-muted`); (2) wide bank is the iPad's only door to history but looks like a plain number (tappable looks tappable); (3) DESIGN.md does not record `--danger` for history minus amounts (doc, Fury) | Flows seen: stepper 1 to 50, take -10 to a -5 bank and Undo, a redeem in history and Recent and Undo, Escape and dim close; targets 48px (BackLink 44); amounts 5.75/6.44 light, 8.39/6.41 dark; empty states true. NOTES: Manage chips at 820 hide two people (wrap from 48rem); no-picture redeem uses Star like a bonus (Gift); stepper star outline in --star; ASCII minus; optimistic Undo needs a named exception; bank button label hides the count; Undo labels all "Undo"; wishes and kid/tablet not exercisable. Strange's test rows made and removed through the app |
| 2 | Captain (HEAD c60fed8) | PASS | none | Pass-1 blocker fixed (RewardActivityList on useOptimisticRun); doc fixes and amendments all true. NOTES (Fury applied): rewards.md "a third is a BLOCKER" scoped to STAR_STEPS steppers (RewardSheet's cost stepper is not one); Words paragraph names ADJUST_NOTE_MAX; DESIGN.md wish wording. Others: the hook comment could say "or a state setter"; rewardVocabulary.ts 200 code lines (R4 words next); rewards.md 193 to 237; sync shared files with main before merging |
| 2 | Vision (HEAD c60fed8; Denver 2248/2248, UTC 2238 + 10 skips; eslint whole repo, build OK) | BLOCKED | RewardActivityList.tsx:21-22 feeds `useOptimisticRun` a plain `useState` setter; inside the async transition React 19.2.4 holds that update until the action ends, so the row stays (Undo still live) for the whole round trip, breaking "instant optimistic updates" and DESIGN.md's new Undo exception. Fix: `useOptimistic` hide plus a `gone` set added on success | All doc claims true; StarAdjustForm's `run(null, ...)` correct; bank button opens history, data-star-bank unchanged; word functions right |
| 2 | Strange (HEAD c60fed8; 390, 820 portrait, 1180; light and dark verified) | BLOCKED | F2's wider bank button (52 to 74px) truncates names in wide column headers ("Led…", "Elea…" at 820 and 1180); names tell people apart (two L and two E avatars) | Pass-1 blockers fixed (placeholder 5.38/6.12; bank button outlined and opens history; colours recorded). Chips wrap, all 5 show; Gift on a no-picture redeem; aria-labels right; the Undo row left at once on a local server (Vision's finding is about the round trip; local is near-instant). Even Strange's tighter one-row fix truncates once banks reach 3 digits: **Bryce chose (2026-11-25) the bank on its own line under the name.** DESIGN.md wording notes applied by Fury. Out of scope: R3's Add button looks pale with a name typed. Test reward "zz r5 gift" made, redeemed, undone and deleted |

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
