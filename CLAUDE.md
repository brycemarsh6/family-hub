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

## Expiring & leftovers plan — ACTIVE

The current work, and the first real feature built on top of the finished
inventory. Two problems, one page:

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
- **Shelf-life data comes from the USDA/FDA FoodKeeper dataset**, not
  invented numbers — it publishes storage times per food split by
  pantry/fridge/freezer, which is exactly the shape needed. Turned into a
  vocabulary file of ~100 common foods rather than pulled at runtime.
- **The shelf-life table is matched with the existing fuzzy matcher**
  (`src/lib/match.ts`), the same code voice and search already use. Third
  caller, same brain. Crucially this makes coverage *measurable*: run it
  against the real 461 items and count how many get a name-level
  estimate vs. category fallback vs. nothing, then tune — the same
  test-against-real-data discipline that caught the steaks/"tea" and
  tortilla/"T-bone" bugs.
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
  decides. Consistent with "delete is a single tap, no confirmation" —
  "we ate it" and "we tossed it" are the same tap, because the outcome
  is identical.

**The phases:**

- **E1. Plumbing + shelf-life data** — schema migration (`expiresAt`,
  `restockedAt`), the FoodKeeper-derived vocabulary, matcher wiring, and
  a coverage report against the real 461 items *before* any UI exists.
- **E2. The Expiring page** — urgency sections (Eat now / This week /
  Coming up), estimate marking, the Kitchen tile's badge finally earning
  its place (count expiring within 3 days), and an optional exact-date
  field in the existing edit sheet.
- **E3. Leftovers** — the category, the log-leftovers flow, the countdown
  treatment, and one-tap "finished".

**Deliberately not in v1** (revisit only if real use demands it):
per-purchase batch tracking (the honest way to handle old and new apples
sharing one row — real complexity for uncertain gain), push
notifications, and the leftover voice verb (queued as V4).

## Planned, not yet built

Everything below is independent of the voice plan above and not currently
being worked on. Roughly the order they'll likely get tackled, though
nothing here is scheduled:

- **Family profiles** — a page per family member.
- **Chore charts** — for the kids.
- **Recipes**
- **Meal planning**
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

**Obvious next step: V3 — the Alexa skill**, for the actual kitchen Echo
device this was originally about. Needs Bryce to create a free Amazon
developer account (walkthrough style, like Neon/Vercel), then a skill
that passes the raw utterance through to the same `/api/voice` endpoint,
kept in development mode (works indefinitely on the developer's own
household Echo devices, no certification needed for a private app).
