# Mission: Rewards R3, the Rewards page

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-11-24 · **Updated:** 2026-11-24
**Branch:** `claude/rewards-r3-page-d82f23`, cut from main at 7721a1a (PR
#124, R1, merged). R2 (mission 80) runs at the same time in its own
session and branch.

## Brief

- **Goal:** Third PR of `.avengers/plans/rewards-v1.md`. A new drawer row
  **Rewards** (`/rewards`): one column per person (avatar, name, star
  bank) with that person's reward cards below. A card shows a picture,
  title and either a progress bar ("55 of 150") or a Redeem button once
  the bank covers the cost. Redeem opens one sheet: confirm, then the
  celebration (stars rain, "Great work! (reward) redeemed. By (name) for
  (N) stars on (date)", Done and Undo redeem). Repeatable rewards restart
  the bar; a redeemed one-time reward shows Earned (glow plus the word),
  and a Hide earned switch (remembered per device) hides them. Only
  parents and admins add rewards and redeem in R3.
- **Done means:**
  1. A parent adds, edits and deletes a reward (picture or No picture,
     title, cost, Repeatable or One time, whose reward).
  2. Redeem with enough stars lowers that person's bank by the cost,
     shows the celebration, and Undo redeem puts the stars back.
  3. Two quick redeem taps cannot spend twice (one transaction that
     re-reads the bank).
  4. A repeatable reward's bar starts over after a redeem; a one-time
     reward shows Earned, and Hide earned hides it and survives a reload
     on that device.
  5. Un-checking a habit after a redeem takes the bank below zero.
  6. Kids and the tablet see the page with "Ask a parent" and no Add or
     Redeem.
  7. Drawer has the Rewards row; `startPage.test.ts` counts 10.
  8. Gauntlet green in both timezones; Vision, Strange and Captain PASS.
- **Out of scope:** the parent PIN, kid or tablet redeem, wishes (R4);
  Manage rewards, bonus stars, star history (R5); the earn animation
  (R2); Winnie endpoints for rewards; a dashboard Stars tile.

## Danger register

Same as AGENTS.md, plus:
- `.env` is a symlink to the main checkout's `.env`; its `DATABASE_URL`
  host was checked as the Neon dev branch
  (`ep-hidden-pine-a6ajzk11-pooler`) on 2026-11-24. Never print `.env`
  beyond the hostname.
- **One migration, additive only** (two new tables). SQL is shown and
  reviewed by hand before it is applied with `npx prisma migrate deploy`.
  **Never `prisma migrate dev`** and never `db:seed` / `db:reset`. No clean
  or reset script for `User`. If R2 also adds a migration, check folder
  order before merging.
- Stage by explicit path; `git show --stat HEAD` after each commit. Leave
  the untracked `.agents/` and `.codex/` folders out. No direct pushes to
  `main`; builders never push.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- `npm run build`
- `grep -rn "@/app" src/lib/` prints nothing

## Assembled

- Stark + Vision (always).
- Strange: a whole new page, sheets and a celebration.
- Captain: new tables, read and write modules, many new components.
- Banner: one brief on the code R3 builds on (star bank, people and
  avatars, sheets, pickers, nav, wide pages, confetti).

## Bryce's decisions (2026-11-24, from the mock)

- **Phone layout: one person at a time.** A row of person chips (avatar,
  name on the selected chip, star bank) at the top; tap one to see that
  person's rewards. Opens on the signed-in person (the Tablet opens on the
  first person). iPad and other wide screens: one column per person.
- **Cost steps:** 5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150,
  200, 250, 300, 400, 500, 750, 1000.
- **Pictures: the 60 quick picks in the mock, plus "Any emoji"**, which
  opens the iPhone or iPad emoji keyboard so any Apple emoji can be used
  (chosen over a built-in full picker and over the 60 alone). So the
  column stores the emoji itself, not a key. No picture is the first tile.
- **DESIGN.md exception approved** (implied by "use all of the Apple
  emoji" and the "60 tiles + Any emoji" pick, which named the exception):
  colour emoji appear only on reward cards, the redeem sheet and the
  picture picker.
- Mock wording stands: "Redeem (title) for (name)?", "This spends (cost)
  of (name)'s (bank) stars. (left) left after.", "Redeem (N) stars",
  "Cancel", "Great work!", "(title) redeemed.", "By (name) for (N) stars
  on (Weekday, Month D).", "Done", "Undo redeem", "Ask a parent", "Hide
  earned", "Earned", "Add reward", "Repeats" tag, sheet fields Picture,
  Name, Cost, "After it's redeemed" (One time / Repeatable), For.

## Decided by Hill (Bryce away, bypass mode; Opus 5.5 high effort, run as a general agent reading `.claude/agents/hill.md` because the session could not load the hill agent type)

- **H1 (2026-11-25):** with Hide earned on, a person whose rewards are all
  hidden sees "Earned rewards are hidden." (everyone: parents, kids,
  Tablet; parents still get the Add tile). A person with no rewards keeps
  "No rewards yet." Why: the old line was false; DESIGN.md's honest empty
  states. Confidence high.
- **H2:** earned rewards sort to the end of each person's list; the rest
  keep added order. Why: the approved mock puts Earned last; the top of a
  kid's list is what they are working toward. Confidence high.
- **H3:** a negative bank keeps "0 of 5" with an empty bar. Why: the minus
  already shows beside the name and on the chip; "-3 of 5" would confuse a
  kid. Confidence medium. **Bryce should look at this one first** (his plan
  does not settle it); reversal is one line in `progressText`.

## Contracts

Order: C1, then C2 and C3 in sequence (C3 wires C2's sheets into the
page). New rewards default to 20 stars, One time, owner = the column's
person.

### C1 - Reward tables, rules, bank, reads, writes and actions (no UI)
- **Status:** DONE, commit 2cc1a00
- **Objective:** Add `Reward` and `RewardRedemption`, the pure reward
  rules, redemptions in the star bank, the reward read and write modules
  and the guarded Server Actions, with a redeem that cannot double-spend.
- **Boundaries:** may touch: `prisma/schema.prisma`, new
  `prisma/migrations/20261125000000_rewards/migration.sql`,
  `src/lib/rewardVocabulary.ts`, `src/lib/rewardVocabulary.test.ts`,
  `src/lib/rewards/access.ts`, `src/lib/rewards/access.test.ts`, new
  `src/lib/rewards/rewardEmoji.ts`, new `src/lib/rewards/rewardEmoji.test.ts`,
  new `src/lib/rewards/rewardRules.ts`, new `src/lib/rewards/rewardRules.test.ts`, `src/lib/starBankRead.ts`,
  new `src/lib/rewardsRead.ts`, new `src/lib/rewardWrites.ts`, new
  `src/app/actions/rewards.ts` · must not touch: `src/components/`,
  `src/app/(app)/`, `src/lib/nav.ts`, `src/lib/habits/`, any habit read
  or write file, `src/lib/prismaErrors.ts` (import it, don't change it),
  `src/lib/assistant/`, `DESIGN.md`, `STRUCTURE.md`, `docs/`.
- **What to build:**
  - Schema (doc comments on every field, house style):
    `model Reward { id String @id @default(cuid()); ownerId String; owner
    User @relation("rewardsOwned", ..., onDelete: Cascade); title String;
    emoji String? (one emoji, null is No picture); cost Int? (null is a
    wish, R4); repeatable Boolean @default(false); sortOrder Int
    @default(0); createdById String?; createdBy User? @relation(
    "rewardsCreated", ..., onDelete: SetNull); createdAt; updatedAt
    @updatedAt; redemptions RewardRedemption[]; @@index([ownerId,
    sortOrder]) }` and `model RewardRedemption { id cuid; userId String;
    user User @relation("rewardRedemptions", ..., onDelete: Cascade);
    rewardId String?; reward Reward? @relation(..., onDelete: SetNull);
    title String; emoji String?; cost Int (snapshots, never rewritten);
    redeemedById String?; redeemedBy User? @relation("rewardRedemptionsMade",
    ..., onDelete: SetNull); redeemedAt DateTime @default(now());
    @@index([userId]); @@index([rewardId]) }`. Undo redeem deletes the
    row. Back-relation lists on `User`.
  - Migration: write the SQL with `npx prisma migrate diff --from-migrations
    prisma/migrations --to-schema prisma/schema.prisma --script` (check the
    flags in `node_modules/prisma` if they differ), save it, and confirm it
    is only two `CREATE TABLE`, their indexes and foreign keys. No
    `ALTER`/`DROP` on an existing table.
  - `rewardVocabulary.ts` (still no imports; it is 51 lines): `COST_STEPS`
    (Bryce's 20 steps), `CostStep`, `toRewardCost` (off the list is null),
    `DEFAULT_REWARD_COST = 20`, `REWARD_TITLE_MAX = 60`, and the words
    listed in Bryce's decisions above plus refusals: "Give the reward a
    name.", "Pick a cost from the list.", "Pick an emoji, or No picture.",
    "Only parents and admins can do this.", "That reward is gone.",
    "Already earned.", "This reward needs a cost first.", the not-enough
    line built from `starCountText` ("Ellie needs 15 more stars."), and
    the Any emoji words ("Any emoji", hint "Tap the smiley or globe key
    for emoji", refusal "That isn't an emoji."). Test the builders.
  - `rewards/rewardEmoji.ts` (+ test): `REWARD_EMOJI_GROUPS` (the five
    groups of 12 from the mock, in mock order, each item `{ emoji, name }`;
    names as in the mock captions) and `toRewardEmoji(raw: unknown): string
    | null`: a string, trimmed, at most 32 UTF-16 units, exactly one
    grapheme (`Intl.Segmenter` with grapheme granularity), and that
    grapheme is an emoji (`\p{Extended_Pictographic}`, two regional
    indicators, or a keycap with U+20E3). Tests: every list item passes;
    a skin tone, a ZWJ family, a flag and a keycap pass; "a", "1", two
    emoji, "", a number and null fail; spaces are trimmed; 60 items, no
    duplicates.
  - `rewards/access.ts` (+ test): `canManageRewards(role)` (add, edit,
    delete) and `canRedeemRewards(role)` (redeem and undo), each on
    `MANAGER_ROLES`, as two named checks so R4 can widen redeem alone.
  - `rewards/rewardRules.ts` (+ test; pure, imports only vocabulary,
    constants, its own folder): `nextCostStep(cost, dir)` (walks
    `COST_STEPS`, stops at both ends, an off-list cost snaps to the
    nearest step); `isEarned({ repeatable, redeemedCount })`;
    `rewardStatus(reward, bank)` returning `earned` | `wish` | `ready` |
    `saving` with `fraction` (bank clamped at 0, over cost) and the
    "55 of 150" text (a negative bank reads 0); `visibleRewards(rewards,
    hideEarned)`; `redeemRefusal(reward, bank, ownerName)` (string or
    null, earned first, then wish, then not enough); `checkRewardInput(raw)`
    (title trimmed 1 to 60, `toRewardEmoji` or null, cost via
    `toRewardCost` required, `repeatable` boolean, `ownerId` non-empty
    string; returns the clean value or the refusal); `celebrationLines({
    title, ownerName, cost, redeemedAt }, timeZone)` (the three lines, the
    date as "Tuesday, November 24" in the given zone); `redeemConfirmLines`
    (the confirm sheet's question and "This spends..." line).
  - `starBankRead.ts`: `loadStarBanks(userIds, client:
    Prisma.TransactionClient = db)` (the `loadLateStars` shape), and it
    subtracts each person's `RewardRedemption.cost` sum (one `groupBy`).
    Update its header comment. It stays the only bank sum.
  - `rewardsRead.ts` (`server-only`, no auth, header like
    `rewardSettingsRead.ts`): `loadRewards(ownerIds): Promise<RewardView[]>`
    with `RewardView = { id, ownerId, title, emoji, cost, repeatable,
    redeemedCount }`, ordered `sortOrder` then `createdAt`;
    `redeemedCount` from `_count`.
  - `rewardWrites.ts` (`server-only`, no auth, no `revalidatePath`, the
    `pantryWrites.ts` header): `createReward(value, createdById)` (sortOrder
    = the owner's max + 1), `updateReward(id, value)`, `deleteReward(id)`
    (redemptions stay, `rewardId` goes null), `redeemReward(rewardId,
    redeemedById)` and `undoRedemption(id)`. **Redeem** runs in one
    `db.$transaction(fn, { isolationLevel: Serializable })` that reads the
    reward (with owner name and redemption count), reads the bank through
    `loadStarBanks([ownerId], tx)`, asks `redeemRefusal`, then creates the
    redemption with the snapshots. On `isWriteConflictError` it retries,
    at most 3 tries in all; a refusal is returned, not thrown. It returns
    `{ ok: true, redemption: { id, title, emoji, cost, ownerName,
    redeemedAt } }` or `{ ok: false, error }`. `undoRedemption` is a
    `deleteMany` by id (already gone is not an error).
  - `actions/rewards.ts` (`"use server"`, guard form a, the
    `rewardSettings.ts` shape): `saveReward(raw, id?)`, `deleteReward(id)`,
    `redeemReward(rewardId)`, `undoRedeem(redemptionId)`. Refuse unless
    `canManageRewards` / `canRedeemRewards`. `saveReward` refuses an
    `ownerId` that is not in `loadHouseholdPeople()`. Log and return "That
    didn't save. Please try again." on a failed write.
    `revalidatePath("/rewards")` and `revalidatePath("/habits")` after
    every write.
- **Verification:**
  1. Show the migration SQL in the report. Confirm the `.env` host
     (hostname only) is `ep-hidden-pine-a6ajzk11-pooler...`, then
     `npx prisma migrate deploy`, `npx prisma generate`,
     `npx prisma migrate status`.
  2. Full gauntlet; `npm test` and UTC counts before and after (both up).
  3. A throwaway probe script in the scratchpad (not committed) against
     the dev branch, cleaning only what it made: create one reward for an
     existing person with cost 5 and a fixture redemption row so the bank
     is known, fire `redeemReward` twice with `Promise.all` where the bank
     covers only one, and show that exactly one redemption was created;
     then delete every row the probe created and show the counts are back.
     The probe must not touch `User`, `Habit` or `HabitLog`. If the bank
     cannot be set up without a HabitLog, use a person whose bank is
     already high enough for one redeem but not two (read it first), and
     say which.
- **Evidence required:** the SQL; `migrate status`; test names and counts;
  `wc -l` of every touched file; the redeem function's text; the probe
  output (both tries' results and the before/after row counts).
- **Done criteria:** one commit, only boundary files, gauntlet green,
  probe shows one redemption of two tries.
- **Report:** DONE, commit 2cc1a00, 14 files, all in the boundary. Migration
  `20261125000000_rewards` (two CREATE TABLE, three indexes, five foreign
  keys on the new tables only) applied with `migrate deploy`; status up to
  date, 41 migrations. Tests 2174 to 2194 (Denver), UTC 2164 to 2184 pass, 10
  skipped. Probe: two simultaneous redeems at a bank of 2 and a cost of 2
  made exactly one redemption (the other refused "needs 2 more stars"); undo
  put the bank back; probe rows deleted, counts identical. Found by the
  probe: a serialization failure at COMMIT arrives as a bare
  `DriverAdapterError` that `isWriteConflictError` misses, so Stark added a
  local `isCommitConflict` in `rewardWrites.ts` (a second conflict rule:
  C1b moves it). Not-enough line built by `notEnoughStarsText` ("needs 15
  more stars"). `nextCostStep` snaps an off-list cost to the nearest step
  (ties low). `rewardStatus` returns `{ kind, fraction, text }`.

### C1b - One write-conflict rule
- **Status:** DONE, commit 6a2ab0a
- **Objective:** `isWriteConflictError` also recognises a serialization or
  deadlock failure that arrives at COMMIT as a bare `DriverAdapterError`,
  so `rewardWrites.ts` drops its local `isCommitConflict`.
- **Boundaries:** may touch: `src/lib/prismaErrors.ts`,
  `src/lib/prismaErrors.test.ts`, `src/lib/rewardWrites.ts`,
  `src/lib/rewards/access.test.ts` (its stale first-line comment only) ·
  must not touch anything else (C2 is building components at the same time).
- **Verification:** full gauntlet; a new test in `prismaErrors.test.ts`
  for the bare error shape (name `DriverAdapterError`, `cause.originalCode`
  40001 and 40P01 true, another code false); `grep -rn "isCommitConflict"
  src` prints nothing; re-run C1's scratchpad probe and show one redemption
  of two tries again.
- **Evidence required:** the diff, test names and counts, probe output,
  `git show --stat HEAD`.
- **Done criteria:** one commit, only boundary files, gauntlet green.
- **Report:** DONE, commit 6a2ab0a, 4 files. `isWriteConflictError` now
  also matches a bare `DriverAdapterError` with `cause.originalCode` 40001 or
  40P01 (new test); local `isCommitConflict` gone (grep empty). Probe re-run:
  one redemption of two tries, counts identical. Tests 2195 (Denver), UTC
  2185 pass, 10 skipped.

### C2 - The reward sheet, picture picker, redeem sheet and star rain (components only)
- **Status:** DONE, commit 66b7ac9
- **Objective:** The four new client components the page will open, each
  standalone and fed by props.
- **Boundaries:** may touch: new `src/components/RewardSheet.tsx`, new
  `src/components/RewardEmojiPicker.tsx`, new
  `src/components/RedeemSheet.tsx`, new `src/components/StarRain.tsx`,
  `src/lib/rewardVocabulary.ts` (words only, + its test) · must not
  touch: everything C1 made except the vocabulary, `src/app/`,
  `src/lib/nav.ts`, other components, `globals.css`, the docs.
- **What to build:**
  - Sheets hand-roll the shell exactly like `PlanItemSheet.tsx:111-125`
    (`fixed inset-0 z-[60]`, overlay button, `role="dialog" aria-modal`).
  - `RewardSheet.tsx`: props `{ initial?: RewardView; ownerId: string;
    people: { id, displayName }[]; onClose(); }`. Fields in this order:
    Picture (current emoji large, or "No picture", tapping opens the
    picker inline below), Name (text input, max 60), Cost (`LadderStepper`
    showing `starCountText(cost)`, `nextCostStep`, default 20), "After
    it's redeemed" (two 48px tiles One time / Repeatable, `role="radio"`,
    the `RewardsSettings` tile look), For (person tiles, one per person).
    Save calls `saveReward`; Delete (edit only, one tap, no confirm,
    `PlanItemSheet.tsx:251-255` look) calls `deleteReward`. Errors under
    the button. Close on success.
  - `RewardEmojiPicker.tsx`: props `{ value: string | null; onChange(next:
    string | null) }`. The `HabitIconPicker` grid (`flex flex-wrap gap-2`,
    48px tiles, selected `border-2 border-accent bg-accent-soft`): first
    tile No picture, then each group with a small heading and its 12
    emoji (`aria-label` = the name), then an "Any emoji" tile (Lucide
    `Smile` outline + the words). Any emoji shows a text input with the
    hint, `autoFocus`, `enterKeyHint="done"`; on each change take the last
    grapheme and pass it through `toRewardEmoji`: an emoji selects it and
    clears the input, anything else shows "That isn't an emoji." A chosen
    emoji that is not in the list shows as an extra selected tile after
    the groups. Emoji draw at about 1.75rem; sizes in rem.
  - `RedeemSheet.tsx`: props `{ reward: RewardView; ownerName: string;
    bank: number; onClose() }`. Step 1 confirm: the emoji (or nothing),
    `redeemConfirmLines`, primary "Redeem N stars" (pending state, no
    second submit while pending), "Cancel". Step 2 (on `ok`): `StarRain`
    behind, the emoji, `celebrationLines(..., HOUSEHOLD_TIME_ZONE)`,
    "Done" (closes) and "Undo redeem" (calls `undoRedeem`, then closes).
    A refusal shows under the button and stays on step 1.
  - `StarRain.tsx`: `{ run: boolean }`; dynamic `import("canvas-confetti")`
    like `HabitConfetti.tsx`, `shapes: ["star"]`, colours read from the
    `--star` CSS variable at run time, about 2 seconds of falling stars
    from the top, behind the sheet card and never taking taps. Reduce
    Motion (`usePrefersReducedMotion`) means no rain.
- **Verification:** full gauntlet; `wc -l` each new file (soft cap 350).
- **Evidence required:** gauntlet tails, `wc -l`, `git show --stat HEAD`.
- **Done criteria:** one commit, only boundary files, gauntlet green.
- **Report:** DONE, commit 66b7ac9, 4 new components (RewardSheet 220,
  RewardEmojiPicker 124, RedeemSheet 128, StarRain 65 lines). Gauntlet
  green, build exit 0, tests 2195. Not run in a browser (C3 does that).
  Inline words left in the components: "Saving...", "Deleting...",
  "Redeeming...", "Undoing...", "Edit reward", "Reward redeemed" (C3 moves
  them). `redeemReward` revalidates `/rewards`, so the page must keep the
  open RedeemSheet's reward as a snapshot in state and never unmount it
  because the reward became earned or hidden. `RewardSheet` wants
  `people: { id, displayName }[]`.

### C3 - The /rewards page, the board, the cards, the drawer row and the rules docs
- **Status:** DONE, commit 6d3b7d6
- **Objective:** Put it together: the wide `/rewards` page, one person at
  a time on a phone and one column per person when wide, Earned and Hide
  earned, the drawer row, and the design and structure records.
- **Boundaries:** may touch: new `src/app/(app)/rewards/page.tsx`, new
  `src/components/RewardsBoard.tsx`, new `src/components/RewardCard.tsx`,
  new `src/components/RewardPersonChips.tsx`, new `src/lib/hideEarned.ts`,
  `src/lib/nav.ts`, `src/lib/startPage.test.ts`, `src/app/globals.css`
  (a `--star-soft` pair only), `src/lib/rewardVocabulary.ts` (words only),
  `DESIGN.md` (the emoji exception, `--star-soft`, the redeem rain),
  `docs/structure/rewards.md`, `docs/structure/habits.md` (the confetti
  importer line only), `docs/structure/layout.md` (the wide pages list
  only), and word-only edits (moving inline strings into
  `rewardVocabulary.ts`) to `src/components/RewardSheet.tsx`,
  `src/components/RewardEmojiPicker.tsx`, `src/components/RedeemSheet.tsx`
  and `src/components/StarRain.tsx` · must not touch: C1's lib and action files (import them), C2's
  components beyond those word moves (a needed change is reported, not
  made), `CLAUDE.md`, `STRUCTURE.md` (Fury), `prisma/`.
- **What to build:**
  - `page.tsx`: `requireVerifiedUser()`; `loadHouseholdPeople()`,
    `loadStarBanks(ids)`, `loadRewards(ids)` in one `Promise.all`; root
    `<div className="py-2" data-page-width="wide">` (plans page), an h1
    "Rewards"; passes `canManage = canManageRewards(user.role)`,
    `canRedeem = canRedeemRewards(user.role)` and the viewer's id. No
    BackLink (drawer destination).
  - `RewardsBoard.tsx` (client): the Hide earned switch (top right,
    `role="switch"`, 48px tap area) through `useHideEarned()` from
    `hideEarned.ts` (the `lastStore.ts` pattern: localStorage key
    `marshee.rewards.hideEarned`, same-tab event plus `storage`,
    `useSyncExternalStore`, server snapshot false). Narrow container:
    `RewardPersonChips` (selected chip shows avatar, name and bank; the
    others avatar and bank; row scrolls sideways; 48px tall) then the
    selected person's column; starts on the viewer if they are a person,
    else the first person. Wide (container variants per `layout.md`, never
    screen breakpoints): every person's column side by side, no chips.
    Column header: `AvatarBadge`, name, `StarBank`. Then
    `visibleRewards(...)` as `RewardCard`s, then a dashed "Add reward"
    tile when `canManage` (phone: "Add reward for (name)"). Holds the
    sheet state and opens `RewardSheet` (add, or edit on a card tap when
    `canManage`) and `RedeemSheet`. The open redeem sheet keeps a snapshot of
    its reward, owner name and bank in state, so the refresh after a redeem
    (reward now earned or hidden, bank lower) never unmounts it mid-celebration. An empty column says "No rewards yet."
    (parents) or "No rewards yet. Ask a parent to add one." (others).
  - `RewardCard.tsx`: from `rewardStatus`: picture tile (the emoji, or a
    plain tile for No picture), title, a "Repeats" tag when repeatable;
    `saving` shows `ProgressBar` and "55 of 150"; `ready` shows Redeem
    (48px, accent) when `canRedeem`, else "Ask a parent"; `earned` shows
    the glow (2px `--star` ring and the `--star-soft` background) and a
    filled star plus the word "Earned" in `text-fg`; `wish` shows "No cost
    yet". Tapping the card body edits (parents); Redeem opens the redeem
    sheet.
  - `globals.css`: `--star-soft` light and dark (a pale gold for the
    earned card; `--fg` on it measured at 4.5:1 or more in both themes,
    ratios in the comment like the file does), mapped as
    `--color-star-soft`.
  - `nav.ts`: `{ href: "/rewards", label: "Rewards", icon: Gift }` right
    after Habits & Chores. `startPage.test.ts`: ten pages.
  - `DESIGN.md`: (a) the outline-icons rule gains a second exception:
    colour emoji, chosen from `REWARD_EMOJI_GROUPS` or the device's emoji
    keyboard, shown only on reward cards, the redeem sheet and the
    picture picker (Bryce, 2026-11-24); (b) `--star-soft` with its
    ratios, used only for an earned reward; (c) the redeem star rain as
    allowed motion beside the daily confetti, Reduce Motion turns it off.
  - `docs/structure/rewards.md`: the R3 homes as built (tables and their
    one reader and writer each, `loadStarBanks` subtracting redemptions,
    the serializable redeem, `rewardEmoji.ts`, `rewardRules.ts`, the two
    access checks, `hideEarned.ts`, the components and that `StarRain`
    is the second `canvas-confetti` importer). `habits.md`: the confetti
    line names `StarRain.tsx` as the other importer. `layout.md`: add
    `/rewards` to the wide pages list.
- **Verification:** full gauntlet (Denver count +0 or more, the start
  page test now asserts 10). Stark has no browser: the in-app check below
  is Fury's and Strange's, after the commit. In the running app on the dev branch: the
  drawer shows Rewards; as a parent, add a reward, see it on the card,
  edit it, redeem when the bank covers it, see the celebration, Undo
  redeem; a repeatable bar restarts; a one-time reward shows Earned; Hide
  earned hides it and stays after a reload. Phone width (390) and iPad
  landscape (1180). Delete what you created at the end through the app
  (one-tap Delete) and Undo redeem, so the dev banks are back where they
  started. If you cannot sign in as a parent in the browser pane, say so
  and skip the in-app part; never create or change an account.
- **Evidence required:** gauntlet tails, `wc -l`, `git show --stat HEAD`,
  screenshots or a description of each in-app step (or why skipped).
- **Done criteria:** one commit, only boundary files, gauntlet green.
- **Report:** DONE, commit 6d3b7d6, 15 files in the boundary. Gauntlet green,
  build exit 0 (`/rewards` in the route table), tests 2195 (no new tests).
  Hide earned is its own 48px switch (ToggleSwitch is 44px). No
  `rewards/loading.tsx` (not in the boundary; a wide page's loading file
  should be wide from first paint): gate question.
- **Fury's in-app check (2026-11-25, dev server, dev branch, signed in as
  Bryce, a parent):** set test chore `zz m31 plan habit` to 5 stars and
  checked it (bank 2 to 7); added `zz r3 cupcake` (cupcake, 5 stars,
  Repeatable, Bryce). Redeem by **double tap**: one redemption, bank 7 to 2,
  star rain, "Great work! zz r3 cupcake redeemed. By Bryce for 5 stars on
  Wednesday, November 25.", bar restarted at "2 of 5". **Undo redeem**: bank
  back to 7. Edited to One time, redeemed: **Earned** ring and word. **Hide
  earned** on hides it and survives a reload (localStorage "1"; the dev
  server paints the earned card for a moment before hydration). Un-checked
  the chore: **bank -3** (below zero). Phone 375 wide: person chips, the
  selected person's rewards, "Add reward for Bryce". All pass. Noted: R2
  tests on the same dev branch (a `zz m32 together` 2-star log came and
  went mid-test), so bank numbers move under us. Noted for Strange: with
  Hide earned on, a column whose only reward is hidden says "No rewards
  yet." **Test data left for the gates** (reward `zz r3 cupcake`, its one
  redemption, the chore at 5 stars, now un-checked): Fury removes it after
  the gates.

### F1 - Gate fixes, pass 1 (Vision, Captain, Strange) and Hill's calls
- **Status:** DONE 3b0ab71 (2026-11-25)
- **Objective:** Clear every pass-1 blocker and apply H1 to H3, in one
  commit. Fury already made the doc fixes (STRUCTURE.md A1 to A6,
  `docs/structure/rewards.md`).
- **Boundaries:** may touch: `src/app/actions/rewards.ts`,
  `src/lib/householdDate.ts`, `src/lib/householdDate.test.ts`,
  `src/lib/rewards/rewardRules.ts`, `src/lib/rewards/rewardRules.test.ts`,
  `src/lib/rewards/rewardEmoji.ts`, `src/lib/rewards/rewardEmoji.test.ts`,
  `src/lib/rewardVocabulary.ts`, `src/lib/rewardVocabulary.test.ts`, new
  `src/app/(app)/rewards/loading.tsx`, `src/components/RewardsBoard.tsx`,
  `src/components/RewardCard.tsx`, `src/components/RewardPersonChips.tsx`,
  `src/components/RedeemSheet.tsx`, `src/components/RewardEmojiPicker.tsx`
  · must not touch: `DESIGN.md`, `STRUCTURE.md`, `docs/`, `prisma/`,
  `src/components/ToggleSwitch.tsx`, `src/lib/mealPlanDates.ts` (import
  only), `src/lib/rewardWrites.ts`, `src/lib/rewardsRead.ts`,
  `src/lib/starBankRead.ts`, everything else.
- **What to build:**
  1. (Vision) `actions/rewards.ts`: right after each role guard, refuse a
     non-string or empty id: `deleteReward` and `redeemReward` return
     `{ error: REWARD_GONE_REFUSAL }`; `saveReward` does the same when `id`
     is given and is not a non-empty string; `undoRedeem` returns `{}`.
  2. (Captain 5) Replace `import * as writes` with named imports, aliasing
     the collisions: `deleteReward as deleteRewardRow`,
     `redeemReward as writeRedemption`.
  3. (Captain 1) `householdDate.ts`: `formatLongCalendarDate(date:
     CalendarDate): string` ("Tuesday, November 24") from `FULL_DAY_NAMES`
     and `FULL_MONTH_NAMES` beside `formatShortCalendarDate`.
     `celebrationLines` takes `(redemption: { title, ownerName, cost },
     dateText: string)` and loses its `Intl` formatter; `RedeemSheet`
     passes `formatLongCalendarDate(calendarDateInZone(new
     Date(redemption.redeemedAt), HOUSEHOLD_TIME_ZONE))`. Move the
     Denver/UTC assertions into `householdDate.test.ts` (03:30Z on Nov 25:
     Denver "Tuesday, November 24", UTC "Wednesday, November 25");
     `rewardRules.test.ts` keeps one plain `dateText` case.
  4. (Captain 2) new `src/app/(app)/rewards/loading.tsx`: `<SkeletonPage
     wide />` from `@/components/Skeleton`, with the header comment
     `settings/loading.tsx` uses.
  5. (Captain 3, Strange 3) `RewardsBoard.tsx`: the Hide earned row is a
     `flex min-h-12 items-center justify-end gap-2` with an `aria-hidden`
     label span and `<ToggleSwitch checked={hideEarned}
     onChange={setHideEarned} label={REWARD_HIDE_EARNED_LABEL} />`; delete
     the hand-made pill.
  6. (Strange 1, H1) new `REWARD_ALL_HIDDEN = "Earned rewards are
     hidden."`; a column whose person has rewards but none shown says it
     (all viewers; the Add tile still shows for parents). No rewards at all
     keeps the two existing lines.
  7. (H2) earned rewards last: in `rewardRules.ts`, `visibleRewards` (or a
     new `orderRewards` it uses) puts earned rewards after the rest,
     keeping added order inside each group. Test it.
  8. (H3) no change to "0 of 5"; leave `progressText` as is.
  9. (Strange 2) `RewardCard.tsx`: the No picture label `text-muted`
     becomes `text-muted-strong`.
  10. (Strange 4) `RewardsBoard.tsx` wide layout: replace the auto-fit grid
     with `@min-[48rem]:grid-flow-col
     @min-[48rem]:auto-cols-[minmax(13.5rem,1fr)]
     @min-[48rem]:overflow-x-auto`, so every person sits side by side and the
     strip swipes when they do not fit. `RewardCard.tsx`: make the card a
     `@container`, and below about 18rem wrap the row so Redeem (or "Ask a
     parent") drops under the body at full width (`@max-[18rem]:w-full`).
  11. (Strange 5) `RewardPersonChips.tsx`: `pr-8` end padding and a trailing
     fade `[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)]`
     on the scroller.
  12. (Strange 6, Vision note) `RedeemSheet.tsx`: `const close = () => { if
     (pending && !redemption) return; onClose(); };` used by the backdrop
     and the Escape handler.
  13. (Captain notes) words into `rewardVocabulary.ts`:
     `REWARD_PEOPLE_LABEL` ("People"), `personChipLabel(name, bank)`,
     `rewardProgressLabel(title)`; move `lastGrapheme(text)` and
     `isQuickPick(emoji)` from `RewardEmojiPicker.tsx` into
     `rewards/rewardEmoji.ts` with tests.
- **Verification:** full gauntlet; Denver and UTC counts up from 2195;
  `grep -rn "Intl.DateTimeFormat" src/lib/rewards` empty; `grep -n "import
  \* as" src/app/actions/rewards.ts` empty; `wc -l` of touched files.
- **Evidence required:** gauntlet tails with counts, test names added,
  `git show --stat HEAD`.
- **Done criteria:** one commit, only boundary files, gauntlet green.
- **Report:** DONE 3b0ab71, 15 boundary files, items 1 to 13 done. tsc, eslint,
  build, `@/app` grep, Intl and `import *` greps all clean. Denver 2200 pass;
  UTC 2190 pass + 10 skipped (Stark says the skips predate F1; Vision must
  confirm on main). New: `orderRewards` exported; `basis-0` on the card body
  so the row wraps only when needed; `lastGrapheme` uses the `"en"`
  segmenter. Not seen in a browser by Stark.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision (HEAD 4708afa, in parallel with Strange and Captain) | BLOCKED | actions/rewards.ts never type-checks ids: a forged `{ not: "" }` id makes `deleteMany`/`updateMany` hit every row (undoRedeem wipes every redemption) | redeem held under 4 concurrency probes; migration byte-identical to schema diff; RedeemSheet overlay/Escape close while pending spends silently (Strange); reassigned owner keeps old redemptions in redeemedCount; toRewardEmoji accepts text symbols like ©; foreign ownerId refusal says "didn't save"; Save/Add/Delete inline words in RewardSheet |
| 1 | Captain (HEAD 4708afa) | BLOCKED | (1) rewardRules.ts:108 own Intl weekday/month formatter (householdDate.ts and mealPlanDates.ts rules): add `formatLongCalendarDate`, celebrationLines takes `dateText`; (2) no `rewards/loading.tsx` (layout.md wide pages); (3) RewardsBoard hand-made switch (ToggleSwitch is the only one); (4) Earned filled star vs rewards.md "appears nowhere else" (doc fix, Fury); (5) `import * as writes` in actions/rewards.ts (Domain write modules aliases) | rewards.md overstates "one reader"; three inline words to move (People, chip label, progress label); RewardEmojiPicker's own lastGrapheme/isQuickPick untested; page reads people first (A3); `Field` from HabitFormFields; six copies of the device-store pattern; R2 shares files. STRUCTURE.md amendments A1 to A6 for Fury |
| 1 | Strange (HEAD 4708afa, running app, phone 375/390 and iPad 1180, light and dark) | BLOCKED | (1) Hide earned on: a column with only hidden rewards says "No rewards yet." (false); (2) "No picture" label `text-muted` on `surface-2` 4.33:1; (3) hand-made switch (ToggleSwitch is the only one); (4) iPad wraps the 5th person to a second row (Bryce: one column per person): side-by-side strip, Redeem drops below on narrow cards; (5) phone chips at 390 end cleanly with 2 people hidden: trailing fade; (6) RedeemSheet backdrop and Escape close while "Redeeming...", spending silently | Redeem flow not seen live (banks too low; pass 2 needs a bank of 5+); hydration flash on Hide earned reload; no wide loading.tsx; earned sorts first; negative bank reads "0 of 5"; picker open-state looks picked; two E and two L initials; dark cards close to column tone |

## Handoff log

- 2026-11-24 - Mission opened. `.env` linked (dev branch host confirmed),
  `npm ci` done. Banner dispatched for the research brief. Next: mock and
  the three saved questions to Bryce.
- 2026-11-24 - Banner's brief back (key facts: `loadStarBanks` has no
  client param, so redeem needs one to re-read inside a transaction;
  no shared Sheet component, sheets hand-roll the shell; `AvatarBadge`
  and `loadHouseholdPeople` for people; `startPage.ts` derives from
  `NAV_SECTIONS`; wide pages opt in with `data-page-width="wide"`;
  `lastStore.ts` is the per-device switch pattern; no `--star-soft`
  token yet). Mock at `.avengers/mocks/rewards-r3-page-mock.html` sent to
  Bryce with the layout, emoji list, cost steps and the DESIGN.md emoji
  exception.
- 2026-11-24 - C1 dispatched to Stark at 4f5a441. Bryce went to bed and put
  **Hill in the command seat** for the rest of the mission, on **Opus 5.5
  high effort** (Bryce, 2026-11-24; passed as model and effort overrides on
  each Hill dispatch, `.claude/agents/hill.md` unchanged). Content and
  design calls that would wait for Bryce go to Hill and are recorded as
  "decided by Hill"; logins, real-device tests, money and the danger
  register still wait for Bryce. Merge does not wait (2026-11-05 rule).

- 2026-11-25 - Pass-1 verdicts, H1 to H3 and F1 committed as ece5eda.
  Stark's F1 landed as 3b0ab71; Bryce paused the internet before re-gating.
  **Resume:** if Stark's F1 commit is on the branch (`git log ece5eda..HEAD`),
  read its report and re-gate (Vision, Captain, Strange pass 2; Strange
  needs a bank of 5+). If not, check `git status` for half-done F1 edits
  and re-dispatch Stark on F1. Dev test rows still to clean are listed in
  C3's report.

## Delivery

(Not yet.)
