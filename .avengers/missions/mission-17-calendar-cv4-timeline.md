# Mission: CV4 — the hour timeline (Day / 3 Day / Week)

**Project:** family-hub (Marshee)
**Status:** CONTRACTED
**Started:** 2026-09-06 · **Updated:** 2026-09-06

## Brief

- **Goal:** Day, 3 Day and Week become real **hour timelines** — events
  placed on a 24-hour rail by their actual times, overlapping ones side by
  side, all-day items in a strip above. This is the biggest visible change
  left in the calendar and the last of the plan's core view work.
- **Done means:**
  1. Day / 3 Day / Week render a timed grid, not a list.
  2. Overlapping events sit side by side and are individually tappable.
  3. A now-line tracks the real clock; opening scrolls to now (or 7 AM).
  4. All three are reachable from the picker; nothing unbuilt is.
  5. Gauntlet green in all three timezones; database at exact baseline.
- **Out of scope:** Month text pills / Year (CV5), the month dropdown and
  swipe paging (CV6), drag-to-reschedule (CD1), filters (K3),
  recurrence (K4). **Schedule is finished — do not wire the timeline to
  `useScheduleWindow`** (the plan says so explicitly; ±61 days suffices).

## Decisions — don't re-litigate

- **D1. `timelineLayout.ts` (CV2) is consumed here or deleted here.** It
  was built one phase early against a written plan and has had **no
  application caller for two missions**. STRUCTURE.md's dormant-export
  rule and Captain's CV2 Ruling 5 set the deadline at this phase: **if CV4
  ships without consuming it, delete it and both its test files.**
- **D2. A fixed 24-row wall-clock rail** (CV2's recorded reasoning): a day
  is always 1440 rail minutes even when DST makes it 23 or 25 hours long,
  so the hour gutter never lies about where "2 AM" sits. Google and Apple
  trade the same way.
- **D3. `blockGeometry` cannot read `allDay`** — its parameter type
  excludes it, which makes "the timed path must never read an all-day
  row's stored times" a compiler refusal rather than a rule to remember.
  Captain called it the strongest thing in that file. **Do not weaken it.**
- **D4. One packer.** The all-day strip feeds the *existing*
  `monthLayout.assignLanes` — `TimelineEvent` is structurally identical to
  `MonthLayoutEvent` for exactly this reason. No second packer.
- **D5. Contrast by border, not alpha** (mission-9/C7's ruling for Month
  pills). At 375px a Week column is ~44px, so a block is a colour band
  with 2–3 characters — Google does the same. Day shows location; 3 Day
  and Week do not.

## Danger register (absolute)

- **The app is LIVE.** `main` deploys to the family's production app.
- Never `npm run db:seed` / `db:reset`; never a Neon branch reset. Scoped
  `db:seed-calendar` / `db:clean-calendar` / `db:seed-tasks` /
  `db:clean-tasks`, or uniquely-titled rows deleted by id.
- **No agent may create, update, delete or deactivate a `User` row.**
- **Do not edit any existing migration.** Nothing here needs one.
- Baseline: `Task 0, TaskPerson 0, CalendarEvent 4, User 5`.
  **`CalendarEvent` must read 4** — one is a real family event.
- Dev branch holds real family data. **Report roles, positions and
  counts — never names or event titles.**
- **Never `git add -A` / `git add .`.** Stage by explicit path.
- **State what is in the database at the moment you measure anything
  data-dependent.** Mission-16 round 3: a parallel gate's rows lifted a
  scroll clamp and made a broken anchor read as fixed, **16 runs running,
  across two different gates.**

## Gauntlet

`npx tsc --noEmit` · `npx eslint .` · `npm run build` · `npm test`
(**317** baseline, pins Denver) · the direct `TZ=UTC` and
`TZ=America/Los_Angeles node --import tsx --test src/lib/*.test.ts
src/lib/voice/*.test.ts` legs.

## Process changes, first mission under them (Bryce approved 2026-09-05)

1. **Builders run in parallel, each in its own git worktree on its own
   branch**, merged back by Fury. Mission-16 ran 2h23m of strictly
   sequential builder work over barely-overlapping files; the gates have
   used worktrees for two missions and builders never did. Disjoint file
   sets are a precondition, not a hope — Fury verifies it before
   dispatch.
2. **Gate proportionally.** Not every contract earns three gates at full
   sweep. Mission-16 swept twelve pages in two themes partly to check a
   one-line glyph.
3. **Split by risk.** Small and safe must not wait behind large and
   risky; mission-16's instant-checkbox fix was finished at 14:43 and
   shipped after 22:00.

## Standing constraints

- **The built-in browser pane cannot gate any of this.** It runs hidden:
  `IntersectionObserver` and `requestAnimationFrame` **never fire**, and a
  screenshot forces exactly one frame — which is how it looks like it
  works. Real headless Chrome **and WebKit** over CDP/Playwright, on a
  **production build**, own port.
- `body.scrollWidth`, never `documentElement.scrollWidth`.
- Three states — loading, genuinely empty, outside the loaded window —
  must never be mistakable for each other.
- **`CalendarViews.tsx` is at 349/350.** Captain's ruling (mission-16,
  pass 2, measured): **do NOT extract the sheets block** — 13 props for 62
  lines — spend the budget on C3 below instead, which removes a real
  hazard and shrinks the switch as a side effect.
- Caps are judged on **code** lines now, and both counts get reported.

## Assembled

- **Stark ×2 in parallel** (C1 ∥ C2), then sequential for C3, C4.
- **Vision** — always.
- **Strange** — a whole new rendering model the family will use daily.
- **Captain** — a new component, a new lib module, and C3 is his own
  standing ruling coming due.
- **Banner** — not assembled; Fury did the reconnaissance inline (the
  plan's CV4 section is unusually specific, and `timelineLayout.ts`'s
  exports were read directly).

## Contracts

### C1 — `appChrome.ts`: the chrome height gets one home
- **Status:** PENDING · **runs parallel with C2**
- Captain's N3 ruling, now a written rule (STRUCTURE.md, Bryce-approved
  2026-09-05) and named there as **CV4's first contract**. Move
  `APP_HEADER_HEIGHT_PX` out of `CalendarHeader.tsx` — it is a fact about
  `(app)/layout.tsx`, and `RecipeList.tsx` already refuses to import a
  calendar component for it and re-derives it at runtime instead. New
  `src/lib/appChrome.ts` exports **both** the constant and the measuring
  hook; the constant is documented as the first-paint seed, because a pure
  runtime measure is `null` for one paint — fine for a `scroll-mt`, **not**
  fine for a pinned `style={{ top }}` (visible jump).
  `SCHEDULE_HEADER_BAR_HEIGHT_PX` and `SCHEDULE_TITLE_SLOT_ID` **stay** in
  `CalendarHeader.tsx`; they are facts about that component.
  `(app)/layout.tsx` gains a comment naming its dependents — the second
  half of the rule.
- **Rider (Captain, mission-16 N7):** `ScheduleView.tsx` computes
  `APP_HEADER_HEIGHT_PX + SCHEDULE_HEADER_BAR_HEIGHT_PX` in three places.
  Name it once. Verbosity, not risk — but this is the contract that
  touches all of it.
- **Boundaries:** may touch new `src/lib/appChrome.ts`,
  `src/components/CalendarHeader.tsx`, `src/components/ScheduleView.tsx`,
  `src/components/RecipeList.tsx`, `src/app/(app)/layout.tsx` · must not
  touch `calendarViewConfig.ts`, `CalendarViews.tsx`, `globals.css`,
  `useScheduleWindow.ts`, `useScheduleMonthTitle.ts`, `actions/**`,
  `prisma/**`, anything under `src/lib/timelineLayout*`.
- **Evidence:** behaviour identical — Schedule's pinned bar still stacks
  at 73/154 with no gap, its anchored day still lands at 227, and
  Recipes' A–Z letter still clears the header with a 9-point
  `elementFromPoint` sweep. Both engines, both themes, production build.

### C2 — `TimelineGrid` + `useNowMinute` (the heart of CV4)
- **Status:** PENDING · **runs parallel with C1**
- One component: `TimelineGrid({ columnDays, events, today, now,
  windowStart, windowEnd, onOpenEvent })`. `columnDays` is `[anchor]` /
  `[anchor,+1,+2]` (**anchor-relative, not snapped** — Google's
  behaviour) / `daysOfWeek(sundayOf(anchor))`.
- **Consumes `src/lib/timelineLayout.ts`** — `partitionForTimeline`,
  `blockGeometry`, `assignColumns` — and feeds the all-day strip to the
  **existing** `monthLayout.assignLanes` (D4). **Do not add a second
  packer, and do not weaken `blockGeometry`'s parameter type (D3).**
- `HOUR_HEIGHT_PX = 48` in the component as `--hour-height`; 24 fixed
  rows; its own `overflow-y-auto` scroller, with the weekday header and
  all-day row `sticky` inside it. **Sticky genuinely works now**
  (mission-16 fixed the rule that made every `position: sticky` in the app
  inert) — this is the first component built after that, so verify rather
  than assume.
- New `src/lib/useNowMinute.ts` beside `useToday.ts` — same
  `useSyncExternalStore` shape, 60s tick, `null` on SSR. Vision asked for
  this hoist.
- **Scroll-to-now** on open when today is a column (now − ⅓ viewport),
  else 7 AM; `useLayoutEffect` keyed on the column set, active panel only.
- Hour labels through `Intl` on a synthetic non-calendar date.
- **Takes the chrome offset as a prop** — C1 is moving that constant in
  parallel, so this contract must not import it. Dependency injection,
  the `ScheduleFetchers` / `useScheduleMonthTitle` precedent.
- **Boundaries:** may touch new `src/components/TimelineGrid.tsx`, new
  `src/lib/useNowMinute.ts`, new `src/lib/useNowMinute.test.ts` · must not
  touch `timelineLayout.ts` (**consume it unchanged — if it needs a
  change, that is a finding, report it**), `monthLayout.ts`,
  `CalendarViews.tsx`, `CalendarHeader.tsx`, `calendarViewConfig.ts`,
  `ScheduleView.tsx`, `RecipeList.tsx`, `globals.css`, `actions/**`.
- **Evidence:** overlapping events side by side and **individually
  tappable at 375px**; a DST day (Nov 1 2026) rendering 24 rows with both
  1:30s on the rail; the now-line at the right rail minute; scroll-to-now
  landing where it claims; **44px targets** or a stated reason; the
  all-day strip proven to use the existing packer (not a copy).

### C3 — `pinned` and the renderer selection into `VIEW_CONFIG`
- **Status:** PENDING (after C1 — shares `CalendarHeader.tsx`)
- **Captain's own ruling, coming due exactly here.** `CalendarHeader.tsx`
  computes `const pinned = view === "schedule"` itself, and
  `CalendarViews.tsx` switches on the same string independently — two
  inline per-member tests where `VIEW_CONFIG` is a **total record over all
  six views**. STRUCTURE.md (amended 2026-09-05, Bryce-approved) makes
  this a **BLOCKER the moment a reachability entry flips**, and C4 below
  flips `threeDay`. So it lands *before* C4, not after.
- Captain measured the alternative and ruled against it: **do not extract
  the sheets block** (13 props for 62 lines). This is where the budget
  goes.
- **Boundaries:** may touch `src/lib/calendarViewConfig.ts`,
  `src/components/CalendarHeader.tsx`, `src/components/CalendarViews.tsx`
  · must not touch `TimelineGrid.tsx`, `appChrome.ts`, `ScheduleView.tsx`,
  `actions/**`, `prisma/**`.
- **Evidence:** every view's behaviour provably unchanged; the record
  total (a missing member is a compile error, demonstrated); report
  `CalendarViews.tsx`'s **code** and total lines.

### C4 — wire it up: the picker, the views, the skeletons
- **Status:** PENDING (after C2 + C3)
- `BUILT_VIEWS.threeDay → true`; Day and Week switch from the list
  renderer to `TimelineGrid`; measured `loading.tsx` shapes.
- **The picker ends this mission with six views, all built** — the first
  time since CV1 that the vocabulary and the renderers agree completely.
- **Per-column `isOutsideWindow`** → the not-loaded treatment in the
  all-day row, per `MonthCell`'s policy. Three states, never two.
- **Boundaries:** may touch `src/lib/calendarViewVocabulary.ts`,
  `src/components/CalendarViews.tsx`, `src/lib/calendarViewConfig.ts`,
  `src/app/(app)/calendar/loading.tsx` · must not touch `TimelineGrid.tsx`
  (consume it), `appChrome.ts`, `actions/**`, `prisma/**`.
- **Evidence:** all six views reachable and rendering; **skeleton heights
  measured, never guessed** (mission-7's lesson: a skeleton whose height
  you did not measure is a layout shift you have not noticed yet);
  Schedule and Month provably unchanged.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| — | — | — | — | _mission opened 2026-09-06_ |

## Handoff log

- 2026-09-06 — Opened on `claude/calendar-cv4-timeline` from `main` at
  `17b6e60` (mission 16 merged and deployed). **The five STRUCTURE.md
  amendments Bryce approved are the first commit on this branch**, and two
  of them (the chrome-dimension rule, the `VIEW_CONFIG` totality clause)
  bind C1 and C3 directly. **First mission running builders in parallel
  worktrees** — C1 ∥ C2 dispatched together, file sets verified disjoint
  before dispatch.

## Delivery

_Pending._
