# iPad landscape: every page uses the full width

**Status:** APPROVED by Bryce, 2026-11-07 ("Yeah, that all looks good. Let's
keep going with it."). Builds as missions 44 (L1) onward.
**Asked by:** Bryce, 2026-11-06 ("I want everything to be landscape on the
whole app"), after seeing the kitchen iPad in landscape with empty strips
on both sides of a 768px column. Second pass on Fable, 2026-11-07, after
three read-only briefs of every page (Kitchen; Habits and Plans; Calendar,
Lists, Settings, chrome).
**Mocks:** Claude Design canvas "Marshee iPad landscape mocks"
(https://claude.ai/artifact/XpmoRsLuBuPUdwuRSzK25n), ten boards at
1180x820: Dashboard, Calendar Schedule, Whole family, Habits Mine, Recipe,
Inventory, Expiring, Meal plan, Goals, New habit.

## The problem

Every page sits in one centered column at most 768px wide (`max-w-3xl` on
`<main>` in `AppChrome.tsx:92`). A landscape iPad is about 1180px wide, so
about a third of the screen is empty. Only Whole family opts out today
(`data-fills-width`, which also pins the page to one screen height, so it
is the wrong lever for everything else). No page has width-aware code
beyond `md:text-3xl` titles and centered sheets.

## The rule (structure, Fury's call)

1. **The cap lifts per page as each page is adapted.** A page sets a
   `data-page-width="wide"` attribute (name final at build time) and
   `<main>` drops `max-w-3xl` at `md` and up when it is present. Pages
   not yet adapted keep 768px, so nothing stretches badly mid-rollout.
   The end state is every signed-in page wide.
2. **Pages size against their own space, not the screen.** Each wide
   page wraps its columns (only its columns: never a sheet or a fixed bar,
   and never `<main>`, as a precaution: older engines treated a container
   as the positioning parent of `position: fixed` sheets; current Chrome
   does not, mission-44, Vision) in a CSS
   container (`@container`, built into Tailwind v4; the repo already uses
   `@min-[…]` once in `TimelineAllDayStrip.tsx`). Pages use container
   variants (`@min-[45rem]:`, `@3xl:`), never `md:`/`lg:` screen
   breakpoints, for column counts. So the pinned Sidebar (256px) or Rail (72px) simply
   leaves the page less room and it fits what is left: no extra work.
   Breakpoints to use: 2 columns from a 768px container, 3 from 1024px,
   the 4-column dashboard from a 720px (45rem) container (mission-44:
   a 768px screen leaves a 736px grid, which keeps 4 columns).
3. **A row never stretches past a readable width.** Wide pages get more
   columns, more panels, or a wider grid, never one long stretched row.
   Rows with a stepper and a cart button stay 340px or wider.
4. **Fixed bars stay centered at 768px** (`AddItemBar`): a text box does
   not need 1148px. The `FloatingAddButton` moves to the bottom-right
   corner of the content area on wide pages (today it sits at the left
   edge of a centered 768px wrapper, which looks lost once the cap lifts).
   That change lands with the first wide page that has one (L4 Recipes or
   L5 Goals), where Strange can see it; L1 does not touch the button.
5. **Sheets are unchanged**: they already center at `md:max-w-md`.
6. The rule goes into STRUCTURE.md and DESIGN.md in step L1, before any
   other page changes.

## Every page, decided

Column widths below assume 1148px of content (1180 minus padding) with no
sidebar. With the Sidebar on, the container is about 892px and the
container rules step each page down one column count on their own.

### Dashboard (`/`)
The 4-column widget grid, each column about 275px instead of 172px. Twelve
Small tiles fill one landscape screen (rows are 152px minimum, 3 rows fit
under the header). **No page title or subtitle** (Bryce, 2026-11-07, canvas
comment: "Gives more space. The iPad is only 11 inch."): Customize sits in
the wordmark header row, and the grid starts about 90px higher, so a
fourth row of Small tiles fits. Open: phones too, or wide screens only.

### Calendar (`/calendar`)
- **Schedule:** a tappable mini month (440px) on the left, the endless
  schedule list on the right. Tapping a day jumps the list; the month
  highlights the day in view. The month-jump sheet stays for phones.
- **Month:** 7 columns at about 164px (from 105). Event chips can show
  readable titles instead of 9px lanes; "+N more" after 4 chips.
- **Week:** 7 columns at about 157px (from 98). Events become readable.
- **3 Day:** 3 columns at about 366px. **Day:** fills the width (one
  wide column reads fine for timed blocks). The timeline keeps its own
  scroller (`data-fills-viewport`).
- **Year:** 4 columns of mini months (3 rows of 4) instead of 2.
- **Event, task forms:** see Forms.

### Habits and Chores (`/habits`)
Bryce (2026-11-07) sent a reference screenshot of a family chore app and
asked for its structure on both views. The mocks (Family and Today boards)
follow it in Marshee's own style, not a copy of the other app's look:
- **One thin top bar:** the date in the title size on the left ("We know
  what the page is"), then Filter, a back arrow, Today, a forward arrow,
  and Manage. No "Habits and Chores" title, no Mine / Whole family chips:
  those move into the **Filter** pop-up (Mine or Whole family, people,
  time of day, Together only). The **+** is a round button at the bottom
  right (replaces the New pill).
- **Day arrows:** browse other days. Open for Bryce (or Hill): whether a
  past day can be checked off from here, or is read-only.
- **Whole family:** one tinted column per person (their avatar colour),
  with avatar, name and a "2 of 5" pill, a row of 44px Morning,
  Afternoon, Evening and Chores toggles that filter that column, then time
  of day headings and **tall cards** (icon above the name, a check circle
  on the right, the whole card is the tap target, at least 100px tall).
  Fit everyone when each column gets at least 220px (five people at
  1148px); otherwise 330px columns that swipe sideways, as today.
  `data-fills-width` stays for this view only.
- **Mine:** the same bar and cards; Pick a day (and the vacation banner
  or shout-out when present) as one strip under the bar; then the day as
  four columns, **Morning, Afternoon, Evening, Anytime**, each with its own
  done count, chores in their time column with a "Chore" tag. The Report
  link sits at the foot of the last column.
- **Manage:** Habits card left, Chores card right (drag to reorder inside
  each); Archived and the settings card below, spanning.
- **Chore chart:** the week as 7 day columns (about 155px each), chores
  as short rows, the inline add form collapses to a + per day. Below
  1024px, days flow 2 across.
- **Report:** Week and Month already flow; Year moves from `lg:grid-cols-4`
  to a container rule (4 across).
- **Stats (`/habits/[id]`):** header across the top; then two columns:
  left the three stat tiles and the month calendar, right the nudge cards,
  the side-by-side table and the week strips (hours habits: this week,
  hours by day, time logged on the right).
- **New, Edit:** see Forms.

### Plans and Goals (`/plans`)
- **This week:** goal cards in 2 columns (cards keep their width; the
  Sunday recap spans the top).
- **Goals:** a 3-column board, two life areas per column in the fixed
  LIFE_AREAS order (Spiritual + Health; Personal Growth + Relationships;
  Work and Money + Fun). Cards keep today's 4-line anatomy. The + moves
  to the bottom-right corner.
- **Vision:** the six cards 3 across, 2 rows (from 2 across, 3 rows).
- **Goal page (`/plans/goals/[id]`):** two panels: "The result" card with
  the check-in history on the left, "The plan" list with Add to the plan
  on the right. The More menu stays top right.
- **New, Edit:** see Forms.

### Kitchen
- **Inventory:** search box and location chips in one row at the top.
  Category groups in **2 columns**, split by a pure helper that balances
  the supermarket-order list into two stable halves by row count (not CSS
  `columns`, which would move groups between columns as they expand).
  Search results flow into the same 2 columns. Rows keep their phone
  anatomy at about 560px. `AddItemBar` stays centered.
- **Shopping:** same 2-column groups for "to buy"; "In the trolley" and
  Put away span below. Store chips in the top row.
- **Expiring:** the three urgency sections as **3 columns** (Eat now, This
  week, Coming up) at about 370px each; below 1024px, Eat now spans the
  top and the other two share the row.
- **Recipes, All recipes:** letter groups in 3 columns by the same stable
  split helper; sticky letter headers work per column; the A-Z rail stays
  on the right edge. Search and tag chips in one top row.
- **Recipes, Cookbooks:** a grid of cookbook cards, 4 across (title,
  count), like a shelf.
- **Cookbook detail:** the filter bar across the top, rows in 3 columns.
- **Recipe page:** the slim header row (icon, title, servings and times,
  the three action pills and Cooked today) across the top; **Ingredients
  (400px) beside the Steps**; Nutrition and Rating as small cards under
  the ingredients; Notes under the steps; Cookbooks and Tags in the header
  line and under Notes. The decorative hero block is dropped on wide
  screens (design call: see below).
- **Meal plan:** the current week as a **7-column grid** (slot rows:
  Breakfast, Lunch, Dinner, Snacks; day columns), titles wrapping to two
  lines, today's column tinted; "Coming up" weeks as cards 2 across and
  "Past weeks" collapsed, side by side below. Below 1024px the week
  falls back to the stacked day cards.
- **Recipe forms:** see Forms.

### Lists (`/lists`)
Coming soon; nothing to lay out. The Lists build follows the rule.

### Settings, Profile, Login
- **Settings:** two columns of cards: account card, Menu style, Manage
  family and Feedback links on the left; Habits and Chores settings,
  Vacation and Winnie on the right; Sign out under the left column.
- **Manage family:** the family list left, Family order right.
- **Feedback:** the report list on the left (about 480px) and the tapped
  report open on the right instead of a sheet.
- **Profile:** one column centered at 640px (five fields; no gain from
  width). **Login:** unchanged, a centered card.
- **Recipe print:** unchanged (paper).

### Forms (every New and Edit page)
Two columns with a clear split, Save at the bottom right of the second
column, labels "What" and "When and who" style headings only where they
help:
- **Habit:** left Kind, Track, Name, ideas, Life area, Icon; right Build or
  Quit, Who, How often or Hours, Time of day, Carry over, Private, Save.
  Edit adds See stats above and Archive and Delete under Save.
- **Goal:** left Life area, Name, ideas, For, Private, Target date; right
  Why, Track a number (Unit, Starting at, Target), Save.
- **Recipe:** Title across the top; **Ingredients beside Steps** (two tall
  text boxes, like the recipe page); Servings, Prep, Cook, Source and
  Notes in a row below; Save.
- **Event:** left Title, All day, Starts, Ends; right People, Location,
  Notes, Save.
- **Task, Paste, Link, Photo import, Profile:** short forms stay one column
  centered at 640px until they swap to the full recipe form.

## Steps (one PR and one chat each)

- **L1: the rule, the chrome and the dashboard** (mission 44). The opt-in
  attribute, the per-page container rule, the header slot for Customize,
  the dashboard wide, STRUCTURE.md and DESIGN.md written. Gates check 1180
  landscape with and without the pinned Sidebar, and 820 upright.
- **L2: Calendar** (Schedule + month, Month, Week, 3 Day, Day, Year).
- **L3: Habits and Chores** (Mine, Whole family fit-everyone, Manage,
  Chore chart, Report, Stats).
- **L4: Kitchen lists** (Inventory with the split helper, Shopping,
  Expiring, Recipes list, Cookbooks, Cookbook detail, Meal plan week).
- **L5: Recipe page, Goal page, Plans tabs** (This week, Goals board,
  Vision).
- **L6: Forms, Settings, Manage family, Feedback.**

Dashboard widgets W2 (the Calendar widget) waits for L1, so it is built on
the width rule; L2 and W2 share calendar code, so L2 goes first.

## Decisions (Bryce, 2026-11-07; numbering continues from mission 43)

- **215:** the four page types, the page list above and the ten canvas
  mocks are approved as the direction for every page.
- **216:** Recipe page: the decorative hero block is dropped on wide
  screens; a small icon sits beside the title.
- **217:** Whole family fits everyone at narrower columns (220px minimum)
  rather than keeping wide columns and swiping.
- **218:** Meal plan is the 7-column week grid.
- **219:** Goals is the 3-column life-area board.
- **220:** Feedback opens a report in a right-hand panel on wide screens.
- **221:** the Dashboard has no page title or subtitle on any screen size;
  Customize sits in the wordmark header row.
- **222:** Habits day arrows show past days read-only in the first build;
  checking off a past day is a later add.
- **223:** the reference iPad is the 11-inch size, 1180x820 in landscape
  and 820x1180 upright. Gates test both, plus 1180 with the Sidebar on.
- **224 (Bryce, 2026-11-07, L1):** the dashboard's top cards (Planned
  today, Pick a day, nudges) sit two across on a wide page, one column on
  a phone, chosen from the "Top cards" mock boards.

- **225 (Bryce, 2026-11-07, L2):** wide Month shows up to 4 event chips a
  day with 12px titles, then "+N more"; phones keep 3 (canvas board "L2
  Calendar: Month, wide").
- **226 (Bryce, 2026-11-07, L2):** the Schedule mini month marks the day
  at the top of the list with a ring that moves as the list scrolls;
  today keeps its filled circle.
- **227 (Bryce, 2026-11-07, L2):** the mini month flips to the list's
  month by itself; its arrows browse months without moving the list; a
  tapped day jumps the list. It stays in place while the list scrolls.
- **228 (Bryce, 2026-11-07, L2):** no busy-day dots on the mini month for
  now (the list loads about a month at a time, so far months would look
  empty).

## Open

- None for the plan. Per-step design details go to Bryce with a mock, or
  to Hill when he is away.
