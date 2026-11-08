# Mission 54: iPad landscape L6 (Forms, Settings, Manage family, Feedback)

**Project:** family-hub (Marshee)
**Status:** CONTRACTED (plan approved by Bryce 2026-11-08; Hill's Q1 to Q10 re-dispatched on Opus 5.5 at Bryce's ask, the Fable run was stopped before it answered; C1 waits for her answers)
**Started:** 2026-11-08 · **Updated:** 2026-11-08
**Branch:** `claude/ipad-landscape-l6-bfb5c4` (worktree `parallel-work-strategy-e056c5`, cut from `origin/main` at `7dc5b28`, PR #84 merged)
**Plan:** `.avengers/plans/ipad-landscape-v1.md`, step L6 (the last step): sections "Forms (every New and Edit page)" and "Settings, Profile, Login", plus the rules at the top.
**Mock:** canvas board "New habit form" (`project/HabitForm.dc.html`) on https://claude.ai/artifact/XpmoRsLuBuPUdwuRSzK25n. No board exists for Settings, Manage family or Feedback: those follow the plan's text and Hill's calls.
**Models:** Fury plans on Fable (this file's first version); build, gates and delivery run on Opus 5.5 (Bryce's rule, memory `fury-plans-on-fable-builds-on-opus`). Bryce switches the chat at each step.

Mission number: 53 (L3) is the highest on `origin/main` and no remote branch claims 54 (`git branch -r | grep 54` empty, 2026-11-08). Decision numbers used so far run through 273 (L4's 264 to 273 are the latest); this mission starts at **274**. Check `main` again before merging in case another chat took numbers.

## Brief

- **Goal:** the last pages still sitting in a 768px column on the kitchen
  iPad in landscape go wide with the L1 rule: every New and Edit form
  (habit, goal, event, task, recipe forms, import forms, profile), Settings,
  Manage family and Feedback (`/settings/feedback`). Long forms become two
  columns with a clear split and Save at the bottom right of the second
  column; short forms stay one column centered at 640px; Settings becomes
  two columns of cards; Manage family puts the family list left and Family
  order right; Feedback opens a tapped report in a right-hand panel instead
  of a sheet (decision 220).
- **Done means:** at 1180x820 with no pinned menu: New and Edit habit, New
  and Edit goal, New and Edit event and the manual recipe form (New and
  Edit) show two columns with Save bottom right of the second column;
  Settings shows two columns of cards; Manage family shows the family list
  left and Family order right; Feedback shows the report list on the left
  (about 480px) with the tapped report open on the right. At 1180 with the
  Sidebar pinned (892px of content) each page steps down on its own where
  the container rule says so. At 820 upright: two columns where a 768px
  container allows it, else one. At 375 every page reads exactly as it does
  today. Short forms (task, paste, link, photo import, profile) are one
  column centered at 640px on wide screens and unchanged on phones. Every
  sheet still opens over the viewport. No `(app)/loading.tsx` change
  stretches a page that is not wide. Gauntlet green; Vision, Strange and
  Captain PASS; the PR merges after the Gauntlet check; production shows it.
- **Out of scope:** every page L1 to L5 already made wide (dashboard,
  Calendar views, Habits & Chores views, Kitchen lists, Plans tabs, Goal
  page, recipe page); sheets of every kind (they already center at
  `md:max-w-md`; a form that lives in a sheet is not a page and is not
  touched); the login page and the recipe print page (plan: unchanged);
  new fields, new wording, new behaviour; any data change or migration;
  checking off a past day; the `TaskForm.tsx` / `EventDateTimeFields.tsx`
  date-string debt (STRUCTURE.md: migrate in one mission, not here).

## Decisions that bind this step

- **215** (the four page types, the page list and the mocks are the direction),
  **220** (Feedback opens a report in a right-hand panel on wide screens),
  **223** (reference iPad 1180x820 and 820x1180; gates test both plus 1180
  with the Sidebar), and the plan's rules 1 to 5 (opt-in attribute, containers
  round columns only, container variants never `md:` for column counts, a
  row never stretches, sheets unchanged).
- **Plan, Forms section (Bryce approved 2026-11-07):** two columns with a
  clear split, Save at the bottom right of the second column, "What" and
  "When and who" style headings only where they help. Habit: left Kind,
  Track, Name, ideas, Life area, Icon; right Build or Quit, Who, How often or
  Hours, Time of day, Carry over, Private, Save; Edit adds See stats above
  and Archive and Delete under Save. Goal: left Life area, Name, ideas, For,
  Private, Target date; right Why, Track a number (Unit, Starting at,
  Target), Save. Recipe: Title across the top; Ingredients beside Steps (two
  tall text boxes, like the recipe page); Servings, Prep, Cook, Source and
  Notes in a row below; Save. Event: left Title, All day, Starts, Ends; right
  People, Location, Notes, Save. Task, Paste, Link, Photo import, Profile:
  short forms stay one column centered at 640px.
- **Plan, Settings section:** Settings: two columns of cards, account card,
  Menu style, Manage family and Feedback links on the left; Habits and
  Chores settings, Vacation and Winnie on the right; Sign out under the left
  column. Manage family: the family list left, Family order right. Feedback:
  the report list on the left (about 480px) and the tapped report open on
  the right instead of a sheet. Profile: one column centered at 640px.
  Login: unchanged.
- **The mock (`HabitForm.dc.html`, read 2026-11-08):** hamburger row, then
  the BackLink "‹ Habits and Chores", then the `h1` "New habit", then the
  form as `grid-template-columns: repeat(2, minmax(0, 1fr))` with
  `gap: 16px 32px`, `align-items: start`. Left column: eyebrow "WHAT" (12px,
  letter-spaced, muted, semibold), Habit | Chore segmented, Track: Checks |
  Track: Hours segmented, Name, Life area chips, an "Ideas:" line, Icon grid.
  Right column: eyebrow "WHEN AND WHO", Build | Quit, Just me | Together |
  Someone else, How often (radio list), Time of day chips, Carry over a
  missed day switch, Keep private switch, then "Save habit" right-aligned.
  Equal halves; no card frames round the columns.
- **Hill decides** the content and design calls the plan leaves open
  (`.claude/agents/hill.md`), recorded below as "decided by Hill", medium
  ones listed first for Bryce at the end of the PR.

## Danger register

From AGENTS.md, absolute for every agent:
- Local dev uses the Neon `dev` branch. `.env` is a symlink to the main
  checkout's; its active `DATABASE_URL` host is `ep-hidden-pine-a` (checked
  2026-11-08). The commented `ep-hidden-surf-a` line is on Bryce's own
  checklist to delete; no agent edits `.env`.
- `npm run db:seed` and `npm run db:reset` are forbidden. No clean or reset
  script for `User`. No migration in this mission.
- The dev branch holds real family data: private. Test rows made for the
  gates are named "zz m54 ..." and removed after.
- Never `git add -A` / `git add .`; stage by explicit path;
  `git show --stat HEAD` after each commit.
- Direct pushes to `main` are blocked; branch, PR, Gauntlet green, merge.
- Shared files (`STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`, `HubNav.tsx`,
  `package.json`) get small edits only; sync with `main` right before merging.
- Manage family creates, edits and deactivates logins. The gates look at
  that page but never create, rename or deactivate a real profile; Hill
  never decides anything about logins (her "never" list).

## Gauntlet

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always).
- Strange: every page here changes visibly. Sizes: 1180x820 plain, 1180 with
  the Sidebar, 1180 with the Rail, 820x1180, 375; light and dark.
- Captain: many files across four areas, new `loading.tsx` scope questions
  (a wide `loading.tsx` must not cover a narrow route), `HabitForm.tsx` at
  the 350 soft cap and `GoalForm.tsx` at 334, STRUCTURE.md "Wide pages"
  amendments.
- Banner: dispatched 2026-11-08 (read-only brief of every form, Settings,
  Manage family and Feedback file). Fury did not read the components inline.
- Hill: one design batch after Banner's brief.

## Fury's pre-dispatch checklist

See `~/.claude/skills/avengers/templates/MISSION.md`; applied per contract
below. Preflight: `node ~/.claude/skills/avengers/preflight.mjs <this file> <contract-id>`.

## Banner's brief (2026-11-08, the facts the contracts rest on)

- No L6 page has `data-page-width` yet. Every form root is a `<div className="py-2">` with a `BackLink` first (`/habits/manage` "Manage" for habits; `/plans?view=goals` "Goals" or the goal page for goals; `/calendar` "Calendar" for events and tasks; "Add recipe" or the recipe title for recipe forms; `/settings` "Settings" for Profile, Manage family and Feedback). Settings itself has no BackLink (a drawer destination).
- Forms: `HabitForm.tsx` 350 lines (the soft cap), root `<form className="flex flex-col gap-4">` at :191, fields in the plan's left-then-right order already (Kind, Track, Name, ideas, Life area, ideas, Icon, Build or Quit, Who, participants, How often or Hours, Time of day, Carry over, Private, error, Save, then Edit's hr, Archive or Restore, Delete at :320-347). "See stats" is a link in `habits/[id]/edit/page.tsx:31-37`, above the h1, not in the form. `GoalForm.tsx` 334, form at :136, own `Field` (:319) and chip classes; order Life area, Name, ideas, For, Keep private, Target date, Why, Track a number (+ Unit, Starting at and Target), error, Save (`w-full`). `EventForm.tsx` 213, form :139: Title, All day, `EventDateTimeFields`, `EventPeopleField`, Location, Notes, error, Save. `TaskForm.tsx` 233 (short). `RecipeForm.tsx` 185, form :56: Title, Ingredients (rows 8), Steps (rows 8), a `flex gap-3` row of Servings, Prep time, Cook time, Source link, Notes (rows 3), error, Save (`w-full`); used by `new/manual`, `[id]/edit`, and the three import components after extraction (`PasteImportForm.tsx:50`, `LinkImportForm.tsx:53`, `PhotoImportForm.tsx:98`). No form in scope renders a sheet.
- Calendar New event, New task and Edit are pages (`calendar/new`, `calendar/new/task`, `calendar/[id]/edit`); the task edit lives in `TaskDetailSheet` (a sheet, out of scope).
- Profile is `/profile` (`src/app/(app)/profile/page.tsx`), not under Settings. `ProfileForm.tsx` 271 is a `div` holding an identity card, two sheet-opening buttons, `ChangePasswordForm` and its `TitleSheet` and `RadioSheet` (:130, :142) as siblings inside its root.
- Settings (`settings/page.tsx` 107): h1, `SettingsAccountCard`, `NavModeSetting` (holds a `RadioSheet` inside its own wrapper, `NavModeSetting.tsx:57-65`), Manage family link, Feedback link (admin), `HabitsChoresSettings` + `VacationCard` (accounts), `WinnieSettings` (admin), then Sign out: a `<form action={logout}>` for accounts or `AdminPasswordSheet` for the tablet (its `fixed inset-0` overlay is inline, `AdminPasswordSheet.tsx:40`).
- Manage family (`settings/family/page.tsx` 54): h1, intro, `FamilyList` (149 lines: the `ul`, "Set up a tablet login", an `h-20` spacer, `FloatingAddButton`, then `CreatePersonSheet`, `CreateDeviceSheet`, `PersonManageSheet` all inside its root div), then h2 "Family order", intro, `FamilyOrderList` (63, a `SortableList`).
- Feedback (`settings/feedback/page.tsx` 42): h1, intro, `PageTabs` New / Done, `FeedbackList` (83: error, `EmptyState`, `ul` of `FeedbackRow`, then `FeedbackDetailSheet` as the root's last child). `FeedbackRow` (65) wraps the row in `SwipeActions` (Mark done or Mark new, then Delete). `FeedbackDetailSheet` (98): fixed overlay, dialog `md:max-w-lg`, header (name, time, ×), message, Page / Device `dl`, screenshot `img` from `/api/feedback/{id}/screenshot`.
- Loading files: `habits/`, `plans/` and `calendar/` `loading.tsx` are already wide (they cover the habit, goal and calendar forms, with a list-shaped skeleton). `recipes/[id]/loading.tsx` is wide and covers `[id]/edit` with the recipe body shape (its comment says edit waits for L6). Settings, Manage family, Feedback, Profile and `recipes/new/*` (chooser plus the four import pages) fall to the shared narrow `(app)/loading.tsx`, so they would flash narrow then jump wide once their pages go wide (Strange flagged exactly that in L5).
- `createPortal` precedent: `NavDrawer.tsx`, `DashboardWidgetList.tsx`, `CalendarHeader.tsx`, `useScheduleMonthTitle.ts`.
- `gridClasses.ts` exports `YEAR_GRID_CLASSES` and `HABITS_DAY_GRID_CLASSES`; `SkeletonPage({ children?, wide? })` puts the attribute on its root. `splitColumns.ts` exports `COLUMN_MIN_WIDTH_PX = { 2: 768, 3: 1024 }`, `columnCountFor`, `splitByWeight`; `useContainerWidth(ref)` returns 0 before the first measure.
- Still narrow after L6, on purpose: `/lists` (coming soon), `/login`, the recipe print page.

## Fury's structural calls (Fable, 2026-11-08)

1. **Long forms are one DOM in a real two-column grid; no column dissolve.** Every long form already renders its fields in the plan's left-then-right order, so two column divs inside a `grid-cols-1 @min-[48rem]:grid-cols-2` grid stack on a phone in today's order with no `order-N` tricks. The `<form>` itself is the `@container` (it holds no sheet; rule 1 is kept). Class strings live once in `src/lib/gridClasses.ts` (A-L3-3's home; the edit skeleton mirrors one of them): `FORM_GRID_CLASSES` ("grid grid-cols-1 gap-y-4 @min-[48rem]:grid-cols-2 @min-[48rem]:items-start @min-[48rem]:gap-x-8"), `FORM_COLUMN_CLASSES` ("flex min-w-0 flex-col gap-4"), `FORM_SPAN_CLASSES` ("@min-[48rem]:col-span-2", the recipe title and its meta row), `FORM_SAVE_WIDE_CLASSES` (the Save button's wide look, per Hill Q2), `FORM_EYEBROW_CLASSES` (per Hill Q1, `hidden ... @min-[48rem]:block`), `TWO_COLUMN_CLASSES` ("grid grid-cols-1 @min-[48rem]:grid-cols-2 @min-[48rem]:items-start @min-[48rem]:gap-x-8", no row gap: Settings and Manage family, whose cards carry their own margins) and `NARROW_PAGE_CLASSES` ("w-full max-w-[40rem]", plus `mx-auto` if Hill Q3 says centered). Each is a whole literal so the Tailwind scan finds it; `TWO_COLUMN_CLASSES` and `FORM_GRID_CLASSES` share their column part and the comment says they change together.
2. **The error line and Save sit at the end of the right column.** On a phone that is where they are today (last). The right column of a goal form is shorter than the left; Save then sits beside the Target date rather than under everything, as the mock draws for the habit form.
3. **`HabitForm.tsx` gets its split with the change.** The Edit-only block (hr, Archive or Restore, the archive hint, Delete; lines 320 to 347) moves to new `src/components/HabitEditActions.tsx` with props `{ initial: { id, archived }, pending, run }`, so the form stays under 350 after the grid markup. DESIGN.md's line that `HabitForm` is the one New and Edit form still holds (the actions are rendered by it, in its right column).
4. **Short pages (task, paste, link, photo, the Add recipe chooser, Profile) are wide pages with a 40rem cap on their content**, not pages left at the old 768 cap: rule 1's end state is every signed-in page wide, and a wide `loading.tsx` must only cover wide routes (A-L4-4), which is what lets `recipes/new/loading.tsx`, `profile/loading.tsx` and `settings/loading.tsx` exist. The cap (`NARROW_PAGE_CLASSES`) wraps the page's content under its root. The three import components put the cap on their input step only and render the extracted `RecipeForm` at full width ("until they swap to the full recipe form", plan), so their page title and BackLink stay put when the form appears (Hill Q3 decides centered or left).
5. **Settings: a container round two columns, and the two sheets portal to `document.body`.** The left column holds `NavModeSetting` (its `RadioSheet`) and, on the tablet, `AdminPasswordSheet` (its overlay); rule 1 forbids a container round either, and STRUCTURE.md's own remedy is "keep sheets outside the container or portal them". Both sheets render only after a tap, so `createPortal(<sheet/>, document.body)` needs no server branch (precedent: `NavDrawer`, `DashboardWidgetList`). This adds nothing to the known-exceptions list. Phones keep today's order (Sign out last) through the column dissolve (A-L5-2: a fixed set of eight sections, `@max-[48rem]:contents` on the column divs, `order-N` on the children, the order written once in the page comment); on wide, Sign out sits under the left column as the plan says.
6. **Manage family: `FamilyList` owns the two columns.** The page hands it the Family order block as an `aside` prop (heading, intro, `FamilyOrderList`), and `FamilyList` renders `<div className="@container"><div className={TWO_COLUMN_CLASSES}>` with the list and the tablet button left and `aside` right, then the `h-20` spacer, the `FloatingAddButton` and the three sheets as the container's siblings. The + is bottom right from `md` with no further change (A-L3-2). On a phone the spacer now sits under Family order instead of between the list and Family order (the order list's last row was never clear of the +; Hill Q9).
7. **Feedback picks its layout from its measured width** (the Meal plan's pattern, STRUCTURE.md rule 2 "Measured column counts"): `FeedbackList` measures a wrapper that holds the list and, on wide, the panel, with `useContainerWidth`; `wide = width >= COLUMN_MIN_WIDTH_PX[n]` (n per Hill Q6; the JavaScript home of the threshold, no number in the component). Narrow renders exactly today's list and sheet. Wide renders `grid-cols-[30rem_minmax(0,1fr)] gap-x-8 items-start`: the list left, and right a panel card showing the open report through new `FeedbackDetailBody.tsx` (the sheet's header, message, `dl` and screenshot, extracted so the sheet and the panel share one markup; the sheet keeps its focus and Escape code) or Hill's empty words. The panel is `sticky` at `useHamburgerRowHeight() + 8` so it stays in view while a long list scrolls (one home for the dimension; F4's pattern). No sheet renders on wide. The open report is looked up in `optimisticItems`, not `items`, so a swipe that moves or deletes the open report empties the panel at once. Known cost: a hard reload paints the narrow layout first, as on the Kitchen lists.
8. **Loading files.** New `settings/loading.tsx`, `profile/loading.tsx` and `kitchen/cooking/recipes/new/loading.tsx` render `<SkeletonPage wide />` (every route under each is wide after this mission). New `kitchen/cooking/recipes/[id]/edit/loading.tsx` renders a form-shaped wide skeleton with `FORM_GRID_CLASSES`, and `[id]/loading.tsx` drops its "edit inherits this" comment. The habit, goal and calendar forms keep their folders' wide skeletons (list-shaped; older, noted). The shared `(app)/loading.tsx` stays narrow for `/lists` and `/login`.
9. **No new `md:` screen breakpoints.** Every column count here is a container variant or a measured width.

## Hill's batch (Q1 to Q10; Fury's recommendation first; Bryce can overturn any)

- **Q1 Eyebrow labels.** Which forms get the mock's small uppercase group labels on wide, and the words. Rec: Habit "What" / "When and who" (the mock); Goal "The goal" / "Why and how to track it"; Event "What and when" / "Who and where"; Recipe none (Ingredients and Steps are their own labels). Wide only (`hidden @min-[48rem]:block`), so phones are unchanged.
- **Q2 Save on wide.** The mock: hugging its text, right-aligned at the foot of the second column (`@min-[48rem]:self-end @min-[48rem]:w-auto @min-[48rem]:px-8`). Alternative: full column width. Rec: the mock. Phones keep the full-width button. Same rule for "Add goal", "Save changes", "Save recipe", "Add event".
- **Q3 Short pages: centered or left.** The plan says "one column centered at 640px". Left-aligned at 640 keeps the BackLink and title at the same left edge as every other wide page, and lets the import pages keep their title still when the full recipe form appears below it at full width. Rec: left-aligned.
- **Q4 Recipe form below Ingredients and Steps.** (a) the plan's words: Servings, Prep, Cook, Source and Notes in one row across both columns; (b) left column Ingredients, then the Servings / Prep / Cook row, then Source; right column Steps, then Notes, then Save (rows stay about 558px, rule 3); (c) Ingredients and Steps, then a spanning row Servings / Prep / Cook / Source, then Notes spanning. Rec: (b).
- **Q5 Recipe text boxes on wide.** Keep 8 rows, or let the two tall boxes use the room (about 14 rows: `@min-[48rem]:min-h-[22rem]`). Rec: taller.
- **Q6 Feedback panel threshold.** From a 768px container (the panel is about 292px at 820 upright and 380px with the Sidebar) or from 1024px (panel 596 to 636px; upright and the Sidebar keep today's sheet). Rec: 1024 (`COLUMN_MIN_WIDTH_PX[3]`).
- **Q7 Feedback panel with nothing tapped.** Words for the empty panel, and whether the first report opens by itself. Rec: "Tap a report to read it here." and nothing opens by itself.
- **Q8 Feedback selected row and panel look.** Rec: the open row gets `aria-current="true"` and `border-accent`; the panel is a `rounded-2xl border border-line bg-surface p-4` card with the same header as the sheet minus the × (tapping another row swaps it; there is nothing to close).
- **Q9 Manage family phones.** The 80px spacer moves under Family order, so the + clears the order list's last row and the gap between the people list and "Family order" goes. Phones change by that much. Rec: yes.
- **Q10 Settings columns from 768px** (820 upright and the Sidebar get two columns of about 380px cards) or from 1024px. Rec: 768 (a card is a phone-width row).

## Hill's decisions (Hill on Opus 5.5, 2026-11-08; Bryce can overturn any)

Numbers 274 to 283 (re-check `main` before merging). Medium ones first for Bryce: 277, 274.

- **274 (Q1, medium):** eyebrows, wide only, in the house label style (typed in sentence case, shown uppercase): Habit "What" / "When and who"; Goal "What and when" / "Why and how to track it" (changed from Fury's "The goal"); Event "What and when" / "Who and where"; Recipe none.
- **275 (Q2, high):** Save on wide hugs its words at the foot of the second column, right-aligned, on every form. Phones keep the full-width button. Words stay today's ("Save", not the mock's "Save habit").
- **276 (Q3, high, changed from Fury's left-aligned):** short pages are centered at 640px. BackLink, title, intro and form move as one centered block. On the three import pages the block stays centered until the full recipe form appears, then BackLink, title and form all use the full width.
- **277 (Q4, medium, changed from Fury's (b)):** recipe form: Title across the top, Ingredients beside Steps, then one row across both columns: Servings, Prep time and Cook time about 7rem each, then Source link and Notes sharing the rest 2 to 3, top aligned, Notes keeping 3 rows. Error and Save under that row at the foot of the second column.
- **278 (Q5, high):** the two recipe boxes are about 14 rows on wide (`@min-[48rem]:min-h-[22rem]`), still drag-resizable. Phones keep 8 rows.
- **279 (Q6, high):** Feedback's panel starts at a 1024px container (`COLUMN_MIN_WIDTH_PX[3]`); upright and with the Sidebar, today's sheet opens.
- **280 (Q7, high):** the empty panel says "Tap a report to read it here." (one centered, muted line); nothing opens by itself. A tab with no reports has no panel: today's `EmptyState` alone.
- **281 (Q8, high):** the open row gets `aria-current="true"` and `border-accent`; the panel is a `rounded-2xl border border-line bg-surface p-4` card with the sheet's header minus the ×, never taller than the screen under its sticky top, scrolling inside itself.
- **282 (Q9, high):** Manage family's 80px spacer moves under Family order on phones. (Hill's note: `<main>`'s 96px bottom padding is what clears the +.)
- **283 (Q10, high):** Settings has two columns from a 768px container (`@min-[48rem]:`). On the tablet login, which has nothing for the right column, its cards simply stay on the left.

These supersede the matching words in "Fury's structural calls" (call 4's left-aligned cap; call 7's open question on the threshold). Call 4 amended: `NARROW_PAGE_CLASSES` is centered and wraps the page's whole content, header included.

## Contracts (one Stark dispatch each)

Order: C1 alone first (small; every other contract imports its constants). Then C2, C3 and C4 in parallel (disjoint files). Then C5 (Fury) after the gates.

### C1 - shared class strings and loading files
- **Status:** DONE (Stark; Fury re-ran: lint exit 0; `git ls-tree` shows 13 tracked `loading.tsx` before this contract, so the count is 17, and the "12 today" below was Fury's miscount from Banner's brief; tsc's only errors were stale generated types in `.next` for the old `recipes/page` route, cleared with `next typegen` and by removing `.next/dev/types`)
- **Boundaries:** may touch: `src/lib/gridClasses.ts`, `src/app/(app)/kitchen/cooking/recipes/[id]/loading.tsx` (one comment line); may create (new): new `src/app/(app)/settings/loading.tsx`, new `src/app/(app)/profile/loading.tsx`, new `src/app/(app)/kitchen/cooking/recipes/new/loading.tsx`, new `src/app/(app)/kitchen/cooking/recipes/[id]/edit/loading.tsx` · must not touch: `src/app/(app)/loading.tsx`, `src/components/Skeleton.tsx`, `src/components/`, `package.json`, `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`, `.env`
- **Spec:** the seven constants of structural call 1 with one comment each (whole literals), with these final strings: `FORM_SAVE_WIDE_CLASSES = "@min-[48rem]:w-auto @min-[48rem]:self-end @min-[48rem]:px-8"`, `FORM_EYEBROW_CLASSES = "hidden text-xs font-semibold uppercase tracking-wide text-muted @min-[48rem]:block"`, `NARROW_PAGE_CLASSES = "mx-auto w-full max-w-[40rem]"`. Three `<SkeletonPage wide />` loading files (copy `(browse)/loading.tsx`'s shape, under 10 lines each). The edit skeleton: root `<div className="py-2" data-page-width="wide" role="status" aria-label="Loading">`, a `SkeletonHeader`, then `<div className="@container"><div className={FORM_GRID_CLASSES}>` (a plain div, not a form: the grid's variants need a container ancestor) with a tall `SkeletonBlock` in each of two `FORM_COLUMN_CLASSES` divs; under 30 lines. No em or en dashes.
- **Verification:** `npx tsc --noEmit`, `npm run lint` exit 0; `find "src/app/(app)" -name loading.tsx | wc -l` is 16 (12 today plus 4).
- **Evidence required:** the constants as written; the `find` output; `git status --short`.
- **Done criteria:** Vision reads the four files; Strange sees the edit skeleton wide from first paint.

### C2 - habit and goal forms
- **Status:** DONE (Stark; `npm test` 1443 pass; HabitForm 329, GoalForm 349, HabitEditActions 52; browser sizes wait for Strange)
- **Boundaries:** may touch: `src/components/HabitForm.tsx`, `src/components/GoalForm.tsx`, `src/app/(app)/habits/new/page.tsx`, `src/app/(app)/habits/[id]/edit/page.tsx`, `src/app/(app)/plans/goals/new/page.tsx`, `src/app/(app)/plans/goals/[id]/edit/page.tsx`; may create (new): new `src/components/HabitEditActions.tsx` · must not touch: `src/components/HabitFormFields.tsx`, `src/components/HabitScheduleField.tsx`, `src/components/HabitHoursFields.tsx`, `src/components/ParticipantPicker.tsx`, `src/components/HabitIconPicker.tsx`, `src/components/IdeaChips.tsx`, `src/components/ToggleSwitch.tsx`, `src/lib/gridClasses.ts`, `src/lib/habitVocabulary.ts`, `src/lib/goalVocabulary.ts`, `src/app/actions/`, `package.json`, `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`, `.env`
- **Spec:** the four page roots get `data-page-width="wide"`. `HabitForm`: `<form className="@container" ...>` holding `<div className={FORM_GRID_CLASSES}>` with two `FORM_COLUMN_CLASSES` divs: left Kind, Track, Name, chore ideas, Life area, habit ideas, Icon; right Build or Quit, Who, participants, Hours or How often, Time of day, Carry over, Private, error, Save (`${BUTTON_PRIMARY} ${FORM_SAVE_WIDE_CLASSES}`), then `<HabitEditActions>` when editing. Eyebrows per decision 274 as the first child of each column (`<p className={FORM_EYEBROW_CLASSES}>What</p>`). `HabitEditActions.tsx`: the moved block, same markup and classes, "use client", under 60 lines. `GoalForm`: same frame; left Life area, Name, ideas, For, Keep private, Target date; right Why, Track a number, Unit / Starting at / Target, error, Save (keep `w-full` and add `FORM_SAVE_WIDE_CLASSES`). Rewrite each component's header comment for the two columns and the container (and say why the form is the container: it holds no sheet). Each file under 350 lines. No em or en dashes.
- **Verification:** `npx tsc --noEmit`, `npm run lint`, `npm test` exit 0; `wc -l` of the three components.
- **Evidence required:** the tails; line counts; the two grids' JSX (the column openers, 6 lines each); `git status --short`.
- **Done criteria:** Strange measures two columns at 1180, 820 and with the Sidebar, one at 375 in today's order; Save bottom right of the second column on wide, full width on the phone; Edit shows Archive and Delete under Save.

### C3 - event, task, recipe and import forms; Profile
- **Status:** DONE (Stark; `npm test` 1443 pass; Fury caught `@container` and the grid on one element in `RecipeForm`, an inert grid since a container query measures an ancestor; fixed before commit; browser sizes wait for Strange)
- **Boundaries:** may touch: `src/components/EventForm.tsx`, `src/components/RecipeForm.tsx`, `src/components/PasteImportForm.tsx`, `src/components/LinkImportForm.tsx`, `src/components/PhotoImportForm.tsx`, `src/app/(app)/calendar/new/page.tsx`, `src/app/(app)/calendar/new/task/page.tsx`, `src/app/(app)/calendar/[id]/edit/page.tsx`, `src/app/(app)/kitchen/cooking/recipes/new/page.tsx`, `src/app/(app)/kitchen/cooking/recipes/new/manual/page.tsx`, `src/app/(app)/kitchen/cooking/recipes/new/paste/page.tsx`, `src/app/(app)/kitchen/cooking/recipes/new/link/page.tsx`, `src/app/(app)/kitchen/cooking/recipes/new/photo/page.tsx`, `src/app/(app)/kitchen/cooking/recipes/[id]/edit/page.tsx`, `src/app/(app)/profile/page.tsx` · must not touch: `src/components/TaskForm.tsx`, `src/components/EventDateTimeFields.tsx`, `src/components/EventPeopleField.tsx`, `src/components/ProfileForm.tsx`, `src/components/TaskDetailSheet.tsx`, `src/components/CalendarSheets.tsx`, `src/lib/gridClasses.ts`, `src/app/actions/`, `package.json`, `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`, `.env`
- **Spec:** every listed page root gets `data-page-width="wide"`. Long forms: `EventForm` left Title, All day, `EventDateTimeFields`; right `EventPeopleField`, Location, Notes, error, Save; `RecipeForm` per decisions 277 and 278: one DOM in today's order inside `FORM_GRID_CLASSES` (no column divs): Title in a `FORM_SPAN_CLASSES` wrapper; Ingredients; Steps (both textareas gain `@min-[48rem]:min-h-[22rem]`, `rows={8}` stays); then a `FORM_SPAN_CLASSES` wrapper `flex flex-col gap-4 @min-[48rem]:flex-row @min-[48rem]:items-start` holding the Servings / Prep / Cook `flex gap-3` row (`@min-[48rem]:shrink-0`, each field `@min-[48rem]:w-28 @min-[48rem]:flex-none`), Source link (`@min-[48rem]:min-w-0 @min-[48rem]:flex-[2]`) and Notes (`@min-[48rem]:min-w-0 @min-[48rem]:flex-[3]`; `Field` already takes `className`); then a `@min-[48rem]:col-start-2` wrapper `flex flex-col gap-4` holding the error and Save (keep `w-full`, add `FORM_SAVE_WIDE_CLASSES`). The form is the `@container`. Eyebrows per decision 274 (Event only in this contract; Recipe has none). Short pages (decision 276): `calendar/new/task`, the chooser `recipes/new` and `profile` wrap everything under the root (BackLink, h1, intro, the component) in `<div className={NARROW_PAGE_CLASSES}>`; the `manual`, `calendar/new`, `calendar/[id]/edit` and `recipes/[id]/edit` pages are not capped. The three import pages hand their BackLink and any title to the import component as a new `header: React.ReactNode` prop; each import component renders one outer `<div className={extracted ? undefined : NARROW_PAGE_CLASSES}>` holding `{header}` and then whichever branch (input step or the extracted `RecipeForm`), so the header is above both and the cap lifts when the full form appears, with one comment line why. Update the header comments. Each file under 350 lines. No em or en dashes.
- **Verification:** `npx tsc --noEmit`, `npm run lint`, `npm test` exit 0.
- **Evidence required:** tails; `git status --short`; the recipe grid's JSX; `wc -l` of the five components.
- **Done criteria:** Strange: Event two columns at 1180, 820, Sidebar, one at 375; recipe form Ingredients beside Steps at 1180 and 820, Hill's Q4 layout below; task, paste, link, photo, chooser and Profile at most 640px wide on wide screens and unchanged at 375; after a paste extraction the full form is two columns; Profile's two sheets open on the viewport.

### C4 - Settings, Manage family, Feedback
- **Status:** DONE (Stark; tsc and lint exit 0, `npm test` 1443 pass; settings/page 143, FamilyList 166, FeedbackList 118, FeedbackDetailBody 70; columns level via `@min-[48rem]:[&>:first-child>*]:mt-0` on the column divs, and the sticky panel under `<main>`, both for Strange to prove)
- **Boundaries:** may touch: `src/app/(app)/settings/page.tsx`, `src/components/NavModeSetting.tsx`, `src/components/AdminPasswordSheet.tsx`, `src/app/(app)/settings/family/page.tsx`, `src/components/FamilyList.tsx`, `src/app/(app)/settings/feedback/page.tsx`, `src/components/FeedbackList.tsx`, `src/components/FeedbackRow.tsx`, `src/components/FeedbackDetailSheet.tsx`; may create (new): new `src/components/FeedbackDetailBody.tsx` · must not touch: `src/components/RadioSheet.tsx`, `src/components/SettingsAccountCard.tsx`, `src/components/HabitsChoresSettings.tsx`, `src/components/VacationCard.tsx`, `src/components/WinnieSettings.tsx`, `src/components/FamilyOrderList.tsx`, `src/components/SortableList.tsx`, `src/components/CreatePersonSheet.tsx`, `src/components/CreateDeviceSheet.tsx`, `src/components/PersonManageSheet.tsx`, `src/components/FloatingAddButton.tsx`, `src/components/SwipeActions.tsx`, `src/components/PageTabs.tsx`, `src/lib/feedbackRead.ts`, `src/lib/gridClasses.ts`, `src/lib/splitColumns.ts`, `src/lib/useContainerWidth.ts`, `src/app/actions/`, `package.json`, `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`, `.env`
- **Spec:** Settings per structural call 5 (threshold per Q10; `h1` above the container; left column order-1 account card, order-2 Menu style, order-3 Manage family, order-4 Feedback, order-8 Sign out; right order-5 Habits & Chores, order-6 Vacation, order-7 Winnie; column divs `@max-[48rem]:contents`; the page comment carries the phone order and the wide split; the card components do not take a `className`, so each child is a plain `order-N` wrapper div in the page; the two columns start level on wide, done from the page's wrappers (for example `@min-[48rem]:[&>*]:mt-0` on the first wrapper of each column), never by editing a card). `NavModeSetting` and `AdminPasswordSheet`: the open sheet or overlay rendered through `createPortal(..., document.body)` with one comment line (STRUCTURE.md Wide pages rule 1). Manage family per structural call 6 (`FamilyList` gains `aside: React.ReactNode`; the page passes the h2, intro and `FamilyOrderList`; the heading classes unchanged). Feedback per structural call 7 and decisions 279 to 281 (`wide = width >= COLUMN_MIN_WIDTH_PX[3]`; `FeedbackDetailBody` holds the shared markup, its `onClose` prop optional and the × drawn only when given; the sheet composes it with `onClose`, the panel without; `FeedbackRow` gains `selected?: boolean`, which sets `aria-current="true"` and `border-accent`; the row list and the panel sit in the measured wrapper, the sheet outside it; the panel is a `sticky` `rounded-2xl border border-line bg-surface p-4` card at `top: useHamburgerRowHeight() + 8` from `@/lib/appChrome`, with `overflow-y-auto` and an inline `maxHeight: calc(100dvh - (top + 16)px)`, with a one-line comment; with nothing open it shows one centered muted line, "Tap a report to read it here."; when the tab has no reports the panel does not render and today's `EmptyState` shows alone, inside the same measured wrapper so it stays mounted). Keep the `feedback/page.tsx` root wide; the tabs stay above the list. Each file under 350 lines. No em or en dashes.
- **Verification:** `npx tsc --noEmit`, `npm run lint`, `npm test` exit 0; `grep -n "createPortal" src/components/NavModeSetting.tsx src/components/AdminPasswordSheet.tsx` shows one use each; `grep -n "items.find" src/components/FeedbackList.tsx` is empty (the open report comes from `optimisticItems`).
- **Evidence required:** tails; the greps; `git status --short`; `wc -l` of the touched components; the Settings grid JSX (column openers).
- **Done criteria:** Strange: Settings two columns at 1180, 820, Sidebar, today's order at 375, Menu style's sheet on the viewport (and the tablet Sign out sheet, if a tablet login exists on dev); Manage family list left and order right at 1180, + bottom right, every sheet on the viewport, drag still reorders; Feedback at 1180 shows the list at 480px and the tapped report in the right panel with no sheet, the panel stays in view while the list scrolls, a swipe Mark done on the open report empties the panel; at 820 and with the Sidebar (Q6 = 1024) the sheet opens as today; 375 unchanged.

### C5 - records (Fury, after the gates)
- **Status:** PENDING
- **Boundaries:** `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`, this file, `.avengers/plans/ipad-landscape-v1.md`. Small edits; sync with `main` right before merging.
- **Spec:** STRUCTURE.md "Wide pages": the L6 pages and their containers (forms: the `<form>` is the container; Settings; Manage family; Feedback measured); the portal remedy as used (Settings' two sheets); the Settings column dissolve instance; `FORM_*`, `TWO_COLUMN_CLASSES`, `NARROW_PAGE_CLASSES` in the shared-strings list; the four loading files; "New and Edit stay narrow until L6" and "edit waits for L6" lines retired; the Size watch rows (`HabitForm.tsx` after the split, `FeedbackList.tsx`). DESIGN.md: one bullet for wide forms, Settings, Manage family and Feedback (decision 220 and Hill's calls). CLAUDE.md: Current status (L6 done, the plan complete) and an "L6 iPad check" on Bryce's checklist. Plan: L6 delivered, decisions 274 onward pointing here. Then `node ~/.claude/skills/avengers/recordcheck.mjs` over the range.

## Fix batch 1 (after Vision and Captain pass 1, before Strange)

### F1 - gate blockers and the cheap notes
- **Status:** DONE (commit `59d3201`; Vision and Captain pass 2 PASS)
- **Boundaries:** may touch: `src/components/FeedbackList.tsx`, `src/app/(app)/settings/feedback/page.tsx`, `src/app/(app)/settings/page.tsx`, `src/lib/appChrome.ts` (the Dependents comment only) · must not touch: `src/components/FeedbackRow.tsx`, `src/components/FeedbackDetailBody.tsx`, `src/components/FeedbackDetailSheet.tsx`, `src/components/PageTabs.tsx`, `src/components/MealPlanList.tsx`, `src/lib/gridClasses.ts`, `package.json`, `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`, `.env`
- **Spec:** (1) `feedback/page.tsx`: `<FeedbackList key={status} ...>`, with one comment line: the tabs are links that keep this component mounted, and an open report must not carry over to the other tab (decision 280). (2) `settings/page.tsx`: on both column divs `@min-[48rem]:[&>:first-child>*]:mt-0` becomes `@min-[48rem]:[&>:first-child>*]:mt-4`; update any comment that says the margin is zeroed. (3) `appChrome.ts`: add `FeedbackList.tsx` (sticky panel) and `MealPlanList.tsx` (`scrollMarginTop`) to the Dependents comment; comment text only. (4) `FeedbackList.tsx`: the panel `aside` gets `key={opened?.id ?? "empty"}` so a newly opened report starts at the top and never shows the previous screenshot; the wide grid classes apply only when `optimisticItems.length > 0`, so the `EmptyState` is alone across the page (decision 280). No em or en dashes.
- **Verification:** `npx tsc --noEmit`, `npm run lint`, `npm test` exit 0; `grep -n "mt-0" "src/app/(app)/settings/page.tsx"` is empty; `grep -n "FeedbackList\|MealPlanList" src/lib/appChrome.ts` shows both.
- **Evidence required:** tails with counts; the greps; the changed JSX lines; `git status --short`.
- **Done criteria:** Vision and Captain pass 2; Strange measures a 16px gap under the Settings title at every wide size, and the Feedback tab switch opening nothing.

## Fix batch 2 (after Strange pass 1)

Hill is not used from here on (Bryce, 2026-11-08: bypass permissions mode only). Hill's calls 274 to 283 stand; Bryce chose to keep them. New content or design calls go to Bryce.

**Decision 284 (Bryce, 2026-11-08):** on wide screens, Edit habit's Archive (or Restore) and Delete hug their words and line up on the right under Save. The caption under Archive stays as it is. The phone stays full width.

### F3 - Edit habit's Archive and Delete hug their words (decision 284)
- **Status:** PENDING
- **Boundaries:** may touch: `src/components/HabitEditActions.tsx` · must not touch: `src/components/HabitForm.tsx`, `src/lib/gridClasses.ts`, `package.json`, `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`, `.env`
- **Spec:** add `FORM_SAVE_WIDE_CLASSES` from `@/lib/gridClasses` to the Restore, Archive and Delete buttons, so all three match Save (the block renders as a fragment straight into `HabitForm`'s flex column, inside the form's `@container`). Do not retype the string. The `hr` and the caption stay unchanged. Update the doc comment only if it now says something untrue. No em or en dashes.
- **Verification:** `npx tsc --noEmit`, `npm run lint`, `npm test` exit 0 (real exit codes).
- **Evidence required:** tails with counts; the changed lines; `git status --short`.
- **Done criteria:** Strange pass 2 measures all three hugging at the right edge of the second column at 1180, full width at 375.

### F2 - skeleton shapes and the Feedback row cap
- **Status:** DONE (commit `3e3aefc`; tsc, lint, 1443 tests)
- **Boundaries:** may touch: `src/app/(app)/profile/loading.tsx`, `src/app/(app)/kitchen/cooking/recipes/new/loading.tsx`, `src/app/(app)/kitchen/cooking/recipes/new/manual/loading.tsx` (new), `src/app/(app)/settings/loading.tsx`, `src/app/(app)/settings/feedback/loading.tsx` (new), `src/components/FeedbackList.tsx` · must not touch: `src/components/Skeleton.tsx`, `src/lib/gridClasses.ts`, `src/lib/containerWidth*`, `src/components/FeedbackRow.tsx`, `src/components/HabitEditActions.tsx`, `src/app/(app)/kitchen/cooking/recipes/[id]/edit/loading.tsx`, `package.json`, `STRUCTURE.md`, `DESIGN.md`, `CLAUDE.md`, `.env`
- **Spec:** (1) `profile/loading.tsx` and `recipes/new/loading.tsx`: root `<div className="py-2" data-page-width="wide" role="status" aria-label="Loading">`, inside it `<div className={NARROW_PAGE_CLASSES}><SkeletonHeader /><SkeletonList /></div>`; comment: a short page is wide and centered at 40rem (decision 276). (2) New `recipes/new/manual/loading.tsx`: `export { default } from "../../[id]/edit/loading";` with a one-line comment that the manual form is the same full-width form as Edit and this keeps `new/loading.tsx`'s 40rem cap off it. (3) `settings/loading.tsx`: `<SkeletonPage wide>` with children `<div className="@container"><div className={TWO_COLUMN_CLASSES}><SkeletonList rows={3} /><SkeletonList rows={3} /></div></div>`; comment that it also covers Manage family. (4) New `settings/feedback/loading.tsx`: `<SkeletonPage wide>` with children `<div className="@container"><div className="grid grid-cols-1 @min-[64rem]:grid-cols-[30rem_minmax(0,1fr)] @min-[64rem]:items-start @min-[64rem]:gap-x-8"><SkeletonList /><SkeletonBlock className="hidden h-96 w-full rounded-2xl @min-[64rem]:block" /></div></div>`; comment: 64rem is `COLUMN_MIN_WIDTH_PX[3]`, and this must change with `FeedbackList`'s measured split. (5) `FeedbackList.tsx`: the `ul` is `max-w-[48rem] space-y-2` when `!wide`, and stays `space-y-2` when wide; a one-line comment that below the panel width the rows keep the old 768px page width. The EmptyState stays uncapped (decision 280). No em or en dashes.
- **Verification:** `npx tsc --noEmit`, `npm run lint`, `npm test` exit 0 (read real exit codes; the shell is zsh, so `${PIPESTATUS}` does not work).
- **Evidence required:** tails with counts; full text of each loading file; the changed `ul` line; `git status --short`.
- **Done criteria:** Vision and Captain pass 3; Strange pass 2 measures each skeleton against its page (width and column count) at 1180 and 820, and Feedback rows at most 768px with the Sidebar pinned, unchanged at 1180 plain, 820 and 375.

## Gate plan

Vision after C1 to C4 (Gauntlet re-run; boundaries; hunts: the portaled sheets' Escape and focus return, the panel after an optimistic Mark done or Delete, the edit skeleton covering only `[id]/edit`, `recipes/new/loading.tsx` covering exactly the five wide pages, `useContainerWidth` on the server, the import pages before and after extraction, the tablet login's Settings). Then Strange (1180 plain, 1180 Sidebar, 1180 Rail, 820, 375; light and dark; every sheet on the viewport; Save placement; 48px targets; the narrow cap) and Captain (new files and their placement, `HabitForm` split, one home for every class string, the portal pattern, the dissolve instance, STRUCTURE.md text). Three passes each; fixes batched.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | BLOCKED | (1) `FeedbackList` keeps `openId` after the open report leaves the list, and `PageTabs` links do not remount it, so that report opens by itself on the other tab (decision 280), or as a modal sheet upright; (2) Settings' `[&>:first-child>*]:mt-0` removes the only gap under the title (0px at 768 to 1148 in compiled CSS, 16px at 767) | Gauntlet re-run green at `a470054`: tsc, lint, 1443 tests, UTC 1436 pass and 7 skipped, build exit 0; boundaries clean. Hunts 1, 2, 4 to 10 passed, including a negative control for the one-element container bug. NOTES: rotating wide to upright with a report open raises the sheet; panel reused between reports (scroll position, old screenshot); empty tab keeps the 480px grid; screen readers follow DOM order on the Settings dissolve; not re-indented `FamilyList`, portal calls |
| 1 | Captain | BLOCKED | `appChrome.ts:19` Dependents comment omits `FeedbackList`'s sticky panel (and L4's `MealPlanList` `scrollMarginTop`) | All other rulings PASS (placement, four loading files, one home for strings, dissolve, portals, form as container, measured Feedback, `header` and `aside` props, sizes). NOTES: `[&>h2]:mt-0` could be classes on the `h2`; recipe Title spans 1148px (Bryce's plan, A-L6-7); `GoalForm` 349 lines, next goal field moves Track a number; STRUCTURE.md 1676 lines. Amendments A-L6-1 to A-L6-13 drafted for C5 |
| 2 | Vision | PASS | None | At `59d3201`: tsc, lint, 1443 tests, UTC 1436 pass and 7 skipped, build all exit 0. Both pass 1 blockers reproduced with negative controls and gone. NOTES: a Mark done failing mid tab switch loses its error line; Settings' right card starts below its heading; rotating to upright with a report open raises the sheet |
| 2 | Captain | PASS | None | All eight readers of the row height are in the Dependents comment. NOTES: `wide && optimisticItems.length > 0` appears twice; Size watch uses the count at records time |
| 1 | Strange | BLOCKED | (1) Skeletons: Profile and `recipes/new/*` 1148 wide against 640 pages; Settings, Manage family and Feedback one list against two columns or list plus panel. (2) Feedback rows 877px wide with the Sidebar pinned (no panel, no cap) | At `b207a2c`. Everything else on the must-prove list PASSED by measurement: columns at all sizes, Save (275), short pages (276), recipe (277, 278), 16px Settings gap, Feedback panel and tabs, every sheet on the viewport, Manage family drag and +, no sideways scroll. NOTES: Settings right card lower is not a defect; Habit Edit's Archive and Delete run the full column under a 97px Save (to Bryce); older form skeletons show boards; Feedback hard reload blink; Event Starts and Ends missing until hydration (older debt); recipe Source link 158px at 820. Not covered: tablet Sign out sheet (no active tablet login on dev), paste and photo extraction, real iPad Safari. Left behind: nothing |

## Handoff log

- 2026-11-08: mission opened from the L6 chat (Fury on Fable). Branch at
  `origin/main` `7dc5b28`, clean. Read: the plan (Forms, Settings, rules),
  missions 51 (L5), 52 (L4), 53 (L3), STRUCTURE.md "Wide pages", DESIGN.md
  (hard rules, nav, sheets, form components), the `HabitForm.dc.html` mock.
  Banner dispatched. No dev server running (ports 3000 to 3003 free;
  `.claude/launch.json` names port 3000).
- 2026-11-08: Banner's brief in; contracts C1 to C5 and Hill's batch written on
  Fable; Bryce approved the plan and switched the chat to Opus 5.5. Bryce moved
  Hill from Fable to Opus 5.5 (the Fable run was stopped before it answered);
  Hill decided Q1 to Q10 as 274 to 283, changing Fury's Q1 Goal label, Q3 and
  Q4. Contracts amended to match. Preflight: 0 hard failures on C1 to C4.
  Fury commits each contract by explicit path (one shared git index, parallel
  builders).

## Delivery

PENDING.
