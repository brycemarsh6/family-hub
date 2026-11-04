# Mission 27: Plans & Goals PR 1 (goals, plans, This week)

**Project:** family-hub (Marshee)
**Status:** CONTRACTED
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
  push` are forbidden. **The one sanctioned schema command for this
  mission is `npx prisma migrate dev --name add_goals`, once, in C2, with
  Bryce's approval of the plan standing as permission.** Then
  `npx prisma generate`.
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
- **Status:** DISPATCHED (2026-11-04, against `4b76a6d`; preflight 0 hard failures)
- **Boundaries:** may touch: new `src/lib/goalVocabulary.ts`,
  new `src/lib/goals.ts`, new `src/lib/goals.test.ts`,
  `src/lib/householdDate.ts`, `src/lib/householdDate.test.ts` ·
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
      habits only: sum of `min(count, target)` and sum of `target`.
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
- **Status:** PENDING (depends on C1)
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
    `planLogs PlanLog[]`). Then `npx prisma migrate dev --name add_goals`
    (the one sanctioned run; confirm `DATABASE_URL`'s host is the Neon dev
    endpoint first by printing only the host, never the string), then
    `npx prisma generate`. Paste the migration SQL in the report.
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
- **Verification:** `npx prisma migrate status` reports the schema is up to
  date; `npx tsc --noEmit` clean; `npx eslint src/app/actions src/lib/goalsRead.ts` clean;
  `npm test` unchanged count; migration SQL contains only CREATE TABLE /
  CREATE INDEX / ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY.
- **Evidence required:** the host of `DATABASE_URL` only; the migration
  SQL; command tails; `wc -l` of the three new TS files; `git status --short`.
- **Done criteria:** Fury reads the SQL and greps both action files for
  `visibility ===` / `ownerId ===` (must be zero: policy comes from
  `@/lib/goals`).
- **Report:** —

### C3 — This week and Goals list screens, the page, the four new vocabulary components
- **Status:** PENDING (depends on C2)
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
- **Status:** PENDING (depends on C3)
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
- **Status:** PENDING (depends on C4)
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

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | — | — | — |
| 1 | Strange | — | — | — |
| 1 | Captain | — | — | — |

## Delivery

- PR: —
- Shipped check (`git log origin/main..HEAD`): —
- Deliberate leftovers: see "Deferred on purpose" in the direction file.
