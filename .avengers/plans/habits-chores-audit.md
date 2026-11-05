# Habits & Chores: audit of the direction (2026-11-05)

Written by Claude (Fable) at Bryce's request before any build plan: "Be
meticulous on how the coding would work. I want this to be commercial
grade." It reads `habits-chores-v1.md` (67 decisions), `plans-goals-v1.md`,
the live code on `main`, DESIGN.md and STRUCTURE.md, and asks: does every
decision fit together, can it be built cleanly, and where would a
professional team push back.

Every code fact below was read from the repo today (two read-only research
passes, file and line cited where it matters). Every recommendation is
marked. Nothing here is decided until Bryce answers the questions in
"Decisions for Bryce" at the end.

## Summary: the six findings that matter most

1. **The data model is the whole game.** "One habit system" (decision 14)
   cannot be built on today's `PlanItem`: it requires a goal, has no person,
   no schedule beyond "N per day/week/month", and its logs are one row per
   tap with no uniqueness. Recommendation: new `Habit` tables, and Plans &
   Goals habits move onto them. Hard to reverse, so it is question 1.
2. **Kids already exist in the data model.** A kid is a `User` row with no
   password (a "profile"). The family-accounts P3 code that gates by role
   has been on `main` since 2026-08-31, so it is live. CLAUDE.md's "not
   deployed" line is stale. The tablet can attribute taps to kids today.
3. **Two schedule rules contradict the "done or not done" rule.** Plans &
   Goals allows "3 times a day" and lets you log a habit twice in one day.
   Habits & Chores says done or not done. One rule has to win.
4. **Carry-over has a hole.** A chore carried from Wednesday that is also
   due Thursday would need one tap to satisfy two days. Needs a rule.
5. **Three interaction rules fight each other on a phone**: done rows
   dropping to the bottom while you tap, a drag handle inside a swipeable
   row, and Hide as a third row state. Each has a simple fix.
6. **Streaks need a storage decision**, not just a formula. Computing a
   two-year streak from every log on every page load is the kind of thing
   that is fine in month one and slow in year two.

## Part 1: What the code gives us today (facts)

- **Habits live inside goals.** `PlanItem` (`prisma/schema.prisma:797-827`)
  has `goalId` required, `kind` habit | step | reminder, `timesPerPeriod`
  and `period` (day | week | month), `sortOrder`. No person, no schedule
  days, no archive, no time of day.
- **A log is one tap.** `PlanLog` (`schema.prisma:829-849`): `planItemId`,
  `day` (Denver day at UTC midnight), `loggedById`. Index only, not unique,
  so two rows on one day are allowed. `logHabit`
  (`src/app/actions/planItems.ts:176-202`) checks "already at target" and
  then inserts in two separate statements with no transaction (a race:
  two fast taps can pass the target).
- **"N per day" exists.** `logWindow` (`src/lib/goalsProgress.ts:56-68`)
  turns "3 per day" into a weekly target of 21.
- **Together goals let anyone log**, including the tablet (`canLog`,
  `src/lib/goals.ts:105-107`, no device check). Only `canEdit` refuses
  devices.
- **People and roles.** `User.role` is admin | parent | kid | device
  (`schema.prisma:495-498`). `passwordHash` null means a non-login profile
  "who can be attributed to chores... later but doesn't sign in"
  (`schema.prisma:477-481`). `MANAGER_ROLES = ["admin", "parent"]`
  (`src/lib/constants.ts:243`). Admins create people from Settings, Manage
  family (`src/app/actions/users.ts:68`). The role-gate commit `42bb676` is
  an ancestor of `origin/main` (checked with `git merge-base`).
- **Per-person settings** are one `UserPreferences` row (`schema.prisma:
  702-721`): `dashboardLayout` (JSON text, `{ version: 1, widgets: [{ id,
  enabled }] }`) and `navMode`. New switches go here.
- **Dates.** Server "today" is Denver (`householdToday`,
  `src/lib/assistant/today.ts:21`). Weeks start Sunday (`startOfWeek`,
  `src/lib/householdDate.ts:114`). Day columns are UTC midnight instants.
  STRUCTURE.md requires calendar-component date math, never milliseconds.
- **Gestures.** `SwipeActions` (`src/components/SwipeActions.tsx`) uses
  pointer events with an 8px direction lock and `touch-pan-y`; a vertical
  move hands the gesture to the browser as a scroll. No gesture code has a
  test; no component anywhere has a test (559 tests, all pure `src/lib`).
- **No libraries** for drag and drop, animation, confetti, charts or dates
  are installed. Node 24. Prisma 7, React 19, Next 16.
- **No cron, no outbound webhook sender.** `vercel.json` has no `crons`.
  The Assistant API gate (`assistantRoute`) is token-hash plus rate limit
  plus audit log; it has no habit or goal endpoints yet.
- **Vocabulary placement.** `LIFE_AREAS`, `PLAN_KINDS`, `HABIT_PERIODS`
  live in `src/lib/goalVocabulary.ts` because `constants.ts` is at its
  line cap. Dashboard widget ids live in `src/lib/dashboardWidgets.ts`.
- **A new `src/lib/habits/` directory needs its test glob added in three
  places** (`package.json` test script and both CI timezone steps,
  STRUCTURE.md:681-690) or its tests silently never run.
- **Route today:** `/routines` is a "Coming soon" page; `/chores` redirects
  to it (`src/lib/routeRedirects.ts:8`).

## Part 2: Findings, by area

Each finding gives the decision as written, the problem, and a
recommendation. "Hard to reverse" marks the ones that shape stored data.

### A. Identity: kids, the tablet, and who may do what

**A1. Kids are already modelled; use it.** Decisions 26 and 53 put kids on
the tablet without saying what a kid *is* in the data. The answer exists:
a `User` row with `role: "kid"` and no password. A habit's participants
are `User` ids, kids included. The tablet (a `device` User) taps on a
kid's behalf, and the log records both who it was for and who tapped.
Recommendation: no new "family member" table. One correction: the
CLAUDE.md lines "P3 not deployed" and "do not create a kid login until P3
is deployed" are stale; the gates are live. A kid *profile* (no password)
is safe to create now; a kid *login* (password) is a separate choice.

**A2. "Log for whom" needs a written policy.** Today `canLog` is "owner or
Together". With kids and a shared tablet it becomes:
- a person may check their own items;
- the tablet may check for any participant (the family view);
- a parent or admin may check for anyone (marking a kid's chore from a
  phone);
- a kid with their own login (later) may check only their own.
Every write action takes an explicit `forUserId` and checks this in one
function (`canLogFor`), the way `canEdit` is one function today.

**A3. Who may edit, archive and delete a shared habit.** Not decided.
Recommendation: any participant who is a signed-in person, plus any
parent or admin. The tablet may never edit (matches goals today).

### B. One habit system: the data model (hard to reverse)

**B1. Extend `PlanItem`, or build `Habit`?** Two honest options.

- *Option A, extend `PlanItem`:* make `goalId` optional, add a dozen
  columns (schedule, days, carry-over, time of day, life area, icon,
  build/quit, sharing, archive, private), add a participants table, and
  teach `PlanLog` about people and statuses. Cheapest today. But the table
  then holds three different things (a step, a reminder, a chore with no
  goal), "PlanItem" lies as a name for a chore, and every reader has to
  check which shape a row is.
- *Option B, new `Habit` tables:* `Habit`, `HabitParticipant`, `HabitLog`
  and friends (sketch in Part 3). A goal's plan links to a habit through
  `PlanItem.habitId`; steps and reminders stay as they are. Existing
  Plans & Goals habits are copied onto the new tables by the migration
  (additive: inserts plus one value-only update of `habitId`), and their
  old columns are left in place but unread. Plans & Goals reads progress
  through the habit engine.

Recommendation: **Option B.** The schedule engine is about to be the most
complex logic in Marshee; it deserves its own tables, its own `src/lib/
habits/` module and its own tests, with no "is this row a step?" checks
in the middle of it. Plans & Goals went live yesterday, so the data to
move is tiny and the rewiring (`goalsProgress.ts`, `goalsRead.ts`,
`planItems.ts`, `ThisWeekList`, `GoalDetail`, `PlanItemSheet`, the
recap and the tile) is the price of doing this once. The "Show in
Routines" switch disappears: every habit is in Habits & Chores by
definition.

**B2. One check per person per day, as a database rule.** Decision 9 says
done or not done. Make it a unique constraint on `HabitLog (habitId,
userId, day)`. A double tap becomes a no-op instead of a second row, the
`logHabit` race disappears, and undo is "delete by key". This also means
**"N times a day" goes away** (Plans & Goals offers it today; it would
become "every day") and a weekly habit can be checked at most once per
day. Both are changes to Plans & Goals behaviour and need Bryce's yes.

**B3. "Together" means fan-out, not a shared row.** A Together check
writes one `HabitLog` row per participant in one transaction (undo
deletes them all). Every statistic then reads one way: per person. The
alternative (one row with no person) makes every stats query special-case
Together habits and needs a Postgres `NULLS NOT DISTINCT` index that
Prisma cannot express in the schema.

**B4. Day columns as real dates.** New `day` columns should be Postgres
`date` (`@db.Date`) rather than a timestamp that is "always midnight by
convention". The helpers (`utcMidnightInstant`, `calendarDateInZone`) keep
working unchanged; the column simply cannot hold a wrong value.

**B5. Vocabulary placement.** A new `src/lib/habitVocabulary.ts` (schedule
kinds, times of day, sharing modes, statuses, the icon allow-list) next to
`goalVocabulary.ts`, since `constants.ts` is at its cap. Icons are stored
as Lucide names and validated against the allow-list, so a typo can never
render a blank icon.

### C. Schedules, due days, carry-over, done late

**C1. Two of the six schedules are one schedule.** "Once a week, any day"
is "a number of times a week" with the number 1. Merge them: *Weekly, N
times (1 to 7)*. Likewise "once a month" is *Monthly, N times* with N = 1
(Plans & Goals already has N per month). The form offers five choices:
Every day, Certain days, Weekly, Every other week, Monthly.

**C2. "Every other week" needs an anchor and, optionally, days.** Decision
31 stores "this week or next"; store it as the Sunday of the first due
week. Emily's "sheets every other Tuesday" also needs weekdays on this
schedule. Recommendation: every-other-week takes optional certain days;
with none it is "any day that week".

**C3. Define "required today" versus "open".** Streaks, perfect days and
the Today list all need one definition per schedule:
- Every day, Certain days, Every other week with days: *required* on
  those days.
- Weekly N, Monthly N, Every other week with no days: *open* every day of
  the period until N is reached, never required, except on a planned day
  (see G1), when it is required.
Perfect day (decision 18) then means "every required habit done or
skipped". This keeps a 4-times-a-week workout from breaking every perfect
day. Needs Bryce's yes.

**C4. Carry-over only applies to scheduled-day items.** A weekly or
monthly item is already open until done; "carry over" means nothing for
it. The switch shows only on Every day, Certain days and Every other week
with days.

**C5. The carry-over hole.** Bathrooms due Wednesday, carry-over on, also
due Thursday (say Wed and Thu). Decision 5 says it shows once on Thursday;
decision 6 says the tap is saved as "done late" on Wednesday. Then
Thursday's own instance is still undone. Recommendation: when a carried
item is also due today, the carry-over is *absorbed*: Wednesday stays
missed, today's tap counts for today, no "done late" row. "Done late" is
written only when the item is not otherwise due today. And a carried item
keeps carrying day after day until it is done or until its next due day
absorbs it. Needs Bryce's yes.

**C6. Back-fill and carry-over mean different things; say so in the UI.**
Marking Wednesday done from the month calendar (back-fill, 7 days) says
"I did it Wednesday and forgot to check": done on time, streak kept.
Tapping the carried row Thursday says "I did it Thursday": done late,
streak broken. Both are right; the words on screen must make the
difference obvious ("Mark as done on Wed" versus the carried row's
"From Wednesday" tag). No change to the decisions.

**C7. Time of day is grouping only.** Morning, Afternoon, Evening (fixed
hours, decision 63) affect order, filter chips and Winnie's bundle. A
Morning item not done by noon is not late. State it so nobody builds
"overdue at noon".

**C8. Changing a schedule rewrites history in effect.** Switching a habit
from daily to weekly recomputes streaks with the new rule applied to old
logs. Commercial apps accept this quirk; versioned schedules are overkill.
Document it; show a one-line note in the editor when the schedule changes.

### D. Streaks, skips, vacation, stats

**D1. Streak storage (structure).** Two ways:
- *Compute on read:* load every log for every habit on every page. Fine
  for months; a two-year daily streak means thousands of rows per page
  load, on a phone, from Neon.
- *Cache on the participant row:* `HabitParticipant.currentStreak`,
  `bestStreak`, `streakAsOf` (the last day counted), recomputed inside the
  same transaction as every write that can change them (check, undo,
  skip, back-fill, a vacation period, a schedule edit, a this-week
  change). On read, the pure engine only has to walk the days between
  `streakAsOf` and yesterday with the schedule and vacations (no logs) to
  see whether the streak has since broken.
Recommendation: cache, with a pure `streaks.ts` that is the single
formula in both paths, and an admin-only "Recompute streaks" button in
Settings as the escape hatch (Habit tracker has "Fix Stats" for exactly
this reason). The Today page then loads only the last 14 days of logs.

**D2. Skip, vacation and status live in one place.** `HabitLog.status` is
done | late | skipped (no separate skip table). Vacation (decision 57) is
*not* written as skips: a `VacationPeriod` table (per person, start and
end day) is consulted by the engine, so a past vacation stays excused
forever and a future one can be edited. Winnie's texts pause during a
vacation.

**D3. Streak rules, written down.** Daily and Certain-days streaks count
due days only; a non-due day never breaks them. Weekly and monthly
streaks count periods, and the current period counts as soon as N is
reached. A skipped or vacation day is excused (streak survives, does not
grow). A back-filled day counts as done. A "late" row keeps the day
missed. Today never breaks a streak until it is over (Denver midnight).

**D4. Default for the streak switch:** on. (Not stated anywhere.)

**D5. Streak switch scope.** Decision 15 says one switch per person.
Recommendation: it is a *viewing* preference, like Menu style. Off hides
flames and streak numbers from that person's own screens; the family
tablet still shows everyone's. Needs Bryce's yes.

### E. Sharing: Together, Side by side, Everyone, nudges, privacy

**E1. Participants plus a mode.** Decisions 3 and 50 collapse into: a
habit has a list of participants (one person, some, or everyone) and a
sharing mode, Together (one check counts for all) or Each (side by side).
"Everyone" is a shortcut in the picker that selects every active person,
not a stored flag, so a new family member joins by being added, never by
surprise.

**E2. A goal's habit gets its participants from the goal.** A Mine goal:
the owner. A Together goal: everyone. If the goal later flips Mine to
Together, the habit's participants are updated in the same action.

**E3. Private habits.** Goals can be private; habits cannot (not decided).
A Quit habit can be personal. Recommendation: a Private switch on
single-person habits; private habits are hidden from the family view and
from everyone else's screens, and never appear in nudges or texts. A
habit linked to a private goal is private. Needs Bryce's yes.

**E4. Nudges.** A `Nudge` row (habit, from, to, day, seen). At most one
per person per habit per day (unique key), shown until seen or until the
item is done. Only a participant may nudge; the tablet cannot.

**E5. Kids and shared habits.** A kid joins a side-by-side habit as a
participant like anyone else; checks come from the tablet (A2). Nothing
extra to build.

### F. Lists, ordering, drag and drop, swipe, archive, delete

**F1. Done rows dropping to the bottom while you tap (decision 60).** With
optimistic updates, the row would jump the instant you tap, and the next
row slides up under your thumb: the "eaten tap" problem in a new form.
Recommendation: done items sort to the bottom *on load* (open the tab,
come back to it, pull to refresh); a row you check in the moment stays
where it is with a filled check. Needs Bryce's yes.

**F2. Hide (decision 19).** With done-to-bottom and filter chips, Hide
adds a third row state ("not done, not skipped, just not shown") that is
hard to explain and easy to confuse with Skip. Recommendation: drop Hide
from v1. Needs Bryce's yes.

**F3. No swipe inside the manager.** The mock drew a grip handle and a
swipe strip on the same row. The code can make them coexist (the handle
gets `touch-action: none` and stops the pointer event before
`SwipeActions` sees it), but two gestures on one row is exactly the kind
of thing that works in a desktop browser and fails on a real iPad.
Recommendation: in the manager, *tap a row to edit* (the editor holds
Archive and Delete at the bottom), and the handle is the only gesture.
On the Today list, tap the check and swipe for Skip. Needs Bryce's yes.

**F4. Drag and drop (structure).** Recommendation: `@dnd-kit/core` plus
`@dnd-kit/sortable`, pinned to an exact version, with activation only on
the handle, `touch-action: none` and iOS `-webkit-touch-callout: none` on
the handle, and the keyboard sensor for accessibility. First contract is
a one-screen spike proved on Bryce's iPad before anything is built on it;
the fallback is a hand-written pointer sortable (about 150 lines, which
we fully control but must test ourselves). The dashboard's Customize
sheet switches to the same component in the dashboard PR.

**F5. Order is per person.** `sortOrder` lives on `HabitParticipant`, so
Bryce and Emily can each place Couples Prayers where they like, and the
family view uses each person's order.

**F6. Archive and Delete.** `Habit.archivedAt`. Archived habits vanish
from every list, keep their logs and stats, show in the manager's
Archived list, and can be restored. Delete stays one tap (cascades logs);
in the editor it sits last, after Archive. A habit linked to a goal, when
deleted, also leaves the goal's plan.

### G. Dashboard, plan the day, calendar, shout-outs, confetti

**G1. Planned days are per participant.** A `HabitPlannedDay` row (habit,
person, day), fanned out for Together habits like logs. The in-app prompt
needs no cron: the Today page and dashboard compute "is today a prompt
day for this unplanned item?" on read. Only Winnie's texts need a clock.

**G2. Planned days on the Calendar (decision 40): read, don't copy.**
Creating a `Task` per planned day means two copies to keep in sync. The
calendar should read planned days from the habit tables and draw them as
tasks. Second PR, as decided.

**G3. One celebration, not two.** Decision 23's daily chore shout-out and
decision 64's confetti both fire when today's work is finished.
Recommendation: one moment, confetti plus a line, when every required
item today is done or skipped; the Sunday "all week's chores" shout-out
stays separate. Confetti is `canvas-confetti` (tiny, no React dependency),
respects "reduce motion", fires once per day per device (a browser-local
marker, which is a per-viewer convenience and allowed).

**G4. The item picker (decision 44).** The dashboard layout JSON gains an
optional `items` list per widget (`version` stays 1; unknown ids are
dropped by the parser as today). An empty list means the default (up to
three due and not done, decision 48).

### H. Winnie texts (its own project, noted so the model allows for it)

- Vercel cron runs in UTC; "8:00 am Denver" moves by an hour at daylight
  saving. Run hourly and send when the Denver hour is 8.
- Idempotency: a `NotificationDelivery` row per person per day, written
  before the call, so a retry never sends twice.
- The webhook carries a signed body (shared secret in Vercel env, HMAC),
  and Winnie's URL is configuration, never code.
- Opt-in per person is `UserPreferences.winnieTexts`.

### I. Routes, nav, settings, Plans & Goals wording

**I1. Route rename.** `/routines` becomes `/habits`; `/routines` and
`/chores` redirect to it (`routeRedirects.ts` plus its test). Nav label
"Habits & Chores".

**I2. Settings section.** A "Habits & Chores" group on `/settings`:
Streaks (switch), Vacation mode (dates), later Texts from Winnie, and for
admins "Recompute streaks". `saveNavMode` today accepts the tablet while
`saveDashboardLayout` refuses it; the new actions refuse devices like the
dashboard one.

**I3. Plans & Goals keeps its screens, loses two options.** This week,
the goal page, the tile and the recap keep their look; their data comes
from the habit engine. The "times a day" period and the second log in a
day go away (B2). The "Add to the plan" sheet's Habit choice creates a
real habit (participants from the goal, life area from the goal) or links
an existing one.

### J. Performance

- Indexes: `HabitLog (habitId, userId, day)` unique; `HabitParticipant
  (userId)`; `HabitPlannedDay (userId, day)`.
- The Today page runs a fixed small number of queries whatever the
  habit count (habits with participants, logs for 14 days, planned days,
  overrides for this week, vacations, nudges); never one query per habit.
- Stats for one habit load that habit's full history (one habit, one
  query). The Report loads by the range shown.
- Streak cache (D1) keeps the common pages cheap for years.

### K. Security and integrity

- Every write is a Server Action that checks the session, then
  `canLogFor` or `canEdit`, then the row, in that order (the goals
  pattern). The tablet may check and un-check only; never create, edit,
  archive, delete, nudge, plan a day or change settings.
- Writes that touch several rows (Together fan-out, log plus streak
  recompute) run in one `$transaction`.
- Back-fill accepts a day no earlier than 7 days ago and never a future
  day; the server, not the client, decides "today".
- The unique constraints are the guard against duplicates; code checks
  are a courtesy message, not the defence.
- Shared logic goes in `src/lib/habits/*Writes.ts` so the Assistant API
  can reuse it later without a second definition (STRUCTURE.md's
  `<domain>Writes.ts` rule).

### L. Testing and the quality bar

- The engine is pure and lives in `src/lib/habits/`: `schedule.ts`
  (required/open today, next due day), `carryOver.ts`, `streaks.ts`,
  `perfectDays.ts`, `planPrompts.ts`, `access.ts`. Each has a colocated
  test; the suite runs in Denver, UTC and Los Angeles in CI already, which
  catches midnight and daylight-saving mistakes.
- Test glob: the new directory is added to `package.json` and both CI
  timezone steps in the same commit as the first test (STRUCTURE.md rule).
- Gesture and drag code has no automated test anywhere in Marshee. For
  this feature the check is Strange on a real iPad viewport plus Bryce's
  sixty seconds on a phone; a Playwright smoke suite on an iPad viewport
  is a worthwhile separate project after this.
- Every PR runs the Gauntlet (typecheck, lint, three-timezone tests,
  build, record check).

### M. Found in passing (not this feature, worth knowing)

- `logHabit` race (two statements, no transaction): fixed for free by B2.
- `GroceryList` deletes optimistically (`GroceryList.tsx:48-49`) while
  DESIGN.md:94-104 says destructive verbs wait for the server.
- `saveNavMode` accepts device logins; `saveDashboardLayout` refuses them.
- Schema comment on `Goal` still says five life areas (`schema.prisma:
  724-725, 737`); the code has six.
- `usePageSwipe.ts` header cites `SwipeActions.tsx` line numbers that have
  moved.
- CLAUDE.md says P3 is not deployed; it has been on `main` since
  2026-08-31.

## Part 3: Proposed data model (sketch, not final)

```
Habit
  id, title, kind ("habit" | "chore"), mode ("build" | "quit")
  icon (Lucide name from the allow-list), lifeArea?, timeOfDay?
  schedule ("daily" | "weekdays" | "weekly" | "biweekly" | "monthly")
  weekdays?  (Sun..Sat set, for weekdays and biweekly)
  times?     (1..7 weekly, 1..31 monthly)
  anchorWeek? (Sunday of the first due week, biweekly)
  carryOver Boolean, sharing ("together" | "each"), isPrivate Boolean
  archivedAt?, createdById?, createdAt, updatedAt

HabitParticipant   (habitId, userId) unique
  sortOrder, currentStreak, bestStreak, streakAsOf?, joinedAt

HabitLog           (habitId, userId, day) unique
  status ("done" | "late" | "skipped"), loggedById?, createdAt

HabitPlannedDay    (habitId, userId, day) unique
ChoreWeekOverride  (habitId, weekStart) unique: action "moved" | "skipped",
                   toWeekday?
VacationPeriod     userId, startDay, endDay
Nudge              (habitId, fromUserId, toUserId, day) unique, seenAt?

PlanItem           + habitId? (a goal's habit is a link to a Habit)
UserPreferences    + showStreaks Boolean default true (+ winnieTexts later)
```

Day columns are `@db.Date`. No Prisma enums (house rule); string
vocabularies with `toX()` narrowers in `habitVocabulary.ts`.

## Part 4: Proposed PR slicing

The approved "first PR" (tab, items, schedules, carry-over, streaks, family
view, manager, skip, icons, archive, drag and drop, confetti) is six or
seven tables and twenty-five files: too big to review or to gate well.
Proposed instead, each one shippable and reviewable on its own:

- **PR A, the engine and the move.** Tables, migration with the Plans &
  Goals backfill, `src/lib/habits/` with tests, Plans & Goals rewired to
  read through it, `/habits` route and redirects, Settings streak switch.
  No new screens beyond what keeps Plans & Goals working. The biggest
  review; the one that must be right.
- **PR B, the tab.** Today list (check, undo, skip, carry-over tags,
  filter chips, done-to-bottom on load), the manager (add, edit, archive,
  delete, drag and drop after the spike), the new-item form, icons.
- **PR C, streaks and the family.** Streak on rows, the habit stats page
  (streaks, month calendar, back-fill), side-by-side table and chart,
  nudges, the family tablet view, confetti.
- **PR D, chores.** Chore chart, this-week changes, chore streak, Sunday
  shout-out, vacation mode.
- **PR E, the dashboard.** Tiles, the item picker (habits and goals),
  planned-day prompts on the dashboard, planned days on the calendar,
  drag and drop in Customize.
- **PR F, the Report view** and the idea library (wording approved first).
- **Later, own projects:** Winnie texts; the in-app assistant button;
  a Playwright smoke suite.

## Part 5: Decisions for Bryce

Hard to reverse first. "Recommend" is Claude's position and why.

1. **New `Habit` tables, Plans & Goals habits move onto them** (B1).
   Recommend yes: the engine gets a clean home, and the move is cheap
   now and expensive later.
2. **One check per person per day, everywhere; "N times a day" is
   removed from Plans & Goals** (B2). Recommend yes: done or not done is
   the rule, and the database can then enforce it.
3. **Five schedules**: Every day, Certain days, Weekly N times, Every
   other week (optional days), Monthly N times (C1, C2). Recommend yes.
4. **Required versus open** (C3): weekly and monthly items never break a
   perfect day except on a planned day. Recommend yes.
5. **Carry-over rules** (C4, C5): only for scheduled-day items; absorbed
   when also due today; carries until done or absorbed. Recommend yes.
6. **Drop Hide** (F2). Recommend yes.
7. **Done rows move to the bottom on the next load, not under your
   thumb** (F1). Recommend yes.
8. **Manager rows: tap to edit, handle to drag, no swipe; Today rows: tap
   the check, swipe for Skip** (F3). Recommend yes.
9. **One celebration** (G3): confetti when everything required today is
   done; the Sunday chores shout-out stays. Recommend yes.
10. **Streak switch is a viewing preference** (D5): hides streaks on your
    own screens; the tablet shows everyone's. Recommend yes.
11. **Private habits** (E3): a switch on single-person habits. Recommend
    yes.
12. **Who may check for whom** (A2): yourself; the tablet for anyone;
    parents for anyone. Recommend yes.
13. **Streaks are cached on the participant row and recomputed on every
    write, with an admin Recompute button** (D1). Structure, Claude's
    call, but say if you object.
14. **Drag and drop with dnd-kit, proved on your iPad first** (F4).
    Structure, Claude's call.
15. **Six PRs, A to F** (Part 4), replacing the approved "first PR" list.
    Recommend yes: smaller, safer, each one usable.
16. **Record fix**: CLAUDE.md's "P3 not deployed" is corrected to "live
    since 2026-08-31"; kid profiles (no password) may be created from
    Settings when you are ready. Confirm.

## Part 6: What changes in the mock once these are answered

- New item form: five schedule choices with a stepper for "times"; the
  carry-over switch appears only for scheduled-day items; a Private switch
  on single-person habits; "Everyone" becomes a shortcut in the people
  picker.
- Manager: no swipe strip; tap a row to open the editor, which ends with
  Archive and Delete.
- Today list: swipe shows Skip today only.
- Settings: adds an admin-only "Recompute streaks".
