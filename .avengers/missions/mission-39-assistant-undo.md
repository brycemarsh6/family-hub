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

### Later contracts (outline, full text before each dispatch)

- **U1, the copy format:** `audit.ts` (`ChangeInput` gains `before`/`after`,
  v2 JSON), `audit/route.ts` (reads `detail`), tests.
- **U2, inventory and leftovers capture copies:** `pantryWrites.ts` returns
  before/after from inside its writes; the five inventory/leftover routes
  pass them on.
- **U3, shopping captures copies:** `groceryWrites.ts`, `putAway.ts`, the
  six shopping routes (split if over six files of real change).
- **U4, undo:** `undoPlan.ts` (+ test), `undoWrites.ts`, the undo route,
  OpenAPI entry and schema. Positive control, then refusals, live.

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
