# STRUCTURE.md — Marsh HQ

Captain's constitution for this repo. It codifies the layout and boundaries
the project already holds (full reasoning in CLAUDE.md); Captain gates
structural changes against it.

## Layout map

| Path | What lives here | What never lives here |
|---|---|---|
| `src/app/(app)/` | Authenticated routes — header + nav + session chrome. `/login` deliberately lives here too and suppresses its own nav bar in `HubNav.tsx`, rather than moving to a separate layout for one page | Pages needing a genuinely chrome-free root layout — those go in `src/app/share/` |
| `src/app/share/` | Public token-gated pages (own root layout, no chrome, `noindex`) | Anything session-dependent |
| `src/app/api/` | Route Handlers for non-browser clients (e.g. `/api/voice`) | Logic that belongs in an action or lib |
| `src/app/actions/` | Server Actions — **every exported action opens with `getVerifiedSession()`, except `auth.ts`'s `login`/`logout`** — a login action can't require the session it exists to create | Unguarded exports outside that one named exception; pure logic (goes in lib) |
| `src/proxy.ts` | The Next 16 proxy — redirect-to-login UX, plus the narrow public routes (`/login`, `/api/voice` — exact matches) and prefixes (`/share/recipe/`, `/share/cookbook/`) | A second `middleware.ts` file (won't run under Next 16); treating this as the real auth gate — that's the in-action `getVerifiedSession()` guard, this is only UX |
| `src/lib/` | Pure helpers, `server-only` AI/external-call wrappers (no auth checks of their own — the wrapping Server Action guards), and the auth/db infrastructure itself (`dal.ts`, `session.ts`, `db.ts`) | Anything importing from `app/` or `components/` |
| `src/components/` | Shared client components, flat directory, PascalCase | Server-only logic |
| `src/generated/` | Generated Prisma client — never hand-edited, exempt from all caps | Everything else |
| `prisma/` | Schema, **additive-only** migrations, scoped seed/clean scripts | Blanket `deleteMany` seed scripts |
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

- `src/lib/constants.ts` — categories, locations, meal slots, stores, their
  icons and order
- `src/lib/nav.ts` — `HUB_NAV_ITEMS`, the only nav list
- `src/app/globals.css` — the color tokens
- `src/lib/shelfLife.ts` — the shelf-life vocabulary
- Shared UI jobs — see DESIGN.md's component vocabulary

## File-size caps

- **Soft cap: 350 lines** — a NOTE and a split candidate. (actions/groceries.ts
  was split three ways at ~624 before hitting the hard cap; current largest
  hand-written files sit in the ~350–420 range.)
- **Hard cap: 650 lines** — crossing it needs a written justification in the
  file header, or it's a BLOCKER. `src/generated/` is exempt.
- Tests are colocated in `src/lib` as `*.test.ts`, run by `npm test`
  (node:test + tsx, no new frameworks).

## Naming

- Components: `PascalCase.tsx`, flat in `src/components/`.
- Actions and lib: `camelCase.ts`; action exports are verbs
  (`createRecipe`, `putAway…`).
- Routes follow Next App Router conventions; route groups like `(app)` are
  invisible in URLs.

## Danger register (absolute, for every agent)

- **The dev database IS the live family database.** Never `npm run db:seed`
  or `npm run db:reset`. Test data only via the scoped, fingerprint-matched
  `db:seed-*` / `db:clean-*` scripts — which refuse to delete what they
  didn't create.
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
