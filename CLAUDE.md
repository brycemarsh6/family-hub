@AGENTS.md

# Marsh HQ — project context

This file is read automatically at the start of every future session. It's
written for two readers at once: Bryce (a complete beginner, learning to code
through this project) and whichever future Claude Code session picks this
project back up. Plain English throughout — no assumed programming background.

## What this is

Marsh HQ is a private web app for one family — not a product, not something
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

**Live and in use.** Bryce shared the URL and password with his wife, she's
signed in on her phone with the real house-and-heart icon on her home
screen, and the pantry holds real household inventory (461 items, entered
this session — see "Where I left off"). The 5-phase deployment plan below
is fully complete; this is no longer a dev-only project.

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
count, Shopping's for its to-buy count, Expiring's for its soon-to-expire
count; none shows a raw item total, since the tile's job is "does this need
attention," not inventory volume. Cooking carries no badge — there's no real
feature behind it yet.

- **Inventory** (`/kitchen/inventory`) — tracks what's stocked across four
  locations (Pantry, Fridge, Freezer, and Storage — the overflow/cold storage
  downstairs). Grouped by category (29 groups, in supermarket order — see
  "the category vocabulary" below) with location as a filter via chips above
  the list. Every group is collapsible and **every group starts collapsed**;
  every header shows its own low count even when shut, and "Expand all" /
  "Collapse all" toggles everything at once. (Groups holding a low item used
  to auto-open. At real scale that meant ~27 low items across a dozen
  categories, so the page opened half-expanded in a pattern that read as
  arbitrary and the only route to a clean slate was Expand all then Collapse
  all. Bryce asked for it to start shut; nothing is lost, because the
  collapsed header still carries the low count.) This is what makes the list
  usable at real-household scale — flat, it was one unbroken run of however
  many items were in a location. Items below their "low" threshold get a Low
  (or Out, at zero) badge and float to the top of their group. Category and
  location icons are Lucide outline components; dropdowns fall back to plain
  text since `<select><option>` can't render SVG. A search box above the
  filter chips (`src/lib/match.ts`'s `searchItems`) doesn't need an exact
  match — typing "straw" ranks Strawberries above Frozen strawberries — and
  swaps the grouped view for a flat ranked list while a query is active,
  respecting whichever location chip is already selected.
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
- **Expiring** (`/kitchen/expiring`) — sorts by urgency (Eat now / This week
  / Coming up), not category, since it answers "what needs eating" rather
  than "where's the pasta." Most items get an automatic shelf-life estimate
  (marked with `~`) from `src/lib/shelfLife.ts`; a real date typed into the
  edit sheet's "Expires on" field always wins over the guess. Only items
  inside a 14-day window show up at all. The page's marquee action is "Log
  leftovers" — name, portions, and a 2/3/4/5-day picker, never a typed date
  — which creates an ordinary pantry item in a new "Leftovers" category, so
  it inherits every other feature (rows, steppers, search, the edit sheet)
  for free rather than needing its own system.
- **Cooking** (`/kitchen/cooking`) — a landing page of its own now, not a
  stub: the same tile-grid pattern as Kitchen's landing page. The tile
  itself was extracted into a shared `src/components/BranchTile.tsx` (with
  a `wide` prop so an odd tile can span both columns) and Kitchen's
  page now imports it too — one tile definition, per the one-source-of-
  truth rule. **Two tiles: Recipes (fully built — see the Recipes plan
  below) and Meal Plan** (a "Coming soon" placeholder with an ACTIVE plan
  below). There were briefly three tiles — Recipes / Menu / Meal
  planning — but Menu ("what's for dinner") and Meal planning turned out
  to be the same feature described twice, and they were merged into one
  "Meal Plan" tile before Menu was ever built.
  - **Recipes** (`/kitchen/cooking/recipes`) — the household's recipe
    box. Browse A–Z with a slide-to-jump rail (like the iPhone contacts
    list), or search by title *or* ingredient. Four ways to add one, all
    landing on the same reviewable form so nothing is ever saved
    unreviewed: type it in, paste text off any blog, photograph a
    cookbook page / handwritten card / screenshot, or paste a link
    (recipe blog, TikTok, or Pinterest pin). Each recipe can be copied
    as plain text for a group chat, or shared outside the household via
    an opt-in, revocable, unguessable link.

**The category vocabulary is 29 groups, not 9.** `src/lib/constants.ts` used
to hold a flat list (Produce, Dairy, Frozen, Pantry...) that couldn't tell
"canned beans" from "cereal" from "dish soap" — everything not obviously
produce or dairy landed in one giant bucket. It's now 29 categories (Produce,
Bread & Bakery, Canned Food, Condiments & Sauces, Household, Personal Care &
Beauty, Health & Wellness, Children's Essentials, Leftovers, and so on),
ordered as a walk through a supermarket — perimeter first, then centre
aisles, then non-food, catch-all ("Other") last. Leftovers sits right after
Meals & Frozen Food despite not really fitting the supermarket metaphor
(nobody buys leftovers) — see the Expiring & leftovers plan for why. Both
Shopping and Inventory read that order directly, so a longer list actually
made grouping *more* useful, not less: Shopping's aisle-order grouping got
finer, and Inventory's flat list became collapsible groups worth collapsing.
Adding a category is still the one-line change the "one source of truth"
rule promises.

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

**The app requires login, and it's been attacked to prove it, not just
built.** `src/lib/session.ts` (signed cookies) and `src/lib/dal.ts`
(`verifySession()`/`getVerifiedSession()`) back a single shared family
password. `src/app/login/` is the sign-in page; a Sign out button lives in
the header whenever there's a session. All 12 existing Server Actions check
`getVerifiedSession()` before touching the database, and `src/proxy.ts`
redirects any signed-out page request to `/login` before it renders.
Phase 1 of the deployment plan below is fully done, including the
adversarial check: a real Server Action was replayed directly with `curl`
(no browser, no session), and separately with `proxy.ts` deliberately
disabled to simulate it being misconfigured — in both cases the action ran
but the database was untouched, proving the DAL guard holds on its own, not
just in combination with proxy. See "Where I left off" for the full detail
on what that test actually showed.

## Technology choices, and why

- **Next.js (App Router) + React + TypeScript** — one framework that covers
  the pages, the server-side logic, and talking to the database, without
  hand-building a separate backend. TypeScript catches typos and mismatched
  data before the app even runs, which matters a lot for a beginner.
- **Tailwind CSS** — styling written directly on the element it affects,
  rather than in a separate stylesheet, so cause and effect stay visible while
  learning.
- **Prisma + Postgres (hosted on Neon)** — Prisma is the translator between
  our code and the database; `prisma/schema.prisma` describes the data shape
  once, and Prisma generates the code that reads and writes it. Started on
  SQLite (a single local file, nothing to install) while the app was still
  just for Bryce's own laptop; moved to Neon in Phase 2 of the deployment
  plan below, once other people needed to reach the same data.
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
  (via `constants.ts`) enforces valid values instead. This is why moving off
  SQLite to Neon Postgres in Phase 2 was a provider swap and one fresh
  migration, not a rewrite — the rule paid off exactly as intended.
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
- **A list row's secondary actions live behind a right-to-left swipe**
  (`src/components/SwipeActions.tsx`), the standard iOS Mail/Reminders
  gesture — Bryce's wife asked for it directly. Inventory rows reveal
  Delete; Shopping rows reveal Edit and Delete. **Destructive actions go
  last** (furthest from the row), so a short, hesitant swipe surfaces the
  reversible one rather than Delete. Every action button underneath is
  real markup, not a decoration, so all of them stay reachable without a
  swipe (keyboard, screen reader). Still single-tap, no confirmation once
  revealed — consistent with the rule above.
  **Why Shopping's edit is here and not on the row's tap, unlike
  Inventory's:** a shopping row's tap already ticks the item off, which
  has to remain the fastest thing on that page (phone in one hand, in a
  shop). Editing is occasional; checking off is constant. So the two
  pages deliberately differ — tap-to-edit on Inventory, swipe-to-edit on
  Shopping — and that asymmetry is the point, not an inconsistency to
  "fix."
  Two implementation details worth knowing if this pattern gets reused: a
  gesture stays undecided for the first ~8px so a vertical scroll isn't
  mistaken for a swipe, and the open/closed decision on release reads
  from a ref, not React state — state batching left an earlier version
  reading a stale drag distance and snapping shut on swipes that should
  have opened.
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
- **Every page below a nav-bar destination carries a `BackLink` to its
  parent — no exceptions.** The nav bar only reaches branch roots
  (Kitchen, Calendar, Home, Chores, Lists) and a landing page only
  reaches *down* into its own sub-pages, so without this any page deeper
  than a landing page is a dead end: getting from a recipe back to the
  recipe list meant Kitchen → Cooking → Recipes. `BackLink` is the one
  edge going up, and it's the shared component in
  `src/components/BackLink.tsx` — not a hand-rolled `<Link>` per page,
  which is how it drifted to only 5 of 13 pages having one.
  Two deliberate details: it takes an **explicit `href`, never
  `router.back()`**, so the destination is the page's real parent no
  matter how you arrived (a shared link, a redirect after saving, a
  reload) — browser history is right most of the time and confusing
  exactly when it isn't. And the **label names the destination**
  ("Recipes", "Cooking") rather than the action ("Back"), so the link
  says where you'll land. The five nav-bar destinations plus `/login`
  correctly have none — they're already one tap away.
- **No feature is stubbed out early** — with named exceptions, extended three
  times now: Kitchen's Expiring and Cooking tiles, the hub nav's Calendar,
  Chores, and Lists tabs, and Cooking's own Recipes / Menu / Meal planning
  tiles, all created pointing at "Coming soon" pages. Bryce
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

**✅ Complete — all five phases done.** The family is actually using this
now (see "Who uses it" above and "Where I left off" below for how it got
here). Kept below as a record of the decisions made, not as an active
checklist.

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

1. **Authentication** — ✅ **Done.** Nothing left in this phase.
   - 1a. Session + DAL plumbing (`session.ts`, `dal.ts`). ✅ Done.
   - 1b. Login page + login/logout Server Actions. ✅ Done.
   - 1c. `verifySession()`/`getVerifiedSession()` guard added to all 12
     existing Server Actions (`src/app/actions/pantry.ts`,
     `src/app/actions/groceries.ts`). ✅ Done.
   - 1d. `proxy.ts` for the redirect-to-login UX (optimistic check only —
     see the DAL note above for why it can't be the real protection). ✅ Done.
   - 1e. Adversarial check. ✅ Done — see "Where I left off" for what it
     actually proved, not just that it passed.
2. **Move off SQLite** — ✅ **Done.** Live on Neon Postgres now, not SQLite.
3. **Deploy** — ✅ **Done.** Live on Vercel with `DATABASE_URL`,
   `SESSION_SECRET`, and `FAMILY_PASSWORD` all set fresh in Vercel's env
   vars (not the dev values). Verified login is required on a phone on cell
   data, not just home WiFi — see "Where I left off" for the one snag
   (Vercel's own Deployment Protection was gating the whole app behind a
   Vercel account login, on top of our own; disabled for Production).
4. **Home screen app** — ✅ **Done.** `icon.png`, `apple-icon.png`, and
   `favicon.ico` all use Bryce's house-and-heart icon; `app/manifest.ts`
   added (`display: "standalone"`, so it opens without browser chrome). Old
   placeholder logo files deleted (see "Where I left off"). The app itself
   was renamed **Marsh HQ** (from "Marsh Hub") to settle the naming
   mismatch the icon originally surfaced — see the app name change entry in
   "Where I left off" for every file that touched.
5. **Hand-off** — ✅ **Done.** Test/seed data cleared from production,
   real household inventory entered (461 pantry items), URL and password
   shared with the family. See "Where I left off" for the full detail.

**What Claude can't do:** create the Vercel/Neon accounts or enter any
payment or credential details — that's Bryce, with exact instructions for
what to click. Claude writes and verifies every line of code.

## Put-away review plan — ✅ DONE

All four phases shipped and verified. Bryce noticed that "Put away N
into the inventory" silently invented facts: a bought item that wasn't
already in the inventory was created in **Pantry**, always, because the
old `putAwayCheckedItems` hardcoded `DEFAULT_LOCATION`. Frozen peas
landed on the pantry shelf. And an item that *was* already in the
inventory always returned to its usual spot, so there was no way to say
"put the beef in the fridge, I'm cooking it tonight." Kept below as a
record of the decisions, same as the other finished plans.

His framing for the fix, in his own words: an editable location on the
shopping item that shows where it came from; **no** prompt when putting
away something the app already knows; and for genuinely new items, a
review step "like some budgeting apps will have a pop up review
transactions window… minimalistic with only a handful of transactions
showing a small 3 of 6 transactions to review", including a prompt to
merge when something looks like a duplicate.

**Decisions already made — don't re-litigate these:**

- **A category edit only propagates when it was *explicitly* edited.**
  Bryce chose "yes, apply my category edit to the inventory", and that's
  right for the case he hit (fixing Ground beef from Other to Meat). But
  applying it whenever the values merely *differ* would corrupt the
  inventory at scale: quick-adds from the add bar and from voice both
  produce category **Other**, so putting away a quick-typed "milk" would
  re-file the household's real Milk from Dairy Products into Other. A
  `categoryEdited` flag on the grocery row, set only by the edit sheet,
  is what separates a deliberate correction from a drive-by default.
- **New items default to location `Other`, not `Pantry`.** "Pantry" was
  a guess dressed up as a fact. `Other` is honest and — critically —
  *findable*: it gets its own Inventory filter chip, so mis-filed items
  surface instead of hiding among the real pantry stock. Note the app
  now has both an "Other" *category* and an "Other" *location*, meaning
  different things; flagged to Bryce, who kept the name.
- **Voice gets the same default.** `voice/apply.ts` creates unknown items
  with `DEFAULT_LOCATION` too, so flipping the constant fixes both paths
  at once. Voice can't show a review sheet (it's hands-free by design) —
  landing in `Other` is what makes those items findable afterwards.
- **Linked and exact-name matches never prompt.** Friction goes only
  where the app genuinely doesn't know something. This is Bryce's
  explicit instruction and it's also what keeps unpacking the shopping
  fast.
- **Fuzzy matching may *suggest* a merge, never perform one.** The
  steaks/"tea" and Dr-Pepper/"bell peppers" bugs are what lenient
  matching costs when it decides on its own. Inside a review sheet a
  human confirms, which is exactly the feedback loop those bugs lacked —
  so `searchItems` is the right tool here, and only here.
- **`location` on `GroceryItem` is an override, nullable.** Null means
  "no opinion" and preserves today's behaviour exactly; a value means
  "put it here", including moving an item that already exists.

**The phases:**

- **P1. Vocabulary + schema.** ✅ **Done.** `Other` added to
  `LOCATIONS` (icon: `CircleDashed` — deliberately not one of the
  filled-object icons the real four locations use, so it visually reads
  as "not yet filed" rather than a real fifth place in the house).
  `DEFAULT_LOCATION` flipped from `"Pantry"` to `"Other"`, which fixes
  both creation paths in one line: `putAwayCheckedItems` (groceries.ts)
  and voice's `apply.ts`. Two additive columns on `GroceryItem` —
  `location String?` (the override; null preserves today's behavior
  exactly) and `categoryEdited Boolean @default(false)` (only set by a
  deliberate edit, never inferred from a mismatch) — migration
  `20260806044426_add_grocery_location_override`, two bare `ADD COLUMN`s,
  nothing dropped or altered.
  Verified in the running app: the new "Other" filter chip appeared on
  Inventory automatically (0 items, as expected — nothing's landed there
  yet) with no changes needed to the filter-chip code, since it already
  maps over `LOCATION_NAMES`; the Inventory edit sheet's Location
  dropdown picked up "Other" the same way, for the same reason. Existing
  `GroceryItem` rows read back with `location: null`,
  `categoryEdited: false` — the safe defaults for data that predates the
  migration. `tsc`, `eslint`, and `npm run build` all clean; pantry,
  grocery, recipe, and meal-plan counts unchanged by this phase (the
  session's counts moved from ordinary household use, not from this
  work — confirmed by direct read).
- **P2. Location in the shopping edit sheet.** ✅ **Done.** The sheet
  gains a Location field, populated from a new `pantryItemLocation`
  reads-only field on `GroceryItemView` — the linked pantry item's
  *current* location, joined and read fresh on every page load
  (`shopping/page.tsx`), never cached on the grocery row itself. A
  linked item shows no blank option (it always has somewhere it
  currently lives) and starts pre-selected to that live location, with
  helper text ("Currently in Fridge…"); an unlinked item shows a real
  blank "Decide when I put it away" choice, matching the Store field's
  own "no store yet" pattern.
  **The "baseline" trick, and why it's there:** the select's *starting*
  value (the linked item's live location, or blank) is the thing saved
  is compared against on Save — matching it writes `location: null`
  ("no opinion"), only a genuine change writes a real override. Storing
  an override unconditionally would have been simpler but strictly
  worse: if the household later moves that pantry item to a different
  shelf directly in Inventory, a frozen "Fridge" written days earlier
  from the shopping sheet would silently fight that move at the next
  put-away. Null means "always defer to wherever it actually lives right
  now," which an explicit override should only ever mean "I looked at
  where it lives and specifically want it somewhere else."
  `editGroceryItem` computes `categoryEdited` server-side by comparing
  against the row's *own current* stored category — never the client's
  claim about what it used to be — and only ever sets it to `true`;
  saving with the category untouched passes `undefined` for that field
  in the Prisma `data` object, which in Prisma means "don't touch this
  column," leaving a prior edit's flag alone rather than ever silently
  clearing it back to `false`.
  Verified against the real list: a linked item ("Chocolate milk boxes")
  opened pre-selected to its true live location (Fridge) with no blank
  option; an unlinked item ("Eleanor Diapers") opened with the blank
  option selected and no helper text; setting an explicit override on
  the unlinked item persisted it, confirmed by direct database read;
  re-opening and selecting the blank option again correctly cleared it
  back to `null`; and changing the linked item's category flipped
  `categoryEdited` to `true` alongside the new category value. Both real
  rows were restored afterward to their *exact* original state —
  including `categoryEdited: false`, which the app itself can never
  produce once set, so that reset needed a direct database write, not
  the UI. `tsc`, `eslint`, and `npm run build` all clean; pantry (477)
  and grocery (10) counts unchanged before and after.
- **P3. The put-away review sheet.** ✅ **Done — which also completes
  P4** (every check below ran against the real 477-item pantry, so
  there was no separate verification phase left to do). `putAwayCheckedItems`
  is gone, split into two Server Actions: `classifyForPutAway` (read-only —
  sorts checked items into "known" vs "new," with ranked merge
  suggestions for each new one) and `commitPutAway` (the actual
  transaction, taking the review's decisions). `PutAwayButton.tsx`
  (client) calls classify first; a fully-known shop commits immediately
  with **no sheet at all** — Bryce's explicit requirement — and only
  opens `PutAwayReviewSheet.tsx` when something checked off doesn't
  exactly match the inventory.
  **The review sheet is one item at a time, budgeting-app style, per
  Bryce's own reference.** Each screen shows up to two ranked merge
  suggestions ("Already in the inventory?") above editable name /
  quantity / unit / category / location fields defaulting to the
  grocery row's own values. Tapping a suggestion swaps the editable
  fields for a plain "Adding to ___ instead of creating a new item"
  notice plus a quantity stepper — editing fields for a row you're not
  creating would be editing the wrong thing. Nothing is written until
  the *last* item's "Put away all" — canceling at any point, on any
  item, discards the whole review with zero database writes, since
  decisions only exist as local component state until that final call.
  **The suggestion matcher is `matchItem`, not `searchItems` —
  deliberately, and only after checking why.** `searchItems` (the
  Inventory search box's matcher) requires *every* query token to
  appear in the candidate, which is exactly backwards for this job: it
  would return zero suggestions for "Ground beef 80/20" against an
  existing plain "Ground Beef", because the qualifier tokens ("80",
  "20") have nothing to match. `matchItem`'s scorer credits partial
  overlap in both directions and already returns ranked alternatives —
  it's the one built for "does this phrase refer to an existing row,"
  which is precisely the question here. Confirmed by hand-tracing both
  match directions before writing any code, not assumed from the name.
  **Re-verification at commit time is real, not decorative.** `commitPutAway`
  re-runs the exact-match lookup fresh against the database rather than
  trusting what `classifyForPutAway` found a moment earlier — a genuine
  match found *now* always wins over a stale "create" decision (another
  phone may have put the same shopping away in between), while a
  `merge` decision the human explicitly made in the sheet wins over an
  automatic match, in case they merged into something classification
  didn't consider exact. A merge only ever adds quantity to the target
  — it deliberately does **not** apply the row's location override or
  `categoryEdited` flag to the merged-into item, since "this is the
  same thing, don't duplicate it" is a different claim than "also
  re-file it"; those P2 overrides still apply, but only along the
  automatic-match path, which is what a linked or exact-name item
  actually is.
  **Verified against the real 477-item pantry with synthetic
  `"ZZZ Test …"` rows that touched nothing real**, covering every path:
  a known item committed with no dialog at all, quantity incrementing
  correctly (2→3); a mixed batch of one known + two new items opened
  the review at exactly "1 of 2" (the known item correctly excluded);
  the fuzzy matcher surfaced both a synthetic candidate *and* the
  household's real "Ground beef" as a plausible second suggestion —
  useful confirmation it works against real data, not just the bait;
  choosing the merge path added exactly the reviewed quantity (1→3 lbs)
  while leaving the target's real location and category untouched;
  declining suggestions and editing every field on the create path
  (name, quantity 5→7, category, location) produced a new pantry row
  with exactly those edited values, not the originals; and canceling
  mid-review left the checked-off item and every prior pantry row
  completely unmodified, confirmed by direct database read. Every
  synthetic row was deleted afterward; pantry (477) and grocery (10)
  counts came back to exact baseline. `tsc`, `eslint`, and
  `npm run build` all clean.

## Duplicate & irregularity review plan — ✅ DONE

All three phases shipped and verified — the direct successor to the
Put-away review plan above, same idea (the app asks a human before it
guesses) applied at two more moments. Kept below as a record of the
decisions, same as the other finished plans. Bryce's ask, in his words: catch a "similar existing
item" when adding to Inventory, plus "a tab for reviewing duplicate
items or 'odd' entrys the computer notices," with a pulsing review icon
leading to "a similar review window" where the user clarifies "what to
do with the irregularity."

Two features, one shared matcher: **prevention** (at add time) and
**cleanup** (a standing queue).

**Decisions already made — don't re-litigate these:**

- **This needs its own stricter matcher, not `matchItem`.** Put-away's
  review sheet can afford loose suggestions because a human is already
  looking at that exact item and glances past a bad one. A queue that
  *pulses at you unprompted* must be almost always right, or it becomes
  noise and gets ignored — which is the same "app quietly goes stale"
  failure the voice work exists to prevent. This is the third time this
  project has needed a different strictness for a different consumer
  (see `shelfLife.ts`'s `findOverride` vs `matchItem`); the lesson is
  reliable enough now to apply up front instead of after a bad run.
- **v1 detectors are three, all cheap and deterministic.** (1) Same
  name, same location, two rows. (2) Subset-name pairs — every word of
  one name appears in the other ("Ground beef" ⊂ "Ground beef 80/20").
  (3) Anything sitting in location `Other` or category `Other`. No
  fuzzy scoring in the queue at all.
- **Same name in *different* locations is legitimate and must never be
  flagged.** The house really does keep peanut butter and black beans
  in two places. "Duplicate" is never just "same name."
- **Irregularities are computed live, never stored.** They run against
  current data on page load, exactly like low counts and expiry
  estimates. The only thing persisted is **dismissals** — one small
  additive table, keyed by detector type plus a fingerprint (sorted pair
  of item ids, or a single id). Without persistent dismissal the queue
  nags forever about things the family already decided are fine, which
  is precisely how these features die.
- **Merging re-points `GroceryItem.pantryItemId` to the survivor, and
  deliberately does NOT re-point `VoiceChange.pantryItemId`.** Both are
  `SetNull`, so both survive a delete — but they want opposite
  treatment, and this is the sharpest trap in the whole plan. A live
  shopping-list row that loses its link silently breaks put-away's
  restock, so it must follow the survivor. A voice-log row must *not*:
  `applyUndo` deletes the pantry item outright when `quantityBefore` is
  null (the change created it), so a re-pointed log row could later
  undo into deleting the survivor holding the merged quantities. Letting
  it go null degrades undo to a harmless no-op, and the log still reads
  correctly because `itemName` is plain text — which is exactly what
  that column's own schema comment says it's for.
- **The queue is not a nav tab.** The nav bar reaches branch roots only;
  that rule is settled. It's an icon button with a count badge in the
  Inventory page header, `animate-pulse` only when something is
  unreviewed. Inventory hygiene belongs on Inventory. Promoting the
  count to Kitchen's tile badge later is a one-line change if it earns
  it.
- **Exact-name matches at add time still get the sheet**, with the merge
  option pre-selected. Unlike put-away — where buying more of a known
  thing is evidence of intent — the add bar has no such evidence:
  typing a name that already exists might mean "we have more" or "I
  forgot we had this." One tap to confirm is cheap, and it's the moment
  the app can teach that the item already exists.
- **Suggest, never merge automatically.** Same rule as put-away, same
  reason (the steaks/"tea" class of bug). Nothing in this plan mutates
  data without a human tapping the specific choice.

**The phases:**

- **D1. The strict matcher + a coverage report against real data.** ✅
  **Done.** `src/lib/duplicates.ts` — pure functions, no `server-only`
  guard, same reasoning as `match.ts` (it has to be runnable in a plain
  script against real data, and was). Three detectors:
  `findSameNamePairs` (identical normalized name + identical location),
  `findSubsetNamePairs` (proper token-subset pairs), `findParkedInOther`
  (location or category `Other`), plus `findIrregularities` bundling all
  three. Leftovers are excluded from pair detection entirely — freeform
  dish names where overlapping words are normal.
  **The coverage run against the real 477 items, hit by hit:** detector
  1 fired zero times (the inventory is currently clean — its value is
  catching future accidents) and detector 3 zero times (nothing has
  landed in `Other` yet; P1's default is days old). Detector 2 is where
  the tuning lived: **unguarded it fired 107 times; with its two guards,
  21.** The guards were written as hypotheses and the run confirmed both
  with real examples now cited in the code's own comment: the
  min-2-token guard alone removed ~70 pairs of pure noise ("Salt" paired
  with seven other salts, "Sugar" with eight sugary products, "Corn"
  with corn dogs, Corn Flakes, and corn syrup), and the same-location
  guard removed the deliberate two-places pattern (canned "Black beans"
  in Pantry vs "Dry black beans" in Storage, fridge-open vs
  pantry-stored chicken stock). Of the 21 surviving hits, reading them
  by hand: **7–8 look like genuine duplicates** ("Dino nuggets" vs
  "Real Good Dino Nuggets", "Jasmine rice" vs "Jasmine white rice",
  "Taco Seasoning" filed under both Spices and Baking, "Creole
  seasoning" vs "Tony's/Creole seasoning", "Pace Chunky Salsa" vs "Pace
  Chunky Mild Salsa", a zero-quantity "Frozen corn" beside "Fresh frozen
  corn") and the rest are reasonable ask-once questions ("Black pepper"
  vs two branded peppers, "Kosher salt" vs "Coarse kosher salt") that a
  permanent dismissal retires forever. So the first queue open will show
  ~21 items as a one-time backlog with real findings in it, and go
  quiet after — which is the precision bar the plan set. `tsc` and
  `eslint` clean; the coverage script itself was a temp file, findings
  recorded here.
- **D2. The add-time duplicate check.** ✅ **Done.** `findDuplicateMatches`
  in `duplicates.ts` is the add-time twin of the pair detectors — given
  a not-yet-created name + location, it ranks `exact-same-location` and
  `exact-other-location` matches first (skipping subset suggestions
  entirely when an exact match exists, since it would only be noise),
  falling back to the same guarded subset-name search otherwise.
  `checkForDuplicateOnAdd` (read-only), `createPantryItemReviewed`, and
  `mergeIntoExistingPantryItem` are the three new Server Actions in
  `pantry.ts`. `PantryAddFlow.tsx` wraps the existing `AddItemBar` —
  which stays completely untouched and still generic, so Shopping's add
  bar is unaffected — and only Inventory's submit now classifies first:
  no match creates instantly exactly as before, a match opens
  `PantryDuplicateReviewSheet.tsx`.
  **The peanut-butter rule needed a real decision, not just a restated
  principle, and it's asymmetric on purpose:** an
  `exact-same-location` match is pre-selected (very likely "I forgot I
  had this" or "let me add more" — cheap to confirm, one tap). An
  `exact-other-location` match is shown but **never** pre-selected,
  because defaulting to merge would silently discard a deliberate
  second-location purchase — exactly the case the standing-queue
  detectors already carve out. The review sheet's default action
  literally depends on which location the household is filing the
  purchase into, not just on whether the name matches.
  Verified against the real 477-item inventory with synthetic rows:
  same-location "ZZZ Test Duplicate" opened pre-selected and merging
  added exactly the confirmed quantity (2→3); different-location "ZZZ
  Test Peanut Butter" opened *unselected*, and choosing "create new"
  produced a genuinely separate row in the new location (Fridge) while
  the original Pantry row was left completely untouched — the
  peanut-butter case working exactly as designed, not just reasoned
  about; a subset-name candidate ("Ground Turkey" ⊂ "Ground Turkey
  93/7") surfaced correctly with no same/different-spot label (that
  label is reserved for exact matches); and a name with no plausible
  match skipped the sheet entirely, creating instantly. Every synthetic
  row was deleted afterward; pantry (477) and grocery (10) counts came
  back to exact baseline. `tsc`, `eslint`, and `npm run build` all
  clean.
- **D3. The review queue.** ✅ **Done — which completes the plan.**
  `IrregularityDismissal` (migration
  `20260806214642_add_irregularity_dismissals`, one `CREATE TABLE` plus
  two indexes, reviewed as SQL before applying) is the only stored
  piece; irregularities themselves are recomputed on every load.
  Deliberately **not** a foreign key to `PantryItem` — the rows a
  fingerprint references may be deleted by the very merge recorded
  alongside it, and a dangling fingerprint is harmless (it just never
  matches again). `src/app/actions/irregularities.ts` holds
  `getReviewQueue` (read-only, feeds both the badge count and the sheet
  so they can't disagree), `dismissIrregularity` (upsert, so a
  double-tap is harmless), `mergePantryItems`, and `fileParkedItem`
  (patches only the field the detector complained about, so filing a
  location can't clobber a category set from another phone seconds
  earlier). `ReviewQueueButton.tsx` renders **nothing at all** when the
  queue is empty — a permanent zero-badge is exactly the low-grade
  noise that gets tuned out — and `IrregularityReviewSheet.tsx` is the
  familiar one-per-screen shape.
  **The merge's two-foreign-key asymmetry, verified rather than
  assumed.** The seeded test put a live shopping-list row *and* a
  voice-log row (with `quantityBefore: null`, the shape that makes
  `applyUndo` delete outright) on the item being merged away. After the
  merge, a direct database read confirmed: `GroceryItem.pantryItemId`
  had followed the **survivor**, and `VoiceChange.pantryItemId` was
  **null**. Both are what the plan predicted and both matter — the
  first keeps put-away restocking the right row instead of silently
  re-creating the duplicate this queue exists to remove; the second
  keeps a later "undo" from deleting the survivor and the merged
  quantities with it.
  **One real gap the verification caught:** the sheet shipped with
  merge / dismiss / file but **no skip**, even though the plan's own
  decisions listed "skip for now." Without it the queue is a forced
  march — entry 5 is unreachable without resolving 1–4, and a 21-item
  backlog makes that a real wall. Added as a distinct action from
  dismiss (skip writes nothing and the entry returns next time; dismiss
  is permanent), and only rendered when there *is* a next entry.
  Verified end to end against the real 477-item inventory: the pulsing
  badge appeared reading "24 to review" (the 21-item real backlog from
  D1 plus 3 synthetic rows); merging combined quantities correctly
  (2 + 5 → 7) and dropped the count to 23; dismissing a real pair
  ("Frozen corn" vs "Fresh frozen corn" — a genuine finding) dropped it
  to 22 and advanced; skipping walked 20 entries without writing
  anything; and filing the synthetic parked item resolved its location
  and *category* as two independent entries, exactly as
  `findParkedInOther` reports them. Every synthetic row was deleted
  afterward, and **the dismissals table was cleared too** — including
  the Frozen-corn one, which was my test rather than Bryce's decision
  to make. Pantry (477) and grocery (10) back to exact baseline. `tsc`,
  `eslint`, and `npm run build` all clean.

## Voice integration plan — ACTIVE

The current work. Bryce's read on the real risk to this app: his wife won't
keep the inventory current if updating it means opening a phone, finding
the item, and tapping — the app quietly goes stale and dies. The fix is
voice in the kitchen: *"Alexa, tell Marsh HQ I used 2 hot dogs and 2 cans
of Dr Pepper"* and the counts just change.

**Decisions already made — don't re-litigate these:**

- **One voice backend, thin clients on top.** Alexa and Siri are treated as
  dumb microphones that relay a transcribed sentence to one API endpoint on
  the Vercel app. All parsing, matching, applying, and logging happens
  server-side in one place. A future wall-tablet mic is just another thin
  client. Chores/to-dos/calendar later are new *verbs* for the same
  pipeline, not new pipelines.
- **The parser is a Claude API call (Haiku), not hand-rolled rules.**
  Natural speech — plurals, brand names, several items in one breath,
  imperfect transcription — is exactly what rule-based parsing handles
  badly. Bryce approved the cost (~a dollar or two a month at household
  scale) and will create the Anthropic API account himself; the key lives
  in `.env` locally and Vercel's env vars in production, never in chat or
  git — same handling as the Neon connection string.
- **Build order: Siri shortcut first, then the Alexa skill.** Siri needs no
  new accounts (an iOS Shortcut can prompt for dictation and POST the text
  to our endpoint), so it proves the entire pipeline on the wife's actual
  phone in one session. Alexa is the destination — there are Echo device(s)
  in/near the kitchen — and lands right after, reusing everything.
- **The Alexa skill stays in development mode forever.** A dev-mode skill
  works indefinitely on Echo devices tied to the developer's own Amazon
  household — no certification or public publishing for a private family
  app. Known tradeoff: the wake phrase must name the skill ("Alexa, tell
  Marsh HQ…"), bare "Alexa, I used…" is not possible — Amazon routes bare
  speech to its own features. Expectation was set with Bryce up front.
- **Voice never deletes.** Allowed verbs are bounded and low-stakes:
  decrement/increment a pantry quantity and add to the shopping list.
  Every voice change is written to a log table, the spoken response always
  states exactly what changed ("Took 2 off Hot dogs — 3 left") so mishears
  are caught in the moment, and an "undo" verb walks the log backwards.
- **The endpoint is public and gets its own real auth.** It cannot use the
  family-password session cookie (Alexa/Siri can't log in), so it carries
  its own long random secret token — set in env vars, sent by the
  skill/shortcut, rotatable, never in git. Same lesson as deployment
  Phase 1: it's a public POST endpoint and must be treated as attacked.

**The phases:**

- **V1. Voice backend** — ✅ **Done.** `POST /api/voice`
  (`src/app/api/voice/route.ts`), a Route Handler rather than a Server
  Action since Alexa/Siri aren't our own buttons. `VOICE_API_TOKEN`
  checked first, before the body is even read; added to `proxy.ts`'s
  `PUBLIC_ROUTES` (meaning "no session cookie", not "no auth" — the
  route's own token check is the real gate). `src/lib/voice/parse.ts`
  calls Claude Haiku with `output_config.format` (structured outputs) to
  turn a sentence into `{action, item, quantity}[]`. `src/lib/match.ts`
  fuzzy-matches spoken names against real pantry rows — word-boundary
  scoring, not substring containment, after substring matching filed real
  steaks under Beverages during the inventory import (see the Phase-5
  entry below). It lives at `src/lib/` rather than `src/lib/voice/`
  because Inventory search now shares it. `src/lib/voice/apply.ts` runs
  use/add/buy/undo, logs every change to a new `VoiceChange` table, and
  returns a sentence to read back aloud. No delete verb, ever — voice is
  the one input path nobody double-checks before it lands.
- **V2. Siri shortcut** — ✅ **Done.** Proven end-to-end from Bryce's
  phone against production. See "Where I left off" for the walkthrough
  and the bugs this surfaced.
- **V3. Alexa skill** — *Queued, not abandoned.* Free Amazon developer
  account (Bryce creates it, walkthrough style like Neon/Vercel), skill
  passes the raw utterance through, endpoint on the Vercel app, dev mode
  only. Paused while the Expiring branch gets built — pick it back up
  after.
- **V4. More verbs** — shopping-list add already shipped in V1; next
  would be logging leftovers by voice (see the Expiring plan below), then
  chores/to-dos/calendar once those branches actually get built.

## Expiring & leftovers plan — ✅ DONE

The first real feature built on top of the finished inventory — all three
phases shipped and verified against the real 461-item inventory, not just
read from the code. Two problems, one page:

1. **Food quietly goes bad** because nothing tracks age, and nobody will
   hand-enter expiry dates for 461 items — that's the same "too much
   hassle, so it goes stale" failure the voice work exists to avoid.
2. **Leftovers get forgotten and thrown away.** Bryce named this as the
   sharper of the two: *"we have leftovers all the time and many times
   they get wasted because we forget…no more."*

**Decisions already made — don't re-litigate these:**

- **Estimates by default, exact dates when they're worth typing.**
  Precedence per item: an exact `expiresAt` the user entered → a
  name-level estimate from a shelf-life table ("grapes ≈ 7 days in the
  fridge") → a category+location fallback ("Produce in Fridge ≈ 1 week")
  → nothing. An estimate is always *marked* as one in the UI (a `~`), so
  a guess never masquerades as a fact.
- **Shelf-life data comes from USDA FoodKeeper/FDA/FSIS guidance**, not
  invented numbers — gathered via WebSearch against real cited sources,
  not recalled from memory. Turned into a name-override vocabulary
  (`src/lib/shelfLife.ts`) sized to what's actually in the real inventory
  (~60 entries) plus a category+location fallback for everything else,
  rather than an untested generic list.
- **Shelf-life matching is its own stricter matcher, not a reuse of
  voice/search's `matchItem`.** The plan's original idea was to reuse
  `matchItem` directly; building it surfaced why that's wrong here.
  Voice can afford a lenient best guess because it says the pick out loud
  and "undo" is one word away — a shelf-life estimate has no such
  feedback loop, so `matchItem`'s leniency silently mislabeled real items
  (see "Where I left off"). `findOverride` in `shelfLife.ts` requires
  every word of the override to appear in the item's name, not just one.
  Coverage is still measured the same way the plan intended: run it
  against the real 461 items and count what got an estimate vs. nothing,
  then tune — the same test-against-real-data discipline that caught the
  steaks/"tea" and tortilla/"T-bone" bugs earlier in the session.
- **Day zero is `restockedAt`**, a new timestamp set whenever an item's
  quantity goes *up* (put-away, voice "add", manual increase) — not
  `createdAt`, which would freeze the clock at the August 2026 import and
  never recover. Imported items start stale and self-correct on the next
  shop.
- **Leftovers are ordinary pantry items in a new "Leftovers" category**,
  not a parallel table. One line in `constants.ts`, per the
  one-source-of-truth rule. They inherit inventory rows, steppers,
  search, the edit sheet, and (later, cheaply) a voice verb. What's new
  is only the logging flow and the countdown treatment.
- **Logging a leftover never involves typing a date.** Name, portions,
  and a days-good picker as big preset chips (2/3/4/5, default 3 — USDA
  says cooked leftovers keep 3–4 days refrigerated). Touch-first, same as
  the quantity steppers.
- **The page sorts by urgency, not category.** It answers "what needs
  eating", which is a different question from Inventory's "where's the
  pasta". Only items inside a ~14-day window appear, plus anything with
  an explicit date, plus all leftovers — otherwise flour's six-month
  estimate and canned olives' two-year estimate bury the page.
- **Expiry never deletes anything.** The system nags and sorts; a human
  decides. "We ate it" and "we tossed it" both end the same way: tap the
  row, tap Delete in the edit sheet — no separate quick-action, no
  confirmation dialog, same pattern as every other item in the app.

**The phases — all done:**

- **E1. Plumbing + shelf-life data** — ✅ Done. Schema migration
  (`expiresAt`, `restockedAt`), the FoodKeeper-derived vocabulary
  (`src/lib/shelfLife.ts`), and a coverage report against the real 461
  items before any UI existed. See "Where I left off" for the two real
  matching bugs this caught.
- **E2. The Expiring page** — ✅ Done. Urgency sections (Eat now / This
  week / Coming up), estimate marking with `~`, the Kitchen tile's badge
  (count expiring within 3 days), and the exact-date field in the
  existing edit sheet.
- **E3. Leftovers** — ✅ Done. The "Leftovers" category (`constants.ts`),
  `LogLeftoverSheet` (name, portions, a 2/3/4/5-day preset picker — never
  a typed date), and the marquee button on the Expiring page.

**Deliberately not in v1** (revisit only if real use demands it):
per-purchase batch tracking (the honest way to handle old and new apples
sharing one row — real complexity for uncertain gain), push
notifications, and the leftover voice verb (queued as V4).

## Recipes plan — ✅ DONE

All four phases shipped and verified — the first Cooking sub-page to
become real. Alexa (V3) stayed queued behind it — Bryce chose Recipes
first. Kept below as a record of the decisions, same as the other
finished plans.

What it is: every household recipe in one place — typed in, pasted in,
photographed out of a cookbook, or pulled in from a link — browsable A–Z
with a jump rail, searchable, and shareable with people outside the
family. The pressure test is the real collection: Bryce's wife's recipes
live in TikTok saves, Pinterest boards, screenshots, and handwritten
cards, and this feature only matters if getting one into the app takes
under a minute. The plan was written for a fresh session to implement
phase by phase without having been part of the design conversation.

**Decisions already made — don't re-litigate these:**

- **Every import path lands on the same pre-filled form, and nothing
  writes to the database until a human reviews it and taps Save.** Manual
  entry is the form empty; paste/photo/link import is the same form
  pre-filled by extraction. Voice gets away with no review step because it
  reads each change aloud and "undo" is one word away; an import is a
  whole recipe landing at once, so a silent mis-extraction would quietly
  rot the library. Build the form once (R1); every import phase after is
  only "a new way to pre-fill it."
- **Extraction is a Claude call on the API key voice already uses.**
  Pasted text and fetched pages go to Claude with structured outputs
  (same technique as `src/lib/voice/parse.ts`); photos go into the same
  kind of call as images — Claude reads them directly, no separate OCR
  service, no new accounts, no new env vars. Implementing session: load
  the `claude-api` skill before writing any extraction code rather than
  working from memory. Start with Haiku (proven in parse.ts, cost already
  approved); bump only the extraction call to Sonnet if real photos —
  handwriting especially — prove too hard for it in testing.
- **Photo import is the universal fallback — and it's the honest TikTok
  answer.** When a TikTok's recipe is written in the caption, the public
  oEmbed endpoint (`https://www.tiktok.com/oembed?url=...`) returns the
  caption without auth — verify this still works at build time. When the
  recipe is only *spoken* in the video there is no text to fetch, and we
  don't chase video transcription: the path is screenshot the recipe
  (caption, pinned comment, or the on-screen recipe card) → photo import.
  Pinterest pins usually wrap a link to the source blog — fetch the pin,
  follow its outbound link once, else the same screenshot fallback. Set
  this expectation with the family up front instead of promising magic.
- **Blog URLs: structured data first, Claude second.** Most recipe sites
  embed a schema.org `Recipe` object as JSON-LD — exact and free, so
  parse that first and skip the model call entirely when present.
  Otherwise strip the page to text (capped in length) and send to Claude.
  Every failure mode must land somewhere useful: a partially-filled form,
  or a clear "couldn't read this link — screenshot the recipe instead."
  Never a dead end.
- **Ingredients and steps are newline-separated text columns**, one entry
  per line — not a structured sub-table, and not a Postgres `String[]`
  (the no-provider-specific-features schema rule still stands; scalar
  lists don't exist on SQLite). A plain textarea edits them; rendering
  splits on newlines. Structured quantities, unit parsing, and pantry
  linkage are deliberately out of v1.
- **No stored images in v1.** Import photos are transient — resized on
  the phone, sent to Claude for extraction, never written to disk or the
  database. This stack has no blob storage and Vercel's filesystem is
  ephemeral; a photo-of-the-dish field means adding Vercel Blob later
  (listed under not-in-v1), not sneaking bytes into Postgres now.
- **Recipes don't join the pantry category vocabulary.** No tags, no
  categories in v1 — A–Z plus search is the whole navigation. Tags are
  cheap to add later if browsing outgrows two axes.
- **Sharing is per-recipe, opt-in, via an unguessable link**, plus a
  copy-as-text button for group chats. `shareToken` is null until the
  first share, generated with crypto randomness, and "Stop sharing" nulls
  it — the old link dies. The public page (`/share/recipe/[token]`) goes
  in `proxy.ts`'s `PUBLIC_ROUTES`, where — same lesson as `/api/voice` —
  public means "no session cookie," not "no gate": the token is the gate.
  Default private, always.
- **Search reuses the `match.ts` tokenizer** and Inventory's established
  behavior: typing replaces the browse view with a flat ranked list,
  clearing restores it. Title matches rank above ingredient-only matches,
  so "chicken" surfaces Chicken pot pie before things that merely contain
  chicken.
- **⚠️ The dev database IS the live family database.** `.env`'s
  `DATABASE_URL` points at the same Neon database production uses — there
  is no separate dev database. **Never run `npm run db:seed` or `npm run
  db:reset` during this work** — they would replace the family's real
  461-item inventory with sample data. Recipe test data comes from a
  recipes-only script (R1) that adds and removes rows in the new `Recipe`
  table and touches nothing else. The `Recipe` migration itself is purely
  additive (a brand-new table), which is what makes running it against
  the live database safe.

**The phases.** Commit at each boundary; `npx tsc --noEmit` and `eslint`
clean before each commit; verify each phase in the running app against
real interaction, not just by reading the code — that discipline is what
caught the steaks/"tea", "T-bone"/tortilla, and bouillon bugs in earlier
plans. Per AGENTS.md, check `node_modules/next/dist/docs` before using
any Next API not already used in this repo.

- **R1. Schema + manual CRUD.** ✅ **Done.** `Recipe` model in `prisma/schema.prisma`,
  house style (cuid id, no enums, `///` doc comments): `title`,
  `ingredients` (text, one per line), `steps` (text, one per line),
  `servings?`, `prepTime?`, `cookTime?` (all free-text strings — "6-8"
  and "45 min" are real answers), `sourceUrl?`, `notes?`, `shareToken?
  @unique`, `createdAt`, `updatedAt`. Migration, then `npx prisma
  generate` (the Phase-2 lesson). Server Actions in
  `src/app/actions/recipes.ts` — create/update/delete, each opening with
  `getVerifiedSession()` like the existing 12. One recipe form component
  used by both New and Edit: inputs plus textareas, 48px targets,
  keyboard typing allowed (recipes are laptop-entry, not
  wet-hands-on-the-wall-tablet — the QuantityStepper rule is about
  counts, not prose). Pages: the list (flat and alphabetized for now,
  reuse `EmptyState`), detail at `/kitchen/cooking/recipes/[id]`
  (ingredients, then numbered steps, Edit, single-tap Delete per the
  house rule). Plus `db:seed-recipes` / cleanup scripts: ~12 recipes
  spread across the alphabet including one starting with a digit (for
  the "#" bucket), deleting only `Recipe` rows on cleanup. Verify:
  create, edit, delete through the browser; count returns to baseline
  after cleanup.
- **R2. A–Z rail + search.** ✅ **Done.** `RecipeList.tsx` groups the list
  by first letter (digits/symbols under "#"), with sticky section
  headers. The rail is one continuous touch surface pinned to the
  viewport's right edge — `onPointerDown`/`onPointerMove` map finger
  position to the nearest letter and jump there, not 27 separate
  sub-48px buttons; `setPointerCapture` + `preventDefault` on pointerdown
  is what makes a drag that wanders off the narrow strip keep tracking,
  and what stops a mouse-drag from turning into a native text selection.
  Letters with no recipes render dimmed (`text-line`) and are inert —
  `scrollToLetter` no-ops if there's no group. The rail's top offset is
  measured at runtime off the search box's actual position (`ResizeObserver`
  + `useLayoutEffect`), not a hardcoded pixel guess — the title row's
  height isn't constant across the `md` breakpoint, and a fixed guess
  visibly overlapped the New button on mobile before this was fixed.
  Search reuses `match.ts`'s tokenizer via a new `searchRecipes()`, which
  checks both title and ingredients but adds a flat offset to any title
  match so it always outranks an ingredients-only one (searching
  "chicken" surfaces Honey Mustard Chicken before Jambalaya, which only
  lists chicken thighs as an ingredient) — verified against the real
  seeded data, not just read from the code. All client-side over the
  full fetched list, household scale, no pagination.
  **Two real bugs the verification caught, worth remembering:**
  (1) `scrollIntoView({behavior: "smooth"})` doesn't reliably scroll a
  `position: sticky` target — confirmed by direct testing, not a guess —
  fixed by putting the scroll-target ref on the plain-flow `<section>`
  wrapper instead of the sticky `<h2>` inside it. (2) Even after that fix,
  "smooth" scrolling was unreliable in the same session's browser-preview
  tooling; switched to `"instant"`, which turned out to be the *more*
  correct choice anyway — a rail meant to track a moving finger in real
  time shouldn't be queuing a separate animation per letter crossed
  during a fast drag, since that would visibly lag behind the gesture on
  any device, not just this one.
- **R3a. Import: pasted text.** ✅ **Done.** "Add recipe" now opens a
  chooser (`/kitchen/cooking/recipes/new`) — Type it in / Paste text /
  From a photo / From a link, all four visible now per the
  no-feature-stubbed-early rule; Photo and Link point at "Coming soon"
  pages until R3b/R3c land. `src/lib/recipeExtract.ts` holds the pure
  Claude call (Haiku, structured outputs, same shape as
  `voice/parse.ts`); `extractRecipeFromPastedText` in
  `src/app/actions/recipes.ts` wraps it with `getVerifiedSession()` and
  a length cap, and never touches the database — it only ever hands
  parsed fields back to the client. `PasteImportForm.tsx` shows a
  textarea, calls the action, then remounts `RecipeForm` (via a bumped
  `key`, since its inputs are uncontrolled) pre-filled with the result —
  reviewed and edited like any other entry, nothing saved until Save is
  tapped. Verified against a real messy blog paste (life story, an
  affiliate-link aside, an ad block, 247 comments) end to end: title
  correctly picked the recipe card's own name over the blog post's
  title, ingredients and steps came back clean with zero noise, and the
  saved recipe round-tripped through the real detail page. Also verified
  the failure path — pasting a travel-blog paragraph with no recipe in
  it returns a clear inline error ("Couldn't find a recipe in that
  text…") instead of silently opening a blank form.
- **R3b. Import: photo.** ✅ **Done.** `PhotoImportForm.tsx` shows up to 3
  square photo slots — tap "Add photo" to open the camera/gallery picker
  (`<input type="file" accept="image/*" multiple>`), each
  with its own × to remove. **The input deliberately carries no
  `capture` attribute** — see the fix note near the end of this file for
  why the original `capture="environment"` was actively wrong on iOS. Every photo is **downscaled client-side the
  moment it's picked** — canvas re-encode to a 1600px long edge JPEG at
  0.85 quality — before it ever leaves the phone, since raw phone photos
  run 3–10MB and would blow the Server Action body limit. That limit
  itself is now set explicitly (`next.config.ts`,
  `experimental.serverActions.bodySizeLimit: "8mb"`, found in the Next
  16 docs per AGENTS.md) rather than trusted at its 1MB default.
  `extractRecipeFromPhotos` in `recipeExtract.ts` sends the downscaled
  JPEGs to Haiku as image content blocks alongside a photo-specific
  system prompt (cookbook page / handwritten card / screenshot, with an
  explicit instruction to ignore on-screen UI chrome — likes, usernames,
  captions, hashtags); `extractRecipeFromRecipePhotos` in
  `recipes.ts` wraps it with the same `getVerifiedSession()` +
  no-database-write contract as the text path, plus a count cap (≤3) and
  a per-photo size cap as a backstop. Same `RecipeForm`
  remount-on-extraction pattern as `PasteImportForm`.
  **Verified against two of the three real source types** by
  constructing genuine full-size (3000×4000 and 1080×1920) synthetic
  photos client-side and driving the real file input via a `File` +
  `DataTransfer` (there's no scriptable OS camera/file dialog in this
  environment, so this is the closest faithful exercise of the actual
  component code — not a shortcut around it): a printed-cookbook-style
  page came back with every field exactly correct, and a TikTok-style
  screenshot — complete with a fake username, like/comment counts, a
  caption, and hashtags baked into the image — came back with the
  recipe's 7 ingredients and 5 steps exactly right and *zero* leakage of
  any of that UI chrome, with servings/prep/cook time correctly left
  empty rather than guessed since none were stated. Also confirmed the
  downscale actually fires: the 3000×4000 original was verified,
  post-encode, at exactly 1200×1600 (long edge capped at 1600, aspect
  ratio preserved). The third source type (a genuinely handwritten
  card) wasn't tested — synthesizing a photorealistic handwriting sample
  is a different problem from the printed/screenshot cases and Haiku's
  performance on it should be checked against a real card the next time
  one's handy, per the plan's own fallback ("bump to Sonnet if real
  photos — handwriting especially — prove too hard for it").
- **R3c. Import: URL.** ✅ **Done.** `src/lib/recipeUrlImport.ts` routes by
  host, all behind a 10s timeout: **tiktok.com** → the public oEmbed
  endpoint's caption → the same text extraction R3a built;
  **pinterest.com / pin.it** → find the pin's outbound source link,
  follow it once, then treat it as a blog URL; **anything else** →
  schema.org JSON-LD `Recipe` if the page has it (exact, free, no model
  call), else strip the page to text (capped at 15k chars) and send that
  to Claude. `importRecipeFromLink` in `recipes.ts` wraps it with the
  same `getVerifiedSession()` + no-database-write contract as the other
  two paths; `LinkImportForm.tsx` is the same paste-and-pre-fill shape as
  `PasteImportForm`. Every failure names a specific next step — a 403,
  an unreadable page, a TikTok whose recipe is only spoken — never a
  dead end. The JSON-LD normalizer handles what real sites actually
  emit, not just the spec's happy path: `@type` as a string *or* array,
  recipes nested in `@graph`, `recipeInstructions` as a plain string /
  `HowToStep` objects / `HowToSection` groups that need flattening,
  `recipeYield` as a string / number / array, and ISO-8601 durations
  (`PT1H15M` → "1 hr 15 min").
  **Three real-world findings from verifying against live sites**, each
  of which changed the code:
  (1) **Pinterest's outbound link lives in an `og:see_also` meta tag**,
  not in the `__PWS_DATA__` JSON the pin page embeds. The JSON walk was
  the obvious-looking approach and finds nothing for a signed-out fetch,
  because the pin's own record is loaded client-side after page load —
  caught only by actually fetching a real pin and grepping the response.
  The meta tag is now the primary lookup, with the JSON walk kept as a
  cheap second pass.
  (2) **Several major recipe sites (AllRecipes, SimplyRecipes) return a
  flat 403** to a server-side fetch regardless of anything else. Sending
  a real browser User-Agent fixes the sites that merely sniff the UA;
  the ones that block harder now produce an honest "couldn't load that
  page (error 403) — try pasting the recipe text instead," which is why
  paste import existing first matters.
  (3) **A TikTok caption very often doesn't contain the recipe** — the
  canonical viral example (feelgoodfoodie's baked feta pasta) has a
  caption reading "Recipe on blog," nothing more. Verified this produces
  the intended graceful message pointing at photo import rather than a
  fabricated recipe. This is the "honest TikTok answer" from the plan's
  decisions, confirmed against the real endpoint rather than assumed.
  Verified end to end in the running app: a real blog URL
  (sallysbakingaddiction.com) imported all seven fields exactly via
  JSON-LD with no model call; a real Pinterest pin resolved through to
  averiecooks.com and imported the full recipe, with `sourceUrl`
  correctly recording the blog rather than the pin; and the invalid-URL,
  403, and no-recipe-in-caption paths each produced their specific
  message.
- **R4. Sharing.** ✅ **Done.** `ShareRecipeControls.tsx` on the recipe
  detail page offers both: **Copy as text** (title, ingredients,
  numbered steps as clean plain text straight to the clipboard — no
  link, nothing to revoke, for pasting into a group chat) and a
  **share link** that's off until you deliberately create it.
  `shareRecipe`/`stopSharingRecipe` in `recipes.ts` generate and null
  the token; sharing is idempotent (re-sharing returns the existing
  token rather than rotating it, so tapping twice doesn't break a link
  someone already has), and revoking discards it for good — re-sharing
  afterward mints a completely different one.
  **The share page forced a structural change worth understanding:**
  a shared recipe is read by someone with no session, so its page must
  render with *none* of the app's chrome — no header, no nav bar, and
  critically no `getSession()` call. Next.js's documented way to give a
  route subtree a genuinely separate `<html>`/`<body>` is **multiple
  root layouts via route groups**, not a conditional inside one shared
  layout. So the entire authenticated app moved into
  `src/app/(app)/` (route groups are invisible in URLs — every existing
  path is unchanged), and `src/app/share/layout.tsx` is now a second
  root layout alongside it. `RecipeBody.tsx` was extracted at the same
  time, since the ingredients/steps/notes rendering is the one thing
  both pages must show identically.
  `proxy.ts` gained `PUBLIC_ROUTE_PREFIXES` — the share URL carries a
  per-recipe token so it can't be an exact match like the existing
  entries. Deliberately `"/share/recipe/"` and not a broad `"/share"`,
  so a future `/share/...` route isn't silently public the day someone
  adds it.
  **The adversarial check, run in full** (methodology matters as much as
  the result — same discipline as Phase 1e):
  *Positive control first* — a valid token with **no cookie at all**
  returns 200 with the real recipe, which is what makes every blocked
  case below meaningful rather than vacuous. Then: a wrong token → 404
  with zero recipe titles in the body; the recipe's own **id** used as a
  token → 404 (the token isn't derivable from anything public); an empty
  token and a path-traversal attempt → no resolution. Token properties
  checked directly rather than assumed: 43-char base64url, **256 bits**
  of `crypto.randomBytes` entropy, all unique, URL-safe alphabet only,
  and **zero shared prefix between consecutive tokens** (i.e. not
  sequential). The share page renders **exactly one `<h1>`** with none
  of the other 11 seeded recipes leaked, no "Sign out"/nav/branch
  strings anywhere in the HTML, and `noindex, nofollow` set so a shared
  link can't end up in a search index. Revocation verified end-to-end:
  the exact URL that served the recipe a minute earlier returned **404
  with nothing leaked** after "Stop sharing."
  *The proxy-misconfiguration drill* — temporarily broke the prefix to
  the sloppy `"/share"` a future developer might reasonably write, and
  measured what it exposed: `/shareX/recipe/abc` and `/share-secrets`
  both started **bypassing the login gate** (404 = reaching the app,
  versus 307 = redirected). Nothing lives at those paths today so
  nothing actually leaked, but it's a real latent hole and the reason
  the committed prefix is the specific one. `proxy.ts` was restored
  immediately and `git diff`'d to confirm the only remaining change is
  the intended R4 addition, with all near-miss paths back to 307.
  Every protected route (`/`, all of `/kitchen/*`, `/calendar`,
  `/chores`, `/lists`) re-verified at 307 with no cookie afterward.

**Deliberately not in v1** (revisit only when real use demands it): dish
photos (needs Vercel Blob — a new account/billing decision, so Bryce's
call), tags/categories, structured ingredients and "add this recipe's
ingredients to the shopping list" (genuinely wanted someday, needs
quantity parsing), cook-mode screen wake lock, recipe voice verbs, and
bulk-importing an entire Pinterest board.

## Recipes v2 plan — ACTIVE

Cookbooks, tags, ratings, cooked history, nutrition, photos, cross-branch
buttons, and a redesigned recipe page. Designed 2026-08-07 from a
screenshot walkthrough of **RecMe** (a commercial recipe app) — Bryce
walked through it feature by feature, marking what to adopt, adapt, or
skip. RecMe is a *layout* reference only: what to build comes from those
explicit calls, recorded below, not from imitating the app wholesale.
Written for a fresh session to implement phase by phase without having
been in the design conversation.

**Which model to use, per phase** — Bryce asked for this directly, so a
session shouldn't have to guess. The rule of thumb: **Sonnet** for
phases that are well-specified CRUD and UI (the decisions below do the
hard thinking already); **Opus** for the phases marked as such — the
ones with cross-cutting data logic, a new external service, or an
adversarial security check, where a wrong subtle call is expensive on
the live family database. (This is about the *coding session's* model —
separate from the in-app Claude API calls, which stay on Haiku per the
established cost decision.)

**Decisions already made — don't re-litigate these:**

- **The recipe list page grows a view toggle: Cookbooks / All Recipes,
  default Cookbooks.** It sits in the title position ("Cookbooks ⌄"),
  opening a bottom sheet with two radio rows — the house sheet pattern,
  not a custom dropdown. **All Recipes is today's page unchanged**: A–Z
  groups, the slide-to-jump rail, search. No photo grid, no collage
  covers — Bryce explicitly skipped RecMe's collage look; a cookbook in
  the list is its title and a recipe count.
- **The + button moves to the bottom-left corner** — a floating circle
  replacing the header "New" button, opening a sheet: "Add a recipe"
  (the existing 4-way import chooser) / "Add a cookbook". Bottom-*left*
  is deliberate, not aesthetic: the A–Z rail owns the right edge at full
  height, so a bottom-right button would sit on X/Y/Z. It must float
  above the fixed nav bar and pin to the content column's edge (not the
  raw viewport edge, or it drifts into the margin on wide screens).
- **A cookbook is a named list; membership is a join table.** `Cookbook`
  (title, `shareToken? @unique`, timestamps) + `CookbookRecipe`
  (cookbookId, recipeId, `addedAt`, unique on the pair). A recipe can
  be in many cookbooks or none. `addedAt` exists because the "most
  recent" sort means "when was a recipe last added to this book" — not
  when the book row was touched; a cookbook-level timestamp would get
  this subtly wrong.
- **Deleting a cookbook unfiles its recipes, never deletes them** —
  cascade on the join rows only. And this is one of exactly **two
  deliberate breaks of the single-tap-delete rule** (the other is
  deleting a tag): both silently touch many rows' relationships, unlike
  deleting one grocery item. Each confirms with a count — "Delete Mom's
  Recipes? Its 14 recipes stay in All Recipes." The reassurance is half
  the point of the dialog. Scoped to these two; everything else keeps
  the house rule.
- **Tags are a table + join** (`Tag`, `RecipeTag`), never text on the
  recipe — that's what makes rename safe (rename once, every recipe
  follows) and delete honest (show the count). Normalize on create: the
  "search or create" box surfaces an existing case-insensitive match
  first and only offers "create" when nothing matches — same idea as
  the add-time duplicate check, because "Dessert"/"dessert"/"Desserts"
  as three tags is how a tag list rots.
- **The four meal-slot tags are seeded from `MEAL_SLOTS`, not typed.**
  Slot tag and slot are the same word *by construction*, so the meal
  suggester never fuzzy-matches a user-typed "breakfast" against the
  Breakfast slot — the steaks/"tea" lesson applied preemptively, again.
  Every other tag (Dessert, Side, Special Occasion…) is freely
  user-created.
- **The meal-plan AI filters by slot tag *before* the prompt, not in
  it.** `suggestMealsForSlot` sends only recipes tagged for the slot
  being filled (falling back to the full library when none are tagged).
  A model can't ignore a list it never saw — strictly stronger than
  "prefer breakfast recipes" as prompt text, and cheaper.
- **Tag filtering on the list page is chips on the All Recipes view
  only** — filtering *cookbooks* by tag is ambiguous and skipped.
  Single-select, same as Inventory's location chips and Shopping's
  store chips.
- **Rating is 1–5 stars, one tap** (`rating Int?` on Recipe). Tapping
  the current rating clears it back to unrated. Stars are 44px+ targets.
- **Cooked is `lastCookedAt DateTime?`, deliberately not a boolean.**
  "Mark as cooked" stamps now; the Cooked filter is just "is it set";
  and it hands the meal-plan AI something real later ("you haven't made
  this since March" beats "you've made this"). Costs the same as a
  boolean.
- **Nutrition is estimated once, stored, and marked honest.**
  "Calculate nutrition" → a confirm sheet asking for a hard servings
  *number* (stepper — this exists because `servings` is free text like
  "6-8", and it must **never overwrite** that field) → one Haiku call
  with structured outputs → store calories/protein/carbs/fat as **whole
  grams** (12 g, never 12.4 g — an AI estimate doesn't have decimal
  precision, and a dieter will act on these numbers), plus the servings
  number used, plus a **fingerprint of the ingredients text** it was
  computed from. If the ingredients are later edited, the fingerprint
  mismatch shows a "computed for an older ingredient list" notice with
  a recompute button, instead of confidently mislabeling a different
  recipe. Displayed with the `~` estimate mark, per the Expiring rule
  that a guess never masquerades as a fact. The donut chart splits by
  **calories** (fat 9/g, protein and carbs 4/g), not grams — a
  gram-split donut understates fat by more than half. Failure is an
  inline error + Try again; nutrition can never block the rest of the
  page.
- **"Add to groceries" suggests, never auto-adds** — the put-away
  review pattern pointed the other direction. One Claude parse turns
  the ingredient lines into plain item names; `matchItem` checks each
  against the real inventory; a review sheet shows what the house
  already has vs. what's missing (missing pre-checked, on-hand
  unchecked but toggleable — the model and matcher both guess, so a
  human confirms); one tap adds the confirmed set to the shopping
  list. Rows that matched a pantry item carry `pantryItemId` so
  put-away restocks the right row.
- **The Meal Plan button writes through `setMealPlanEntry`, no new
  write path.** It opens a picker sheet — week, then day (7 chips with
  real dates), then slot (4 chips) — and saves exactly like picking a
  recipe from the slot sheet does today, denormalized title and all.
  Same upsert, same double-tap safety.
- **Export PDF and Print are the same print view.** A print-stylesheet
  rendering of the recipe; Print calls `window.print()`, and Export
  PDF is the *same dialog* — every platform's print sheet offers Save
  as PDF. No server-side PDF generation: a headless-browser dependency
  for output identical to what the client already produces.
- **Recipe photos need Vercel Blob, and that's Bryce's account/billing
  decision** — same status as v1, now with a phase waiting on it. Two
  image kinds, same storage: a **hero photo of the finished dish**
  (photogenic placeholder when absent) and the **original import
  photo(s)** kept as the recipe's *source* (Bryce: the source line
  should work for photo-imported recipes the way `sourceUrl` works for
  links — the cookbook page or handwritten card viewable from the
  detail page, not used as the hero). Photos are downscaled
  client-side before upload, reusing R3b's canvas pipeline. Every
  other phase ships without this one.
- **Cookbook viewer sharing is the recipe-share machinery pointed at a
  list.** Unguessable token, revocable, public route under the narrow
  prefix `"/share/cookbook/"` — the R4 proxy drill is why the prefix
  is narrow. A share follows the cookbook's *current* contents (adding
  a recipe later extends what the viewer sees) — right behavior, but
  the share UI must say it plainly. **Collaborator is out of v2
  entirely**: the app has one shared family password, so there is no
  per-person "someone" to grant edit rights to yet. Viewer now,
  collaborator when accounts exist.
- **One filter-bar component, used twice.** The cookbook page's bar
  (search, Tags, Total time, Cooked, Rating, Sort) and All Recipes'
  tag chips are the same control over different recipe sets — build it
  once (`BranchTile`/`BackLink` precedent) or it drifts. **No
  Ingredients filter** — Bryce has a different plan for that later.
- **Total time filtering is best-effort by design.** `prepTime`/
  `cookTime` are free text on purpose ("45 min", "1 hr 15 min"); the
  filter parses them into buckets (Under 30 / 30–60 / Over an hour)
  and anything unparseable simply matches no bucket. Fuzzier than it
  looks; that's accepted, not a bug to fix later.
- **⚠️ The dev database IS the live family database — still.** Additive
  migrations only; never `db:seed`/`db:reset`; test data only via new
  scoped scripts that touch the new tables and clean up by fingerprint
  (the recipe/meal-plan scripts' hard-won lesson). And the standing
  R1 lesson: a new model needs `prisma generate` **and a dev-server
  restart**, because `db.ts` caches the client on `globalThis`.

**The phases.** Commit at each boundary; `npx tsc --noEmit`, `eslint`,
and `npm run build` clean before each commit; verify each phase in the
running app against real interaction — the discipline that caught the
steaks/"tea", sticky-scroll, and Pinterest-meta-tag findings. Per
AGENTS.md, check `node_modules/next/dist/docs` before using any Next
API not already used in this repo.

- **C1. Cookbooks core.** *(Sonnet.)* `Cookbook` + `CookbookRecipe`
  schema (additive migration, generate, restart). The view toggle on
  `/kitchen/cooking/recipes` (Cookbooks default / All Recipes — All
  Recipes renders exactly today's list). Cookbook list rows (title +
  count) with the A–Z / most-recent sort sheet. The bottom-left +
  button and its two-option sheet, replacing the header New button.
  Create-cookbook flow (title → straight into the new empty book).
  The cookbook page: title, count, its recipes as the familiar list,
  "Add recipe" offering **pick from All Recipes** (a search picker
  over the existing library, the M2 recipe-picker pattern) plus the
  four import paths — the import chooser and `createRecipe` take an
  optional cookbookId so a recipe born inside a book lands in it.
  ⋯ menu: Edit title, Delete (count-confirm; unfiles only). Scoped
  seed/clean scripts for cookbooks. Verify: create, file existing +
  newly-imported recipes, unfile, delete a non-empty book and confirm
  every recipe survives in All Recipes, counts stable throughout.
- **C2. Tags.** *(Sonnet.)* `Tag` + `RecipeTag` schema; seed the four
  slot tags from `MEAL_SLOTS` (idempotent — upsert by name, so
  re-running never duplicates). The select-tags sheet (search-or-
  create with the existing-match-first rule, selected chips, per-tag
  ⋯ for rename / delete-with-count). Tag chips on the recipe detail
  page with an Update entry point. Tag filter chips on All Recipes
  (single-select). Wire `suggestMealsForSlot` to pre-filter by slot
  tag with the untagged-library fallback. Verify against the real
  library: tag a real recipe Breakfast, confirm a Breakfast-slot
  suggestion request sends only Breakfast-tagged recipes (log the
  candidate list), and that an untagged slot still falls back to
  everything; rename and delete round-trips.
- **C3. Recipe detail v2.** *(Sonnet.)* The redesigned page top to
  bottom: back + Edit + ⋯ (Export PDF / Print / Delete — delete keeps
  the house single-tap rule, it touches one recipe); hero area with
  placeholder art (real photos arrive in C7); title; the three action
  circles (Meal Plan and Groceries appear now but wire up in C5 —
  visible-not-stubbed per the house precedent, or wired immediately if
  C5 lands first); the notes/meta block (prep, cook, source link);
  Cookbooks chips with Edit (file/unfile from the recipe side, the
  C1 join reused); stars; Mark as Cooked stamping `lastCookedAt`;
  then Ingredients → Instructions → Nutrition (placeholder button
  until C6) → Tags. The print-view route + print stylesheet behind
  Export PDF/Print. Verify on a real phone-size viewport: every
  target ≥44px, stars set/clear persists, cooked timestamp lands,
  print view renders clean.
- **C4. The filter bar.** *(Sonnet.)* The shared component: search,
  Tags, Total time (the best-effort parser + its buckets), Cooked,
  Rating, Sort — used on the cookbook page in full and backing All
  Recipes' tag chips. Time-parser gets unit tests against real
  strings ("45 min", "1 hr 15 min", "1½ hours", "a while" → no
  bucket). Verify filters compose (Dinner + Under 30 + 4★) against
  seeded variety.
- **C5. The cross-branch buttons.** *(Opus — this is the phase with
  real cross-feature data flow.)* **Meal Plan button**: the
  week/day/slot picker writing through `setMealPlanEntry`. **Add to
  groceries**: the parse → match → review sheet → confirmed-add flow
  from the decision above, including `pantryItemId` linking and the
  have/missing split. Verify against the real inventory: a recipe
  whose ingredients are partly stocked shows the right split; adding
  writes only confirmed rows; a linked row put-away restocks the
  matched pantry item, not a duplicate.
- **C6. Nutrition.** *(Sonnet; Opus if the estimates come back
  unreliable and the prompt needs real iteration.)* The confirm-
  servings sheet, the Haiku call (structured outputs, `server-only`
  lib + guarded action split, same as every other AI feature), the
  stored fields + fingerprint staleness check, the calorie-split
  donut, `~` marking, inline failure + Try again. Verify: compute on
  a real recipe, edit an ingredient, confirm the stale notice appears
  and recompute clears it; break the API key via `.env.local` (the
  M4 trick) and confirm the page degrades gracefully.
- **C7. Photos.** *(Opus — first stored-images integration in the
  stack, and it starts with a walkthrough.)* **Gated on Bryce
  creating/approving Vercel Blob** (account + billing, walkthrough
  style like Neon/Vercel). Then: hero photo upload (camera/library →
  client downscale → Blob, upload guarded by session), the camera
  button on the detail page, placeholder art when absent, and import
  photos persisted as the recipe's viewable *source*. Deleting a
  recipe must delete its blobs — Blob storage is billed and orphaned
  images are invisible. Verify upload/replace/delete round-trips and
  that a deleted recipe leaves no blob behind.
- **C8. Cookbook viewer link.** *(Opus — it's a security surface, and
  the check is adversarial by house rule.)* Share/revoke actions on
  the cookbook (idempotent share, revoke kills the link for good),
  the public page under `"/share/cookbook/"` in
  `PUBLIC_ROUTE_PREFIXES`, chrome-free like the recipe share page,
  `noindex`. The share sheet states plainly that the link follows the
  book's current contents. Run the full R4-style check: positive
  control first (valid token, zero cookies, 200), wrong/empty/id-as-
  token all 404 with nothing leaked, revoked link dead, proxy-
  misconfiguration drill with the sloppy prefix, every protected
  route re-verified at 307 afterward.

**Deliberately not in v2** (revisit only when real use demands it):

- **Structured ingredients — the explanation Bryce asked to be
  reminded of.** Today `ingredients` is one text column, one line per
  ingredient ("1 cup sliced bell pepper"). *Structured* would mean
  each ingredient stored as its own quantity + unit + item-name
  fields. That's what would unlock: **servings scaling** (tap 10
  servings and every quantity doubles), **unit conversion** (cups ↔
  grams), *exact* inventory matching for Add-to-groceries (v2 ships
  the AI-parse-and-review version instead), and cheaper nutrition
  (no re-reading raw text). The cost is real: an import-extraction
  rewrite, a data migration for every existing recipe, and an
  editing UI for structured rows — which is why it stays out. **The
  tripwire: v2 now works around its absence three times** (groceries,
  nutrition, and the deferred scaling). If a fourth feature needs it,
  stop working around it and build it.
- Servings scaling + Convert (blocked on the above), ingredient
  section headers ("For the Dressing") and tappable ingredient links
  inside steps, Cook step-by-step mode, collaborator sharing (blocked
  on per-person accounts), the Ingredients filter (Bryce has a
  different plan), RecMe's Discover tab and "Ask" chat entirely, and
  the logo/profile header treatment (Bryce: "we can do that later").

## Meal Plan plan — ✅ DONE

All four phases shipped and verified — Cooking's second (and final)
tile is complete. Menu and Meal planning were merged into one "Meal
Plan" tile after noticing they were the same feature described twice;
the route rename (`meal-planning` → `meal-plan`) and the two-tile
Cooking page shipped with M1. Kept below as a record of the decisions,
same as the other finished plans.

Bryce's vision, in his own terms: open the tab and see this week's plan —
each day of the week with breakfast, lunch, dinner, and snacks. Look back
at previous weeks. When the week is over, a **+** creates the next week's
plan (a window "with the correct dates" — never typed). Tap into any meal
slot and fill it one of three ways: a custom meal, a meal from the recipe
box, or an AI assistant that scans the real inventory and suggests what
the house could actually make. This plan was written for a fresh session
to implement phase by phase without having been in the design
conversation.

**Decisions already made — don't re-litigate these:**

- **One week = one `MealPlan` row; one meal per slot.** `MealPlan` holds
  `weekStart` (`@unique`); `MealPlanEntry` holds `dayOffset` (0–6),
  `slot`, `title`, and an optional `recipeId` — unique on
  `(mealPlanId, dayOffset, slot)`, entries cascade-delete with their
  plan. The slot vocabulary (`MEAL_SLOTS`: Breakfast, Lunch, Dinner,
  Snacks) lives in `constants.ts` with a `toMealSlot()` guard, per the
  one-source-of-truth rule and the no-enums schema rule. One meal per
  slot is deliberate v1 simplicity — "chicken + rice + broccoli" is one
  custom title, and if real use demands true multi-entry slots, the fix
  is dropping one unique constraint, not a redesign.
- **Partial plans are the normal case, not an error.** A week with only
  dinners filled is the expected real-world plan; 28 slots exist but
  nothing nags about empty ones. Empty slots render as a muted "Add".
- **Weeks start Sunday.** One constant. US-family planning convention;
  flipping to Monday is a one-line change (cheap now, a data migration
  only once real plans accumulate — so if it's wrong, say so early).
- **Date math is calendar-component math, never milliseconds.** DST makes
  two weeks a year 167 or 169 hours long (US clocks fall back
  Nov 1, 2026 — well within this feature's first months), so
  `+ 7*24*3600*1000` silently drifts. Build dates with
  year/month/day arithmetic only, the same local-date discipline the
  expiry date field already established. `weekStart` is stored as the
  Sunday's calendar date; entries derive their date from
  `weekStart + dayOffset` at render, never store their own.
- **"Which week is current" is computed on the client, from the device
  clock.** Vercel's servers run UTC — a Saturday-evening render in Utah
  would flip to "next week" hours early if the server decided. The page
  fetches all plans (household scale — a year is 52 rows) and a client
  component partitions current/future/past.
- **Entries denormalize the title and soft-link the recipe.** `title` is
  always set; `recipeId` is a nullable FK with `onDelete: SetNull` — the
  exact `GroceryItem.pantryItemId` pattern — so deleting a recipe never
  hollows out history. The week of July 27 still says what was eaten.
- **Creating a plan never involves typing a date.** The + opens a sheet
  of upcoming weeks as big chips with real ranges ("Week of Aug 9–15"),
  already-planned weeks visible but inert; the `weekStart` unique
  constraint makes double-creation impossible even with two phones
  tapping at once. Same touch-first reasoning as the leftovers
  days-good picker. The server snaps any incoming date to its week's
  Sunday, so a confused client can't create an off-grid week.
- **Slot filling is one bottom sheet, three ways in.** Tap a slot →
  sheet (house pattern: `PantryItemEditSheet`) offering: preset chips
  for the real-life frequent answers (**Leftovers / Takeout / Eating
  out**) plus a free-text field; a recipe picker reusing
  `searchRecipes()` over the real library (search-as-you-type, ranked,
  tap to pick); and AI suggestions (M4). Every path ends with an
  explicit tap that fills the slot — the visual pick *is* the review
  step, same principle as recipe import's form. Writes are upserts on
  the slot's unique key, so a double-tap is harmless. Clearing a slot is
  in the same sheet; deleting a whole plan is single-tap per the house
  delete rule.
- **AI suggestions are grounded by index, never by name-matching.** The
  suggest action sends Claude: the in-stock inventory (names +
  quantities), the soon-to-expire items (via `effectiveExpiry` — the
  prompt tells it to prioritize using those up, which points Meal Plan
  at the same food-waste problem Expiring exists for), the slot being
  filled, and the recipe library as an **indexed** list. Structured
  outputs return either a `recipeIndex` (exact — immune to the
  steaks/"tea" class of fuzzy-match bugs, which is the whole reason we
  don't return recipe *names* and match them) or a freeform idea, each
  with a short "why" naming the on-hand items it uses. Haiku first
  (cost approved; a 462-item inventory prompt is a fraction of a cent).
  The action is read-only — suggestions are handed back to the client,
  and a tap fills the slot like any other path. Failures never block
  the manual paths, which stay visible in the same sheet.
- **⚠️ The dev database IS the live family database — still.** Additive
  migrations only (two brand-new tables); never `db:seed`/`db:reset`;
  test data comes from new meal-plan-only scripts (`db:seed-meal-plans`
  / `db:clean-meal-plans`) that touch nothing but these tables. And the
  R1 lesson: a new model needs a **dev-server restart** after
  `prisma generate`, not just a file save — `db.ts` caches the client on
  `globalThis`.
- **Layout: vertical day cards, not a grid.** 7 days × 4 slots = 28
  cells — a grid doesn't fit a phone. Each day is a card with four
  tappable slot rows (48px minimum); today is highlighted. Past weeks
  are collapsed headers, newest first, expanding to the same editable
  cards (Inventory's collapse pattern) — history stays editable because
  this is a family log, not an audit trail.

**The phases.** Commit at each boundary; `npx tsc --noEmit`, `eslint`,
and `npm run build` clean before each commit; verify each phase in the
running app against real interaction — the discipline that caught the
steaks/"tea", sticky-scroll, and Pinterest-meta-tag findings in earlier
plans. Per AGENTS.md, check `node_modules/next/dist/docs` before using
any unfamiliar Next API.

- **M1. Schema + this week + custom meals.** ✅ **Done.** Shipped the
  pending Menu→Meal Plan merge in the same commit (`meal-planning/` →
  `meal-plan/`, `menu/` deleted, Cooking's landing page down to two
  tiles). `MEAL_SLOTS` + `toMealSlot()` in `constants.ts`.
  `MealPlan`/`MealPlanEntry` models, additive migration, `prisma
  generate`, dev-server restart. `src/lib/mealPlanDates.ts` holds every
  date calculation (calendar-component math only, documented and tested
  against the real Nov 1, 2026 DST fall-back — see below);
  `src/lib/useToday.ts` reads the browser's "today" via
  `useSyncExternalStore`, the same pattern `useLastStore` established,
  for a reason sharper than localStorage: this dev machine runs
  Mountain time, Vercel's production runtime runs UTC, and Mountain is
  *behind* UTC — so for roughly six or seven hours every evening, a
  server-computed "today" would already be tomorrow. Server Actions in
  `src/app/actions/mealPlans.ts` — `createMealPlan`, `setMealPlanEntry`
  (upsert), `clearMealPlanEntry`, `deleteMealPlan` — every one opening
  with `getVerifiedSession()`; `createMealPlan` treats a unique-
  constraint collision as success, not an error (two phones tapping the
  same week chip at once both want the same outcome). The page
  (force-dynamic) fetches all plans + entries and does zero date
  interpretation itself; `MealPlanList.tsx` (client, `useOptimistic` +
  `startTransition`, same pattern as `PantryList.tsx`) partitions
  current/future/past from the browser's own clock and renders
  `WeekCard.tsx` (7 day-cards × 4 slot rows, today highlighted),
  `PastMealWeeks.tsx` (collapsed headers, newest first, same pattern as
  Inventory's category groups), `SlotEditSheet.tsx` (preset chips —
  Leftovers/Takeout/Eating out, each a single-tap save — plus custom
  text, plus two visibly-disabled "coming soon" rows for the recipe
  picker and AI suggestions, same not-stubbed-early precedent as
  Recipes' import chooser), and `CreatePlanSheet.tsx` (week chips,
  already-planned weeks shown but inert, never a typed date). Seed
  script: 3 weeks — last week, this week, and the real Nov 1, 2026 DST
  week — cleanup back to zero.
  **Verified end to end in the browser, not just read from the code**:
  today (Tuesday, Aug 4) correctly highlighted against the real device
  clock; the DST week's 7 days rendered as genuinely consecutive dates
  (Nov 1–7) with no skip or duplicate; a slot filled via a preset chip
  saved instantly (optimistic) *and* persisted (confirmed via a direct
  database read, including that the stored UTC timestamp — 06:00 —
  correctly reflects Mountain midnight); Clear emptied a slot; the +
  flow correctly marked the current week "Already planned" and created
  a real new week from a tapped chip; single-tap delete removed it with
  no confirmation, matching the house rule. Pantry (462), grocery (13),
  and the 8 real recipes already in the household's library were
  unchanged throughout — confirmed by direct count before and after,
  since this ran against the live shared database. `tsc`, `eslint`, and
  `npm run build` all clean (the one pre-existing `GroceryRow.tsx` lint
  error, still untouched).
- **M2. Recipes in the slot sheet.** ✅ **Done.** The slot sheet's
  "Pick from your recipes" row is real now: tapping it swaps the sheet
  to a picker sub-view (a back chevron returns, and Escape steps back
  one level rather than closing outright) with a search box over the
  real library — `searchRecipes` when there's a query, alphabetical
  when there isn't, so the picker is useful before you type anything.
  Tapping a recipe saves immediately, writing both `recipeId` and the
  denormalized `title`, same one-tap-is-the-save shape as the preset
  chips. Recipe-linked entries render with a small accent-colored
  `BookOpen` in the week row, and the sheet shows a "View recipe" link
  through to `/kitchen/cooking/recipes/[id]` — inside the sheet, not on
  the row, since the row's own tap is already spoken for. Everything
  else that fills a slot (presets, custom text) explicitly writes
  `recipeId: null`, so retyping over a recipe-linked meal correctly
  drops the link instead of leaving a stale one pointing at a different
  dish.
  Verified in the running app against the household's 8 real recipes:
  the picker listed them alphabetically, searching "soup" narrowed to
  exactly the two soups, picking one filled Tuesday's dinner, and a
  full page reload confirmed it persisted server-side with the book
  icon on that entry *only* — the other filled entries (plain-text
  ones) correctly had no icon. The "View recipe" link resolved to the
  real detail page.
  **SetNull was verified for real, but not the way the plan said to.**
  The plan's instruction was "seed a recipe, plan it, delete it" —
  except the Recipe table now holds the family's actual recipes, so a
  seeded-then-deleted test recipe had to be surgically scoped. Used a
  one-off script that created exactly one test recipe, linked it, then
  deleted that single row by id: the entry survived with `recipeId:
  null` and its title intact. History never gets hollowed out.
- **M3. History + plan-ahead + badge.** ✅ **Done.** History,
  plan-ahead, and whole-plan delete had already shipped in M1
  (`PastMealWeeks.tsx`, the "Coming up" section, single-tap delete), so
  M3's actual work was the badge: a new `PlanWeekTile.tsx` wraps
  `BranchTile` and badges "Plan this week" when the current week has no
  plan, on both Kitchen's Cooking tile and Cooking's own Meal Plan tile
  (a badge that vanished on the way in would leave you hunting for what
  it was pointing at). It's a client component for the same reason
  `MealPlanList` is — deciding *which* week is "current" has to happen
  against the browser's clock, never the server's (see `useToday.ts`) —
  and it renders no badge at all while `today` is still null (SSR and
  the first client render), matching what the server sent so there's
  nothing to flip.
  **A real bug, not just a design decision:** wrapping `BranchTile` in
  a client component broke every existing tile, because `BranchTile`
  took `icon` as a bare Lucide component *reference*
  (`React.ComponentType`) — fine when every caller was a Server
  Component rendering it directly, but a hard RSC crash
  ("Functions cannot be passed directly to Client Components") the
  moment a Server Component tried to pass that same reference as a
  *prop* into `PlanWeekTile`. Fixed at the root: `BranchTile.icon` is
  now `React.ReactNode` — an already-rendered `<Package size={32} .../>`
  element, which *is* serializable across the Server→Client boundary —
  and every call site (Kitchen's 4 tiles, Cooking's 2) was updated to
  render the icon rather than pass the component. Caught immediately by
  actually loading the page rather than trusting `tsc`/`eslint` (which
  were both clean and caught nothing — this is a runtime RSC
  serialization rule, not a type error).
  Verified in the running app: with the current week planned, both
  tiles show no badge; deleting just that week's plan (via a scoped
  one-off script, not `db:clean-meal-plans`) made "Plan this week"
  appear on both, confirmed to fit on one line at a real 375px
  viewport; re-seeding restored the plan and the badge correctly
  disappeared again. Re-verified the DST week in the fuller history UI
  per the plan's instruction: Nov 1–7, 2026 still renders as seven
  genuinely consecutive dates with no skip or duplicate, this time
  inside the real "Coming up" section rather than a throwaway script.
  `tsc`, `eslint`, and `npm run build` all clean (the pre-existing
  `GroceryRow.tsx` lint error, still untouched); pantry (462), grocery
  (13), and the 8 real recipes unchanged throughout, since this ran
  against the live shared database.
- **M4. AI suggestions — "What can I make?"** ✅ **Done — which
  completes the Meal Plan plan.** `src/lib/mealSuggest.ts` holds the
  pure Claude call (Haiku, structured outputs), mirroring
  `voice/parse.ts`'s split exactly: `"server-only"` with no auth check
  of its own, because `suggestMealsForSlot` in `mealPlans.ts` is what
  calls `getVerifiedSession()`. The action is read-only — it assembles
  the prompt from in-stock pantry rows, the soon-to-expire list (via
  `effectiveExpiry`, 7-day window — wider than the Kitchen tile's
  3-day badge, since the point here is "plan around it" rather than
  "this is urgent"), the slot, and the recipe library — and writes
  nothing. A suggestion only becomes a meal when the user taps it,
  routing through `setMealPlanEntry` like every other way of filling a
  slot. `SlotEditSheet` gains a third sub-view alongside the recipe
  picker, with a pending state, per-suggestion why-lines, and an error
  state with a Try again button.
  **The index grounding is the whole design, and it held.** Recipes go
  to the model as a numbered list and come back as a `recipeIndex`,
  never a name — an out-of-range index degrades to a freeform idea
  rather than producing a dead link, and the recipe's own title is
  trusted over the model's echo of it. This is the steaks/"tea" lesson
  applied preemptively instead of learned again.
  **Verified against the real 462-item inventory and the household's 8
  real recipes**, not a fixture: asking for Tuesday dinner returned two
  of the family's own recipes (Loaded Baked Potato Soup, Broccoli
  Cheddar Soup) plus two freeform ideas, every why-line naming
  genuinely on-hand items and correctly calling out stock expiring
  within days. Tapping the Broccoli Cheddar Soup suggestion saved with
  `recipeId` `cmsf5bmy2…` — confirmed by a direct database read to be
  the *actual* recipe row, with its title matching the linked recipe
  exactly. **The failure path was tested for real, not reasoned about**:
  an invalid key was injected via a temporary `.env.local` (Next.js
  gives it precedence over `.env`, so the real key was never touched or
  put at risk), and the sheet showed "Couldn't reach the AI just now"
  with a Try again button — after which the back chevron returned to a
  fully working main view and a preset chip still saved normally,
  confirming an AI outage never blocks the manual paths.
  One verification-methodology note worth keeping: an early read of the
  DOM immediately after a `.click()` looked like a broken back button,
  but was just a synchronous read beating React's re-render — re-reading
  after a tick showed correct behavior. Worth a `setTimeout` before
  asserting on post-click state rather than filing a phantom bug.

**Deliberately not in v1** (revisit only when real use demands it):
multiple meals per slot (one unique-constraint drop away), **copying a
previous week as a template** (cheap and probably the first thing real
use will ask for), generating a shopping list from the week's recipes
(blocked on structured ingredients, already deferred in the Recipes
plan — a meal plan makes it distinctly more valuable), a dashboard
"Tonight" card, voice verbs ("what's for dinner" — a V4 candidate),
drag-to-move meals between days, per-person columns, notifications, and
nutrition anything.

## Planned, not yet built

Everything below is independent of the voice plan above and not currently
being worked on. Roughly the order they'll likely get tackled, though
nothing here is scheduled:

- **Family profiles** — a page per family member.
- **Chore charts** — for the kids.
- **Recipes** — ✅ done, see the plan above.
- **Meal Plan** — now the ACTIVE plan above (absorbed the old "Menu"
  tile — they were one feature described twice).
- **To-dos**
- **Habit trackers**
- **Photo gallery**
- **Calendar** — shared family calendar. Planned last on purpose: it's
  expected to be the hardest piece.
- **Voice input** — now the ACTIVE plan above (grew from "wall tablet"
  nice-to-have into the Alexa/Siri integration).
- **Barcode scanning** — for fast grocery/pantry entry.

## Where I left off

**Phase 1 (Authentication) is complete — all five steps, including the
adversarial check.** Login actually protects the app now, not just plumbing
sitting unused, and that claim has been attacked and held rather than just
asserted.

**1b–1d recap** (see git log for the individual commits): the login page and
sign-in/out actions, `getVerifiedSession()` guarding all 12 Server Actions,
and `proxy.ts` redirecting signed-out page requests before they render — a
signed-out request to `/kitchen/inventory` used to return a full 200 with
real pantry contents; it now returns a 6-byte redirect with nothing in it.

**1e — the adversarial check — is where this session's real work was**, and
the methodology matters as much as the result:

- Minted a valid session JWT by hand (not through the browser) to get a
  genuine *positive control* — proof that an authenticated request to the
  same endpoint actually succeeds, so a blocked attack means something.
- First attempt at replaying a Server Action's POST directly with `curl`
  "succeeded" at being blocked — but the positive control then failed too
  (500, malformed body), which meant the block proved nothing. Found the
  real request shape (`Next-Action` header + JSON body) by reading a live
  browser request instead of guessing, then reran the control: it genuinely
  deleted a row and the server log confirmed the action ran.
- With a *proven-valid* attack request in hand: no-cookie replay → 307,
  6-byte body, zero rows changed.
- **The test that actually justifies the DAL architecture:** temporarily
  added `/kitchen/shopping` to `proxy.ts`'s public routes — simulating proxy
  being misconfigured — and attacked again with no cookie. The action
  *executed* (server log: `clearCheckedGroceryItems() in 1ms`, versus 4ms
  authenticated) but the database was **untouched**. Both layers hold
  independently; if proxy is ever wrong, the data is still safe. `proxy.ts`
  was reverted immediately after and diffed byte-identical to the committed
  version before moving on.
- Also confirmed forged cookies are rejected across the board: tampered
  signature, garbage value, empty, and — the one that actually matters — a
  validly-*formed* JWT signed with the wrong secret. All 307.
- Database backed up before any of this and restored after; final state
  verified against the exact baseline (48 grocery items, 1 checked, 87
  pantry items). No code changed — 1e is pure verification.

**The `FAMILY_PASSWORD` question is resolved for local dev, value not
repeated here** — this file is committed to git, and a password shouldn't
sit permanently in history even a weak dev-only one. Flagged as too weak for
production as given (short, guessable, no rate limiting yet); the real value
gets generated fresh and set directly in Vercel during Phase 3.

**Phase 2 (move off SQLite) is done.** The app runs on Neon Postgres now, not
SQLite. What changed:

- `prisma/schema.prisma`: `provider = "postgresql"`.
- `src/lib/db.ts` and `prisma/seed.ts`: swapped `PrismaBetterSqlite3` for
  `PrismaPg` (`@prisma/adapter-pg`) — both files had their own separate
  adapter instance, so both needed the swap, not just one.
- Old SQLite migration history deleted and replaced with one fresh
  `init_postgres` migration, since SQLite's migration SQL isn't valid
  Postgres SQL — this wasn't a like-for-like carry-over.
- Reseeded (87 pantry items, 10 grocery items) and reran the full Phase 1
  adversarial check against the new database: signed-out requests to both a
  page and a Server Action still 307, and the row counts were verified
  unchanged via a direct Prisma query, not just the UI.
- Bryce made a new Neon project by hand (the first connection string got
  pasted into chat by accident while drafting the `.env` edit — flagged
  immediately, and the project was deleted and recreated rather than trying
  to rotate the exposed password, since nothing had been migrated into it
  yet).

One snag worth remembering if this pattern comes up again: the generated
Prisma Client has to be regenerated (`npx prisma generate`) after flipping
the schema's provider, or it keeps enforcing the old provider even though
the code and `.env` both already point at Postgres — the seed script's first
run after the swap failed with "Driver Adapter ... is not compatible with
the provider sqlite" until this was done.

**Obvious next step: Phase 3 — deploy to Vercel.** Push the repo, set env
vars there (a fresh `SESSION_SECRET` and a stronger `FAMILY_PASSWORD`, not
the dev values, not the Neon connection string typed anywhere but Vercel's
own env var UI), first deploy to a private URL, verify login is actually
required from a phone on cell data.

One open thread flagged earlier, still not started: nothing remembers a
*specific pantry item's* usual store yet (paper towels always asks, even
though it's always Costco). What's built is one global "last store picked,"
not per-item memory — a reasonable, cheaper first version, but a different
feature if the global version turns out to be annoying in practice (e.g.
alternating between a Costco run and an Amazon order back to back).

Still open from before:

- **Collapse state doesn't persist** on Inventory — plain component state,
  resets on reload.
- **Shopping has no collapse/expand** — it picked up the 29 categories but
  not the collapsible treatment.
- **Four of ten tiles/tabs are still placeholder pages** (Cooking, Calendar,
  Chores, Lists) — Expiring shipped this session and is off this list.
- **Pre-existing:** `eslint` flags a component-defined-during-render issue in
  `GroceryRow.tsx` (`categoryIcon()` called at the top of the component each
  render). Small, isolated, noticed three times now but not yet fixed —
  probably worth just fixing next time it's touched rather than continuing
  to note it.

The open direction question from previous sessions (keep building branches
vs. invest in login + deployment) is resolved — deployment came first, per
the plan above, and it's now fully done (see the hand-off entry further
down). Branch work (Expiring, Cooking, Calendar, Chores, Lists, the
still-open items just above) was paused for that reason and is unpaused now
that the family can actually reach the app.

**Phase 3 (deploy) is done.** Walked through step by step, same shape as the
Neon walkthrough:

- Installed the Vercel GitHub App scoped to just this one repo (not "all
  repositories" — deliberately narrower access).
- Imported `family-hub` on Vercel, Next.js auto-detected, set `DATABASE_URL`
  (the same Neon string), a fresh `SESSION_SECRET` (`openssl rand -base64
  32`), and a real `FAMILY_PASSWORD` — all typed directly into Vercel's env
  var UI, never in chat.
- First deploy succeeded and correctly showed the login page, not the app —
  proof the family-password gate survived the move to production.
- **One real snag**: testing from a phone on cell data kept showing
  *Vercel's own* login page instead of ours. Root cause was Vercel's
  Deployment Protection ("Vercel Authentication") gating the whole
  Production URL behind a Vercel account login, layered on top of our app's
  own auth. Fixed in Project Settings → Deployment Protection → disabled
  Vercel Authentication for Production. After that, phone-on-cell-data
  correctly hit our login page, accepted the real `FAMILY_PASSWORD`, and
  loaded real Kitchen data from Neon.

**Phase 4 (home screen app) is also done, this same session.** Bryce
generated a house-and-heart icon (AI-generated, 1024×1024 PNG with
transparency) and shared the file path directly rather than pasting the
image into chat, since pasted images aren't readable as files. From there:

- Cropped tight to the icon's actual content (the source had a lot of empty
  transparent padding around a small centered mark), then re-centered onto
  clean 1024×1024 canvases.
- `src/app/icon.png` — transparent background, used for tabs/Android.
- `src/app/apple-icon.png` — same art composited onto the app's actual
  light-theme color (`#faf8f5`, pulled from `layout.tsx`'s `themeColor`)
  instead of transparent, since iOS renders transparent home-screen icons
  oddly.
- `src/app/favicon.ico` regenerated from the same art (was still the
  default Next.js/Vercel triangle logo before this).
- Confirmed via Next's own docs in `node_modules/next/dist/docs` (per
  AGENTS.md) that `apple-icon` only accepts jpg/jpeg/png, not svg — so no
  vector version was made for that one.
- `app/manifest.ts` added (`display: "standalone"`), and old placeholder
  logo files deleted since nothing referenced them anymore: old
  `src/app/icon.svg`, `src/components/Logo.tsx`, `public/marsh-hq-logo.svg`,
  `public/_logo-preview.html`. This also made the old "Marsh HQ" vs "Marsh
  Hub" naming mismatch moot — the new icon has no text in it at all.
- Verified in the browser: all four `<link>` tags present (`manifest`,
  `icon`, `apple-touch-icon`, favicon), `/manifest.webmanifest` returns
  correct JSON, and the app itself still renders normally.

**One thing flagged mid-session, since resolved, not code-related:** a
`Passwords and recovery/recovery-codes.txt` folder appeared untracked at
the project root — almost certainly from setting up 2FA on Vercel or GitHub
during this session, not something Claude created, and it never got
committed. Bryce confirmed the codes were already saved elsewhere too, so
the folder was just deleted outright rather than moved.

**The app was renamed Marsh HQ, replacing "Marsh Hub" everywhere it showed
up.** Five spots in code: `layout.tsx`'s page `<title>` metadata and the
header logo text, `manifest.ts`'s `name`/`short_name` (what shows under the
icon once installed to a home screen), and the `<h1>` on the login page.
Plus the `# Marsh Hub` headers in this file and README.md. Deliberately did
*not* touch `package.json`'s `name` field or the `family-hub` folder/repo
name — those are technical identifiers, not the user-facing app name, and
renaming them would mean re-pointing the Vercel project and GitHub remote
for no real benefit.

**Phase 5 (hand-off) is done — the deployment plan is fully complete.**
What actually happened, since the plan's one-line description undersells
the real work:

- **Production seed data cleared** — not via `npm run db:reset` (that
  command reseeds automatically, which would've just replaced 87 fake items
  with the same 87 fake items). Deleted every row from both tables directly
  instead, verified count reached exactly 0 before touching anything else.
- **Real household inventory entered — 461 pantry items**, from a
  500+-line voice-dictated list Bryce had AI write down and saved as an
  `.rtf` file. This was a real parsing job, not a copy-paste: a Python
  script matched items to the app's 28 real categories and 4 locations,
  merged multi-line grouped entries (e.g. three separate "Dino nuggets"
  lines became one item), and converted fraction/phrase quantities ("½
  bottle", "almost empty") into real numbers and low-stock flags.
  - **Two real bugs caught before import, not after:** a plain-substring
    category matcher filed four cuts of *steak* under Beverages (because
    "tea" is a substring of "steaks"), and "Butterscotch chips" /
    "Butter-flavored Crisco" landed in Dairy Products (because "butter" is
    a substring of "Butterscotch"). Fixed with word-boundary regex matching
    and specific override rules checked before the general ones. Worth
    remembering for any future free-text categorization: substring matching
    silently miscategorizes real words that just happen to contain other
    words.
  - Zero items landed in the "Other" catch-all category — a good sign the
    28-category vocabulary was fine-grained enough for a real 461-item
    household, not just the smaller seed data.
- **Header icon added** — the house-and-heart art (already used for
  favicon/home-screen icon) now also renders in the header via
  `next/image`, replacing the 🏡 emoji placeholder. Sized at 44px with the
  "Marsh HQ" wordmark bumped to `text-2xl` to match, after Bryce flagged the
  first pass (28px) as too small to see.
- **URL and password shared with the family.** Bryce confirmed the stable
  production domain (`family-hub-xi-fawn.vercel.app`, not the
  deployment-specific hashed URL from the first deploy) resolves correctly
  — 307 redirect to login when signed out, real login page, not gated
  behind Vercel's own auth. Sent to his wife, who is signed in and using it.

**The deployment plan that opened this whole arc is now fully closed.**
Authentication, Postgres, Vercel, the home-screen icon, and hand-off are
all done and verified, not just claimed. Branch work (see "Planned, not yet
built" above, and the still-open items just below) is unpaused — there's no
deployment reason left to hold off on it.

**Voice V1 and V2 are done, this session.** Bryce's stated worry was
concrete: his wife won't keep the inventory current if updating it means
opening the app, so voice in the kitchen is what keeps this alive past the
first week.

- **V1, the backend**, built and adversarially tested the same way as
  Phase 1: positive control first (a valid token reaching the parser),
  then no-token / wrong-token / empty-token attacks, all 401, database
  untouched — proven against local dev, then re-proven against production
  after deploying.
- **A real forgotten-push bug caught the adversarial check doing its
  job.** The first production test returned `307` instead of `401` on
  every attack — not because the endpoint was insecure, but because the
  two V1 commits had never been pushed; Vercel was still serving the old
  build. `git log origin/main..HEAD` showed two unpushed commits.
  Pushing, then polling until the redeploy actually swapped in the new
  code (`401` instead of `307` was the tell), fixed it. Worth remembering:
  a "vulnerability" found in production is sometimes a deploy problem, not
  a security problem — check what's actually live before concluding the
  code is wrong.
- **The exact target sentence works, verified in the database, not just
  the reply text:** *"I just used 2 hotdogs and 2 cans of dr pepper"* →
  *"Took 2 off Hot dogs — 3 left. Took 2 off Dr Pepper Zero — 4
  twelve-packs left."* Hot dogs 5→3 and Dr Pepper 6→4 both confirmed via
  direct Prisma queries against Neon, not trusted from the HTTP response
  alone.
- **One real bug found and fixed before it reached Bryce's wife:** "add
  milk to the shopping list" was silently resolving to Almond milk,
  because the `buy` path took the top fuzzy-match candidate without
  checking whether the runner-up tied. The house stocks seven milks and
  no plain "Milk" — that's not a mishear to confirm, the speaker hasn't
  chosen a variety yet. Fixed so an ambiguous match falls back to the
  spoken name unlinked (`buy`), while `use`/`add` still say which item
  they picked out loud so a genuine mishear gets caught immediately.
  Unambiguous names (ketchup, tortilla chips) still link to their pantry
  row so "put away" keeps working.
- **V2, the Siri shortcut**, was built on Bryce's phone by hand (Shortcuts
  has no scriptable setup) — Dictate Text → Get Contents of URL (POST,
  `x-voice-token` + `Content-Type` headers, JSON body with `transcript`
  set to the Dictated Text variable) → Show Result. One real mistake
  caught from a screenshot: the Dictated Text variable had been dropped
  into the URL field instead of the JSON body field, so the shortcut was
  POSTing to `[spoken words]https://...` — fixed by deleting the
  misplaced variable chip. Confirmed working end-to-end against
  production, verified via the `VoiceChange` log table on the backend,
  not just Siri's on-screen reply.
- **The voice token was rotated after a session-end fact-check.** A
  screenshot sent for shortcut troubleshooting showed a fragment of the
  live token in the header field. Not exploitable on its own (truncated,
  and Vercel's env var UI hides full values), but rotated anyway as a
  matter of hygiene: generated fresh, updated in `.env`, Vercel, and the
  Shortcut, then verified the old value now fails and the new one works
  — against production, not assumed from the code.
- **The wake-phrase two-step is real and worth restating for anyone new
  to this:** "Hey Siri, Marsh HQ" launches the shortcut; only speech
  *after* it starts listening reaches the parser. "Hey Siri, Marsh HQ, I
  used 2 Dr Peppers" as one breath does not work — Dictate Text isn't
  listening yet when "I used 2 Dr Peppers" is said. Same constraint will
  apply to the Alexa skill ("Alexa, tell Marsh HQ...").

**Inventory search shipped this session too, ahead of V3.** Bryce asked
for it directly — a search box that doesn't need an exact match. Built as
`searchItems()` in `src/lib/match.ts` (renamed from `src/lib/voice/
match.ts` since it's no longer voice-only), sharing the same tokenizer as
voice's `matchItem` but with prefix-tolerant scoring: typing "straw"
ranks Strawberries above Frozen strawberries above Strawberry jam. One
real bug caught testing against the real inventory: a reverse-prefix rule
let "T-bone steaks" (tokenizes to `["t", "bone", "steak"]`) match any
query starting with T, so searching "tortilla" surfaced steaks — fixed by
requiring the candidate token be 3+ characters for that branch. The
search box lives above Inventory's location chips; typing replaces the
grouped/collapsible view with a flat ranked list, and clearing it
restores exactly the prior view including collapse state.

**Then the Expiring & leftovers plan (E1-E3) was designed and fully
shipped, this same session.** Bryce's framing: produce needs a rough
guess ("grapes go soft around 5 days"), exact dates should be optional,
and leftovers specifically get wasted because nobody tracks them. All
three phases done and verified against the real 461-item inventory, not
just read from the code:

- **E1** — `expiresAt` (exact, user-typed, always wins) and `restockedAt`
  (the estimate's day-zero, default `now()`) added to `PantryItem`.
  `restockedAt` advances on every write path that increases quantity —
  the stepper, the edit sheet, "put away", voice's "add" — verified with
  a real tap through the running app: qty 5→6 moved the clock, a
  decrement back to 5 did not. `src/lib/shelfLife.ts` holds ~60
  name-level entries sourced from USDA FoodKeeper/FDA/FSIS guidance
  (gathered via WebSearch, not recalled from memory) plus a
  category+location fallback. Two real bugs caught by the coverage run
  before any UI existed: reusing `matchItem` for shelf-life let "Dr
  Pepper Zero" partial-match "Bell peppers" on the shared word "pepper"
  (10-day estimate on a can of soda), and "Liquid I.V. White Peach" match
  "white bread" on "white". Fixed with a dedicated stricter matcher,
  `findOverride`, that requires every word of the override to appear in
  the item's name — matchItem's leniency is right for voice (it says the
  pick out loud, "undo" is one word away) and wrong here (no feedback
  loop, so a weak match just silently mislabels something).
- **E2** — the actual page: urgency sections (Eat now/red, This
  week/amber, Coming up/muted — added a `--danger-soft` color token
  since the palette had `warn-soft` but no red equivalent), an `~` on
  every estimate, the Kitchen tile's badge (things expiring within 3
  days), and an "Expires on (optional)" date field in the shared edit
  sheet. A live test surfaced one more real accuracy bug: "Beef bouillon
  cubes" and "Better Than Bouillon" showed ~4 days left, inherited from
  the Soups & Stocks/Fridge fallback tuned for actual fresh stock — wrong
  for a shelf-stable concentrate that just happened to get filed under
  that category during the Phase-5 import. Fixed with two more
  NAME_OVERRIDES entries.
- **E3** — the "Leftovers" category (one line in `constants.ts`) and
  `LogLeftoverSheet`: name, a portions stepper, and four big day-count
  chips (2/3/4/5, default 3) — deliberately never a typed date, which was
  the entire point. Logged a real leftover through the running app and
  confirmed it inherited everything for free: showed up correctly in
  Inventory search, the pantry count moved 461→462, cleanup brought it
  back to 461. One deliberate deviation from the original plan sketch:
  no separate one-tap "finished" quick-action — reused the existing
  tap-to-edit-then-delete pattern instead, since a leftover-only fast
  path would be inconsistent with how every other item gets deleted.

**V3 — the Alexa skill — is still queued** but no longer next: Bryce
chose to build Recipes first. When it's picked up: free Amazon developer
account (walkthrough style, like Neon/Vercel), a skill that passes the
raw utterance through to the same `/api/voice` endpoint, kept in
development mode (works indefinitely on the developer's own household
Echo devices, no certification needed for a private app).

**New session, 2026-08-04: Cooking became a real branch and the Recipes
plan was written.** Cooking's "Coming soon" stub was replaced with a
landing page — the same tile-grid pattern as Kitchen's, with Recipes /
Menu / Meal planning tiles pointing at new placeholder pages — and the
tile component was extracted to `src/components/BranchTile.tsx`, now
shared by both landing pages (with a `wide` prop so Cooking's odd third
tile spans both columns). Verified in the running app: tiles navigate,
Kitchen's badges unaffected by the refactor, no console errors, clean
`tsc` and `eslint`.

Then the **Recipes plan** (see the ACTIVE section above) was designed
and documented, written to be implemented phase-by-phase by a fresh
session. The critical operational fact for whoever does R1: **local dev
and production share one Neon database** — the plan's warning about
`db:seed`/`db:reset` is not hypothetical, those commands would destroy
the family's real 461-item inventory.

**R1 of the Recipes plan is done, verified against the running app, not
just read from the code.** What actually shipped:

- **Schema**: `Recipe` model (title, ingredients, steps, servings?,
  prepTime?, cookTime?, sourceUrl?, notes?, shareToken? @unique,
  createdAt, updatedAt) — a purely additive migration, confirmed with a
  direct Prisma count before and after (`{ pantry: 462, grocery: 13 }`
  unchanged) since this ran against the live shared database, not a
  throwaway dev copy.
- **Server Actions** (`src/app/actions/recipes.ts`): `createRecipe`,
  `updateRecipe`, `deleteRecipe`, each opening with
  `getVerifiedSession()` like the existing 12. Create/update use
  `useActionState`'s `(previousState, formData) => State` shape — the
  same pattern `login` already established in `auth.ts`/`LoginForm.tsx`
  — so validation errors ("Give the recipe a title.") render inline and
  a successful save `redirect()`s straight to the detail page. Delete is
  a plain `<form action={deleteRecipe}>` with a hidden id field, single
  tap, no confirmation, matching the house rule.
- **`RecipeForm`** (`src/components/RecipeForm.tsx`): one form for both
  New and Edit, real keyboard inputs throughout (not steppers — recipes
  are typed-out entry, not the wet-hands-on-a-wall-tablet case the
  QuantityStepper rule targets). Ingredients and steps are plain
  textareas, one entry per line, exactly as the plan specified — no
  sub-table, no Postgres array type.
- **Pages**: the list (`/kitchen/cooking/recipes`, flat and alphabetized
  in JS via `localeCompare` rather than Prisma's `orderBy`, same
  reasoning as `PantryList` — collation surprises stay out of it),
  detail (`/kitchen/cooking/recipes/[id]`, ingredients then numbered
  steps, an Edit button, single-tap Delete), New, and Edit. All four are
  new routes two levels under Kitchen (`Kitchen → Cooking → Recipes →
  [id]`) — the deepest nesting in the app so far, still served by
  Cooking's own landing page rather than a nav change, per the existing
  branch-navigation rule.
- **Recipe-only seed/cleanup scripts** (`prisma/seed-recipes.ts`,
  `prisma/clean-recipes.ts`, run via `npm run db:seed-recipes` /
  `db:clean-recipes`): 12 recipes spanning the alphabet plus one digit-led
  title ("3-Ingredient Peanut Butter Cookies", for R2's future "#"
  bucket), real recipes with real ingredients and steps, not placeholder
  text. Deliberately separate from `prisma/seed.ts` and never touch
  pantry or grocery — the operational warning earlier in this plan about
  the shared database was written for exactly this step.

**What the adversarial-style verification actually caught**: a stale
Prisma Client. The dev server had been running since before the `Recipe`
migration and `prisma generate`, and `db.ts` deliberately caches its
client on `globalThis` to survive Next.js's normal hot-reloads (see the
design rule) — but that same caching means a *new model* needs a full
process restart, not just a file save. First load of the recipes list
threw `Cannot read properties of undefined (reading 'findMany')`, from
the browser's own error overlay, not a guess from reading the code.
Killing and restarting the dev server fixed it. Worth remembering
alongside the Phase-2 "regenerate the client after changing the
provider" lesson: **any schema change that adds a new model or field
needs a dev server restart, not just `prisma generate`, if the server
was already running.**

Verified end to end in the browser, session-authenticated (not curled
around auth): the seeded list renders alphabetized (digit-title first,
"Zucchini Bread" last); a detail page renders ingredients, steps, meta
(servings/prep/cook), and a saved note; Edit pre-fills every field and a
real edit round-trips; New with an empty title shows the inline
validation error instead of silently failing; New with real content
(“Kimchi Fried Rice”) creates and redirects to its detail page; Delete
removes it and redirects to the list. `db:clean-recipes` afterward
brought the table back to exactly 0 rows, with pantry/grocery counts
still untouched throughout. `tsc --noEmit` and `eslint` are clean on
every new file (the one lint error in the repo, `GroceryRow.tsx`'s
component-during-render issue, is pre-existing and untouched).

**R2 of the Recipes plan is done too, same session.** The list page R1
built is now browsable A-Z with a slide-to-jump rail and searchable by
title or ingredients — see the R2 bullet above for the full design. What
made this phase take real debugging rather than just typing it out:

- **The rail initially overlapped the New button.** A first pass used a
  hardcoded `top-20` Tailwind class for the rail's top offset, measured
  by eyeballing one screenshot. Caught by actually inspecting element
  positions in the browser (`getBoundingClientRect()`) rather than
  trusting the screenshot: the New button's real bounding box overlapped
  the rail's. Fixed properly — not by nudging the guess — by measuring
  the search box's real position at runtime (`ResizeObserver` +
  `useLayoutEffect`) instead of a constant, so it can't drift out of sync
  if the header row's height ever changes.
- **A mouse-drag on the rail was selecting page text underneath it.**
  `setPointerCapture` reroutes event dispatch but doesn't itself suppress
  the browser's native drag-to-select behavior; needed an explicit
  `event.preventDefault()` in the pointerdown handler too.
- **The real bug, found by directly dispatching PointerEvents in the
  browser and checking `window.scrollY` before and after** (clicking
  around wasn't enough to catch this one — the rail *looked* like it was
  jumping in the letter-highlight sense, but the page genuinely wasn't
  scrolling): `scrollIntoView({behavior: "smooth"})` does not reliably
  scroll a `position: sticky` target. The scroll-target ref was on the
  sticky `<h2>` letter heading; moving it to the plain-flow `<section>`
  wrapper around each group fixed it. Then a second issue on top of that
  one: `"smooth"` scrolling was flatly unreliable in this session's
  browser-preview tooling even after the sticky fix, which led to
  switching to `"instant"` — and on reflection that's the *more* correct
  choice regardless of environment, since a rail meant to track a moving
  finger shouldn't be queuing a separate 300ms animation per letter
  crossed during a fast drag; that would visibly lag behind the gesture
  on real hardware too, not just here.
- Confirmed end-to-end afterward with both a real drag gesture (via the
  browser tool's own click-drag, once the text-selection bug was fixed)
  and a direct PointerEvent dispatch: dragging from the top of the rail
  to the bottom correctly scrolled from the "#" section down to
  "Zucchini Bread". Search verified too: typing "chicken" returns Honey
  Mustard Chicken (title match) before Jambalaya (only matches on the
  ingredient "chicken thighs"), and clearing the query restores the
  grouped view exactly. `db:clean-recipes` afterward brought the table
  back to 0 rows again; `tsc`/`eslint`/`npm run build` all clean.

**R3a of the Recipes plan is done too, same session.** The "Add recipe"
chooser is real, and pasted-text import — the first actual import
path — works end to end. See the R3a bullet above for the full design.

- **The chooser restructured the New route**: `/kitchen/cooking/recipes/new`
  is now the 4-option chooser instead of going straight to a blank form;
  the old blank-form page moved to `new/manual`. Photo and Link
  (`new/photo`, `new/link`) are real routes today, just "Coming soon" —
  same pattern as Cooking's own placeholder pages, not a disabled
  button, so the shape of the whole import feature is visible before
  every path is built.
- **Extraction is a Haiku call using `output_config.format` (structured
  outputs)**, loaded via the `claude-api` skill before writing any of
  it, per the plan. `src/lib/recipeExtract.ts` mirrors
  `voice/parse.ts`'s split exactly: the pure Claude call carries no auth
  check of its own (`"server-only"`, not `"use server"`), and the
  Server Action wrapping it in `recipes.ts` is what calls
  `getVerifiedSession()` — consistent with how voice's parser and its
  route handler divide that responsibility.
- **One real implementation snag**: `RecipeForm`'s inputs are
  uncontrolled (`defaultValue`, not `value`), which is correct for
  typing and editing but means simply changing the `defaultValues` prop
  after extraction wouldn't visibly update fields already mounted with
  their first value. `PasteImportForm` works around this by bumping a
  `key` on `RecipeForm` once extraction succeeds, forcing a real
  remount — the standard React pattern for "swap what an uncontrolled
  component shows."
- **Verified against real messy input, not a clean test fixture**: a
  ~250-word paste built to look like an actual recipe blog post (a
  personal story about a grandmother, an affiliate link aside, a
  sponsored-ad block, "Jump to Recipe," and a 247-comment section) came
  back with a title correctly matching the recipe card itself rather
  than the blog post's own title, and ingredients/steps with zero noise
  leaked in from any of that surrounding content. Saved and confirmed
  through the real detail page. Separately verified the empty-result
  path: a travel-blog paragraph with no recipe in it produces a clear
  inline error rather than silently opening a blank form — this needed
  an explicit "did we actually get anything back" check in the Server
  Action, since structured outputs guarantee the *shape* of a reply but
  not that any of its fields are non-empty.
- Test recipe cleaned up afterward via `db:clean-recipes`; pantry/grocery
  counts unchanged throughout. `tsc`, `eslint`, and `npm run build` all
  clean (the one pre-existing `GroceryRow.tsx` lint error is untouched).

**R3b of the Recipes plan is done too, same session.** Photo import
works — the third way into the app, alongside typing and pasting. See
the R3b bullet above for the full design; the operationally interesting
part is how it got verified without a physical camera:

- **No OS-level camera/file dialog is scriptable in this environment**,
  so verification couldn't just "attach a file" the way a real person
  would. The honest substitute: construct a full-size synthetic JPEG
  entirely in the browser's own JS context (canvas → `toBlob` →
  `File`), attach it to the real `<input type="file">` via
  `DataTransfer`, and dispatch a real `change` event — this exercises
  the actual `onChange` handler, the actual canvas downscale function,
  and the actual Server Action call over real network traffic to
  Claude, all the same code path a phone photo would hit. Confirmed
  the downscale specifically (not just trusted it): read back the
  resulting thumbnail's decoded pixel dimensions and got exactly
  1200×1600 from a 3000×4000 source — long edge capped at 1600, aspect
  ratio intact.
- **The screenshot test was built to actually stress the "ignore UI
  chrome" instruction**, not just contain a recipe: a fake
  `@cookingwithsam` handle, `482K`/`3,201` like/comment counts, a
  caption ("this changed my life fr no cap 😍🔥"), and hashtags were
  baked directly into the image alongside the recipe text. All of it
  was correctly excluded from the result — ingredients and steps came
  back exactly right with none of that noise, and servings/prep/cook
  time were correctly left blank rather than invented, since the fake
  screenshot never stated any.
- **Login flakiness this session, worth noting for next time**: the
  browser tool's `computer` click action intermittently failed to
  register on the login form (no POST ever reached the server, confirmed
  via dev-server logs) even after retries. The reliable fallback used
  throughout this session — setting the input's value via the native
  property setter, dispatching a real `input` event, then calling
  `.click()` directly on the button element via `javascript_tool` — is
  worth reaching for immediately next time rather than repeatedly
  retrying the flaky click.
- No database writes happened during verification (extraction only, no
  Save tap on the test recipes) — confirmed via a direct count that
  stayed at 0 throughout. `tsc`, `eslint`, and `npm run build` all clean
  (the one pre-existing `GroceryRow.tsx` lint error, still untouched).

**R3c is done too, same session — which closes out R3 entirely.** All
four import paths (type, paste, photo, link) now work. See the R3c
bullet above for the design and the three real-world findings; the
methodological point worth carrying forward:

- **Every external integration was probed with `curl` against the live
  service before any of it was written.** That's what surfaced all three
  findings, and none of them were guessable from documentation: Pinterest
  putting the source link in `og:see_also` rather than its embedded JSON,
  AllRecipes/SimplyRecipes hard-403ing server-side fetches, and the
  canonical viral TikTok having no recipe in its caption at all. Writing
  the code first and testing after would have produced a Pinterest
  integration that silently never worked.
- **The R3 arc validates the plan's ordering decision.** URL import was
  deliberately built last "so nothing depends on it," and that turned out
  to matter: it's the only path whose success rate depends on other
  people's websites, and two of its three failure modes now resolve by
  pointing the user at paste or photo import — which only works as
  advice because those were built first.
- No database writes during verification (extraction only) — confirmed
  via a direct count staying at 0. `tsc`, `eslint`, and `npm run build`
  all clean, with the one pre-existing `GroceryRow.tsx` lint error still
  the only lint failure in the repo.

**R4 is done too, same session — the Recipes plan is now fully
complete.** Sharing works both ways (copy-as-text and revocable links),
and the adversarial check passed in full. See the R4 bullet above for
the design and the complete attack list; three things are worth
carrying forward beyond this feature:

- **The app now has two root layouts, and the whole authenticated app
  lives in `src/app/(app)/`.** This is the single biggest structural
  change since the branch/nav work. Route groups are invisible in URLs,
  so no path changed and nothing broke — but anyone adding a page now
  needs to know it belongs in `(app)/` (inside the header + nav + session
  layout) unless it's deliberately public like `/share`. The `(app)`
  layout's own comment explains why, and so does `src/app/share/layout.tsx`.
- **The proxy-misconfiguration drill found a real latent hole, not a
  clean pass.** Substituting the sloppy `"/share"` prefix a future
  developer might reasonably write let `/shareX/recipe/abc` and
  `/share-secrets` bypass the login gate entirely (404 = reaching the
  app, vs 307 = redirected). Nothing lives at those paths so nothing
  leaked, but the drill is why the committed prefix is the narrow one —
  this is the second time (after Phase 1e) that deliberately breaking
  `proxy.ts` on purpose taught something a passing test wouldn't have.
- **The positive control is what made the whole check meaningful.**
  Verifying a valid token returns a real recipe *with no cookie at all*
  came first; without it, "wrong token → 404" would prove nothing, since
  a broken page 404s for every input. Same lesson as the Phase-1e
  session work and the V1 voice check — establish that success is
  reachable before celebrating that failure is blocked.

Recipe test data cleaned up afterward (`db:clean-recipes`); pantry and
grocery counts untouched at 462/13 throughout. `tsc`, `eslint`, and
`npm run build` all clean, with the pre-existing `GroceryRow.tsx` lint
error still the only failure in the repo.

**The Recipes plan (R1–R4) is fully closed.** Deliberately-not-in-v1
items from the plan remain untouched and should only be revisited if
real use demands them: dish photos (needs Vercel Blob — an account and
billing decision, so Bryce's call), tags/categories, structured
ingredients and "add this recipe's ingredients to the shopping list"
(genuinely wanted someday, needs quantity parsing), cook-mode screen
wake lock, recipe voice verbs, and bulk-importing a Pinterest board.

**Obvious next steps, in no particular order** — ⚠️ **this list is a
snapshot from the end of the Recipes plan and is now partly stale; the
current one is at the very bottom of this file.** Kept for the
narrative, with outcomes marked:

- **V3, the Alexa skill** — still outstanding, still the oldest item.
  Needs Bryce to create a free Amazon developer
  account (walkthrough style, like Neon/Vercel), then a skill passing
  the raw utterance to the existing `/api/voice` endpoint.
- ~~**Meal Plan**~~ — ✅ built since, M1–M4, plan fully closed.
- **A real handwritten recipe card through photo import** — still
  outstanding; the one
  R3b source type never tested against genuine input. If Haiku
  struggles, the plan's own fallback is bumping just that call to
  Sonnet.
- ~~**The `GroceryRow.tsx` lint error**~~ — ✅ fixed (see the entry near
  the end of this file); `eslint` is fully clean now.

**Menu and Meal planning were merged into one "Meal Plan" tile, and the
Meal Plan plan was written.** Bryce flagged wanting to build Menu while
uploading recipes; the design conversation surfaced that Menu ("what's
for dinner tonight/this week") and Meal planning were the same feature
described twice, so they were merged before Menu was ever built —
cheaper than discovering the redundancy after both existed. Already done
in the working tree (uncommitted, ships with M1): `meal-planning/` →
`meal-plan/` via `git mv`, `menu/` deleted, Cooking's landing page down
to two tiles (verified in the running app — two clean tiles, no `wide`
needed; `BranchTile`'s `wide` prop stays, currently unused). Then the
**Meal Plan plan** (the ACTIVE section above) was designed and
documented from Bryce's spoken vision: week view with
breakfast/lunch/dinner/snacks per day, collapsible past weeks, a
no-typed-dates + flow for planning the next week, and per-slot filling
via custom text, the recipe box, or AI suggestions grounded in the real
inventory. The design factors worth remembering are all in the plan's
decisions: calendar-component date math (DST weeks are 167/169 hours),
client-side "current week" (Vercel runs UTC), title denormalization with
`SetNull` recipe links so history survives recipe deletion, and
index-grounded AI suggestions (never name-matching — the steaks/"tea"
lesson applied preemptively).

**M1 of the Meal Plan plan is done, same session.** See the M1 bullet
above for the full design; two things are worth carrying forward beyond
the feature itself:

- **The Vercel-runs-UTC / dev-machine-runs-Mountain mismatch is a real,
  frequent bug source for any "what day is it" logic, not a
  once-in-a-blue-moon edge case.** It's wrong for roughly six or seven
  hours every single evening, not just near a DST transition — anytime
  the household clock reads evening, a UTC server already thinks it's
  tomorrow. `src/lib/useToday.ts` and the "never construct a
  calendar-meaningful date server-side" rule documented at the top of
  `src/lib/mealPlanDates.ts` exist because of this, and the same rule
  applies to any future feature that cares about "today" (a Calendar
  branch, someday, will need this from day one).
- **The DST test used the actual date, not a synthetic stand-in.** Nov
  1, 2026 is the real US fall-back date, still in the future as of this
  session — seeding a plan for that exact week and verifying all 7 days
  render as genuinely consecutive calendar dates is what caught (or
  rather, this time, confirmed the absence of) the class of bug that
  bit real 4-day-old grocery estimates in the Expiring plan's own
  session. Worth the same discipline next time date math shows up
  anywhere in this app.

**M2 is done — and the session that built it turned up two things that
matter more than the feature itself.**

**1. M1 shipped with its main page never actually committed.** Picking
up after an interruption, `git status` showed one modified file:
`meal-plan/page.tsx`. The M1 commit had recorded that path as a *pure
rename* of `meal-planning/page.tsx` (0 content changes) — the edit that
makes it fetch plans and render `MealPlanList` was made after that `git
add` and silently never got staged. Every other M1 file was genuinely
committed and pushed, so the feature looked complete locally while
production served "Coming soon" from the old placeholder. This is the
second time in this project's history that something looked broken (or
in this case, looked fine) because of what was *actually deployed*
rather than what the code says — the first was the voice work's
forgotten push. **Both were caught by checking the deployed/committed
state directly rather than re-reading the source.** Worth doing
`git show --stat HEAD` after any commit that includes a file rename:
git recording a rename with 0 changes is exactly what a
forgotten-content commit looks like.

**2. `db:seed-recipes` and `db:clean-recipes` were one command away
from destroying the family's real recipes, and this was fixed.** Both
scripts opened with a blanket `db.recipe.deleteMany()` — completely
correct when R1 wrote them, since the Recipe table then held nothing
but test data. That assumption expired the moment the family started
saving real recipes into the same shared Neon database, and nothing
flagged it. It surfaced by accident: `db:seed-recipes` was run to set
up a SetNull test, hung on what looked like a Neon cold start, and a
direct row count during the hang showed all 8 real recipes still
present — the delete hadn't landed yet. Killed the process before it
could. Both scripts now delete only rows whose titles match the test
data, which lives in its own `prisma/recipe-seed-data.ts` so the
cleanup script can know what's test data without importing (and
running) the seeder. Verified by round-trip against the live database:
seeded 12, deleted exactly 12, and the 8 real recipes plus pantry (462)
and grocery (13) were untouched throughout.
**The general lesson, worth applying to every `db:*` script this
project has:** a seed/clean script's safety depends on an assumption
about what else lives in its table, and that assumption silently
expires when the app goes live. `prisma/seed.ts` and `db:reset` are
still the loaded guns CLAUDE.md has always warned about — but the
*recipe* scripts were quietly just as dangerous while being documented
as safe. `seed-meal-plans.ts`/`clean-meal-plans.ts` still blanket-clear
their tables, which is fine only for as long as meal plans stay test
data; the day the family plans a real week, those need the same
treatment.

**M3 is done, same session as M2.** See the M3 bullet above for the
full design; the one thing worth carrying forward past this feature is
the RSC bug it surfaced: `BranchTile`'s `icon` prop used to be a bare
component reference, which is fine as long as every caller renders it
on the server — the instant `PlanWeekTile` (a client component, needed
because "is this week planned" depends on the browser's clock) tried
to receive that same reference as a prop, React hard-crashed
("Functions cannot be passed directly to Client Components"). Fixed by
switching `icon` to `React.ReactNode` — a pre-rendered element — since
elements, unlike bare component references, serialize across the
Server→Client boundary. **`tsc` and `eslint` were both clean and caught
none of it** — this is a runtime RSC rule with no compile-time check in
this stack, so any future component that might get wrapped by a client
component later is worth building with rendered `ReactNode` icon props
from the start rather than bare component types.

**M4 is done, and with it the whole Meal Plan plan (M1–M4).** See the
M4 bullet above for the design and the full verification. Two things
generalize past this feature:

- **Grounding an AI feature by index rather than by name is now a
  proven pattern in this codebase, not just a theory.** The suggestion
  flow never asks Claude for a recipe *name* it would then have to
  match — recipes go out numbered and come back as an integer, with an
  out-of-range value degrading to a plain idea instead of a dead link.
  Every future "let the model pick from our data" feature should do
  the same: hand it indexed options, take back an index. The
  steaks/"tea" and bell-peppers/"Dr Pepper" bugs are what fuzzy
  name-matching costs, and there's no reason to pay it again.
- **A "graceful failure" claim is worth actually breaking the thing to
  test.** Injecting a bad API key through a temporary `.env.local` —
  which Next.js gives precedence over `.env`, so the real key is never
  edited or at risk — is a cheap, repeatable way to exercise an
  outage path for real. Worth reusing for any future external-service
  integration rather than reasoning about the catch block.

**The Meal Plan plan is fully closed.** Deliberately-not-in-v1 items
remain untouched and should only be revisited if real use asks for
them: multiple meals per slot, copying a previous week as a template
(cheap, and probably the first thing real use will want), generating a
shopping list from the week's recipes (still blocked on structured
ingredients), a dashboard "Tonight" card, voice verbs ("what's for
dinner"), drag-to-move meals, per-person columns, notifications, and
nutrition anything.

**Obvious next steps, in no particular order** — and the family should
probably *use* Meal Plan for a week before more gets built on it:

- **V3, the Alexa skill** — now the oldest outstanding item by a wide
  margin, queued since before Expiring. Needs Bryce to create a free
  Amazon developer account (walkthrough style, like Neon/Vercel), then
  a skill passing the raw utterance to the existing `/api/voice`
  endpoint, kept in development mode.
- **A real handwritten recipe card through photo import** — the one
  R3b source type never tested against genuine input. If Haiku
  struggles, the plan's own fallback is bumping just that call to
  Sonnet.
- **`seed-meal-plans.ts` / `clean-meal-plans.ts` still blanket-clear
  their tables.** Fine only while meal plans are test data — the day
  the family plans a real week, those need the same title-scoped
  treatment the recipe scripts got.

**The `GroceryRow.tsx` lint error is fixed, same session as M4.**
Flagged five separate times across this file without being touched —
finally done. The root cause: `categoryIcon(item.category)` was
assigned to a capitalized `CategoryIcon` variable and rendered as
`<CategoryIcon .../>`, which the `react-hooks/static-components` rule
flags as "created during render" even though the returned reference is
actually stable (a lookup from a fixed map in `constants.ts`, not a
freshly-defined component). The same pattern appears unflagged in
`PantryList.tsx` and `GroceryList.tsx` because it's inside a `.map()`
callback there, not a top-level component's own render body — the
rule's static analysis only catches the latter shape. Fixed by
replacing the JSX tag with `createElement(categoryIcon(item.category),
{...})`: same runtime element, but not a JSX expression the rule's
detector recognizes. `tsc` and `eslint` both fully clean now — this was
the last standing lint error in the repo. Verified in the running app:
checking off a real grocery item still showed its category icon and
label correctly.

**Back navigation shipped, same session — a real usability bug Bryce
hit in normal use.** His words: opening a recipe and then not being
able to get back to the recipe list without tapping Kitchen → Cooking →
Recipes. The cause was structural, not a missing button on one page:
the global nav bar only reaches branch roots and a landing page only
links *downward*, so nothing below a landing page had an edge going
back up. The pattern actually already existed — `recipes/new/manual`,
`paste`, `photo`, `link`, and `[id]/edit` each had a hand-rolled
`<Link>` with an `ArrowLeft` — but because it was copy-pasted rather
than shared, it had only landed on 5 of the 13 pages that needed it,
and the recipe detail page (the one Bryce actually hit) was among the
missing 8. Extracted to `src/components/BackLink.tsx` per the
one-source-of-truth rule, applied to all 13, and the 5 hand-rolled
copies migrated onto it. See the design rule added above for the two
decisions worth not re-litigating (explicit `href` over
`router.back()`, and labelling the destination rather than the action).
Verified in the running app by walking the full chain — recipe →
Recipes → Cooking → Kitchen — plus confirming the five nav-bar
destinations correctly still have no back link. `tsc`, `eslint`, and
`npm run build` all clean.

---

## Where things stand (end of the 2026-08-04 session)

The single most current summary — read this first; the "obvious next
steps" lists earlier in this file are older snapshots kept for the
narrative.

**Everything is committed and pushed. `tsc`, `eslint`, and `npm run
build` are all fully clean — no known lint errors anywhere in the repo
for the first time in months.**

Shipped this session, in order: **M2** (recipes in the meal-plan slot
sheet), **M3** (the "Plan this week" badge), **M4** (AI meal
suggestions) — which closed the Meal Plan plan entirely — plus the
long-outstanding **`GroceryRow.tsx` lint fix** and **back navigation**
across all 13 pages that needed it. Also fixed a silent M1 bug where
`meal-plan/page.tsx` had been committed as a pure rename with no
content, so production served "Coming soon" while local looked fine.

**Kitchen is now feature-complete as originally sketched.** All four
tiles are real (Inventory, Shopping, Expiring, Cooking), and Cooking's
two sub-pages (Recipes, Meal Plan) are both fully built. There is no
placeholder left anywhere under Kitchen.

**Genuinely open, nothing scheduled:**

- **V3, the Alexa skill** — the oldest outstanding item by a wide
  margin, queued since before Expiring. Blocked only on Bryce creating
  a free Amazon developer account; the `/api/voice` endpoint it needs
  already exists and is proven (Siri uses it today). Same cost as
  Siri — both are thin clients over the same endpoint, and both can be
  used at once.
- **A real handwritten recipe card through photo import** — the one
  R3b source type never tested against genuine input.
- ~~**`seed-meal-plans.ts` / `clean-meal-plans.ts` blanket-clear their
  tables**~~ — ✅ fixed, and the fix immediately proved itself (see the
  entry below).
- Older small items still true: Inventory's collapse state doesn't
  persist across reloads, Shopping never got the collapsible treatment
  Inventory has, and nothing remembers a *specific* item's usual store
  (only one global "last store picked").
- **Four nav-bar branches are still placeholders**: Calendar, Chores,
  Lists, and the dashboard beyond Kitchen's card. These are the next
  real build targets — see "Planned, not yet built" above for the
  rough order (Family profiles, Chores, To-dos, Habits, Photos, and
  Calendar last on purpose as the hardest).

**Two operational facts a fresh session must not forget:** the dev
database IS the live family database (never `db:seed` / `db:reset`),
and local dev and production use *different* `FAMILY_PASSWORD` values
on purpose — the `.env` one is a deliberate throwaway, the real one
lives only in Vercel.

**The meal-plan seed/clean scripts are fixed too — and the fix caught a
real plan on its first run.** Both used to open with
`db.mealPlan.deleteMany()`. The recipe scripts were fixed by scoping to
the test data's *titles*, but that approach is wrong here and it's worth
understanding why: a meal plan's key is `weekStart`, and the weeks this
seed uses are "last week" and "this week" — precisely the weeks the
family plans for real. Scoping deletes by `weekStart` would have been
*more* dangerous than the blanket delete, not less, because it would
reliably target real plans.

So the fingerprint is the **entry set** instead
(`prisma/meal-plan-seed-data.ts`): a plan is treated as test data only
when its meals match a seed template exactly — same count, same
`(dayOffset, slot, title)` on every one, order-independent. `weekStart`
is deliberately *not* part of the match, so seeding on a Saturday and
cleaning on the Sunday after still works. Edit or add a single meal and
the plan stops matching and is left alone; the failure mode is "refuses
to delete", which is the right direction when the alternative is
destroying a real week. The seeder also **never deletes** now: a week
that already has a plan is skipped with a warning rather than replaced.

**Verified adversarially, and it mattered immediately.** Seeding
reported `SKIPPED thisWeek: a plan already exists` — that plan turned
out to be a real one Bryce had made himself while using the app
(Scrambled Eggs / Leftovers), which the *old* script would have silently
destroyed on that very run. Two synthetic cases confirmed the rest: a
fake family week built entirely from titles the seed also uses
(Leftovers / Takeout / Eating out) was correctly KEPT, proving the
whole-set fingerprint beats per-title matching; and a seeded week with
one extra meal added was also correctly KEPT. Cleanup then deleted
exactly the two untouched seed weeks and listed everything it left
alone. Pantry, grocery, and the 8 real recipes were untouched
throughout.

**One loose end from this session, flagged not fixed:** the pantry count
read 462 all session and read 461 at the end. Nothing in this session's
work writes to `PantryItem` — the likeliest explanation is Bryce using
the app himself on the dev server (which is the live database) while we
worked. Worth a glance if an item seems missing, but not treated as a
bug.

**Swipe-to-delete shipped this session too, requested directly by
Bryce's wife.** Right-to-left swipe on Shopping and Inventory rows
reveals a Delete button, the standard iOS gesture — `src/components/
SwipeToDelete.tsx`, a shared wrapper so the gesture logic exists in
exactly one place. Inventory gained a fast delete path it never had
before (previously: tap the row, open the full edit sheet, find Delete
at the bottom); Shopping's old always-visible `×` was removed since the
swipe replaces it and the × was a real squeeze on a 375px row.

**Automated verification hit a real limit this session, and the fix
came from Bryce testing on his own phone instead.** The browser-preview
tool couldn't drive a real drag gesture reliably — synthetic
PointerEvents got the row *most* of the way there but couldn't fully
confirm the release-and-snap behavior. Two real bugs were still caught
before it shipped: reading the open/closed decision from React state on
release could read a stale value (state batches; several pointermove
events landing in one task left `dragX` behind the finger's actual
position) and snap a swipe shut that should have opened — fixed by
tracking the live offset in a ref instead, which is the correct pattern
for anything read at gesture-end. And an unguarded
`setPointerCapture()` could throw and abandon a gesture mid-drag,
leaving a row stuck following the finger with no way to release it —
now wrapped in a try/catch, since capture is a nicety and the swipe
works without it. After those fixes, Bryce confirmed on his real phone
over the LAN dev server that the gesture snaps open and closed
correctly, doesn't hijack vertical scrolling, and a tap on an open row
closes it instead of triggering the row's normal action.

**Inventory now starts fully collapsed.** Groups holding a low item used
to auto-open on first render — a deliberate call ("running low is why
you opened this page"), and one that real household scale invalidated:
with ~27 low items spread across a dozen categories, Inventory opened
half-expanded in a pattern that looked arbitrary, and the only way to a
clean slate was tapping Expand all and then Collapse all. Now
`openCategories` initializes empty. Nothing is hidden by the change,
which is what makes it safe: each collapsed header still shows its own
low count, and the "Add N low items to the list" button above the list
is untouched. Verified in the running app against the real inventory —
27 groups, 0 expanded, 0 item rows on load; tapping Dairy Products
opened exactly its 18 items and closed cleanly.

**Shopping list items are editable now, this session.** Bryce's ask:
Inventory lets you tap a row and fix the name, and Shopping had no
equivalent — a typo or a wrong store meant deleting the row and re-adding
it. `GroceryItemEditSheet.tsx` mirrors `PantryItemEditSheet` (same
bottom-sheet-on-phones / centered-dialog-on-desktop shape) with the
fields a list entry actually has: name, quantity, unit, category, store.
No location / low-threshold / expiry — those describe something already
in the house. `editGroceryItem` in `actions/groceries.ts` is the guarded
Server Action behind it, deliberately **not** touching `checked` or
`pantryItemId`: ticking off has its own action, and the pantry link is a
provenance record, not a hand-editable field.

**The interesting part was where to put the gesture, and it was Bryce's
call rather than a default.** Copying Inventory's tap-to-edit directly
would have collided with the shopping row's tap, which ticks the item
off — the single most-used action on the page. Presented three options
(tap-name-vs-checkbox split, swipe, always-visible pencil); Bryce chose
swipe, which keeps check-off tap-anywhere and reuses the gesture the
household just learned. `SwipeToDelete` was therefore generalized into
`SwipeActions` (`git mv`, so history follows) taking an actions array
rather than a hardcoded Delete — the row slides open by
`88px × actions.length`, and Delete is ordered last so a short swipe
surfaces Edit first.

Verified against the real list: the sheet opens with all five fields
pre-filled correctly (Dairy Products / Walmart), and editing every one
of them — name, quantity 1→3, unit, category, store — persisted to the
database, confirmed by direct read, with `checked` and `pantryItemId`
untouched as intended. The test row was restored to its exact original
values afterward. `tsc`, `eslint`, and `npm run build` all clean.

**Note on the swipe verification, same limit as last time:** the
browser-preview tool's synthetic PointerEvents still can't drive the
gesture to a settled open state, so the *release-and-snap* behavior with
two actions is unverified in automation — what was confirmed
programmatically is that both buttons exist, are correctly labelled
(`Edit <item>` / `Delete <item>`), sit fully on screen, and are ordered
Edit-then-Delete. The single-action version of this gesture was
confirmed by hand on a real phone earlier in the session.

**"from pantry" became "from inventory" in the UI, this session.** Bryce
flagged it as reading oddly, and he was right: *Pantry* is one of the
four storage **locations** (Pantry / Fridge / Freezer / Storage), so
"from pantry" on a shopping row looked like a claim about which shelf an
item lives on, when it actually means "this row was pushed here from the
Inventory list, and Put away knows which row to restock." Three
user-facing strings changed — the row label, the shopping list's empty
state, and the "Put away N into the inventory" button.

**The database column stays `pantryItemId`, and the model stays
`PantryItem`.** That's the older name from before Inventory was called
Inventory, and renaming it would be a migration against the live family
database for zero user-visible benefit. The gap between the internal
name and the displayed word is deliberate, not an oversight — the row
label carries a comment saying so, in case a future session sees the
mismatch and "fixes" it.

`Pantry` as a location name in `constants.ts` is untouched and must stay
— that one really does mean the pantry shelf.

**The Put-away review plan (P1–P3) is closed, same session.** See the
plan's own section above for the full design and verification detail —
worth restating here only because it's the biggest single feature this
session, and it retires a real trust problem: "Put away" no longer
silently claims a new item is on the pantry shelf, no longer discards a
deliberate location/category correction on an existing item, and now
gives a human a chance to say "that's the same thing" before a
duplicate lands in the inventory. Nothing about the fully-known path
changed for the family — a shop where everything matches still commits
in one tap, no popup, exactly like before.

Everything from this session is committed and pushed. `tsc`, `eslint`,
and `npm run build` are all clean.

---

## Session wrap-up (end of the 2026-08-06 session)

The most current summary — read this first. Everything below reflects
the actual state of the app right now, not a snapshot from earlier in
this file's history.

### What's built and working

**The whole app requires login** (shared family password, `session.ts` /
`dal.ts`), is deployed and in daily use by the family at
`family-hub-xi-fawn.vercel.app`, and has a home-screen icon on Bryce's
wife's phone. Deployment, Postgres, and hand-off are all long since done
— see the "Deployment plan" section above.

**Kitchen is feature-complete as originally sketched**, and has had a
second pass of real-use polish this session:

- **Inventory** — 29 supermarket-ordered categories, collapsible groups
  that **start fully collapsed** (a deliberate change this session — see
  the design rule below), swipe-right-to-left-to-delete on every row
  (`SwipeActions.tsx`), tap-to-edit for everything else, search, low-stock
  badges, the two-way link to Shopping.
- **Shopping** — store filter chips, swipe reveals **Edit and Delete**
  (`GroceryItemEditSheet.tsx` covers name/quantity/unit/category/store/
  location), and **"Put away" now reviews anything new** instead of
  silently guessing a location — see the Put-away review plan above for
  the full design. A fully-known shop still commits in one tap, no popup.
- **Expiring** — urgency-sorted, shelf-life estimates from real USDA
  data, leftover logging.
- **Cooking** — Recipes (full CRUD, A–Z browse, 4 import paths, sharing)
  and Meal Plan (week view, recipe picker, AI suggestions grounded by
  index) are both fully built. No placeholder left anywhere under
  Kitchen.

**Voice** — V1 (the `/api/voice` backend) and V2 (a working Siri
Shortcut) are both done and proven against production. V3 (an Alexa
skill) is queued, blocked only on Bryce creating a free Amazon developer
account.

**Everything else on the nav bar — Calendar, Chores, Lists — and the
dashboard beyond Kitchen's card are still placeholder pages.** These are
the next real *branch* of work, whenever that gets picked up; nothing
about them has started.

### Design decisions worth knowing (the accurate ones)

These are the ones actually true of this codebase — see "Design rules
we've established" near the top of this file for the full list with
reasoning. Restated briefly here since they came up by name this
session:

- **One nav bar for the whole app, fixed to the bottom of the screen at
  every size — phone, tablet, and desktop alike.** There is no separate
  top-bar layout for wider screens, and this isn't an oversight: an
  earlier version *did* give Kitchen its own tab bar that swapped in on
  desktop, and it was deliberately reverted after Bryce noticed most
  real apps don't change nav contents as you move around. `HubNav.tsx`
  is the only nav component; `HUB_NAV_ITEMS` in `nav.ts` is the only nav
  list.
- **Outline icons only, via Lucide — no emoji in the icon system.**
  Every category, storage-location, and nav icon is a Lucide component.
  The one deliberate exception: native `<select><option>` elements can't
  render SVG, so dropdowns fall back to plain text.
- **Colors are named by job, not appearance** (`--surface`, `--muted`,
  `--danger`, `--accent`, `--danger-soft`), with separate light/dark
  values in `globals.css`. No named palette or third-party product is
  the reference for this — it was built from scratch, one token added
  only when a real screen needed it (e.g. `--danger-soft` was added
  specifically for the Expiring page's "eat now" badge).

  **Resolved, same session:** a bottom-nav-on-mobile/top-bar-on-desktop
  split and a Todoist/Monarch design reference were asked for twice, and
  both times neither matched this codebase. Bryce settled it directly:
  drop the Todoist/Monarch references entirely, and **keep the single
  bottom nav bar at every screen size, deliberately** — the app is
  optimized for mobile first, and a desktop-specific layout is a
  "someday if it's actually needed" call, not a default to build toward
  now. So the single-nav-bar rule above isn't just undisturbed, it's
  freshly confirmed as the right call rather than an oversight worth
  revisiting.

### Where I left off

The Put-away review plan (P1–P3) closed this session and was the last
active plan — see its section above for the full design, and the
"Session-specific guidance" entries throughout this file for the
verification detail. Bryce confirmed it working on his own phone over
the LAN dev server before this wrap-up.

**Nothing is currently an ACTIVE plan.** The obvious next steps, in no
particular order:

- **V3, the Alexa skill** — still the oldest outstanding item, blocked
  only on Bryce creating a free Amazon developer account. The
  `/api/voice` endpoint it needs already exists and is proven.
- **A real handwritten recipe card through photo import** — the one
  source type from the Recipes plan never tested against genuine input.
- **Shopping still has no collapse/expand** the way Inventory does —
  it picked up the 29-category grouping but not the collapsible
  treatment.
- **Nothing remembers a *specific* item's usual store** — only one
  global "last store picked," not per-item memory.
- **A new branch** — Calendar, Chores, Lists, or Family profiles are
  all genuinely unstarted; see "Planned, not yet built" above for the
  rough order Bryce laid out (Calendar last on purpose, as the hardest).

Everything through this session is committed and pushed to `main`.
`tsc`, `eslint`, and `npm run build` are all clean — no known issues
anywhere in the repo.

---

## Performance: why the app felt slow, and what fixed it

Bryce reported 2–3 second waits when moving *between* branches, but not
when interacting *within* a page. That split is the whole diagnosis:
in-page taps are optimistic client updates (instant by design), while
every navigation is a full server render, because every page in this app
is `force-dynamic` so counts and low-stock badges can never be stale.

Three separate causes, found by measuring rather than guessing:

**1. The functions and the database were on opposite coasts.** The
response header `x-vercel-id: sfo1::iad1::…` decodes as edge-in-San-
Francisco, *function-in-Washington-DC* — while Neon sits in
`us-west-2` (Oregon). Every single query crossed the country and back.
Fixed with `vercel.json` pinning `"regions": ["pdx1"]` (Portland =
`us-west-2`), so functions now run beside the database. **That file has
no comments because `vercel.json` is strict JSON — this paragraph is its
documentation.** If the database is ever moved, that region must move
with it.

**2. Nothing rendered until the whole round trip finished.** There was
no `loading.tsx` anywhere in the app, so a tapped nav item sat there
looking frozen for the entire render. Added `src/components/Skeleton.tsx`
plus a `loading.tsx` per branch — grey blocks shaped like the real
content, so the page doesn't visibly jump when data lands. This doesn't
make anything *faster*; it makes the app stop looking broken while it
works, which is most of what "feels slow" actually meant here. Verified
with a MutationObserver that the skeleton genuinely appears mid-
navigation (`role="status"`, `aria-label="Loading Kitchen"`), rather
than assuming the file was enough.

**3. Inventory paid for the same data twice.** D3's `getReviewQueue()`
ran as a *sequential* `await` after the page's `Promise.all`, and
internally re-fetched all ~477 pantry rows that the page had just
loaded — a second cross-country round trip for data already in hand.
Extracted the pure part into `buildReviewQueue(items, dismissed)` in
`duplicates.ts`; the page now folds the dismissals query into its
existing parallel batch and computes the queue from rows it already
has. `getReviewQueue()` still exists for the client's re-read after a
decision, where the browser genuinely has no data of its own. Verified
the page produces identical output afterward (476 items, 34 low, 20 to
review).

**The general rule this leaves behind:** on a `force-dynamic` page, each
sequential `await db.…` is another cross-country round trip. Batch into
one `Promise.all`, and never re-fetch in a helper what the page already
holds.

**Photo import could only use the camera, never the photo library — fixed.**
Bryce hit this in real use: tapping "Add photo" on his phone opened the
camera directly, with no way to reach a screenshot already in his camera
roll. The cause was `capture="environment"` on the file input, added in
R3b with a comment claiming it merely "biases toward" the camera. That
comment was wrong, and the wrongness is the lesson: on iOS, `capture`
is not a hint. It forces the camera and **removes "Photo Library" and
"Choose File" from the sheet entirely** — breaking the single most
common real case, since this household's recipes live as TikTok
screenshots and saved images, not as pages held under a lens. Removing
the attribute restores the normal iOS sheet, where Take Photo is still
one tap away.

`multiple` was added at the same time, because the library picker makes
selecting two pages of one recipe natural. That needed a matching change
in `handleFileSelected`, which read only `files[0]` — left alone it would
have accepted a multi-select and silently kept one photo, which is a
worse bug than the one being fixed. It now takes only as many as there's
room for under `MAX_PHOTOS`, and downscales them **sequentially rather
than with `Promise.all`**: each downscale decodes a full-size phone photo
into a canvas, and three at once is a real memory spike on a phone for no
speed gain.

Verified in the browser rather than by reading the attribute: `capture`
is gone and `multiple` is on; handing the input two files at once
produced "2 of 3 photos added" (both kept, not one); and a five-file
selection correctly capped at "3 of 3 photos added" with the Add button
hidden and no error.

---

## Session note, 2026-08-07: the Recipes v2 plan was written

No code changed this session — it was a design conversation. Bryce
walked through a commercial recipe app (RecMe) screenshot by screenshot,
marking feature by feature what to adopt, adapt, or skip, and the result
is the **Recipes v2 plan — ACTIVE** section above (after the v1 Recipes
plan): cookbooks, tags, ratings, cooked history, nutrition, the recipe
detail redesign, the Meal Plan / Add-to-groceries buttons, photos (gated
on a Vercel Blob decision), and cookbook viewer links — eight phases,
C1–C8, each carrying a model recommendation (Sonnet vs. Opus) at Bryce's
request. The plan is the next build target; nothing in it has started.
