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

**The hub is organized into branches, not one flat set of pages.** `/` is the
dashboard — a home base showing live counts and status from each branch (right
now, just Kitchen), with a tap-through to each one. The hub nav at the bottom
shows Kitchen, Calendar, Home, Chores, Lists (five branches, with Home centred).
Each branch owns its own section and its own nav, added via a nested
`layout.tsx` under its folder — e.g. `src/app/kitchen/layout.tsx` renders the
Kitchen tab bar for every page under `/kitchen/*`. The dashboard and branches
that don't yet have their own nav (Calendar, Chores, Lists) share a layout via
a `(hub)` route group — the parentheses keep it out of the URL, so `/` stays `/`.
Nothing about this structure needs to move to add a new branch later.

**Kitchen** (`/kitchen`) is the first branch, with five tabs in a fixed bottom
nav bar:

- **Inventory** (`/kitchen/inventory`) — tracks what's stocked across four
  locations (Pantry, Fridge, Freezer, and Storage — the overflow/cold storage
  downstairs). Grouped by category (28 groups, in supermarket order — see
  "the category vocabulary" below) with location as a filter via chips above
  the list. Every group is collapsible; groups holding a low item start open,
  every header shows its own low count even when shut, and "Expand all" /
  "Collapse all" toggles everything at once. This is what makes the list
  usable at real-household scale — flat, it was one unbroken run of however
  many items were in a location. Items below their "low" threshold get a Low
  (or Out, at zero) badge and float to the top of their group. Category and
  location icons are Lucide outline components; dropdowns fall back to plain
  text since `<select><option>` can't render SVG.
- **Shopping** (`/kitchen/shopping`) — add items, group by store-aisle
  category, tap a row to check it off, adjust quantity with +/− steppers,
  clear checked items, or "put away" checked items straight into the pantry.
- **Home** (points to `/`, the dashboard) — the way back out of the Kitchen
  branch to the hub-level overview.
- **Expiring** and **Cooking** — placeholder pages only (nav tabs exist,
  pages just say "Coming soon"). A deliberate, named exception to "no feature
  is stubbed out early" below — Bryce wanted the full tab bar visible now
  since these are next in line to actually get built.

`/kitchen` itself has no page of its own — it redirects straight to
`/kitchen/inventory`, Inventory being the branch's front door. It used to be a
landing page with two cards (Shopping, Inventory) showing the same to-buy/
stocked/running-low counts as the dashboard's Kitchen widget, one tap earlier
in the same path. See the design rule below on branch landing pages.

**The category vocabulary is 28 groups, not 9.** `src/lib/constants.ts` used
to hold a flat list (Produce, Dairy, Frozen, Pantry...) that couldn't tell
"canned beans" from "cereal" from "dish soap" — everything not obviously
produce or dairy landed in one giant bucket. It's now 28 categories (Produce,
Bread & Bakery, Canned Food, Condiments & Sauces, Household, Personal Care &
Beauty, Health & Wellness, Children's Essentials, and so on), ordered as a
walk through a supermarket — perimeter first, then centre aisles, then
non-food, catch-all ("Other") last. Both Shopping and Inventory read that
order directly, so a longer list actually made grouping *more* useful, not
less: Shopping's aisle-order grouping got finer, and Inventory's flat list
became collapsible groups worth collapsing. Adding a category is still the
one-line change the "one source of truth" rule promises.

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

**Sample data** — `npm run db:seed` fills the database with 87 pantry items
and 10 grocery items covering 27 of the 28 categories ("Other" deliberately
empty, to prove empty groups just don't render) across all four locations,
with 30 items sitting at or below their low threshold — realistic enough that
Inventory's collapsing and low-stock badges have something real to show.
`npm run db:reset` wipes it back to nothing; seeding again refills it.

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
- **Nav bars are a fixed bar along the bottom of the screen, at every size —
  phone, tablet, and desktop alike.** No separate top-bar layout for wider
  screens. Bryce wanted this consistently after trying both; the tabs stay
  centred in the same `max-w-3xl` column the page content uses, so they don't
  stretch edge-to-edge on a wide display. Both the hub nav (`HubNav.tsx`) and
  Kitchen's nav (`KitchenNav.tsx`) follow this.
- **Each branch (Kitchen, and later Calendar/Chores/Lists) gets its own
  folder with its own `layout.tsx` for its own nav**, following the pattern
  in `src/app/kitchen/`. The dashboard and branches without a nav of their own
  yet (Calendar, Chores, Lists) share the hub-level nav via a `(hub)` route
  group — parentheses keep the folder out of the URL, so the dashboard is
  still `/`. The root layout (`src/app/layout.tsx`) only renders the logo
  header and has no idea what branches exist.
- **No feature is stubbed out early** — with named exceptions, extended twice
  now: Kitchen's Expiring and Cooking tabs, and the hub nav's Calendar, Chores,
  and Lists tabs, all exist as nav items pointing at "Coming soon" pages.
  Bryce wanted the full shape of the nav visible ahead of building each
  feature out, both at the branch level and the hub level. Profiles and any
  future branch not yet in a nav bar still follow the rule as originally
  stated: no nav entry or placeholder page until it's actually being built.
- **The seed data is typed against the real vocabulary, not bare strings.**
  `prisma/seed.ts` imports `Category` and `Location` from `constants.ts` as
  `import type` — erased before the script ever runs, so it costs nothing at
  runtime and tsx never loads Lucide in a Node script. This exists because the
  old seed used plain strings and silently drifted: five stale category names
  sat there passing a clean `tsc` run, only visible as generic fallback icons
  in the running app. Renaming or removing a category now breaks the seed at
  compile time instead.
- **A branch doesn't get its own landing page unless it shows something
  neither its own tabs nor the dashboard already show.** Kitchen had one —
  two cards summarizing Shopping and Inventory — and it ran byte-for-byte the
  same database queries as the dashboard's Kitchen widget, while its two
  links duplicated tabs sitting in the bar on that same screen. `/kitchen` now
  redirects straight to Inventory instead. This came up because we spent two
  sessions circling it: flagged the page as an orphan, added a tab back to it,
  removed the tab as redundant, then removed the page itself — worth applying
  this rule up front for Calendar, Chores, and Lists rather than repeating the
  cycle. Revisit if a branch earns a genuine overview later — Kitchen's would
  be what's expiring this week and what's for dinner, which the dashboard's
  one-line summary doesn't cover.

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

Just finished and verified: rebuilding the category system from a 9-entry
flat list into a 28-group taxonomy, and making Inventory collapsible so it
still works at that scale. This session:

1. **Replaced the 9 flat categories with 28**, worked out from screenshots of
   a reference app's own category picker (Bryce sent screenshots across
   several turns; the two-level group > category structure there got
   flattened to just the groups — the finer level was ~91 entries, too much
   precision for a family and unusable in a phone dropdown). Ordered as a
   supermarket walk. Added non-food groups the reference lacked (Household,
   Personal Care & Beauty, Health & Wellness, Children's Essentials) since the
   house stocks more than food.
2. **Typed `prisma/seed.ts` against `Category`/`Location`** instead of bare
   strings — this is what caught that the old seed had five stale category
   names in it, invisible until now because `tsc` doesn't check untyped
   string literals. Expanded the seed itself to 87 pantry items across 27 of
   28 categories and all 4 locations, 30 of them low, so the new UI has real
   data to prove itself against.
3. **Made Inventory's groups collapsible**, and switched what it groups by —
   category instead of location, with location moved to filter-only (the
   chips were already there). The design risk was that collapsing by default
   would bury the low-stock items this page exists to surface; solved by
   starting low-holding groups open and putting each group's low count on its
   header even when shut, so a collapsed list still tells you what needs
   attention without expanding anything.

All committed, tsc/eslint clean, tested across phone/desktop and light/dark
— including confirming the location filter and category grouping compose
correctly together (e.g. filtering to Fridge narrows both which groups show
and their counts).

Nothing is currently half-finished. Two open threads worth knowing about:

- **Collapse state doesn't persist.** It's plain component state, so a reload
  or navigating away and back resets every group to its default open/shut
  state. Fine for now; worth `localStorage` if the wall-tablet use case makes
  losing that state annoying in practice.
- **Shopping didn't get the collapsible treatment.** It picked up the 28
  categories automatically (grouping still works, just via the existing flat
  render) but has no collapse/expand. The grocery list is usually short
  enough that this probably doesn't matter — flagging it as a choice made by
  omission, not a bug.

Also still open from before: **five of ten nav tabs across both bars are
still placeholder pages** (Expiring, Cooking, Calendar, Chores, Lists).

Beyond that, the same open direction question as before: keep building out
branches, or invest in login + deployment so the rest of the family can
actually start using this instead of it only running on Bryce's laptop.
