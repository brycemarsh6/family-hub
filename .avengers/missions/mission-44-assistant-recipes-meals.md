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

### C4, recipe routes (after C1, C2, C3)

To be written when C1-C3 report.

### C5, meal-plan routes (after C4)

To be written when C1-C3 report.

## Gate ledger

(none yet)

## Delivery

(not yet)

## Handoff log

- 2026-11-06: Mission numbered 44 (43 is mission-43-dashboard-widgets-w1 in
  the `parallel-work-strategy` worktree). Branch cut from `5a3cdc0`. Bryce
  answered the four scope calls live (above). C1, C2, C3 dispatched in
  parallel (disjoint files).
