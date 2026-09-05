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
- **Status:** PENDING
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
- **Status:** PENDING
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
- **Status:** PENDING
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
| — | — | — | — | _mission opened 2026-09-05_ |

## Handoff log

- 2026-09-05 — Opened on `main` at `cdafb91` (CV3 merged and deployed).
  Bryce approved all four fixes plus the sequencing ("that small mission
  and then continue to CV4"). Fury did the reconnaissance inline instead
  of assembling Banner, and it **moved C2's boundary** — `MonthCell`
  cannot tell an open task from an event, so `MonthGrid` is in scope.
  Constitution edits (D4) made by Fury before any dispatch.

## Delivery

_Pending._
