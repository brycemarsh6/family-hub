# Mission 27: Plans & Goals PR 1 (goals, plans, This week)

**Project:** family-hub (Marshee)
**Status:** DELIVERED (all gates PASS; not pushed, waiting on Bryce)
**Started:** 2026-11-04 · **Updated:** 2026-11-04
**Branch:** `claude/plans-goals-p1` from `origin/main` at `4b76a6d`
**Direction:** `.avengers/plans/plans-goals-v1.md` (read first)
**Approved plan (Bryce, 2026-11-04):** `~/.claude/plans/pasted-content-id-b382-okay-cool-reflective-hummingbird.md`

## Brief

- **Goal:** replace the `/plans` "Coming soon" stub with the first working
  Plans & Goals: goals (result, life area, target date, Mine or Together,
  optional private, optional number), plan items under each goal (habit /
  step / reminder), a This week screen where a habit is logged with one
  tap, a Goals list grouped by life area, and a goal detail page with
  check-ins. Design: the approved canvas, screens 1 to 4.
- **Done means:** on the dev branch, a signed-in parent can create a goal,
  add a 3x-a-week habit, tap it three times on This week and see the button
  fill; a private goal is invisible to the other login and to a device
  login; the Gauntlet is green including the UTC test run; Vision, Strange
  and Captain PASS.
- **Out of scope:** Vision tab, prompts and idea chips (PR 2); dashboard
  tile, Sunday recap, "Show in Routines" switch, check-in history (PR 3);
  habit start/end dates; assigning a goal to someone else; photos; voice.

## Danger register

- Local dev runs against the Neon `dev` branch. Production's connection
  string lives only in Vercel. If `DATABASE_URL` is not the dev endpoint,
  stop.
- `npm run db:seed`, `npm run db:reset`, `prisma migrate reset`, `prisma db
  push` and `prisma migrate dev` are forbidden (missions 24 and 25
  method). **Stark never touches the database.** Stark writes the
  migration SQL from a schema-to-schema `prisma migrate diff` (old schema
  from `git show origin/main:prisma/schema.prisma`) and runs
  `npx prisma generate`. **Fury** confirms the dev host (`ep-hidden-pine`,
  verified 2026-11-04 via `.env`, host only), reviews the SQL, and applies
  it with `npx prisma migrate deploy`. Bryce's approval of the plan
  (which named a migration against the dev branch) stands as permission.
- Migrations are additive only. The SQL is reviewed before commit: CREATE
  TABLE, CREATE INDEX, ADD CONSTRAINT only.
- Never write a clean or reset script for the `User` table. Never print
  `.env`.
- Stage by explicit path, never `git add -A` / `git add .`. `git show
  --stat HEAD` after every commit.
- Direct pushes to `main` are blocked. Branch → PR → Gauntlet → merge.
  Fury pushes only when Bryce says so.
- No Prisma enums. `package.json`'s test glob is hand-listed (new lib files
  under `src/lib/*.test.ts` are already covered; no new directories).
- Test values only in the dev DB; the dev branch holds real family data,
  treat it as private.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always).
- Strange: every screen is new and user-visible.
- Captain: three new tables, ~15 new files, a new vocabulary module, a
  component extracted from another.
- Banner: not assembled; the approved plan carries the file:line facts.
- All gates on Opus 5.5 (Bryce, 2026-11-04: "Keep all gates to opus 5.5").
  `~/.claude/agents/vision.md` still says `fable`, so Fury passes
  `model: opus` on every Vision dispatch rather than editing the agent file
  mid-session (agent files are read once at session start).

## Structure decisions Fury made while contracting

- The goal vocabulary goes in a new `src/lib/goalVocabulary.ts`, not
  `constants.ts`: `constants.ts` is at 346 lines, four more lists would put
  it over the 350 soft cap. Precedent: `navMode.ts` owns `NAV_MODES`.
- Owner is selected as `{ id, displayName, avatarColor }` (the roster shape
  `calendar/new/task/page.tsx` uses), not `PERSON_SELECT`, which is the
  admin projection and carries `passwordHash`.
- "Household today" on the server is `householdToday(new Date())` from
  `src/lib/assistant/today.ts` (the existing wrapper). Not a second
  definition.
- `day` on `PlanLog` is a UTC-midnight `DateTime` (the `Task.dueDate`
  convention), built with `utcMidnightInstant`.

## Fury's pre-dispatch checklist

See the template; applied per contract below. Preflight command:
`node ~/.claude/skills/avengers/preflight.mjs .avengers/missions/mission-27-plans-goals-p1.md <Cn>`

## Contracts

### C1 — Goal vocabulary, household week helpers, and the pure goals logic, with tests
- **Status:** DONE (Stark, 2 passes; commit `65ae1eb`). 466 → 500 tests,
  UTC run green, tsc and eslint clean. `goals.ts` 346 lines (under the soft
  cap; 300 target missed, accepted). Fury amended `weekSummary` to weekly
  habits only on Stark's observation and split the tests into
  `goals.test.ts` + `goalsProgress.test.ts`. Stark's judgment calls (error
  strings, `$` truncation to one decimal, numbers must be real numbers not
  strings) accepted and recorded in its report.
- **Boundaries:** may touch: new `src/lib/goalVocabulary.ts`,
  new `src/lib/goals.ts`, new `src/lib/goals.test.ts`,
  new `src/lib/goalsProgress.test.ts` (added 2026-11-04 so the 422-line
  test file can split by concern), `src/lib/householdDate.ts`,
  `src/lib/householdDate.test.ts` ·
  must not touch: `src/lib/constants.ts`, `prisma/`, `src/app/`,
  `src/components/`, `package.json`, anything else.
- **Spec:**
  - `goalVocabulary.ts` (no React, no db; lucide icon component refs are
    fine, same as `nav.ts`):
    - `LIFE_AREAS = [{ key: "spiritual", label: "Spiritual", short: "Spiritual", icon: Church }, { key: "health", label: "Health & Wellness", short: "Health", icon: HeartPulse }, { key: "growth", label: "Personal Growth", short: "Growth", icon: Sprout }, { key: "financial", label: "Financial", short: "Financial", icon: PiggyBank }, { key: "relationships", label: "Relationships & Connections", short: "Relationships", icon: HeartHandshake }] as const`;
      `LifeArea` (the key union); `toLifeArea(raw: unknown): LifeArea | null`;
      `lifeAreaInfo(key)`.
    - `PLAN_KINDS = ["habit", "step", "reminder"] as const`, `PlanKind`,
      `toPlanKind`, `PLAN_KIND_LABELS: Record<PlanKind, { label, hint }>` =
      Habit / "repeats", Step / "do it once", Reminder / "just keep in mind".
    - `HABIT_PERIODS = ["day", "week", "month"] as const`, `HabitPeriod`,
      `toHabitPeriod`.
    - `GOAL_VISIBILITIES = ["shared", "private"] as const`, `GoalVisibility`,
      `toGoalVisibility` (default `"shared"`).
    - `GOAL_OWNERSHIPS = ["mine", "together"] as const`, `GoalOwnership`.
  - `householdDate.ts`: add `startOfWeek(date: CalendarDate): CalendarDate`
    (Sunday, via `dayOfWeek` + `addCalendarDays`) and
    `startOfMonth(date): CalendarDate`. Tests: Sunday unchanged, Saturday
    → previous Sunday, Jan 1 2027 (Friday) → Dec 27 2026, month start.
  - `goals.ts` (pure, no db, no React, target ≤ 300 lines):
    - Types. `Viewer = { userId: string; isDevice: boolean }`.
      `GoalRow = { id, title, area: LifeArea, why: string | null, targetDate: Date, ownerId: string | null, owner: { id, displayName, avatarColor } | null, visibility: GoalVisibility, measureUnit: string | null, startValue: number | null, targetValue: number | null, currentValue: number | null, checkedInAt: Date | null, completedAt: Date | null, createdAt: Date }`.
      `PlanItemRow = { id, goalId, title, kind: PlanKind, timesPerPeriod: number | null, period: HabitPeriod | null, doneAt: Date | null, sortOrder: number }`.
      `PlanLogRow = { id, planItemId, day: Date, createdAt: Date }`.
      `PlanItemView = PlanItemRow & { count: number; target: number; windowLabel: "this week" | "this month" | null; done: boolean }`.
      `GoalView = GoalRow & { items: PlanItemView[]; progress: number; pace: PaceStatus; canEdit: boolean; canLog: boolean }`.
      `PlansPageData = { today: CalendarDate; weekStart: CalendarDate; goals: GoalView[] }`.
    - Policy: `canSee(goal, viewer)` (private → owner only; `ownerId` null
      + private → false); `canEdit(goal, viewer)` (device → false; together
      → true; mine → owner); `canLog(goal, viewer)` (together → true, device
      included; mine → owner).
    - `validateGoalInput(raw: unknown, today: CalendarDate): { ok: GoalInput } | { error: string }`.
      `GoalInput = { title, area, why: string | null, targetDate: CalendarDate, ownership: GoalOwnership, visibility, measure: { unit, start, target } | null }`.
      Rules: title trimmed 1..120; area via `toLifeArea`; ownership one of
      `GOAL_OWNERSHIPS`; visibility `"private"` only with `"mine"`
      (otherwise error "Only a goal that's yours can be private."); why
      trimmed, ≤ 500, empty → null; targetDate strict `YYYY-MM-DD` via
      `parseDateParam`, not before `today`; measure: either absent/null or
      `{ unit: string 1..12 trimmed, start: finite, target: finite, start !== target }`.
      Error strings in plain English ("Give the goal a name.", "Pick a life
      area.", "Pick a target date that isn't in the past.", …).
    - `validatePlanItemInput(raw: unknown): { ok: PlanItemInput } | { error }`.
      `PlanItemInput = { title, kind, timesPerPeriod: number | null, period: HabitPeriod | null }`.
      Habit: integer 1..20 and a period required; step / reminder: both null.
    - `logWindow(item: PlanItemRow, today: CalendarDate): { start: CalendarDate; end: CalendarDate; target: number; label: "this week" | "this month" } | null`
      (null for non-habits). Day habit → week window, target `times × 7`;
      week → week, `times`; month → `startOfMonth`..last day of month,
      `times`. `end` inclusive.
    - `countInWindow(logs: PlanLogRow[], window, toUtcMidnight: (d: CalendarDate) => Date): number`
      (or compare via `utcMidnightInstant` directly; keep it pure).
    - `buildPlanItemView(item, logs, today): PlanItemView` (steps: `done =
      doneAt !== null`, target 1, count 0/1; reminders: target 0, done false).
    - `progressFraction(goal): number` 0..1, direction-agnostic, 0 without a
      measure. Formula: `(current − start) / (target − start)` clamped.
    - `paceStatus(goal, today): "reached" | "onPace" | "behind" | null`.
      Null without a measure. Expected = clamp(elapsed / total, 0, 1) where
      elapsed = days from `createdAt`'s Denver day to today, total = days to
      `targetDate`'s UTC-midnight day; total ≤ 0 → compare progress ≥ 1 →
      reached else behind. Behind when progress < expected − 0.10.
      `PACE_LABELS: Record<Exclude<PaceStatus, null>, string>` = "reached" →
      "reached", "onPace" → "on pace", "behind" → "a little behind pace".
    - `measureStep(start, target): number`: range / 20 rounded to the
      nearest of `[0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]`
      (ties go down). 189→165 gives 1; 0→500000 gives 25000; 0→10 gives 0.5.
    - `formatMeasure(value, unit): string`. Unit `"$"` goes in front and
      abbreviates ≥ 1000 as `$412K` / `$1.2M` (one decimal, trailing `.0`
      dropped); any other unit: `${value} ${unit}` with up to one decimal.
    - `nextStep(items): PlanItemRow | null` (first undone step by
      `sortOrder`, then `createdAt`-free tie by array order).
    - `weekSummary(goals: GoalView[]): { done: number; total: number }` over
      habits whose window is `"this week"` only (a monthly temple trip must
      not inflate "9 of 17 this week"; amended 2026-11-04 on Stark's
      observation): sum of `min(count, target)` and sum of `target`.
    - `targetDateChips(today): { label: string; date: CalendarDate }[]` =
      "End of this year" (Dec 31 of today's year; if today is Dec 31, next
      year) and "In 90 days".
    - `buildGoalView(goal, items, logs, viewer, today): GoalView`.
  - `goals.test.ts`: at least 25 cases covering every function above,
    including: private + null owner is invisible; device can't edit a
    together goal but can log it; a mine goal's owner can log, the spouse
    can't; week window for a day habit on a Saturday and a Sunday; month
    window on Jan 31 and Feb 1; 4-of-4 is done, 5 logs still reports
    count 5 but `weekSummary` caps at 4; progress for a decreasing measure
    (189→165 at 178 ≈ 0.458) and an increasing one; pace behind vs on pace
    with concrete dates; `measureStep` table; `formatMeasure` for `$412000`,
    `$1250000`, `178 lb`, `12.5 pages`; `validateGoalInput` rejects past
    date, private + together, half a measure, 121-char title; accepts a
    complete one; `validatePlanItemInput` rejects habit without period and
    step with a period.
- **Verification:** `npm test` green (report old and new totals);
  `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts` green;
  `npx tsc --noEmit` clean; `npx eslint src/lib` clean.
- **Evidence required:** the four command outputs (tail), `wc -l` of every
  touched file, `git status --short` showing only the five boundary paths.
- **Done criteria:** Fury re-runs `npm test` and sees the new count; grep
  confirms `goals.ts` imports nothing from `@/app`, `react`, or `./db`.
- **Report:** —

### C2 — Goal, PlanItem and PlanLog tables, the migration, the read module, and the two action files
- **Status:** DONE (Stark; commit `3c3b52b`). Migration
  `20261104171731_add_goals` written from a schema-to-schema diff
  (Prisma 7.9 flags are `--from-schema` / `--to-schema`), reviewed by Fury
  (3 CREATE TABLE, 4 CREATE INDEX, 5 ADD CONSTRAINT FK; nothing dropped),
  applied by Fury with `migrate deploy` on the dev host `ep-hidden-pine`:
  "All migrations have been successfully applied", `migrate status` up to
  date. Files: goalsRead 113, actions/goals 206, actions/planItems 253
  lines. Policy grep clean. Stark's extra error "Only a step can be checked
  off." accepted. Stark flagged that `updateGoal` reuses create's "not in
  the past" date rule, so an overdue goal can't be edited at all: fixed in
  F1 below.
- **Boundaries:** may touch: `prisma/schema.prisma` (exempt from the line
  caps per STRUCTURE.md; preflight flags it anyway), `prisma/migrations/`
  (one new generated folder ending in `_add_goals`),
  new `src/lib/goalsRead.ts`, new `src/app/actions/goals.ts`,
  new `src/app/actions/planItems.ts` · must not touch: `src/lib/goals.ts`,
  `src/lib/goalVocabulary.ts`, `src/components/`, `src/app/(app)/`, any
  other action file, `package.json`.
- **Spec:**
  - Schema exactly as the approved plan's "Data" section (Goal, PlanItem,
    PlanLog with the doc comments; `User` gains `goalsOwned Goal[]
    @relation("goalsOwned")`, `goalsCreated Goal[] @relation("goalsCreated")`,
    `planLogs PlanLog[]`). Then produce the migration the mission 24/25
    way, never `migrate dev`: `git show origin/main:prisma/schema.prisma >
    /tmp/old-schema.prisma` (scratch, outside the repo), then
    `npx prisma migrate diff --from-schema-datamodel /tmp/old-schema.prisma
    --to-schema-datamodel prisma/schema.prisma --script` and write the
    output to `prisma/migrations/<YYYYMMDDHHMMSS>_add_goals/migration.sql`
    (timestamp = now, UTC, later than the `add_nav_mode` folder's). Then
    `npx prisma generate`. **Do not run `migrate deploy`, `migrate dev`,
    `migrate status`, or anything that connects to the database**: Fury
    applies the migration. Paste the migration SQL in the report.
  - `goalsRead.ts`: `import "server-only"`. Exports
    `loadPlansPage(viewer: Viewer, today: CalendarDate): Promise<PlansPageData>`
    (one `findMany` of goals with `owner: { select: { id, displayName, avatarColor } }`,
    `planItems: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { logs: { where: { day: { gte: utcMidnightInstant(min(startOfWeek(today), startOfMonth(today))) } } } } }`,
    `orderBy: { targetDate: "asc" }`; maps rows with `toLifeArea` /
    `toPlanKind` / `toHabitPeriod` / `toGoalVisibility` repair, drops rows
    `canSee` rejects, builds views with `buildGoalView`) and
    `loadGoal(id, viewer, today): Promise<GoalView | null>` (null when
    missing or not visible). No `revalidatePath`, no auth: callers guard.
  - `actions/goals.ts` (`"use server"`, exports only async functions):
    `createGoal(raw: unknown): Promise<{ error?: string; id?: string }>`,
    `updateGoal(id: string, raw: unknown)`, `deleteGoal(id)`,
    `completeGoal(id)`, `uncompleteGoal(id)`,
    `checkInGoal(id, value: unknown)`; all return `{ error?: string }`.
    Guard order: `getVerifiedUser()` → "Not signed in."; `isDevice` →
    "A shared device can't change goals."; for anything but create, load
    the row and require `canSee` && `canEdit` → "You can't change that
    goal." (same message whether hidden or forbidden, so a private goal's
    existence doesn't leak). `createGoal` validates with
    `validateGoalInput(raw, householdToday(new Date())!)`, writes
    `ownerId = ownership === "mine" ? user.userId : null`, `createdById`,
    `targetDate = utcMidnightInstant(input.targetDate)`, measure fields
    (currentValue = start). `updateGoal` same validation; keeps
    `currentValue` unless the measure was added or removed (added → start;
    removed → null) and clears `checkedInAt` when removed. `checkInGoal`
    requires a measure ("This goal has no number to track."), finite number
    ("Enter a number."), writes `currentValue` + `checkedInAt: new Date()`.
    `isMissingRowError` → "That goal no longer exists."; delete treats a
    missing row as success. Private `refreshPlansViews()` →
    `revalidatePath("/plans", "layout")`.
  - `actions/planItems.ts`: `createPlanItem(goalId, raw)` → `{ error?, id? }`,
    `updatePlanItem(id, raw)`, `deletePlanItem(id)`, `logHabit(id)`,
    `undoHabitLog(id)`, `completeStep(id)`, `uncompleteStep(id)`. Create /
    update / delete: `canEdit` on the parent goal (device refused). Log /
    undo / step done / undone: `canLog` on the parent goal (device allowed
    on together goals). `logHabit`: load item + goal + logs in the current
    window, refuse non-habits ("Only a habit can be logged."), refuse when
    `count >= target` ("Already done for this week." / "…this month."),
    create `PlanLog { day: utcMidnightInstant(householdToday(new Date())!), loggedById }`.
    `undoHabitLog`: delete the newest log in the window; none → `{}`.
    `createPlanItem` sets `sortOrder` = current max + 1. Same error shapes
    and `refreshPlansViews()` as goals.ts.
  - Keep each action file ≤ 350 lines; both import policy and validation
    from `@/lib/goals`, never re-implement.
- **Verification:** `npx prisma validate` clean; `npx tsc --noEmit` clean; `npx eslint src/app/actions src/lib/goalsRead.ts` clean;
  `npm test` unchanged count; migration SQL contains only CREATE TABLE /
  CREATE INDEX / ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY.
- **Evidence required:** the host of `DATABASE_URL` only; the migration
  SQL; command tails; `wc -l` of the three new TS files; `git status --short`.
- **Done criteria:** Fury reads the SQL, re-confirms the dev host, runs
  `npx prisma migrate deploy` (applied, "up to date"), and greps both
  action files for `visibility ===` / `ownerId ===` (must be zero: policy
  comes from `@/lib/goals`).
- **Report:** —

### F1 — Editing an overdue goal must not demand a new date
- **Status:** DONE (Stark, 2 passes; commit `3de23c3`). 503 tests. Also
  fixed `goalsRead.earliestWindowStart`, which Stark found inverted
  (`calendarDaysBetween(week, month) < 0 ? week : month` returned the later
  date, so taps earlier in the month would have been missed for monthly
  habits); now `earlierDate(week, month)`, pinned by a pure test. Rule kept
  as "not before the stored date or today, whichever is earlier".
- **Boundaries:** may touch: `src/lib/goals.ts`, `src/lib/goals.test.ts`,
  `src/app/actions/goals.ts`, and (added 2026-11-04 after Stark's report)
  `src/lib/goalsRead.ts` to fix `earliestWindowStart`'s inverted
  comparison with the new `earlierDate` helper · must not touch: anything else.
- **Spec:** `validateGoalInput(raw, today, options?: { earliest?: CalendarDate })`.
  The date rule becomes "not before `options?.earliest ?? today`". `createGoal`
  passes nothing (unchanged). `updateGoal` passes
  `earliest = min(today, storedTargetDate as a CalendarDate)` where the stored
  date is read back with `calendarDateInZone(goal.targetDate, "UTC")` (it is
  UTC midnight by convention; use the existing helper, don't hand-roll).
  Effect: an overdue goal can keep its date or move it later; nobody can
  pick a *different* past date. Tests: keeping an overdue date passes with
  `earliest` set; a different past date still fails; create behaviour
  unchanged.
- **Verification:** `npm test` (≥ 502, 0 fail), `npx tsc --noEmit`,
  `npx eslint src/lib src/app/actions`.
- **Evidence required:** command tails, `wc -l src/lib/goals.ts` (must stay
  ≤ 350), `git status --short`.
- **Done criteria:** Fury reads the diff of `updateGoal`.
- **Report:** —

### C3 — This week and Goals list screens, the page, the four new vocabulary components
- **Status:** DONE (Stark; commit `b9f5daa`). 11 files, largest
  `ThisWeekList` 192 lines; tsc, eslint, build green; `/plans` routes
  compile (307 → /login unsigned). Judgment calls accepted: a Together
  goal's This week heading reads "{title} · Together" (the mock), a device
  sees every visible goal with no chips, the step checkbox and "Undo last"
  also disable when `!canLog`. **Recorded for Strange:** a step checked on
  This week disappears at once (only the next undone step shows); undo is
  on the goal detail. Fury's browser check (dev server, 375px, dark):
  `/plans` shows "Nov 1–7", the two chips and the 🎯 empty state;
  `/plans?view=goals` shows Active / Done, the empty state and the + button;
  the only console error is the pre-existing `pg` SSL-mode warning from the
  server. PASS for the empty-DB criterion; full flow after C4.
- **Boundaries:** may touch: new `src/components/PlansTabs.tsx`,
  new `src/components/ProgressBar.tsx`, new `src/components/ToggleSwitch.tsx`,
  new `src/components/LogButton.tsx`, new `src/components/PlanItemRow.tsx`,
  new `src/components/ThisWeekList.tsx`, new `src/components/GoalsList.tsx`,
  new `src/components/GoalCard.tsx`, new `src/app/(app)/plans/loading.tsx`,
  `src/app/(app)/plans/page.tsx`, `src/components/DashboardCustomizeSheet.tsx`
  (only to replace its inline switch with `ToggleSwitch`) · must not touch:
  `src/lib/`, `prisma/`, `src/app/actions/`, any other component.
- **Spec:** exactly the approved plan's "Routes" (page.tsx, loading.tsx) and
  "Components" sections for these files, with these details:
  - `PlansTabs` props `{ view: "week" | "goals" }`; links keep other params
    off (just `?view=`). `grid-cols-2` in PR 1.
  - `ThisWeekList` props `{ data: PlansPageData; viewer: Viewer }`. Filter
    chips only when `!viewer.isDevice`; default "Mine and Together" =
    goals where `ownerId === viewer.userId || ownerId === null`. Week label
    via `formatWeekRange(new Date(ws.year, ws.month - 1, ws.day))`.
    Optimistic reducer with actions `log`, `undo`, `stepDone`, `stepUndone`
    (count ±1 / done flip), each followed by the server action; on
    `result.error` show a `role="alert"` line (the reducer state resets on
    the next server render).
  - `PlanItemRow` props `{ item: PlanItemView; goalTitle: string; canLog: boolean; onLog, onUndo, onStepToggle; actions?: SwipeAction[] }`.
    Row `min-h-14`. Habit: `LogButton` (disabled when `!canLog`, shown
    muted). Step: 44px `rounded-xl border-2` button, `aria-pressed`. Reminder:
    `text-sm text-muted`, no control. Wrap in `SwipeActions` only when
    `actions` is non-empty; This week passes "Undo last" when count > 0.
  - `LogButton` props `{ done: boolean; label: string; disabled?: boolean; onClick }`,
    44px round, `aria-pressed={done}`, `aria-label` "Log {label}" / "Undo {label}".
  - `ToggleSwitch` props `{ checked: boolean; onChange(next): void; label: string; disabled?: boolean }`,
    markup lifted from `DashboardCustomizeSheet.tsx:81-103`; that sheet then
    renders `<ToggleSwitch>` with no visual change (Strange will diff it).
  - `GoalsList` props `{ data: PlansPageData; canManage: boolean }`. Chips
    Active / Done (`completedAt` null vs set). Groups in `LIFE_AREAS` order,
    heading = `short`, empty groups don't render. `FloatingAddButton` +
    `h-28` spacer only when `canManage`.
  - `GoalCard`: a `Link` to `/plans/goals/{id}`; owner pill shows "Together"
    or `owner.displayName`; `Lock` 14 when private; measure line
    `"{formatMeasure(target)} · now {formatMeasure(current)}"` or "No number
    to track"; `PACE_LABELS` text, `text-warn` only for behind; `ProgressBar`
    when measured; footer `"{items.length} plans · {done} of {total} this week"`
    (singular "plan" for 1; omit the "· … this week" part when total is 0).
  - `page.tsx`: `export const dynamic = "force-dynamic"`;
    `requireVerifiedUser`; `searchParams: Promise<{ view?: string | string[] }>`;
    `today = householdToday(new Date())!`; `loadPlansPage`; h1 "Plans &
    Goals" in the inventory page's heading classes.
  - No hover-only affordance anywhere; every control ≥ 44px.
- **Verification:** `npx tsc --noEmit`, `npx eslint .`, `npm run build`
  clean; dev server renders `/plans` and `/plans?view=goals` without console
  errors (Stark may use `curl -s -o /dev/null -w "%{http_code}"` against the
  running dev server for the status; the visual check is Strange's).
- **Evidence required:** command tails; `wc -l` of each new component; the
  diff of `DashboardCustomizeSheet.tsx` (should be a pure extraction).
- **Done criteria:** Fury opens both views in the browser with an empty DB
  and sees the empty states and working tabs.
- **Report:** —

### C4 — Goal form, goal detail, check-in and plan-item sheets, the three goal pages
- **Status:** DONE (Stark; commit `f0eff88`). 8 files, largest GoalDetail
  329 / GoalForm 304; tsc, eslint, build green. CheckInSheet composes its
  own −/+ around a typeable input (QuantityStepper's number is read-only);
  the `step` prop still landed. Stark added a "Now {value} · {pace}" line
  on the result card (Fury kept it: without it a check-in changes only
  the bar).
  **Fury's browser walk (dev server :3000, 375px, dark, signed in as
  Bryce):** new goal (Health, Mine, End of this year, why, 189 → 165 lb)
  → detail page; Add to the plan: habit "Exercise" 3×/week and step "Pick
  a lifting program"; three log taps → "Done" with filled check; tap again
  → "2 of 3"; Check in: −/+ steps by 1 lb, typed 178 → bar ≈ 46 %, "Last
  check-in Nov 4", "on pace"; This week shows "Nov 1–7 · 2 of 3 done", the
  card, the step checkbox; Goals card shows "165 lb · now 178 lb · on
  pace · 2 plans · 2 of 3 this week"; Mark done → Done pill, Active list
  empty, Done chip lists it; Reopen works; Delete goal → straight to the
  Goals empty state, **no 404 flash** (Stark's worry). Only console error:
  the pre-existing `pg` SSL warning. Test goal deleted (cascade cleaned
  items and logs).
  **Notes for the gates:** (1) the ⋯ `ActionCircle` has no accessible
  name (read_page shows `button` with the "More" label as a sibling), an
  existing-component trait; (2) `GoalCard` shows the owner's name
  ("Bryce") on the viewer's own goal where "Mine" might read better;
  (3) with only done goals, the Active list shows "No goals yet / Tap +
  to add your first one", which is not quite true; (4) the browser tool
  occasionally dropped a click while the page was still settling; the
  app's own switches flip correctly on a single `click()`.
- **Boundaries:** may touch: new `src/components/GoalForm.tsx`,
  new `src/components/GoalDetail.tsx`, new `src/components/CheckInSheet.tsx`,
  new `src/components/PlanItemSheet.tsx`,
  new `src/app/(app)/plans/goals/new/page.tsx`,
  new `src/app/(app)/plans/goals/[id]/page.tsx`,
  new `src/app/(app)/plans/goals/[id]/edit/page.tsx`,
  `src/components/QuantityStepper.tsx` (add optional `step?: number`,
  default 1, nothing else) · must not touch: `src/lib/`, `prisma/`,
  `src/app/actions/`, C3's components, `src/app/(app)/plans/page.tsx`.
- **Spec:** exactly the approved plan's "Routes" (the three `goals/` pages)
  and "Components" (GoalForm, GoalDetail, CheckInSheet, PlanItemSheet)
  sections, with these details:
  - `GoalForm` props `{ mode: "create" } | { mode: "edit"; goalId: string; initial: GoalInput-shaped values }`.
    Owner is chosen only in create mode (edit shows it read-only: "Mine" /
    "Together" text), since Mine always means the creator. "Keep private"
    `ToggleSwitch` row appears only when Mine is selected, with sublabel
    "Only you can see this goal". Target date chips from
    `targetDateChips(today)` where `today` is passed from the server page
    (never computed client-side); a `<input type="date" min={today}>`
    below. "Track a number" `ToggleSwitch` reveals unit / starting at /
    target inputs (`inputMode="decimal"`). Submit builds the raw object the
    action validates; on success `router.push("/plans/goals/" + id)`
    (create) or `router.push("/plans/goals/" + goalId)` (edit).
  - `GoalDetail` props `{ goal: GoalView; today: CalendarDate }`. "The
    result" card, "The plan" card (every item, done steps struck with ✓,
    `PlanItemRow` with swipe actions Edit → opens `PlanItemSheet` in edit
    mode, Delete → `deletePlanItem`, Undo last for habits), dashed "Add to
    the plan" button (only when `goal.canEdit`), ⋯ `ActionCircle` → the
    `ActionSheet` (Edit goal → `/plans/goals/{id}/edit`, Mark done /
    Reopen, Delete goal → `deleteGoal` then `router.replace("/plans?view=goals")`).
    Optimistic with manual revert (`TaskDetailSheet.tsx:141-169` pattern).
  - `CheckInSheet` props `{ goal: GoalView; onClose; onSaved(value) }`:
    heading "Check in", the measure target line, a row of `QuantityStepper`
    (`step={measureStep(start, target)}`, `min` = `-Infinity`-safe: pass
    `min={Number.MIN_SAFE_INTEGER}`) with the value input between the −/+
    buttons as `type="text" inputMode="decimal"`, unit after; "Save"
    disabled unless `Number.isFinite(parsed)`. Calls `checkInGoal`.
  - `PlanItemSheet` props `{ goalId; goalTitle; initial?: PlanItemView; onClose; onSaved }`.
    Kind picker as 3 `aria-pressed` buttons (LogLeftoverSheet preset
    style) with `PLAN_KIND_LABELS` label + hint. "How often" only for
    habits: `QuantityStepper min={1}` + "times a" + 3-button period strip.
    Edit mode adds a danger "Delete" (one tap). Calls `createPlanItem` /
    `updatePlanItem` / `deletePlanItem`.
  - Pages: `requireVerifiedUser`; `today = householdToday(new Date())!`;
    `new` redirects a device to `/plans`; `[id]` uses `loadGoal` or
    `notFound()`; `edit` redirects to the goal when `!goal.canEdit`.
    BackLinks: new → `/plans?view=goals` "Goals"; `[id]` → same; edit →
    `/plans/goals/{id}` with the goal title as label (truncate to 24 chars
    + "…" if longer). Meta line under the detail h1:
    `"{area short} · {Mine | Together | owner name} · by {Mon D}"`.
- **Verification:** `npx tsc --noEmit`, `npx eslint .`, `npm run build`
  clean; `wc -l` every new file ≤ 350.
- **Evidence required:** command tails; `wc -l`; the `QuantityStepper` diff.
- **Done criteria:** Fury walks the full flow in the browser (create goal
  with a number → add habit → log 3x → check in → mark done → delete).
- **Report:** —

### C5 — Records: DESIGN.md, STRUCTURE.md, CLAUDE.md
- **Status:** DONE (Stark; commit `33a5ead`; Fury reworded one DESIGN.md
  sentence to drop em dashes per Bryce's writing rule). CLAUDE.md 179
  lines. Preflight flags
  `STRUCTURE.md` at 699 lines, over the 650 hard cap it defines; Fury's
  reading is that the caps govern code and the constitution is Captain's
  to rule on, so C5 keeps its additions tight and Captain is asked.
- **Boundaries:** may touch: `DESIGN.md`, `STRUCTURE.md`, `CLAUDE.md` ·
  must not touch: any source file, `.avengers/` (Fury owns those).
- **Spec:** the approved plan's "Docs in the same PR" section. DESIGN.md
  vocabulary gains `PlansTabs`, `ProgressBar`, `ToggleSwitch`, `LogButton`
  with one line each on the job; a sentence under the quantity rule: typed
  numbers are allowed for measurements (check-ins, a goal's start and
  target), never for counts. STRUCTURE.md one-source list gains
  `goalVocabulary.ts`, the `canSee`/`canEdit`/`canLog` policy in `goals.ts`,
  `goalsRead.ts` as the only page reader of goal rows, `startOfWeek` /
  `startOfMonth` in `householdDate.ts`. CLAUDE.md: "What's built" gets a
  Plans & Goals bullet (two tabs, habits/steps/reminders, private goals);
  the drawer bullet drops "Plans & Goals" from "Coming soon"; "Current
  status" rewritten (mission 26 merged as PR #35; mission 27 on
  `claude/plans-goals-p1`; PR 2 and PR 3 queued per
  `.avengers/plans/plans-goals-v1.md`). Keep CLAUDE.md under 250 lines.
- **Verification:** `wc -l CLAUDE.md` ≤ 250; every file path named in the
  edits exists (`ls` each).
- **Evidence required:** the diff; the `ls` output.
- **Done criteria:** `node ~/.claude/skills/avengers/recordcheck.mjs` over
  the range, every REVIEW line read by Fury.
- **Report:** —

### F2 — Pass-1 fixes from Vision and Strange
- **Status:** DONE (Stark; commit `38e751f`). All 16 items; 504 tests;
  every file ≤ 350 (GoalDetail 338). Side effect accepted and recorded:
  with `toGoalVisibility` failing closed, a request with a *missing*
  `visibility` is read as private and so refused on a Together goal; the
  only client (`GoalForm`) always sends it. Copy used: "No active goals /
  Finished goals are under Done", "No finished goals yet / Goals you mark
  done show up here", "Couldn't save that. Check your connection and try
  again.", "Deleting…", " · Private".
- **Boundaries:** may touch: `src/app/actions/goals.ts`,
  `src/lib/goalVocabulary.ts`, `src/lib/goals.test.ts`,
  `src/lib/goalsRead.ts`, `src/components/GoalForm.tsx`,
  `src/components/GoalDetail.tsx`, `src/components/PlanItemSheet.tsx`,
  `src/components/QuantityStepper.tsx`, `src/components/ThisWeekList.tsx`,
  `src/components/PlansTabs.tsx`, `src/components/GoalsList.tsx`,
  `src/components/GoalCard.tsx`, `src/components/PlanItemRow.tsx`,
  `src/app/(app)/plans/page.tsx`, `src/app/(app)/plans/goals/[id]/page.tsx`
  · must not touch: `src/components/SwipeActions.tsx` (F3), anything else.
- **Spec (Vision blocker 1; Strange blockers 6 to 8; the rest are notes
  worth fixing now):**
  6. STRANGE BLOCKER. `ThisWeekList`: a step checked off here stays in
     place, struck through with the filled check, and a second tap undoes
     it. Rows per goal: habits, then steps whose `doneAt` is on or after
     the week start (rendered done), then `nextStep`, then reminders. The
     next undone step renders **below** the one just checked, never in its
     slot. (`PlanItemView` already carries `doneAt`; the week start is in
     `data.weekStart`; compare with `utcMidnightInstant(weekStart)`.)
  7. STRANGE BLOCKER. Contrast: `text-muted` → `text-muted-strong` on the
     inactive `PlansTabs` tab, the GoalForm "Only you can see this goal"
     sublabel, and the unselected period buttons in `PlanItemSheet`.
  8. STRANGE BLOCKER. `GoalsList` empty copy when `data.goals.length > 0`:
     Active → "No active goals" / "Finished goals are under Done"; Done →
     "No finished goals yet" / "Goals you mark done show up here". The
     "No goals yet" copy stays for a truly empty list. (Wording is Fury's
     pick for the gate; Bryce may change it.)
  9. `GoalCard` shows "Mine" (muted text, like the owner name) when
     `ownerId === viewerId`; pass `viewerId` from `page.tsx` through
     `GoalsList`.
  10. `[id]/page.tsx` meta line appends " · Private" with a `Lock` 14 icon
      when the goal is private.
  11. `goalsRead.loadPlansPage`: `orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }]`.
  12. `GoalForm` edit success uses `router.replace`, not `push`.
  13. `PlanItemSheet` delete shows "Deleting…" on the Delete button, not
      "Saving…" on Save (track which action is pending).
  14. `PlanItemRow`'s empty step box uses `border-muted` (the canvas drew
      an accent-strength border; `border-line` measures 1.4:1).
  15. `ThisWeekList` and `GoalDetail` `run()`: wrap the awaited action in
      try/catch; a thrown error (network down) sets the `role="alert"`
      line "Couldn't save that. Check your connection and try again."
      instead of reaching the error boundary.
  16. `GoalDetail`: "No plan yet. What will you do to get there?" only
      when `canEdit`; otherwise "No plan yet."
  1. BLOCKER. `updateGoal`: after `loadEditable`, derive
     `ownership = goal.ownerId === null ? "together" : "mine"` from the
     stored row, validate `{ ...raw, ownership }` (when `raw` is an
     object), and remove `ownerId` from the update data. A Together goal
     sent with `visibility: "private"` is refused by the existing
     validation message.
  2. `toGoalVisibility` fails closed: unknown → `"private"`. Update its
     test(s) in `goals.test.ts` (goalVocabulary has no test file of its
     own; the vocabulary tests live in `goals.test.ts`).
  3. `GoalForm`: the "Keep private" row shows only when ownership is
     "mine" **and** (`mode === "create"` or `initial.ownership === "mine"`).
  4. `GoalDetail`: the "Undo last" swipe action is gated by `canLog`, like
     This week.
  5. `QuantityStepper` gains optional `max?: number` (plus button disabled
     at `value >= max`); `PlanItemSheet` passes `max={20}`.
- **Verification:** `npm test` (≥ 503, 0 fail), `npx tsc --noEmit`,
  `npx eslint .`, `npm run build`; `git diff --stat` limited to the
  boundary files; every touched file ≤ 350 lines.
- **Evidence required:** command tails, the `updateGoal` diff, `wc -l`.
- **Done criteria:** Vision pass 2 (actions/goals.ts, the reducers,
  gauntlet) and Strange pass 2 (the three blockers, measured).
- **Report:** —

### F3 — SwipeActions: the eaten tap and the red fringe
- **Status:** DONE (Stark; commit `23b1faa`). One reset line in the
  capture-phase pointer-down; the strip hides with a 180 ms delay matching
  the snap-shut animation (Stark's addition, kept, so the strip doesn't
  vanish while the row is still sliding back). Device check still owed by
  Bryce; Strange pass 2 reproduces by touch events.
- **Boundaries:** may touch: `src/components/SwipeActions.tsx` · must not
  touch: anything else.
- **Spec:**
  1. The eaten tap (CLAUDE.md "Waiting on Bryce" item; Strange found the
     mechanism): `swallowNextClick` is set by a swipe, but a touch that
     moved produces no click, so the flag survives until the next real
     tap and swallows it. In `handleRowPointerDownCapture`, reset
     `swallowNextClick.current = false` first and set it true only when
     the row is open (so the tap that closes an open row is still
     swallowed, and nothing else is).
  2. The red fringe: the action strip shows through `rounded-xl` corners
     at row dividers in divided lists. Render the strip with `opacity-0`
     while `offset === 0 && !open`, plus `focus-within:opacity-100` so
     keyboard users still reach the actions. No other visual change.
  Keep the file's comments current; this component is shared by
  Inventory, Shopping and the calendar, so change nothing else.
- **Verification:** `npx tsc --noEmit`, `npx eslint .`, `npm run build`;
  `git diff --stat` shows only this file.
- **Evidence required:** the diff; a one-paragraph explanation of why the
  closing tap on an open row is still swallowed.
- **Done criteria:** Strange pass 2 reproduces "swipe, tap Undo last, tap
  Log" and the second tap now registers; Fury re-checks Shopping rows.
- **Report:** —

### F4 — Pass-2 fixes: Vision's week boundary, Captain's four structure blockers, the goals.ts split
- **Status:** DONE (Stark; commit `beb9daf`). 514 tests. `goals.ts` 218,
  `goalsProgress.ts` 187 (owns the row/view types and `GoalMeasure`;
  `goals.ts` re-exports the types), `planItemChanges.ts` 39. Policy grep
  returns only `goals.ts`. `weekSummary` now takes `{ items }[]` and
  `progressFraction`/`paceStatus` take `GoalMeasure` (a `GoalRow` still
  fits). `QuantityStepper.step` removed, `max` kept. Four may-touch files
  needed no change.
- **Boundaries:** may touch: `src/lib/goals.ts`, new `src/lib/goalsProgress.ts`,
  new `src/lib/planItemChanges.ts`, new `src/lib/planItemChanges.test.ts`,
  `src/lib/goalVocabulary.ts`, new `src/lib/goalVocabulary.test.ts`,
  `src/lib/goals.test.ts`, `src/lib/goalsProgress.test.ts`,
  `src/lib/householdDate.ts`, `src/lib/householdDate.test.ts`,
  `src/lib/mealPlanDates.ts` (export `MONTH_NAMES` only),
  `src/lib/goalsRead.ts`, `src/app/actions/goals.ts`,
  `src/app/actions/planItems.ts`, `src/components/ThisWeekList.tsx`,
  `src/components/GoalDetail.tsx`, `src/components/GoalCard.tsx`,
  `src/components/GoalsList.tsx`, `src/components/GoalForm.tsx`,
  `src/components/CheckInSheet.tsx`, `src/components/PlanItemSheet.tsx`,
  `src/components/QuantityStepper.tsx`,
  `src/app/(app)/plans/page.tsx`, `src/app/(app)/plans/goals/[id]/page.tsx`,
  `src/app/(app)/plans/goals/[id]/edit/page.tsx`, `src/app/(app)/plans/goals/new/page.tsx`
  · must not touch: `SwipeActions.tsx`, `DESIGN.md`, `STRUCTURE.md`,
  `CLAUDE.md` (F5), anything else.
- **Spec:**
  1. VISION BLOCKER. `ThisWeekList`: the "done this week" cut-off is
     `zoneMidnightInstant(ws, HOUSEHOLD_TIME_ZONE)`, not UTC midnight
     (`doneAt` is a real instant). Also list done steps by `doneAt`
     ascending so the one just tapped sits directly above the next step.
  2. CAPTAIN BLOCKER 1. Pure helpers in `goals.ts`, tested:
     `goalOwnership(goal): GoalOwnership` (no owner → "together"),
     `whoseGoal(goal, viewerId): "mine" | "together" | "theirs"`,
     `isPrivateGoal(goal): boolean`. Use them everywhere an action, page
     or component compares `ownerId` / `visibility`: `actions/goals.ts`
     (`updateGoal`), `edit/page.tsx`, `[id]/page.tsx`, `GoalCard`,
     `ThisWeekList` (the Mine-and-Together filter becomes
     `whoseGoal(goal, viewer.userId) !== "theirs"`), and the This week
     heading. After this, `grep -rn "ownerId ===\|visibility ===" src/`
     returns only `goals.ts`.
  3. CAPTAIN BLOCKER 2. `goalVocabulary.ts` gains
     `GOAL_OWNERSHIP_LABELS: Record<GoalOwnership, string>` = Mine /
     Together. `GoalForm` maps `GOAL_OWNERSHIPS` and uses the labels;
     every hand-typed "Mine" / "Together" label in the touched files uses
     them too.
  4. CAPTAIN BLOCKER 3. `mealPlanDates.ts` exports `MONTH_NAMES` (no other
     change there). `householdDate.ts` gains
     `formatShortCalendarDate(date: CalendarDate): string` ("Nov 3"), tested,
     importing `MONTH_NAMES` from `./mealPlanDates`. `GoalDetail` and
     `[id]/page.tsx` use it and drop their `Intl` formatters. The meta
     line's "by Dec 31" uses `calendarDateInZone(targetDate, "UTC")` then
     the helper.
  5. CAPTAIN BLOCKER 4. Split by module: move windows, counts, progress,
     pace, `PACE_LABELS`, `measureStep`, `formatMeasure`, `weekSummary`,
     `targetDateChips` and `buildPlanItemView` into new
     `src/lib/goalsProgress.ts`; `goals.ts` keeps types, policy, validation,
     `nextStep`, `buildGoalView` (importing from `./goalsProgress`; no
     cycle: `goalsProgress` imports only `./goalVocabulary`,
     `./householdDate`, `./constants` and the row types from `./goals`?
     No: to avoid a cycle, move the row types `PlanItemRow`, `PlanLogRow`,
     `PlanItemView`, `LogWindow`, `PaceStatus` and the measure part of
     `GoalRow` into `goalsProgress.ts` and re-export them from `goals.ts`
     so no consumer import changes except where it wants to). Every
     consumer compiles. `goalsProgress.test.ts` covers `goalsProgress.ts`;
     `goals.test.ts` covers `goals.ts`; vocabulary tests move to new
     `goalVocabulary.test.ts`; each header names its module and its
     siblings by filename. Both lib files well under 350.
  6. Shared reducer (Captain note d): new pure `src/lib/planItemChanges.ts`
     exporting the `PlanItemChange` type and
     `applyPlanItemChange(items: PlanItemView[], change): PlanItemView[]`,
     with the rule "undo keeps `done` true while `count` stays ≥ target"
     (Vision's pass-1 note fixed on the way), tested in
     `planItemChanges.test.ts`. `ThisWeekList` and `GoalDetail` use it.
  7. Shared parser (Captain note b): `parseTypedNumber(text: string): number | null`
     in `goalsProgress.ts`, tested; `GoalForm` and `CheckInSheet` use it.
  8. Export the form limits from `goals.ts` (`GOAL_TITLE_MAX = 120`,
     `GOAL_WHY_MAX = 500`, `MEASURE_UNIT_MAX = 12`, `HABIT_TIMES_MAX = 20`)
     and use them in `GoalForm` and `PlanItemSheet`.
  9. `QuantityStepper`: remove the unused `step` prop (keep `max`); also
     clamp `value + step` to `max` is moot once `step` is gone. Keep
     `max` and its `disabled` state.
  10. `isMissingParentError` moves from `actions/planItems.ts` to
      `src/lib/prismaErrors.ts`? No: `prismaErrors.ts` is outside this
      boundary; leave it, recorded for later.
- **Verification:** `npm test` (≥ 510, 0 fail), UTC run, `npx tsc --noEmit`,
  `npx eslint .`, `npm run build`; `wc -l` of every touched file (all ≤
  350); `grep -rn "ownerId ===\|visibility ===" src/` → only `goals.ts`;
  `grep -rn "Intl.DateTimeFormat" src/components/GoalDetail.tsx "src/app/(app)/plans"` → none.
- **Evidence required:** command tails, both greps, `wc -l`, `git diff --stat`.
- **Done criteria:** Vision pass 3, Captain pass 2 (and Strange pass 3 only
  if pass 2 blocks or F4 changes a visible thing, which it shouldn't).
- **Report:** —

### F5 — Records after the gates
- **Status:** DONE (Stark; commit `a0e6332`). Bryce approved Captain's cap
  amendment mid-contract ("Im good with that"), so it landed here. CLAUDE.md
  181, DESIGN.md 321, STRUCTURE.md 737 lines. Noted: the amendment points at
  `docs/history/structure-rationale.md`, which the housekeeping pass will
  create; `usePageSwipe.ts:39` cites `SwipeActions.tsx:44` for a constant
  now at line 47 (source comment, out of F5's boundary).
- **Boundaries:** may touch: `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`.
- **Spec:** STRUCTURE.md: the `SwipeActions` paragraph (~312-320) records
  that F3 carried the clear and the device check is owed; the policy rule
  gains "or component"; the two C5 entries get the "(Added 2026-11-04,
  mission-27; Bryce approved)" line; the one-source list gains
  `goalsProgress.ts`, `planItemChanges.ts`, `formatShortCalendarDate`,
  `GOAL_OWNERSHIP_LABELS`, the exported form limits; Captain's cap
  amendment only if Bryce approves. CLAUDE.md: "Waiting on Bryce: eaten
  tap" becomes "fix landed in mission 27 F3, needs the sixty-second
  phone check"; drop "habit trackers" from Not built yet (or say
  "stand-alone habit trackers"). DESIGN.md: `PlansTabs` wording per
  Strange's ruling on the period strip.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | **FAIL** (`f0eff88`, opus) | 1: `updateGoal` rewrites `ownerId` from the client's `ownership` (`actions/goals.ts:117,143`), so an editor of a Together goal can take it over and make it private; also lets a Mine goal flip to Together. Fixed in F2. | 8 notes: missing vs hidden give different error texts (ids are cuids; accepted); `toGoalVisibility` fails open to "shared" (F2 makes it fail closed); `logHabit` check-then-insert not atomic (accepted at household scale); optimistic undo shows `done:false` for a moment when count stays ≥ target (accepted); detail "Undo last" gated by `canEdit` not `canLog` (F2 aligns); times stepper has no UI cap at 20 (F2 adds `max`); a goal due today reads "behind" at creation (wording question for Bryce); `SetNull` on owner if a User were ever hard-deleted (recorded). Gauntlet green, boundaries exact, migration regenerated offline and byte-equal, dates identical in 4 zones. |
| 1 | Strange | **FAIL** (`f0eff88`, opus) | 3: (a) This week: a checked step vanishes in 12 ms and the next step slides into the same spot under the thumb, with no on-screen undo (reversible-flip rule, struck-text rule); (b) `text-muted` on `surface-2` is 4.33:1 in light mode in `PlansTabs` inactive tab, `GoalForm` "Only you can see this goal", `PlanItemSheet` period buttons (rule: 4.5:1; use `text-muted-strong`); (c) "No goals yet / Tap + to add your first one" shows on Active when only done goals exist, and on Done when only active exist. All three in F2. | Hit areas, occlusion, optimistic timings (11 to 30 ms), signal truth, tokens, icons, BackLinks, sheets on iPad all measured and passing. Notes: `SwipeActions` eats the first tap after a swipe (mechanism found: `swallowNextClick` survives a touch that produced no click; this is CLAUDE.md's open "eaten tap" item) and its red strip shows through rounded corners at dividers → F3; a failed log tap hits the error boundary (also in `GroceryList`; F2 adds try/catch to the two new reducers); "Deleting…" label; "Private" marker on the detail meta line; `orderBy` tiebreak; edit uses `router.replace`; "Mine" on own `GoalCard`; empty step box border under 3:1 (`border-muted`); ⋯ button name is fine ("More" is its text). Not covered: Goals list in dark, device and spouse views (needs other logins), sideways iPad with the pinned rail. All "(gate)" rows deleted. |
| 1 | Captain | **FAIL** (`38e751f`, opus) | 4: (1) an action and two pages compare `ownerId`/`visibility` themselves (`actions/goals.ts:117`, `edit/page.tsx:26`, `[id]/page.tsx:26,35`), against the C5 rule; fix with pure helpers `goalOwnership`/`whoseGoal`/`isPrivateGoal`; (2) `GoalForm.tsx:158` redefines the ownership list; (3) `GoalDetail.tsx:62-66` and `[id]/page.tsx:22-24` are the sixth and seventh month-name formatters (rule: a sixth is a BLOCKER); fix: export `MONTH_NAMES` from `mealPlanDates.ts`, add `formatShortCalendarDate` to `householdDate.ts`; (4) test-split headers don't name `goals.ts` and the vocabulary tests sit in `goals.test.ts` instead of `goalVocabulary.test.ts`. All in F4. | Notes: `goals.ts` 349 lines, split progress/pace/measure into `goalsProgress.ts` (F4 does it); STRUCTURE.md at 708 lines is not a blocker; Captain drafted a "caps govern source files, not documents" amendment for Bryce; `householdToday` from `assistant/today` is sound for this PR, a non-null version belongs in `householdDate.ts` later; the This week filter repeats `canLog`'s logic (F4 moves it onto `whoseGoal`); shared reducer and shared number parser recommended now (F4); `toPlanItemRow` mapper and form limits duplicated (recorded); `isMissingParentError` belongs in `prismaErrors.ts` (recorded); `QuantityStepper.step` has no caller (F4 removes it); records: STRUCTURE.md SwipeActions paragraph and CLAUDE.md eaten-tap item out of date after F3, "habit trackers" contradicts the new bullet, DESIGN.md "the one segmented control" vs the period strip (Strange to rule) → F5. Placement, direction, guards, migration, naming pass. |
| 2 | Vision | **FAIL** (`38e751f`, opus) | 1 new: `ThisWeekList.tsx:107` compares `doneAt` (a real instant) with `utcMidnightInstant(weekStart)`; the week starts at Denver midnight, so a step done Saturday 7 pm Denver shows as "done this week" for the whole next week. Root cause: Fury's F2 spec text. Fix F4: `zoneMidnightInstant(ws, HOUSEHOLD_TIME_ZONE)`. Pass-1 blocker confirmed fixed (attack replayed through the real validator); F3 state machine walked and correct. | Notes: done steps listed by `sortOrder`, so out-of-order completion can put a done step under the thumb after a tap (to Strange); `QuantityStepper` `+` doesn't clamp `value + step` to `max` (no consumer affected); `PlanItemSheet` submit/delete have no try/catch (per spec); unknown stored visibility on a Together row hides it from everyone (only a direct DB write could cause it); keyboard click after a touch swipe swallowed once (pre-existing, touch-only app). Gauntlet green, boundaries exact. |
| 3 | Vision | **PASS** (`beb9daf`, opus) | 0 | Week boundary verified at MST and MDT (Sat 7 pm Denver no longer counts; 12:30 am Sunday does); the split moved every function body unchanged (sorted-line diff); 50 old test names all present among 60; reducer agrees with the server; `parseTypedNumber` behavior unchanged. Notes: a duplicated assert line and no "log on a reminder" test in `planItemChanges.test.ts`; the week cut-off is inline in `ThisWeekList` with no unit test (a pure `doneThisWeek` in `goalsProgress.ts` would pin it; recorded for PR 2); `parseTypedNumber` accepts hex and exponent forms (pre-existing). |
| 2 | Captain | **PASS** (`a0e6332`, opus) | 0 | All four pass-1 blockers closed by the quoted rules; no cycle in the split; every touched file ≤ 350; one-source entries match the code; amendment word for word. Notes, done by Fury in D1 (`f274c92`): the "Mine or Together" error text now built from `GOAL_OWNERSHIP_LABELS`; STRUCTURE.md's swipe obligation now says "verify F3's clear on a real device"; `planItemChanges.test.ts` header names its module; CLAUDE.md gate status refreshed. Recorded for later: `calendarViewConfig.ts:202` comment says `MONTH_NAMES` is unexported (now false); `usePageSwipe.ts:39` cites `SwipeActions.tsx:44` for a constant now at :47; `GoalRow` could be `GoalMeasure & {...}`; `canEdit`/`canLog` could be written via `whoseGoal`; STRUCTURE.md:257 could say `householdDate.ts` serves client code too; STRUCTURE.md is 737 lines, the housekeeping pass is due; plan-item row mapping duplicated in `goalsRead.ts` and `actions/planItems.ts`; `isMissingParentError` belongs in `prismaErrors.ts`; `householdToday` still from `assistant/today`. |
| 2 | Strange | **PASS** (`38e751f`, opus) | 0 | All three pass-1 blockers fixed and measured (step stays struck in place, second tap undoes, next step below; 4.74:1 on the three sites; the three empty-copy states). F3 by touch events: swipe-open then Undo then Log registers; short swipe then Log fires; tap on an open row closes and fires nothing; strip `opacity: 0` while closed, visible at the first move, hides only once the row has covered it (scrubbed at 170/179/181 ms). Goals list dark at 375 and 820 all ≥ 6.12:1. Shopping rows and the Customize sheet unchanged. Notes: dark-mode selected tab is darker than its track (visual only, Bryce's call); after an edit save Back needs one extra press (never reaches the form); keyboard focus brings the strip back after the same delay (pre-existing). All "(gate)" rows deleted. |

## Delivery

- **Commits on `claude/plans-goals-p1`** (from `origin/main` `4b76a6d`):
  `be5ff57` records · `65ae1eb` C1 · `3c3b52b` C2 · `3de23c3` F1 ·
  `b9f5daa` C3 · `f0eff88` C4 · `33a5ead` C5 · `23b1faa` F3 ·
  `38e751f` F2 · `beb9daf` F4 · `a0e6332` F5 · `f274c92` D1 · plus the
  final mission-file commit.
- **Gate verdicts:** Vision FAIL, FAIL, PASS (passes 1 to 3). Strange FAIL,
  PASS. Captain FAIL, PASS. Every blocker is recorded above with its fix
  commit. Budget used: 3 of 3 Vision passes, 2 of 3 Strange, 2 of 3 Captain.
- **Gauntlet on the final tree (`f274c92`, run by Fury 2026-11-04):**
  `npx tsc --noEmit` clean · `npx eslint .` clean · `npm test` 514 pass,
  0 fail · `TZ=UTC` run 514 tests, 507 pass, 0 fail, 7 skipped (the
  pre-existing DST tests that skip themselves under UTC) · `npm run build`
  "Compiled successfully", routes `/plans`, `/plans/goals/[id]`,
  `/plans/goals/[id]/edit`, `/plans/goals/new` present.
- **Migration:** `20261104171731_add_goals` applied to the Neon dev branch
  by Fury (`migrate deploy`). Production gets it from the Vercel build hook
  when the PR merges.
- **PR:** not opened yet (Bryce's call).
- **Shipped check (`git log origin/main..HEAD`):** 12 commits local, 0 pushed,
  at the time of writing. Nothing is on GitHub until Bryce says push.
- **Deliberate leftovers:** the "Deferred on purpose" list in
  `.avengers/plans/plans-goals-v1.md`; the gate NOTES above (none blocks);
  Bryce's sixty-second phone check of the swipe fix; the STRUCTURE.md
  housekeeping pass; a pure `doneThisWeek` helper with tests (Vision pass 3);
  "No plan yet." for a non-editor and the spouse/device views were not
  exercised by a gate (no second login available to the gates).
