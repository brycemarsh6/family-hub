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
- **Status:** PENDING
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
- **Status:** PENDING (dispatched after C1–C3 land — same tree)
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

### C5 — the loaders split (mechanical)
- **Status:** PENDING (last; needs C4 landed to avoid an index collision)
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

## Delivery

_Pending._
