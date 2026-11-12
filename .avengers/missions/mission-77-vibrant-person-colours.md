# Mission 77: more vibrant person colours

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-11-12 · **Updated:** 2026-11-12
**Branch:** `claude/calendar-vibrant-person-colors-4bde43` (own worktree)

## Brief

- **Goal:** Bryce, after the PR 9 phone test: "I need the calendar colors per
  person to be more vibrant. They are too pastel. The point is that you can
  see the difference immediately in dark and light mode."
- **Done means:** (filled in after Bryce picks a set and a style) the new
  colours show in Calendar in light and dark mode, every gate passes
  (Strange measures contrast in both modes), merged with the Gauntlet green,
  production deploy checked, `git log origin/main..HEAD` empty, Bryce's phone
  test in `.avengers/status.md`.
- **Out of scope:** new colour names or a ninth colour (names are stored on
  `User.avatarColor`, and the filter chat, mission 78, may show them);
  per-person custom colours; anything about the delete rule (mission 76).

## What Fury found

- The palette is `AVATAR_COLORS` in `src/lib/constants.ts` (8 names, one hex
  each, used in both themes). Names are stored on User rows, so names stay.
- **The pastel look comes mostly from how blocks are painted, not the hexes:**
  Month pills, hour blocks and the all-day strip paint each person colour at
  10% over `--surface` (`bandedBackground`, `src/lib/color.ts`, called from
  `MonthCell.tsx`, `TimelineDayColumn.tsx`, `TimelineAllDayBar.tsx`).
  `EventCard.tsx` (Schedule list, search, dashboard Calendar widget) has its
  own `bandBackground` at 10%. Swapping hexes alone barely changes the look
  (mock section B).
- Person colours beyond the Calendar: `AvatarBadge` (login chips, header and
  menu, Settings, Manage family, family order list, habits rows, event and
  task cards), `ProfileForm.tsx` colour picker, `HabitFamilyWideColumn.tsx`
  (a 12% wash per person column on the iPad Whole family view). A hex change
  reaches every avatar circle in the app.
- Measured (scripts in the shared notes folder: `pal.py`, `opt.py`,
  `mock.py`): current set's closest pair is ΔE2000 15 (purple/pink); under
  simulated deuteranopia 5 (red/green), protanopia 7, tritanopia 4.
- Recommended set (found by search: white text at least 4.6:1, high
  saturation, maximise the worst colour-blind gap): blue `#195aff`, red
  `#e12837`, green `#0f8741`, amber `#965a00`, purple `#9650b4`, teal
  `#0a7382`, pink `#d70f78`, slate `#50555f`. Closest pair 19 normal, 9
  deutan, 9 protan, 7 tritan. White text: 4.60 (green) to 7.48 (slate).
- Recommended style D: solid fill, white text, for live events and open
  tasks. Past events and done tasks: 15% wash, a 4px solid stripe in the
  person colour, `--muted-strong` text (measured worst 4.58:1 light, 6.34:1
  dark).

Mock: `.avengers/mocks/calendar-person-colours-mock.html` (sent 2026-11-12).

## Danger register

From AGENTS.md: no `db:seed`/`db:reset`, no reset script for `User`, no
pushes to `main`, stage by explicit path, migrations additive only. This
mission needs no migration (colour names are unchanged).

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always).
- Strange: the whole mission is visual; he measures contrast in both themes.
- Captain: out unless the diff grows past a small edit (Vision carries the
  file-size check).
- Banner: out, Fury read the colour call sites inline.

## Bryce's decisions (2026-11-12, "I like your recommendation let's roll with it")

1. The recommended colour set.
2. Style D: solid fill, white text; past and done fade to a wash with a stripe.
3. Everywhere: the new hexes reach every avatar circle and the iPad habits
   columns too (their 12% wash keeps `--muted-strong` text at about 5:1).

## Contracts

### C1 - vibrant person colours, solid Calendar fills

**Objective:** swap `AVATAR_COLORS` to the approved hexes and paint every
Calendar event block, Month pill, all-day strip item and EventCard as style D,
from one shared helper.

**Boundaries:** May touch: `src/lib/constants.ts` (the `AVATAR_COLORS` hexes
and their comment only, names unchanged and in the same order),
`src/lib/color.ts`, `src/lib/color.test.ts` (exists, 48 lines: extend it), `src/components/MonthCell.tsx` (already 370 lines, over the 350 soft cap: it must not grow; trim the stale band comments),
`src/components/TimelineDayColumn.tsx`, `src/components/TimelineAllDayBar.tsx`,
`src/components/EventCard.tsx`, `src/components/AvatarBadge.tsx` (comment only),
`docs/structure/calendar.md` (a short "Person colours" note: the live and
faded rules below). Must not touch: `DESIGN.md` (685 lines, over its 650 hard
cap), `prisma/`,
`package.json`, any Habits file, `TaskCard.tsx`, `CLAUDE.md`, `STRUCTURE.md`,
anything else.

**The rules (approved by Bryce, measured by Fury):**
- Hexes, in order: blue `#195aff`, red `#e12837`, green `#0f8741`, amber
  `#965a00`, purple `#9650b4`, teal `#0a7382`, pink `#d70f78`, slate `#50555f`.
- **Live** (event not past; task not completed) **with at least one person**:
  solid diagonal bands of the person hexes at full strength (same 135deg
  bands and same per-caller cap as today), text white (`text-white`, the
  `AvatarBadge` precedent), no visible outline (keep box size: transparent
  border, not a removed one, so Month spanning bars don't shift). Every inner
  text that is `text-muted`/`text-fg` today (time line, location, Repeat icon,
  "Repeats", task ☐/✓ glyphs) is white on a solid fill. Avatars inside a
  solid EventCard get a white ring so a person's own circle doesn't vanish
  into their own colour.
- **Faded** (past event; completed task) **with at least one person**: bands
  at 15% over `var(--surface)`, a solid stripe in the FIRST person's hex on
  the left edge (4px on hour blocks and EventCard, 3px on Month pills and the
  all-day strip; on a Month bar that spans cells, only the segment that
  starts it, `roundLeft`, gets the stripe), no other outline, all text
  `text-muted-strong` (measured worst 4.58:1 light / 6.34:1 dark). Keep
  existing weights, the ✓ glyph and `line-through` for done tasks exactly as
  they are.
- **No people:** exactly today's look (the `var(--surface-2)` fallback,
  today's border and text classes).
- One helper in `src/lib/color.ts` decides fill, stripe and which text
  treatment applies (for example `personFill(hexes, faded)`); MonthCell,
  TimelineDayColumn, TimelineAllDayBar and EventCard all call it. Remove
  EventCard's private `bandBackground` and any now-dead helpers; update the
  stale "0.10 / 0.05, mission-8 measured" comments rather than leaving them.
- Search highlight (`HighlightedText` `<mark>`): change `text-inherit` to
  `text-fg` so a match stays readable on a white-text solid card (the
  highlight token is light in light mode).
- The drag-lifted outline (`data-lifted:outline-accent`) and everything else
  about blocks stays.

**Verification:** the Gauntlet in this file, all green (baseline 2088 tests, 2088 pass, after `npm ci` in this worktree). In
`src/lib/color.test.ts`: every `AVATAR_COLORS` hex gives white text at least
4.5:1 (compute WCAG contrast in the test); the helper returns the solid
look for live with people, the wash plus first-person stripe for faded, and
today's fallback for no people.

**Evidence required:** each Gauntlet command with its last lines; test count
before and after; `git diff --stat`; a list of every class/text colour you
changed per component.

**Done criteria:** Fury can see in the diff that all four components go
through the one helper, that no `0.1`/`0.05` band alphas remain, and that
the no-people path is unchanged.

## Gates

### Vision pass 1 (691cde5): PASS

Gauntlet re-run green (2090/2090; UTC 2080 pass, 10 DST skips that exist on
main too). Boundary clean. Notes:
- `color.ts` mixes the `background` shorthand with a `backgroundOrigin`
  longhand; when React changes only `background` (task ticked, block going
  past while on screen) the origin resets and a 1px band sliver may show.
  Fix batch: use `bg-origin-border` class or split into longhands.
- Past all-day events in the timeline's all-day strip stay solid. That strip
  never drained before (DESIGN.md "The timeline's all-day strip does not yet
  drain"), so it stays out of scope; follow-up for status.md.
- Stale `bandedBackground` comment at `TimelineGrid.tsx:120`: fix batch.
- MonthCell 352 lines (2 over soft cap, shrank as required).
