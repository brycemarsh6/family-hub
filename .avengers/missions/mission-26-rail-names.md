# Mission: Rail names (menu button on the icon rail, hover names)

**Project:** family-hub (Marshee)
**Status:** CONTRACTED
**Started:** 2026-11-03 · **Updated:** 2026-11-03

## Brief

- **Goal:** in the "Always open, icons only" Menu style, a person can always
  find out what each icon means:
  - on a laptop, by hovering an icon (its name shows);
  - on an iPad or any touch screen, by tapping a menu button at the top of
    the rail, which slides out the full drawer with names.
  - Follow-up from mission 25 (Strange N4, Vision's rail-avatar note).
  - Branch `claude/nav-rail-expand` from `origin/main` at `91df15c` (PR #34
    merged).
- **Bryce's decisions (2026-11-03, final):**
  - **A menu button at the top of the rail** (the same three-line Lucide
    `Menu` icon as the hamburger). Tapping it opens the existing drawer with
    every name; tapping outside or Escape closes it. Fury recommended this
    over "tap the icon you're on", because that tap already refreshes the
    page (the only refresh on a home-screen install) and nobody would
    discover it.
  - **Hover names on laptops.** Every rail icon shows its name on hover.
- **Fury's structure calls:**
  - The tooltip is the native `title` attribute on each compact row, the
    Sign out button and the avatar. No tooltip component (none exists in the
    app, and a native one needs no positioning code).
  - PinnedNav owns the drawer's open state for the rail and renders the
    existing `NavDrawer`. No second drawer design.
  - The sidebar mode ("icons + names") gets no button: the names are already
    there.
- **Done means:**
  - Rail mode at 1280 and 1024: the menu button is the rail's first item;
    tapping it opens the drawer with names over the page; a row in the
    drawer navigates and closes it; backdrop and Escape close it.
  - Hovering any rail icon shows its name.
  - Sidebar and Menu button modes, and phones, are unchanged.
  - Exactly one drawer at a time, and the drawer's id is never on two
    elements at once.
  - Gauntlet passes.
- **Out of scope:** the rail's height overflow at 1024x768 (Strange N2;
  this adds 56px to it, recorded below), the empty top band (N1), dark
  scrollbars (N3).
- **Assembled:** Stark + Vision + Strange. No Captain: one small contract,
  no new files.

## Danger register

Same as mission 25. No database change in this mission. Never run
`db:seed`, `db:reset`, `migrate reset`, `db push` or `migrate dev`; never
print `.env`. No push or merge without Bryce.

## Gauntlet

`npx tsc --noEmit`, `npx eslint .`, `npm test`,
`TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts`,
`npm run build`.

## Contracts

### R1: rail menu button and hover names
- **Status:** BUILT (Stark; gauntlet all exit 0 incl. build). Drawer ids: hamburger `app-nav-drawer`, rail `app-nav-rail-drawer` via a new optional `id` prop on NavDrawer; PinnedNav closes its drawer when the window drops below lg. DONE (Vision and Strange PASS).
- **Objective:** the rail gets a top menu button that opens `NavDrawer`, and
  every rail icon has a hover name.
- **Boundaries:**
  - may touch: `src/components/PinnedNav.tsx`, `src/components/NavList.tsx`
    (compact rows, compact Sign out and compact avatar get `title`; nothing
    else), `src/components/NavDrawer.tsx` and
    `src/components/HamburgerButton.tsx` only if the drawer's
    `id="app-nav-drawer"` / `aria-controls` need adjusting so two mounted
    drawers can't share an id.
  - must not touch: `src/lib/*`, AppChrome, DESIGN.md, STRUCTURE.md, any
    page.
- **Details:**
  - The button: 48x48, `COMPACT_ROW_CLASS` look, Lucide `Menu` 22,
    `aria-label="Show menu names"`, `title="Show menu names"`,
    `aria-expanded`, `aria-controls` pointing at the drawer it opens. Then a
    divider like the Kitchen one before the first destination.
  - Rail only (`mode === "rail"`). Sidebar unchanged.
  - The drawer opened from the rail closes from its own row clicks,
    backdrop and Escape, exactly like the hamburger's.
  - Comments in the files' style; no em or en dashes.
- **Verification:** gauntlet exit 0; browser check by Strange.
- **Evidence required:** diff, exit codes.
- **Done criteria:** Vision PASS and Strange PASS.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| R1-1 | Vision (Opus) | **PASS** | 0 | 5 |
| R1-1 | Strange (Opus) | **PASS** | 0 | 3 |

**R1 Vision:** tsc, eslint, tests (466; UTC 459 + 7 skips) exit 0; build
not re-run (dev server), Stark's exit 0 stands. Boundary clean. Two drawers
can't open at once: each opener is untappable on the other side of lg, each
drawer closes on the crossing, and NavDrawer renders nothing while closed (so
no duplicate id or Escape listener). Notes: drawers don't move focus in or
back on close (pre-existing, follow-up); the JS `1024px` literal and
Tailwind's `64rem` disagree under a non-default browser font size (same as
mission 25 F1; nothing breaks); onClose re-subscribes Escape each render
(harmless); the 56px rail cost stands.

**R1 Strange:** at 1280 and 1024, light and dark: button first with a
divider, drawer opens with the page lit, rows navigate and close it,
backdrop and Escape close it (focus returns to the button), never more than
one dialog across the 1023/1024 crossing. `title` on all 12 rows, the avatar
and Sign out. Sidebar, Menu button and 375 unchanged. Bryce reset to "Menu
button". Notes: the rail now overflows 84px at 1024x768 and 52px at 1280x800
(new; Sign out below the fold); rail button and Sign out are 47px wide
(`shrink-0` fixes it); semantics hold.

## Handoff log

- 2026-11-03: mission opened from Bryce's approval of the menu button and
  hover names. Stark building R1.
- 2026-11-03: R1 Vision and Strange PASS; committed locally. Waiting on Bryce's call on the rail height.

## Delivery

- **Shipped:** not yet
- **Known cost (measured):** the rail overflows 84px at 1024x768 and 52px at
  1280x800, which used to fit. Sign out sits below the fold. Asked Bryce
  how to make it fit before pushing.
