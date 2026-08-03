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
else can reach it yet. This is actively changing — see "Deployment plan"
below, which is in progress, not just planned.

## What's built and working

**The hub is organized into branches, not one flat set of pages.** `/` is the
dashboard — a home base showing live counts and status from each branch (right
now, just Kitchen), with a tap-through to each one. One nav bar, fixed along
the bottom of the screen, is the same on every page in the app: Kitchen,
Calendar, Home, Chores, Lists (with Home centred). It doesn't change contents
as you move between branches — only which tab is lit up — and it doesn't drill
into a branch's own sub-pages. Getting from a branch's tab into its sub-pages
is the job of that branch's own landing page (see Kitchen below) instead of a
second nav bar. Nothing about this structure needs to move to add a new
branch later — it gets a tab in `nav.ts` and a landing page, that's it.

**Kitchen** (`/kitchen`) is the first branch. Its landing page is a 2×2 grid
of large tiles, one per sub-page — Inventory, Shopping, Expiring, Cooking —
each tile the full tap target. Inventory's tile carries a badge for its low
count, Shopping's for its to-buy count; neither shows a raw item total, since
the tile's job is "does this need attention," not inventory volume. Expiring
and Cooking carry no badge — there's no real feature behind them yet.

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
  Each item can carry which *store* it's for (Walmart, Costco, Amazon,
  Target, Maceys, Other) — filterable via chips above the list, same pattern
  as Inventory's location chips. The store lives only on the grocery item and
  disappears the moment it's bought, since "Put away" deletes the row rather
  than archiving it. Three ways to set it, all landing in the same place:
  typing a new item reveals a Store dropdown next to Category; tapping a
  pantry item's cart button (or the bulk "Add N low items" button) opens a
  picker sheet first; either way, the last store you picked is remembered
  (`localStorage`, see the design rule below) and offered again next time —
  the dropdown defaults to it, the sheet highlights it "Last used."
- **Expiring** and **Cooking** — placeholder pages only (the tiles exist,
  pages just say "Coming soon"). A deliberate, named exception to "no feature
  is stubbed out early" below — Bryce wanted the full shape of the branch
  visible now since these are next in line to actually get built.

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

**The app requires login** — `src/lib/session.ts` (signed cookies) and
`src/lib/dal.ts` (`verifySession()`/`getVerifiedSession()`) back a single
shared family password. `src/app/login/` is the sign-in page; a Sign out
button lives in the header whenever there's a session. All 12 existing
Server Actions check `getVerifiedSession()` before touching the database,
and `src/proxy.ts` redirects any signed-out page request to `/login` before
it renders — verified as a 6-byte redirect with zero data in it, where the
same request used to return a full 200 with real pantry contents. See
"Deployment plan" below for what's done and what's left before this can
actually go live.

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
- **There is exactly one nav bar for the whole app**, rendered once from the
  root layout (`src/app/layout.tsx`), fixed along the bottom of the screen at
  every size — phone, tablet, and desktop alike, no separate top-bar layout
  for wider screens. It's the same bar on every page: only which tab is lit
  up changes, never the tabs themselves. This replaced an earlier version
  where Kitchen had its own separate tab bar that swapped in while you were
  inside `/kitchen/*` — after seeing it work, Bryce noticed most apps don't
  do that (the nav usually doesn't change contents as you move around) and we
  went back to one bar. `HUB_NAV_ITEMS` in `src/lib/nav.ts` is the only nav
  list in the app now; `HubNav.tsx` is the only nav component. The tabs stay
  centred in the same `max-w-3xl` column the page content uses, so they don't
  stretch edge-to-edge on a wide display.
- **A branch gets you into its sub-pages via its own landing page, not a
  second nav bar.** Kitchen's landing page (`src/app/kitchen/page.tsx`) is a
  grid of large tiles — one per sub-page (Inventory, Shopping, Expiring,
  Cooking) — each tile the full tap target. A future branch with sub-pages
  (Chores might end up with one per kid, say) follows the same pattern:
  a tile grid at the branch's own route, no nav-list file of its own. Branches
  with only one page (nothing here yet, but plausible) don't need this at
  all — the hub tab goes straight to the content.
- **No feature is stubbed out early** — with named exceptions, extended twice
  now: Kitchen's Expiring and Cooking tiles, and the hub nav's Calendar,
  Chores, and Lists tabs, all exist pointing at "Coming soon" pages. Bryce
  wanted the full shape of the app visible ahead of building each feature
  out, both at the branch level and the hub level. Profiles and any future
  branch not yet built still follow the rule as originally stated: no nav
  entry, tile, or placeholder page until it's actually being built.
- **The seed data is typed against the real vocabulary, not bare strings.**
  `prisma/seed.ts` imports `Category` and `Location` from `constants.ts` as
  `import type` — erased before the script ever runs, so it costs nothing at
  runtime and tsx never loads Lucide in a Node script. This exists because the
  old seed used plain strings and silently drifted: five stale category names
  sat there passing a clean `tsc` run, only visible as generic fallback icons
  in the running app. Renaming or removing a category now breaks the seed at
  compile time instead.
- **A branch with more than one page needs its own landing page — this is the
  opposite of an earlier rule, and the reason is structural, not a change of
  taste.** `/kitchen` used to redirect straight to Inventory. That was correct
  *at the time*: Kitchen still had its own tab bar back then, so a landing
  page's links (Shopping, Inventory) just duplicated tabs already sitting in
  the bar on the same screen. Once the nav became one global bar that doesn't
  drill into branch sub-pages (see above), that duplication stopped existing
  — the landing page became the *only* route in, so removing it would have
  orphaned every sub-page behind it. If a future change ever brings back a
  branch-level nav, this rule should flip back for the same reason it flipped
  here. We know this rule can circle — Kitchen's page was flagged as an
  orphan, given a tab, had the tab reverted, then got redirected away
  entirely, then rebuilt as tiles — so if it comes up a fourth time, check
  which nav structure is actually in place before re-deciding it.

- **Reading a browser-only value (localStorage, so far) uses
  `useSyncExternalStore`, not `useState` + `useEffect`.** The obvious version
  — start at `null`, read localStorage in an effect, `setState` the result —
  actually has a real bug: the server has no localStorage, so the first
  client render would want to show a different value than the
  server-rendered HTML, a hydration mismatch. This project's lint rules
  correctly flag that pattern rather than it being a style nitpick.
  `useSyncExternalStore` (`src/lib/lastStore.ts`) is React's built-in tool
  for exactly this: its third argument is the value to use for the server
  render and the first client render (so the two always agree), and it
  switches to the real value automatically once available — no manual
  effect or `setState` at all. Reach for this again for any future
  browser-only reads (session storage, `matchMedia`, etc.).

## Deployment plan

Bryce wants the family actually using this — see "Where I left off" for how
far this has gotten. In progress, not just planned; check it off as steps
land rather than re-deriving the plan from scratch.

**Decisions already made — don't re-litigate these:**
- **Auth model: one shared family password**, not per-person accounts, for
  now. Deliberately cheap to swap later (see the DAL note below) — Clerk or
  real accounts can replace what's *inside* `session.ts`/`dal.ts` without
  touching any of the Server Actions that call them. Clerk is the easier of
  the two to retrofit, since it replaces this code rather than adding to it.
- **Hosting: Vercel. Database: Neon Postgres.** Matches what the "SQLite
  schema avoids Postgres-incompatible features" design rule was already
  written for — this is the provider swap it anticipated, not a rewrite.
- **Next.js 16 renamed `middleware.ts` to `proxy.ts`.** Don't create a
  `middleware.ts` file from habit or old tutorials — it won't run.
- **Server Actions are real public POST endpoints**, reachable directly
  (e.g. with `curl`), not only through our own buttons. This is *why* the
  DAL pattern exists: the auth check has to live next to the data, in every
  action, not only in front of pages. Protecting pages alone is not enough.

**The five phases:**

1. **Authentication** — nothing deploys until this is done.
   - 1a. Session + DAL plumbing (`session.ts`, `dal.ts`). ✅ Done.
   - 1b. Login page + login/logout Server Actions. ✅ Done.
   - 1c. `verifySession()`/`getVerifiedSession()` guard added to all 12
     existing Server Actions (`src/app/actions/pantry.ts`,
     `src/app/actions/groceries.ts`). ✅ Done.
   - 1d. `proxy.ts` for the redirect-to-login UX (optimistic check only —
     see the DAL note above for why it can't be the real protection). ✅ Done.
   - 1e. Adversarial check: `curl` a Server Action while logged out and
     confirm it's rejected — not just that the login page looks right.
     *Next up.*
2. **Move off SQLite** — schema provider → `postgresql`, swap the adapter in
   `db.ts`, fresh migration, re-seed, full local retest against the hosted
   database before anything deploys.
3. **Deploy** — push to Vercel, set env vars there (a fresh, different
   `SESSION_SECRET` and the real `FAMILY_PASSWORD` — never the dev values),
   first deploy to a private URL, verify login is actually required from a
   phone on cell data (not just home WiFi, which might behave differently).
4. **Home screen app** — commit the icon files already sitting untracked
   (`src/app/icon.svg`, `apple-icon.png`) with an `app/manifest.ts` added
   (`display: "standalone"`, so it opens without browser chrome). Delete
   `public/_logo-preview.html` — a dev scratch file, shouldn't ship. Also:
   the icons currently say "Marsh HQ", the app says "Marsh Hub" — reconcile
   before it's on anyone's home screen.
5. **Hand-off** — clear test data, seed real household contents, share the
   URL and password.

**What Claude can't do:** create the Vercel/Neon accounts or enter any
payment or credential details — that's Bryce, with exact instructions for
what to click. Claude writes and verifies every line of code.

## Planned, not yet built

Everything below is independent of the deployment plan above and not
currently being worked on. Roughly the order they'll likely get tackled,
though nothing here is scheduled:

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

Four of Phase 1's five steps are done — login actually works and actually
protects the app now, not just plumbing sitting unused. In order:

**1b — login page + actions.** `/login`, a password box, vague-and-identical
error on any wrong guess (there's only one password, so a specific message
would just help someone guessing). Sign out button in the header, shown only
when `getSession()` finds one. `/login` redirects to the dashboard if you're
already signed in. Verified: wrong password rejected, correct password signs
in, `document.cookie` can't see the session cookie (`httpOnly` confirmed
working, not just set).

**1c — guarded all 12 Server Actions.** Every write in `pantry.ts` and
`groceries.ts` now opens with `getVerifiedSession()` and returns early
without touching the database if there isn't one. Verified against the
database, not the UI: signed out, "Just clear" and the delete button both
left rows untouched and the count unchanged — the optimistic UI briefly
*showed* the delete succeeding, but a refresh proved the server had refused
it. Audited the guard count by exact line match (12 actions, 12 guards) after
a first, buggy `awk` script gave a false report.

**1d — `proxy.ts`.** Signed-out page requests now redirect to `/login` before
rendering. This is what actually closed the read-side hole: a signed-out
request to `/kitchen/inventory` used to return a full 200 with real pantry
contents; it's now a 6-byte redirect with nothing in it. Built inverted from
the Next.js docs' own example on purpose — they list protected routes, this
lists the one public route (`/login`) and protects everything else, so a
forgotten future page fails locked instead of failing open. Static assets
(`/icon.svg`, `/apple-icon.png`, the CSS bundle) are excluded from the
matcher, checked specifically because Phase 4's home-screen icon needs to
load for someone who isn't signed in yet.

All committed, one commit per step, `tsc`/`eslint` clean throughout.

**The `FAMILY_PASSWORD` question from last session is resolved, for local
dev.** Bryce gave a value in chat and it's set in the local `.env` (not
repeated here — this file is committed to git, and a password shouldn't sit
permanently in history even a weak dev-only one). Flagged back to him as too
weak for production as given — short, guessable, no rate limiting yet to
slow down attempts — and reminded that the *production* value should be
generated fresh and set directly in Vercel during Phase 3, never typed in a
chat or a file that gets committed. Don't assume the local `.env` value is
what ships.

**Next: Step 1e**, the adversarial check — replay a Server Action's POST
directly with `curl`, no session, no browser cooperating, and confirm the
guard holds from outside the app's own UI. Everything verified so far went
through the browser or `curl` against *pages*; 1e is the one that attacks a
*Server Action* directly, which is the actual threat model these actions
have (see the SECURITY note atop `groceries.ts`). This is the last step of
Phase 1 — Phase 2 (the Postgres migration) is next after it.

One open thread flagged during the build, not started: nothing remembers a
*specific pantry item's* usual store yet (paper towels always asks, even
though it's always Costco). What's built is one global "last store picked,"
not per-item memory — a reasonable, cheaper first version, but a different
feature if the global version turns out to be annoying in practice (e.g.
alternating between a Costco run and an Amazon order back to back).

Still open from before:

- **Collapse state doesn't persist** on Inventory — plain component state,
  resets on reload.
- **Shopping has no collapse/expand** — it picked up the 28 categories but
  not the collapsible treatment.
- **Five of ten tiles/tabs are still placeholder pages** (Expiring, Cooking,
  Calendar, Chores, Lists).
- **Pre-existing:** `eslint` flags a component-defined-during-render issue in
  `GroceryRow.tsx` (`categoryIcon()` called at the top of the component each
  render). Small, isolated, noticed three times now but not yet fixed —
  probably worth just fixing next time it's touched rather than continuing
  to note it.

The open direction question from previous sessions (keep building branches
vs. invest in login + deployment) is now decided — deployment, per the plan
above. Branch work (Expiring, Cooking, Calendar, Chores, Lists, the
still-open items just above) is paused until the family can actually reach
the app.
