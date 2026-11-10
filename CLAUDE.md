@AGENTS.md

# Marshee: project context

This file loads automatically at the start of every session, so it stays short.
It's written for two readers: Bryce (a beginner, learning to code through this
project) and the next Claude session. Plain English, no assumed background.

## Rules for this file

- **The test for every line:** add it only if a chat would make a real
  mistake without it. History, status and anything already in the code or
  a mission file does not belong here.
- **Hard cap: 250 lines.** Run `wc -l CLAUDE.md` before every commit that
  touches it. Over the cap means cut first, then add. (It reached 523 lines
  by 2026-11-08 because mission write-ups piled up here; this is the second
  slimming, the first was PR #31.)
- **Only facts that stay true for weeks belong here:** what the app is, how
  we work, decisions already made, design headlines, what's built in one or
  two lines per feature.
- **Where everything else goes:**
  - A mission merged: its own file in `.avengers/missions/` (the Delivery
    section). Decision numbers, Hill's calls, gate results, branch names,
    commit hashes and PR numbers live there, **never here**.
  - Phone tests for Bryce, things waiting on him, open follow-ups:
    [.avengers/status.md](.avengers/status.md).
  - Stories and old reasoning: `docs/history/`.
- **No session diaries.** Current status (bottom of this file) lists only
  work that is not merged yet. When your PR merges, delete your line. Never
  add "passed its gates" or "merged as PR #N" lines.
- **Danger rules live in [AGENTS.md](AGENTS.md)** (imported above), design rules
  in [DESIGN.md](DESIGN.md), structure rules in [STRUCTURE.md](STRUCTURE.md).
  Don't copy them here; link to them.
- Older archives, word for word:
  [docs/history/claude-md-archive-2026-10-31.md](docs/history/claude-md-archive-2026-10-31.md)
  and
  [docs/history/claude-md-archive-2026-11-08.md](docs/history/claude-md-archive-2026-11-08.md).

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
- **Hill only runs when Bryce is away in bypass permissions mode** (Bryce,
  2026-11-08; he first set Hill up on 2026-11-05). In that mode, content and
  design calls that would wait for Bryce go to Hill (`.claude/agents/hill.md`:
  Fable, extra-high effort, read-only), and Fury records each one as "decided
  by Hill" for Bryce to review. **In any other mode do not call Hill at all:
  ask Bryce.** Hill never decides logins, real-device tests, money or the
  danger register.
- **Merges no longer wait for Bryce** (2026-11-05): once every gate passes and
  the Gauntlet is green, Fury pushes, opens the PR and merges, then checks the
  production deploy. His phone test still happens when he is back.
- **Every change goes branch → PR → Gauntlet check green → merge.** Direct pushes
  to `main` are blocked. Full rules in [AGENTS.md](AGENTS.md).
- **After claiming something is done, run `git log origin/main..HEAD`.** This
  project has three times had "finished" work that was never pushed. "Works
  locally" and "the family has it" are different claims.
- **One chat per PR** (Bryce, 2026-11-06). After a PR merges, if the plan
  has a next PR, offer it as a New task card (`start_session`, fresh, own
  worktree) with a handoff: what just merged, what's next, which plan and
  mission files to read. Don't start the next PR in the same chat.
  Auto-archive is off (Bryce, 2026-11-06): chats stay open after merge.
- **Parallel chats each get their own worktree.** Shared files
  (`prisma/schema.prisma`, `CLAUDE.md`, `STRUCTURE.md`, `HubNav.tsx`,
  `package.json`) get small edits only; sync with `main` right before merging.
- **Run commands, practical setup and file layout:** [README.md](README.md).


## What's built

Each feature is one or two lines here. Detail lives in the plan and mission
files named beside it.

- **Dashboard** (`/`): tiles (Calendar, Today's meals, Inventory, Grocery,
  Recipes, Habits, Chores and more) are widgets in four sizes. Each person
  shows, hides, resizes and reorders them from Customize. Device logins (the
  wall tablet) see the default layout and get no Customize button. Plan:
  `.avengers/plans/dashboard-widgets-v2.md`.
- **One side drawer** for the whole app, opened by a hamburger button at the
  top left (the wordmark header shows only on the dashboard and login). It
  lists Dashboard, Calendar, Habits & Chores, Plans & Goals, Lists, a Kitchen
  group (Recipes, Meal Plan, Shopping, Inventory, Expiring), then Settings and
  Send feedback. Profile, the name card and Sign out live in Settings. On
  wide screens a per-login "Menu style" setting can pin it open as an icon
  rail or a full sidebar. There are no landing pages; old `/kitchen`,
  `/kitchen/cooking`, `/chores` and `/routines` forward to their new homes.
- **Send feedback**: a drawer row opens a sheet (message up to 2000
  characters, optional screenshot). Admins read reports at
  `/settings/feedback`.
- **Slideshow photos** (`/settings/slideshow`, parents and admins): add,
  caption and delete family photos for the wall-tablet screensaver. Stored
  in private Vercel Blob (prod store Production only, dev store Preview and
  Development). Rules: STRUCTURE.md "Slideshow photos".
- **Screensaver** (Tablet login only): an idle photo slideshow, black in
  sleep hours; a tap only wakes it. Settings `/settings/wall-tablet`, rules
  `src/lib/screensaver.ts`, structure in `docs/structure/slideshow.md`.
- **Kitchen**:
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
- **Plans & Goals** (`/plans`): This week, Goals and Vision tabs. A goal has
  one of six life areas, a target date or "Ongoing", Mine or Together,
  optionally private, optionally a number tracked with check-ins. Plan items
  under a goal are habits, steps or reminders. The Vision tab holds one
  statement per life area at 5, 10 or 15 years. Plan:
  `.avengers/plans/plans-goals-v1.md`.
- **Habits & Chores** (`/habits`): Today, Manage, Whole family, chore chart,
  streaks, nudges, vacation mode, plan the day, Report and stats per habit,
  and hours habits (a weekly time target). The rules (schedules, streaks,
  carry-over, who can see or log) are pure code in `src/lib/habits/`, words
  in `src/lib/habitVocabulary.ts`. Settings has a Show streaks switch and, for
  admins, Recompute streaks. Plan: `.avengers/plans/habits-chores-v1.md`.
- **Calendar**: Month, Year, Schedule and hour-timeline views, tasks,
  month-jump dropdown, swipe-to-page. Read `.avengers/plans/calendar-v2.md`
  before calendar work.
- **Google Calendar link** (`/settings/calendars`, parents and admins): link
  Google accounts, choose each calendar's sync direction. Refresh tokens are
  encrypted. **Marshee to Google works** (PR 2): the event form's "Sync to"
  copies an event to chosen calendars and keeps the copies updated and
  deleted. **Google to Marshee works** (PR 3): "Both ways" calendars pull on
  opening Calendar, on Refresh and a daily cron; one link per Google
  calendar. Any new code that writes a `CalendarEvent` must call the push.
  Plan: `.avengers/plans/calendar-sync-v1.md`.
- **iPad landscape**: wide pages use a per-page opt-in rule (a container that
  sizes columns against its own space). Done for the dashboard, Calendar,
  Habits & Chores, Kitchen lists, Plans, Goal page, recipe page, forms,
  Settings, Manage family and Feedback. The plan is finished. Not wide on
  purpose: `/lists` (coming soon), `/login` and the recipe print page. Plan:
  `.avengers/plans/ipad-landscape-v1.md`; the rule is in STRUCTURE.md.
- **Family accounts**: per-person logins, role gates, account management, kid
  profiles without a password. A "Tablet" device login for the wall tablet
  can check off any task; signing out of it needs an admin password. A
  per-login **Text size** (Settings: Normal, Large, Extra large) magnifies
  the whole app on tablets only, through the root font size: size things in
  rem, never fixed px text (`.avengers/missions/mission-58-text-size.md`).
- **Voice**: Siri shortcut over `/api/voice` is the working path, used daily.
  `/api/alexa` is live but dormant; Alexa+ is blocked on Amazon
  (`.avengers/plans/v3b-alexa-plus-addon.md`).
- **Assistant API** (`/api/assistant/v1/`): a private, token-protected API
  for Bryce's Grok bot, Winnie (the plan calls it "Home Hub"). It covers the
  whole app except logins: inventory, leftovers, family, shopping and
  `GET /summary`, recipes, meal plan and cookbooks, habits and chores, plans
  and goals. Every write saves before/after copies in the audit log and
  `POST /audit/{requestId}/undo` reverses a whole request for 30 days.
  Writes live in shared `src/lib/*Writes.ts` files used by both the family's
  Server Actions and the API. Winnie never deletes goals, vision statements,
  plan items or habits; she may hard-delete only what she created.
  Scope and rules: `.avengers/missions/mission-40-assistant-undo.md`.
- **Winnie notifications**: Marshee pushes events to Winnie's Grok webhook
  (one way). `src/lib/winnieNotify.ts` is the only sender; it reads
  `WINNIE_WEBHOOK_URL` and `WINNIE_WEBHOOK_KEY` (Vercel only, both set) and
  sends nothing if either is missing. Connected and proven. Winnie's own
  9 AM to 9 PM Denver quiet window is her routine's setting, not Marshee's.
  **Morning briefing**: each adult gets their day in the 9 o'clock hour
  Denver, from two Vercel crons calling `/api/cron/briefing`, which checks
  `CRON_SECRET` first; the `WinnieBriefingSent` table stops a second send.
  Words in `src/lib/briefing.ts`.

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

- **Marshee is touch only** (Bryce, 2026-11-03): phones and iPads, never a
  desktop mouse. Hover is a bonus, never the only way to learn something.

## Design rules

All in [DESIGN.md](DESIGN.md), each with its reason. The headlines: touch-first
(48px+ targets), instant optimistic updates, colors named by job not appearance,
Lucide outline icons only, secondary row actions behind a right-to-left swipe
(destructive last), every page below a drawer destination has a `BackLink`, and
browser-only reads use `useSyncExternalStore`.

## Current status (updated 2026-11-09)

Replace this section, don't append. It lists only work that is **not merged
yet** or is next. Everything merged is in its mission file.

- **Screensaver S3** ("Open Marshee on" start page) is next:
  `.avengers/plans/screensaver-slideshow-v1.md`; read mission 62's Delivery.
- **Dashboard widgets W3** is next after the W2 Calendar widget:
  `.avengers/plans/dashboard-widgets-v2.md`.
- **Tablet login** PR B (the tablet's own dashboard, calendar editing, the
  parent rule) and PR C (per-person habits tiles) are next:
  `.avengers/missions/mission-39-tablet-login.md`.
- **Calendar CD1** (drag to reschedule) is open as PR #26, branch
  `claude/calendar-cd1`. Watch the swipe `pointerdown` issue and
  `CalendarViews.tsx` growth (`mission-19-calendar-cv6-dropdown-swipe.md`).
- **Winnie next:** calendar and tasks (after CD1), then replacing the app's
  Claude features with her (needs a two-way link; parked by Bryce).
- **Bryce's phone checklist, things waiting on him, and open follow-ups:**
  [.avengers/status.md](.avengers/status.md).

**Not built yet:** family profiles, to-dos, photo gallery, barcode scanning.
