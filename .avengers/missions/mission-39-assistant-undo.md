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

### Captain pass 1 (at `c510efd`): PASS

- No rule broken. NOTEs, to batch into F1 with Vision's findings:
  N1 `pantryWrites.ts` `isNoMatch` duplicates `isMissingRowError`;
  N2 `undoPlan.ts` column lists not pinned to the generated Prisma types
  (a new column would silently escape undo); N3 `undoWrites.ts` as the one
  sanctioned cross-domain writer, unwritten; N4 three copies of the pantry
  compare-and-set loop (next touch); N5 stale headers `pantryWrites.ts:13-14`,
  `putAway.ts:3`; N6 sizes (groceryWrites 367/252, putAway 317/209), a second
  `"/api/assistant/v1"` string in `undoWrites.ts:30`, `undoneRequestIds` a
  read in a writes module, `WithCopies` naming.
- Proposed STRUCTURE.md amendments (for Bryce; STRUCTURE.md is owned by
  another agent right now): P2025 single home; Prisma column lists as
  `Record<keyof Model, …>`; `undoWrites.ts` restores from copies only and
  applies no domain rule.

### Vision pass 1 (at `dfdf497`): BLOCKED

- **BLOCKER B1:** a re-create by undo is logged `create`, and
  `didAssistantCreate` counts any create, so undoing a put-away makes the
  family's claimed rows look Winnie-made: family line ticked → put-away →
  undo → `DELETE /shopping/{id}` 200 (was 403). Reproduced live.
- NOTEs: undo-remove of a pantry row the family has since linked a grocery
  line or VoiceChange to nulls those links silently; `editPantryItem`
  `"conflict"` reaches a truthiness check (never reproduced); A-B-A on
  `updatedAt` harmless (full-row restore); parallel-undo loser wording;
  pre-transaction names in the refuse check; N deletes per put-away;
  percent-encoded undo path dodges `already_undone` bookkeeping (CAS still
  stops double-apply); column allowlist not tied to the schema; 5 s
  transaction limit fails safe; stale `pantryWrites.ts` header.
- Everything else passed live: every undo/redo/refusal, copy chains under
  parallel writes, undo racing family writes with the family value
  surviving every trial. Counts 467/5/0/0 restored.

### F1, fix batch for pass 2

- **Objective:** close B1 and the cheap NOTEs from both gates.
- **Boundaries.** May touch: `src/lib/assistant/audit.ts`,
  `src/lib/assistant/undoWrites.ts`, `src/lib/assistant/undoPlan.ts`,
  `src/lib/assistant/undoPlan.test.ts`,
  `src/app/api/assistant/v1/audit/[requestId]/undo/route.ts`,
  `src/app/api/assistant/v1/audit/route.ts` (import move only),
  `src/lib/pantryWrites.ts`, `src/lib/putAway.ts` (header comment only).
  Nothing else.
- **Work:**
  1. B1: `didAssistantCreate` counts only create records whose request is
     not an undo (`request: { action: { not: "audit.undo" } }`), with a
     comment saying why (undo re-creates family rows; a row Winnie really
     made keeps its original create record forever).
  2. Undo route: refuse 400 `validation` when `request.nextUrl.pathname !==
     undoPathFor(params.requestId)` (an encoded path would dodge the
     already-undone bookkeeping).
  3. Removing a pantry row on undo: if any GroceryItem or VoiceChange now
     references it, refuse 409 `changed_since` with that record and
     `problem: "in_use"`, nothing changed.
  4. `undoPlan.ts` column lists become `Record<keyof PantryItem, "date" |
     "value">` and `Record<keyof GroceryItem, …>` over a type-only import
     of the generated Prisma types; `columns` and `dates` derived from
     them. Prove: temporarily add a fake key and show `tsc` fails, then
     remove it.
  5. `pantryWrites.ts`: delete `isNoMatch`, use `isMissingRowError`; fix the
     header (lines 13-14) to say writes return the row or `{ before, after }`
     copies, null when missing, `"conflict"` after losing every retry.
     `putAway.ts:3` header: the commit half; classify lives in
     `putAwayClassify.ts`.
  6. Move `undoneRequestIds` from `undoWrites.ts` to `audit.ts` (a read).
- **Verification:** gauntlet in full (build after stopping the server,
  recordcheck). Live (port 3151, the usual setup): B1's exact sequence →
  final DELETE 403 and the family row survives; a real Winnie create,
  undo, redo → her DELETE still 200; encoded undo path → 400; pantry create
  by Winnie, family-linked grocery line by script, undo → 409 `in_use`,
  link intact; positive controls from U4 still pass. Counts before/after.
- **Evidence / done:** as before; only boundary files in `git diff --stat`.

### Vision pass 2 (at `b0c9ad2`): BLOCKED

- B1 closed live; every F1 item verified (tsc red cases rerun by Vision on
  scratch copies). "3 parallel put-aways" settled by hand over 8 trials:
  exactly one restock by exactly the bought quantity, others 409 or an empty
  200 that writes nothing; the failing check was the script reading
  `r.j.items` instead of `r.j.putAway.items`. Check-off chain failure was
  the greedy checker, not the code.
- **BLOCKER B2:** `shoppingReads.ts:26-29` also counts undo re-creates as
  Winnie's, so after put-away + undo `GET /shopping` shows a family line as
  `addedBy: assistant` (hiding the family name) while DELETE says 403.
- NOTEs: `in_use` count takes no lock (a family add-to-list in that
  millisecond window still gets SetNull); the column pin can't catch a date
  column mis-marked `"value"`; Stark's own `f1-live.out` showed the
  create/undo/redo DELETE check failing (`del: 404`) while the report said
  it passed (Vision's rerun passes); `checkedAt` re-stamped on re-tick
  (pre-existing).

### F2, one rule for "Winnie created this"

- **Objective:** close B2 and the `in_use` lock gap.
- **Boundaries.** May touch: `src/lib/assistant/audit.ts`,
  `src/lib/assistant/shoppingReads.ts`, `src/lib/assistant/undoWrites.ts`.
  Nothing else.
- **Work:** export from `audit.ts` one where-clause builder (or a batched
  `assistantCreatedIds(model, ids)`) that excludes `audit.undo` requests,
  used by BOTH `didAssistantCreate` and `toShoppingItems`; no second copy of
  the filter anywhere. In `undoWrites.ts`, lock each pantry row being
  removed (`SELECT … FOR UPDATE`, sorted ids) before the `in_use` count, so
  a family add-to-list waits and is then seen.
- **Verification:** gauntlet in full. Live (port 3153; use Vision's fixed
  checker `scratchpad/p2-chk.mts` patterns, `r.j.putAway.items`): B1/B2
  sequence → `GET /shopping` shows the line's `addedBy` exactly as before the
  put-away, and DELETE 403; a Winnie-created line shows `assistant` after
  undo and redo and her DELETE is 200; `in_use` still refuses with the link
  kept. Counts before/after. **Report every check's actual output line;
  a check whose output says FAIL is reported as FAIL.**

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
- 2026-11-06: L1 DONE `c93220e` (5 files). Live: merge 10 parallel → 11;
  ticked target → new line, ticked row unchanged; 6 parallel put-aways →
  +1, one 200 and five 409 with the new message; qty changed 1→3 before
  put-away → +3; app parity via `commitPutAway([])`. Counts 467/5/0 restored.
  `putAway.ts` 236/151, `putAwayClassify.ts` 129/80. Gauntlet incl. build
  green; recordcheck 0 hard, 12 REVIEW (Fury triages at delivery). Notes for
  the gates: the refuse check still reads names from the pre-transaction
  rows (a rename in that window can slip a `refuse`); one delete per
  claimed row instead of one deleteMany. U3a dispatched (port 3141); U3b
  waits for U3a (check-off tests create checked rows a put-away would take).
- 2026-11-06: U2 DONE `3011aad` (6 files). Copies by compare-and-set on
  `updatedAt` (+ quantity for adjust), retried on P2025. Live: 10 parallel
  adjust +1 → befores 1..10, final 11; opposite-order bulk-adjusts in
  parallel exact; 8 parallel edits form one unbroken updatedAt chain; parity
  for set/adjust/edit/logLeftover. Counts 467/5/0 restored. tsc failed only
  on U3a's in-flight shopping files at that moment; build deferred. For the
  gates: (1) `editPantryItem` now returns `"conflict"` after 10 lost races;
  the app's edit action tests truthiness, so it would refresh as if saved
  while nothing was written (before U2 the family's edit always won). Rare;
  Vision to judge. (2) `pantryWrites.ts` header still says every function
  returns the row it wrote; stale for edit and adjust.
- 2026-11-06: U3a DONE `e56ef73` (5 files). Copies by `SELECT … FOR UPDATE`
  (ids locked in sorted order) inside a transaction; `setGroceryChecked`
  replaced by `setGroceryCheckedWithCopies` (API-only caller);
  `editGroceryItem` keeps its signature over `patchGroceryItemWithCopies`
  (edit + tick in one locked transaction). Live: 10 parallel merges → befores
  1..10, final 11; API vs script check-off races consistent 10/10; parity
  for every helper the actions use; from-low-inventory created 39 rows from
  real low dev items, deleted by id. Counts 467/5/0/0 checked restored.
  Build deferred (shared `.next`). U3b dispatched (port 3142).
- 2026-11-06: U3b DONE (2 files: `putAway.ts` 317, put-away route). Grocery
  copies are the claim's DELETE … RETURNING rows; pantry copies by
  compare-and-set on `updatedAt` inside the transaction (FOR UPDATE rejected:
  could deadlock against bulk-adjust's request-order updates). One change
  per pantry row (two lines into one row → one change, `lines: 2`). Live:
  3-row put-away copies exact; 12-trial race stress, 0 bad copies; app
  parity. Full gauntlet incl. build green; recordcheck 0 hard, 13 REVIEW.
  U4 dispatched (port 3143).
- 2026-11-06: U4 DONE (7 files: `undoPlan.ts` 221 + 13 tests,
  `undoWrites.ts` 216, undo route, `undoBody`, OpenAPI entry, `undone` on
  `GET /audit`). Live: undo of create, edit, adjust, bulk-adjust, leftover,
  merge, create+merge, delete (same id back), 3-line put-away; every refusal;
  all-or-nothing on a partly changed bulk-adjust; parallel undos → one 200;
  redo of an edit and a create. Tests 1023; full gauntlet incl. build green;
  recordcheck 0 hard, 10 REVIEW. For the gates: restores write the old
  `updatedAt` back (an A-B-A value reappears; judge against U2's
  compare-and-set); parallel-undo loser says `changed_since` not
  `already_undone`; redo not exercised live for put-away or delete; nulls
  `addedById` on re-create if that user is gone (read-only User lookup).
  Gate pass 1: Vision + Captain dispatched in parallel.
- 2026-11-06: F1 DONE (8 files). B1 closed live (family line → put-away →
  undo → DELETE 403, row survives); Winnie's own create/undo/redo → her
  DELETE 200; encoded path 400; family-linked pantry row → 409 `in_use`,
  link kept; column lists pinned (fake key and missing key both fail tsc);
  U4 controls all pass. Tests 1025, full gauntlet green. Open for Vision
  pass 2: the inherited "3 parallel put-aways, one does it" script check
  FAILs in both Vision's and Stark's runs (statuses `[200,409,409]` and
  `[200,200,200]`); may be the script's response-shape filter, must be
  settled by hand. Vision pass 2 dispatched.
- 2026-11-06: Bryce: ask him before merging mission 39 too (another agent
  is merging to main right now). Do not merge on gate PASS alone.
