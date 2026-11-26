# Mission 86: Manage other people's habits

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-11-26 · **Updated:** 2026-11-26
**Branch:** `claude/mission-86-manage-people-cf4dbd`, cut from main at 48f7c4f (PR 132's kid-chore edit fix already in).

## Brief

- **Goal:** while testing Rewards, Bryce could not give his son Ledger's chores
  stars, because a parent had no direct way to reach a kid's habits. PR 132
  fixed the 404 on a kid's chore's edit page. This mission adds the ways in.
  Plan decision 92 (`.avengers/plans/habits-chores-v1.md`) promised other
  people's habits in Manage; it was never built.
- **Done means:**
  1. On `/habits/manage` a parent or admin sees person chips (the chore chart
     and Report chip look). `?person=` picks the person; the list is that
     person's habits and chores minus any private habit the viewer cannot see
     (`canSeeHabit`). Rows open the edit page; "Add a habit or chore" starts
     with that person picked; the Chore chart card opens that person's chart.
     On a kid's list a parent can drag to reorder (the server checks it). The
     edit page's BackLink and the form's after-save return go to the same
     person's Manage. Opening Manage from Whole family with exactly one person
     left by the Filter opens on that person.
  2. A habit's own page (`/habits/[id]`) shows an "Edit" link when
     `canEditHabit` allows.
  3. The chore chart's This week sheet shows an "Edit chore" row (pencil)
     under "Skip this week".
  4. The Gauntlet passes, the gates pass, PR merged, production checked.
- **Out of scope:** kids or the Tablet choosing people on Manage (kids get no
  chips; the Tablet is already redirected); editing another adult's order;
  Winnie; any schema change; the Report and chart pages' own behaviour.

## Bryce's decisions (2026-11-26)

Approved mocks in the planning chat: the three fixes above. Asked in this
chat with a mock, all four answered with the recommendation:

- **D1 chip order:** viewer first, then household order (the chore chart and
  Report rule), so all three chip rows look the same to each person.
- **D2 another adult's list:** no grip (subtitle "Tap a row to edit."), and
  the "My Habits & Chores settings" card shows only on your own list. A kid's
  list keeps the grip.
- **D3 habit page link wording:** "Edit", pencil icon, beside the BackLink in
  the style of the edit page's "See stats" link.
- **D4 Edit chore in the sheet:** hidden when the sheet says "Ask a parent";
  otherwise shown when `canEditHabit` allows.

## Danger register

AGENTS.md in full. In short: local dev is the Neon `dev` branch (host
`ep-hidden-pine-a6ajzk11-pooler`, checked); it holds a real family snapshot,
treat it as private. Never `npm run db:seed` or `db:reset`. Never print `.env`
beyond the hostname. No clean or reset script for `User`. No migrations in
this mission. Stage by explicit path, then `git show --stat HEAD`. No direct
pushes to `main`. Leave untracked `.agents/` and `.codex/` out.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always).
- Strange: three visible changes.
- Captain: a new lib file (`habitsManage.ts`), a changed writer and the
  habits structure doc; the diff will pass ~300 lines.
- Banner: out. Fury read the habits code inline (Manage page, HabitManager,
  access.ts, habitsRead/habitsToday, participantWrites, ChoreChart and sheet,
  HabitForm, HabitsBar/HabitsDayView, the stats page).

## Contracts

### C1 — The rules and server side: who may open and reorder whose Manage, the subject's lists, the URL builders, the chart's edit flag

- **Status:** DONE (commit 6e15f82)
- **Boundaries:** may touch: `src/lib/habits/access.ts`,
  `src/lib/habits/access.test.ts`, `src/lib/habits/habitRows.ts`,
  `src/lib/habits/habitRows.test.ts`, `src/lib/habits/participantWrites.ts`,
  `src/lib/householdPeople.ts`, `src/lib/habitsToday.ts`,
  `src/lib/habitsToday.test.ts`, `src/lib/habitsRead.ts`,
  `src/lib/habitsStatsRead.ts`, `src/lib/choreChart.ts`,
  `src/lib/choreChart.test.ts`, `src/lib/habitsReportScope.ts`,
  `src/app/actions/habits.ts`, new `src/lib/habitsManage.ts`, new
  `src/lib/habitsManage.test.ts` · must not touch: every component and page,
  `prisma/`, `package.json` (the `src/lib/*.test.ts` glob already covers the
  new test), `docs/`, `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`.
- **What to build:**
  1. `access.ts` (pure): `canOpenManageOf(actor, personId)`: never the
     tablet; yourself; a manager (`isManager`) for anyone.
     `canReorderListOf(actor, personId, personRole: Role)`: never the tablet;
     yourself; a manager when `personRole === "kid"` (D2: kids have no
     logins; another adult keeps their own order). No `MANAGER_ROLES` or role
     test anywhere else. Tests for every branch, tablet included.
  2. `householdPeople.ts`: `loadHouseholdPersonRole(personId): Promise<Role | null>`
     (null when not a household person; `HOUSEHOLD_PERSON_WHERE`, `toRole`).
  3. `habitsToday.ts` (pure): generalise `visibleInViewerOrder` so the order
     and membership follow a subject: the habits `subjectId` takes part in
     that the viewer may see (`canSeeHabit(viewer, …)`), in the subject's
     `sortOrder`, oldest first on a tie. Keep `visibleInViewerOrder` (subject
     = viewer) for its callers. Add `buildManageLists(viewer, subjectId,
     habits)` returning `{ manage, archived }` exactly as `buildTodayPage`
     builds them today (live in subject order; archived newest archived
     first), and make `buildTodayPage` use it (no behaviour change). Tests,
     in the new `habitsManage.test.ts` (not `habitsToday.test.ts`, which is
     432 lines, over the soft cap; existing cases there may only be edited
     if a rename forces it): a parent sees a kid's habits in the kid's order;
     a private habit of the kid's that the parent is not on is left out; a
     private habit the parent shares with the kid shows; archived ones come
     newest first.
  4. `habitsRead.ts`: `loadManageLists(viewer, subjectId)`: one habit query
     (habits the subject takes part in, with the participant fields
     `managerItem` / `TodayHabitInput` need) handed to `buildManageLists`. No
     logs, nudges or vacations: Manage needs none. No auth (the page checks
     `canOpenManageOf`). Keep the file's header comment true.
  5. `habits/habitRows.ts` (pure) `refillSlots<T>(order: readonly T[], wanted: readonly T[]): T[]`:
     the items of `order` that are in `wanted` take `wanted`'s order in the
     slots they held; everything else keeps its slot; ids in `wanted` that
     are not in `order` are ignored. Tests. `participantWrites.ts`
     `reorderHabits(userId, ids)`: read all of `userId`'s participant rows in
     their current order (`sortOrder`, then the habit's `createdAt`), refill
     with `refillSlots`, write `sortOrder` 0..n-1 for the whole list (only
     rows whose number changes need a write). This keeps a hidden private
     habit's or an archived habit's place when someone reorders a list that
     does not show it. Same transaction shape as today.
  6. `actions/habits.ts` `reorderHabits(ids, personId?)`: guards in order:
     session; tablet refused; ids checked as today; `personId` either
     undefined or a string (else refuse); subject = `personId ?? user.userId`;
     when the subject is not the viewer, `loadHouseholdPersonRole(subject)`
     and refuse (same "Couldn't save the order." words) unless
     `canReorderListOf`. Then the writer with the subject. Update the doc
     comment.
  7. New `src/lib/habitsManage.ts` (pure, imports only `habits/access.ts`,
     `habits/types.ts` and `choreChart.ts`): `resolveManagePerson(viewer,
     requested: string | undefined, people: readonly { id: string }[]): string`
     (the requested id when it is a household person and `canOpenManageOf`,
     else the viewer's id); `personParam(personId, viewerId): string | null`
     (null for yourself); URL builders that take `personId: string | null`
     and add `?person=` (URL-encoded) only when it is non-null:
     `manageHref`, `newHabitHref`, `editHabitHref(habitId, personId)`,
     `choreChartHref`; `managePersonChips(viewer, people, personId)`: chips
     for the people `canOpenManageOf` allows, viewer first then household
     order, first names, null when fewer than two (so a kid gets none).
     Tests for all of it.
  8. Chips, one rule: export the "viewer first, then the given order, first
     names, selected flag" chip builder from `choreChart.ts` (it is inline in
     `buildChoreChart` today) and use it from `buildChoreChart`,
     `habitsReportScope.ts`'s `personChips` and `managePersonChips`. No
     change to who gets chips on the chart or Report.
  9. `choreChart.ts`: `ChartWeekChore` gains `canEdit: boolean` =
     `canEditHabit(viewer, access) && !askParent` (D4). Test it.
  10. `habitsStatsRead.ts` `loadHabitStats` returns `canEdit: boolean`
     (`canEditHabit` on the habit's facts) beside the stats data, for the
     Edit link (D3). Type it so the page can read it.
- **Verification:** `npx tsc --noEmit` clean; `npx eslint .` clean;
  `npm test` passes with a higher count than before (record before and
  after); the AGENTS.md UTC command passes.
- **Evidence required:** the commands and their summary lines; before/after
  test counts; the new function signatures; line counts (total and code) of
  every touched file over 300 lines; a note on how `buildTodayPage`'s output
  was shown unchanged (the existing `habitsToday.test.ts` cases).
- **Done criteria:** Fury re-runs the test command and reads the diff:
  `canReorderListOf` is the only role rule for reorder; the action checks
  it before writing; no page or component is touched.
- **Report:** DONE. tsc and eslint clean; `npm test` 2283 to 2297 pass, 0 fail (Fury re-ran: 2297 / 0); UTC command 2287 pass, 10 skipped, 0 fail. `loadHabitStats` returns `HabitStatsData & { canEdit }` (a spread, so the page and `HabitStats` still type-check). New exported `visibleInOrderOf` in habitsToday.ts (visibleInViewerOrder wraps it). Sizes: habitsRead.ts 406 total / 303 code, habitsToday.ts 387 / 304 (soft-cap NOTEs, both were already over). Fury read the action, writer, access and habitsManage.ts diffs.

### C2 — The screens: person chips on Manage, the person carried through edit, new and chart, the Edit link, the Edit chore row

- **Status:** PENDING (after C1)
- **Boundaries:** may touch: `src/app/(app)/habits/manage/page.tsx`,
  `src/app/(app)/habits/[id]/page.tsx`,
  `src/app/(app)/habits/[id]/edit/page.tsx`,
  `src/app/(app)/habits/new/page.tsx`,
  `src/app/(app)/habits/chart/page.tsx`, `src/components/HabitManager.tsx`,
  `src/components/HabitForm.tsx`, `src/components/ReportPersonChips.tsx`,
  `src/components/ChoreChart.tsx`, `src/components/ChoreChartSheet.tsx`,
  `src/components/HabitsDayView.tsx`, `src/components/HabitsBar.tsx`,
  `src/lib/habitVocabulary.ts`, `docs/structure/habits.md` · must not touch:
  everything in C1's may-touch list except `habitVocabulary.ts`, `prisma/`,
  `package.json`, `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`.
- **What to build:**
  1. Manage page: read `searchParams.person`; people from `loadHabitRoster`;
     subject = `resolveManagePerson`; lists from `loadManageLists`; chips from
     `managePersonChips`; `canReorder` from `canReorderListOf` (subject's role
     from `loadHouseholdPersonRole` only when the subject is not the viewer).
     Subtitle: "Tap a row to edit. Drag the grip to reorder." when
     `canReorder`, else "Tap a row to edit." (D2). Chips sit under the
     subtitle, built with `ReportPersonChips` (give it an optional aria label,
     e.g. "Whose habits"; its look does not change), hrefs from `manageHref`.
  2. `HabitManager`: takes the subject's `personParam`, `canReorder`, the
     subject's first name, and whether it is your own list. Rows link to
     `editHabitHref`; Add to `newHabitHref`; Chore chart card to
     `choreChartHref`. When `canReorder` is false the lists draw without the
     grip (plain rows, same look); when true the reorder calls
     `reorderHabits(ids, personId)` (undefined for yourself). The settings
     card only on your own list (D2). Empty state on someone else's list:
     "Add a habit or chore to start Ledger's list." (first name). All new
     words in `habitVocabulary.ts`.
  3. Edit and New pages: read `?person=`, resolve it, BackLink to
     `manageHref(personParam(…))`. `HabitForm` gets `returnHref` (used by
     `router.push` after save, archive, restore and delete; default
     "/habits/manage") and, on New, `forPersonId` so "Just me" reads "Just
     Ledger" and the person picked is Ledger (use the existing
     `soloPersonId` / `soloWhoChoice` path; selected ids start with that
     person). A kid or a refused `?person=` falls back to the viewer.
  4. Chart page: BackLink to `manageHref(personParam(chart.personId, viewer))`.
  5. Habits page bar: on Whole family, when `shownColumns(people, hidden)`
     leaves exactly one person, the Manage icon links to
     `manageHref(personParam(that person))`; otherwise `/habits/manage`.
     `HabitsBar` takes the href as a prop. No filter matching in a component
     beyond calling `shownColumns`.
  6. Habit page `/habits/[id]`: when `canEdit`, an "Edit" link with a Lucide
     `Pencil` icon beside the BackLink, styled exactly like the edit page's
     "See stats" link (D3), href `editHabitHref(id, personParam(subjectId,
     viewer))`.
  7. Chart sheet: an "Edit chore" row (Lucide `Pencil`, the sheet's `ROW`
     style, a `Link`) under "Skip this week" (and "Back to the default"),
     shown when `chore.canEdit` and the chore is saved (not a `new-` row),
     href `editHabitHref(chore.id, chart.personId)`.
  8. `docs/structure/habits.md`: a short entry (under 15 lines) naming
     `habitsManage.ts` as the only home of Manage's person, chips and the
     habit page URLs; `canOpenManageOf` / `canReorderListOf` as the only
     Manage and reorder policy; `loadManageLists` in the reader list;
     `refillSlots` as the one slot rule for reorders; and its dependency
     direction. Update the habitsRead.ts and HabitForm.tsx size-watch
     numbers.
- **Verification:** the full Gauntlet; then `npm run dev` style check is
  Strange's (Stark: no dev server needed, but do run `npm run build`).
- **Evidence required:** Gauntlet summary lines; `git diff --stat`; a grep
  showing no `"/habits/manage?person` string built outside `habitsManage.ts`;
  sizes of `HabitForm.tsx`, `HabitManager.tsx`, `ChoreChartSheet.tsx`.
- **Done criteria:** Fury reads the diff; every new word comes from
  `habitVocabulary.ts`; the settings card and grip rules match D2.
- **Report:** _pending_

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | — | — | — |
| 1 | Strange | — | — | — |
| 1 | Captain | — | — | — |

## Handoff log

- 2026-11-26 — Setup done (dev branch host checked, `npm ci`). Research inline. Bryce answered D1 to D4 with the recommendations. Contracts C1, C2 written. Next: dispatch C1.
- 2026-11-26 — C1 done and committed (6e15f82). C2 dispatched.

## Delivery

- **Shipped:** _pending_
- **Shipped check:** _pending_
- **Deliberate leftovers:** _pending_
