@AGENTS.md

# Marshee — project context

This file is read automatically at the start of every future session. It's
written for two readers at once: Bryce (a complete beginner, learning to code
through this project) and whichever future Claude Code session picks this
project back up. Plain English throughout — no assumed programming background.

## What this is

Marshee is a private web app for one family — not a product, not something
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

## The Avengers Initiative

This project is worked through the **Avengers**, Bryce's user-level agent
team (built 2026-08-14; lives at `~/.claude/skills/avengers/` and
`~/.claude/agents/` — Banner/Stark/Vision/Strange/Captain, orchestrated by
the session as Fury via the `/avengers` skill). This repo's constitutions
are [DESIGN.md](DESIGN.md) (Strange's — the design rules, distilled from
this file) and [STRUCTURE.md](STRUCTURE.md) (Captain's — layout, boundaries,
and the danger register). Missions live in `.avengers/missions/`. For any
non-trivial build, invoke `/avengers` and follow the doctrine.

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
  truth rule. **Two tiles, both fully built: Recipes and Meal Plan** —
  see the Recipes, Recipes v2, and Meal Plan plans below. There were
  briefly three tiles — Recipes / Menu / Meal
  planning — but Menu ("what's for dinner") and Meal planning turned out
  to be the same feature described twice, and they were merged into one
  "Meal Plan" tile before Menu was ever built.
  - **Recipes** (`/kitchen/cooking/recipes`) — the household's recipe
    box. Opens on **Cookbooks** (named lists a recipe can be filed into,
    each shareable by revocable link), with an **All Recipes** view that
    browses A–Z via a slide-to-jump rail (like the iPhone contacts list)
    and searches by title *or* ingredient. Four ways to add one, all
    landing on the same reviewable form so nothing is ever saved
    unreviewed: type it in, paste text off any blog, photograph a
    cookbook page / handwritten card / screenshot, or paste a link
    (recipe blog, TikTok, or Pinterest pin). Each recipe can be copied
    as plain text for a group chat, or shared outside the household via
    an opt-in, revocable, unguessable link.
    A recipe carries **tags, a 1–5 star rating, and a last-cooked
    stamp**, all filterable (plus total time and sort) from one filter
    bar; it can push itself **into the meal plan** or push its
    **ingredients onto the shopping list** (inventory-aware, reviewed
    before anything is written); and it can estimate **per-serving
    nutrition**, marked `~` as an estimate and flagged stale if the
    ingredients change afterward. There are no recipe photos and won't
    be — see C7 in the Recipes v2 plan.
  - **Meal Plan** (`/kitchen/cooking/meal-plan`) — the week at a
    glance, four slots a day, with past weeks collapsed below. Fill a
    slot with a preset (Leftovers / Takeout / Eating out), free text, a
    recipe from the box, or an **AI suggestion grounded in the real
    inventory** that prioritizes food about to expire.

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

## Recipes v2 plan — ✅ DONE (C7 dropped)

**Seven of eight phases shipped, verified, and pushed. C7 (Photos) was
dropped outright, not deferred** — Bryce's call, 2026-08-08: it needs
Vercel Blob, which is a paid service, and he didn't want to take on a
billing commitment for it. Everything below is kept as a record of the
decisions, same as the other finished plans; the C7 bullet stays only so
a future session knows what was skipped and why.

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

- **C1. Cookbooks core.** ✅ **Done.** `Cookbook` + `CookbookRecipe`
  schema — additive migration (`20260808201127_add_cookbooks`, two
  `CREATE TABLE`s plus indexes and foreign keys, reviewed as SQL before
  applying), `prisma generate` run after. `CookbookRecipe` cascades on
  both sides but for opposite reasons: deleting a `Cookbook` unfiles its
  recipes (join rows only), deleting a `Recipe` removes any join row
  that pointed at it (a dangling join row would be meaningless).
  The view toggle on `/kitchen/cooking/recipes` (`RecipesBrowser.tsx`,
  Cookbooks default / All Recipes — All Recipes renders exactly the
  pre-existing `RecipeList`, untouched). Cookbook list rows (title +
  count, `CookbookList.tsx`) with an A–Z/most-recent sort sheet. The
  bottom-left floating **+** (`FloatingAddButton.tsx`, pinned to the
  content column's own left edge via a full-width wrapper, not the raw
  viewport edge — the A–Z rail already owns the right edge) replaced
  the header New button, opening a two-option sheet (Add a recipe / Add
  a cookbook). Create-cookbook is one text field
  (`TitleSheet.tsx`, reused for rename) → straight into the new empty
  book, no intermediate screen. The cookbook page
  (`CookbookDetail.tsx`) reuses `RecipeList` wholesale for "its recipes
  as the familiar list" — `RecipeList` gained an optional `onRemove`
  prop that wraps each row in `SwipeActions` with a *neutral*-toned
  "Remove" action (unfiling is reversible, unlike Delete) — and an
  "Add recipe" button opening `AddRecipeToCookbookSheet.tsx`: a search
  picker over recipes not already filed (M2's recipe-picker pattern),
  plus a link straight into the existing 4-way import chooser carrying
  `?cookbookId=`. That query param threads through all four `new/*`
  pages into `RecipeForm`'s hidden `cookbookId` field, and
  `createRecipe` does the nested `cookbooks: { create: { cookbookId } }`
  write in the same insert — a recipe born inside a book lands in it
  atomically, not via a second write. The chooser's own `BackLink`
  resolves the real cookbook title server-side rather than always
  saying "Recipes". ⋯ menu (`ActionSheet.tsx`): Edit title, and Delete
  with a real count-confirm (`ConfirmSheet.tsx`) — one of the plan's two
  deliberate breaks of the house single-tap-delete rule, since it
  touches many rows' relationships at once. New small shared sheets
  (`RadioSheet`, `ActionSheet`, `ConfirmSheet`, `TitleSheet`) are
  general-purpose, not cookbook-specific, and are meant to be reused by
  C2's tag UI. Scoped `db:seed-cookbooks` / `db:clean-cookbooks`
  scripts, same title-matched-test-data pattern as the recipe scripts
  (`cookbook-seed-data.ts`), with a dependency note that the seed data
  needs `db:seed-recipes` run first for a full test set.
  **Verified end to end in the running app against the real household
  library** (not just read from the code): created a cookbook and
  landed straight in it, empty; filed an existing seeded recipe via the
  search picker and confirmed it persisted after a full reload; unfiled
  it via the swipe action and confirmed — via a direct reload of All
  Recipes — that the recipe itself survived, only the filing was
  removed; imported a *brand-new* recipe from inside the cookbook via
  the manual-entry path and confirmed it landed filed, with the
  chooser's BackLink correctly naming the cookbook; renamed the
  cookbook and confirmed the new title persisted; deleted a non-empty
  cookbook, confirmed the exact count-confirm wording ("Its 2 recipes
  stay in All Recipes"), and confirmed both recipes were still present
  in All Recipes afterward; deleting a recipe directly from its own
  detail page correctly dropped the cookbook's count via the cascade.
  All test cookbooks/recipes cleaned up afterward; final counts
  (pantry 477, grocery 8, recipe 11, cookbook 0, cookbookRecipe 0)
  confirmed by direct database read. `tsc`, `eslint`, and
  `npm run build` all clean.
- **C2. Tags.** ✅ **Done.** `Tag` + `RecipeTag` schema — additive
  migration (`20260808203800_add_tags`), `prisma generate` after.
  `Tag.name` is `@unique` at the database level, but that uniqueness is
  case-*sensitive* (no provider-specific collation features, same rule
  as the rest of the schema) — the case-insensitive "search or create"
  behavior is enforced in `findOrCreateTag` (`src/app/actions/tags.ts`),
  not the schema. The four slot tags seed from the real `MEAL_SLOTS`
  value (`prisma/seed-slot-tags.ts`, `db:seed-slot-tags` — confirmed
  importing it doesn't drag lucide-react into the plain-Node script
  before writing the script, rather than assuming; it's fine, and fast)
  via `db.tag.upsert` by name, safe to rerun.
  `TagSelectSheet.tsx` is one sheet with an internal `view` state
  machine (`main`/`menu`/`rename`/`delete`) rather than stacking
  separate `ActionSheet`/`TitleSheet`/`ConfirmSheet` instances on top
  of each other — the same shape `SlotEditSheet` already established,
  and for the same reason: two independent Escape-key listeners on
  stacked modals would fight over a single keypress. Search-or-create
  surfaces an existing case-insensitive match first and only offers
  "Create" when there's truly no match; creating a tag from inside a
  recipe's own sheet also applies it to that recipe in the same
  interaction. Per-tag ⋯ offers Rename and Delete-with-count (the
  second of the plan's two deliberate single-tap-delete exceptions).
  `RecipeTagsSection.tsx` puts tag chips + an "Add tags"/"Update" entry
  point on the recipe detail page, with local state mirroring the
  server (same pattern `ShareRecipeControls`/`CookbookDetail`
  established). Tag filter chips (single-select, Inventory's location-
  chip pattern) live on All Recipes only, reading `tagIds` that ride
  along on `RecipesBrowser`'s own recipe fetch — cookbook filtering by
  tag stays out of scope, per the plan. `suggestMealsForSlot`
  (`src/app/actions/mealPlans.ts`) now fetches slot-tagged recipes
  first and only falls back to the full library when nothing's tagged
  for that slot — an exact-name lookup against the tag (never fuzzy),
  since the tag name and the slot name are the same string by
  construction.
  **One real bug the verification caught:** the delete-tag confirm's
  "removes it from N recipes" count went stale mid-session — a tag
  toggled onto a second recipe without a page reload still showed
  whatever `recipeCount` the tag had at the *page's own* load time,
  because nothing incremented/decremented it locally on toggle. Fixed
  in `RecipeTagsSection.handleToggle`, which now moves `tagOptions`'
  `recipeCount` by ±1 on every toggle, not just on rename/delete.
  Caught by literally reading the confirm dialog's count after tagging
  a second recipe live, not by inspecting the code.
  **A second, smaller finding**: the sheet's own header showed literal
  text "Delete tag" on both the back-button label *and* the red confirm
  button when viewing the delete screen — harmless to a real user (the
  two are visually distinct), but it was enough to fool a naive
  text-match test into clicking the wrong one and concluding delete was
  broken. Simplified the header to show the tag's own name instead
  (matching what the "menu" view already did), which incidentally also
  removes the ambiguity for anyone automating against this sheet later.
  **Verified end to end against the real household library and the
  real 4 seeded slot tags**: tagged the real "Whole-Wheat Pancakes"
  recipe as Breakfast through the sheet; confirmed the case-insensitive
  existing-match-first rule (typing "breakfast" showed no "Create"
  option); created, toggled, and renamed a test tag, each round-tripping
  through a full page reload; deleted a test tag and confirmed via a
  direct database read that only that row (and its one `RecipeTag`
  join row) was gone; reproduced the `suggestMealsForSlot` filtering
  directly against the query (matching the action's own where-clause)
  with the real data — Breakfast returned exactly the 1 tagged recipe,
  Dinner (0 tagged) correctly fell back to all 11. Test tag and the
  Breakfast tag on Whole-Wheat Pancakes were removed afterward; final
  state (pantry 477, grocery 8, recipe 11, cookbook 0, only the 4 slot
  tags remaining at 0 recipes each) confirmed by direct database read.
  `tsc`, `eslint`, and `npm run build` all clean.
- **C3. Recipe detail v2.** ✅ **Done.** `Recipe.rating Int?` and
  `Recipe.lastCookedAt DateTime?` — additive migration
  (`20260808211411_recipe_rating_and_cooked`), two bare `ADD COLUMN`s.
  The page top to bottom, all matching the plan exactly:
  `RecipeDetailHeader.tsx` (back link on its own line, then Edit + a
  new ⋯ button on their own row — the title moved below the hero, so
  it's no longer inline with Edit); `RecipeHero.tsx` (a decorative
  gradient + `ChefHat` placeholder, swapped for a real photo in C7);
  title; `RecipeActionCircles.tsx` (Meal Plan, Groceries, Share);
  `RecipeMeta.tsx` (servings/prep/cook/source — split out of
  `RecipeBody.tsx`, see below); `RecipeCookbooksSection.tsx`; stars
  (`RecipeStars.tsx`) and Mark as Cooked (`RecipeCookedButton.tsx`)
  stacked in their own row; `RecipeBody.tsx` (Ingredients/Instructions/
  Notes — "Steps" renamed to "Instructions" in the visible heading
  only, the `steps` column name is untouched); `NutritionPlaceholder.tsx`;
  `RecipeTagsSection.tsx` (C2, unchanged, just moved to the very end).
  **The "three action circles" interpretation, since the plan named
  only two of them:** the plan's own text justifies Meal Plan and
  Groceries as stubs but is silent on the third — read as evidence the
  third isn't a stub at all. Went with **Share**, since R4's sharing
  was already real, working functionality that needed a home once the
  old standalone Share *section* was folded away (the plan's own
  top-to-bottom list never mentions a separate Share section, which is
  the tell that it moved into a circle rather than being silently
  dropped). `ShareRecipeControls.tsx` became `ShareSheet.tsx` — same
  logic, wrapped in the sheet chrome the circle opens. Meal Plan and
  Groceries open `ComingSoonSheet.tsx` (new, generic — a real tap gets
  a real one-line acknowledgment rather than doing nothing, matching
  the house's no-dead-click stance on visible-but-unwired controls).
  **`RecipeBody.tsx` split, and why the shared-with-the-public-page
  contract mattered here specifically:** `RecipeBody` is the one piece
  required to render identically on the private detail page *and* the
  public `/share/recipe/[token]` page (an R4 security surface, already
  adversarially checked once). The plan wants meta/source near the top
  and ingredients/instructions further down on the private page, which
  `RecipeBody`'s old single-block shape couldn't do — so the meta/
  source row moved out into its own `RecipeMeta.tsx`, and both pages
  now render `<RecipeMeta>` immediately before `<RecipeBody>`, in the
  same relative order as before. No new field is exposed publicly;
  the split is purely about where each page positions the two pieces.
  **Cookbook chips are real `Link`s to that cookbook's page (unlike
  tag chips, which are inert spans with no page of their own)** —
  `RecipeCookbooksSection.tsx` reuses C1's `addRecipeToCookbook`/
  `removeRecipeFromCookbook` from the opposite direction (recipe →
  cookbook instead of cookbook → recipe), via a new, simpler
  `RecipeCookbookPickSheet.tsx` (toggle-only, no rename/delete — that
  stays on the cookbook's own page).
  **Print/Export PDF share one destination on purpose**
  (`recipes/[id]/print/page.tsx`), reusing `RecipeMeta` + `RecipeBody`
  again rather than duplicating their markup — a platform's print
  dialog already offers "Save as PDF," which is what makes one button
  double as both menu entries. `print:hidden` (Tailwind's built-in
  variant, no config needed) on the shared header and bottom nav
  (`(app)/layout.tsx`, `HubNav.tsx`) keeps app chrome off every printed
  page project-wide, not just this one; the print page's own back
  link/print button carry the same class so they don't show up in the
  actual printout either.
  **Two real findings from verification, not just clean tsc/eslint:**
  (1) the new cookbook-chip `Link`s were sized like the (non-
  interactive) tag chips they sit near — `py-1.5` with no minimum
  height, under the 44px the plan's own verification note calls for.
  Caught by deliberately auditing every new interactive element's
  target size rather than trusting the visual pass alone; fixed to
  `min-h-11`. (2) The dev-tools "1 Issue" badge that appeared once
  during testing turned out to be a stale artifact of a degraded
  browser tab (see below) — reproduced clean on a fresh navigation,
  confirmed not a real error via server logs and a from-scratch
  `tsc`/`eslint`/`npm run build`.
  **A recurring browser-automation quirk, worth naming for whoever
  debugs this class of thing next:** several clicks against an
  already-interacted-with tab silently failed to reach React's
  handlers at all (no re-render, no server log entry) with zero
  console or server errors — not the "read the DOM one tick too early"
  timing issue documented elsewhere in this file, but the click itself
  never registering. Every one of these resolved on a *fresh* browser
  tab pointed at the same URL. Treated as a testing-tool limitation,
  not an app bug, precisely because the *fresh-tab* re-attempt of the
  identical action always worked and always produced the expected
  server log line.
  **Verified end to end against the real "Whole-Wheat Pancakes" recipe**
  (not synthetic data): section order confirmed via the rendered
  heading sequence (Cookbooks → Ingredients → Instructions → Nutrition
  → Tags, exactly the plan's order); rated 4 stars, confirmed via
  reload, then cleared back to unrated by tapping the same star again,
  confirmed via reload and via the server's own `setRecipeRating(...,
  null)` log line; "Mark as cooked" stamped `lastCookedAt` and showed
  "Cooked today," confirmed by a direct database read; filed the
  recipe into a synthetic test cookbook from the recipe's own Cookbooks
  section and confirmed it appeared on that cookbook's own page (the
  C1 join working from both directions); the ⋯ menu's Print action
  opened the print route with chrome-free content and the header/nav
  `print:hidden` classes present; Share opened `ShareSheet`, created a
  real share link, and the public `/share/recipe/[token]` page rendered
  correctly with `RecipeMeta` + `RecipeBody` in their new split form
  and zero private fields (rating, cooked, cookbooks, tags) leaked;
  single-tap Delete from the ⋯ menu removed a synthetic test recipe
  with no confirmation and redirected cleanly to the recipe list. Every
  synthetic recipe/cookbook was removed and the real recipe's rating/
  cooked-timestamp/share-token/cookbook-membership were restored to
  exactly their pre-test state afterward; final counts (pantry 477,
  grocery 8, recipe 11, cookbook 0, tag 4 — just the permanent slot
  tags) confirmed by direct database read. `tsc`, `eslint`, and
  `npm run build` all clean.
- **C4. The filter bar.** ✅ **Done.** `src/lib/recipeTimeFilter.ts`
  holds the best-effort prep+cook duration parser (`parseTimeToMinutes`,
  `totalTimeBucket` → `"under30" | "30to60" | "over60" | null`) with
  **real `node:test` unit tests** (`recipeTimeFilter.test.ts`, zero new
  dependencies — Node 24's built-in test runner plus the `tsx` loader
  already in the project, wired up as `npm test`) covering every
  example the plan named ("45 min", "1 hr 15 min", "1½ hours", "a
  while" → no bucket) plus boundary cases (exactly 30, exactly 60) and
  the "one side parses, the other doesn't" case. 17 tests, all passing.
  `src/lib/recipeFilters.ts` holds the actual filter **composition** as
  one pure, independently-tested function (`applyRecipeFilters`) —
  tags, time bucket, Cooked, and minimum rating all narrow the same
  list together (AND, not OR), a typed search query takes over ordering
  entirely (ranked by `searchRecipes`, same as everywhere else in the
  app), and otherwise the Sort control decides (A–Z / Highest rated /
  Recently cooked).
  **"One filter-bar component, used twice," done as a real extraction,
  not a rewrite**: the single-select tag chips already shipped in C2
  (inline in `RecipesBrowser.tsx`) moved out into `TagFilterChips.tsx`
  unchanged, and both All Recipes and the new `RecipeFilterBar.tsx`
  (search + Tags + Total time + Cooked + Rating + Sort) import that one
  component — there's now exactly one tag-chip implementation in the
  app, not two that could quietly drift.
  **The cookbook page trades its A–Z rail for the filter bar, and this
  was a deliberate call, not a regression:** once Sort can mean
  "Highest rated" or "Recently cooked," the result stops being
  something an alphabet rail can meaningfully organize — you're
  querying a small, already-scoped collection at that point, not
  browsing the whole library the way All Recipes still does (untouched,
  rail and all). `FlatRecipeRows.tsx` (new) renders the filtered/sorted
  results as a plain list, reusing `RecipeList`'s own `RecipeRow`
  (newly exported) so cookbook pages keep swipe-to-unfile without
  duplicating that logic.
  Extending the cookbook page's data to carry rating/lastCookedAt/tagIds/
  prepTime/cookTime meant `AddRecipeToCookbookSheet` would otherwise
  echo back a bare id/title/ingredients when a recipe is newly filed —
  handled by having `CookbookDetail`'s `handleAdded` look the full
  record up in the page's own already-fetched `allRecipes` rather than
  trusting what the sheet hands back, instead of making that sheet
  generic over a type it doesn't actually need to know about.
  **A real, hard-won lesson about verifying this phase, worth
  recording in detail:** live-browser clicks on the new filter chips
  intermittently produced *zero* effect — no state change, no visible
  update — with no console or server error, which at first looked
  exactly like a real bug in the Cooked toggle specifically (it failed
  five-plus times in a row while Tag/Time/Rating chips eventually
  succeeded). Chased it all the way to instrumenting `update()` with a
  `console.log` and confirming, via a raw `window.__traces` override
  bypassing the console-reading tool entirely, that the handler was
  never invoked — then confirmed the *page's own already-shipped*
  "Add recipe" button also failed to open its sheet in that same
  moment, proving the whole tab's click-dispatch had degraded, not
  anything specific to this code. A fresh tab immediately fixed it, and
  every control — including Cooked — then worked first try. The
  general lesson: when a click produces literally no observable
  effect anywhere (not even a state change one line of code away from
  the handler), test a known-already-working control on the *same*
  page before concluding the new code is broken — a page-wide
  interactivity stall reads identically to a narrow logic bug until
  you isolate it that way.
  **Verified end to end against a seeded fixture built to make the
  plan's own example decisive**: four synthetic recipes (A: Dinner tag,
  25 total min, 4★, cooked; B: Dinner, 75 min, 4★, never cooked; C:
  Breakfast, 15 min, 4★; D: Dinner, 20 min, 2★) filed into a test
  cookbook. Applying Dinner alone → A, B, D. Adding Under 30 → A, D.
  Adding 4★ → **exactly A**, matching the plan's own "Dinner + Under 30
  + 4★" example precisely. Cooked alone → exactly A. Sort by Highest
  Rated → the three 4★ recipes (A, B, C, alphabetical among themselves)
  before the 2★ one (D). Typing "Breakfast" → exactly C, confirming
  search overrides sort as designed. The same composition was also
  proven independently at the pure-function level (8 additional
  `node:test` cases against the identical fixture) before ever touching
  a browser, which is what made isolating the tooling stall
  straightforward rather than a real scare. All Recipes' tag chips
  (now backed by the extracted `TagFilterChips`) re-verified unaffected
  after the refactor. Every synthetic recipe and the test cookbook were
  deleted afterward; final counts (pantry 477, grocery 8, recipe 11,
  cookbook 0, tag 4 — the permanent slot tags) confirmed by direct
  database read. `tsc`, `eslint`, `npm test`, and `npm run build` all
  clean.
- **C5. The cross-branch buttons.** ✅ **Done.** Both C3 stubs are real
  now; `ComingSoonSheet` survives for C6's Nutrition button only.
  **Meal Plan button** (`AddToMealPlanSheet.tsx`): week → day → slot,
  three steps in one sheet, writing through `setMealPlanEntry` — the
  same upsert the Meal Plan branch's own slot sheet uses, denormalized
  title and `recipeId` both. No second way to fill a slot was added.
  Every date is computed from `new Date()` inside a component that only
  renders after a tap, per `CreatePlanSheet`'s documented reasoning
  (Vercel runs UTC, the household runs Mountain — a server-decided
  calendar day is wrong for several hours every evening).
  **The one supporting change: `createMealPlan` now returns the new
  plan's id.** Filling a slot needs a `mealPlanId`, and picking a week
  that has no plan yet has to create one first. Rather than add a
  write path, the existing action just hands back what it created —
  and on the duplicate-week collision it already treats as success, it
  reads the existing plan's id back, so two phones racing on the same
  week both get a usable answer.
  **Add to groceries**: `src/lib/ingredientParse.ts` is the Claude call
  (Haiku, structured outputs, `server-only` + guarded-action split —
  the same shape as `voice/parse.ts` and `mealSuggest.ts`), turning
  free-text ingredient lines into shoppable names. Lines go out
  **numbered and come back as a `lineIndex`**, never as an echoed copy
  of the line — the index-grounding rule M4 established, applied so a
  parsed item can't be attached to the wrong ingredient.
  `classifyRecipeIngredients` (read-only) then checks each name against
  the real inventory with `matchItem` and against the current shopping
  list, and `addIngredientsToGroceries` writes only the confirmed rows.
  `AddToGroceriesSheet.tsx` shows every row with the recipe line it
  came from; genuinely-missing rows start ticked, already-stocked and
  already-on-the-list rows start unticked but stay tappable.
  **The sharpest decision here — an ambiguous match is shown but never
  linked.** `pantryItemId` on a grocery row is what makes put-away top
  up the right inventory item, so a *wrong* link is worse than none:
  it would silently restock the wrong row weeks later. `matchItem`
  already reports `ambiguous` (the runner-up tied), which is exactly
  the signal V1's voice bug needed — so a confident match links and
  borrows the matched row's category (a real fact), while an ambiguous
  one is displayed as "you have X" and deliberately left unlinked.
  Put-away's own exact-name check and review sheet are the layer that
  catches those later; that's what they're for.
  **This paid off immediately on real data rather than staying
  theoretical.** The test recipe's "3 tablespoons harissa paste"
  matched the household's **Ginger paste** — a genuinely bad match, on
  the shared word "paste". Checked directly: `matchItem` returned it
  `ambiguous: true` (Tomato paste and two vanilla bean pastes tied), so
  it was shown to the human and **not** linked. "2 cups milk" behaved
  the same way (seven milks, no plain "Milk"). The only two rows that
  linked — "brown sugar" → Brown sugar, "salt" → Salt — were both
  correct.
  **Verified end to end against the real 477-item inventory**, with a
  test recipe deliberately mixing stocked, ambiguous, and absent
  ingredients plus a section header and a water line. The parse
  correctly skipped "For the topping:" and "1 cup water" entirely
  (7 lines → 5 rows) and stripped quantities and prep throughout. The
  split was right: saffron threads (absent) pre-ticked, brown sugar /
  salt / milk / harissa unticked with "you have …" labels. Ticking
  three and adding wrote **exactly** those three — the two unticked
  rows were never created — with `brown sugar` linked to the real
  Brown sugar row and category borrowed (Baking), `milk` and `saffron
  threads` unlinked with the catch-all category, all confirmed by
  direct database read. Then the full cross-branch loop: ticking the
  linked `brown sugar` row off on Shopping and tapping "Put away"
  committed with **no review sheet** (the fully-known path), took
  **Brown sugar 0.5 → 1.5**, advanced `restockedAt`, and left the
  pantry count at **477** — restocking the matched row rather than
  creating a duplicate, which is the whole point of the link. The Meal
  Plan side was verified the same way: a not-yet-planned week created
  a plan at `06:00Z` (Mountain midnight — the browser's date, matching
  the existing real plan's own convention), filed the recipe at day 3
  / Dinner with both title and `recipeId` set, and rendered under
  "Coming up" as Wednesday Aug 12 → Dinner. Every test row was removed
  afterward and **Brown sugar was restored to its exact pre-test
  quantity and `restockedAt`**; final counts (pantry 477, grocery 8,
  recipe 11, cookbook 0, tag 4, 1 real meal plan with its 3 real
  entries) confirmed by direct read. `tsc`, `eslint`, `npm test`, and
  `npm run build` all clean.
- **C6. Nutrition.** ✅ **Done.** `NutritionSection.tsx` replaces
  `NutritionPlaceholder.tsx`; `ComingSoonSheet.tsx` was deleted outright
  since nothing points at it anymore (Meal Plan and Groceries were its
  only other users, and C5 already wired those up).
  **Schema**: five new nullable columns on `Recipe` —
  `nutritionCalories`/`ProteinG`/`CarbsG`/`FatG` (all whole `Int`s,
  never floats — an AI estimate doesn't carry decimal precision, and
  12.4g reads as more precise than it is), `nutritionServings` (the
  hard integer the stepper used, kept entirely separate from the free-
  text `servings` field so a nutrition calculation can never overwrite
  "6-8" with a number), and `nutritionFingerprint`. Purely additive —
  reviewed as raw SQL (six bare `ADD COLUMN`s) before applying, same
  as every prior migration.
  **The staleness design**: `src/lib/nutritionFingerprint.ts` hashes
  `ingredients` with `sha256` — a plain function, not `server-only`,
  because it has to run in both the guarded Server Action that stores
  it and the Server Component that reads a fresh one back on every
  render to compare. A mismatch means the ingredient list changed
  since the estimate was computed, and the page shows "computed for an
  older ingredient list" with a Recompute link rather than silently
  mislabeling a different recipe's macros as this one's.
  **The Claude call**: `src/lib/nutritionEstimate.ts` — Haiku,
  structured outputs, the same `server-only` pure-call split as
  `ingredientParse.ts`/`voice/parse.ts`/`mealSuggest.ts`. Asks for
  per-serving values given the title, ingredients, and the servings
  count from the sheet; `computeNutrition` in `recipes.ts` is the
  guarded Server Action that calls it, computes the fingerprint, and
  writes all five fields in one update so the stored numbers can never
  describe a different servings count than the fingerprint paired with
  them.
  **The confirm-servings sheet** guesses a starting stepper value: the
  last servings number actually used, else the first integer found in
  the recipe's own free-text `servings` ("8-10" → 8), else a plain 4 —
  and never writes back to `servings` itself. Failure is inline
  ("Couldn't reach the AI just now") with a "Try again" button that
  keeps the chosen servings count; the sheet stays open and the rest
  of the page is completely unaffected by a failed call.
  **The donut** splits by *calories*, not grams — fat 9 cal/g, protein
  and carbs 4 cal/g each — computed from the macro grams via
  `conic-gradient`, no chart library. Its three colors (orange/blue/
  purple) are a fixed data-category palette, deliberately not the
  app's job-based CSS tokens (`--danger`/`--warn`/`--accent`), since
  those name UI roles and don't map onto three arbitrary macro
  categories. Every number — the calorie total and each macro — is
  `~`-marked, per the Expiring page's rule that a guess never
  masquerades as a fact.
  **Verified end to end against a real recipe** (a scratch "ZZZ Test"
  recipe, deleted afterward): the stepper correctly guessed 8 from
  "8-10"; a real Haiku call returned ~312 cal, Fat ~10g / Protein ~5g /
  Carbs ~48g, and the donut's rendered proportions visually matched
  the calorie-weighted split (carbs dominant, thin protein sliver) —
  confirmed by screenshot, not assumed from the numbers. Editing the
  recipe's `ingredients` directly (adding chocolate chips) and
  reloading showed the stale notice exactly as designed, with
  "Recalculate" correctly replaced by "Recompute" inside it; tapping
  Recompute re-guessed the stepper from the *stored* servings (8, not
  re-derived from "8-10"), and the new estimate (~408 cal, Fat ~18g)
  correctly reflected the added ingredient and cleared the stale
  notice, restoring "Recalculate". **The failure path was tested for
  real**, the same M4 trick this project has used before: an invalid
  key was injected via a temporary `.env.local` (Next.js gives it
  precedence over `.env`, so the real key was never touched or put at
  risk) with a full dev-server restart to pick it up. The sheet showed
  "Couldn't reach the AI just now. Try again in a moment." — and
  closing the sheet afterward showed the previously-computed ~408 cal
  nutrition completely untouched, proving a failed recompute can't
  corrupt or lose the last good estimate. `.env.local` was deleted and
  the server restarted on the real key afterward. Test recipe removed;
  final counts (pantry 477, grocery 8, recipe 11, cookbook 0, tag 4,
  meal plan 1) confirmed back to exact baseline. `tsc`, `eslint`,
  `npm test`, and `npm run build` all clean (a transient
  `.next/types/* 2.ts` duplicate-identifier error appeared once in a
  combined command but did not fail the actual `tsc` exit code and did
  not reproduce on an isolated re-run with `.next/types` cleared — the
  same build-artifact race already documented under C4).
- **C7. Photos.** ❌ **Dropped, not deferred — Bryce's explicit call
  (2026-08-08): "lets skip C7 all together. if I have to potentially
  pay."** This was the one phase gated on **Vercel Blob**, which is a
  paid service, and the household isn't taking on that billing
  commitment for recipe photos. Nothing was built and nothing is
  half-built — no schema columns, no upload route, no Blob dependency
  in `package.json`. **Don't treat this as a queued next step.**
  What it *would* have been, if this is ever reconsidered: hero photo
  upload (camera/library → client downscale reusing R3b's canvas
  pipeline → Blob, guarded by session), the camera button on the
  detail page, placeholder art when absent, and import photos
  persisted as the recipe's viewable *source*. The hard part is
  cleanup — deleting a recipe must delete its blobs, since Blob
  storage is billed and orphaned images are invisible.
  **What shipped instead:** `RecipeHero.tsx` (C3) renders a decorative
  gradient + `ChefHat` mark in the hero slot. That is the permanent
  treatment now, not a placeholder waiting on this phase — the recipe
  page is complete as it stands.
- **C8. Cookbook viewer link.** ✅ **Done — which completes the Recipes
  v2 plan, C7 (Photos) having been dropped rather than built.** **No migration**: `Cookbook.shareToken` (`@unique`) has
  existed since C1, added in anticipation of exactly this — confirmed
  present in the live database, along with its unique index, before
  any code was written.
  `shareCookbook`/`stopSharingCookbook` in `actions/cookbooks.ts` mirror
  the recipe pair exactly: 32 bytes of `crypto.randomBytes` as
  base64url, idempotent share (re-sharing returns the existing token
  rather than rotating it, so a double tap can't break a link someone
  already has), and revoke nulls the token. `CookbookShareSheet.tsx`
  is link-only — there's no "copy as text" equivalent for a whole book
  — and reached from the cookbook's ⋯ menu, with Delete still last.
  **The share token is owned by `CookbookDetail`, not mirrored into
  the sheet's own state**, so closing and reopening the sheet in one
  session shows the true current value instead of the prop the page
  render started with.
  The public page (`src/app/share/cookbook/[token]/page.tsx`) reads
  the join table **live on every request**, so the link follows the
  book's current contents rather than a snapshot — which is why the
  sheet says so in both states, before and after a link exists.
  **Two deliberate deviations from just reusing the recipe share page,
  both about it being a list rather than one recipe:** the per-recipe
  markup is written out here instead of reusing `RecipeBody`, because
  this page nests many recipes under one `h1` and `RecipeBody`
  hardcodes `h2` for "Ingredients"/"Instructions" — reusing it would
  flatten the heading order. And `robots: noindex` is repeated on the
  page even though the `/share` layout already sets it and Next merges
  metadata shallowly (confirmed in `node_modules/next/dist/docs`,
  per AGENTS.md): on a page whose only protection is an unguessable
  token, that guarantee shouldn't depend on a parent file nobody edits
  alongside it. The title is overridden too — the layout's default
  reads "Shared recipe".
  **The adversarial check, run in full.** *Positive control first* — a
  valid token with **zero cookies** returns 200 with the real cookbook,
  which is what makes every blocked case below mean something. The
  leak check was built to be non-vacuous: the test recipes were seeded
  with **every** household-private field populated as a named canary
  (notes, sourceUrl, rating, lastCookedAt, all five nutrition columns,
  their own recipe `shareToken`s), plus one recipe deliberately left
  *out* of the cookbook. None of the 14 canaries appeared in the public
  HTML, and the nutrition/rating numerics returned **zero** occurrences.
  The only token in the response is the one in the requester's own URL,
  confirmed by inspecting its context (Next's RSC route-segment
  payload) rather than waved away. Structure checked directly: exactly
  **1 `h1`, 2 `h2`, 4 `h3`**, `noindex, nofollow` present, title
  "Shared cookbook", and no app chrome (no Sign out, no nav) beyond the
  intentional "Shared from Marsh HQ." footer the recipe page also has.
  Negative cases, all 404 with nothing leaked: wrong token, the
  cookbook's own **id** as a token, **a recipe's shareToken** (proving
  the two share surfaces don't cross over), token-plus-suffix, and a
  truncated token. Empty token 308s to `/share/cookbook`, which then
  **307s to login** — because the narrow prefix deliberately doesn't
  match the parent path; path traversal 307s to login too.
  Token properties measured over 5000 generations of the exact
  expression the action uses: 43 chars, URL-safe charset only,
  **256 bits**, 5000/5000 unique, **max 1-char shared prefix** between
  consecutive tokens (i.e. not sequential).
  **Revocation verified end to end through the real UI**: "Stop
  sharing" flipped the sheet back and the exact URL that had served
  the cookbook minutes earlier returned **404 with nothing leaked**,
  token nulled in the database. Re-sharing afterward minted a
  **completely different** token while the old one stayed 404 — so a
  revoked link is dead for good, not resurrectable.
  **The "follows current contents" claim was proven, not just
  displayed**: a recipe was filed into the already-shared book and
  appeared on the *same* token's page with no re-share.
  **The proxy-misconfiguration drill reproduced R4's finding and
  extended it.** Substituting the sloppy `"/share"` a future developer
  might reasonably write made **six** paths bypass the login gate
  (307 → 404): `/shareX/recipe/abc`, `/share-secrets`, `/share`,
  `/share/cookbook`, and — new to this phase — `/sharecookbook/x` and
  `/share/cookbooks/x` (note the plural). Nothing lives at those paths,
  so nothing actually leaked, but it's a real latent hole and the
  reason the committed prefixes are the narrow ones. `proxy.ts` was
  restored immediately, `git diff`'d to confirm only the intended C8
  addition remains, and all six near-misses re-verified back at 307.
  Afterward: all 12 protected routes re-checked at 307 with no cookie,
  and **R4's recipe sharing re-verified unaffected** (valid token 200,
  bad token 404) since this phase edited the file guarding it. All 7
  exported actions in `cookbooks.ts` audited as session-guarded.
  Every test cookbook and recipe was deleted afterward, and the
  household's own real shared recipe ("Bryce's Cheeseburgers") was
  confirmed to still hold its exact original token; final counts
  (pantry 477, grocery 8, recipe 11, cookbook 0, cookbookRecipe 0,
  tag 4, meal plan 1) confirmed by direct database read. `tsc`,
  `eslint`, `npm test`, and `npm run build` all clean.
  **One process note worth recording:** this phase was implemented on
  Sonnet, not the Opus the plan specifies — caught by Bryce mid-phase.
  The code was then re-audited against the plan before the adversarial
  check ran (which found the unused-import lint warning, the layout's
  wrong "Shared recipe" title, and the inherited-`robots` fragility,
  all fixed above), and no security claim had been made before that
  check. Worth knowing if anything here is ever revisited.

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
- **Recipes** — ✅ done, twice over: the v1 plan (browse, search, four
  import paths, sharing) and the v2 plan (cookbooks, tags, ratings,
  filters, nutrition, cross-branch buttons) are both closed.
- **Meal Plan** — ✅ done, M1–M4 (absorbed the old "Menu" tile — they
  were one feature described twice).
- **To-dos**
- **Habit trackers**
- **Photo gallery**
- **Calendar** — shared family calendar. Planned last on purpose: it's
  expected to be the hardest piece.
- **Voice input** — partly done: V1 (the `/api/voice` backend) and V2
  (the Siri shortcut) are live and proven; **V3, the Alexa skill, is
  the one piece still outstanding.** See the Voice integration plan
  above.
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
is the **Recipes v2 plan** section above (after the v1 Recipes
plan): cookbooks, tags, ratings, cooked history, nutrition, the recipe
detail redesign, the Meal Plan / Add-to-groceries buttons, photos (gated
on a Vercel Blob decision), and cookbook viewer links — eight phases,
C1–C8, each carrying a model recommendation (Sonnet vs. Opus) at Bryce's
request. The plan is the next build target; nothing in it has started.
*(Written before implementation. Seven of the eight phases shipped over
the following sessions; photos — C7 — was later dropped rather than
built, since Vercel Blob is paid.)*

---

## Session note, 2026-08-08: C1 (Cookbooks core) shipped

The first phase of the Recipes v2 plan is built and verified — see the
C1 bullet above for the full design and verification detail. The
Recipes page now defaults to a Cookbooks view with a floating +
replacing the old header New button, and a cookbook is a real named
list a recipe can be filed into or out of without ever duplicating or
deleting the underlying recipe.

Four small shared sheet components came out of this phase that C2 (tags)
is expected to reuse directly rather than rebuilding: `RadioSheet` (pick
one of a few things — the view toggle, the sort choice), `ActionSheet`
(a "+"/"⋯" menu), `ConfirmSheet` (the count-confirm dialog for the
plan's two deliberate single-tap-delete exceptions), and `TitleSheet`
(name-this-thing, used for both create and rename). None of them are
cookbook-specific by construction.

*(C2 was indeed next, and C2–C8 all shipped across the following
sessions — see the wrap-up immediately below.)*

---

## Where things stand (end of the 2026-08-08 sessions) — READ THIS FIRST

The single most current summary. Every "obvious next steps" list earlier
in this file is an older snapshot kept for narrative; this one supersedes
all of them.

**The Recipes v2 plan is closed. C1–C6 and C8 all shipped, are committed,
and are pushed to `origin/main` — so they're live on Vercel. C7 (Photos)
was dropped, not deferred** (see its bullet in the plan for the full
reasoning: it required Vercel Blob, a paid service, and Bryce chose not
to take on the billing).

**A push-state lesson worth keeping, because this is the third time this
project has hit it.** All seven Recipes v2 commits sat **unpushed** at
the end of the implementation sessions — local `main` was 7 commits ahead
of `origin/main`, so the family's live app was still serving the pre-C1
recipe pages while the local repo looked finished. Found by running
`git log origin/main..HEAD`, not by re-reading source. The two prior
instances were the forgotten voice push (V1 "failed" its production
adversarial check purely because Vercel was serving an old build) and
M1's `meal-plan/page.tsx` committed as a pure rename with no content.
**The standing rule: after any session that claims a feature is done,
check `git log origin/main..HEAD` before believing it's live.** "It works
locally" and "the family has it" are different claims.

**What the family actually has now, beyond v1 recipes:** cookbooks
(named lists with viewer share links), tags (including the four
meal-slot tags that ground the meal-plan AI), star ratings, cooked
history, a filter bar (search / tags / total time / cooked / rating /
sort), one-tap "add this recipe to the meal plan", "add ingredients to
groceries" with an inventory-aware review sheet, and AI nutrition
estimates with staleness detection.

**Verified clean at push time:** `npx tsc --noEmit`, `npx eslint .`, and
`npm run build` all pass with zero output. `npm test` (the
`recipeTimeFilter` / `recipeFilters` unit tests C4 added) was clean at
its own commit.

### Genuinely open, nothing scheduled

- **V3, the Alexa skill** — by a wide margin the oldest outstanding
  item, queued since before the Expiring branch. Blocked only on Bryce
  creating a **free** Amazon developer account (walkthrough style, like
  Neon and Vercel). The `/api/voice` endpoint it needs already exists
  and is proven in production — Siri uses it daily. Both can run at
  once; they're thin clients over the same endpoint.
- ~~**A real handwritten recipe card through photo import**~~ — ✅ tested
  against genuine input, works.
- **A new branch.** Calendar, Chores, Lists, and Family profiles are
  all genuinely unstarted, and **four nav-bar destinations are still
  placeholder pages** (Calendar, Chores, Lists, plus the dashboard
  beyond its Kitchen card). See "Planned, not yet built" above for the
  rough order Bryce laid out — Calendar deliberately last, as the
  hardest.
- **Smaller, long-standing:** Inventory's collapse state doesn't
  persist across reloads; Shopping never got Inventory's collapsible
  grouping; nothing remembers a *specific* item's usual store (only one
  global "last store picked").
- **The structured-ingredients tripwire is at 3 of 4.** Recipes v2
  worked around the absence of structured ingredients three times
  (add-to-groceries, nutrition, and deferred servings scaling). Per the
  plan's own rule: if a fourth feature needs it, stop working around it
  and build it.

### Two operational facts a fresh session must not forget

1. **The dev database IS the live family database.** Never run
   `npm run db:seed` or `npm run db:reset` — they would destroy the
   household's real 477-item inventory. Test data comes only from the
   scoped, fingerprint-matched `db:seed-*` / `db:clean-*` scripts.
2. **Local dev and production use different `FAMILY_PASSWORD` values on
   purpose.** The `.env` one is a deliberate throwaway; the real one
   lives only in Vercel's env vars.

---

## Session note, 2026-08-08: a bug review of C2–C8, and four fixes

After Recipes v2 was pushed, the whole C2–C8 range (`851fed0..38c7f38`)
got a dedicated review pass. The security-shaped things all held up when
checked rather than assumed: all 12 new Server Actions really do open
with `getVerifiedSession()`, both public share pages use explicit
`select` allowlists, the proxy prefixes are the narrow ones, and
`addIngredientsToGroceries` re-validates client-supplied `pantryItemId`
against the database instead of trusting it. Four things were worth
fixing, and they're now fixed.

**1. `applyRecipeFilters` had no committed tests — and this file claimed
it did.** The C4 entry above says the filter composition was "proven
independently at the pure-function level (8 additional `node:test`
cases)". Those cases were real when they ran, but the file was never
committed: `git log --all` finds no `recipeFilters.test.ts` in history,
and `npm test` was running only the 17 time-parser tests. So the piece
of C4 doing the actual work — tags/time/cooked/rating narrowing the same
list as an AND, search overriding sort, three sort modes — had zero
regression protection while the plan record said otherwise.
`src/lib/recipeFilters.test.ts` now exists with **16** tests built on the
same A/B/C/D fixture documented in C4, including the plan's own worked
example (Dinner + Under 30 + 4★ → exactly one recipe). `npm test` is 33
passing.
**This is the fourth time this project has been bitten by the gap
between "it worked" and "it's committed"** — after the forgotten voice
push, M1's `meal-plan/page.tsx` committed as a content-free rename, and
the seven unpushed Recipes v2 commits. The other three were caught by
checking git rather than re-reading source; this one only surfaced
because a review went looking for the test file by name. Worth
remembering that a verification claim in this file is not evidence the
verification still exists.

**2. Four actions threw instead of returning the house `{ error }` shape
when their row was already gone.** `renameTag`, `deleteTag`,
`setRecipeRating`, and `markRecipeCooked` called `update`/`delete`
straight on a client-supplied id, so a row deleted on the other phone
produced an unhandled Server Action error while the optimistic UI kept
the stale value on screen. Two phones share one account here, so this is
reachable. New `src/lib/prismaErrors.ts` holds `isMissingRowError`
(P2025), and all four now handle it.
**Deliberately a catch, not a `findUnique`-then-update:** reading first
costs a second round trip (which the performance section above cares
about) *and* still leaves a window where the row vanishes between the
two queries — letting the write fail is both cheaper and actually
race-free. `deleteTag` treats "already gone" as **success**, not an
error, since that's the outcome the caller wanted; the other three
return a real message.
**P2025 was verified, not assumed:** a throwaway script ran all four
operations against the live database using an id that cannot exist, so
every `WHERE` matched zero rows (the P2025 throw is itself the proof
nothing was touched). All four returned `code=P2025` with
`isMissingRowError` true. Counts unchanged; script deleted.

**3. `findOrCreateTag`'s comment overclaimed.** It said the server-side
check meant two people typing different casings "at nearly the same
moment still land on one row." It's a read-then-write with no
transaction and the database unique is deliberately case-sensitive, so a
true race can still create both. The comment now states the real,
weaker guarantee and says why the fix isn't worth it at household scale.
The code is unchanged — this was a docs correctness fix.

**4. `TagSelectSheet`'s delete ignored the action's result.** It called
`deleteTag` and ran `onDeleted` unconditionally, so a failure would drop
the tag from the UI while it survived in the database — on the
destructive path, which is the worst place for a silent failure. It now
checks the result, and the delete view gained an error block (it had
none, so a `setError` there would have rendered nothing).

`tsc`, `eslint`, `npm test` (33), and `npm run build` all clean.

---

## Session, 2026-08-28: V3 built and gated — then Alexa+ moved the goalposts

The full story matters here, because the outcome is "blocked by Amazon,"
not "failed" — and a future session should be able to pick it up without
re-deriving any of it.

**V3 Phase A shipped and is live.** `/api/alexa`
(`src/app/api/alexa/route.ts`) is a classic-skill endpoint mirroring
`/api/voice`'s gate-first shape with strictly stronger auth: Amazon's
request signature + cert chain + timestamp (via `ask-sdk-express-adapter`'s
standalone verifiers — Amazon-maintained, current Signature-256 scheme),
then a skill-ID check (`isFromOurSkill`, `src/lib/voice/alexa.ts`) that
rejects a validly-signed request meant for someone else's skill. Gate
order: `request.text()` raw bytes (never `request.json()` first — the
signature is computed over the exact bytes) → signature + timestamp →
`JSON.parse` → `ALEXA_SKILL_ID` present (fail-closed 500 if unset) →
`isFromOurSkill` → dispatch. `parseTranscript`/`applyActions` are
unreachable until every gate passes. 19 new unit tests (suite 33 → 52,
`package.json`'s test glob widened to reach `src/lib/voice/`);
`alexa/interaction-model.json` committed (custom `CatchAllText` slot, NOT
AMAZON.SearchQuery, which forbids a bare `{command}` sample and whose
carrier phrases would strip the verb). Run as an Avengers mission
(`.avengers/missions/mission-3-alexa-endpoint.md`): Vision and Captain
both PASS on pass 1, zero blockers; STRUCTURE.md gained two amendments
(an `alexa/` layout row; Route-Handler-as-guard wording). One
Fury-caught subtlety worth keeping: `Object.fromEntries(headers)`
lowercases header names, and the one bug the local curl suite
structurally cannot catch is a case-sensitive header lookup rejecting
*genuine* traffic — verified safe by reading the SDK source, which
lowercases before comparing.

**Phase B went fine until the positive control.** Bryce created the
developer account (his own Prime account — correct, since dev-mode
skills only reach Echoes on the owner's account), created the skill,
pasted the model, configured the endpoint (`.vercel.app` = the wildcard-
certificate dropdown option), set `ALEXA_SKILL_ID` in Vercel, enabled
Development testing. Two findings along the way:

1. **The dev-console simulator sends UNSIGNED requests** — a documented
   Alexa quirk (alexa-skills-kit-sdk-for-nodejs issue #533). Our
   endpoint's "Missing Certificate" 400s against the simulator were the
   signature gate *working*. A temporary header-names diagnostic proved
   Amazon was reaching the endpoint; it's been reverted.
2. **The real blocker: the household is on Alexa+** (auto-upgraded via
   Prime; the app shows "Alexa+ Preview"), and **Alexa+ does not run
   classic custom skills** — the Echo says "launching marshee isn't
   supported on this device" without ever calling the endpoint. The
   family *likes* Alexa+ and won't opt out.

**The app was meant to be renamed: the skill (and eventually the app) is
"Marshee"**, Bryce's final name choice. The interaction model's
invocation name is `marshee` (it passed Amazon's single-word validator —
coined names are allowed). The in-app rename (Marsh HQ → Marshee,
user-facing strings only, per the Marsh Hub precedent) **shipped
2026-08-31** as part of the Marshee rebrand — see that session's entry at
the end of this file.

**V3b was designed and approved: Marshee as an Alexa+ *add-on*** — the
replacement system, where the developer runs an MCP server (Streamable
HTTP) and Alexa+'s own AI reasoning calls its tools from natural speech,
no invocation name. The full plan (research citations, LWA account-
linking security design with a user-id allowlist, tools mapping straight
onto `applyActions` with NO Haiku call — Alexa+ does the NLU, so this
client would be free per-command) lives at
`.avengers/plans/v3b-alexa-plus-addon.md`, in the repo. **Its B0
feasibility gate failed: the Alexa+ Developer Console shows Bryce
"coming soon" — add-on building is currently select-partners only.**
Zero V3b code was written; that was the gate's whole job.

**Where voice stands now:**
- **Siri (V2): the working voice path.** Nothing changed; the family
  uses it daily.
- **`/api/alexa`: live, gated, dormant.** Keep it — proven and harmless;
  useful if a non-Alexa+ device appears or Amazon changes course. The
  "Marshee" classic skill stays parked in the console; `ALEXA_SKILL_ID`
  stays in Vercel.
- **V3b: blocked externally, plan ready.** The unblock signal: the
  console's "coming soon" tile becoming a real Alexa+ Developer Console,
  or Amazon announcing MCP add-on GA. Worth a periodic check — the docs
  (developer.amazon.com/docs/alexaplus/add-ons/) were updated July 2026,
  so it's moving.
- The wall-tablet mic remains the other future thin client; Captain's
  NOTE stands that a third client should hoist the shared caps/strings
  into `src/lib/voice/` rather than copying them a third time.

---

## Session, 2026-08-28/29: per-person family accounts (P1 + P2 shipped)

**The single shared family password is retired.** Everyone signs in as
themselves. This is the foundation Bryce asked for ahead of Calendar,
Chores, and Tasks — "a fully developed professional grade app with
logins, settings, permissions."

Full plan: `.avengers/plans/family-accounts-v1.md`. Missions:
`.avengers/missions/mission-4-accounts-p1-foundation.md` (schema) and
`mission-5-accounts-p2-cutover.md` (the cutover). **P3a/P3b (role gates,
Settings, Manage Family), P4 (device mode), and P5 (voice attribution)
are planned but NOT built.**

**Bryce's four foundation decisions — don't relitigate:** build on the
existing session/DAL (no Clerk, no vendor); two tiers (login accounts +
non-login profiles for little kids); "parents manage, kids participate";
wall tablet as a device-role account.

**The real family, bootstrapped by Bryce himself** via
`npm run db:bootstrap-users` (passwords typed in his own terminal, never
through an agent): **Bryce (admin), Emily (parent)** with logins;
**Ledger, Eleanor, Lucy (kid profiles)** — real people for future chores
and calendar, no password, cannot sign in.

**Schema (P1, additive):** `User` — **no `kind` column**; whether someone
can log in *is* whether `passwordHash` is null, so the two can never
drift, and upgrading a profile to an account is one UPDATE. Device mode
is `role: "device"` on the same axis rather than a second concept.
`LoginAttempt` for rate limiting (DB-backed — in-memory counters don't
survive serverless). Nullable attribution FKs on `VoiceChange.userId`
and `GroceryItem.addedById`. Per-person recipe ratings, meal plans, and
irregularity dismissals stay **household-wide** in v1, deliberately.

**Auth (P2):** session payload v2 with a version claim — `decrypt()`
rejects anything without `v === 2`, which retired every pre-cutover
cookie at deploy with **zero DB reads**, so `proxy.ts` stays DB-free.
`getVerifiedSession()` kept its exact shape (all 52 actions compiled
untouched — the payoff of their always having used it as a bare boolean
gate) but is now backed by a `cache()`-deduped user lookup, so
deactivation stops writes on the next request. Pages still render until
cookie expiry; **rotating `SESSION_SECRET` in Vercel is the hard stop
and is the documented global-sign-out runbook.** bcryptjs cost 11.
Rate limiting: 5 failures/user, 20/IP, sliding 15 min, checked **before**
bcrypt; refusals deliberately unrecorded so a lockout can't be extended
for free.

**Two gate blockers worth remembering, neither cosmetic:**
1. **The account menu rendered inside the header, which carries
   `backdrop-blur`** — and per CSS spec a `backdrop-filter` element
   becomes the containing block for `position: fixed` descendants. The
   sheet resolved to the header's 72px strip; the card sat at
   **y = −137** with the identity block and close button off-screen.
   Screenshots looked fine; measuring didn't. Fixed with `createPortal`
   to `document.body`, commented so nobody "cleans up" the portal back
   into the bug. **It is the only portal-using sheet in the app, because
   it's the only one under a `backdrop-filter` ancestor** — the other
   ~15 live under `<main>` and must NOT be converted.
2. **`loginRateLimit.ts` skipped `server-only` while importing `db`, and
   its test file imported it — so `npm test` constructed a PrismaClient
   pointed at the live family database.** Lazy connection meant nothing
   queried, but one future test would have reached real household data
   from the test runner. Split into an import-free
   `loginRateLimitPolicy.ts` (what the tests import) and a
   `server-only`-guarded wrapper. **General rule, now in STRUCTURE.md:
   any lib module importing `db` carries the guard; when a module needs
   both a testable policy and a DB read, split it.**

**Verified adversarially:** a v1 household JWT signed with the real
current secret — the exact cookie every family member held — refused; a
deactivated user's valid cookie stopped by the **DAL alone**, which the
DB-free proxy structurally cannot do (the strongest evidence the two
layers are independent, not redundant); DB outage fails **closed**;
wrong password / forged userId / passwordless profile / deactivated all
return byte-identical copy. Positive control first in every suite.

**Process lesson: gates that create credentialed test data must run
serially, or own disjoint self-identifying accounts.** Running Vision
and Strange in parallel put a login-capable `ZZZ` account on the real
login page; Vision blocked on it and correctly refused to delete another
agent's in-flight rows. With P3a's role gates not yet in place, that
account would have had full write power had it reached the cutover.

**⚠️ Standing facts a fresh session must not miss:**
- **`FAMILY_PASSWORD` is dead in code but deliberately still set in
  Vercel** for ~7 days from 2026-08-29 as a rollback lane. Deleting it
  from Vercel and `.env` is a separate later step.
- **Do NOT create a login for any kid until P3a ships** — role gates
  don't exist yet, so a kid account today would have the same powers as
  Bryce. The three kid profiles are safe precisely because they have no
  password.
- **Never write a clean/reset script for the `User` table** (STRUCTURE.md
  danger register). `bootstrap-users.ts` has no counterpart by design.
- ~~The app rename **Marsh HQ → Marshee** is still queued and unbuilt.~~
  ✅ **Done 2026-08-31**, with the full rebrand (palette, typography, logo).
  **One thing the rename could NOT reach: Bryce's Siri Shortcut is named
  on his phone, not in this repo.** The `/api/voice` endpoint is unchanged
  so the shortcut keeps working exactly as before — but its spoken trigger
  is whatever he named it, and only he can rename it in the Shortcuts app.
  Same for the parked Alexa skill, whose invocation name is already
  `marshee` in `alexa/interaction-model.json`.

---

## Session, 2026-08-31: the Marshee rebrand (shipped to production)

**Marsh HQ is now Marshee**, rebranded end to end and live for the family
(commit `b9fa618`, verified against the production URL, not assumed —
production served the *old* build for ~30s after the push, which is exactly
the "pushed ≠ deployed" trap this file records twice before).

**Bryce supplied real vectors himself**, which changed the plan: no tracing
was needed. `brand/` now holds the three masters and is the source of truth
— icons and components are generated from them. See the Brand section in
DESIGN.md and the `brand/` row in STRUCTURE.md for the rules; the short
version is **recolor via `fill`, never redraw**, and if a new logo file
shows up, overlay it against the master first (the "Sage Wordmark" he sent
turned out to be identical artwork, only recolored, so it became a
`--brand-sage` token instead of a second copy of the paths).

**The rebrand itself was 13 token values.** 821 token-based color utilities
across 109 `.tsx` files followed automatically, and there are zero hardcoded
Tailwind palette colors in `src/`. The colors-named-by-job rule, followed
since the first week of this project, is what made a whole-app rebrand a
one-file change. Worth remembering the next time that rule feels like extra
ceremony.

**Three bugs found that had nothing to do with branding**, all by *measuring
what a comment merely claimed*:
1. The regenerated `favicon.ico` embedded **RGB** PNG frames; Turbopack's
   ICO decoder requires RGBA, and since favicon is a Next file convention,
   it 500'd **every route**. Headless Chrome writes RGB when the page
   background is opaque — convert with PIL before assembling an `.ico`.
2. **Three `AVATAR_COLORS` failed WCAG AA** against the white initials
   rendered on them (green 3.30:1, amber 3.19:1, teal 3.74:1) while
   `AvatarBadge`'s comment said legibility was "verified visually against
   all 8 colors." All eight retuned; every one ≥4.6:1, min pairwise ΔE 23.
3. **Inventory rendered Out and Low on the same `warn-soft` background**, so
   only text hue separated them — and those hues are **1.20:1** apart,
   invisible to a color-blind reader. Out now uses `danger-soft`, matching
   what `ExpiringRow` already did. The file's own comment already said "Out
   and Low are different problems."

**The `* 2.ts` files are iCloud, not a build race — correcting this file.**
The C4 and C6 entries above attribute transient `.next/types/* 2.ts`
duplicate-identifier errors to a dev-server/build race. That diagnosis is
wrong. This repo sits in `~/Documents`, which macOS syncs to iCloud Drive,
and " 2"/" 3" is iCloud's conflict-copy naming. It interfered three times in
this session and also produced `src/app/(app)/layout 2.tsx`. When a
typecheck fails on duplicate identifiers, run
`find . -path ./node_modules -prune -o -name "* [0-9].*" -print` and delete
the strays first. **The real fix — not yet done — is moving the repo out of
`~/Documents` or excluding it from sync.**

**One thing the rename could not reach:** Bryce's **Siri Shortcut** is named
on his phone, not in this repo. `/api/voice` is untouched so it still works,
but its spoken trigger is whatever he named it, and only he can change that
in the Shortcuts app.

### Next up — the dashboard (Bryce's own ask, 2026-08-31)

*(✅ Built 2026-09-01 — see "the dashboard became four data tiles" at
the end of this file. Kept below as the record of what was asked for and
why; the constraint in the last paragraph still holds for future tiles.)*

**Bryce asked to be reminded that optimizing the dashboard is what he wants
to build next.** In his words: the most highly used functions should live on
a "super clean dashboard that also serves as quick links to things that we
use the most."

`/` currently shows only live counts and a Kitchen card — it's the least
developed surface in an app whose branches are now deep. Every branch got
built before the front door.

The question the code can't answer is *which* functions the family actually
uses most; that's Bryce and Emily's real habits, not a guess. But the app
can partly answer it from real data (`VoiceChange` logs what voice touched,
`GroceryItem`/`PantryItem` timestamps show what gets edited), so proposing
two or three candidate layouts beats opening with an open-ended question.
Constraint that still holds: **the bottom nav reaches branch roots only and
never changes contents**, so the dashboard is a tiles/quick-links surface
like a landing page — not a second nav bar.

---

## Session, 2026-09-01: the dev/prod database split (Neon branching)

**The single most dangerous fact about this repo — "the dev database IS the
live family database" — is retired.** Local dev now runs against a Neon
`dev` branch, a copy-on-write clone of production. Bryce created the branch
in the Neon console (auto-delete deliberately set to never — the dialog
defaults to "After 1 day," which would have silently deleted it overnight);
the connection string travelled clipboard → `.env` via `pbpaste`, never
through chat, preserving the never-in-chat rule from Phase 2.

**Isolation was proven, not assumed:** a synthetic write on dev moved dev
467→468 while production stayed 467 and a direct read-only query against
production found zero matching rows; cleanup returned dev to exactly 467.
The running app was then verified against the branch (dashboard reads the
dev copy's real counts; sessions survive, since auth doesn't depend on
which branch you read).

**What this changes operationally** (danger registers in AGENTS.md and
STRUCTURE.md both updated):
- The production URL lives ONLY in Vercel's env vars now. `.env` keeps it
  as a commented reference line; the active `DATABASE_URL` is the dev
  branch. A backup of the pre-split `.env` sits at
  `.env.backup-preneonsplit` (gitignored).
- `db:seed`/`db:reset` stay forbidden by default — they'd wipe the
  realistic dev copy. The sanctioned refresh is a **branch reset** in the
  Neon console (Branches → dev → Reset from parent), which re-clones
  production instantly. Do that whenever dev data drifts too far stale.
- The dev branch holds a real snapshot of family data, password hashes
  included. Write-isolation is not privacy — treat dev data as private.

**Open item this split creates — migrations no longer reach production
automatically.** *(✅ Resolved 2026-09-01 — see "migrations reach production
again" at the end of this file. Kept as written so the reasoning survives.)* Until now, migrating locally migrated prod, because they
were the same database. The next schema change must apply to production
deliberately: either wire `prisma migrate deploy` into the Vercel build, or
run it once against the prod URL at release time. **The first post-split
migration will silently leave prod behind if this is forgotten** — set up
the deploy-time step before or with that migration.

**Two small gotchas recorded for reuse:** (1) the old `.env` line wrapped
its URL in double quotes — dotenv strips them, but shell extraction
(`grep | sed`) does not, and the stray quote produced a baffling "Can't
reach database server at base" from the pg parser; strip quotes when
pulling values out of `.env` by hand. (2) A tsx script outside the repo
can't resolve the project's bare imports (`dotenv/config`,
`@prisma/adapter-pg`) — run one-off DB scripts from the repo root with
`npx tsx --env-file=.env`.

**Also this session:** the repo became self-contained for any-device work —
the Avengers (5 agent definitions + the /avengers skill) are committed into
`.claude/`, and AGENTS.md carries the danger register so non-Claude tools
(Codex reads AGENTS.md, not CLAUDE.md) see it. Next steps on the
professionalization path, in order: a GitHub Actions gauntlet on PRs +
branch protection on main, then trying claude.ai/code from other devices.

---

## Session, 2026-09-01 (continued): CI + branch protection

**`.github/workflows/ci.yml` runs the gauntlet on every PR and every push
to main** — the same four commands every mission always had to pass, now
enforced by a machine that can't forget. Deliberately zero secrets in CI:
env values are dummies, which works because the gauntlet never touches a
real database (the loginRateLimitPolicy split keeps tests pure, and every
page is force-dynamic so build renders no data). This was verified locally
under exact CI conditions — .env hidden, dummies exported — before the
workflow was ever pushed, not assumed from reading the scripts.

**With branch protection on `main` (GitHub ruleset), the workflow for ALL
changes — every agent, every tool, every device — becomes:**

1. Branch (`git checkout -b <topic>`)
2. Commit there; push the branch
3. Open a PR (Vercel builds a preview deployment automatically)
4. The Gauntlet check must be green
5. Merge → push to main → Vercel deploys production

**Direct pushes to main are blocked, including for admins.** The escape
hatch for a genuine emergency is deactivating the ruleset in GitHub
Settings → Rules — deliberately a human-only step. The four-times-bitten
"finished but unpushed" lesson now has a corollary: finished-but-unmerged.
The shipped check becomes "is the PR merged and the deploy live," not just
"is it pushed."

**Postscript, same session — the PR loop is now fully automated.** Branch
protection was verified in both directions (a probe direct-push to main was
rejected citing both rules; PR #1 with a green Gauntlet merged cleanly),
and the GitHub CLI (`gh` 2.98.0, checksum-verified against the official
release, installed to `~/.local/bin`, authenticated as brycemarsh6 via
one-time device flow) closes the loop: Claude creates PRs, watches checks,
and merges from the terminal. Bryce's workflow is unchanged — he asks,
Claude handles branch → PR → green → merge. GitHub.com is no longer a
required stop for routine work.

---

## Session note, 2026-09-01: the repo moved out of iCloud

**The repo now lives at `~/Developer/family-hub`, not `~/Documents/family-hub`.**
Documents is synced to iCloud Drive, and iCloud does not understand git: when
it saw the same file change in two places it wrote conflict copies —
`layout 2.tsx`, `cache-life.d 2.ts`, `cache-life.d 3.ts` — which break
`tsc` with duplicate-identifier errors. It interfered three separate times in
two days, and **this file misdiagnosed it twice** (the C4 and C6 entries call
it a build/dev-server race; it never was). `~/Developer` is not synced, so the
class of problem is gone rather than worked around.

The move was `mv` after confirming a clean tree (0 uncommitted, 0 ahead, 0
behind, 0 stashes). Gitignored files that git could never have restored —
`.env`, `.env.backup-preneonsplit`, `.claude/settings.local.json` — came along
with the directory. `.next` and `node_modules` were deleted first (1.8G → 17M,
both regenerable), then `npm ci` + `npx prisma generate` at the new path.
Gauntlet green afterward: tsc, eslint, 106 tests, build. GitHub and Vercel are
entirely unaffected — neither knows or cares where the working copy sits.

**Two things a fresh session should know:**
- **Claude Code keys its per-project state to the folder path**, so
  `~/.claude/projects/-Users-brycemarsh-Documents-family-hub/` (memory files
  and transcripts) was copied to `…-Users-brycemarsh-Developer-family-hub/`.
  The old directory is left in place, harmless, in case anything else refers
  to it.
- **A session started before the move stays anchored to the old path** — its
  preview/dev-server tooling looks for `~/Documents/family-hub` and fails.
  Restarting Claude Code from `~/Developer/family-hub` fixes it. Nothing is
  wrong with the repo when that happens.

**On local vs. GitHub, since the question came up:** the local clone falling
behind is normal and is what `git pull` is for — multiple clones drifting and
re-syncing on demand is git's design, not a problem. That was never the reason
to leave iCloud. The reason is that iCloud was trying to do git's job, badly,
on top of git already doing it correctly.

---

## Session, 2026-09-01: the dashboard became four data tiles

**The front door is real.** `/` was a single Kitchen card with three counts
— the least-developed surface in an app whose branches had all grown deep.
It's now four tiles reading live data: **Today's meals** (wide, top),
**Inventory** and **Grocery** side by side, **Recipes** (wide, bottom).
Shipped as Avengers mission-7, merged as PR #3. The mission file
(`.avengers/missions/mission-7-dashboard-tiles.md`) and the approved plan
(`.avengers/plans/dashboard-tiles.md`) are the authoritative record; this
entry is the summary.

**Provenance of this entry, since it matters for how much to trust it:**
it was written *after* the fact from a Claude Code **web** session,
reconstructed from the mission file and the commit messages — not by the
session that did the build. Everything below traces to those artifacts.
Anything that lived only in the original session's memory is not here, and
the mission file's gate ledger is the deeper record. That the
reconstruction was possible at all is the strongest evidence so far that
the Avengers' habit of writing contracts and gate verdicts into the repo
is worth its cost: the work was recoverable a day later, from a different
device, by a session that had never seen it.

**Decisions already made with Bryce — don't re-litigate these:**

- **Today's meals is wide and on top** because it's the only tile whose
  content changes daily. Inventory and Grocery pair 2-up; Recipes goes
  wide at the bottom.
- **The old Kitchen card is replaced entirely, not demoted.** The bottom
  nav still reaches the Kitchen branch, so nothing is orphaned — and the
  standing rule holds: the nav reaches branch roots only, so the dashboard
  is a tiles surface like a landing page, never a second nav bar.
- **Badges only where a count means "go look"** (Inventory, Grocery),
  inheriting `BranchTile`'s badge philosophy rather than inventing a
  second one. The whole tile is the tap target; no inner interactive
  elements.
- **Inventory shows the 2–3 *most urgent* low item names**, Out first.
  There is no "staples" concept in the data to rank by — flagged to Bryce
  as a someday feature needing a per-item flag, not faked in the meantime.
- **More tiles are expected** ("in the future I will be adding more"), so
  `DashboardTile.tsx` is a shared shell from day one rather than four
  hand-rolled cards.

**The `(home)` route group, and why it exists:** the dashboard needed its
own tile-shaped `loading.tsx`, but `(app)/loading.tsx` is simultaneously
the dashboard's Suspense boundary *and* the catch-all for calendar,
chores, lists, and settings. Two `loading.tsx` can't share a segment, and
reshaping the shared one would mis-shape four other routes. A route group
gives `/` a private boundary; route groups are URL-invisible, so the path
is unchanged. `(app)/loading.tsx` stays exactly as it was for everyone
else.

**One new data pattern, owned by a comment in the page:** the meal query
fetches plans with `weekStart` inside `[serverNow − 8d, serverNow + 8d]`.
The server clock is used for **window tolerance only, never for "today"** —
the ±8 days is wide enough to always contain the client's true current
week despite the Vercel-UTC / Mountain skew, while *which* week is current
stays client-side in `useToday()`, per the rule established in M1. Kitchen's
tolerated server clock is a different thing (an expiring window), which is
why this one needed its own justification rather than citing that
precedent.

### What the gates caught — the strongest pass either has produced

Both gates BLOCKED on pass 1 (Vision 1 blocker, Strange 2) and both PASSED
on pass 2. Three findings are worth carrying past this feature:

**1. Both gates independently found the same defect, from opposite
directions.** The meals tile shifted the page ~16px the moment `today`
resolved — Strange by measuring rendered rows in a browser, Vision by
reading the compiled CSS (`h-4` placeholder = 16px vs a `text-sm` resolved
line box = 20px). Two methods, one bug, on a contract that had promised
"fixed min-h so no layout shift" **in writing**. A promise in a contract is
not a property of the code, and this is the clearest demonstration yet that
the two gates aren't redundant.
The fix went further than either asked: `h-5` is pinned on the row `div`
itself, so row height no longer depends on its children in either branch —
the frames are equal **by construction rather than by coincidence of child
metrics**. Vision explicitly noted this is stronger than its own
suggestion. Worth the same treatment anywhere a loading and a resolved
state must agree.

**2. A browser found what no amount of reading could: the icon on
Inventory and Grocery was flex-crushed to *zero width* at 375px.** A
half-width tile's header has ~131px; icon + title + badge want ~161px, and
flex resolved the overflow by erasing the icon entirely. Two of four tiles
silently lost their icon **on the exact screen DESIGN.md names as the
target**, while rendering perfectly on a laptop. Fixed with `flex-wrap`
plus a `shrink-0` icon slot, so the badge drops to its own line instead.
This is the recurring lesson of this project stated once more: verify at
375px, in a browser, or you are verifying the wrong device.

**3. Skeleton heights were guessed, not measured — the precise failure
skeletons exist to prevent.** The meals block was `h-56` (224px) for a tile
that renders at 164px, so the page snapped up ~60px on every cold load.
All four now carry measured heights (164/182/182/108). `h-56` survives only
inside `loading.tsx`'s own comment, as the record of what went wrong.
**A skeleton whose height you didn't measure is a layout shift you
haven't noticed yet.**

**The design question the mission was least sure about, and Strange passed
it:** an unplanned day renders four "—" rows rather than collapsing to a
single "Nothing planned today" line (which the plan originally specified,
and which left ~150px of blank space on the app's most prominent tile).
It reads as honest rather than broken because the app now has two distinct
vocabularies here — **loading is grey bars, *nothing* is a crisp glyph** —
and a genuine failure throws to the error boundary rather than rendering
dashes. Worth reusing: an empty state and a loading state must not be able
to be mistaken for each other.

**One latent consequence, deliberately written into the code rather than
left to be discovered.** The badge-wrap fix dropped the `ml-auto` that used
to pin a badge right. Neither wide tile has a badge today, so nobody can
see it — but a future badge on a wide tile would sit inline after the
title, and the obvious "fix" (re-adding `ml-auto`) would silently bring
back the crushed icons. `DashboardTile.tsx:52-59` carries the explanation
so whoever adds the first one **decides** instead of discovering. This is
the house pattern for a trap you can't currently trigger: comment it where
the next person will stand, not in a plan file they won't read.

**Also fixed on the way through:** an unreachable `count > 0` filter in
`dashboard.ts` (Vision); "Amazon 2" orphaning a bare "2" across a line
break (both gates), joined with a non-breaking space; and the plan file
itself reconciled with what shipped — it still described the superseded
"Nothing planned today" line and overstated that the dashboard's per-store
counts match Shopping's chips. **They agree only while nothing is checked
off:** the dashboard deliberately counts *unchecked* items ("to buy" means
still to buy), whereas `GroceryList.tsx` counts every row including
checked-but-not-put-away ones. That reconciliation matters — a contract
record that contradicts the code is worse than no record.

`npm test` went 90 → 106 (16 new cases in `src/lib/dashboard.test.ts`,
covering `todaysMeals` including the real Nov 1 2026 DST week,
`storeBreakdown`, and `urgentLowItems`). The test file **must** live in
`src/lib/` — the `npm test` glob only reaches `src/lib/*.test.ts` and
`src/lib/voice/*.test.ts`, so a test placed elsewhere silently never runs.

### The recording gap this entry closes

The dashboard shipped and merged, and CLAUDE.md was never updated — it
still read "Next up — the dashboard" while the dashboard was live. Found a
day later by a fresh session comparing `git log` against the file.

**This is the fifth time this project has been bitten by the gap between
doing and recording**, after the forgotten voice push, M1's
`meal-plan/page.tsx` committed as a content-free rename, the seven unpushed
Recipes v2 commits, and C4's `recipeFilters.test.ts` that this file claimed
existed and didn't. The first four were about code; this one is about the
memory itself, which is arguably worse — a wrong "next up" would have sent
the next session to build something that already exists.

The standing rule earned a companion: **after any session that claims a
feature is done, check `git log origin/main..HEAD`** — and now also **check
that the last session note describes the last merged PR.** The mission file
said DELIVERED; CLAUDE.md didn't know. Two records, one of them stale, is
the failure mode to watch for now that the Avengers write their own.

---

## Session, 2026-09-01: migrations reach production again (the Vercel build hook)

**The open item the Neon split created is closed.** `vercel.json` now sets
`"buildCommand": "npm run build:vercel"`, which runs
`prisma/migrate-on-production.mjs` and then `next build`. The script runs
`prisma migrate deploy` **only when Vercel's own `VERCEL_ENV` is
`"production"`** and exits 0 without touching a database in every other
case. So a merged PR that adds a migration now migrates the family's real
database as part of the production build, and nothing else does.

**Built from a Claude Code web session, with no database access and with
Vercel's, Prisma's, and Neon's doc sites egress-blocked** — so every claim
below rests on either a local test or the repo's own history, and the note
says which.

**Why the preview guard is essential, not decorative.** Bryce's screenshot
of Vercel's env vars shows `DATABASE_URL` scoped to **Production *and*
Preview**. Without the guard, opening a PR that adds a migration would have
applied it to production during the PR's *preview* build — before review,
before merge, and again if the PR were abandoned. `VERCEL_ENV` is unset on a
laptop and in CI, so both skip too; the Gauntlet's dummy `DATABASE_URL`
(which can't connect) is never reached. `npm run build` itself is
untouched, which is what keeps CI byte-identical.

**Why "the value is hidden" in Vercel — not a glitch.** The lock icon on
`DATABASE_URL` means it was created as a **Sensitive** variable. Vercel
never shows those again after creation, not even to the owner. So the
"does the hostname contain `-pooler`" question can't be answered from
Vercel at all. It was answered from evidence instead:

- **The pooled-connection concern is real in general** (Prisma Migrate
  needs a direct connection; a transaction-mode pooler can break it) **but
  it doesn't apply to this string.** Vercel shows it "Added Aug 3" and never
  updated; the deploy entry in this file records it as the same Neon string
  `.env` held; and that `.env` string successfully ran all **12** migrations
  via `migrate dev` through Aug 28. `migrate deploy` applies migrations over
  the same connection path. A string that applied twelve migrations will
  apply the thirteenth.
- **A one-command confirmation Bryce can run on the desktop, no secret
  shared:** `grep -c pooler .env.backup-preneonsplit` — `0` means direct.
- **If a pooled string ever does end up in Vercel:** add
  `directUrl: process.env.DIRECT_DATABASE_URL` to `prisma.config.ts` and a
  Production-only `DIRECT_DATABASE_URL` in Vercel holding the *production*
  branch's direct string. Paste the production branch's, not dev's — the
  wrong one would migrate dev and leave prod behind, the exact failure this
  hook exists to prevent.

**Verified locally under CI's dummy env:** `VERCEL_ENV` unset → skip,
exit 0. `VERCEL_ENV=preview` → skip, exit 0. `VERCEL_ENV=production`
against the unreachable dummy → Prisma **attempted** the deploy and failed
with `P1001`, exit 1 — the guard fires, and the failure is loud. Then the
full `npm run build:vercel` with `VERCEL_ENV` unset built all 30 routes
cleanly, and `tsc` / `eslint` / `npm test` (106) stayed green.

**What could NOT be verified from here, and is the required next check:**
the first **production** build after this merges. Its Vercel build log must
show the line `migrate-on-production: VERCEL_ENV is "production" — running
\`prisma migrate deploy\`` followed by Prisma reporting **no pending
migrations** — production already carries all 12, so the first run is a
no-op by design. That log line is this change's positive control; until
it's been read, treat the hook as installed but unproven. Bryce reads it in
Vercel → Deployments → the build's logs.

**Two consequences worth knowing:**

1. **"Additive-only migrations" is now load-bearing, not just hygiene.**
   The migration runs *during* the build while the previous deployment is
   still serving, so for a minute or so old code runs against the new
   schema. That's only safe because old code never references a column or
   table it doesn't know about. A destructive migration would break the
   live app for that window even if the new code were perfect.
2. **The failure runbook.** If a migration fails partway, Prisma records it
   as failed in `_prisma_migrations` and **every subsequent production
   build fails** until it's resolved — which is the right behavior (nothing
   deploys on top of a half-applied schema) but will look like "Vercel is
   broken." The fix is `prisma migrate resolve` (see the repo's own
   reference at `.agents/skills/prisma-cli/references/migrate-deploy.md`),
   run once against production, then redeploy. The previous deployment
   keeps serving throughout.

**One pre-existing thing this made visible, flagged not changed:** because
`DATABASE_URL` is scoped to Preview, every PR's preview deployment has
been running against the **family's real production data** since Aug 3 —
reads and writes. Not this change's doing, and not new, but a preview of a
half-finished PR is exactly the kind of build that shouldn't be able to
write to prod. The fix is a Vercel-console decision for Bryce: give
Preview its own `DATABASE_URL` pointing at the Neon `dev` branch (the same
string `.env` uses), so previews get realistic data with zero production
risk. Worth doing before the next real branch of work.

---

## Session, 2026-09-01: preview deployments moved off the production database

**Every Vercel preview deployment now reads and writes the Neon `dev`
branch, not production.** Bryce did this in the Vercel console (walkthrough
style, same as every other credential change in this project): the
existing `DATABASE_URL` was narrowed from "Production and Preview" to
**Production only**, and a second `DATABASE_URL` — the dev branch's
connection string, the same one `.env` uses — was added scoped to
**Preview only**. The string travelled Neon's Connect dialog → clipboard →
Vercel, never through chat. Confirmed by screenshot: two `DATABASE_URL`
rows, one tagged Production, one tagged Preview, both Secret.

**Why this mattered:** since Aug 3, every PR's preview deployment had been
running against the family's real data — a half-finished PR could write
to production before anyone reviewed it. Not a bug anyone had hit, but
exactly the kind of build that shouldn't be able to. Flagged in the
migrate-on-production entry above; closed here.

**Two Vercel UI details worth knowing the next time an env var changes:**

1. **The Environments dropdown refuses to go to zero.** Unchecking the only
   ticked environment does nothing. Either check the new one first and
   *then* uncheck the old, or hover a row and click its **"Only"** link,
   which selects that one and clears the rest in a single click.
2. **Vercel won't allow two variables with the same name covering the same
   environment.** So the existing row has to be narrowed *before* the
   Preview-only one can be added — do it in that order or the add fails.

**"A new deployment is needed" toast — dismissed on purpose, not
redeployed.** Production's value didn't change, only its scope, so a
production redeploy had nothing to pick up. The Preview value applies to
the next preview build automatically.

**A consequence that's an improvement, not a caveat:** previews now run
against the dev branch's *schema*. A PR that adds a migration will have had
`prisma migrate dev` run against the dev branch while it was being built,
so its preview matches its code. Under the old setup, that same preview ran
new code against production's *un*migrated schema and could error on a
column that didn't exist yet.

**Proof of isolation** — the same test the Neon split used: on this very
PR's preview deployment, the first one built against the dev branch, add a
grocery item named `ZZZ Preview Test`, confirm it does **not** appear on
the production shopping list, then delete it on the preview. Result
recorded below once Bryce has run it.

**Verified, 2026-09-01.** Bryce ran it on PR #7's preview — the first
deployment ever built with the Preview-scoped `DATABASE_URL` — and the
item added there did **not** appear on the real app. Writes on a preview
now land on the dev branch and nowhere else. (The first preview load was
slow: the dev branch's compute sleeps when idle and wakes on demand.
That's normal, and a small tell that you're on the dev branch.)

---

## Session, 2026-09-02: the Calendar branch began — K0 designed, K1 shipped

**Calendar is no longer a placeholder.** `/calendar` now opens on a real
Week view. Plan: `.avengers/plans/calendar-v1.md` (phases K0–K7). Mission:
`.avengers/missions/mission-8-calendar-k1.md` — 8 contracts, 11 gate
passes, all three gates PASS. Draft **PR #9**; **not merged** — Bryce looks
at the Vercel preview first.

### K0: designed from a Skylight walkthrough

Bryce chose **Skylight** as the reference and sent seven screens; every one
got an adopt / adapt / skip call, all logged in the plan. **Decisions not to
re-litigate:** each parent links their **own** Google account(s), so
linking is rows under a `User`, never a field on it; **sync direction is
per linked calendar** (his work calendar outbound-only so Emily can block
time without its appointments cluttering Marshee; personal two-way);
**sync is chosen per event** with the creator's two-way calendars
pre-ticked and the creating account recorded; kids' events live only in
Marshee; **tags, not event types** (Bryce's call, for cohesion with
Recipes, in their own table since the vocabularies don't overlap); and
**email import is dropped, not deferred** — a screenshot of an email is
already a photo import.

### K1: what shipped

`CalendarEvent` + `CalendarEventPerson` (an event belongs to **many**
people, which is what lets a card carry a colour band and avatar each);
three manager-gated actions; `src/lib/calendarDates.ts`; Week and Day as
one shared `DaySection`; `EventForm` (one form for new and edit, native
date/time pickers), `EventDetailSheet`, `CalendarHeader`, `ActionCircle`;
three routes; a measured loading skeleton; scoped seed/clean scripts.
Tests 106 → 135.

### The lessons worth keeping

- **The UTC/Mountain trap reached a write path for the first time.** The `+`
  button pre-filled and saved the **day before** the one tapped, *every
  time in production*: the page received the date as text from the browser
  and rebuilt it as a `Date` on the server, where a date crossing the RSC
  boundary is an **instant**, not a calendar day — midnight on the 5th in
  UTC is 6 PM on the 4th in Mountain. Worse, the page's own comment claimed
  the guarantee it lacked. **Never construct a calendar-meaningful `Date`
  server-side; pass the string and build it in the browser.** Eighth
  appearance of this trap here.
- **Three states, never two.** The calendar must distinguish loading (grey
  bars), genuinely empty (crisp dashed card), and **outside the loaded
  window** (solid, iconed, plain-language). Collapsing any pair produces a
  lie, and two separate gates found two separate versions of exactly that.
- **A day is "loaded" only when the window fully contains it.** The fetch
  window's end is the *server's* midnight = 6 PM Mountain, so treating a
  day as loaded by its **start** silently dropped every evening event on
  the 60th day out behind an honest-looking empty day.
- **`body.scrollWidth`, never `documentElement.scrollWidth`,** for
  horizontal-overflow checks — the html element clips and hides it. A gate
  caught itself under-reporting with the wrong one.
- **Opacity is the wrong tool for "already happened."** No value keeps a
  *tappable* past card honest (0.55 → 2.6:1; even 0.80 leaves the muted
  line at 3.5), and it collides with the app's disabled vocabulary. Drain
  **weight and tint** instead: `text-muted font-medium` + halved band
  alpha, badges at full colour, never `line-through`.
- **A regression test never seen red proves nothing.** Every date fix in K1
  had to fail before it passed, and the boundary fix was proven by
  reverting the files and rebuilding.
- **The DST tests had been vacuous in CI for their whole life** — `npm test`
  inherited the process timezone and CI runs UTC, where the Nov 1 2026 week
  never crosses a boundary. The script is now pinned to
  `TZ=America/Denver`, and the suite is proven green under UTC too so the
  pin can't mask a timezone-dependent test.
- **A contract may not authorize what the danger register forbids.** Fury's
  own C1 contract told the seeder to create and delete `User` rows; the
  builder complied and flagged it, and Captain blocked. A committed,
  rerunnable script is not the register's "one-off by-id" exception, and
  `displayName` has no `@unique`, so a name-scoped delete can catch rows it
  never created. **A scoped seed attaches to existing people and exits
  loudly when there are too few.** STRUCTURE.md amended accordingly.
- **Gates that create credentialed test data must run serially.** Two ran in
  parallel, collided, and one had to build a sibling database to verify a
  clean script — the exact lesson this file already carried from the
  accounts work.

### Cost and pacing, honestly

~11 hours elapsed, ~4.5 hours of actual work: **two session rate limits ate
~6h45m**, killing a gate mid-run twice. K1 spent ~3.5M subagent tokens,
~1.9M on gates. Two changes came out of it: **Strange and Captain now run
on Opus while Vision stays on Fable** (correctness gating is where raw
capability converts into findings; design and structure gating is
measurement and rule-checking — reasoning and the exit condition are in the
avengers SKILL.md), and **contracts must be sized so one dispatch survives
an interruption** — C4 alone was 529k tokens in a single dispatch.

### Where the Calendar goes next

> ⚠️ **Stale as of the next session (2026-09-02, below).** K2 shipped, and
> Bryce then walked through Google Calendar and re-shaped the roadmap — the
> K3–K7 *ordering* here is superseded by `.avengers/plans/calendar-v2.md`.
> The two K3 preconditions at the end of this section still bind. Read the
> final section of this file first.

K2 (Month view) is **already contracted** in
`.avengers/missions/mission-9-calendar-k2-month.md`, with boundaries and a
line budget measured against the real post-K1 tree. Then K3 filters/tags/
meal overlay, K4 recurrence UI, K5 AI import. **K6/K7 (Google) cannot
finish without Bryce** — they need a Google Cloud project and an OAuth
consent screen only he can create, so they build everything up to that
point and stop.

**Two binding preconditions for K3**, both from K1's gates:
`EventForm.tsx` sits at **exactly 350 lines**, the soft cap, so
`EventDateTimeFields.tsx` must be extracted **before** anything is added;
and tags and Sync-to each go in as **one sheet-opening row** below People
(never N inline toggles per connected calendar — a form whose length grows
with an external account count), because Title/When/Who must stay above the
fold.


---

## Session, 2026-09-02: K2 shipped, then Bryce re-shaped the whole calendar

Two halves. The morning finished **K2 (Month view + unbounded navigation)**;
the evening replaced the plan for everything after it. **Read
`.avengers/plans/calendar-v2.md` before touching the calendar** — it
supersedes the K3–K7 *ordering* in `calendar-v1.md` (their content survives,
re-slotted).

### K2 — what shipped (PR #10, open, unmerged, stacked on K1's PR #9)

Month view: Sunday-first six-week grid, spanning bars, up to three colour
bands per pill, "+N more", day-tap → Day view. Plus a typed period cursor
(`useCalendarPeriod.ts`) and **`calendarPaging.ts`** — the `?date=`/`?view=`
URL contract. Tests **135 → 180**, green under both timezones. Nine
contracts, eleven gate passes.

**The headline is not the Month grid. It's that the calendar only reached
±60 days, and Bryce found it on first contact with the preview.** The page
fetched a fixed window around today and *disabled the arrows* at its edge —
you could not book next June. Every gate had passed the "window-edge
honesty" machinery as *correct*, because it was: three distinct states,
adversarially verified twice. Nobody asked whether you could book a dentist
appointment in March. **Gates verify what the contract asked for; only a
person using the thing asks whether it's the right thing.** The fix (C6) made
the fetch window follow the viewed period, Google-style.

### The findings worth carrying (all reproduced, none argued)

- **`offsetDays` structurally could not express month paging.** Captain
  demonstrated rather than reasoned: stepping by "days in month" from Jan 31
  **skips February entirely**, and a Prev/Next round trip from Mar 31 loses 3
  days. A scalar day-offset cannot be a month cursor. `monthOffset` is now a
  separate integer, which makes Prev∘Next an exact identity by cancellation.
- **Size and reachability are different properties.** The floating **+**
  occluded a day number: every tap-target *size* check passed while tapping
  "20" opened the Add sheet. **Measure at the scroll position the user
  actually arrives at** — Fury's first measurement, taken scrolled-to-bottom,
  reported zero failures and would have shipped it. Strange then measured all
  three candidate fixes and found **two structurally incapable** of working
  (a 56px button is wider than a 44px cell; `position: fixed` cannot be moved
  by document padding).
- **Verified logic ≠ verified pixels.** Vision confirmed the multi-day bar's
  rounding flags were right; Strange measured the render and found **11.9px
  of page background between segments** — three week-long events drawing as
  21 discrete chips, 18 unlabelled. Both checks were honest; only one looked
  at the screen.
- **A fix can promote something to load-bearing without re-measuring it.**
  Hiding truncated titles made the pill's colour fill the *only* signal an
  event exists — at **1.00:1** contrast, all 55 pills. Same defect the
  rebrand session fixed once already. And `hidden` is `display:none`, which
  **strips an element from the accessibility tree**: Month at phone width
  exposed **0** event names versus 24 in Week.
- **`package.json:11` pins `TZ` inside the test script, so `TZ=UTC npm test`
  silently runs Denver twice.** Only the direct
  `TZ=UTC node --import tsx --test …` invocation proves both timezones.
- **The CI test glob is a hand-enumerated two-directory list, not
  recursive.** A `src/lib/calendar/` subdirectory would silently drop its
  tests from `npm test` **and CI while the suite still reported green at a
  lower count.** If a test directory is ever added, its glob entry ships in
  the same commit.
- **Check your instrument before your result.** A builder found its own
  screenshot driver only forced the theme when capturing dark — every "light"
  capture was inheriting the Mac's dark OS theme. It fixed the tool and
  re-ran everything. A gate had made the identical mistake one pass earlier.
- **Nine overclaiming comments surfaced in one mission** — including one that
  was the *stated rationale* for a design decision ("at 375px the pill holds
  ~2 characters") after the measurement it rested on had been superseded.
  The argument outlived its evidence. This class has now bitten the project
  enough times to be worth naming in review.
- **Fury's own miss, recorded:** a danger-register correction was announced as
  done, lost to a later write, and never re-verified — caught by a gate two
  passes later. Same claimed-but-not-durable pattern as the unpushed commits
  and the empty rename. **Verify a file edit landed; don't trust the write.**

### Then Bryce re-shaped the calendar (evening)

Emily likes Apple's calendar; Bryce likes Google's layouts. He walked through
Google screen by screen — the K0 Skylight process — and the result is
`.avengers/plans/calendar-v2.md`, approved the same evening.

**Decisions not to re-litigate:** six views (**Schedule / Day / 3 Day / Week /
Month / Year**) in the existing `RadioSheet`; **Schedule replaces the
list-Week and Week becomes an hour timeline** (a rendering model that does
not exist anywhere in `src/` today — nothing positions by time); paging is
**swipe + arrows + dropdown**, never swipe-only; last-used view remembered
per device, but **only when the URL has no `?view=`**, or the stored
preference fights the resync effect; **`Task` is its own table** with one
all-day due date, completed tasks staying struck through, and **kids may
complete their own** (the reward-points loop later); the Add sheet becomes
**Event / Task** with Meal removed; **long-press-drag** to reschedule on the
timeline first.

**Bryce reversed one earlier deferral, and the reason changed rather than his
mind:** the all-day storage bug (all-day events stored as local-midnight
instants, so the Camping Trip renders a day early once his phone switches to
Pacific in California) is **fixed in CT1** alongside the Task migration —
because a second all-day table would otherwise have copied the bug, and every
renderer would carry two date conventions.

Order: **CV0 → CV1 → CT1 → CV2 → CV3 → CV4 → CV5 → CT2 → CV6 → CD1**, then
K3 filters/tags, K4 recurrence, the **RSVP/inbox** and **search** walkthroughs
Bryce still owes (RSVP is a schema decision and **must precede K6**, because
Google's attendee-response model has to map onto ours), K5 import, K6/K7
Google sync.

### Where this leaves the tree

Three PRs deep, none merged: **#9 (K1)** → **#10 (K2)** → branch
`claude/calendar-cv0-extract` (**mission 10, CV0**, in progress). K2's
preview is live and verified. CV0 is the extraction both K2 gates ruled a
prerequisite: `CalendarViews.tsx` at 350/350 gets its navigation cluster
lifted into `useCalendarNavigation.ts`, `calendarDates.test.ts` is split
(done), and K2's queued one-source-of-truth repairs land. **Mission 10's file
opens with a RESUMING section that tells a fresh session to trust `git` over
its prose** — written pre-emptively because a rate limit gives no warning.

### Open for Bryce, none blocking

Two constitution amendments (Captain's on dormant exports, Strange's on
unoccluded targets); the Neon **dev-branch** password rotation (an agent
leaked a fragment into a transcript — dev only, hygiene); and whether to
merge #9/#10 to production, which is what puts the Calendar in front of
Emily.

---

## Session, 2026-09-03: CV0 and CV1 — the extraction, and the vocabulary

Two Calendar v2 phases delivered, eight build contracts, seven gate passes.
**Nothing merged** — PRs #9 (K1) and #10 (K2) are still open by Bryce's
decision, and CV0/CV1 stack on them, four branches deep. His reasoning, which
is sound: a calendar Emily can't fill isn't a feature, and holding also keeps
the deferred all-day-storage migration cheap. **My refinement, still open:**
"wait for Google sync" may be waiting longer than needed — the real milestone
is "useful enough that she'd open it on purpose," which is plausibly after
tasks and the hour views, not after sync.

### What shipped

**CV0** (`mission-10`, 4 contracts) — the extraction both K2 gates ruled a
prerequisite. `CalendarViews.tsx` **350 → 267** with the URL↔cursor cluster in
`useCalendarNavigation.ts`; `calendarDates.test.ts` **349 → 266** split by
concern; one `hexToRgba`; the Month skeleton out of the route-segment file,
closing the last plausible `components → app/` arrow; two dormant exports
deleted under the rule Bryce approved that morning. **Net duplication fell for
the first time in the arc.**

**CV1** (`mission-11`, 4 contracts) — six view names (Schedule / Day / 3 Day /
Week / Month / Year) with **no catch-alls left** in the cursor math or the
labels, a `BUILT_VIEWS` gate so nothing unbuilt is reachable from picker or
URL, per-device last-used-view persistence the URL always overrides, and URL
canonicalisation so an ambiguous history entry can never be reinterpreted.
Tests **182 → 207**.

### The lessons, and most of them are about verification rather than code

- **Two independent harnesses were blind in the same place, and both reported
  a clean result they weren't entitled to.** C1 and C2 each claimed an empty
  before/after trace diff *with a passing positive control*. Vision's harness —
  which additionally captured `[role=dialog]` contents — found a 24-line diff:
  the view picker's row order had changed. Their positive controls proved the
  harness saw `VIEW_CONFIG`, **not that it saw everything.** A positive control
  only licenses claims about what it actually moved. **Trace harnesses must
  record dialog contents**, now written into the contracts.
- **Vision blocked its own prescription.** It diagnosed the Back bug at pass 1
  and specified the fix; the builder implemented exactly that; at pass 2
  Vision found the same symptom reachable by two paths *no per-mount shape can
  cover*, and said so: *"I own that the shape was mine; the finding stands
  regardless."* Then it prototyped the real fix in-browser without editing
  source, and measured why native `history.replaceState` beats
  `router.replace` on a `force-dynamic` page — **zero server GETs against 14
  for 14 picks.**
- **"I couldn't test this" became a measured answer.** Two builders honestly
  labelled a timing question as *reasoning, not measurement* (one after
  pushing to 80× CPU throttle across 12 runs). Vision built a document-start
  trap plus a MutationObserver and settled it 18/18: the passive effect
  flushes **inside the same task as the commit**, so nothing can run between
  `today` resolving and the URL being written. **Label the distinction, and
  someone can close it later.**
- **A gate corrected a claim Fury had repeated in a commit message.**
  "Canonicalisation costs nothing" holds for loads and picks but **not** for a
  cold Back into a rewritten entry (+1 fetch, bounded, and base does the same
  for any native `pushState` entry). Queued as C5.
- **The cap is a treadmill, not a one-off.** CV0 existed because
  `CalendarViews.tsx` hit 350; it ended at 267; **CV1 spent 81 of those 83
  lines in one mission** and ended at 348. Captain's ruling: extraction to
  ~230 (`ViewConfig` → `src/lib/calendarViewConfig.ts`, **not** the render
  switch, which is where future growth lands) is **required before CV3**, and
  its decisive argument was coverage, not size — `VIEW_CURSOR` sits in `lib`
  and has property tests across every day of 2026, while `VIEW_CONFIG` is the
  same kind of per-view date logic with **zero tests, solely because it lives
  in a `.tsx` the test glob cannot see.**
- **A gate found a live hazard in code nobody had touched.** Checking whether
  `BUILT_VIEWS` was a local trick or a convention, Captain found
  `constants.ts` already solves the identical problem for roles — but with a
  **filter predicate** (`role !== "device"`) rather than a total record, so
  **a new role becomes assignable silently, with no compile error.** That is
  Captain's own CV0 hazard class, sitting in the accounts code since it was
  built. Route to whichever mission next touches roles.
- **A builder refused to suppress a lint rule and argued the substitute was
  strictly safer**, rather than adding an ignore comment — the rule protects
  the same class as CLAUDE.md's `useSyncExternalStore` precedent.
- **Fury's own mistake: `git add -A` while parallel builders were writing**,
  sweeping seven of a builder's in-flight files into a documentation commit.
  The builder caught it, **declined to rewrite a commit that wasn't its own**,
  and cleaned up separately. Not fixed by history rewrite (branch pushed, tree
  correct); **the habit changed instead — stage by explicit path.** Captain
  refused to make it a STRUCTURE.md rule, reasoning that gating commit graphs
  rather than trees would let a mission with a correct tree BLOCK on history:
  *"the verdict must always be readable off the tree."*
- **A real event title reached a builder's terminal** during dialog
  inspection. It disclosed it, kept it out of the report, and switched to
  counting rather than quoting for the rest of the run. Dev-branch data is
  real data.

### Two operational facts that cost time

- **The agent model files had drifted from the project's own decision.**
  CLAUDE.md's K1 cost review moved Strange and Captain to Opus with Vision on
  Fable; `~/.claude/agents/` still said `fable` for all three. So K1's and
  K2's eleven gate passes ran three-Fable-deep when the project had decided on
  one — a large part of why Bryce's weekly allowance drained faster than
  planned. **Fixed 2026-09-03** (`captain: opus`, `strange: opus`,
  `vision: fable`). *This is user-level config outside the repo and is not
  under git — if it ever looks wrong again, check there first.*
- **An Anthropic incident killed five gate dispatches** ("Elevated errors for
  multiple models", Opus and Fable both affected, ~2.5 h). Each dead dispatch
  burns tokens before it dies. **Stop re-dispatching into a declared outage**
  — check `status.claude.com` and wait. My own foreground calls kept working
  throughout, which is what "elevated errors" looks like from the inside: a
  long-running agent makes far more requests and so catches far more failures.

### Where the Calendar stands

`CV0 ✅ → CV1 ✅ → CV2 (timeline layout lib) → CV3 → CV4 → CV5 → CT1 → CT2 →
CV6 → CD1`, then filters, recurrence, the RSVP and search walkthroughs Bryce
still owes, and Google sync. Full plan: `.avengers/plans/calendar-v2.md`.

**CV2 can start immediately** — it is a new pure lib module and touches
nothing at the cap. **CV3 cannot start** until `CalendarViews.tsx` is
extracted.

### Open for Bryce

- **Five STRUCTURE.md/DESIGN.md amendments**, all documentation: one
  reachability gate per widened vocabulary (as a total record, never a
  predicate); permit the test-file concern-split the *practice* already
  shipped but the *text* forbids; a filename must name a live export; a member
  may not become reachable while any per-member difference sits outside a
  total record; and the `ASSIGNABLE_ROLES` predicate above.
- **C5**, queued: correct the overclaiming cost comment, and restore the
  refresh gesture — re-tapping the active Calendar tab no longer refetches,
  and **that was the only refresh an iOS standalone PWA has**, which matters
  because F8 exists precisely because Emily's phone backgrounds and reloads
  the app.
- Merging #9/#10 to production — deliberately held.

---

## Session, 2026-09-03 (continued): CV2 — the timeline layout library

**In progress at time of writing.** Four contracts built; **the gates have not
re-run since C3**, and **C4 (a test-file split) is still in flight.** Branch
`claude/calendar-cv2-timeline`, five deep on the unmerged stack.

### What's built

`src/lib/timelineLayout.ts` (331) + tests — the hour timeline's pure maths:
block position and height **in minutes**, side-by-side columns for
overlapping events, and the split between the all-day strip and the timed
grid. **Nothing in `src/` positioned anything by time before this**;
`monthLayout.ts` is the sibling it mirrors. Plus the restored tab-refresh
gesture. Tests **207 → 237**.

### The design choices worth not re-litigating

- **DST: a fixed 24-row wall-clock rail.** A day is always 1440 rail minutes
  even when it is 23 or 25 hours long, so on Nov 1 2026 both 1:30s land on
  rail minute 90 and a genuinely 3-hour event draws 2 hours tall. Google and
  Apple make the same trade. The recorded reason: an elapsed-time rail would
  make **the hour gutter lie** — the row labelled "2 AM" wouldn't sit where
  2 AM is — and a rail matching the kitchen wall clock is worth more than a
  faithful duration twice a year. The guarantee that *is* absolute: finite,
  positive height, on the rail, always.
- **`blockGeometry` cannot read `allDay`** — its parameter type excludes it.
  That turns "the timed path must never read an all-day row's stored times"
  (the deferred storage bug) from a rule an editor must remember into one the
  compiler refuses. Captain called it the strongest thing in the file.
- **`TimelineEvent` is structurally identical to `MonthLayoutEvent`**, so the
  all-day strip feeds the *existing* `assignLanes` with no conversion and no
  second packer. **The composition test that proves this is load-bearing
  structure, not coverage — do not delete it when CV4's real call site makes
  it look redundant** (Captain).
- **`timelineLayout.ts` deliberately does not import `monthLayout.ts`** — the
  caller composes them, so the two packers stay visibly disjoint.

### The lessons

- **Both gates found the same blocker by different routes** — Captain by
  reading, Vision by measuring — and **Vision's version extended it**. The
  tab-refresh fix keyed its behaviour on `active`, which is *prefix*-based, so
  it fired on ~20 sub-pages where the tap is a real navigation and `replace`
  discarded the entry the user was standing on: **the identical dead Back
  press the fix existed to remove.** Vision then measured a third case
  (a paged Calendar) that **an exact-path fix would not have caught**, because
  a paged entry's pathname is already `/calendar`. The answer that removes all
  three: on a same-page re-tap, **don't navigate at all — just refresh.** Safe
  because the Today circle already covers "go to today".
- **The evidence wasn't wrong; it was taken where the bug can't appear.**
  Both of the original measurements were at tab *roots*, where the loose and
  strict readings agree.
- **The one place two libraries disagreed, found by sweeping rather than
  reasoning.** Vision compared `daysEventCovers` against `blockGeometry`
  across 225 events × 10 days and found exactly one divergence: a
  **zero-length timed event at exactly local midnight** — writable through
  the sanctioned path, since `validateEventInput` rejects only
  `endAt < startAt`. It would have appeared in the list views and vanished
  from the timeline. The post-fix sweep across four timezones found **0**.
- **A test that could not detect its own precondition failing.** A
  timezone-pinned DST case was recorded (by me, repeating the builder) as
  "non-vacuous under both invocations". Vision removed the pin and it **still
  passed**. The fix wasn't a new test — it was making that test *able to
  fail*, proven by removing the pin and watching it go red.
- **A comment said an expensive failure mode was "not reachable here." It was
  reachable** — the first version of the tab fix triggered exactly that full
  document reload. The shipped code removes the trigger so the claim is true
  again, but the reasoning was wrong and untested. Same file whose sibling
  comment was being corrected for overclaiming in the same contract.
- **A builder renamed a variable I had specified**, because one of the three
  cases is *precisely* a differing URL and my name (`sameUrl`) "would be the
  kind of overclaiming this contract exists to remove."
- **A builder added something unasked and was right to:** blocking the tab's
  default click would have swallowed cmd/shift-click, making the nav tabs the
  one link in the app you cannot open in a new tab.
- **Captain declined to legislate twice.** It found an ambiguity in an
  amendment approved that morning, drafted the clarification, then set it
  aside — *"I'd rather not amend twice in two days"* — and separately refused
  to invent a rule about files created near the cap: *"a line-count threshold
  on new files is my taste, not a structural rule, and the constitution is
  better lean."*
- **The dormant-export rule was read, not applied mechanically.**
  `timelineLayout.ts` has no application caller yet. Captain recorded that the
  rule targets exports whose caller *went away*, not **a library built one
  phase ahead against a written plan** — and set the real deadline: **if CV4
  ships without consuming it, delete it with its tests.**

### Open at the pause

- **C4 ✅ done** (`aae9cd8`): `timelineLayout.test.ts` **376 → 232**, with
  column packing and partition moved to `timelineLayoutPacking.test.ts`
  (187). C3's correctness fix had pushed it over the cap and the split
  needed a file outside C3's boundary; C3 judged that **blocking a
  correctness fix on file organisation was the worse trade** and surfaced
  the debt instead, which was right. **The count is the instrument** —
  17 + 13 = the 30 the single file held, 237 total under both zones, the
  4 DST cases still skipping under UTC — and because a count cannot see a
  moved test that runs but no longer asserts, every moved body was diffed
  byte-identical against its original. First live use of the concern-split
  clause added that morning.
- **Gates have not re-run since C3.** Nothing in CV2 is gate-verified past
  C1/C2.
- **`calendarDates.ts`'s `calendarDayDiff` loops forever on an invalid
  `Date`** — pre-existing, shared with `assignLanes`, unreachable from Prisma
  dates. Out of every boundary so far; worth a guard someday.
- Standing: `CalendarViews.tsx` (348) must be extracted before CV3;
  `EventForm.tsx` (350) still carries `daysBetween`'s `b < a` infinite loop
  for CT1; `ASSIGNABLE_ROLES` is still a predicate not a record;
  `MonthLoadingSkeleton.tsx` names an export it no longer has and **must not
  survive CV3**.
