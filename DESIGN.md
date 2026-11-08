# DESIGN.md — Marshee

Strange's constitution for this app. These rules codify decisions the project
already made deliberately (full reasoning in docs/history/claude-md-archive-2026-10-31.md); Strange
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
- **Pages use the width they are given, and a row never stretches to fill
  it.** Marshee lives on phones, an upright iPad and an 11-inch iPad in
  landscape on the kitchen wall. A page that goes wide (`data-page-width`,
  STRUCTURE.md "Wide pages") gets more columns, more panels or a wider
  grid; a list row keeps about its phone width, because a name on the far
  left and a stepper on the far right of an 1148px row is harder to read
  and to tap than two columns of rows. Each page's wide layout is decided
  in `.avengers/plans/ipad-landscape-v1.md` (Bryce, decisions 215 to 223).
- **A target must also be unoccluded.** For every interactive control there
  must exist a scroll position the user can actually reach at which
  `elementFromPoint` at the control's centre returns that control. A fixed
  overlay the page reserves no room for — a floating action button, a toast,
  a sticky banner — fails this even at 44px, because no amount of scrolling
  moves what sits at a fixed viewport y. The floating hamburger passes because
  `<main>` reserves its row (`HAMBURGER_ROW_HEIGHT_PX`) above the content. **Size and reachability are different properties.** (Added 2026-09-03
  on Strange's ruling, mission 9: Month's grid passed every size check while
  one of its day numbers opened the Add sheet instead of Day view, and the
  first measurement — taken scrolled to the bottom — reported zero failures
  and would have shipped it. Measure at the position the user arrives at.)
- **A press state must never reduce the legibility of a label inside its own
  target.** A control whose tap target is an absolutely-positioned overlay over
  text — the standard way to make a text row a big target — paints **above**
  that text **regardless of `z-index`**, so an `:active` background on the
  overlay erases the very label the press is feedback for. Put the fill on the
  shared **parent**, where a background paints in the parent's own background
  step before any child (`span:has(> button:active)`), or on a `-z-10`
  pseudo-element of that parent — **never on the overlay, and never on the
  overlay with a negative `z-index`**, which silently breaks the reachability
  rule above. The measurable property: **the label's ink count and its contrast
  must survive the press**, and contrast must stay above 4.5:1 for text.
  (Added 2026-09-09, Strange, mission-19 passes 2–3; Bryce approved. Instance:
  the month-jump control's fill erased the header title completely **by 50ms
  into an ordinary tap** — ink 2686 → 0, contrast 6.96 → **1.00** light and
  15.23 → **1.00** dark — leaving a tinted pill visually identical to the app's
  own loading skeleton, so a press claimed *"this is loading"*. Verified fixed
  at 2686 → 2686 / 6.35 against a pre-fix control that **still reproduces the
  erasure**, on both the inline-`<h2>` and `createPortal` title paths. Note the
  rule binds the **property**, not the mechanism: Strange's first draft required
  only that a control "acknowledge a press", and the fix that shipped this
  defect satisfied that draft exactly. CD1 layers more gestures over content and
  should be held to this.)
- **The hour timeline is a sanctioned exception to the 44px floor, and it
  carries a written boundary.** On Day / 3 Day / Week a block's height *is*
  its duration: at `HOUR_HEIGHT_PX` 48 a `MIN_BLOCK_MINUTES` (30) block
  draws 24px. Inflating past its geometry would either paint over a
  neighbour or reintroduce the ambiguous tap the floor exists to prevent,
  and doubling the rail to clear 44px halves the visible day from 9.2 hours
  to 4.6 on the app's most-used view. The boundary: **(a)** every block
  stays a real `<button>` with a real accessible name; **(b)** consecutive
  blocks never abut — each draws 2px shorter and 2px narrower than its
  computed geometry, so a near-miss lands on a non-interactive seam instead
  of opening the wrong event; **(c)** the all-day strip's bars, its
  "+N more", **and its "− Show less" collapse counterpart** share that same
  24px as a **floor, not a derivation** — they
  have no duration to be faithful to, which is why 24px is the minimum they
  may be and never a licence to go under it; **(d)** Schedule (112px
  full-width rows, listing everything) is the conforming route and must
  stay one tap away in the picker. **Nothing outside the timeline inherits
  this.** *(Strange's ruling, mission-17 rounds 1–2. Round 1 rejected an
  18px all-day bar as arbitrarily smaller with a dead-end overflow; round 2
  accepted 24px once both were fixed, because the residual is then
  identical in kind to the timed block beside it. The precedent it rests on
  is the app's own: in Month the **cell** is the 44px target and the pills
  inside it are non-interactive.)*
- **Quantities change only by tapping** — the shared `QuantityStepper` (+/−),
  never a typed number. Typing numbers is fiddly on a phone and worse on a
  wall tablet. (Prose is different: recipes and notes are keyboard entry —
  the stepper rule is about *counts*.) Typed numbers are allowed for
  *measurements* (a goal's starting and target numbers, or a check-in such
  as a weigh-in or a dollar figure), never for counts.
- **Instant feedback on every tap** — optimistic updates (`useOptimistic` +
  `startTransition`), never a wait on the server round trip.
  **One carve-out (added 2026-09-05, Bryce-approved): a one-shot
  destructive verb is NOT optimistic.** Delete waits for the server and
  then removes the row, because an optimistic delete shows the row
  vanishing and — on failure — reappearing, which reads as the app losing
  and then finding the thing rather than as an error. A **reversible state
  flip** (a task's complete / un-complete, a checkbox, a rating) is the
  opposite case and must be optimistic: the flip is cheap to show, cheap
  to revert, and the revert reads as "that didn't take" rather than as
  data loss. The test is not "does this write to the database" — it is
  **"if this fails, does undoing it on screen look like a correction or
  like a loss?"**
  **Named exception (decision 213, mission-43):** Remove widget in the
  Customize sheet (decision 204) is optimistic. It edits a layout, not the
  family's data: the habits, goals and lists behind the tile are untouched,
  Add puts the widget back, and only its size and picks are lost. A failed
  save returns the row with the inline error, which reads as a correction,
  not a loss.
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
  dropdowns fall back to plain text; and the Marshee mark and wordmark are
  **brand artwork**, not members of the icon system, so they aren't Lucide
  outlines either. (Decorative one-off emoji in empty states are outside the
  icon system and tolerated.)
- **Exactly one navigation surface: the side drawer** (`NavDrawer`), opened
  by the one hamburger button (`HamburgerButton`) and rendered once from the
  root layout via `AppChrome`. Its list never changes as you move, only which
  row is lit. The wordmark header appears only on the dashboard and `/login`;
  every other page shows the floating hamburger and reserves
  `HAMBURGER_ROW_HEIGHT_PX` above its content, so the button is never an
  unreserved overlay. `/login` and `/share/*` render no drawer: there is no
  session yet to navigate with, and a shared link must not leak the app's
  navigation to someone with no session.
- **On wide screens a per-login setting may pin that same list.** At `lg`
  (1024px) and up, "Menu style" in Settings can show the drawer's list always
  open, as an icons-only rail or a full sidebar (`PinnedNav`, built from
  `NavList`, the list `NavDrawer` also uses; the choice is edited in
  `NavModeSetting`). It is still one surface: the pinned menu and the drawer
  are never both open, and below `lg` the menu button is used. Phones never
  pin. Fixed bars that span the screen (`AddItemBar`, `FloatingAddButton`, the
  floating hamburger's row) use `--app-nav-width` as their left edge so they
  line up with the content. On a wide page (`data-page-width`, from `md`)
  the round + sits at the bottom-right corner of the content area, where a
  right thumb lands on an iPad; on phones it stays bottom-left because the
  Recipes A-Z rail owns the right edge there, and on wide pages that rail
  ends above the button (mission-52, decision 246).
- **The drawer reaches every destination directly; there are no landing
  pages.** `BackLink` is the one edge back up from a page below a drawer
  destination (recipe detail to Recipes), never on a destination itself.
  Every page below a drawer destination carries one: explicit `href` (never
  `router.back()`), label naming the destination ("Recipes"),
  not the action ("Back").
- **Sheets are the house dialog**: bottom sheet on phones, centered dialog on
  wider screens. Multi-step flows live in *one* sheet with an internal view
  state machine — never stacked modals (two Escape listeners fight over one
  keypress).

## Brand

The app is **Marshee**. The brand is defined by the Marshee Brand Blueprint
(Sage, Dusty Blue, Peach, Cream, Butter, Warm Gray, Charcoal; Manrope /
Inter / Cormorant Garamond). Two rules govern how it enters the codebase:

- **`brand/` holds the master vectors — they are the source of truth and
  are never redrawn.** `marshee-mark.svg`, `marshee-wordmark.svg`,
  `marshee-app-icon.svg`. Everything else is *generated* from them: the
  PNG/ICO icons in `src/app/`, and the two React components. Recoloring via
  `fill` is allowed (that's what the brand sheet's monochrome variants are);
  redrawing, restretching, or approximating the paths is not.
- **The wordmark is artwork, not text.** `MarsheeWordmark` is outlined
  vector paths, because the lettering is custom-drawn — no font produces it.
  It uses `fill="currentColor"` so it inherits `--fg`: Charcoal in light,
  Cream in dark, which are exactly the brand sheet's own "monochrome dark"
  and "monochrome light" variants, from one asset. `MarsheeIcon` does the
  opposite and pins sage/cream, because an app icon that changes color
  isn't the same icon.
- **App-icon PNGs stay square; only in-app uses get rounded corners.** iOS
  and Android apply their own mask to a home-screen icon, so a pre-rounded
  source comes out double-rounded. `MarsheeIcon` bakes in `rx` because it's
  a UI element, not an OS icon.

## Color semantics

- Tokens are named by **job**, not appearance — `--surface`, `--muted`,
  `--danger`, `--accent`, `--warn-soft`, `--danger-soft` — in `globals.css`,
  with light and dark values. New tokens are added only when a real screen
  needs one.
- **The brand palette is the *source*, not the token values.** Brand colors
  are chosen to look good; UI tokens must also be *readable*. Raw Sage
  (#A8B498) is 2.18:1 on white and fails WCAG AA outright as an interactive
  color; raw Warm Gray (#8C847A) is 3.69:1 and also fails. So `--accent` is
  a deepened sage (#5A6B4F, 5.75:1) and `--muted` a deepened warm gray
  (#6F6A60, 5.38:1). Every text-bearing pair in `globals.css` clears 4.5:1,
  and the comments there record each derivation. **Do not "correct" a token
  back to its raw brand hex** — that reintroduces a real accessibility bug,
  and the comment beside it says so.
- **Dusty Blue (#8EAFC0) is reserved and currently has no job.** It is part
  of the brand but no screen needs it yet. Leave it unassigned rather than
  inventing a use — a token exists when a screen needs it, per the rule
  above.
- **Typography has three faces, each with one job.** Manrope (`--font-display`)
  for headings, applied globally to `h1`–`h3` rather than per-component.
  Inter (`--font-sans`) for body. Cormorant Garamond italic (`--font-accent`)
  is used in exactly **two** places: the login page's tagline and the
  Vision board heading in `VisionBoard` (Bryce's call, 2026-11-04: a vision
  is the one reflective page in the app). The heading uses the browser's
  slanted italic of the regular face, the same as the tagline; loading the
  true italic was declined because it would also change the login tagline.
  That restraint is the design decision; a serif italic used widely would
  fight the app's plain, quick-scanning voice.
- **`--line-strong` is decorative only.** It is the dashed outline of an
  empty vision card (a slightly darker twin of `--line`, with a dark-mode
  twin). It is too faint to carry text or to mark an interactive edge on its
  own, so never use it for either.
- **`--streak` / `--streak-soft` are the streak's own colour** (mission-32/F1):
  a burnt peach for the flame and its count on Today rows, family rows and the
  stats tile, and the soft fill behind the nudge card. Amber (`--warn`) means
  a warning or a Missed day; a streak is good news, so it must not share it.
  Light `#8a4b1f` is 6.76:1 on `--surface`, 5.97:1 on `--bg`, 5.42:1 on
  `--streak-soft`; dark `#e8a77f` is 7.57:1 on `--surface`, 8.43:1 on `--bg`,
  6.63:1 on `--streak-soft` (measured). `--muted-strong` on
  `--streak-soft` is 4.72:1 light / 6.43:1 dark (measured, mission-32
  Strange pass 2). Plain `--muted` fails on it in light (4.31:1); never
  use it there.
- **Semantic truth:** red means urgent/destructive, never decoration; before
  coloring anything "good," confirm more/higher is actually good in context.
- Fixed data-category palettes (e.g. the nutrition donut's three macro
  colors) are deliberately *not* job tokens — job tokens name UI roles, and
  forcing data categories into them corrupts both vocabularies.
- **Estimates are marked** — a `~` prefix on any guessed value (shelf life,
  nutrition). A guess never masquerades as a fact.
- **`line-through` means *done* — never *past*, never *cancelled*.** A
  completed task is struck through; an event that has merely already
  happened drains to `--muted` in weight and colour **wherever the app
  draws past events — the hour rail, Month's pills, and `EventCard`** — and
  is **never** struck. **The timeline's all-day strip does not yet drain**
  (`TimelineAllDayStrip.tsx` imports no `isPast`, so a past all-day bar
  renders identically to a current one — measured, mission-17 round 3).
  That is a **known gap, not a licence**: a surface that draws past events
  drains them, and the strip is owed the same treatment whenever it is next
  opened.
  "Already happened" and "done" are different facts and must stay tellable
  apart. An overdue but incomplete task does **not** drain — only completion
  changes how a task renders. Struck text is always paired with a ✓/☐ glyph
  rather than carrying the fact alone, for two measured reasons: a strike is
  invisible wherever the title is `sr-only` (Month's pills below `md`,
  measured 1×1px with `clip: inset(50%)`), and a strike without a checkmark
  can read as "cancelled". This joins `GroceryRow`'s existing
  struck-checked-item vocabulary rather than inventing a second one.
  *(mission-14 D2, applied a third time in mission-17 and written down here
  only then — Strange found the rule had steered three implementations while
  living in no constitution at all.)*

- **A "today" marker may only be drawn on a cell that belongs to the period
  the surface is showing.** A 42-cell month grid contains up to 12 days of its
  neighbours, so `isSameDay(day, today)` **alone** circles today in the *wrong
  month's* grid — and in Year, where twelve grids share one screen, it draws
  **two markers at once**. Pair every today test with the in-month test that
  is already computed beside it. *(Added 2026-09-06, mission-18, on Strange's
  ruling. Instance: Year circled 1 October in both the September and October
  tiles; measured at 2 markers with the clock frozen, against a control of 1,
  and **126 of 365 days in both 2026 and 2027** fall in more than one tile.
  The rule is written flatly because mission-18/C6 fixed **both** live
  instances — `YearView` and `MonthGrid` — so it carries no carve-out.
  Strange had ruled the `MonthGrid` case "milder" and advised fixing Year
  alone, then **overturned its own advice** on the measurement that settles
  it: the wrongly-circled cell rendered `accent: true, muted: false`,
  visually indistinguishable from a real today, in the app's most-used view.
  Note the invariant currently lives at both **call sites**, not in
  `MonthCell`, which still takes `isToday` and `isCurrentMonth` as
  independent props — a third caller would reintroduce this with no compile
  error.)*
- **The hour timeline's now-line is a sanctioned use of `--danger`.** It is
  not destructive and not an error, so it is a deliberate exception to "red
  means urgent/destructive." The reason is that the now-line must be the
  single most locatable mark on a dense rail of coloured event blocks, and
  `--danger` is the one token in the palette **no event block uses** — the
  reservation is what makes it work, so widening `--danger` to any other
  decorative use would take this with it. **Nothing else inherits this
  exception.** *(Added 2026-09-06, mission-18. Strange asked for this line in
  mission-17 and it went unwritten for a session — an unlisted use of a
  reserved token is exactly the drift these rules exist to stop.)*

## Component vocabulary

A new one-off that duplicates one of these jobs is a design violation:

- `QuantityStepper` — every count, everywhere
- `SwipeActions` — row-level secondary actions
- `BackLink` — the upward edge from every sub-page
- `NavDrawer` / `HamburgerButton` / `PinnedNav` (`NavDrawer` and `PinnedNav` both render `NavList`;
  `NavModeSetting` is the Menu style row): the only navigation surface;
  `NAV_SECTIONS` (+ `NAV_FOOTER_ITEMS`) in `nav.ts` the only nav list
- `EmptyState`, `Skeleton` (+ per-branch `loading.tsx`)
- `SortableList`: the one drag-to-reorder list (dnd-kit; a grip handle only,
  so finger scrolling anywhere else on a row still scrolls). A new reorderable
  list wraps its rows in it rather than wiring dnd-kit again
- `HabitRow`: one line of the Habits & Chores Today list (44px check, title,
  tags, swipe left for Skip today). `HabitForm` is the one New and Edit form for
  a habit or chore, built from `ParticipantPicker`, `HabitIconPicker` and
  `HabitScheduleField` and the small fields in `HabitFormFields` (`Field`,
  `Segmented`, `TimeOfDayField`, `LifeAreaField`); a new habit field goes in
  it, never in a second form
- `HabitFamilyView` / `HabitFamilyColumn` / `HabitViewChips`: the Whole
  family view of Habits & Chores. `HabitFamilyView` is the Together strip plus
  a grid of person cards (`auto-fit` columns of at least 340px: stacked on a
  phone, two across on an 820px iPad); `HabitFamilyColumn` is one card (avatar,
  name, "x of y done" with skipped rows in neither number, then Habits and
  Chores) and holds `FamilyHabitRow`, the compact line: icon and title linking
  to the stats page, streak label, 44px check. A row the viewer may not tick for
  shows its state in a plain marker that is not a button; a Together row's
  check does not name one person. `HabitViewChips` (its own file) is
  the "Mine" / "Whole family" pair of link pills above both views, the choice
  kept in the URL (`?view=family`); it is a view switch, not a second
  `PageTabs`, and the wall tablet never shows it. The chore streak is a
  `--streak` flame and "N days" after the "Chores" title on Today and on each
  card (2 or more, the Show streaks switch, always on the tablet); a person
  on vacation reads "On vacation" under their name and their rows are
  excused (sorted with finished rows); on a Sunday after a clean chore week
  Today and the card carry a `--streak-soft` line. `VacationCard` (Settings):
  From and Through date inputs, "Turn on vacation mode", and a list with a
  one-tap Delete
- The Habits Report (`/habits/report`; `HabitReportView` and the `Report*`
  components): Week, Month and Year tabs (`PageTabs`), `ReportPager` (44px
  arrows around the title, and a "This week" / "This month" pill back to now
  when a past period is shown), person chips (parents and admins only, so a
  kid never sees them), the filter (`HabitFilterChips`, as on Today), then the
  view. Every day is one `HabitDayCell`, the same cell the stats calendar
  draws, and `HabitDayLegend` is the only legend (once under the pager on
  Month and Year, never per card). Month and Year use the compact month grid
  (about 22px cells, read-only), because a Report is for reading, not
  ticking, and back-filling stays on the stats page. The count beside each
  item says "x of y", or, when nothing is due, why: "Due Sat", "N skipped",
  "Skipped this week", "On vacation", "Not this week" / "Not this month",
  never "0 of 0" (decisions 177 and 181). Today's outline shows only when the
  day is due or still doable; a not-due today stays plain with a bold number,
  so an outline always means "this is something to do". Vacation days are
  drawn as Skipped. Archived items are not in the Report.
- `DashboardWidgetList` (the dashboard's widget grid and Customize button,
  and the nudge and Sunday cards above the grid) /
  `DashboardCustomizeSheet`: the only way to add, size, reorder, pick or
  remove dashboard widgets (mission-43). The dashboard has no page title
  or subtitle on any size: the wordmark header already says where you are,
  and the 11-inch iPad needs the room (decision 221, mission-44); Customize
  sits at the right end of that header row. The grid is 2 columns on
  phones and 4 from a 45rem container width, so on a landscape iPad it
  fills the screen; a widget is Small (1x1), Medium (2x1), Large (2x2) or
  Extra large (full width, 2 tall; Large on a phone), from the sizes its
  kind allows; every cell is at least about 150px tall and grows to fit, so
  a tile is never cut off, and a Large alone in its row fits its content
  (decisions 201 and 209); a later Small fills an earlier hole
  (decision 202). The sheet is one dialog with internal views: the list
  (a row per widget that opens its edit view, with a chevron, and a drag
  grip on the right, decisions 140 and 208; "Add widget"; Reset to
  default), the edit view (`DashboardWidgetEditor`: the size strip, "Pick"
  for Habits and Goals opening `DashboardItemPicker` in the same sheet,
  decision 137, and a one-tap "Remove widget", decision 204), and "Add a
  widget" (`DashboardAddWidget`). `DashboardWidgetGallery` is the one
  swipeable size strip (scroll snap, dots, every preview a real button,
  decision 206) and `DashboardWidgetPreview` its drawn miniature, never
  live data. A kind may be on the dashboard more than once (decision 205)
- `PageTabs`: the one tab control for switching views of a page (Plans &
  Goals, the Habits Report): a `nav` of links lit by `aria-current`, its tabs
  passed in by the page; a new tab is a column in it, never a second control.
  A segmented strip inside a form (the day / week / month picker in
  `PlanItemSheet`) is a form field, not navigation, and is not a second
  `PageTabs`
  The Vision board's 5 / 10 / 15 yr switch in `VisionBoard` (a `role="group"`
  strip of links, each at least 44px, the current one `aria-current`) is a
  second allowed carve-out: it picks a time range inside one page, so it is
  a form-style field like the day / week / month picker, not a new tab
- `IdeaChips`: the one row of tappable idea chips ("Ideas for Health"). A
  tap hands the words to the form, never submits, and no chip is ever shown
  as selected. `GoalForm`, `PlanItemSheet` and the New habit form use it; a new
  idea row reuses it rather than copying the chip classes
- `VisionCard` / `VisionSheet`: one life-area card on the Vision board and
  the sheet that edits it. A filled card keeps the icon band; an empty card
  has a dashed `border-line-strong` outline, the page-colored fill and no
  band, so an unwritten area reads as an invitation and not as a broken
  card. On a board the viewer can't edit, an empty card shows the area and
  one muted line ("{Name} hasn't written this yet"), no prompt and no
  buttons
- `GoalsTile`: the body of the "Goals this week" widget, rendered inside
  `DashboardTile` so the whole tile stays the one tap target (no inner links
  or buttons). It reuses `ProgressBar`; a new dashboard summary is another
  widget body in a `DashboardTile`, not a second tile shell
- `DashboardTile`'s second shape, for a tile with controls inside (the
  Habits and Chores today tiles, decision 132): the card is not a link;
  only its header row (icon and title) links to the page, and each row
  keeps its own tap (the live `HabitRow`). One shell, one prop that says
  which shape, never a nested link or a button inside a link
- `PlanDayCard` (mission-35, decision 161): the one "Pick a day" card on
  Today and the dashboard. The header shows once, then one block per habit
  (its icon box, title on up to two lines, its own day chips and "Other
  day"). Each chip plans at once and the block leaves; the card leaves with
  the last. Never one card per habit. Order on both screens (159): nudges,
  vacation and Sunday cards, Planned today (dashboard only), then Pick a day
- `PlannedTodayCard` (decision 145): the dashboard's live habit rows planned
  for today; those rows leave the Habits tile. Today shows no such card;
  the row's meta says "Planned for today" (or "Planned for Sat" for a later
  day, 162) in the slot "Anytime" takes
- A planned habit day on the Calendar (146, 157, 160) is its own item, not
  a task: the Month pill draws ☐ until done and ✓ struck when done (never a
  bare pill that looks like an event); the all-day strip pill
  (`HabitDayPill`) and the Schedule row (`HabitDayCard`) show the habit's
  icon and link to `/habits/[id]`. Done means a check that day or the
  period's target met. Shown only to the habit's own people
- `WeekRecapCard`: the Sunday recap at the top of This week, a
  `bg-accent-soft` card with a small uppercase label. The label uses
  `text-muted-strong`, because `text-muted` on `bg-accent-soft` is 4.35:1,
  under the 4.5:1 floor. It has no dismiss button by Bryce's call, so it
  must not grow one
- `CheckInHistory`: the list of a goal's check-ins inside The result card,
  newest first, three shown and "Show all {n}" to expand in place. Each row
  swipes (via `SwipeActions`) to Delete, and the delete **waits for the
  server** instead of being optimistic, like the other destructive verbs.
  The Delete label names the value ("Delete 183 lb check-in from Nov 4"),
  because two rows can share a date
- `ProgressBar` — the only way to show a fraction
- `ToggleSwitch`: the only on/off switch (`DashboardItemPicker`, `HabitForm`, `GoalForm` and `HabitsChoresSettings` use it)
- `LogButton` — the 44px round log/undo control for habits
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
  meaningful. A "can't reach the server" failure (a save that never landed)
  is also `text-warn`: the person did nothing wrong, but nothing is
  destroyed either, and they can try again. The Vision board and
  `VisionSheet` errors follow this.

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

- **The side drawer replaced the bottom nav** (2026-11, Bryce's call); the
  earlier no-top-bar decision is superseded. A later mission may add an
  optional pinned sidebar on wide screens.
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
