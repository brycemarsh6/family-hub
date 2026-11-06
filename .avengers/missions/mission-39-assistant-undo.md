# Mission: Winnie's undo (the 30-day safety net)

**Project:** family-hub (Marshee)
**Status:** INTERROGATING (plan drafted, waiting on Bryce's answers below; nothing built)
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

## Contracts (outline; full five-part text written after Bryce answers)

- **L1, mission 22 leftovers first** (same files undo will touch):
  merge-add re-checks `checked: false` (`updateMany`, fall through to
  create); put-away reads the pantry quantity inside its transaction; the
  "list changed" message when a family member un-ticks mid-put-away;
  split `putAway.ts` (344/350) before it grows.
  Files: `groceryWrites.ts`, `putAway.ts` (+ its split), their tests.
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
