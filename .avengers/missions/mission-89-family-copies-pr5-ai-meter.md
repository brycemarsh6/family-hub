# Mission 89: family copies PR 5, AI usage meter and Upgrade

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-11-26 · **Updated:** 2026-11-26
**Branch:** `claude/family-copies-pr5-ai-meter` (cut from origin/main b7c5651)
**Plan:** `.avengers/plans/family-copies-v1.md`, sections "How a copy is configured" and "PR 5"

## Brief

- **Goal:** every Anthropic call records its token use and cost; a relative's
  copy refuses AI calls once this month's allowance is spent (or when it has
  no allowance) and shows a friendly message with an Upgrade link; Bryce's
  copy records but never blocks; Settings gets an "AI features" card.
- **Done means:**
  1. New table `AiUsage` (additive migration).
  2. `src/lib/aiMeterPolicy.ts` pure and tested: price table, household
     calendar-month window, allow or block.
  3. `src/lib/aiMeter.ts` `meteredCreate` replaces every
     `client.messages.create` in `src/` (grep proves zero direct calls left).
  4. A blocked call reaches the screen as the agreed message, never an error
     page.
  5. `AiUsageCard.tsx` in Settings, its own card.
  6. Gauntlet green, both time zones.
- **Out of scope:** payment code, Stripe webhooks, any edit to another PR's
  Settings cards or to PR 4's files (`HouseholdSettings`, stores), changing
  models or prompts.

## Decisions (Bryce, 2026-11-26, from the mock in chat)

1. **Price and allowance:** Bryce will charge **$5 a month** for now. Each
   family's allowance is **$3** (`AI_ALLOWANCE_CENTS=300`). This goes in the
   PR 10 runbook; in code a missing value still means 0 (AI locked).
2. **Bar label on a relative's copy: percent**, never dollars ("40% of this
   month's AI used. Resets December 1."). Bryce's copy shows dollars, request
   count and a per-feature breakdown.
3. **Who sees the card:** parents and admins (real logins). Only admins get
   the Upgrade button. Kids and device logins never see the card.
4. **Wording, as mocked:**
   - Card title: "AI features".
   - Normal: "{N}% of this month's AI used. Resets {Month D}."
   - Used up: "All of this month's AI is used. Resets {Month D}." + Upgrade (admins).
   - Allowance 0: "Recipe import from photos and links, meal ideas and
     nutrition estimates come with the AI upgrade." + Upgrade (admins).
   - Owner: "${X.XX} used this month, {N} requests. No limit on your copy."
     plus a per-feature line.
   - Blocked message in place of the AI result: "This month's AI allowance
     is used up." / "It resets {Month D}. Everything else in Marshee still
     works." + Upgrade (admins) or "Ask an admin about the AI upgrade"
     (others).
   - No `STRIPE_PAYMENT_LINK_URL`: no Upgrade button anywhere.

Cost basis shown to Bryce (Sonnet 5.5, $2 / $10 per million tokens in / out,
thinking billed as output; estimates, not measured): recipe import about
4 cents, meal ideas about 3 cents, nutrition or grocery sort about 1 cent,
busy family month about $1.25.

## Danger register

From AGENTS.md, absolute: no `db:seed` / `db:reset`; no clean script for
`User`; migrations additive only, SQL reviewed; dev DB is real family data,
private; never `git add -A` / `git add .`; direct pushes to `main` blocked;
secrets never in git or chat; no agent sees the API token. Agents never call
the real Anthropic API in tests.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- `npm run build`
- `grep -rn "messages.create" src` shows only `src/lib/aiMeter.ts`

## Assembled

- Stark + Vision (always).
- Strange: a new visible card and a new blocked message.
- Captain: new modules, a migration, six call sites.
- Banner: one brief on call-site error paths before contracts.

## Banner's brief (2026-11-26, summary)

- Exactly 6 `client.messages.create` calls, none guarded: all throw on API
  errors. Callers: `recipes.ts` `extractRecipeFromPastedText` (129),
  `extractRecipeFromRecipePhotos` (166), `importRecipeFromLink` (198, through
  `recipeUrlImport.ts:140,256`), `computeNutrition` (343, catches all),
  `mealPlans.ts` `suggestMealsForSlot` (112, catches all),
  `groceriesRecipes.ts` `classifyRecipeIngredients` (54, catches
  `IngredientAiError` from `recipeIngredientMatch.ts:66-76`), voice and alexa
  routes (owner only). The three import actions and their forms
  (`PasteImportForm`, `PhotoImportForm`, `LinkImportForm`) catch nothing.
  Assistant routes `recipes/[id]/shortfall` and `meal-plan/grocery-needs` map
  `IngredientAiError` to `aiUnavailable()`.
- UI error spots: `PasteImportForm.tsx:83-88`, `PhotoImportForm.tsx:181-186`,
  `LinkImportForm.tsx:88-93`, `AddToGroceriesSheet.tsx:151-153`,
  `NutritionSection.tsx:251-253`, `SlotEditSheet.tsx:182-184`.
- Month window: `zoneMidnightInstant(startOfMonth(calendarDateInZone(now, tz)), tz)`
  from `householdDate.ts`; `HOUSEHOLD_TIME_ZONE` in `constants.ts:349`.
- Schema: cuid ids, no `@@map`; newest migration `20261126100000_star_adjustments`.
- Tests: `node:test` + `node:assert/strict`, no mocks anywhere.

## Design (Fury)

- Cost stored as **micro-dollars** (`costMicroUsd Int`, 1 cent = 10,000).
  $/million tokens equals micro-dollars per token, so cost = sum of
  tokens x price, rounded up once per call.
- Prices (claude-api skill, cached 2026-11-03), $ per million tokens
  input / output / cache read / cache write: Sonnet 5.5 2 / 10 / 0.10 / 2.50;
  Opus 5.5 4 / 20 / 0.20 / 5; Haiku 5.5 0.10 / 0.50 / 0.01 / 0.125. Thinking
  is billed inside `output_tokens`. An unknown model is priced as the most
  expensive row, so the meter never under-counts.
- Two calls at the same moment can both pass the check and overshoot by one
  call. Accepted: the family's Anthropic key spend cap is the hard stop.
- If saving the usage row fails after a successful call, log it and still
  return the answer (the family already paid for it).
- Blocked = `AiAllowanceError` (reason `locked` or `used-up`) thrown by
  `meteredCreate` before Anthropic is called. Each Server Action catches it
  and returns `{ error, aiBlocked }`; one shared `AiAllowanceNotice`
  renders it.

## Contracts

Preflight 2026-11-26: C1 "schema.prisma over 650 hard cap" is a false alarm, STRUCTURE.md:1004-1006 exempts `prisma/schema.prisma`. C2 and C3 0 hard failures; REVIEW lines read.

### C1 — table, policy, words (pure)

- **Objective:** add the `AiUsage` table and the pure, tested rules and words.
- **Boundaries:**
  - May touch: `prisma/schema.prisma` (append one model only),
  new `prisma/migrations/20261126300000_ai_usage/migration.sql`,
  new `src/lib/aiMeterPolicy.ts`, new `src/lib/aiMeterPolicy.test.ts`,
  new `src/lib/aiMeterVocabulary.ts`.
  - Must not touch: anything else, especially other models in the schema,
  `HouseholdSettings`, settings page, call sites.
- **Content:**
  - Model `AiUsage`: `id String @id @default(cuid())`, `feature String`,
    `model String`, `inputTokens Int`, `outputTokens Int`,
    `cacheReadTokens Int @default(0)`, `cacheWriteTokens Int @default(0)`,
    `costMicroUsd Int`, `createdAt DateTime @default(now())`,
    `@@index([createdAt])`. Migration SQL written by hand to match what
    Prisma would generate (CREATE TABLE + CREATE INDEX only). Never run
    `prisma migrate dev`, `db push`, or anything that touches a database.
    `npx prisma validate` and `npx prisma generate` only.
  - `aiMeterPolicy.ts` (no `server-only`, no Prisma, no env reads):
    `AI_FEATURES` const tuple (`recipe-text`, `recipe-photos`,
    `ingredient-sort`, `nutrition`, `meal-ideas`, `voice`) and `AiFeature`
    type; price table as above; `costMicroUsd(model, usage)` where usage has
    `input_tokens`, `output_tokens`, nullable `cache_read_input_tokens`,
    `cache_creation_input_tokens`; `aiMonthWindow(now, timeZone)` returning
    `{ start: Date, end: Date, resetsOn: CalendarDate }` (start = zone
    midnight on day 1 this month, end = zone midnight on day 1 next month,
    resetsOn = day 1 next month); `parseAllowanceCents(value)` (missing,
    blank, negative, non-integer text gives 0); `parseUpgradeUrl(value)`
    (only a trimmed `https://` URL that `new URL` accepts, else null);
    `MICRO_USD_PER_CENT = 10_000`; `aiAccess({ isOwner, allowanceCents,
    usedMicroUsd })` returning `"allow" | "locked" | "used-up"` (owner
    always allow; allowance 0 locked; used >= allowance used-up);
    `percentUsed(usedMicroUsd, allowanceCents)` integer 0 to 100, floor,
    100 only when used >= allowance.
  - `aiMeterVocabulary.ts`: every visible string from the mission
    "Decisions" section as constants or small functions
    (`resetsLabel(date)` gives "December 1"), the owner per-feature labels
    (Recipe import for `recipe-text` and `recipe-photos` combined is fine,
    Grocery sort, Nutrition, Meal ideas, Voice), and dollar formatting
    `formatUsd(microUsd)` ("$1.42", rounds to cents).
  - Tests: price math for each model and unknown model; cache tokens; null
    cache fields; month window in Denver and in `Pacific/Auckland`, including
    December to January and a DST month; parse functions; `aiAccess` all
    branches; `percentUsed` edges (0 allowance, just under, exactly at, over).
- **Verification:** `npx prisma validate`, `npx prisma generate`,
  `npx tsc --noEmit`, `npx eslint src/lib/aiMeter*`, `npm test`, the direct
  `TZ=UTC` line from the gauntlet.
- **Evidence:** command outputs with test counts before and after; the
  migration SQL pasted.
- **Done:** all pass; new tests show in both time-zone runs.

### C2 — the wrapper and the six call sites

- **Objective:** every Anthropic call goes through `meteredCreate`, which
  blocks relatives' copies when needed and records usage.
- **Boundaries:**
  - May touch: new `src/lib/aiMeter.ts`, `src/lib/aiMeterPolicy.ts` and `src/lib/aiMeterPolicy.test.ts` (fix A only), `src/lib/recipeExtract.ts`,
  `src/lib/ingredientParse.ts`, `src/lib/nutritionEstimate.ts`,
  `src/lib/mealSuggest.ts`, `src/lib/voice/parse.ts`,
  `src/lib/recipeIngredientMatch.ts`,
  `src/app/api/assistant/v1/recipes/[id]/shortfall/route.ts`,
  `src/app/api/assistant/v1/meal-plan/grocery-needs/route.ts`.
  - Must not touch: prompts, models, `max_tokens`, effort, parsing logic,
  any UI or Server Action file.
- **Content:** `aiMeter.ts` (`import "server-only"`): `AiAllowanceError`
  (`reason`, `resetsOn`); `meteredCreate(feature, params)` taking the SDK's
  non-streaming create params type and returning `Anthropic.Message`; reads
  `isOwnerCopy()`, `AI_ALLOWANCE_CENTS` and the month total at call time
  (never cached at module load); calls `new Anthropic().messages.create`;
  then `prisma.aiUsage.create` in a try/catch that logs. Also
  `loadAiMonthSummary(now)` returning used micro-dollars, request count and
  per-feature totals for this month, and `aiUpgradeUrl()`. Each call site
  replaces `client.messages.create(...)` with `meteredCreate("<feature>",
  ...)` and drops its own `new Anthropic()`. `classifyIngredientLines`
  rethrows an `AiAllowanceError` unchanged instead of wrapping it in
  `IngredientAiError`; the two assistant routes treat it like
  `IngredientAiError` (`aiUnavailable()`).
- **Fix A (from C1 review):** the unknown-model price must be the most expensive model in the claude-api price table (Fable 5.1 and Fable 5: $10 in / $50 out per million; use cache read $1.00 and cache write $12.50, the usual 0.1x and 1.25x), not Opus 5.5. Rename the constant so its name says why, and add a test that an unknown model costs at least as much as every listed row.
- **Verification:** gauntlet in full;
  `grep -rn "messages.create\|new Anthropic" src` shows only `aiMeter.ts`.
- **Evidence:** outputs, the grep, the diff stat.
- **Done:** all pass, grep clean, no prompt or model text changed
  (`git diff` of the five lib files shows only the call lines and imports).

### C3 — the screens

- **Objective:** a blocked call shows the agreed message with Upgrade, and
  Settings shows the "AI features" card.
- **Boundaries:**
  - May touch: `src/lib/aiMeter.ts` (export the allowance reader only), new `src/lib/aiUsageRead.ts` (server-only loader for the card),
  `src/app/actions/recipes.ts`, `src/app/actions/mealPlans.ts`,
  `src/app/actions/groceriesRecipes.ts`, new `src/lib/aiBlocked.ts`
  (server-only: turns an `AiAllowanceError` plus the user's role into the
  `aiBlocked` payload), new `src/components/AiAllowanceNotice.tsx`,
  `src/components/PasteImportForm.tsx`, `src/components/PhotoImportForm.tsx`,
  `src/components/LinkImportForm.tsx`, `src/components/AddToGroceriesSheet.tsx`,
  `src/components/NutritionSection.tsx`, `src/components/SlotEditSheet.tsx`,
  new `src/components/AiUsageCard.tsx`, `src/app/(app)/settings/page.tsx`
  (one import, one data load, one render; no other card's lines).
  - Must not touch: other Settings cards, `schema.prisma`, the lib files
  from C2 except importing them.
- **Content:** the six actions catch `AiAllowanceError` and return
  `{ error, aiBlocked: { reason, resetsLabel, upgradeUrl | null } }`
  (`upgradeUrl` only for admins, null when not set). The forms render
  `AiAllowanceNotice` in place of the plain error when `aiBlocked` is set.
  Upgrade is an `<a>` styled as a 48px button, opens in a new tab with
  `rel="noopener noreferrer"`, Lucide `ExternalLink`. The card follows
  DESIGN.md and the mission "Decisions" wording; shown only to parents and
  admins on real logins; Upgrade only for admins in used-up and locked
  states; owner state shows dollars, request count and the per-feature line.
  Progress bar has `role="progressbar"` with aria values.
- **Verification:** gauntlet in full; dev server screenshots of the card in
  owner state and, with `MARSHEE_OWNER_COPY` unset locally, the locked
  state and a blocked Meal ideas tap (allowance 0 means no Anthropic call is
  made, so this is free and safe).
- **Evidence:** outputs, screenshots.
- **Done:** all pass, screenshots match the decisions.

### C4 — fixes from the C3 report

- **Objective:** close the four gaps Stark reported in C3.
- **Boundaries:**
  - May touch: `src/lib/recipeUrlImport.ts` (the catch at line 87 and one import only), `src/components/ProgressBar.tsx`, `src/components/AiUsageCard.tsx`, `src/components/AiAllowanceNotice.tsx`, `src/lib/aiBlocked.ts`, `src/lib/aiMeterVocabulary.ts`, `src/components/SlotEditSheet.tsx`, `src/lib/aiMeterPolicy.test.ts` (vocabulary tests only).
  - Must not touch: every other file, including the other nine `ProgressBar` users.
- **Content:**
  1. `importRecipeFromUrl` rethrows `AiAllowanceError` unchanged from its catch, before every other check, so the link screen shows the notice.
  2. Locked copies (reason `locked`): the blocked notice shows `AI_LOCKED_TEXT` (Bryce-approved wording) instead of the "used up / resets" lines; the Upgrade button or ask-an-admin line stays the same. Fury decision 2026-11-26: reuses approved words, telling Bryce in the report.
  3. `ProgressBar` gains an optional `tone` prop, default the current accent, plus a warning tone by job name from DESIGN.md. Existing callers unchanged. `AiUsageCard` uses `ProgressBar` and drops its own bar.
  4. `SlotEditSheet` hides "Try again" while the blocked notice shows.
- **Verification:** the gauntlet in full.
- **Evidence:** outputs and `git diff --stat`.
- **Done:** all pass; `grep -n "role=\"progressbar\"" src/components/AiUsageCard.tsx` is empty.

### C5 — Captain pass 1 fixes and notes

- **Objective:** clear Captain's three blockers and take his cheap notes.
- **Boundaries:**
  - May touch: `src/lib/aiMeterVocabulary.ts`, `src/lib/aiMeterPolicy.ts`, `src/lib/aiMeterPolicy.test.ts`, new `src/lib/aiMeterVocabulary.test.ts`, `src/lib/aiMeter.ts`, `src/lib/aiBlocked.ts`, `src/lib/aiUsageRead.ts`, new `src/components/AiUpgradeLink.tsx`, `src/components/AiAllowanceNotice.tsx`, `src/components/AiUsageCard.tsx`, `src/app/actions/recipes.ts`, `src/app/actions/mealPlans.ts`, `src/app/actions/groceriesRecipes.ts`, `src/app/(app)/settings/page.tsx` (the AI card lines and one alias only), `src/lib/recipeUrlImport.ts` (its docstring only).
  - Must not touch: everything else, including PR 4's Stores lines on the settings page.
- **Content:**
  1. Delete `aiBlockedResetsText`; `aiBlockedResetsLine` is the one way.
  2. `priceForModel` becomes private.
  3. Move the three vocabulary tests and their import into new `src/lib/aiMeterVocabulary.test.ts`.
  4. `AiAllowanceError` message becomes log-only (`ai allowance: <reason>`), no user words.
  5. One named `AiBlockReason = Exclude<AiAccess, "allow">` in the policy, used by the error, `AiBlocked` and the card data.
  6. One `AiUpgradeLink` component used by both the notice and the card.
  7. `aiBlockedResult(error, role)` takes the role from the calling action's own guard instead of re-reading the session.
  8. Settings page: a neutral `isManagerLogin` alias for the AI card's visibility (calendar sync keeps its own name).
  9. `importRecipeFromUrl` docstring: says it throws only `AiAllowanceError`.
- **Verification:** the gauntlet in full.
- **Evidence:** outputs, `git diff --stat`.
- **Done:** all pass; `grep -rn "aiBlockedResetsText" src` empty.

## Gate log

- 2026-11-26 Fury: dev DB host confirmed `ep-hidden-pine` (dev branch). `migrate status` showed PR 4 had already applied `20261126200000_household_settings` there, the same stamp as ours, so ours was renamed to `20261126300000_ai_usage` (sorts after PR 4 whichever merges first). SQL reviewed (CREATE TABLE + CREATE INDEX only), `npx prisma migrate deploy` applied it to the dev branch only.

## Delivery
- 2026-11-26 Vision pass 1 on dec5966: **PASS**, no blockers. Re-ran the full gauntlet (2320 / UTC 2310 + 10 skipped, build exit 0, grep one hit). Notes: branch behind main, PR 4 (aedae02) conflicts in `schema.prisma` and settings page, re-run the gauntlet on the merged tree; `recipeUrlImport.ts:62-65` docstring still says "Never throws"; assistant routes answer 503 "try again" on a blocked copy (owner-only API, accepted); `aiBlocked.ts:34` error string always the used-up title (not shown while `aiBlocked` is set); relative's copy fails closed if the month query throws.
- 2026-11-26 Captain pass 1 on dec5966: **BLOCKED**, 3 blockers (dormant `aiBlockedResetsText`; `priceForModel` exported with no outside caller; vocabulary tests living in `aiMeterPolicy.test.ts`). Notes: `AiAllowanceError` message repeats user words; reason union written 3 times; Upgrade link drawn twice; `aiBlockedResult` re-reads the session; `canSyncCalendars` name reused for the AI card; size trend (`recipes.ts` 411, `recipeUrlImport.ts` 440, `SlotEditSheet.tsx` 321); STRUCTURE.md amendment drafted. All taken in C5.
- 2026-11-26 Fury: merged origin/main (PR 4 aedae02) into the branch. Conflicts in `schema.prisma` (kept both models) and the settings page doc comment (kept Stores and AI features). `prisma validate` and `tsc` clean after.
