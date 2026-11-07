# Mission 48: Winnie's daily morning briefing

**Project:** family-hub (Marshee)
**Status:** DELIVERED (PR #71 merged `ae8e0a4`, live; `CRON_SECRET` set 2026-11-07)
**Started:** 2026-11-06 · **Updated:** 2026-11-06
**Branch:** `claude/winnie-briefing` (from `origin/main` at `fc9772b`)

## Brief

- **Goal:** each morning in the 9 o'clock hour (Denver), Marshee sends every
  adult (role `admin` or `parent`) their own day through the mission-42
  webhook sender: chores, tasks, calendar, meals and Pick a day. Winnie shows
  it in that person's chat.
- **Done means:** a Vercel cron calls a `CRON_SECRET`-protected route; in the
  9 AM Denver hour it builds one `briefing.daily` event per adult with
  `intendedRecipient` set to that person and sends it through
  `sendWinnieEvent`; outside that hour it sends nothing; nobody gets two in a
  day. The message builder is pure and tested in both timezones. Merged
  through branch, PR, Gauntlet; production deploy checked; the crons show in
  Vercel; Bryce has plain steps to set `CRON_SECRET` and confirm the first
  briefing (his and Emily's).
- **Out of scope:** any other alert type, quiet hours or settings screens,
  a per-person on/off switch, kids or the device login, a reply path from
  Winnie, Vercel Pro, a third cron.

## Content (Bryce's and Hill's, 2026-11-06; don't re-litigate)

Bryce asked for the briefing on 2026-11-06 ("Sure that's fine if you start
building the briefing"); Hill decided the details at his request.

1. **One message per adult** (roles `admin` and `parent`), `intendedRecipient`
   set to that person. Never kids, never the device login. Emily gets her own
   copy: **decided by Bryce** ("Yes she can send just to Emily").
2. **Arrives in the 9 o'clock hour Denver**, all year, never before 9:00
   (Winnie drops anything before 9 AM and doesn't queue it). Two daily crons
   (15:00 and 16:00 UTC) plus a 9 AM Denver hour check, and a
   once-per-person-per-day guard. Route protected by `CRON_SECRET`. Free plan
   only. Decided by Hill.
3. **Calendar:** events the person is on (timed and all-day), in start order.
   No unassigned events exist; orphans are skipped. Decided by Hill.
4. **Tasks:** the person's incomplete tasks, due today first, then overdue
   ones (most recently due first), each overdue one tagged "(1 day overdue)" /
   "(3 days overdue)". No cap. Decided by Hill.
5. **Empty sections hide.** All empty: "Good morning, Bryce. Here's Friday,
   Nov 13. Nothing on today." On a vacation day the Chores line uses the
   Today card's vacation words (decision 115). Decided by Hill.
6. **Pick a day** reuses `isPromptDay` exactly. Decided by Hill.
7. **Wording** (approved copy, decided by Hill):
   ```
   Good morning, Bryce. Here's Friday, Nov 13.
   Chores: Take out trash · Unload dishwasher
   Tasks: Call the HOA · Renew car registration (1 day overdue)
   Calendar: 10 AM Dentist · 6:30 PM Date night (with Emily)
   Meals: Breakfast: Oatmeal · Dinner: Chicken tacos
   Pick a day: Long run (this week) · Deep clean garage (this month). Tap the Pick a day card in Marshee.
   ```
   Times in the app's clock style (minutes only when not on the hour);
   all-day events read "All day Piano recital". Not `formatTimeRange` (it has
   an en dash). Chores are decision 133's set for that person, leaving out
   anything done, skipped, week-skipped or on vacation. Meals: filled slots
   only, in `MEAL_SLOTS` order, shared by the family. Event type
   `briefing.daily`, title "Marshee briefing: Friday, Nov 13", body = the
   message. No em or en dashes anywhere.
8. **Private habits** appear only in their participant's own briefing.

## Hill's decisions (2026-11-06; Bryce can overturn any)

Hill ran as a general agent on Fable following `.claude/agents/hill.md`.

- **H1 (high):** "(with ...)" lists the event's other active people (not the
  recipient) by display name in household order, joined "Emily" / "Emily and
  Ledger" / "Emily, Ledger and Lucy". No tag when the recipient is alone.
- **H2 (medium):** no new words for events crossing days: the Calendar's own
  badge for today. Single-day all-day: "All day Piano recital". Any event
  covering more than one day: "Day 2 of 3 Trip" (timed or all-day). Order:
  all-day and continuing items first by start, then today's timed items by
  start time. Fury's alternative ("Until 11 AM Conference") was turned down
  for one source of truth. **Approved by Bryce, 2026-11-07.**
- **H3 (high):** "(this week)" for weekly and every-other-week, "(this
  month)" for monthly: `WindowProgress.label` (`src/lib/habits/progress.ts`).
- **H4 (high):** vacation Chores line "Chores: You're on vacation through Nov
  12" / "Chores: You're on vacation today", no trailing period, every
  vacation day, chores due or not; so never "Nothing on today" on vacation.
- **H5 (high):** the Calendar line is calendar events only; planned habits
  are not added.
- **H6 (high):** a carried chore is its title alone.
- **H7 (high):** deactivated people never appear in "(with ...)".
- **H8 (high):** straight ASCII apostrophes ("Here's", "You're").
- **Guard table: decided by Bryce.** He answered the schema question
  himself, relayed by the parent session (2026-11-06): "Yes". So the
  additive `WinnieBriefingSent` table is his approval; Hill's H9 below
  reached the same answer and stays only as the reasoning. Fury reviews
  the migration SQL (additive only) before applying it to dev. The
  habits-hours schema work (PR #51) is already on main, so nothing else
  holds the schema; re-sync with main right before merging anyway.
- **H9 (high):** the once-a-day guard is a new additive table
  `WinnieBriefingSent` (userId, day as a UTC-midnight Denver date, eventId,
  status as text, unique [userId, day], cascade on user delete). Insert
  first; a unique clash means already sent. Not Bryce-only: additive
  migrations are sanctioned (missions 37, 38, 41) and Bryce said "for now ask
  all questions to Hill".
- **H10 (medium):** `not-configured` leaves no row; `rejected` or
  `unreachable` keeps the row with that status and nobody retries that day.
  **Bryce to look at:** a Winnie outage for the whole 9 o'clock hour means
  that day's briefing is missed, not sent late. The PR notes say this PR
  creates one new table on production at merge.

## Danger register

- AGENTS.md applies in full. No `db:seed` / `db:reset`; scoped `db:seed-*` /
  `db:clean-*` only.
- **No real request to Winnie's webhook from any agent.** Tests use a fake
  fetch. The first real send is the production cron after Bryce sets
  `CRON_SECRET`.
- **`CRON_SECRET`, `WINNIE_WEBHOOK_URL`, `WINNIE_WEBHOOK_KEY` are secrets.**
  No agent reads `.env`, asks for them, prints them or writes them anywhere.
  Bryce sets `CRON_SECRET` in Vercel himself.
- The cron route must never send outside the 9 AM Denver hour and never twice
  to one person on one day.
- Stage by explicit path; `git show --stat HEAD` after each commit.

## Gauntlet

- `npx tsc --noEmit` · `npx eslint .` · `npm test` · `npm run build`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts` (and `TZ=America/Los_Angeles`)
- `node ~/.claude/skills/avengers/recordcheck.mjs`

## Assembled

- Stark + Vision (always).
- Banner: the briefing reads five domains (calendar, tasks, habits, meal
  plan, users); his brief is the fact base for the contracts.
- Captain: new lib modules and a new API route (and proxy.ts entry).
- No Strange: nothing a person sees in the app changes.
- Hill only for any new content call.

## Banner's brief (2026-11-06, summary; facts with file:line)

- Adults: `MANAGER_ROLES = ["admin", "parent"]` (`src/lib/constants.ts:243`).
  Household people are queried only through `src/lib/householdPeople.ts`
  (`HOUSEHOLD_PERSON_WHERE`: active, not a device). `loadHouseholdPeople`
  returns no role, so an adults reader goes in that file.
- `intendedRecipient` is free text; the test button sets none. Bryce
  confirmed Winnie routes `intendedRecipient: "Emily"` to Emily, so it is the
  person's `displayName`.
- Calendar: `CalendarEventPerson` links people. `getCalendarEventsInRange`
  (`src/lib/calendarEventQuery.ts:92`) has no person filter. Denver-day
  pattern: `readSummaryData` + `bucketEventsByDay`
  (`src/lib/assistant/summaryReads.ts`, `summary.ts:55`). `rrule` is never
  expanded (events and tasks), so neither does the briefing.
- Tasks: `dueDate` at UTC midnight, `completedAt` null = open, `TaskPerson`
  links people. No overdue logic exists anywhere.
- Chores and Pick a day: `loadTodayPage(viewer, today)`
  (`src/lib/habitsRead.ts:138`) already applies privacy (`canSeeHabit`), so
  calling it with each adult as viewer keeps private habits in their own
  briefing only. `choresTileRows(page.rows)` (`habitsDashboard.ts:80`) is
  decision 133/150's set; the briefing drops `doneToday` rows from it.
  `page.prompts` comes from `buildTodayPrompts`, which calls `isPromptDay`
  and returns [] on vacation. `page.vacationThrough` and
  `vacationThroughLabel` / `VACATION_TODAY_LABEL` (`habitVocabulary.ts:236`,
  `:241`) are decision 115's words. Precedent for a per-person loop:
  `readToday` in `src/lib/assistant/habitReads.ts:176`.
- Meals: `findPlanForWeek` + `slotsForDay` as in
  `src/app/api/assistant/v1/summary/route.ts` (Denver-correct;
  `todaysMeals` is not).
- Clock: `formatTimeRange` and its private `clockParts` use the process
  timezone (UTC on Vercel). The briefing needs a Denver-zone clock.
  Date words: `FULL_DAY_NAMES`, `MONTH_NAMES` (`src/lib/mealPlanDates.ts`),
  `dayOfWeek` (`householdDate.ts:118`).
- `proxy.ts` sends any `/api/*` without a session to `/login`; the cron
  route needs an exact entry in `PUBLIC_ROUTES`.
- No table fits a once-per-person-per-day guard without a schema change.
  Asked Bryce (via the parent session) on 2026-11-06.

## Design (Fury's structural calls)

1. **Pure builder** `src/lib/briefing.ts`: no db, no env, no clock read.
   Takes plain data and `today`; returns the message, title, and the hour
   check. Tested in `src/lib/briefing.test.ts` (top-level `src/lib`, already
   in the test glob, so `package.json` does not change).
2. **Server-only reader** `src/lib/briefingRead.ts`: for one adult, gathers
   the builder's input through the existing readers (`loadTodayPage`,
   `getCalendarEventsInRange`, a tasks query, the meal plan via
   `findPlanForWeek` + `slotsForDay`). The adults list is a new function in
   `src/lib/householdPeople.ts` (the one home of the household filter).
3. **Thin cron route** `src/app/api/cron/briefing/route.ts` (GET): checks
   `Authorization: Bearer ${CRON_SECRET}` first (constant-time; missing
   secret = 401), then the 9 AM Denver hour, then per adult: guard, build,
   `buildWinnieEvent` + `sendWinnieEvent`. Answers JSON counts only (no
   names, no message text). `proxy.ts` gets the exact path in
   `PUBLIC_ROUTES` with a comment like its neighbours.
4. **Crons** in `vercel.json`: `0 15 * * *` and `0 16 * * *` on the same
   path. On the free plan each fires once a day somewhere inside its hour;
   in summer (UTC-6) the 15:00 run is Denver's 9 o'clock, in winter (UTC-7)
   the 16:00 run is. The other one lands at 8 or 10 and the hour check sends
   nothing.
5. **Guard:** no existing table fits. Asked Bryce through the parent
   session; then Bryce wrote here directly (2026-11-06, going to bed): "for
   now ask all questions to Hill". The question went to Hill (H9, H10).

## Contracts

### C1 - the pure briefing builder

- **Objective:** a pure, tested module that turns one adult's day (plain
  data) into the approved briefing text, title and hour check.
- **Boundaries:** may touch new `src/lib/briefing.ts` and
  new `src/lib/briefing.test.ts`; `src/lib/calendarDates.ts` only to export
  the badge words (see H2 below; `formatAllDayLabel` and `formatTimeRange`
  keep their behaviour and tests); `src/lib/assistant/summary.ts` only to
  export its private `coveredRange` (rename allowed, e.g.
  `eventDayRange`, with its one caller updated). Must not touch anything
  else; in particular not
  `src/lib/winnie*.ts`, `src/lib/habit*.ts`, `src/lib/habits/**`,
  `package.json`, `prisma/**`.
- **What it exports** (names may be adjusted if the report says why):
  - `BRIEFING_EVENT_TYPE = "briefing.daily"`.
  - `isBriefingRecipientRole(role: string): boolean`: true for
    `MANAGER_ROLES` from `constants.ts` (admin, parent), false otherwise.
  - `isBriefingHour(now: Date): boolean`: true when `now` is 9:00:00 to
    9:59:59 in `HOUSEHOLD_TIME_ZONE`, using `zoneOffsetMs` from
    `householdDate.ts` (not process getters).
  - `briefingDateLabel(today: CalendarDate)`: "Friday, Nov 13" from
    `FULL_DAY_NAMES`, `MONTH_NAMES` (`mealPlanDates.ts`) and `dayOfWeek`.
  - `briefingTitle(today)`: "Marshee briefing: Friday, Nov 13".
  - `formatBriefingClock(instant: Date)`: the app's clock style in Denver,
    "10 AM", "6:30 PM", "12 PM", "12:15 AM" (minutes only when not on the
    hour), via `Intl.DateTimeFormat("en-US", { timeZone: HOUSEHOLD_TIME_ZONE,
    hour: "numeric", minute: "2-digit", hour12: true })` parts. The output
    must use a plain ASCII space (Intl may emit U+202F before AM/PM:
    normalise it).
  - `joinNames(names: string[])`: "Emily" / "Emily and Ledger" /
    "Emily, Ledger and Lucy".
  - `briefingTasks(tasks: { title: string; dueDate: Date }[], today)`:
    `dueDate` is a UTC-midnight day (`calendarDateFromUtcMidnight`). Keeps
    due today and overdue, drops future. Due-today first (input order),
    then overdue most recently due first (ties keep input order). Overdue
    text: "Renew car registration (1 day overdue)", "(3 days overdue)".
    Returns strings.
  - `briefingEvents(events: { title; startAt: Date; endAt: Date; allDay:
    boolean; others: string[] }[], today)`: only events covering `today`
    (use the exported, pure `bucketEventsByDay(events, [today])` from
    `src/lib/assistant/summary.ts`, the one home of that rule: all-day UTC
    midnights with exclusive end; timed `[startAt, endAt)` in Denver; do not
    re-implement it). `others` arrive already active-only, in household
    order and without the recipient (the reader's job, H1 and H7).
    Text (H2): a timed event starting and ending today is
    `${formatBriefingClock(startAt)} ${title}`; any other event gets the
    Calendar's badge for today computed in **Denver** (not
    `formatAllDayLabel`, which uses the process timezone): one day all-day
    is "All day", more than one day is "Day N of M", N counted from the
    event's first Denver day, both from the exported range rule. The badge
    words come from `calendarDates.ts`: extract them there as an exported
    pure helper (e.g. `spanBadgeLabel(dayIndex, totalDays, allDay)`) that
    `formatAllDayLabel` itself now uses, so they live once. Then
    ` (with ${joinNames(others)})` when `others` is non-empty. Order: badge
    items first by `startAt`, then timed items by `startAt` (ties keep input
    order). Returns strings.
  - `buildBriefingMessage(input: BriefingInput): string` with
    `BriefingInput = { name; today; vacationThrough: CalendarDate | null;
    chores: string[]; tasks: string[]; events: string[]; meals: { slot:
    string; title: string | null }[]; picks: { title: string; period: "this
    week" | "this month" }[] }`. Lines joined with "\n", items with " · ".
    Order: greeting, Chores, Tasks, Calendar, Meals, Pick a day. Empty
    sections hidden. Vacation: the Chores line is
    `Chores: ${vacationThroughLabel(...)}` or `Chores:
    ${VACATION_TODAY_LABEL}` (import both from `habitVocabulary.ts`; date
    via `formatShortCalendarDate`), shown even with no chores. Meals: only
    slots with a title, in the order given (the reader passes
    `slotsForDay`'s `MEAL_SLOTS` order), "Breakfast: Oatmeal". Pick a day:
    "Long run (this week) · Deep clean garage (this month). Tap the Pick a
    day card in Marshee." Everything empty and no vacation: "Good morning,
    Bryce. Here's Friday, Nov 13. Nothing on today." on one line.
- **Verification:** `npx tsc --noEmit`; `npx eslint src/lib/briefing.ts
  src/lib/briefing.test.ts`; `npm test`; and
  `TZ=UTC node --import tsx --test src/lib/briefing.test.ts` and
  `TZ=America/Los_Angeles node --import tsx --test src/lib/briefing.test.ts`.
- **Evidence required:** the test list with pass counts in all three zones;
  a test that reproduces the approved six-line copy word for word; tests
  for the all-empty line, vacation through / today, overdue singular and
  plural, task order, the clock at :00 / :30 / noon / midnight, the hour
  check at 8:59:59, 9:00, 9:59:59, 10:00 Denver in both summer (MDT) and
  winter (MST), a timed event that ends at midnight not touching the next
  day, a trip from yesterday 6 PM to tomorrow 10 AM reading "Day 2 of 3",
  a multi-day all-day event, "(with Emily and Ledger)", a Denver evening event
  that is already tomorrow in UTC, `formatAllDayLabel`'s existing tests still
  passing, and a test that no output contains U+2013, U+2014 or U+202F.
- **Done criteria:** Vision re-runs the tests in all three zones and finds
  the module imports no db, env or `server-only`.

### C2 - reader, guard, cron route, crons

(Hill picked the new table, H9, and Fury's failure rule, H10.)

Preflight's one hard failure on C2 is the schema's length; STRUCTURE.md
("File-size caps") exempts `prisma/schema.prisma`, so Fury overrides it.

- **Objective:** a CRON_SECRET-protected route that, in the 9 AM Denver
  hour, sends each active adult their briefing once.
- **Boundaries:** may touch `prisma/schema.prisma` (one new model only),
  new `prisma/migrations/20261112000000_winnie_briefing_sent/migration.sql`,
  `src/lib/householdPeople.ts` (add one adults reader beside
  `loadHouseholdPeople`), new `src/lib/briefingRead.ts`, new
  `src/lib/briefingSent.ts`, new `src/app/api/cron/briefing/route.ts`,
  `src/proxy.ts` (one exact entry in `PUBLIC_ROUTES` plus a comment like its
  neighbours), `vercel.json` (a `crons` array, nothing else changed),
  `src/lib/briefing.ts` and `src/lib/briefing.test.ts` only if a pure
  helper must move there (say so). Must not touch: `src/lib/winnieEvents.ts`,
  `src/lib/winnieNotify.ts`, `src/lib/habitsRead.ts`, `src/lib/habits/**`,
  `src/lib/assistant/**`, `src/app/actions/**`, `package.json`, `.env*`,
  any existing migration.
- **Schema (H9):** `WinnieBriefingSent { id String @id @default(cuid());
  userId String; user User @relation(..., onDelete: Cascade); day DateTime
  (the Denver day as a UTC midnight, `utcMidnightInstant`); eventId String;
  status String ("sending" | "accepted" | "rejected" | "unreachable");
  createdAt DateTime @default(now()); updatedAt DateTime @updatedAt;
  @@unique([userId, day]) }` with a `///` comment saying what it is for, and
  the back-relation on `User`. Migration SQL: one `CREATE TABLE`, its
  unique index, its foreign key. Nothing else.
- **Adults reader** (`householdPeople.ts`): `loadHouseholdAdults()` returns
  `{ id, displayName, role }[]` where `HOUSEHOLD_PERSON_WHERE` and role in
  `MANAGER_ROLES`, in the household order. A user with no password still
  counts if they are admin/parent (they cannot exist today; say so if the
  query shows otherwise).
- **Reader** `briefingRead.ts` (`import "server-only"`):
  `loadBriefingInput(person, today, household)` returns C1's
  `BriefingInput`:
  - Chores, picks, vacation: `loadTodayPage({ userId, role }, today)` with
    the person as viewer (privacy comes from it). Chores =
    `choresTileRows(page.rows).rows` minus `doneToday`, titles in that
    order. Picks = `page.prompts` titles, period from
    `windowProgress(...).label` or from the prompt's habit schedule
    (`page.manage` has `schedule` by id): monthly = "this month", else
    "this week" (H3); say which you used. `vacationThrough` from
    `page.vacationThrough` (parse with `parseDateParam`).
  - Events: one `getCalendarEventsInRange(zoneMidnightInstant(today),
    zoneMidnightInstant(today + 1))` per run (shared across people, pass it
    in), keep events whose `people` include the person, `others` = the
    other people on it who are in `household` (active, H7), in household
    order (H1).
  - Tasks: one query per run: `completedAt: null`, `dueDate <
    utcMidnightInstant(today + 1)`, people include the person, ordered by
    `dueDate` then `createdAt`; pass `{ title, dueDate }` to C1's
    `briefingTasks`.
  - Meals: one `db.mealPlan.findMany({ where: { weekStart:
    planWindow(...) } })` per run as in `summaryReads.ts`, then
    `findPlanForWeek` + `slotsForDay` (shared by the family).
  Shared reads happen once per run, not once per person.
- **Guard** `briefingSent.ts` (`server-only`): `claimBriefing(userId, day,
  eventId)` creates the row with status "sending" and returns false on a
  unique clash (Prisma `P2002`), true otherwise; `finishBriefing(userId,
  day, status)`; `releaseBriefing(userId, day)` deletes the row (used only
  for H10's case).
- **Route** `src/app/api/cron/briefing/route.ts`, `GET` only:
  1. `CRON_SECRET` missing or the `authorization` header not exactly
     `Bearer <secret>` (constant-time compare, `timingSafeEqual` on equal
     length buffers, as `/api/voice` does) → 401 `{ error: "unauthorized" }`
     before anything else runs.
  2. `now = new Date()`; not `isBriefingHour(now)` → 200 `{ sent: 0,
     skipped: "outside-hour" }`.
  3. `today = calendarDateInZone(now, HOUSEHOLD_TIME_ZONE)`; adults,
     household, shared reads; for each adult in order: `eventId =
     crypto.randomUUID()`; `claimBriefing` false → count as already sent;
     else build the message (C1), `buildWinnieEvent({ type:
     BRIEFING_EVENT_TYPE, title: briefingTitle(today), body: message,
     intendedRecipient: displayName }, now, eventId)`, `sendWinnieEvent`,
     then H10: `not-configured` → `releaseBriefing`; otherwise
     `finishBriefing` with accepted/rejected/unreachable. One person's
     failure (a throw in their read or send) is caught, logged without
     names or text, the claim finished as "unreachable", and the loop goes
     on.
  4. 200 JSON counts only: `{ sent, alreadySent, failed, notConfigured }`.
     Never names, message text, URL, key or secret in the response or
     logs (`console.info` lines carry counts and eventIds only).
  `export const dynamic = "force-dynamic"` if Next 16 needs it for a GET
  that must not be cached (check `node_modules/next/dist/docs/` for route
  handler caching; say what you found).
- **Proxy:** exact `"/api/cron/briefing"` in `PUBLIC_ROUTES`, comment: the
  route's own `CRON_SECRET` check is the gate; proxy is only UX.
- **vercel.json:** `"crons": [{ "path": "/api/cron/briefing", "schedule":
  "0 15 * * *" }, { "path": "/api/cron/briefing", "schedule": "0 16 * * *"
  }]`.
- **Verification:** `npx prisma validate`; `npx prisma generate`; `npx tsc
  --noEmit`; `npx eslint .`; `npm test`; `npm run build`. Do not apply the
  migration (Fury applies it to dev after checking the host). Do not call
  the route against production. Local route check only if Fury has applied
  the migration: with the dev server and a fake `CRON_SECRET` in the
  process env only, `curl` without the header → 401; with a wrong secret →
  401. No sending test (no Winnie env vars locally, so a send would only
  be "not-configured", which is also worth showing if the hour allows; do
  not fake the clock in route code).
- **Evidence required:** the migration SQL in full; the diff of
  `proxy.ts` and `vercel.json`; gauntlet output tails; line counts
  (total / code) for each new file; how private habits stay private (which
  call decides it).
- **Done criteria:** Vision confirms the 401 comes first, nothing sends
  outside the hour, the unique claim happens before the send, shared reads
  happen once per run, and no secret or personal text can reach logs or
  the response.

## Log

- 2026-11-06: C1 DONE (Stark), committed. Fury re-ran: `npm ci`, `prisma
  generate`, `tsc` clean; full suite in UTC 1327 tests, 1320 pass, 0 fail,
  7 skipped (existing DST tests in `timelineLayout.test.ts` and kin that
  skip in zones without a time change). Stark's choices: vacation line wins
  over the chores list; overdue sorted fewest days late first. C2
  dispatched. Vision gates C1 and C2 together.
- 2026-11-07: C2 DONE (Stark): tsc, eslint, npm test (1327 pass), build
  clean; `ƒ /api/cron/briefing` in the route list. Fury checked the SQL
  against `prisma migrate diff` from the old schema (identical, one CREATE
  TABLE, one unique index, one foreign key), linked the main checkout's
  `.env` into the worktree (never opened), confirmed the host prefix
  `ep-hidden-pine-` (dev), and ran `npx prisma migrate deploy` on dev:
  applied. Stark's choices: Pick a day period from `page.manage` schedule;
  kept `dynamic = "force-dynamic"` though Next 16 handlers are not cached
  by default. Vision and Captain dispatched.
- 2026-11-07: **Captain pass 1: BLOCKED (3, all from Fury's contract
  text).** B1 `briefingSent.ts` inline `P2002` check (use
  `isUniqueViolationError` from `prismaErrors.ts`). B2 `formatBriefingClock`
  is a second household-zone clock (move `feedbackTime.ts`'s private
  `CLOCK` into `householdDate.ts` as one export with a drop-`:00` option;
  add `hourInZone` beside it for `isBriefingHour`). B3 `isBriefingRecipientRole`
  is a dormant second "who gets a briefing" rule (delete; 
  `loadHouseholdAdults` is the one rule). Notes: amendments A-48-1 to A-48-6
  (proxy and guarded-route instances, Winnie sender callers, the clock,
  event-day rule ownership in `assistant/summary.ts`, a shared
  `vacationLabel` choice, the briefing modules), the meals read written
  twice, two User queries per run. Fix batch waits for Vision.
- 2026-11-07: **Vision pass 1: PASS** on 7b598d6. Re-ran the full gauntlet;
  proved every day of 2025 to 2027 has exactly one cron hour wholly inside
  Denver's 9 o'clock (Mar 8 and Nov 1 2026 checked); 401 paths incl. empty
  and unset secret; proxy entry exact (`/api/cron/briefingx` redirects).
  Notes taken into F1: no `maxDuration` (a slow Winnie could hit the
  function limit), a throw in `finishBriefing` after an accepted send
  misrecords it as unreachable, `loadHouseholdAdults` spreads and then
  overwrites `HOUSEHOLD_PERSON_WHERE.role`. Notes left: an adult with no
  habits on vacation gets "Nothing on today" (as the Today card); greeting
  uses the full displayName; family-typed titles may hold dashes; a whole-run
  read failure misses the day (H10).

### F1 - gate fixes (Captain B1 to B3, Vision notes)

- **Objective:** clear Captain's three blockers and three of Vision's notes
  without changing any briefing text.
- **Boundaries:** may touch `src/lib/briefingSent.ts`, `src/lib/briefing.ts`,
  `src/lib/briefing.test.ts`, `src/lib/householdDate.ts`, `src/lib/householdDate.test.ts`
  (if it exists; else add the tests to `src/lib/briefing.test.ts` and say
  so), `src/lib/feedbackTime.ts`, `src/lib/feedbackTime.test.ts` (if it
  exists), `src/lib/householdPeople.ts`, `src/app/api/cron/briefing/route.ts`.
  Must not touch anything else (STRUCTURE.md is Fury's).
- **B1:** `briefingSent.ts` uses `isUniqueViolationError` from
  `src/lib/prismaErrors.ts`; no inline `P2002`; drop the now-unused Prisma
  import.
- **B2:** move the household-zone clock into `src/lib/householdDate.ts` as
  one export, e.g. `formatHouseholdClock(instant, { dropZeroMinutes })`,
  returning a plain ASCII space before AM/PM. `feedbackTime.ts` drops its
  private `CLOCK` and calls it with `dropZeroMinutes: false` (its labels
  only lose a U+202F, if Intl emits one; say what its tests show).
  `briefing.ts` calls it with `dropZeroMinutes: true` and keeps
  `formatBriefingClock` only if it becomes a one-line wrapper (or drop it
  and call the export directly; say which). Add `hourInZone(instant,
  timeZone)` beside it from the same Intl parts (`hourCycle: "h23"`), and
  make `isBriefingHour` `hourInZone(now, HOUSEHOLD_TIME_ZONE) === 9`. Tests
  for both modes and for `hourInZone` at 8:59:59 / 9:00 / 23:59 in MST and
  MDT.
- **B3:** delete `isBriefingRecipientRole` and its test case;
  `loadHouseholdAdults` is the one rule.
- **Vision notes:** `export const maxDuration = 60` in the route (check the
  Next 16 route segment docs for the name; say what you found);
  `finishBriefing` after a send gets its own try/catch so an accepted send is
  never re-marked "unreachable" (log only the eventId); `loadHouseholdAdults`
  combines the household filter and the role filter with `AND: [HOUSEHOLD_PERSON_WHERE,
  { role: { in: MANAGER_ROLES } }]` instead of a spread that overwrites
  `role`.
- **Verification:** `npx tsc --noEmit`; `npx eslint .`; `npm test`; the
  UTC and America/Los_Angeles full runs; `npm run build`; `grep -rn
  "P2002" src/lib/briefingSent.ts` empty; `grep -rn "Intl.DateTimeFormat"
  src/lib/briefing.ts src/lib/feedbackTime.ts` empty.
- **Evidence required:** command tails; the new householdDate exports'
  signatures; any feedback label change shown by its tests.
- **Done criteria:** Captain and Vision re-pass; the approved six-line copy
  test is unchanged and green.
- 2026-11-07: F1 DONE (Stark). `householdDate.ts` gains
  `hourInZone(instant, timeZone)` and `formatHouseholdClock(instant,
  timeZone, { dropZeroMinutes })`; `feedbackTime.ts` uses it (labels
  unchanged by its tests); `formatBriefingClock` and
  `isBriefingRecipientRole` deleted; `isUniqueViolationError` in
  `briefingSent.ts`; `AND` filter in `loadHouseholdAdults`; `maxDuration =
  60` and a `recordOutcome` helper in the route. 1329 tests pass (UTC 1322
  + 7 DST skips). Vision pass 2 dispatched.
- 2026-11-07: **Hill on Captain's amendments** (Bryce: "for now ask all
  questions to Hill"): A-48-1 approve (high); A-48-2 approve with change,
  event-word homes written as instances, `connection.test`'s words stay in
  the action (medium; **approved by Bryce, 2026-11-07**); A-48-3 approve with change,
  delete the feedbackTime "only clock" sentence (high); A-48-4 approve with
  change, `findPlanForWeek` moves to `mealPlanWeek.ts` not
  `householdEvents.ts` (medium; **approved by Bryce, 2026-11-07**); A-48-5 approve as a
  pending rule naming its two sites (high); A-48-6 approve (high). Fury
  wrote all six into STRUCTURE.md. Captain pass 2 dispatched.
- 2026-11-07: **Captain pass 2: BLOCKED (1, Fury's amendment text).**
  B1 to B3 cleared, F1 code clean. Blocker: "only wall-clock hour reader"
  contradicted the browser-local homes (`timelineLayout.ts`, `EventForm.tsx`
  read local hours on purpose). Fury reworded it to "only zone-explicit
  wall-clock hour reader (server code...)" and took Captain's two wording
  notes on A-48-6. Captain said the fix needs only a check of that
  sentence, not a full pass.
- 2026-11-07: **Captain pass 2: PASS** at c06f964 (wording fix confirmed).

## Delivery

### Bryce's steps (plain English)

**1. Set `CRON_SECRET` in Vercel (about 3 minutes).** This is the password
Vercel's timer uses to call Marshee. Without it the briefing never runs.
1. Make a long random password. On the Mac, open Terminal and run
   `openssl rand -hex 32`, then copy what it prints. Don't paste it into
   any chat.
2. Open vercel.com, the family-hub project, Settings, Environment
   Variables, Add New.
3. Key: `CRON_SECRET`. Value: the text you copied. Environment:
   Production only. Turn on Sensitive. Save. Make sure no line break comes
   along at the end: a trailing newline fails the build with
   `INVALID_CRON_SECRET` (it happened on 2026-11-07).
4. Deployments, the newest Production one, the three dots, Redeploy. (A
   new variable only reaches the app after a redeploy.)
5. Optional check: Settings, Cron Jobs. Two jobs for `/api/cron/briefing`
   should be listed (15:00 and 16:00 UTC). One of them fires inside
   Denver's 9 o'clock hour each day; the other wakes up, sees it is 8 or
   10 AM Denver, and sends nothing.

**2. Confirm the first briefing (the next morning).**
1. Between 9:00 and 10:00 AM Denver, Winnie posts "Good morning, Bryce.
   Here's <day>." in your chat. It can come any time in that hour (the free
   plan picks the minute).
2. Ask Emily whether she got hers ("Good morning, Emily...").
3. If nothing arrived by 10:00: Vercel, the project, Logs, filter by
   `/api/cron/briefing`. A line `briefing sent=2 alreadySent=0 failed=0
   notConfigured=0` means Marshee sent both and Winnie accepted them. A run
   with no such line and status 200 is the other job (8 or 10 AM Denver),
   which is normal. A 401 means `CRON_SECRET` is missing or the redeploy
   didn't happen. `notConfigured=2` means Winnie's webhook settings are
   missing; `failed` means Winnie refused or couldn't be reached.
4. Each person gets one per day at most, even if Vercel calls twice.

### Calls for Bryce to look at (none block anything)
- H10 (medium): if Winnie is down for the whole 9 o'clock hour, that day's
  briefing is skipped, not sent later. **Still for Bryce to look at.**

**Approved by Bryce on 2026-11-07:** "I approve all of those calls, so you can clear the need for me to review them now."
That covers H2 (multi-day events read the Calendar's "Day 2 of 3 Trip"),
A-48-2 and A-48-4 (STRUCTURE.md homes for event words and the meal-plan
week rule), the medium content calls (the 9:00 to 9:59 send time,
"Nothing on today" on an empty day, the message wording) and the routine
high calls (H1, H3 to H8). H10 was not in what he was shown, so it stays
above.
- 2026-11-07: **Vision pass 2: PASS** on F1 (hour sweep 2025 to 2027 again
  clean; `hourInZone` matched the old method every minute of 2025 to 2027
  in five zones; `formatHouseholdClock` matched every minute of 2026;
  feedback labels unchanged). Notes: a failed status write after a refusal
  leaves the row "sending" (still blocks a resend); the two new
  householdDate helpers build an Intl formatter per call (fine at these
  volumes). Fury removed the worktree's `.env` symlink. **Status: all gates
  PASS; delivering.**

### Shipped check (2026-11-07)
- PR #71 merged as `ae8e0a4` after Gauntlet pass (2m17s) and the Vercel
  preview build; main had not moved, so no re-sync was needed.
- Production deploy `dpl_9wxxvsBKDix7AEEPAADgJq4dDt8d` READY at `ae8e0a4`.
  Build log: `Applying migration 20261112000000_winnie_briefing_sent`.
- `curl https://family-hub-xi-fawn.vercel.app/api/cron/briefing`: 401
  `{"error":"unauthorized"}`; a wrong bearer: 401;
  `/api/cron/briefingx`: 307 to `/login`.
- Crons: not read back through a tool (no Vercel CLI here); the deploy that
  carries them is READY, and Bryce's step 1.5 confirms them on the Cron
  Jobs page.
- First real send: the first 9 AM Denver run after Bryce sets
  `CRON_SECRET` and redeploys.
- 2026-11-07: Bryce set `CRON_SECRET` in Vercel (Production, Sensitive),
  helped by the parent session. The first try failed the build with
  `INVALID_CRON_SECRET` (a trailing newline); he replaced the value and
  redeployed; production is Ready on main. Fury re-checked the route: 401
  without the secret. First real briefing expected 2026-11-08 between 9:00
  and 9:59 Denver.
