# Mission 21: Assistant API — foundation, inventory, leftovers, family, audit

**Project:** family-hub (Marshee)
**Status:** AT-THE-GATES
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

- **Status:** DONE (2026-10-09) — committed `09c2fcf`
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
- **Report:** DONE. 7 modules (route.ts 174 lines, ~45 comment) + 32 tests; 396/0 Denver, UTC 389 + 7 skips, LA 396; build green; dev-DB script exercised record/didAssistantCreate/listAudit/prune, AssistantRequest/Change counts 0→0. Fury read `route.ts`: order matches the contract. Choices accepted: global (not per-IP) limit — only authenticated rows exist; prune on ~2% of requests via `after()`; no `{data}` envelope; extra generics B/Q. **Known limits, recorded:** (1) the audit insert is not in the mutation's transaction — an audit failure after a successful write returns 500 `audit_failed` ("check /audit before retrying"); upgrade path in the plan. (2) Pruning after 30 days removes the create record, so `didAssistantCreate` turns false for items the bot made over 30 days ago — acceptable (it can still edit/zero them) but note for missions 22–24. (3) `route.ts` has no unit test; C5b's end-to-end run is its test.

### C4 — Extract pantry writes into `src/lib/pantryWrites.ts`; thin the actions

- **Status:** DONE (2026-10-09) — committed `f7dbfa9`
- **Objective:** the one definition of every pantry write, callable without a session; `actions/pantry.ts` becomes guard → call → `refreshKitchenViews()`, behaviour byte-identical.
- **Boundaries:** may touch `src/lib/pantryWrites.ts` (new, `server-only`), `src/app/actions/pantry.ts`. Must not touch: components, other actions (the two "add to grocery list" actions stay in `pantry.ts` untouched — they move to `groceryWrites.ts` in mission 22), `src/lib/voice/apply.ts` (its own semantics; leave a NOTE if it should adopt the helper later).
- **Work:** export from `pantryWrites.ts`: `createPantryItem(fields)`, `setPantryQuantity(id, qty)`, `adjustPantryQuantity(id, delta)` (new; reads current, floor 0, 2dp, restockedAt only on increase; returns `{ before, after }` or null if missing), `editPantryItem(id, changes)` (accepts a **partial** patch for the API; the action passes the full object, so behaviour is unchanged — restockedAt rule on increase), `mergeIntoPantryItem(id, qty)`, `logLeftover({ name, quantity, daysGood, today })` where `today` is a `CalendarDate`-free plain `Date` for the expiry midnight — **keep the action's current behaviour exactly** (server-local midnight `+days`) and add an optional `expiresAt` override parameter the API will use to pass a Denver-midnight instant; findDuplicateCandidates(name, location) wrapping the existing query + `findDuplicateMatches`. Every function returns the written row (id + fields) so the API can audit and serialize it. The single "restockedAt only when quantity rises" rule lives in one private helper with the existing explanatory comment moved onto it. Actions keep their exact signatures, guards and return values.
- **Verification:** gauntlet; **behaviour parity against the dev DB, by script** — agents never type a family member's password and must not mint a session cookie (the environment correctly blocks that). Write a throwaway script in the session scratchpad (NOT the repo) run with `node --conditions=react-server --import tsx --env-file=.env <script>` from the worktree root (the `react-server` condition is what lets a script load `server-only` modules). It must, on rows named `ZZZ Assistant Test …`: create; setPantryQuantity up (restockedAt advances) and down (restockedAt unchanged); adjust +2/−5 (floor 0); editPantryItem full and partial (restockedAt rule both ways; untouched fields unchanged on partial); merge; logLeftover (category Leftovers, location Fridge, lowThreshold 0, expiresAt = server-local midnight + days, and with an explicit expiresAt override); findDuplicateCandidates hitting the test row. Show each readback. Delete the test rows by id at the end. Report PantryItem count before and after. Separately: a line-by-line comparison table, old action body → new helper, for every moved write, so Vision can audit semantics by reading.
- **Evidence required:** before/after counts; per-flow DB readback (non-test rows never quoted).
- **Done criteria:** Fury diffs `actions/pantry.ts` — every export still opens with its original guard.
- **Report:** DONE. `pantryWrites.ts` 229 lines (7 exports; private `restockedIfRose` is now the one copy of the rule); `actions/pantry.ts` 372 → 290, every export keeps its guard and early returns. Quantity helpers return `{ before, after, row }` (deviation: + row, accepted). `logLeftover` takes an optional `expiresAt` override instead of `today` (accepted — default path unchanged). Script parity on dev: PantryItem 467 → 467, every rule both ways. **Script-running lesson:** `--conditions=react-server` crashes because `constants.ts` pulls lucide-react; use `node --require <stub making require('server-only') return {}> --import tsx --env-file=.env`. NOTE: `voice/apply.ts` could adopt `adjustPantryQuantity` later (different undo semantics — left). For Vision: browser parity of the stepper/edit/add/merge flows was not checked (no session available to agents).

### C5a — The shared pieces routes need: today, schemas, serializers (+ two additive helper params)

- **Status:** DONE (2026-10-09) — committed `75ddab1`
- **Objective:** pure, tested modules that turn DB rows into the wire format, validate inputs, and answer "what day is it in Denver" process-independently; plus the two small additive params on `pantryWrites.ts` the routes need.
- **Boundaries:** may touch `src/lib/assistant/today.ts` (new) + `today.test.ts` (new), `src/lib/assistant/schemas.ts` (new) + `schemas.test.ts` (new), `src/lib/assistant/serialize.ts` (new) + `serialize.test.ts` (new), `src/lib/pantryWrites.ts` (additive optional params only), `src/lib/constants.ts` (ONLY the `HOUSEHOLD_TIME_ZONE` comment, which must now say it has a consumer and name it). Must not touch: routes (none exist yet), actions, components, any other lib file.
- **Work:**
  1. `today.ts` (pure; imports `householdDate.ts` and `HOUSEHOLD_TIME_ZONE`): `householdToday(now: Date, dateParam?: string): CalendarDate | null` (null only when a `dateParam` is given and invalid — the route turns that into 400); `daysUntilInZone(instant: Date, today: CalendarDate, timeZone): number` = calendar-day difference between `calendarDateInZone(instant)` and `today` (negative = overdue). **Must not use `expiring.ts`'s `daysUntil`/`startOfDay`** — they use process-local getters, which on Vercel's UTC runtime put Denver evenings on the wrong day. Tests across the 6–7 pm Mountain "already tomorrow in UTC" case under all three TZ legs.
  2. `pantryWrites.ts` (additive, defaults unchanged so the actions' behaviour can't move): `createPantryItem` gains optional `lowThreshold` and `expiresAt`; `logLeftover` gains optional `location` (default `"Fridge"`); `adjustPantryQuantity` gains an optional final `client` param (a Prisma transaction client, default `db`) so bulk-adjust can be atomic. Type the client param via Prisma's generated `Prisma.TransactionClient`.
  3. `schemas.ts` (zod; pure): one schema per request shape in the plan's inventory/leftovers/family rows — `inventoryListQuery` (location ∈ `LOCATION_NAMES`, category ∈ `CATEGORY_NAMES`, status ∈ low|out|expiring|ok, q ≤ 100 chars, withinDays int 1–60 default 7, `date` YYYY-MM-DD optional), `inventoryCreateBody` (name 1–120 trimmed, quantity ≥ 0 ≤ 10000 default 1, unit ≤ 30 nullable, category/location enums optional, lowThreshold ≥ 0 optional, expiresOn YYYY-MM-DD nullable optional, allowDuplicate boolean default false), `inventoryPatchBody` (all optional, at least one key, `.strict()`), `adjustBody` (delta finite, non-zero, |delta| ≤ 10000, reason ≤ 200 optional), `bulkAdjustBody` (1–100 adjustments, ids unique — refine with a clear message), `expiringQuery`, `leftoverBody` (name 1–120, portions 0.5–50 default 1, daysGood int 1–14 default 3, location ∈ Fridge|Freezer default Fridge, `date` optional). Every object `.strict()` so a typo'd field is a 400, not silently ignored. Use `CATEGORY_NAMES`/`LOCATION_NAMES` from constants — never retype the vocabularies.
  4. `serialize.ts` (pure): `toInventoryItem(row, { onList, today, timeZone })` → `{ id, name, quantity, unit, category, location, lowThreshold, status: "out"|"low"|"ok", expiresOn (YYYY-MM-DD of a real expiresAt in the zone, or null), expiry: { date, isEstimate, daysLeft } | null (via effectiveExpiry + daysUntilInZone), onShoppingList, restockedAt (ISO), updatedAt (ISO) }`. `out` = quantity ≤ 0; `low` = `isLow` and quantity > 0. `toFamilyMember(row)` → `{ id, displayName, role, isKid: role === "kid", isActive: deactivatedAt === null }` built field by field — never spread. `toReviewQueue(queue)` → `{ total, pairs: [{ kind, fingerprint, a, b }], parked: [{ kind, fingerprint, item }] }` with items narrowed to `{ id, name, location, category, quantity, unit }`.
  5. Tests: schemas (strictness, defaults, each bound, the unique-ids refine); serializers (status boundaries at 0 and at lowThreshold; expiresOn for a Denver-midnight instant; an estimate's `isEstimate`; **a family row carrying `passwordHash` and `voiceTokenHash` produces output with neither key**).
- **Verification:** gauntlet including both direct TZ legs with the assistant glob; tsc; eslint on touched files; re-run C4's parity facts for the three touched helpers by script (defaults unchanged; new params honoured; `adjustPantryQuantity` inside `db.$transaction` rolls back when the transaction throws). Script runner: `node --require <stub making require('server-only') return {}> --import tsx --env-file=.env`, scripts in the scratchpad, test rows `ZZZ Assistant Test …` deleted by id, PantryItem count before/after.
- **Evidence required:** test counts per leg; the rollback demonstration; line counts (total/code) per new file.
- **Done criteria:** Fury re-runs the three legs; reads `serialize.ts`'s family mapper.
- **Report:** DONE. 3 modules + 17 tests (413 total; all three legs green). `setPantryQuantity` also gained the `client` param (outside the list, required — `adjustPantryQuantity` delegates to it; accepted). Rollback demonstrated: tx adjust 5→15 then throw → read back 5. PantryItem 467→467. Query `date` fields check shape only; impossible dates are rejected by `householdToday` → the route must 400 on null.

### C5b — The routes: inventory, leftovers, family; proxy; STRUCTURE.md wording

- **Status:** DONE (2026-10-09) — committed `4a80572`
- **Objective:** the mission-21 endpoints, each a thin `route.ts` over `assistantRoute`, plus the proxy entry and the constitution amendment text.
- **Boundaries:** may touch (all new unless noted): `src/app/api/assistant/v1/inventory/route.ts` (GET list, POST create), `…/inventory/[id]/route.ts` (GET, PATCH), `…/inventory/[id]/adjust/route.ts` (POST), `…/inventory/bulk-adjust/route.ts` (POST), `…/inventory/expiring/route.ts` (GET), `…/inventory/review/route.ts` (GET), `…/leftovers/route.ts` (POST), `…/family/route.ts` (GET); `src/proxy.ts` (modify); `STRUCTURE.md` (modify: the public-route clause in "Boundary rules", the `src/proxy.ts` layout row, and the guarded-action split's list of non-browser instances). Must not touch: any lib file (if a route needs a lib change, report BLOCKED-ON-CONTRACT naming it), actions, components.
- **Route rules:** a route file exports only HTTP methods (`export const GET = assistantRoute(...)`) — nothing else, or `next build` fails. Params typed inline. Action labels `inventory.list|get|create|update|adjust|bulkAdjust|expiring|review`, `leftovers.create`, `family.list`. Every write pushes one `changes` entry per touched row (model `PantryItem`, the id, `create`/`update`, a summary of the input — for adjust include `before`, `after`, `reason`). Behaviour per the plan's API table:
  - `GET /inventory`: one `Promise.all` (pantry rows + unchecked grocery `pantryItemId`s); filter; `q` ranks via `searchItems` (when `q` is present the order is search rank, else name asc); `status=expiring` uses `withinDays`. Response `{ items, today: "YYYY-MM-DD" }`.
  - `POST /inventory`: `findDuplicateCandidates(name, location ?? DEFAULT_LOCATION)`; matches and not `allowDuplicate` → 409 `conflict` with `details.matches` (id, name, location, kind) and nothing written (and no `changes`); else `createPantryItem` with `expiresAt = zoneMidnightInstant(expiresOn, HOUSEHOLD_TIME_ZONE)` (the browser edit sheet's convention) → 201.
  - `PATCH /inventory/{id}`: `editPantryItem` partial; null → 404. `expiresOn: null` clears.
  - `POST /inventory/{id}/adjust` → `{ item, before, after }`.
  - `POST /inventory/bulk-adjust`: one `findMany` to confirm every id exists (missing → 404 with `details.missing`, nothing written), then all adjustments inside `db.$transaction` via the `client` param → `{ results: [{ id, before, after }] }`.
  - `GET /inventory/expiring`: items whose effective expiry is ≤ `withinDays` away (overdue included), sorted by daysLeft then name, each with `urgency` now (≤1) | week (≤6) | later.
  - `GET /inventory/review`: `buildReviewQueue` over pantry rows + dismissals (one `Promise.all`), via `toReviewQueue`.
  - `POST /leftovers`: expiry = `zoneMidnightInstant(addCalendarDays(today, daysGood))`; `logLeftover` with that `expiresAt` and `location` → 201.
  - `GET /family`: narrow `select { id, displayName, role, deactivatedAt }` — **never `PERSON_SELECT`** (it selects `passwordHash`) — ordered `createdAt` then `id`, via `toFamilyMember`.
  - Any `?date=` invalid → 400 `validation`.
- **proxy.ts:** add `"/api/assistant/v1/"` (trailing slash) to `PUBLIC_ROUTE_PREFIXES` with a comment in the file's existing voice: why a prefix here (a versioned subtree whose every handler opens with the same bearer gate in `assistantRoute`), why the trailing slash (the R4 drill), and that proxy is UX, the wrapper is the gate.
- **STRUCTURE.md:** amend the public-route clause to permit a narrow prefix for "a versioned API subtree where every handler is built from one shared gate (`assistantRoute`)"; add `/api/assistant/v1/` as the third non-browser instance in the guarded-action split; update the proxy layout row's list (it also still omits `/api/alexa` — fix that while there). Mark the amendment with the date and "Bryce-approved (plan approval, 2026-10-09)".
- **Verification — end to end, positive control first:** set a throwaway token: generate it in a shell variable in the verifying process (`openssl rand -base64 32`), write ONLY its SHA-256 hex as `ASSISTANT_API_TOKEN_HASH=` in the worktree's `.env`, keep the raw token in a scratchpad file, **never echo it into the report**. Start `npx next dev --port 3123` in the background, wait for ready, then with curl:
  1. Positive: `GET /family` and `GET /inventory?status=low` with the bearer → 200, counts only in the report.
  2. Auth: no header, `Bearer wrong`, a token one char short, the hash itself as the token, `Basic <token>` → each 401 with body exactly `{"error":"unauthorised"}`; none of these create an `AssistantRequest` row.
  3. Off switch: restart dev with `ASSISTANT_API_TOKEN_HASH` removed → every route 404, even with the right token.
  4. Writes on `ZZZ Assistant Test …` rows: create → 201; create the same name again → 409 with matches; with `allowDuplicate: true` → 201; PATCH; adjust +2 / −5; bulk-adjust over two test ids; bulk-adjust including a bogus id → 404 and the real one unchanged; leftovers → 201 with `expiresOn` = today+3 in Denver. Each write's `x-assistant-request-id` matches an `AssistantRequest` row with the right `AssistantChange` rows (read by script).
  5. Validation: an unknown field → 400 with `details`; `delta: 0` → 400; non-JSON content-type on POST → 415; a 70 KB body → 413.
  6. Rate limit: 121 rapid requests in a minute → the 121st is 429 with `Retry-After`, and refused requests add no rows.
  7. Proxy drill, no cookie, no bearer: `/api/assistantX/inventory` and `/api/assistant/v2/inventory` → 307 to `/login`; `/api/assistant/v1/inventory` → 401 (reaches the handler).
  Then: stop the dev server; delete every test pantry row and every `AssistantRequest` the run created (by id); remove `ASSISTANT_API_TOKEN_HASH` from `.env`; report PantryItem / AssistantRequest / AssistantChange counts before and after.
- **Evidence required:** status code + response body (bodies with real family data reduced to counts) for every numbered check; the counts; `next build` output showing the new routes.
- **Done criteria:** Fury re-runs a subset of the attacks independently; reads every route file for extra exports.
- **Report:** DONE. 8 route files (exports: GET×5, PATCH×1, POST×4, nothing else — Fury re-grepped); build lists all 8 as dynamic. E2E all as contracted: positive 200s; 5 auth variants → exact `{"error":"unauthorised"}` with zero audit rows; off switch → 404 everywhere; writes + 409 + bulk 404 (nothing written) + leftovers Denver expiry, audit rows read back; 400/415/413; 121st → 429 + Retry-After, refused not recorded; proxy drill 307/307/401. Counts PantryItem 467→467, AssistantRequest 0→0. **Notes:** (1) the builder's first `/family` curl printed display names into its own tool output (not the report) — dev data, session transcript only. (2) AssistantRequest cleanup was a blanket deleteMany — acceptable only because the table was 0 before and holds no household data; future runs delete by id. (3) The "is it on the shopping list" lookup is repeated in five routes (lib was out of boundary) → extraction added to C6.

### C6 — OpenAPI spec, audit route, token script, README

- **Status:** DONE (2026-10-09) — committed `e8144a3`
- **Objective:** `/openapi.json` generated from the same zod schemas, `/audit`, `npm run assistant:token`, and the human docs.
- **Boundaries:** may touch `src/lib/assistant/inventoryReads.ts` (new — one `onShoppingListIds(ids)` / single-item helper replacing the repeated lookup in the five inventory routes, which may be modified ONLY to call it), the five inventory route files under `src/app/api/assistant/v1/inventory/`, `src/lib/assistant/openapi.ts` + `openapiInventoryPaths.ts` (or similar per-domain registry files, new) + `openapi.test.ts` (new), `src/lib/assistant/schemas.ts` (only to add the audit query schema and response schemas if needed), `src/app/api/assistant/v1/openapi.json/route.ts` (new), `src/app/api/assistant/v1/audit/route.ts` (new), `prisma/assistant-token.mjs` (new), `package.json` (scripts only), `README.md`. Must not touch other routes, other lib files, actions.
- **Work:**
  - `openapi.ts`: an OpenAPI 3.1 document, title "Marshee Assistant API", version "1", bearer security scheme; per-operation entries in a registry (method, path, action label, summary, query/body zod schemas, response description) converted with `z.toJSONSchema`. Every mission-21 route has an entry.
  - `openapi.test.ts`: walks `src/app/api/assistant/v1` with `readdirSync`, reads each `route.ts`'s source, finds its `export const (GET|POST|PUT|PATCH|DELETE)`, and asserts the registry has an entry for every (path, method) and no entry without a route — the spec cannot fall behind. Also asserts the document is valid JSON with every operation carrying `security`.
  - `GET /openapi.json` (behind the bearer, per the spec) and `GET /audit?since=&limit=&writesOnly=` (`listAudit`; since = ISO instant; limit 1–200 default 50; newest first; each request with its changes).
  - `prisma/assistant-token.mjs`: plain Node, imports only `node:crypto`. Prints a fresh 32-byte base64url token **once**, its SHA-256 hex, and three plain-English lines: put the hash in Vercel as `ASSISTANT_API_TOKEN_HASH` (Production), paste the token into Home Hub's secure input, run again to rotate. Never writes a file. `npm run assistant:token` → `node prisma/assistant-token.mjs`. **The builder runs it once only to show the output shape, redacting both values in the report.**
  - README: a short "Assistant API (the Home Hub bot)" section after "Useful commands" — what it is, generate token, set the env var in Vercel, turn it off (unset), rotate, where the spec lives, and that the bot can't touch accounts/passwords/settings.
- **Verification:** gauntlet; `openapi.test.ts` shown red by temporarily commenting one registry entry, then green; dev-server curl with a throwaway hash: `/openapi.json` 200 with the bearer and 401 without; `/audit` lists a write made in the same run; cleanup as in C5b.
- **Evidence required:** red-then-green; curl results; README diff.
- **Done criteria:** Fury runs the token script himself (output not recorded) and `GET /openapi.json` through the dev server.
- **Report:** DONE. inventoryReads.ts (onShoppingListIds/isOnShoppingList) used by four inventory routes (bulk-adjust didn't need it). openapi.ts + openapiInventoryPaths.ts + openapi.test.ts (3 tests; red-then-green by removing the GET /family row). auditQuery added. /openapi.json and /audit routes. assistant-token.mjs (node:crypto only, no file writes). README section. 416 tests, all legs green; build lists 10 assistant routes; recordcheck 0 hard / 10 REVIEW (untriaged by builder). E2E with throwaway token: spec 200/401; audit lists the run's writes; onList proven non-vacuous with a linked test grocery row. Counts 467/0/0 before and after; dev server stopped. Fury scanned the staged diff for token-shaped strings (none) and confirmed `.env` carries no ASSISTANT hash.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Captain | BLOCKED (at `7a6abe4`) | 2 | 12 |
| 1 | Vision | BLOCKED (at `7a6abe4`) | 1 | 10 |
| 2 | Vision | dispatched | — | — |
| 2 | Captain | dispatched | — | — |

### Captain pass 1 (at `7a6abe4`) — BLOCKED

- **B1** import cycle `openapi.ts` ↔ `openapiInventoryPaths.ts` (type-only, but STRUCTURE says no cycles, and missions 22–24 would copy the back-edge per domain). Fix: `Operation` type → new leaf `openapiTypes.ts`.
- **B2** "expiring" logic copied instead of shared: (a) urgency buckets in `inventory/expiring/route.ts` duplicate the Expiring page's private `urgencyFor`; (b) the window test is inlined twice in routes; (c) `isExpiringWithin`'s comment claims the API uses it — it can't (process-local). Fix: export `urgencyFor`/`Urgency` and a pure `expiresWithin(daysLeft, withinDays)` from `expiring.ts`, used by the page, `isExpiringWithin`, and both routes; truthful comment; tests.
- NOTES (summarised; full text in the session): the "exactly one guarded caller" wording vs domain write modules (Amendment A); public-prefix amendment should be a named instance whose condition is **tested** — a v1 route not built with `assistantRoute` would be fully public (Amendment B + an `openapi.test.ts` assertion); the route-vs-lib line (Amendment C); hoist route boilerplate (`calendarDateString` schema, `requireHouseholdToday`, `notFound()`); registry duplicates action labels/schemas — at least test the labels; review-queue load is the third copy of its query (next touch); `today.ts` re-declares `MS_PER_DAY`/day-diff → `calendarDaysBetween` in `householdDate.ts`; name householdDate's home (Amendment D); `schemas.ts` split planned for mission 22; AGENTS.md:49 still says "two-directory"; glob rule wording "in or before" (Amendment E); `params` option to drop `type { z }` imports; rename `lib/assistant/route.ts` → `assistantRoute.ts`, `openapiInventoryPaths.ts` naming; an `ApiErrorCode` union; `deletePantryItem` moves in mission 22.

### Vision pass 1 (at `7a6abe4`) — BLOCKED

- **BLOCKER** `adjustPantryQuantity` is read-then-write: 10 parallel `+1` adjusts on a row at 6 → all 200, final **8**, ten audit rows recording increments that didn't happen. READ COMMITTED means bulk-adjust's `$transaction` doesn't save it. Fix: compare-and-set via `updateMany({ where: { id, quantity: before } })` with bounded retry → 409 `conflict`.
- NOTES: rate limit holds only for sequential callers (200 parallel → 199 OK vs limit 120) and its comment is false; the `audit_failed` message's "check /audit before retrying" is wrong (that request is the one /audit won't show); 30-day prune vs `didAssistantCreate` must be resolved before mission 22's first delete; `isExpiringWithin` comment false (= Captain B2c); `shelfLife.ts` estimates skew by process TZ for restocks in the hour after Denver midnight (outside boundary, app has it too); the in-app `logLeftover` stores server-local midnight (UTC on Vercel) while the API reads Denver midnight → a production in-app leftover shows one day earlier via the API (fix by making the action pass a household-midnight instant); create doesn't round quantity to 2dp; `lowThreshold` unbounded; actions now spread args into helpers so a crafted authenticated call could pass extra keys (UI unaffected) — pass explicit field lists; unknown v1 paths reveal 404 vs 401; nothing tests every v1 route uses `assistantRoute` (= Captain Amendment B); `zoneMidnightInstant`'s fixed-point step is unexercised (correct for US zones).
- Disclosure: one pantry item's name (food, not a person) reached Vision's own tool output; not in the report.

### F1 — Concurrency-safe adjust; a rate limit that holds under bursts; truthful audit-failure advice; pantryWrites tightening

- **Status:** DONE (2026-10-09) — committed `64d77a9`
- **Objective:** close Vision's BLOCKER and the three correctness NOTES that live in the same files.
- **Boundaries:** may touch `src/lib/pantryWrites.ts`, `src/app/actions/pantry.ts`, `src/lib/assistant/route.ts`, `src/lib/assistant/rateLimit.ts`, `src/lib/assistant/rateLimitPolicy.ts` + `rateLimitPolicy.test.ts`, `src/lib/assistant/audit.ts`, `src/app/api/assistant/v1/inventory/[id]/adjust/route.ts`, `src/app/api/assistant/v1/inventory/bulk-adjust/route.ts`. Must not touch anything in F2's list (they run in parallel).
- **Work:**
  1. `adjustPantryQuantity(id, delta, client = db)`: compare-and-set — read `before`; `after = max(0, round2(before + delta))`; `client.pantryItem.updateMany({ where: { id, quantity: before }, data: { quantity: after, ...restockedIfRose(before, after) } })`; on `count === 0` re-read (null → return null = missing) and retry, at most 5 attempts; after that return a distinct `"conflict"` result (or throw a typed error) the routes map to 409 `conflict` "That item changed while we were updating it; try again." Return `{ before, after, row }` with `row` from a `findUnique` after the write. `setPantryQuantity` keeps its absolute-set semantics for the stepper (it no longer has to back adjust — decouple them).
  2. Bulk-adjust: apply each adjustment via the CAS helper inside the transaction; any conflict rolls the whole batch back and returns 409. Single adjust: conflict → 409.
  3. Rate limit that holds under bursts: in `route.ts`, after the bearer check, **insert the request's audit row first** (status 0 = in flight) and then count rows in the window *including it*; over `LIMIT` → delete that placeholder row and return 429 (refused calls still leave no trace). At the end, **update** that row with status/durationMs/error and create its changes (one nested write). Near the boundary concurrent requests may over-refuse — that is the safe direction; say so in the comment. Rewrite the `rateLimitPolicy.ts` comment truthfully. Update `audit.ts` accordingly (`startRequest` / `finishRequest`, `listAudit` excludes or labels status-0 rows — choose and document; a row stuck at 0 means the process died mid-request).
  4. `audit_failed` message → "The request was handled but couldn't be logged. Check the item's current state before retrying." (The row exists from step 3 but may lack its changes — say so in the code comment.)
  5. `createPantryItem` rounds quantity (and lowThreshold) to 2dp like every other write path. Note: this changes the app's add path for sub-0.005 inputs only — acceptable, the stepper never produces them; say so in the report.
  6. Actions pass explicit field lists to the helpers (no spreading caller-supplied objects), restoring exact pre-extraction behaviour for crafted calls.
- **Verification:** gauntlet (all three legs); dev-DB script: **10 parallel +1 adjusts give exactly +10** (and 10 truthful audit `before/after` chains are not required — only that every 200 corresponds to an applied increment); a bulk-adjust racing a single adjust on the same id ends at the sum; dev server with a throwaway token: **200 parallel authenticated GETs → at most 120 succeed**, the rest 429, and AssistantRequest grows by exactly the number of 2xx/4xx-recorded responses (no orphan status-0 rows after completion); the app's stepper/edit paths unchanged (re-run C4's parity script facts for set/edit/merge/create). Cleanup by id; counts before/after; token never in the report; responses with names never printed.
- **Evidence required:** the parallel results (final quantities, counts of 200/409/429), counts before/after, gauntlet output.
- **Done criteria:** Fury re-runs the 10-parallel check and the 200-burst check.
- **Report:** DONE. CAS adjust with retry budget **10 + 0–25ms jitter** (deviation from "at most 5": at 5, ten simultaneous callers gave 5 ok / 5 conflict with no lost updates; at 10 all succeed — accepted, the contract's goal was +10). DB: 10 parallel +1 from 6 → 16, five reruns exact; bulk vs 5 singles → exact. HTTP: 10 parallel adjusts → all 200, exact; singles + bulk racing → exact; /audit shows one row per applied adjust. Rate limit: 200-burst → 45 ok / 155 × 429 (over-refuses, the safe direction); 125 sequential → exactly 120 ok. `startRequest`/`finishRequest`/`discardRequest`; `/audit` hides status-0 rows < 5 min old, shows older ones (process died mid-request). Counts 467/0/0 before and after; `.env` restored; dev server stopped. Adjust/bulk routes adopt F2's `notFound`/`requireHouseholdToday` at next touch.

### F2 — Captain's blockers, the tested gate condition, and route boilerplate hoisted

- **Status:** DONE (2026-10-09) — committed `1f5632c`
- **Objective:** close Captain B1 and B2, make "every v1 route is built with `assistantRoute`" a failing test, and hoist the boilerplate missions 22–24 would otherwise copy ~20 times.
- **Boundaries:** may touch `src/lib/assistant/openapi.ts`, `src/lib/assistant/openapiTypes.ts` (new), `src/lib/assistant/openapiInventoryPaths.ts`, `src/lib/assistant/openapi.test.ts`, `src/lib/expiring.ts` + `src/lib/expiring.test.ts`, `src/app/(app)/kitchen/expiring/page.tsx`, `src/app/api/assistant/v1/inventory/route.ts`, `src/app/api/assistant/v1/inventory/expiring/route.ts`, `src/app/api/assistant/v1/inventory/[id]/route.ts`, `src/app/api/assistant/v1/leftovers/route.ts`, `src/lib/assistant/today.ts` + `today.test.ts`, `src/lib/householdDate.ts` + `householdDate.test.ts`, `src/lib/assistant/errors.ts` + `errors.test.ts`, `src/lib/assistant/schemas.ts` + `schemas.test.ts`, `src/lib/assistant/serialize.ts` + `serialize.test.ts`, `src/app/api/assistant/v1/family/route.ts`, `AGENTS.md` (line 49's "two-directory" only). Must not touch F1's files (`pantryWrites.ts`, `actions/pantry.ts`, `lib/assistant/route.ts`, `rateLimit*.ts`, `audit.ts`, the adjust and bulk-adjust routes).
- **Work:**
  1. B1: move `Operation` to leaf `openapiTypes.ts` (imports only `type ZodType`); both files import it from there. Prove zero cycles across `src/` with a small script (report the script and its output).
  2. B2: export `type Urgency` and `urgencyFor(daysLeft)` and a pure `expiresWithin(daysLeft, withinDays)` (inclusive; overdue counts) from `expiring.ts`; the Expiring page imports `urgencyFor` (delete its private copy — behaviour identical); `isExpiringWithin` calls `expiresWithin`; both routes call `expiresWithin` on `item.expiry.daysLeft` and the expiring route calls `urgencyFor`. Rewrite `isExpiringWithin`'s comment truthfully (process-local form for the dashboard/kitchen tile; the API computes `daysLeft` zone-aware and shares `expiresWithin`). Tests: `urgencyFor` boundaries 1/2 and 6/7 and negatives; `expiresWithin` equal-to-window and negative.
  3. The tested gate condition: `openapi.test.ts` asserts every exported HTTP method in every `src/app/api/assistant/v1/**/route.ts` is written `export const <METHOD> = assistantRoute` — shown red by temporarily writing one route's export without the wrapper, then green. Also assert each route's `action: "…"` label equals its registry row's label.
  4. Boilerplate: `householdDate.ts` gains `calendarDaysBetween(a, b)` and `today.ts` uses it (delete its private `MS_PER_DAY`/day-diff); `today.ts` gains `requireHouseholdToday(now, date?)` that throws the 400 `ApiError` itself; `schemas.ts` gains a `calendarDateString` schema refining via `parseDateParam` (impossible dates become a zod 400) used for `date`/`expiresOn` fields; `errors.ts` exports `notFound()` and an `ApiErrorCode` union type; `serialize.ts` gains `FAMILY_MEMBER_SELECT` beside `toFamilyMember`, used by the family route; `schemas.ts` caps `lowThreshold` (≤ 10000). Apply these in the four routes in this boundary only (adjust/bulk-adjust are F1's; they adopt at the next touch — record it).
  5. AGENTS.md:49 "two-directory" → "three-directory".
- **Verification:** gauntlet (all three legs); the cycle script; red-then-green for the wrapper assertion. **No dev server and no `.env` edits** — F1 runs in parallel and owns live testing (two builders sharing one `.env` hash and one global rate limit would corrupt each other's evidence); Vision re-runs the live checks at the re-gate. Instead: a scratchpad script (server-only stub) that fetches the real pantry rows and computes per-urgency counts with the OLD inline logic and with `urgencyFor`/`expiresWithin` — counts must be identical; and unit tests for `calendarDateString` (impossible date → zod error), `requireHouseholdToday`, `notFound`.
- **Evidence required:** cycle script output; red-then-green; old-vs-new per-urgency counts on the real rows (counts only); gauntlet.
- **Done criteria:** Fury re-runs the cycle script and the openapi test.
- **Report:** DONE. Cycle scan: 264 files, 1 cycle — inside generated Prisma code only (positive control: re-pointing the import back gives 2). Wrapper assertion red-then-green (also rejects `export function` / `export {}` forms) plus action-label-vs-registry test. Real rows: old vs new urgency/window counts identical (0 mismatches over 467). 427 tests all legs. Leftovers it couldn't reach — `ExpiringRow`/`ExpiringList`'s duplicate `Urgency` and CLAUDE.md's "two-directory" — Fury fixed in `0e98798` (type-only, no render change).

## Handoff log

- 2026-10-09 — Plan approved by Bryce; mission file written; branch renamed `claude/assistant-api-m21`; worktree `.env` copied from the main checkout (dev host verified) and `prisma generate` run. Baseline 350 tests at `167641f`. Dispatching C1 and C3 in parallel (disjoint boundaries).
- 2026-10-09 — C1, C3, C4 dispatched in parallel (disjoint boundaries; C4's verification rewritten to a script-level parity check because agents must not use a family member's password or mint a session). C2 waits on C1's schema; C5/C6 details get written from C2–C4 reports.
- 2026-10-09 — C1/C3/C4 DONE and committed (`97d2ced`, `edbe1f4`, `f7dbfa9`); Fury re-ran tsc, eslint ., npm test (364/0). C2 dispatched.
- 2026-10-09 — C2 committed `09c2fcf`, C5a committed `75ddab1`. Untracked `.agents/skills/avengers/` and `.codex/agents/*.toml` appeared in the worktree from outside this mission (a Codex mirror of the team) — left untouched, not committed, flagged to Bryce. C5b dispatched.
- 2026-10-09 — C6 committed `e8144a3`. All seven contracts DONE. Gates dispatched: Vision (correctness, incl. browser-free parity audit of pantry.ts and an independent attack subset) and Captain (structure) in parallel — Captain is read-only and touches no data, so the serial-gates rule for credentialed test data doesn't apply.
- 2026-10-09 — Gate pass 1: Captain BLOCKED (2), Vision BLOCKED (1 — lost updates under parallel adjusts, reproduced). Fix contracts F1 (concurrency, burst-safe rate limit, audit advice, pantryWrites tightening) and F2 (Captain B1/B2, the tested `assistantRoute` condition, boilerplate) dispatched in parallel on disjoint files; F1 owns all live dev-server testing. Constitution amendments A–E (Captain) go to Bryce for approval — not applied yet.
- 2026-10-09 — F2 `1f5632c`, Urgency/CLAUDE.md follow-up `0e98798`, F1 `64d77a9`. Gate pass 2 dispatched (Vision + Captain) at the HEAD of the commit recording this line.
