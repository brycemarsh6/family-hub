# Mission 21: Assistant API — foundation, inventory, leftovers, family, audit

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-10-09 · **Updated:** 2026-10-09
**Branch:** `claude/assistant-api-m21` (worktree `.claude/worktrees/family-hub-grok-api-28090b`)
**Plan:** `.avengers/plans/assistant-api-v1.md` — authoritative for the API surface and the four decisions Bryce settled (presence-only recipe↔inventory, Denver "today" with `?date=` override, audit log with no bot account, the bot deletes only what it created). Missions 22–24 follow it.

## Brief

- **Goal:** the first of four PRs for the private Assistant API Bryce's "Home Hub" bot calls. This one lays the foundation (auth, rate limit, audit, body/validation, error shape, OpenAPI, token script) and ships the inventory, leftovers, family and audit endpoints, with the pantry write logic extracted out of `actions/pantry.ts` into one `server-only` lib module both the actions and the API call.
- **Done means:** with `ASSISTANT_API_TOKEN_HASH` set, a correct bearer gets real dev-branch data from every mission-21 route; every write appears in `GET /audit`; every attack in the Verification list fails the way it says; the app's own pantry flows (stepper, edit sheet, add + duplicate review, merge, log leftover, add low items) behave byte-identically; the gauntlet is green.
- **Out of scope:** shopping, summary, recipes, meal plan, calendar, tasks routes (missions 22–24); a bot `User` account; any UI change; quantity/unit parsing; webhooks.

## Danger register

- AGENTS.md and STRUCTURE.md's registers apply in full. Highlights for this mission:
- `.env` points at the Neon **dev** branch (verified 2026-10-09: active host `ep-hidden-pine…`, the production reference is the commented `ep-hidden-surf…` line). Never use the production URL. The dev branch holds **real family data** — never print rows containing names of people, passwords hashes, or other private fields into reports; count, don't quote.
- `npm run db:seed` / `db:reset` are forbidden.
- No script creates/updates/deletes `User` rows.
- Migration is **additive only**; create with `--create-only`, read the SQL, then apply.
- **No real assistant token ever appears in chat, a report, a commit, or a file.** Verification uses a throwaway token generated in the verifying process and its hash written only to the worktree's gitignored `.env` (removed after), never to Vercel. Bryce generates the real one himself.
- Stage by explicit path, never `git add -A`. `git show --stat HEAD` after each commit.
- Pantry rows created during verification are named `ZZZ Assistant Test …` and deleted by id when the run ends; report counts before and after.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts`
- `TZ=America/Los_Angeles node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts`
- `npm run build`
- `node .claude/skills/avengers/recordcheck.mjs origin/main..HEAD`

Baseline before mission: **350 tests**, all green, at `167641f`.

## Assembled

- **Stark + Vision** (always).
- **Captain** — new lib subtree, new route tree, a refactor of a live write path, a STRUCTURE.md amendment.
- **Strange: out** — no UI changes. If any contract ends up touching a component's rendered output, Strange comes in.
- **Banner: not needed** — three Explore briefs and a Next-docs brief already mapped this ground (summarised in the plan).

## Contracts

### C1 — Dependencies, schema, test glob and env scaffolding

- **Status:** DONE (2026-10-09) — committed `97d2ced`
- **Objective:** add `zod`, the two additive audit tables, the `src/lib/assistant/*.test.ts` glob in all places it is quoted, and the env-var scaffolding — nothing else.
- **Boundaries:**
  - may touch: `package.json`, `package-lock.json`, `prisma/schema.prisma`, the new migration directory `prisma/migrations/*_add_assistant_audit/` (new — created by `prisma migrate dev --create-only`), `.github/workflows/ci.yml`, `.env.example`, `AGENTS.md` (the quoted test command only), `CLAUDE.md` (the quoted test command only, near the "TZ=UTC node --import tsx --test" passage), 
  - must not touch: anything under `src/`, any other migration, `.env` beyond reading it.
- **Work:**
  1. `npm install zod@^4` (exact resolved version in the report). Confirm `zod` has zero dependencies (`npm ls zod --all`).
  2. Add to `prisma/schema.prisma`, with `///` doc comments in house style explaining why (rate limit + audit share one table; `summary` is JSON **text** because the schema avoids provider-specific types; no FK to `User` — the bot is not a user):
     ```
     model AssistantRequest {
       id String @id @default(cuid())
       method String
       path String
       action String          // e.g. "inventory.adjust", stable label from the route wrapper
       status Int
       durationMs Int
       ip String?
       error String?
       createdAt DateTime @default(now())
       changes AssistantChange[]
       @@index([createdAt])
     }
     model AssistantChange {
       id String @id @default(cuid())
       requestId String
       request AssistantRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
       model String            // "PantryItem", "GroceryItem", ...
       recordId String
       action String           // "create" | "update" | "delete"
       summary String          // JSON text
       createdAt DateTime @default(now())
       @@index([model, recordId])
       @@index([requestId])
     }
     ```
  3. `npx prisma migrate dev --create-only --name add_assistant_audit`, read the SQL (must be only `CREATE TABLE` / `CREATE INDEX` / `ADD CONSTRAINT … FOREIGN KEY` on the two new tables), then `npx prisma migrate dev` to apply to the dev branch, then `npx prisma generate`.
  4. Test glob: append ` src/lib/assistant/*.test.ts` to `package.json`'s `test` script and to both direct `node --import tsx --test` lines in `ci.yml`. Update the quoted command in `AGENTS.md` and the one in CLAUDE.md to the three-directory form. (Fury checked: Node 24's `--test` treats an unmatched glob as zero files and exits 0, so the entry is safe before C2 adds the first test file.)
  5. `ci.yml` env block: add `ASSISTANT_API_TOKEN_HASH: ""` is wrong (empty = off is fine but misleading) — add nothing to the env block; nothing reads it at build time. (Plan said "mirror"; Fury overrides: an unused dummy is noise.)
  6. `.env.example`: an `ASSISTANT_API_TOKEN_HASH` block in the `VOICE_API_TOKEN` style — what it is, that the value is the SHA-256 **hash** printed by `npm run assistant:token` (script arrives in C6), that unset turns the whole API off, and that the raw token goes only into the bot's secure input.
- **Preflight judgements (Fury, 2026-10-09):** `package-lock.json` is generated (cap n/a); CLAUDE.md is a context file only edited at one quoted command (cap n/a); `prisma/schema.prisma` will cross 650 total lines — **explicitly exempt** in STRUCTURE.md's caps section.
- **Verification:** `npx prisma migrate status` → up to date; `npx tsc --noEmit`; `npm test` → 350 pass; the UTC and LA direct commands (with the new glob) → result reported verbatim; `git diff --stat`.
- **Evidence required:** the migration SQL in full; `npm ls zod --all` output; row counts of `PantryItem`, `GroceryItem`, `Recipe`, `User` before and after the migration (counts only); outputs of every verification command.
- **Done criteria:** Fury re-runs `git diff origin/main -- package.json .github/workflows/ci.yml`, reads the migration file, and `npx prisma migrate status`.
- **Report:** DONE. zod 4.6.5 (zero deps). Migration `20261009203359_add_assistant_audit` — Fury read it: two CREATE TABLE, three CREATE INDEX, one FK, nothing else; applied to dev; `migrate status` up to date. Counts unchanged (pantry 467, grocery 5, recipe 146, user 5). Glob added in package.json + both CI legs + AGENTS.md; CLAUDE.md's "test must live in src/lib" sentence updated (its other mention quotes the command elided). Note for future runs: zsh errors on an unmatched glob locally — CI/npm use `sh`, where Node receives the pattern and exits 0.

### C3 — Household date helpers and one definition of "expiring within N days"

- **Status:** DONE (2026-10-09) — committed `edbe1f4`
- **Objective:** pure, tested helpers that let a UTC server answer "what calendar day is it in Denver" and "what instant is Denver midnight on a given day", plus one shared `isExpiringWithin`, migrating its three inline copies.
- **Boundaries:**
  - may touch: `src/lib/householdDate.ts` (new), `src/lib/householdDate.test.ts` (new), `src/lib/expiring.ts`, `src/lib/expiring.test.ts` (new or existing), `src/app/(app)/(home)/page.tsx`, `src/app/(app)/kitchen/page.tsx`, `src/app/(app)/kitchen/expiring/page.tsx`.
  - must not touch: `src/lib/constants.ts` (import `HOUSEHOLD_TIME_ZONE`, don't edit it — its "no consumer" comment gets updated in C5, which is the first real consumer), `src/lib/mealPlanDates.ts`, `package.json`, anything else.
- **Work:**
  1. `householdDate.ts` — pure, no imports except types/`constants` for the zone name if needed (prefer taking `timeZone` as a parameter, defaulting nothing). Exports:
     - `type CalendarDate = { year: number; month: number; day: number }` (month 1–12).
     - `calendarDateInZone(instant: Date, timeZone: string): CalendarDate` via `Intl.DateTimeFormat(… { timeZone, year, month, day })` `formatToParts`.
     - `zoneMidnightInstant(date: CalendarDate, timeZone: string): Date` — the UTC instant at which that calendar day begins in that zone. Must be correct on DST transition days (Mar 8 2026 spring-forward, Nov 1 2026 fall-back, both at 02:00 local, so midnight itself is unambiguous — but the offset differs before/after: test that Mar 8 → 07:00Z, Mar 9 → 06:00Z, Nov 1 → 06:00Z, Nov 2 → 07:00Z for America/Denver).
     - `parseDateParam(text: string): CalendarDate | null` — strict `YYYY-MM-DD`, rejects 2026-02-30, 2026-13-01, "2026-1-5", "".
     - `formatCalendarDate(date): string` → `YYYY-MM-DD`.
     - `addCalendarDays(date, n): CalendarDate` and `dayOfWeek(date): number` (0 = Sunday) using UTC arithmetic on the components (process-TZ independent).
     - `utcMidnightInstant(date): Date` — the all-day convention (`localDayToAllDayInstant`'s output shape: UTC midnight), so API code can build all-day bounds without `new Date(y, m, d)`.
     Every function must give identical results under `TZ=America/Denver`, `TZ=UTC`, `TZ=America/Los_Angeles` — that is the whole point; tests must include a case that would fail if `new Date(y, m, d)` (process-local) were used.
  2. `expiring.ts`: add `isExpiringWithin(item, withinDays, today): boolean` = `effectiveExpiry(item)` non-null and `daysUntil(expiry.date, today) <= withinDays`. Replace the three inline copies (home page `<= EXPIRING_SOON_WINDOW_DAYS`, kitchen page `<= TILE_BADGE_WINDOW_DAYS`, and the expiring page's `daysLeft > WINDOW_DAYS` skip — careful: that page needs `daysLeft` for labels too, so only migrate it if it reads cleaner; if not, leave it and say why). Keep each page's own window constant where it is. Behaviour must be unchanged.
  3. Tests: `householdDate.test.ts` (DST cases above, the year boundary Dec 31 → Jan 1, an instant at 05:30Z on Nov 2 being Nov 1 in Denver, the 6–7 pm Mountain "already tomorrow in UTC" case); `isExpiringWithin` cases (real date wins, estimate, null expiry, boundary equal to window).
- **Verification:** `npm test`, plus the UTC and LA direct commands on `src/lib/*.test.ts src/lib/voice/*.test.ts`; `npx tsc --noEmit`; `npx eslint` on touched files; and **prove the process-TZ case can go red**: temporarily change one helper to use `new Date(y, m - 1, d)`, show the UTC or LA leg failing, revert, show green.
- **Evidence required:** test counts per leg; the red-then-green output; diff of the three pages.
- **Done criteria:** Fury re-runs all three legs and diffs the pages.
- **Report:** DONE. `householdDate.ts` (8 exports, no imports) + 11 tests; `isExpiringWithin` + 3 tests; home and kitchen pages migrated, expiring page deliberately not (needs `daysLeft` for labels — computing expiry twice reads worse). Tests 350 → 364; UTC leg 357 pass + 7 pre-existing Denver-only skips; LA 364. Red-then-green shown on `utcMidnightInstant` only (LA leg red under a process-local mutation). **For Vision:** `zoneMidnightInstant` / `calendarDateInZone` were not mutation-tested; its comment limits correctness to zones whose DST change doesn't straddle midnight (all US zones).

### C2 — The assistant core: auth, body, errors, rate limit, audit, route wrapper

- **Status:** DISPATCHED (2026-10-09)
- **Objective:** `src/lib/assistant/` with everything a route needs to be a 20-line file, fully tested where pure.
- **Boundaries:** may touch: `src/lib/assistant/{authPolicy,errors,body,rateLimitPolicy}.ts` + their `.test.ts`, `src/lib/assistant/{rateLimit,audit,route}.ts`. Must not touch: anything else.
- **Work:** per the plan's Files section and its Next.js 16 conventions section (read both). Specifics:
  - `authPolicy.ts` (pure): `parseBearer(header: string | null): string | null` (case-insensitive scheme, exactly one space-separated token, trims; rejects `Bearer` with nothing, `Basic …`, two tokens); `hashToken(token): string` (sha256 hex); `isTokenValid(provided: string, expectedHashHex: string): boolean` — hash `provided`, compare the two 32-byte digests with `timingSafeEqual`; a malformed expected hash (not 64 hex chars) returns false, never throws.
  - `errors.ts` (pure): `ApiError(status, code, message, details?)`; `errorResponse(err)` → `Response.json({ error: { code, message, details } }, { status })`; the 401 body is exactly `{ error: "unauthorised" }` (mirrors `/api/voice`, deliberately not the envelope — an attacker learns nothing, including the envelope shape). `fromZodError(zodError)` → 400 `validation` with `details: [{ path, message }]`.
  - `body.ts` (pure): `readJsonBody(request, maxBytes = 65536)` → `{ ok: true, value } | { ok: false, error: ApiError }` per the plan (content-length precheck 413, `Buffer.byteLength` check 413, non-JSON content-type 415, parse failure 400 `invalid_json`, empty body on a write → `value: undefined`).
  - `rateLimitPolicy.ts` (pure): `WINDOW_MS = 60_000`, `LIMIT = 120`, `evaluate(countInWindow, oldestInWindow, now)` → `{ limited: false } | { limited: true, retryAfterSeconds }`.
  - `rateLimit.ts` (`server-only`): one `count` + one `findFirst` (oldest in window) over `AssistantRequest`.
  - `audit.ts` (`server-only`): `recordRequest({ method, path, action, status, durationMs, ip, error, changes })` → id, inserting request + changes in one nested create; `didAssistantCreate(model, recordId)`; `listAudit({ since?, limit, writesOnly })`; `pruneAudit()` deleting requests older than 30 days (called via `after()` from the wrapper).
  - `route.ts` (`server-only`): `assistantRoute<P extends Record<string,string> = Record<string,never>>({ action, body?: ZodType, query?: ZodType, handler })` returning an explicit `(request: NextRequest, context: { params: Promise<P> }) => Promise<Response>`. The handler receives `{ request, params, body, query, now, changes }` where `changes.push({ model, recordId, action, summary })` is how a handler records what it touched, and returns `{ status?, data }` (wrapper does `Response.json`) or throws `ApiError`. Order exactly: env hash missing → 404 `{}` with no body detail (the API "doesn't exist") → `parseBearer`/`isTokenValid` → 401 terse → rate limit → 429 with `Retry-After` → body (only POST/PUT/PATCH) → zod body/query → `await params` → handler → **awaited** `recordRequest` (failure → 500 `audit_failed`, logged `[assistant] audit write failed:`) → response with `x-assistant-request-id`. Every outcome from rate-limit onward is recorded (including 4xx/5xx), 401/404/429 are not. Prisma `P2025` (`isMissingRowError` from `src/lib/prismaErrors.ts`) → 404 `not_found`. Unknown errors → 500 `internal`, `console.error("[assistant] failed:", …)`. `ip` = first hop of `x-forwarded-for`.
  - Header comments in house voice on `route.ts`: why a Route Handler and not a Server Action; the SECURITY paragraph; why no `force-dynamic`; why no `revalidatePath` (see the plan); why the audit write is awaited.
- **Verification:** gauntlet; tests for every pure module (bearer cases incl. wrong-length token and an uppercase hex hash; error shapes; body cap with a multibyte string whose `.length` is under the cap but bytes are over; rate-limit edge at exactly 120).
- **Evidence required:** test names and counts; file line counts (total and code) for each new file.
- **Done criteria:** Fury reads `route.ts` against the ordering above; re-runs tests.

### C4 — Extract pantry writes into `src/lib/pantryWrites.ts`; thin the actions

- **Status:** DONE (2026-10-09) — committed `f7dbfa9`
- **Objective:** the one definition of every pantry write, callable without a session; `actions/pantry.ts` becomes guard → call → `refreshKitchenViews()`, behaviour byte-identical.
- **Boundaries:** may touch `src/lib/pantryWrites.ts` (new, `server-only`), `src/app/actions/pantry.ts`. Must not touch: components, other actions (the two "add to grocery list" actions stay in `pantry.ts` untouched — they move to `groceryWrites.ts` in mission 22), `src/lib/voice/apply.ts` (its own semantics; leave a NOTE if it should adopt the helper later).
- **Work:** export from `pantryWrites.ts`: `createPantryItem(fields)`, `setPantryQuantity(id, qty)`, `adjustPantryQuantity(id, delta)` (new; reads current, floor 0, 2dp, restockedAt only on increase; returns `{ before, after }` or null if missing), `editPantryItem(id, changes)` (accepts a **partial** patch for the API; the action passes the full object, so behaviour is unchanged — restockedAt rule on increase), `mergeIntoPantryItem(id, qty)`, `logLeftover({ name, quantity, daysGood, today })` where `today` is a `CalendarDate`-free plain `Date` for the expiry midnight — **keep the action's current behaviour exactly** (server-local midnight `+days`) and add an optional `expiresAt` override parameter the API will use to pass a Denver-midnight instant; findDuplicateCandidates(name, location) wrapping the existing query + `findDuplicateMatches`. Every function returns the written row (id + fields) so the API can audit and serialize it. The single "restockedAt only when quantity rises" rule lives in one private helper with the existing explanatory comment moved onto it. Actions keep their exact signatures, guards and return values.
- **Verification:** gauntlet; **behaviour parity against the dev DB, by script** — agents never type a family member's password and must not mint a session cookie (the environment correctly blocks that). Write a throwaway script in the session scratchpad (NOT the repo) run with `node --conditions=react-server --import tsx --env-file=.env <script>` from the worktree root (the `react-server` condition is what lets a script load `server-only` modules). It must, on rows named `ZZZ Assistant Test …`: create; setPantryQuantity up (restockedAt advances) and down (restockedAt unchanged); adjust +2/−5 (floor 0); editPantryItem full and partial (restockedAt rule both ways; untouched fields unchanged on partial); merge; logLeftover (category Leftovers, location Fridge, lowThreshold 0, expiresAt = server-local midnight + days, and with an explicit expiresAt override); findDuplicateCandidates hitting the test row. Show each readback. Delete the test rows by id at the end. Report PantryItem count before and after. Separately: a line-by-line comparison table, old action body → new helper, for every moved write, so Vision can audit semantics by reading.
- **Evidence required:** before/after counts; per-flow DB readback (non-test rows never quoted).
- **Done criteria:** Fury diffs `actions/pantry.ts` — every export still opens with its original guard.
- **Report:** DONE. `pantryWrites.ts` 229 lines (7 exports; private `restockedIfRose` is now the one copy of the rule); `actions/pantry.ts` 372 → 290, every export keeps its guard and early returns. Quantity helpers return `{ before, after, row }` (deviation: + row, accepted). `logLeftover` takes an optional `expiresAt` override instead of `today` (accepted — default path unchanged). Script parity on dev: PantryItem 467 → 467, every rule both ways. **Script-running lesson:** `--conditions=react-server` crashes because `constants.ts` pulls lucide-react; use `node --require <stub making require('server-only') return {}> --import tsx --env-file=.env`. NOTE: `voice/apply.ts` could adopt `adjustPantryQuantity` later (different undo semantics — left). For Vision: browser parity of the stepper/edit/add/merge flows was not checked (no session available to agents).

### C5 — Routes: inventory, leftovers, family

- **Status:** PENDING (after C2, C3, C4)
- **Objective:** the mission-21 routes per the plan's API table, using the wrapper.
- **Boundaries:** may touch `src/app/api/assistant/v1/{inventory,inventory/[id],inventory/[id]/adjust,inventory/bulk-adjust,inventory/expiring,inventory/review,leftovers,family}/route.ts` (new), `src/lib/assistant/{schemas,serialize,today}.ts` (+ tests), `src/lib/constants.ts` (only the `HOUSEHOLD_TIME_ZONE` comment, to say it now has a consumer), `src/proxy.ts`, `STRUCTURE.md` (only the public-prefix clause and the layout row for `src/app/api/`, wording drafted for Captain to gate). Must not touch: other routes, actions, components.
- **Details:** fixed later from C2–C4 reports (Fury fills this in before dispatch).

### C6 — OpenAPI, audit route, token script, README

- **Status:** PENDING (after C5)
- **Details:** fixed before dispatch.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-10-09 — Plan approved by Bryce; mission file written; branch renamed `claude/assistant-api-m21`; worktree `.env` copied from the main checkout (dev host verified) and `prisma generate` run. Baseline 350 tests at `167641f`. Dispatching C1 and C3 in parallel (disjoint boundaries).
- 2026-10-09 — C1, C3, C4 dispatched in parallel (disjoint boundaries; C4's verification rewritten to a script-level parity check because agents must not use a family member's password or mint a session). C2 waits on C1's schema; C5/C6 details get written from C2–C4 reports.
- 2026-10-09 — C1/C3/C4 DONE and committed (`97d2ced`, `edbe1f4`, `f7dbfa9`); Fury re-ran tsc, eslint ., npm test (364/0). C2 dispatched.
