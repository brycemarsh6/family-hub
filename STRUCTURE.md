# STRUCTURE.md — Marshee

Captain's constitution for this repo. It codifies the layout and boundaries
the project already holds (full reasoning in CLAUDE.md); Captain gates
structural changes against it.

## Layout map

| Path | What lives here | What never lives here |
|---|---|---|
| `src/app/(app)/` | Authenticated routes — header + nav + session chrome. `/login` deliberately lives here too and suppresses its own nav bar in `HubNav.tsx`, rather than moving to a separate layout for one page | Pages needing a genuinely chrome-free root layout — those go in `src/app/share/` |
| `src/app/share/` | Public token-gated pages (own root layout, no chrome, `noindex`) | Anything session-dependent |
| `src/app/api/` | Route Handlers for non-browser clients (e.g. `/api/voice`) | Logic that belongs in an action or lib |
| `src/app/actions/` | Server Actions — **every exported action opens with a DAL guard, except `auth.ts`'s `login`/`logout`** — a login action can't require the session it exists to create. Two forms, chosen by who can reach the trigger, never by taste (see the guard-form rule below) | Unguarded exports outside that one named exception; pure logic (goes in lib); hiding a control instead of guarding its action |
| `src/proxy.ts` | The Next 16 proxy — redirect-to-login UX, plus the narrow public routes (`/login`, `/api/voice` — exact matches) and prefixes (`/share/recipe/`, `/share/cookbook/`) | A second `middleware.ts` file (won't run under Next 16); treating this as the real auth gate — that's the in-action `getVerifiedSession()` guard, this is only UX |
| `src/lib/` | Pure helpers, `server-only` AI/external-call wrappers (no auth checks of their own — the wrapping Server Action guards), and the auth/db infrastructure itself (`dal.ts`, `session.ts`, `db.ts`) | Anything importing from `app/` or `components/` |
| `src/components/` | Shared client components, flat directory, PascalCase | Server-only logic |
| `src/generated/` | Generated Prisma client — never hand-edited, exempt from all caps | Everything else |
| `prisma/` | Schema, **additive-only** migrations, the Vercel build hook (`migrate-on-production.mjs` — applies migrations to production at release time, and nowhere else), scoped seed/clean scripts, and `bootstrap-*` scripts — interactive, prompt-driven, idempotent (upsert-keyed) creators of *real* household data, which deliberately have **no** clean counterpart | Blanket `deleteMany` seed scripts; any clean/reset script targeting a table that holds real hand-entered household data — the `User` table above all |
| `brand/` | Master brand vectors (`marshee-mark.svg`, `marshee-wordmark.svg`, `marshee-app-icon.svg`) — the source every other brand asset is generated from. Committed so the artwork and the generated files can't silently drift; **never imported by app code** (the components in `src/components/` carry their own copy of the path data, generated from these) | Generated output — the icon PNG/ICO files live in `src/app/` as Next's file conventions require; anything the app imports at build or runtime |
| `alexa/` | Alexa skill configuration data (the interaction model), committed so the developer console and the repo can't silently drift. Hand-copied into Amazon's console; never imported by app code | Anything the app imports at build or runtime |

## Boundary rules

- **The guarded-action / pure-call split.** Every AI or external-service call
  is a pure `server-only` function in `src/lib/` with *no* auth check, wrapped
  by a Server Action in `src/app/actions/` that calls `getVerifiedSession()`
  first (`voice/parse.ts`, `mealSuggest.ts`, `recipeExtract.ts`,
  `ingredientParse.ts`, `nutritionEstimate.ts` all follow it). New calls
  follow the same split — auth lives next to the data, once, in the action.
  For non-browser clients that cannot hold a session, the guard may instead
  be a Route Handler in `src/app/api/` whose own auth check (a shared token,
  or a platform signature plus skill ID) runs before the body is parsed and
  before any lib call — `/api/voice` and `/api/alexa` are the two instances.
  The invariant is the same either way: the pure `server-only` call carries
  no auth, and exactly one guarded caller does.
- **Dependency direction:** `lib` imports from nothing above it (never `app/`
  or `components/`); `components` may import `lib` and `actions`; `actions`
  import `lib` and the db. No cycles, ever.
- **Server Actions are public POST endpoints.** Protecting pages (proxy.ts)
  is UX, not security — the `getVerifiedSession()` guard inside each action
  is the real gate. Public routes are added to proxy.ts as exact matches
  (`PUBLIC_ROUTES`) or — only when a token rides in the path — as *narrow*
  prefixes (`/share/recipe/`, not `/share`); the proxy drills proved the
  sloppy prefix opens real holes.
- **No Prisma enums or provider-specific schema features.** TypeScript via
  `constants.ts` enforces vocabularies instead. This is what made the
  SQLite→Postgres move a provider swap, not a rewrite.
- **Date math is calendar-component math, never milliseconds**, and "what day
  is it" is decided on the client (`useToday.ts`) — Vercel runs UTC, the
  household runs Mountain.
- **AI picks from our data are grounded by index, never by name-matching** —
  numbered options out, an integer back (the steaks/"tea" lesson).
- **Browser-only reads use `useSyncExternalStore`**, not
  `useState`+`useEffect` (hydration mismatch — lint enforces it).
- **Which guard form an action uses is decided by who can reach its
  trigger, never by taste.**
  **(a) Null-returning** — `getVerifiedSession()` or `getVerifiedUser()`,
  failing with the file's house shape (`{ error }`, void, or the typed
  empty value). **Required for any action a legitimately signed-in user
  can trigger from shipped UI**: those callers render failures inline, so
  a thrown `redirect()` would bounce the browser mid-request. Role checks
  in this form read `MANAGER_ROLES` (or a named role) from
  `constants.ts` — never a hand-rolled role list.
  **(b) Redirecting** — `requireRole(...)`, permitted **only** when every
  export in the file requires the same role *and* the file's only UI
  lives behind a page gated by that same `requireRole`. An authorization
  failure then means the caller doesn't belong on the page at all, and
  the redirect matches the page's own bounce. `users.ts` and
  `usersRoles.ts` behind `/settings/family` are the instances. Internal
  *domain* guards (self-targeting, the last-admin lockout) still return
  the house shape — "you don't belong here" and "you're allowed, but this
  can't happen" are different outcomes.
  Pages use the redirecting guards (`requireVerifiedUser`,
  `requireRole`), never the null-returning ones. Route Handlers for
  non-browser clients keep their own token/signature gates.
- **Hiding UI is never the gate.** A page may compute `canManage`
  server-side (`getVerifiedUser()` + `MANAGER_ROLES`) and pass a
  **boolean** into client components to omit controls that would only
  refuse — but the action's own check remains the real gate, and
  components never receive role or user objects for gating purposes.
- **A lib module may skip `server-only` only when it is pure over its
  inputs, reads no env var, and holds no secret of its own** — `match.ts`,
  `duplicates.ts`, and `password.ts` are the instances. Sensitive material
  passing *through* such a module (a password, a hash) is the caller's to
  contain; the guarded action or route that calls it is where secrecy
  lives. The `server-only` requirement in the guarded-action rule above is
  written for AI/external-call wrappers, not for pure helpers.
  `db.ts` is the one sanctioned impure exception: it must stay importable
  by the plain-Node scripts in `prisma/`, and a browser import fails
  loudly anyway (PrismaClient refuses to construct in a browser). Any
  **other** lib module that imports `db` must carry `server-only` —
  `dal.ts`, `voice/apply.ts`, and `loginRateLimit.ts` are the instances.
  When a module needs both a testable policy and a database read, split
  it: the pure half gets its own import-free file and the tests point
  there (`loginRateLimitPolicy.ts` / `loginRateLimit.ts` is the pattern).
  This is not pedantry — a test file that transitively imports `db.ts`
  puts the **live family database** one future test away from the test
  runner.
- **The DAL's cached `loadSessionUser()` is the one sanctioned sequential
  DB read before a page's `Promise.all`** — auth precedes data by design,
  and `cache()` guarantees at most one user lookup per render pass, shared
  by the layout and the page. Nothing else re-reads the `User` row in a
  request, so this is not the re-fetch anti-pattern the performance notes
  warn about.
- **Matcher strictness is per-consumer, deliberately.** `matchItem` (voice —
  lenient, spoken feedback loop), `searchItems` (search box), `findOverride`
  (shelf life — strict, no feedback loop), `duplicates.ts` (queue — strictest,
  unprompted). Reusing a matcher for a new consumer requires checking whose
  feedback loop it was tuned for, not just its name.
- **Domain subdirectories in `src/lib/` are fine when a pipeline spans
  multiple files** — `src/lib/voice/` (`parse.ts`, `apply.ts`) is the
  precedent. `src/lib/` isn't required to stay flat; it's required to stay
  pure and dependency-direction-correct regardless of depth.
- **Revalidation is per-action-file, private, and duplicated on purpose.**
  Route revalidation (`revalidatePath`) stays inside the `"use server"`
  action file whose writes dirty those routes — usually as a private
  `refresh*Views()` helper, or as inline calls when the paths vary per
  action (`tags.ts`). Either form is fine; what's fixed is where it
  lives. Several files deliberately carry identical path lists: these
  are per-file view declarations, not shared vocabulary, and the
  duplication is the convention rather than a one-source-of-truth
  violation. Two hard limits: a `"use server"` file must never export a
  non-action helper (every export there is a public POST endpoint), and
  route-path revalidation never moves into `src/lib/` (lib holding app
  route strings is a backward dependency in spirit).

## One source of truth

Adding a second definition of any of these is a BLOCKER:

- `src/lib/constants.ts` — categories, locations, meal slots, stores,
  **roles with their display labels and assignability, avatar colors**,
  their icons and order
- `src/lib/nav.ts` — `HUB_NAV_ITEMS`, the only nav list
- `src/app/globals.css` — the color tokens
- `src/lib/shelfLife.ts` — the shelf-life vocabulary
- `src/lib/password.ts` — `MIN_PASSWORD_LENGTH`, the one answer to "how
  long must my password be", shared by the actions that enforce it and
  the inputs that advertise it
- `brand/` — the logo artwork. The two `Marshee*.tsx` components and the
  `src/app/` icon files are all **generated from** these masters; a
  hand-drawn or re-traced second version of the mark or wordmark is a
  BLOCKER. (An approximation already exists in
  `~/Desktop/marshee_brand_assets/` and is explicitly not a source — its
  mark is missing the M's centre descender despite its README claiming to
  be authoritative.)
- `src/lib/personInfo.ts` — `PERSON_SELECT` / `toPersonInfo`, the single
  place a `User` row becomes something a client may see. **This is the
  security-relevant one**: it builds the public shape field by field so a
  `passwordHash` can never ride along, and a second copy is a second
  chance to get that wrong. The edge this rule guards is
  `passwordHash`: a Prisma `select` that names only display fields (`id`,
  `displayName`, `avatarColor`, `role`) and never `passwordHash` — as
  `login/page.tsx`, `dal.ts`, and the calendar page's nested people select
  do — is not a second definition. A second place that *selects*
  `passwordHash` and strips it by hand is. (Clarified 2026-09-02, mission 8.)
- Shared UI jobs — see DESIGN.md's component vocabulary

- **A vocabulary widened ahead of its consumers carries exactly one
  reachability gate.** When a union names more members than the app can serve
  — a view with no renderer, a role nobody may be assigned — the answer to
  "which of these is real today" lives in **one total
  `Record<Union, boolean>`**, and every reachability decision (URL/param
  parsing, picker and option lists, deep links, stored preferences) derives
  from that record rather than keeping its own list. **A total record, never a
  `filter` predicate:** the record makes a new member *answer* the question; a
  predicate lets it default silently. Shipping the consumer is then one entry
  flipped in the same commit.
  Instances: `BUILT_VIEWS` → `BUILT_CALENDAR_VIEWS` → `CALENDAR_VIEW_OPTIONS`
  (`src/lib/calendarViewVocabulary.ts`, mission-11/C2). And **`ROLES` →
  `ASSIGNABLE_ROLES` (`src/lib/constants.ts`) is currently the weaker
  predicate form — a new role becomes assignable with no compile error.
  Convert it at the next touch.**
  Where such a record exists, **a new per-member difference goes into it, not
  into an inline `x === "member"` expression beside it** — an inline test with
  a falsy default is the same silent-inheritance hazard the record exists to
  prevent. It is tolerable only while the members it would mislabel are
  unreachable through the gate, so **a member's reachability entry may not
  flip to `true` in a commit that leaves any per-member difference outside a
  total record.** (`showLocation`, `compact` and the renderer selection in
  `CalendarViews.tsx` are the live instances; CV3/CV4/CV5 own them.)
  (Added 2026-09-03, mission-11, on Captain's ruling.)

## File-size caps

- **Soft cap: 350 lines** — a NOTE and a split candidate. (actions/groceries.ts
  was split three ways at ~624 before hitting the hard cap; current largest
  hand-written files sit in the ~350–420 range.)
- **Hard cap: 650 lines** — crossing it needs a written justification in the
  file header, or it's a BLOCKER. `src/generated/` is exempt, and so is
  `prisma/schema.prisma`: a Prisma schema is a single declarative file that
  this project's conventions give no way to split, so its length is a
  trend to watch, never a split candidate.
- Tests are colocated in `src/lib` as `*.test.ts`, run by `npm test`
  (node:test + tsx, no new frameworks).
- **Test files follow the same soft cap**; the split is by module under
  test — one `*.test.ts` per lib module. **When a single module's test file
  reaches the cap, splitting it by concern is permitted.** The file that
  keeps the module's **primary** concern keeps the module's bare name
  (`<module>.test.ts`), so searching for the module still lands on its
  canonical test file; each file that splits off appends the concern it takes
  (`<module><Concern>.test.ts`). Every header names the module it covers and
  points at its siblings by filename. A numbered or generic file (`…2`,
  `…More`, `…Other`) is never the answer. **If a module ever needs a second
  split, name every resulting file for its concern** — the bare name is only
  honest while one file still holds the primary concern; after two splits it
  would sit on whatever was left over, which is the broadest label on the
  narrowest content. Precedents: `calendarDates.test.ts` /
  `calendarDatesFormat.test.ts` (mission-10/C2) and `timelineLayout.test.ts` /
  `timelineLayoutPacking.test.ts` (mission-12/C4).
  (Clause added 2026-09-03: the previous text read as forbidding the
  concern-split this repo had already shipped, and
  `useCalendarPeriod.test.ts` at 344 now needs it — the letter was corrected
  to match the practice before a builder obeyed the letter. **Re-worded
  2026-09-03**, Bryce approving, after mission-12's second live use: Captain
  found the text still demanded *each half* name its concern while both real
  splits had deliberately kept the bare name on one of them. Tying the name
  to the **primary concern** rather than to which file happened to be
  retained turns an accident into a principle, and settles the second-split
  case the previous wording left silent — which matters because files in this
  repo demonstrably return to the cap: this very file was born at 349 and hit
  376 inside one mission, and `useCalendarPeriod.test.ts` at 344 is next.)
  **When the natural home is already at the cap, a small number of tests may
  be adopted by a sibling module's test file, with a header comment naming
  the module they cover and why they live there. This is a debt marker, not
  a pattern: it means the crowded test file is a split candidate, and the
  split is the real fix.** (Added 2026-09-02, mission 8, on Captain's
  ruling; adoption clause added 2026-09-02, mission 9, on Captain's proposed
  wording, approved by Bryce.)

  Live instances of the adoption clause — keep this list short, and empty it
  by splitting rather than by growing it:
  - (none — emptied 2026-09-02, mission 10's C2, which split
    `calendarDates.test.ts` by concern into `calendarDates.test.ts`
    (day/span math) and `calendarDatesFormat.test.ts` (label formatting) and
    sent `calendarDayDiff`'s test home from `monthLayout.test.ts`.)

- **A lib export with no application caller is dormant, not dead — but it
  must say so.** Keeping one is allowed when a named future consumer
  justifies it; the export carries a comment naming why it is dormant and
  what would revive it, and any function it in turn orphans carries the same
  note at its own definition. **Two consecutive missions with no caller means
  delete it and its tests** — a hypothetical consumer that never arrives is
  not a reason to maintain code. (Added 2026-09-03 on Captain's ruling,
  missions 9–10.) One refinement from its first application: prefer deletion
  outright when the dormant code describes behaviour the app **no longer
  has**, rather than behaviour merely unused — a dormant-export comment would
  then preserve a wrong answer for a future reader, which is the
  overclaiming-comment failure this repo tracks. `periodWindowEdges` was the
  retired navigation wall; deleting it removed both the code and that future
  wrong answer.

## Naming

- Components: `PascalCase.tsx`, flat in `src/components/`.
- Actions and lib: `camelCase.ts`; action exports are verbs
  (`createRecipe`, `putAway…`).
- Routes follow Next App Router conventions; route groups like `(app)` are
  invisible in URLs.

- **A component file's name must name something the file still exports.**
  Naming a family of exports is fine (`Skeleton.tsx`); naming a **deleted**
  export is not — a `grep` for the filename must not come up empty. Rename in
  the mission that deletes the last matching export, or in the next mission
  that touches the file. (Added 2026-09-03, mission-11; `MonthLoadingSkeleton.tsx`,
  which now exports only `MonthGridSkeletonRows`, is the live instance and
  must not survive CV3.)

## Danger register (absolute, for every agent)

- **Never `git add -A` or `git add .` while another agent may be writing.**
  Stage by explicit path. A commit that sweeps in a parallel builder's
  in-flight files is not a correctness failure — the tree can still be right —
  but it makes the commit message lie about its contents, and this repo's own
  debugging routinely depends on pinning a worktree or extracting a file at a
  named commit. (Recorded 2026-09-03, mission-10: a documentation commit swept
  seven of a builder's source files plus two throwaway scripts. Removing the
  strays in a follow-up, rather than rewriting a pushed branch, is the right
  remedy.)

- **Local dev uses the Neon `dev` branch — a copy-on-write clone of
  production — as of 2026-09-01.** The production URL lives only in
  Vercel's env vars. `npm run db:seed` / `npm run db:reset` stay forbidden
  by default (they'd wipe the realistic dev copy; a Neon branch reset is
  the sanctioned refresh); test data still goes only through the scoped,
  fingerprint-matched `db:seed-*` / `db:clean-*` scripts. The dev branch
  holds a real snapshot of family data (password hashes included) — writes
  can't reach production, but the data itself is still private.
- **No committed, rerunnable script may create, update, or delete `User`
  rows** — `bootstrap-users.ts` is the one sanctioned exception
  (interactive, upsert-keyed, no clean counterpart). The table holds the
  family's credentials, and this repo's own seed-script history shows
  blanket-clearing scripts outlive the assumptions that made them safe. A
  *fingerprint-scoped* delete is inside this prohibition, not outside it:
  `displayName` carries no `@unique`, so a name-matched `deleteMany` can
  catch a row the script never created, including one that later gained a
  `passwordHash`. A scoped seed that needs people **attaches to existing
  rows** via a narrow `select` read, ordered deterministically (`createdAt`
  then `id`), and exits non-zero naming `npm run db:bootstrap-users` when
  too few exist — `seed-calendar.ts` is the pattern. The only sanctioned
  cleanup of synthetic people is a one-off, by-id deletion of the exact
  rows a mission's own verification created, counts confirmed back to
  baseline. (Amended 2026-09-02, mission 8, on Captain's finding.)
- Migrations are **additive only**; review the SQL before applying.
- A new/changed Prisma model needs `npx prisma generate` **and a dev-server
  restart** (`db.ts` caches the client on `globalThis`).
- `FAMILY_PASSWORD` differs between dev and prod on purpose; secrets live in
  `.env`/Vercel only, never in chat or git.
- It's `proxy.ts`, not `middleware.ts` (Next 16) — a middleware.ts won't run.
- Never push without the user; after "done," check
  `git log origin/main..HEAD` — this repo has been bitten three times by
  finished-but-unpushed work.

## Captain's checklist

1. Placement — every new file where the layout map says its kind lives.
2. Size — caps respected; growth trends flagged.
3. Dependency direction — arrows hold; no cycles; the guarded-action split
   intact on any new external call.
4. One source of truth — no second definitions; no copy-pasted shared logic.
5. Naming — consistent with conventions and neighbors.

## Settled decisions — don't relitigate

- **`PantryItem` / `pantryItemId` keep their internal names** even though the
  UI says "inventory" — renaming means a live-database migration for zero
  user-visible benefit. The gap is deliberate and commented.
- **`Recipe.steps` stays `steps`** though the UI heading says "Instructions."
- **Ingredients/steps are newline-separated text columns**, not structured
  rows. The tripwire stands at 3 of 4 workarounds — a fourth feature needing
  structured ingredients means build it, stop working around it.
- **One shared family password** (session.ts/dal.ts) until real per-person
  accounts are needed; the swap is designed to be cheap.
