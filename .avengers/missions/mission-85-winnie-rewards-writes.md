# Mission 85: Winnie Rewards W2, Winnie changes Rewards

**Project:** family-hub (Marshee)
**Status:** IN PROGRESS (plan approved by Bryce 2026-11-26; C1 next)
**Started:** 2026-11-26 · **Updated:** 2026-11-26
**Branch:** `claude/winnie-rewards-w2-writes-e68c3a` (worktree, cut from main 48f7c4f)

## Brief

- **Goal:** Winnie (the Assistant API's only client) can change Rewards:
  add rewards and wishes, edit them (setting a cost turns a wish into a
  reward), delete only what she made, give or take stars with a note, and
  set the star value on a habit or chore. Each change is undoable for 30
  days through `POST /audit/{requestId}/undo`. The app names her as the
  giver in star history. Plan: `.avengers/plans/winnie-rewards-v1.md` (W2).
- **Done means:** the routes in the table below answer as written; every
  write followed by its undo leaves banks and rows exactly as they started;
  undo of "Winnie added a reward" is refused once it is redeemed; DELETE of
  a family-made reward is 403 and of a redeemed one 409; `stars` on an hours
  habit is 400; the family's own add, edit, delete and give or take stars
  still work; history says "Bonus from Winnie"; the gauntlet passes in both
  timezones; Vision, Captain and Strange PASS; merged; production READY;
  `git log origin/main..HEAD` empty; Bryce's test lines in
  `.avengers/status.md`; CLAUDE.md and `docs/structure/rewards.md` name the
  write routes.
- **Out of scope:** redeem (never built for Winnie), undo redeem, the PIN
  and every PIN reader, the Late checks setting, a delete-a-bonus endpoint,
  any migration, any new Marshee-to-Winnie notification, announcing new
  endpoints to Winnie automatically (a later PR from the planning chat),
  `rowStars` on habit answers.

## Bryce's decisions (2026-11-26)

- From the plan (do not re-ask): Winnie may add wishes, give or take stars
  with a note, add rewards and set costs, set a habit's star value; each
  undoable 30 days; never redeems; never sees or touches the PIN; cannot
  change Late checks; deletes only what she made, never a redeemed one; no
  delete-a-bonus endpoint.
- **This chat, with a mock:** the app names her. History: "Bonus from
  Winnie" / "Taken away by Winnie" (note underneath). Manage's Recent:
  "Ledger · +5 from Winnie · Today". A giverless bonus she did not make
  (a parent's login was deleted) still reads "Bonus stars".
- Plan approved as written, including Winnie-only refusal words (Fury's
  defaults): 403 "Winnie can only delete a reward or wish she added
  herself.", 409 "That reward has already been redeemed, so it can't be
  deleted.", 400 "Hours habits don't pay stars."

## What Winnie gets

| Call | Body | Answer | Refusals |
|---|---|---|---|
| `POST /rewards` (`rewards.create`) | `{ personId, title, emoji?, cost?, repeatable? }`; cost given = reward, cost left out or null = wish | 201 `{ person: { personId, name, stars }, reward }` (reward in `GET /rewards` shape) | 404 unknown person; 400 app words; 400 `REWARD_NEEDS_COST_REFUSAL` for `repeatable: true` with no cost |
| `PATCH /rewards/{id}` (`rewards.update`) | any of `title, emoji, cost, repeatable` (cost a number, never null) | 200 same shape | 404 gone; 400 app words / needs-cost |
| `DELETE /rewards/{id}` (`rewards.delete`) | none | 200 `{ removed: true }` | 404 gone; 403 not hers; 409 redeemed |
| `POST /rewards/adjustments` (`rewards.adjust`) | `{ personId, direction: give or take, amount, note? }` | 201 `{ adjustment: { id, personId, amount, note, createdAt }, person: { personId, name, stars } }` | 404 unknown person; 400 app words |
| `POST /habits`, `PATCH /habits/{id}` | gain `stars` (number or null) | as today | 400 `STAR_REFUSAL` off the list; 400 "Hours habits don't pay stars." |

## Danger register

AGENTS.md in full. For this mission:
- `DATABASE_URL` host must be the dev branch `ep-hidden-pine-a6ajzk11-pooler`
  (Fury checked 2026-11-26, hostname only). Never print `.env` beyond it.
- Never `npm run db:seed` / `db:reset`. No migration.
- No agent ever sees the real API token. Live tests use a throwaway token
  whose SHA-256 hash lives only in the dev server's process env.
- Never read or return a PIN field: no new code calls `loadPinCheck` or
  `loadPinStatus` or selects `pinHash`, `pinFailCount`, `pinLockedUntil`,
  `pinRequired`. Redeem, undo redeem, PIN and Late checks code is not edited.
- Test rows are named `ZZZ Assistant Test ...`, deleted by id, with counts
  before and after. Never print family names or item names; ids and counts.
- Stage by explicit path, then `git show --stat HEAD`. Untracked `.agents/`
  and `.codex/` stay out. No direct push to `main`. Stark never commits or
  pushes; Fury commits.
- Mission 86 (Manage person chips, another chat) edits habit app files.
  This mission's habit edits stay inside `src/lib/assistant/` and
  `src/app/api/assistant/`. Sync with `main` right before merging.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (baseline 2281 on main 48f7c4f; count goes up)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- `npm run build`
- `grep -rn "@/app" src/lib/` prints nothing

## Assembled

- Stark + Vision (always).
- Captain: write-module signatures change, new route files, undo models,
  a new shared helper replacing five copies, a top-level lib module now
  asking the audit log.
- Strange: star history and Manage's Recent wording changes.
- No Banner: Fury read every file named below inline for the plan.

## Facts Fury checked (2026-11-26, HEAD 48f7c4f)

- `src/lib/rewardWrites.ts`: `createReward(value: RewardInput, createdById: string)`
  and `createWish(value: WishInput, createdById: string)` return `{ id }`
  (aggregate max `sortOrder` per owner, then create, not in a transaction);
  `updateReward(id, value: RewardInput)` returns `{ id } | null` via
  `updateMany`; `deleteReward(id, wishOnly = false)` is `deleteMany` (cost
  null when `wishOnly`); `updateWish` is separate and untouched.
- `src/lib/starAdjustmentWrites.ts`: `addStarAdjustment({ userId, amount,
  note, createdById: string })` checks `HOUSEHOLD_PERSON_WHERE`, returns
  `{ ok: true, id } | { ok: false, error }`.
- Callers: `src/app/actions/rewards.ts` (`saveReward` calls `createReward`
  / `updateReward(...) === null`; `deleteReward` calls
  `deleteRewardRow(id, ownWish)`; `saveWish` calls `createWish`),
  `src/app/actions/starAdjustments.ts` (`giveOrTakeStars` uses `result.ok`
  and `result.error`). No other caller (grep).
- Model to copy: `addCheckIn` / `removeCheckIn` in `src/lib/goalWrites.ts`:
  `atomically(client, tx => ...)` from `src/lib/habits/participantWrites.ts`,
  `lockGoal`'s `SELECT "id" ... FOR UPDATE`, whole rows back, `WriteError`
  (`invalid` / `missing`, `src/lib/writeError.ts`), a guard callback that may
  throw an `ApiError` (the check-in DELETE route throws 403 from its guard).
- Schema: `Reward { id, ownerId (Cascade), title, emoji?, cost?, repeatable,
  sortOrder, createdById? (SetNull), createdAt, updatedAt @updatedAt }`;
  `RewardRedemption.rewardId?` SetNull; `StarAdjustment { id, userId
  (Cascade), amount, note?, createdById? (SetNull), createdAt }`.
- Undo: `src/lib/assistant/undoModels.ts` (`UndoModel`, column maps,
  `MODELS`, `TIER`, `PARENT_TABLES`, `Reference.child`, `REFERENCES`,
  `FOREIGN_KEYS`), `src/lib/assistant/undoWrites.ts` (`delegate`,
  `countReferences`, `parentExists`; parents locked `FOR UPDATE` before the
  reference count). Copies via `toCopy` in `undoPlan.ts`.
- `assistantCreatedWhere(model, { in: ids })` is hand-batched in
  `rewardReads.ts`, `cookbookReads.ts`, `goalReads.ts`, `shoppingReads.ts`,
  `habitReads.ts`.
- Habits: `checkHabitInput` (`src/lib/habitInput.ts`) refuses a star value
  off `STAR_STEPS` with `STAR_REFUSAL`, silently writes `stars: null` for an
  hours habit, and leaves the column alone when `input.stars` is undefined.
  `HABIT_COLUMNS` already has `stars` (undo covers it).
- History: `toHistoryEntries` / `toRecentEntries` in `src/lib/starHistoryRows.ts`
  set `giverName` from `createdBy?.displayName ?? null`; `bonusFromText`,
  `takenByText`, `recentAdjustSub` in `rewardVocabulary.ts` already take a
  giver name. No "Winnie" constant exists in app code.
- `src/lib/assistant/openapiTypes.ts` `Operation` has `method, path, action,
  summary, query?, body?, response`.

## Contracts

### C1 - Write modules and undo foundations

- **Status:** READY
- **Objective:** make the reward and star-adjustment writes usable by
  Winnie (null creator, optional transaction client, row lock, whole rows
  back), teach undo the two models, and add `assistantCreatedIds`, with the
  family's actions behaving exactly as before. No routes.
- **Boundaries.** May touch: `src/lib/rewardWrites.ts` (only `createReward`,
  `createWish`, `updateReward`, `deleteReward`), `src/lib/starAdjustmentWrites.ts`
  (only `addStarAdjustment`), `src/app/actions/rewards.ts` and
  `src/app/actions/starAdjustments.ts` (call sites only),
  `src/lib/assistant/undoModels.ts`, `src/lib/assistant/undoWrites.ts`,
  `src/lib/assistant/audit.ts` (add `assistantCreatedIds`),
  `src/lib/assistant/rewardReads.ts`, `cookbookReads.ts`, `goalReads.ts`,
  `shoppingReads.ts`, `habitReads.ts` (only the swap to `assistantCreatedIds`),
  new `src/lib/assistant/undoPlanRewards.test.ts`, scratchpad scripts.
  Must not touch: everything else; above all `prisma/`, `package.json`,
  `redeemReward`, `undoRedemption`, every PIN and `RewardSettings` function,
  `updateWish`, `removeStarAdjustment`, route files, `CLAUDE.md`,
  `STRUCTURE.md`, `docs/`.
- **Work:**
  1. `rewardWrites.ts` (types from `@/generated/prisma/client`, `atomically`
     from `@/lib/habits/participantWrites`, `WriteError` from `@/lib/writeError`):
     - `createReward(value: RewardInput, createdById: string | null, client = db): Promise<Reward>`
       and `createWish(value: WishInput, createdById: string | null, client = db): Promise<Reward>`:
       the max-`sortOrder` read and the create run in one `atomically`
       block; same columns as today; return the whole row.
     - `export type RewardEdit = { title: string; emoji: string | null; cost: number | null; repeatable: boolean; ownerId: string }`.
       `updateReward(id, edit: RewardEdit | ((current: Reward) => RewardEdit | WriteError), client = db): Promise<{ before: Reward; after: Reward } | WriteError | null>`:
       in one `atomically` block lock the row
       (`SELECT "id" FROM "Reward" WHERE "id" = ${id} FOR UPDATE`), read it
       (null when gone), resolve `edit` (a function is called with the
       locked row; a `WriteError` is returned as is), and when all five
       fields already equal the row return `{ before: row, after: row }`
       with no write; otherwise `update` and return both rows. A
       `RewardInput` (cost a number) is a valid `RewardEdit`.
     - `deleteReward(id, options: { wishOnly?: boolean; guard?: (row: Reward, redeemedCount: number) => Promise<WriteError | null> | WriteError | null } = {}, client = db): Promise<{ removed: Reward | null } | WriteError>`:
       in one `atomically` block lock the row, read it with its redemption
       count; gone, or `wishOnly` and it has a cost, is `{ removed: null }`
       (today's no-op); a guard refusal is returned (a thrown error rolls
       back); else delete and return the row.
     - Catch `isMissingRowError` as `goalWrites` does where an update can
       race a delete.
  2. `starAdjustmentWrites.ts`: `addStarAdjustment(input: { userId; amount; note; createdById: string | null }, client = db)`
     returns `{ ok: true; id: string; row: StarAdjustment } | { ok: false; error: string }`;
     the person check and the create use `client`.
  3. Actions, call sites only: `createReward(checked.value, user.userId)`
     and `createWish(...)` unchanged in effect; `updateReward(id,
     checked.value)` keeps the `=== null` gone check (a `WriteError` cannot
     come back for a plain value; treat one as `REWARD_SAVE_FAILED`);
     `deleteRewardRow(id, { wishOnly: ownWish })`. Words, gates and
     `revalidatePath` unchanged.
  4. `undoModels.ts`: `Reward` and `StarAdjustment` in `UndoModel`, typed
     column maps (`Record<keyof Reward, ColumnKind>`: `createdAt`,
     `updatedAt` dates; StarAdjustment `createdAt` date), `MODELS`, `TIER`
     (both 0), `PARENT_TABLES.Reward = "Reward"`, `Reference.child` gains
     `"RewardRedemption"`, `REFERENCES.Reward = [{ child: "RewardRedemption", column: "rewardId" }]`
     with a comment (redemptions are never undone, so a redeemed reward is
     always in use), `FOREIGN_KEYS.Reward` (`ownerId` User refuse,
     `createdById` User null), `FOREIGN_KEYS.StarAdjustment` (`userId` User
     refuse, `createdById` User null). Not volatile, not late.
  5. `undoWrites.ts`: `delegate()` gains `Reward: tx.reward`,
     `StarAdjustment: tx.starAdjustment`; `countReferences()` gains
     `RewardRedemption: tx.rewardRedemption`. Nothing else.
  6. `audit.ts`: `export async function assistantCreatedIds(model: string, ids: readonly string[]): Promise<Set<string>>`
     (no query for an empty list; built on `assistantCreatedWhere`). Swap
     the five batched copies to it, behaviour unchanged.
  7. `undoPlanRewards.test.ts` (pure, `planUndo` / `referenceChecks` /
     `fromCopy` on `Reward` and `StarAdjustment` copies): a reward create
     plans a remove and a `RewardRedemption` reference check; a reward edit
     plans a restore; a reward delete plans a recreate whose
     `FOREIGN_KEYS` are the four above; an adjustment create plans a
     remove with no reference check; a copy missing a column is
     `not_undoable`; dates round-trip through `toCopy` / `fromCopy`.
- **Verification:** the gauntlet (all six lines). A scratchpad script on the
  dev database (mission 40's "Live-test setup" stub for `server-only`)
  calling the real functions: `createReward` and `createWish` with a
  `ZZZ Assistant Test` title for one household person (`createdById` a
  real parent id, then `null`), `updateReward` with a value and with a
  function, a no-change `updateReward` (row `updatedAt` unchanged),
  `deleteReward` with `wishOnly` on a reward (no-op) and plain, a guard
  refusal (row still there), `addStarAdjustment` (give then cleanup).
  Every row deleted by id; Reward and StarAdjustment counts before and
  after equal.
- **Evidence required:** the gauntlet tails (test count), the diff stat,
  the script's printed results (ids and counts only), `grep -n
  "loadPinCheck\|loadPinStatus" ` over the touched files showing no new use.
- **Done criteria:** Fury re-runs `tsc` and `npm test`; the family
  call sites read the same as before except the new arguments; the
  script shows counts back to baseline.

### C2 - Winnie's write routes and habit stars

- **Status:** WAITING (after C1)
- **Objective:** the four Rewards write routes and `stars` on habit
  create and patch, exactly as the table above, with OpenAPI rows and tests.
- **Boundaries.** May touch: `src/app/api/assistant/v1/rewards/route.ts`
  (add `POST`), new `src/app/api/assistant/v1/rewards/[id]/route.ts`,
  new `src/app/api/assistant/v1/rewards/adjustments/route.ts`,
  `src/lib/assistant/schemasRewards.ts` (+ test), `serializeRewards.ts`
  (+ test), `rewardReads.ts` (answer readers only),
  `openapiRewardPaths.ts`, `openapiHabitPaths.ts`, `schemasHabits.ts`
  (+ test), `src/app/api/assistant/v1/habits/route.ts`,
  `src/app/api/assistant/v1/habits/[id]/route.ts`. Must not touch: C1's
  write modules and actions, undo files, `starHistory*`, `rewardVocabulary.ts`,
  `habitInput.ts`, anything outside the assistant folders.
- **Work:**
  1. `schemasRewards.ts`: strict bodies `rewardCreateBody`,
     `rewardPatchBody` (non-empty; `cost` a whole number, not nullable),
     `adjustmentBody` (`direction` from the two values, `amount` a whole
     number, `note` string or null); generous zod lengths, the app's checks
     give the words. Pure `patchedRewardInput(current, body): RewardEdit | WriteError`:
     lay the body over the row; no cost after the merge means a wish
     (`repeatable: true` sent is `invalid(REWARD_NEEDS_COST_REFUSAL)`;
     `checkWishInput`; cost null, repeatable false); else `checkRewardInput`.
     A refusal is `invalid(error)`. The three Winnie-only sentences live
     here (`REWARD_NOT_HERS`, `REWARD_REDEEMED`, `HOURS_NO_STARS`).
  2. `POST /rewards`: `requireHouseholdPerson`; cost present means
     `checkRewardInput` + `createReward(value, null)`, else (repeatable
     true refused) `checkWishInput` + `createWish(value, null)`; push
     `rewardChange("create", null, row)`; answer 201.
  3. `PATCH /rewards/{id}`: `updateReward(id, current => patchedRewardInput(current, body))`;
     null is 404, a `WriteError` is `toWriteFailure`; push an update
     change only when the copies differ; answer 200.
  4. `DELETE /rewards/{id}`: `deleteReward(id, { guard })`, the guard
     throwing `ApiError(403, "forbidden", REWARD_NOT_HERS)` unless
     `didAssistantCreate("Reward", row.id)`, then `ApiError(409,
     "conflict", REWARD_REDEEMED)` when redeemed; `removed: null` is 404;
     push `rewardChange("delete", row, null)`.
  5. `POST /rewards/adjustments`: `requireHouseholdPerson`;
     `toAdjustmentInput(body)`; `addStarAdjustment({ userId: personId, ...value, createdById: null })`
     (`ok: false` is `toWriteFailure(missing(error))`); push
     `adjustmentChange(row)`; answer 201.
  6. `serializeRewards.ts`: `rewardChange(action, before, after)` and
     `adjustmentChange(row)`, model names exactly `"Reward"` and
     `"StarAdjustment"`, copies from `toCopy`, short summaries (title and
     cost; amount); `toAdjustmentAnswer` field by field.
  7. `rewardReads.ts`: `readRewardAnswer(ownerId, rewardId)` and
     `readPersonStars(personId)` built on `readRewards` (no new bank sum,
     no new Reward read).
  8. Habits: `stars: z.number().int().nullable().optional()` in both
     bodies; `newHabitInput` / `patchedHabitInput` pass it through
     (undefined leaves the column alone); pure `habitStarsRefusal(input: HabitInput): string | null`
     (an hours habit with a number); both habit routes throw
     `toWriteFailure(invalid(...))` on it before `checkHabitInput`.
  9. OpenAPI rows for the four routes (say she never redeems, never sees
     the PIN, deletes only her own, the cost and star lists, and that a
     cost turns a wish into a reward); `stars` in the habit rows.
  10. Tests beside each file: bodies (strict, bad values), every
      `patchedRewardInput` branch, change builders (model names, full
      copies, no spread), habit stars pass-through and the hours refusal.
- **Verification:** the gauntlet; `openapi.test.ts` passes; a route grep
  shows only `export const X = assistantRoute(`.
- **Evidence required:** gauntlet tails, diff stat, new test names.
- **Done criteria:** Fury re-runs `tsc`, `npm test`, `npx eslint .`.

### C3 - "From Winnie" in star history and Recent

- **Status:** WAITING (after C1; may run beside C2, no shared files)
- **Objective:** a bonus or take-away Winnie made reads "Bonus from Winnie" /
  "Taken away by Winnie" in history and "... from Winnie" in Manage's Recent.
- **Boundaries.** May touch: `src/lib/rewardVocabulary.ts` (one constant),
  `src/lib/starHistoryRows.ts`, `src/lib/starHistoryRows.test.ts` (or the
  existing test that covers it), `src/lib/starHistoryRead.ts`. Must not
  touch: anything else.
- **Work:** `ASSISTANT_GIVER_NAME = "Winnie"` in `rewardVocabulary.ts`
  (with a comment: the name the family calls the Assistant API's bot).
  `toHistoryEntries` and `toRecentEntries` take a `ReadonlySet<string>` of
  adjustment ids Winnie made; giver is `createdBy?.displayName`, else the
  constant when the id is in the set, else null. `loadStarHistory` and
  `loadRecentActivity` build the set with one `assistantCreatedIds("StarAdjustment", ids)`
  call over the giverless adjustments only. Tests: her id reads "Bonus
  from Winnie" / "Taken away by Winnie" / "from Winnie"; a giverless id
  not in the set still reads "Bonus stars"; a named giver wins.
- **Verification:** the gauntlet.
- **Evidence required:** gauntlet tails, diff stat.
- **Done criteria:** Fury re-runs `npm test`.

### C4 - Live test on the dev database

- **Status:** WAITING (after C2 and C3)
- **Objective:** prove the Done-means list end to end over HTTP.
- **Boundaries.** Scratchpad files only; no repo file changes.
- **Work:** mission 40's "Live-test setup" (throwaway token, hash only in
  the dev server's env, `ASSISTANT_OWNER_USER_ID` set for the habit actor,
  port 3139, server stopped after). Collect every `x-assistant-request-id`
  and delete those `AssistantRequest` rows by id at the end (W1 leftover).
  Record counts of Reward, StarAdjustment, RewardRedemption, Habit,
  AssistantRequest and each test person's bank (from `GET /rewards`)
  before and after. Cases: create reward, create wish, patch wish to a
  reward, patch title, adjust give and take (each: undo, bank and rows as
  before; redo by undoing the undo where the chain allows); a family-made
  reward (made by script with a parent's id) DELETE is 403; a Winnie
  reward redeemed by script through the app's own `redeemReward` write:
  undo of its create is 409 `changed_since` / `in_use`, DELETE 409; a
  test chore `stars: 5` then undo; a test hours habit `stars: 5` is 400;
  `repeatable: true` with no cost 400; a cost off the list 400; no answer
  contains `pin`; a bad token 401; `GET /rewards/history` and
  `/rewards/recent` show "Bonus from Winnie" for her bonus. Then the
  family path: the C1 script again (create, edit, delete reward;
  give stars) passes.
- **Evidence required:** a table of every case with status codes and
  before and after counts; ids only.
- **Done criteria:** every count and bank back to baseline; Vision re-runs.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Delivery

(filled in at the end)
