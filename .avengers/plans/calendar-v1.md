# Calendar v1 — DRAFT (K0 in progress, awaiting the Skylight walkthrough)

> Status: this is the planning skeleton agreed with Bryce on 2026-09-02, before
> any screenshots were reviewed. K0 (the walkthrough) turns it into the real
> plan by filling in the schema, per-view decisions, and per-phase file lists.
> Nothing below is built. Do not start K1 from this draft.

## Context

Bryce is ready to build the Calendar branch — the last placeholder on the nav
bar and, by his own earlier call, the hardest piece of the app. It is modelled
on **Skylight** (screenshots to come). Functionality he listed: color per
profile, Google sync, month/week/day views, parents+admin edit while kids
can't, meal plan shown on week/day views, filters (profile / event type /
meals on-off), and AI import via voice and photo. (Email import was in the
original ask and was dropped — see decision 6.)

This document is NOT the calendar plan. It is the agreed process for
producing that plan, the decisions already settled in this conversation, and
the phase skeleton the screenshot walkthrough will fill in. The output is
`.avengers/plans/calendar-v1.md` (house format, as in `dashboard-tiles.md`:
Context → decisions → Files → Data → hazards), then one Avengers mission per
phase, one PR each.

## Decisions settled with Bryce (2026-09-02) — don't re-litigate

1. **Process: all screenshots first, then one plan, then build phase by
   phase.** The RecMe precedent. Reason: the event schema serves every view
   plus Google's shape, and the live database only takes additive
   migrations — design the model once.
2. **Reference app is Skylight.** Skylight's "Magic Import" (forward an
   email or photo to the frame's address) is where the email-forwarding ask
   comes from; its per-member colors and calendar-with-meals view map onto
   what already exists here.
3. **Google: each parent links their own Google account(s); kids' events
   live only in Marshee.** A parent can link *several* accounts (Bryce:
   work + personal), so linking is a `LinkedCalendar` row under a `User`,
   many per user, never a field on `User`.
4. **Sync direction is a per-linked-account setting.** Work account =
   **outbound only** (Marshee → Google, so Emily can block time on Bryce's
   work calendar without his work appointments cluttering Marshee).
   Personal account = **two-way**.
5. **Sync is per event, chosen at create time.** The create/edit sheet
   shows a toggle list of the household's linked accounts ("Sync to: ☐
   Bryce work ☐ Bryce personal ☐ Emily personal"); each ticked account
   gets a copy. Implication to record plainly: any parent/admin may push an
   event to any linked account in the household, using that account
   owner's stored token — household trust, consistent with "parents
   manage". Default state of the toggles is a K0 walkthrough question.
6. **Email import is dropped, not deferred — Bryce's call, 2026-09-02.**
   It would have needed an inbound-email service plus a public webhook
   with a sender allowlist, and the app has no custom domain to hang an
   address on. A screenshot of an email is already a photo import, and
   pasting the email's text is a paste import; that covers the real case.
   Don't queue it as a next step.

## What already exists that the calendar reuses (found, not assumed)

- **Per-person color**: `User.avatarColor` + `avatarColorHex()` in
  `src/lib/constants.ts:307-326`. DESIGN.md says avatar colors are
  deliberately not job tokens → events color via `avatarColorHex()`, no new
  CSS tokens.
- **Permissions**: P3a role gates are live. Calendar actions use the inline
  `MANAGER_ROLES.includes(user.role)` pattern (`src/app/actions/mealPlans.ts:80`),
  never `requireRole` (it redirects — `src/lib/dal.ts:118-131`). Kids are
  read-only for free. Kid logins are safe to create now that P3a shipped;
  today the three kids are passwordless profiles.
- **"Today" discipline**: `src/lib/useToday.ts`, `src/lib/mealPlanDates.ts`
  (`startOfDay`, `addDays`, `sundayOf`, `isSameDay`, `formatWeekRange`,
  `formatDayLabel`). Vercel runs UTC, the house runs Mountain.
- **Meal overlay data**: `MealPlan.weekStart` + `MealPlanEntry`;
  `todaysMeals()` in `src/lib/dashboard.ts:32`. Read-only join, no new
  write path.
- **Import precedents**: `extractRecipeFromPhotos` (`src/lib/recipeExtract.ts:176`),
  paste-text import, and the voice pipeline (`src/lib/voice/parse.ts` →
  `applyActions` at `apply.ts:213`, every change logged to `VoiceChange`).
- **House components**: `RadioSheet` / `ActionSheet` / `ConfirmSheet` /
  `TitleSheet`, `BackLink`, `BranchTile`, `Skeleton`, `EmptyState`; filter
  chips at the 44px compact tier (DESIGN.md:21-23); one sheet with an
  internal view state machine, never stacked modals.
- **Scripts convention**: `db:seed-events` / `db:clean-events` that refuse
  to delete what they didn't create.

## What does NOT exist (greenfield)

- **No OAuth, no reversible secret at rest, no webhooks, no email on
  `User`.** `voiceTokenHash` is a hash; Google refresh tokens must be
  *decryptable*, so this is the app's first encrypted-at-rest secret (new
  env key, AES-GCM via `node:crypto`). Opus-tier phase.
- **No recurrence/date library.** Proposed: store recurrence as an RRULE
  string from day one (Google speaks RRULE, so sync never forces a
  migration) with a small in-house expander for v1 presets (daily, weekly
  on chosen days, monthly, yearly) plus an exception list for "just this
  one". Adding a dep is the alternative; K0 decides.
- **No timezone anywhere.** Proposed: timed events as UTC instants with a
  household timezone constant ("America/Denver") in `constants.ts`;
  all-day events follow the `weekStart` precedent (browser-built local
  midnight), since `@db.Date` would break the no-provider-specific-schema
  rule. `Intl.DateTimeFormat` handles display, no library.

## Known hazards to write into calendar-v1.md (verify at build time)

- **Google OAuth consent screen in "Testing" status expires refresh tokens
  after 7 days** (Google's documented rule) — a family app can't re-link
  weekly. Calendar scopes are "sensitive", so the likely route is
  publishing to production and living with the unverified-app warning
  screen (capped at 100 users — fine). Confirm against Google's docs at
  K5, before any token code is written.
- **Bryce's work account may be a Workspace tenant that blocks unverified
  third-party apps.** If so, the outbound-to-work path is dead on arrival.
  Make "link the work account" the first step of K5 — a B0-style
  feasibility gate like the Alexa+ plan had — before building the rest.
- **Inbound sync needs a trigger, and Vercel Hobby cron is once a day.**
  Proposed: sync-on-open (a parent opening the calendar triggers a pull if
  the last one is older than N minutes) plus a manual refresh; Google push
  channels later if freshness matters. Freshness "when someone looks" is
  the household-scale honest answer.
- **Voice never deletes** (`parse.ts:22-24`). A calendar voice verb only
  creates; "undo" removes the event it created, the same shape as voice's
  create-then-undo on pantry items. Calendar gets its own parse schema,
  not new members of the pantry one.

## Screenshot walkthrough order (K0)

Each screenshot gets an adopt / adapt / skip call, recorded inline.

1. **Month view** (phone) — how multiple people show per day (dots? bars?
   titles?). Decides whether month is a picker or a reading view at 375px.
2. **Week view** — the core view; where meals sit.
3. **Day view** — agenda vs timeline; the meal overlay's natural home.
4. **Create/edit event** — fields, recurrence picker, who-it's-for, the
   sync-to toggles, reminders (if any).
5. **Event detail** — what a tap shows; edit/delete placement.
6. **Filters / calendar list / settings** — per-person toggles, event
   types (this fixes the `EVENT_TYPES` vocabulary for `constants.ts`),
   linked-account settings.
7. **Sync / Magic Import screens** if Skylight exposes them.

## Phase skeleton (to be confirmed by the walkthrough)

Each phase = one Avengers mission, one PR, gauntlet green, verified in a
browser at 375px. Additive migrations only. Order is Bryce's to shuffle.

- **K0. Design** — walkthrough → `.avengers/plans/calendar-v1.md`. Locks:
  event model, people-on-events (owner vs. attendees join), recurrence
  storage, timezone rule, `EVENT_TYPES`, permission matrix, the sync
  tables (`LinkedCalendar`, `CalendarEventSync`), the draft/queue table.
- **K1. Foundation** — `CalendarEvent` + people join, guarded actions,
  week + day views with per-person color, create/edit sheet (sync toggles
  present but inert until K5, per the no-stub rule's named-exception
  precedent — or hidden until an account exists; K0 decides), seed/clean
  scripts. Replaces "Coming soon".
- **K2. Month view + navigation** — month grid, jump-to-today, period
  paging, view switcher via `RadioSheet`.
- **K3. Filters + meal overlay** — person chips, type chips, "Show meals"
  toggle on week/day only. Kid read-only rendering verified with a real
  kid role.
- **K4. Recurrence UI** — presets + "this one / all" edits.
- **K5. AI import** — text → events extractor (paste), photo → events,
  voice verb. All land in the create sheet for review before saving.
- **K6. Google: link accounts + outbound** — OAuth from Settings, encrypted
  refresh tokens, per-account direction, per-event push/update/delete.
  Feasibility gate first (work account links at all?). Serves the work-
  calendar need completely.
- **K7. Google: inbound for two-way accounts** — syncToken incremental
  pull, sync-on-open + refresh, imported events colored by the account
  owner, conflict rule (last write wins, recorded).

Sync sits late on purpose: everything before it is useful alone, and it is
the only work depending on outside accounts.

## Open questions for the K0 walkthrough (not blocking)

- Default state of the sync-to toggles (creator's own two-way accounts?
  remember last choice, like the store picker?).
- Whether an event is "for" one person or many (a join table either way;
  the UI differs).
- The event-type list (Skylight's categories screenshot will answer it).

## Verification (for the K0 output)

`calendar-v1.md` is done when every decision above appears with a one-line
reason, each phase lists files with citations, and a fresh session could
build K1 without having seen the screenshots — the bar the Recipes v2 and
Meal Plan plans met.
