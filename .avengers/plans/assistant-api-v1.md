# Assistant API — a private, token-gated JSON API for the "Home Hub" bot

## Context

Bryce runs a Grok-based assistant ("Home Hub", he's naming it) on a separate
server. Today it drives Marshee by logging in with his account and clicking
around — fragile, slow, and it acts *as Bryce*. The bot was let loose on the
app and wrote a wish-list (`~/Desktop/claude-code-home-hub-api.md`). Bryce's
instruction: don't take the bot's spec verbatim — build what's right for this
codebase, structured properly.

Three Explore briefs mapped the codebase against the spec. The facts that
shaped this plan:

- **There is no reusable write layer.** Every write lives inline inside a
  `"use server"` action with `getVerifiedSession()`, FormData parsing and
  `revalidatePath` mixed in. A Route Handler with no session cannot call them,
  and `lib → actions` is a STRUCTURE BLOCKER. The real work of this project is
  **extracting the write logic into `server-only` lib modules** and making the
  existing actions thin wrappers — one definition, two guarded callers
  (the action for browsers, the Route Handler for the bot). `voice/apply.ts` +
  `/api/voice` is the precedent and STRUCTURE.md already sanctions it.
- **The spec's "shortfall math with unit conversion" is impossible to do
  honestly.** Pantry units are free-text package counts ("2 bags", "1 tub",
  "jars"). You cannot subtract 2 cups from a bag. Bryce's ruling: *presence
  only* — if it's in the inventory, we have it. No quantity parsing, no
  conversion, no auto-deduct.
- **Attribution isn't rendered anywhere today** (`addedById`/`createdById` are
  written by actions and read by nothing), and a device-role User for the bot
  would appear as a pickable person in four calendar/task rosters.
- No validator library exists; validation is hand-rolled. `HOUSEHOLD_TIME_ZONE`
  exists with zero consumers. The `MAX_FETCH_SPAN_DAYS` cap and
  `validatedPeople` each exist twice, and STRUCTURE.md says a third copy of
  either is a BLOCKER — the API would be that third copy, so both get hoisted.

## Decisions (settled with Bryce 2026-10-09 — don't re-litigate)

1. **Presence-based recipe ↔ inventory.** `/recipes/{id}/shortfall` reports
   have / missing / already-on-list by name, reusing the existing
   `classifyRecipeIngredients` matcher. Ingredient lines are returned as text.
   `POST /recipes/{id}/cooked` only stamps `lastCookedAt`; the bot uses
   `/inventory/{id}/adjust` for countable things it knows were used.
2. **"Today" defaults to Denver** via `HOUSEHOLD_TIME_ZONE` (its first
   consumer — the app's "device decides" rule is for browsers; the bot's
   "device" is a server with no clock of ours). Every date-dependent endpoint
   accepts `?date=YYYY-MM-DD` to override.
3. **Audit log, no bot account** (my recommendation; Bryce asked for the
   stance — it's below). Every lib write helper takes `actorUserId: string |
   null`; the API passes `null` today. Giving the bot a real account later is
   one env var, zero rework.
4. **Deletes: the bot may hard-delete only what it created** (checked against
   the audit log), plus clearing a meal-plan slot (the app's own Clear).
   Inventory is never deleted — quantity → 0. No soft-delete columns.

**Why no account (the stance).** An account would buy "added by Home Hub" in
the UI — but nothing renders that field today, so it buys nothing visible. It
would *cost*: a `device`-role User that shows up as an assignable person in
the four calendar/task rosters (you could assign Home Hub a chore) unless four
more files change; a committed script that writes `User` rows, the one thing
the danger register fences hardest; and `ASSIGNABLE_ROLES` deliberately
excludes `device` because device mode (accounts P4) hasn't been designed. The
audit log answers "what did the bot do, when" better than an attribution
column anyway, and the bot's *name* goes on the audit table and the OpenAPI
title. When P4 builds device accounts properly, set `ASSISTANT_ACTOR_USER_ID`
and every write starts carrying it.

### Design choices that are mine (flag if you disagree)

- **Token stored as a SHA-256 hash in env (`ASSISTANT_API_TOKEN_HASH`), not
  the raw token like `VOICE_API_TOKEN`.** This project already lost a voice
  token fragment to a screenshot of an env-var screen. A hash in Vercel can't
  be replayed. `npm run assistant:token` prints the token once + its hash;
  **only Bryce runs it, in his own terminal**. Unset → the whole API is off
  (every request 404).
- **Add `zod` (one dependency, zero transitive deps).** ~25 endpoints
  validating JSON by hand is where 4xx errors rot. Zod 4's `z.toJSONSchema()`
  also generates the OpenAPI spec from the *same* schemas — validation and
  documentation become one source of truth, which is the house rule.
- **Rate limit and audit share one table.** `AssistantRequest` logs every
  request (method, path, status, ms); the limiter is a COUNT over the last 60s
  (120/min). DB-backed because in-memory counters don't survive serverless —
  the same reason `LoginAttempt` is a table. Refused (429) requests are not
  recorded, so a runaway loop can't lock itself out forever (login limiter's
  own reasoning). `AssistantChange` is one row per affected record, so "did
  the bot create X" is an indexed lookup.
- **Thin route files, all logic in `src/lib/assistant/` + domain lib
  modules.** One wrapper `assistantRoute()` does auth → rate limit → body cap →
  handler → audit → error shaping. A route file is ~30 lines: parse, call,
  shape.
- **Meal-plan slots are keyed by `(day, slot)`, not a slot id**, and there is
  no "replace the whole week" — the bot sets slots one at a time through the
  same upsert the app uses. Safer, and matches the unique constraint.
- **Put-away is the real put-away**, not "check-off with restock": the bot
  gets the same classify → review → commit flow the app's own button has,
  so a bought item it doesn't recognise never silently lands in the wrong
  place.

## The API surface (v1)

Base: `/api/assistant/v1`. Auth: `Authorization: Bearer <token>`. Lists come
back as `{ items: [...] }`, single records as the object, errors as
`{ error: { code, message, details? } }` with codes `unauthorised` (401, body
has no detail), `rate_limited` (429), `validation` (400), `not_found` (404),
`conflict` (409), `forbidden` (403 — e.g. deleting something the bot didn't
create). Instants are ISO strings; calendar dates are `YYYY-MM-DD`.

| Method | Path | Does | Reuses |
|---|---|---|---|
| GET | `/summary` | today's meals, inventory counts (stocked/low/out/expiring), to-buy by store, recipe count, today's & tomorrow's events (+tasks once PR 4 lands) | `dashboard.ts` pure fns, `getCalendarEventsInRange` |
| GET | `/inventory?location&category&status=low\|out\|expiring\|ok&q&withinDays` | list; `q` ranks via `searchItems` | `isLow`, `effectiveExpiry`, `searchItems` |
| POST | `/inventory` | create; **409 + `matches`** when a likely duplicate exists, unless `allowDuplicate: true` | `findDuplicateMatches` (the add-time matcher) |
| GET/PATCH | `/inventory/{id}` | read / edit any field incl. absolute `quantity`, `expiresOn` | `editPantryItem` (restockedAt rule) |
| POST | `/inventory/{id}/adjust` `{delta, reason?}` | relative change, floor 0, restockedAt on increase | extracted `adjustPantryQuantity` |
| POST | `/inventory/bulk-adjust` `{adjustments:[{id,delta,reason?}]}` | same, one transaction, all-or-nothing | same |
| GET | `/inventory/expiring?withinDays=7` | urgency-sorted, `isEstimate` flag | `effectiveExpiry` |
| GET | `/inventory/review` | the Inventory page's review queue (parked in Other, likely duplicates) | `buildReviewQueue` |
| POST | `/leftovers` `{name, portions, daysGood=3}` | the Log leftovers flow | extracted `logLeftover` |
| GET | `/shopping?store&checked` | list | — |
| POST | `/shopping` (object or array) | add; merges into an unchecked row with the same name-key + store | extracted `addGroceryItem` |
| PATCH | `/shopping/{id}` | quantity/unit/store/category/note/checked/location | extracted `editGroceryItem` |
| DELETE | `/shopping/{id}` | only if audit says the bot created it | `didAssistantCreate` |
| POST | `/shopping/check-off` `{ids, checked=true}` | tick / untick | extracted `setGroceryChecked` |
| POST | `/shopping/put-away` `{decisions?}` | classify; commit if everything is known; otherwise return `needsReview` with merge suggestions and commit nothing — bot resends with decisions | extracted `classifyForPutAway` / `commitPutAway` |
| POST | `/shopping/from-low-inventory` `{store?}` | the "Add N low items" button | extracted `addLowItemsToList` |
| GET | `/recipes?q&tag&cookbook&maxMinutes&ingredient` | list; `q` via `searchRecipes`; `maxMinutes` via `parseTimeToMinutes` | `recipeFilters.ts`, `recipeTimeFilter.ts` |
| GET | `/recipes/{id}` | full recipe: ingredient lines, steps, tags, cookbooks, rating, nutrition (`isEstimate: true`), lastCookedAt | — |
| POST | `/recipes` | create; optional `cookbookId`, `tagIds` | extracted `createRecipe` |
| PATCH | `/recipes/{id}` | title/ingredients/steps/notes/servings/times/tagIds | extracted `updateRecipe` |
| POST | `/recipes/{id}/cooked` | stamps `lastCookedAt` only | `markRecipeCooked` |
| GET | `/recipes/{id}/shortfall` | `{have, missing, onList}` by presence | extracted `classifyRecipeIngredients` |
| GET | `/cookbooks`, `/tags` | so the bot can pick ids | — |
| GET | `/meal-plan?weekOf=YYYY-MM-DD` | the week (any day → its Sunday) | `sundayOf` + Denver-midnight instant |
| PUT | `/meal-plan/{weekOf}/slots/{day}/{slot}` `{title, recipeId?}` | upsert, creates the plan if missing | extracted `getOrCreateMealPlan`, `setMealPlanEntry` |
| DELETE | `/meal-plan/{weekOf}/slots/{day}/{slot}` | clear (always allowed) | extracted `clearMealPlanEntry` |
| GET | `/meal-plan/{weekOf}/grocery-needs` | union of `missing` across the week's recipe-linked slots | shortfall × N |
| GET | `/calendar?from&to&member` | events in range (span-capped) | `getCalendarEventsInRange`, `fetchWindow.ts` |
| POST / PATCH / DELETE | `/calendar`, `/calendar/{id}` | create/edit; delete only own-created | extracted `calendarWrites.ts` |
| GET / POST | `/tasks?from&to`, `/tasks` | tasks in range; create | hoisted `taskQuery.ts`, extracted `taskWrites.ts` |
| PATCH / DELETE | `/tasks/{id}` | edit, `{completed: true/false}`; delete only own-created | same |
| GET | `/family` | id, displayName, role, isKid, isActive — nothing else | `personInfo.ts` select narrowed further |
| GET | `/audit?since&writesOnly` | requests + their changes | the audit tables |
| GET | `/openapi.json` | generated from the zod schemas | `openapi.ts` |

Deliberately **not** built: whole-week meal-plan replace, auto-deduct on
cooked, quantity/unit parsing, ingredient→inventory stored links,
`preferredStore`, webhooks/`/changes` feed, chores/lists (not built in the app
either). All recorded as v2 candidates.

## Schema (one additive migration, PR 1)

```
model AssistantRequest { id, method, path, action String ("inventory.adjust"…), status Int, durationMs Int, ip String?, error String?, createdAt @@index([createdAt]) ; changes AssistantChange[] }
model AssistantChange  { id, requestId → AssistantRequest (Cascade), model String, recordId String, action String ("create"|"update"|"delete"), summary String (JSON text, not Json type — no provider-specific columns), createdAt @@index([model, recordId]) @@index([requestId]) }
```
Prune `AssistantRequest` older than 30 days opportunistically on each write
(the `LoginAttempt` pattern — no cron).

## Next.js 16 conventions — verified against `node_modules/next/dist/docs` (AGENTS.md rule)

- **`params` is a Promise** (`route.md:80-103`): `{ params }: { params: Promise<{ id: string }> }`, `const { id } = await params`. **Type it inline — never the global `RouteContext<'/…'>` helper**: that type is generated into `.next/types` by `next build`, and CI runs `tsc` *before* build on a checkout with no `.next/`. Project precedent is inline (`calendar/[id]/edit/page.tsx:29-38`).
- **A `route.ts` may export only the HTTP methods and Next's segment config** — any other value export fails `next build` (`next-types-plugin`). So schemas, helpers and serializers live in lib, never in route files; `export const GET = assistantRoute(…)` is fine as long as the wrapper's return type is an explicit `(request: NextRequest, ctx: { params: Promise<P> }) => Promise<Response>`.
- **A folder named `openapi.json` is legal** (`route.md:599-623`, the `rss.xml` example). It stays behind the bearer, per the spec.
- **GET handlers are dynamic by default in Next 15+** (`route.md:669`) — no `force-dynamic` export; one header comment so nobody adds it by reflex. `connection()` not needed.
- **Audit row is awaited before the response**, never in `after()`: `after()` can't surface failure to the caller and the docs frame it as telemetry; `VoiceChange` and `recordLoginAttempt` are both synchronous precedents. `after()` is used only for the opportunistic prune.
- **No `revalidatePath` from these routes**: every `(app)` page is `force-dynamic` and the layout reads request-time cookies, so nothing is server-cached; a Route Handler cannot purge a phone's client router cache anyway (`revalidatePath.md:19-20`); and STRUCTURE.md forbids route strings in lib. Header comment states both facts.
- **Body cap in a pure `body.ts`**: `content-length` > 64 KB → 413 without reading; `request.text()` then `Buffer.byteLength` (not `.length`); `JSON.parse` → 400; require `content-type: application/json` on POST/PATCH/PUT → 415; never read a body on GET/DELETE. Note `proxyClientMaxBodySize` (10 MB default) **silently truncates** larger bodies because `proxy.ts` matches `/api/*` — the cap makes that unreachable.
- Mirror `/api/voice`: `Response.json` (never `NextResponse.json`), `import type { NextRequest }`, terse 401 `{ error: "unauthorised" }` (British spelling kept), `console.error("[assistant] …")`, Node runtime (never `edge`), module-level instances for anything warm-cached.
- Every response carries `x-assistant-request-id` (the audit row's id) so a bot log line can be matched to `/audit`.

## Files

**New — `src/lib/assistant/`** (a domain subdir like `src/lib/voice/`; each
file < 350 lines; `*.test.ts` glob entry added to `package.json` **and both TZ
steps in `.github/workflows/ci.yml` in the same commit**):

- `authPolicy.ts` — pure: `parseBearer(header)`, `hashToken(token)`,
  `isTokenValid(provided, expectedHash)` (timingSafeEqual on digests, the
  voice route's own trick). Tested.
- `errors.ts` — pure: `ApiError`, `jsonError()`, the error-code vocabulary.
- `body.ts` — pure: `readJsonBody(request, maxBytes)` with the cap/415/400
  outcomes above; testable with Node's global `Request`.
- `rateLimit.ts` — `server-only`: `isRateLimited(now)` = COUNT on
  `AssistantRequest` in the window; constants `WINDOW_MS`, `LIMIT` and the
  `retryAfterSeconds` arithmetic in a pure `rateLimitPolicy.ts` (the
  `loginRateLimit` split).
- `audit.ts` — `server-only`: `recordRequest`, `recordChanges`,
  `didAssistantCreate(model, id)`, `listAudit(since)`, prune (via `after()`).
- `route.ts` — `server-only`: `assistantRoute<P>({ action, body?, query?,
  handler })` → `(request, { params }) => Promise<Response>`. Order: hash env
  present (else 404) → bearer (else 401 terse) → rate limit (429) → `body.ts`
  → zod (400 with field details) → `await params` → handler → audit write
  **awaited** (a failed audit write is a 500 `audit_failed`, never a silent
  gap) → JSON + `x-assistant-request-id`. `isMissingRowError` (P2025) → 404.
- `householdDate.ts` — **pure, in `src/lib/` (not the subdir), tested across
  the 2026 DST dates**: `calendarDateInZone(instant, tz)`,
  `zoneMidnightInstant({y,m,d}, tz)`, `parseDateParam("YYYY-MM-DD")`,
  `daysBetween(a, b)`. Needed because `MealPlan.weekStart` is stored as
  *Mountain-local* midnight (06:00Z/07:00Z) while all-day events/tasks are
  *UTC* midnight — a server-side `new Date(y, m, d)` on Vercel (UTC) would
  create a **second plan for the same week** under the `@unique` constraint.
- `schemas.ts` (+ `schemasKitchen.ts` / `schemasCalendar.ts` if the cap
  bites) — the zod schemas, shared by routes and `openapi.ts`.
- `serialize.ts` — pure row→wire mappers per domain (field by field, never
  spread — `personInfo.ts`'s rule, because `User` rows pass through here).
- `openapi.ts` (+ per-domain `openapi<Domain>Paths.ts` — one file for ~30
  operations would blow the cap) — pure: a registry `{method, path, summary,
  query, body, response}` → OpenAPI 3.1 document via `z.toJSONSchema`.
  `openapi.test.ts` walks `src/app/api/assistant/v1` with `readdirSync` and
  asserts every `route.ts` + exported method has a registry entry — the spec
  cannot silently fall behind the routes.

**New — domain write modules in `src/lib/`** (all `server-only`, no auth,
`actorUserId: string | null` where a row has an attribution column; the
existing action becomes guard + call + `revalidatePath`):

| Module | Extracted from | Carries |
|---|---|---|
| `pantryWrites.ts` | `actions/pantry.ts` | create, set/adjust quantity, edit, merge, logLeftover — the **one** home of the "restockedAt advances only when quantity rises" rule |
| `groceryWrites.ts` | `actions/groceries.ts`, `pantry.ts` | add (with optional same-name+store merge), edit (the `categoryEdited` rule), setChecked, addPantryItemToList, addLowItemsToList |
| `putAway.ts` | `actions/groceriesPutAway.ts` | `findExactMatch`, `classifyForPutAway`, `commitPutAway` + their types (the action re-exports the types for `PutAwayReviewSheet`) |
| `recipeIngredientMatch.ts` | `actions/groceriesRecipes.ts` | `classifyRecipeIngredients`, `addIngredientsToGroceries` |
| `recipeWrites.ts` | `actions/recipes.ts` | validate + create/update (no FormData, no `redirect`), markCooked |
| `mealPlanWrites.ts` | `actions/mealPlans.ts` | `getOrCreateMealPlan` (the P2002-as-success race handling), `setMealPlanEntry`, `clearMealPlanEntry` |
| `peopleValidation.ts` | `actions/calendar.ts` + `tasks.ts` | the pure `validatedPeople` decision — **STRUCTURE.md already names this hoist; the API would be the forbidden third copy** |
| `fetchWindow.ts` | `actions/calendar.ts` + `tasks.ts` | `MAX_FETCH_SPAN_DAYS`, `isValidDate`, `isAcceptableFetchWindow` — same situation |
| `taskQuery.ts` | `(app)/calendar/page.tsx` + `actions/tasks.ts` | TASK_SELECT + mapper (the `calendarEventQuery.ts` shape) |
| `calendarWrites.ts`, `taskWrites.ts` | `actions/calendar.ts`, `actions/tasks.ts` | create/update/delete/complete |

`src/lib/expiring.ts` gains pure `isExpiringWithin(item, days, today)` so the
three inlined copies (home, kitchen, expiring page) and the API read one
definition — a one-line migration each, same contract.

**New — routes:** one `route.ts` per path under `src/app/api/assistant/v1/`,
each `export const GET = assistantRoute(async (ctx) => …)`.

**New — scripts/docs:** `prisma/assistant-token.mjs` (plain Node, no DB, no
imports beyond `node:crypto`; prints token + hash once) wired as
`npm run assistant:token`; `.env.example` entry; README "Assistant API"
section (generate token → set `ASSISTANT_API_TOKEN_HASH` in Vercel, Production
only → turn off by unsetting); CLAUDE.md session entry.

**Modified:** `src/proxy.ts` — add `"/api/assistant/v1/"` to
`PUBLIC_ROUTE_PREFIXES` (narrow, trailing slash; `/api/assistantX` must still
307 — the R4 drill). `STRUCTURE.md` — the prefix clause currently allows
prefixes *only when a token rides in the path*; amend to also permit a
versioned API subtree whose every handler shares one gate (Captain drafts the
wording, Bryce approves). Thinned action files. `package.json` (zod, scripts,
test glob), `ci.yml` (glob ×2, plus a dummy `ASSISTANT_API_TOKEN_HASH` to
mirror the existing env block — nothing reads it at build time). **The
three-directory test command is also quoted in `AGENTS.md` and CLAUDE.md** —
update both in the same commit or the record check prints REVIEW lines.

## Execution — four Avengers missions, four PRs, in this order

Each: branch → PR → Gauntlet green → merge → **read the production deploy
log** (the migration hook runs on PR 1's merge). Every mission assembles
**Stark + Vision + Captain** (new modules, refactors of live write paths);
Strange only if a UI string changes (none planned). Every contract that thins
an action requires Vision to **drive the app's own flow in the browser** for
that action (put away, add low items, edit sheet, log leftover…) — the
extraction must be behaviour-identical, and `tsc` cannot prove that.

1. **Mission 21 — foundation + inventory + leftovers + family + audit.**
   zod, migration, `src/lib/assistant/*`, `householdDate.ts`,
   `pantryWrites.ts` extraction, `isExpiringWithin`, the inventory/leftovers/
   family/audit/openapi routes, proxy + STRUCTURE amendment, token script,
   README/.env.example. Contracts: C1 schema+deps+glob; C2 wrapper+auth+
   rate+audit (+tests); C3 householdDate (+DST tests); C4 pantryWrites
   extraction + thin actions; C5 inventory/leftover/family routes +
   serializers + schemas; C6 openapi + audit route + docs + script.
2. **Mission 22 — shopping + summary.** `groceryWrites.ts`, `putAway.ts`,
   the shopping routes, `/summary` (events via `getCalendarEventsInRange`;
   tasks join in mission 24).
3. **Mission 23 — recipes + meal plan.** `recipeWrites.ts`,
   `recipeIngredientMatch.ts`, `mealPlanWrites.ts`, cookbooks/tags reads,
   shortfall, grocery-needs.
4. **Mission 24 — calendar + tasks** — *last*, because the unmerged CD1 branch
   (`claude/calendar-cd1`) edits `actions/calendar.ts`; this mission hoists
   `peopleValidation.ts`, `fetchWindow.ts`, `taskQuery.ts` and should land
   after CD1 or rebase onto it.

Contract-sizing rule from the calendar arc applies: one dispatch must survive
a rate limit — no contract over ~6 files of real change.

## Verification

- **Gauntlet** per PR: `npx tsc --noEmit`, `npx eslint .`, `npm test` (+ the
  UTC and LA legs), `npm run build`, `recordcheck.mjs`.
- **Unit tests** (new, in `src/lib/assistant/*.test.ts` and `src/lib/`):
  bearer parse/compare incl. wrong length and empty; error shaping; rate-limit
  arithmetic; `householdDate` across Mar 8 / Nov 1 2026 and both the
  Mountain-midnight and UTC-midnight conventions (proven red-then-green by
  running under `TZ=UTC`); serializers never emit `passwordHash`/`voiceTokenHash`;
  bulk-adjust validation; openapi document validates against every schema.
- **Positive control first, then the attacks** (Phase 1e / R4 discipline),
  against the local dev server with a throwaway dev hash in `.env`:
  valid token → 200 with real dev-branch data; no header / wrong token /
  token of wrong length / hash itself as token → 401 with no detail; hash
  env unset → 404 everywhere; 121st request in a minute → 429 and *not*
  logged; oversized body → 413; proxy drill: `/api/assistantX/…` and
  `/api/assistant/v2/…` still 307 to login with no cookie.
- **Behaviour parity for each thinned action**: Vision runs the app's own
  flow in the browser on the dev branch (seeded with the scoped
  `db:seed-*` scripts, cleaned by fingerprint) and confirms the database
  effect is byte-identical to before (quantity, `restockedAt`,
  `categoryEdited`, `addedById`).
- **Audit**: after each write in the positive run, `GET /audit` lists it with
  the right `model`/`recordId`/`action`; `DELETE` of a row the bot didn't
  create → 403 and the row survives.
- **The meal-plan uniqueness trap**: `PUT /meal-plan/2026-11-01/slots/2/Dinner`
  from the API, then open that week in the browser — one plan, not two, and
  the entry visible. Repeat across the DST week.
- **Production**: after mission 21 merges, Bryce runs `npm run
  assistant:token` in his own terminal, sets the hash in Vercel
  (Production only — leave Preview unset so previews are "off", or give it a
  separate dev hash), pastes the token into Home Hub's secure input. First
  bot call: `GET /openapi.json` (the positive control), then `GET /summary`.
  No agent ever sees the token.

## For Bryce — approvals this plan needs (plain English)

1. **Add `zod`** as a dependency (validation + the OpenAPI spec from one set
   of rules). Small, standard, no sub-dependencies. The alternative — a
   hand-rolled `validate.ts` plus hand-written JSON Schema for the spec — is
   two definitions of every field, which is the drift the house
   one-source-of-truth rule exists to prevent; that's why I recommend zod
   despite the project's zero-new-deps habit.
2. **Token as a hash in Vercel**, generated by you with
   `npm run assistant:token`; the raw token is shown once and never stored
   anywhere on our side.
3. **No bot account for now** (stance above) — revisit when device accounts
   (accounts P4) are designed.
4. **One STRUCTURE.md amendment** to the public-prefix rule, so
   `/api/assistant/v1/` can be a narrow prefix without a token in the path.
5. **Mission order** 21 → 22 → 23 → 24, calendar last because of the open
   CD1 branch.
