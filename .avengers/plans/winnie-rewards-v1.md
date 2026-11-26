# Winnie Rewards v1: Rewards in the Assistant API

## Context

Rewards shipped on 2026-11-26 (PRs #124, #125, #126, #128, #130), but Winnie,
Bryce's Grok bot, cannot see or use any of it. Her API
(`/api/assistant/v1/`) has no Rewards endpoints. The only link today is
indirect: when she checks a habit it pays its stars, and her undo takes them
back. The Rewards plan parked "Winnie endpoints for rewards" for later. This
is that later.

Step 0 is to save this plan in the repo as
`.avengers/plans/winnie-rewards-v1.md` (it rides in the first PR). Then build
it as two small PRs through the Avengers process, one chat per PR, one after
the other (they share files, so not in parallel).

## Decisions Bryce made (2026-11-26, do not re-ask)

1. **Winnie can see everything:** star banks, rewards with progress, wishes
   waiting for a cost, each person's star history, and recent redeems and
   bonuses.
2. **Winnie can make four kinds of change**, each undoable for 30 days like
   her other changes: add wishes; give or take stars with a note; add
   rewards and set costs; set the star value on a habit or chore.
3. **Winnie can never redeem.** Redeeming stays in the app, with the
   celebration and the parent PIN. She can say who is ready to redeem.
4. **Her summary gains stars** (banks, and how many wishes wait for a cost).
   The morning briefing does not change.

Defaults I chose (structure, or existing rules carried over; say so if you
want different):
- Winnie never sees or touches the PIN, and cannot change the Late checks
  setting (she can read which setting is on).
- She may delete only rewards and wishes she created herself, and not one
  that has already been redeemed (the existing "only what she created" rule).
- No "delete a bonus" endpoint. A bonus is taken back with her normal undo,
  or by a matching take-away.
- People are named by id from `GET /family`, like every other area.
- Private habit names in history follow her existing rule: she sees Bryce's,
  nobody else's (`assistantHabitActor()`).
- No new notifications from Marshee to Winnie (for example "a wish was
  added"). That can be a later step.

## What Winnie gets (the endpoints)

Read (PR W1):
- `GET /rewards` (optional `personId`): for each person, their star bank and
  their rewards. Each reward has title, emoji, cost, repeatable, times
  redeemed, a status (`earned`, `wish`, `ready`, `saving`), the progress
  words ("45 of 50"), and `createdByAssistant`. Also the Late checks setting.
- `GET /rewards/history?personId=`: that person's last 30 days of star
  lines, grouped by day, plus their bank.
- `GET /rewards/recent`: household redeems and bonuses, newest first.
- `GET /habits...` responses gain `stars` on each habit.
- `GET /summary` gains `stars: { banks: [{ personId, name, stars }],
  wishesWaiting }`.

Write (PR W2):
- `POST /rewards`: a reward (with a cost) or a wish (no cost) for a person.
- `PATCH /rewards/{id}`: title, emoji, cost, repeatable. Setting a cost on a
  wish is how a wish becomes a reward.
- `DELETE /rewards/{id}`: only one she created (403 otherwise), and 409 if it
  has been redeemed.
- `POST /rewards/adjustments`: give or take stars for a person, with the same
  steps and the same 60 character note as the Manage page.
- `POST /habits` and `PATCH /habits/{id}` accept `stars` (the habit form's
  steps: 1 to 5, 10, 15, 20, 25, 50, or none; never on hours habits).

## How it works underneath (structure, my recommendation)

Follow the existing habits and goals pattern exactly. Every route file is
only `export const X = assistantRoute({ action, body?, query?, handler })`
(`src/lib/assistant/assistantRoute.ts` does the token check, rate limit,
validation, audit row and error mapping).

**Reuse, never rewrite** (`docs/structure/rewards.md` makes a second copy a
BLOCKER):
- Bank: `loadStarBanks` in `src/lib/starBankRead.ts`. It stays the only bank
  sum, including in the summary.
- Rewards: `loadRewards` in `src/lib/rewardsRead.ts`, with `rewardStatus`,
  `isEarned`, `isWish`, `orderRewards` from `src/lib/rewards/rewardRules.ts`.
- History: `loadStarHistory` and `loadRecentActivity` in
  `src/lib/starHistoryRead.ts`, viewer from `assistantHabitActor()`
  (`src/lib/assistant/habitActorEnv.ts`).
- Setting: `loadLateStars` in `src/lib/rewardSettingsRead.ts`. Never
  `loadPinCheck` or `loadPinStatus`.
- Input checks: `checkRewardInput`, `checkWishInput`
  (`rewards/rewardRules.ts`), `toAdjustmentInput`
  (`rewards/starAdjustments.ts`), `checkHabitInput` for habit stars.
- People: `requireHouseholdPerson` (`src/lib/assistant/habitReads.ts`).
- "Did Winnie make this": `didAssistantCreate` (`src/lib/assistant/audit.ts`).

**New files** (all picked up by the existing test glob, no new folder):
- Routes: `src/app/api/assistant/v1/rewards/route.ts`, `rewards/[id]/route.ts`,
  `rewards/history/route.ts`, `rewards/recent/route.ts`,
  `rewards/adjustments/route.ts`.
- `src/lib/assistant/schemasRewards.ts` (strict zod, values from
  `rewardVocabulary.ts`), `rewardReads.ts` (server-only, combines the
  existing readers), `serializeRewards.ts` (field by field shaping and the
  undo copies), `openapiRewardPaths.ts` (spread into `operations` in
  `openapi.ts`; `openapi.test.ts` fails until routes and registry match).
- Tests beside each: `schemasRewards.test.ts`, `serializeRewards.test.ts`,
  `undoPlanRewards.test.ts`.

**Changed files:**
- W1: `src/lib/assistant/serializeHabits.ts` and `habitReads.ts` (show
  `stars`), `summaryReads.ts`, `summary/route.ts`, `openapiSummaryPaths.ts`,
  `openapiHabitPaths.ts`.
- W2, the one real piece of surgery: `src/lib/rewardWrites.ts`
  (`createReward`, `createWish`, `updateReward`, `deleteReward`) and
  `src/lib/starAdjustmentWrites.ts` (`addStarAdjustment`) today return only
  an id and need a logged-in creator. They must, on the
  `goalWrites.addCheckIn` model: take `createdById: string | null` (Winnie
  passes null), accept an optional transaction client, lock the row, and
  return the full before and after rows so undo copies can be saved. The
  family's actions in `src/app/actions/rewards.ts` and `starAdjustments.ts`
  must behave exactly as before.
- W2 undo: `src/lib/assistant/undoModels.ts` gains `Reward` and
  `StarAdjustment` (column maps, `MODELS`, `TIER`, `FOREIGN_KEYS`: owner or
  person missing means refuse, creator missing means null) and a
  `REFERENCES` entry so undoing "Winnie added a reward" is refused once the
  family has redeemed it. `undoWrites.ts`: `delegate()`, `countReferences()`,
  `parentExists()`. No cache rebuild is needed (the bank is a live sum).
- W2 habits: `schemasHabits.ts` (`habitCreateBody`, `habitPatchBody`,
  `newHabitInput`, `patchedHabitInput`) accept `stars`; the star columns are
  already undoable.
- Docs in each PR: CLAUDE.md (Assistant API paragraph, small edit),
  `docs/structure/rewards.md` (the Winnie routes), the mission file.

## The PR ladder

**W1. Winnie reads Rewards** (mission 84, no migration, no write changes)
- The three GET routes, `stars` on habits, the summary section, the OpenAPI
  rows, tests. Low risk: nothing is written.
- Bryce sees: ask Winnie "how many stars does everyone have", "what is Ledger
  saving for", "what did he earn this week", "any wishes waiting".

**W2. Winnie changes Rewards** (mission 85, no migration)
- The write routes, the write-module surgery, undo models, habit stars.
- Bryce sees: "give Ledger 5 stars for a great attitude", "add a Lego set to
  his wishes", "make it cost 150", "make Dishes worth 5 stars", then "undo
  that" for each.

No database migration in either PR: every table and column already exists.

## Small questions saved for the start of each PR (with a mock)

- W1: none expected. The response field names are structure.
- W2: what the app's star history shows for a bonus Winnie gave. Today a
  bonus with no giver falls back to a generic line (`BONUS_NO_GIVER` in
  `rewardVocabulary.ts`); the choice is that, or "Bonus from Winnie".
- After W1 merges: check with Bryce how Winnie picks up new endpoints (she
  reads `GET /openapi.json`; she may need to be told to refresh it).

## Verification (every PR)

- `npx tsc --noEmit`, `npx eslint .`, `npm test` (count goes up),
  `npm run build`, `grep -rn "@/app" src/lib/` prints nothing.
- Both timezones:
  `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- Live test on the dev database, using the setup in
  `.avengers/missions/mission-40-assistant-undo.md` ("Live-test setup"): a
  throwaway token whose hash lives only in the server's process env, test
  rows named `ZZZ Assistant Test ...`, every test row and `AssistantRequest`
  deleted by id at the end, counts before and after. No agent ever sees the
  real API token.
  - W1: each GET matches what the Rewards page shows for the same person; a
    private habit of another person shows as "A private habit"; no response
    contains `pinHash` or any PIN field; a bad token gets 401.
  - W2: each write, then `POST /audit/{requestId}/undo`, leaves the bank and
    the rows exactly as they started; undo is refused once a Winnie-made
    reward has been redeemed; DELETE of a family-made reward is 403; a star
    value on an hours habit is refused; the family's own add, edit, delete
    and give or take stars in the app still work.
- Gates: Vision (correctness) and Captain (structure) on both. Strange
  (design) only if W2 changes the history wording.
- After each merge: `git log origin/main..HEAD` is empty, the production
  deploy is READY, and Bryce's test lines go in `.avengers/status.md`.

## Standing rules for both sessions

AGENTS.md danger register in full (stage by path, no direct pushes to main,
never print `.env` beyond the hostname, no `db:seed` or `db:reset`). Hill
only when the chat is in bypass permissions mode, and never on money, logins
or the API token. Fury plans on Fable and builds on Opus.
