# Mission 88: Manage other people's habits

**Project:** family-hub (Marshee)
**Status:** DELIVERING (gates passed; PR next)
**Started:** 2026-11-26 · **Updated:** 2026-11-26
**Branch:** `claude/mission-88-manage-people-cf4dbd`, cut from main at 48f7c4f (PR 132's kid-chore edit fix already in).

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

- **Status:** DONE (commit b64cf66)
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

### F1 — Gate pass 1 fixes (Captain's and Strange's blockers, plus the cheap notes)

- **Status:** DONE (commit ec4a5c5)
- **Bryce's decisions behind it (2026-11-26, asked with Strange's findings):**
  **D5** the person chips wrap to a second line (all three chip rows: Manage,
  Report, chore chart), so the selected chip is always visible. **D6** the
  Private switch shows only on your own items: a habit for just one other
  person ("Just Ledger") is never private, and picking Hours no longer turns
  Private on for someone else.
- **Boundaries:** may touch: `src/components/HabitManager.tsx`,
  `src/components/ChoreChart.tsx`, `src/components/ChoreChartSheet.tsx`,
  `src/components/ReportPersonChips.tsx`, `src/components/HabitForm.tsx`,
  `src/app/(app)/habits/manage/page.tsx`,
  `src/app/(app)/habits/chart/page.tsx`, `src/lib/habitsManage.ts`,
  `src/lib/habitsManage.test.ts`, `src/lib/habitVocabulary.ts`,
  `src/lib/habitsRead.ts` (header comment only), `src/lib/habits/habitRows.ts`
  (header comment only), `src/lib/choreChart.ts` (header comment only),
  `docs/structure/habits.md`, `STRUCTURE.md` (the Forms trend number for
  `HabitForm.tsx` only) · must not touch: anything else; no logic change in
  `src/lib/habits/`, the readers or the actions.
- **What to build:**
  1. (Captain BLOCKER) `HabitManager.reorderWithin` uses `refillSlots`
     (import from `@/lib/habits/habitRows`) in place of its queue copy.
  2. (Captain BLOCKER) `ChoreChart.tsx`: the Default week's edit link uses
     `editHabitHref(chore.id, personParam(chart.personId, viewerId))`; the
     chips/tabs address uses `choreChartHref`, which gains an optional `view`
     argument (test it). The viewer's id reaches the component from the chart
     page if the chart data does not carry it. The This week sheet's Edit
     chore uses the same `personParam` form (Strange's NOTE). Replace the
     sheet's `!chore.id.startsWith("new-")` with a `saved` flag (or similar)
     passed from `ChoreChart`, which keeps the `new-` prefix to itself.
  3. (Strange BLOCKER, D5) `ReportPersonChips`: the `<nav>` wraps
     (`flex-wrap`, no horizontal scroll); same chips, same sizes. Update its
     doc comment to name Manage too.
  4. (Strange BLOCKER, D6) `HabitForm`: when the item is for one person who is
     not the viewer (`who === "me"` and `soloId !== viewerId`), hide the
     Private switch, send `isPrivate: false`, and `pickTrack` / `pickWho`
     never turn Private on. Your own items, and shared items, behave exactly
     as before. Keep the file at or under 350 total lines.
  5. NOTEs: the Manage page uses `firstNameOf` (choreChart.ts) for the
     subject's first name; the own-list empty state's title and hint move to
     `MANAGE_LABELS` in `habitVocabulary.ts`; fix the false header sentences
     in `habitsManage.ts` (its callers are the pages and client components,
     not `habitsRead.ts`), `habitsRead.ts` (past 350 code lines a split needs
     a habits.md amendment naming the new reader), `habits/habitRows.ts` (it
     also holds the slot rule for a reorder) and `choreChart.ts` (a fourth
     job: the shared person chips).
  6. `docs/structure/habits.md` Manage entry: say `habitsManage.ts` is the
     only home of every Manage, New, Edit and chart address that carries
     `?person=`; client components (`HabitsDayView`, `HabitManager`,
     `ChoreChart`, `ChoreChartSheet`) may import it; `personChipsFor`
     (choreChart.ts) is the one chip order-and-name rule for chart, Report
     and Manage, each caller only filters who; add `habitsManage.ts` to PR D's
     list of files that may import `choreChart.ts`. Size watch: real numbers
     (total and code) from the preflight counter for `habitsRead.ts`,
     `habitsToday.ts`, `HabitForm.tsx`, `habitVocabulary.ts`. STRUCTURE.md's
     Forms trend line for `HabitForm.tsx` gets the same number.
- **Verification:** the full Gauntlet (tsc, eslint, npm test, the UTC
  command, `npm run build`).
- **Evidence required:** Gauntlet summary lines; `git diff --stat`; a grep
  showing no hand-built `/habits/` address with `?person=` outside
  `habitsManage.ts`; `HabitForm.tsx` line count.
- **Done criteria:** Captain pass 2 and Strange pass 2 PASS; Vision pass 2 on
  the F1 diff.
- **Report:** DONE. tsc, eslint, npm test 2297/0, UTC 2287 pass 10 skipped; Fury re-ran `npm run build` (exit 0). `HabitForm.tsx` 350 / 296 code.

### F2 — Gate pass 2 fixes (Strange's D6 second path, plus the record NOTEs)

- **Status:** DONE (commit 95b6c20)
- **Boundaries:** may touch: `src/components/HabitForm.tsx`,
  `src/components/HabitManager.tsx`, `docs/structure/habits.md`,
  `STRUCTURE.md` (the `HabitForm.tsx` Forms trend sentence only),
  `src/lib/habits/habitRows.ts` (header comment only) · must not touch:
  anything else.
- **What to build:**
  1. (Strange BLOCKER, D6) `HabitForm.tsx` ~line 126: Private shows only when
     the item's one person is the viewer, whichever Who choice got there:
     `const onlyViewer = who === "me" ? soloId === viewerId : selectedIds.length === 1 && selectedIds[0] === viewerId;`
     then `canBePrivate = onlyViewer && canBePrivateWith(peopleCount)`
     (`canBePrivate` already means exactly one person, so shared items are
     unchanged). Keep the file at or under 350 lines.
  2. (Vision NOTE) drop `reorderWithin`'s unused `kind` parameter and its
     call-site argument in `HabitManager.tsx`.
  3. (Captain NOTEs) `docs/structure/habits.md` ~249: "a hand-built Manage,
     New, Edit or chart address with `?person=` anywhere else is a BLOCKER
     (the Report's lives in `reportHref`, `/habits`' in `habitsHref`)";
     record that `HabitManager` imports the pure `habits/habitRows.ts` for
     `refillSlots`; drop the stale "(mission-79 added stars plumbing only)"
     aside on `habitsToday.ts` and add that the next habits mission should
     plan the `habitsRead.ts` split. `habits/habitRows.ts` header: the server
     side reaches `refillSlots` through `participantWrites.ts`
     (`reorderHabits`). `STRUCTURE.md` ~986: mission 86 grew `HabitForm.tsx`
     from 344 to 350 (296 code), now at the soft cap, so its next field moves
     a block into its own component first.
- **Verification:** the full Gauntlet.
- **Evidence required:** Gauntlet summary lines, `git diff --stat`,
  `HabitForm.tsx` line count.
- **Done criteria:** Strange pass 3 and Vision pass 3 PASS.
- **Report:** DONE. tsc, eslint, npm test 2297/0, UTC 2287 pass 10 skipped, `npm run build` exit 0 (captured directly). `HabitForm.tsx` 350 / 296 code. The `onlyViewer` test is folded into one line (`selectedIds[0] === viewerId`, the same rule because `canBePrivate` already means one person) to hold 350.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | PASS | 0 | 7 NOTEs: Hours auto-Private on "Just Ledger" (now D6); `split(" ")` vs `firstNameOf`; old inline chart address; kid's one-person filter link resolves back to self (harmless, left); hidden private id could move slot if guessed (theoretical, left); subtitle `mb-3`; habitsRead.ts size. |
| 1 | Captain | BLOCK | 2 | B1 `HabitManager.reorderWithin` copies the slot rule; B2 `ChoreChart.tsx` builds two habit addresses by hand (the Default week edit link loses the person). NOTEs folded into F1. |
| 3 | Vision | PASS | 0 | Gauntlet re-run, plus an America/Los_Angeles run (2297/0). Recordcheck 0 hard failures. NOTEs: the server does not check D6 (`habitInput.ts`: private needs one person, not "that person is you"), unreachable from the app, follow-up; D6 lives inline in the form, no unit test (form at the 350 cap); habits.md "may import it" ambiguous (fixed at delivery). |
| 3 | Strange | PASS | 0 | Every Who choice for Ledger (Just, Side by side, Together; Checks and Hours) shows no Private; your own Just me + Hours turns it on; Side by side with only you shows it; shared hides it; editing a Just Ledger chore hides it. A reorder between two test chores on Ledger's list held after reload; real rows untouched; test data deleted. NOTE: edit page title says "Edit habit" on a chore (pre-existing). |
| 2 | Vision | PASS | 0 | NOTEs: unused `kind` param in `reorderWithin` (F2); old CSS build warning. |
| 2 | Captain | PASS | 0 | NOTEs: habits.md "?person=" sentence too wide (catches `reportHref`); habitRows header names the action, not `participantWrites.ts`; STRUCTURE.md "held at 350" wording; habitsToday aside stale; plan the habitsRead.ts split next habits mission. All folded into F2. |
| 2 | Strange | BLOCK | 1 | B1 D6 by a second path: New for Ledger, Side by side with only Ledger shows Private (F2). NOTEs: Edit page title "Edit habit" on a chore (pre-existing); Report filter chips still scroll (out of D5's scope); past chart days not tappable without saying so. |
| 1 | Strange | BLOCK | 2 | B1 selected chip off screen at 390 (D5: wrap); B2 Private switch false and auto-on for "Just Ledger" (D6: hide). NOTEs: own-chart `?person=` (F1), habit page "Mine" for a kid's chore (pre-existing, follow-up), empty-other and kid-only states checked from source only. |

## Handoff log

- 2026-11-26 — Setup done (dev branch host checked, `npm ci`). Research inline. Bryce answered D1 to D4 with the recommendations. Contracts C1, C2 written. Next: dispatch C1.
- 2026-11-26 — C1 done and committed (6e15f82). C2 dispatched.
- 2026-11-26 — C2 done and committed (b64cf66).
- 2026-11-26 — Gate pass 1: Vision PASS, Captain BLOCK 2, Strange BLOCK 2. Bryce decided D5 (chips wrap) and D6 (Private only on your own items). F1 built, committed ec4a5c5.
- 2026-11-26 — Gate pass 2: Vision PASS, Captain PASS, Strange BLOCK 1 (D6 by Side by side). F2 built, committed 95b6c20.
- 2026-11-26 — Gate pass 3: Vision PASS, Strange PASS. Renumbered to mission 88 (86 and 87 taken on main). Next: sync with main, PR, merge.

## Delivery

- **Shipped:** person chips on Manage with `?person=` (D1, D2), a kid's list reorderable by a parent and checked on the server (`canReorderListOf`), the person carried through edit, New, the chore chart and back, Whole family's one-person Manage link, the habit page's Edit link (D3), the chart sheet's Edit chore row (D4), wrapping person chips on Manage, Report and chart (D5), Private only on your own items (D6), and `refillSlots` keeping hidden and archived habits in place on any reorder. PR, merge commit and production check: see the handoff log.
- **Shipped check:** _recorded after merge_
- **Deliberate leftovers (follow-ups):**
  - The server does not enforce D6: `checkHabitInput` / `normalizeHabitInput` (`src/lib/habitInput.ts`) allow a private habit for any one person. Add "that one person is the one saving" there (Vision pass 3).
  - Move the D6 rule out of `HabitForm.tsx` into a tested pure helper when the form is split; it sits at the 350 soft cap, so its next field moves a block into its own component first (Captain, Vision).
  - Plan the `habitsRead.ts` split (406 total / 303 code) in the next habits mission (Captain).
  - The habit page subtitle says "Mine" on a kid's solo chore viewed by a parent; the edit page title says "Edit habit" on a chore (Strange, both pre-existing).
  - The Report's filter chip row still scrolls sideways on a phone (D5 covered only the person chips).
  - Older `/habits/chart?person=` deep links stay valid; a kid's Whole family one-person Manage link resolves back to their own list (harmless).
  - A manager who guessed the id of a kid's hidden private habit could move its slot in the kid's list (no leak; theoretical).
