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
  Dashboard, Calendar, Routines, Plans & Goals, Lists, a Kitchen group
  (Recipes, Meal Plan, Shopping, Inventory, Expiring), then Profile, Settings
  and Sign out. On wide screens (1024px and up) a per-login "Menu style"
  setting in Settings can pin it open as an icon rail or a full sidebar.
  Phones always use the menu button. There are no landing pages. Old
  `/kitchen`, `/kitchen/cooking` and `/chores` forward to Inventory, Recipes
  and Routines. Routines is a "Coming soon" placeholder.
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
- **Plans & Goals** (`/plans`): two tabs, This week and Goals. A goal has a
  life area, a target date, Mine or Together, optionally private, and
  optionally a number to track with check-ins. Plan items under a goal are
  habits, steps or reminders, logged with one tap. Goal detail is at
  `/plans/goals/[id]`. Direction in `.avengers/plans/plans-goals-v1.md`.
- **Calendar**: live since 2026-09-04. Month, Year, Schedule and hour-timeline
  views, tasks, month-jump dropdown and swipe-to-page (CV0 to CV6 merged).
  Read `.avengers/plans/calendar-v2.md` before calendar work.
- **Family accounts**: per-person logins (P1 + P2 shipped). P3 (role gates,
  account management) was delivered but **not deployed**, by Bryce's call. See
  `mission-6-accounts-p3-roles-and-settings.md`.
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

## Current status (updated 2026-11-04)

Replace this section at the end of each session. Don't append.

**In progress:**
- **Plans & Goals PR 1** (mission 27, branch `claude/plans-goals-p1`): built
  through all three gates (Vision PASS on pass 3, Strange PASS on pass 2,
  Captain PASS on pass 2), pushed as PR #36, waiting on Bryce to merge. PR 2 (Vision tab, prompts, idea chips)
  and PR 3 (dashboard tile, Sunday recap, Routines switch) are queued in
  `.avengers/plans/plans-goals-v1.md`. The navigation redesign, including rail
  names, is live (PRs #32 to #35).
- **Marshee is touch only** (Bryce, 2026-11-03): phones and iPads, never a
  desktop mouse. Hover is a bonus, never the only way to learn something.
- **Calendar CD1** (drag to reschedule) on branch `claude/calendar-cd1`. Watch
  for the swipe `pointerdown` issue and `CalendarViews.tsx` growth that CV6's
  gates flagged (details in `mission-19-calendar-cv6-dropdown-swipe.md`).
- **Assistant API mission 22** in worktree branch `claude/assistant-api-m22`.
  Its first contract: harden the "every route uses `assistantRoute()`" test with
  the TypeScript compiler API.

**Waiting on Bryce:**
- **Eaten tap after a swipe**: the fix landed in mission 27 (F3). Sixty seconds
  on a phone: swipe a Shopping row a little, let go, tap it; then swipe one
  open, tap an action, tap the row. Both taps should work.
- **Touch vs. scroll** for swipe inside the calendar's timeline scroller: only
  testable on a real device.
- **Assistant API production setup** (after PR #28): put the token hash in Vercel
  as `ASSISTANT_API_TOKEN_HASH`, paste the token into Home Hub, then change
  Bryce's own Marshee password.
- **Do not create a kid login until P3 role gates are deployed.**

**Open, not scheduled:**
- Inventory collapse state doesn't persist across reloads; Shopping has no
  collapsible groups; no per-item "usual store".
- **Structured ingredients tripwire is at 3 of 4.** If a fourth feature needs
  them, stop working around it and build them.
- Untracked `.agents/skills/avengers/` and `.codex/` in the main checkout were made
  by Bryce's Grok bot. Left uncommitted on purpose.

**Not built yet:** family profiles, chore charts, to-dos, stand-alone habit
trackers (habits live inside Plans & Goals now), photo gallery, barcode scanning.
