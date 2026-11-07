# Mission 44: Winnie's recipes and meal plan (Assistant API)

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-11-06 · **Updated:** 2026-11-06
**Branch:** `claude/assistant-recipes-meals` (from `origin/main` at `5a3cdc0`)

## Brief

- **Goal:** Winnie (Bryce's Grok bot, `/api/assistant/v1/`) can read and
  change recipes and the meal plan, with every write undoable for 30 days
  through mission 40's saved copies and `POST /audit/{requestId}/undo`.
- **Done means:**
  1. Routes live in production behind the token:
     `GET /recipes`, `GET /recipes/{id}`, `POST /recipes`,
     `PATCH /recipes/{id}`, `POST /recipes/{id}/cooked`,
     `POST /recipes/{id}/share`, `DELETE /recipes/{id}/share`,
     `GET /recipes/{id}/shortfall`, `GET /cookbooks`, `GET /tags`,
     `POST /tags`, `GET /meal-plan?weekOf=`,
     `PUT /meal-plan/days/{date}/{slot}`,
     `DELETE /meal-plan/days/{date}/{slot}`,
     `GET /meal-plan/grocery-needs?weekOf=`.
  2. Every write records before/after copies; undo reverses each one
     (positive control live on the dev branch), and refuses when the family
     changed the row since.
  3. A meal-plan PUT finds the week's existing plan within ±14 h
     (`PLAN_TOLERANCE_MS`) before creating one: one plan per week, also
     across the Nov 1 DST week.
  4. The family's app behaves identically (actions are thin wrappers over
     the new write modules; parity proven by script on the dev branch).
  5. OpenAPI updated; gauntlet green; Vision and Captain PASS.
  6. Plain-English notes for Bryce on what to tell Winnie.
- **Out of scope:** recipe delete (Bryce: undo covers her mistakes),
  cookbook create/rename/membership (Bryce: later mission), nutrition
  estimates, recipe import (photo/text/link), meal suggestions, replacing
  the app's Claude features with Winnie (Bryce, 2026-11-06: later, "leave
  it as is for now"), calendar/tasks (after CD1), goals/habits, any schema
  change, `STRUCTURE.md` edits (proposals go in this file).

## Bryce's rulings (2026-11-06, don't re-litigate)

- Whole app except passwords, family members and roles. One token, no
  per-person permissions. Every write undoable 30 days. She deletes only
  what she created (clearing a meal slot is the app's own Clear, allowed,
  plan decision 4).
- **No recipe delete** for Winnie: undo covers a wrong recipe.
- **Sharing: yes.** Winnie may turn a recipe's public share link on and off.
- **AI down on shortfall: say try again** (503, nothing guessed). Shortfall
  keeps using the app's existing ingredient reader (Claude via
  `ingredientParse.ts`), per plan decision 1.
- **Cookbooks: later mission.** This one gives read-only `GET /cookbooks`
  and `cookbookId` on create.
- Asked live by Bryce (Hill was unavailable), so none of these is a Hill call.

## Design (Fury's structural calls)

- **Write modules** (`server-only`, no auth, no `revalidatePath`):
  `src/lib/recipeWrites.ts` (recipe create/update/cooked/share, tag
  find-or-create, recipe-tag add/remove/set-all), `src/lib/mealPlanWrites.ts`
  (get-or-create plan with P2002-as-success, set slot, clear slot),
  `src/lib/recipeIngredientMatch.ts` (classify a recipe's lines against
  pantry and list). Actions become thin wrappers, same results, same
  messages. `addIngredientsToGroceries` stays in its action (the API has
  no route for it; Winnie uses `POST /shopping`); recorded leftover.
- **Copies:** Recipe and MealPlanEntry have `updatedAt`, so updates use
  compare-and-set on `updatedAt` (U2's pantry pattern) or a row lock; a
  slot set locks the existing entry `FOR UPDATE` and retries the whole
  transaction once on a P2002 create race, so its `before` is exact.
  RecipeTag/CookbookRecipe/Tag/MealPlan are only created or deleted.
- **Undo models added:** `Recipe`, `Tag`, `RecipeTag`, `CookbookRecipe`,
  `MealPlan`, `MealPlanEntry`, each a `Record<keyof Model, ColumnKind>`.
  Removes run children before parents (RecipeTag, CookbookRecipe,
  MealPlanEntry before Recipe, Tag, MealPlan); re-creates parents first.
  Removing a parent refuses `in_use` when a row outside the plan still
  points at it (generalising the pantry check). A re-create whose parent
  is gone refuses `missing` (FK), except links the database itself would
  null (`MealPlanEntry.recipeId`, like `GroceryItem.pantryItemId`).
- **Week:** `/meal-plan` takes `YYYY-MM-DD`; any day maps to its Denver
  Sunday (`startOfWeek`). A new plan is stored at
  `zoneMidnightInstant(sunday, HOUSEHOLD_TIME_ZONE)`, which a Denver
  phone's `isSameDay` matches. Lookup always by ±14 h, nearest wins
  (`findPlanForWeek`).
- **Slot path:** `/meal-plan/days/{date}/{slot}` (date, not week + offset:
  one less thing for a bot to get wrong). `slot` is one of `MEAL_SLOTS`.
- **Shortfall AI failure:** 503 `ai_unavailable`, `retry-after: 5`, message
  "Couldn't reach the AI to read the ingredients just now. Try again in a
  moment." Nothing written either way. `grocery-needs` sends every linked
  recipe's lines in ONE parse call.

## Danger register

- AGENTS.md in full. Dev branch only (`.env` active host `ep-hidden-pine-`,
  checked 2026-11-06); `npm run db:seed` / `db:reset` forbidden; never
  touch the `User` table; secrets only in `.env`/Vercel; agents never edit
  `.env`.
- **Winnie's real token never appears** anywhere. Live tests use a
  throwaway hash in the server's process env only.
- **Parallel agents elsewhere:** other worktrees own goals/habits,
  calendar (CD1), dashboard widgets (mission 43), `prisma/schema.prisma`,
  `STRUCTURE.md`. This mission edits none of them.
- Test rows are named `ZZZ Assistant Test …` and deleted by id afterwards.
  Never print family recipe titles or item names; counts and ids only.
  **Real meal-plan weeks are family data:** live meal-plan tests use weeks
  in 2030 (no family plan exists there; check first) and delete the test
  plans by id.
- Stage by explicit path; `git show --stat HEAD` after each commit.

## Gauntlet

- `npx tsc --noEmit` · `npx eslint .` · `npm test` · `npm run build`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts` (and `TZ=America/Los_Angeles`)
- `node ~/.claude/skills/avengers/recordcheck.mjs`

## Assembled

- **Stark + Vision** (always). Vision reproduces undo and the week trap live.
- **Captain:** three new write modules, new route files, undo widening.
- **Strange: out.** No family-visible string changes (one action gains an
  existing message, see C2).
- **Banner: out.** The 2026-11-06 brief plus Fury's reads cover it.
- **Hill: unavailable this session;** Bryce answered live.

## Contracts

### Live-test setup (every contract that says "live")

- Worktree has no `.env`: `ln -s ../../../.env .env` from the worktree
  root (gitignored). Never open, print or edit it. Leave the link for the
  next contract; Fury removes it at delivery.
- Throwaway token: random token + SHA-256 hex hash via `node:crypto` into
  the scratchpad. Server: `ASSISTANT_API_TOKEN_HASH=<hash> npx next dev
  --port <your port>` in the background; stop it after.
- Scripts importing `server-only` modules:
  `node --require <stub making require('server-only') return {}> --import
  tsx --env-file=.env <script>`, scripts in the scratchpad only.
- Report counts before/after of Recipe, Tag, RecipeTag, CookbookRecipe,
  MealPlan, MealPlanEntry, AssistantRequest (whichever you touch).
- **Commit rule (parallel builders share this worktree):** never `git add`
  other paths; commit with `git commit -m "<msg>" -- <your paths>` (use
  `git add -N` for new files first). `npm run build` waits for Fury (shared
  `.next`); run tsc/eslint/tests.

### C1, recipe write module

- **Objective:** one `server-only` home for recipe and tag writes, with the
  family's actions as thin wrappers and copies available for the API.
- **Boundaries.** May touch: new `src/lib/recipeWrites.ts`,
  `src/app/actions/recipes.ts`, `src/app/actions/tags.ts`, new
  `src/lib/recipeWrites.test.ts` only for pure parts if any. Must not touch
  anything else (C2 and C3 run in parallel).
- **Work:**
  1. Pure-ish validation of the recipe fields (title, ingredients, steps
     required, trimmed; optional fields trimmed to null) with the action's
     exact messages.
  2. `createRecipeRow(fields, { cookbookId?, tagIds? })`: cookbook and tags
     checked to exist; one transaction; returns the recipe and copies of
     every row created (Recipe, CookbookRecipe, RecipeTag).
  3. `updateRecipeRow(id, patch)`: partial patch of the text fields plus
     `rating` (1-5 or null); exact before/after (compare-and-set on
     `updatedAt` with retry, or row lock; say which). Null when missing.
  4. `markRecipeCookedRow(id, now)`, `shareRecipeRow(id)` (idempotent,
     `randomBytes(32).toString("base64url")`), `stopSharingRecipeRow(id)`:
     each with copies; null when missing.
  5. Tags: `findOrCreateTagRow(name)` (case-insensitive, returns
     `created` + copy), `addRecipeTagRow`, `removeRecipeTagRow`,
     `setRecipeTagRows(recipeId, tagIds)` (diff; copies of rows created and
     deleted; unknown tag id → error value).
  6. Actions `createRecipe`, `updateRecipe`, `markRecipeCooked`,
     `setRecipeRating`, `shareRecipe`, `stopSharingRecipe`,
     `findOrCreateTag`, `addTagToRecipe`, `removeTagFromRecipe` call these
     (alias names per STRUCTURE.md `write…`/`…Row`); same guards, same
     messages, same redirects and `revalidatePath`s.
- **Verification:** tsc, eslint, `npm test`. Live (port 3160, no server
  needed): parity script calling each lib function the way its action does
  on `ZZZ Assistant Test` rows; show resulting rows match what the old
  action code would write (field by field), and copies equal the DB
  before/after. Counts before/after.
- **Evidence / done:** outputs, `wc -l` + code lines (`preflight.mjs`
  `lineCounts`) for the new module, `git diff --stat` inside the boundary.

### C2, meal-plan write module and ingredient matcher

- **Objective:** `mealPlanWrites.ts` and `recipeIngredientMatch.ts` as the
  only homes of those rules; actions as thin wrappers.
- **Boundaries.** May touch: new `src/lib/mealPlanWrites.ts`, new
  `src/lib/recipeIngredientMatch.ts`, `src/app/actions/mealPlans.ts`,
  `src/app/actions/groceriesRecipes.ts`. Nothing else.
- **Work:**
  1. `getOrCreateMealPlanRow(weekStart)`: the action's P2002-as-success
     logic; returns `{ plan, created: copy | null }`.
  2. `findPlanNear(instant, toleranceMs)` read helper (nearest within
     tolerance) and `getOrCreatePlanNear(instant, toleranceMs)` that finds
     first and creates at `instant` only when none (P2002 → re-find).
  3. `setMealPlanEntryRow({ mealPlanId, dayOffset, slot, title, recipeId })`:
     the action's validation and messages; recipe existence checked
     (missing → `"That recipe no longer exists."`, the app's existing
     wording; today the app crashes with a 500 there); exact before/after:
     lock existing entry `FOR UPDATE`, update or create, retry the whole
     transaction once on P2002.
  4. `clearMealPlanEntryRow(...)`: returns the removed row or null.
  5. `recipeIngredientMatch.ts`: `classifyIngredientLines(lines)` (parse +
     match, the action's exact rules) and `classifyRecipe(recipeId)`;
     AI failure surfaces as a typed error the caller maps (action keeps
     "Couldn't reach the AI just now. Try again in a moment.").
  6. Actions `createMealPlan`, `setMealPlanEntry`, `clearMealPlanEntry`,
     `classifyRecipeIngredients` wrap these; `deleteMealPlan`,
     `suggestMealsForSlot`, `addIngredientsToGroceries` unchanged.
- **Verification:** tsc, eslint, `npm test`. Live: parity script on a 2030
  test week (check none exists first): create plan twice in parallel → one
  row; set slot, overwrite, clear, clear again (no-op); 10 parallel sets of
  one empty slot → one row, ten copies forming one chain (first before
  null); recipe-missing → the message, nothing written; classify on a
  `ZZZ Assistant Test` recipe gives the same suggestions as the old code
  path (run both, compare). Counts before/after.
- **Evidence / done:** as C1.

### C3, undo learns recipes and meal plans

- **Objective:** `undoPlan.ts`/`undoWrites.ts` restore, remove and re-create
  the six new models safely.
- **Boundaries.** May touch: `src/lib/assistant/undoPlan.ts`,
  `src/lib/assistant/undoPlan.test.ts`, `src/lib/assistant/undoWrites.ts`,
  new `src/lib/assistant/undoModels.ts` if the size needs a split,
  `src/lib/prismaErrors.ts` (an FK-violation predicate only). Nothing else.
- **Work:** column records for `Recipe`, `Tag`, `RecipeTag`,
  `CookbookRecipe`, `MealPlan`, `MealPlanEntry` typed `Record<keyof Model,
  ColumnKind>`; delegates for each; step order: restores, then removes
  child-first, then re-creates parent-first (ids sorted within each);
  generalise `in_use`: a removed parent is refused when a row not removed by
  this plan references it (PantryItem: GroceryItem, VoiceChange; Recipe:
  RecipeTag, CookbookRecipe, MealPlanEntry; Tag: RecipeTag; MealPlan:
  MealPlanEntry), with the parent rows locked `FOR UPDATE` (sorted) before
  counting; re-create: `MealPlanEntry.recipeId` nulled if the recipe is gone,
  any other FK miss → 409 `changed_since` `missing`. Existing behaviour for
  PantryItem/GroceryItem unchanged.
- **Verification:** tsc, eslint, `npm test` (both TZ legs); new tests for
  ordering, the in_use exclusion of rows removed in the same plan, column
  pin (fake key fails tsc, show it). Live undo proofs happen in C4/C5.
- **Evidence / done:** test names and counts before/after; sizes;
  `git diff --stat`.

### Route rules (C4, C5)

- Every route file exports only `export const <METHOD> = assistantRoute(...)`
  (`openapi.test.ts` enforces it). Thin routes: parse, call lib, shape.
  Reads go through small `server-only` read modules in `src/lib/assistant/`
  (one `Promise.all`, narrow `select`), shaped by pure serializers.
- Every write pushes one `changes` entry per row with `before`/`after`
  copies from the write module (model names exactly as the undo allowlist:
  `Recipe`, `Tag`, `RecipeTag`, `CookbookRecipe`, `MealPlan`,
  `MealPlanEntry`). A no-op write (re-share an already-shared recipe,
  clear an empty slot) records nothing.
- Ingredient and step lines travel as arrays of strings (`recipeLines`
  when reading; joined with `\n` when writing).
- Never print family data in evidence; ids and counts only.

### C4, recipe routes

- **Objective:** Winnie can list, read, create, edit, mark cooked, share
  and stop sharing recipes, see what she's missing, and list/create tags
  and list cookbooks; every write undoable.
- **Boundaries.** May touch: new `src/lib/assistant/schemasRecipes.ts`
  (+ test), new `src/lib/assistant/recipeReads.ts`, new
  `src/lib/assistant/serializeRecipes.ts` (+ test), new
  `src/lib/assistant/openapiRecipePaths.ts`, `src/lib/assistant/openapi.ts`
  (import + spread only), `src/lib/assistant/errors.ts` (add
  `ai_unavailable`), new route files under `src/app/api/assistant/v1/`:
  `recipes/route.ts`, `recipes/[id]/route.ts`, `recipes/[id]/cooked/route.ts`,
  `recipes/[id]/share/route.ts`, `recipes/[id]/shortfall/route.ts`,
  `cookbooks/route.ts`, `tags/route.ts`. Must not touch the write modules
  (`recipeWrites.ts`, `mealPlanWrites.ts`, `recipeIngredientMatch.ts`),
  undo files, actions, or C5's files (`schemasMealPlan.ts`,
  `mealPlanReads.ts`, `serializeMealPlan.ts`, `openapiMealPlanPaths.ts`,
  `meal-plan/**`). If a write module lacks something, stop and report
  BLOCKED-ON-CONTRACT.
- **Shapes:**
  - `GET /recipes?q&tagId&cookbookId&maxMinutes`: `q` via `searchRecipes`,
    `maxMinutes` against prep + cook via `parseTimeToMinutes` (a recipe
    with no parseable time is left out when `maxMinutes` is set). Items:
    `{ id, title, rating, lastCookedAt, servings, prepTime, cookTime,
    totalMinutes, tags: [{id,name}], cookbooks: [{id,title}], shared }`.
  - `GET /recipes/{id}`: the list item plus `ingredients: string[]`,
    `steps: string[]`, `notes`, `sourceUrl`, `shareUrl` (absolute, from
    the request origin + `/share/recipe/{token}`, or null),
    `nutrition: { calories, proteinG, carbsG, fatG, perServings,
    isEstimate: true, outdated }` or null (`outdated` from
    `nutritionFingerprint.ts`).
  - `POST /recipes` `{ title, ingredients: string[] (≥1), steps: string[]
    (≥1), servings?, prepTime?, cookTime?, sourceUrl?, notes?, cookbookId?,
    tagIds? }` → 201 `{ recipe }` (detail shape). Unknown cookbook/tag →
    404 `not_found` naming which.
  - `PATCH /recipes/{id}`: any of the text fields, `rating` (1-5 or null),
    `tagIds` (the full set) → `{ recipe }`. At least one key. Fields and
    tags are two writes; say in a code comment that a failure between them
    leaves the first recorded (and undoable).
  - `POST /recipes/{id}/cooked` `{}` → `{ recipe: { id, lastCookedAt } }`.
  - `POST /recipes/{id}/share` `{}` → `{ shareUrl }`;
    `DELETE /recipes/{id}/share` → `{ shareUrl: null }`.
  - `GET /recipes/{id}/shortfall` → `{ recipeId, readable, have:
    [{line,name,matchedName}], missing: [{line,name}], onList:
    [{line,name}] }`; `readable: false` with empty lists when the recipe
    has no lines or nothing parseable; AI failure → 503 `ai_unavailable`,
    "Couldn't reach the AI to read the ingredients just now. Try again in a
    moment."; unknown recipe 404.
  - `GET /cookbooks` → `{ cookbooks: [{id,title,recipeCount}] }`;
    `GET /tags` → `{ tags: [{id,name,recipeCount}] }`;
    `POST /tags` `{ name }` → `{ tag, created }` (201 when created).
- **Verification:** tsc, eslint, `npm test`, both TZ legs. Live (port 3170,
  setup above), positive control first (`GET /openapi.json` 200, then
  `GET /recipes` count = DB count): each route once on `ZZZ Assistant Test`
  rows; then undo (`POST /audit/{requestId}/undo`) for each write: create
  with a tag and a cookbook (all three rows gone), edit + tags (row and
  tag set back exactly), cooked, share (token gone, old link 404), stop
  share, new tag; redo of one. Refusals: family-style edit of Winnie's
  recipe by script, then undo → 409 `changed_since`; family adds a tag to
  Winnie's new recipe by script, then undo the create → 409 `in_use`,
  nothing changed. Shortfall once for real (1 Haiku call) and once with
  `ANTHROPIC_API_KEY` blanked in a second server's process env → 503.
  Counts before/after; all test rows and AssistantRequests deleted by id.
- **Evidence / done:** outputs per check (a FAIL is reported as FAIL),
  sizes, `git diff --stat` inside the boundary, commit hash.

### C5, meal-plan routes (parallel with C4)

- **Objective:** Winnie can read a week, fill or clear a meal, and see the
  week's grocery needs, with one plan per week and every write undoable.
- **Boundaries.** May touch: new `src/lib/assistant/schemasMealPlan.ts`
  (+ test), new `src/lib/assistant/mealPlanReads.ts`, new
  `src/lib/assistant/serializeMealPlan.ts` (+ test), new
  `src/lib/assistant/openapiMealPlanPaths.ts`, new route files
  `src/app/api/assistant/v1/meal-plan/route.ts`,
  `meal-plan/days/[date]/[slot]/route.ts`,
  `meal-plan/grocery-needs/route.ts`. Must NOT touch `openapi.ts` or
  `errors.ts` (C4 owns them; Fury wires your registry file after both
  commit, so `openapi.test.ts` failing only on your new routes is expected
  until then: say so, show it is only those). Use the `ai_unavailable`
  code once C4 has committed it; if it isn't there yet, use 503 `busy` and
  say so. Must not touch write modules, undo files, actions, C4's files.
- **Rules:**
  - A date's week: `startOfWeek` of the `CalendarDate`; the plan is found
    with `findPlanNear(zoneMidnightInstant(sunday, HOUSEHOLD_TIME_ZONE),
    PLAN_TOLERANCE_MS)` and created with `getOrCreatePlanNear` at that
    instant only by a PUT. `dayOffset = calendarDaysBetween(sunday, date)`.
  - `GET /meal-plan?weekOf=YYYY-MM-DD` (default: today in Denver via
    `requireHouseholdToday`) → `{ weekOf, planId | null, days: [{ date,
    meals: { Breakfast, Lunch, Dinner, Snacks } }] }`, each meal
    `{ title, recipeId, recipeTitle } | null`.
  - `PUT /meal-plan/days/{date}/{slot}` `{ title?, recipeId? }` (at least
    one; title defaults to the recipe's title) → `{ date, slot, meal }`.
    Slot must be one of `MEAL_SLOTS` exactly (else 400). Records a
    `MealPlan` create change when it made the plan, and the
    `MealPlanEntry` create/update with copies. Recipe missing → 404.
  - `DELETE /meal-plan/days/{date}/{slot}` → `{ cleared: boolean }`; a
    `MealPlanEntry` delete change only when something was cleared.
  - `GET /meal-plan/grocery-needs?weekOf=` → every distinct recipe linked
    in that week, all their lines in ONE `classifyIngredientLines` call,
    deduped by lower-cased name: `{ weekOf, recipes: [{id,title}], missing:
    [{ name, from: [{recipeId, line}] }], onList: [name], have: [name] }`.
    No linked recipes → empty lists, no AI call. AI failure → 503.
- **Verification:** tsc, eslint, `npm test`, both TZ legs. Live (port
  3175), weeks in 2030 only (check none exist first): positive control;
  PUT into an empty 2030 week → one plan at Denver midnight; a second PUT
  same week → same plan; pre-create a plan at Denver midnight + 1 h (a
  Pacific phone) for another week, PUT there → no new plan; same across the
  DST week of 2030-11-03 (Sunday) by script: the stored instant read with
  `TZ=America/Denver` is local midnight of that Sunday. 5 parallel PUTs to
  an empty week → one plan. Undo: PUT that created the plan (plan and
  entry gone); overwrite (old meal back); clear (meal back, same id); redo.
  Refusals: family fills another slot in Winnie's new plan by script, then
  undo the creating PUT → 409 `in_use`, nothing changed; family edits the
  entry → `changed_since`. grocery-needs once for real on a 2030 week with
  two `ZZZ Assistant Test` recipes (1 Haiku call). Counts before/after; all
  test rows and AssistantRequests deleted by id.
- **Evidence / done:** as C4.

## Gate ledger

### Captain pass 1 (at `F0` commit): BLOCKED

- **BLOCKER:** `actions/tags.ts` `renameTag` re-implements the tag-name
  rules (trim/empty message, case-insensitive clash) now living in
  `recipeWrites.ts` `findOrCreateTagRow`. Fix: new `src/lib/tagWrites.ts`
  with the tag writes moved out of `recipeWrites.ts` plus `renameTagRow`,
  one private name check and one clash query; `renameTag` a thin wrapper.
- NOTEs (fix now marked *): N1* week lookup in three places
  (`findPlanForWeek`, `findPlanNear`, `summaryReads` range;
  `PLAN_TOLERANCE_MS` imported from `summary.ts`); N2 `findPlanNear` a read
  in a writes module; N3* write errors mapped to status by message text;
  N4* tag existence checked three ways; N5* total-time rule twice
  (`serializeRecipes` vs `totalTimeBucket`); N6* the 503 written twice;
  N7* small dups/naming (`toMealSlot`, private `ratingError`, alias
  `removeMealPlanEntry`, double trim; `toShareUrl` vs `ShareSheet`); N8*
  stale comments (`findOrCreateTag`, `setMealPlanEntry`); N9
  `addIngredientsToGroceries` still writes GroceryItem directly; N10 sizes
  by the canonical counter: `recipes.ts` 384/231, `recipeWrites.ts`
  332/244, `undoWrites.ts` 270/215, `undoPlan.test.ts` 361/333 (next undo
  test goes in a sibling file); N11 undo REFERENCES/FOREIGN_KEYS not pinned
  to the schema (DMMF test).
- Proposed STRUCTURE.md amendments A1-A4 (for Bryce; STRUCTURE.md is held
  by other agents): write-module homes and the P2002/P2003 single-check
  line; one meal-plan week lookup; write errors carry a code; mission 40's
  three amendments updated (P2025, `undoModels.ts` as the one registry,
  `undoWrites.ts` restores from copies only).

## Delivery

(not yet)

## Handoff log

- 2026-11-06: Mission numbered 44 (43 is mission-43-dashboard-widgets-w1 in
  the `parallel-work-strategy` worktree). Branch cut from `5a3cdc0`. Bryce
  answered the four scope calls live (above). C1, C2, C3 dispatched in
  parallel (disjoint files).
- 2026-11-06: C2 DONE `3a6267a` (4 files). Parity 21/21 on 2030 weeks:
  parallel plan creates → 1 row; near lookup 3 h yes / 15 h no; 10
  parallel slot sets → one chain of copies; recipe-missing message; classify
  JSON-identical to the old path. Counts MealPlan 5 / Entry 14 / Recipe 146
  restored. `mealPlanWrites.ts` 166, `recipeIngredientMatch.ts` 155 (grep
  counter, not preflight). For the gates: two creators at different instants
  inside ±14 h can still both create (no lock; phone in another zone vs
  Winnie); recipe deleted between check and insert throws FK (as before).
- 2026-11-06: C1 DONE `344e429` (3 files). Row lock (`FOR UPDATE`) for
  every recipe update, so copies are exact with no retry. Parity 45/45
  (create/update field by field, copies equal DB, messages, rating bounds,
  10 parallel shares → one token, tag case-insensitive, set-tags diff).
  Counts Recipe 146 / Tag 19 / RecipeTag 310 / CookbookRecipe 135 restored.
  `recipeWrites.ts` 329/243 (awk counter). Behaviour notes for the gates:
  `addTagToRecipe` on a deleted recipe/tag now returns the existing
  "no longer exists" messages instead of a 500; `findOrCreateTagRow`
  re-finds on an exact-name P2002 race. No new wording (both messages
  already exist in the app).
- 2026-11-06: C3 DONE `5c6b8b6` (5 files; new `undoModels.ts` 167). Eight
  models pinned `Record<keyof Model, …>` (fake key fails tsc, shown).
  Removes child-first, re-creates parent-first; `referenceChecks` excludes
  rows the plan removes; parents locked FOR UPDATE sorted; FK miss → 409
  `missing` unless the DB would SetNull. Tests 15 → 21 in `undoPlan.test.ts`;
  1182 pass, both TZ legs (UTC 7 skipped, not C3's files). Two deliberate
  changes to old models: re-create order now parent-first (a pantry row and
  its linked line come back with the link kept), pantry `in_use` ignores
  lines the plan removes. DB paths unproven until C4/C5 live. C4 and C5
  written and dispatched in parallel (disjoint; Fury wires C5's registry).
- 2026-11-06: C5 DONE `8c3d8fd` (9 new files, 461 lines). Live 39/39:
  empty-week PUT → one plan at Denver midnight; Pacific-midnight plan
  reused; DST week 2030-11-03 stored 06:00Z (local midnight MDT), next
  Sunday 07:00Z (MST); 5 parallel PUTs → one plan, one create recorded;
  undo of creating PUT, overwrite, clear; redo; refusals `in_use` and
  `changed`; grocery-needs one Haiku call; AI down → 503 `ai_unavailable`
  retry-after 5. Counts restored. Registry `openapiMealPlanPaths.ts` waits
  for Fury to wire into `openapi.ts` after C4 commits (only those 2 tests
  red). grocery-needs imports C4's `ai_unavailable` (uncommitted at the
  time). Different-instant double create still possible (C2 note).
- 2026-11-06: C4 DONE `875b86b` (15 files, +834). Live all PASS: positive
  control (GET /recipes 146 = DB 146), filters incl. maxMinutes, create
  with cookbook + tag (3 changes), PATCH fields + tag set, cooked, share
  (public link 200), stop share (404), shortfall (1 Haiku) and AI-down
  503 + retry-after 5, DELETE /recipes 405; undo of every write incl. redo
  with same ids; refusals `changed` and `in_use`. Counts restored. Its
  first run exposed that `stopSharingRecipeRow` wrote (bumping `updatedAt`)
  even when already off, so a later undo was refused.
- 2026-11-06: Fury F0 (trivial, `recipeWrites.ts` +3, `openapi.ts` +2):
  stop-share on an unshared recipe writes nothing; `mealPlanOperations`
  wired. Full gauntlet green on the tree: tsc, eslint, `npm test` 1200/1200,
  UTC 1193 + 7 skipped / 0 fail, LA 1200/0, `npm run build` (all 10 new
  routes listed). Undo refusal shape: 409 `conflict`, `details.reason`
  `changed_since`, `in_use` in `details.records[].problem` (mission 40's
  shape, so the contracts' "409 in_use" means that). Gate pass 1: Vision +
  Captain dispatched in parallel.

### Vision pass 1 (at `1c718b0`): BLOCKED

- Gauntlet re-run green (tsc, eslint, 1200/1200, UTC 1193 + 7 skipped
  calendar-DST tests, LA 1200, build, recordcheck 0 hard). Boundaries
  clean per commit. Builders' evidence spot-checked and matched (incl.
  spring-forward 2030-03-10). Live: create/undo/redo, share/stop/undo,
  refusals `missing` (re-create FK, now proven live), `in_use`,
  `changed_since`; 13 h-off plan reused; bad input 400/404. Counts
  restored. Family-app parity read against `5a3cdc0`: only the intended
  changes.
- **BLOCKER:** `PATCH /recipes/{id}` and `PUT /meal-plan/days/{date}/{slot}`
  each do two transactions; if the second fails the first is saved but
  the request is logged non-2xx, so undo refuses `failed_request` (and a
  "retry" message makes Winnie's retry copy the half-written row).
  Reproduced live with a held family delete. Fix: one transaction per
  handler (`updateRecipeAndTagsRow`, `setMealPlanEntryInWeekRow`).
- NOTEs: different-instant double plan create (known); grocery-needs one
  parse call may truncate at `max_tokens` on a big week and answer empty
  lists with no `readable` flag; both old-model undo changes judged
  improvements; A-B-A share undo correct; share tokens never on the wire.

### F1a, one transaction per write request, tag writes in one home

- **Objective:** close Vision's and Captain's blockers.
- **Boundaries.** May touch: `src/lib/recipeWrites.ts`, new
  `src/lib/tagWrites.ts`, `src/lib/mealPlanWrites.ts`,
  `src/app/actions/recipes.ts`, `src/app/actions/tags.ts`,
  `src/app/actions/mealPlans.ts`, `src/lib/assistant/serializeRecipes.ts`
  (+ test), `src/lib/assistant/recipeReads.ts`, the route files
  `recipes/route.ts`, `recipes/[id]/route.ts`, `tags/route.ts`,
  `meal-plan/days/[date]/[slot]/route.ts`. Nothing else.
- **Work:**
  1. `recipeWrites.ts`: `updateRecipeAndTagsRow(id, patch?, tagIds?)` locks
     the recipe once and applies the field patch and the tag diff in ONE
     transaction (unknown tag → refusal, nothing written), returning
     `{ before, after, created, deleted }`. PATCH route uses it; delete the
     false "undoable" comment.
  2. `mealPlanWrites.ts`: `setMealPlanEntryInWeekRow(instant, toleranceMs,
     entry)` does find-or-create plan and the slot write in ONE transaction
     (P2002 retry of the whole transaction kept), returning
     `{ planCreated, before, after }`. PUT route uses it.
  3. New `src/lib/tagWrites.ts`: move `findOrCreateTagRow`,
     `addRecipeTagRow`, `removeRecipeTagRow`, `setRecipeTagRows` (and the
     tag-diff helper item 1 reuses) out of `recipeWrites.ts`; add
     `renameTagRow(tagId, name)`; one private name check and one
     case-insensitive clash query (with an except-id option) shared by
     create and rename; one exported tag-existence check used by
     `createRecipeRow`, the diff and the PATCH route (drop
     `allTagsExist` from `recipeReads.ts`). `renameTag` becomes a thin
     wrapper: same guard, three messages, `revalidatePath`. No import
     cycle between the two write modules (tagWrites may take a `tx`).
  4. Write-module refusals carry a code: `{ error, code: "missing" |
     "invalid" }`; routes map `code` to 404/400 and never match message
     text (`toWriteFailure`, the PUT route). Actions keep showing `error`.
  5. Names/comments: `clearMealPlanEntryRow` imported without the
     `removeMealPlanEntry` alias (bare name or `write…`); make
     `ratingError` private; fix the stale docblocks on `findOrCreateTag`
     and `setMealPlanEntry`.
- **Verification:** tsc, eslint, `npm test`, both TZ legs. Live (port
  3195, setup above; reuse Vision's held-delete script
  `scratchpad/v/live2.ts`): both blocker scenarios now fail with nothing
  written (title unchanged, no empty plan), counts unchanged; positive
  controls: PATCH fields + tags succeeds and undo restores both; PUT into
  an empty 2030 week creates plan + entry and undo removes both. App
  parity by script for `renameTag` (rename, clash, empty, missing) and the
  wrapped actions touched. Sizes by preflight `lineCounts` (copy at
  `scratchpad/lc.mjs`).
- **Evidence / done:** outputs per check, sizes, `git diff --stat` inside
  the boundary, commit hash.

### F1b, Captain's cheap notes (after F1a)

- **Boundaries.** May touch: `src/lib/mealPlanWrites.ts`,
  `src/lib/assistant/summary.ts` (+ test), `src/lib/assistant/summaryReads.ts`,
  `src/lib/assistant/mealPlanReads.ts`, `src/lib/recipeTimeFilter.ts`
  (+ its test if one exists), `src/lib/assistant/serializeRecipes.ts`,
  `src/lib/assistant/serializeMealPlan.ts`, `src/lib/assistant/errors.ts`
  (+ `errors.test.ts`), `src/lib/assistant/openapiMealPlanPaths.ts`, routes
  `recipes/[id]/shortfall/route.ts`, `meal-plan/grocery-needs/route.ts`,
  `meal-plan/days/[date]/[slot]/route.ts`, `meal-plan/route.ts`.
- **Work:** N1: `PLAN_TOLERANCE_MS` and one pure nearest-plan picker live
  beside `findPlanNear` in `mealPlanWrites.ts` (pure part may be a small
  pure sibling if `summary.ts` must stay db-free); `findPlanForWeek`,
  `summaryReads.ts` and `mealPlanReads.ts` use them; one
  `getOrCreateWeekPlan`/`findWeekPlan` pair so no route passes the
  tolerance by hand. N5: export `totalRecipeMinutes` from
  `recipeTimeFilter.ts`, `totalTimeBucket` and the serializer use it. N6:
  `aiUnavailable()` factory in `errors.ts` (+ a test that it carries
  `retry-after: 5`). N7: `toMealSlot` in `serializeMealPlan.ts`.
  grocery-needs: add `readable: boolean` (false when the parse returns
  nothing for a week that had lines), documented in OpenAPI.
- **Verification:** gauntlet; `/summary` and `/meal-plan` answers unchanged
  for a 2030 test week (before/after by script); sizes; diff stat.
