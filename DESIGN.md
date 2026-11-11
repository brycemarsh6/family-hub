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
  `<main>` reserves its row (`HAMBURGER_ROW_HEIGHT`, in rem since mission-58) above the content. **Size and reachability are different properties.** (Added 2026-09-03
  on Strange's ruling, mission 9: Month's grid passed every size check while
  one of its day numbers opened the Add sheet instead of Day view, and the
  first measurement — taken scrolled to the bottom — reported zero failures
  and would have shipped it. Measure at the position the user arrives at.)
  **Recorded exception: the Calendar's + (Bryce, 2026-11-10,
  mission-67).** On every Calendar view the round + is a fixed overlay
  that the hour timeline reserves no room for, so it may cover part of an
  event block, an all-day bar or a Schedule card. Bryce accepted that,
  because a covered item is always reached another way: by pinching the
  hours (a zoomed block grows out from under the +), by Schedule (every
  item as a full-width row, and the list scrolls clear), or on Month by
  scrolling, because Month's page keeps `<main>`'s 6rem bottom padding
  below the grid so its last row always scrolls clear of the + (measured
  32px clear on a 393 phone). The
  exception covers the Calendar's + only. Any other floating control, and
  the Calendar's + on a future view that can neither scroll nor zoom its
  content out from under it, must still pass this rule.
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
  its duration. The hour height is each person's own pinch zoom, 32 to
  192px per hour (default 48; never shorter than the whole day filling the
  visible rail), so a `MIN_BLOCK_MINUTES` (30) block draws 16 to 96px
  (mission 65). Inflating past its geometry would either paint over a
  neighbour or reintroduce the ambiguous tap the floor exists to prevent,
  and a fixed rail tall enough to clear 44px would cost most of the visible
  day on the app's most-used view; zoom puts that trade in the reader's
  hands instead. Under 20px the title drops to a 0.75rem line, which fits
  whole at Normal text size; at larger Text sizes on a tablet a short
  title can still lose its letter tails (a known limit, mission 65). The boundary: **(a)** every block
  stays a real `<button>` with a real accessible name; **(b)** consecutive
  blocks never abut — each draws 2px shorter and 2px narrower than its
  computed geometry, so a near-miss lands on a non-interactive seam instead
  of opening the wrong event; **(c)** the all-day strip's bars, its
  "+N more", **and its "− Show less" collapse counterpart** share that same
  24px as a **floor, not a derivation** — they
  have no duration to be faithful to, which is why 24px is the minimum they
  may be and never a licence to go under it; **(d)** Schedule (112px
  full-width rows, listing everything) is the conforming route and must
  stay one tap away in the picker. The boundary holds at every zoom.
  **Nothing outside the timeline inherits this.** *(Strange's ruling, mission-17 rounds 1–2. Round 1 rejected an
  18px all-day bar as arbitrarily smaller with a dead-end overflow; round 2
  accepted 24px once both were fixed, because the residual is then
  identical in kind to the timed block beside it. The precedent it rests on
  is the app's own: in Month the **cell** is the 44px target and the pills
  inside it are non-interactive.)*
- **Sizes are rem, not px, so Text size reaches them (mission-58).** Text,
  spacing, tap targets and any chrome dimension written into a `style` are
  rem (Tailwind's scale, or an arbitrary value such as `text-[0.625rem]`),
  because the Text size setting raises the root font size on wide screens
  and a px value stays put while everything around it grows. Never write
  `text-[Npx]`; convert as N/16 rem. Px on purpose, and only here: **(a)** the
  hour timeline's geometry (hour height, event top and
  height, the 48px hour gutter), under the hour-timeline exception above,
  and text that must fit inside that px gutter, capped with `min()` (the
  drag marker is `min(0.6875rem, 12px)`, so it grows with Text size until
  it would no longer fit); **(b)** container thresholds that must not
  move with Text size (`docs/structure/layout.md`, Wide pages rule 2);
  **(c)** a number JavaScript needs, which is measured or derived from the
  live root font size, never assumed to be 16 (a `_PX` constant may only seed
  the first paint); **(d)** Lucide icons' `size` prop, which `globals.css`'s
  Text size block scales with `zoom`; **(e)** hairline borders (1px, 2px);
  **(f)** the pinned side menu (rail and sidebar), which stays its Normal
  size at every Text size so all its destinations always fit (Bryce,
  2026-11-09): its width is px and its contents sit in a wrapper marked
  `data-text-size-reset`, which `globals.css` zooms back to Normal.
  *(Reason: Strange's mission-58 pass 1 found 17 files of px text staying
  small while the page grew, and a px menu row covering every page's first
  line. Captain's ruling; Bryce approved 2026-11-09.)*
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
- **A gesture is never the only way to change something.** Hold and drag
  on the hour timeline moves an event (mission-70), and the event's edit
  form still changes its time, through the same Server Action path and
  Google push (`afterEventSaved`). A future gesture (resize, drag in
  Month, drag a task) ships with its form or button route intact, because
  a gesture can't be found by looking, can't be done by a screen reader,
  and fails on a shaky hand or a wet wall tablet. Only logins that can
  edit (`canManage`) get the gesture; for anyone else the item behaves
  exactly as before (a tap opens it). (Bryce approved 2026-11-10.)
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
  `HAMBURGER_ROW_HEIGHT` above its content, so the button is never an
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
  right thumb lands on an iPad (mission-53). Below `md`, and on pages that are not
  wide, it stays bottom-left on every page but the Calendar, clear of a row's check and of the Recipes A-Z
  rail; on wide pages that rail ends above the button (mission-52,
  decision 266). **The Calendar is the one exception: its + sits bottom
  right at every width, phone included** (`placement="right"`; Bryce,
  2026-11-10, mission-67). The Calendar has no row check and no letter
  rail at its right edge to clear. Only logins that can add (`canManage`)
  see it; it opens the Event and Task bubbles (mission-68, the exception
  under "Sheets are the house dialog").
- **The drawer reaches every destination directly; there are no landing
  pages.** `BackLink` is the one edge back up from a page below a drawer
  destination (recipe detail to Recipes), never on a destination itself.
  Every page below a drawer destination carries one: explicit `href` (never
  `router.back()`), label naming the destination ("Recipes"),
  not the action ("Back").
- **Sheets are the house dialog**: bottom sheet on phones, centered dialog on
  wider screens. Multi-step flows live in *one* sheet with an internal view
  state machine — never stacked modals (two Escape listeners fight over one
  keypress). **One named exception: the Calendar's add menu**
  (`CalendarAddDial`, mission-68, Bryce 2026-11-10). Tapping the
  Calendar's bottom-right + dims the page and pops Event and Task bubbles
  right above it, and the + becomes an X; there is no sheet. The reason is
  one-handed reach: the choice appears where the thumb already is instead
  of across the screen. It keeps the sheet's manners: the house dim
  closes it, Escape closes it, focus moves to the first bubble and back to
  the + on close. Any other menu is still a sheet.
  **A second named exception: the Calendar's month panel**
  (`MonthJumpPanel`, mission-72, Bryce 2026-11-11). Tapping the month
  title opens month chips and a little month (`MiniMonth`) inside the
  page, not in a sheet, and the title's arrow turns up. On a phone it
  drops down under the top bar and pushes the calendar down. On an iPad,
  on Schedule, Day, 3 Day and Week, it is a column on the left and the
  calendar moves over, when the calendar keeps room for usable day columns
  (an upright iPad at any Text size above Normal gets the drop down
  instead; held sideways it stays beside, a pinned Sidebar squeezing to
  the rail to make room).
  On Month and Year only the chip row drops down, because the big month is
  already on screen. The reason: you keep seeing the calendar you are
  jumping from, and on the iPad the little month can stay open while you
  work. It has no dim and no Escape: it closes when you tap the title
  again, and on the phone also when you pick a day. The phone always
  starts closed; the iPad remembers it for each person. While it sits
  beside the calendar, a pinned Sidebar shows as the icon rail, and your
  Menu style does not change. On Schedule it stays in view while the list
  scrolls, and opening or closing it never moves your place in the list
  (mid-list on a phone or an upright iPad it covers the top of the list
  rather than pushing it down). Any other picker is still a sheet.

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
- `HabitsBar` / `HabitFilterSheet`: the one thin bar at the top of Habits &
  Chores, on both views and every screen (decisions 255, 258; mission-53):
  the day as the page title with a subtitle ("Mine · 2 of 7 done" and the
  chore streak flame, or "Whole family"), then Filter, 44px back and
  forward arrows around Today (a past day, up to 14 back, is view only:
  "Looking back. Past days are view only." under the bar, plain markers,
  no buttons), Manage, and a bar-chart icon for the Report. It wraps to two
  rows on a phone; the tablet login has no Manage, Report or +. The Filter
  sheet holds the Mine / Whole family switch (kept in the URL,
  `?view=family`) and the Time of day, Together only and People filters
  for every column (decisions 257, 261); the button reads "Filter · N".
- Mine (`HabitTodayList`): Morning, Afternoon, Evening and Anytime
  columns, one neutral `bg-surface-2` tint with `bg-surface` cards and the
  time icons telling them apart (decision 256); 1 column on a phone, 2 on
  an upright iPad, 4 landscape. An empty column stays and says "Nothing
  this morning." and so on (decision 262).
- `HabitFamilyView` / `HabitFamilyColumn`: the Whole family view. On a
  phone it is a stack of person cards; from a 45rem container it is one
  tinted column per person, all fitting one screen when they can (220px
  each) and a 330px swipe strip when they cannot. Rows in both are grouped
  by time of day like Mine, with "Chore" and "Together" tags; a Together
  habit shows once in each of its people's cards, never in a separate
  strip. `HabitFamilyColumn` is one card (avatar,
  name, "x of y done" with skipped rows in neither number) and holds
  `FamilyHabitRow`, the compact line: icon and title linking
  to the stats page, streak label, 44px check. A row the viewer may not tick for
  shows its state in a plain marker that is not a button; a Together row's
  check does not name one person. The chore streak is a
  `--streak` flame and "N days" in Mine's subtitle and next to each
  person's count (2 or more, the Show streaks switch, always on the tablet); a person
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
- Wide forms, Settings, Manage family and Feedback (`mission-54-ipad-landscape-l6-forms-settings.md`,
  decisions 274 to 283 Hill, 284 Bryce): long forms go two columns from a
  48rem container, with small section labels on Habit, Goal and Event only
  in that layout. Save hugs its words at the foot of the second column, and
  Edit habit's Archive and Delete hug theirs under it, so a one-tap Delete
  is never the widest thing there; on a phone all stay full width. Short
  pages (New task, the recipe chooser and imports, Profile) are centered at
  640px, and an import lifts that cap when its full form appears. Settings
  and Manage family are two columns from 48rem. Feedback shows a 480px list
  beside a panel from a 64rem container ("Tap a report to read it here.",
  nothing opens by itself, the open row has an accent border); below that
  it keeps its sheet, and its rows stay at most 768px wide.
- Wide Plans & Goals and the recipe page (mission-51, decisions 244 to
  254, Hill): This week's goal cards sit 2 across from a 48rem container,
  never 3, because each card holds tappable plan rows; the Goals board is
  3 columns of two life areas each (column-major, Spiritual over Health
  and so on), 2 columns below 64rem, and shows every area at 3 columns
  with "No goals here yet" on an empty one so the board keeps its shape;
  Vision's six cards go 3 across from 64rem; the Goal page is two equal
  panels, The result left and The plan right, with the vision line under
  both. The recipe page keeps its three action circles (not pills) in a
  header band beside the title, drops the hero for a small icon tile from
  `md`, puts Ingredients in a fixed 25rem column beside the Steps, and
  Cooked today lives in the Rating card under the ingredients, not in the
  header; on a phone the order is Ingredients, Instructions, Notes,
  Rating + Cooked, Nutrition, Cookbooks, Tags. No cookbook names or tags
  are repeated in the header line (they have live sections with Add).
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
- `MiniMonth`: the one small month for jumping to a day (mission-72).
  Weekday letters, today filled `--accent`, the day on screen ringed in
  `--accent`, a small `--muted` dot under days that have something (only
  where events are loaded, never on today). Days outside the month are
  blank. Every day is at least 44px each way.
- `CalendarHeader`: the Calendar's one top bar, beside the floating menu
  button (mission-67, Bryce 2026-11-10). At the left, the month title with
  a small arrow that opens the month panel and turns up while it is open
  (mission-72): the first visible day's month, with the year only
  when it is not this year, with the month shortened so the year always
  fits beside the circles ("Jan 2027"; Bryce 2026-11-10), the year itself on Year, and
  on Schedule the month scrolling past. At the right, the Today, View and
  Refresh circles. No < > arrows and no Add circle: moving is swipe, Today
  and the title; adding is the bottom-right + (see the + rule above).
  From a 48rem bar, a container query in rem so a bigger Text size falls
  back by itself, `CalendarViewRow` replaces the View circle: the six
  views from `CALENDAR_VIEW_OPTIONS` in one segmented row, each at least
  44px tall, the current one `aria-pressed` on a `bg-fg` pill, the others
  `text-muted-strong` on `bg-surface-2`. It is a third allowed carve-out
  beside `PageTabs`, like the Vision board's 5 / 10 / 15 yr switch: it
  picks one of the Calendar's own views through the same state the View
  picker sheet sets, and it never holds a second list of view names.
- The lifted event block (mission-70, Bryce approved the mock
  2026-11-10): holding a timed, single-day event for 400 ms lifts it,
  for parents and admins only. Lifted means `scale` 1.04, a shadow, a 2px
  `--accent` outline and `z-15`; nothing else may use that look, so a
  lifted look always means "this is moving". While lifted, three things
  tell the same time, and they must always equal where a drop would
  land: the block's position (snapped to 15 minutes), its own time line
  where the column is wide enough to show one, and the gutter marker, a
  small bold `--accent` start time ("4:30", no AM/PM, just "3" on the hour, on `--bg`) in the
  hour column that hides any hour label it would sit on. The marker must
  fit inside the gutter at every Text size; a clipped digit changes the
  time it claims. The target day's header takes an `--accent` 15% tint
  when the block crosses to another day. All-day, multi-day and task
  items never lift and never look liftable. Under reduce motion the
  glide back is instant.
- `UndoBar`: the one bar for "that just happened" after a change
  (mission-70's "Moved to Wed 2:15 PM", PR 8's tasks next). A neutral bar
  is `bg-fg text-bg` with an optional action button (at least 48px, bold
  and underlined, in the bar's own text colour) and `role="status"`; a
  refusal or failed save is `tone="warn"`, never danger (see "Error
  color"), `role="alert"`, with no action. One at a time (a new message
  replaces the old and restarts the clock), 5 seconds, then gone. It sits
  at the bottom, on the + row and left of it with at least 16px clear,
  above the safe area. It covers content only for those 5 seconds, which
  is why it is not held to "A target must also be unoccluded" the way a
  permanent overlay is; anything longer-lived than a few seconds is.
  A new undo or notice reuses it rather than adding a toast. (Bryce
  approved 2026-11-10.)
- `RepeatMoveSheet`: what a drop of one day of a repeating Google event
  asks (mission-71, Bryce approved the mock 2026-11-11). A house sheet
  titled "Move a repeating event", one line saying where it is going
  ("Wake Up, to Thu 7:30 AM."), then **This one** (accent, on top), **All
  of them**, **Cancel**; tapping the dim is Cancel. It sits at the bottom
  at every width, the iPad included, so the dropped block stays in view
  (Bryce, 2026-11-11). It is never danger-coloured, because nothing is
  deleted. On another day "All of them" is not offered, and a grey line
  says why ("Only this one can move to another day. To move every Wake Up,
  drop it on the same day at the new time."). While it asks, the dropped
  block keeps the lifted look, because it is still moving, but the gutter
  marker and day tint are gone: the sheet's line is the one place the time
  is told. Cancel glides the block home and saves nothing. "All of them"
  moves every day on screen at once, then the bar says "Moved every Wake
  Up to 7:30 AM" with Undo; if Google says no, every block glides back and
  a warn bar gives the reason. A repeating event's block shows Lucide's
  `Repeat` mark after its title, so a person knows before dragging that
  the drop will ask (Bryce, 2026-11-11); the title wins when space is
  short.
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
  A refused move (mission-70: a drop the server will not save, such as
  "That move would cover a whole day") is also warn: the block glides
  back to where it was, nothing was lost, and the reason shows in a warn
  `UndoBar`. Red would claim something was destroyed.

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
- **No recipe photos**: C7 was dropped (Vercel Blob is paid). On phones
  the gradient + `ChefHat` hero is the permanent treatment, not a
  placeholder; from `md` up (upright iPad included) the recipe page shows
  a small `ChefHat` icon tile beside the title instead (decision 216,
  mission-51).
- **Single-tap delete stays** unless real accidental-deletion pain appears.
- **No third-party app is the design reference** — earlier Todoist/Monarch
  comparisons were explicitly dropped.
