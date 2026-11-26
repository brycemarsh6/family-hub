# Mission: Rewards R4, the parent PIN, kid and tablet redeem, and wishes

**Project:** family-hub (Marshee)
**Status:** INTERROGATING
**Started:** 2026-11-25 · **Updated:** 2026-11-25
**Branch:** `claude/rewards-r4-pin-wishes-f9d3fa`, cut from main at b4e32c8
(R1 PR #124, R2 PR #125, R3 PR #126 merged). R5 (mission 83) runs at the
same time in its own session and branch.

## Brief

- **Goal:** Fourth PR of `.avengers/plans/rewards-v1.md` (decisions 6, 13,
  14). One 4 digit parent PIN, set in the Rewards section of Settings, with
  a switch to turn it off. Kids on their own login and the wall tablet may
  now redeem after the PIN; a parent on their own login is never asked.
  Wrong tries lock PIN entry for a while on their own counter, never the
  sign-in lock. With the PIN the tablet may also change reward costs and
  star values (decision 6). Wishes: a kid adds a reward with no cost for
  themselves, the tablet for anyone; it cannot be redeemed until a parent
  sets the cost.
- **Done means:**
  1. A parent sets, changes and switches off the PIN in Settings; the PIN
     is stored only as a hash made by `src/lib/password.ts`.
  2. Kid and tablet redeem asks for the PIN; a right PIN redeems, a wrong
     one says so; a parent's own login is never asked.
  3. The set number of wrong tries locks PIN entry for the set time (its
     own columns on `RewardSettings`); sign-in is untouched.
  4. PIN switch on and no PIN set: kid and tablet redeem says "A parent
     needs to set a PIN first". Switch off: no PIN step.
  5. The tablet with the PIN may change reward costs and star values;
     without it, it may not. Rules live only in `src/lib/tabletRules.ts`.
  6. A kid adds a wish for themselves and the tablet for anyone; a wish
     shows with no cost and no Redeem until a parent sets the cost.
  7. Every check is enforced in the Server Action, not only hidden in the
     page.
  8. Gauntlet green in both timezones; Vision, Strange and Captain PASS.
- **Out of scope:** Manage rewards, bonus stars, star history and the bank
  sum (R5, mission 83); Winnie endpoints for rewards; a Stars dashboard
  widget; any change to sign-in or its lockout.

## Danger register

Same as AGENTS.md, plus:
- `.env` is a symlink to the main checkout's `.env`; its `DATABASE_URL`
  host was checked as the Neon dev branch
  (`ep-hidden-pine-a6ajzk11-pooler`) on 2026-11-25. Never print `.env`
  beyond the hostname.
- **One migration, additive only**:
  `prisma/migrations/20261126000000_reward_pin` (four columns on
  `RewardSettings`). SQL is shown and reviewed by hand before it is applied
  with `npx prisma migrate deploy`. **Never `prisma migrate dev`** and never
  `db:seed` / `db:reset`. No clean or reset script for `User`. R5 adds
  `20261126100000_star_adjustments`; check folder order before merging.
- The PIN is a secret: never logged, never sent back to the browser, never
  in a URL, never stored except as the hash.
- Stage by explicit path; `git show --stat HEAD` after each commit. Leave
  the untracked `.agents/` and `.codex/` folders out. No direct pushes to
  `main`; builders never push.
- **File split with R5.** R4 owns `src/app/actions/rewards.ts`,
  `src/lib/rewardWrites.ts`, `RedeemSheet.tsx`, `RewardSheet.tsx`,
  `src/lib/tabletRules.ts`, `RewardsSettings.tsx`,
  `src/app/actions/rewardSettings.ts`, `src/lib/rewardSettingsRead.ts`. R5
  owns the bank sum in `loadStarBanks` and its own new files. Shared (small
  edits, sync with main right before merging): `prisma/schema.prisma`,
  CLAUDE.md, STRUCTURE.md, DESIGN.md, `docs/structure/rewards.md`,
  `src/lib/rewardVocabulary.ts`, `src/lib/nav.ts`, `package.json`.
- Not bypass permissions mode: content and design calls go to Bryce, never
  Hill. The PIN lockout numbers and how the PIN is stored or checked are
  Bryce's call in any mode.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- `npm run build`
- `grep -rn "@/app" src/lib/` prints nothing

## Assembled

- Stark + Vision (always).
- Strange: a PIN pad, a new Settings section, the PIN step and wishes on
  the Rewards page.
- Captain: a new pure rule file (`rewards/pinPolicy.ts`), a new component,
  new columns with one reader and one writer.
- Banner: one brief on the code R4 builds on (access, tablet rules,
  actions, sheets, password, sign-in lock, settings page).

## Bryce's decisions (2026-11-25, from the mock)

Mock: `.avengers/mocks/rewards-r4-pin-mock.html`. Bryce picked every
recommendation:

- **Lockout: 5 wrong tries locks PIN entry for 5 minutes.** One lock for
  the whole house (the tablet and every kid login share it, on the
  `RewardSettings` row). Setting a new PIN clears it. Sign-in and
  `LoginAttempt` are never touched.
- **Words:** "Parent PIN", "A parent enters the PIN to redeem (title) for
  (name).", "That PIN isn't right.", "Too many wrong tries." with "Try
  again in (N) minutes, or set a new PIN in Settings." ("in 1 minute"),
  "A parent needs to set a PIN first." with "Settings, then Rewards, then
  Set PIN.", Settings card "Parent PIN", switch "Ask for the PIN", help
  "Kids and the wall tablet need the PIN to redeem. A parent's own login
  is never asked.", "PIN is set" / "No PIN yet", "Change PIN" / "Set PIN",
  sheet "Set a new PIN" with "Pick 4 digits. Kids shouldn't know it.",
  then "Enter it again", "Those didn't match. Start again.", "PIN saved."
  Wishes: "Add a wish", "Wish" tag, "Waiting for a parent to set the
  cost" (kids), "No cost yet" with a "Set cost" button (who may set it),
  "A parent will set how many stars it costs.", "Add wish", sheet heading
  "Set a cost" when a parent opens a wish.
- **PIN storage and check:** bcrypt hash via `src/lib/password.ts`; checked
  on the server on every Redeem or Save that needs it; nothing stays
  unlocked afterward. The PIN pad checks as soon as the 4th digit is
  tapped; a right PIN on redeem goes straight to the celebration.
- **Tablet:** with the PIN it redeems for anyone and adds, edits or
  deletes rewards and costs (PIN asked at Save or Delete). Without the PIN
  it adds wishes for anyone. **Tablet habit star values are parked** for a
  later PR (today the tablet cannot open the habit editor at all).
- **Kids:** redeem only their own rewards (with the PIN); add wishes only
  for themselves; may rename, re-picture or delete their own wish until it
  has a cost; never set costs. Other people's rewards show bars and no
  buttons (so "Ask a parent" goes away).
- **Settings:** the PIN switch starts On. Changing the PIN does not ask for
  the old one. Switch off: kids and the tablet redeem without the PIN and
  the tablet changes rewards without it; kids still never set costs.
- Undo redeem on the celebration does not ask for the PIN again.

**Fury's structure calls (Claude recommends structure; listed for review):**
- Kid and tablet Undo redeem is allowed only for a redemption that login
  made itself, within 10 minutes (`REDEEM_UNDO_WINDOW_MS`). Without it a
  kid could redeem with the PIN, get the cupcake, and undo later for the
  stars back. Parents and admins may undo any redemption at any time.
  Refusal words (Fury's default, Bryce may change): "Only a parent can
  undo this now."
- A wish (no cost) can be changed by whoever could add it: a kid for
  their own, the tablet for anyone. The tablet's Add a wish tile shows
  only while its reward changes need the PIN.

## Contracts

Order: C1, then C2, then C3 (each builds on the one before). The
migration `20261126000000_reward_pin` was written, diffed (byte-identical
to `prisma migrate diff`) and applied to the dev branch by Fury before C1;
`npx prisma generate` is done.

### C1 - PIN and wish rules, reads, writes and actions (no UI)

- **Status:** DONE
- **Objective:** Every R4 rule, read, write and Server Action exists,
  tested, with the PIN checked on the server, so C2 and C3 only draw.
- **Boundaries:** may touch: new `src/lib/rewards/pinPolicy.ts`,
  new `src/lib/rewards/pinPolicy.test.ts`, `src/lib/rewards/access.ts`,
  `src/lib/rewards/access.test.ts`, `src/lib/tabletRules.ts`,
  `src/lib/tabletRules.test.ts`, new `src/lib/rewardGates.ts`,
  new `src/lib/rewardGates.test.ts`, `src/lib/rewards/rewardRules.ts`,
  `src/lib/rewards/rewardRules.test.ts`, `src/lib/rewardVocabulary.ts`,
  `src/lib/rewardSettingsRead.ts`, `src/lib/rewardsRead.ts` (one new
  read only), `src/lib/rewardWrites.ts`, `src/app/actions/rewards.ts`,
  `src/app/actions/rewardSettings.ts`. · must not touch:
  `prisma/schema.prisma`, `prisma/migrations/`, `src/lib/starBankRead.ts`
  (R5 owns the bank sum), `src/lib/password.ts`,
  `src/lib/loginRateLimit*.ts`, `src/app/actions/auth.ts`, every component
  and page, `package.json`, docs.
- **What to build:**
  1. `rewards/pinPolicy.ts` (pure, like every `rewards/` file): `PIN_LENGTH`
     4, `PIN_MAX_TRIES` 5, `PIN_LOCK_MS` 5 minutes; `isPinShaped(raw:
     unknown)` (exactly 4 ASCII digits); `pinGate(asked, pinRequired,
     pinSet)` returning `"open" | "pin" | "noPin"` (not asked or switch
     off is open; asked, on and no PIN is noPin); the lock rules, all
     taking `now`: whether a lock is active, minutes left (rounded up,
     never below 1), whether an ended lock should reset the count, and
     the `pinLockedUntil` to write after a wrong try (set when the new
     count reaches `PIN_MAX_TRIES`, else null). Tests for each, edges
     included (the 4th and 5th wrong try, a lock ending exactly at `now`,
     59 seconds left reads 1 minute, " 123", "12345", "１２３４" full-width
     digits refused).
  2. `rewards/access.ts`: add named, role-and-id checks with no device
     test: `canSetRewardPin(role)` (managers), `kidMayRedeem(actor,
     ownerId)` and `kidMayWish(actor, ownerId)` (role "kid" and own id),
     `canUndoRedeem(actor, { redeemedById, redeemedAt }, now)` (managers
     always; anyone else only their own redemption within
     `REDEEM_UNDO_WINDOW_MS` = 10 minutes, exported here). Keep
     `canRedeemRewards` and `canManageRewards` as they are (managers).
     Tests.
  3. `tabletRules.ts`: `tabletMayRedeemRewards`, `tabletMayManageRewards`
     (behind the PIN; the gate adds it) and `tabletMayAddWishes` (for
     anyone), each `role === "device"`, with a doc comment naming Bryce's
     2026-11-25 call (habit star values parked). Tests.
  4. new `src/lib/rewardGates.ts` (pure, top of `src/lib/` because it
     combines `rewards/access.ts`, `rewards/pinPolicy.ts` and
     `tabletRules.ts`, which `rewards/` may not import; the `starFlights.ts`
     precedent): the only answer to "may this login do this, and does it
     need the PIN". `type Gate = "open" | "pin" | "noPin" | "no"`;
     `redeemGate(actor, ownerId, pinState)` (manager open; tablet or a
     kid's own through `pinGate`; else no); `manageGate(actor, pinState)`
     (manager open; tablet through `pinGate`; else no); `mayChangeWish(actor,
     ownerId)` (tablet any, kid own); and `rewardRights(actor, personIds,
     pinState)` returning plain data for the page: `{ manage: Gate,
     people: Record<id, { redeem: Gate; wish: boolean }> }`. `pinState`
     is `{ pinRequired: boolean; pinSet: boolean }`. Tests cover every
     role (admin, parent, kid, device) times PIN off, on and set, on and
     unset, and a kid's own versus another person's reward.
  5. `rewardRules.ts`: `WishInput` (`ownerId`, `title`, `emoji`) and
     `checkWishInput(raw)` with the same title and emoji checks as
     `checkRewardInput` (shared, not copied); a wish never carries a cost
     or repeat setting. Tests.
  6. `rewardVocabulary.ts`: every word in "Bryce's decisions" above plus
     the undo refusal, as constants or small functions (`pinLockedText
     (minutes)` gives "Try again in 5 minutes, or set a new PIN in
     Settings." and "in 1 minute"). Remove `REWARD_ASK_A_PARENT` only if
     C3 will stop using it; leave it for now (C3 removes it).
  7. `rewardSettingsRead.ts` (still the only `RewardSettings` reader):
     `loadPinStatus(client = db)` returning `{ pinSet, pinRequired }` (a
     missing row is `{ pinSet: false, pinRequired: true }`; never the
     hash), and `loadPinCheck(client = db)` returning the hash, switch,
     count and lock for `rewardWrites.ts` only (doc comment says so).
  8. `rewardsRead.ts`: one new read, `loadRewardFacts(id)` returning `{
     ownerId, cost } | null`, so an action can work out the gate before
     it writes. Doc comment names it as the second reader and why.
  9. `rewardWrites.ts`: every `RewardSettings` write moves here (rewards.md
     "If a second caller appears"): `writeLateStars(value, userId)` (the
     upsert `saveLateStars` does today), `writeRewardPin(pin, userId)`
     (hashes with `hashPassword`, upserts, and resets `pinFailCount` to 0
     and `pinLockedUntil` to null), `writePinRequired(on, userId)`, and
     `checkRewardPin(pin, now)` returning `{ ok: true } | { ok: false,
     reason: "wrong" | "locked" | "notSet", lockMs?: number }`. The check:
     clear an ended lock (count back to 0), refuse a live lock before any
     bcrypt work, refuse a badly shaped PIN as wrong (it still counts),
     `verifyPassword`, on wrong add 1 with an atomic `increment` and set
     the lock from `pinPolicy` when the new count reaches 5, on right
     reset the count. It never writes `LoginAttempt`. Also `createWish
     (value, createdById)` (cost null, one time, end of the owner's list,
     like `createReward`), `updateWish(id, { title, emoji })` that refuses
     (returns null) a row that is gone or already has a cost, and make
     `undoRedemption(id, may)` read the redemption inside its own write
     and refuse when `may({ redeemedById, redeemedAt })` is false.
  10. `actions/rewards.ts` (each action still guard form a, never throws):
     - one private helper that turns a `Gate` plus the sent `pin` into
       open or a refusal: `no` refuses with the parent words; `noPin`
       returns `{ error, pin: "notSet" }`; `pin` with no PIN sent returns
       `{ pin: "needed" }`; otherwise `checkRewardPin`, mapping wrong to
       `{ error, pin: "wrong" }` and locked to `{ error, pin: "locked",
       lockMs }`. Export the result type for C2 and C3.
     - `redeemReward(rewardId, pin?)`: `loadRewardFacts`, `redeemGate`
       with fresh `loadPinStatus`, the helper, then the existing
       transaction (unchanged), recording the login as `redeemedById`.
     - `undoRedeem(redemptionId)`: any signed-in login, refused by
       `canUndoRedeem` inside `undoRedemption`. Signature unchanged (R5
       reuses it).
     - `saveReward(raw, id?, pin?)` and `deleteReward(id, pin?)`:
       `manageGate`; except `deleteReward` on a wish that
       `mayChangeWish` allows deletes with no PIN.
     - new `saveWish(raw, id?)`: no PIN; on add `checkWishInput`, the
       owner must be a household person and `mayChangeWish(actor,
       ownerId)`; on edit `loadRewardFacts` must be a wish the actor may
       change, and only title and emoji change.
     - existing ids type checks stay (the mission-81 forged-id lesson).
  11. `actions/rewardSettings.ts`: `saveLateStars` calls `writeLateStars`;
     new `setRewardPin(pin)` (`canSetRewardPin`, `isPinShaped`) and
     `saveRewardPinRequired(on)` (`canSetRewardPin`, a real boolean only).
     Revalidate `/settings` and `/rewards`. Never log or return the PIN.
- **Verification:** the Gauntlet (both timezones); `grep -rn "pinHash"
  src --include=*.ts --include=*.tsx | grep -v generated` shows only
  `rewardSettingsRead.ts` and `rewardWrites.ts`; `grep -rn
  "role === \"device\"" src/lib/rewards src/lib/rewardGates.ts` prints
  nothing; `grep -rn "loginAttempt\|LoginAttempt" src/lib/rewardWrites.ts
  src/app/actions/reward*.ts` prints nothing.
- **Evidence required:** gauntlet output with test counts before and after
  (the count goes up); the three greps; a short probe against the dev
  database through the real write functions (a scratchpad script, dev
  host checked first) showing: set PIN, right PIN ok, 5 wrong tries then
  locked with `lockMs` about 300000, a right PIN while locked still
  refused, `writeRewardPin` clears the lock; then the test PIN removed
  and the row's PIN columns put back to null / 0 / null / true, with the
  final row printed (no hash printed in full, first 7 characters only).
- **Done criteria:** Fury reads the diff against the boundaries, re-runs
  the tests, and sees every rule in exactly one place.
- **Report:** DONE (2026-11-25). Tests 2224 to 2246 (Denver), UTC 2236 +
  10 DST skips; tsc, eslint, build clean; the three greps clean; dev probe:
  right PIN ok, wrong 1 to 4 "wrong", the 5th answers "locked" with
  lockMs 300000 (so the pad greys at once), right PIN while locked still
  refused, a new PIN clears the lock; PIN columns put back (null, 0,
  null, true). Stark's calls: a wish is refused "needs a cost first"
  before a PIN try is spent; `deleteReward(id, wishOnly)` deletes only
  while the cost is still null (a parent setting a cost in between wins);
  `undoRedemption` returns `{ ok }`; three extra words for Bryce to see
  ("Enter the PIN.", "The PIN must be 4 digits.", "Pick on or off.").

### C2 - The PIN pad and the Parent PIN card in Settings

- **Status:** DONE
- **Objective:** A reusable `PinPad.tsx`, a `SetPinSheet.tsx`, and the
  Parent PIN card in the Rewards section of Settings, as in mock screens
  A to C and E to G.
- **Boundaries:** may touch: new `src/components/PinPad.tsx`,
  new `src/components/SetPinSheet.tsx`,
  `src/components/RewardsSettings.tsx`, `src/app/(app)/settings/page.tsx`
  (load `loadPinStatus` beside `loadLateStars`, pass it in; nothing
  else), `src/lib/rewardVocabulary.ts` (words only, if C1 missed one). ·
  must not touch: everything C1 built except to import it, the Rewards
  page and its components, `AdminPasswordSheet.tsx`, schema, docs.
- **Details:** PinPad: 4 dots, keys 1 to 9, a blank, 0 and a backspace
  (Lucide `Delete` icon, labelled), each key at least 48px (the mock's
  72 by 60 is the target), heading and prompt passed in, an error line
  (`role="alert"`), a locked state that greys the keys and counts the
  minutes down from `lockMs` (re-enable when it ends), a busy state, and
  `onComplete(pin)` called on the 4th digit (the dots clear on a wrong
  PIN). The PIN never goes in a URL, `localStorage` or a log, and the
  field is not a text input (no autofill). Sizes in rem (text size
  setting). SetPinSheet: the app's sheet shell pattern (as
  `RewardSheet`), "Set a new PIN", then "Enter it again", mismatch
  "Those didn't match. Start again.", calls `setRewardPin`, then closes
  with "PIN saved." shown on the card. The card: "Parent PIN", the
  existing `ToggleSwitch` for "Ask for the PIN" (optimistic, calling
  `saveRewardPinRequired`), the help line, "PIN is set" or "No PIN yet"
  with "Change PIN" or "Set PIN".
- **Verification:** Gauntlet; in the running app on the dev database as a
  parent: set a PIN, see "PIN is set", switch off and on, reload and see
  both kept. Phone 390 and iPad 1180 screenshots, light and dark.
- **Evidence required:** gauntlet output; screenshots paths; the PIN set
  through the UI then put back (C1's cleanup script or the UI) and
  stated.
- **Done criteria:** Fury sees the screenshots match the mock and the
  boundary list matches the diff.
- **Report:** DONE (2026-11-25), code and Gauntlet only (Stark has no
  browser; the running-app checks and screenshots move to Strange's gate).
  New `PinPad.tsx` 136 lines (keys 4.5 by 3.75rem, Lucide `Delete`,
  `role="alert"` error, lock countdown each second, calls no action), new
  `SetPinSheet.tsx` 95, `RewardsSettings.tsx` 141, settings page +3.
  Tests 2246 both zones (components only), tsc, eslint, build clean.
  Notes for C3: PinPad clears its dots when `error`, `lockMs` or `busy`
  changes, and restarts the countdown only when `lockMs` changes, so C3
  drives `busy` from a transition and remounts or clears `lockMs`; the
  pad's "Cancel" is a literal (C3 swaps it for `REWARD_CANCEL_LABEL`).

### C3 - The Rewards page: PIN step, kid and tablet redeem, wishes

- **Status:** DONE
- **Objective:** Kids and the tablet redeem through the PIN step, the
  tablet changes rewards behind the PIN, and wishes are added, shown and
  costed, as in mock screens A to D and H to K.
- **Boundaries:** may touch: `src/app/(app)/rewards/page.tsx`,
  `src/components/RewardsBoard.tsx`, `src/components/RewardCard.tsx`,
  `src/components/RedeemSheet.tsx`, `src/components/RewardSheet.tsx`,
  new `src/components/WishSheet.tsx`, `src/lib/rewardVocabulary.ts`
  (words only; remove `REWARD_ASK_A_PARENT` if nothing uses it). · must
  not touch: C1's rules, reads, writes and actions (import only),
  `SetPinSheet.tsx` (import only), `PinPad.tsx` (import only, except
  its "Cancel" literal becomes `REWARD_CANCEL_LABEL`), `StarBank.tsx`,
  `StarRain.tsx`, schema, docs.
- **Details:** the page loads `loadPinStatus` and passes
  `rewardRights(...)` to the board (replacing `canManage` and
  `canRedeem`). A card's Redeem shows when its owner's redeem gate is not
  `no`; other people's cards show no button. RedeemSheet: gate `open` is
  today's confirm step; `pin` opens straight on the PinPad with "A parent
  enters the PIN to redeem (title) for (name).", and a right PIN goes to
  the celebration; `noPin` shows "A parent needs to set a PIN first."
  with Close; the action's `pin` answers drive the pad (wrong clears the
  dots, locked greys it). RewardSheet: when the manage gate is `pin`,
  Save and Delete open the PinPad inside the sheet, then call the action
  with the PIN; heading "Set a cost" when the reward has no cost. Wish
  card: dashed card, "Wish" tag, "No cost yet" and a "Set cost" button for
  a viewer whose manage gate is not `no`, else "Waiting for a parent to
  set the cost"; tapping it opens WishSheet for a viewer who may change
  that wish and RewardSheet for a parent. WishSheet: Picture (the
  existing `RewardEmojiPicker`) and Name, For only on the tablet's add,
  "A parent will set how many stars it costs.", "Add wish", and Delete on
  edit. Tiles: "Add a wish" on a column where `wish` is true and the
  manage gate is not `open`; "Add reward" where the manage gate is not
  `no`. Keep R3's rules: the board's sheet copy survives the refresh,
  backdrop and Escape do nothing while a request is in flight.
- **Verification:** Gauntlet; in the running app on the dev database:
  as the Tablet with the PIN on, redeem with the right PIN (celebration),
  a wrong PIN ("That PIN isn't right."), five wrong (locked, keys grey);
  as a kid, redeem own with PIN, no button on a sibling's, add a wish,
  rename it; as a parent, no PIN asked, Set cost on the wish turns it
  into a reward; switch the PIN off and the tablet redeems with no pad;
  no PIN set shows the "set a PIN first" words. Screenshots phone 390
  and iPad 1180, light and dark. **Agents never type a family password
  and never mint a session cookie.** The parent views are checked in the
  browser; the kid and tablet paths are proven by `rewardGates` tests
  and a scratchpad probe through the real actions' gate and write
  functions; the tablet screens are seen in the browser only after Bryce
  signs the in-app browser in as the Tablet himself (Fury asks at gate
  time).
- **Evidence required:** gauntlet output, screenshot paths, and a list of
  every dev row made (titles start "zz r4") and their cleanup.
- **Done criteria:** Fury sees every mock screen reproduced and the gates
  pass.
- **Report:** DONE (2026-11-25), code and Gauntlet only (no browser). Page
  passes `rewardRights`; board 153, card 105, RedeemSheet 187, RewardSheet
  299 (largest; under the 350 soft cap), new WishSheet 189; PinPad's
  Cancel is now `REWARD_CANCEL_LABEL`; `REWARD_ASK_A_PARENT` removed;
  words added `REWARD_CLOSE_LABEL` "Close" and `WISH_EDIT_HEADING` "Edit
  wish". Tests 2246 both zones, tsc, eslint, build clean; no dev rows.
  Stark's open points: the locked pad's button reads "Cancel" (mock:
  "Close"); RewardSheet's PIN step prompt is "Enter the PIN." (no mock
  words); a kid's empty column still says "Ask a parent to add one."
  though a kid can now add a wish.

### F1 - Gate fixes, pass 1 (Vision, Captain, Strange)

- **Status:** DONE
- **Objective:** Clear the five pass-1 blockers and the cheap notes, so
  every gate can pass on pass 2.
- **Boundaries:** may touch: `src/lib/rewardWrites.ts`,
  `src/lib/rewardSettingsRead.ts` (only if the transaction needs it),
  `src/lib/rewardGates.ts`, `src/lib/rewardGates.test.ts`,
  `src/lib/rewards/access.ts`, `src/lib/rewards/access.test.ts`,
  `src/lib/rewards/rewardRules.ts`, `src/lib/rewards/rewardRules.test.ts`,
  `src/lib/rewards/pinPolicy.test.ts`, `src/lib/rewardVocabulary.ts`,
  `src/app/actions/rewards.ts`, `src/app/actions/rewardSettings.ts`,
  `src/components/PinPad.tsx`, `src/components/SetPinSheet.tsx`,
  `src/components/RewardsSettings.tsx`, `src/components/RedeemSheet.tsx`,
  `src/components/RewardSheet.tsx`, `src/components/WishSheet.tsx`,
  `src/components/RewardCard.tsx`, `src/components/RewardsBoard.tsx`. ·
  must not touch: schema, migrations, `starBankRead.ts`, `password.ts`,
  sign-in files, pages, docs, `.avengers/`.
- **Blockers:**
  1. (Vision) `checkRewardPin` lets a burst of simultaneous tries all be
     checked (proven: 19 wrong plus the right one at once, the right one
     passed, count 19). Do the whole check in one
     `db.$transaction(async (tx) => ...)` that first takes the row lock
     (`SELECT 1 FROM "RewardSettings" WHERE id = 'household' FOR UPDATE`
     through `tx.$queryRaw`), then reads with `loadPinCheck(tx)`, clears
     an ended lock, refuses a live lock, runs bcrypt, and writes the
     increment, lock or reset, all with `tx`; an explicit `timeout` (and
     `maxWait`) so a queued check fails closed (refused, never let
     through). Re-proof: 20 simultaneous wrong PINs leave `pinFailCount`
     at exactly 5 with 4 "wrong" and 16 "locked"; then 19 wrong plus the
     right one at once: the right one is refused unless it lands within
     the first 5; positive control first.
  2. (Vision) A `{ pin: "needed" }` answer never shows the pad when the
     page's gate is stale (switch turned on after the page loaded).
     RewardSheet's `settle` opens the PIN step for the step that ran;
     RedeemSheet keeps a `pinAsked` state so the pad shows.
  3. (Captain) "Pick 4 digits..." and "The PIN must be 4 digits." type
     the PIN length. Make them `pinSheetHint(length)` and
     `pinShapeRefusal(length)` in the vocabulary (the `pinLockedText`
     pattern), called with `PIN_LENGTH`; a test pins the 4-digit words.
  4. (Strange) With the switch off, the Parent PIN card's help line is
     false. Add `PIN_HELP_OFF` with mock G's words: "Off: kids and the
     wall tablet redeem without a PIN, and the tablet can change rewards
     without one. Kids still can't set costs." and show it when off.
  5. (Strange) After a lock ends, "Too many wrong tries." stays under
     live keys. On `pin === "locked"` the sheets pass no error (the lock
     panel speaks), and PinPad hides any error once a lock it showed has
     run out, and stops its timer.
- **Notes folded in:**
  - PinPad: the 4th dot shows while the request runs (clear the dots
    when `busy` goes from true to false, or `error` or `lockMs` changes);
    a `cancelLabel` so the locked pad's button reads "Close" (mock C).
  - Words in the vocabulary, not inline: PinPad's "of N digits entered"
    and "Delete last digit", every "Close", WishSheet's "Save" and
    "Delete", and `rewardSettings.ts`'s "That didn't save. Please try
    again." becomes `REWARD_SAVE_FAILED`.
  - `rewardRights` gains `addWish` per person (`wish` and manage not
    `open`), and the board reads it instead of deciding.
  - `isWish(reward)` in `rewardRules.ts` (cost is null) is the one test,
    used by the board, sheets, card, actions and writes.
  - `RewardActor.role` typed `Role`.
  - Wish card border 1px dashed (mock), not the Add tile's 2px.
  - WishSheet: if the server answers with a `pin` field (the wish became
    a reward meanwhile), show `REWARD_GONE_REFUSAL`-style words from the
    vocabulary ("This is a reward now. Ask a parent.") rather than "Enter
    the PIN." with no pad.
- **Words (Fury's defaults, Bryce asked in parallel; one-line changes):**
  RewardSheet's PIN step prompt "A parent enters the PIN to save this.";
  wish edit heading "Edit wish"; a kid's empty column "No rewards yet.
  Add a wish and a parent will set its cost."
- **Verification:** the Gauntlet both zones (count goes up); the burst
  re-proof above through the real `checkRewardPin` on dev (scratchpad
  script, dev host checked, row restored exactly, hash 7 chars); the
  C1 greps; `grep -rn "cost === null\|cost !== null" src --include=*.ts
  --include=*.tsx | grep -v generated` shows only `rewardRules.ts` (and
  type definitions).
- **Evidence required:** gauntlet output, burst output before restore,
  the greps, files and line counts.
- **Report:** DONE (2026-11-25). The PIN check is one transaction that
  locks the row first (`maxWait` 10s, `timeout` 15s; any error answers
  refused). Burst on dev: 20 wrong at once gave 4 wrong, 16 locked, count
  exactly 5; 19 wrong plus the right one gave the right one "locked";
  row restored (hash identical). Tests 2249 both zones (UTC + 10 DST
  skips); tsc, eslint, build clean; greps clean; `cost === null` only in
  `rewardRules.ts` (callers that need the number narrowed use `typeof
  cost === "number"`). RewardSheet 318 lines (under 350). Fury after F1:
  the delete PIN step says "A parent enters the PIN to delete this."
  (`PIN_DELETE_PROMPT`, the pattern of Bryce's save words); rewards.md
  corrected (Captain's three doc notes, the row lock, `addWish`, the
  words-with-numbers rule); DESIGN.md names the wish card's 1px dash.
- **Bryce's words (2026-11-25):** save prompt "A parent enters the PIN to
  save this."; a kid's empty column "No rewards yet. Add a wish and a
  parent will set its cost."; wish edit heading "Edit wish". He will sign
  the browser in as the Tablet for Strange's pass 2.

### F2 - Gate fixes, pass 2 (Strange)

- **Status:** DONE
- **Objective:** The celebration never shows an old PIN error, and the
  pad's button and keys stay steady.
- **Boundaries:** may touch: `src/components/RedeemSheet.tsx`,
  `src/components/RewardSheet.tsx`, `src/components/PinPad.tsx`. · must
  not touch: everything else.
- **Blocker:** (Strange) a wrong PIN then the right one: the celebration
  shows "That PIN isn't right." under Done and Undo redeem (shots 07,
  24). In `RedeemSheet.handleRedeem`'s success branch clear the error and
  `lockMs` before setting the redemption.
- **Notes folded in:** PinPad decides its own button word: `REWARD_CLOSE_LABEL`
  while its lock is live, otherwise the `cancelLabel` it is given
  (default Cancel); the sheets stop passing "Close" for the lock. PinPad
  reserves the error line's height so the keys do not move on a wrong
  PIN.
- **Verification:** the Gauntlet both zones; `grep -n "setRedemption" src/components/RedeemSheet.tsx` shows the clear before it.
- **Report:** DONE (2026-11-25), commit a0fed4c. RedeemSheet clears the
  error and lockMs before the celebration (lines 80 to 82); RewardSheet's
  success path clears the PIN words too; PinPad shows Close only while its
  own lock is live and reserves a 2.5rem error line (not measured, Strange
  checks). Tests 2249 both zones, tsc, eslint, build clean.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision (HEAD 9032939; Denver 2246/0 skip, UTC 2236 + 10 DST skips) | BLOCKED | (1) a burst of simultaneous PIN tries is all checked (19 wrong + right at once: right passed, count 19); (2) a stale gate's `pin: "needed"` never shows the pad (Save does nothing, Redeem shows words with no pad) | C2 committed Fury's docs (outside C2's list; inert); PinPad timer runs on after a lock; WishSheet delete after a cost is set says "Enter the PIN." with no pad; stale noPin until reload; forged owner costs one try. Sound: forged ids, odd PINs, every kid refusal, missing row, redeem transaction, no leaks |
| 1 | Captain (HEAD 9032939) | BLOCKED | PIN length typed in two words ("Pick 4 digits", "must be 4 digits") | rewards.md: `loadPinStatus` also reads `pinHash`; undo and settings actions ask access.ts, not rewardGates; "two named checks" stale; inline Close/Save/Delete and aria words; inline "That didn't save"; addWish decided in the board; `cost === null` about 8 times; `RewardActor.role` is string; settings page fallback copies the default. Amendment: words that state a rule's number are functions |
| 1 | Strange (HEAD 9032939, running app as a parent, 390 and 1180, light and dark, Largest text) | BLOCKED | (1) switch off still says kids need the PIN (mock G has other words); (2) code-read: after a lock ends, "Too many wrong tries." stays under live keys | busy pad hides the 4th dot; wish card 2px dashed like the Add tile (mock 1px; DESIGN.md names `--line-strong` only for the vision card); locked pad says Cancel (mock Close); words for Bryce; Largest text landscape pad scrolls; parent redeem not seen live (banks too low). Tablet pass still needed for mock A to D, H, I, K |
| 2 | Vision (HEAD 0718cc3; Denver 2249/0 skip, UTC 2239 + 10 DST skips) | PASS | Both fixed: bursts of 20 and 40 leave the count at exactly 5 and refuse the right PIN after the 5th; a held row lock answers refused (fail closed); stale `needed` shows the pad | the PIN check's catch logs nothing; Prisma's timeout waits for a held lock (17s seen); a burst ties up the pool about 2s; Close after a lock ends; stale noPin until reload. Vision's first probe crashed and left a test hash on dev about a minute; restored and verified |
| 2 | Captain (HEAD 0718cc3) | PASS | Pass-1 blocker fixed (length passed as a number; a test pins the words) | STRUCTURE.md size line says 238, rewards.md is 250 (fix at delivery); settings page fallback copies the default (follow-up); rewards.md line 23 joined; the words-with-numbers rule could go app-wide (Bryce) |
| 2 | Strange (HEAD 0718cc3, signed in as the Tablet by Bryce; 1180, 820 portrait, 390; light and dark; Largest) | BLOCKED | A wrong PIN then the right one: the celebration still shows "That PIN isn't right." (shots 07, 24) | Pass-1 blockers fixed (lock words clear when a lock ends, seen live). Mock D's "Parent PIN" heading missing on the Add-reward version; Close stays after a lock ends; dark scrollbars white (pre-R4, no `color-scheme`); keys move down on a wrong PIN; Hide earned switch 44px (pre-R4) |
| 3 | Vision (HEAD fe31bd5) | PASS | F2 checked: the old wrong-PIN words clear on the celebration; the pad stays steady | none new |
| 3 | Strange (HEAD fe31bd5, signed in as the Tablet by Bryce; 1180, 820 portrait, 390; light and dark; Largest) | PASS | Pass-2 blocker fixed, seen live | dev rows cleaned, RewardSettings and the Tablet's Text size restored |

## Handoff log

- 2026-11-25 - Mission opened. `.env` linked (dev branch host confirmed),
  `npm ci` done. Banner dispatched for the research brief. Next: mock and
  questions to Bryce.
- 2026-11-25 - Banner's brief back (no PIN pad exists; the tablet cannot
  edit habits at all; `checkRewardInput` refuses a null cost; the
  sign-in lock is `LoginAttempt`, shared with tablet sign-out). Mock sent;
  Bryce approved every recommendation. Migration written, diffed
  (identical) and applied to dev. Committed as 86cd308. C1 dispatched to
  Stark at 86cd308.
  **Resume:** if C1's files exist in `git status`, wait for or re-read
  Stark's report; otherwise re-dispatch C1.
- 2026-11-25 - All gates passed (pass 3). Synced with main after R5
  merged; Gauntlet green after the sync. Next: PR, Gauntlet check, merge,
  production deploy check.

## Delivery

- **Gates:** Vision PASS (pass 3), Captain PASS (pass 2), Strange PASS
  (pass 3, signed in as the Tablet). Fixes: F1 (the PIN burst race, stale
  `needed`, PIN length in words, switch-off help line, lock words after a
  lock ends) and F2 (the celebration's old wrong-PIN words).
- **Synced with main after R5 (mission 83) merged.** Conflicts were both
  sides' additions (access, its test, the Rewards page, the board,
  DESIGN.md, STRUCTURE.md, rewards.md); every file keeps both. One join
  Fury made: R5's `/rewards/manage` opens `RewardSheet`, which R4 made
  need a `gate`, so the Manage page now asks `manageGate` (always "open"
  there, since only managers reach it) and its wish filter uses `isWish`.
  After the sync: tsc, eslint, build clean; tests 2273 pass Denver, 2263
  pass plus 10 DST skips UTC; `npx prisma migrate status` up to date (44
  migrations); `/rewards` and `/rewards/manage` load as a parent.
- **Migration order:** `20261126000000_reward_pin` sorts before
  `20261126100000_star_adjustments`, which production already has, so
  production applies reward_pin out of date order. Both are additive and
  touch different tables.
- **Leftovers** (in `.avengers/status.md`, "Parent PIN follow-ups"): the
  gate NOTEs above that were not fixed, plus the words Bryce has not seen
  live.
- **PR and merge commit:** recorded in the PR (see `git log origin/main`
  for the merge).
