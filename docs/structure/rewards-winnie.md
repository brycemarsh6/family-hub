# STRUCTURE.md companion: Winnie and Rewards

Part of [STRUCTURE.md](../../STRUCTURE.md)'s "One source of truth" list, split
out of [rewards.md](rewards.md) by mission 85 (Winnie Rewards W2) when that
file passed 300 lines. Every rule here binds exactly like STRUCTURE.md; a
second definition is a BLOCKER. Plan: `.avengers/plans/winnie-rewards-v1.md`.

## Winnie's Rewards reads (mission 84, W1)

`GET /rewards`, `/rewards/history` and `/rewards/recent`
(`src/app/api/assistant/v1/rewards/`) and the `stars` section of
`GET /summary` read only. `src/lib/assistant/rewardReads.ts` (`server-only`)
is their only reader and calls only the app's own: people from
`loadHouseholdPeople`, banks from `loadStarBanks`, rewards from
`loadRewards`, history from `loadStarHistory` (viewer
`assistantHabitActor()`, so `canSeeHabit` hides private names), Recent from
`loadRecentActivity`, the setting from `loadLateStars`, and "did Winnie make
this reward" from `assistantCreatedIds("Reward", ids)`. `serializeRewards.ts`
(pure) builds every answer field by field and applies only the app's rules
(`orderRewards`, `rewardStatus`, `isWish`). A bank sum, or a Reward,
RewardRedemption or StarAdjustment read, anywhere under `src/lib/assistant/`
or `src/app/api/assistant/` other than through these readers, the write
modules below, or the undo machinery (next section) is a BLOCKER, and the
PIN readers are never called. Habit answers carry the habit's own `stars`
value (`Habit.stars`).

## Winnie's Rewards writes (mission 85, W2)

- **Routes.** `POST /rewards` (a cost makes a reward, none a wish),
  `PATCH /rewards/{id}`, `DELETE /rewards/{id}`, `POST /rewards/adjustments`,
  and `stars` on `POST /habits` / `PATCH /habits/{id}`. Every route is only
  `export const X = assistantRoute(...)`. Redeem is never built for Winnie,
  and no Winnie route reads or writes `RewardSettings` (the PIN and Late
  checks stay the family's).
- **One writer each.** Rewards are written only by `createReward`,
  `createWish`, `updateReward`, `deleteReward` in `src/lib/rewardWrites.ts`;
  star adjustments only by `addStarAdjustment` in
  `src/lib/starAdjustmentWrites.ts`. Both callers (the family's actions and
  Winnie's routes) share them: `createdById` is null for Winnie, a write
  takes an optional transaction client, `updateReward` and `deleteReward`
  lock the row (`FOR UPDATE`) and hand back whole rows for the undo copies.
  `updateReward` takes a function so Winnie's partial edit is laid over the
  locked row inside the write (`patchedRewardInput` in `schemasRewards.ts`,
  pure); `deleteReward` takes a guard that sees the row and its redeemed
  count. A route reading a Reward itself is a BLOCKER.
- **Input words.** Winnie's bodies are checked by the app's own
  `checkRewardInput`, `checkWishInput` (`rewards/rewardRules.ts`),
  `toAdjustmentInput` (`rewards/starAdjustments.ts`) and `checkHabitInput`;
  the cost list is `COST_STEPS`, the star list `STAR_STEPS`. The only words
  of her own live in `schemasRewards.ts` (`REWARD_NOT_HERS`,
  `REWARD_REDEEMED`, `HOURS_NO_STARS`); `habitStarsRefusal` in
  `schemasHabits.ts` refuses a number of stars on an hours habit before
  `checkHabitInput` (which would quietly drop it).
- **Delete.** Only a reward or wish she created (`didAssistantCreate("Reward", id)`,
  403 otherwise) and never one already redeemed (409). Creates are recorded
  under the model names `"Reward"` and `"StarAdjustment"` (`rewardChange`,
  `adjustmentChange` in `serializeRewards.ts`), which is what W1's
  `createdByAssistant` and the history's "from Winnie" look up.
- **Undo.** `Reward` and `StarAdjustment` are undo models
  (`src/lib/assistant/undoModels.ts`, `undoWrites.ts`). `REFERENCES.Reward`
  counts `RewardRedemption.rewardId`, so undoing "Winnie added a reward" is
  refused once the family has redeemed it. Undoing an edit after a redeem is
  allowed: the redemption keeps its own snapshot. No cache rebuild: the bank
  is a live sum in `loadStarBanks`. **Exception to the W1 read rule:**
  `undoWrites.ts` (`delegate`, `countReferences`) may read and write Reward,
  StarAdjustment and count RewardRedemption rows, because it is the one undo
  engine for every model.
- **Who gave a bonus.** A Winnie bonus has no `createdById`.
  `starHistoryRead.ts` asks `assistantCreatedIds("StarAdjustment", ids)` for
  the giverless adjustments only, and `starHistoryRows.ts` names the giver:
  the person, else `ASSISTANT_GIVER_NAME` ("Winnie", `rewardVocabulary.ts`)
  when she made it, else none ("Bonus stars"). This is the one top-level lib
  module that imports `src/lib/assistant/audit.ts`; it imports only
  `assistantCreatedIds`, never route machinery.
- **One audit-log batch.** `assistantCreatedIds(model, ids)` in
  `src/lib/assistant/audit.ts` is the only batched "which of these did Winnie
  make" query (it replaced five copies); a hand-built
  `assistantCreatedWhere(model, { in: ... })` read is a BLOCKER.
