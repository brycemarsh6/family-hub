# Mission 45: Winnie's cookbooks (Assistant API)

**Project:** family-hub (Marshee)
**Status:** DELIVERED (gates PASS; PR and merge next)
**Started:** 2026-11-06 · **Updated:** 2026-11-06
**Branch:** `claude/assistant-cookbooks` (from `origin/main` at `634627a`,
mission 44, PR #61)

## Brief

- **Goal:** Winnie (Bryce's Grok bot, `/api/assistant/v1/`) can create and
  rename cookbooks and file or unfile recipes in them (plus the delete and
  sharing calls Hill makes below), with every write undoable for 30 days
  through mission 40's saved copies and `POST /audit/{requestId}/undo`.
- **Done means:**
  1. The cookbook routes (listed under Design) are live in production behind
     the token; production answers 401 without one.
  2. Every write records before/after copies; undo reverses each one
     (positive control live on the dev branch) and refuses when the family
     changed the row since.
  3. The cookbook writes live in one `server-only` module,
     `src/lib/cookbookWrites.ts`; `src/app/actions/cookbooks.ts` becomes thin
     wrappers that behave the same (proven by script on the dev branch).
  4. OpenAPI updated; gauntlet green; Vision and Captain PASS.
  5. Plain-English notes for Bryce on what to tell Winnie.
- **Out of scope:** recipe delete, schema changes, `STRUCTURE.md` edits
  (proposals go in this file), calendar/tasks, any family-visible wording.
- **Mission number:** 45 (checked 2026-11-06: no `mission-45*` on
  `origin/main`, in any worktree, or in any branch name).

## Standing rulings (Bryce, 2026-11-06, don't re-litigate)

- Whole app except passwords, family members and roles. One token, no
  per-person permissions. Every write undoable 30 days. She deletes only
  what she created (known permanently from the audit log,
  `didAssistantCreate` in `src/lib/assistant/audit.ts`).
- Mission 44: recipe sharing allowed; cookbooks deferred to this mission.

## Decided by Hill (2026-11-06; Bryce can overturn any)

- **H1, delete (medium confidence):** `DELETE /cookbooks/{id}` only for a
  cookbook Winnie created (`didAssistantCreate`), and refused with nothing
  changed if it holds any filing the family made (a `CookbookRecipe` she
  did not create). Her own filings go with it, all with copies, so undo
  puts the cookbook and those filings back. Bryce to look at first: he may
  prefer no delete at all, like recipes.
- **H2, sharing (high):** yes, `POST`/`DELETE /cookbooks/{id}/share` for any
  cookbook, like recipes, idempotent and undoable. The notes to Winnie say
  the link shows the cookbook's current contents.
- **H3, unfiling and renaming (high):** Winnie may unfile any recipe from
  any cookbook and rename any cookbook, family ones included (both are open
  to everyone in the app; unfiling never touches the recipe).
- **H4, duplicate titles (medium for create):** `POST /cookbooks` returns
  the existing cookbook when a title matches ignoring capitals (200,
  `created: false`, the oldest if several match), like `POST /tags`.
  Rename to a title another cookbook has is allowed, like the app. Bryce
  to look at: the app itself allows twins.

## Design (Fury's structural calls)

- **Routes:** `GET /cookbooks` (adds `shared`), `GET /cookbooks/{id}`,
  `POST /cookbooks`, `PATCH /cookbooks/{id}`, `DELETE /cookbooks/{id}`,
  `PUT` and `DELETE /cookbooks/{id}/recipes/{recipeId}`, `POST` and
  `DELETE /cookbooks/{id}/share`.
- **Write module** `src/lib/cookbookWrites.ts` (`server-only`, no auth, no
  `revalidatePath`, refusals as `WriteError`). Updates lock the cookbook
  `FOR UPDATE` so copies are exact. The delete locks the cookbook first: a
  family filing inserted at the same moment needs a key-share lock on that
  row, so it waits, and the H1 check inside the transaction sees every
  filing.
- **`WriteError` moves** to `src/lib/writeError.ts` with `invalid()` and
  `missing()` builders; `toWriteFailure` moves into
  `src/lib/assistant/errors.ts` (Captain's mission 44 NOTEs).

## Danger register

- AGENTS.md in full. Dev branch only; `npm run db:seed` / `db:reset`
  forbidden; never touch the `User` table; secrets only in `.env`/Vercel;
  agents never open, print or edit `.env`.
- **Winnie's real token never appears** anywhere. Live tests use a
  throwaway hash in the dev server's process env only. Never write to
  production; the production check is read-only (401 without a token).
- Test rows are named `ZZZ Assistant Test …` and deleted by id afterwards.
  Never print family cookbook or recipe titles; counts and ids only. Never
  rename, file into, unfile from, share or delete a family cookbook in a
  test: tests make their own cookbooks and recipes.
- Parallel agents elsewhere own goals/habits, calendar (CD1), dashboard
  widgets, `prisma/schema.prisma`, `STRUCTURE.md`. This mission edits none.
- Stage by explicit path; `git show --stat HEAD` after each commit.

## Gauntlet

- `npx tsc --noEmit` · `npx eslint .` · `npm test` · `npm run build`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts` (and `TZ=America/Los_Angeles`)
- `node ~/.claude/skills/avengers/recordcheck.mjs`

## Assembled

- **Stark + Vision** (always).
- **Captain:** a new write module, a moved error type, new route files.
- **Strange: out** unless a family-visible string changes (none planned).
- **Banner: out.** Fury's reads of mission 44's files cover it.
- **Hill:** the delete, sharing, unfiling and duplicate-title calls.

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
- Report counts before/after of Cookbook, CookbookRecipe, Recipe,
  AssistantRequest (whichever you touch).
- **Commit rule (parallel builders share this worktree):** never `git add`
  other paths; commit with `git commit -m "<msg>" -- <your paths>` (use
  `git add -N` for new files first). `npm run build` waits for Fury (shared
  `.next`); run tsc/eslint/tests.

### C1 - cookbook write module, WriteError home

- **Objective:** one `server-only` home for every cookbook write, with the
  family's actions as thin wrappers that behave the same, and the write
  refusal type and its API mapping in their proper homes.
- **Boundaries:** May touch: new `src/lib/cookbookWrites.ts`, new
  `src/lib/writeError.ts`, `src/app/actions/cookbooks.ts`,
  `src/lib/tagWrites.ts`, `src/lib/recipeWrites.ts`,
  `src/lib/mealPlanWrites.ts`, `src/lib/assistant/serializeRecipes.ts`,
  `src/lib/assistant/errors.ts`, `src/lib/assistant/errors.test.ts`, and
  the four route files that import `toWriteFailure` (imports only):
  `src/app/api/assistant/v1/recipes/route.ts`,
  `src/app/api/assistant/v1/recipes/[id]/route.ts`,
  `src/app/api/assistant/v1/tags/route.ts`,
  `src/app/api/assistant/v1/meal-plan/days/[date]/[slot]/route.ts`.
  Must not touch: the undo files (C2 runs in parallel), components, other
  actions, `prisma/schema.prisma`, `STRUCTURE.md`.
- **Work:**
  1. `src/lib/writeError.ts`, pure (no `server-only`, no imports):
     `WriteError = { error, code: "missing" | "invalid" }` and builders
     `invalid(message)`, `missing(message)`. `tagWrites.ts`,
     `recipeWrites.ts`, `mealPlanWrites.ts` import from it and use the
     builders (drop `recipeWrites.ts`'s private `INVALID`/`MISSING`).
     `toWriteFailure` moves from `serializeRecipes.ts` to
     `assistant/errors.ts` (a type-only import keeps `errors.ts` pure), with
     a test there; the four routes import it from `errors.ts`.
  2. `src/lib/cookbookWrites.ts` (header like `tagWrites.ts`): private title
     check (trim; empty is `invalid("Give the cookbook a title.")`),
     `COOKBOOK_MISSING` (`"That cookbook no longer exists."`), and:
     - `createCookbookRow(title)` → `{ cookbook }` | WriteError (the app's).
     - `findOrCreateCookbookRow(title)` → `{ cookbook, recipeCount,
       created: Cookbook | null }` | WriteError (H4: ignoring capitals,
       oldest match wins). There is no unique index, so serialise
       same-title creates inside one transaction with
       `pg_advisory_xact_lock(hashtext(lower(title)))` before find-then-create.
     - `renameCookbookRow(id, title)` → `{ before, after }` | WriteError
       (missing), the row locked `FOR UPDATE`. Same title as now: no write,
       `before` equals `after`.
     - `deleteCookbookRow(id, guard?)` → `{ cookbook, filings }` | WriteError
       | null: locks the cookbook `FOR UPDATE`, reads its filings, runs the
       optional `guard(filings)` (may return a WriteError, and then nothing
       is deleted), deletes; all one transaction. The app passes no guard.
     - `fileRecipeRow(cookbookId, recipeId)` → `{ created: CookbookRecipe |
       null }` | WriteError: idempotent (`created` null when already filed,
       including a lost P2002 race); cookbook or recipe missing (checked,
       and an FK race via `isForeignKeyViolationError`) is a `missing`
       refusal with `COOKBOOK_MISSING` or the app's existing
       `"That recipe no longer exists."` (reuse the constant if one exists).
     - `unfileRecipeRow(cookbookId, recipeId)` → `{ deleted: CookbookRecipe
       | null }` (the removed row's copy, or null when it wasn't filed).
     - `shareCookbookRow(id)` → `{ before, after, changed }` | null
       (idempotent, `randomBytes(32).toString("base64url")`, row locked);
       `stopSharingCookbookRow(id)` → `{ before, after }` | null, writing
       nothing when already unshared.
  3. `actions/cookbooks.ts`: every action keeps its guard (session or
     manager role), its messages, its result shape and its
     `revalidatePath`s, and calls the module. Allowed differences, each
     using a message the app already has: a missing cookbook or recipe on
     file/delete answers "no longer exists" instead of an error page;
     rename to the same title and stop-sharing an unshared cookbook write
     nothing. Say each one in the report.
- **Verification:** tsc, eslint, `npm test`, both TZ legs. Live on the dev
  branch (no server needed), `ZZZ Assistant Test` cookbooks and recipes
  only: a parity script runs the OLD action bodies (copied into the
  scratchpad, minus auth and `revalidatePath`) and the new module side by
  side on separate test rows for create, rename, delete (with filings),
  file (twice), unfile (twice), share (twice), stop sharing (twice), and
  shows the resulting rows match field by field (ids and timestamps
  aside) and that every returned copy equals the database row. Races:
  5 parallel `findOrCreateCookbookRow` with different capitalisations of
  one new title → one row, one `created`; 5 parallel `fileRecipeRow` of one
  pair → one row; a `deleteCookbookRow` whose guard refuses while a filing
  is inserted at the same moment → nothing deleted. Counts of Cookbook,
  CookbookRecipe, Recipe before/after; all test rows deleted by id.
- **Evidence / done:** outputs per check (a FAIL is reported as FAIL),
  `wc -l` of the new and changed modules, `git diff --stat` inside the
  boundary, commit hash.

### C2 - undo learns cookbooks

- **Objective:** undo can restore, remove and re-create `Cookbook` rows,
  with a cookbook's filings (`CookbookRecipe`) ordered and guarded like
  mission 44's other parents.
- **Boundaries:** May touch: `src/lib/assistant/undoModels.ts`,
  `src/lib/assistant/undoWrites.ts`, new
  `src/lib/assistant/undoPlanCookbook.test.ts`. Must not touch anything
  else, in particular `undoPlan.ts`, `undoPlan.test.ts` (over its soft
  cap; new tests go in the sibling file), the actions, C1's new cookbook write module
  (built in parallel), route files, `prisma/schema.prisma`.
- **Work:**
  1. `COOKBOOK_COLUMNS: Record<keyof Cookbook, ColumnKind>` (dates:
     `createdAt`, `updatedAt`); `Cookbook` in `UndoModel`, `MODELS`,
     `TIER` (0, a parent), `PARENT_TABLES`, and `REFERENCES`
     (`CookbookRecipe.cookbookId`); `tx.cookbook` in `delegate()`.
     `CookbookRecipe`'s FK to `Cookbook` stays `refuse`.
  2. Nothing else should need to change (`undoPlan.ts` reads the registry).
     If it does, stop and report BLOCKED-ON-CONTRACT naming the line.
- **Verification:** tsc, eslint, `npm test`, both TZ legs. New tests in
  `undoPlanCookbook.test.ts`: undoing a cookbook create that also filed
  recipes removes the filings before the cookbook; undoing a cookbook
  delete re-creates the cookbook before its filings; a cookbook update
  (rename, share token) restores in place; `in_use` ignores filings the
  same plan removes. Column pin: a fake key in `COOKBOOK_COLUMNS` fails
  tsc (show it, then remove it). Live proofs happen in C3.
- **Evidence / done:** test names, counts (suite before/after), sizes
  (`wc -l`), `git diff --stat` inside the boundary, commit hash.

### C3 - cookbook routes (after C1 and C2)

- **Objective:** Winnie can list, read, create, rename, delete (H1),
  share and stop sharing cookbooks and file or unfile recipes, every write
  undoable, documented in OpenAPI.
- **Boundaries:** May touch: new `src/lib/assistant/cookbookReads.ts`, new
  `src/lib/assistant/serializeCookbooks.ts` (+ new
  `src/lib/assistant/serializeCookbooks.test.ts`), new
  `src/lib/assistant/schemasCookbooks.ts` (+ new
  `src/lib/assistant/schemasCookbooks.test.ts`), new
  `src/lib/assistant/openapiCookbookPaths.ts`,
  `src/lib/assistant/openapi.ts` (import + spread only),
  `src/lib/assistant/openapiRecipePaths.ts` (move the GET cookbooks row out;
  fix the POST /recipes wording that calls cookbooks read-only),
  `src/lib/assistant/recipeReads.ts` and
  `src/lib/assistant/serializeRecipes.ts` (+ its test) only to move
  `listCookbooks`/`toCookbook` out, `src/app/api/assistant/v1/cookbooks/route.ts`,
  new `src/app/api/assistant/v1/cookbooks/[id]/route.ts`,
  new `src/app/api/assistant/v1/cookbooks/[id]/recipes/[recipeId]/route.ts`,
  new `src/app/api/assistant/v1/cookbooks/[id]/share/route.ts`. Must not touch:
  the write modules (`cookbookWrites.ts` and the rest), undo files,
  actions, components. If a write module lacks something, stop and report
  BLOCKED-ON-CONTRACT.
- **Rules:** mission 44's route rules (each route file exports only
  `export const <METHOD> = assistantRoute(...)`; parse, call lib, shape;
  reads in one small `server-only` read module with narrow `select`s,
  shaped by pure serializers). Every write pushes one `changes` entry per
  row with the module's copies, models named `Cookbook` and
  `CookbookRecipe`. A no-op (re-file, unfile what isn't filed, re-share,
  stop sharing an unshared one, rename to the same title) records nothing.
  Refusals via `toWriteFailure` from `errors.ts`. Drop the leftover
  `toWriteFailure` re-export in `serializeRecipes.ts` and its duplicate
  test in `serializeRecipes.test.ts` (C1 added the same test to
  `errors.test.ts`).
- **Shapes:**
  - `GET /cookbooks` → `{ cookbooks: [{ id, title, recipeCount, shared }] }`.
  - `GET /cookbooks/{id}` → `{ cookbook: { id, title, recipeCount, shared,
    shareUrl, createdByAssistant, recipes: [{ id, title, addedAt }] } }`,
    `shareUrl` absolute from the request origin + `/share/cookbook/{token}`
    or null; recipes newest filing first; 404 if missing.
  - `POST /cookbooks` `{ title }` → 201 `{ cookbook, created: true }` or 200
    `{ cookbook, created: false }` (H4), `cookbook` in the list shape.
  - `PATCH /cookbooks/{id}` `{ title }` → `{ cookbook }`.
  - `DELETE /cookbooks/{id}` → `{ deleted: true, unfiled: <n> }`. Not
    created by Winnie (`didAssistantCreate("Cookbook", id)`): 403
    `forbidden`, "Winnie can only delete cookbooks she created." A filing
    she didn't create (checked inside the delete's transaction through
    the guard, with `assistantCreatedWhere("CookbookRecipe", { in: ids })`):
    409 `conflict`, "The family has filed recipes in this cookbook, so it
    can't be deleted." (the guard may throw the `ApiError`; the
    transaction rolls back). Changes: one `CookbookRecipe` delete per
    filing, then the `Cookbook` delete.
  - `PUT /cookbooks/{id}/recipes/{recipeId}` `{}` → `{ filed: true }`;
    `DELETE` same path → `{ removed: boolean }`. Missing cookbook or recipe
    → 404.
  - `POST /cookbooks/{id}/share` `{}` → `{ shareUrl }`;
    `DELETE /cookbooks/{id}/share` → `{ shareUrl: null }`. OpenAPI says the
    link shows the cookbook's current contents, so filing a recipe into a
    shared cookbook makes it public too (H2).
- **Verification:** tsc, eslint, `npm test`, both TZ legs. Live (port 3245,
  setup above), positive control first (`GET /openapi.json` 200, then
  `GET /cookbooks` count = DB count), `ZZZ Assistant Test` cookbooks and
  recipes only: each route once; then undo each write: create (gone),
  create twice with other capitals (second `created: false`, one row),
  rename (title back), file (filing gone), unfile (same filing id back),
  share (token gone, public link 404), stop sharing (link back, 200),
  delete own cookbook with two own filings (undo brings cookbook and both
  filings back with the same ids and share token), redo of one.
  Refusals: delete a family-made test cookbook (made by script) → 403,
  nothing changed; family files a recipe into Winnie's cookbook by script,
  then delete → 409, nothing changed; family renames Winnie's cookbook by
  script, then undo her rename → 409 `changed_since`; family files into
  Winnie's new cookbook, then undo the create → 409 (`in_use`). Counts of
  Cookbook, CookbookRecipe, Recipe, AssistantRequest before/after; all test
  rows and AssistantRequests deleted by id.
- **Evidence / done:** outputs per check (a FAIL is reported as FAIL),
  sizes, `git diff --stat` inside the boundary, commit hash.

## Handoff log

- 2026-11-06: Numbered 45. Branch cut from `634627a`. Hill dispatched with
  four questions.
- 2026-11-06: Hill answered (H1 to H4 above). C2 dispatched, then C1 (disjoint).
- 2026-11-06: C2 DONE `e857e1b` (3 files, +131/-1). `Cookbook` in the undo
  registry; `undoPlan.ts` needed nothing. 5 new tests in
  `undoPlanCookbook.test.ts`; `npm test` 1244/1244, UTC 1237 + 7 skipped,
  LA 1244. Column pin shown failing tsc with a fake key. Note: the worktree
  had no `node_modules` of its own (tsc found missing packages only in
  files outside the mission); Fury runs `npm ci` before the gates.
- 2026-11-06: C1 DONE `c9de86a` (13 files, +293/-83). `cookbookWrites.ts`
  199, `writeError.ts` 19 (with `RECIPE_MISSING`), actions 159. Parity 31/31
  old bodies vs new module; races: 5 find-or-create → 1 row; 5 file → 1
  row; 40 delete-vs-file, guard saw every filing (22 refused, 18 deleted
  first, 0 inconsistent). Counts restored (Cookbook 5, CookbookRecipe 135,
  Recipe 146). App differences, existing messages only: missing cookbook
  or recipe on delete/file says "no longer exists" (was an error page);
  same-title rename and stop-sharing an unshared cookbook write nothing.
  Left a `toWriteFailure` re-export in `serializeRecipes.ts` (its test is
  outside C1's boundary); C3 removes it.
- 2026-11-06: C3 DONE `944e4d3` (15 files, +478/-35). 9 routes. Live 49/49
  on port 3245: positive control; every write once then undo; delete own
  cookbook with 2 filings and a share token, undo brings all back with same
  ids and token, redo, undo of redo; refusals 403 (family cookbook), 409
  (family filing), `changed_since`, `in_use`. Counts restored. Design note:
  the delete guard compares filings seen under the row lock against
  Winnie's filing ids read just before the transaction, so a filing landing
  in between counts as the family's and the delete is refused (safe side).
- 2026-11-06: Fury gauntlet at `944e4d3`: tsc, eslint, `npm test`
  1249/1249, `npm run build` exit 0 (4 new cookbook routes listed). Gate
  pass 1: Vision + Captain in parallel.

## Gate ledger

### Captain pass 1 (at `0f85097`): BLOCKED

- **BLOCKER:** test split headers missing. `undoPlan.test.ts` has no header
  naming `undoPlan.ts` and its sibling; `undoPlanCookbook.test.ts` doesn't
  name the module it covers (STRUCTURE.md, File-size caps, test files).
- Clean: mission 44's `WriteError`/`toWriteFailure` NOTEs closed with no
  leftovers; dependency direction; `cookbookWrites.ts` as the write home
  (the action no longer touches `db`); route/read/serializer split; undo
  registry. Sizes all under the soft cap (`cookbookWrites.ts` 199/132).
- NOTEs (fix now marked *): N1* `recipeWrites.ts:113` retypes the
  cookbook-missing message; N2 a second `CookbookRecipe` insert inside
  `createRecipeRow` (could share a `fileRecipeInTx`); N3 `RECIPE_MISSING`
  home in `writeError.ts` vs the domain constants; N4* `errors.ts` header
  overclaims "no imports beyond a zod type"; N5 null vs `COOKBOOK_MISSING`
  across the cookbook writes; N6 the delete guard's `WriteError` return path
  has no caller (the route throws); N7 share URLs built in four places;
  N8* recipe order stated twice (query and serializer); N9 CLAUDE.md 375
  lines vs ~250, STRUCTURE.md 1320 vs its 650 trigger; N10
  `actions/recipes.ts` retypes "That recipe no longer exists." six times.
- Proposed STRUCTURE.md amendments for Bryce (on top of mission 44's A1 to
  A4): A5 write refusals and named missing-row constants; A6 one share-URL
  builder; A7 caller guards inside a write lock; A8 name `tagWrites.ts` and
  `cookbookWrites.ts` among the write modules.

### Vision pass 1 (at `0f85097`): BLOCKED

- Gauntlet re-run green (tsc, eslint, 1249/1249, UTC 1242 + 7 skipped, LA
  1249, build with 4 cookbook routes, recordcheck 0 hard). Boundaries clean
  per commit. Live 47/51 (2 were his own test mistake, 2 the blocker):
  twins, no-ops, delete + undo byte-identical, refusals, 15-round delete vs
  family filing race 0 inconsistent. Counts restored. Production read-only:
  401 on `/recipes` and `/cookbooks`.
- **BLOCKER:** `findOrCreateCookbookRow` matches with Prisma `equals` +
  `mode: "insensitive"`, which Postgres runs as `ILIKE` with nothing
  escaped: `%` and `_` act as wildcards. Reproduced: with `… alpha`
  present, `… _lpha` and `… al%` returned alpha (200, `created: false`);
  `"%"` would hand Winnie the oldest family cookbook, which she might then
  file into, rename or share. Fix: exact `lower(title) = lower($1)`.
- NOTEs: same ILIKE wildcard in `tagWrites.ts` `findTagByName` (POST
  /tags, rename clash; folded into F1) and `src/lib/voice/apply.ts:124`
  (follow-up); H1 gap: Winnie can unfile the family's filings from her own
  cookbook and then delete it (all undoable, undo the delete first), to go
  in the notes to Winnie; the merge date was UTC (fixed to Denver
  2026-11-06); the delete guard refuses any filing racing the delete, even
  her own (safe side); app parity line by line, only the allowed
  differences.

### F1 - exact title match, Captain's headers and cheap notes

- **Objective:** close Vision's and Captain's blockers.
- **Boundaries:** May touch: `src/lib/cookbookWrites.ts`,
  `src/lib/tagWrites.ts`, `src/lib/recipeWrites.ts`,
  `src/lib/assistant/errors.ts`, `src/lib/assistant/cookbookReads.ts`,
  `src/lib/assistant/undoPlan.test.ts` (header comment only),
  `src/lib/assistant/undoPlanCookbook.test.ts` (header comment only).
  Nothing else.
- **Work:**
  1. `findOrCreateCookbookRow`: inside the transaction, after the advisory
     lock, find the match with `tx.$queryRaw` `SELECT "id" FROM "Cookbook"
     WHERE lower("title") = lower(${title}) ORDER BY "createdAt" ASC, "id"
     ASC LIMIT 1`, then load it with its recipe count.
  2. `tagWrites.ts` `findTagByName` (both callers): the same exact
     `lower("name") = lower($1)` match, keeping the except-id option and the
     recipe count. No wording change.
  3. `recipeWrites.ts`: import `COOKBOOK_MISSING` instead of retyping it
     (Captain N1). `errors.ts` header: "beyond two types" (N4).
     `cookbookReads.ts`: drop the query's `addedAt` ordering, the
     serializer's sort is the rule (N8).
  4. Headers: `undoPlan.test.ts` "Tests for undoPlan.ts (general undo
     rules). Cookbooks as undo parents are in the sibling
     undoPlanCookbook.test.ts."; `undoPlanCookbook.test.ts` "Tests for
     undoPlan.ts: cookbooks as undo parents (mission 45). The general rules
     are in the sibling undoPlan.test.ts."
- **Verification:** tsc, eslint, `npm test`, both TZ legs. Live on dev
  (port 3270, setup above; Vision's script is at
  `scratchpad/live.ts`), ZZZ rows only: with `ZZZ Assistant Test F alpha`
  present, `… _lpha` and `… al%` each create a new cookbook (201); `… ALPHA`
  still finds alpha (200, `created: false`); 5 parallel creates with mixed
  capitals still make one row. Tags: with `ZZZ Assistant Test F tag`
  present, `POST /tags` `… t_g` and `… t%` each create (201), `… TAG`
  finds it; `renameTag`'s clash check by script: renaming another test tag
  to `… t_g` is allowed when only `… tag` exists, `… TAG` is refused.
  Re-run Vision's `scratchpad/live.ts` in full. Counts before/after; test
  rows and AssistantRequests deleted by id.
- **Evidence / done:** outputs per check, `git diff --stat`, commit hash.
- **F1 DONE `3b5d6a9`** (7 files, +38/-15). Exact `lower()` match for cookbooks
  and tags; Captain's headers, N1, N4, N8. Live 11/11: `_lpha` and `al%`
  create (201), `ALPHA` finds (200); 5 parallel mixed-capital creates → 1
  row; tags `t_g`/`t%` create, `TAG` finds; rename clash exact. Vision's
  `live.ts` 49 + 2 openapi checks that lacked the token (re-checked with
  it: 4 cookbook paths). Counts restored. Fury: eslint clean, build exit 0.
  Gate pass 2: Vision + Captain in parallel.

### Captain pass 2 (at `2691308`): PASS

- Pass-1 blocker closed (both test headers name `undoPlan.ts` and each
  other); N1, N4, N8 closed; the exact `lower()` match stays inside the two
  write modules. Sizes: `cookbookWrites.ts` 207/138, `tagWrites.ts`
  186/129, `recipeWrites.ts` 248/170.
- NOTEs: the `lower() = lower()` lookup idiom now appears twice (extract on
  a third); `src/lib/voice/apply.ts:124` still uses the ILIKE path
  (follow-up); CLAUDE.md length trend. Proposed amendment A9: name lookups
  use exact `lower()` equality, never Prisma `mode: "insensitive"`.

## Delivery

- **Verdicts:** Vision PASS (pass 2 of 3), Captain PASS (pass 2 of 3).
  Strange not assembled (no family-visible wording changed; the app's two
  fixes reuse its existing "no longer exists" messages). Hill decided H1 to
  H4.
- **Shipped for Winnie:** 9 cookbook routes (Design, Routes). Every write
  saves copies and undoes (proven live per route).
- **For the family's app:** behaviour identical, plus: filing into or
  deleting a cookbook already deleted on another phone shows "That cookbook
  no longer exists." instead of an error page; renaming to the same title
  and stop-sharing an unshared cookbook no longer write. Tag rename's clash
  check is now exact (a name with `%` or `_` no longer clashes with a
  different tag).
- **No schema change.**
- **Leftovers (next touch):** `src/lib/voice/apply.ts:124` has the same
  ILIKE wildcard match (follow-up offered); Captain's NOTEs N2, N3, N5,
  N6, N7, N9, N10 (pass 1) and the lookup idiom (pass 2); Vision's: the
  delete guard refuses when any filing races the delete, even Winnie's own.
- **For Bryce:** Hill's H1 (delete at all?) and H4 (no twins from Winnie)
  first; Captain's STRUCTURE.md amendments A5 to A9 (plus mission 44's A1
  to A4) to approve once STRUCTURE.md is free.

### What to tell Winnie (plain English, for Bryce to paste or adapt)

> New in Marshee: you can manage cookbooks. Re-read
> `/api/assistant/v1/openapi.json` for the exact shapes.
>
> - **See them:** `GET /cookbooks` lists every cookbook (with how many
>   recipes and whether it's shared). `GET /cookbooks/{id}` shows one with
>   its recipes, newest first, and `createdByAssistant` (true if you made it).
> - **Make one:** `POST /cookbooks` with `{ "title": "..." }`. If a cookbook
>   with that name already exists (any capitals), you get that one back with
>   `created: false` instead of a twin. Tell Bryce you used the existing one.
> - **Rename:** `PATCH /cookbooks/{id}` with `{ "title": "..." }`. Any
>   cookbook, the family's too.
> - **File a recipe:** `PUT /cookbooks/{id}/recipes/{recipeId}` with `{}`.
>   Take one out: `DELETE` on the same path. Taking a recipe out of a
>   cookbook never deletes the recipe.
> - **Share:** `POST /cookbooks/{id}/share` with `{}` gives a public link;
>   `DELETE /cookbooks/{id}/share` turns it off. The link always shows the
>   cookbook as it is now, so anything filed into a shared cookbook later is
>   public too. Say so when you share one.
> - **Delete:** `DELETE /cookbooks/{id}` works only on a cookbook you made,
>   and only while every recipe in it was filed by you. Otherwise you get
>   403 (not yours) or 409 (the family filed recipes in it). Don't take the
>   family's recipes out just to delete it: ask Bryce.
> - **Undo:** every change above can be undone for 30 days with
>   `POST /audit/{requestId}/undo`. Undo refuses if a family member changed
>   it since; tell Bryce instead of forcing it. If you deleted a cookbook
>   and took recipes out before that, undo the delete first.

### Vision pass 2 (at `2691308`): PASS

- Blocker closed live: 17/17 (`_lpha`, `al%`, bare `%`, a backslash title
  each create; padded `ALPHA` finds; tags `t_g`/`t%` create, `TAG` finds,
  5 parallel → 1 row; rename clash exact, wording unchanged). Full
  `live.ts` 51/51. Gauntlet green (1249, both TZ legs, build, recordcheck 0
  hard). Counts restored; 0 capital-only twins on dev.
- NOTEs: `findTagByName` now orders twins by id (none exist on dev); one
  stray `openapi.get` audit row on dev, deleted by Fury by id (count back
  to 4); H1 two-step gap and `voice/apply.ts` carried.
