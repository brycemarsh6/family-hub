# Mission 22: Assistant API — shopping list, put-away, and /summary

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-10-10 · **Updated:** 2026-10-10
**Branch:** `claude/assistant-api-m22` from `origin/main` at `70b8eb7` (worktree `.claude/worktrees/family-hub-grok-api-28090b`)
**Plan:** `.avengers/plans/assistant-api-v1.md` (authoritative: API surface table, Bryce's four settled decisions). **Predecessor:** `.avengers/missions/mission-21-assistant-api-foundation.md` — read its Delivery section and the Vision/Captain pass-3 notes; H1 below closes the ones it routed here.
**Client:** Bryce's Grok bot is named **Winnie** (the plan's "Home Hub"). Production is live and switched on (`ASSISTANT_API_TOKEN_HASH` set in Vercel 2026-10-10; verified from outside: every v1 route 401s without the token).

## Brief

- **Goal:** give Winnie the shopping list and a one-call household summary, on the mission-21 skeleton, after first closing the skeleton's known holes.
- **Done means:** with a throwaway local token, every new route returns real dev-branch data or writes exactly what it claims, every write is in `/audit`, the gate test is compiler-based and red-then-green on every evasion Vision found, the app's own shopping and put-away flows are byte-identical (script parity), and the gauntlet is green.
- **Out of scope:** recipes, meal-plan writes, calendar/task writes (missions 23–24); a bot `User` account; any UI change; webhooks.

## Danger register

- AGENTS.md + STRUCTURE.md registers in full. `.env` = Neon **dev** branch (real family data — counts only, never print names; pipe responses through `jq length`). Never `db:seed`/`db:reset`. No `User` writes. Migrations additive only (none expected this mission).
- **Production has a live token now.** Never point a verification at `family-hub-xi-fawn.vercel.app` with writes. Local dev server only, throwaway token whose raw value lives only in a scratchpad file and whose hash sits in the gitignored `.env` only during the run (`grep -c ASSISTANT .env` → 0 afterwards).
- Test rows named `ZZZ Assistant Test …` (pantry and grocery), deleted **by id** with every `AssistantRequest` the run creates. Report PantryItem / GroceryItem / AssistantRequest / AssistantChange counts before and after.
- **The put-away endpoint acts on every checked grocery row**, including rows a family member ticked on their phone. Verification must first confirm the dev branch has **zero** checked grocery rows that aren't test rows (count only); if any exist, report BLOCKED rather than putting them away.
- Stage by explicit path; `git show --stat HEAD` after each commit. Builders never commit.
- Scripts that load `server-only` modules: `node --require <stub making require('server-only') return {}> --import tsx --env-file=.env <script>` (the `react-server` condition crashes on lucide-react). Scripts live in the session scratchpad, never the repo.

## Gauntlet

- `npx tsc --noEmit` · `npx eslint .` · `npm test`
- `sh -c 'TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts'` (and `TZ=America/Los_Angeles`)
- `npm run build` · `node .claude/skills/avengers/recordcheck.mjs origin/main..HEAD`

Baseline at `70b8eb7`: **429 tests**.

## Assembled

- **Stark + Vision** (always). **Captain** — new lib modules, a rename across 11 files, two action-file extractions. **Strange out** — no rendered change. **Banner out** — mission 21's briefs cover this ground; Fury read the grocery actions and put-away directly (2026-10-10).

## Contracts

### H1 — Close the skeleton's holes before adding routes

- **Status:** PENDING
- **Objective:** make the gate condition compiler-checked, map the remaining retryable DB errors, keep the bot's create records forever, and do the renames Captain routed here — so missions 22–24 build on a skeleton with no known holes.
- **Boundaries:** may touch `src/lib/assistant/route.ts` → renamed (git mv) to `src/lib/assistant/assistantRoute.ts`, every file importing `@/lib/assistant/route` (the 10 route files under `src/app/api/assistant/v1/`, plus any lib importer), `src/lib/prismaErrors.ts`, `src/lib/assistant/errors.ts` + `errors.test.ts`, `src/lib/assistant/audit.ts`, `src/lib/assistant/openapi.test.ts`, `STRUCTURE.md` (only the two sentences naming `src/lib/assistant/route.ts` / the wrapper's import path, if any — grep first). Must not touch: handler logic in any route file (import line only), `pantryWrites.ts`, actions, components, schemas, serializers.
- **Work:**
  1. **Rename** `src/lib/assistant/route.ts` → `assistantRoute.ts` with `git mv`; update every importer; update any comment or doc in the boundary that names the old path. The gate test's "must be imported from" rule moves to the new path.
  2. **Hoist** `isWriteConflictError` into `src/lib/prismaErrors.ts` beside `isMissingRowError`, keeping its exact current semantics (P2034, or P2039 whose `meta.driverAdapterError.cause.originalCode` is `40P01`/`40001`) and its comment, adding: the "retrying is safe" claim holds only while every handler is one statement or one `$transaction`. Add **`isTransactionStartTimeout`** for **P2028** (look the code up in `node_modules/@prisma/client/runtime/client.js` and cite where). The wrapper maps write conflicts → 409 `conflict` (unchanged) and P2028 → **503 `busy`** with `Retry-After: 1` ("The household database is busy; try again in a moment."). Add `busy` to `ApiErrorCode`. Unit-test both classifiers with constructed `PrismaClientKnownRequestError` instances (pure — `prismaErrors.ts` imports only the generated Prisma namespace; confirm the test does not construct a client).
  3. **Prune keeps create records:** `pruneAudit` deletes old requests only when they recorded **no** `AssistantChange` with `action: "create"`, so `didAssistantCreate` stays true for the life of the record. Rewrite `didAssistantCreate`'s comment: no longer dormant (its first caller lands in R1 this mission), and the 30-day limit is resolved. Fix the header's "ONE reader … plus rateLimit.ts" wording to be true.
  4. **Compiler-based gate test** in `openapi.test.ts`, replacing the regex checker (keep the registry-vs-route and action-label tests, switched onto the same parse):
     - Parse each file with `typescript`'s `createSourceFile` (devDependency already present) — never strip comments with a regex.
     - **Discovery:** walk all of `src/app` (and fail the test if a `pages/` or `src/pages/` directory exists). For every file named `route.(ts|tsx|js|jsx|mjs|cjs)`, compute its URL pattern: drop route groups `(x)`, drop parallel-route slots `@x`, treat intercepting segments `(.)x` / `(..)x` / `(...)x` as their bare name, and treat dynamic `[x]`, catch-all `[...x]`, optional `[[...x]]` segments as wildcards. A file is **in scope** when that pattern *could* match any URL beginning `/api/assistant/v1/` (e.g. `api/assistant/[v]/x`, `[a]/assistant/v1/x`, `api/[...rest]` are all in scope).
     - **Rule for in-scope files:** every top-level statement carrying `export` must be exactly one `VariableStatement` with `const`, a single declaration, whose name is an HTTP method (`GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS`), and whose initializer is a `CallExpression` whose callee is the identifier `assistantRoute` — and that identifier must be bound by an `import { assistantRoute } from "@/lib/assistant/assistantRoute"` in the same file with no local re-declaration (no shadowing param/var/function named `assistantRoute` anywhere in the file). Reject `export let/var`, `export *`, `export {…}`/re-exports, `export default`, `export function`, type annotations on the method const (`export const POST: T = …`), parenthesised or member callees (`(assistantRoute)(…)`, `x.assistantRoute(…)`), any binary/conditional expression wrapping the call (`assistantRoute(…) && h`), and any other non-type export. Type-only exports (`export type`, `export interface`) are allowed.
     - A **permanent fixture test** feeds at least these snippets through the pure checker and expects each rejected: every form above, plus Vision's comment-stripper evasion (a string literal containing `/*` followed later by `*/`, with an unwrapped export between), a template literal containing `export`, and a correct file (expected accepted). And the discovery function is tested against a synthetic path list including each dynamic/group/slot/intercept/catch-all case and three out-of-scope paths.
     - Every red case also demonstrated once against a real temporary file in `src/app/api/assistant/v1/` (deleted after), listing each failure message.
  5. `ExpiringRow` / anything else: nothing else.
- **Verification:** gauntlet; the red-case list; `git grep -n "assistant/route\"" src` → 0; cycle check unchanged (no new cycle — report the command).
- **Evidence required:** each red case and its message; classifier test names; the P2028 citation; gauntlet output; line counts (total/code) for touched lib files.
- **Done criteria:** Fury re-runs the openapi test and a red case of his choosing.

### G1 — Extract shopping-list writes into `src/lib/groceryWrites.ts`

- **Status:** PENDING (after H1; parallel with P1 and S1)
- **Objective:** one `server-only` definition of every shopping-list write, callable without a session, with the app's actions as thin guarded callers — behaviour byte-identical.
- **Boundaries:** may touch `src/lib/groceryWrites.ts` (new), `src/app/actions/groceries.ts`, `src/app/actions/pantry.ts` (only `addPantryItemToGroceryList` and `addAllLowItemsToGroceryList`, and their imports). Must not touch `groceriesPutAway.ts` (P1), `pantryWrites.ts`, `src/lib/assistant/*`, routes, components.
- **Work:** export, each taking `actorUserId: string | null` where the row has `addedById` (STRUCTURE.md amendment A applies — read it):
  - `addGroceryItem(fields, { actorUserId, mergeIntoExisting = false })` — creates a row exactly as the action does today (quantity default 1 when not > 0, unit trim→null, `toCategory`, `toStore`). When `mergeIntoExisting` is true and an **unchecked** row exists with the same **name key** (lowercased, tokens joined — reuse `tokens` from `src/lib/match.ts`, do not write a new normaliser) **and** the same store (null matches null), it adds the quantity to that row instead and returns `{ row, merged: true }`. The app's action passes `mergeIntoExisting: false` (unchanged behaviour). Returns `{ row, merged }`.
  - `setGroceryChecked(ids: string[], checked: boolean)` — sets `checked` and `checkedAt` (now / null) on the listed ids in one `updateMany`, returns the count. The app's `toggleGroceryItem` keeps its own read-flip semantics but uses a single-row helper (`toggleGroceryChecked(id)`) from this module.
  - `setGroceryQuantity(id, qty)` (floor 1, 2dp), `editGroceryItem(id, partialEdits)` — partial patch; the `categoryEdited` rule stays exactly as today (true only when the category differs from the **stored** value, `undefined` otherwise); `location` null = no opinion; returns the row or null if missing. The action passes its full object.
  - `deleteGroceryItem(id)` (throws P2025 on missing, as today), `clearCheckedGroceryItems()`.
  - `addPantryItemToList(pantryItemId, store, actorUserId)` and `addLowItemsToList(store, actorUserId)` — the two pantry-side adders moved here verbatim (skip already-listed by `pantryItemId`, quantity 1, copy name/unit/category, `toStore`), returning the created rows (use `createManyAndReturn` if available in this Prisma version — check `src/generated/prisma` typings — else create in a transaction) so the API can audit ids.
  - Actions keep exact signatures, guards, early returns, and `revalidatePath` calls; they import helpers under `write…` aliases where names collide (amendment A).
- **Verification:** gauntlet; **script parity on the dev branch** with `ZZZ Assistant Test …` rows: every helper's behaviour (create defaults, merge on/off incl. null-store matching and checked rows NOT merged, quantity floor, edit partial + categoryEdited both ways, check/uncheck batch with checkedAt, delete, clear-checked restricted to test rows by first asserting no non-test checked rows exist, add-low skipping already-listed). Counts before/after. Plus an old-body → new-helper comparison table for Vision.
- **Evidence required:** parity readbacks (test rows only), counts, the comparison table, gauntlet.
- **Done criteria:** Fury diffs both action files: every export keeps its guard.

### P1 — Extract put-away into `src/lib/putAway.ts`

- **Status:** PENDING (after H1; parallel with G1 and S1)
- **Objective:** the classify → review → commit flow callable without a session, reporting exactly what it did, with the app's flow byte-identical.
- **Boundaries:** may touch `src/lib/putAway.ts` (new), `src/app/actions/groceriesPutAway.ts`. Must not touch `PutAwayReviewSheet.tsx` / `PutAwayButton.tsx` (they import the types from the action — keep re-exporting them there with `export type { … } from "@/lib/putAway"`; a `"use server"` file may export types), G1's files, `src/lib/assistant/*`, routes.
- **Work:** move `findExactMatch`, `MAX_SUGGESTIONS`, the types, `classifyForPutAway()` and `commitPutAway(decisions, options?)` into `putAway.ts` verbatim in logic. `commitPutAway` now **returns** a report `{ items: [{ groceryItemId, groceryName, action: "restocked" | "merged" | "created", pantryItemId, quantityAdded }] }` (built inside the transaction; the action ignores it and keeps returning `{}` / `{ error }` as today). New option `{ createUnreviewed: "defaults" | "refuse" }`, default `"defaults"` (today's behaviour: an unmatched item with no decision is created from the grocery row's own fields, location `DEFAULT_LOCATION`). `"refuse"` makes commit throw a typed `PutAwayNeedsReview` error listing the unreviewed grocery ids **before** writing anything — the API uses it so Winnie never silently files a new item it wasn't told about. Re-verify inside the transaction exactly as today.
- **Verification:** gauntlet; script parity on dev with test rows only, **after asserting zero non-test checked grocery rows exist** (else BLOCKED): a fully-known batch (restock, `restockedAt` advances, location/category overrides applied only on auto-match), a merge decision (quantity only), a create decision (edited fields), an unreviewed item under `"defaults"` (created in Other) and under `"refuse"` (throws, **nothing written** — prove by readback), and the returned report for each. Counts before/after.
- **Evidence required:** readbacks, report outputs, the refuse-writes-nothing proof, counts, gauntlet.
- **Done criteria:** Fury diffs the action file; reads the transaction body against the old one.

### S1 — Shopping and summary schemas, serializers, and the Denver-week helper

- **Status:** PENDING (after H1; parallel with G1 and P1)
- **Objective:** the pure pieces R1 and R2 need, tested, in new per-domain files (the `schemas.ts` split Captain asked for, done by adding files rather than moving the inventory ones).
- **Boundaries:** may touch `src/lib/assistant/schemasShopping.ts` (new) + test, `src/lib/assistant/serializeShopping.ts` (new) + test, `src/lib/assistant/summary.ts` (new, pure) + test. Must not touch `schemas.ts`, `serialize.ts` (import from them only), G1/P1 files, routes.
- **Work:**
  - `schemasShopping.ts` (zod, `.strict()` everywhere, vocabularies from constants — `STORES` and `CATEGORY_NAMES`, `LOCATION_NAMES`): `shoppingListQuery` (`store` ∈ STORES or `"none"`, `checked` "true"|"false" → boolean optional), `shoppingAddItem` (name 1–120, quantity >0 ≤10000 default 1, unit ≤30 nullable optional, category optional, store optional nullable, note ≤200 optional, `merge` boolean default true), `shoppingAddBody` = one item **or** an array of 1–50 items, `shoppingPatchBody` (name, quantity, unit, category, store, note, location nullable, checked — at least one key), `checkOffBody` (`ids` 1–100 unique, `checked` default true), `putAwayBody` (`decisions` array optional, each the `PutAwayDecision` shape with zod validation; `acceptDefaults` boolean default false), `fromLowInventoryBody` (`store` optional nullable). Reuse `calendarDateString` from `schemas.ts` for any date field.
  - `serializeShopping.ts`: `toShoppingItem(row, { addedByName, createdByAssistant })` → `{ id, name, quantity, unit, category, store, checked, checkedAt, note, location, fromInventoryId (pantryItemId), addedBy: { kind: "assistant" } | { kind: "person", name } | null, createdAt }` field by field. `toPutAwayClassification` and `toPutAwayReport` mappers.
  - `summary.ts` (pure): `findPlanForWeek(plans, sunday: CalendarDate, timeZone)` — a plan matches when its `weekStart` instant is within **±14 hours** of `zoneMidnightInstant(sunday, timeZone)` (plans are stored as the creating phone's local midnight, which differs by zone); nearest wins. `sundayOfCalendarDate(date)` via `dayOfWeek`/`addCalendarDays` (or reuse if `householdDate.ts` already has it — grep). `bucketEventsByDay(events, days: CalendarDate[], timeZone)` — an **all-day** event covers UTC calendar dates `[startAt, endAt)` (the CT1 all-day convention); a **timed** event covers the Denver calendar dates its `[startAt, endAt)` touches (a zero-length event covers its start date). `summarizeInventory(items, today, tz, expiringWithinDays)` → `{ total, low, out, expiring }` reusing `isLow`, `effectiveExpiry`, `expiresWithin`, `daysUntilInZone` — **no new copy** of any of those rules.
  - Tests: `findPlanForWeek` with plans stored at Denver, LA, Eastern and Hawaii midnight for the same Sunday, across the Nov 1 2026 week, plus a neighbouring week that must not match; `bucketEventsByDay` with an all-day event on day+2 (must NOT land in today/tomorrow), a timed event crossing Denver midnight, a 6 pm Denver timed event (already tomorrow in UTC), a multi-day all-day event; schemas' strictness/bounds; serializer key sets (no `addedById` raw id leaked).
- **Verification:** gauntlet incl. both direct TZ legs; tsc; eslint.
- **Evidence required:** test names and counts per leg; line counts.
- **Done criteria:** Fury re-runs the three legs.

### R1 — Shopping routes

- **Status:** PENDING (after G1, P1, S1)
- **Details written by Fury before dispatch, from the G1/P1/S1 reports.**

### R2 — `/summary` route

- **Status:** PENDING (after R1)
- **Details written by Fury before dispatch.**

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-10-10 — Bryce: "Let's continue building this out for Winnie." Mission 22 written from mission 21's routed notes and the plan's shopping/summary rows. Branch `claude/assistant-api-m22` from `70b8eb7`. H1 dispatched alone (it touches every existing route file's import); G1/P1/S1 follow in parallel.
