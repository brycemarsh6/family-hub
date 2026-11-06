@AGENTS.md

# Marshee: project context

This file loads automatically at the start of every session, so it stays short.
It's written for two readers: Bryce (a beginner, learning to code through this
project) and the next Claude session. Plain English, no assumed background.

## Rules for this file

- **Keep it under ~250 lines.** Everything here costs tokens on every turn.
- **No session diaries here.** Mission details go in `.avengers/missions/`,
  plans in `.avengers/plans/`, and anything worth keeping as history goes in
  `docs/history/`. At the end of a session, update **Current status** below
  (replace it, don't append to it).
- **Danger rules live in [AGENTS.md](AGENTS.md)** (imported above), design rules
  in [DESIGN.md](DESIGN.md), structure rules in [STRUCTURE.md](STRUCTURE.md).
  Don't copy them here; link to them.
- The full pre-2026-10-31 file (every plan, session note and decision story) is
  kept word for word in
  [docs/history/claude-md-archive-2026-10-31.md](docs/history/claude-md-archive-2026-10-31.md).
  Search it when you need the reasoning behind an old decision.

## What this is

Marshee is a private web app for one family. It's a home base for what a family
usually tracks across sticky notes, group texts and separate apps: calendar,
groceries, pantry, recipes, meal planning, and later chores, profiles, photos
and habits. It runs on phones, laptops and a kitchen wall tablet, so everything
is **touch-first**: big tap targets, +/− steppers instead of typing numbers.

It's built in small, understandable steps so Bryce can learn from it. Clarity
beats cleverness.

## Who uses it

**Live and in daily use** by Bryce and his wife at the production URL on Vercel.
The pantry holds the real household inventory. Each family member has their own
login (family accounts P1 + P2). Merging to `main` deploys to them.

## How we work

- **The Avengers.** Non-trivial builds go through the `/avengers` skill (Fury
  orchestrating Banner, Stark, Vision, Strange, Captain). Missions live in
  `.avengers/missions/`, plans in `.avengers/plans/`.
- **Hill decides for Bryce** (Bryce, 2026-11-05). Content and design calls
  that would wait for Bryce go to Hill (`.claude/agents/hill.md`: Fable,
  extra-high effort, read-only). Fury records each one in the plan as
  "decided by Hill" and lists them for Bryce at the end of each PR; Bryce can
  overturn any. Hill never decides logins, real-device tests, money or the
  danger register.
- **Merges no longer wait for Bryce** (2026-11-05): once every gate passes and
  the Gauntlet is green, Fury pushes, opens the PR and merges, then checks the
  production deploy. His phone test still happens when he is back.
- **Every change goes branch → PR → Gauntlet check green → merge.** Direct pushes
  to `main` are blocked. Full rules in [AGENTS.md](AGENTS.md).
- **After claiming something is done, run `git log origin/main..HEAD`.** This
  project has three times had "finished" work that was never pushed. "Works
  locally" and "the family has it" are different claims.
- **Run commands, practical setup and file layout:** [README.md](README.md).

## What's built

- **Dashboard** (`/`): the tiles (Today's meals, Inventory, Grocery, Recipes) are
  widgets. Each person can show, hide and reorder them from a Customize sheet,
  saved per person. Device logins (the wall tablet) see the default layout and
  get no Customize button.
- **One side drawer** for the whole app, opened by a hamburger button at the
  top left (the wordmark header shows only on the dashboard and login). It lists
  Dashboard, Calendar, Habits & Chores, Plans & Goals, Lists, a Kitchen group
  (Recipes, Meal Plan, Shopping, Inventory, Expiring), then Profile, Settings
  and Sign out. On wide screens (1024px and up) a per-login "Menu style"
  setting in Settings can pin it open as an icon rail or a full sidebar.
  Phones always use the menu button. There are no landing pages. Old
  `/kitchen`, `/kitchen/cooking` and `/chores` forward to Inventory, Recipes
  and Habits & Chores. Habits & Chores (`/habits`) is live (PR B); the old
  `/routines` forwards to it too.
- **Kitchen** (the Kitchen group in the drawer):
  - **Inventory**: Pantry / Fridge / Freezer / Storage, 29 categories in
    supermarket order, collapsible groups, low-stock badges, fuzzy search,
    tap-to-edit sheet.
  - **Shopping**: aisle-grouped list, per-store tags, check off, "put away"
    straight into the pantry. Low pantry items push onto the list in one tap.
  - **Expiring**: sorted by urgency, automatic shelf-life guesses (marked `~`),
    "Log leftovers".
  - **Recipes**: cookbooks with share links, four import paths including photo
    and link, tags, ratings, filters, AI nutrition estimates,
    add-to-meal-plan, add-ingredients-to-groceries.
  - **Meal Plan**: week view, four slots a day, AI suggestions grounded in real
    inventory.
- **Plans & Goals** (`/plans`): three tabs, This week, Goals and Vision. A goal
  has one of six life areas (Spiritual, Health & Wellness, Personal Growth,
  Relationships & Connections, Work & Money, Fun & Adventure), a target date,
  Mine or Together, optionally private, and optionally a number to track
  with check-ins. Plan items under a goal are habits, steps or reminders,
  logged with one tap. Goal detail is at `/plans/goals/[id]`. The Vision tab
  holds one statement per life area at 5, 10 or 15 years, on a Mine or
  Together board, with writing prompts on empty cards; idea chips fill the
  New goal form and the Add-to-plan sheet. PR 3 (#39) added a
  "Goals this week" dashboard tile (second in the default order), a Sunday
  recap card at the top of This week, and a check-in history list on the
  goal page. Direction in `.avengers/plans/plans-goals-v1.md`.
- **Habits engine** (mission 30, live since 2026-11-05, PR #41): Plans &
  Goals habits now live in their own `Habit` tables, with one check per person per day (no
  "times a day"). The rules (schedules, streaks, carry-over, who can see or
  log) are pure code in `src/lib/habits/`, with words in
  `src/lib/habitVocabulary.ts`. Settings has a "Habits & Chores" section: a
  Show streaks switch (saved per login) and, for admins only, a Recompute
  streaks button. PR B (#43) added the tab: Today (tap to check, swipe to
  skip), Manage (drag to reorder), New and Edit. PR C added streaks, nudges,
  confetti, a stats page per habit (`/habits/[id]`) and the Whole family
  view. PR D added the chore chart, chore streak and vacation mode; PR E1 added
  the Habits and Chores today dashboard tiles and the Pick view; PR E2 added
  plan the day (a "Pick a day" card on prompt days, "Planned today" on the
  dashboard, planned days on the Calendar). PR F follows (plan:
  `.avengers/plans/habits-chores-v1.md`).
- **Calendar**: live since 2026-09-04. Month, Year, Schedule and hour-timeline
  views, tasks, month-jump dropdown and swipe-to-page (CV0 to CV6 merged).
  Read `.avengers/plans/calendar-v2.md` before calendar work.
- **Family accounts**: per-person logins (P1 + P2 shipped). P3 (role gates,
  account management, kid profiles without a password) **is live**: its
  commit `42bb676` has been on `main` since 2026-08-31 (this file said "not
  deployed" until 2026-11-05; `git merge-base --is-ancestor` settled it).
  See `mission-6-accounts-p3-roles-and-settings.md`.
- **Voice**: Siri shortcut over `/api/voice` is the working path, used daily.
  `/api/alexa` is live but dormant; Alexa+ (V3b) is blocked on Amazon
  (`.avengers/plans/v3b-alexa-plus-addon.md`).
- **Assistant API** (`/api/assistant/v1/`): a private, token-protected API for
  Bryce's Grok bot ("Home Hub"). Mission 21 (inventory, leftovers, family, audit
  log) shipped in PR #28. Missions 22 to 24 are planned in
  `.avengers/plans/assistant-api-v1.md`.

## Tech stack, and why

- **Next.js (App Router) + React + TypeScript**: pages, server logic and database
  access in one framework. TypeScript catches mistakes before the app runs.
  **This is Next.js 16:** `middleware.ts` is now `proxy.ts`. See the note at the
  top of AGENTS.md.
- **Tailwind CSS**: styles sit on the element they affect.
- **Prisma + Neon Postgres**: `prisma/schema.prisma` describes the data once.
  Local dev uses the Neon `dev` branch; production's connection string lives only
  in Vercel. Migrations run automatically in the Vercel build when merged.
- **Server Actions** for every write. They are real public POST endpoints, so
  every action checks the session itself (`src/lib/dal.ts`). Protecting pages
  alone is not enough.
- **Hosting: Vercel.**

## Decisions already made (don't re-litigate)

Reasons for each are in the archive and the mission files.

- **Delete is one tap, no confirmation**, everywhere.
- **Quantities change only by tapping +/−**, never by typing.
- **One source of truth** for shared vocabulary (`src/lib/constants.ts`) and
  shared logic (for example `src/lib/pantryWrites.ts`, used by both Server Actions
  and the Assistant API).
- **No recipe photos** (Recipes v2 C7 was dropped: it needed paid Vercel Blob).
- **Recipe ↔ inventory matching is presence-only.** If it's in the pantry, we
  have it. No quantity math, no auto-deduct.
- **"Today" on the server means Denver** (`HOUSEHOLD_TIME_ZONE`).
- **The Assistant bot may hard-delete only what it created**; inventory is only
  ever zeroed, never deleted. No agent ever sees the API token.
- **Bryce directs content and design decisions** (layout, fields, wording).
  Claude recommends on structure and tooling.

## Design rules

All in [DESIGN.md](DESIGN.md), each with its reason. The headlines: touch-first
(48px+ targets), instant optimistic updates, colors named by job not appearance,
Lucide outline icons only, secondary row actions behind a right-to-left swipe
(destructive last), every page below a drawer destination has a `BackLink`, and
browser-only reads use `useSyncExternalStore`.

## Current status (updated 2026-11-06)

Replace this section at the end of each session. Don't append.

**In progress:**
- **Habits & Chores PR E2 (mission 35)** passed all three gates on
  2026-11-06 and merges from branch `claude/habits-e2-plan-day`: the "Pick
  a day" card (Today and the dashboard), "Planned today" on the dashboard,
  "Planned for today / Sat" on rows, planned days on the Calendar.
  Decisions 151 to 162, decided by Hill. Leftovers:
  `.avengers/missions/mission-35-habits-e2-plan-the-day.md` (Delivery).
  **PR F (mission 36, the Report and idea library)** is next. Bryce said
  to run it to the end without asking.
- **Hill decides for Bryce** (`.claude/agents/hill.md`); merges don't wait
  for him. Phone tests go on Bryce's checklist below and never block.
- **Marshee is touch only** (Bryce, 2026-11-03): phones and iPads, never a
  desktop mouse. Hover is a bonus, never the only way to learn something.
- **Calendar CD1** (drag to reschedule) on branch `claude/calendar-cd1`. Watch
  for the swipe `pointerdown` issue and `CalendarViews.tsx` growth that CV6's
  gates flagged (details in `mission-19-calendar-cv6-dropdown-swipe.md`).
- **Assistant API mission 22** in worktree branch `claude/assistant-api-m22`.
  Its first contract: harden the "every route uses `assistantRoute()`" test with
  the TypeScript compiler API.

**Bryce's checklist (never blocks work):**
- **PR C phone check** (about 5 minutes): on Today, a streak flame on a
  habit done 2+ days running; tap a habit name to open its stats; check
  the last habit of the day and see confetti once. On the iPad, open
  Whole family. Have Emily nudge you on a shared habit, then tap "Got it".
- **PR D phone check** (about 5 minutes): Manage, Chore chart; add a chore
  to a day, then on This week move one and skip one. In Settings add a
  short vacation and see Today say "You're on vacation", then delete it.
  On a Sunday, look for "You finished every chore last week" if you did.
- **PR E1 phone check** (about 5 minutes): on the dashboard, check a
  habit on the Habits tile and undo it; Customize, drag a tile by its grip
  on the iPad; tap Pick on Habits, turn two on and drag them into order.
- **PR E2 phone check** (about 5 minutes, on a Friday): the "Pick a day"
  card on Today and the dashboard; tap "Other day" on the iPhone and pick a
  date (the card leaves once; browsing the picker plans nothing). On the
  planned day, the habit sits in "Planned today" on the dashboard. On the
  Calendar, Week and Schedule show it with its icon; a check on a later
  planned day can mean "this week's goal is done" (decision 160).
- **Delete the commented production `DATABASE_URL` line in `.env`**
  (host `ep-hidden-surf-`). It isn't used, but AGENTS.md says no dev
  machine should hold it. No agent edits `.env`.
- **Kids and chores:** once a kid profile exists, a kid tapping a shared
  chore on the chart should see "Ask a parent to change a shared chore."
- **Review Hill's medium calls:** 94, 95, 104, 110, 111 (PR C); 117, 121,
  122, 123 and 127 (PR D; 130 goes with 127); 135, 136, 137 and 149
  (PR E1); 156, 159, 160 and 161 (PR E2). Plan:
  `.avengers/plans/habits-chores-v1.md`.
- **Optional:** confirm the family-hub origin in the desktop app (Help,
  Troubleshooting, Review Pinned Git Origins) so the app's merge button
  works. Delete the "zz m31" to "zz m35" test habits on dev
  whenever.

**Waiting on Bryce:**
- **PR A is live:** press Recompute streaks once (Settings). The production
  counts are checked (all 0: no habits existed yet; mission 30 file).
- **Look at the Sunday recap** on the first Sunday after 2026-11-04. It has
  only been tested, never seen on a real Sunday.
- **Eaten tap after a swipe**: the fix landed in mission 27 (F3). Sixty seconds
  on a phone: swipe a Shopping row a little, let go, tap it; then swipe one
  open, tap an action, tap the row. Both taps should work.
- **Touch vs. scroll** for swipe inside the calendar's timeline scroller: only
  testable on a real device.
- **Assistant API production setup** (after PR #28): put the token hash in Vercel
  as `ASSISTANT_API_TOKEN_HASH`, paste the token into Home Hub, then change
  Bryce's own Marshee password.
- **Kid logins are Bryce's call.** P3's role gates are live (above), so a
  kid profile (no password) is safe to create from Settings, Manage family.
  Giving a kid a password is a separate decision.

**Open, not scheduled:**
- Inventory collapse state doesn't persist across reloads; Shopping has no
  collapsible groups; no per-item "usual store".
- **Structured ingredients tripwire is at 3 of 4.** If a fourth feature needs
  them, stop working around it and build them.
- Untracked `.agents/skills/avengers/` and `.codex/` in the main checkout were made
  by Bryce's Grok bot. Left uncommitted on purpose.

**Not built yet:** family profiles, the Report and idea library (PR F), to-dos, photo gallery, barcode scanning.
