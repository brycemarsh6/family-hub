@AGENTS.md

# Marsh Hub — project context

This file is read automatically at the start of every future session. It's
written for two readers at once: Bryce (a complete beginner, learning to code
through this project) and whichever future Claude Code session picks this
project back up. Plain English throughout — no assumed programming background.

## What this is

Marsh Hub is a private web app for one family — not a product, not something
anyone outside the household will ever use. The long-term vision is a single
home base for the stuff a family currently tracks across sticky notes, group
texts, and separate apps: a shared calendar, a profile for each family member,
chore charts for the kids, a grocery list, a pantry/fridge/freezer inventory,
recipes, meal planning, photos, and habit trackers.

It's being built one piece at a time, in person with Claude Code, as a way for
Bryce to learn to code — so the code favors clarity and explanation over
cleverness, and changes are made in small, understandable steps rather than
big batches.

It'll eventually run on phones, laptops, and a tablet mounted on the kitchen
wall, so everything is built touch-first: big tap targets, no fiddly typing on
a touchscreen, and quantities changed with +/− buttons instead of a keyboard.

## Who uses it

Right now: just Bryce, on his own laptop, for development and testing. Nobody
else can reach it yet — there's no login, and it only runs locally (see
"Planned, not yet built" below for what has to happen before that changes).

## What's built and working

**The hub is organized into branches, not one flat set of pages.** `/` is a
bare dashboard (just a logo header and, for now, a single link into Kitchen —
the overview-widget layer is planned but not built). Each branch owns its own
section and its own nav, added via a nested `layout.tsx` under its folder —
e.g. `src/app/kitchen/layout.tsx` renders the Kitchen tab bar (bottom on
phones, top on desktop) for every page under `/kitchen/*`, and the dashboard
never sees it. Future branches (Calendar, Chores, Lists) will each get the
same treatment: their own folder, their own layout, their own nav — nothing
about today's structure needs to move to add one.

**Kitchen** (`/kitchen`) is the first branch, with five tabs:

- **Shopping** (`/kitchen/shopping`) — add items, group by store-aisle
  category, tap a row to check it off, adjust quantity with +/− steppers,
  clear checked items, or "put away" checked items straight into the pantry.
- **Inventory** (`/kitchen/inventory`) — tracks what's stocked across four
  locations (Pantry, Fridge, Freezer, and Storage — the overflow/cold storage
  downstairs), grouped and filterable by location. Items below their "low"
  threshold get a Low (or Out, at zero) badge and float to the top of their
  group.
- **Home** (`/kitchen`) — the Kitchen branch's own landing page: two cards
  summarizing Shopping and Inventory, tap either to go straight there.
- **Expiring** and **Cooking** — placeholder pages only (nav tabs exist,
  pages just say "Coming soon"). A deliberate, named exception to "no feature
  is stubbed out early" below — Bryce wanted the full tab bar visible now
  since these are next in line to actually get built.

**Tap-to-edit** — tapping any pantry item opens a full edit sheet (a bottom
sheet on phones, a centered dialog on wider screens) covering every field:
name, quantity, unit, category, location, and the low-stock threshold — shown
as "Mark as low when at or below ___" with the unit next to it, updating live
as you type — plus a delete button. This is what fixed the "bananas stored as
1 bunch never look low" problem: switch the unit to individual bananas, set a
real numeric threshold, done.

**The two-way link between them** — a low pantry item can be pushed onto the
grocery list with one tap (or all of them at once, via "Add N low items to the
list"), tagged so the app remembers which pantry item it came from. Checking
those items off and hitting "Put away" adds the quantity back into the pantry
automatically — matching by that tag first, falling back to matching by name,
and creating a new pantry entry if it's genuinely new to the house.

**Sample data** — `npm run db:seed` fills the database with realistic
starter items across all categories and locations (including a couple already
below their low threshold), so the app is never being tested against an empty
list. `npm run db:reset` wipes it back to nothing; seeding again refills it.

**Reachable from other devices on the same WiFi** — the dev server listens on
the network, not just this laptop, so it can be opened from a phone during
testing. This is dev-only and not the same thing as being deployed (see
below) — it only works while Bryce's laptop is on and the dev server is
running, and only on the home network.

## Technology choices, and why

- **Next.js (App Router) + React + TypeScript** — one framework that covers
  the pages, the server-side logic, and talking to the database, without
  hand-building a separate backend. TypeScript catches typos and mismatched
  data before the app even runs, which matters a lot for a beginner.
- **Tailwind CSS** — styling written directly on the element it affects,
  rather than in a separate stylesheet, so cause and effect stay visible while
  learning.
- **Prisma + SQLite** — Prisma is the translator between our code and the
  database; `prisma/schema.prisma` describes the data shape once, and Prisma
  generates the code that reads and writes it. SQLite is the database itself
  for now — a single file, nothing to install or log into.
- **Next.js Server Actions** for every database write (adding an item,
  checking something off, editing, deleting) — a button click runs real
  server-side code directly, no hand-written API layer in between.
- **Full details, running commands, and file-by-file layout** are in
  [README.md](README.md) — this file is project *context*, the README is the
  practical "how do I run this" reference. Keep both in sync when either
  changes.

## Design rules we've established

These came from real decisions made during the build — worth following
without re-litigating each time:

- **Touch-first, always.** Minimum 48px tap targets, list rows 56–64px tall,
  no interaction that only works on hover. Built for a phone in a grocery
  store and a tablet on a kitchen wall, not just a laptop with a mouse.
- **Quantities are only ever changed by tapping**, never by typing a number —
  the shared `QuantityStepper` component (+/− buttons) is used everywhere a
  count appears, including inside the edit sheet. Typing a number is fiddly on
  a phone and worse on a wall tablet with wet hands.
- **One source of truth for shared vocabulary.** The list of categories and
  storage locations lives in exactly one place, `src/lib/constants.ts`. Every
  dropdown, filter, and heading reads from that list — adding a fifth
  location or tenth category is a one-line change, not a hunt through the
  codebase.
- **The database schema avoids SQLite/Postgres-incompatible features** — no
  Prisma `enum` types, no database-specific column attributes. TypeScript
  (via `constants.ts`) enforces valid values instead. This means moving off
  SQLite later is a provider swap and one migration, not a rewrite.
- **Instant feedback on every tap.** Checking off a grocery item, adjusting a
  quantity, or saving an edit updates the screen immediately (via React's
  optimistic-update pattern), rather than waiting on a round trip to the
  server — taps need to feel instant, especially on a kitchen tablet.
- **Colors are named by job, not appearance** (`--surface`, `--muted`,
  `--danger`, `--accent`) in `globals.css`, with separate light/dark values —
  so re-theming or adding dark-mode nuance later never means hunting through
  every component.
- **Delete is a single tap, no confirmation dialog**, consistently across the
  app. Deliberate choice for consistency, not an oversight — revisit only if
  it causes an actual accidental-deletion problem in practice.
- **Outline icons only, via Lucide — no emoji in the icon system.** The
  category and storage-location icons in `src/lib/constants.ts`, and every
  branch's nav icons, are Lucide components. Native `<select><option>`
  elements can't render SVG, so dropdowns fall back to plain text there —
  that's the one deliberate exception. Decorative one-off emoji elsewhere
  (empty states, the dashboard's Kitchen card) weren't in scope for this rule
  and haven't been touched.
- **Each branch (Kitchen, and later Calendar/Chores/Lists) gets its own
  folder with its own `layout.tsx` for its own nav**, following the pattern
  in `src/app/kitchen/`. The root layout only renders the logo header — it
  has no idea what branches exist. This is what let the dashboard become a
  bare page without dragging Kitchen's tab bar along with it.
- **No feature is stubbed out early** — with one named exception: Kitchen's
  Expiring and Cooking tabs exist as nav items pointing at "Coming soon"
  pages, because Bryce wanted the full 5-tab bar visible ahead of building
  them. Everywhere else (Calendar, Chores, Lists, profiles, etc.) the rule
  holds as originally stated: no nav entry or placeholder page until it's
  actually being built.

## Planned, not yet built

In roughly the order they'll likely get tackled, though nothing here is
scheduled:

- **Login / authentication** — required before this ever deploys anywhere
  reachable by more than this laptop. Could be as simple as one shared family
  password, or real individual accounts per family member.
- **Deployment** — putting this on the actual internet (or at least the home
  network permanently) instead of a dev server that only runs while a laptop
  is on. Needs auth done first.
- **Family profiles** — a page per family member.
- **Chore charts** — for the kids.
- **Recipes**
- **Meal planning**
- **To-dos**
- **Habit trackers**
- **Photo gallery**
- **Calendar** — shared family calendar. Planned last on purpose: it's
  expected to be the hardest piece.
- **Voice input** — useful on a kitchen wall tablet where typing is awkward.
- **Barcode scanning** — for fast grocery/pantry entry.

## Where I left off

Just finished and verified: splitting the app into branches. The dashboard at
`/` is now bare (logo header + one link into Kitchen), and everything that
used to be flat top-level pages — Inventory, Shopping, Home, Expiring,
Cooking — moved under `/kitchen/*` with its own nav rendered by
`src/app/kitchen/layout.tsx`. Along the way: the grocery list got renamed
"Shopping" throughout, and the category/location icon system switched from
emoji to Lucide (see the design rule above). All committed, tested end-to-end
across phone/desktop and light/dark, including a full add-item → put-away
round trip to confirm the route rename didn't break Next's page-revalidation.

Nothing is currently half-finished. The dashboard's widget layer is the
obvious next piece if continuing down this path — right now it's just a
placeholder link, not the "overview of what matters across the hub" it's
meant to become. Beyond that it's the same open direction question as before:
keep building out branches (Expiring and Cooking are next in line since their
tabs already exist; Calendar, Chores, Lists, profiles are all independent
after that), or invest in login + deployment so the rest of the family can
actually start using this instead of it only running on Bryce's laptop.
