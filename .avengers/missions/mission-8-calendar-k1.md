# Mission: Calendar K1 — foundation (schema, actions, Week + Day views, event form)

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-09-02 · **Updated:** 2026-09-02

## Brief

- **Goal:** Replace `/calendar`'s "Coming soon" page with the first real
  Calendar branch: an event model, guarded actions, Week and Day views built
  from one shared day component, an add/edit event page, and an event detail
  sheet. Phase K1 of `.avengers/plans/calendar-v1.md` (K0 design complete,
  approved 2026-09-02 from the Skylight walkthrough).
- **Done means:** signed in as a parent, `/calendar` opens on Week showing
  the current week as an agenda list grouped by day; the "+" creates an event
  through a real form (title, all-day, start/end date+time, people,
  location, notes); the event appears on the right day in both Week and Day
  with per-person color bands and avatars; tapping it opens a detail sheet
  with Edit and Delete; a kid-role session sees the same events with no
  create, edit, or delete control **and** the actions themselves refuse a kid;
  the gauntlet passes; and the Nov 1 2026 DST week renders seven consecutive
  dates.
- **Out of scope (K2–K7, do not build):** Month view, filters, tags UI, the
  meal overlay, recurrence UI (the `rrule` column ships, nothing reads it),
  AI import, Google sync and the Sync-to toggles, search, notifications.

## Danger register

Standing (STRUCTURE.md + AGENTS.md), absolute for every agent:
- `npm run db:seed` / `npm run db:reset` are **forbidden**.
- Never write a clean/reset script for the `User` table.
- Migrations are **additive only**; review the SQL before applying.
- A new Prisma model needs `npx prisma generate` **and** a dev-server restart.
- Never push without the user; check `git log origin/main..HEAD` before
  claiming anything shipped.

This session specifically:
- **This container has no `.env` and never had the Neon URL.** Fury created a
  **local throwaway Postgres** (port 5433, db `marshee_k1`, built from this
  repo's own migrations) and a local `.env` pointing at it. `.env` is
  git-ignored (`.gitignore:34`, confirmed with `git check-ignore -v`).
  **No agent may put a real connection string, secret, or family data in
  this container.** Verification writes go to the throwaway database only,
  so the scoped `db:seed-*` restriction is satisfied by construction: there
  is no family data here to protect.
- The throwaway `.env` values are fake by design. Do not treat them as
  secrets to preserve, and do not commit them.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `npm run build`

Baseline (pre-mission, this container): recorded in the handoff log below.
A mission that adds behavior adds tests: K1 must extend `npm test` with
`src/lib/calendarDates.test.ts`.

## Assembled

- **Stark + Vision** — always.
- **Strange** — in. K1 is a whole new user-facing branch; DESIGN.md gating is
  the point.
- **Captain** — in. New route tree, new lib module, new components, new
  schema: exactly the new-files-and-large-diff trigger.
- **Banner** — out. `.avengers/plans/calendar-v1.md` already carries the
  file:line citations a research brief would produce; a second read is cost
  without new information.

## Contracts

Order matters: C1 lands the data layer, C2 the pure date logic (no
dependency on C1), C3 the views, C4 the write UI. **C1 and C2 have disjoint
boundaries and may run in parallel.** C3 and C4 both depend on C1+C2 and
touch overlapping component files, so they run in sequence.

### C1 — Schema, constants, and guarded Server Actions for calendar events
- **Status:** DONE
- **Boundaries:**
  - may touch: `prisma/schema.prisma`, `prisma/migrations/**` (new dir only),
    `src/lib/constants.ts` (append only), `src/app/actions/calendar.ts` (new),
    `prisma/seed-calendar.ts` (new), `prisma/calendar-seed-data.ts` (new),
    `prisma/clean-calendar.ts` (new), `package.json` (scripts block only).
  - must not touch: any existing model in `schema.prisma` beyond adding the
    back-relation fields the new relations require; any existing migration;
    `src/lib/dal.ts`; `src/proxy.ts`; any existing action file; anything
    under `src/components/` or `src/app/(app)/`.
- **Verification:**
  - `npx prisma migrate dev --name add_calendar_events` → applies clean;
    the generated SQL is **only** `CREATE TABLE` / `CREATE INDEX` /
    `ALTER TABLE ... ADD COLUMN` — paste it in the report.
  - `npx prisma generate` → succeeds.
  - `npm run db:seed-calendar` then `npm run db:clean-calendar` → row counts
    return to exactly the pre-seed baseline; clean refuses rows it did not
    create (fingerprint by title prefix, the recipe-script pattern).
  - `npx tsc --noEmit`, `npx eslint .` → clean.
- **Evidence required:** the migration SQL in full; the `prisma db execute`
  or script output showing counts before/after seed and after clean; the
  exact guard line from each exported action.
- **Done criteria:** every exported action in `calendar.ts` opens with the
  **null-returning** guard form (`getVerifiedUser()` + `MANAGER_ROLES` from
  `constants.ts`) per STRUCTURE.md's guard-form rule — never `requireRole`,
  because these actions are reachable from shipped UI that renders errors
  inline. Read actions are session-gated but not manager-gated (kids read).
  No Prisma enum. Fingerprint-scoped clean script.
- **Report:** DONE. `CalendarEvent` + `CalendarEventPerson` (cascade both
  sides), `createdById` SetNull, indexes on `startAt` and `createdById`;
  back-relations on `User` only. Migration
  `20260902025526_add_calendar_events` is **additive only** — CREATE TABLE /
  CREATE INDEX / ADD CONSTRAINT, no DROP, no ALTER COLUMN (full SQL in the
  builder report). `HOUSEHOLD_TIME_ZONE` appended to `constants.ts`.
  `src/app/actions/calendar.ts` exports `createCalendarEvent`,
  `updateCalendarEvent`, `deleteCalendarEvent`, each opening with the
  null-returning guard, verified identical at lines 93-96, 133-136, 180-183:
  `getVerifiedUser()` then `MANAGER_ROLES.includes(user.role)` →
  `{ error: "Only parents can do that." }`. Client-supplied `userId`s are
  re-validated against non-deactivated `User` rows; `createdById` comes from
  the session, never the client. Seed/clean follow the recipe pattern with a
  `ZZZ Test` fingerprint. Counts: baseline all-zero → seed 3 users/5
  events/8 people → clean back to exactly zero, groceries/pantry/recipes
  untouched throughout.

  **Fury-verified beyond the report** (a builder's claim is not evidence):
  `prisma/tmp-check/` confirmed gone from disk and from `git status`;
  `npm run build` — which C1 correctly noted was absent from its own
  verification list — run by Fury, **exit 0**, `/calendar` present in the
  route table.

  **⚠️ C4 is bound to this signature:** the write actions take a plain
  object (`CalendarEventInput`), **not `FormData`** — the
  `setMealPlanEntry`/`AddToMealPlanSheet` style, not `RecipeForm`'s
  `useActionState`+`FormData`. C1 chose this because the form composes real
  `Date` objects client-side from separate date/time/all-day inputs.
  Accepted; C4's contract must not assume `useActionState`.

  **There is no read action, by design.** Pages in this repo read through
  `db` directly in the Server Component (the dashboard precedent), so C3
  owns its own range query. Kids therefore read without a manager gate for
  free, which is what the plan requires.

### C2 — `src/lib/calendarDates.ts` + tests (pure, no DB, no React)
- **Status:** DONE
- **Boundaries:**
  - may touch: `src/lib/calendarDates.ts` (new),
    `src/lib/calendarDates.test.ts` (new).
  - must not touch: `src/lib/mealPlanDates.ts`, `src/lib/useToday.ts`,
    anything else.
- **Verification:** `npm test` → the new file's cases run and pass (the glob
  reaches `src/lib/*.test.ts`; a test placed elsewhere silently never runs).
  `npx tsc --noEmit`, `npx eslint .` → clean.
- **Evidence required:** the `npm test` tail showing total counts before and
  after; the test names.
- **Done criteria:** exports cover — days of a week from a Sunday; a
  timed-range label ("8 – 9 PM", "10 – 11 AM", "12:30 – 4:30 PM", collapsing
  a shared meridiem); an all-day label; whether an event is past relative to
  a passed-in "now"; which days in a range an event covers. **Calendar-
  component math only, never millisecond arithmetic**; every function takes
  "now"/"today" as a parameter and never calls `new Date()` internally, so
  the tests can pin it. Reuses `startOfDay` / `addDays` / `isSameDay` from
  `mealPlanDates.ts` rather than redefining them. Tests must include the
  **Nov 1 2026** DST week returning seven consecutive dates.
- **Report:** —

- **Report:** DONE. `src/lib/calendarDates.ts` exports `daysOfWeek`,
  `formatTimeRange`, `formatAllDayLabel`, `isPast`, `daysEventCovers`;
  imports `addDays`/`isSameDay`/`startOfDay` from `mealPlanDates.ts` rather
  than redefining them; no function calls `new Date()` internally; no
  millisecond arithmetic. `src/lib/calendarDates.test.ts` adds **22** cases
  including the real Nov 1 2026 DST week. Evidence: `npm test` exit 0,
  **128/128** (106 baseline + 22); `tsc` exit 0; `eslint` exit 0.
  Two judgment calls the builder made and documented, both accepted:
  `formatAllDayLabel` returns `null` for a plain single-day timed event
  (unspecified in the contract — "not applicable, use `formatTimeRange`")
  rather than inventing a string; and the day-span logic behind
  `formatAllDayLabel` and `daysEventCovers` was factored into one internal
  helper so the two can never disagree about which days an event covers.

✅ **SEAM CLOSED — verified in code against real rows, not by comparing two
reports.** C1 independently chose the same **exclusive** convention C2
assumed, and documented it on the `startAt`/`endAt` fields in
`schema.prisma:20-25`. Fury did not take that agreement on trust: a
throwaway script seeded the real fixtures and ran C2's own
`daysEventCovers`/`formatAllDayLabel` over them. Result — the single all-day
event (`startAt` Wed 00:00, `endAt` Thu 00:00) covers **exactly 1 day**,
labelled "All day", and does **not** leak onto Thursday; the multi-day event
(`startAt` Thu 00:00, `endAt` Sun 00:00) covers **exactly 3 days**, labelled
"Day 1 of 3" … "Day 3 of 3", and does **not** leak onto Sunday; timed events
render "9 – 10 AM" and "7 – 9:30 PM"; the real Nov 1 2026 DST event resolves
to its own single day. Script deleted, seed cleaned, counts back to zero.
Vision must still re-run this independently — it is now a *verified* claim,
not an open question.

**Original wording, kept for the record:** C2 could not see C1's schema (out of boundary) so it assumed the
iCal/Google **exclusive** end convention: a Mon–Wed all-day event stores
`end` = Thursday midnight. If C1 stored all-day `end` *inclusively*, every
all-day event renders one day too long. This is the exact class of bug two
parallel contracts produce, and it is not visible inside either one.
Resolution: on C1's report, read the seed data's all-day rows and the
action's write path, confirm which convention is in force, and make the
losing side conform **in code**, not in a comment. Hand the finding to
Vision explicitly so it is verified, not assumed.

### C3 — Week + Day views (read-only rendering)
- **Status:** PENDING (depends on C1, C2)
- **Boundaries:**
  - may touch: `src/app/(app)/calendar/page.tsx`,
    `src/app/(app)/calendar/loading.tsx` (new),
    `src/components/CalendarViews.tsx` (new, client shell),
    `src/components/DaySection.tsx` (new),
    `src/components/EventCard.tsx` (new).
  - must not touch: `src/lib/nav.ts`, `HubNav.tsx`, the root layouts,
    `src/app/actions/**`, `prisma/**`.
- **Verification:** app runs; `/calendar` renders the seeded week; screenshot
  at **375px** width; `npx tsc --noEmit`, `npx eslint .`, `npm run build`.
- **Evidence required:** screenshots at 375px of Week with a multi-person
  event, an empty day, and Day view; the measured `loading.tsx` skeleton
  heights matching the real rendered heights.
- **Done criteria:** one `DaySection` renders both Week (seven) and Day
  (one) — not two implementations. "Which week/day is current" comes from
  `useToday()`, never the server clock. Per-person color via
  `avatarColorHex()`; initials via the existing `AvatarBadge`. Past events
  dimmed. `loading.tsx` heights are **measured, not guessed** (the dashboard
  lesson). No `BackLink` (a nav-bar root), and the last row clears the fixed
  bottom nav.
- **Report:** —

### C4 — Create / edit / delete UI
- **Status:** PENDING (depends on C1, C2, C3)
- **Boundaries:**
  - may touch: `src/app/(app)/calendar/new/page.tsx` (new),
    `src/app/(app)/calendar/[id]/edit/page.tsx` (new),
    `src/components/EventForm.tsx` (new),
    `src/components/EventDetailSheet.tsx` (new),
    `src/components/CalendarViews.tsx`, `src/components/EventCard.tsx`.
  - must not touch: `prisma/**`, `src/app/actions/calendar.ts` (C1 owns its
    signatures — a needed change is BLOCKED-ON-CONTRACT, not an edit),
    `src/lib/**`.
- **Verification:** create, edit, and delete an event through the browser as
  a parent; reload and confirm persistence by a direct database read; repeat
  as a **kid-role** session and confirm the controls are absent **and** a
  direct action call is refused.
- **Evidence required:** before/after database rows for one created event;
  the kid-session screenshot; the refused-action output.
- **Done criteria:** one `EventForm` serves both new and edit
  (`RecipeForm` precedent). Native `<input type="date">` / `type="time">`.
  At least one person required; the creator pre-selected; `createdById`
  recorded. Detail sheet is the house bottom sheet with names, not initials
  alone. Delete is single-tap (no recurrence in K1, so no This/All choice).
  `canManage` is computed server-side and passed as a **boolean**; hiding is
  never the gate.
- **Report:** —

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | — | — | — |
| 1 | Strange | — | — | — |
| 1 | Captain | — | — | — |

Budget: 3 passes per gate, then STOP and surface.

## Handoff log

- 2026-09-02 — Mission opened. Container had no `.env`/`node_modules`;
  `npm ci` run, local throwaway Postgres 16 started on port 5433, repo
  migrations applied, Prisma client generated. Gauntlet baseline running.
  Contracts C1-C4 written. Next: dispatch C1 and C2 in parallel.
- 2026-09-02 — Gauntlet baseline GREEN on the throwaway DB: `tsc` exit 0,
  `eslint` exit 0, `npm test` 106/106, `npm run build` exit 0. This is the
  positive control: any later red is the mission's doing, not pre-existing.
- 2026-09-02 — C1 and C2 dispatched to Stark in parallel (disjoint
  boundaries: C1 owns prisma/actions/constants, C2 owns two new lib files).
  Next: read both reports, then C3.
- 2026-09-02 — C2 DONE (128/128 tests, tsc/eslint clean). Its report raises
  an open seam on the all-day `end` convention that C1 owns — logged under
  C2's report; must be settled before C3 renders anything. C1 still running.
- 2026-09-02 — C1 DONE. Fury verified past the report: tmp artifacts gone,
  `npm run build` exit 0 (C1's list omitted it), guard lines read directly.
  **The all-day seam is CLOSED with real evidence** — C2's functions run over
  C1's seeded rows give exactly 1 and exactly 3 covered days, no leak.
  Gauntlet now: tsc 0, eslint 0, 128/128 tests, build 0. C2 committed and
  pushed (1cf4bbe); C1's diff is staged for review, not yet committed.
  Next: dispatch C3 (Week + Day views).

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** —
