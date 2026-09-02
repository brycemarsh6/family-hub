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
- **Status:** DISPATCHED
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
- **Report:** —

### C2 — `src/lib/calendarDates.ts` + tests (pure, no DB, no React)
- **Status:** DISPATCHED
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

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** —
