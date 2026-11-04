# Mission 28: Plans & Goals PR 2 (Vision board, prompts, idea chips)

**Project:** family-hub (Marshee)
**Status:** CONTRACTED
**Started:** 2026-11-04 · **Updated:** 2026-11-04
**Branch:** `claude/plans-goals-p2` from `origin/main` at `2a9f8a7` (PR #36 merged)
**Direction:** `.avengers/plans/plans-goals-v1.md` (read first)
**Wording (approved by Bryce, 2026-11-04):** `.avengers/plans/plans-goals-prompts.md`
**Layout:** the Claude Design canvas (https://claude.ai/artifact/5WwnypeeowDJufRioZFSud,
Vision board, Add to the plan and One goal screens), changed by the decisions
below.

## Bryce's decisions (final, 2026-11-04)

- **A vision statement is Mine or Together**, like a goal, with **no private
  option**: a vision board is meant to be seen. Everyone signed in can read
  every board; only its owner edits a person's board; any non-device
  login edits the Together board. The wall tablet sees the Together board
  only and edits nothing.
- **The goal page shows its area's vision automatically** ("Part of your
  10-year vision: ..."), with no linking to maintain. It matches the goal's
  owner (a Together goal shows the Together vision, a Mine goal shows that
  person's), falls back to the Together vision when the owner's is empty,
  and is hidden when both are empty.
- **Ten vision prompts per area**, one shown at a time. The first one is
  random; "Another prompt" steps through the rest in order and wraps, so
  none repeats until all ten have been seen.
- **Tab order: This week, Goals, Vision** (the mock had Vision first;
  This week stays first because it is the daily screen and the default).
- **Board chips:** Together, Mine, then one chip per other active family
  member by display name (no device logins), on one row with the 5 / 10 /
  15 yr chips. Default board Together, default horizon 10 yr.
- **Card tops:** no photos yet (they need Vercel Blob after the account
  move). The photo slot is a soft band (`bg-accent-soft`, `text-accent`)
  with the area's Lucide icon.
- **Empty card:** area label, the current prompt with a `Lightbulb` icon, a
  "Write your vision" button, an "Another prompt" button. **Filled card:**
  icon band, area label, the statement, "{n} goals" (that area's active
  goals on this board that the viewer can see; "1 goal" singular; the line
  is hidden at 0). The fifth card spans both columns.
- **Tapping a card** (when the viewer may edit) opens a sheet: heading
  "{Area} in {N} years", sub line "Together · everyone can see this" or
  "Yours · everyone can see this", the current prompt in italics, a
  textarea, "Another prompt" and "Save" buttons, and a one-tap danger
  "Clear this vision" (only when something is saved). When the viewer may
  not edit, the card is not a button.
- **Board heading** above the cards: "Our family in {year}" for Together,
  "{displayName} in {year}" for a person ("Mine" shows the viewer's own
  name), year = household today's year + horizon. Hint line under the grid
  "Tap a card to edit it" (only when the viewer may edit the board).
- **Idea chips:** "Ideas for {Area short}" chips (three goal ideas) under
  the name field on New goal, changing with the chosen life area (hidden
  until an area is picked); four plan ideas near the bottom of Add to the
  plan, above the Add button (create mode only). Tapping a chip fills the
  name; it does not submit.

## Brief

- **Goal:** add the Vision tab to `/plans`, per-person and Together vision
  statements for 5 / 10 / 15 years in the five life areas, the approved
  prompts on empty cards, idea chips on New goal and Add to the plan, and
  the vision line on the goal page.
- **Done means:** on the dev branch, a parent opens Plans & Goals, taps
  Vision, sees five cards on the Together 10 yr board with prompts, cycles
  a prompt, writes a Health vision, sees it on the card; switches to Mine
  and 5 yr and the card is empty again; opens a Together Health goal and
  sees "Part of your 10-year vision"; picks a plan idea chip in Add to the
  plan and the name fills. The other login sees the Together statement and
  can read but not edit the first login's Mine board. A device login sees
  only the Together board, read-only. The Gauntlet is green including the
  UTC run; Vision, Strange and Captain PASS.
- **Out of scope:** photos on cards; the dashboard tile, Sunday recap, Show
  in Routines switch, check-in history (PR 3); linking a goal to a vision
  by hand; voice; editing someone else's board.

## Danger register

- Local dev runs against the Neon `dev` branch. Production's connection
  string lives only in Vercel. If `DATABASE_URL` is not the dev endpoint,
  stop.
- `npm run db:seed`, `npm run db:reset`, `prisma migrate reset`, `prisma db
  push` and `prisma migrate dev` are forbidden. **Stark never touches the
  database.** Stark writes the migration SQL from a schema-to-schema
  `npx prisma migrate diff --from-schema <old> --to-schema prisma/schema.prisma --script`
  (old schema from `git show origin/main:prisma/schema.prisma` into the
  scratchpad) and runs `npx prisma generate`. **Fury** confirms the dev
  host (`ep-hidden-pine`, host only, never print `.env`), reviews the SQL
  (additive only), and applies it with `npx prisma migrate deploy`.
  Bryce's approval of the PR 2 layout stands as permission for this one
  additive migration.
- The dev branch holds real family data. Count rows, never quote them.
- Never write a clean or reset script for `User`.
- No push, no PR, no merge without Bryce's go-ahead. Stage by explicit
  path; `git show --stat HEAD` after every commit.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (514 before this mission; must rise)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always). **All gates on Opus 5.5** (Bryce's standing
  request; Vision is dispatched with `model: "opus"` because `vision.md`
  still says fable).
- Strange: a new tab and two changed forms, all visible.
- Captain: one new table, about eight new files.
- Banner: not needed. Fury read the code inline and mission 27 mapped this
  area a day ago.

## Facts the contracts hang on

- `src/lib/goalVocabulary.ts` (74 lines) owns `LIFE_AREAS` (key, label,
  short, lucide `icon`) and the narrowers; `constants.ts` is at its cap.
- `src/lib/goals.ts` (221) is the only goal policy (`canSee` / `canEdit` /
  `canLog`) plus display helpers `goalOwnership` / `whoseGoal` /
  `isPrivateGoal`. STRUCTURE.md: a page, action **or component** comparing
  a goal's `ownerId` or `visibility` itself is a BLOCKER.
- `src/lib/goalsRead.ts` (111) is the only page reader of goal rows;
  `loadPlansPage(viewer, today)` returns all visible goals with views.
- `src/app/(app)/plans/page.tsx` reads `?view=` (`week` default, `goals`),
  takes the first value of an array. `PlansTabs.tsx` is the one segmented
  control (two `Link`s, `grid-cols-2`).
- Family members: `db.user.findMany` with `deactivatedAt: null`, ordered
  `createdAt` asc, is the calendar's pattern; role `"device"` is the wall
  tablet (`ROLES` in `constants.ts`). `getVerifiedUser()` gives
  `{ userId, role, isDevice, ... }`.
- Sheets copy the shell markup of `TitleSheet.tsx` (fixed inset, backdrop
  button, `role="dialog" aria-modal`, Escape, safe-area padding).
  `PlanItemSheet.tsx` (214) and `CheckInSheet.tsx` are the nearest models.
- Filter chip classes: `min-h-11 rounded-full border px-4 text-sm
  font-medium`, on `border-accent bg-accent text-accent-fg`, `aria-pressed`
  (`TagFilterChips.tsx`). `GoalForm.tsx` (305) has `CHIP_CLASSES` /
  `CHIP_ON` / `CHIP_OFF` for the area picker.
- Line caps (STRUCTURE.md): soft 350 (a NOTE), hard 650.
- `src/lib/*.test.ts` is already in the `package.json` test glob.

## Fury's pre-dispatch checklist

Run per the template: grep exports before forbidding, no shared files
between parallel contracts, `node ~/.claude/skills/avengers/preflight.mjs
<this file> <id>` and read every line, re-measure numbers, quote HEAD last,
`git show --stat HEAD` after commits, nothing committed while a gate runs,
`recordcheck.mjs` before handing over records.

## Contracts

C1 then C2 run in order. C3 and C4 have disjoint boundaries and run in
parallel after C2. C5 last.

### C1 — Prompt wording, vision vocabulary and the pure vision logic, with tests
- **Status:** PENDING
- **Boundaries:** may touch: new `src/lib/goalPrompts.ts`, new
  `src/lib/goalPrompts.test.ts`, new `src/lib/visions.ts`, new
  `src/lib/visions.test.ts`, `src/lib/goalVocabulary.ts`,
  `src/lib/goalVocabulary.test.ts`, `src/lib/goals.ts`,
  `src/lib/goals.test.ts` · must not touch: `prisma/`, `src/app/`,
  `src/components/`, `src/lib/goalsRead.ts`, `src/lib/goalsProgress.ts`,
  `package.json`, `.avengers/plans/plans-goals-prompts.md`.
- **Spec:**
  - `goalVocabulary.ts`: add `VISION_HORIZONS = [5, 10, 15] as const`,
    `VisionHorizon`, `toVisionHorizon(raw: unknown): VisionHorizon | null`
    (accepts the numbers and their strings "5" / "10" / "15"),
    `DEFAULT_VISION_HORIZON = 10`. Tests in `goalVocabulary.test.ts`.
  - `goalPrompts.ts` (no React, no db): `VISION_PROMPTS: Record<LifeArea,
    readonly string[]>`, `GOAL_IDEAS: Record<LifeArea, readonly string[]>`,
    `PLAN_IDEAS: Record<LifeArea, readonly string[]>`, copied **word for
    word** from `.avengers/plans/plans-goals-prompts.md`, plus
    `promptAt(area, index)` (index wraps with a true modulo, so negative or
    huge numbers still land on a prompt) and `nextPromptIndex(index,
    length)`. A header comment says the wording is Bryce's, approved in
    that file, and changes there first.
  - `goalPrompts.test.ts`: every area has exactly 10 / 3 / 4 entries; no
    entry is empty, duplicated within its list, or contains an em dash or
    en dash; **parity test**: read
    `.avengers/plans/plans-goals-prompts.md` with `node:fs` (path from
    `process.cwd()`), parse each `## Area` section's "Vision prompts" (the
    numbered lines), "Goal ideas" and "Plan ideas" (the `- ` lines), map
    the five headings to the five keys, and assert deep equality with the
    three records. `promptAt` wraps at 10, -1 and 23.
  - `visions.ts` (pure, no db): `VISION_TEXT_MAX = 500`; type
    `VisionBoardKey = "together" | string` (a user id); `visionBoardKey(ownerId:
    string | null)`; type `VisionRow = { area: LifeArea; horizon:
    VisionHorizon; ownerId: string | null; text: string; updatedAt: Date }`;
    `canEditVision(ownerId: string | null, viewer: Viewer): boolean`
    (device → false; Together → true; a person's → `ownerId ===
    viewer.userId`); `validateVisionInput(raw: unknown): { ok: { board:
    "mine" | "together"; area; horizon; text } } | { error }` (text trimmed,
    may be empty, which means clear; over 500 → "Keep it under 500
    characters."; unknown area / horizon / board → an error);
    `visionForGoal(goalOwnerId: string | null, area, rows, horizon = 10):
    VisionRow | null` (owner's row for that area and horizon, else the
    Together row, else null; a row with empty text never matches);
    `boardHeading(name: string | null, todayYear: number, horizon)` →
    "Our family in 2036" when name is null, else "Bryce in 2036". Tests in
    `visions.test.ts` cover every branch, including a device viewer, the
    fallback, and a viewer never editing another person's board.
  - `goals.ts`: add `goalOnBoard(goal: GoalRow-or-view, board:
    VisionBoardKey): boolean` (Together board → the goal is Together; a
    person's board → the goal is that person's), beside the display
    helpers, so nothing outside `goals.ts` compares `ownerId`. Tests in
    `goals.test.ts`. If `goals.ts` would pass 250 lines, say so in the
    report rather than splitting.
- **Verification:** `npx tsc --noEmit` clean; `npm test` green with the new
  count; the UTC run green; `npx eslint src/lib` clean.
- **Evidence required:** the commands' tail output, the new test count,
  line counts of every touched file, and the parity test failing once when
  a prompt in a scratch copy of the parsing input is changed (show the
  failure, then restore; do not edit the real plan file).
- **Done criteria:** Fury re-runs `npm test` and sees the parity test;
  `grep -rn "ownerId" src/lib/visions.ts src/lib/goalPrompts.ts` shows only
  the `VisionRow` field and `canEditVision` / `visionForGoal` /
  `visionBoardKey`.
- **Report:** —

### C2 — The VisionStatement table, the migration, the reader and the save action
- **Status:** PENDING
- **Boundaries:** may touch: `prisma/schema.prisma` (exempt from caps),
  `prisma/migrations/` (one new folder ending `_add_vision_statements`),
  new `src/lib/visionsRead.ts`, `src/lib/goalsRead.ts`, new
  `src/app/actions/visions.ts` · must not touch: `src/lib/goals.ts`,
  `src/lib/visions.ts`, `src/lib/goalPrompts.ts`,
  `src/lib/goalVocabulary.ts`, `src/components/`, `src/app/(app)/`, other
  action files, `package.json`.
- **Spec:**
  - Schema: `model VisionStatement { id String @id @default(cuid()); area
    String; horizon Int; ownerId String?; owner User? @relation("visionsOwned",
    fields: [ownerId], references: [id], onDelete: SetNull); boardKey
    String; text String; updatedById String?; updatedBy User?
    @relation("visionsUpdated", fields: [updatedById], references: [id],
    onDelete: SetNull); createdAt DateTime @default(now()); updatedAt
    DateTime @updatedAt; @@unique([boardKey, area, horizon]) }` with doc
    comments: `boardKey` is `visionBoardKey(ownerId)` ("together" or the
    owner's id), written only by `saveVision`, and exists because Postgres
    lets a unique index hold many NULL `ownerId`s. `User` gains
    `visionsOwned VisionStatement[] @relation("visionsOwned")` and
    `visionsUpdated VisionStatement[] @relation("visionsUpdated")`.
    Migration by the diff method in the danger register; timestamp now,
    UTC, later than the `add_goals` folder's. `npx prisma generate`. Never
    connect to the database. Paste the SQL in the report.
  - `visionsRead.ts` (`import "server-only"`): `loadVisionBoard(viewer,
    boardParam: string | undefined, horizon, today)` returns `{ boards:
    { key: VisionBoardKey; label: string }[]; board: VisionBoardKey;
    ownerName: string | null; canEdit: boolean; cards: { area; text: string
    | null; goalCount: number }[] }`. Boards: "together" (label
    "Together"), the viewer's own id (label "Mine"), then every other user
    with `deactivatedAt: null` and role not `"device"`, ordered `createdAt`
    asc, labelled by `displayName`. A device viewer gets only Together.
    The board param picks from that list; anything else (including
    "mine", which maps to the viewer's id) falls back to Together.
    `goalCount` comes from a new `goalsRead.ts` export
    `loadGoalAreaCounts(viewer, board, today): Promise<Record<LifeArea,
    number>>` (visible, active goals where `goalOnBoard`); no `ownerId`
    comparison in `visionsRead.ts`. `canEdit` from `canEditVision`.
    `loadGoalVision(goal: GoalView, today)` returns the 10-year
    `VisionRow | null` via `visionForGoal` (one `findMany` for the area and
    horizon, both boards).
  - `actions/visions.ts` (`"use server"`, async exports only):
    `saveVision(raw: unknown): Promise<{ error?: string }>`. Guard:
    `getVerifiedUser()` → "Not signed in."; device → "A shared device can't
    change visions."; `validateVisionInput`; board "mine" → `ownerId =
    user.userId`, "together" → null; a client can never name another
    person's board. Empty text → `deleteMany` on the compound key (gone
    already is success); else `upsert` on `boardKey_area_horizon` with
    `updatedById`. Then `revalidatePath("/plans", "layout")`.
- **Verification:** `npx tsc --noEmit` clean; `npx prisma validate`;
  `npm test` still green; the migration SQL contains only CREATE TABLE,
  CREATE INDEX / CREATE UNIQUE INDEX and ADD CONSTRAINT.
- **Evidence required:** the SQL, the commands' output, line counts, and
  `grep -n "ownerId" src/lib/visionsRead.ts src/app/actions/visions.ts`.
- **Done criteria:** Fury applies the migration on the dev host and
  `npx prisma migrate status` reports up to date.
- **Report:** —

### C3 — The Vision tab: third tab, board and horizon chips, cards, the edit sheet
- **Status:** PENDING
- **Boundaries:** may touch: `src/components/PlansTabs.tsx`,
  `src/app/(app)/plans/page.tsx`, `src/app/(app)/plans/loading.tsx`, new
  `src/components/VisionBoard.tsx`, new `src/components/VisionCard.tsx`,
  new `src/components/VisionSheet.tsx` · must not touch: `src/lib/`,
  `prisma/`, `src/app/actions/`, `src/components/GoalForm.tsx`,
  `src/components/PlanItemSheet.tsx`, `src/app/(app)/plans/goals/`, any
  file C4 names.
- **Spec:**
  - `PlansTabs`: three columns (`grid-cols-3`), order This week, Goals,
    Vision; the view type widens to `"week" | "goals" | "vision"`.
  - `page.tsx`: `view=vision` renders `<VisionBoard>`; reads `board`
    (string, first of an array) and `years` (through `toVisionHorizon`,
    default 10); calls `loadVisionBoard`; passes a `promptSeed` integer
    made on the server per request (`Math.floor(Math.random() * 1000)`) so
    the first prompt is random but server and client render the same one
    (no hydration warning).
  - `VisionBoard` (client): one chip row, board chips first as `Link`s to
    `/plans?view=vision&board=<key>&years=<n>` (Together uses
    `board=together`, Mine uses `board=mine`), then the horizon chips as
    `Link`s keeping the board; filter-chip classes, `aria-current` on the
    lit ones, wrapping on narrow screens, every chip at least 44px tall.
    Then the heading from `boardHeading` in `font-accent italic text-xl`
    (Cormorant Garamond, today the login tagline's only use; the approved
    mock uses it here, and C5 records the second use in DESIGN.md), the 2-column grid of
    `VisionCard`s in `LIFE_AREAS` order (fifth spans both), the hint line.
    Owns which prompt index each empty card shows (per area: `(promptSeed
    + areaIndex) % 10`, stepped by "Another prompt") and which card's
    sheet is open. Save is optimistic (`useOptimistic` + `startTransition`
    + a `role="alert"` error line), same shape as `ThisWeekList`.
  - `VisionCard`: filled and empty states per the decisions above. An
    editable card is one `<button>` for the whole card except "Another
    prompt", which is its own 44px button outside the card's button (no
    nested buttons). Read-only cards render as plain markup with no
    "Write your vision" button.
  - `VisionSheet`: TitleSheet shell; per the decisions above; textarea
    `maxLength={VISION_TEXT_MAX}`, autofocus off on touch (match
    `PlanItemSheet`), Save disabled while pending, Clear one tap, Escape
    and backdrop close.
  - `loading.tsx`: still a fair skeleton for all three tabs (header,
    `h-12` tab block, list).
- **Verification:** tsc, eslint, `npm run build`; Stark does a browser
  check only if a dev server is already running (Fury verifies in the
  browser regardless).
- **Evidence required:** line counts, the build tail, a list of every
  interactive element with its minimum height class.
- **Done criteria:** Fury's browser run of the Done-means flow at 375px and
  820px, light and dark, with no console warnings.
- **Report:** —

### C4 — Idea chips on New goal and Add to the plan, and the vision line on the goal page
- **Status:** PENDING
- **Boundaries:** may touch: new `src/components/IdeaChips.tsx`,
  `src/components/GoalForm.tsx`, `src/components/PlanItemSheet.tsx`,
  `src/components/GoalDetail.tsx` (only to pass the goal's area to
  `PlanItemSheet` if it doesn't already reach it),
  `src/app/(app)/plans/goals/[id]/page.tsx` · must not touch: `src/lib/`,
  `prisma/`, `src/app/actions/`, `src/app/(app)/plans/page.tsx`,
  `src/components/PlansTabs.tsx`, any file C3 names.
- **Spec:**
  - `IdeaChips({ label, ideas, onPick })`: a labelled group ("Ideas for
    Health"), wrapping chips at least 44px tall, neutral style (not the
    accent "on" style, since nothing is selected); tapping calls
    `onPick(idea)`.
  - `GoalForm`: under the name field, `GOAL_IDEAS[area]` once an area is
    chosen, create mode only; a pick sets the title.
  - `PlanItemSheet`: `PLAN_IDEAS[area]` above the Add button, create mode
    only; a pick sets the title. Stays under 350 lines.
  - Goal page: after `<GoalDetail>`, when `loadGoalVision` returns a row,
    `<p className="mt-4 text-sm text-muted">Part of your 10-year vision:
    <span className="text-fg">"{text}"</span></p>` (check `text-muted` on
    the page background passes 4.5:1; use `text-muted-strong` if not).
- **Verification:** tsc, eslint, `npm run build`.
- **Evidence required:** line counts (GoalForm and PlanItemSheet under 350),
  the build tail.
- **Done criteria:** Fury's browser check of both chip rows and the vision
  line.
- **Report:** —

### C5 — Records: DESIGN.md, STRUCTURE.md, CLAUDE.md, the direction file
- **Status:** PENDING
- **Boundaries:** may touch: `DESIGN.md`, `STRUCTURE.md`, `CLAUDE.md`,
  `.avengers/plans/plans-goals-v1.md`, this mission file · must not touch:
  source files.
- **Spec:** DESIGN.md vocabulary gains `IdeaChips` and the vision card /
  sheet entries (with reasons, no em or en dashes in new sentences).
  STRUCTURE.md one-source list gains `goalPrompts.ts` (the only home of
  prompt wording, mirrored from the approved plan file and held to it by
  the parity test), `visions.ts` (the only vision policy), `visionsRead.ts`
  (the only reader of vision rows), and `goalOnBoard` in `goals.ts`.
  CLAUDE.md: Plans & Goals bullet says three tabs; Current status replaced
  (PR #36 merged and live; mission 28 state). Direction file: PR 2 marked
  built, Bryce's decisions above added.
- **Verification:** `node ~/.claude/skills/avengers/recordcheck.mjs` over
  the mission range; CLAUDE.md under 250 lines.
- **Evidence required:** recordcheck output with every REVIEW line read.
- **Done criteria:** Fury reads each edit.
- **Report:** —

### F1 — Pass-1 fixes that need no decision from Bryce
- **Status:** PENDING
- **Boundaries:** may touch: `src/lib/goalVocabulary.ts`, `src/lib/goals.ts`,
  `src/lib/goals.test.ts`, `src/lib/visions.ts`, `src/lib/visions.test.ts`,
  `src/lib/visionsRead.ts`, `src/lib/goalsRead.ts`,
  `src/app/actions/visions.ts`, `src/components/VisionBoard.tsx`,
  `src/components/VisionCard.tsx`, `src/components/VisionSheet.tsx`,
  `src/components/IdeaChips.tsx`, `src/app/(app)/plans/goals/[id]/page.tsx`,
  `src/app/(app)/plans/page.tsx` · must not touch: `prisma/`,
  `src/lib/goalPrompts.ts`, `.avengers/plans/`, `src/components/GoalForm.tsx`,
  `src/components/PlanItemSheet.tsx`, `src/components/PlansTabs.tsx`.
- **Spec (each item names the gate finding it closes):**
  1. Vision BLOCKER, prompt order restarts after a save: `VisionBoard` locks
     the seed once, `const [seed] = useState(promptSeed)`, with a one-line
     comment why.
  2. Captain BLOCKER, import cycle: move `VisionBoardKey` to
     `goalVocabulary.ts` beside the horizons, add `TOGETHER_BOARD =
     "together"` there; `goals.ts`, `visions.ts`, `goalsRead.ts`,
     `visionsRead.ts` import from there. `visions.ts` gains
     `boardOwnerId(key)` beside `visionBoardKey`. Every `"together"` board
     literal goes through `TOGETHER_BOARD`. Verify with Captain's script
     `node /private/tmp/claude-501/-Users-brycemarsh-Developer-family-hub--claude-worktrees-github-pull-source-check-f0f1a7/53a6940d-06dc-4a80-849b-ac656ea01738/scratchpad/cycles.mjs`
     (must print no cycle).
  3. Captain BLOCKER, duplicated wording: `visionsRead.ts` labels come from
     `GOAL_OWNERSHIP_LABELS`; `VisionSheet` uses
     `GOAL_OWNERSHIP_LABELS.together` ("Yours" stays a literal).
     `validateVisionInput`'s board is `GoalOwnership`, narrowed through
     `GOAL_OWNERSHIPS`.
  4. Captain NOTE, components deciding board identity: `VisionBoardChoice`
     gains `param` ("together", "mine" or the user id) and
     `VisionBoardData` gains `saveAs: GoalOwnership | null` (null when the
     viewer can't edit), both filled in by `visionsRead.ts`; `VisionBoard`
     drops its `viewerId` prop and never compares a key with a user id.
  5. Captain NOTE, action not using the policy: `saveVision` works out
     `ownerId` once and gates with `canEditVision(ownerId, user)` (device
     refusal message unchanged); a P2002 unique clash from a simultaneous
     first save retries once as an update (Vision NOTE) instead of
     throwing.
  6. Vision and Captain NOTE, owner-deleted rows passing as Together:
     `loadGoalVision` filters by `boardKey in [TOGETHER_BOARD,
     visionBoardKey(goal.ownerId)]` and `visionForGoal` matches rows by
     board key, not `ownerId === null`. Tests updated. Drop the unused
     `today` parameter; add `GOAL_PAGE_VISION_HORIZON = 10` to
     `goalVocabulary.ts` and use it in `visionsRead.ts`, `visions.ts`'s
     default, and the goal page copy (built from the constant).
  7. Captain NOTE: rename the exported type `VisionCard` in
     `visionsRead.ts` to `VisionCardData`.
  8. Strange BLOCKER 1, press-state contrast: `VisionCard` area label and
     goal-count spans, and `IdeaChips` chip text, go from `text-muted` to
     `text-muted-strong`.
  9. Strange BLOCKER 2, optimistic clear and lost drafts: in
     `VisionBoard.save`, clearing is not optimistic (the sheet stays open,
     Clear shows "Clearing…", the card clears after success). A failed
     non-empty save keeps the sheet open with the draft and shows the error
     inside the sheet. A successful save may stay optimistic.
  10. Strange NOTE, a11y: drop the card button's `aria-label` so its visible
      text is its name (or keep a short label plus `aria-describedby` on
      the statement and count). Sheet: focus the dialog container
      (`tabIndex={-1}`) on open, restore focus to the card on close. Wrap
      the two chip groups in `role="group"` with `aria-label` "Whose
      board" and "How far ahead".
  11. Strange NOTE: the goal-page vision line uses curly quotes.
- **Verification:** the Gauntlet minus the build (Fury builds), plus the
  cycle script.
- **Evidence required:** a line per item with file:line, test count, the
  cycle script's output, line counts.
- **Done criteria:** Fury re-runs the gauntlet, the cycle script and the
  browser flow.
- **Report:** —

### F3 — Pass-2 fixes that need no decision from Bryce
- **Status:** PENDING
- **Boundaries:** may touch: `src/components/VisionBoard.tsx`,
  `src/components/VisionCard.tsx`, `src/app/globals.css`,
  `src/lib/visionsRead.ts`, `src/app/actions/visions.ts`
  · must not touch: `prisma/`, `.avengers/`, `src/lib/goalPrompts.ts`,
  `src/lib/visions.ts`, `src/lib/goalVocabulary.ts`, `DESIGN.md`,
  `STRUCTURE.md`, every other file.
- **Spec:**
  1. Vision's pass-2 blocker. In `VisionBoard`, (a) `close()` returns
     early while `pending` is true, so a save in flight cannot be
     abandoned for another card; (b) the success path becomes
     `setOpen((current) => (current === area ? null : current))`, so a
     save that lands only ever closes its own sheet. Keep the comment above
     `save()` accurate.
  2. Dashed outline one step darker, to match the approved canvas
     (#c9bfae). Add a decorative token `--line-strong` in `globals.css`:
     light `#c9bfae`, dark `#57514a`, each with a one-line comment in the
     file's style (decorative only, never carries text), plus
     `--color-line-strong` in the `@theme inline` block. The empty
     `VisionCard` uses `border-line-strong` instead of `border-line`.
  3. `visionsRead.ts` docstring on `loadGoalVision` names
     `GOAL_PAGE_VISION_HORIZON` instead of "10-year".
  4. Reflow the header comment in `src/app/actions/visions.ts` so no line
     runs past the file's usual width. Wording unchanged.
- **Verification:** tsc, `npx eslint .`, `npm test`, the UTC run, the
  cycle script (pass `"$PWD"`).
- **Evidence required:** a line per item with file:line; outputs; line
  counts of the touched files.
- **Done criteria:** Vision pass 3 re-runs the in-flight scenario; Fury's
  browser check shows the darker outline in light and dark.
- **Report:** —

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision (Opus) | BLOCKED | prompt order restarts after a save | owner-deleted rows pass as Together; device sees a person's vision on a Mine goal page; P2002 on a simultaneous first save; lost draft; aria-label hides text |
| 1 | Captain (Opus) | BLOCKED | type-only import cycle goals.ts and visions.ts; "Mine"/"Together" typed twice | board identity decided in VisionBoard; action skips `canEditVision`; "together" literal spread; horizon 10 in three places; unused `today`; `VisionCard` type name clash; chip classes and sheet shell copied (future contract); prompts file is load-bearing for `npm test` (record in C5) |
| 1 | Strange (Opus) | BLOCKED | pressed-state contrast 4.33:1 on VisionCard and IdeaChips (light); Clear is optimistic; read-only empty cards invite a prompt answer; heading asks for Cormorant against DESIGN.md and renders faked-italic Manrope | idea chips push Life area down 140px (mis-tap reproduced); three chip rows and two lookalike groups; empty card band vs canvas; prompts that contradict the horizon; vision line wording on fallback; focus handling |
| 2 | Vision (Opus) | BLOCKED | an in-flight save closes a different sheet and drops its draft, or shows its error there (F1 regression) | viewer-blind "your" on the goal page; focus restore no-op on iOS; brief disabled Clear on first save; board error survives navigation; P2002 duck-typed |
| 2 | Captain (Opus) | PASS | none | horizon switch needs a DESIGN.md carve-out beside PlansTabs; chip classes in five places (future contract); docstring "10-year" by hand; long comment line; DRAFT comment in goalPrompts.ts must go with Bryce's approval |
| 2 | Strange (Opus) | PASS | none | heading is faux italic and faux 500 (accepted); 14 of 60 prompts name a different horizon; disabled "Clearing…" at 2.33:1 (app-wide pattern); warn color for network errors unrecorded; dashed outline fainter than the canvas; dark selected segment darker than its strip; textarea has no focus ring; "your family's" and device views unverified in pixels |

Strange's read-only card, heading font and the two layout recommendations
need Bryce (wording and layout are his). They go in F2 after he answers.

## Bryce's pass-1 decisions (2026-11-04)

Drawn as screens A, B and C on the canvas (row "PR 2 proposals") and
approved: "those Canvas proposals all look good, so let's start building it."

1. The board heading stays in Cormorant Garamond italic. DESIGN.md gains
   the Vision board heading as its second allowed use (C5).
2. An empty card on a board the viewer can't edit says "{Name} hasn't
   written this yet" (no prompt, no buttons). On the Together board seen
   by a device it says "Not written yet". The hint line on someone else's
   board reads "Only {Name} can change this board" instead of "Tap a card
   to edit it"; on a read-only Together board the hint is hidden.
3. New goal: Life area first, then Name, then the idea chips.
4. Board chips on their own row; the 5 / 10 / 15 yr choice is a small
   three-part switch on the heading line.
5. Empty cards: dashed outline, no icon band, page-colored fill. Filled
   cards keep the band.
6. When a Mine goal shows the Together vision because the owner's is
   empty, the goal page says "Part of your family's 10-year vision".

**Six life areas** (Bryce, 2026-11-04): Spiritual, Health & Wellness,
Personal Growth, Relationships & Connections, **Work & Money** (Financial
renamed; key stays `financial` so saved goals keep their area), **Fun &
Adventure** (new, key `fun`). In that order. Six cards make three even rows
on the Vision board, so no card spans both columns. Wording for the two
changed areas is drafted in the prompts file and needs Bryce's approval
before push.

### F2 — Bryce's pass-1 decisions and the six life areas
- **Status:** PENDING
- **Boundaries:** may touch: `src/lib/goalVocabulary.ts`,
  `src/lib/goalVocabulary.test.ts`, `src/lib/goalPrompts.ts`,
  `src/lib/goalPrompts.test.ts`, `src/lib/visions.ts`,
  `src/lib/visions.test.ts`, `src/lib/visionsRead.ts`,
  `src/components/VisionBoard.tsx`, `src/components/VisionCard.tsx`,
  `src/components/GoalForm.tsx`, `src/app/(app)/plans/goals/[id]/page.tsx`
  · must not touch: `prisma/`, `.avengers/plans/`, `src/app/actions/`,
  `src/components/PlanItemSheet.tsx`, `src/components/PlansTabs.tsx`,
  `src/app/globals.css`, `DESIGN.md`.
- **Spec:**
  1. `LIFE_AREAS` in the new order. `financial` keeps its key; label and
     short both "Work & Money"; icon `PiggyBank` → `BriefcaseBusiness`
     (check the installed lucide-react exports it; else `Briefcase`). New
     `{ key: "fun", label: "Fun & Adventure", short: "Fun", icon: Tent }`
     (check the export; else `Compass`). Update the vocabulary test.
  2. `goalPrompts.ts`: regenerate all three records from the current
     `.avengers/plans/plans-goals-prompts.md` (word for word; the parity
     test must pass with six sections). Header comment notes the Work &
     Money and Fun & Adventure wording is a draft until Bryce approves.
  3. Decision 4: `VisionBoard` renders the board chips in their own
     wrapping row (role group "Whose board"), then a heading line with the
     heading on the left and the horizon switch on the right: a
     `role="group" aria-label="How far ahead"` strip (`bg-surface-2
     rounded-xl p-1`) of three `Link`s, each at least 44px tall and 44px
     wide, the current one `bg-surface text-fg aria-current`, others
     `text-muted-strong`. Same look as `PlansTabs` at a smaller size.
  4. Decision 1: the heading actually renders in Cormorant italic. The
     global `h2` rule in `globals.css` sets the display font, so beat it on
     the element (for example `[font-family:var(--font-accent)]` plus
     `italic`), and confirm the font variable is loaded on `/plans` (it is
     set in `src/app/(app)/layout.tsx`; check). `text-2xl`, weight 500.
  5. Decision 5: `VisionCard` empty state: `border-2 border-dashed
     border-line bg-bg`, no icon band. Filled cards keep the band. The grid
     no longer spans the last card (six areas, even rows); if the count is
     ever odd the last one spans, computed, not hard-coded.
  6. Decision 2: `VisionCard` read-only empty state shows the area label
     and one `text-muted-strong` line: "{ownerName} hasn't written this
     yet", or "Not written yet" when the board is Together. No prompt, no
     buttons. `VisionBoard` hint line: editable → "Tap a card to edit it";
     someone else's board → "Only {ownerName} can change this board";
     read-only Together → hidden. Add `readOnlyEmptyText(ownerName)` and
     `boardHint(canEdit, ownerName)` to `visions.ts` with tests, so the
     wording lives in one place.
  7. Decision 6: add `goalVisionLabel(goalOwnerId, row)` to `visions.ts`
     returning "your" or "your family's" (the latter when the goal has an
     owner and the row is the Together board's). Tests. The goal page
     builds "Part of {label} {N}-year vision" from it and
     `GOAL_PAGE_VISION_HORIZON`.
  8. Decision 3: `GoalForm` field order is Life area, Name, ideas (create
     mode), For, Target date, the rest unchanged. Stays under 350 lines.
- **Verification:** tsc, `npx eslint .`, `npm test`, the UTC run, the
  cycle script.
- **Evidence required:** a line per item with file:line; outputs; line
  counts; the lucide export names checked.
- **Done criteria:** Fury's browser check at 375 and 820, light and dark.
- **Report:** —

Budget: 3 passes per gate, then STOP and surface.

## Handoff log

- 2026-11-04 — Prompts approved by Bryce and committed (`ee90d52`). Layout
  decisions approved ("Yes, as mocked"). Mission written; C1 next.
- 2026-11-04 — C1 to C4 built and committed; migration applied on the dev
  host. Pass 1: all three gates BLOCKED (ledger above). F1 fixed the
  decision-free findings. Bryce approved canvas screens A, B, C and six life
  areas; F2 built them. Stark reported BLOCKED-ON-CONTRACT on one line
  outside F2's boundary (`goals.test.ts` used "fun" as an unknown area);
  Fury changed it to "play". Gauntlet green: 533 tests, UTC 526 pass + 7
  DST skips, build clean. Fury browser-checked screens A and B and the New
  goal order at 375px. Not done on purpose: loading Cormorant's true italic
  (it would also change the login tagline, which Bryce didn't ask for); the
  heading uses the same browser-slanted italic as the login tagline. Next:
  pass 2 of all three gates.

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** —
