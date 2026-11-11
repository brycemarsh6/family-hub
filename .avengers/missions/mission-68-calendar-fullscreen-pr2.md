# Mission 68: Calendar full screen PR 2, the + bubbles

- **Status:** DELIVERING (gates passed 2026-11-10)
- **Plan:** `.avengers/plans/calendar-fullscreen-v1.md`, "PR 2: The + bubbles (decision 6)"
- **Branch:** `claude/calendar-fullscreen-pr2`, cut from `origin/main` (`ffd0c94`, PR 1 merged)
- **Chat:** run in the PR 1 chat at Bryce's request (2026-11-10, "Just do the PR in this chat"), because Remote Control could not open a new chat.

## Brief

Tapping the Calendar's + dims the page; Event and Task bubbles pop up right
above it; the + becomes an X. A bubble opens that form for the anchored day
(`/calendar/new` or `/calendar/new/task` plus the existing
`addSheetDateParam`). The X or the dim page closes it. Replaces the Add
`ActionSheet` in `CalendarSheets.tsx`.

## Done means

- The above on all six views, phone and iPad; Tablet login still sees no +.
- `aria-expanded` on the +, focus moves to the first bubble, Escape and the
  dim close it; the open animation has an instant fallback for reduce motion.
- Bubbles at least 48px tall, clear of the home indicator and the iPad edge.
- The old Add sheet state is gone, not orphaned.
- DESIGN.md "Sheets are the house dialog" gains the Calendar add menu as a
  named exception (one-handed reach).
- Gauntlet green, gates pass, merged, production deploy checked,
  `git log origin/main..HEAD` empty, phone test in `.avengers/status.md`.

**Out of scope:** any other page's +; the slide (PR 3); everything after.

## Danger register

Same as AGENTS.md: never `npm run db:seed` / `db:reset`; never a clean or
reset script for `User`; migrations additive only (none expected); never
print `.env`; stage by explicit path; no direct pushes to `main`. Dev data
only through scoped `db:seed-*` / `db:clean-*` scripts.

## Gauntlet

`npx tsc --noEmit`, `npm run lint`, `npm test`, the AGENTS.md `TZ=UTC` line,
`npm run build`.

## Assembled

Stark, Vision, Strange. No Captain (one small new component, no split; the
plan names Captain only for layout, slide, drag, repeating, dropdown and
search). No Banner (the code is already read: `CalendarSheets.tsx`,
`FloatingAddButton.tsx`, `CalendarViews.tsx:463`).

## Mock

`.avengers/mocks/calendar-pr2-bubbles-mock.html`: 393 Week before and after
the tap, 1024 Week after. White bubbles (`bg-surface`, accent icon), Task
above Event (Event nearest the thumb), the house dim (`bg-black/40`).

## Contracts

### C1 - The + bubbles
- **Status:** DONE (Stark 2026-11-10: new `CalendarAddDial` 107 lines, `role="menu"`; `FloatingAddButton` gains `expanded` and `buttonRef`; Add sheet and `addingEvent` removed; CalendarViews 502 to 498; tsc, lint, 1819 tests, TZ=UTC 1812 plus 7 DST skips, build green; not run in a browser)
- **Objective:** the Calendar's + opens Event and Task bubbles above it on
  a dimmed page, replacing the Add `ActionSheet`, as in the mock.
- **Boundaries:** may touch: new `src/components/CalendarAddDial.tsx`,
  `src/components/FloatingAddButton.tsx`, `src/components/CalendarSheets.tsx`,
  `src/components/CalendarViews.tsx`. · must not touch: everything else,
  including DESIGN.md, STRUCTURE.md, `docs/**`, `.avengers/**` (Fury's),
  `ActionSheet.tsx` (other pages use it) and `globals.css`.
- **Work:**
  1. New `CalendarAddDial` (client component, plan's working name
     `AddSpeedDial`). Props: `dateParam` (the existing `addSheetDateParam`
     string). It owns its own `open` state. Closed: the round + exactly as
     PR 1 draws it (`FloatingAddButton placement="right"`, label "Add").
     Open: a full-screen dim (`fixed inset-0`, `bg-black/40`, the house
     sheet dim, a real `<button aria-label="Close">`) above everything on
     the page including the top bar and menu button; above the dim, in the
     same spot as the +, the same round button showing an X (Lucide `X`,
     label "Close"), and directly above it a right-aligned column of two
     pills: Task on top, Event nearest the X. Pills: `bg-surface text-fg`,
     `min-h-12` (48px) in rem, `rounded-full`, shadow, `font-semibold`,
     the accent-colored icons the old sheet used (`ListChecks` for Task,
     `CalendarDays` for Event), gap between pills and above the X so
     nothing touches. Clear of the home indicator because they sit above
     the + which already respects `env(safe-area-inset-bottom)`.
  2. Behavior: tapping a pill closes the dial and `router.push`es
     `/calendar/new${dateParam}` or `/calendar/new/task${dateParam}`
     (exactly what the old sheet did). The X, the dim and Escape close it.
     The + has `aria-expanded` and `aria-haspopup="menu"` (or an equivalent
     the code can justify); on open, focus moves to the first pill (Task);
     on close by X / dim / Escape, focus returns to the +. A short pop-in
     (fade and rise, about 150ms) is fine; `globals.css` already gives
     every animation an instant fallback under reduce motion, so do not add
     a second one.
  3. `FloatingAddButton` may gain only what the dial needs (for example an
     `expanded` prop that swaps the icon to X and sets `aria-expanded`, or a
     way to raise its z-index while open). Its default look and
     `placement="auto"` behavior on every other page must not change.
  4. Remove the Add `ActionSheet` and its props (`addingEvent`,
     `onCloseAdding`, `addSheetDateParam`) from `CalendarSheets.tsx`, and
     the `addingEvent` state from `CalendarViews.tsx`, so nothing is left
     orphaned. Update the comments in both files that count or name the
     sheets (the "four sheets" / "fifth" headers) so they stay true.
     `CalendarViews.tsx` renders `{canManage && <CalendarAddDial ... />}`
     where the + is today. Keep `CalendarViews.tsx` at or under its current
     502 lines.
- **Verification:** `npx tsc --noEmit`, `npm run lint`, `npm test`, the
  AGENTS.md `TZ=UTC` line, `npm run build`; all green.
  `grep -rn "addingEvent\|onCloseAdding" src` is empty. `git diff --stat`
  shows only the may-touch files (plus Fury's mission file and mock).
- **Evidence required:** the diff; command output; the grep; line counts
  of the four files.
- **Done criteria:** green; Strange measures the bubbles in the running app
  (393 and 1024, Normal and Largest, light and dark), Vision confirms the
  old sheet state is gone and the focus rules hold.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Strange (HEAD e31394d) | PASS | none | Pills 48px (72 at Largest), 12px apart, 20px above the X, right edges aligned; X exactly where the + was in all 11 states; dim covers top bar and menu on six views at 393, 1024, 768; contrast light 7.88/5.75/5.08, dark 13.68/8.39/7.93; X, dim, Escape close and focus returns; Task from Day lands on 11/20, Event from Month on 12/03; Recipes and Habits + unchanged. Notes: DESIGN.md:197 still said "Add sheet" (Fury fixed); Event to X gap 20px vs the mock's 12px (accepted, the + spot is PR 1's); dark pills faint against the dim (labels crisp; `ring-1 ring-line` if Bryce wants more); kid, Tablet and pinned menu checked in code only |
| 1 | Vision (HEAD e31394d) | PASS | none | Gauntlet re-run green (1819; UTC 1812 plus 7 DST skips; build exit 0); boundaries clean; Add sheet state fully gone; date param unchanged; z-order checked; ARIA valid. Notes: `role="menu"` without arrow keys; no focus trap (keyboard only, same as ActionSheet); two "Close" buttons for a screen reader (house pattern) |

## Handoff log

- 2026-11-10: branch cut from `origin/main` `ffd0c94`; mission number 68
  (none on `origin/main`). Mock drawn and sent to Bryce.
- 2026-11-10: Bryce: "Yes". C1 written, preflight 0 hard failures, Stark DONE.
  Fury wrote the DESIGN.md exception and the layout.md prop sentence.
- 2026-11-10: gate pass 1: Vision PASS, Strange PASS. Fury fixed the
  DESIGN.md + paragraph ("Add sheet" became the bubbles). Delivery next.

## Delivery

- **Shipped:** C1 on `claude/calendar-fullscreen-pr2`: the Calendar + opens
  Task and Event bubbles over the house dim and turns into an X; the Add
  sheet is gone. DESIGN.md exception and + paragraph, layout.md props,
  phone test in `.avengers/status.md`, CLAUDE.md status (PR 3 next).
- **Gates:** Vision PASS, Strange PASS (pass 1). No Captain (assembled
  without).
- **Shipped check:** the PR and the deploy check, below in the Handoff log.
- **Deliberate leftovers:** Event to X gap 20px (mock 12px); dark mode
  pills faint against the dim; keyboard-only notes (no arrow keys in the
  menu, no focus trap); kid and Tablet checked in code only.
