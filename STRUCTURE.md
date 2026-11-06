# STRUCTURE.md — Marshee

Captain's constitution for this repo. It codifies the layout and boundaries
the project already holds (full reasoning in docs/history/claude-md-archive-2026-10-31.md); Captain gates
structural changes against it.

## Layout map

| Path | What lives here | What never lives here |
|---|---|---|
| `src/app/(app)/` | Authenticated routes, wrapped in `AppChrome` (drawer, hamburger, and the wordmark header on `/` and `/login`). `/login` deliberately lives here too and gets no drawer (`AppChrome` is handed no user), rather than moving to a separate layout for one page | Pages needing a genuinely chrome-free root layout; those go in `src/app/share/` |
| `src/app/share/` | Public token-gated pages (own root layout, no chrome, `noindex`) | Anything session-dependent |
| `src/app/api/` | Route Handlers for non-browser clients (e.g. `/api/voice`, `/api/assistant/v1/`). A handler may run its own reads the way a page does — one `Promise.all`, a narrow `select`, shaped by a lib serializer; every write, and any rule the app also applies (a threshold, a bucket, a filter), is a lib call | Logic that belongs in an action or lib — writes and shared rules above all |
| `src/app/actions/` | Server Actions — **every exported action opens with a DAL guard, except `auth.ts`'s `login`/`logout`** — a login action can't require the session it exists to create. Two forms, chosen by who can reach the trigger, never by taste (see the guard-form rule below) | Unguarded exports outside that one named exception; pure logic (goes in lib); hiding a control instead of guarding its action |
| `src/proxy.ts` | The Next 16 proxy — redirect-to-login UX, plus the narrow public routes (`/login`, `/api/voice`, `/api/alexa` — exact matches) and prefixes (`/share/recipe/`, `/share/cookbook/`, `/api/assistant/v1/`) | A second `middleware.ts` file (won't run under Next 16); treating this as the real auth gate — that's the in-action `getVerifiedSession()` guard, this is only UX |
| `src/lib/` | Pure helpers, `server-only` AI/external-call wrappers (no auth checks of their own — the wrapping Server Action guards), and the auth/db infrastructure itself (`dal.ts`, `session.ts`, `db.ts`) | Anything importing from `app/` or `components/` |
| `src/components/` | Shared client components, flat directory, PascalCase | Server-only logic |
| `src/generated/` | Generated Prisma client — never hand-edited, exempt from all caps | Everything else |
| `prisma/` | Schema, **additive-only** migrations, the Vercel build hook (`migrate-on-production.mjs` — applies migrations to production at release time, and nowhere else), scoped seed/clean scripts, and `bootstrap-*` scripts — interactive, prompt-driven, idempotent (upsert-keyed) creators of *real* household data, which deliberately have **no** clean counterpart | Blanket `deleteMany` seed scripts; any clean/reset script targeting a table that holds real hand-entered household data — the `User` table above all |
| `brand/` | Master brand vectors (`marshee-mark.svg`, `marshee-wordmark.svg`, `marshee-app-icon.svg`) — the source every other brand asset is generated from. Committed so the artwork and the generated files can't silently drift; **never imported by app code** (the components in `src/components/` carry their own copy of the path data, generated from these) | Generated output — the icon PNG/ICO files live in `src/app/` as Next's file conventions require; anything the app imports at build or runtime |
| `alexa/` | Alexa skill configuration data (the interaction model), committed so the developer console and the repo can't silently drift. Hand-copied into Amazon's console; never imported by app code | Anything the app imports at build or runtime |

## Boundary rules

- **The guarded-action / pure-call split.** Every AI or external-service call
  is a pure `server-only` function in `src/lib/` with *no* auth check, wrapped
  by a Server Action in `src/app/actions/` that calls `getVerifiedSession()`
  first (`voice/parse.ts`, `mealSuggest.ts`, `recipeExtract.ts`,
  `ingredientParse.ts`, `nutritionEstimate.ts` all follow it). New calls
  follow the same split — auth lives next to the data, once, in the action.
  For non-browser clients that cannot hold a session, the guard may instead
  be a Route Handler in `src/app/api/` whose own auth check (a shared token,
  or a platform signature plus skill ID) runs before the body is parsed and
  before any lib call — `/api/voice`, `/api/alexa` and `/api/assistant/v1/`
  (whose gate is the shared `assistantRoute` wrapper) are the three instances.
  The invariant is the same either way: the pure `server-only` call carries
  no auth, and exactly one guarded caller does.
  **Domain write modules** (added 2026-10-09, mission-21; Bryce-approved). A
  `server-only` lib module that owns a domain's database writes —
  `pantryWrites.ts` is the first; the Assistant API plan adds
  `groceryWrites.ts`, `putAway.ts`, `recipeWrites.ts`, `mealPlanWrites.ts`,
  `calendarWrites.ts`, `taskWrites.ts` — may have **several guarded
  callers** (a Server Action and an `/api/assistant/v1/` route); "exactly one
  guarded caller" above governs AI/external calls. Each caller carries its
  own gate; the module carries none, never receives a session or role for
  gating, and never calls `revalidatePath` (that stays in the action, per the
  revalidation rule). Once extracted, the module is the **only** home of its
  domain's write rules — the same rule re-implemented in an action or a
  route is a second definition and a BLOCKER. Name it `<domain>Writes.ts`
  (or for its verb, like `putAway.ts`); where an action shares a function's
  name, the action imports it under an alias that names the lower layer:
  `write…` or `…Row(s)` (`setPantryQuantity as writePantryQuantity`,
  `reorderHabits as reorderHabitRows`, `markNudgeSeen as markNudgeSeenRow`
  are the instances).
- **Dependency direction:** `lib` imports from nothing above it (never `app/`
  or `components/`); `components` may import `lib` and `actions`; `actions`
  import `lib` and the db. No cycles, ever.
  A client hook in `src/lib/` that needs a Server Action **receives it as a
  parameter** — a small named type beside the hook
  (`type XFetchers = { … }`) describing only the signature — and the
  component that owns the view imports the action and injects it.
  `useScheduleWindow` / `ScheduleView.tsx` (`ScheduleFetchers`,
  mission-15/C5) and `useScheduleHabitDays` (`fetchHabitDays`, mission-35)
  are the instances. A lib file importing from
  `@/app/actions/` is the same backward arrow as any other lib→app import
  and is a **BLOCKER**; `grep -rn "@/app" src/lib/` must stay empty.
- **Server Actions are public POST endpoints.** Protecting pages (proxy.ts)
  is UX, not security — the `getVerifiedSession()` guard inside each action
  is the real gate. Public routes are added to proxy.ts as exact matches
  (`PUBLIC_ROUTES`) or — only when a token rides in the path — as *narrow*
  prefixes (`/share/recipe/`, not `/share`); the proxy drills proved the
  sloppy prefix opens real holes. **Amended 2026-10-09 (Bryce-approved,
  mission-21):** one further prefix is permitted **by name**:
  `/api/assistant/v1/`. It is an instance, not a category — any other
  subtree, including `/api/assistant/v2/`, needs its own amendment. What
  justifies it is mechanical and tested: every route file serving under that
  prefix exports only `export const <METHOD> = assistantRoute(...)`, and
  `src/lib/assistant/openapi.test.ts` fails if any exported method there is
  built another way. That test is regex-based and has **known evasions**
  (a string containing `/*` fooling its comment stripper, annotated exports,
  dynamic segments above `v1`) recorded in mission-21's Vision pass 3;
  hardening it with the TypeScript compiler API is mission 22's first
  contract. Until then the rule binds by review as well as by test. A route
  under that prefix that bypasses the wrapper is a BLOCKER — proxy will not
  stop it.
- **No Prisma enums or provider-specific schema features.** TypeScript via
  `constants.ts` enforces vocabularies instead. This is what made the
  SQLite→Postgres move a provider swap, not a rewrite.
- **Date math is calendar-component math, never milliseconds**, and "what day
  is it" is decided on the client (`useToday.ts`) — or, for a server with no
  browser behind it, zone-explicitly via `householdDate.ts` (see One source
  of truth) — Vercel runs UTC, the
  household runs Mountain.
- **AI picks from our data are grounded by index, never by name-matching** —
  numbered options out, an integer back (the steaks/"tea" lesson).
- **Browser-only reads use `useSyncExternalStore`**, not
  `useState`+`useEffect` (hydration mismatch — lint enforces it).
- **Which guard form an action uses is decided by who can reach its
  trigger, never by taste.**
  **(a) Null-returning** — `getVerifiedSession()` or `getVerifiedUser()`,
  failing with the file's house shape (`{ error }`, void, or the typed
  empty value). **Required for any action a legitimately signed-in user
  can trigger from shipped UI**: those callers render failures inline, so
  a thrown `redirect()` would bounce the browser mid-request. Role checks
  in this form read `MANAGER_ROLES` (or a named role) from
  `constants.ts` — never a hand-rolled role list.
  For a **data-returning** read action the house shape distinguishes
  **refusal** from **emptiness**, chosen **per action, not per file** — a
  file may hold `{ error }` writers and data readers side by side
  (`fetchCalendarEvents` in `actions/calendar.ts`, `fetchTasks` in
  `actions/tasks.ts`). A read action is still a public POST: it treats its
  typed inputs as claims (`Date` instance, not NaN, `end > start`) and
  **bounds any range it will scan with an explicit span cap**, returning
  **`null`** on any refusal rather than throwing — while the type's own
  empty value (`[]` for a list) means the request SUCCEEDED and genuinely
  found nothing. **Amended 2026-09-05, Bryce-approved**: this clause used
  to say refuse with the empty value, and mission-15/C6 found that costs a
  real bug — a client that cannot tell "you may not have this" from "there
  is nothing here" either retries a refusal forever or treats an
  unconfirmed range as checked territory. The Schedule's endless scroll
  walled off every event beyond the first quiet month for exactly that
  reason. A caller that ignores the distinction is free to; one that needs
  it must be able to make it. That cap is **one
  security number for every endpoint that scans a range**, and its home is
  `src/lib/` (proposed `fetchWindow.ts`: `MAX_FETCH_SPAN_DAYS`,
  `isValidDate`, `isAcceptableFetchWindow`), imported by each action —
  never re-declared per action file, which the `use server`
  no-plain-exports rule would otherwise push you toward. The two existing
  copies are **grandfathered debt to migrate in one contract, not a
  pattern to cite**; a third copy is a BLOCKER.
  (Added 2026-09-04, mission-15, on Captain's ruling; Bryce approved.)
  **(b) Redirecting** — `requireRole(...)`, permitted **only** when every
  export in the file requires the same role *and* the file's only UI
  lives behind a page gated by that same `requireRole`. An authorization
  failure then means the caller doesn't belong on the page at all, and
  the redirect matches the page's own bounce. `users.ts` and
  `usersRoles.ts` behind `/settings/family` are the instances. Internal
  *domain* guards (self-targeting, the last-admin lockout) still return
  the house shape — "you don't belong here" and "you're allowed, but this
  can't happen" are different outcomes.
  **(c) Membership** — the third form, added 2026-09-04 (mission-13/CT1,
  Bryce-approved; written up 2026-09-05). Some actions are reachable by a
  user whose *role* does not permit them but whose *relationship to the
  specific row* does — a kid may complete a task they are genuinely
  assigned to, and nothing else. That check reads the join table for that
  exact row (`assertCanCompleteTask` in `actions/tasks.ts` is the
  reference implementation) and is **not** expressible as a role list, so
  it never lives in `constants.ts`. Two rules bind it. The membership fact
  is read **fresh from the database, never from anything the client
  sent** — a client claim of membership is exactly the forgery the guard
  exists to stop (mission-16/C3b's deactivated-person carve-out is the
  second instance of *this* rule only — see the correction below). And a membership guard
  **narrows, never widens** *as a caller guard*: it may permit a
  role-refused caller for one row, and may never permit anything the role
  gate refuses for a reason other than that row.
  **Corrected 2026-09-05 on Captain's finding, the same day it was
  written:** the C3b citation above is the second instance of the
  **fresh-read discipline**, not of this caller-guard form. C3b relaxes
  which *person ids* may be written to a row whose callers are
  manager-gated either way — a **value** carve-out, and one that widens
  the accepted set — so "narrows, never widens" does not reach it. What
  the two genuinely share, and what generalises, is the shape worth
  naming: a blanket refusal relaxed for **one specific row**, on a fact
  **read fresh from the database**. A clause whose binding rule cannot
  describe the case it cites produces unsound verdicts later, which is
  why this was fixed before form (c) was ever used to judge anything.
  Pages use the redirecting guards (`requireVerifiedUser`,
  `requireRole`), never the null-returning ones. Route Handlers for
  non-browser clients keep their own token/signature gates.
- **Hiding UI is never the gate.** A page may compute `canManage`
  server-side (`getVerifiedUser()` + `MANAGER_ROLES`) and pass a
  **boolean** into client components to omit controls that would only
  refuse — but the action's own check remains the real gate, and
  components never receive role or user objects for gating purposes.
- **A lib module may skip `server-only` only when it is pure over its
  inputs, reads no env var, and holds no secret of its own** — `match.ts`,
  `duplicates.ts`, and `password.ts` are the instances. Sensitive material
  passing *through* such a module (a password, a hash) is the caller's to
  contain; the guarded action or route that calls it is where secrecy
  lives. The `server-only` requirement in the guarded-action rule above is
  written for AI/external-call wrappers, not for pure helpers.
  `db.ts` is the one sanctioned impure exception: it must stay importable
  by the plain-Node scripts in `prisma/`, and a browser import fails
  loudly anyway (PrismaClient refuses to construct in a browser). Any
  **other** lib module that imports `db` must carry `server-only` —
  `dal.ts`, `voice/apply.ts`, `loginRateLimit.ts`, and
  `calendarEventQuery.ts` are the instances — the last (mission-15/C1) is a
  SELECT-plus-mapper module shaped like `personInfo.ts` but, unlike it,
  runs the query itself, so it carries the guard.
  When a module needs both a testable policy and a database read, split
  it: the pure half gets its own import-free file and the tests point
  there (`loginRateLimitPolicy.ts` / `loginRateLimit.ts` is the pattern).
  This is not pedantry — a test file that transitively imports `db.ts`
  puts the **live family database** one future test away from the test
  runner.
- **The DAL's cached `loadSessionUser()` is the one sanctioned sequential
  DB read before a page's `Promise.all`** — auth precedes data by design,
  and `cache()` guarantees at most one user lookup per render pass, shared
  by the layout and the page. Nothing else re-reads the `User` row in a
  request, so this is not the re-fetch anti-pattern the performance notes
  warn about.
- **Matcher strictness is per-consumer, deliberately.** `matchItem` (voice —
  lenient, spoken feedback loop), `searchItems` (search box), `findOverride`
  (shelf life — strict, no feedback loop), `duplicates.ts` (queue — strictest,
  unprompted). Reusing a matcher for a new consumer requires checking whose
  feedback loop it was tuned for, not just its name.
- **Domain subdirectories in `src/lib/` are fine when a pipeline spans
  multiple files** — `src/lib/voice/` (`parse.ts`, `apply.ts`) is the
  precedent. `src/lib/` isn't required to stay flat; it's required to stay
  pure and dependency-direction-correct regardless of depth.
- **Revalidation is per-action-file, private, and duplicated on purpose.**
  Route revalidation (`revalidatePath`) stays inside the `"use server"`
  action file whose writes dirty those routes — usually as a private
  `refresh*Views()` helper, or as inline calls when the paths vary per
  action (`tags.ts`). Either form is fine; what's fixed is where it
  lives. Several files deliberately carry identical path lists: these
  are per-file view declarations, not shared vocabulary, and the
  duplication is the convention rather than a one-source-of-truth
  violation. Two hard limits: a `"use server"` file must never export a
  non-action helper (every export there is a public POST endpoint), and
  route-path revalidation never moves into `src/lib/` (lib holding app
  route strings is a backward dependency in spirit).

## One source of truth

Adding a second definition of any of these is a BLOCKER:

- **`src/lib/useOptimisticRun.ts` is the only home of the optimistic tap
  wrapper** (clear the error, start a transition, show the change, await the
  action, show `result.error`, catch a network failure with the one exported
  `SAVE_FAILED` message). Every component that taps and saves
  (`HabitTodayList`, `HabitFamilyView`, `HabitStats`, `NudgeCard`,
  `ThisWeekList`, `VisionBoard`, `HabitManager`, `GoalDetail`, `ChoreChart`,
  `VacationCard`, `HabitTileRows` (in `HabitsTile.tsx`, used by both dashboard habit
  tiles) `DashboardWidgetList` (moved over in mission-34), `PlanDayCard` and
  `PlannedTodayCard` (mission-35))
  calls it with the action as a closure, so lib never imports `app/`. A second
  copy of that shape, or the message typed again, is a BLOCKER. Left out on
  purpose, to move over later: the differently worded saves in `HabitsChoresSettings`,
  `NavModeSetting` and `NudgeButton`.

- `src/lib/constants.ts` — categories, locations, meal slots, stores,
  **roles with their display labels and assignability, avatar colors**,
  their icons and order
- `src/lib/nav.ts`: `NAV_SECTIONS` (+ `NAV_FOOTER_ITEMS`), the only nav list.
  `src/lib/routeRedirects.ts`: `LEGACY_ROUTE_REDIRECTS`, the only redirect
  map; it has **no imports at all**, because `next.config.ts` imports it by
  relative path. `src/lib/navMode.ts`: the only menu-style list
- `src/lib/goalVocabulary.ts` — Plans & Goals' vocabulary: `LIFE_AREAS`,
  `PLAN_KINDS`, `HABIT_PERIODS`, `GOAL_VISIBILITIES`, `GOAL_OWNERSHIPS`, and
  the vision words (`VISION_HORIZONS`, `TOGETHER_BOARD`, `VisionBoardKey`,
  `GOAL_PAGE_VISION_HORIZON`). `LIFE_AREAS` has six areas, in order:
  Spiritual, Health & Wellness, Personal Growth, Relationships & Connections,
  Work & Money, Fun & Adventure. **The `financial` key is permanent even
  though its label is now Work & Money**, because saved goals and visions
  store the key. It
  lives beside `constants.ts`, not in it, because `constants.ts` sits at the
  soft cap (same precedent as `navMode.ts`). `GOAL_OWNERSHIP_LABELS` there is
  the only "Mine" / "Together" wording for a goal's ownership; a habit's
  who-words live in `habitVocabulary.ts` (mission-31). (Added 2026-11-04, mission-27; Bryce
  approved the plan.)
- `src/lib/goals.ts`: `canSee` / `canEdit` / `canLog` are the only goal
  policy. An action, page **or component** comparing a goal's `ownerId` or
  `visibility` itself is a BLOCKER; the display helpers `goalOwnership` /
  `whoseGoal` / `isPrivateGoal` live beside the policy in `goals.ts`.
  `src/lib/goalsRead.ts` is the only page reader of goal rows. The form
  limits `GOAL_TITLE_MAX` / `GOAL_WHY_MAX` / `MEASURE_UNIT_MAX` /
  `HABIT_TIMES_MAX` are exported from `goals.ts` (the `MIN_PASSWORD_LENGTH`
  precedent). `goalOnBoard(goal, board)` there is how a goal is matched to a
  vision board, so nothing outside `goals.ts` compares a goal's `ownerId`
  for that. (Added 2026-11-04, mission-27; Bryce approved the plan. The
  `goalOnBoard` line was added by mission-28.)
- `src/lib/visions.ts`: the only vision policy. `canEditVision`,
  `visionBoardKey` / `boardOwnerId`, `validateVisionInput`, `visionForGoal`,
  `goalVisionLabel`, `boardHeading`, `boardHint` and `readOnlyEmptyText` live
  there. **A board key compared with a user id or with `TOGETHER_BOARD`
  anywhere outside `visions.ts` is a BLOCKER**; components receive
  `VisionBoardChoice.param` and `VisionBoardData.saveAs` already decided.
  `src/lib/visionsRead.ts` is the only reader of vision rows.
  **Dependency direction:** `visions.ts` takes only the `Viewer` type from
  `goals.ts` (type-only), and `goals.ts` never imports `visions.ts`; both
  take shared words from `goalVocabulary.ts`. That keeps the pair free of an
  import cycle (Captain's pass-1 BLOCKER). (Added 2026-11-04, mission-28;
  Bryce approved the plan.)
- `src/lib/goalPrompts.ts`: the only home of prompt and idea wording
  (`VISION_PROMPTS`, `GOAL_IDEAS`, `PLAN_IDEAS`), mirrored word for word from
  `.avengers/plans/plans-goals-prompts.md`; `goalPrompts.test.ts` reads that
  md file, so **the md is load-bearing for `npm test`** and an edit to either
  side without the other fails `npm test`. `promptsFor(area, horizon)` is the
  only filter: a prompt that names a horizon ("in ten years") shows only on
  that horizon's board. Bryce approves every line of wording before it
  ships. (Added 2026-11-04, mission-28; Bryce approved the plan.)
- `src/lib/habitIdeas.ts`: the only home of Habits & Chores idea wording:
  `HABIT_IDEAS` (per life area) and `CHORE_IDEAS`, each a whole idea (title,
  icon, schedule, days, times, time of day, mode), with `habitIdeasLabel`,
  `CHORE_IDEAS_LABEL`, `LIFE_AREA_HINT`, `LIFE_AREA_HINT_PICK` and
  `findHabitIdea`. It mirrors `.avengers/plans/habits-ideas.md` word for
  word; `habitIdeas.test.ts` reads that md file, so **the md is load-bearing
  for `npm test`** and an edit to either side without the other fails
  `npm test`. Goal and plan ideas stay in `goalPrompts.ts`; a habit or chore
  idea typed anywhere else is a BLOCKER. It sits at the top level of
  `src/lib/`, not in `src/lib/habits/`, because it takes `lifeAreaInfo` from
  `goalVocabulary.ts`, which the engine may not import. **Dependency
  direction:** it imports only `goalVocabulary.ts` and types from
  `habitVocabulary.ts`, and nothing in `src/lib/habits/` imports it. Every
  line of wording is approved before it ships. (Added mission-36.)
- `src/lib/goalsProgress.ts`: windows, counts, progress, pace, `formatMeasure`,
  `parseTypedNumber`; split from `goals.ts` at the test seam. (Added
  2026-11-04, mission-27; Bryce approved the plan.)
- **Plans & Goals scope, recap and check-in history (mission-29).**
  `countsInScope(goal, viewer, scope)` in `goals.ts` is the one scope rule
  (a device or "everyone" keeps all, otherwise a goal that is not "theirs");
  `goalsInScope` is its active-only wrapper, the only This week / tile
  filter, and `loadWeekRecap` calls `countsInScope` for "mine" because a goal
  completed mid-week still counts. An inline copy of the rule is a BLOCKER.
  `src/lib/goalsRecap.ts` is the only recap logic: pure, with habit windows
  and counts taken from `goalsProgress.ts` (`buildPlanItemView`,
  `weekSummary`) and no target math of its own. **Dependency direction:**
  `goalsRecap.ts` takes only types from `goals.ts`, and `goals.ts` and
  `goalsProgress.ts` never import `goalsRecap.ts`. The `GoalCheckIn` table
  is the only check-in history; `Goal.currentValue` / `checkedInAt` mirror
  its newest row and are written only by `src/app/actions/goals.ts` (check
  in, `deleteCheckIn`, and removing the number in `updateGoal`, each in one
  transaction), and read for pages only by `goalsRead.ts`.
  `numberAfterCheckIns` in `goalsProgress.ts` is the one fallback rule (the
  newest remaining check-in, else the start value). **Two places must
  change together:** the two `PlanItemRow` builders (`actions/planItems.ts`
  and `goalsRead.ts`), and the two check-in flags in `goalsRead.ts`
  (`goalInclude` and `toView`). **Size watch:** `GoalDetail.tsx` is 320
  lines (soft cap 350) after mission 33 moved its saves onto
  `useOptimisticRun`, so extract before the next feature; `goals.test.ts`
  is 344 after mission 30 split its habit tests into `goalsHabitInput.test.ts`;
  the next goal test goes in a new file by concern.
- `src/lib/planItemChanges.ts`: `applyPlanItemChange`, the only optimistic
  reducer for plan items. (Added 2026-11-04, mission-27; Bryce approved the
  plan.)
- `src/lib/habitVocabulary.ts` holds Habits & Chores' vocabulary:
  `HABIT_KINDS`, `HABIT_MODES`, `HABIT_SCHEDULES` with
  `HABIT_SCHEDULE_LABELS` (the habit editor's words), `HABIT_SHARING`,
  `HABIT_LOG_STATUSES`, `TIMES_OF_DAY`, `HABIT_ICONS`, the weekday mask
  (`parseWeekdayMask` / `printWeekdayMask`), `isWeekday` (the one "whole
  number 0 to 6" check), and the `to*` repairers.
  `HABIT_TIMES_LIMITS` (weekly 7, monthly 31) is the one answer to "how many
  times can a period ask for". `schedule.ts` clamps with it and `goals.ts`'s
  `HABIT_TIMES_MAX` derives from it, so a literal 7 or 31 for a habit limit
  anywhere else is a BLOCKER. The file has **no imports**, so any lib file
  may take words from it without risking a cycle. Plan-item period wording
  ("Every day", "a week", "a month") is `PERIOD_LABELS` in
  `goalVocabulary.ts`, beside `HABIT_PERIODS`. These are two different
  vocabularies (`HabitPeriod` on a goal's plan, `HabitSchedule` on a habit)
  and stay apart on purpose. (Added mission-30.)
- `src/lib/habitHoursVocabulary.ts` holds the hours habit's vocabulary:
  `HABIT_TRACKS`, `PACE_DAYS`, `HOURS_LIMITS` and the `toHabitTrack` /
  `toPaceDays` repairers. It has **no imports**, and sits beside
  `habitVocabulary.ts` (past its soft cap) because new habit words go in a
  new file by concern. Entries live in `HabitTimeEntry`, written only by
  `addHabitTime` / `removeHabitTime` in `habits/habitWrites.ts`. (Added
  mission-37.)
- `src/lib/habits/` is the habit engine, a domain subdirectory under the
  `src/lib/voice/` precedent. `schedule.ts`, `carryOver.ts`, `streaks.ts`,
  `progress.ts`, `perfectDays.ts`, `planPrompts.ts`, `access.ts`,
  `habitRows.ts`, `weekOverrides.ts`, `choreStreak.ts`, `hours.ts` (the
  weekly-hours rules, mission-37) and `types.ts` are
  pure: no Prisma client, no `db`, and
  callers pass `today`. `habitWrites.ts`, `participantWrites.ts`, `streakWrites.ts` and
  `planWrites.ts` (all `server-only`) are the only writers of the `Habit`,
  `HabitParticipant`, `HabitLog` and `HabitPlannedDay` tables.
  `streakWrites.ts` alone writes the cached streak columns (`currentStreak`,
  `bestStreak`, `streakAsOf`; split out of `habitWrites.ts` in mission-35),
  `participantWrites.ts` holds the participant writes (join, reorder,
  replace) and `atomically`, and `planWrites.ts` is the only writer of
  `HabitPlannedDay`. (Second file added mission-31; third and fourth
  mission-35.) `src/lib/habitsRead.ts` (Today, Manage,
  the editor, the action loaders and `loadHabitsForPlan`) and
  `src/lib/habitsStatsRead.ts` (the stats page and the family view,
  mission-32; the Report's `loadHabitReport`, mission-36) are the only readers of the `Habit`, `HabitParticipant`,
  `HabitLog` and `Nudge` tables for pages and actions. Both are
  `server-only`, and each hands its rows to a pure builder. A third reader
  is a BLOCKER. **Dependency direction:** `src/lib/habits/` may import
  `habitVocabulary.ts`, `habitHoursVocabulary.ts`, `householdDate.ts`,
  `constants.ts`, `householdPeople.ts` (the write files only), `db.ts` and the generated
  client (types). Its writers take `today` from their caller and never
  compute it. It never imports `goals*.ts`,
  `goalVocabulary.ts` or `visions*.ts`, nor any other top-level `src/lib/`
  module outside that list: no `habits*.ts`, no calendar or Schedule module
  (`scheduleWindowState.ts`, `calendarDates.ts`), no `types.ts` view type.
  Code that shapes engine answers for a screen lives one level up, in
  `src/lib/` (mission-35 moved the Calendar builder and
  `scheduleHabitDays.ts` out for this reason). The goals side may import the engine
  (`goalsProgress.ts` takes `habits/progress`, and `goals.ts` takes the
  `HabitFields` type only). `src/lib/habits/*.test.ts` is in
  `package.json`'s test script and both CI timezone steps. (Added
  mission-30.)
- `dayInVacation(day, vacations)` in `habits/schedule.ts`, beside
  `isDayInRange`, is the only "is this day inside one of these vacations"
  test. An inline `vacations.some(...)` or a loop over vacations asking the
  same thing anywhere else is a BLOCKER. Finding *which* vacation holds a
  day (`vacations.find(...)`) is a different question and is not a copy.
  (Added mission-33, on Captain's ruling; the five copies were migrated in
  F3.)
- `calendarDateFromUtcMidnight` in `householdDate.ts`, defined right under
  `utcMidnightInstant`, is the only way to read a stored UTC-midnight day
  column (`HabitLog.day`, vacation days, `anchorWeek`, `streakAsOf`, all-day
  dates) back as a `CalendarDate`. `utcMidnightInstant` is the only way to
  write one. New code that inlines `calendarDateInZone(x, "UTC")` for a
  stored day is a BLOCKER. Four older `goal.targetDate` sites are
  grandfathered and move to the helper in the next mission that touches each
  one: `plans/goals/[id]/page.tsx`, `plans/goals/[id]/edit/page.tsx`,
  `actions/goals.ts` and `goalsProgress.ts`. (Added mission-30.)
- `householdParticipantIds(client)` in `habits/participantWrites.ts` is the
  one rule for who holds an Everyone habit: every active person who is not a
  shared device login. Callers ask for it with `createHabit`'s
  `participantIds: "household"`, or call it directly to resolve Everyone or
  validate a picked list (mission-31). They never query `User` for participants
  themselves, and an action that filters on `deactivatedAt` or `role` to
  pick habit participants is a BLOCKER. (Added mission-30.)
- `habits/access.ts` is the only habit policy: `canSeeHabit`, `canEditHabit`
  and `canLogFor`. They carry the `Habit` suffix so they never collide with
  `goals.ts`'s `canSee` / `canEdit` in a search or an import. An action,
  page, component or lib module outside `src/lib/habits/` that checks a
  habit's `isPrivate` or participant list itself is a BLOCKER (widened
  mission-36; the existing lib sites, `habitsReportScope.ts`,
  `habitsStatsRead.ts` and `habitsFamily.ts`, move into `access.ts` at their
  next touch). The plan-to-habit glue lives in `goals.ts` beside the
  goal policy: `habitInputFromPlan` (a plan item's fields become a Habit's),
  `habitParticipantsFor` (a Mine goal's owner, or the household) and
  `habitCheckTarget` (whose row a tap writes). It is pinned by
  `goalsHabitInput.test.ts`, and nothing outside `goals.ts` maps a goal to a
  habit. (Added mission-30.)
- The "Recompute streaks" door is the admin-only action
  `recomputeAllStreaks` in `src/app/actions/habits.ts`. It wraps the lib
  function of the same name in `streakWrites.ts`, imported as
  `rebuildAllStreaks`; that alias is deliberate, and new action files that
  wrap a same-named lib function do the same. Only `recomputeStreaks`, `recomputePersonStreaks`, `recomputeAllStreaks`
  and `recomputeHabit` in `streakWrites.ts` write `currentStreak`,
  `bestStreak` and `streakAsOf`. `isUniqueViolationError` in
  `src/lib/prismaErrors.ts` is the only Prisma P2002 check (callers:
  `actions/mealPlans.ts` and `actions/visions.ts`; the habit writes have no
  P2002 check of their own); an inline `code === "P2002"` is a BLOCKER.
  (Added mission-30.)
- **One "household people" rule.** "Every active person who is not a device
  login" (`deactivatedAt: null`, `role` not `"device"`) is defined once, in a
  small server-only home, `src/lib/householdPeople.ts`, and both
  `householdParticipantIds` (habits) and `visionsRead.ts`'s board list call
  it. A third inline copy of that filter for "the family" is a BLOCKER. The
  file exists since mission-31 (`HOUSEHOLD_PERSON_WHERE`,
  `loadHouseholdPeople`); pages reach it through a reader such as
  `habitsRead.ts`'s `loadHabitRoster`. (Approved by Bryce 2026-11-05,
  mission-30, Captain's A8; debt closed mission-31.)
- **Habits & Chores PR B homes (mission-31).** `src/lib/habitsToday.ts` is
  the only home of the Today page's rules (row building and viewer order; `carrySince` and `habitStartDay` moved to
  `habits/carryOver.ts` in mission-33, and the tap-day window
  `isTapDayAllowed` / `TAP_DAYS_BACK` followed in mission-35, so
  `habitsStats.ts` and `actions/habitChecks.ts` take it from the engine); it is pure, and `habitsRead.ts` fetches and calls it.
  `src/lib/habitChanges.ts`'s `applyHabitChange` is the only optimistic
  reducer for Today rows (the `planItemChanges.ts` precedent).
  `src/components/HabitIcon.tsx`'s record is the only habit icon-name to
  Lucide map, total over `HABIT_ICONS`. `src/components/SortableList.tsx` is
  the only file that imports `@dnd-kit`. Tap actions live in
  `actions/habitChecks.ts`, editor actions in `actions/habits.ts`. Habit
  words (schedule labels long and short, time of day, who-labels, the title
  limit, `canCarryOver`, `canBePrivate`, `isCheckStatus`, the plan-the-day words `PLAN_PROMPT_*`,
  `PLAN_OTHER_DAY_LABEL`, `planChipLabel`, `PLANNED_TODAY_TITLE`,
  `PLANNED_FOR_TODAY_LABEL`, `plannedForLabel`) live in
  `habitVocabulary.ts`; "Mine" / "Together" for a habit's people is
  `habitWhoLabel` there, and `GOAL_OWNERSHIP_LABELS` stays the words for a
  goal's ownership. `STREAK_MIN_SHOWN` and `streakLabel` there are the only
  "does a streak show, and what does it say" rule, for row streaks and the
  chore streak alike; a component that compares a streak to a number or
  types `days` after a count is a BLOCKER (added mission-34, on Captain's
  ruling; the three chore-flame copies moved over in F1).
- `formatShortCalendarDate` in `householdDate.ts`: the shared "Nov 3"
  formatter (`MONTH_NAMES` is now exported from `mealPlanDates.ts` for it).
  (Added 2026-11-04, mission-27; Bryce approved the plan.)
- `src/app/globals.css` — the color tokens
- `src/lib/shelfLife.ts` — the shelf-life vocabulary
- `src/lib/householdDate.ts` — calendar dates for **server** code,
  zone-explicit (`CalendarDate`, never a process-local `Date`;
  `HOUSEHOLD_TIME_ZONE` from constants). `mealPlanDates.ts` /
  `calendarDates.ts` remain the browser-local homes. A server-side
  calendar-day helper goes here; a process-local getter in a server path is
  a bug, and a second zone-explicit helper elsewhere is a BLOCKER. (Added
  2026-10-09, mission-21; Bryce-approved.) `startOfWeek` (Sunday) and
  `startOfMonth` live here too. `formatWeekTitle(weekStart, currentYear)` is
  the dash-free week title ("Nov 1 to 7"), beside `formatShortCalendarDate`;
  `formatWeekRange` in `mealPlanDates.ts` keeps its dash for Meal Plan only,
  and a third week-range formatter is a BLOCKER. (Added mission-36.)
- `src/lib/password.ts` — `MIN_PASSWORD_LENGTH`, the one answer to "how
  long must my password be", shared by the actions that enforce it and
  the inputs that advertise it
- `src/lib/dashboardWidgets.ts`: `DASHBOARD_WIDGETS`, the only widget
  registry; `DASHBOARD_WIDGET_IDS` there is the one id list and the default
  order (a test pins the record to it). `parseDashboardLayout` in
  `dashboardLayout.ts` is the only reader of the stored layout JSON.
  **Insertion rule, at the `parseDashboardLayout` entry:** a registry id
  missing from a saved layout is inserted directly after the nearest
  earlier registry id that the saved list has (at the start if none), not
  appended at the end; that is how the `goals` widget lands second for
  people who already saved a layout. (Added 2026-11-04, mission-29.)
  **Picks (mission-34):** a widget's optional `items` (only `habits` and
  `goals`, `PICKABLE_WIDGET_IDS`) is checked for shape in the parser and
  for ownership in the loaders, through `keepOwnPicks` in `src/lib/dashboardPicks.ts`, which also holds
  `picksOf` (the only way to read a widget's picks), `layoutForViewer` (the
  tablet's layout leaves out `habits` and `chores`, decision 138),
  and the picker's pure rules (`splitPicks`, `togglePick`);
  `reorderWidgets` sits in `dashboardLayout.ts` beside `toggleWidget` and
  `setWidgetItems`; `isPickableWidget` / `PickableWidgetId` in
  `dashboardWidgets.ts` are the only "which widgets take picks" test; `src/lib/habitsDashboard.ts` the tile row rules (`habitsTileRows`, `choresTileRows`, `pickableHabits`,
  `keepShownRows` (decision 147) and `plannedTodayRows`, the only "which
  rows go on Planned today" rule, which `habitsTileRows` leaves out); the
  Goals tile's picked list is `weekTodoForGoals` beside `weekTodo` in
  `goalsProgress.ts`. The tiles' data comes from `loadDashboardHabits` in
  `habitsRead.ts` and `loadGoalsTile` in `goalsRead.ts`; no third habit
  reader. A tile with controls inside uses `DashboardTile shape="panel"`
  (DESIGN.md). `habitRowTaps` (in `HabitsTile.tsx`) is the only mapping
  from a Today row's tap to a check action, used by `HabitTodayList`,
  `HabitTileRows` and `PlannedTodayCard` for Today rows (`HabitRowView`); `HabitFamilyView`'s
  `dayOf` is the family-row twin (it logs for another person through
  `logForId`); a third copy of the carried-day routing is a BLOCKER.
  **Dependency direction:** `habitsDashboard.ts` imports only
  `habitVocabulary.ts` and types from `habitsToday.ts`; `dashboardPicks.ts`
  imports only `dashboardLayout.ts` / `dashboardWidgets.ts`; `habitsRead.ts`
  and `goalsRead.ts` may import them, never the reverse.
- `brand/` — the logo artwork. The two `Marshee*.tsx` components and the
  `src/app/` icon files are all **generated from** these masters; a
  hand-drawn or re-traced second version of the mark or wordmark is a
  BLOCKER. (An approximation already exists in
  `~/Desktop/marshee_brand_assets/` and is explicitly not a source — its
  mark is missing the M's centre descender despite its README claiming to
  be authoritative.)
- **Habits & Chores PR C homes (mission-32).** `src/lib/habitsStats.ts` is
  the only home of the stats page's rules: per-person totals, the month
  calendar cells and their `tappable` window, completion rate, the side by
  side rows, the weekly series, perfect days in a month,
  `statsMonthTitle`, `effectiveState` / `dayCellLabel` (the one rule for how
  a calendar cell reads and is spoken, with its words `DAY_CELL_WORDS` and
  `DAY_CELL_REASON_WORDS` in `habitVocabulary.ts`), `nothingDueText` (shared
  with the Report, mission-36), the open-kind count (`openCountOf`,
  `openCountText`) and whether an open kind's unchecked today still draws as
  "today" (`openTodayDoable`, the period's target not yet met). Cell drawing
  is `HabitDayCell.tsx`, and `HabitDayLegend` there is the only month-calendar
  legend (stats page and Report). `src/lib/habitsFamily.ts` builds the family view and
  the stats page data (`buildFamilyPage`, `buildStatsData`,
  `statsSubject`), and holds `doneCounts` / `doneCountLabel`, the one
  "x of y done" rule for Today and the family view. Both files are pure:
  no `db`, and callers pass `today`. The row streak (`displayStreak`,
  `streakUnitOf`) lives in `habits/streaks.ts`; `habitsToday.ts` keeps the
  confetti rule `allRequiredDoneToday`. **Dependency direction:** `habitsFamily.ts` may
  import `habitsStats.ts` and `habitsToday.ts`, and `habitsStats.ts` may
  import `habitsToday.ts`; never the reverse. `canNudge` and
  `canSeeHabitStats` in `habits/access.ts` are the only nudge and stats
  policy. `src/lib/habits/nudgeWrites.ts` (`server-only`, no auth) is the
  only writer of the `Nudge` table; its only caller is
  `src/app/actions/habitNudges.ts`, which owns the session, the guards and
  `revalidatePath`. `src/lib/confettiSeen.ts` is the only home of the
  once-a-day confetti marker on each device (the `lastStore.ts` pattern),
  and `HabitConfetti.tsx` is the only importer of `canvas-confetti`.
- **Habits & Chores PR D homes (mission-33).** `habits/weekOverrides.ts`
  is the only home of the this-week chore rules (`choreDayState`,
  `choreTag`, `weekChange`) and of `isExcused`, the one "excused row" rule
  (skipped today, or excused all day), built on `isExcusedAllDay`
  (skipped this week or on vacation, and not done: a check done on such
  a day counts, decisions 127 and 130). The counts and the sort call
  `isExcused`; the confetti rule `allRequiredDoneToday` calls
  `isExcusedAllDay`, because a skip today still counts as finishing a
  required row. Deciding whether a row is excused anywhere outside
  `weekOverrides.ts` is a BLOCKER; a component may read `onVacation` or
  `skippedThisWeek` only to choose which label or marker to show. `habits/choreStreak.ts` is the only home of
  the chore streak (`computeChoreStreak`, `choreStreakAfter`,
  `finishedAllChoresLastWeek`). `habits/carryOver.ts` holds `carrySince`, `habitStartDay` and the tap-day
  window `isTapDayAllowed` / `TAP_DAYS_BACK` (all moved from `habitsToday.ts`
  so the engine never imports upward). `habits/choreWrites.ts` (`server-only`) is the only writer of `ChoreWeekOverride` (`habitWrites.ts`'s
  `updateHabit` clears a habit's rows through its `clearChoreChanges` when
  the schedule leaves `weekdays`) and of the `UserPreferences` chore streak
  columns, through one `recomputeChoreStreak`, called in the same
  transaction by every write that can change it. `habits/vacationWrites.ts`
  (`server-only`) is the only writer of `VacationPeriod`. Their callers are
  `src/app/actions/choreChart.ts` and `src/app/actions/vacations.ts`, which
  own the session and the tablet refusal, and call `canEditChart` and
  `canChangeChore` (in `habits/access.ts`, the only chart and
  chore-change policy: a shared chore is a parent's or admin's, decision
  125). `src/lib/choreChart.ts` holds
  the chore pages' pure builders (the chart, the chore header with its
  streak and Sunday flag, the vacation list order); its loaders live in the
  two habit readers above, which now also read `ChoreWeekOverride`,
  `VacationPeriod` and the chore streak columns. On the family view the
  chore streak and Sunday flag count private chores, but only the number
  and the flag leave the server. **Dependency direction:**
  `choreChart.ts` imports only `habits/`, `habitVocabulary.ts`,
  `householdDate.ts` and `mealPlanDates.ts`. `habitsToday.ts`,
  `habitsFamily.ts`, `habitsRead.ts`, `habitsStatsRead.ts`, `habitsReport.ts`
  and `habitsReportScope.ts` may import it (the two Report files take
  `firstNameOf` and the chip types), and it never imports any of them. Among the write files,
  `vacationWrites.ts` and `habitWrites.ts` may import `streakWrites.ts`;
  `streakWrites.ts` may import `choreWrites.ts`; `habitWrites.ts`,
  `streakWrites.ts`, `choreWrites.ts` and `vacationWrites.ts` may import
  `participantWrites.ts`; `planWrites.ts` imports only `habitRows.ts` from
  the engine. Never the reverse of any of these. (Updated mission-35.)
- **Habits & Chores PR E2 homes (mission-35).** `habits/planPrompts.ts`
  (pure, engine) is the only home of the plan-the-day rules: `isPromptDay`
  (decision 143), `promptChips` (142), `isPlannableDay`, `isPlannedToday`
  (the `planned` input to `dueState`, 145) and the "Planned for Sat" rule
  (`laterPlannedDay`, `plannedLaterLabel`, 162). `src/lib/habitsPrompts.ts`
  (pure) builds the Pick a day card's data (`buildTodayPrompts`,
  `PromptHabitInput`, `TodayPrompt`); `habitsToday.ts` may import it, never
  the reverse. `habits/planWrites.ts` (`server-only`, no auth, the
  `nudgeWrites.ts` shape) has one caller, `src/app/actions/habitPlans.ts`,
  which owns the session, `canLogFor`, `isPlannableDay` and
  `revalidatePath`, and imports it as `planHabitDay as planHabitDayRow`. If
  a second caller appears (a Winnie route), the day check moves into the
  writer. Planned days are read only by `habitsRead.ts` (Today, dashboard)
  and `habitsStatsRead.ts`'s `loadPlannedHabitDays` (the Calendar range,
  reached from the Schedule through `fetchHabitDays` in
  `actions/calendar.ts`). `src/lib/habitsCalendar.ts` (pure) is the only
  home of which planned days the Calendar shows and when one reads as done:
  `buildCalendarHabitDays` owns the view rule (the tablet sees none; only
  the viewer's own rows on a habit they are still on and may see,
  `canSeeHabit`, count; a removed participant keeps their rows, so the
  participant check is a real rule; the reader's device early return only
  skips the query) and done (`isCheckStatus` that day, or the period's
  target met, decision 160); `plannedPeriodsRange` there is the only "which
  checks the Calendar needs" range. `CalendarHabitDayView` in `types.ts` is
  the Calendar's planned-day item, never a `CalendarTaskView` (a task's tap
  opens the task editor and its `completedAt` means task completion).
  `src/lib/scheduleHabitDays.ts` is pure: `addHabitDaysToSchedule` and
  `coversWindow` (whether fetched coverage holds the whole window);
  `useScheduleHabitDays.ts` owns only fetching and state, with
  `fetchHabitDays` passed in. `PlanDayCard.tsx` (the one Pick a day card,
  decision 161), `PlannedTodayCard.tsx`, `HabitDayCard.tsx` (the Schedule
  row) and `HabitDayPill.tsx` (the all-day strip pill) are the only
  components that draw these; a second copy inside a calendar component is a
  BLOCKER. **Dependency direction:** `habitsCalendar.ts` imports only
  `habits/`, `householdDate.ts`, `habitVocabulary.ts` and `types.ts`;
  `scheduleHabitDays.ts` imports only `calendarDates.ts`,
  `scheduleWindowState.ts` (types) and `types.ts`; `habitsStatsRead.ts`
  may import `habitsCalendar.ts`, never the reverse.
- **Habits & Chores PR F homes (mission-36).** `src/lib/habitsReport.ts` is
  the only home of the Report's own rules: the pager (bounds, and the "This
  week" / "This month" pill on a past period), each item's cells by range,
  sections, the year totals, and `countText`, which composes a row's count
  from `openCountOf` / `openCountText` (open kinds) and `nothingDueText`
  (both in `habitsStats.ts`, which the stats page header uses too, so neither
  says "0 of 0", decisions 177 and 181). A second copy of either count rule,
  in a component or a lib file, is a BLOCKER. `habitsReport.ts` and
  `habitsFamily.ts` (`buildStatsData`, `calendar.nothingDue`,
  `calendar.openCount`) call them; the words are in `habitVocabulary.ts`
  (`REPORT_LABELS`, `reportCountOf`, `reportCountThis`, `reportYearTotals`,
  `reportDueLabel`, `REPORT_DUE_TODAY`, `reportNotThis`). Every Report cell
  comes from `monthCalendar` in `habitsStats.ts`, so the Report and the stats
  page draw a day by one rule; a second cell-state rule is a BLOCKER.
  `src/lib/habitsReportScope.ts` is the only home of the Report's address and
  scope: `parseReportParams`, `reportHref`, `weekParam` / `monthParam`, who
  is shown (`reportPersonId`), the person chips, the shown items (Habits then
  Chores, each in Manage order), the filter and the range the loader reads.
  `reportFilterOptions` and `matchesReportFilter` there are the one habit
  filter rule; Today's `HabitTodayList` migrates to them at its next touch.
  `TIME_ICONS`, exported from `HabitFilterChips.tsx`, is the only
  time-of-day icon map. Both Report files are pure: no `db`, and callers pass
  `today`. `canSeeHabitReport(actor, personId)` in `habits/access.ts` is the
  only "whose Report may this viewer open" rule (it matches `canEditChart` on
  purpose; they come from separate decisions, 164 and 119/125); a
  `MANAGER_ROLES` or role test for the Report anywhere else is a BLOCKER.
  `loadHabitReport` in `habitsStatsRead.ts` is the Report's only reader: it
  asks `reportPersonId` who is shown before it queries, and reads checks,
  vacations and `ChoreWeekOverride` rows for the range shown only, never all
  time. `sharedNeedsMorePeople` in `habitsToday.ts`, beside
  `participantsAllowed`, is the one "Together or Side by side needs two
  people" rule (decision 175) and `SHARED_NEEDS_TWO_MESSAGE` in
  `habitVocabulary.ts` its only wording; `HabitForm` and `actions/habits.ts`
  both call them. `src/components/HabitDayCell.tsx` is the only drawing of
  one habit day, for the stats calendar and every Report grid;
  `HabitMonthCalendar`'s `compact` read-only mode is the Report's month grid,
  and a copy of either inside a Report component is a BLOCKER.
  **Dependency direction:** `habitsReport.ts` imports only
  `habitsReportScope.ts`, `habitsStats.ts`, `habits/schedule.ts`,
  `habits/types.ts`, `householdDate.ts`, `mealPlanDates.ts` (month names),
  `habitVocabulary.ts` and `choreChart.ts`. `habitsReportScope.ts` imports
  only `householdDate.ts`, `habits/` (`access.ts`, `carryOver.ts`,
  `habitRows.ts`, `schedule.ts`, `types.ts`), `goalVocabulary.ts`,
  `habitsToday.ts`, `habitVocabulary.ts` and `choreChart.ts`, and never
  `habitsReport.ts`. `habitsStats.ts`, `habitsToday.ts`, `habitsFamily.ts`,
  `choreChart.ts` and `src/lib/habits/` never import either Report file;
  `habitsStatsRead.ts` may import both. **Next touch:** an
  `isDayExcused(spec, overrides, vacations, day)` in `weekOverrides.ts`
  should become the one per-day "excused" rule; `monthCalendar` and
  `nothingDueText` each decide it today (not yet built). **Size watch:**
  `habitVocabulary.ts` is 380 lines, `habitsStats.ts` 387, `habitsToday.ts`
  343, and the tests `habitsStats.test.ts` 426, `habitsReport.test.ts` 373
  and `habitsToday.test.ts` 383; the next habit rule or test goes in a new
  file by concern (a `habitReportVocabulary.ts` and a sibling stats-calendar
  test are the natural seams).
- **The `validatedPeople` decision** — which `User` ids may be **written**
  onto an item. `personInfo.ts` below is the read-side twin of this rule;
  this is the write side, and it is security-relevant for the same reason.
  **Home: `src/lib/`, pure over its inputs** — `(requestedIds, rows, alreadyAssignedIds) -> string | null`,
  with the `db.user.findMany` staying in each action, the same
  policy/DB-read split `loginRateLimitPolicy.ts` already established. That
  placement is not cosmetic: the decision currently lives in a
  `"use server"` file, where the no-plain-exports rule means it **cannot be
  exported and therefore cannot be tested at all** — an authorization
  decision `npm test` structurally cannot reach, which is CV3's
  `VIEW_CONFIG` lesson in a worse form. **The two current copies
  (`actions/tasks.ts`, `actions/calendar.ts`) are grandfathered debt to
  migrate in one contract; a third copy is a BLOCKER.** Note what changed
  its class: it was ordinary input validation until mission-16/C3b gave it
  an authorization carve-out, and that same security-shaped edit then had
  to be made by hand in both copies — correctly, only because one builder
  happened to hold both files in one contract.
  (Added 2026-09-05, mission-16, on Captain's ruling; Bryce approved.)
  **"Code lines" means one thing, and the tool is the definition.**
  `preflight.mjs`'s `lineCounts` is the canonical counter; a report quoting a
  code count states which counter produced it. Its original heuristic did
  **not** recognise `{/* … */}` JSX comments — they open with `{`, so a
  `startsWith("/*")` test never matched — and JSX comments are this repo's
  dominant documentation form in components, so it over-reported code exactly
  where this clause is meant to protect prose. **Fixed 2026-09-06**; a `.tsx`
  code count from an older report is an upper bound.
  (Added 2026-09-06, mission-18, on Captain's finding; Bryce approved.
  Instance: one mission file reported `TimelineGrid.tsx` 555/297 and
  `MonthCell.tsx` 350/108 by two different methods, three contracts apart —
  the same file reading 237 or 108 depending on the counter.)
  **A code line is one that is neither blank nor comment-only** —
  `lineCounts` skips blanks, `//`, `*`, `/* … */` and `{/* … */}` blocks. A
  count that **includes** blank lines is a different measurement and must not
  be compared against a cap threshold or another gate's figure.
  (Added 2026-09-09, mission-19, on Captain's pass-2 finding; Bryce approved.
  Instance: two gates reported the same file at **191 and 216 on the same
  commit**, both in good faith, differing by exactly its **25 blank lines** —
  the failure this clause exists to end, arriving in the clause's own terms.)
- **The pointer-gesture machine has two definitions, and the divergence has
  already cost a shipped defect.** `SwipeActions.tsx` and
  `src/lib/usePageSwipe.ts` each implement the same four-state machine
  (`idle`/`undecided`/`swiping`/`scrolling`), the 8px direction lock, the
  try/caught `setPointerCapture`, and the capture-phase click swallow.
  `DIRECTION_LOCK_PX = 8` is defined in both. `usePageSwipe.ts`'s header
  records why the copy was made — `SwipeActions` is live on Inventory and
  Shopping rows and this environment's tooling cannot drive that gesture to a
  settled state — and that reasoning is sound; it is the reason this is debt
  rather than a mistake.
  **What makes it debt with a deadline:** mission-19/F1 fixed a stuck
  click-swallow flag in `usePageSwipe.ts` (a touch drag past tap slop produces
  no compatibility click, so the flag survived into the next gesture and ate
  its tap). `SwipeActions.tsx` was outside that contract's boundary and carried
  the same shape until **mission-27/F3 (commit `23b1faa`)**: its capture-phase
  `handleRowPointerDownCapture` now resets `swallowNextClick` on every
  pointer-down and raises it only for the tap that closes an open row. Bryce's
  real-device check is **still owed**; the extraction and a single
  `DIRECTION_LOCK_PX` remain open. One machine, one bug, fixed by hand in each
  copy a mission apart: the `validatedPeople` failure, caught late.
  **The migration is one contract, and it carries three obligations**: extract
  the shared machine (mode transitions, lock distance, capture guard, swallow
  decision) into `src/lib/`, keeping each caller's own release math
  (`openWidth / 2` vs `SWIPE_PAGE_THRESHOLD_PX`) at the call site; **verify
  F3's `pointerdown` clear in `SwipeActions.tsx` on a real device** (the
  clear itself landed in mission-27/F3; this repo has twice recorded that synthetic PointerEvents cannot
  settle this gesture, so a real-hardware pass by Bryce is the evidence, not a
  harness); and collapse `DIRECTION_LOCK_PX` to one definition. **A third copy
  of the machine is a BLOCKER.**
  (Added 2026-09-09, mission-19, on Captain's ruling across two gate passes;
  the shipped-defect evidence is Vision's, the mechanism Captain's. Bryce
  approved.)
- **A padded month grid's "today" test has one home.** `monthGridDays`
  (`src/lib/monthLayout.ts`) returns 42 days, up to 12 of them belonging to a
  neighbouring month, so a bare `isSameDay(day, today)` circles today on the
  **wrong month's** grid — DESIGN.md's today-marker rule, and a defect that
  shipped inline in three components before it was found.
  `isTodayCell(day, shownMonth, today)` is that invariant's one home,
  deliberately placed **beside the function that creates the padding**, and all
  three consumers of `monthGridDays` route through it. Its value over three
  inline copies is not brevity: a `.tsx` expression is **unreachable by
  `npm test`**, which is the `VIEW_CONFIG` lesson this document already
  records. **A fourth consumer of `monthGridDays` that writes its own today
  test is a BLOCKER.** An `isSameDay(day, today)` over a week or a
  `columnDays` array is **not** an instance — those grids contain no foreign
  days, and routing them through this would be wrong.
  (Added 2026-09-09, mission-19/F1, on Captain's ruling; Bryce approved.
  DESIGN.md predicted this failure in writing one mission earlier — *"a third
  caller would reintroduce this with no compile error"* — and `MonthJumpSheet`
  was that third caller, one mission later, wrong on arrival: **282 of 730
  days** across 2026–27 painted a today marker on a foreign month's cell.)
- **A measured dimension of app chrome** that two or more surfaces position
  against **has one home in `src/lib/`**, and the markup that produces it
  carries a comment naming its dependents. A **runtime measurement** is an
  equal-standing alternative for any one surface; **a second hardcoded copy
  is not.** This rule exists because mission-16's worst defect was exactly
  this shape: the app header is 73px, three files positioned against it,
  and one still said 64 — so "go to today" scrolled the reader to a spot
  hidden behind the header, and the same stale 64 sat in a second file one
  directory away. One fact, three encodings, two agreeing by import and one
  silently stale. **Closed in mission-23:** the header now exists only on `/`
  and `/login`, and the dimension pages position against is the floating
  hamburger's row, `HAMBURGER_ROW_HEIGHT_PX` (plus `useHamburgerRowHeight`) in
  `src/lib/appChrome.ts`, which lists its dependents. Mission 25 adds
  `NAV_RAIL_WIDTH_PX` and `NAV_SIDEBAR_WIDTH_PX` there, feeding the
  `--app-nav-width` CSS variable that the fixed bars use as their left edge.
  `SCHEDULE_HEADER_BAR_HEIGHT_PX` and `SCHEDULE_TITLE_SLOT_ID` stay in
  `CalendarHeader.tsx`. (Added 2026-09-05, mission-16; Bryce approved.)
- `src/lib/personInfo.ts` — `PERSON_SELECT` / `toPersonInfo`, the single
  place a `User` row becomes something a client may see. **This is the
  security-relevant one**: it builds the public shape field by field so a
  `passwordHash` can never ride along, and a second copy is a second
  chance to get that wrong. The edge this rule guards is
  `passwordHash`: a Prisma `select` that names only display fields (`id`,
  `displayName`, `avatarColor`, `role`) and never `passwordHash` — as
  `login/page.tsx`, `dal.ts`, and the calendar page's nested people select
  do — is not a second definition. A second place that *selects*
  `passwordHash` and strips it by hand is. (Clarified 2026-09-02, mission 8.)
- `src/lib/mealPlanDates.ts` — the **local-calendar-date string
  conversions**. `toLocalDateString` is the forward direction
  (`Date` → `"YYYY-MM-DD"`); its inverse belongs beside it. A new private
  copy in a component is a second definition and is a BLOCKER. The
  existing copies (`PantryItemEditSheet.tsx`, `EventDateTimeFields.tsx`,
  `TaskForm.tsx`) are **grandfathered debt to be migrated in one mission,
  not a pattern to cite**. That distinction is load-bearing:
  `mealPlanDates.ts` already described itself as this job's shared home
  while `TaskForm.tsx` cited the survivors as "the house pattern" — two
  comments asserting opposite conventions for the same function.
  (Added 2026-09-04, mission-14, replacing a failed rule — see below.)
- `src/lib/mealPlanDates.ts` also owns **month and weekday names — and the
  names are exported.** It already holds `MONTH_NAMES` (short) and
  `FULL_MONTH_NAMES` (long); both were **unexported**, which is the whole
  reason there are now **five** definitions of how to spell a month.
  `calendarViewConfig.ts` (mission-17), `MonthChips.tsx` (mission-18/C3) and
  `YearView.tsx` (mission-18/C4) each wrote a local `Intl.DateTimeFormat`, and
  **each documented in-file that it did so because the canonical array was
  off-boundary or unimportable** — *a boundary satisfied by copying*, which
  the trip-condition rule below already names as instructing rather than
  restraining. Two mechanisms now coexist for one fact: three copies derive
  names from `Intl` at runtime and two are hardcoded English arrays, so a
  locale or ICU-data change moves three and leaves two, **and two screens
  spell the same month differently**. Export the two arrays (or one
  `monthName(date, "short" | "long")` helper) and import them; **the four
  existing copies are grandfathered debt to migrate in one contract, not a
  pattern to cite, and a sixth definition is a BLOCKER.** A caller wanting a
  *different length* is not a new definition — it is an argument to the shared
  one. (Added 2026-09-06, mission-18, on Captain's finding. Related:
  `MONTH_NAME_FORMATTER` is currently defined in **both** `MonthChips.tsx` and
  `YearView.tsx` with the same identifier and different behaviour — `short` vs
  `long` — so a `grep` for it returns two things that are not the same thing.
  The migration closes that too; short of it, rename to
  `SHORT_`/`LONG_MONTH_FORMATTER` at the next touch.) **Update 2026-11-04,
  mission-27:** `MONTH_NAMES` is now exported, and the two mission-27 sites
  (`GoalDetail.tsx` and the goal page) use `formatShortCalendarDate` instead
  of a local formatter; the grandfathered copies count is unchanged.
- Shared UI jobs — see DESIGN.md's component vocabulary

- **Trip conditions are keyed to DEFINITIONS, never to importer counts.**
  A rule of the form "a third *consumer* forces the extraction" is
  satisfiable by writing a fourth copy, which is precisely the outcome it
  exists to prevent — so it does not restrain, it *instructs*. This is not
  hypothetical: the retired `parseLocalDateString` trip condition
  (mission-13/Captain) said a third importer would force a move to
  `src/lib/`, and two builders in consecutive contracts complied **by
  copying**, each documenting in-file that it was doing so to stay under
  the threshold. The importer count never reached three; the tree reached
  five copies of a five-line function. Count what exists, not what points
  at it. (Added 2026-09-04, mission-14; Bryce approved.)

- **A vocabulary widened ahead of its consumers carries exactly one
  reachability gate.** When a union names more members than the app can serve
  — a view with no renderer, a role nobody may be assigned — the answer to
  "which of these is real today" lives in **one total
  `Record<Union, boolean>`**, and every reachability decision (URL/param
  parsing, picker and option lists, deep links, stored preferences) derives
  from that record rather than keeping its own list. **A total record, never a
  `filter` predicate:** the record makes a new member *answer* the question; a
  predicate lets it default silently. Shipping the consumer is then one entry
  flipped in the same commit.
  Instances: `BUILT_VIEWS` → `BUILT_CALENDAR_VIEWS` → `CALENDAR_VIEW_OPTIONS`
  (`src/lib/calendarViewVocabulary.ts`, mission-11/C2). And **`ROLES` →
  `ASSIGNABLE_ROLES` (`src/lib/constants.ts`) is currently the weaker
  predicate form — a new role becomes assignable with no compile error.
  Convert it at the next touch.**
  Where such a record exists, **a new per-member difference goes into it, not
  into an inline `x === "member"` expression beside it** — an inline test with
  a falsy default is the same silent-inheritance hazard the record exists to
  prevent. It is tolerable only while the members it would mislabel are
  unreachable through the gate, so **a member's reachability entry may not
  flip to `true` in a commit that leaves any per-member difference outside a
  total record.** (**All named instances are now closed, and this is worth
  recording rather than deleting: `BUILT_VIEWS` went all-`true` at
  mission-18/C4, so for calendar views this tripwire can never fire again.**
  The clause was collected in full before that happened — `renderer` and
  `CalendarHeader.tsx`'s `pinned` moved into `VIEW_CONFIG` in mission-17/C3;
  `showArrows` and `ownsTodayScroll` followed in mission-18/C5, on Captain's
  ruling that the *last* flip is the last chance to collect the debt at all,
  since waving it through retires the mechanism rather than deferring the
  cleanup. `showLocation` and `compact`, listed here through CV3–CV4, were
  resolved differently and correctly: they now derive from the data shape
  (`columnDays.length > 1`) rather than from the view tag, which answers for a
  new member automatically. **The clause still binds for any future vocabulary
  widened ahead of its consumers** — `ASSIGNABLE_ROLES` below is the open one.)
  (Added 2026-09-03, mission-11, on Captain's ruling.)
- **A reachability flip carries its assertions with it.** The record exists so
  that "which members are real" is answered in exactly one place — which makes
  the tests pinning today's answer part of that record's contract, not
  incidental collateral. Flipping an entry to `true` therefore lands, in the
  same commit, with every assertion that named the old answer. Those test
  files are **in scope by construction**: a task that forbids them cannot meet
  a "the suite is green" criterion, so a boundary excluding them is wrong
  rather than binding, and a builder that edits them and discloses it has
  obeyed the constitution over the contract. Where an assertion demonstrated
  the *unbuilt* case and no unbuilt member is left to demonstrate it with, a
  clearly-labelled fictional name is the correct substitute — the property
  under test ("a name this build does not know is normalised away") outlives
  the vocabulary's own membership.
  (Added 2026-09-06, mission-18, on Captain's ruling; Bryce approved.
  Instance: mission-18/C4 flipped `BUILT_VIEWS.year` and necessarily
  falsified nine test cases across `calendarPaging.test.ts`,
  `calendarViewConfig.test.ts`, `calendarViewVocabulary.test.ts` and
  `useCanonicalCalendarUrl.test.ts` — one of which, `calendarViewVocabulary.
  test.ts`, had written its own obsolescence in-file: *"this assertion is
  meant to fail then, and to be updated then."* The other three carry that
  framing only because C4 added it while updating them; checked against the
  pre-C4 blobs rather than the post-fix text, which reads as though all four
  had foreseen it.)

## File-size caps

- **Both caps are measured in total lines, but a file whose non-comment
  code is well under the cap is not a split candidate — report BOTH counts
  before naming a seam.** This project deliberately explains itself at
  length, and the caps were quietly taxing that. Two measurements from
  mission-16 are why: `useScheduleWindow.ts` read 431/350 and was carried
  as debt across two missions, but is **172 lines of code** — 60%
  documentation, and Captain withdrew its own split ruling on measuring it.
  And the change that pushed `ScheduleView.tsx` to 95% of the **hard** cap,
  forcing a whole extra contract, added **82 lines of which 8 were code**.
  A seam named on total lines alone can cost a mission for prose.
  (Added 2026-09-05, mission-16, on Captain's ruling; Bryce approved.)
- **The caps govern source files, not documents.** They apply to hand-written
  code under `src/`, `prisma/` (the schema stays exempt) and repo tooling
  scripts. Markdown (`STRUCTURE.md`, `DESIGN.md`, `README.md`, `.avengers/`,
  `docs/`) is outside them: a code-line count of prose measures nothing.
  `CLAUDE.md` keeps the 250-line cap in its own header because it loads on
  every turn. This file's growth is a trend to watch, never a BLOCKER: past
  650 lines it is due a housekeeping pass that moves provenance narratives
  ("Added …", "Instance: …") into `docs/history/structure-rationale.md`,
  leaving each rule's binding text and a one-line pointer. (Added 2026-11-04,
  mission-27, on Captain's ruling; Bryce approved.)
- **Soft cap: 350 lines** — a NOTE and a split candidate. (actions/groceries.ts
  was split three ways at ~624 before hitting the hard cap; current largest
  hand-written files sit in the ~350–420 range.)
- **Hard cap: 650 lines** — crossing it needs a written justification in the
  file header, or it's a BLOCKER. `src/generated/` is exempt, and so is
  `prisma/schema.prisma`: a Prisma schema is a single declarative file that
  this project's conventions give no way to split, so its length is a
  trend to watch, never a split candidate.
- Tests are colocated in `src/lib` as `*.test.ts`, run by `npm test`
  (node:test + tsx, no new frameworks).
- **Test files follow the same soft cap**; the split is by module under
  test — one `*.test.ts` per lib module. **When a single module's test file
  reaches the cap, splitting it by concern is permitted.** The file that
  keeps the module's **primary** concern keeps the module's bare name
  (`<module>.test.ts`), so searching for the module still lands on its
  canonical test file; each file that splits off appends the concern it takes
  (`<module><Concern>.test.ts`). Every header names the module it covers and
  points at its siblings by filename. A numbered or generic file (`…2`,
  `…More`, `…Other`) is never the answer. **If a module ever needs a second
  split, name every resulting file for its concern** — the bare name is only
  honest while one file still holds the primary concern; after two splits it
  would sit on whatever was left over, which is the broadest label on the
  narrowest content. Precedents: `calendarDates.test.ts` /
  `calendarDatesFormat.test.ts` (mission-10/C2) and `timelineLayout.test.ts` /
  `timelineLayoutPacking.test.ts` (mission-12/C4).
  (Clause added 2026-09-03: the previous text read as forbidding the
  concern-split this repo had already shipped, and
  `useCalendarPeriod.test.ts` at 344 now needs it — the letter was corrected
  to match the practice before a builder obeyed the letter. **Re-worded
  2026-09-03**, Bryce approving, after mission-12's second live use: Captain
  found the text still demanded *each half* name its concern while both real
  splits had deliberately kept the bare name on one of them. Tying the name
  to the **primary concern** rather than to which file happened to be
  retained turns an accident into a principle, and settles the second-split
  case the previous wording left silent — which matters because files in this
  repo demonstrably return to the cap: this very file was born at 349 and hit
  376 inside one mission, and `useCalendarPeriod.test.ts` at 344 is next.)
  **When the natural home is already at the cap, a small number of tests may
  be adopted by a sibling module's test file, with a header comment naming
  the module they cover and why they live there. This is a debt marker, not
  a pattern: it means the crowded test file is a split candidate, and the
  split is the real fix.** (Added 2026-09-02, mission 8, on Captain's
  ruling; adoption clause added 2026-09-02, mission 9, on Captain's proposed
  wording, approved by Bryce.)

  Live instances of the adoption clause — keep this list short, and empty it
  by splitting rather than by growing it:
  - (none — emptied 2026-09-02, mission 10's C2, which split
    `calendarDates.test.ts` by concern into `calendarDates.test.ts`
    (day/span math) and `calendarDatesFormat.test.ts` (label formatting) and
    sent `calendarDayDiff`'s test home from `monthLayout.test.ts`.)

- **A lib export with no application caller is dormant, not dead — but it
  must say so.** Keeping one is allowed when a named future consumer
  justifies it; the export carries a comment naming why it is dormant and
  what would revive it, and any function it in turn orphans carries the same
  note at its own definition. **Two consecutive missions with no caller means
  delete it and its tests** — a hypothetical consumer that never arrives is
  not a reason to maintain code. (Added 2026-09-03 on Captain's ruling,
  missions 9–10.) One refinement from its first application: prefer deletion
  outright when the dormant code describes behaviour the app **no longer
  has**, rather than behaviour merely unused — a dormant-export comment would
  then preserve a wrong answer for a future reader, which is the
  overclaiming-comment failure this repo tracks. `periodWindowEdges` was the
  retired navigation wall; deleting it removed both the code and that future
  wrong answer.
- **Built-ahead engines.** When a Bryce-approved multi-PR plan builds a
  pure engine ahead of its screens, its exports may stay dormant until the PR
  the plan names. Each one carries "Dormant until PR X (mission N): <its
  consumer>", and the two-mission clock above starts at mission N, not at
  the mission that wrote it. If mission N ships without calling it, the
  normal rule applies from then on. First instance: `src/lib/habits/`
  (mission 30; consumers in missions 31, 32 and 34). (Approved by Bryce
  2026-11-05, mission-30, Captain's A7.)

## Naming

- Components: `PascalCase.tsx`, flat in `src/components/`.
- Actions and lib: `camelCase.ts`; action exports are verbs
  (`createRecipe`, `putAway…`).
- Routes follow Next App Router conventions; route groups like `(app)` are
  invisible in URLs.

- **A component file's name must name something the file still exports.**
  Naming a family of exports is fine (`Skeleton.tsx`); naming a **deleted**
  export is not — a `grep` for the filename must not come up empty. Rename in
  the mission that deletes the last matching export, or in the next mission
  that touches the file. (Added 2026-09-03, mission-11. First instance:
  `MonthLoadingSkeleton.tsx`, which exported only `MonthGridSkeletonRows`
  after mission-11/C1 deleted the wrapper, was renamed to
  `MonthGridSkeletonRows.tsx` in mission-15/C5. **No live instance remains:** `HubNav.tsx`
  (found 2026-09-06 exporting only `HubBottomNav`) was deleted in mission-23
  when the side drawer replaced the bottom nav.)

- **Shared *test* helpers live in `src/lib/testing/`, and that directory is
  exempt from the dormant-export rule** — its tests are its callers, so an
  export with no application caller there is correct rather than dead.
  This exists because `withTimeZone` — the helper that pins a timezone so a
  DST case cannot pass vacuously — reached **four** definitions
  (`scheduleWindow.test.ts`, `scheduleWindowState.test.ts`,
  `timelineLayout.test.ts`, `calendarDates.test.ts`), which the
  count-definitions rule above already makes a failure, while the
  constitution offered nowhere to put it. **A new copy of a test helper
  that already has a home is a BLOCKER**; the four existing copies are
  grandfathered debt to migrate in one contract.
  ⚠️ **A new directory under `src/lib/` needs its test glob entry in or
  before the commit that adds its first test file, in all three places** — `package.json`'s `test` script and
  both timezone steps in `.github/workflows/ci.yml`. The glob is
  hand-enumerated, not recursive: a missed entry drops those tests from
  `npm test` *and* CI while the suite still reports green at a lower count.
  (Added 2026-09-04, mission-15; Bryce approved. "In or before" replaced
  "in the SAME commit" 2026-10-09, mission-21, Bryce approved: mission-21
  added `src/lib/assistant/*.test.ts` one commit ahead of its first test
  file, which is the safe direction — Node treats an unmatched glob as zero
  files.)

## Danger register (absolute, for every agent)

- **Never `git add -A` or `git add .` while another agent may be writing.**
  Stage by explicit path. A commit that sweeps in a parallel builder's
  in-flight files is not a correctness failure — the tree can still be right —
  but it makes the commit message lie about its contents, and this repo's own
  debugging routinely depends on pinning a worktree or extracting a file at a
  named commit. (Recorded 2026-09-03, mission-10: a documentation commit swept
  seven of a builder's source files plus two throwaway scripts. Removing the
  strays in a follow-up, rather than rewriting a pushed branch, is the right
  remedy.)

- **Local dev uses the Neon `dev` branch — a copy-on-write clone of
  production — as of 2026-09-01.** The production URL lives only in
  Vercel's env vars. `npm run db:seed` / `npm run db:reset` stay forbidden
  by default (they'd wipe the realistic dev copy; a Neon branch reset is
  the sanctioned refresh); test data still goes only through the scoped,
  fingerprint-matched `db:seed-*` / `db:clean-*` scripts. The dev branch
  holds a real snapshot of family data (password hashes included) — writes
  can't reach production, but the data itself is still private.
- **No committed, rerunnable script may create, update, or delete `User`
  rows** — `bootstrap-users.ts` is the one sanctioned exception
  (interactive, upsert-keyed, no clean counterpart). The table holds the
  family's credentials, and this repo's own seed-script history shows
  blanket-clearing scripts outlive the assumptions that made them safe. A
  *fingerprint-scoped* delete is inside this prohibition, not outside it:
  `displayName` carries no `@unique`, so a name-matched `deleteMany` can
  catch a row the script never created, including one that later gained a
  `passwordHash`. A scoped seed that needs people **attaches to existing
  rows** via a narrow `select` read, ordered deterministically (`createdAt`
  then `id`), and exits non-zero naming `npm run db:bootstrap-users` when
  too few exist — `seed-calendar.ts` is the pattern. The only sanctioned
  cleanup of synthetic people is a one-off, by-id deletion of the exact
  rows a mission's own verification created, counts confirmed back to
  baseline. (Amended 2026-09-02, mission 8, on Captain's finding.)
- Migrations are **additive only**; review the SQL before applying.
  **One named exception, added 2026-09-04 (mission-13/CT1,
  Bryce-approved; written up 2026-09-05): a data migration that corrects
  values already written under a convention now known to be wrong.**
  CT1's all-day fix had to rewrite existing `CalendarEvent` rows —
  leaving them would have meant two date conventions live in one column
  with every reader guessing which one it held. Such a migration must
  change **values only**, never drop or retype a column; be
  **idempotent**, so a partial run and a re-run land in the same place;
  carry its reasoning in the migration file itself; and be **counted
  before and after** against the danger register's baseline. Dropping,
  renaming or narrowing stays forbidden: the production build applies
  migrations while the previous deployment is still serving, so old code
  must keep working against the new schema for the length of that
  window.
- A new/changed Prisma model needs `npx prisma generate` **and a dev-server
  restart** (`db.ts` caches the client on `globalThis`).
- Secrets live in `.env` and Vercel env vars only — never in chat, git or
  a terminal transcript. **(Corrected 2026-09-05: this rule used to open
  with `FAMILY_PASSWORD` differing between dev and prod, which stopped
  being current at the 2026-08-29 accounts cutover — Captain confirmed
  zero references remain in `src/`, `prisma/`, `.github/` or AGENTS.md.
  It survives only as a value in `.env` and Vercel, as a rollback lane
  whose stated ~7-day window has now expired; deleting it from both is
  outstanding cleanup, not a live rule.)** Rotating the **dev**
  `SESSION_SECRET` is the response when a dev cookie leaks into a
  transcript — mission-16 gate round 3 is the recorded instance.
- It's `proxy.ts`, not `middleware.ts` (Next 16) — a middleware.ts won't run.
- Never push without the user; after "done," check
  `git log origin/main..HEAD` — this repo has been bitten three times by
  finished-but-unpushed work.

## Captain's checklist

1. Placement — every new file where the layout map says its kind lives.
2. Size — caps respected; growth trends flagged.
3. Dependency direction — arrows hold; no cycles; the guarded-action split
   intact on any new external call.
4. One source of truth — no second definitions; no copy-pasted shared logic.
5. Naming — consistent with conventions and neighbors.

## Settled decisions — don't relitigate

- **The four accounts-cutover decisions stay settled** (2026-08-28/29;
  written into this document 2026-09-05 on Captain's finding that they
  lived only in CLAUDE.md's prose and not in the constitution agents
  actually gate against — Bryce approved):
  **no auth vendor**, Clerk included — the swap-cheap design was spent,
  not saved; **two tiers with no `kind` column**, because whether someone
  can log in *is* whether `passwordHash` is null, so the two can never
  drift and upgrading a profile to an account is one UPDATE;
  **parents manage, kids participate**; and **device mode is a `role` on
  the same axis**, never a second concept.

- **`PantryItem` / `pantryItemId` keep their internal names** even though the
  UI says "inventory" — renaming means a live-database migration for zero
  user-visible benefit. The gap is deliberate and commented.
- **`Recipe.steps` stays `steps`** though the UI heading says "Instructions."
- **Ingredients/steps are newline-separated text columns**, not structured
  rows. The tripwire stands at 3 of 4 workarounds — a fourth feature needing
  structured ingredients means build it, stop working around it.
- **Per-person accounts** (`session.ts`/`dal.ts`, `getVerifiedUser`,
  `MANAGER_ROLES`, the `User` table, `bootstrap-users.ts`) — shipped
  2026-08-28/29, replacing the single shared family password, which the
  cheap-swap design anticipated. **(Corrected 2026-09-05 on Captain's
  finding: this line still described the retired architecture as current,
  inside the section headed "don't relitigate.")**
