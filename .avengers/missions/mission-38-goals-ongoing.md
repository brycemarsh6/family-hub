# Mission 38: Plans & Goals, ongoing goals and the + clearance fix

**Project:** family-hub (Marshee)
**Status:** BUILDING (C1)
**Started:** 2026-11-06 · **Updated:** 2026-11-06
**Branch:** `claude/goals-ongoing` (from `origin/main` at `c086abc`)

## Brief

- **Goal:** a goal may have no end date. Bryce asked on 2026-11-06 ("I
  don't like the target date having to be required") and approved the mock
  (https://claude.ai/artifact/3b3ZvgKZaYzdYDvqET23FF) with "Yes to all of
  those". The five approved points are in `.avengers/plans/plans-goals-v1.md`
  (section "Bryce's request: ongoing goals"):
  1. "Ongoing" is a third chip on the Target date field, beside "End of this
     year" and "In 90 days"; picking it greys out the date box (tapping a
     date chip or the box gives it a date again). No third tab on the Goals
     list. New goals still start on "End of this year".
  2. The word is "Ongoing" on the chip, a tag on the goal card, and the goal
     page (in place of "by Dec 31").
  3. Ongoing goals sort after the dated ones within each life area.
  4. An ongoing goal with a number shows the number and bar but no pace
     line ("on pace" / "a little behind pace"; "reached" still shows).
  5. The round + button never covers the last goal card.
- **Done means:** the Gauntlet passes; on dev a goal can be created and
  edited as Ongoing and back to dated; the list, card, goal page and the
  result card read as above; at an iPhone viewport with the bottom safe
  area, the last goal card scrolls fully clear of the +.
- **Out of scope:** a third tab; ongoing habits or plan items; the menu
  button covering the "Active" chip while scrolled (noted 2026-11-06, lower
  priority); any change to dated goals' behavior.

## Danger register

AGENTS.md applies in full. For this mission:
- One migration, additive in effect: `ALTER TABLE "Goal" ALTER COLUMN
  "targetDate" DROP NOT NULL;` (no data lost). Fury reviews the SQL, checks
  that `DATABASE_URL`'s host is the dev branch (`ep-hidden-pine-`) without
  printing `.env`, and applies it with `npx prisma migrate deploy`. Builders
  run no Prisma command except `npx prisma generate`.
- Forbidden: `db:seed`, `db:reset`, `migrate reset`, `db push`,
  `migrate dev`. No agent edits `.env`. Production data is never written.

## Gauntlet

`npx tsc --noEmit`; `npx eslint .`; `npm test`;
`TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts`
(7 DST skips); the same with `TZ=America/Los_Angeles`;
`DATABASE_URL=postgresql://u:p@invalid.invalid:5432/none DIRECT_URL=postgresql://u:p@invalid.invalid:5432/none npm run build`;
`node ~/.claude/skills/avengers/recordcheck.mjs origin/main..HEAD`.

## Assemble

Stark + Vision (always), Strange (screens change), Captain (a migration
and a nullable column that ripples through the goal types). No Banner: the
`targetDate` sites are few and listed below.

## Contracts

### C1 - Ongoing goals, data to screen

1. **Objective:** `Goal.targetDate` is optional end to end, and every screen
   that shows a goal reads "Ongoing" when it has none, per the five points.
2. **Boundaries:**
   - May touch: `prisma/schema.prisma` (the Goal model's targetDate line and
     its doc comment only), `prisma/migrations/20261110000000_goal_target_date_optional/migration.sql` (new), `src/lib/goals.ts`, `src/lib/goalsProgress.ts`,
     `src/lib/goalsRead.ts`, `src/lib/goalVocabulary.ts`,
     `src/app/actions/goals.ts`, `src/components/GoalForm.tsx`,
     `src/components/GoalCard.tsx`, `src/components/GoalResultCard.tsx`,
     `src/components/GoalDetail.tsx`, `src/components/GoalsList.tsx`,
     `src/app/(app)/plans/goals/[id]/page.tsx`,
     `src/app/(app)/plans/goals/[id]/edit/page.tsx`, and the tests
     `src/lib/goals.test.ts`, `src/lib/goalsProgress.test.ts`,
     `src/lib/goalsRecap.test.ts`, plus a new
     `src/lib/goalsOngoing.test.ts` (new; `goalsProgress.test.ts` is past
     its size watch, so new goal-progress tests go here).
   - Preflight note: `prisma/schema.prisma` trips the size cap check, but
     STRUCTURE.md exempts the schema (as recorded in mission 37).
   - Must not touch: `.env`, any other migration, `src/lib/habits/`,
     `src/components/FloatingAddButton.tsx` (shared with Recipes and
     Family), anything else.
3. **Specifics:**
   - The schema: `targetDate DateTime?`. Migration SQL is exactly the one
     `ALTER` above. Run `npx prisma generate` only.
   - `checkGoalInput` (in `goals.ts`): a missing or empty `targetDate` is
     allowed only when the form says Ongoing (send `targetDate: ""` with an
     explicit `ongoing: true`, or one sentinel; pick one and document it);
     otherwise "Pick a target date." stays. The past-date check applies only
     to a date.
   - Actions: save `null` for ongoing; the edit's `earliest` rule works with
     a null stored date.
   - Pace: `paceStatus` returns "reached" when progress ≥ 1 and null
     otherwise for an ongoing goal. Cards and the result card already hide
     a null pace; confirm.
   - Sorting: `goalsRead.ts` orders dated goals first, then ongoing, within
     the existing order (Prisma `{ targetDate: { sort: "asc", nulls:
     "last" } }`).
   - Words: "Ongoing" lives once, in `goalVocabulary.ts` (for example
     `ONGOING_LABEL`), used by the chip, the card tag and the goal page.
   - The form: a third chip "Ongoing" after the two date chips. Lit, the
     date input is greyed out (`opacity-45` style, `aria-disabled`, still
     tappable: tapping it or a date chip turns Ongoing off and gives a
     date). New goals still start on "End of this year". Editing an
     ongoing goal opens with Ongoing lit.
   - The card: a small "Ongoing" tag (the `surface-2` pill style used for
     tags elsewhere; reuse an existing tag class if one exists) beside the
     title for an ongoing goal. Dated cards unchanged.
   - The goal page: "· by Dec 31" becomes "· Ongoing".
   - The + clearance (point 5): `GoalsList.tsx`'s spacer under the list
     becomes `calc(7rem + env(safe-area-inset-bottom))` tall (as a style),
     so the last card clears the button on an iPhone with a home bar.
4. **Verification:** the Gauntlet. Tests: `checkGoalInput` accepts Ongoing
   and still rejects a blank date without it; `paceStatus` gives null for
   an ongoing goal behind its number and "reached" at it; a dated goal's
   pace is unchanged.
5. **Evidence required:** each command with its exit code (capture with
   `; echo EXIT $?` directly after it, not through a pipe), the migration
   SQL in full, `wc -l` of touched files, and a list of every `targetDate`
   read site and what it does with null (`git grep -n targetDate -- src`).
6. **Done criteria:** Vision, Strange and Captain pass.

## Reports

#### C1 report (Stark): DONE

Ongoing is `ongoing: true` with `targetDate: ""` from the form; the check
refuses a blank date without it. `paceStatus` gives "reached" or null for
an ongoing goal. Sorting uses `nulls: "last"`. `ONGOING_LABEL` lives in
`goalVocabulary.ts`. The card's tag is a `surface-2` pill; the goal page
reads "· Ongoing"; the list spacer is `calc(7rem +
env(safe-area-inset-bottom))`. `GoalResultCard` and `GoalDetail` needed no
change (a null pace is already hidden). New `goalsOngoing.test.ts` (7
tests). Gauntlet: tsc 0, eslint 0, `npm test` 1102, build 0. Stark saw 0
DST skips in the UTC run (mission 37 saw 7): Vision to re-check.

Deviation: new goals open with no date chip lit (the form has always
started blank), so the mock's "New goals still start on End of this year"
described the old form wrongly. Fury's call: leave the form as it is,
since that sentence described the existing behaviour rather than asking
for a change; tell Bryce, and it is one line if he wants the chip pre-lit.

Fury reviewed the SQL (the one `ALTER ... DROP NOT NULL`), checked the
host prefix (`ep-hidden-pine-`, dev) without printing `.env`, and ran
`npx prisma migrate deploy` on dev: applied.

## Gate ledger

#### Captain, pass 1: BLOCKED (1)

BLOCKER: the four grandfathered `calendarDateInZone(goal.targetDate,
"UTC")` sites (`plans/goals/[id]/page.tsx`, its `edit/page.tsx`,
`actions/goals.ts`, `goalsProgress.ts`) were touched and must move to
`calendarDateFromUtcMidnight` (STRUCTURE.md's stored-day rule); drop the
unused `calendarDateInZone` imports, keep it in `goalsProgress.ts` for
`createdAt`. NOTES: retire the grandfather sentence; add an "Ongoing
goals" paragraph to the goals entry and `ONGOING_LABEL` to the
vocabulary list; size watch `goals.ts` 338, `GoalForm.tsx` 331 (split the
target-date field next); a fifth null check should become
`isOngoingGoal`. Placement, migration, one source of truth and dependency
direction pass.

#### Vision, pass 1: PASS

Gauntlet green (1102; UTC 1095 + 7 DST skips; LA 1102; build 0;
recordcheck 0 hard). Boundaries clean. Every `targetDate` read traced:
none outside the goal files; the Assistant API, voice, recap and tile
never read it. NOTES: Stark's "UTC" run wasn't really UTC (0 skips; the
real run shows 7), wrong evidence, code fine; tapping the greyed date box
turns Ongoing off before a date is picked, so cancelling the picker leaves
neither (Save then says "Pick a target date."); the contract says
`checkGoalInput` where the function is `validateGoalInput`; the
new-goal default is Fury's recorded deviation.

#### Strange, pass 1: PASS (no blockers)

All five points render as approved at 375 and 820, light and dark. The +
clearance measures 144px at every inset, and it was already 144px before
this change (`<main>` carries bottom padding), so Bryce's overlap was
likely mid-scroll: his phone check should look again. NOTES: drop
`aria-disabled` on the still-tappable date box (`aria-pressed` on the
chip carries the state); a set-aside date stays visible in the greyed box
(honest); error wording could be "Pick a target date, or choose Ongoing."
(Hill's call, not taken); "Ongoing" wraps to its own row at 375 (fine);
the tag centers on a three-line title (older row behavior); the tag
repeats `QUIT_TAG_CLASS` from `HabitRow.tsx`; new goals open with no chip
lit while the approved mock says "End of this year". A dev server started
before `prisma generate` crashes on `nulls: "last"` until restarted.
Test goals: four "zz m38" goals on dev.

Fury's ruling on the default: the approved mock says new goals start on
"End of this year", so building that is following Bryce's approval, not a
new design call. It goes in F1.

### F1 - Gate fixes

1. **Objective:** Captain's blocker plus three small notes.
2. **Boundaries:** may touch `src/app/(app)/plans/goals/[id]/page.tsx`,
   `src/app/(app)/plans/goals/[id]/edit/page.tsx`, `src/app/actions/goals.ts`,
   `src/lib/goalsProgress.ts`, `src/components/GoalForm.tsx`,
   `src/components/GoalCard.tsx`, `src/components/HabitRow.tsx` (only to
   export `QUIT_TAG_CLASS` if reused). Nothing else.
3. **Specifics:**
   - Captain BLOCKER: the four `calendarDateInZone(goal.targetDate, "UTC")`
     reads become `calendarDateFromUtcMidnight(goal.targetDate)` from
     `householdDate.ts`; remove `calendarDateInZone` imports that become
     unused (keep it in `goalsProgress.ts` for `createdAt`).
   - Drop `aria-disabled` from the greyed date input; keep the 0.45 opacity.
   - New goals open with "End of this year" lit (the date from
     `targetDateChips(today)[0]`). Edit is unchanged.
   - The card tag reuses one tag class: either export `QUIT_TAG_CLASS` and
     use it (adding `whitespace-nowrap` there is fine), or leave the tag's
     classes as they are and say why.
4. **Verification:** the Gauntlet; paste the `ℹ skipped` line from the
   direct `TZ=UTC node ...` run (it must show 7).
5. **Evidence required:** exit codes, `git grep -n 'calendarDateInZone(goal.targetDate' -- src` (empty), `wc -l` of touched files.
6. **Done criteria:** Captain pass 2 passes; Vision re-runs the Gauntlet.
