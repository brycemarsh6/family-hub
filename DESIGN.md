# DESIGN.md — Marsh HQ

Strange's constitution for this app. These rules codify decisions the project
already made deliberately (full reasoning in CLAUDE.md's history); Strange
gates new UI against them. Each rule carries its why, so a future change can
tell when a rule's reason has expired.

## Identity

- **What this is:** a private web app for one family — a shared home base for
  the kitchen (inventory, shopping, expiring food, recipes, meal plans) and,
  eventually, calendar, chores, and lists. Not a product; one household.
- **Who uses it, on what:** parents on phones (often one-handed, in a store,
  or holding a kid) and a tablet mounted on the kitchen wall — possibly with
  wet hands. Laptop use is secondary.
- **It should feel:** *instant* (every tap responds immediately), *big-thumbed*
  (nothing fiddly), and *honest* (a guess never looks like a fact).

## Hard rules

- **Touch-first, always — a two-tier minimum.** 48px for primary controls,
  inputs, and list rows (56–64px tall); a 44px floor for compact secondary
  controls — filter chips, icon buttons, sheet close buttons. No interaction
  that only works on hover. This codifies what the app already does (`h-12`
  appears 86× for primary controls, `h-11` consistently for the compact
  tier) — a flat 48px would make ~20 shipped controls instant violations,
  which is how a constitution becomes noise on day one. 44px is still
  Apple's HIG minimum, so the floor is a real one, not a loophole. The wall
  tablet and the phone-in-a-store are the design targets, not a mouse.
- **Quantities change only by tapping** — the shared `QuantityStepper` (+/−),
  never a typed number. Typing numbers is fiddly on a phone and worse on a
  wall tablet. (Prose is different: recipes and notes are keyboard entry —
  the stepper rule is about *counts*.)
- **Instant feedback on every tap** — optimistic updates (`useOptimistic` +
  `startTransition`), never a wait on the server round trip.
- **Delete is a single tap, no confirmation** — everywhere, for consistency.
  Exactly two sanctioned exceptions, both because they silently touch many
  rows' relationships: deleting a **cookbook** and deleting a **tag**, each
  confirming with a real count ("Its 14 recipes stay in All Recipes").
- **Secondary row actions live behind a right-to-left swipe**
  (`SwipeActions`), destructive actions ordered last (furthest from the row)
  so a hesitant swipe surfaces the reversible one. Every action button is
  real markup — reachable without the gesture (keyboard, screen reader).
- **Outline icons only, via Lucide — no emoji in the icon system.** Two
  deliberate exceptions: native `<select><option>` can't render SVG, so
  dropdowns fall back to plain text; and the header's house-and-heart PNG is
  a **brand mark**, not a member of the icon system, so it isn't a Lucide
  outline either. (Decorative one-off emoji in empty states are outside the
  icon system and tolerated.)
- **Exactly one nav bar**, rendered once from the root layout, fixed to the
  bottom at every screen size. Its tabs never change as you move — only
  which tab is lit. No top-bar desktop layout; confirmed deliberately, twice.
  Deliberate exceptions with no nav bar at all: `/login` (there's no session
  yet to navigate with), and the public `/share/*` pages — their own root
  layout renders no app chrome by design, so a shared link can't leak the
  app's navigation to someone with no session.
- **A branch with sub-pages gets a landing page of tiles** (`BranchTile`),
  never a second nav bar. The nav reaches branch roots; landing pages reach
  down; `BackLink` is the one edge back up.
- **Every page below a nav destination carries a `BackLink`** — explicit
  `href` (never `router.back()`), label naming the destination ("Recipes"),
  not the action ("Back").
- **Sheets are the house dialog**: bottom sheet on phones, centered dialog on
  wider screens. Multi-step flows live in *one* sheet with an internal view
  state machine — never stacked modals (two Escape listeners fight over one
  keypress).

## Color semantics

- Tokens are named by **job**, not appearance — `--surface`, `--muted`,
  `--danger`, `--accent`, `--warn-soft`, `--danger-soft` — in `globals.css`,
  with light and dark values. New tokens are added only when a real screen
  needs one.
- **Semantic truth:** red means urgent/destructive, never decoration; before
  coloring anything "good," confirm more/higher is actually good in context.
- Fixed data-category palettes (e.g. the nutrition donut's three macro
  colors) are deliberately *not* job tokens — job tokens name UI roles, and
  forcing data categories into them corrupts both vocabularies.
- **Estimates are marked** — a `~` prefix on any guessed value (shelf life,
  nutrition). A guess never masquerades as a fact.

## Component vocabulary

A new one-off that duplicates one of these jobs is a design violation:

- `QuantityStepper` — every count, everywhere
- `SwipeActions` — row-level secondary actions
- `BackLink` — the upward edge from every sub-page
- `BranchTile` — landing-page tiles (icon as rendered `ReactNode`, not a
  component reference — RSC serialization)
- `HubNav` — the only nav bar; `HUB_NAV_ITEMS` in `nav.ts` the only nav list
- `EmptyState`, `Skeleton` (+ per-branch `loading.tsx`)
- The sheet family: `RadioSheet` (pick one), `ActionSheet` (⋯ menus),
  `ConfirmSheet` (the two count-confirm deletes), `TitleSheet` (name a thing)

## States

- Empty states via `EmptyState`; empty groups simply don't render.
- Loading via skeletons shaped like the real content — the app must not look
  frozen during a server render.
- Errors are inline, specific, and name a next step ("couldn't load that
  page (error 403) — try pasting the recipe text instead"). Never a dead end.
- **Error color: warn for user mistakes, danger for destructive or urgent.**
  A wrong password or invalid input ("you made a typo") renders `--warn` —
  the login error is amber, not red. `--danger` is reserved for destructive
  actions and urgent states (delete, expired food). Reserving red keeps red
  meaningful.

## Strange's checklist

1. Tap targets and spacing against the hard rules (48px primary, 44px floor
   for compact secondary controls).
2. Component vocabulary — no one-offs where a canonical component exists.
3. Color tokens only — no raw values; semantic truth of every color in context.
4. States — empty/loading/error present and honest; estimates `~`-marked.
5. Semantic pass — every visual signal tells the truth; tappable looks
   tappable; hierarchy matches importance.
6. Coverage — phone width (375px) always; desktop and dark mode when the
   change touches layout or color.

## Settled decisions — don't relitigate

- **One bottom nav bar at every size** — revisited twice, kept both times.
  A desktop layout is "someday if actually needed," not a default.
- **Inventory taps edit; Shopping taps check off (edit is behind swipe).**
  The asymmetry is the point: check-off must stay the fastest action on
  Shopping.
- **Inventory groups start fully collapsed** — auto-opening low groups
  looked arbitrary at real scale.
- **No recipe photos** — C7 was dropped (Vercel Blob is paid); the gradient
  + `ChefHat` hero is the permanent treatment, not a placeholder.
- **Single-tap delete stays** unless real accidental-deletion pain appears.
- **No third-party app is the design reference** — earlier Todoist/Monarch
  comparisons were explicitly dropped.
