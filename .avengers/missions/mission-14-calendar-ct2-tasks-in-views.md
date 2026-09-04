# Mission: CT2 — Tasks in every view, the detail sheet, and mark-complete

**Project:** family-hub (Marshee)
**Status:** INTERROGATING
**Started:** 2026-09-04 · **Updated:** 2026-09-04

## Why this mission, and why now

CT1 built Tasks end to end — schema, guarded actions, a form, and a place
in the "+" sheet — but **a task saves and then appears nowhere**. That was
deliberate ("the destination exists before the trigger"), and CT2 is the
phase that closes it.

**It is also now the gate on shipping the whole calendar.** Bryce's
decision, 2026-09-04: the four stacked PRs (#9 → #10 → #11 → #12) merge
as **one complete release after CT2**, so nothing half-visible reaches
the family. He was offered "merge now" (Fury's recommendation) and "hold
until Google sync" (his own first instinct, which would have held
everything until K6/K7 — the far end of the roadmap, gated on a Google
Cloud account only he can create) and chose the middle deliberately.
So: **CT2 is the last mission before the calendar goes live.**

## Brief

- **Goal:** Tasks render everywhere events do, can be opened, and can be
  marked complete — including by a kid, on their own task.
- **Done means** — each observable:
  1. A task created through the form **appears** in the calendar views.
  2. Tapping it opens a detail sheet with title, details, people, due
     date, Mark complete / Mark not complete, Edit and Delete.
  3. A **kid** can complete a task they are assigned to, and cannot
     complete another's or edit anything — proven by attacking the action
     directly with a minted cookie, Phase-1e style, positive control first.
  4. A completed task reads as *done*, distinctly from an event that has
     merely *already happened*.
  5. Gauntlet green in all three timezones; database back to exact
     baseline.
- **Out of scope:** the Schedule view (CV3), the hour timeline (CV4),
  Month text pills / Year (CV5), recurrence UI (K4), Google sync (K6/K7).
  CT2 renders tasks in the views that **exist today**.

## Danger register (absolute)

- **`npm run db:seed` / `npm run db:reset` forbidden.** Scoped
  `db:seed-tasks` / `db:clean-tasks` only — and note CT1 gave those a
  **sentinel** discriminator, so they now genuinely refuse rows they did
  not create.
- **No committed script may create, update or delete `User` rows.**
- **Never a Neon branch reset** — that is Bryce's console action.
- **The migration file `20260904144140_…` must not be edited.** Its
  checksum is patched in `_prisma_migrations` on dev; any edit reintroduces
  drift. It is also **unmerged**, so production applies it fresh.
- Baseline: `Task 0, TaskPerson 0, CalendarEvent 4, User 5`. **`CalendarEvent`
  must read 4** — one is a real family event.
- Dev branch holds real family data. **Report roles and counts, never
  names or titles.**
- **Never `git add -A` / `git add .`.** Stage by explicit path.

## Gauntlet

- `npx tsc --noEmit` · `npx eslint .` · `npm run build`
- `npm test` (pins `TZ=America/Denver` internally)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`
- `TZ=America/Los_Angeles node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`

CI now runs all three legs (CT1/C5). If a new test directory appears, its
glob entry ships in the **same commit** — the glob is hand-enumerated in
**three** places now (`package.json` plus two CI steps), which is worse
than the one AGENTS.md warns about.

## Standing constraints inherited from CT1

- **`CalendarViews.tsx` is at 348/350.** Captain's ruling stands as a
  written trigger: *the next mission that must add a line to that file
  performs the `ViewConfig` → `src/lib/calendarViewConfig.ts` extraction
  first, whether or not it is CV3.* C4b spent the one duplication that was
  available to pay for a line; there is nothing left to spend.
- **`line-through` is permitted for a completed task and only there.**
  DESIGN.md forbids it for past events because "already happened" ≠
  "done". The distinction must be stated in code, not just obeyed.
- **A third guard form (membership) exists but is NOT yet in STRUCTURE.md**
  — Captain drafted the amendment; Bryce has not approved it. Do not
  self-authorize; follow the pattern, don't document it.
- `parseLocalDateString` lives in `EventDateTimeFields.tsx`. Captain's
  trip condition: **a third consumer, or any consumer outside
  `src/components/`, makes moving it to `src/lib/` mandatory.**
- Two app-wide notes deliberately uncharged: form text at 4.33:1, and the
  calendar-shaped loading skeleton on form routes. Re-flag only if made
  worse.

## Assembled

- **Stark + Vision** — always.
- **Strange** — this mission is almost entirely things a human sees.
- **Captain** — new components and a type that must thread through several
  view files; plus `CalendarViews.tsx` sits at its cap.
- **Banner** — dispatched first.

## Contracts

_Pending Banner's brief._

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| — | — | — | — | — |

## Handoff log

- 2026-09-04 — Mission opened on `claude/calendar-ct2-tasks-in-views`,
  branched from CT1 at `2109f75` (CT1 DELIVERED, all three gates PASS).
  Banner dispatched. **This is the last mission before the four-PR stack
  merges as one release** — Bryce's decision, recorded above.

## Delivery

_Pending._
