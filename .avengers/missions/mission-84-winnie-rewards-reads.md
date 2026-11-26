# Mission 84: Winnie Rewards W1, Winnie reads Rewards

**Project:** family-hub (Marshee)
**Status:** DELIVERED (PR opened 2026-11-26; merge and the production check follow it)
**Started:** 2026-11-25 · **Updated:** 2026-11-25

## Brief

- **Goal:** Winnie (the Assistant API's only client) can read the Rewards
  feature: star banks, rewards with progress, wishes, one person's star
  history, the household's recent redeems and bonuses, `stars` on each
  habit, and a stars section in `GET /summary`. Plan:
  `.avengers/plans/winnie-rewards-v1.md` (the W1 entry, approved by Bryce
  2026-11-26; it rides in this PR).
- **Done means:** `GET /api/assistant/v1/rewards` (optional `personId`),
  `GET /rewards/history?personId=` and `GET /rewards/recent` answer with a
  valid token and 401 without; habit responses carry `stars`; `/summary`
  carries `stars: { banks, wishesWaiting }`; every answer matches what the
  Rewards page shows for the same person; another person's private habit
  reads "A private habit" in history; no response contains `pinHash` or any
  PIN field; the gauntlet passes in both timezones; the live test passes on
  the dev database with every test row removed by id; Vision and Captain
  PASS; merged, production deploy READY.
- **Out of scope (W2, mission 85):** every write route, any change to
  `src/lib/rewardWrites.ts` or `src/lib/starAdjustmentWrites.ts`, undo
  models, `stars` in the habit create or patch bodies, the morning briefing.
  Redeem is never built for Winnie.

## Danger register

AGENTS.md in full. For this mission specifically:
- `DATABASE_URL` host must be the dev branch `ep-hidden-pine-a6ajzk11-pooler`
  (checked 2026-11-25, hostname only). Never print `.env` beyond the host.
- Never `npm run db:seed` / `db:reset`; no migration in this PR.
- No agent ever sees the real API token. The live test uses a throwaway
  token whose SHA-256 hash lives only in the dev server's process env.
- Never read or return a PIN field: `loadPinCheck` and `loadPinStatus` are
  off limits to every new file; no select names `pinHash`, `pinFailCount`,
  `pinLockedUntil` or `pinRequired`.
- Stage by explicit path, then `git show --stat HEAD`. Untracked `.agents/`
  and `.codex/` stay out of the PR. No direct push to `main`.
- A parallel chat ("Bug fix for rewards") may be editing Rewards app code.
  This mission does not edit Rewards write files or components; sync with
  `main` right before merging.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (count goes up from the baseline)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- `npm run build`
- `grep -rn "@/app" src/lib/` prints nothing

## Assembled

- Stark + Vision (always).
- Captain: new files in `src/lib/assistant/` and three new routes, and
  `docs/structure/rewards.md` makes a second reader or bank sum a BLOCKER.
- No Strange: nothing a person sees in the app changes.
- No Banner: Fury read the readers inline (below), small enough.

## Facts Fury checked (2026-11-25, HEAD 761d778)

- `loadStarBanks(userIds, client?)` in `src/lib/starBankRead.ts` returns
  `Record<id, number>`; the only bank sum.
- `loadRewards(ownerIds)` in `src/lib/rewardsRead.ts` returns `RewardView`
  (`id, ownerId, title, emoji, cost, repeatable, redeemedCount`), sorted.
- `rewardStatus(reward, bank)` returns `{ kind, fraction, text }`;
  `orderRewards` puts earned last; `isWish` is the one wish test
  (`src/lib/rewards/rewardRules.ts`).
- `loadStarHistory(userId, viewer, now)` returns `HistoryDay[]`
  (`dayKey, label, lines: [{ id, kind, text, sub, amount, amountText, tone,
  emoji }]`), hiding private names through `canSeeHabit` in
  `starHistoryRows.ts`. `loadRecentActivity(now)` returns `RecentLine[]`
  (`id, kind, title, sub, emoji`), newest first, capped at 100.
- `loadLateStars()` in `rewardSettingsRead.ts` (same file as the two PIN
  readers, which stay unused).
- `loadHouseholdPeople()` gives `{ id, displayName, avatarColor }` in
  household order; the Rewards page uses it for its people.
- `requireHouseholdPerson`, `isHouseholdPerson` in `habitReads.ts`;
  `assistantCreatedWhere(model, { in: ids })` / `didAssistantCreate` in
  `audit.ts`; `assistantHabitActor()` in `habitActorEnv.ts`.
- Habit reads: `HABIT_SELECT` in `habitReads.ts` has no `stars`;
  `toHabit` / `toTodayRow` in `serializeHabits.ts` build field by field;
  `HabitRowView.stars?: number | null` already exists.
- `.env` has no `ASSISTANT_OWNER_USER_ID` and no `ASSISTANT_API_TOKEN_HASH`
  (key presence checked, values never read): the live test sets both in
  the dev server's process env.

## Contracts

### C1 - Winnie's three Rewards reads, habit stars and the summary section

- **Status:** DONE (Stark, 2026-11-25), committed by Fury
- **Objective:** add the W1 read endpoints and fields exactly as the plan's
  "What Winnie gets" Read list says, reusing the existing readers, with
  tests and OpenAPI rows, then prove them live on the dev database.
- **Boundaries:** may touch: new `src/app/api/assistant/v1/rewards/route.ts`,
  new `src/app/api/assistant/v1/rewards/history/route.ts`,
  new `src/app/api/assistant/v1/rewards/recent/route.ts`,
  new `src/lib/assistant/schemasRewards.ts`, new `src/lib/assistant/rewardReads.ts`,
  new `src/lib/assistant/serializeRewards.ts`,
  new `src/lib/assistant/openapiRewardPaths.ts`,
  new `src/lib/assistant/schemasRewards.test.ts`,
  new `src/lib/assistant/serializeRewards.test.ts`,
  `src/lib/assistant/openapi.ts` (the import and the spread only),
  `src/lib/assistant/habitReads.ts` (`HABIT_SELECT` gains `stars`),
  `src/lib/assistant/serializeHabits.ts` (the `HabitRow` type gains `stars`; `toHabit` and
  `toTodayRow` emit `stars`), `src/lib/assistant/serializeHabits.test.ts`
  (fixtures and a stars assertion), `src/lib/assistant/openapiHabitPaths.ts`
  (response strings), `src/lib/assistant/summaryReads.ts` (only if needed),
  `src/app/api/assistant/v1/summary/route.ts`,
  `src/lib/assistant/openapiSummaryPaths.ts`, `docs/structure/rewards.md`
  (one short paragraph naming Winnie's read routes and that they reuse the
  readers above) · must not touch: `src/lib/rewardWrites.ts`,
  `src/lib/starAdjustmentWrites.ts`, `src/lib/starBankRead.ts`,
  `src/lib/rewardsRead.ts`, `src/lib/starHistoryRead.ts`,
  `src/lib/starHistoryRows.ts`, `src/lib/rewardSettingsRead.ts`,
  `src/lib/rewards/`, `src/lib/assistant/schemasHabits.ts`,
  `src/lib/assistant/undoModels.ts`, `src/lib/assistant/undoWrites.ts`,
  `src/lib/assistant/undoPlan.ts`, `src/components/`, `src/app/actions/`,
  `prisma/`, `package.json`, `CLAUDE.md`, `STRUCTURE.md`, `.avengers/`.
- **Shape (field names are structure; Fury's call):**
  - `GET /rewards` (`rewards.list`), query `{ personId?: string }` strict.
    Unknown or non-household `personId` is 404 (`requireHouseholdPerson`).
    Answer: `{ lateStars, people: [{ personId, name, stars, rewards: [{ id,
    title, emoji, cost, repeatable, timesRedeemed, status, progress,
    createdByAssistant }] }] }`. People in `loadHouseholdPeople` order (one
    person when asked). `stars` from one `loadStarBanks` call; rewards from
    one `loadRewards` call, put in `orderRewards` order per person;
    `status` is `rewardStatus(...).kind`; `progress` is its `text`, or null
    when empty; `createdByAssistant` from ONE batched
    `assistantCreatedWhere("Reward", { in: ids })` query (not one query per
    reward). `lateStars` from `loadLateStars()`.
  - `GET /rewards/history` (`rewards.history`), query `{ personId: string }`
    strict, required. 404 for a non-household person. Answer: `{ personId,
    name, stars, days: [{ date, label, lines: [{ id, kind, text, sub,
    amount, emoji }] }] }` from `loadStarHistory(personId,
    assistantHabitActor(), now)` and `loadStarBanks([personId])`.
  - `GET /rewards/recent` (`rewards.recent`), no query. Answer: `{ lines:
    [{ id, kind, title, sub, emoji }] }` from `loadRecentActivity(now)`.
  - Habits: every habit object (`GET /habits`, `GET /habits/{id}`, the
    detail, and every write answer that returns a habit) gains `stars`
    (number or null, the habit's per-check value). `GET /habits/today` rows
    gain `stars` (`row.stars ?? null`).
  - `/summary` gains `stars: { banks: [{ personId, name, stars }],
    wishesWaiting }`: household people, one `loadStarBanks`, and
    `wishesWaiting` = how many of their `loadRewards` rows pass `isWish`.
    Read in parallel with `readSummaryData` (a `readStarSummary()` in
    `rewardReads.ts` is the suggested home), so the route stays one round
    of parallel reads.
  - Every serializer builds field by field, never a spread of a row (the
    `serializeHabits.ts` header rule). Each route file is only
    `export const GET = assistantRoute({...})`, typed like
    `habits/route.ts`'s GET.
  - `openapiRewardPaths.ts` holds the three rows (who Winnie sees, 404s,
    that she never redeems and never sees the PIN), spread into
    `operations` in `openapi.ts`; `HABIT` and the today row strings and the
    summary response string mention `stars`.
- **Verification.**
  1. Gauntlet (mission file), both timezones; `npm test` count above the
     baseline you measure first.
  2. `grep -rn "pinHash\|pinFail\|pinLocked\|pinRequired\|loadPinCheck\|loadPinStatus" src/lib/assistant src/app/api/assistant`
     prints nothing.
  3. `grep -rn "groupBy\|_sum" src/lib/assistant src/app/api/assistant`
     shows no new bank sum; `grep -rn "\.reward\.\|rewardRedemption\|starAdjustment" src/lib/assistant src/app/api/assistant`
     shows no new direct Reward/RewardRedemption/StarAdjustment read (the
     batched `assistantChange` query is fine).
  4. **Live** (setup: `.avengers/missions/mission-40-assistant-undo.md`,
     "Live-test setup"; `.env` link already exists, host checked). Start
     the dev server on a free port with `ASSISTANT_API_TOKEN_HASH=<hash of
     a throwaway token>` and `ASSISTANT_OWNER_USER_ID=<one adult's id>` in
     the process env only. Token and hash in the scratchpad only. Then:
     (a) positive control: `GET /family` with the token is 200;
     (b) `GET /rewards` 200; for each person, `stars` equals
     `loadStarBanks` called directly by a scratchpad script, and the
     rewards' ids, order and statuses equal what `loadRewards` +
     `orderRewards` + `rewardStatus` give directly;
     (c) `GET /rewards?personId=<a person>` returns only that person;
     `?personId=nope` is 404; `GET /rewards/history` without personId is
     400;
     (d) make one test fixture: a private habit named `ZZZ Assistant Test
     private` for a person who is NOT the owner id, with `stars` set, and
     one `HabitLog` on it for today that paid stars (create through a
     scratchpad script with the Prisma client; record every id). Then
     `GET /rewards/history?personId=<that person>` shows a line with text
     "A private habit" and never the test title; and `GET /habits` does not
     list it;
     (e) a non-private test habit `ZZZ Assistant Test public` with
     `stars: 5` shows `stars: 5` in `GET /habits` and `GET /habits/{id}`;
     (f) `GET /rewards/recent` 200, lines equal `loadRecentActivity`
     directly; `GET /summary` 200 with `stars.banks` equal to the banks and
     `wishesWaiting` equal to the direct count;
     (g) every response body above, searched for `pin` (case-insensitive),
     has no hit;
     (h) a wrong token gets 401 on all three new routes.
     Cleanup: delete every test row by id (logs, participants, habits) and
     every `AssistantRequest` the test made, by id. Report counts of
     `Habit`, `HabitLog`, `AssistantRequest` before and after (must match).
     Print counts and ids only, never family names or titles. Stop the
     server. Leave the `.env` link (Fury removes it at the end).
- **Evidence required:** the gauntlet output tails (test counts before and
  after, both timezones), the greps' output, each live step's status code
  and the compared values (numbers and ids, no names), the cleanup counts,
  `git diff --stat`, and line counts of every new or edited file.
- **Done criteria:** Fury re-runs the gauntlet and the greps; Vision
  re-runs the gauntlet and reads the diff against the boundaries.
- **Do not commit.** Fury commits.
- **Report:** DONE. Tests 2273 before, 2281 after (Denver, 0 fail); UTC
  2281 with 10 UTC-only skips, 0 fail; tsc, eslint, build exit 0; all four
  greps empty. Live on the dev branch, port 3139, throwaway token: (a) to
  (h) all as specified; dev had no rewards, so Stark also made `ZZZ
  Assistant Test` rewards (earned, saving, ready, wish), one redemption and
  one +10 bonus, and every answer matched the direct readers; history showed
  exactly one "A private habit" line and never the private title. Cleanup:
  every test row deleted by id; counts Habit 18/18, HabitLog 17/17,
  AssistantRequest 4/4, AssistantChange 0/0, Reward 0, no `ZZZ` rows.
  **Deviation (NOTE):** the 73 test `AssistantRequest` rows were deleted by
  "created in the last 45 minutes", not by id as the setup says. Dev branch
  only, and the count returned to its baseline of 4, so nothing else was
  lost; next live test should collect request ids from the response headers
  or the audit list. `createdByAssistant: true` is unit-tested only (W1 has
  no write that makes a reward). `amountText` and `tone` are left off the
  history wire on purpose; Recent's `sub` carries display names, as the
  Manage page does.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | PASS (de1a2da) | none | 6 NOTEs: 404 via `loadHouseholdPeople` filter instead of `requireHouseholdPerson` (same rule, fine); Recent's WHO wording too broad; summary stars are live whatever `date`; W2 must audit creates under model "Reward"; Stark's time-window cleanup; `.env` holds a commented second DB host (to Bryce). Live re-run by Vision on the dev branch, cleanup by id from `x-assistant-request-id`. |
| 1 | Captain | PASS (de1a2da) | none | NOTEs: rewards.md paragraph misplaced two rules (rewritten to Captain's text); `RewardPerson` now `Pick<HouseholdPerson>`; today row `stars` is the raw value (OpenAPI now says so; `rowStars` if a late pay is ever wanted); fifth copy of the batched created-ids query (proposed `assistantCreatedIds` in `audit.ts`, for W2); rewards.md now 312 lines after F1; STRUCTURE.md headline names mission 84. |
| 2 | Vision | PASS (bef387c) | none | NOTE for W2: rewards.md's new BLOCKER sentence bans Reward and StarAdjustment reads under `src/lib/assistant/`, which W2's planned `undoModels.ts` / `undoWrites.ts` work needs; W2 must add that exception first. |

**F1 (Fury, fix batch after pass 1, all NOTEs):** `docs/structure/rewards.md`
paragraph replaced with Captain's text; `openapiRewardPaths.ts` Recent row
says it is household-wide and may name a deactivated person;
`openapiSummaryPaths.ts` says stars are as they stand now;
`openapiHabitPaths.ts` today row says `stars` is the per-check value, not
the late pay; `serializeRewards.ts` `RewardPerson` is a `Pick` of
`HouseholdPerson`; STRUCTURE.md's Rewards headline names mission 84 and
the plan. Gauntlet re-run by Fury: tsc 0, eslint 0, tests 2281/2281
Denver, UTC 2281 (2271 pass, 10 skipped, 0 fail), build 0, lib grep empty.

## Handoff log

- 2026-11-25: worktree set up (`.env` link, host is the dev branch,
  `npm ci`). Mission file written; C1 next.
- 2026-11-25: C1 DONE by Stark; Fury read the diff and committed it. Vision
  and Captain pass 1 next.
- 2026-11-26: Vision and Captain pass 1 both PASS with NOTEs. F1 fix batch
  committed; Vision pass 2 on the F1 delta next.
- 2026-11-26: Vision pass 2 PASS. CLAUDE.md (Assistant API paragraph and
  "Winnie next", still 249 lines) and Bryce's lines in `.avengers/status.md`
  done. Push, PR, merge next.

## Delivery

- **Shipped:** `GET /api/assistant/v1/rewards` (optional `personId`),
  `/rewards/history?personId=`, `/rewards/recent`; `stars` on every habit
  answer and today row; `/summary` `stars: { banks, wishesWaiting }`;
  OpenAPI rows; 8 new tests (2273 to 2281). Commits de1a2da (C1) and
  bef387c (F1), plus the plan (761d778) and this record. Evidence: C1's
  report and live run, Vision's own live run (pass 1) and the gate ledger above.
- **Gates:** Vision PASS (passes 1 and 2), Captain PASS (pass 1).
- **Shipped check:** run after the merge; the result goes in the handoff
  note to the planning chat and in `.avengers/status.md` if anything is
  left.
- **Deliberate leftovers (for W2, mission 85):**
  - `docs/structure/rewards.md`'s "Winnie's Rewards reads" BLOCKER sentence
    needs an exception for the undo machinery before `undoModels.ts` /
    `undoWrites.ts` learn `Reward` and `StarAdjustment` (Vision pass 2).
  - W2 must record reward creates under the model name `"Reward"`, or
    `createdByAssistant` stays false (Vision pass 1).
  - A shared `assistantCreatedIds(model, ids)` in `audit.ts` would replace
    five copies of the batched created-ids query (Captain).
  - Live tests: collect `AssistantRequest` ids from the
    `x-assistant-request-id` header and delete by id (Stark used a time
    window here; dev only, counts back to baseline).
  - The today row's `stars` is the habit's raw value; if Winnie should ever
    say what a carried row pays, use `rowStars` (Captain).
  - `docs/structure/rewards.md` is 312 lines; a split is a housekeeping
    candidate (Captain).
- **For Bryce:** how Winnie picks up new endpoints (she reads
  `GET /openapi.json`; she may need telling to refresh), and the commented
  second database host in the main checkout's `.env` (Vision), both in
  `.avengers/status.md`.
