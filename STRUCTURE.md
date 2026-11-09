# STRUCTURE.md — Marshee

Captain's constitution for this repo. It codifies the layout and boundaries
the project already holds (full reasoning in docs/history/claude-md-archive-2026-10-31.md); Captain gates
structural changes against it.
The story behind each rule (why it exists, which mission added it, its
corrections) is in docs/history/structure-rationale.md under the same
section and rule names; a rule here keeps a one-line pointer.

## Layout map

| Path | What lives here | What never lives here |
|---|---|---|
| `src/app/(app)/` | Authenticated routes, wrapped in `AppChrome` (drawer, hamburger, and the wordmark header on `/` and `/login`). `/login` deliberately lives here too and gets no drawer (`AppChrome` is handed no user), rather than moving to a separate layout for one page | Pages needing a genuinely chrome-free root layout; those go in `src/app/share/` |
| `src/app/privacy/` | The one public static policy page (own root layout, no chrome, indexable) | Anything session-dependent |
| `src/app/share/` | Public token-gated pages (own root layout, no chrome, `noindex`) | Anything session-dependent |
| `src/app/api/` | Route Handlers for non-browser clients (e.g. `/api/voice`, `/api/assistant/v1/`), plus **session-gated GET routes for bytes a page cannot inline** (an `<img src>`), where a Server Action cannot serve the response: `/api/feedback/[id]/screenshot` is the one instance (mission-38). Such a route calls `getVerifiedUser()` itself, answers 404 to anyone not allowed (the same answer as an unknown id), reads through the domain's one reader, sends `Cache-Control: private, no-store`, never writes, and is never added to proxy.ts's public lists. Also **browser return routes**, where a third party sends a person's browser back and a Server Action cannot receive the GET: `/api/google/callback` is the one instance (mission-55; rules under "Browser return routes" below). A handler may run its own reads the way a page does — one `Promise.all`, a narrow `select`, shaped by a lib serializer; every write, and any rule the app also applies (a threshold, a bucket, a filter), is a lib call | Logic that belongs in an action or lib — writes and shared rules above all |
| `src/app/actions/` | Server Actions — **every exported action opens with a DAL guard, except `auth.ts`'s `login`/`logout`** (`logout` reads the session only to send a device login back to `/settings`; the tablet signs out through `logoutWithAdminPassword`, which is guard form (a) and not part of the exception) — a login action can't require the session it exists to create. Two forms, chosen by who can reach the trigger, never by taste (see the guard-form rule below) | Unguarded exports outside that one named exception; pure logic (goes in lib); hiding a control instead of guarding its action; **type re-exports** (mission-53, A-L3-10: a component takes a type from its lib home, never through a `"use server"` file, because Turbopack dev threw `HabitInput is not defined` on `export type { HabitInput };`. A new one is a BLOCKER; existing debt to fix on the next touch: `groceriesRecipes.ts:35`, `groceriesPutAway.ts:28-33`) |
| `src/proxy.ts` | The Next 16 proxy — redirect-to-login UX, plus the narrow public routes (`/login`, `/privacy`, `/api/voice`, `/api/alexa`, `/api/cron/briefing`, `/api/google/callback` — exact matches) and prefixes (`/share/recipe/`, `/share/cookbook/`, `/api/assistant/v1/`) | A second `middleware.ts` file (won't run under Next 16); treating this as the real auth gate — that's the in-action `getVerifiedSession()` guard, this is only UX |
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
  a bearer secret, or a platform signature plus skill ID) runs before the
  body is parsed and before any lib call — `/api/voice`, `/api/alexa`,
  `/api/assistant/v1/` (whose gate is the shared `assistantRoute` wrapper)
  and `/api/cron/briefing` (mission-48: Vercel's cron, gated by a
  constant-time `Authorization: Bearer ${CRON_SECRET}` check that runs first
  and answers 401 when the secret is missing) are the instances. A new cron
  job is its own route under `src/app/api/cron/<job>/`, carries the same
  first-line `CRON_SECRET` check, and gets its own exact entry in
  `PUBLIC_ROUTES`; `/api/cron/` is never a public prefix (A-48-1).
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
- **Browser return routes (mission-55).** A provider that sends a person's
  browser back to Marshee (an OAuth redirect) arrives as a plain GET, so it
  needs a Route Handler at `src/app/api/<provider>/callback/route.ts`.
  `/api/google/callback` is the one instance; another needs its own
  amendment. It is an exact entry in `PUBLIC_ROUTES` only so proxy.ts does
  not bounce the return to `/login`; the route is its own gate. It is GET
  only. Its first lib call is the session guard (`getVerifiedUser()` plus
  `MANAGER_ROLES` or a named role), and a one-time state value from an
  `httpOnly` cookie is then checked in constant time against the query. The
  cookie is cleared before either check, so a state value works once. No
  provider call and no write happens until both checks pass. Provider calls
  and every write are lib calls, with this route as their guarded caller.
  Every outcome is a redirect to one named page carrying only a fixed code;
  a provider's error code is copied only if it matches a strict shape. No
  token, code or provider response is logged or put in a URL. It never calls
  `revalidatePath`: every `(app)` page is dynamic and the return is a full
  page load. Its redirect URI comes only from `src/lib/google/redirectUri.ts`.
  (Added 2026-11-08, mission-55, on Captain's ruling; Bryce approved.) (Story: docs/history/structure-rationale.md, "Browser return routes: the Google instance".)
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
  `constants.ts` enforces vocabularies instead. (Story: docs/history/structure-rationale.md, "No Prisma enums: the provider swap".)
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
  found nothing. (Story: docs/history/structure-rationale.md, "Guard forms: refusal versus emptiness".) A caller that ignores the distinction is free to; one that needs
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
  **read fresh from the database**. (Story: docs/history/structure-rationale.md, "Guard forms: the membership form correction".)
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
  `calendarEventQuery.ts` and `calendarTaskQuery.ts` (mission-49) are the
  instances — `calendarEventQuery.ts` (mission-15/C1) is a
  SELECT-plus-mapper module shaped like `personInfo.ts` but, unlike it,
  runs the query itself, so it carries the guard.
  When a module needs both a testable policy and a database read, split
  it: the pure half gets its own import-free file and the tests point
  there (`loginRateLimitPolicy.ts` / `loginRateLimit.ts` is the pattern).
  (Story: docs/history/structure-rationale.md, "Skipping server-only: the live database remark".)
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

- **`src/components/RecipeBody.tsx`** is the only markup for a recipe's
  Ingredients, Instructions and Notes. The share and print pages render
  `RecipeBody` whole; the private detail page places the three exported
  sections itself. A second copy of that markup anywhere is a BLOCKER.
  (Mission-51, A-L5-6.)
- **`src/lib/calendarTaskQuery.ts`** (`server-only`, no auth; mission-49):
  `getTasksInDueRange(dueStart, dueEnd, viewerUserId)` is the only Task
  select and `CalendarTaskView` mapper. Its callers are the Calendar page,
  `fetchTasks` in `actions/tasks.ts` and `loadCalendarWidget`; each keeps
  its own bounds rule and the module takes bounds as given. A second
  `db.task.findMany` that builds a `CalendarTaskView` is a BLOCKER
  (`briefingRead.ts`'s narrow task query builds no view, so it is not one).
- **`compareEvents` in `src/lib/scheduleWindow.ts`** is the only order for
  events within a day (start, then id), used by Schedule and the Calendar
  widget. **`formatClockTime` in `calendarDates.ts`** is the only
  browser-local single-time label ("3 PM", "12:30 PM"), on the same
  `clockParts` as `formatTimeRange`; `formatHouseholdClock` stays the
  server's zone-explicit formatter. (Mission-49.)
- **`DaySectionHeader` in `DaySection.tsx`** is the only weekday-and-date
  day header; DaySection and `CalendarWidgetTile`'s day columns both draw
  it. (Mission-49.)

- **`src/lib/useOptimisticRun.ts` is the only home of the optimistic tap
  wrapper** (clear the error, start a transition, show the change, await the
  action, show `result.error`, catch a network failure with the one exported
  `SAVE_FAILED` message). Every component that taps and saves
  (`HabitTodayList`, `HabitFamilyView`, `HabitStats`, `NudgeCard`,
  `ThisWeekList`, `VisionBoard`, `HabitManager`, `GoalDetail`, `ChoreChart`,
  `VacationCard`, `HabitTileRows` (in `HabitsTile.tsx`, used by both dashboard habit
  tiles) `DashboardWidgetList` (moved over in mission-34), `PlanDayCard` and
  `PlannedTodayCard` (mission-35), `HoursEntryList` (mission-37), `FeedbackList` (mission-38);
  `HoursLogSheet` takes its caller's `run` (typed `RunChange`) and never
  wraps a save itself)
  calls it with the action as a closure, so lib never imports `app/`. A second
  copy of that shape, or the message typed again, is a BLOCKER. Left out on
  purpose, to move over later: the differently worded saves in `HabitsChoresSettings`,
  `NavModeSetting` and `NudgeButton`.

- `src/lib/constants.ts` — categories, locations, meal slots, stores,
  **roles with their display labels and assignability, avatar colors**,
  their icons and order
- `src/lib/nav.ts`: `NAV_SECTIONS` (+ `NAV_FOOTER_ITEMS`), the only nav list.
  Since mission-38 `NAV_FOOTER_ITEMS` is Settings alone: Profile has no row,
  `activeNavHref` lights Settings for `/profile`, and Settings' top card
  (`SettingsAccountCard`) links to it. **Send feedback is the drawer's one
  non-destination row**: a button drawn by `NavList` (full and compact),
  never an entry in `nav.ts`; the sheet it opens is held once, in
  `AppChrome`. Sign out lives only at the bottom of `/settings`.
  `navLabelForPath(path)` is the only way to turn a saved page path into
  words (the label of the row `activeNavHref` lights, else the raw path); a
  screen that maps paths to page names by itself is a BLOCKER.
  `src/lib/routeRedirects.ts`: `LEGACY_ROUTE_REDIRECTS`, the only redirect
  map; it has **no imports at all**, because `next.config.ts` imports it by
  relative path. `src/lib/navMode.ts`: the only menu-style list
- `src/lib/goalVocabulary.ts` — Plans & Goals' vocabulary: `LIFE_AREAS`,
  `PLAN_KINDS`, `HABIT_PERIODS`, `GOAL_VISIBILITIES`, `GOAL_OWNERSHIPS`,
  `ONGOING_LABEL` (mission-38), `GOAL_BOARD_EMPTY_AREA` (mission-51, the
  wide Goals board's empty-area line), and
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
  `src/lib/goalsRead.ts` is the only page reader of goal rows.
  **Ongoing goals (mission-38):** `Goal.targetDate` is nullable; null means
  Ongoing. `validateGoalInput` in `goals.ts` is the only place that decides
  whether a goal is ongoing or dated: only an explicit `ongoing: true` lets
  a blank date through, and the past-date check applies only to a date.
  Actions save its result as is, with no second check. `paceStatus` in
  `goalsProgress.ts` is the only pace rule for an ongoing goal ("reached"
  or null). `findGoals` in `goalsRead.ts` orders ongoing goals last
  (`nulls: "last"`). `ONGOING_LABEL` in `goalVocabulary.ts` is the only
  "Ongoing" wording; a component or page that types the word itself is a
  BLOCKER. `isOngoingGoal(goal)` in `goals.ts`, beside `isPrivateGoal`, is
  the only "is this goal Ongoing" check (mission-50; added when the
  tripwire was crossed). A page, component, action, route or serializer
  that compares `targetDate` with `null` itself is a BLOCKER. The one
  sanctioned inline check is in `paceStatus` (`goalsProgress.ts`),
  commented, because `goals.ts` imports `goalsProgress.ts` and importing it
  back would make a cycle. The form
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
  its newest row and are written only by `src/lib/goalWrites.ts`
  (mission-50): `addCheckIn`; removing the number in `updateGoal`; and
  `rebuildGoalNumber(tx, goalId, { keepUpdatedAt? })`, the one writer of
  the fallback, which skips a write that changes nothing and keeps
  `updatedAt` when asked. It is called by check-in removal and by
  `afterUndo` (`assistant/undoHooks.ts`, with `keepUpdatedAt: true`, for the
  goals `goalWork` in `assistant/undoWork.ts` names); undo never writes the
  cache columns itself (`VOLATILE` in `undoModels.ts`). `lockGoal(tx, id)`
  in `goalWrites.ts` is the only goal row lock. They are read for pages
  only by `goalsRead.ts`.
  `numberAfterCheckIns` in `goalsProgress.ts` is the one fallback rule (the
  newest remaining check-in, else the start value). **Two places must
  change together:** the two `PlanItemRow` builders (`planItemRowOf` in
  `planItemWrites.ts`, and `goalsRead.ts`), and the two check-in flags in `goalsRead.ts`
  (`goalInclude` and `toView`). **Size watch:** `GoalDetail.tsx` is 277
  lines (soft cap 350) after mission 37 moved "The result" card into
  `GoalResultCard.tsx`; `goals.ts` is 343 (mission-50) and `GoalForm.tsx` 334 (its target-date field, with the
  chips and Ongoing, is the split seam); `goals.test.ts`
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
  `HABIT_TRACKS`, `PACE_DAYS`, `HOURS_LIMITS` (with `paceStep` and the
  sheet's `chips`), the `toHabitTrack` / `toPaceDays` repairers, the
  hour/hours rule `unitFor`, `HOURS_PHRASES` and `checkHoursTarget`, the one
  check of a typed weekly target (used by `actions/habits.ts` and
  `goals.ts`). It has **no imports**, and sits beside
  `habitVocabulary.ts` (past its soft cap) because new habit words go in a
  new file by concern. Entries live in `HabitTimeEntry`, written only by
  `addHabitTime` / `removeHabitTime` in `habits/habitWrites.ts`. An hours
  habit is stored in one forced shape (weekly, once, `build`, `each`, no
  carry-over), set only by `habitColumns` in `habits/habitRows.ts`. The one
  pace formula is `paceMinutesPerDay` in `habits/hours.ts` (hours left over
  counted days left, rounded up to `paceStep`); the weeks streak lives in
  the `HabitParticipant` cache and is aged by `hoursStreakAfter`. Screens
  shape hours answers in `src/lib/habitsHours.ts`. (Added mission-37.)
- `src/lib/habits/` is the habit engine, a domain subdirectory under the
  `src/lib/voice/` precedent. `schedule.ts`, `carryOver.ts`, `streaks.ts`,
  `progress.ts`, `perfectDays.ts`, `planPrompts.ts`, `access.ts`,
  `habitRows.ts`, `weekOverrides.ts`, `choreStreak.ts`, `hours.ts` (the
  weekly-hours rules, mission-37) and `types.ts` are
  pure: no Prisma client, no `db`, and
  callers pass `today`. `habitWrites.ts`, `participantWrites.ts`, `streakWrites.ts` and
  `planWrites.ts` (all `server-only`) are the only writers of the `Habit`,
  `HabitParticipant`, `HabitLog`, `HabitPlannedDay` and `HabitTimeEntry`
  tables. One sanctioned exception (mission-47, amendment A10):
  `src/lib/assistant/undoWrites.ts` restores, removes and re-creates
  `Habit`, `HabitParticipant`, `HabitLog` and `HabitTimeEntry` rows from
  audit copies only. It applies no habit rule and never writes the columns
  that `VOLATILE` in `undoModels.ts` names (the streak caches). After its
  steps it calls `afterUndo` (`assistant/undoHooks.ts`), which rebuilds the
  touched streaks through `streakWrites.ts` in the same transaction. No
  other module outside the four writer files writes these tables.
  `streakWrites.ts` alone writes the cached streak columns (`currentStreak`,
  `bestStreak`, `streakAsOf`; split out of `habitWrites.ts` in mission-35),
  `participantWrites.ts` holds the participant writes (join, reorder,
  replace) and `atomically`, and `planWrites.ts` is the only writer of
  `HabitPlannedDay`. (Second file added mission-31; third and fourth
  mission-35.) `src/lib/habitsRead.ts` (Today, Manage,
  the editor, the action loaders and `loadHabitsForPlan`) and
  `src/lib/habitsStatsRead.ts` (the stats page and the family view,
  mission-32; the Report's `loadHabitReport`, mission-36) are the only readers of the `Habit`, `HabitParticipant`,
  `HabitLog`, `HabitTimeEntry` and `Nudge` tables for pages and actions
  (an action that needs one entry uses `loadTimeEntryForAction`). Both are
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
  (`goalsProgress.ts` takes `habits/progress`, the `habits/types` types
  and `habitsHours.ts`'s plan builders, and `goals.ts` takes the
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
  stored day is a BLOCKER. The four older `goal.targetDate` sites
  grandfathered by mission-30 moved to the helper in mission-38; none
  remain. (Added mission-30; closed mission-38.)
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
  mission-36; mission-37 moved the `habitsStatsRead.ts` and
  `habitsFamily.ts` sites into `access.ts` as `othersPrivateHidden` and
  `showsOnFamilyView`; `habitsReportScope.ts` moves at its next touch). The plan-to-habit glue lives in `goals.ts` beside the
  goal policy: `habitInputFromPlan` (a plan item's fields become a Habit's),
  `habitParticipantsFor` (a Mine goal's owner, or the household) and
  `habitCheckTarget` (whose row a tap writes, not permission; `hoursSubject` wraps it for
  an hours plan, so the goal screens log time for the same person a check
  would, never the viewer by default). It is pinned by
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
  `habitsRead.ts`'s `loadHabitRoster`, or `loadHouseholdPeople` itself, never
  by composing their own `db.user` query from its constants. An action may
  read ids with `HOUSEHOLD_PERSON_WHERE` to validate a request (the
  `validatedPeople` split). **The household order** (mission-41, Bryce's
  decision 2) is one rule in the same file: placed people by
  `User.familyOrder`, then the unplaced by `createdAt`. `loadHouseholdPeople`
  applies it (the order itself is not exported), so every household list
  (Whole family, habit pickers, vision boards) follows the order an admin
  sets on Manage family; it is never restated as a second `orderBy`.
  `src/lib/householdOrder.ts`'s `isExactHouseholdOrder` (pure) is the only
  "is this a complete household order" check, and
  `src/app/actions/usersOrder.ts`'s `setFamilyOrder` is the only writer of
  `familyOrder`, writing no other `User` column. (Approved by Bryce
  2026-11-05, mission-30, Captain's A8; debt closed mission-31; order added
  mission-41, Captain's A1.)
- **Tablet rules have one home (mission 39, decision 10).**
  `src/lib/tabletRules.ts` is the only home of what the tablet (role
  `"device"`) may do beyond the default for every signed-in login. It holds
  one named, exported, pure check per rule, prefixed `tabletMay...`
  (`tabletMayCompleteAnyTask(role)` is the first), so the later per-login
  permissions page can turn each check into one switch. The file imports only
  from `constants.ts` (no `db`, no `server-only`, nothing from `habits/` or
  another domain policy), so every policy can import it without a cycle. A
  rule that needs a database fact (PR B's parent rule needs the creator's
  role) takes it as a plain argument, read fresh by the caller. Where a domain
  has a lib policy, the policy calls the helper inside its existing check
  (`canEditHabit` / `canChangeChore` in `habits/access.ts`, `canEdit` in
  `goals.ts`); where the guard lives in the action (tasks, calendar), the
  guard calls it. An action or page never calls a `tabletMay...` helper next
  to a domain policy to widen it. From mission 39 PR B on, a **new**
  permission decision that tests `role === "device"` or `isDevice` inline
  outside this file is a BLOCKER. Identity and display tests are not
  permissions and stay where they are (sorting the tablet last, its icon,
  choosing the sign-out sheet, the household people filter); the existing
  device tests are grandfathered and PR B moves each one it rewrites. Code
  calls the role `device`; "tablet" appears only in this file's name, the
  `tabletMay...` prefix and UI copy. (Mission 39 PR A, Captain's A1.)
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
- **Winnie notifications (mission-42).** `src/lib/winnieNotify.ts`
  (`server-only`, no auth; callers check the role) is the only code that
  reads `WINNIE_WEBHOOK_URL` / `WINNIE_WEBHOOK_KEY` and the only outbound
  call to Winnie; a second sender is a BLOCKER. The rules (event shape,
  Denver `occurredAt`, which outcomes retry, the 1 s / 3 s schedule, the
  10 s attempt timeout, the one log line) live in pure
  `src/lib/winnieEvents.ts`, tested with a fake fetch; `describeAttempt`
  takes no URL or key so a log line cannot leak them. Its callers are
  `sendWinnieTestEvent` (`actions/winnie.ts`, guard form a, admin only) and
  the morning briefing cron route `src/app/api/cron/briefing/route.ts`
  (`CRON_SECRET` gate, mission-48). Like a domain write module it may have
  several guarded callers, each carrying its own gate; it never carries one.
  Instances of where event words live: `briefing.daily`'s title and body are
  built only in `briefing.ts`; `connection.test`'s one-line title and body
  stay in `actions/winnie.ts`; the next event type with more than a sentence
  of words follows `briefing.ts`. (Added 2026-11-06, mission-42; Bryce
  approved the plan. Callers amended mission-48, A-48-2, Hill approved.)
- **Winnie's morning briefing (mission-48).** `src/lib/briefing.ts` is the
  pure builder (no `db`, env or clock read; callers pass `today` and `now`)
  and the only home of the briefing's words. `src/lib/briefingRead.ts`
  (`server-only`, no auth): `loadBriefingShared` runs the family-wide reads
  once per run (`getCalendarEventsInRange`, plus its own narrow task and
  meal-plan queries matched by `findPlanForWeek` and `slotsForDay`);
  `loadBriefingInput` adds one adult's habits only through `loadTodayPage`,
  so `canSeeHabit` keeps private habits private. `src/lib/briefingSent.ts` (`server-only`, no auth)
  is the only writer of `WinnieBriefingSent`; the claim (insert before send,
  unique `(userId, day)`) is the once-a-day guard. `loadHouseholdAdults` in
  `householdPeople.ts` is the only "who gets a briefing" rule. Their one
  caller outside the briefing modules is the `CRON_SECRET`-gated route. (Added mission-48, A-48-6, Hill
  approved.)
- **Which household days an event covers** is `eventDayRange` and
  `bucketEventsByDay` (all-day: UTC midnights, end exclusive; timed:
  `[startAt, endAt)` in the household zone), and **which stored plan is a
  week's** is `findPlanForWeek`. All three live today in
  `src/lib/assistant/summary.ts`. A top-level lib module may import these
  pure exports (`briefing.ts` and `briefingRead.ts` do); it never imports
  `assistant/` route machinery (`assistantRoute`, auth, `openapi`). The next
  contract that touches them moves `eventDayRange` and `bucketEventsByDay`
  to a neutral pure `src/lib/householdEvents.ts` and `findPlanForWeek` to
  `src/lib/mealPlanWeek.ts` (the week-matching rule's home), with
  `summary.ts` re-importing them. A second copy of either rule is a BLOCKER.
  (Added mission-48, A-48-4, Hill approved.)
- **Pending (A-48-5, adopt when either site is next touched):** a
  `vacationLabel(through, today)` in `habitVocabulary.ts` becomes the only
  choice between `VACATION_TODAY_LABEL` and `vacationThroughLabel` (the
  last day reads "today"). The two sites that make it today are
  `src/components/HabitTodayList.tsx` (the vacation card) and
  `src/lib/briefing.ts` (the Chores line). Not a BLOCKER until it exists.
- **Send feedback (mission-38).** `src/lib/feedback.ts` has no imports, on
  purpose, and holds the rules: `MESSAGE_MAX`, `SCREENSHOT_MAX_BYTES`,
  `USER_AGENT_MAX`, `SCREENSHOT_TYPE`, `TOUCH_STAMP` (the one encoding of "a
  Mac that had touch", appended to the user agent), `normalizeMessage` (the
  only empty or too-long wording, used by both the sheet and the action),
  `normalizePagePath`, `normalizeViewport`, `describeDevice` and
  `decodeScreenshot` (uses `Buffer`, so server code only).
  `src/lib/feedbackRead.ts` (`server-only`, no auth; callers check the admin
  role) is the only reader of the `Feedback` table, and its list never
  carries screenshot bytes; a second reader is a BLOCKER. `sendFeedback`
  (`actions/feedback.ts`, guard form a, devices too) and `markFeedbackDone` /
  `deleteFeedback` (`actions/feedbackAdmin.ts`, form b, behind the
  `requireRole("admin")` page `/settings/feedback`) are the only writers; if
  a second caller appears (a Winnie route), the writes move into
  `src/lib/feedbackWrites.ts` first. The bytes go out through
  `src/app/api/feedback/[id]/screenshot/route.ts` alone. **`Feedback` has no
  Prisma relation to `User` on purpose** (mission-38's collision rule
  forbade a `User` back-field): `authorId` is a plain id and `authorName` a
  snapshot; adding the relation later is a separate additive migration that
  first confirms no `authorId` lacks a `User` row.
  `src/lib/captureScreenshot.ts` carries `import "client-only"`, is the only
  in-browser page capture and the only importer of `html-to-image`.
- **Feedback time labels: `src/lib/feedbackTime.ts`** is the only home of
  `feedbackTimeAgo(createdAt, now)` and `feedbackTimeLabel(createdAt)`
  ("Tue, Nov 3, 11:30 PM"). It imports only `constants.ts`,
  `householdDate.ts` and `mealPlanDates.ts`; day, month and weekday words
  come from those helpers, never from `toLocale*` options. Its clock uses
  `formatHouseholdClock` from `householdDate.ts`. A list that shows "time ago" takes one `now` from
  its server page as a prop, so server and browser print the same words.
  (Added mission-38, on Captain's ruling.)
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
  the dash-free week title ("Nov 1 to 7"), beside `formatShortCalendarDate`.
  `formatWeekRange(weekStart)` in `mealPlanDates.ts` (browser-local `Date`:
  Meal Plan, the Calendar Week title, Schedule, This week, the meal plan
  sheets) prints the same dash-free range ("Nov 1 to 7", "Nov 29 to Dec 5";
  mission-52, decision 268). They are two homes because their date types
  differ, not their spelling; a spelling change changes both. The Calendar
  3 Day title's private range formatter in `calendarViewConfig.ts`
  (mission-17) still prints an en dash: grandfathered debt, retired the next
  time the Calendar header is touched by a `formatDayRange(start, end)`
  beside `formatWeekRange` that both use. Any other range formatter is a
  BLOCKER. (Added mission-36; reworded mission-52, Captain's A-L4-6.)
  `formatHouseholdClock(instant, timeZone, { dropZeroMinutes })` is the repo's only
  household-zone clock formatter: a plain ASCII space before AM/PM and, on
  request, no `:00`. `hourInZone(instant, timeZone)` beside it is the only
  zone-explicit wall-clock hour reader (server code; browser-local reads stay
  in `calendarDates.ts` / `timelineLayout.ts`). A copy elsewhere is a
  BLOCKER. (A-48-3, Hill
  approved.) (Story: docs/history/structure-rationale.md, "Household date helpers: where the clock formatter came from".)
- `src/lib/password.ts` — `MIN_PASSWORD_LENGTH`, the one answer to "how
  long must my password be", shared by the actions that enforce it and
  the inputs that advertise it
- `src/lib/dashboardWidgets.ts`: `DASHBOARD_WIDGETS`, the only widget
  registry (per kind: label, allowed `sizes`, `defaultSize`, `onTablet`);
  `DASHBOARD_WIDGET_KINDS` there is the one kind list and the default
  order (a test pins the record to it). `calendar` is first (mission-49,
  decision 237: all four sizes, Large by default, on the tablet).
  `WIDGET_SIZES` / `WIDGET_SIZE_LABELS` are the only size list and size
  names; `DASHBOARD_WIDGET_WORDS` holds the dashboard and Customize words,
  and `CALENDAR_WIDGET_WORDS` the Calendar widget's and its options' words
  (decision 238). A widget's words typed in a component are a BLOCKER.
  `parseDashboardLayout` in `dashboardLayout.ts` is the only reader of the
  stored layout JSON (version 2: a list of widget instances, each
  `{ uid, kind, size, items?, options? }`, so a kind may appear more than once).
  **Options (mission-49):** `src/lib/dashboardWidgetOptions.ts` is the only
  home of each kind's option shape, defaults (`CALENDAR_WIDGET_DEFAULTS`)
  and cleaner (`cleanWidgetOptions`); the parser and `setWidgetOptions`
  both clean through it, so a bad value or a key the kind does not have
  never survives. `calendarOptionsOf(widget)` is the only way to read a
  Calendar widget's options with defaults filled in, and `widgetRowDetail`
  the only Customize second line. Only `calendar` has options; a new
  kind's options are added there, never parsed elsewhere.
  **Upgrade rule (mission-43):** a version 1 layout is upgraded on read,
  sized by v1's own pairing rule, so a saved dashboard opens unchanged; the
  v1 insertion rule (mission-29) lives on only inside that upgrade, and runs
  over the frozen `V1_KINDS` (the seven v1 kinds), never
  `DASHBOARD_WIDGET_KINDS`, so an upgrade never adds a kind v1 lacked. A v2
  layout never gets missing kinds inserted: a removed widget stays removed.
  `nextWidgetUid` is the only rule for a new or repaired uid (Add and the
  parser's repair use it). The default layout and the v1 upgrade hold each
  kind once, so they use the bare kind, which is what `nextWidgetUid` gives
  a first instance.
  The grid is 2 columns and 4 from a 45rem container width (the dashboard
  is a wide page, mission-44: see "Wide pages" below), never from `md:`.
  `src/lib/dashboardGrid.ts` (`packWidgets`, `gridAreaVars`) is the only
  placement rule for the grid at 2 and 4 columns; the DOM stays in layout
  order and CSS variables place each cell, never `grid-auto-flow: dense`.
  `src/lib/dashboardLoaders.ts` holds the dashboard's kitchen reads and
  the Calendar widget's read (`loadCalendarWidget`: events, tasks and
  planned habit days from Denver yesterday through today + 9, one read
  shared by every Calendar widget on the layout), one loader per kind.
  `src/lib/calendarWidget.ts` is the widget's pure engine (the next item,
  a day's items with open before done, caps that drop done items first,
  empty words). It takes `today` and `now` from the browser (`useToday`,
  `useNowMinute`), never the server; it matches events by
  `daysEventCovers`, tasks and habit days by `allDayInstantToLocalDay`, and
  orders events with Schedule's `compareEvents`. The page loads only the kinds on the layout (goals load for
  every signed-in viewer and habits for every non-device viewer, for the
  notes and the pickers).
  **Picks (mission-34, per instance since mission-43):** a widget's optional `items` (only `habits` and
  `goals`, `PICKABLE_WIDGET_IDS`) is checked for shape in the parser and
  for ownership per instance, through `keepOwnPicks` in `src/lib/dashboardPicks.ts`, which also holds
  `picksOf(widget)` (the only way to read a widget's picks), `layoutForViewer` (the
  tablet's layout leaves out kinds whose `onTablet` is false: `habits` and
  `chores`, decision 138),
  and the picker's pure rules (`splitPicks`, `togglePick`); the layout
  edits (`addWidget`, `removeWidget`, `resizeWidget`, `setWidgetItems`,
  `reorderWidgets`) all sit in `dashboardLayout.ts`; `habitsTileFor` (in
  `habitsRead.ts`) and `goalsTileFor` (in `goalsRead.ts`) apply one
  instance's picks to its kind's single load; `isPickableWidget` / `PickableWidgetId` in
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
  and `goalsRead.ts` may import them, never the reverse. `dashboardGrid.ts`
  imports only types from `dashboardWidgets.ts`; `dashboardLoaders.ts` is
  `server-only` and imported only by the dashboard page.
  `dashboardWidgetOptions.ts` imports only `dashboardWidgets.ts`;
  `dashboardLayout.ts` may import it, never the reverse.
  `calendarWidget.ts` imports only pure calendar and dashboard-vocabulary
  modules (`mealPlanDates`, `calendarDates`, `scheduleWindow`,
  `dashboardWidgets`, types), never `db` or a `*Read.ts`.
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
  `src/lib/habitsFamilyColumns.ts` (pure, mission-41, Captain's A3) is the
  only home of the wide Whole family column: rows grouped by time of day then
  Anytime, the Together rows a person is on (built from `countedRows`, never
  a second merge), the row tags (words in `habitVocabulary.ts`:
  `FAMILY_ROW_TAGS`, `familyRowTag`), the empty-column line and the header
  count (`familyCountText`, used by both layouts). `HabitFamilyView` holds
  the one optimistic state for both layouts; the stacked view is
  `HabitFamilyColumn`, the wide one `HabitFamilyWide` /
  `HabitFamilyWideColumn`, and `FamilyHabitRow` is the only family row.
  **Dependency direction:** `habitsFamilyColumns.ts` imports only
  `habitVocabulary.ts` and `habitsFamily.ts`; `habitsFamily.ts` never
  imports it.
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
  `reportFilterOptions` (with `{ kinds: false }` for lists already split by
  kind), `activeReportFilter` and `matchesReportFilter` there are the one
  habit filter rule; the Report, Today's `HabitTodayList` and the wide Whole
  family (`HabitFamilyWide`) all call them (mission-41, Captain's A2). A
  filter option builder or matcher anywhere else, a component file included,
  is a BLOCKER; `HabitFilterChips.tsx` only draws chips and attaches
  `TIME_ICONS`.
  **Habits & Chores page (mission-53, Captain's A-L3-4 to A-L3-7).**
  `src/lib/habitsDay.ts` is the only home of the day browser
  (`resolveHabitsDay`) and the `/habits` URL builder (`habitsHref`); a
  past day's lock is display only, and writes keep `isTapDayAllowed`. It
  imports only `householdDate.ts` and `habits/carryOver.ts`.
  `habitsFamilyColumns.ts` is the only time-of-day grouping
  (`groupColumnRows` for the family view, phone cards and wide columns
  alike; `groupRowsByTime` for Mine), the only fit rule (`fitsEveryone`,
  `FIT_COLUMN_MIN` 220 and `FIT_COLUMN_GAP` 12, which is `gap-3`; both
  ends name each other) and the only home of a column's empty text
  (`emptyColumnText`). Row tags come from `familyRowTag` through
  `ColumnItem` / `TimeRowItem`. `HabitRow layout="auto"` and
  `FamilyHabitRow layout="card"` are the only tall cards. The file
  imports only vocabulary, `habitsFamily.ts` and types from
  `habitsToday.ts`. `HabitsDayView` is the one client owner of the Filter
  state for both views, and `habitsReportScope.ts` holds every Today and
  Whole family filter rule: `reportFilterOptions(..., { kinds: false,
  areas: false })`, `matchesHabitsFilter`, `narrowedFilterCount`
  (decision 261), `stillHiddenPeople` and `shownColumns`. Lists receive
  `keep(row)` only; a component that matches rows or columns against the
  Filter, people included, is a BLOCKER, and `HabitFilterSheet.tsx` only
  draws each chip's on/off state. `HabitsBar.tsx` is the only Habits bar,
  drawn through `bar(subtitle)`; `HabitFilterSheet.tsx` is the only
  filter sheet and the only Mine / Whole family switch; the bar icon is
  the only Report entry.
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
  `habitVocabulary.ts` is 425 lines (about 254 code; mission-53, A-L3-8:
  new habit words stay there while its code is well under the cap, past
  about 300 code lines a concern gets its own file, and an exported word
  is referenced, never typed again), `habitsStats.ts` 387, `habitsToday.ts`
  353 (about 283 code), `habitsReportScope.ts` 275, `HabitForm.tsx` 350
  (at the soft cap), `habitsRead.ts` 350, `habitsFamily.ts` 360 (its stats-page data is
  the split seam), and the tests `habitsStats.test.ts` 426,
  `habitsReport.test.ts` 373, `habitsToday.test.ts` 383 (hours tests live in
  `habitsTodayHours.test.ts`), `goalsProgress.test.ts` 367 and
  `habitsHours.test.ts` 298; the next habit rule or test goes in a new
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
  migrate in one contract; a third copy is a BLOCKER.**
  (Added 2026-09-05, mission-16, on Captain's ruling; Bryce approved.) (Story: docs/history/structure-rationale.md, "validatedPeople: what changed its class".)
  **"Code lines" means one thing, and the tool is the definition.**
  `preflight.mjs`'s `lineCounts` is the canonical counter; a report quoting a
  code count states which counter produced it. Its original heuristic did
  **not** recognise `{/* … */}` JSX comments — they open with `{`, so a
  `startsWith("/*")` test never matched — and JSX comments are this repo's
  dominant documentation form in components, so it over-reported code exactly
  where this clause is meant to protect prose. **Fixed 2026-09-06**; a `.tsx`
  code count from an older report is an upper bound.
  (Added 2026-09-06, mission-18, on Captain's finding; Bryce approved.) (Story: docs/history/structure-rationale.md, "Code lines: the JSX-comment counter instance".)
  **A code line is one that is neither blank nor comment-only** —
  `lineCounts` skips blanks, `//`, `*`, `/* … */` and `{/* … */}` blocks. A
  count that **includes** blank lines is a different measurement and must not
  be compared against a cap threshold or another gate's figure.
  (Added 2026-09-09, mission-19, on Captain's pass-2 finding; Bryce approved.) (Story: docs/history/structure-rationale.md, "Code lines: the blank-line counter instance".)
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
  `DIRECTION_LOCK_PX` remain open. (Story: docs/history/structure-rationale.md, "Pointer-gesture machine: one machine, one bug".)
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
  (Added 2026-09-09, mission-19/F1, on Captain's ruling; Bryce approved.) (Story: docs/history/structure-rationale.md, "Month grid today test: the DESIGN.md prediction".)
- **Month lane counts have one home.** `PHONE_LANES` (3) and `WIDE_LANES`
  (4) live in `src/lib/monthLayout.ts`. MonthGrid lays each row out once
  with `WIDE_LANES`; the phone's "+N more" is `phoneOverflowByDay` of that
  one layout, which lane slots draw at which width is `laneVisibility`,
  and CSS hides the fourth lane under 48rem. A second `assignLanes` call
  per row, or a lane count written in a component, is a BLOCKER.
  (Mission-46/C2 and F1, Captain's A-L2-2.)
- **Page opt-outs from the app frame are data attributes that the chrome
  reads with `has-[[…]]:`**, never a page reaching into the chrome. Three
  exist: `data-fills-viewport` (the calendar's hour timeline: `<main>` drops
  its bottom padding), `data-fills-width` (Whole family's columns,
  mission-41: from `md` up, `<main>` lifts the 768px cap, shrinks the
  bottom padding to `pb-3` and is exactly one screen tall so only the columns scroll; the
  floating hamburger's row lifts its cap too, so the button lines up) and
  `data-page-width="wide"` (mission-44, below). The
  `AppChrome.tsx` comment above `<main>` lists every attribute; the pages
  that use `data-page-width="wide"` are listed only in "Wide pages" below,
  and the comment points there. A new opt-out adds itself there and here.
  (Mission-41, Captain's A4; mission-51, A-L5-8; mission-52, A-L4-8.)
- **Wide pages (mission-44, the iPad landscape plan).** Wide pages: the
  dashboard (mission-44), the Calendar (mission-46, every view), Plans &
  Goals' This week, Goals and Vision tabs, the Goal page and the recipe
  detail page (mission-51), and the Kitchen lists (mission-52): Inventory,
  Shopping, Expiring, Recipes (All recipes and Cookbooks), Cookbook detail
  and Meal plan. Their containers: This week's goal-card grid;
  the Goals board; the Vision card grid; the Goal page's two-panel row
  (`GoalDetail`, with the More row and every sheet outside it); the recipe
  body (two columns). The recipe header band is not a container, because
  it holds the action sheets. `plans/loading.tsx` mirrors This week's grid
  and `recipes/[id]/loading.tsx` the recipe body (mission-51, A-L5-1).
  Habits & Chores is wide too (mission-53, A-L3-1): `/habits`, Manage,
  Chore chart, Report and Stats, and New and Edit since mission-54. Its
  containers: Mine's top strip and its column grid; one round both Whole
  family layouts; Manage; the Chore chart (and each of its day cards);
  Report Year; Stats. `HoursLogSheet` and `ChoreChartSheet` are the
  containers' siblings. Whole family switches layouts at a 45rem
  container while `data-fills-width` reacts at `md`; they agree because a
  768 screen (or 1024 with the Sidebar pinned) leaves a 736px container.
  Stats goes to two columns from a 50rem container only when its right
  column has something (nudges, Side by side, or an hours habit's
  `HabitHoursDetail`); otherwise it is one column capped at `max-w-3xl`. A page that should
  use the whole width of a landscape iPad puts `data-page-width="wide"` on
  its root element (and on its `loading.tsx` root, so it is wide from the
  first paint). From `md` up, `<main>`, the wordmark header's row and the
  floating hamburger's row lift their 768px cap for it; nothing else about
  the frame changes, so the page still scrolls as a page (unlike
  `data-fills-width`). Three rules hold for every wide page:
  1. **The CSS container wraps the columns only, never `<main>` and never
     an element that holds a sheet or a fixed bar,** as a precaution:
     older browser engines treated a container as the positioning parent
     of every `position: fixed` descendant, which would pin a bottom sheet
     inside the page. (Story: docs/history/structure-rationale.md, "Wide pages: rule 1 and the container proof".) Keep sheets
     outside the container or portal them. The dashboard's container holds
     its grid, and the Customize sheet is the container's sibling. Known
     exceptions (work in Chrome; on Bryce's iPad check): `HoursLogSheet`
     renders inline from the Habits tile, inside the dashboard container;
     on the recipe page, `NutritionSection` (Confirm servings),
     `RecipeCookbooksSection` and `RecipeTagsSection` render their sheets
     inline inside the body container. Do not add to this list: a new
     sheet goes outside the container or is portaled (mission-51, A-L5-4).
     Portaled instances: Settings' two sheets (`NavModeSetting`'s
     `RadioSheet`, `AdminPasswordSheet`'s overlay; mission-54), which render
     only after a tap, so `document.body` needs no server branch.
  2. **Column counts come from container variants (`@min-[…]:`, `@3xl:`),
     never screen breakpoints (`md:`, `lg:`).** The page then fits whatever
     room the pinned Sidebar or Rail leaves it, with no extra code.
     **Measured column counts (mission-52).** When JavaScript must decide
     which item goes in which column (a stable split, so a group never
     changes column when it opens or closes), the component measures the
     element whose width the columns divide with `useContainerWidth(ref)`
     (`src/lib/useContainerWidth.ts`) and turns that into a count with
     `columnCountFor(width, max)`, splitting with `splitByWeight`
     (`src/lib/splitColumns.ts`). That is still the container's own width,
     never the window's, so this rule's reason holds. `COLUMN_MIN_WIDTH_PX`
     (2 columns from 768px, 3 from 1024px) is the only JavaScript home of
     those thresholds; the classes `@min-[48rem]:` and `@min-[64rem]:` are
     their CSS mirror and change with them. A width threshold written as a
     number in a component, a read of `window.innerWidth` or `matchMedia`
     for layout, or CSS `columns` for a list of groups is a BLOCKER. The
     measured element holds no sheet, stays mounted in every state of its
     list (empty, searching, grouped), and reads 0 on the server, so the
     first paint is one column and hydration matches; the step to 2 or 3
     columns after a hard reload is the known cost. Measuring an element
     through a ref this way is not a browser-only read under the
     `useSyncExternalStore` rule (`useHamburgerRowHeight` is the same
     shape). Use a measured count only when JavaScript needs it: a small
     fixed set of columns (Expiring's three sections, Cookbooks' cards, a
     week's seven days) uses container variants. Instances: Inventory,
     Shopping, All recipes and Cookbook detail (split), and the Meal plan
     and Feedback (each picks its wide layout at `COLUMN_MIN_WIDTH_PX[3]`;
     Feedback because a sheet below that width and a panel above it is a
     choice JavaScript makes). (Captain's A-L4-1.)
  3. **A row never stretches past a readable width.** More columns, more
     panels or a wider grid; never one 1148px row. One exception: the
     recipe form's Title spans both columns, because Bryce's plan draws it
     that way (mission-54). A short single-line field that spans a form is
     allowed only there. A new one needs the same written reason here.
     Fixed bars (`AddItemBar`) stay centered at 768px.
  4. **The + button sits bottom-right on wide pages** (mission-52 and
     mission-53, plan rule 4; its props are in "The floating +" below). `FloatingAddButton` keeps its fixed full-width wrapper (left
     edge `--app-nav-width`); from `md` on a wide page its inner box lifts
     the 768px cap and aligns right. Below `md`, and on a page that is not
     wide, it stays bottom-left. A fixed element that must clear it on a wide
     page reacts with the same `md:[body:has([data-page-width=wide])_&]:`
     selector, never a measured offset: the All recipes A-Z rail
     (`RecipeLetterRail.tsx`) ends above it. `AddItemBar` stays centered at
     768px (rule 3). (Captain's A-L4-3.)
  **A page's title row may switch with `md:`** (mission-52). A title with
  at most two buttons beside it is not a column count, so it may go from
  stacked to one row with `md:flex-row md:items-center md:justify-between`,
  and one button may be rendered twice, shown with `md:hidden` and
  `hidden md:flex`, when its phone and wide positions differ (Cookbook
  detail's Add recipe). (Story: docs/history/structure-rationale.md, "Wide pages: why the title row may switch".) The row must fit the 736px the Sidebar leaves at a
  1024px screen. Anything below the title row, or a row with more than two
  buttons, uses container variants. (Captain's A-L4-2.)
  **A wide page's loading file.** A wide page's `loading.tsx` renders
  `<SkeletonPage wide />` (or its own skeleton with the attribute on its
  root); the shared `(app)/loading.tsx` stays narrow and now serves only
  `/lists` and `/login`; the recipe print page keeps its own plain
  skeleton. A short page counts as wide here (A-L6-8). `profile/loading.tsx`
  and `kitchen/cooking/recipes/new/loading.tsx` are their own skeletons: the
  `data-page-width="wide"` root, then `SkeletonHeader` and `SkeletonList`
  inside `NARROW_PAGE_CLASSES`. `settings/loading.tsx` renders
  `<SkeletonPage wide>` with two lists in `TWO_COLUMN_CLASSES` inside a
  container, and it also covers Manage family, which has the same two
  columns. `settings/feedback/loading.tsx` renders `<SkeletonPage wide>`
  with a list and a panel block, in a grid that mirrors `FeedbackList`'s
  measured split at 64rem (A-L6-6). `recipes/[id]/edit/loading.tsx` is
  form-shaped and takes its strings from `gridClasses.ts`.
  `recipes/new/manual/loading.tsx` re-exports it, because the manual form
  is the same full-width form and needs its own file to escape
  `recipes/new/loading.tsx`'s 40rem cap. A route whose skeleton is exactly
  another route's re-exports that file and never copies it. The habit,
  goal and calendar forms, New task included, use their folders' wide
  list-shaped skeletons (older, allowed). A new narrow page under one of
  these folders needs the route-group move below or its own plain
  `loading.tsx`. A `loading.tsx` also covers every route below its folder, so a wide
  one sits only in a folder whose pages are all wide. Where a wide page has
  narrow pages below it, the wide page and its `loading.tsx` move into a
  route group (`kitchen/cooking/recipes/(browse)/`), so the narrow pages
  keep the shared skeleton. (Captain's A-L4-4.)
  **Pending (A-L4-5, adopt when a fifth list needs it or two of these are
  next touched):** the measured split grid (`grid items-start gap-x-4` with
  `gridTemplateColumns: repeat(n, minmax(0, 1fr))`, after `columnCountFor`
  and `splitByWeight`) is written in `PantryList`, `GroceryList`,
  `RecipeList` and `FlatRecipeRows`. It moves into one `SplitColumnGrid`
  component (ref, count, split, grid, one render prop per column); after
  that a hand-written copy is a BLOCKER. Not a BLOCKER until it exists.
  The Calendar's containers are the Year grid, the Month grid, each
  `TimelineDayColumn` (so text size follows the column's own width, not
  how many columns there are) and the Schedule two-panel row (plus the
  all-day "+N more" label's own older container); never the
  `CalendarViews` root, which holds every sheet. `data-page-width="wide"`
  and `data-fills-viewport` combine on the Calendar: the first lifts the
  width cap, the second drops the bottom padding on the hour timeline.
  The Kitchen lists' containers are Inventory's and All recipes' search
  rows, Expiring's sections and Cookbooks' cards; Inventory, Shopping, All
  recipes, Cookbook detail and the Meal plan measure instead (rule 2).
  Every sheet stays a sibling. (Mission-52.)
  **Forms, Settings, Manage family and Feedback (mission-54, A-L6-2).**
  Every signed-in page is now wide except `/lists`, `/login` and the recipe
  print page. The long forms are New and Edit habit, New and Edit goal, New
  and Edit event, and the manual recipe form with recipe Edit. The short
  pages are New task, the Add recipe chooser, the paste, link and photo
  imports, and Profile. Settings, Manage family and Feedback are wide too.
  Containers: each long form's `<form>` (`HabitForm`, `GoalForm`,
  `EventForm`, `RecipeForm`), with the grid as its child because a
  container query never measures its own element; the div round Settings'
  two columns; the div inside `FamilyList` round the list and its `aside`
  slot (the page's Family order block). Short pages have no container.
  Feedback measures instead (rule 2). A `<form>` may be the container only
  while it holds no sheet or fixed bar; a form that gains one portals it or
  moves it outside. In `FamilyList` the +, the spacer and the three sheets
  are the container's siblings.
  **Short pages (mission-54, A-L6-8, decision 276).** A short page is a
  wide page with its whole content, BackLink and title included, inside
  `NARROW_PAGE_CLASSES` (centered, at most 40rem). It is not a page left at
  the old 768px cap. Its `loading.tsx` is wide at the root and capped with
  the same constant inside, so the placeholder is as wide as the page. The
  three import components take their BackLink and title as a
  `header: React.ReactNode` prop and own the cap, because whether it
  applies depends on their own state: it lifts when the extracted
  `RecipeForm` appears. The page keeps the words.
  On the dashboard, an Extra large Calendar widget is its own container
  (its day list): its days sit side by side from 30rem of tile body (3
  days as 3 columns; 7 days wrap at a 13rem column floor, decision 240)
  and stack below that. Where two widths need different row caps, both
  lists may be rendered and a container variant shows one; that is allowed
  only for a small fixed list (at most 7 days), never one that grows with
  data. (Mission-49.)
  (Mission-46, Captain's A-L2-1.)
  **Column dissolve (mission-51, A-L5-2):** a two-column layout may set a
  different phone order with one DOM: each column div carries
  `@max-[48rem]:contents` and each child an `order-N`, so below 48rem the
  columns vanish and the children reorder in the parent flex column or
  one-column grid. Allowed only for a small fixed set of sections (the
  recipe page's seven, Settings' eight); never for a list that grows with
  data, because `order` breaks the match between reading order and DOM
  order there. The order is written once, in the page's top comment and
  its classes.
  **Leveling two columns (mission-54, A-L6-9).** A page may level the tops
  of its columns from the column div with
  `@min-[48rem]:[&>:first-child>*]:mt-N`, when the first child is a plain
  wrapper the page owns round a card that takes no `className`. It sets
  that one top margin and nothing else. A child selector that changes any
  other property of a component's insides, or reaches deeper than the
  card's root, is not allowed. Where the card already takes a `className`,
  use that (A-L5-9). Instance: Settings.
  **The one screen breakpoint (A-L5-3):** rule 2's exception: `RecipeHero`
  switches from the phone hero to the small icon tile at `md`, a screen
  breakpoint, because it sits in the header band (which holds sheets, so
  cannot be a container) and `md` is exactly where `<main>` lifts its
  width cap for a wide page. It is decoration, not a column count. A
  second screen breakpoint on a wide page needs the same written reason
  here.
  **The Goals board (A-L5-5)** places its six areas in pure CSS,
  column-major: `grid-flow-col` with a row count of ceil(visible areas / 2)
  at 2 columns (a `--board-rows` variable) and 2 rows of all six at 3
  columns, because the mock stacks fixed pairs. An empty area renders only
  at 3 columns (`hidden @min-[64rem]:block`, `GOAL_BOARD_EMPTY_AREA`). No
  JS split helper while the list is the fixed `LIFE_AREAS`.
  **The floating + (mission-53, A-L3-2):** `FloatingAddButton` is the
  only floating +. It sits bottom left of the 768px column on non-wide
  pages, and on wide pages below `md` (phones stay clear of the last
  row's check); bottom right on wide pages from `md`, through its own
  wrapper (`md:[body:has([data-page-width=wide])_&]`). Its props are
  `onClick` or `href`, plus `label`. Wide scroll areas reserve room for it
  (`pb-20`). There is no + on the tablet. A fixed element that must clear
  it follows rule 4 above.
  **Shared class strings (mission-53, A-L3-3; A-L2-3 done):** a class
  string that a component and its skeleton share is one exported constant
  in `src/lib/`, written as a whole literal so the Tailwind scan finds it:
  `DASHBOARD_GRID_CLASSES` / `DASHBOARD_CELL_CLASSES` (`dashboardGrid.ts`),
  `YEAR_GRID_CLASSES`, `HABITS_DAY_GRID_CLASSES`, `FORM_GRID_CLASSES`,
  `FORM_COLUMN_CLASSES`, `FORM_SPAN_CLASSES`, `FORM_SAVE_WIDE_CLASSES`,
  `FORM_EYEBROW_CLASSES`, `TWO_COLUMN_CLASSES` and `NARROW_PAGE_CLASSES`
  (`gridClasses.ts`). A skeleton that types its own copy is a BLOCKER, and
  so is a long form, a two-column settings page or a short page that types
  its own copy of the form grid, the two-column grid or the 40rem cap
  (mission-54). `FORM_GRID_CLASSES` and `TWO_COLUMN_CLASSES` differ only by
  the row gap and change together. `FORM_SAVE_WIDE_CLASSES` also dresses
  the buttons that stand under Save on a form (`HabitEditActions`, decision
  284). A component that picks its layout by measuring (rule 2) has no
  container-variant string to share, so its skeleton may type the matching
  `@min-[…]:` grid, with a comment naming the component and the
  `COLUMN_MIN_WIDTH_PX` entry it mirrors (`settings/feedback/loading.tsx`,
  mission-54).
  The wordmark header has an empty slot, `WORDMARK_HEADER_ACTIONS_ID`
  (`src/lib/appChrome.ts`), at its right end; a page whose state owns a
  header button portals the button into it (the dashboard's Customize,
  decision 221). It is the same shape as `SCHEDULE_TITLE_SLOT_ID` in
  `CalendarHeader.tsx`, but the id lives in `src/lib/` because both the
  chrome and the page import it. The page list and the order the pages go wide in
  are in `.avengers/plans/ipad-landscape-v1.md`.
- **A measured dimension of app chrome** that two or more surfaces position
  against **has one home in `src/lib/`**, and the markup that produces it
  carries a comment naming its dependents. A **runtime measurement** is an
  equal-standing alternative for any one surface; **a second hardcoded copy
  is not.** **Closed in mission-23:** the header now exists only on `/`
  and `/login`, and the dimension pages position against is the floating
  hamburger's row, `HAMBURGER_ROW_HEIGHT_PX` (plus `useHamburgerRowHeight`) in
  `src/lib/appChrome.ts`, which lists its dependents. A component that
  reads `useHamburgerRowHeight` to position a surface is a dependent and
  joins that comment in the same change (mission-54, A-L6-12). Mission 25 adds
  `NAV_RAIL_WIDTH_PX` and `NAV_SIDEBAR_WIDTH_PX` there, feeding the
  `--app-nav-width` CSS variable that the fixed bars use as their left edge.
  `SCHEDULE_HEADER_BAR_HEIGHT_PX` and `SCHEDULE_TITLE_SLOT_ID` stay in
  `CalendarHeader.tsx`. Mission 44 adds `WORDMARK_HEADER_ACTIONS_ID` (the
  wordmark header's right-end slot) to `src/lib/appChrome.ts`. (Added 2026-09-05, mission-16; Bryce approved.) (Story: docs/history/structure-rationale.md, "Chrome dimension rule: the 73px header story".)
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
  not a pattern to cite**.
  (Added 2026-09-04, mission-14, replacing a failed rule — see below.) (Story: docs/history/structure-rationale.md, "Local-date string conversions: why the distinction is load-bearing".)
- `src/lib/mealPlanDates.ts` also owns **month and weekday names — and the
  names are exported.** It already holds `MONTH_NAMES` (short) and
  `FULL_MONTH_NAMES` (long); both were **unexported**, which is the whole
  reason there are now **five** definitions of how to spell a month.
  `calendarViewConfig.ts` (mission-17), `MonthChips.tsx` (mission-18/C3) and
  `YearView.tsx` (mission-18/C4) each wrote a local `Intl.DateTimeFormat`, and
  **each documented in-file that it did so because the canonical array was
  off-boundary or unimportable** — *a boundary satisfied by copying*, which
  the trip-condition rule below already names as instructing rather than
  restraining. (Story: docs/history/structure-rationale.md, "Month and weekday names: the five definitions".) Export the two arrays (or one
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
  exists to prevent — so it does not restrain, it *instructs*. Count what exists, not what points
  at it. (Added 2026-09-04, mission-14; Bryce approved.) (Story: docs/history/structure-rationale.md, "Trip conditions: the parseLocalDateString story".)

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
  cleanup. **The clause still binds for any future vocabulary
  widened ahead of its consumers** — `ASSIGNABLE_ROLES` below is the open one.)
  (Added 2026-09-03, mission-11, on Captain's ruling.) (Story: docs/history/structure-rationale.md, "Reachability gate: the closed instances".)
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
  (Added 2026-09-06, mission-18, on Captain's ruling; Bryce approved.) (Story: docs/history/structure-rationale.md, "Reachability flip: the BUILT_VIEWS instance".)
- **Google calendar link (mission-55).** `src/lib/calendarSyncVocabulary.ts`
  (no imports, beside `constants.ts` under the `navMode.ts` precedent) is the
  only home of `SYNC_DIRECTIONS`, `ACCOUNT_STATUSES`, their labels, hints and
  repairers, the Synced calendars page's words and `linkErrorMessage`, the
  only wording for a callback `?error=` code. `src/lib/tokenCryptoCore.ts` is
  pure, with the key passed in, and `src/lib/tokenCrypto.ts` (`server-only`)
  is the only reader of `TOKEN_ENCRYPTION_KEY`; nothing else encrypts or
  decrypts a stored Google token. In `src/lib/google/`, `oauth.ts`
  (`server-only`, no auth) is the only reader of `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` and the only caller of Google's auth endpoints;
  `calendarApi.ts` (`server-only`, no auth) is the only caller of the
  Calendar API; `oauthState.ts`, `idToken.ts`, `redirectUri.ts` and
  `scopes.ts` are pure. `redirectUri.ts` is the only builder of the redirect
  URI, because Google compares it letter by letter and the start and return
  must match; a second copy is a BLOCKER. `src/lib/linkedCalendarWrites.ts`
  (`server-only`, no auth, no `revalidatePath`) is the domain write module
  and the only writer of `LinkedAccount` and `LinkedCalendar`; its callers
  are `actions/linkedCalendars.ts` and the callback route, each carrying its
  own gate. `src/lib/linkedCalendarsRead.ts` (`server-only`, no auth) is the
  only reader of both tables for pages, actions and routes;
  `loadSyncedCalendarsPage` never selects `encryptedRefreshToken`, and
  `loadRefreshToken` is the one read that decrypts. A second reader or writer
  is a BLOCKER (scoped `prisma/` scripts are outside this rule).
  **Dependency direction:** `src/lib/google/` imports only its own files and
  node built-ins, never `db`, `tokenCrypto.ts` or a `*Read` or `*Writes`
  module; a token reaches it as an argument. `src/lib/google/*.test.ts` is in
  `package.json`'s test script and both CI timezone steps.
  (Added 2026-11-08, mission-55, on Captain's ruling; Bryce approved.)

## File-size caps

- **Both caps are measured in total lines, but a file whose non-comment
  code is well under the cap is not a split candidate — report BOTH counts
  before naming a seam.**
  A seam named on total lines alone can cost a mission for prose.
  (Added 2026-09-05, mission-16, on Captain's ruling; Bryce approved.) (Story: docs/history/structure-rationale.md, "Both caps: the two mission-16 measurements".)
- **The caps govern source files, not documents.** They apply to hand-written
  code under `src/`, `prisma/` (the schema stays exempt) and repo tooling
  scripts. Markdown (`STRUCTURE.md`, `DESIGN.md`, `README.md`, `.avengers/`,
  `docs/`) is outside them: a code-line count of prose measures nothing.
  `CLAUDE.md` keeps the 250-line cap in its own header because it loads on
  every turn. This file's growth is a trend to watch,
  never a BLOCKER. Its provenance stories (instances, corrections, why a
  rule exists) live in `docs/history/structure-rationale.md` under the
  same section and rule names; a rule here keeps its binding text and a
  one-line pointer, and a new rule's story goes straight to that file.
  The pass is due again 200 lines above the count recorded here: 1,676
  before the 2026-11-08 pass (mission-54), 1,583 after. (Added 2026-11-04,
  mission-27, on Captain's ruling; Bryce approved. Reworded 2026-11-08,
  mission-54, Bryce approved.) (Story: docs/history/structure-rationale.md, "Housekeeping note".)
- **Soft cap: 350 lines** — a NOTE and a split candidate. (Story: docs/history/structure-rationale.md, "Soft cap: the groceries.ts split".)
  Calendar trend (mission-46, A-L2-4): `ScheduleView.tsx` 578 total /
  about 361 code (89% of the hard cap; the next Schedule feature extracts
  the two-panel wrapper), `CalendarViews.tsx` 502, `MonthCell.tsx` 367.
  Kitchen trend (mission-52, A-L4-7): `PantryList.tsx` 376 total / about
  300 code (over the soft cap; the next Inventory change extracts the
  search and location chips row), `MealPlanList.tsx` 360 / about 310 code
  (was 281; the next Meal Plan feature moves the wide branch of
  `renderList` into its own component), `RecipeList.tsx` 346 / about 250
  code (was 322 before the rail moved to `RecipeLetterRail.tsx`).
  Forms trend (mission-54, A-L6-13): `GoalForm.tsx` 349 total / about 308
  code (was 334; the next goal field moves the Track a number block into
  its own component), `HabitForm.tsx` 329 / about 281 code (was 350; the
  Edit actions moved to `HabitEditActions.tsx`, now 53), `FeedbackList.tsx`
  119 (holds both layouts; no action).
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
  (Story: docs/history/structure-rationale.md, "Test files cap: how the concern-split clause was corrected".)
  **When the natural home is already at the cap, a small number of tests may
  be adopted by a sibling module's test file, with a header comment naming
  the module they cover and why they live there. This is a debt marker, not
  a pattern: it means the crowded test file is a split candidate, and the
  split is the real fix.** (Added 2026-09-02, mission 8, on Captain's
  ruling; adoption clause added 2026-09-02, mission 9, on Captain's proposed
  wording, approved by Bryce.)

  Live instances of the adoption clause — keep this list short, and empty it
  by splitting rather than by growing it:
  - (none) (Story: docs/history/structure-rationale.md, "Adoption clause: the emptied instance list".)

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
  overclaiming-comment failure this repo tracks. (Story: docs/history/structure-rationale.md, "Dormant exports: periodWindowEdges".)
- **Built-ahead engines.** When a Bryce-approved multi-PR plan builds a
  pure engine ahead of its screens, its exports may stay dormant until the PR
  the plan names. Each one carries "Dormant until PR X (mission N): <its
  consumer>", and the two-mission clock above starts at mission N, not at
  the mission that wrote it. If mission N ships without calling it, the
  normal rule applies from then on. (Approved by Bryce
  2026-11-05, mission-30, Captain's A7.) (Story: docs/history/structure-rationale.md, "Built-ahead engines: the first instance".)

## Naming

- Components: `PascalCase.tsx`, flat in `src/components/`.
- **A component's `className` prop is only for the caller's spacing and
  placement.** The component keeps its own layout classes (`flex`,
  `items-center`, its own gap) and applies
  `className={\`<its layout> ${className}\`}`; the prop's default holds only
  the spacing or alignment the old single caller used (`mb-4`,
  `mb-6 justify-around`). A caller places a component without restating
  its layout, so the component can change its insides without breaking
  callers. (Mission-51, A-L5-9. Instances: `HabitFilterChips`,
  `DaySectionHeader`, `RecipeActionCircles`.)
- Actions and lib: `camelCase.ts`; action exports are verbs
  (`createRecipe`, `putAway…`).
- Routes follow Next App Router conventions; route groups like `(app)` are
  invisible in URLs.

- **A component file's name must name something the file still exports.**
  Naming a family of exports is fine (`Skeleton.tsx`); naming a **deleted**
  export is not — a `grep` for the filename must not come up empty. Rename in
  the mission that deletes the last matching export, or in the next mission
  that touches the file. (Added 2026-09-03, mission-11.) (Story: docs/history/structure-rationale.md, "Component file name: the first and last instances".)

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
  (Story: docs/history/structure-rationale.md, "Migrations additive only: why CT1 needed an exception".) Such a migration must
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
  a terminal transcript. (Story: docs/history/structure-rationale.md, "Secrets: the FAMILY_PASSWORD correction".) Rotating the **dev**
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
  cheap-swap design anticipated. (Story: docs/history/structure-rationale.md, "Per-person accounts: the retired-architecture correction".)
