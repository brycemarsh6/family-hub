# Mission 88: Family copies PR 2, time zone per copy and a brand-new database

**Project:** family-hub (Marshee)
**Status:** GATING
**Started:** 2026-11-26 · **Updated:** 2026-11-26
**Branch:** `claude/family-copies-pr2-timezone`

## Brief

- **Goal:** PR 2 of `.avengers/plans/family-copies-v1.md`. Each family copy
  can set its own household time zone before any data exists, a bad zone
  name fails the build, and CI proves the migrations build a working
  database from nothing.
- **Done means:**
  - `HOUSEHOLD_TIME_ZONE` (`src/lib/constants.ts`) reads
    `process.env.NEXT_PUBLIC_HOUSEHOLD_TIME_ZONE` by literal access, default
    `America/Denver`. Bryce's copy sets nothing and behaves exactly as today.
  - `prisma/migrate-on-production.mjs` exits non-zero with a plain message
    when the variable is set to a name `Intl.DateTimeFormat` rejects, on
    every Vercel build (preview too), before anything else.
  - The Gauntlet job starts an empty Postgres, runs `prisma migrate deploy`
    over all migrations from zero, checks the result matches
    `schema.prisma`, and runs the calendar pull and the briefing reads
    against the empty database without a crash.
  - `npm test`, the direct `TZ=UTC` line and the Gauntlet are green; Vision
    and Captain PASS.
- **Out of scope:** any screen change; the briefing cron's fixed UTC
  schedule in `vercel.json` (it targets Denver's 9 AM hour; PR 3 makes the
  briefing owner-copy only, so other copies never send it); PR 3 and PR 4
  files (`src/lib/copyConfig.ts`, settings cards, `HouseholdSettings`,
  store code); the `package.json` `TZ=America/Denver` test pin.

## Facts (Fury's scout, 2026-11-26)

- The only hard-coded zone in app code is `src/lib/constants.ts:342`. Every
  other use goes through `HOUSEHOLD_TIME_ZONE` (`householdDate.ts`,
  `briefing.ts` `isBriefingHour`, the briefing route, `assistant/today.ts`).
  Several client components import it, so the env read must be the literal
  `process.env.NEXT_PUBLIC_HOUSEHOLD_TIME_ZONE` for Next to inline it.
- Test files name `America/Denver` on purpose (they test zone math across
  zones). They stay.
- Migrations sharing a timestamp: `20261111000000_add_feedback` with
  `20261111000000_user_family_order`, and `20261116000000_add_text_size`,
  `_calendar_pull`, `_screensaver_settings`. Prisma applies them by full
  folder name. Each pair touches unrelated tables, so order cannot matter.
- `src/lib/db.ts` uses `@prisma/adapter-pg`, so a plain Postgres works.
- `loadPullCalendars` returns `[]` without a query when Google is not
  configured, so the smoke step sets dummy Google values to make the pull
  actually query the database.
- No Postgres or Docker on Bryce's Mac: the empty-database proof runs in CI.

## Danger register

AGENTS.md in full. For this mission: never run anything against a Neon
database (dev or production); the smoke script refuses any `DATABASE_URL`
whose host is not `localhost` or `127.0.0.1`. No `db:seed`, `db:reset`, no
new migration unless a from-zero failure forces an additive one (ask Bryce
if a fix would change an applied migration's meaning). Stage by explicit
path, then `git show --stat HEAD`.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- `npm run build`
- The CI Gauntlet job, including the new fresh-database steps.

## Assembled

- Stark + Vision (always).
- Captain: a new CI service and steps, a new script file.
- Strange out: nothing visible changes.
- Banner out: scout done inline by Fury.

## Contract C1: time zone setting, build check, fresh-database CI

1. **Objective:** the household zone comes from one env var with a Denver
   default, a bad value fails the build, and CI builds and smoke-tests an
   empty database from every migration.
2. **Boundaries.**
   - May touch: `src/lib/constants.ts` (the `HOUSEHOLD_TIME_ZONE` line and
     its comment only), `prisma/migrate-on-production.mjs`,
     `prisma/fresh-db-smoke.ts` (new), `.github/workflows/ci.yml`,
     `src/lib/householdDate.test.ts` (one small test that the default is
     Denver), `.env.example` if it exists (one commented line).
   - Must not touch: `package.json`, `prisma/schema.prisma`,
     `prisma/migrations/**`, `vercel.json`, any PR 3 or PR 4 file, anything
     else. Fury edits CLAUDE.md, STRUCTURE.md, README and the plan.
3. **Rules for the code.**
   - constants: `process.env.NEXT_PUBLIC_HOUSEHOLD_TIME_ZONE || "America/Denver"`
     (empty string falls back). Comment says why it is an env var (fixed per
     copy before data exists, since day columns are stored as household
     days) and that the build validates it.
   - migrate-on-production: validate first, before the `VERCEL_ENV` check,
     so preview builds and CI fail too. Only when the variable is set and
     non-empty: `new Intl.DateTimeFormat("en-US", { timeZone })` inside
     try/catch; on failure print one plain line naming the bad value and an
     example (`America/Los_Angeles`) and `process.exit(1)`. Update the
     header comment.
   - fresh-db-smoke.ts: refuses (exit 1, plain message) unless
     `DATABASE_URL` parses with hostname `localhost` or `127.0.0.1`. Then
     calls `pullCalendars({ force: true, rewindow: true })`,
     `loadHouseholdAdults()`, `loadHouseholdPeople()` and
     `loadBriefingShared(calendarDateInZone(new Date(), HOUSEHOLD_TIME_ZONE))`,
     asserts the results are empty or zero (pull: `checked === 0`,
     `failed === 0`), prints one line each, disconnects `db`, exits 0. Any
     throw exits 1. Run as
     `node --conditions=react-server --import tsx prisma/fresh-db-smoke.ts`
     (react-server satisfies `server-only`); if that condition breaks the
     Prisma client, find what works and report it.
   - ci.yml, inside the existing `gauntlet` job (so the required "Gauntlet"
     check covers it): a `postgres:17` service on host port **5433** (the
     job's dummy `DATABASE_URL` on 5432 must stay unreachable), with a
     health check. Steps after Build, each with its own `DATABASE_URL`
     pointing at the 5433 service:
     a. "Fresh database: migrations from zero": `npx prisma migrate deploy`.
     b. "Fresh database: matches schema": `npx prisma migrate diff
        --from-config-datasource --to-schema prisma/schema.prisma
        --exit-code` (check the v7 flag names with `--help`).
     c. "Fresh database: crons on empty data": the smoke script, with
        dummy values for whatever `isGoogleConfigured()` and
        `isTokenKeyConfigured()` need, so the pull really queries.
     d. "Time zone check": runs `migrate-on-production.mjs` with
        `NEXT_PUBLIC_HOUSEHOLD_TIME_ZONE=Not/AZone` and asserts it fails,
        then with `America/Los_Angeles` and asserts it passes (VERCEL_ENV
        unset, so it skips the migrate). Positive and negative control.
     Update the file's header comment, which says nothing connects to a
     database.
4. **Verification.** The gauntlet commands above pass locally. Locally also
   run: `NEXT_PUBLIC_HOUSEHOLD_TIME_ZONE=Not/AZone node prisma/migrate-on-production.mjs; echo $?`
   (expect 1 and the message), the same with `America/Los_Angeles` (expect
   0), with it unset (expect 0), and the smoke script with
   `DATABASE_URL=postgresql://x@example.com/x` (expect the refusal, exit 1,
   no connection). The real fresh-database run happens in CI after Fury
   pushes; do not push.
5. **Evidence required:** each command with its output and exit code;
   `git diff --stat`; the exact CI steps added.
6. **Done criteria:** all local checks pass, boundaries held, nothing
   pushed. Commit on the branch, staged by explicit path, then
   `git show --stat HEAD`.

## Log

- 2026-11-26: mission opened, number 88 taken in the shared notes.
- 2026-11-26: C1 DONE by Stark (local gauntlet green: npm test 2291 pass,
  TZ=UTC 2281 pass 10 skipped, tsc, eslint, build). Deviation accepted: the
  smoke script stubs `server-only` in `require.cache` instead of
  `--conditions=react-server`, which strips `createContext` from React and
  breaks lucide-react at import. Fury edited CLAUDE.md, STRUCTURE.md, README
  and wrapped one ci.yml comment line. Draft PR opened so CI can run the
  fresh-database steps (no Postgres on this Mac).
- 2026-11-26: Captain PASS (5 NOTEs: STRUCTURE.md `prisma/` row and ci.yml
  header wording, both applied; the 5433 URL is written three times;
  constants.ts at 349 of 350 lines; CLAUDE.md at the 250 cap).
- 2026-11-26: CI run 45876392134: migrations from zero PASS, matches schema
  PASS, smoke FAIL (`meals` is always the 4 slots, titles null on an empty
  plan). Vision pass 1 BLOCKED on the same line. Fix: expect slots present
  and none planned; plus Vision's NOTE, the script now refuses when Google
  is not configured (negative control: exit 1 locally without the values).
- Vision NOTEs kept for later: Winnie's OpenAPI descriptions still say
  "(Denver)" (`openapiGoalPaths.ts:49`, `openapiMealPlanPaths.ts:13`); Intl
  accepts lowercase and legacy zone names (consistent with the app).
