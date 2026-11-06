# Mission: Habits & Chores PR C, streaks and the family (mission 32)

**Project:** family-hub (Marshee)
**Status:** CONTRACTED (Hill decided 94 to 105)
**Started:** 2026-11-05 · **Updated:** 2026-11-05

## Brief

- **Goal:** the "PR C, mission 32: streaks and the family" section of
  `.avengers/plans/habits-chores-build.md`, with decisions 94 to 103 (decided
  by Hill) in `.avengers/plans/habits-chores-v1.md`.
- **Done means:** on production, a person sees streaks on their Today rows
  (decision 98), "Skipped today" on skipped rows (101), a nudge card they can
  dismiss (96); tapping a row title opens `/habits/[id]` with current, best
  and total, a month calendar (tap one of the last 7 days to mark done or
  skipped, never a future day), perfect days, and for Side by side habits a
  per-person table, a weekly chart and a Nudge button (94, 97); the tablet
  lands on the family view and anyone reaches it with a "Whole family" chip
  (95); confetti fires once a day per device when everything required is done
  or skipped (76, 99). Gauntlet green; Vision, Strange and Captain PASS.
- **Out of scope:** chores chart, chore streak, vacation mode (PR D);
  dashboard tiles and plan-a-day (PR E); report and idea library (PR F).
- **Never blocks on Bryce** (Bryce, 2026-11-05). Kids have no profiles yet:
  build and gate with the adults who exist. Bryce's phone check and creating
  the kids' profiles go on "Bryce's checklist" in CLAUDE.md after merge.

## Danger register

- Local dev runs against the Neon `dev` branch. **Before any Prisma command
  that reaches a database, Fury confirms `DATABASE_URL`'s hostname starts
  `ep-hidden-pine-`** (hostname only, never print `.env`).
- Forbidden for every agent: `npm run db:seed`, `npm run db:reset`, `prisma
  migrate reset`, `prisma db push`, `prisma migrate dev`. Stark never touches
  the database. `npx prisma generate` / `validate` are fine.
- No migration is expected (the `Nudge` table exists since PR A). If one
  turns out to be needed it is additive only and Fury applies it.
- The dev branch holds real family data. Count rows, never quote them.
- **No script creates, changes or deletes `User` rows.** Kids' profiles are
  Bryce's (Settings, Manage family).
- Stage by explicit path, never `git add -A` / `git add .`; `git show --stat
  HEAD` after every commit. Merging to `main` is delegated to Fury once every
  gate passes and the Gauntlet is green (Bryce, 2026-11-05); Fury then checks
  the production deploy.
- `npm test` pins Denver; the direct `TZ=UTC` and `TZ=America/Los_Angeles`
  runs prove the other zones.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (697 at origin/main 1fb7dcb; must rise)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts`
- the same with `TZ=America/Los_Angeles`
- `npm run build`
- `node ~/.claude/skills/avengers/recordcheck.mjs` over the mission range

## Assembled

Stark; Vision (Fable, per `.claude/agents/vision.md`; this session passes
`model: "fable"` explicitly because agent files load at start); Strange and
Captain (Opus 5.5). Hill (Fable, xhigh) for every would-be Bryce decision.
Banner ran once (facts below). Budget 3 passes per gate.

## Facts the contracts hang on (Banner, 2026-11-05, at origin/main)

- Streaks: `computeStreaks(spec, logs, vacations, today)` and
  `streakAfter(spec, cached, vacations, today)` in
  `src/lib/habits/streaks.ts` (`streakAfter` is display only). Cached on
  `HabitParticipant.currentStreak/bestStreak/streakAsOf`, written only by
  `habitWrites.ts` (`recomputeStreaks`). `showStreaks` is on `VerifiedUser`
  (`src/lib/dal.ts`); no habit page reads it yet.
- Readers: `src/lib/habitsRead.ts` (205 lines: `loadTodayPage`,
  `loadHabitRoster`, `loadHabitForAction`, `loadLogStatus`,
  `loadCarriedDay`, `loadHabitsForPlan`); pure rules in
  `src/lib/habitsToday.ts` (273 lines: `buildTodayRows`, `managerItem`,
  `isTapDayAllowed`, `TAP_DAYS_BACK = 7`, lookback 14). `loadTodayPage`
  lists only habits the viewer takes part in, so the tablet's Today is empty.
- `perfectDaysInRange(from, to, entriesFor)` (`perfectDays.ts`),
  `scheduledDaysInRange(spec, from, to)` and `periodsInRange`
  (`schedule.ts`).
- Taps: `checkHabit`, `skipHabit`, `uncheckHabit`, `unskipHabit(habitId,
  forUserId?, day?)` in `src/app/actions/habitChecks.ts`; `day` is
  "YYYY-MM-DD", future refused, older than 7 days only for the carried day.
- `Nudge` model exists (habitId, fromUserId, toUserId, day, seenAt; unique
  on all four ids plus day; index on toUserId, day). No code uses it.
- Access: `canSeeHabit` (private only to participants, never the device),
  `canEditHabit`, `canLogFor` (self, device, or manager for a participant)
  in `src/lib/habits/access.ts`.
- Components: `HabitTodayList` (props rows, todayLabel, canManage),
  `HabitRow` (row, onToggle, onSkip, onUnskip), `HabitFilterChips`,
  `LogButton` (done, label, disabled, idle, skipped, onClick), `AvatarBadge`.
- No `canvas-confetti`, no chart library, no data chart anywhere. Reduced
  motion is handled in CSS only (`globals.css`). Per-device markers use
  `useSyncExternalStore` plus localStorage (`src/lib/lastStore.ts`).
- Avatar colors (`AVATAR_COLORS`, `constants.ts`) FAIL the dataviz palette
  validator as chart series colors (low chroma, deutan ΔE 3.0, teal vs blue
  ΔE 6.3 normal vision): see Q11.
- `src/app/(app)/habits/[id]/` holds only `edit/`. Sizes: habitsRead 205,
  habitsToday 273, habitChecks 115, actions/habits 296, HabitTodayList 168,
  HabitRow 118, HabitForm 351 (soft cap 350, split before adding a field).

## Contracts

Order: C1, C2, C3, C4, C5, one at a time (they share the habits folder).
The build plan's PR C section and decisions 94 to 105 bind where a contract
is silent. Mock boards (data): `Stats.dc.html`, `Family.dc.html` in
`/private/tmp/claude-501/-Users-brycemarsh-Developer-family-hub--claude-worktrees-habits-a-engine-00bccf/823148c4-c30a-4fc7-b187-45ba819246cf/scratchpad/artifact-files/f1e641d8-aa97-4e65-9258-10fb934262f4/project/`,
and `Main.dc.html` in `.../scratchpad/mock/project/`.

### C1 - The pure rules, with tests
- **Status:** DONE (Stark; Fury re-ran tsc; 733 tests in all three zones)
- **Notes for C2+:** `displayStreak`, `streakUnitOf`, `allRequiredDoneToday` and row fields `streak`, `streakLabel`, `streakUnit` in `habitsToday.ts` (now 344 lines); `buildTodayRows/Page` take `vacationsByUser`; `TodayHabitInput.participants` takes optional `currentStreak/bestStreak/streakAsOf` (C2 passes them). `habitsStats.ts`: `personTotals`, `monthCalendar`, `completionRate`, `sideBySideRows`, `weeklySeries`, `perfectDaysInMonth`, `STATS_WEEKS = 6`. `canSeeHabitStats` in `access.ts`. Words: `streakLabel`, `SKIPPED_TODAY_LABEL` in `habitVocabulary.ts`.
- **Objective:** every PR C rule that needs no database, in pure lib files
  with tests.
- **Boundaries:** may touch: new `src/lib/habitsStats.ts` and
  `src/lib/habitsStats.test.ts`, `src/lib/habitsToday.ts` and its test,
  `src/lib/habitChanges.ts` and its test (only if a row type gains fields),
  `src/lib/habits/access.ts` and its test, `src/lib/habitVocabulary.ts` and
  its test (words only) · must not touch: anything else.
- **Rules:**
  - Streak on rows (98): `HabitMemberView` and the row gain a display streak
    from the cached columns aged by `streakAfter`; a helper gives the label
    with its unit ("12 days", "3 weeks", "2 months"), null below 2. Words
    live in `habitVocabulary.ts`.
  - "Skipped today" (101) as a vocabulary word.
  - `allRequiredDoneToday(rows)` for the confetti flag (76): true when at
    least one required row exists today and every required row is done or
    skipped.
  - `habitsStats.ts`: from one habit, its participants' logs, vacations and
    today, build: per person current, best, total done; the month calendar
    cells for a person (done, late, skipped, missed, today, future, not due;
    `tappable` only within `TAP_DAYS_BACK` and never future); the side by
    side table rows (total, rate as a whole percent of due days since the
    person joined, streak label; deactivated people left out); the weekly
    series for the last 6 Sunday-to-Saturday weeks (days done per person
    per week); perfect days this month for a person from their entries
    (`perfectDaysInRange`). Today comes from the caller.
  - Access (102): `canSeeHabitStats(actor, habit)`: a participant; a
    manager for a non-private habit; the device for a non-private habit;
    nobody else.
- **Verification:** gauntlet minus build; tests rise; each rule above has a
  named test, including a week boundary, a month boundary, and TZ=UTC/LA.
- **Done:** tests in all three zones green.

### C2 - Readers, nudges and actions
- **Status:** DONE (Stark; Fury re-ran tsc, eslint, 752 tests Denver, 752 UTC with 7 skipped as before)
- **Notes for C3+:** loaders `loadHabitStats(viewer, habitId, today, month?)` and `loadFamilyPage(viewer, today)` in new `habitsStatsRead.ts`; pure builders `buildStatsData`, `buildFamilyPage`, `statsSubject`, `perfectDayEntries` in new `habitsFamily.ts` (types `HabitStatsData`, `FamilyPage`, `FamilyColumn`, `FamilyRow` with `canLog` and `logForId`). `TodayPage` gained `nudges` (`TodayNudge`) and `confetti`. Actions `nudge(habitId, toUserId)` and `markNudgeSeen(nudgeId)` in `actions/habitNudges.ts`; writes in `habits/nudgeWrites.ts`. Stark's calls, kept: a skip today counts as finished for nudging; archived habits refuse nudges; `nudgeable` only on Side by side habits; column counts are done only. **Debt for C3:** the nudge policy is written twice (inline in `habitNudges.ts`, and as `nudgeable` in `buildStatsData`); C3 moves it to one `canNudge` in `access.ts`. `habitsToday.ts` is 355 lines (over 350); Captain to judge.
- **Objective:** the stats and family readers, the nudge writes and the
  server actions.
- **Boundaries:** may touch: `src/lib/habitsRead.ts` (if it passes 350
  lines, put the new loaders in new `src/lib/habitsStatsRead.ts`), new
  `src/lib/habits/nudgeWrites.ts`, new `src/app/actions/habitNudges.ts`,
  new `src/lib/habitsFamily.ts` and `src/lib/habitsFamily.test.ts` (the
  family page builder, pure; `habitsToday.ts` is at 344 lines), `src/lib/habitsToday.ts`
  (imports and the today page's nudge and confetti fields only) ·
  must not touch: anything else.
- **Rules:**
  - `loadTodayPage` also returns each row's display streak, the viewer's
    unseen nudges for today (from name, habit title, nudge id) and the
    confetti flag.
  - `loadHabitStats(viewer, habitId, today)`: null unless
    `canSeeHabitStats`; logs for the month shown and the last 6 weeks, and
    the viewer's other habits only as needed for perfect days; returns plain
    data (dates as "YYYY-MM-DD" strings) for C3, including who can be
    nudged today and whether the viewer already nudged them.
  - `loadFamilyPage(viewer, today)`: the Together strip, then one column
    per active non-device person in that person's own order; private habits
    never appear; for the tablet and for a person who chose the chip.
  - `nudgeWrites.ts`: `createNudge({ habitId, fromUserId, toUserId, day })`
    idempotent on the unique key; `markNudgeSeen(id, userId)` only for its
    recipient.
  - `habitNudges.ts` ("use server"): `nudge(habitId, toUserId)`: session,
    never a device, the sender and recipient both participants, habit not
    private, recipient not already done today, one per day;
    `markNudgeSeen(nudgeId)`. Revalidate `/habits` layout.
  - Stats taps reuse `habitChecks.ts` as is (day within 7 days).
- **Verification:** gauntlet minus build.
- **Done:** guards in order session, row, policy, then fields.

### C3 - The stats page
- **Status:** DONE (Stark; Fury re-ran tsc, eslint, 756 tests; build passed with a fake database URL; not seen in a browser yet, Strange will)
- **Notes for C4+:** `canNudge` in `access.ts` is the one nudge rule (now refuses Together on the action path too). `HabitStatsData.subjectName` added without a test (C5 adds one). Stark's wording, sent to Hill: "Emily hasn't done theirs today" (Hill's 97 said "hers"), "None yet" for an empty rate or streak. Skipped days are read-only on the stats calendar; only the current month shows (no month paging).
- **Objective:** `/habits/[id]` from the Stats board with decisions 94, 97,
  102 to 105.
- **First:** one `canNudge(actor, habit, toUserId)` in `src/lib/habits/access.ts`
  with tests, used by both `buildStatsData` (`habitsFamily.ts`) and
  `nudge` (`actions/habitNudges.ts`), so the rule has one home.
- **Boundaries:** may touch: `src/lib/habits/access.ts` and its test,
  `src/lib/habitsFamily.ts`, `src/app/actions/habitNudges.ts` (the
  `canNudge` move only), new `src/app/(app)/habits/[id]/page.tsx`, new
  components `HabitStats.tsx`, `HabitMonthCalendar.tsx`,
  `HabitSideBySide.tsx`, `HabitWeekStrips.tsx`, `NudgeButton.tsx`;
  `src/app/(app)/habits/[id]/edit/page.tsx` (the "See stats" link only) ·
  must not touch: anything else.
- **Rules:** BackLink "Habits & Chores" to `/habits`; header icon, title,
  meta line; tiles (current with flame and unit, best, total); month
  calendar with Done / Skipped / Missed legend and "N perfect days this
  month" line; tapping a tappable day toggles done (and a long press or a
  second control is NOT used: a tap on a done day undoes, on an empty day
  checks; Skip on a day is out of scope unless the board shows it), via
  `habitChecks.ts` with `day`; optimistic. Side by side habits: the table
  and the week strips (104: accent bars, 4px rounded tops on one baseline,
  2px gaps, one shared axis, badge plus name per strip, 44px tap columns,
  caption text in text tokens, a visible text alternative is the table);
  the Nudge row per person not done today (97), hidden on the tablet.
  Not found or not allowed: `notFound()`.
- **Verification:** full gauntlet.

### C4 - Today additions and confetti
- **Status:** DONE (Stark; Fury moved `@types/canvas-confetti` to devDependencies, re-ran tsc, eslint, 756 tests; build EXIT=0 with a fake database URL)
- **Notes for C5+:** `HabitRow` takes `showStreaks` (page passes `user.isDevice || user.showStreaks`) and its icon and title are a Link to `/habits/[id]`; "Skipped today" replaces the meta line. `HabitTodayList` takes `nudges`, `confetti`, `showStreaks`, `todayKey`; confetti fires on `confetti || allRequiredDoneToday(live)`, once a day per device (`confettiSeen.ts`, read inside the effect, no hook). Link taps after a swipe rely on SwipeActions' capture-phase click swallow: Strange checks it. No new tests (client components only).
- **Objective:** streaks, "Skipped today", nudge cards, title tap to stats,
  and confetti on Today.
- **Boundaries:** may touch: `src/components/HabitTodayList.tsx`,
  `HabitRow.tsx`, new `NudgeCard.tsx`, new `src/components/HabitConfetti.tsx`,
  new `src/lib/confettiSeen.ts` (the per-device day marker, the
  `lastStore.ts` pattern), `src/app/(app)/habits/page.tsx`, `package.json`
  and `package-lock.json` (`canvas-confetti` and its types, pinned exact) ·
  must not touch: anything else.
- **Rules:** decisions 96, 98, 99, 101, 105. Confetti fires once per day
  per device when the server flag is true, only after a tap makes it true
  or on load if not yet shown today; skipped entirely under
  `prefers-reduced-motion`; no sound, no words. Streak label hidden when the
  viewer's `showStreaks` is off. The row's title area is a link to
  `/habits/[id]`; the check and swipe are unchanged.
- **Verification:** full gauntlet.

### C5 - The family view
- **Status:** DONE (Stark; Fury re-ran tsc, eslint, 759 tests; build EXIT=0 with a fake database URL)
- **Notes:** `doneCounts` / `doneCountLabel` in `habitsFamily.ts` are the one count rule (109). Chips (`HabitViewChips`) live in `HabitFamilyView.tsx`, rendered by the page. The family view has its own compact row (`FamilyHabitRow`), no swipe to skip. Its optimistic `run()` wrapper repeats about 12 lines of `HabitTodayList`: Captain to judge. A tablet always gets the family view, even with `?view=mine`.
- **Objective:** the family view from the Family board (95).
- **Boundaries:** may touch: `src/app/(app)/habits/page.tsx`,
  `src/components/HabitTodayList.tsx` (the Mine / Whole family chips only),
  new `src/components/HabitFamilyView.tsx`, new
  `src/components/HabitFamilyColumn.tsx`, `DESIGN.md` (vocabulary entries
  for the new components) · must not touch: anything else.
- **First (decision 109):** move Today's `countLabel` rule into one pure
  helper in `src/lib/habitsToday.ts` (or `habitsFamily.ts` if
  `habitsToday.ts` would grow), used by `HabitTodayList` and by
  `buildFamilyPage`'s column counts, so skipped habits leave both numbers;
  update `habitsFamily.test.ts`, and add a test for `subjectName`.
  Boundary adds `src/lib/habitsFamily.ts`, `src/lib/habitsFamily.test.ts`.
- **Rules:** `/habits?view=family` shows it; the tablet always gets it (no
  chips); people see "Mine" / "Whole family" chips on both views. Together
  strip first, then a card per person (avatar, name, "x of y done"),
  Habits then Chores, each row with the check (`canLogFor` decides who can
  tap: the tablet for anyone, a manager for anyone, a person only their
  own), streak labels always shown on the tablet and by the viewer's switch
  otherwise, title tap to stats. Phone: cards stack; iPad 820: two columns
  if they fit. Private habits never appear.
- **Verification:** full gauntlet.

### F0 - Hill's stats wording (decisions 110 to 112)
- **Status:** DONE (Stark; Fury re-ran tsc, eslint, 762 tests). Note: `statsMonthTitle` keeps its own month-name list because `mealPlanDates.ts` does not export one; Captain to judge.
- **Objective:** apply 110 (nudge row "Name · Not done yet today"), 111
  (table streak "0 days" / "1 day" / "N days" with its own label helper in
  `habitVocabulary.ts`, rate "None yet" when null), 112 (month name only).
- **Boundaries:** `HabitStats.tsx`, `HabitSideBySide.tsx`,
  `HabitMonthCalendar.tsx`, `NudgeButton.tsx`, `habitVocabulary.ts` and its
  test.

## Gate ledger
- **Vision pass 1 (Fable): PASS.** Notes: kid dead link (became decision 114), `canNudge` ignores a deactivated recipient, optimistic undo shows missed for not-due days, confetti fires from optimistic rows, `loadHabitStats` reads all logs for all time, `monthLogRows` reads more than it uses.
- **Captain pass 1 (Opus): BLOCKED, 2.** (1) `FULL_MONTHS` in `habitVocabulary.ts` is a sixth month-name list; (2) `habitsStatsRead.ts` is a second habit reader not in STRUCTURE.md. (2) fixed by Fury writing amendments A, B, C into STRUCTURE.md. PR D notes: split `displayStreak`/`streakUnitOf` into `habits/streaks.ts`; one `useOptimisticRun` hook; `HabitViewChips` own file; `showsOnFamilyView` in `access.ts`; STRUCTURE.md housekeeping (now ~935 lines).
- **Strange pass 1 (Opus): BLOCKED, 4.** (1) streaks drawn in warn amber, same as Missed; (2) family card count leaves out Together habits; (3) stats calendar day buttons 42px at 390; (4) "Nudged" text 2.93:1. Not covered: nudge card from a second login, read-only checks, tablet login, a Missed day, Show streaks off, real touch. Test data: "zz m32 side", "zz m32 together", one nudge.

### F1 - Gate pass 1 fixes
- **Status:** PENDING
- **Fixes:**
  1. Captain 1: export `FULL_MONTH_NAMES` from `mealPlanDates.ts`; move `statsMonthTitle` and its tests to `habitsStats.ts` / `habitsStats.test.ts`; update `HabitStats.tsx`.
  2. Decision 114: a row title links to stats only when the viewer may open it (`canSeeHabitStats`); else plain text. Family rows carry the flag from `buildFamilyPage`; test it.
  3. Strange 1: a `--streak` color token (light #8a4b1f as on the mock; dark a peach at 4.5:1 or better on `--surface`, measured) plus a soft fill if needed, in `globals.css`, used for the streak flame and label on HabitRow, HabitFamilyColumn and the HabitStats tile; the nudge card uses the same peach family as the mock, not warn. DESIGN.md token entry.
  4. Strange 2: a person's family card count includes the Together rows they take part in (one rule, `doneCounts`); test it.
  5. Strange 3: stats calendar day buttons at least 44px wide at 375 (grid `gap-0.5`, card `p-2`), and capped at about 48px wide and centred at 820.
  6. Strange 4: "Nudged" state uses `text-muted-strong` with no opacity, still disabled.
  7. Vision note: `canNudge` refuses a deactivated recipient; test it.
  8. Strange note: stats calendar days before the person joined the habit are not tappable; test it.
  9. Strange note: family view checks name the person for screen readers ("Mark X done for Emily").
- **Boundaries:** `src/lib/mealPlanDates.ts` (the export and its comment only), `habitVocabulary.ts` and test, `habitsStats.ts` and test, `habitsFamily.ts` and test, `habits/access.ts` and test, `src/app/globals.css`, `DESIGN.md`, `HabitStats.tsx`, `HabitMonthCalendar.tsx`, `NudgeButton.tsx`, `NudgeCard.tsx`, `HabitRow.tsx`, `HabitFamilyColumn.tsx`, `HabitFamilyView.tsx`, `HabitTodayList.tsx` (only if a prop is needed for 2).
- **Verification:** full gauntlet plus TZ=UTC and LA runs.

