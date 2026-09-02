# Mission: Calendar K1 — foundation (schema, actions, Week + Day views, event form)

**Project:** family-hub (Marshee)
**Status:** AT-THE-GATES (C4 pass 1: Vision + Captain running, Strange held)
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
- **Status:** DONE
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
- **Report:** DONE. `page.tsx` (Server Component, force-dynamic, own range
  read + server-side `canManage` boolean), `CalendarViews.tsx` (client shell:
  view + period state from `useToday()`, `RadioSheet` switcher, visible
  prev/next arrows, Today disabled in the current period),
  `DaySection.tsx` (the one gutter+cards component — 7 for Week, 1 for Day),
  `EventCard.tsx` (label from C2's helpers, `AvatarBadge` per person,
  diagonal `avatarColorHex()` bands, past dimmed, `location` in Day view),
  `loading.tsx` (measured heights). Gauntlet: tsc 0, eslint 0, **128/128**,
  build 0 with `/calendar` dynamic. Seed → clean returned every count to
  zero, throwaway manager account created for sign-in and deleted after.
  Sizes 57–230 lines, all under the 350 soft cap (Fury-checked).

  **The layout-shift requirement was met unusually well.** The builder made
  the loading branch call the *same* `NoEventsCard()` JSX as the resolved-
  empty branch, so the frames are identical by construction, then verified
  three ways: skeleton row 82px, hydration-null row 82px (caught live by
  lagging hydration behind the server HTML), resolved-empty row 82px.
  Fury viewed the 375px screenshot and confirms: Sunday-first, today
  circled with an accent edge bar, the multi-day event correctly reading
  "Day 1 of 3" / "Day 2 of 3" / "Day 3 of 3" across three days, a 3-person
  event with three badges, past events dimmed, labels "9 – 10 AM" and
  "7 – 9:30 PM".

  **Accepted deviation:** the range query is ±60 days, not the contract's
  ±8 minimum, so prev/next has room to page without a fetch API. Paging
  beyond that window is K1's honest limit, commented in `page.tsx`.

  **Honest limit the builder volunteered:** days that hold real events do
  grow when `today` resolves, since a specific day's event count is
  unknowable until the day is known. Distinct from the dashboard's
  fixed-row case, and documented in `DaySection.tsx` rather than papered
  over.

  **⚠️ Two Fury concerns handed to the gates rather than fixed here:**
  (1) `CalendarViews.tsx:119` contains `{canManage && null}` — dead code
  whose only purpose is to satisfy the linter about an unused prop. My
  contract's "threaded through unused" wording invited it, so this is my
  defect, not the builder's; Captain and Vision decide whether it stands or
  the prop should leave until C4 uses it. (2) Every seeded person is named
  `ZZZ Test …`, so every avatar renders "Z" and the real family's initial
  collisions (Emily/Eleanor, Ledger/Lucy) were never exercised — Strange
  should judge the bands and badges against names that actually collide.

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
- **Report:** DONE. **Step 1 first, proven:** `CalendarHeader.tsx` (100) and
  `ActionCircle.tsx` (38) extracted; `CalendarViews.tsx` 275 → 213 before
  the rest of C4 grew it to a final 307; `RecipeActionCircles.tsx` imports
  the one `ActionCircle` (Fury-verified: exactly one definition in `src/`).
  Pixel diff of Week at 375px before/after extraction: **max diff 0,
  nonzero pixels 0**. Then `EventForm.tsx` (346), `EventDetailSheet.tsx`
  (189, ⋯ as an internal `view` state, full names, "Added by", single-tap
  Delete), `/calendar/new` and `/calendar/[id]/edit` (server-gated, kid →
  redirect, missing id → `notFound()`), `FloatingAddButton` → `ActionSheet`
  (Event / Meal) on `canManage`, `EventCard` a real `<button>`, past
  treatment per Strange verbatim (measured live: past title `--muted`
  weight 400, future `--fg` 600, opacities 1), Day view stacks badges below
  text so location gets a full line, Week `line-clamp-2` + overlap-stacked
  badges, `NotLoadedCard` per 6d, both Vision pass-3 notes done.
  `loading.tsx` untouched — the pixel diff proved its heights hold.
  **Through the real form, rows read back:** create (`createdById` =
  session), edit (`updatedAt` advanced), delete (0 remain), **all-day
  exclusive end via the UI**: Starts 09/10, Ends 09/12 → `endAt
  2026-09-13T00:00Z`. Sheet shows "Day 2 of 3" and Bryce/Emily/Eleanor by
  full name.
  **Kid check went beyond the contract:** the real `Next-Action` POST was
  captured and replayed — Bryce's cookie 200 + row (positive control);
  Eleanor's kid cookie 200 with `{"error":"Only parents can do that."}`
  and **no row**; no cookie 307. No `+`/Edit/⋯ for the kid; both write
  pages redirect by URL. Gauntlet 135/135 both timezones; three routes
  built; counts 0; `playwright` reverted (package files clean,
  Fury-verified). **`EventForm.tsx` at 346 is 4 under the soft cap.**
  **Deviations for the gates:** (1) next-whole-hour default via a local
  `useSyncExternalStore` "browser minute" hook + adjust-state-during-render,
  because `useEffect`+`setState` trips this repo's `set-state-in-effect`
  rule and render-time `new Date()` mismatches hydration; (2) "Added by" as
  a `createdByNames` map in `page.tsx` rather than widening
  `CalendarEventView` (`types.ts` was out of bounds); (3) no CSS-sticky
  submit — no such pattern exists here.

### C7 — Micro-fix: paging must never strand the user (Strange pass-2 note)
- **Status:** DONE
- **Boundaries:** may touch `src/components/CalendarViews.tsx` only (plus
  `src/lib/calendarDates.ts` + test **only** if a `stepsTowardToday`-style
  helper is cleaner there than inline). Must not touch anything else.
- **Objective:** Prev/Next are disabled only for steps that move *away*
  from today past the window edge; a step *toward* today is always allowed
  even if the candidate period is itself outside the window.
- **Verification:** reproduce Strange's strand (Denver browser, Prev ×9,
  Week→Day → Wed Jul 1 with both arrows dead) before; after, Next is
  enabled there and walks Jul 2 → Jul 3 → Jul 4 (loaded) → onward; the
  forward edge still disables Next at the last loaded period; gauntlet
  both timezones.
- **Done criteria:** from any reachable period, at least one of Prev/Next/
  Today leads back toward loaded data, and no step away from today past
  the edge is possible.
- **Report:** DONE. +14/−2 in `CalendarViews.tsx` only (262 → 274, half of
  it a comment on direction-of-travel): `atWindowEnd`/`atWindowStart` now
  require `today !== null` and a raw `.getTime()` comparison showing the
  step moves *away* from today before `canStepToPeriod` may refuse it.
  Strand reproduced before (`Prev disabled: true, Next disabled: true` on
  Wed Jul 1) and escaped after (`Next disabled: false` → Jul 2, Jul 3 as
  not-loaded → Jul 4 loaded "No events" → onward). Forward edge still stops
  Next at Oct 25–31; Day forward paging still stops at Fri Oct 30; Week Prev
  still disabled at Jun 28–Jul 4. Gauntlet 135/135 both timezones, build 0.
  Helper extraction judged unnecessary for two inline comparisons — the lib
  is untouched. Counts 0/0/0, scratch gone. Fury re-ran the gauntlet:
  identical.

### C4 — Create / edit / delete UI
- **Status:** DONE — at the gates (committed `ad2de84`)
- **Boundaries:**
  - may touch: `src/app/(app)/calendar/new/page.tsx` (new),
    `src/app/(app)/calendar/[id]/edit/page.tsx` (new),
    `src/components/EventForm.tsx` (new), `src/components/EventDetailSheet.tsx`
    (new), `src/components/CalendarHeader.tsx` (new, extracted),
    `src/components/ActionCircle.tsx` (new, hoisted), `src/components/
    RecipeActionCircles.tsx` (import the hoisted circle only),
    `src/components/CalendarViews.tsx`, `src/components/DaySection.tsx`,
    `src/components/EventCard.tsx`, `src/app/(app)/calendar/page.tsx`,
    `src/app/(app)/calendar/loading.tsx` (if the header extraction changes
    measured heights — re-measure, don't guess), and
    `src/lib/calendarDates.test.ts` **for one comment sentence only**
    (Vision pass-3 note 2).
  - must not touch: `prisma/**`, `src/app/actions/calendar.ts` (its
    signatures are the contract — `CalendarEventInput` plain object, not
    `FormData`), `src/lib/calendarDates.ts` (C6 finished it), `dal.ts`,
    `proxy.ts`, constitutions.
- **Objective:** parents and admin can create, edit, and delete events from
  the calendar; kids see everything and can change nothing; the detail
  sheet names people in full.
- **Required, in this order (Captain's mandates first so the files shrink
  before they grow):**
  1. Extract the header row (Today / view circles + prev/next/title) into
     `CalendarHeader.tsx`; hoist `ActionCircle` (the calendar copy is the
     superset — it has `disabled`) into `ActionCircle.tsx` and make
     `RecipeActionCircles.tsx` import it. Zero behavior change; verify by
     screenshot diff at 375px before continuing.
  2. `EventForm.tsx`: one form for New and Edit (the `RecipeForm`
     precedent). Title; All day toggle; native `<input type="date">` /
     `type="time">` for start and end (the OS wheel for free); default
     next whole hour, one hour long, changing start keeps the duration;
     all-day hides the time boxes; people as multi-select avatar circles
     with names, creator pre-selected, ≥1 required; optional Location and
     Notes. **All-day end is EXCLUSIVE** — the form constructs `endAt` as
     local midnight of the day *after* the last covered day, never equal
     to `startAt` (validation would refuse it). Submit calls
     `createCalendarEvent` / `updateCalendarEvent` with a plain object;
     render `{ error }` inline. Sync-to toggles, tags, repeats: **not in
     K1** — leave no dead controls.
  3. `/calendar/new?date=YYYY-MM-DD` and `/calendar/[id]/edit`, each with a
     `BackLink` to Calendar. Edit page 404s cleanly for a missing id.
  4. `EventDetailSheet.tsx`: the house bottom sheet on card tap — title,
     date line ("Wednesday, Sep 2, 6 – 7 PM" via C2's formatters), one
     tinted chip **with full name** per person (the initials collide),
     location, notes, "Added by <name>". For managers: Edit (→ edit page)
     and a ⋯ `ActionSheet` with single-tap Delete. **Kids see no Edit and
     no ⋯** — the UI mirrors the gate; the actions are the gate.
  5. `FloatingAddButton` → `ActionSheet` with **Event** (→ `/calendar/new`
     for the day in view) and **Meal** (→ `/kitchen/cooking/meal-plan`; the
     `SlotEditSheet` reuse is a K3 call). Managers only.
  6. **Past-event dimming — Strange's instruction, verbatim:** remove
     `opacity-55` entirely (card opacity stays 1); when `past`, render the
     title `text-muted font-normal` instead of `text-fg font-semibold`
     (5.38:1 light / 6.12:1 dark, AA both) and pass a halved band alpha
     (0.05) into `bandBackground` so the tint drains; leave the
     `AvatarBadge`s at full color (identity, not state). No
     `line-through` (that means cancelled).
  6b. **Day view location line** (`EventCard.tsx:76`): `compact ?
     "truncate" : "break-words"`, or better, in non-compact mode stack the
     badge row *below* the text block so title, time, and location all get
     the full width. Required, not optional — the detail sheet is not an
     excuse for the card to clip.
  6c. **Week badge strip**: `line-clamp-2` on Week titles; badges
     overlap-stack (`-space-x-1.5` + `ring-2 ring-surface` so E/E and L/L
     stay separated). Never "+N".
  6d. **`NotLoadedCard` distinct from `NoEventsCard`**: solid `bg-surface-2`,
     no dashed border, a 16px Lucide `CalendarOff` before the text; copy
     "Not all events loaded" plus a `text-xs` line "Marshee shows about
     two months each way — tap Today to come back." Unknown and empty must
     not share a glyph, exactly as loading and empty must not.
  7. `EventCard` becomes a `<button>` (or gets `role="button"` + keyboard
     handling) opening the sheet; 48px minimum height already holds.
  8. **Two Vision pass-3 notes, small:** (a) in `CalendarViews.tsx`, when
     `isOutsideWindow(today, …)` is true (a device clock ≥61 days off),
     permit whichever step moves *toward* the window so Prev/Next/Today
     can't all be dead; (b) in `calendarDates.test.ts`, add one sentence
     to `withTimeZone()`'s comment: Node re-reads `TZ` for `Date` getters
     but **not** for the module-level `Intl.DateTimeFormat` instances in
     `calendarDates.ts`, so never call a formatter inside the helper.
- **Verification:** gauntlet under both timezones; browser at 375px:
  create → appears in Week and Day; edit → changes persist after reload;
  delete → gone; an all-day event created through the form covers exactly
  the chosen days (the exclusive-end proof, again, through the real UI
  this time); a **kid session** sees cards and the sheet but no Edit/⋯/+;
  the seeded three-day event's sheet shows "Day N of 3"; screenshots of the
  sheet with Emily/Eleanor both present, names legible. Counts back to
  zero. Sizes: every file under 350; `CalendarViews.tsx` must be *smaller*
  after step 1 than before it.
- **Done criteria:** a parent can run the whole create/edit/delete loop on
  a phone without typing a date; a kid cannot reach any write; no new
  component duplicates a sanctioned one.
- **Report:** —

### C5 — Fix contract: all 8 pass-1 blockers, plus 5 cheap same-file notes
- **Status:** DONE
- **Boundaries:**
  - may touch: `src/lib/calendarDates.ts`, `src/lib/calendarDates.test.ts`,
    `src/lib/types.ts`, `src/lib/mealPlanDates.ts` (add one export only),
    `src/lib/constants.ts` (one comment only), `src/app/actions/calendar.ts`,
    `src/app/(app)/calendar/page.tsx`, `src/components/CalendarViews.tsx`,
    `src/components/DaySection.tsx`, `src/components/EventCard.tsx`,
    `prisma/seed-calendar.ts`, `prisma/clean-calendar.ts`,
    `prisma/calendar-seed-data.ts`, `package.json` (test script only).
  - must not touch: `prisma/schema.prisma`, any migration (**no schema
    change is needed or permitted** — every fix is code-level),
    `src/lib/dal.ts`, `src/proxy.ts`, `src/lib/session.ts`, any other action
    file, `DESIGN.md`, `STRUCTURE.md` (Fury owns the amendments).
- **Fixes required — all 8 pass-1 blockers:** Captain B1 (no `User`
  writes/deletes in committed scripts), Captain B2 (types to
  `src/lib/types.ts`, cycle gone), Vision V1 (midnight-end leak), Vision V2
  (all-day invariant enforced + span clamped), Vision V3 (window edge
  visible), Strange S1 (loading frame must not say "No events"), Strange S2
  (band contrast to AA), Strange S3 (Day view stops truncating). Plus five
  folded notes in the same files: dead `{canManage && null}`,
  re-implemented `isSameDay`, vacuous-in-CI test timezone, overclaiming
  `HOUSEHOLD_TIME_ZONE` comment, duplicate weekday vocabulary.
  **The unifying insight:** V3 and S1 are the same lie from two causes —
  the app must distinguish **three** states, not two: loading (grey bars),
  genuinely empty (the crisp "No events" glyph), and outside the loaded
  window (its own treatment). Never collapse them.
- **Report:** DONE, all 8 fixed, no conflicts, no BLOCKED-ON-CONTRACT.
  Gauntlet **re-run by Fury**: tsc 0, eslint 0, **131/131 under
  `TZ=America/Denver` AND 131/131 under `TZ=UTC`**, build 0.
  Fury also verified the three claims a builder shouldn't be trusted on:
  `grep` shows the only `db.user` write/delete left in `prisma/` is
  `bootstrap-users.ts` (the sanctioned exception, untouched) — `seed-calendar`
  holds a `findMany` read only and `clean-calendar` zero `db.user` calls;
  the component graph is now a one-way tree (`CalendarViews → DaySection →
  EventCard`) with no type imported from a component; the loading branch
  renders `SkeletonBlock` and `NoEventsCard` survives only in the resolved
  branch; band alpha is **0.10** over `var(--surface)` in one shorthand;
  `prisma/tmp-*` gone.
  **Regression tests proven red-then-green**, as required: V1 failed
  `[4,5] vs [4]` and V2 failed `[] vs [9]` before the fix, both green after.
  **Contrast re-measured live** on a rendered card rather than recomputed:
  worst case **4.64:1** light (red) and 5.53:1 dark (amber), both clear of
  the 4.5 floor — the builder took the safer 0.10 rather than the 0.12 that
  landed exactly on it.

  **The builder found a real bug in its own first V3 fix by running it, not
  by reasoning** — and this one is worth remembering. Its first edge check
  compared `startOfDay(periodEnd)` against `startOfDay(windowEnd)`, which
  re-floors a *server*-built instant through the *browser's* local getters:
  exactly the trap `mealPlanDates.ts`'s own header warns about, hitting a
  window boundary instead of "today." Live, that made the Nov 1 week
  reachable but rendered "Outside the loaded range" on all seven days.
  Fixed twice over: compare raw `.getTime()` instants, and change the
  criterion from "this period's edge is past the boundary" to "the *next*
  candidate period's edge is past it," which guarantees every reachable
  period holds at least one loaded day.

  **Residual honest limit the builder volunteered:** the per-day
  "not loaded" card is implemented and was seen rendering correctly, but
  under the final boundary logic the day- and week-granularity edges happen
  to align on today's date, so that defensive path isn't reachable by a live
  path right now without contriving an artificial window. Recorded rather
  than dressed up as verified.
- **Verification:** the four gauntlet commands **plus** the same suite under
  `TZ=UTC` and `TZ=America/Denver`; a regression test per date blocker;
  seed/clean proven against look-alike rows; the window edge demonstrated in
  a browser at 375px.
- **Done criteria:** no `db.user.*` write or delete anywhere in `prisma/`;
  no component-to-component import cycle; the Nov 1 2026 seed event
  reachable or its absence visibly explained; every regression test fails
  before the fix and passes after.
- **Report:** —

### C6 — Fix contract: V4 (boundary-day lie) + the window-predicate hoist
- **Status:** DONE
- **Boundaries:**
  - may touch: `src/lib/calendarDates.ts`, `src/lib/calendarDates.test.ts`,
    `src/components/CalendarViews.tsx`, `src/components/DaySection.tsx`,
    `src/app/(app)/calendar/page.tsx` (only if the padded-fetch alternative
    is chosen; the client must still receive the unpadded bounds).
  - must not touch: `prisma/**`, `src/app/actions/**`, `EventCard.tsx`,
    `loading.tsx`, `types.ts`, `mealPlanDates.ts`, constitutions.
- **Objective:** a day is "loaded" only when the fetch window fully
  contains it; a day outside the window always shows `NotLoadedCard`, even
  if some overlapping rows were fetched; Next uses the same predicate.
- **Verification:** TZ-pinned regression test that fails before / passes
  after (`windowEnd = 2026-11-01T00:00Z`, day Oct 31 America/Denver →
  outside); both predicates live in `calendarDates.ts` with tests; browser
  reproduction of Vision's Halloween scenario showing `NotLoadedCard` on
  Sat Oct 31 in a Mountain browser; gauntlet under both timezones.
- **Done criteria:** no day can render "No events" while a row for that
  day exists in the database; `NotLoadedCard` reachable at both edges.
- **Report:** DONE. `isOutsideWindow` (full containment; equal end counts as
  inside) and `canStepToPeriod` now live in `calendarDates.ts:223-262` with
  the instant-reinterpretation warning moved into their doc comments;
  `CalendarViews.tsx` lost its inline copy and its 25-line comment and
  **shrank 279 → 262**; `DaySection.tsx` renders `NotLoadedCard` whenever
  the day is outside the window, alongside any fetched cards. Predicate
  tightening chosen over the padded fetch, so `page.tsx` is untouched.
  **Regression red-then-green, verbatim:** `not ok 26 … false !== true`
  against the old start-only logic, then 135/135 — under both `npm test`
  (Mountain) and `TZ=UTC`. Fury re-ran all four gauntlet commands plus the
  UTC suite: identical.
  **Browser reproduction, before and after, no stubbing** — today's real
  ±60-day window puts `windowEnd` exactly at `2026-11-01T00:00Z`, so
  Vision's scenario needed no contrivance: a hand-inserted 7 PM Oct 31
  Mountain event, Denver-timezone Chromium, eight Nexts to Oct 25–31.
  Before (components stashed back to origin): `SAT 31 / No events`. After:
  `SAT 31 / Outside the loaded range`. In a UTC browser the mission's own
  Nov 1 seed row was hidden behind `SUN 1 / No events` before; after, the
  Nov 1–7 week is **unreachable** (Next disables one click earlier) because
  full containment flags Nov 1 itself — a stronger guarantee than showing
  the caveat. `NotLoadedCard` reached live at **both** edges in Denver
  (Oct 31 forward; Jun 28–Jul 3 backward with Prev disabled).
  **One technique for Vision to scrutinize, flagged by the builder itself:**
  the V4 test uses a `withTimeZone()` helper that sets `process.env.TZ` for
  one test and restores it in a `finally`, relying on Node re-reading `TZ`
  for subsequent local `Date` getters — verified empirically with a
  throwaway `node -e` before use, and the only test in the file that needs
  it. Three one-off `User` ids created and deleted; counts back to 0/0/0;
  scratch removed; exactly the four allowed files changed.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | **BLOCK** | 3 | 7 notes; all blockers reproduced with output |
| 1 | Strange | **BLOCK** | 3 | 7 notes; all measured, not eyeballed |
| 1 | Captain | **BLOCK** | 2 | 7 notes; gauntlet re-run clean, no boundary violations |
| 2 | Vision | **BLOCK** | 1 | V1, V2 RESOLVED; V3 partial — boundary day still lies |
| 2 | Captain | **PASS** | 0 | both pass-1 blockers RESOLVED; 10 notes |
| 2 | Strange | **PASS** | 0 | S1–S3 RESOLVED, re-measured; 11 notes |
| 3 | Vision | **PASS** | 0 | V4 and C7 RESOLVED, re-derived; 5 notes |
| C4-1 | Vision | **PASS** | 0 | write path attacked end to end; 2 notes |
| C4-1 | Captain | **PASS** | 0 | all three mandates DONE; 9 notes routed to K2/K3/K4 |
| C4-1 | Strange | DISPATCHED | — | **first gate on Opus** (tier change `cc98b33`) |

Budget: 3 passes per gate, then STOP and surface.

### Vision pass 2 — BLOCK (1 blocker, 8 notes)

Gauntlet re-run: tsc 0, eslint 0, **131/131 under both timezones**, build 0.
Boundary audit clean; `git show --stat 75d65bb -- prisma/schema.prisma
prisma/migrations` empty. **The red-then-green claim was re-derived, not
read**: Vision extracted the pre-fix module from git and ran the same 23
cases against both versions — pre-fix `[9/4, 9/5]` / `[]`, fixed `[9/4]` /
`[8/9]`, identical under Mountain and UTC.

**V1 RESOLVED.** 8 PM → midnight covers one day labelled "8 PM – 12 AM".
Every edge the fix introduced holds in both timezones: zero-length at
midnight, midnight→midnight, multi-day ending at midnight (with a 12:01 AM
control correctly staying 3 days), Oct 31→Nov 1, Nov 1 1:30 AM (the
ambiguous fall-back hour)→Nov 2, and the March spring-forward.

**V2 RESOLVED.** Validation refuses `endAt === startAt` on create *and*
update and accepts legitimate one-day and three-day all-day events. The
clamp was proven **independently of the validation**: a degenerate row
written straight to the database with Prisma rendered as exactly one card
in both a Mountain and a UTC browser; the pre-fix module gives `[]` for the
same row.

**V3 PARTIALLY RESOLVED — the residual is the new blocker.** The
whole-period lie is gone: Next disables at Oct 25–31, Prev at Jun 28–Jul 4,
the Nov 1–7 week is unreachable, and the code compares raw `.getTime()`
against the *next* candidate period exactly as the builder claimed. But:

**V4 (BLOCKER) — the boundary day still renders "No events" over a real
row.** `CalendarViews.tsx:153,161-164` calls a day "loaded" when its
**start** is inside the window, but the query fetched only up to
`windowEnd`, which is the *server's* midnight — **6 PM Mountain**. Reproduced
with no stubbing: a "Halloween Party 7 PM Oct 31" row confirmed in the table
by `psql` at the same instant, and the Mountain browser shows **`Sat 31 —
No events`** in both Week and Day. In production this silently drops every
evening event on the 60th day out, and the day looks honestly empty. Second
manifestation at the back edge: Jul 3 renders as a normal complete day
holding one 8 PM event while a 9 AM event on the same day is in the table
and absent — a day whose start is outside the window but that received one
overlapping row presents as complete, because `DaySection` shows
`NotLoadedCard` only when `events.length === 0`. And in a UTC browser the
**mission's own Nov 1 seed row** is the victim: `Sun 1 — No events`.
Fix, specified by Vision: define "loaded" as **full containment** —
`isOutsideWindow(day)` is true when the day's start precedes `windowStart`
*or* the day's end exceeds `windowEnd` — use the same predicate for Next
(Prev is already right), render `NotLoadedCard` whenever a day is outside
the window **regardless of whether any events were fetched for it**, hoist
both predicates into `calendarDates.ts` (Captain asked for the same), and
add a TZ-pinned regression test (`windowEnd = 2026-11-01T00:00Z`, day =
Oct 31 in `America/Denver` → outside).

**Item 4 ruling — the builder's "unreachable" claim was wrong: (b) and
(c).** In a Mountain browser, Prev to Jun 28–Jul 4 renders "Outside the
loaded range" on Jun 28–Jul 2 live, no stubbing; in a UTC browser Next
reaches Nov 1–7 with it on Nov 2–7. The "edges align on today's date" claim
holds only when the boundary day is a Saturday (forward) or Sunday (back);
the builder saw one edge align and generalized. **Keep the card**; after V4
it becomes reachable at both edges.

**Notes:** a timed midnight→midnight event now reads "12 – 12 AM" on one
day (coverage right, label odd — C4's form should steer that case to
all-day); an all-day event with non-midnight instants passes validation and
renders via the clamp (harmless, but validation does not enforce midnight
alignment); Day view can step through fully-outside days after a Week→Day
switch, each honestly showing `NotLoadedCard`. **Seed/clean re-verified on
the rewritten scripts** including six look-alike survivors and byte-
identical `User` rows. **Security suite re-run on the changed action
file**: positive control first, then kid / no-cookie / deactivated /
forged-admin / wrong-secret / v1-shaped cookies all refused with counts
unchanged. Baseline restored, scratch removed.

### Vision, C4 pass 1 — PASS (0 blockers, 2 notes)

Gauntlet re-run: tsc 0, eslint 0, 135/135 both timezones, build 0 with all
three calendar routes dynamic. Boundary clean (12 files, `loading.tsx`
correctly untouched, `actions/calendar.ts` byte-identical since C5,
`package.json`/lock untouched). Spot-checked the builder's own claims and
matched all three — including noticing the report quoted the all-day
`endAt` in local time where the database holds `2026-09-13T06:00:00Z`, the
same instant.

**The write path, positive control first, every case reproduced:**
- **Pages:** admin/parent → 200 with the form; kid → a *page* redirect
  (`NEXT_REDIRECT;replace;/calendar`, no form in the response); no cookie
  and deactivated parent → `/login`; a forged admin cookie signed with the
  wrong secret → `/login`; a missing id → 404 for an admin, redirect for a
  kid (gate first, then lookup). No `redirect()` anywhere in the action
  file, per the guard-form rule.
- **Tampered payloads from a parent:** `createdById` in the body ignored
  (the row's creator is the session, not the claim); nonexistent `userId`
  refused with no row; duplicate `userId` → clean create with exactly one
  person row; `endAt < startAt` refused; zero-length all-day refused; empty
  title refused; a 10,000-character title and notes → clean create,
  persisted whole, no throw and no partial write.
- **All-day exclusive end, built by the form:** Sep 10–12 → exactly Thu/
  Fri/Sat with no leak to Sunday; **Oct 31–Nov 2 across the DST fall-back**
  → `startAt 06:00Z`, `endAt Nov 3 07:00Z` (the offset changes mid-span)
  covering exactly three days; a timed 8 PM Denver event renders on its own
  Saturday, not the next UTC day.
- **Edit fidelity:** a title-only edit left `startAt`/`endAt`/`allDay`/
  `location`/`notes` byte-identical with only `updatedAt` advancing; a
  people-only edit produced exactly the new set with **zero orphan person
  rows**.
- **Delete:** single tap removes the event and cascades its people; an
  already-deleted id returns the house shape; a kid's sheet exposes no Edit,
  no ⋯, no Add.
- **The hook the builder flagged for scrutiny:** SSR emits no date/time
  inputs (server snapshot `null`) and there is **no hydration warning**;
  the default really tracks the browser clock (9:07 PM → 22:00–23:00,
  11:07 PM → midnight next day, 9:00 PM → 21:00 exactly); and the
  `start === null` guard held — a user's typed 14:30 survived a 31-second
  clock tick rather than being re-seeded.
- **`createdByNames`** comes from the page's single `findMany` (no second
  query), never selects `passwordHash`, and a null creator after `SetNull`
  renders the sheet without an "Added by" line rather than crashing.
- **`EventCard` as a button:** zero nested buttons, focusable, Enter and
  Space open the sheet; the sheet's `view` machine steps `menu` → `main` on
  the first Escape and closes on the second.
- **C7's rule survived C4's heavy edit** of `CalendarViews.tsx`, and item
  8a works: with a clock 61 days ahead, `today` is outside the window and
  Prev stays enabled, so at least one control escapes.

**Notes:** the all-day → timed toggle defaults to a fixed 9–10 AM rather
than re-reading the clock (intentional, from a click handler, reviewable
before Save); and there is **no length cap** on title or notes — 10,000
characters persist cleanly, which Vision judged acceptable rather than a
defect.

### Captain, C4 pass 1 — PASS (0 blockers, 9 notes)

Gauntlet re-run: tsc 0, eslint 0, 135/135, build 0. Import-graph scan over
all 84 files in `src/components/`: **0 cycles**; the calendar subtree is a
tree. `passwordHash` never named by any new select. `package.json`/lock
diff empty. Boundary: 12 of 14 files on the may-touch list, the other two
Fury's records.

**All three mandates DONE, verified from the diff rather than the
report:** every class string in the extracted header reappears verbatim,
so pixel identity is *plausible from the code* and not only from the
builder's screenshot diff; `disabled={today === null || …}` became
`disabled={!todayResolved || …}` with the same boolean; one `ActionCircle`
definition in `src/`, the calendar superset, Recipes' three call sites
pass no `disabled` so nothing changed for them; `CalendarViews.tsx` 307
against the no-extraction prediction of 350–380.

**Rulings on the deviations the builder flagged:** importing `type
CalendarEventInput` from the `"use server"` action file is **the
sanctioned way** (erased at compile time; precedents `RecipeFormState`,
`TagInfo`) — do not copy it into `types.ts`. The page guards are correct
(pages redirect; they skipped `requireRole` because it hardcodes a bounce
to `/` and a kid belongs on `/calendar`). The local minute hook satisfies
the written `useSyncExternalStore` rule; placement is a low-priority note.
The adjust-state-during-render seed is Vision's question, not structure's.

**Notes, routed by phase:**
- **K2:** fold `createdByName` into `CalendarEventView` (the parallel map
  keyed by event id is a second structure that must stay in sync, and
  Month → Day-tap → sheet would thread it through a third component);
  export `toLocalDateString` from `mealPlanDates.ts` and `calendarDayDiff`
  from `calendarDates.ts` and collapse the **four** copies of the same
  `YYYY-MM-DD` formatter C4's `src/lib` exclusion forced (the "different
  vocabularies" comment doesn't hold — `new/page.tsx` parses the param
  byte-for-byte); new date tests in `monthLayout.test.ts`, since
  `calendarDates.test.ts` is at 349 and **test files are not exempt from
  the cap as written**; extract the three empty-state cards to
  `CalendarEmptyStates.tsx` if Month reuses any.
- **K3:** `EventForm.tsx` at **346 is a split candidate on day one** — the
  seam is the date/time block (`DateTimeRow` + three converters +
  `daysBetween` + the Starts/Ends rows, ~110 self-contained lines) →
  `EventDateTimeFields.tsx`, leaving the form near 240. Projection without
  it: ~420 after K3's tags + Sync-to, ~490 after K4's Repeats. **K3 must
  shrink it before growing it**, the same order C4 was held to. Also make
  `DaySection.onOpenEvent` required (its comment already says so).
- **K4:** Repeats goes in `EventRepeatsFields.tsx` from the start.
- **Whenever `useToday.ts` is next edited:** hoist the minute hook to
  `src/lib/useNow.ts`.
- **Amendment applied** (autonomy): test files follow the soft cap, split
  by module under test.

### Vision pass 3 — PASS (0 blockers, 5 notes) — the read path is fully gated

Gauntlet re-run: tsc 0, eslint 0, 135/135 under both timezones, build 0.
Boundary audit clean (`page.tsx`, `actions/calendar.ts`, and `prisma/`
all byte-identical since pass 2, confirmed by diff, so the security suite
and look-alike test were correctly not repeated).

**V4 RESOLVED — re-derived, not read.** The old start-only predicate,
recovered from git, returns `false` (the lie) on the Halloween inputs;
`isOutsideWindow` returns `true`. Live in a Denver production build: Sat 31
renders the not-loaded card **alongside** the fetched 10 AM event, no
"No events", no 7 PM card; the back-edge case (Fri 3 with one fetched 8 PM
row and one un-fetched 9 AM row) shows the caveat alongside the fetched
card. Exact-fit boundary proven to the millisecond in both directions. DST:
Nov 1 2026 measured as a 25-hour day in Denver; the true local end is
inside, the naive start+24h answer is outside; a window edge inside the
repeated 1 AM hour flags the right day. `withTimeZone()` proven on Node
v22.22.2 — set takes effect immediately, restore works, a thrown assertion
inside still restores via `finally`, no leakage path.

**C7 RESOLVED.** Strand reproduced and escaped live (Wed Jul 1: Prev
disabled, Next enabled → Jul 2 → Jul 3 → Jul 4 loaded). Toward-today
overshoot shown impossible with sane clocks; Day forward walk stops after
exactly 58 Nexts at Fri Oct 30 and backward after exactly 60 Prevs; SSR
frame with `today === null` has both arrows `disabled`.

**Notes, folded into C4 where they belong:** (1) a client clock ≥61 days
*ahead* of the server strands all three controls (today itself is outside
the window, so both directions are "away") — needs a broken device clock,
every card says why, fix is "when `isOutsideWindow(today)`, permit the step
toward the window"; (2) the `withTimeZone()` doc comment overclaims — Node
re-reads `TZ` for `Date` getters but **not** for the module-level
`Intl.DateTimeFormat` instances in `calendarDates.ts:37-45`, which freeze
their zone at construction (proven: `formatTimeRange` inside the helper
returns the ambient zone's label) — harmless today since the V4 test only
calls `isOutsideWindow`, but one sentence in the comment prevents a future
test silently asserting the wrong zone; (3) K2's Month grid gets
`isOutsideWindow` as a one-import reuse; (4) `NotLoadedCard` still
visually identical to `NoEventsCard` — C4 step 6d; (5) both fix commits
also touched the mission file, Fury's own record, inert to the build.

### Strange pass 2 — PASS (0 blockers, 11 notes)

Gated `60ca91b` from a production build, with five real-shaped people
(Bryce/Emily/Eleanor/Ledger/Lucy) so the colliding initials were exercised.
All fixtures deleted by id; counts 0/0/0; scratch gone.

**S1 RESOLVED.** Streamed `loading.tsx` frame and the hydration-null frame
both contain **zero** occurrences of "No events"; seven rows at **82px** in
every frame (loading, null, resolved-empty) — the no-shift property
survived the vocabulary fix. Loading is grey bars; empty is a dashed crisp
glyph; distinct in both themes.

**S2 RESOLVED.** Re-measured on rendered cards two ways — `getComputedStyle`
composites *and* screenshot pixel sampling — all 8 colors, both themes.
Worst `--muted` over band: **4.63** light (red) / **5.52** dark (green);
sampled 4.60 / 5.47. All 16 pairs clear 4.5. (A first sample read 3.87 and
was correctly discarded: it hit the border stroke inside a rounded corner,
not the band.) The bands at 0.10 still read as a split on a 2-person card,
"but it is a whisper", and dark-theme slate (ΔE 2.5) is effectively
invisible — no semantic loss, since the 28px badges carry identity. If
Skylight-strength bands are ever wanted, move the color off the text's
backdrop (a full-opacity left-edge stripe per person), never raise alpha.

**S3 RESOLVED.** 5-person long title in Day: 4 line boxes, no clip, at 375;
7 lines at 320. Week: same card truncates to one line.

**The instruction C4 was waiting for (verbatim, replaces the placeholder):**
"No opacity value keeps a tappable past card honest" — 0.55 measures
2.62:1, and raising it to 0.80 still leaves the muted time line at 3.53.
Opacity is the wrong tool. Remove `opacity-55`; when past, render the title
`text-muted font-normal` (5.38 light / 6.12 dark) and halve the band alpha
to 0.05 so the tint drains; leave `AvatarBadge`s at full color (identity,
not state). No `line-through` (that vocabulary means cancelled).

**Also for C4, treat as required:** Day view still truncates the
**location** line (`EventCard.tsx:76`) — same plan intent as S3, one line
below the fix; honest ellipsis today, becomes a blocker if C4's sheet omits
location. Week badge strip at 5 people is **49%** of the row at 375, 60% at
320: use `line-clamp-2` on Week titles and overlap-stack the badges with a
surface ring; **never** cap with "+N" — five people is the whole household.

**Third-state findings (notes, not blockers):** `NotLoadedCard` is verbally
distinct but **visually identical** to `NoEventsCard` — same dashed border,
fill, text, height — so seven dashed cards on Oct 25–31 scan as seven empty
days until the last is read. Suggested: solid `bg-surface-2` fill, no dash,
a 16px `CalendarOff` glyph. Wording "Outside the loaded range" is developer
vocabulary with no next step; suggested "Not all events loaded" with a
`text-xs` hint naming the two-month window and Today. Disabled arrows are
clearly distinct (1.70 vs 4.75) at 44×44, but nothing says *why* paging
stopped.

**The one that gets fixed before Vision's last pass — Day view can strand
the user with both arrows dead.** Denver browser, Prev ×9 to Jun 28–Jul 4,
switch Week→Day: lands on Wed Jul 1 with Prev *and* Next disabled; only
Today or the switcher gets out. Cause: `canStepToPeriod` refuses every
candidate outside the window, including steps *toward* today. Fix: only
refuse steps that move *away* from today. Honest (the card says why), but a
dead end, and a two-line change in a file no gate is currently reviewing —
so it is C7, batched ahead of Vision pass 3 rather than left for C4.

**Both edges re-verified honest in Denver**: forward, Sat 31 shows the
caveat above a fetched 10 AM event with the 7 PM one correctly absent;
back, Fri 3 shows the caveat above a fetched 8 PM event with the 9 AM one
absent; Sun 25–Fri 30 correctly "No events". Hygiene clean: tokens only,
targets 44/56, nav clearance unchanged.

### Captain pass 2 — PASS (0 blockers, 10 notes)

Re-derived both of its own blockers rather than accepting the C5 report, and
confirmed independently that `git show 75d65bb -- prisma/schema.prisma
prisma/migrations` is **empty** (C5 honoured the no-schema-change boundary)
and that `bootstrap-users.ts` is untouched (0 lines changed).

**B1 RESOLVED.** `grep -rn "db\.user" prisma/` returns four hits: three in
the sanctioned `bootstrap-users.ts`, and one `findMany` read in
`seed-calendar.ts`. `clean-calendar.ts` has zero `db.user` calls.
Captain went further and judged the *new* shape on its merits, as asked:
"a seeder that borrows real people is strictly safer than one that owns fake
ones, because the only table it can damage is the one it fingerprints." On
the dev branch the events will attach to Bryce and Emily, which is fine for
a disposable snapshot, and clean-by-title removes them regardless of whose
row they hung on.

**B2 RESOLVED.** The component graph is now a tree
(`CalendarViews → {RadioSheet, DaySection}`, `DaySection → {EventCard,
Skeleton}`, `EventCard → {AvatarBadge}`); `src/lib/` imports nothing from
`app/` or `components/`. Captain ruled `src/lib/types.ts` is the correct
home — it already holds exactly this kind of server→browser shape, and K4's
`recurrence.ts` should put its occurrence type there too. If calendar types
ever outgrow it, the sanctioned move is a `src/lib/calendar/` directory,
never back into a component.

**All five folded notes verified**, including that `mealPlanDates.ts` gained
**exactly** one export (+7 lines, nothing else) and that `constants.ts`'s
change was comment-only — both boundary limits C5 was held to.

**A live environment defect Captain hit while gating, worth acting on:**
`tsc` and `npm run build` were **red in the container during its pass**, and
only because Vision's git-ignored scratch file (`prisma/tmp-vision/`) sits
inside `tsconfig.json`'s `**/*.ts` include. Nothing in the reviewed diff is
red — `tsc` with `prisma/tmp-*` excluded exits 0. This is not this mission's
defect, but it means **any agent's scratch script breaks the typecheck for
everyone sharing the container**. One-line follow-up: add `"prisma/tmp-*"`
to tsconfig's `exclude`. Worth doing after the gates clear, not during.

**Notes to fold into C4** (Captain's firm recommendations):
- **Mandate the `CalendarHeader.tsx` extraction up front**, not later.
  Re-measured sizes: `CalendarViews.tsx` grew 21% in a *fix* pass, 230 → 279,
  and C4 realistically adds 70–100 more, landing 350–380 *before* K2's Month
  branch and K3's filter sheet. Extracting the header (~75 lines) plus
  Note 2's lib hoist lands it near 200 with room to grow. "Waiting means K2
  inherits a 380-line shell and extracts under pressure."
- **Hoist the window-edge date logic into `calendarDates.ts`** as
  `isOutsideWindow(day, window)` / `canStep(period, direction, window)` with
  TZ-pinned tests. Captain agreed passing `windowStart`/`windowEnd` as props
  is the right seam, but the *decisions* made from them are pure date logic
  sitting in a client component behind a 25-line comment — and K2's Month
  grid needs the identical per-cell test across 42 cells, so it will
  otherwise copy it.
- **Hoist `ActionCircle`** to a shared component; the drift is now concrete
  (the calendar copy has `disabled`, the recipe copy doesn't) and the
  calendar version is a strict superset, so it's a zero-behavior move.
- Two small factual fixes: `seed-calendar.ts`'s `orderBy` has no tiebreaker
  though its comment promises determinism (add `id`), and
  `HOUSEHOLD_TIME_ZONE`'s newly-corrected comment cites the **wrong phases**
  (says K5/K6 recurrence and notifications; recurrence is K4 and
  notifications are explicitly skipped).

**Boundary audit:** 15 of 16 files in `75d65bb` were on C5's may-touch list.
Two were not: `loading.tsx` (an 8-line comment-only correction of a comment
S1 had made false — necessary, but unauthorized by my contract) and the
mission file (mine). Recorded so the contract record matches the commit.

**Both STRUCTURE.md amendments stand**, with amendment 1 rewritten to
codify the attach-to-existing pattern as the sanctioned one. Still owed to
Bryce alongside the plan-vs-build tag-table deviation.

### Strange pass 1 — BLOCK (3 blockers, 7 notes)

Reviewed 19 screenshots across 320/375/1024, light and dark, including the
streamed loading frame (DB query stalled with a table lock) and the
hydration-null frame (React chunks aborted). Seeded four profiles named
**Emily / Eleanor / Ledger / Lucy** to exercise the real colliding initials
Fury flagged. All throwaway rows deleted, counts read back at zero, tree
clean.

**S1 — the loading frame literally says "No events" for every day.**
`DaySection.tsx:64` renders the real `NoEventsCard()` inside its `loading`
branch, so the streamed HTML asserts seven empty days while Wednesday is
about to show three events. **This overturns the thing Fury praised.** The
"identical by construction" trick satisfied my no-layout-shift requirement
by making loading and empty *the same component* — and this repo's own
dashboard lesson is that loading is grey bars and nothing is a crisp glyph,
precisely so the two can't be confused. Both requirements are satisfiable:
a 46px `SkeletonBlock` (the measured `NoEventsCard` height) keeps the 82px
row and the no-shift property while restoring the distinct vocabulary.

**S2 — `--muted` text over the color bands fails AA in light theme.**
Measured over the rendered tint across all 8 avatar colors: worst case
**3.77–3.93:1** against a 4.5 floor, for the time range, "All day"/"Day N
of 3", and the location line at 14px. `--fg` passes (5.53–5.76); dark theme
passes (5.75–6.06). `EventCard.tsx:83-86` claims the alpha was chosen so
text stays readable "without a per-color contrast check" — measured, that
holds for the title only. Strange computed the fix rather than guessing:
paint the bands over `--surface` and drop alpha 0.16 → 0.12, giving worst
case **4.50** light / 5.41 dark, and noted 4.50 is the floor with no margin
(prefer 0.10 if the bands still read).

**S3 — Day view truncates titles, which is the one thing Day view exists
for.** The plan's Day design is "room spent on full titles, location";
`EventCard.tsx:46` applies `truncate` in both views. Measured on a 5-person
card in Day view: the title gets **149px and needs 223px** — so a
whole-family event shows ~17 characters in the view built to read it, with a
screen of empty space below.

**Notes worth knowing:** Week's badge strip takes up to 49% of the card at
5 people, so real titles like "Ledger's birthday party" will not fit;
past-event `opacity-55` measures fg 2.36:1 and shares its vocabulary with
the *disabled* Today circle, which becomes a real falsehood at C4 when cards
turn tappable; the colliding-initials judgment came back honest — two
swatches are clearly different at 28px, but the card cannot say *which* E,
which is exactly why C4's sheet must carry names; Day view never renders
`notes` though it is fetched; and the `ActionCircle` duplication was
confirmed independently of Captain.

**Independent confirmation of Vision's V3:** Strange found the Nov 1 DST
week renders seven consecutive dates but shows "No events", because the
seeded DST event falls just outside the ±60-day window. Two gates reached
the same defect from opposite directions — the strongest kind of finding.

### Vision pass 1 — BLOCK (3 blockers, 7 notes)

Re-ran the gauntlet (tsc 0, eslint 0, 128/128, build 0) **and then re-ran the
tests under `TZ=America/Denver`** — see the CI note below for why that
mattered. Boundary audit across all 16 changed files: clean. Migration read
in full: additive. Every C1/C3 evidence claim spot-checked and matched.

**How the security claims were actually proven.** The calendar actions have
no server reference in the build yet (nothing imports them until C4), so
they are unreachable over HTTP today. Vision called the real functions
in-process with real cookies minted by the app's own `encrypt()`, positive
control first. Parent creates (people rows +2, `createdById` from session);
kid create/update/delete all refused with the database unchanged; no cookie
refused; deactivated user refused; **a forged JWT claiming `role: admin` for
a kid's id refused** (the DAL re-reads the row, so the cookie's role claim is
inert). Nonexistent, deactivated, and duplicated `userId`s all handled;
client-supplied `createdById` and `id` both ignored. Validation, missing-row
handling, and cascade cleanup all confirmed. Kid read path confirmed against
the running server: 200 with `canManage: false`; no cookie → 307.
The clean-script safety test ran on a **sibling database** seeded with
look-alike rows (`zzz test alice`, `ZZZ Test`, `ZZZ Test Alice Jr`): all 5
survivors survived, all 3 look-alike events survived, exact seed rows gone.

**V1 — a timed event ending exactly at local midnight leaks onto the next
day and loses its time label.** `calendarDates.ts:112`. Reproduced: an event
entered as Sep 4 8:00 PM → Sep 5 12:00 AM — the natural way to enter "ends
at midnight" — renders a card on **both** days reading "Day 1 of 2" /
"Day 2 of 2", and the correct string "8 PM – 12 AM" is never shown. An end
instant of exactly midnight belongs to the day it closes, not the day it
opens.

**V2 — the exclusive-end invariant is documented in the schema but not
enforced by the write path.** `actions/calendar.ts:74-80`. An all-day event
posted with `endAt === startAt` — precisely the "caller passes an inclusive
end" case C2's own report worried about — is **accepted and saved**, then
covers zero days and is **invisible in every view forever**. C4's contract
forbids touching `calendar.ts`, so if C4 makes this exact mistake nothing
catches it. Needs both layers: reject it in validation, and clamp the span
so a degenerate row still renders as one day rather than vanishing.

**V3 — paging past the ±60-day window prints "No events" on days that have
events.** `page.tsx:15,46-47`. Vision escalated the question I asked it to
rule on, and it is right to: this is not a missing feature, it is the UI
stating something false. The proof is damning because it uses **this
mission's own seed data** — the Nov 1 2026 daylight-saving event sits
*outside* the window, so the page returns 200 with the near event present
and that one absent. Tapping Next to that week shows "No events" while the
row is in the database. Any event more than 60 days out (Thanksgiving, the
first day of school) fails identically. A limit has to be visible to be
honest: either disable paging at the window edge or render a distinct
"not loaded" state — never the empty-day card.

**Notes worth acting on:** `npm test` runs in the process timezone, and both
this container and GitHub Actions are **UTC**, where the Nov 1 2026 DST test
never crosses a DST boundary at all — it has been vacuous in CI. `isPast`
receives local midnight, so dimming is day-granular: at 9 PM this morning's
appointment is still undimmed. A multi-day *timed* event shows only
"Day N of 3" and never its times. `HOUSEHOLD_TIME_ZONE` confirmed dead
(matches Captain independently). Non-`Date` inputs throw instead of
returning the house shape.

**Process note — Fury's error, repeated from this project's own history.**
Vision found the shared database holding Strange's in-flight credentialed
rows, so "counts back to baseline" was unverifiable there and it had to
build a sibling database to test the clean script. CLAUDE.md already records
this exact lesson from the accounts work: **gates that create credentialed
test data must run serially, or own disjoint self-identifying accounts.** I
dispatched three gates in parallel anyway. Pass 2 runs Vision and Strange
serially.

### Captain pass 1 — BLOCK (2 blockers, 7 notes)

Re-ran the gauntlet himself (tsc 0, eslint 0, 128/128) and audited every
commit against each contract's boundaries: **no boundary violations** — C2
touched only its two files, C1 only its may-touch list plus exactly the two
allowed `User` back-relation lines, C3 only its five.

**B1 — `db.user.deleteMany` / `db.user.create` in committed `prisma/`
scripts.** `clean-calendar.ts:29-31` and `seed-calendar.ts:90`. STRUCTURE.md's
layout map and danger register both forbid a clean/reset script touching
`User`. Captain ruled a *fingerprint-scoped* delete is **inside** the
prohibition, and the reasoning is what makes it convincing rather than
literalist: it is a committed rerunnable script rather than a one-off;
it matches on `displayName`, which carries **no `@unique`**, so the `in [...]`
can match rows the seed never created — including a same-named row that
later gained a `passwordHash`; and the seeder *writes* `User` rows too, so
both halves target the table the rule names "above all."

**⚠️ This is Fury's defect, not Stark's.** The C1 contract explicitly
instructed the builder to create and delete its own `ZZZ Test` users, and
the builder followed it exactly and flagged the tension in its report. The
contract was wrong. Recorded here so the pattern is not repeated: a contract
may not authorize what the danger register forbids, and "there is no family
data in this container" is a fact about *this* container, not about the
committed script that outlives it.

**B2 — the first component-to-component import cycle in the codebase.**
`DaySection.tsx:2` and `EventCard.tsx:4` import `CalendarEventView` from
`CalendarViews.tsx`, which imports them back. STRUCTURE.md: "No cycles,
ever." Type-only, so erased at runtime and harmless today — Captain said so
plainly rather than inflating it — but it is a cycle in the module graph and
exists only because `src/lib/types.ts` sat outside C3's boundary. Another
contract artifact of mine.

**Notes worth acting on now** (Captain's, condensed): `DaySection.tsx:71-74`
re-implements `isSameDay` that `mealPlanDates.ts` already exports;
`WEEKDAY_NAMES` is a second weekday vocabulary that K2's Month header will
otherwise copy a third time; `CalendarViews.tsx:206-230` is a second private
`ActionCircle` already drifting from `RecipeActionCircles.tsx`'s;
`HOUSEHOLD_TIME_ZONE` has **zero** consumers and its comment overclaims that
call sites exist; `{canManage && null}` is a NOTE, not a blocker, with a
cleaner alternative (keep it in the props *type*, don't destructure it).
Size trend: `CalendarViews.tsx` lands 360-410 by K3 — extract the header row
at C4.

**Two STRUCTURE.md amendments recommended, with exact wording supplied** —
tightening the `User` danger bullet to name fingerprint-scoped deletes, and
clarifying that the `personInfo.ts` one-source rule's real edge is
`passwordHash` (a narrow select that never names it is fine, which is what
`login/page.tsx` and `dal.ts` have always done).

**Plan-vs-build note, for Fury:** `calendar-v1.md:113-114` said K1 ships the
tag tables and `exdates` so K3/K4 need no further migration; my C1 contract
explicitly excluded them. Deliberate deviation, but it was mine and it
contradicts the approved plan — resolve it explicitly rather than let the
plan quietly rot.

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
- 2026-09-02 — C1 committed and pushed (3a2f804). C3 DONE and Fury-verified
  (screenshot read, sizes checked, scratch confirmed clean). Next: commit C3,
  then dispatch Vision + Strange + Captain in parallel on C1-C3, with C4
  held until the gates rule — a blocker in the read path would otherwise be
  built on top of.
- 2026-09-02 — C3 committed and pushed (814404e). All three gates dispatched
  in parallel on C1-C3 (read-only, so parallel is safe). Each was handed the
  contracts, the builder reports, the gauntlet, the danger register, its own
  constitution, and Fury's two self-identified findings to rule on. **C4 is
  deliberately NOT dispatched**: it extends `CalendarViews.tsx` and
  `EventCard.tsx`, the exact files under review, so a blocker there would
  otherwise land under already-built write UI.
- 2026-09-02 — **Captain pass 1: BLOCK** (2 blockers, 7 notes). Both blockers
  trace to Fury's contract wording, not to builder error: C1 was *told* to
  create and delete `User` rows (danger-register violation), and C3 was
  denied `src/lib/types.ts`, forcing the type cycle. Holding fix contracts
  until Vision and Strange report, per the batch-fixes-before-re-gating rule.
- 2026-09-02 — **Vision pass 1: BLOCK** (3 blockers, all reproduced). Two are
  real date-logic defects (midnight-end leak; unenforced all-day invariant
  that silently saves an invisible event) and one is a false UI statement
  (paging past the window shows "No events" over real rows — proved with
  this mission's own Nov 1 seed event). Security surface held completely,
  including a forged admin role claim. Also: the DST test is **vacuous in
  CI**, which runs UTC. Fury process error recorded: parallel gates with
  credentialed data collided, exactly the lesson CLAUDE.md already carries.

- 2026-09-02 — **Strange pass 1: BLOCK** (3 blockers, measured not eyeballed;
  seeded real colliding-initial names to test it properly). S1 overturns the
  loading trick Fury praised — "identical by construction" made the loading
  frame *say* "No events" for seven days. S2 is a measured AA failure
  (3.77–3.93:1) on every event card in light theme. S3: Day view truncates
  titles, the one thing Day view exists for. Strange also independently
  reproduced Vision's V3 from the opposite direction.
- 2026-09-02 — **C5 dispatched: one batched fix contract covering all 8
  blockers** plus 5 folded same-file notes, per the batch-before-re-gating
  rule. Every date fix requires a regression test proven **red before, green
  after**. Schema and migrations explicitly out of bounds: all 8 fixes are
  code-level.
- 2026-09-02 — **C5 DONE: all 8 blockers fixed** (`75d65bb`). Fury re-ran the
  gauntlet independently (131/131 under both timezones, build 0) and
  re-verified the `db.user`, import-cycle, loading-branch, and contrast
  claims by reading the code. The vacuous-in-CI test problem is fixed at the
  root: `npm test` pins Mountain time, and the suite was proven green under
  UTC too.
- 2026-09-02 — **Pass 2 dispatched: Vision + Captain**, Strange deliberately
  held until Vision reports (pass-1 collision). Each gate told which of its
  own pass-1 blockers to re-derive and not to accept the C5 report or Fury's
  gauntlet run as proof.
- 2026-09-02 — **Captain pass 2: PASS.** Both blockers RESOLVED, 10 notes.
  Confirmed C5 touched no schema and left `bootstrap-users.ts` alone.
  Flagged the `prisma/tmp-*`-breaks-`tsc` container defect. Three firm C4
  recommendations: extract `CalendarHeader.tsx` up front, hoist the
  window-edge logic into `calendarDates.ts`, hoist `ActionCircle`.
- 2026-09-02 — **Recording defect, Fury's own.** The five entries above were
  written to this log on their original dates but never landed: each edit
  anchored on text inside an earlier bullet, the replace silently matched
  nothing, and the script printed "ok" regardless. The gate-verdict
  *sections* did land (they anchored on headings), so the facts were never
  lost — but the log claimed less than had happened, which is the exact
  doing-vs-recording gap this project has now been bitten by six times.
  Caught by grepping for each entry rather than trusting the commit. Every
  log edit from here asserts its anchor matched exactly once.
- 2026-09-02 07:2x UTC — **Vision's first pass-2 attempt died on an API
  session rate limit** partway through (the gates run on the Fable tier;
  the limit reset at 06:10 UTC). It had begun work — a `prisma/tmp-vision/`
  scratch directory with look-alike and preload scripts — but wrote nothing
  to the database (counts read 0/0/0) and touched no source. Scratch removed
  by Fury. Postgres had also stopped (container idle) and was restarted.
- 2026-09-02 — **Captain's container fix landed** (`4861fe1`):
  `prisma/tmp-*` added to `tsconfig.json`'s `exclude`. Proven rather than
  assumed: a deliberately type-broken file placed under `prisma/tmp-probe/`
  left `tsc` at exit 0. No gate's scratch can break another's typecheck
  again.
- 2026-09-02 — **Bryce granted full autonomy**: resolve blockers and
  choices by best judgment without asking; finish K1, then proceed through
  K2, K3, and onward; adversarial checks throughout. Consequences recorded
  here so a fresh session inherits the mandate: (1) the two STRUCTURE.md
  amendments and the tag-table plan deviation are now Fury's to decide, not
  to escalate; (2) K6/K7 still carry an external dependency — a Google Cloud
  project and OAuth consent screen only Bryce can create — so those phases
  build everything that doesn't need live credentials and stop at the exact
  point that does; (3) "no PR unless asked" still stands — autonomy is about
  building, not about opening review requests on his behalf.
- 2026-09-02 — **Vision pass 2 re-dispatched**, alone in the container;
  Strange still held.
- 2026-09-02 — **Vision pass 2: BLOCK** (1 blocker). V1 and V2 RESOLVED with
  the red-then-green claim re-derived from git. V3's residual (V4): the
  boundary day is called "loaded" by its *start*, but the fetch stops at the
  server's midnight = 6 PM Mountain, so evening events on the edge day
  vanish behind an honest-looking "No events" — reproduced with a row
  confirmed in the table at the same instant. Vision also overturned the
  builder's "unreachable" claim about `NotLoadedCard` by reaching it live.
  **Decision under autonomy:** fix V4 as C6 before Strange runs, so Strange
  gates the final read path once rather than twice. Pass 3 is the last.
- 2026-09-02 — **C6 dispatched** (V4 fix + window-predicate hoist into
  `calendarDates.ts`, red-then-green TZ-pinned regression test required).
- 2026-09-02 — **Autonomy decisions closed** (`eade7f8`): Captain's two
  STRUCTURE.md amendments applied verbatim (User-table rule now names
  fingerprint-scoped deletes and codifies attach-to-existing; personInfo
  rule's edge stated as `passwordHash`); calendar-v1.md's K1 entry now
  records that tag tables and `exdates` moved to K3/K4 deliberately. The
  tsconfig scratch exclusion (`4861fe1`) is the third of Captain's
  follow-ups, already landed.
- 2026-09-02 — **C6 DONE**, Fury-verified (gauntlet both timezones, 135/135,
  build 0, four files only, no scratch). Committing; Strange pass 2 next,
  then Vision pass 3 (last).
- 2026-09-02 — C6 committed and pushed (`60ca91b`). **Strange pass 2
  dispatched** on that HEAD, alone in the container: re-measure S1–S3, judge
  the new third state (`NotLoadedCard`) and the disabled paging arrows, and
  hand C4 a concrete instruction on past-vs-disabled opacity.
- 2026-09-02 — **Strange pass 2: PASS.** S1–S3 RESOLVED by independent
  measurement (two methods for contrast). Delivered C4's opacity instruction
  (opacity is the wrong tool; drain weight and tint instead) and three
  further C4 requirements (location wrap, badge strip, distinct
  `NotLoadedCard` glyph + plain-language copy). One note promoted to a
  micro-fix **C7** ahead of Vision pass 3: Day view can strand the user at
  the back edge with both arrows dead. Decision under autonomy: batching a
  known two-line fix before the last gate pass beats spending that pass on
  it.
- 2026-09-02 — **C7 DONE**, Fury-verified. Committing; **Vision pass 3 (the
  last in budget)** dispatched on the C7 head, alone in the container.
- 2026-09-02 — **Vision pass 3: PASS.** V4 and C7 RESOLVED by re-derivation
  (old predicate recovered from git and shown to lie; DST 25-hour day
  measured; `withTimeZone` proven on the real Node). **The read path is
  fully gated: Captain P2, Strange P2, Vision P3 all PASS.** Two small notes
  folded into C4 (skewed-clock strand; a comment overclaim about
  `Intl.DateTimeFormat` freezing its zone). **C4 dispatched.**
- 2026-09-02 — **C4 DONE**, Fury-verified, committed `ad2de84`. (The record
  for it missed its anchor on the first try and the code commit went out
  without it — caught immediately, fixed in the next commit. Anchor
  assertions work; they need the *whole* script to be atomic too.) Next:
  **Vision + Captain on C4 in parallel**, Strange after Vision.
- 2026-09-02 — **Captain, C4: PASS.** Mandates verified from the diff. Nine
  notes routed into mission-9 (K2) and forward to K3/K4; test-cap amendment
  applied to STRUCTURE.md under autonomy. Vision still running on C4.
- 2026-09-02 14:00 UTC — **Vision's C4 gate died on a session rate limit
  mid-run** (second time this mission; reset was 12:20 UTC). It had created
  its five verification people (Bryce/Emily/Eleanor/Ledger/Lucy) and four
  events and left `prisma/tmp-vision/`; no source touched, nothing
  committed. Fury cleaned up by exact id — 5 users, 4 events, scratch —
  counts back to 0/0/0. Recorded as a one-off by-id deletion of another
  agent's abandoned synthetic rows, the danger register's sanctioned path;
  the ids are in the container log above. Re-dispatching Vision on C4 with
  the same brief.
- 2026-09-02 — **Gate tiering changed** (`cc98b33`): Strange and Captain
  moved to **Opus**, Vision stays on **Fable**. K1 spent ~1.9M tokens on
  gates and lost ~7 hours of wall clock to two session rate limits;
  correctness gating is where raw capability converts into findings, while
  design and structure gating is measurement and rule-checking. Reasoning
  and the exit condition are written into the doctrine.
- 2026-09-02 — **Vision, C4: PASS.** Write path attacked end to end —
  page gates, seven tampered payloads, the all-day span across the DST
  fall-back, edit fidelity, orphan-row check, the hydration question on the
  new hook, keyboard and Escape behavior, and C7's rule re-verified after
  C4 rewrote the file. Two notes, neither a defect. **Strange dispatched —
  the first gate to run on Opus.**

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** —
