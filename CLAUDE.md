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
- **Send feedback** (mission 38): a drawer row opens a sheet over the
  current page (message up to 2000 characters, optional screenshot of the
  visible page, stored in the row). Admins read reports at
  `/settings/feedback` (New / Done, swipe Mark done or Delete). This
  changed the drawer footer: it is now Settings + Send feedback only;
  Profile, the name card and Sign out moved into Settings (the drawer
  bullet above predates this).
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
  Relationships & Connections, Work & Money, Fun & Adventure), a target date
  or "Ongoing" (mission 38),
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
  dashboard, planned days on the Calendar). PR F added the Report
  (`/habits/report`: Week, Month and Year for one person, parents can
  pick a person) and idea chips on the New habit form (six per life area,
  eight chores, words in `src/lib/habitIdeas.ts`, mirrored from
  `.avengers/plans/habits-ideas.md`). That finishes the plan
  (`.avengers/plans/habits-chores-v1.md`). Mission 37 added hours habits:
  Track: Hours logs time toward a weekly target (`HabitTimeEntry`, rules in
  `src/lib/habits/hours.ts`, words in `src/lib/habitHoursVocabulary.ts`).
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
  Bryce's Grok bot, Winnie (the plan calls it "Home Hub"). Mission 21
  (inventory, leftovers, family, audit log) shipped in PR #28. Mission 22
  (PR #30) added the shopping list (`/shopping`, check-off, put-away,
  from-low-inventory) and one-call `GET /summary`, with the writes in
  `src/lib/groceryWrites.ts` and `src/lib/putAway.ts`; Winnie may delete
  only shopping rows she created. Mission 40 added **undo**: every write
  saves before/after copies in the audit log, and
  `POST /audit/{requestId}/undo` reverses a whole request for 30 days
  (refuses if anyone changed the row since). Bryce's 2026-11-06 scope for
  Winnie (whole app except logins, no per-person permissions, never deletes
  goals/vision/plan items/habits) is in
  `.avengers/missions/mission-40-assistant-undo.md`; it supersedes the
  mission 23/24 list in `.avengers/plans/assistant-api-v1.md`.
  Mission 44 added **recipes and the meal plan**: list/read/add/edit
  recipes, mark cooked, share links, tags, cookbook list, "what am I
  missing" (`/recipes/{id}/shortfall`), a week's plan, fill or clear a
  meal (`/meal-plan/days/{date}/{slot}`) and the week's grocery needs,
  all undoable. Writes live in `src/lib/recipeWrites.ts`, `tagWrites.ts`
  and `mealPlanWrites.ts`; the week-matching rule in `mealPlanWeek.ts`.
  No recipe delete or cookbook edits for Winnie (Bryce, 2026-11-06).
- **Winnie notifications** (mission 42): Marshee can also push events to
  Winnie's Grok webhook (one way; she shows them in Bryce's chat 9 AM to
  9 PM Denver). Phase 1 is only an admin-only "Send test to Winnie" button
  in Settings. `src/lib/winnieNotify.ts` is the only sender; it reads
  `WINNIE_WEBHOOK_URL` and `WINNIE_WEBHOOK_KEY` (Vercel only) and sends
  nothing if either is missing. Retry rules are in `src/lib/winnieEvents.ts`.

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
- **Send feedback (mission 38)** passed its gates on 2026-11-06 (Strange
  on a fourth pass Bryce allowed) and merges from
  `claude/marshee-send-feedback-d53a21`. Follow-ups: Winnie told about new
  feedback (after an Assistant API route), Calendar timeline screenshots
  show the top hours, a Mark done button in the detail sheet. Phone check:
  send one from a long Inventory page on the iPad and read it in Settings.
- **Weekly hours habits (mission 37)** passed its gates on 2026-11-06 and
  merges from branch `claude/habits-hours`: a habit can track hours toward
  a weekly target (a bar, "N hours left, about M a day", a log sheet,
  weeks streak, stats page, goal plans). Decisions 182 to 199. Vision
  needed a fourth pass, which Bryce allowed. Leftovers:
  `.avengers/missions/mission-37-habits-hours.md` (Delivery).
- **Ongoing goals (mission 38)** passed its gates on 2026-11-06 and merges
  from branch `claude/goals-ongoing`: a goal's target date is optional
  ("Ongoing" chip, tag and goal page; no pace line), and new goals open on
  "End of this year". Leftovers in
  `.avengers/missions/mission-38-goals-ongoing.md` (Delivery).
- **Whole family columns (mission 41)** passed its gates on 2026-11-06 and
  merges from branch `claude/habits-family-columns`: on the iPad, one 330px
  column per person (swipe sideways), rows by time of day, Filter, and a
  household order set by dragging on Manage family (`User.familyOrder`).
  Leftovers in `.avengers/missions/mission-41-habits-family-columns.md`.
- **Dashboard widgets W1 (mission 43)** passed its gates on 2026-11-06
  from branch `claude/dashboard-customizable-widgets-a9d4c0`: widgets have
  sizes (Small, Medium, Large, Extra large), a kind can be added more than
  once, a 2 or 4 column grid packs them, and Customize edits size with
  swipeable previews. Layout JSON is v2 (old layouts upgrade on read).
  Chores today defaults to Medium (decision 214). Next: W2, the Calendar
  widget (`.avengers/plans/dashboard-widgets-v2.md`).
- **Hill decides for Bryce** (`.claude/agents/hill.md`); merges don't wait
  for him. Phone tests go on Bryce's checklist below and never block.
- **Marshee is touch only** (Bryce, 2026-11-03): phones and iPads, never a
  desktop mouse. Hover is a bonus, never the only way to learn something.
- **Calendar CD1** (drag to reschedule) on branch `claude/calendar-cd1`. Watch
  for the swipe `pointerdown` issue and `CalendarViews.tsx` growth that CV6's
  gates flagged (details in `mission-19-calendar-cv6-dropdown-swipe.md`).
- **Tablet login (mission 39) PR A** passed its gates on 2026-11-06 and
  merges from `claude/mission-39-tablet-login-pra-49f32c`: an admin sets up
  one "Tablet" login in Manage family, its chip is last on the login page,
  it can check off any task, and Sign out on it asks for an admin password.
  PR B (the tablet's own dashboard, calendar editing, the parent rule) and
  PR C (per-person habits tiles) are next; see
  `.avengers/missions/mission-39-tablet-login.md`.
- **Winnie notifications (mission 42)** merged as PR #58 on 2026-11-06.
  Bryce adds the two env vars in Vercel and taps "Send test to Winnie".
  Details: `.avengers/missions/mission-42-winnie-notify.md`.
- **Winnie's recipes and meal plan (mission 44)** merged as PR #61
  (`634627a`) on 2026-11-06 and is live (production deploy READY, routes
  answer 401 without a token). What to tell Winnie is in the mission
  file's Delivery.
- **Winnie's cookbooks (mission 45)** passed its gates on 2026-11-06
  (Vision and Captain on pass 2) from `claude/assistant-cookbooks`:
  create, rename, file/unfile, share, and delete only her own cookbooks
  with no family filings (Hill's H1 to H4; review H1 and H4 first). Writes
  in `src/lib/cookbookWrites.ts`; refusals in `src/lib/writeError.ts`.
  What to tell Winnie is in the mission file's Delivery. Next for Winnie:
  calendar/tasks (after CD1), then replacing the app's Claude features
  with her (needs a two-way link; Bryce parked it 2026-11-06). Captain's
  STRUCTURE.md amendments A1 to A4 (mission 44) and A5 to A9 (mission 45)
  wait in the mission files.

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
- **PR F phone check** (about 5 minutes): Habits & Chores, the Report
  card at the bottom; flip Week, Month and Year, and the arrows. On the
  iPad, check the small Month squares are easy to read. As a parent, tap
  Emily's chip. New habit: pick a life area and tap an idea chip; for a
  chore, the Chore ideas under Name. Look for the new "No phone in bed"
  icon. Try Together with only yourself and see "Pick at least two
  people, or choose Just me."
- **Hours tracker phone check** (about 5 minutes): New habit, Track:
  Hours, 10 hours a week. On Today tap + and add 1 hour; see the bar and
  "9 hours left, about N a day". Open its stats page and delete that
  entry. Under a goal, add an hours plan and log from This week. On the
  iPad, look at Whole family.
- **Ongoing goals phone check** (about 3 minutes): New goal, tap Ongoing
  and see the date box grey out; save and see the "Ongoing" tag on the
  card and "Ongoing" on its page. Scroll the Goals list to the very
  bottom: if the + still covers a card, screenshot it where it happens.
- **Whole family iPad check** (about 5 minutes): Settings, Manage family,
  drag the Family order into Bryce, Emily, Ledger, Eleanor, Lucy. Open
  Habits & Chores, Whole family, in portrait and landscape: swipe sideways
  with a finger, scroll one column, tap a check, try Filter.
- **Tablet login setup** (about 5 minutes): on your phone, Settings, Manage
  family, "Set up a tablet login", choose the Tablet password, Create. On the
  tablet: Settings, Sign out (it is still Emily, so one tap), tap the
  "Tablet" chip at the bottom, enter that password. Then on the tablet try
  Settings, Sign out: a wrong admin password is refused, yours signs it out.
- **Dashboard widgets iPad check** (about 5 minutes): on the iPad, see the
  4-column dashboard; check the Small Inventory tile isn't cut off. Open
  Customize, tap Chores today, switch it to Large and back; add a second
  Habits widget, then Remove it.
- **Review Hill's dashboard calls:** 200, 201 (amended by 209), 203 and
  212 in `.avengers/missions/mission-43-dashboard-widgets-w1.md`.
- **Delete the commented production `DATABASE_URL` line in `.env`**
  (host `ep-hidden-surf-`). It isn't used, but AGENTS.md says no dev
  machine should hold it. No agent edits `.env`.
- **Kids and chores:** once a kid profile exists, a kid tapping a shared
  chore on the chart should see "Ask a parent to change a shared chore."
- **Review Hill's medium calls:** 94, 95, 104, 110, 111 (PR C); 117, 121,
  122, 123 and 127 (PR D; 130 goes with 127); 135, 136, 137 and 149
  (PR E1); 156, 159, 160 and 161 (PR E2); 163, 167, 170, 172, 179 and 181
  (PR F); 188, 191, 192, 197 and 198 (hours tracker). Plan:
  `.avengers/plans/habits-chores-v1.md`.
- **Optional:** confirm the family-hub origin in the desktop app (Help,
  Troubleshooting, Review Pinned Git Origins) so the app's merge button
  works. Delete the "zz m31" to "zz m35" test habits, the four
  "zz m37" habits, the "zz m37 Commissions" goal, the four "zz m38"
  goals, the deactivated "zz m41 test renamed" profile and the deactivated
  "zz m39 Tablet" device on dev whenever.

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
- Hours tracker follow-ups (mission 37 Delivery): a page left open over
  Saturday night shows last week's total in the sheet until reloaded; the
  Who hint says "checks" on an hours habit.
- The Edit screen says "Edit habit" for a chore and doesn't light the
  house icon (found by Strange in PR F, older than it).
- Inventory collapse state doesn't persist across reloads; Shopping has no
  collapsible groups; no per-item "usual store".
- **Structured ingredients tripwire is at 3 of 4.** If a fourth feature needs
  them, stop working around it and build them.
- Untracked `.agents/skills/avengers/` and `.codex/` in the main checkout were made
  by Bryce's Grok bot. Left uncommitted on purpose.

**Not built yet:** family profiles, to-dos, photo gallery, barcode scanning.
