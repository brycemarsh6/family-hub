# Mission: the CV3 follow-up — four fixes the family will feel

**Project:** family-hub (Marshee)
**Status:** CONTRACTED
**Started:** 2026-09-05 · **Updated:** 2026-09-05

## Brief

- **Goal:** four small, Bryce-agreed fixes to the live Calendar, plus one
  mechanical extraction CV3 deferred. Three are one-file changes; the
  fourth (F4) is a **one-line CSS fix with app-wide blast radius** and is
  the only reason this mission needs real gating.
- **Done means:**
  1. Marking a task complete flips **instantly**, and reverts visibly if
     the server refuses.
  2. An **open** task pill in Month carries an empty `☐`, so "no mark" is
     no longer doing two jobs.
  3. Re-assigning a task or event no longer erases a deactivated person
     who is **already on it**.
  4. The Schedule's month name and Today control **stay pinned**, and the
     month name changes as you scroll into a new month.
  5. Gauntlet green in all three timezones; database at exact baseline.
- **Out of scope:** CV4's hour timeline (next mission), CV5, CV6, CD1,
  filters (K3), recurrence (K4). The explicit per-direction stop-`status`
  refactor CV3 queued — **its own contract, before anything builds on
  `useScheduleWindow`; nothing here does.**

## Decisions — don't re-litigate

- **D1. Bryce approved all four, 2026-09-05**, and refined F4 himself:
  *"pinning today and month name — that is, until it changes months."*
- **D2. One month label, in the pinned bar (Fury's sub-decision).** With
  both the bar and the in-list heading pinned, the month would show twice
  — Strange carried that double label as a NOTE in CV3 and pinning makes
  it permanent instead of transient. The bar owns the label; the in-list
  heading becomes a plain in-flow divider.
- **D3. The sideways-scroll guard is REPLACED, never deleted.**
  `globals.css`'s `overflow-x: hidden` exists for a real reason stated in
  its own comment. F4 removes its *side effect*, not its job.
- **D4. Constitution edits are Fury's, already made** (both Bryce-approved
  2026-09-05): STRUCTURE.md's read-action clause now distinguishes `null`
  (refused) from `[]` (genuinely empty); DESIGN.md carries the optimistic
  carve-out F1 depends on. **Builders must not edit either file.**

## Danger register (absolute)

- **The app is LIVE.** A regression here reaches the family immediately —
  `main` deploys to production on merge.
- Never `npm run db:seed` / `db:reset`; never a Neon branch reset. Scoped
  `db:seed-tasks` / `db:clean-tasks` / `db:seed-calendar` /
  `db:clean-calendar` only.
- **No committed script may create, update, delete or deactivate `User`
  rows.** F3 concerns deactivated members — **read them, never write
  one.** A ghost cookie (valid signature, absent userId) is the sanctioned
  way to make the DAL refuse.
- **Do not edit any existing migration.** Nothing here needs a migration.
- Baseline: `Task 0, TaskPerson 0, CalendarEvent 4, User 5`.
  **`CalendarEvent` must read 4** — one is a real family event.
- Dev branch holds real family data. **Report roles and counts, never
  names or titles.**
- **Never `git add -A` / `git add .`.** Stage by explicit path.
- **Fury: do not commit while a gate is running.**

## Gauntlet

`npx tsc --noEmit` · `npx eslint .` · `npm run build` · `npm test`
(**310** baseline, pins Denver) · the direct `TZ=UTC` and
`TZ=America/Los_Angeles node --import tsx --test src/lib/*.test.ts
src/lib/voice/*.test.ts` legs.

## Standing constraints

- **The built-in browser pane cannot gate any of this.** It runs hidden:
  `IntersectionObserver` and `requestAnimationFrame` **never fire** there
  (a screenshot forces one frame, which is exactly how it looks like it
  works). Real headless Chrome over CDP, production build, own port.
- `body.scrollWidth`, **never** `documentElement.scrollWidth`, for any
  horizontal-overflow check — html clips and hides it (K1).
- Measure mid-list, never at `scrollTop 0`, for any anchoring reading.
- Parallel builders in one tree collide on `.next` and on the git index —
  **dispatch order is enforced by Fury, not left to chance.**
- `useScheduleWindow.ts` is **431/350** (soft cap) — C5 is its remedy.

## Assembled

- **Stark + Vision** — always.
- **Strange** — F1, F2 and F4 are all *felt*; F4 changes a rule that
  affects every page in the app.
- **Captain** — F4 edits app-wide CSS; C5 creates a new module.
- **Banner** — not assembled. Fury did the reconnaissance inline and it
  moved a boundary (see C2): `MonthCell` cannot currently tell an open
  task from an event, so `MonthGrid` is in scope too.

## Contracts

### C1 — Mark complete flips instantly
- **Status:** DONE `f7edaa3`
- **Report:** flips before the POST resolves — **proven by holding the
  request** and reading the DOM mid-flight (the button's rendered *branch*
  had already switched, not merely its label). Reverts on a **real**
  failure, not a fabricated one: the builder deleted the task row
  mid-flight so `completeTask`'s existing missing-row path fired, and the
  reverted state was byte-identical to pre-tap. `previous` is captured
  from `current` rather than recomputed, so the revert restores exactly
  what the reader was looking at. Kid gating survives: on a kid session
  the optimistic flip left **both** buttons gone (complete now true,
  un-complete manager-only) — a kid cannot un-complete even transiently.
  Delete untouched, per the DESIGN.md carve-out.
- `TaskDetailSheet.tsx`'s `handleComplete`/`handleUncomplete` currently
  `await` the action and only then `setCurrent`. Flip the state first,
  call the action, and **revert on failure** while surfacing the existing
  error. Delete is deliberately left alone — DESIGN.md's new carve-out.
- **Boundaries:** may touch `src/components/TaskDetailSheet.tsx` · must
  not touch `DESIGN.md`, `STRUCTURE.md`, `actions/**`, `MonthCell.tsx`,
  `MonthGrid.tsx`, the two `calendar/**/page.tsx`, `globals.css`.
- **Evidence:** the optimistic flip measured (the pill/label changes
  before the POST resolves — hold the POST to prove it, don't infer it);
  and a **forced failure** reverting the flip with the error shown.
  `canComplete`/`canUncomplete` gating unchanged: a kid may complete a
  task they are on and may **not** un-complete.

### C2 — an open task pill carries an empty ☐
- **Status:** DONE `33a934f`
- **Report:** the boundary correction was the whole job — `MonthCell`'s
  `taskCompleted: boolean` became `taskStatus: "open" | "completed" |
  null`, and `MonthGrid` computes it **after** `assignLanes`/`overflowByDay`
  have run, so packing cannot be affected *by construction* rather than by
  measurement. Found a real day holding all three pill kinds at once:
  `["", "✓<completed>", "☐<open>"]`, 3 lanes, zero overflow; adding a 4th
  item left the visible three identical and produced "+1 more". Glyph
  contrast measured in both themes and both variants — **5.04 / 5.86 /
  6.80 / 12.76:1**, all clearing the 3:1 non-text bar. Day-button target
  unchanged at 78.5×47.9px.
- `MonthCell.tsx` takes a flag that is *"true only for a completed TASK
  slot"*, so it currently cannot distinguish an **open task** from an
  **event** — `MonthGrid.tsx` must pass that fact too. Open task → empty
  `☐`; completed task → the existing checkmark; event → neither.
- **Boundaries:** may touch `src/components/MonthCell.tsx`,
  `src/components/MonthGrid.tsx` · must not touch `TaskCard.tsx`,
  `monthLayout.ts`, `TaskDetailSheet.tsx`, `ScheduleView.tsx`,
  `globals.css`, `actions/**`.
- **Evidence:** all three pill kinds rendered together at **375px**, read
  from the DOM not a screenshot alone; the "+N more" count and lane
  packing **provably unchanged** (a task pill must not gain a lane);
  contrast of the new glyph measured, and the 44px target rule respected.

### C3 — re-assigning must not erase a deactivated member
- **Status:** **BLOCKED-ON-CONTRACT — Fury's boundary was wrong.**
  Superseded by C3b below. The builder was right to refuse and right not
  to attempt a partial fix that would have *looked* handled while the
  save-preservation guarantee did not hold.
- **What I got wrong, recorded because it is the fourth of this exact
  shape in three missions:** I named two roster queries. There are
  **four** (`calendar/page.tsx:116`, `calendar/new/page.tsx:62`,
  `calendar/new/task/page.tsx:42`, `calendar/[id]/edit/page.tsx:44`), and
  one of the two I named — `new/page.tsx` — is a **create** page where
  there is no existing assignment to preserve, so it is not the bug's site
  at all. Worse, I forbade `actions/**`, which is where the actual blocker
  lives. I verified all of this myself after the report rather than taking
  it on trust.
- Two roster queries filter `deactivatedAt: null` —
  `src/app/(app)/calendar/page.tsx:116` and
  `src/app/(app)/calendar/new/page.tsx:62`. A person deactivated after
  being assigned silently disappears from the picker, so any save rewrites
  the assignment without them. Show **active people PLUS anyone already on
  this item**, deactivated ones visibly marked as no longer active.
- **Boundaries:** may touch `src/app/(app)/calendar/page.tsx`,
  `src/app/(app)/calendar/new/page.tsx`, `src/components/TaskForm.tsx`,
  `src/components/EventForm.tsx` · must not touch `actions/**`,
  `prisma/**`, `dal.ts`, `constants.ts`, `globals.css`.
- **Evidence:** **read** a deactivated member, never write one — the
  register forbids `User` writes, so if no deactivated row exists,
  demonstrate against a roster the query returns rather than deactivating
  anyone. Prove the picker lists them, that saving **preserves** the
  existing assignment, and that a deactivated person **cannot be newly
  added** to an item they were not already on.

### C3b — the deactivated-member fix, with the boundary the code implies
- **Status:** DONE `7b0dc1c`
- **Report:** `validatedPeople` in both action files gains an
  `alreadyAssignedUserIds` carve-out, read **fresh from the database** by
  the caller (one `findMany` against that exact row) — never from input.
  Default `[]` means `createTask`/`createCalendarEvent` still refuse every
  deactivated id **by construction**, not by a branch someone could later
  delete. Unknown ids stay refused by their own separate check.
  **The evidence is the interesting part**, because no deactivated `User`
  row exists and the register forbids making one: the builder exercised the
  **real shipped functions** in-process (mocking only `dal`'s cookie access
  and `revalidatePath`, monkey-patching `db`), and proved non-vacuity by
  `git stash` — the same 9 tests against the pre-fix code failed **exactly
  3**: both positive controls and the unrelated-field-edit symptom. The
  6 refusal/regression cases passed before *and* after, which is what shows
  the carve-out didn't loosen anything it shouldn't.
  **Fury's audit added two checks the report didn't claim:** the label is
  display-only (ids are what get written, so it cannot reach a save), and
  `AvatarBadge` takes only `charAt(0)`, so the "(no longer active)" suffix
  cannot disturb the avatar's initial.
- ⚠️ **The builder left all five files uncommitted** while reporting DONE.
  Fury caught it by checking `git log` rather than trusting the report,
  re-ran the full gauntlet on the tree, and committed it. **Sixth instance
  of this project's done-but-not-durable class**, and the first from a
  builder rather than from Fury.
- **The real blocker, verified by Fury:** `validatedPeople` exists
  **identically in both** `src/app/actions/tasks.ts:87` and
  `src/app/actions/calendar.ts:60`, and rejects the whole save if *any*
  submitted id is deactivated — on **every** create and update. So a
  person deactivated after being assigned makes every later edit to that
  item fail, **including edits that never touch the people field**, with
  a message ("One of those people isn't available anymore") that names a
  field the reader did not touch.
- **The client half is already correct and must not be "fixed":** the
  forms' `selectedUserIds` already retains a deactivated assignee's id on
  open, because `current.people` / `event.people` are not filtered by
  `deactivatedAt`. Nothing is dropped client-side today. The bug is
  entirely the server's unconditional refusal plus the picker having no
  way to *show* that person.
- **The security-critical shape — this is the sharp edge of the
  contract.** `validatedPeople` guards a **public POST**. The carve-out is
  "an id already on the row being updated is allowed"; it must be decided
  by reading **that row's current people fresh from the database**, never
  from anything the client sent. A client claim of "they were already
  assigned" is exactly the forgery this guard exists to stop. And the
  **create** paths get no carve-out at all — with no existing row, every
  deactivated id is by definition a new assignment and must still be
  refused. This is the same re-verify-at-commit-time discipline
  `commitPutAway` already uses.
- **Boundaries:** may touch `src/app/actions/tasks.ts`,
  `src/app/actions/calendar.ts`, `src/app/(app)/calendar/page.tsx`,
  `src/app/(app)/calendar/[id]/edit/page.tsx`,
  `src/app/(app)/calendar/new/page.tsx`,
  `src/app/(app)/calendar/new/task/page.tsx`,
  `src/components/TaskForm.tsx`, `src/components/EventForm.tsx`,
  `src/components/TaskDetailSheet.tsx` (to pass a deactivated assignee's
  display info through for tasks — tasks are edited in a sheet, not a
  route) · **must not touch** `src/app/actions/usersRoles.ts`,
  `src/app/actions/users.ts`, `src/app/actions/auth.ts`, `dal.ts`,
  `prisma/**`, `constants.ts`, `globals.css`, `MonthCell.tsx`,
  `MonthGrid.tsx`, `ScheduleView.tsx`, `CalendarHeader.tsx`,
  `calendarViewConfig.ts`, `login/page.tsx`.
- **Evidence:** an **adversarial check, positive control first** — a
  legitimate update preserving an already-assigned deactivated person
  succeeds (the control that makes the rest mean anything); a **forged**
  POST submitting a deactivated id that is *not* on the row is still
  refused; a create carrying a deactivated id is still refused. Plus the
  picker showing the person marked as no longer active, and an edit to an
  unrelated field on such an item saving cleanly — the family-visible
  symptom. **Never create, update, delete or deactivate a `User` row** to
  produce any of this; if no deactivated member exists, state plainly
  which half was proven live and which by construction.

### C4 — the pinned Schedule header, and the sticky rule that never worked
- **Status:** DONE `0ef18ac`
- **Report:** `overflow-x: hidden` → **`overflow-x: clip`** on `html, body`.
  `clip` is explicitly exempt from the cross-axis `auto` computation, so
  neither element becomes a scroll container, `html` stays the document's
  one real scroller, and sticky works — while the guard's actual job
  survives, **proven**: `body.scrollWidth` identical before and after at
  **375 and 320** across all eight pages, `canScrollX` 0 everywhere.
  Schedule's header bar now pins (measured stack: app header **73px**,
  calendar bar **154px**, zero gap or overlap) with a **scroll-driven**
  month label portaled in from `ScheduleView`, reusing the existing
  today-visibility observer instrument. The in-list heading lost `sticky`
  and is a plain divider, per D2.
  **Label correctness proven three ways**: an independent DOM check of
  which section genuinely spans the observation line agreed with the
  portaled title at **every** point of a 250-step walk across four month
  boundaries — zero mismatches; a 10px-step sweep at one boundary showed
  a clean two-state transition, no flicker; and where bounding boxes
  *appeared* to overlap, `document.elementFromPoint` — the browser's own
  hit test rather than a box heuristic — showed the in-list divider
  genuinely occluded by the opaque pinned bar every time. **No two copies
  of a month name are ever simultaneously visible.** Theme proven in both
  directions with genuinely different computed backgrounds, ruling out the
  K1-era trap of two captures secretly showing the same theme.
  `calendarViewConfig.ts`'s overclaiming comment rewritten.
- **Root cause, measured:** `globals.css:123-126` sets `overflow-x:
  hidden` on **both `html` and `body`**. Per spec that computes
  `overflow-y` to `auto`, making `body` a scroll container that never
  scrolls — so **every `position: sticky` in the app is inert**, including
  `ScheduleView.tsx:267` and `RecipeList.tsx:206`, both already coded to
  stick. Bryce's behaviour is already written; one rule defeats it.
- Replace the guard without its side effect (candidate: `overflow-x:
  clip`, which does **not** create a scroll container — **verify, don't
  assume**). Then per D2: the pinned bar owns the month label, driven by
  which month is at the top of the viewport (reuse `ScheduleView`'s
  existing today-visibility observer instrument); the in-list heading
  stops being sticky.
- **`calendarViewConfig.ts:134` freezes the Schedule header title *on the
  belief that sticky works*** — that comment is an overclaim by this
  project's named defect class and must be rewritten, not left.
- **Boundaries:** may touch `src/app/globals.css`,
  `src/components/CalendarHeader.tsx`, `src/lib/calendarViewConfig.ts`,
  `src/components/ScheduleView.tsx` · must not touch `RecipeList.tsx`
  (it must be **verified**, not edited), `useScheduleWindow.ts`,
  `MonthCell.tsx`, `MonthGrid.tsx`, `actions/**`, `prisma/**`.
- **Evidence:** `body.scrollWidth` at **375 and 320** across Schedule,
  Week, Day, Month, Recipes, Inventory, Shopping and the dashboard,
  **before and after** — the guard's job must provably survive. The month
  label changing exactly once per crossing, with no double label. The
  Recipes A–Z headers, now newly live, verified rather than assumed.
  `top-16` is 64px while the header measures ~72px and carries
  `backdrop-blur` (P2's lesson: a `backdrop-filter` element is the
  containing block for `position: fixed` descendants) — **measure the real
  heights and stacking, trust neither number.**

### C6 — the A–Z rail's offset, now that sticky is real (NEW, from C4)
- **Status:** DONE `12336ca`
- **Report:** runtime `ResizeObserver` measurement, **not** a second
  hardcoded `73` — matching this file's own `railTop` precedent, since
  mission-R2 already fixed a guessed pixel offset here for exactly this
  reason. Proven with a 9-point `elementFromPoint` sweep of the stuck
  heading's full box in **both** themes (verified genuinely different
  computed backgrounds), and non-vacuously: stashing the fix and rebuilding
  reproduced the true pre-fix bug (`headingTop 64` vs `headerHeight 73`,
  the top of the box resolving to the header). The rail's drag-to-jump was
  re-checked with real `PointerEvent`s and lands correctly — worth doing
  rather than assuming, because mission-R2 records that `scrollIntoView`
  does not reliably scroll a `position: sticky` target, and sticky is now
  real for the first time.
- **A visible regression the family would hit**, exposed rather than
  caused by C4: `RecipeList.tsx:206`'s letter headers use `top-16` (64px)
  against a real app header of **73px**, so the stuck letter's top ~9px is
  clipped behind the header. C4 measured it by pixel-sweeping
  `elementFromPoint` and confirmed it in both themes; it was correctly
  reported rather than fixed, being outside C4's boundary.
- **The one-source-of-truth question this raises, and the preferred
  answer:** C4 exported `APP_HEADER_HEIGHT_PX = 73` from
  `CalendarHeader.tsx`. RecipeList must **not** import a calendar
  component, and a second hardcoded `73` would be exactly the duplication
  STRUCTURE.md forbids. **Prefer measuring at runtime** — `RecipeList.tsx`
  already runs `ResizeObserver` + `useLayoutEffect` to position its rail
  against the search box's real geometry, which is the same technique and
  the same file's own established precedent (mission-R2 fixed a hardcoded
  guess there once already, for this exact reason). If a shared constant
  genuinely reads better, it belongs in `src/lib/`, imported by both —
  **say which you chose and why.**
- **Boundaries:** may touch `src/components/RecipeList.tsx`, and — only if
  you choose the shared-constant route — a new `src/lib/` module plus
  `src/components/CalendarHeader.tsx`'s export site · must not touch
  `globals.css`, `ScheduleView.tsx`, `calendarViewConfig.ts`,
  `(app)/layout.tsx`, `actions/**`, `prisma/**`.
- **Evidence:** the stuck letter fully visible — `elementFromPoint` across
  its whole box returning the heading, not the app header — in **both**
  themes at 375px; the rail's own drag-to-jump still working (that is what
  the file exists for); and the A–Z jump landing correctly, since
  mission-R2 records that `scrollIntoView` does not reliably scroll a
  `position: sticky` target and sticky is now, for the first time, real.

### C5 — the loaders split (mechanical)
- **Status:** **DEFERRED — Fury's call, with the measurement that changed
  it.** Not dropped: routed to whichever mission next genuinely works in
  `useScheduleWindow.ts`, for Captain to re-seam.
- **Why the named candidate is no longer a clean seam.** Captain named
  `useScheduleLoaders.ts` at CV3's pass 3 — **before C12 added the window
  generation guard.** Measured now, `loadBackward`/`loadForward` close over
  **ten** distinct bindings (`windowGeneration`, `backwardInFlight`,
  `forwardInFlight`, `currentWindow`, `fetchersRef`,
  `hasLoadedBackwardOnce`, `prepareAdjustment`, `setState`,
  `setLoadingBackward`, `setLoadingForward`). Extracting them means either
  threading ten things into a new hook or moving most of the hook with
  them — and the code being moved is the generation guard, the single most
  delicate thing in CV3, which took **four** contracts to get right and
  whose `finally` semantics a careless move would quietly break.
- **The trade, stated plainly:** the gain is organisational (431 → under a
  **soft** cap, which STRUCTURE.md itself makes a NOTE and never a
  blocker); the risk is re-opening a bug that cost four contracts and a
  budget extension. Nothing in CV4 touches this hook, so nothing is
  blocked by waiting. **This is new information since Captain's ruling,
  not a disagreement with it** — Captain should pick the real seam with
  the guard in view.
- `useScheduleWindow.ts` is 431/350. Extract `loadBackward`/`loadForward`
  into `src/lib/useScheduleLoaders.ts`, the precedent being
  `useScheduleSentinels.ts` and `useScrollAnchor.ts` from CV3.
  **The generation guard must move intact** — it is the whole of CV3's
  final blocker fix, including the `finally` case.
- **Boundaries:** may touch `src/lib/useScheduleWindow.ts`, new
  `src/lib/useScheduleLoaders.ts` · must not touch `scheduleWindowState.ts`,
  its tests, `ScheduleView.tsx`, `useScheduleSentinels.ts`.
- **Evidence:** behaviour-identical — re-run CV3's own two controls (a
  refused reopen → zero further POSTs; Today tapped with a load in flight
  → today's row arrives, nothing beyond the pre-tap frontier requested).
  Report both files' line counts.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| — | C1 + C2 | DONE `f7edaa3`, `33a934f` | — | Optimistic flip proven mid-flight; three pill kinds in one real cell, lanes unchanged by construction |
| — | C3 | **BLOCKED-ON-CONTRACT** | — | Fury's boundary wrong: 4 roster queries not 2, one of them a create page, and the real blocker sits in the forbidden `actions/**`. Rewritten as C3b |
| — | C4 | DONE `0ef18ac` | — | `clip` not `hidden`; guard's job proven intact at 375/320 across 8 pages. **Two findings: the app's own header was inert too and now pins app-wide; RecipeList's offset is now 9px wrong → C6** |
| — | C3b + C6 | DONE `7b0dc1c`, `12336ca` | — | Carve-out read fresh from the row; non-vacuity proven by stash (3 of 9 fail pre-fix). **Builder left both uncommitted — Fury caught it via `git log`, re-ran the gauntlet, sealed them** |
| — | C5 | **DEFERRED → CLOSED by Captain** | — | Captain withdrew its own CV3 candidate and ruled the file is **not** a split candidate: 431 lines, **172 of code** (60% documentation) |
| 1 | Captain | **PASS** | 0 | 8 notes, 2 rulings, 3 amendments. Found the `scroll-mt-16`/227px defect **by reading** and routed it to Strange |
| 1 | Vision | **BLOCKED** | 1 | The month observer's rect is **inverted below 1135px** — label frozen on WebKit, i.e. every iPhone. 6 notes |
| 1 | Strange | **BLOCKED** | 2 | Confirmed the anchor defect **by measurement** (3/3, `visiblePx 0`); plus a **double month label on landing** that C4's record says cannot happen. 3 notes |

## Handoff log

- 2026-09-05 — Opened on `main` at `cdafb91` (CV3 merged and deployed).
  Bryce approved all four fixes plus the sequencing ("that small mission
  and then continue to CV4"). Fury did the reconnaissance inline instead
  of assembling Banner, and it **moved C2's boundary** — `MonthCell`
  cannot tell an open task from an event, so `MonthGrid` is in scope.
  Constitution edits (D4) made by Fury before any dispatch.
- 2026-09-05 — C1 and C2 DONE and audited by Fury (diff read, not trusted).
  **C3 returned BLOCKED-ON-CONTRACT and the builder was right.** Fury
  verified the diagnosis independently: `validatedPeople` is duplicated in
  both action files and refuses any deactivated id on every write, there
  are four roster queries rather than two, and one of the two named was a
  create page. Rewritten as **C3b** with the security shape spelled out
  (the "already assigned" fact must be read from the row, never from the
  client). **Fourth boundary error of this exact shape in three missions —
  the preflight tool Fury proposed to Bryce is aimed squarely at it.**
- 2026-09-05 — C4 DONE and audited by Fury. Two findings routed rather
  than absorbed: the app-wide header pin (**surfaced to Bryce**, section
  above) and RecipeList's now-wrong 64px offset (**C6**). C3b and C6
  dispatched together — disjoint file sets, and one builder per tree
  avoids the `.next`/index collision two would cause.
- 2026-09-05 — C3b and C6 DONE; **Fury committed them** after finding the
  builder had left five files modified and zero commits while reporting
  DONE. Gauntlet re-run on that tree before sealing. C5 **deferred** with
  its measurement recorded. **All build work is complete; three gates
  dispatched in parallel, each in its own worktree and port** — three
  simultaneous `npm run build`s in one tree collide on `.next`, which cost
  a gate a rebuild last mission.
- 2026-09-05 — **Gate round 1: Captain PASS, Vision BLOCKED (1), Strange
  BLOCKED (2).** Three distinct defects, all in `ScheduleView.tsx`, all
  from C4, all invisible on a laptop. Batched as **C7**; the three
  converging deactivated-marker findings batched as **C8**, so one
  re-gate covers both. Captain's `useScheduleLoaders` deferral is now
  **closed** by Captain's own ruling, not merely deferred.

### The gate round — Captain PASS, Vision BLOCKED, Strange BLOCKED

**Two gates found one defect from opposite directions, and that is the
headline.** Captain found `ScheduleView.tsx:385`'s stale `scroll-mt-16`
**by reading** the source against C4's own imported constants, called it a
NOTE in its own domain, and explicitly routed the behavioural half:
*"Strange should measure whether Today now lands behind the bars. If it
does, that is a BLOCKER in your domain."* Strange then measured it
independently and blocked. Fury had verified the code fact in between.
Three routes, one defect — the clearest demonstration this arc that the
gates are not redundant.

**Vision — BLOCKED (1).** `ScheduleView.tsx:329`'s
`rootMargin: "-227px 0px -80% 0px"` produces an **inverted, empty
observation rect on every viewport shorter than 1135px**. Fury re-derived
it: at 375×812 the band runs 227 → 162.4, i.e. **−64.6px tall**. Chrome
clamps it to a zero-height line and counts edge-adjacency, so it *appears*
to work; **WebKit** (`edgeInclusiveIntersect`, unclamped) never
intersects. Measured on Playwright WebKit 26.6: **65 steps, 0 label
changes, 14 mismatches**, stuck on "September 2026" while January 2027
spanned the bar. **WebKit is the family's engine — every iPhone and the
installed PWA.** Bryce's own refinement is broken on the devices it was
built for and correct on the laptop it was tested on. **Third time this
project has verified on the wrong device.** The comment claiming `-80%`
"gives that band real height" is false below 1135px.
Vision's other work all held: the loosened people guard was replayed over
**live HTTP** with forged inputs — kid, ghost cookie, no cookie,
nonexistent userId, a forged third argument, and a forged
`alreadyAssignedUserIds` smuggled into the input — all refused, positive
control first. C4's overflow guard re-proven 16/16.

**Strange — BLOCKED (2).**
1. **The anchor defect, measured.** `?date=…&view=schedule` scrolls to
   y=323 and lands the target day at `top 64`, `bottom 212` —
   **`visiblePx: 0`**, `elementFromPoint` at its top returns the app
   header, and **the first day actually rendered is the next one.** 3/3.
   Not one date's arithmetic: every unclamped anchor landed at exactly
   `top 64`. *"The UI claims it took you to the day you asked for; it
   shows you a different day."*
2. **The double month label — which D2 exists to prevent and C4's record
   says cannot happen** (*"No two copies of a month name are ever
   simultaneously visible"*). Both the portaled label and the in-list
   divider are visible together from **scrollY 0–120, and Schedule lands
   at scrollY 24 — inside that range.** C4's check was right for the range
   where the divider passes *under* the opaque bar and missed the landing
   range where it sits *below* it. Structural: the top of any month puts
   its divider under a pinned label saying the same words.

**What Strange confirmed working:** the app-wide header pin holds on all
12 pages with **zero controls made unreachable** (full-scroll-range sweep
at 375 and 320; 158 focusable controls, none landing under the header),
the P2 `backdrop-filter` portal bug has **not** returned, blur reads
correctly in both themes; C1's flip restyles at **frame 1, 21ms**, reverts
byte-identically on a real refusal, and Delete can never appear beside
Mark complete (`completeAndDeleteEverVisibleTogether: false`), so the
carve-out cannot read as inconsistency; C2's three pill kinds are
distinguishable at 375 in both themes (contrast 5.38–13.68); C6's letter
sits at exactly 73px, **0px clipped**, 9/9 sweep, rail drag still tracking.

**Notes carried:** the deactivated marker is typographically identical to
a name (`--muted` is the app's existing "the app is talking, not the data"
signal — same instinct as the `~` estimate mark); the suffix is written
back into `current.people` on save, so a second edit in one session shows
it twice; `validatedPeople`'s pure decision should live in `src/lib/`
where `npm test` can reach it (Vision **and** Captain, independently);
`RecipeList`'s rail is off by one letter at 375×667 — **pre-existing**,
but it contradicts C6's "lands correctly", which was measured taller; a
TOCTOU window between the people read and the write (manager-only, not
client-exploitable, acceptable at household scale).

**Strange could not exercise the cross-month swap** — its environment
never loaded a second month — so that half of F4 rests on the builder's
walk and Vision's WebKit measurement, not on Strange's. Recorded rather
than glossed.


### C7 — the pinned header's three defects (fix batch)
- **Status:** PENDING
- All three live in `ScheduleView.tsx` and all three are the same mistake
  repeated: **227px of chrome appeared and the numbers describing the top
  of the list were not re-derived from it.**
  1. **(Vision, BLOCKER)** `:329`'s inverted `rootMargin`. Preferred fix
     is to **delete the observer** for a scroll-driven "which `<section>`
     spans y = TOP" read — 5–12 sections, trivial, and it is what the
     label actually means. Removes the whole class rather than patching
     the band. Rewrite the false comment.
  2. **(Captain + Strange, BLOCKER)** `:385`'s `scroll-mt-16`. Use the two
     constants the file already imports, as C6 did in `RecipeList.tsx`.
     **First check whether these rows ever render where the Schedule bar
     is not pinned** — if so the margin must follow the real chrome, not a
     constant sum.
  3. **(Strange, BLOCKER)** the double label. **Fury's call: make the
     in-list month heading `sr-only`.** D2 said one visible label and the
     pinned bar owns it; a "plain divider" that renders the month's name
     is still a month label. `sr-only` — never `hidden`, which is
     `display:none` and **strips the element from the accessibility
     tree** (K2's own finding, where Month at phone width exposed 0 event
     names) — keeps per-month headings in document order for a screen
     reader while the bar carries the only visible one. Week dividers
     already mark structure inside a month.
- **Boundaries:** may touch `src/components/ScheduleView.tsx` · must not
  touch `CalendarHeader.tsx`, `globals.css`, `calendarViewConfig.ts`,
  `useScheduleWindow.ts`, `RecipeList.tsx`, `actions/**`, `prisma/**`.
- **Evidence — outcomes, on the right engine.** **Playwright WebKit is
  mandatory; a Chrome-only pass is exactly what shipped this.** Production
  build, 375×812, both themes. **Positive controls first, reproducing each
  defect on the current tree**, then: the label changes once per crossing
  **on WebKit and Chrome**; an anchored day lands **below 227px**, fully
  visible, `elementFromPoint` returning the row; exactly **one** visible
  month label across the **whole** scroll range including the landing
  range 0–120; the `sr-only` heading still present in the accessibility
  tree. Both anchor call sites — deep link and in-view. **Do not disturb
  what CV3 proved:** a refused reopen → zero further POSTs; mid-page
  flicks → zero.

### C8 — the deactivated marker, done properly
- **Status:** PENDING
- Three findings converge on one cause — the status is encoded **into the
  name string**. Strange: it renders identically to a name (`fontWeight
  500`, same colour, same selected chip), reading as a longer name rather
  than the app annotating a status. Vision: `onSaved` writes the suffixed
  name back into `current.people`, so a second edit in one session yields
  **"(no longer active) (no longer active)"**. Captain (N6): a
  presentation fact became data — any future consumer that sorts,
  searches, compares or copies `displayName` inherits the suffix silently.
- **Fix:** carry a real `deactivated` flag on `CalendarPersonView` and
  render the marker, in `--muted` — the app's existing "the app is
  talking, not the data" signal, the same instinct as the `~` estimate
  mark. Never mutate `displayName`. This also lets Captain's N5 land: the
  task path currently *infers* deactivation from absence from the active
  roster, which holds only because `User` rows are never deleted; move it
  to the event path's explicit server-side shape so one mechanism answers
  the question and the label string has one home.
- **Boundaries:** may touch `src/lib/types.ts`,
  `src/app/(app)/calendar/[id]/edit/page.tsx`,
  `src/app/(app)/calendar/page.tsx`, `src/components/TaskDetailSheet.tsx`,
  `src/components/EventPeopleField.tsx` · must not touch `actions/**`
  (C3b's guard is verified and stays), `prisma/**`, `ScheduleView.tsx`,
  `globals.css`, `RecipeList.tsx`.
- **Evidence:** the marker visually distinct from a name (measure the
  colour difference, both themes); **edit twice in one session and show
  the marker appears exactly once**; `displayName` proven unsuffixed at
  the type boundary; ids still what get written. No `User` row may be
  created, updated, deleted or deactivated — render the exact shape the
  server supplies, as Strange did.

## ⚠️ Surfaced to Bryce — an app-wide change he has not seen

**C4's fix makes the app's own global header pin on every page.**
`(app)/layout.tsx:92` has carried `sticky top-0 z-40 … backdrop-blur`
since it was written and has **never once stuck** — C4 measured it
scrolling away in lockstep with the page (`top = -scrollY`) before the
fix, and holding at `top: 0` after. Nobody chose this today; whoever wrote
that class chose it, and the CSS silently overrode them.

It is defensible as *restoring intent* rather than a new decision, and it
is what almost every app does. But it is visible on **every screen in the
app**, it costs 73px of a phone's height, and Bryce has never seen it. So
it is his call, not Fury's: **keep it (one line, already done) or opt the
header out (one class).** Strange gates it across pages either way.

## Delivery

_Pending._
