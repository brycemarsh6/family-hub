# Mission: Winnie's undo (the 30-day safety net)

**Project:** family-hub (Marshee)
**Status:** BUILDING (L1 dispatched)
**Started:** 2026-11-06 · **Updated:** 2026-11-06

## Brief

- **Goal:** every change Winnie makes through `/api/assistant/v1` can be undone
  for 30 days. Before she changes or deletes anything, Marshee saves a copy of
  how it looked; "undo that" puts the copy back. This is the foundation for
  Bryce's new direction (2026-11-06): Winnie gets every part of the app except
  logins, with undo as the fail-safe. Direction recorded below under
  "Bryce's rulings".
- **Done means:**
  1. Every existing write route (inventory create, edit, adjust, bulk-adjust;
     leftovers; shopping add/merge, edit, delete, check-off, put-away,
     from-low-inventory) records a `before` and `after` copy of each row it
     touches.
  2. `POST /api/assistant/v1/audit/{requestId}/undo` reverses that whole
     request in one transaction, all or nothing: restores edited rows,
     removes rows she created, re-creates rows she deleted (same id).
  3. It refuses (409, nothing changed) when any row was changed by someone
     else since, and says which; refuses when the request is over 30 days
     old, recorded before this mission, already undone, or itself failed.
  4. The undo is itself a logged request, so undoing an undo is a redo.
  5. Live proof on the dev branch (throwaway dev hash): positive control
     first, then each refusal; the family's app flows unchanged.
  6. Gauntlet green, both-timezones command green.
- **Out of scope:** new domains (recipes, meal plan, calendar, habits),
  per-person permissions (Bryce ruled out), the in-app Winnie button and
  chat (separate mission, needs a mock and Winnie's answers), undoing changes
  the family made in the app, any schema change.

## Bryce's rulings (2026-11-06, don't re-litigate)

- Winnie may reach every part of the app, **never** passwords, family
  members or roles.
- Undo by saved copy, kept 30 days.
- **No per-person permissions.** One token, acting as nobody.
- Goals, vision entries, plan items, habits: add and edit, never delete
  (applies when those domains are built, not in this mission).
- Calendar, inventory, shopping keep the v1 rules: delete only what she
  created; inventory is zeroed, never deleted by an ordinary request.
- **Undoing her own pantry add removes the row** (Bryce, 2026-11-06): the
  "zero, never delete" rule protects real items, not her mistakes.
- **Undo reverses her whole request** (a put-away of 8 puts all 8 back).
- **Mission 22's leftovers go first** in this mission (L1).

## Design (Fury's structural calls)

- **No schema change.** `AssistantChange.summary` is already JSON text.
  New rows store `{ "v": 2, "detail": <today's summary>, "before": <row|null>,
  "after": <row|null> }`. Rows without `v: 2` are old and not undoable.
  `GET /audit` keeps showing `detail` as `summary`, so Winnie's view of the
  log does not change shape. (A dedicated column would be tidier; it waits
  until `prisma/schema.prisma` is free, and only if the JSON proves awkward.)
- **Copies are taken inside the write's own transaction**, so the `before`
  is exactly what the write replaced (no read-then-write gap).
- **Restore is compare-and-swap:** `updateMany where { id, ...after fields }`;
  the count must match, else the whole undo rolls back with 409 naming the
  rows that moved. Same for deleting a created row (must still equal
  `after`) and re-creating a deleted one (id must be free).
- **Pruning:** today `pruneAudit` keeps any request with a `create` forever
  (so `didAssistantCreate` stays true). Unchanged. The 30-day undo limit is
  a check on the request's age, not on pruning.
- **New files:** `src/lib/assistant/undoPlan.ts` (pure: changes → restore
  steps, refusals; tested) and `src/lib/assistant/undoWrites.ts`
  (`server-only`, the transaction). Route
  `src/app/api/assistant/v1/audit/[requestId]/undo/route.ts`.

## Danger register

- AGENTS.md in full. Dev branch only; `npm run db:seed` / `db:reset`
  forbidden; never touch the `User` table; secrets only in `.env`/Vercel.
- **Winnie's real token never appears** in chat, code, git or any agent's
  context. Live tests use a throwaway dev hash in `.env`, set by Bryce or
  already present; agents do not edit `.env`.
- **Parallel agents:** `claude/habits-hours` owns goals/habits files,
  `prisma/schema.prisma` and `STRUCTURE.md`. This mission edits none of
  them. Captain reads STRUCTURE.md, proposes amendments in this file only.
- Stage by explicit path; `git show --stat HEAD` after each commit.

## Gauntlet

- `npx tsc --noEmit` · `npx eslint .` · `npm test` · `npm run build`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts` (and `TZ=America/Los_Angeles`)
- `node ~/.claude/skills/avengers/recordcheck.mjs`

## Assembled

- **Stark + Vision** (always). Vision reproduces every undo and refusal live.
- **Captain:** two new modules and touches to live write paths.
- **Strange: out.** Nothing a person sees changes.
- **Banner: out.** Brief of 2026-11-06 plus Fury's own reads cover it.

## Contracts

### Live-test setup (every contract that says "live")

- This worktree has no `.env`. Run `ln -s ../../../.env .env` from the
  worktree root (gitignored; the main checkout's file; its active
  `DATABASE_URL` host is `ep-hidden-pine-`, the dev branch, checked
  2026-11-06). Never open, print or edit it. Remove the link at the end.
- Throwaway token: generate a random token and its SHA-256 hex hash with
  `node:crypto` into a scratchpad file (never the repo). Start the server
  with the hash in the process env only:
  `ASSISTANT_API_TOKEN_HASH=<hash> npx next dev --port 3139` (in the
  background); stop it after. Never touch production URLs.
- Scripts that import `server-only` modules: `node --require <stub making
  require('server-only') return {}> --import tsx --env-file=.env <script>`,
  scripts in the scratchpad only.
- Test rows are named `ZZZ Assistant Test …`; delete every one by id at the
  end, plus every `AssistantRequest` you created by id. Report counts of
  PantryItem / GroceryItem / AssistantRequest before and after. Never print
  family item names; counts and ids only.

### L1, mission 22's leftovers

- **Objective:** close Vision's mission-22 pass-2 notes that live in the
  shopping write files, and split `putAway.ts` before undo grows it.
- **Boundaries.** May touch: `src/lib/groceryWrites.ts`, `src/lib/putAway.ts`,
  new `src/lib/putAwayClassify.ts`, `src/app/actions/groceriesPutAway.ts`,
  `src/app/api/assistant/v1/shopping/put-away/route.ts`,
  `src/lib/assistant/serializeShopping.ts`,
  `src/lib/assistant/schemasShopping.test.ts` (imports only for the last
  three). Must not touch: anything else, and above all
  `prisma/schema.prisma`, `STRUCTURE.md`, `CLAUDE.md`, goals/habits files,
  `package.json`.
- **Work:**
  1. Merge-add (`addGroceryItem`, merge branch): the increment must only land
     on a row that is still unchecked. Use `updateMany({ where: { id,
     checked: false }, data: { quantity: { increment } } })`; count 0 means
     the row was ticked or deleted meanwhile, so fall through to create a
     fresh line. Re-read the row for the return value.
  2. `commitPutAway`: the quantities restocked must be the rows' values at
     claim time, not the read outside the transaction. Suggested: claim
     each row inside the transaction with `tx.groceryItem.delete({ where:
     { id, checked: true } })` (DELETE ... RETURNING, row-locked) and use
     the returned row; a missing row (P2025) is `PutAwayConflict`. Keep
     the all-or-nothing behaviour and the up-front refuse check.
  3. `PutAwayConflict`'s API message covers both causes: replace the route's
     "Someone else put the shopping away at the same moment" with "The
     shopping list changed while putting it away (an item was put away or
     un-ticked somewhere else). Nothing was changed; check the list and
     try again."
  4. Split: `putAwayClassify.ts` takes `findExactMatch` (exported),
     `PutAwayMergeSuggestion`, `PutAwayNewItem`, `PutAwayClassification`,
     `MAX_SUGGESTIONS` and `classifyForPutAway`; `putAway.ts` keeps the
     decision/report/options types, both error classes and
     `commitPutAway`, importing `findExactMatch`. Importers import from
     the module that defines each name; no re-exports. Move code
     byte-identical apart from `export`/imports (show the diff).
- **Verification:** gauntlet. Live (setup above): (a) positive control: one
  merge-add onto an unchecked qty-1 test row gives 2; (b) 10 parallel
  merge-adds onto a qty-1 row give exactly 11; (c) tick the target row,
  then merge-add: a NEW unchecked row is created, the ticked row's quantity
  unchanged; (d) 6 parallel put-aways of one checked qty-1 row: pantry +1
  exactly, one 200 and the rest 409 (or empty 200, say which); (e) change a
  checked row's quantity from 1 to 3 by script, then put away: pantry +3;
  (f) app parity: one put-away through `commitPutAway` exactly as the
  action calls it. Precondition before every put-away: zero foreign checked
  rows (if the family has checked rows on dev, stop and report, do not
  touch them).
- **Evidence required:** commands and outputs for every check, before/after
  counts, `wc -l` plus code-line counts for `putAway.ts` and
  `putAwayClassify.ts`, the split diff, test count before and after.
- **Done criteria:** gauntlet green; every live check matches; both files
  under 350 lines; no file outside the boundary in `git diff --stat`.

### U1, the copy format

- **Objective:** an `AssistantChange` can carry a full before and after copy
  of the row, stored inside `summary` as version-2 JSON, without changing
  what `GET /audit` shows.
- **Boundaries.** May touch: `src/lib/assistant/audit.ts`,
  `src/app/api/assistant/v1/audit/route.ts`, new
  `src/lib/assistant/changeCopy.ts` (pure) and new
  `src/lib/assistant/changeCopy.test.ts`. Must not touch anything else
  (L1 is editing the grocery/put-away files at the same time; a type error
  there is not yours, say so and move on). No live server, no `.env`.
- **Work:**
  1. `ChangeInput` gains optional `before` and `after`
     (`Record<string, unknown> | null`). Existing callers compile unchanged.
  2. `changeCopy.ts` (pure): `encodeChangeSummary({ detail, before, after })`
     returns the stored text `{"v":2,"detail":…,"before":…,"after":…}`
     (Dates as ISO strings); `decodeChangeSummary(text)` returns
     `{ version: 1 | 2, detail, before, after }`, treating any text that is
     not a v2 object as version 1 with `detail` = the parsed JSON and
     `before`/`after` = undefined. Never throws on old rows.
  3. `finishRequest` stores a change as v2 only when the caller supplied
     `before` or `after`; otherwise it stores today's plain JSON. So
     "undoable" means exactly "has copies".
  4. `GET /audit` shows `summary` = `detail` (byte-identical response for
     old rows and for v2 rows), plus `undoable: boolean` per change
     (true only for v2). Copies are not exposed in `GET /audit`.
- **Verification:** gauntlet (tsc, eslint, `npm test`, both TZ legs).
  Tests: round trip with a Date field; an old plain-JSON summary decodes as
  v1 with identical `detail`; `null` summary; a string that is valid JSON
  but not an object; a v2 object missing keys decodes safely.
- **Evidence required:** test names and counts before/after; `git diff
  --stat`; the new `audit.ts` `finishRequest` body.
- **Done criteria:** gauntlet green; only boundary files changed;
  `GET /audit` handler change is additive (`undoable`) only.
- **Commit rule (parallel builder in this worktree):** do NOT use `git add`;
  commit with `git commit -m "<msg>" -- <your paths>` so only your paths
  are recorded whatever else is staged.

### Copy-taking rule (U2, U3a, U3b)

- A `before` copy must be exactly the row the write replaced, and `after`
  exactly what it left, even under parallel writes. Allowed ways:
  an optimistic write keyed on the full read (`updateMany where { id,
  updatedAt: read.updatedAt }` for PantryItem, retry on count 0, the
  existing `adjustPantryQuantity` loop pattern), or a transaction that locks
  the row first (`SELECT … FOR UPDATE` via `tx.$queryRaw`) for GroceryItem,
  which has no `updatedAt`. Say which you used and why.
- Copies are whole rows (every column) as returned by Prisma.
- The family's own Server Actions call the same helpers: their results and
  database effects must stay identical (prove by script, one call each).
- Every write route passes `before` / `after` on each change it records.
  Create: `before: null`. Delete: `after: null`.

### U2, inventory and leftovers take copies

- **Objective:** every inventory and leftover write Winnie makes records
  exact before/after copies.
- **Boundaries.** May touch: `src/lib/pantryWrites.ts`, and the five routes
  `src/app/api/assistant/v1/inventory/route.ts`, `inventory/[id]/route.ts`,
  `inventory/[id]/adjust/route.ts`, `inventory/bulk-adjust/route.ts`,
  `leftovers/route.ts`; tests beside them. Must not touch `audit.ts`
  (U1 owns it), grocery/put-away files, or anything outside.
- **Work:** helpers return `{ before, after }` rows (keep existing return
  fields so the actions compile unchanged, or update the action call sites
  only if unavoidable and say so); routes record them. Bulk-adjust records
  one change per row, copies taken inside its transaction.
- **Verification:** gauntlet. Live: positive control (create, edit, adjust,
  bulk-adjust, leftover on `ZZZ Assistant Test` rows; read each change back
  by script and decode: copies match the DB before and after); 10 parallel
  `adjust +1` on one row: the ten `before.quantity` values are 1..10 with no
  repeat and each `after` = its `before` + 1; app parity by script for
  `setPantryQuantity`, `adjustPantryQuantity`, `editPantryItem`,
  `logLeftover` as the actions call them.
- **Evidence / done:** as L1 (outputs, counts before/after, sizes,
  `git diff --stat` inside the boundary).

### U3a, shopping list writes take copies

- **Objective:** same as U2 for shopping add/merge, edit, delete, check-off
  and from-low-inventory.
- **Boundaries.** May touch: `src/lib/groceryWrites.ts`,
  `src/app/api/assistant/v1/shopping/route.ts`, `shopping/[id]/route.ts`,
  `shopping/check-off/route.ts`, `shopping/from-low-inventory/route.ts`;
  tests beside them. Must not touch `putAway*.ts`, the put-away route,
  `audit.ts`, pantry files.
- **Verification:** gauntlet. Live: positive control for each route on test
  rows (copies decoded and matched against the DB); 10 parallel merge-adds
  onto one row: befores 1..10, no repeat; parallel check-off of one row from
  the API and a script: copies consistent; app parity for each helper the
  actions use.

### U3b, put-away takes copies

- **Objective:** a put-away records copies of every grocery row it removes
  and every pantry row it creates or tops up.
- **Boundaries.** May touch: `src/lib/putAway.ts`,
  `src/app/api/assistant/v1/shopping/put-away/route.ts`; tests beside
  them. Must not touch `putAwayClassify.ts` beyond imports, anything else.
- **Work:** the copies come from inside `commitPutAway`'s transaction (the
  rows L1's claim returns, and each pantry row read before/after its write
  in the same transaction). A pantry row touched twice in one put-away
  (two "Milk" lines) records the first `before` and the last `after`.
- **Verification:** gauntlet. Live: a put-away of three test rows (one
  restock, one merge, one create) with copies matched; two lines into one
  pantry row; app parity through `commitPutAway` as the action calls it.

### U4, undo

- **Objective:** `POST /api/assistant/v1/audit/{requestId}/undo` reverses
  one whole request in one transaction, or refuses and changes nothing.
- **Boundaries.** May touch: new `src/lib/assistant/undoPlan.ts` (pure) and
  `undoPlan.test.ts`, new `src/lib/assistant/undoWrites.ts` (`server-only`),
  new `src/app/api/assistant/v1/audit/[requestId]/undo/route.ts`,
  `src/lib/assistant/schemas.ts` (params/body), `src/lib/assistant/openapi.ts`
  (registry entry; new `openapiAuditPaths.ts` if the cap bites),
  `src/app/api/assistant/v1/audit/route.ts` (adds `undone: boolean` per
  request). Nothing else.
- **Rules:**
  1. Only models `PantryItem` and `GroceryItem` (an allowlist with each
     model's restorable columns and which are dates). Anything else, or any
     change without copies, makes the request `not_undoable`.
  2. Refuse with 409 `conflict` and `details.reason` = `not_undoable`,
     `too_old` (request older than 30 days), `failed_request` (status not
     2xx), `already_undone` (a 2xx request exists whose path is this undo's
     path), or `changed_since` with `details.records` naming every row
     that no longer matches its last `after`. Unknown request id: 404.
  3. Per record, collapse the request's changes: earliest `before`, latest
     `after`. Then: updated row → restore `before` with a compare-and-swap
     on `after` (PantryItem: `updatedAt`; GroceryItem: every column);
     created row → delete it if it still equals `after`; deleted row →
     re-create from `before` with the same id (its `pantryItemId` set to
     null if that pantry row no longer exists). Restores first, then
     deletes, then re-creates. Any miss rolls the whole transaction back.
  4. The undo records its own changes with copies, so undoing an undo is a
     redo.
  5. Response: `{ undone: requestId, restored, removed, recreated }`.
- **Verification:** gauntlet; `undoPlan.test.ts` covers collapse, ordering,
  every refusal, old-format rows. Live, positive control first: undo a
  create, an edit, an adjust, a bulk-adjust, a shopping merge, a delete and
  a three-line put-away; each time the DB matches the pre-request state by
  script. Then: undo twice → `already_undone`; edit the row by script then
  undo → `changed_since`, nothing changed; 2 parallel undos of one request
  → exactly one 200; redo (undo the undo) restores the post-request state;
  a mission-22-era request → `not_undoable`; a request with createdAt moved
  back 31 days by script (on a test request only) → `too_old`.

## Gate ledger

(empty)

## Delivery

(not yet)

## Handoff log

- 2026-11-06: Mission 22 merged (PR #30, squash `812b537`), production
  READY and gated. Bryce widened Winnie's scope; undo is the foundation.
  Banner's facts brief for recipes/meal plan/calendar (2026-11-06) is kept
  for those later missions: `classifyRecipeIngredients` calls Claude;
  meal-plan weeks are stored at the creating phone's midnight; CD1 still
  unmerged and conflicts on the test glob. Plan drafted on branch
  `claude/assistant-undo` (local, not pushed); waiting on Bryce.
- 2026-11-06: U1 DONE `b7f1aa2` (4 files, tests 1002 → 1010, tsc/eslint
  scoped clean, both TZ legs green; build deferred to the gates). Note: it
  used `git add -N` on its two new files so a pathspec commit could take
  them; no other index entries touched. U2 dispatched alongside L1 (disjoint
  files), on port 3140.
