# Mission 41: Habits & Chores, Whole family as side-by-side columns on the iPad

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-11-06 · **Updated:** 2026-11-06
**Branch:** `claude/habits-family-columns` (from `origin/main` at `89f2b78`)

## Brief

- **Goal:** on the iPad (768px and wider), the Whole family view shows one
  column per household person, side by side, left to right in a household
  order an admin sets, each column scrolling on its own and the row of
  columns swiping sideways when more people than fit. Inside a column: avatar
  and name, "3 of 7 done" and the chore streak, then rows grouped by time of
  day (Morning, Afternoon, Evening, Anytime), each a tap-to-check row. Phones
  keep today's stacked cards unchanged. Bryce shared another family app's
  screenshot as layout inspiration only (he likes its Filter icon); Marshee
  keeps its own look (DESIGN.md).
- **Done means:** the Gauntlet passes; on dev at 820x1180 (portrait) and
  1180x820 (landscape, hamburger and rail), Whole family shows 330px columns
  (2 in portrait, 3 in landscape, the next one peeking), the page itself does
  not scroll vertically, each column scrolls, the strip swipes sideways;
  rows sit under Morning / Afternoon / Evening / Anytime with Together and
  Chore tags; the Filter button shows the chips and a chip filters every
  column; the admin can drag people into order on Manage family and Whole
  family follows it; `?person=<id>` brings that person's column into view; at
  390px the view is today's stacked cards with the Together strip.
- **Out of scope:** any phone layout change; new habit fields; a per-login
  order; mission 39's dashboard quick-link tiles (it only needs C2's
  `person` parameter); calendar person order.

## Bryce's decisions (2026-11-06, this chat, after an inline mock)

1. **Together habits sit inside each participant's column**, under their
   time of day, with a small "Together" tag. One tap checks it for the
   family, as today. No strip on the iPad; the phone keeps the strip.
2. **One order for the whole household**, set by an admin by dragging on
   Settings, Manage family; saved on each person; the same everywhere
   (tablet included); new people go last.
3. **The count is "3 of 7 done" plus the chore streak flame** (today's
   numbers: `doneCountLabel(countedRows(...))`).
4. **Fixed 330px columns that swipe**; never shrink to fit all five.

Fury's calls (not asked; Bryce may overturn):
- 41a. Filter is a "Filter" button (Lucide `ListFilter`) on the wide layout
  that shows/hides the same chip row Today uses (times of day that rows use,
  then life areas); the chip filters every column. Starts hidden.
- 41b. On the wide layout, Report moves to a button beside Filter (the page
  no longer scrolls, so the bottom Report card would be out of reach). The
  card stays on phones.
- 41c. Chores mix into the time groups with a small "Chore" tag (the Habits /
  Chores split goes away on the wide layout only).
- 41d. Manage family wording: section "Family order", hint "Drag to set the
  order people appear in across Marshee, like Whole family."
- 41e. The household order also orders the other `loadHouseholdPeople`
  lists (habit pickers, vision boards), since it is one household rule.

## Research facts

- **The app is capped at 768px wide.** `<main>` in
  `src/components/AppChrome.tsx:83` is `mx-auto w-full max-w-3xl px-4`.
  Precedent for a page-driven opt-out: `data-fills-viewport`
  (`AppChrome.tsx:79-85`, `has-[[data-fills-viewport]]:pb-0`).
- **iPad widths** (CSS px): portrait 820, landscape 1180. Pinned nav only at
  1024px+ (`lg:`): rail 72px (`NAV_RAIL_WIDTH_PX`, `src/lib/appChrome.ts:69`),
  sidebar 256px (`:76`). Content after 32px padding: portrait 788; landscape
  1148 (hamburger), 1076 (rail), 892 (sidebar). 330px columns + 14px gaps:
  portrait 2 + peek, landscape rail 3 + 58px peek, sidebar 2 + peek.
- **Current view:** `src/components/HabitFamilyView.tsx` (95 lines): Together
  strip, then an auto-fit grid of `HabitFamilyColumn` cards
  (`src/components/HabitFamilyColumn.tsx`, 190 lines), grouped by kind.
  `FamilyHabitRow` (`HabitFamilyColumn.tsx:38-125`) handles every row state.
- **Order today** is creation order: `loadHouseholdPeople`,
  `src/lib/householdPeople.ts:18-24`. Callers: `habitsStatsRead.ts:129`
  (family page) and `:237`, `habitsRead.ts:259,283`, `visionsRead.ts:46`,
  `habits/participantWrites.ts:24`. `User` has no order field.
- **Time of day:** `TIMES_OF_DAY`, `TIME_OF_DAY_LABELS`, `ANYTIME_LABEL`
  (`src/lib/habitVocabulary.ts:72-89`); `TIME_ICONS`
  (`src/components/HabitFilterChips.tsx:7`). Today builds its chip options
  and filter inline (`src/components/HabitTodayList.tsx:85-103`).
- **Drag pattern:** `src/components/SortableList.tsx` (grip-only drag,
  proven on a real iPad), used by `HabitManager.tsx` and the dashboard sheet.
- **Manage family:** `src/app/(app)/settings/family/page.tsx` (admin-only via
  `requireRole("admin")`), list in `src/components/FamilyList.tsx`. Admin
  actions open with `requireRole("admin")` (`src/app/actions/usersRoles.ts`).
- **Mission 37 already merged** (PR #51, `c086abc`), so nothing waits.
- `habitsFamily.ts` is 360 lines, past the 350 soft cap: new pure helpers go
  in a new file.

## Danger register

AGENTS.md applies in full. For this mission:
- One migration, additive: `ALTER TABLE "User" ADD COLUMN "familyOrder"
  INTEGER;` (nullable, no default, no data touched). Fury reviews the SQL,
  checks `DATABASE_URL`'s host is the dev branch (`ep-hidden-pine-`) without
  printing `.env`, and applies it with `npx prisma migrate deploy`. Builders
  run no Prisma command except `npx prisma generate`.
- **The `User` table holds the family's credentials.** The new action writes
  only `familyOrder`, never any other column; no clean or reset script.
- Forbidden: `db:seed`, `db:reset`, `migrate reset`, `db push`,
  `migrate dev`. No agent edits `.env`. Production data is never written.
- Stage by explicit path; never `git add -A`.

## Gauntlet

`npx tsc --noEmit`; `npx eslint .`; `npm test`;
`TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts`;
`DATABASE_URL=postgresql://u:p@invalid.invalid:5432/none DIRECT_URL=postgresql://u:p@invalid.invalid:5432/none npm run build`;
`node ~/.claude/skills/avengers/recordcheck.mjs origin/main..HEAD`.

## Assembled

- Stark + Vision (always).
- Strange: the whole mission is a screen change on the iPad.
- Captain: a migration, a new action file, new component and lib files.
- No Banner: Fury read the files inline (facts above).

## Contracts

C1 and C2 have disjoint boundaries and run in parallel.

### C1 — Household person order, saved on `User` and set by dragging on Manage family
- **Status:** DONE (report: passes lint and tests, 1108/1108; tsc and build first failed only on missing node_modules, fixed by Fury with `npm ci`)
- **Objective:** an admin can drag household people into order on Manage
  family, it saves to `User.familyOrder`, and `loadHouseholdPeople` returns
  people in that order (unset last, then by `createdAt`).
- **Boundaries:** may touch: `prisma/schema.prisma` (the `User` model: one
  `familyOrder Int?` line with a doc comment, nothing else),
  new `prisma/migrations/20261111000000_user_family_order/migration.sql`,
  `src/lib/householdPeople.ts`, new `src/app/actions/usersOrder.ts`,
  new `src/components/FamilyOrderList.tsx`,
  `src/app/(app)/settings/family/page.tsx`,
  new `src/lib/householdOrder.ts` ( pure: validate an id list against the
  household ids) and new `src/lib/householdOrder.test.ts`.
  Must not touch: .env, any other migration, `src/components/SortableList.tsx`
  (use it as is), `src/components/FamilyList.tsx`, `src/app/actions/users.ts`,
  `src/app/actions/usersRoles.ts`, everything in C2's may-touch list.
- **Preflight note:** `prisma/schema.prisma` trips the size cap check, but STRUCTURE.md exempts the schema (as recorded in mission 38).
- **Rules:** the action opens with `requireRole("admin")`; takes `ids:
  string[]`; rejects unless the ids are exactly the current household people
  (`HOUSEHOLD_PERSON_WHERE`), no duplicates; writes `familyOrder = index` in
  one transaction, selecting/updating only `id` and `familyOrder`;
  `revalidatePath("/habits")`, `("/settings/family")`, `("/plans")`. The list
  shows active household people only (not device logins, not deactivated),
  each with `AvatarBadge` and name, saves on every reorder optimistically,
  shows an error line on failure and restores the order. Wording per 41d.
  Tablet never sees it (the page is admin-only already).
- **Verification:** the Gauntlet (without the migration applied, `prisma
  generate` only); unit tests for the id-set check (exact set passes; missing,
  extra, duplicate and device ids fail).
- **Evidence required:** gauntlet output tails; the migration SQL verbatim;
  the diff stat; test names.
- **Done criteria:** Fury applies the migration to dev, drags on dev, and
  Whole family follows.

### C2 — Wide (768px+) Whole family layout: columns by time of day, Filter, `person` parameter
- **Status:** DONE (report: tsc, eslint, 1113/1113 tests, build all pass; adds h-dvh flex chain in AppChrome for the no-page-scroll rule, Strange to confirm)
- **Objective:** at `md` (768px) and up, Whole family renders side-by-side
  330px columns per Bryce's decisions 1, 3, 4 and Fury's calls 41a to 41c;
  below `md` it renders exactly today's stacked view.
- **Boundaries:** may touch: `src/components/AppChrome.tsx` (only the
  `<main>` className, to add a page opt-out attribute that at `md:` lifts
  `max-w-3xl` and drops the bottom padding), `src/app/(app)/habits/page.tsx`,
  `src/components/HabitFamilyView.tsx`, `src/components/HabitFamilyColumn.tsx`,
  new `src/components/HabitFamilyWide.tsx` ( the strip of columns and its
  toolbar), new `src/components/HabitFamilyWideColumn.tsx`, if needed for
  size, `src/components/HabitFilterChips.tsx` (to export the shared
  option-builder and matcher), `src/components/HabitTodayList.tsx` (only to
  use that shared builder instead of its inline copy, no behaviour change),
  new `src/lib/habitsFamilyColumns.ts` ( pure: group rows by time of day,
  merge a person's Together rows) and new `src/lib/habitsFamilyColumns.test.ts`. Must not touch: `src/lib/habitsFamily.ts` (past its soft cap; types
  may be imported), `src/lib/habitsStatsRead.ts`, `src/lib/householdPeople.ts`,
  `prisma/`, any Server Action, everything in C1's may-touch list.
- **Rules:**
  - One `HabitFamilyView` keeps the single optimistic state and renders both
    layouts: the stacked one inside `md:hidden`, the wide one inside
    `hidden md:flex`. A tap in either goes through the same `toggle`.
  - Wide: a toolbar row (Filter toggle; Report link when `canManage`), the
    chip row when shown, then a horizontal strip (`overflow-x-auto`,
    scroll-snap per column, 14px gap) of `w-[330px] shrink-0` columns. The
    strip fills the rest of the viewport height (no page vertical scroll at
    820x1180 or 1180x820); each column scrolls vertically on its own
    (`overflow-y-auto`, `overscroll-contain`).
  - Column: `AvatarBadge` 44px, name, "3 of 7 done" via the existing
    `doneCountLabel(countedRows(column, together))` (vacation wording as
    today), the chore streak flame (`streakLabel(column.choreStreak,
    "days")`, only when `showStreaks`), the shout-out as today; then groups
    in `TIMES_OF_DAY` order then Anytime, each with its `TIME_ICONS` icon and
    label, empty groups hidden, "Nothing due today." when none. Together rows
    the person is on (`column.togetherIds`) appear in their group with a
    "Together" tag; chore rows carry a "Chore" tag. Rows are
    `FamilyHabitRow` (add an optional tag prop; no other change to it).
  - Filter: one chip state for all columns; options from rows across all
    columns plus Together; a chip that no longer matches anything falls back
    to All (as Today does).
  - `?person=<id>`: `page.tsx` reads it and passes `focusPersonId`; on mount
    the wide strip scrolls that column into view (`inline: "start"`) and the
    stacked view scrolls that card into view; an unknown id does nothing.
  - On the wide layout the page's bottom Report card is hidden (`md:hidden`)
    when the family view shows; Today ("Mine") is unchanged at every width.
  - Colours by job tokens only, Lucide icons only, checks stay 44px inside
    56px rows (DESIGN.md), dark mode works.
- **Verification:** the Gauntlet; unit tests for the grouping (order, Anytime
  last, empty groups dropped, Together rows merged once per participant only).
- **Evidence required:** gauntlet output tails; diff stat; test names; line
  counts of every touched component.
- **Done criteria:** Strange's screenshots at 390, 820x1180 and 1180x820
  (hamburger and rail), light and dark, show the rules above.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | BLOCKED | 3: hidden Filter keeps an invisible chip (HabitFamilyWide.tsx:39); filter-emptied column says "Nothing due today." (HabitFamilyWideColumn.tsx:71); FamilyOrderList ignores new props after add/deactivate (FamilyOrderList.tsx:16) | check+writes not one transaction (harmless); no runtime string[] guard; habitsRead.ts:281 comment still says "oldest profile first"; Together hours row cannot open its sheet (pre-existing); branch one commit behind main, sync before merge |
| 1 | Captain | BLOCKED | 2: second habit filter rule in HabitFilterChips.tsx (STRUCTURE.md PR F: reportFilterOptions/matchesReportFilter are the one rule); tag words outside habitVocabulary.ts and `together` decided by display text (habitsFamilyColumns.ts:7-8, HabitFamilyWideColumn.tsx:84) | settings page should call loadHouseholdPeople (add avatarColor, un-export HOUSEHOLD_ORDER_BY); reuse countedRows in groupColumnRows; shared familyCountText; amendments A1 to A4 drafted |
| 1 | Strange | BLOCKED | 4: hidden Filter keeps a chip (same as Vision); filter-emptied column says "Nothing due today." (same as Vision); tag text-muted on surface-2 is 4.33:1 light (HabitFamilyColumn.tsx:87); floating hamburger keeps max-w-3xl on the wide page, 206px off at 1180 (HamburgerButton.tsx:91) | chore flame unseen (no streak in dev data); Anytime has no icon; 80px FamilyList spacer gap; 41d hint over-claims; familyOrder now 0..4 on dev; dark scrollbars light (app-wide); layout, snap, column scroll, ?person, phone view, drag all verified |

## Handoff log

- 2026-11-06 — Planned with Bryce (mock inline, four answers). Mission number
  41 (40 is promised to Winnie notifications). C1 and C2 dispatched in
  parallel.
- 2026-11-06 — C1 reported DONE. This worktree had no node_modules; Fury ran `npm ci` (tsc now clean). Fury applied `20261111000000_user_family_order` to dev (host checked `ep-hidden-pine-`, SQL is the one ADD COLUMN) with `npx prisma migrate deploy`. Waiting on C2.
- 2026-11-06 — C2 reported DONE. C1 and C2 committed. Vision, Strange, Captain dispatched in parallel (read-only gates).

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** —
