# STRUCTURE.md companion: Layout

Part of [STRUCTURE.md](../../STRUCTURE.md)'s "One source of truth" list,
cut from it word for word at commit e62056c on 2026-11-09 by mission 59.
Every rule here binds exactly like STRUCTURE.md; a second definition is a
BLOCKER. Each entry continues the headline kept in STRUCTURE.md.

## One source of truth

### Wide pages

Wide pages: the
  dashboard (mission-44), the Calendar (mission-46, every view), Plans &
  Goals' This week, Goals and Vision tabs, the Goal page and the recipe
  detail page (mission-51), and the Kitchen lists (mission-52): Inventory,
  Shopping, Expiring, Recipes (All recipes and Cookbooks), Cookbook detail
  and Meal plan. Their containers: This week's goal-card grid;
  the Goals board; the Vision card grid; the Goal page's two-panel row
  (`GoalDetail`, with the More row and every sheet outside it); the recipe
  body (two columns). The recipe header band is not a container, because
  it holds the action sheets. `plans/loading.tsx` mirrors This week's grid
  and `recipes/[id]/loading.tsx` the recipe body (mission-51, A-L5-1).
  Habits & Chores is wide too (mission-53, A-L3-1): `/habits`, Manage,
  Chore chart, Report and Stats, and New and Edit since mission-54. Its
  containers: Mine's top strip and its column grid; one round both Whole
  family layouts; Manage; the Chore chart (and each of its day cards);
  Report Year; Stats. `HoursLogSheet` and `ChoreChartSheet` are the
  containers' siblings. Whole family switches layouts at a 45rem
  container while `data-fills-width` reacts at `md`; they agree because a
  768 screen (or 1024 with the Sidebar pinned) leaves a 736px container.
  Stats goes to two columns from a 50rem container only when its right
  column has something (nudges, Side by side, or an hours habit's
  `HabitHoursDetail`); otherwise it is one column capped at `max-w-3xl`. A page that should
  use the whole width of a landscape iPad puts `data-page-width="wide"` on
  its root element (and on its `loading.tsx` root, so it is wide from the
  first paint). From `md` up, `<main>`, the wordmark header's row and the
  floating hamburger's row lift their 768px cap for it; nothing else about
  the frame changes, so the page still scrolls as a page (unlike
  `data-fills-width`). Three rules hold for every wide page:
  1. **The CSS container wraps the columns only, never `<main>` and never
     an element that holds a sheet or a fixed bar,** as a precaution:
     older browser engines treated a container as the positioning parent
     of every `position: fixed` descendant, which would pin a bottom sheet
     inside the page. (Story: docs/history/structure-rationale.md, "Wide pages: rule 1 and the container proof".) Keep sheets
     outside the container or portal them. The dashboard's container holds
     its grid, and the Customize sheet is the container's sibling. Known
     exceptions (work in Chrome; on Bryce's iPad check): `HoursLogSheet`
     renders inline from the Habits tile, inside the dashboard container;
     on the recipe page, `NutritionSection` (Confirm servings),
     `RecipeCookbooksSection` and `RecipeTagsSection` render their sheets
     inline inside the body container. Do not add to this list: a new
     sheet goes outside the container or is portaled (mission-51, A-L5-4).
     Portaled instances: Settings' two sheets (`NavModeSetting`'s
     `RadioSheet`, `AdminPasswordSheet`'s overlay; mission-54), which render
     only after a tap, so `document.body` needs no server branch.
  2. **Column counts come from container variants (`@min-[…]:`, `@3xl:`),
     never screen breakpoints (`md:`, `lg:`).** The page then fits whatever
     room the pinned Sidebar or Rail leaves it, with no extra code.
     **Measured column counts (mission-52).** When JavaScript must decide
     which item goes in which column (a stable split, so a group never
     changes column when it opens or closes), the component measures the
     element whose width the columns divide with `useContainerWidth(ref)`
     (`src/lib/useContainerWidth.ts`) and turns that into a count with
     `columnCountFor(width, max)`, splitting with `splitByWeight`
     (`src/lib/splitColumns.ts`). That is still the container's own width,
     never the window's, so this rule's reason holds. `COLUMN_MIN_WIDTH_PX`
     (2 columns from 768px, 3 from 1024px) is the only JavaScript home of
     those thresholds; the classes `@min-[48rem]:` and `@min-[64rem]:` are
     their CSS mirror at Normal text size and change with them. A width
     threshold written as a
     number in a component, a read of `window.innerWidth` or `matchMedia`
     for layout, or CSS `columns` for a list of groups is a BLOCKER. The
     measured element holds no sheet, stays mounted in every state of its
     list (empty, searching, grouped), and reads 0 on the server, so the
     first paint is one column and hydration matches; the step to 2 or 3
     columns after a hard reload is the known cost. Measuring an element
     through a ref this way is not a browser-only read under the
     `useSyncExternalStore` rule (`useHamburgerRowHeight` is the same
     shape). Use a measured count only when JavaScript needs it: a small
     fixed set of columns (Expiring's three sections, Cookbooks' cards, a
     week's seven days) uses container variants. Instances: Inventory,
     Shopping, All recipes and Cookbook detail (split), and the Meal plan
     and Feedback (each picks its wide layout at `COLUMN_MIN_WIDTH_PX[3]`;
     Feedback because a sheet below that width and a panel above it is a
     choice JavaScript makes). (Captain's A-L4-1.)
     **Container thresholds and Text size (mission-58).** A rem container
     variant (`@min-[48rem]:`) follows the Text size setting, because a
     container query's rem is the root font size: at Large (110%) it
     switches at 845px, at Larger (135%) at 1037px, at Largest (150%) at
     1152px, so bigger text gets fewer, wider
     columns. That is the default and is intended. `COLUMN_MIN_WIDTH_PX` and
     media queries do not move (a media query's rem is the browser default),
     so at any size above Normal a measured layout and its skeleton's
     `@min-[…rem]:` mirror may differ by one column step; that is the known
     cost, not a mirror to fix. A container threshold that must not move with
     Text size, because the layout below it is the phone layout and a tablet
     must keep its own at every size, is written in px with a comment at the
     class naming mission-58 and why. Instances: `MonthCell.tsx`
     (`@min-[768px]:`, the Month grid's lanes, pills and "+N more") and
     `TimelineDayColumn.tsx` (`@min-[128px]:`, a narrow column's title size
     and time line), and the Calendar body's month panel
     (`MONTH_PANEL_BESIDE_MIN_PX`, 700px, compared in JavaScript against
     the body's measured width by `monthPanelBeside` in `gridClasses.ts`,
     which also needs room for seven usable columns at the live root font
     size: an upright iPad's body is 736px, mission-72). A new px container
     threshold outside this list, or a rem one put back in these files, is
     a BLOCKER. (Added mission-58, on
     Captain's ruling; Bryce approved 2026-11-09.)
  3. **A row never stretches past a readable width.** More columns, more
     panels or a wider grid; never one 1148px row. One exception: the
     recipe form's Title spans both columns, because Bryce's plan draws it
     that way (mission-54). A short single-line field that spans a form is
     allowed only there. A new one needs the same written reason here.
     Fixed bars (`AddItemBar`) stay centered at 768px.
  4. **The + button sits bottom-right on wide pages** (mission-52 and
     mission-53, plan rule 4; its props are in "The floating +" below). `FloatingAddButton` keeps its fixed full-width wrapper (left
     edge `--app-nav-width`); from `md` on a wide page its inner box lifts
     the 768px cap and aligns right. Below `md`, and on a page that is not
     wide, it stays bottom-left, unless `placement="right"` (the
     Calendar only, mission-67). A fixed element that must clear it on a wide
     page reacts with the same `md:[body:has([data-page-width=wide])_&]:`
     selector, never a measured offset: the All recipes A-Z rail
     (`RecipeLetterRail.tsx`) ends above it. `AddItemBar` stays centered at
     768px (rule 3). (Captain's A-L4-3.)
  **A page's title row may switch with `md:`** (mission-52). A title with
  at most two buttons beside it is not a column count, so it may go from
  stacked to one row with `md:flex-row md:items-center md:justify-between`,
  and one button may be rendered twice, shown with `md:hidden` and
  `hidden md:flex`, when its phone and wide positions differ (Cookbook
  detail's Add recipe). (Story: docs/history/structure-rationale.md, "Wide pages: why the title row may switch".) The row must fit the 736px the Sidebar leaves at a
  1024px screen. Anything below the title row, or a row with more than two
  buttons, uses container variants. (Captain's A-L4-2.)
  **A wide page's loading file.** A wide page's `loading.tsx` renders
  `<SkeletonPage wide />` (or its own skeleton with the attribute on its
  root); the shared `(app)/loading.tsx` stays narrow and now serves only
  `/lists` and `/login`; the recipe print page keeps its own plain
  skeleton. A short page counts as wide here (A-L6-8). `profile/loading.tsx`,
  `settings/wall-tablet/loading.tsx` and
  `kitchen/cooking/recipes/new/loading.tsx` are their own skeletons: the
  `data-page-width="wide"` root, then `SkeletonHeader` and `SkeletonList`
  (Wall tablet has four: one row for the start page, then one per
  section) inside `NARROW_PAGE_CLASSES`. `settings/loading.tsx` renders
  `<SkeletonPage wide>` with two lists in `TWO_COLUMN_CLASSES` inside a
  container, and it also covers Manage family, which has the same two
  columns. `settings/feedback/loading.tsx` renders `<SkeletonPage wide>`
  with a list and a panel block, in a grid that mirrors `FeedbackList`'s
  measured split at 64rem (A-L6-6). `recipes/[id]/edit/loading.tsx` is
  form-shaped and takes its strings from `gridClasses.ts`.
  `recipes/new/manual/loading.tsx` re-exports it, because the manual form
  is the same full-width form and needs its own file to escape
  `recipes/new/loading.tsx`'s 40rem cap. A route whose skeleton is exactly
  another route's re-exports that file and never copies it. The habit,
  goal and calendar forms, New task included, use their folders' wide
  list-shaped skeletons (older, allowed). A new narrow page under one of
  these folders needs the route-group move below or its own plain
  `loading.tsx`. A `loading.tsx` also covers every route below its folder, so a wide
  one sits only in a folder whose pages are all wide. Where a wide page has
  narrow pages below it, the wide page and its `loading.tsx` move into a
  route group (`kitchen/cooking/recipes/(browse)/`), so the narrow pages
  keep the shared skeleton. (Captain's A-L4-4.)
  **Pending (A-L4-5, adopt when a fifth list needs it or two of these are
  next touched):** the measured split grid (`grid items-start gap-x-4` with
  `gridTemplateColumns: repeat(n, minmax(0, 1fr))`, after `columnCountFor`
  and `splitByWeight`) is written in `PantryList`, `GroceryList`,
  `RecipeList` and `FlatRecipeRows`. It moves into one `SplitColumnGrid`
  component (ref, count, split, grid, one render prop per column); after
  that a hand-written copy is a BLOCKER. Not a BLOCKER until it exists.
  The Calendar's containers are the Year grid, the Month grid, each
  `TimelineDayColumn` (so text size follows the column's own width, not
  how many columns there are) and the Schedule two-panel row (plus the
  all-day "+N more" label's own older container); never the
  `CalendarViews` root, which holds every sheet. `data-page-width="wide"`
  and `data-fills-viewport` combine on the Calendar: the first lifts the
  width cap, the second drops the bottom padding on the hour timeline.
  The Kitchen lists' containers are Inventory's and All recipes' search
  rows, Expiring's sections and Cookbooks' cards; Inventory, Shopping, All
  recipes, Cookbook detail and the Meal plan measure instead (rule 2).
  Every sheet stays a sibling. (Mission-52.)
  **Forms, Settings, Manage family and Feedback (mission-54, A-L6-2).**
  Every signed-in page is now wide except `/lists`, `/login` and the recipe
  print page. The long forms are New and Edit habit, New and Edit goal, New
  and Edit event, and the manual recipe form with recipe Edit. The short
  pages are New task, the Add recipe chooser, the paste, link and photo
  imports, Profile, and Wall tablet (mission-62). Settings, Manage family, Feedback and Slideshow
  photos (mission-57) are wide too.
  Containers: each long form's `<form>` (`HabitForm`, `GoalForm`,
  `EventForm`, `RecipeForm`), with the grid as its child because a
  container query never measures its own element; the div round Settings'
  two columns; the div inside `FamilyList` round the list and its `aside`
  slot (the page's Family order block); the div round Slideshow photos'
  grid (its sheet is portaled). Short pages have no container.
  Feedback measures instead (rule 2). A `<form>` may be the container only
  while it holds no sheet or fixed bar; a form that gains one portals it or
  moves it outside. In `FamilyList` the +, the spacer and the three sheets
  are the container's siblings.
  **Short pages (mission-54, A-L6-8, decision 276).** A short page is a
  wide page with its whole content, BackLink and title included, inside
  `NARROW_PAGE_CLASSES` (centered, at most 40rem). It is not a page left at
  the old 768px cap. Its `loading.tsx` is wide at the root and capped with
  the same constant inside, so the placeholder is as wide as the page. The
  three import components take their BackLink and title as a
  `header: React.ReactNode` prop and own the cap, because whether it
  applies depends on their own state: it lifts when the extracted
  `RecipeForm` appears. The page keeps the words.
  On the dashboard, an Extra large Calendar widget is its own container
  (its day list): its days sit side by side from 30rem of tile body (3
  days as 3 columns; 7 days wrap at a 13rem column floor, decision 240)
  and stack below that. Where two widths need different row caps, both
  lists may be rendered and a container variant shows one; that is allowed
  only for a small fixed list (at most 7 days), never one that grows with
  data. (Mission-49.)
  (Mission-46, Captain's A-L2-1.)
  **Column dissolve (mission-51, A-L5-2):** a two-column layout may set a
  different phone order with one DOM: each column div carries
  `@max-[48rem]:contents` and each child an `order-N`, so below 48rem the
  columns vanish and the children reorder in the parent flex column or
  one-column grid. Allowed only for a small fixed set of sections (the
  recipe page's seven, Settings' eight); never for a list that grows with
  data, because `order` breaks the match between reading order and DOM
  order there. The order is written once, in the page's top comment and
  its classes.
  **Leveling two columns (mission-54, A-L6-9).** A page may level the tops
  of its columns from the column div with
  `@min-[48rem]:[&>:first-child>*]:mt-N`, when the first child is a plain
  wrapper the page owns round a card that takes no `className`. It sets
  that one top margin and nothing else. A child selector that changes any
  other property of a component's insides, or reaches deeper than the
  card's root, is not allowed. Where the card already takes a `className`,
  use that (A-L5-9). Instance: Settings.
  **The one screen breakpoint (A-L5-3):** rule 2's exception: `RecipeHero`
  switches from the phone hero to the small icon tile at `md`, a screen
  breakpoint, because it sits in the header band (which holds sheets, so
  cannot be a container) and `md` is exactly where `<main>` lifts its
  width cap for a wide page. It is decoration, not a column count. A
  second screen breakpoint on a wide page needs the same written reason
  here.
  **The Goals board (A-L5-5)** places its six areas in pure CSS,
  column-major: `grid-flow-col` with a row count of ceil(visible areas / 2)
  at 2 columns (a `--board-rows` variable) and 2 rows of all six at 3
  columns, because the mock stacks fixed pairs. An empty area renders only
  at 3 columns (`hidden @min-[64rem]:block`, `GOAL_BOARD_EMPTY_AREA`). No
  JS split helper while the list is the fixed `LIFE_AREAS`.
  **The floating + (mission-53, A-L3-2):** `FloatingAddButton` is the
  only floating +. It sits bottom left of the 768px column on non-wide
  pages, and on wide pages below `md` (phones stay clear of the last
  row's check); bottom right on wide pages from `md`, through its own
  wrapper (`md:[body:has([data-page-width=wide])_&]`). Its props are
  `onClick` or `href`, `label`, and `placement` (`"auto"`, the default,
  follows the rule above; `"right"` sits bottom right at every width).
  Only the Calendar uses `"right"` (mission-67; DESIGN.md records why it
  may cover events). Two more optional props serve a + that opens a
  menu (only `CalendarAddDial`, mission-68): `expanded` (sets
  `aria-expanded`, shows an X, lifts the button above the z-[60] dim) and
  `buttonRef` (focus returns to it on close). Unset, they change nothing. Wide scroll areas reserve room for it
  (`pb-20`). There is no + on the tablet. A fixed element that must clear
  it follows rule 4 above.
  **The month panel marker (mission-72, Captain's ruling).** While
  `data-month-panel="open"` is on the page, a pinned Sidebar draws as the
  icon rail (with its "Show menu names" button, Bryce 2026-11-11) without
  changing the person's Menu style: `PinnedNav` renders its sidebar and
  rail bodies and the marker picks one, and `AppChrome`'s row overrides
  `--app-nav-width-lg` with `--app-nav-rail-width` (`NAV_RAIL_WIDTH`) in
  sidebar mode only. The pinned aside's width reads
  `var(--app-nav-width-lg)`, so the aside and every fixed bar move
  together. That override is the one `!important` in the chrome (it must
  beat the inline variable); a second, a hard-coded nav width, or a page
  changing `navMode` to get this look is a BLOCKER.
  **Edge to edge (the Calendar, mission-67, Captain's ruling).** A
  surface that must reach both screen edges cancels `<main>`'s side
  padding on its own root with `PAGE_BLEED_CLASSES` (`-mx-4`,
  `src/lib/gridClasses.ts`), never with a new page attribute or a change
  to `<main>`. It reaches the edge at every width because a wide page's
  `<main>` has no cap from `md` and a phone is narrower than the 768px
  cap. Instances: `TimelineGrid`'s root (Day, 3 Day, Week), `PagedMonth`'s
  swipe area (Month; mission-69), and their skeletons in
  `calendar/loading.tsx`. The bleed goes on the outermost root: inside an
  `overflow-hidden` parent a bleeding child is clipped (mission-69,
  Captain's finding). A bleeding surface
  draws no rounded box and no outer left or right line. The top bar,
  Schedule's list and Year stay inside the padding. Strips that bleed and
  pad back (`-mx-4 ... px-4`: the pinned Schedule bar, `MonthChips` and its
  skeleton) use the same mechanism; a new one uses the constant. `<main>`'s
  `px-4` and `PAGE_BLEED_CLASSES` change together.
  **Shared class strings (mission-53, A-L3-3; A-L2-3 done):** a class
  string that a component and its skeleton share is one exported constant
  in `src/lib/`, written as a whole literal so the Tailwind scan finds it:
  `DASHBOARD_GRID_CLASSES` / `DASHBOARD_CELL_CLASSES` (`dashboardGrid.ts`),
  `YEAR_GRID_CLASSES`, `HABITS_DAY_GRID_CLASSES`, `FORM_GRID_CLASSES`,
  `FORM_COLUMN_CLASSES`, `FORM_SPAN_CLASSES`, `FORM_SAVE_WIDE_CLASSES`,
  `FORM_EYEBROW_CLASSES`, `TWO_COLUMN_CLASSES`, `NARROW_PAGE_CLASSES`,
  `PAGE_BLEED_CLASSES`, `CALENDAR_VIEW_ROW_CLASSES` and
  `CALENDAR_VIEW_CIRCLE_CLASSES` (`gridClasses.ts`).
  `CALENDAR_VIEW_ROW_CLASSES` and `CALENDAR_VIEW_CIRCLE_CLASSES` share the
  Calendar top bar's 48rem container threshold (the row shows where the
  circle hides) and change together (mission-67). A skeleton that types its own copy is a BLOCKER, and
  so is a long form, a two-column settings page or a short page that types
  its own copy of the form grid, the two-column grid or the 40rem cap
  (mission-54). `FORM_GRID_CLASSES` and `TWO_COLUMN_CLASSES` differ only by
  the row gap and change together. `FORM_SAVE_WIDE_CLASSES` also dresses
  the buttons that stand under Save on a form (`HabitEditActions`, decision
  284). A component that picks its layout by measuring (rule 2) has no
  container-variant string to share, so its skeleton may type the matching
  `@min-[…]:` grid, with a comment naming the component and the
  `COLUMN_MIN_WIDTH_PX` entry it mirrors (`settings/feedback/loading.tsx`,
  mission-54).
  The wordmark header has an empty slot, `WORDMARK_HEADER_ACTIONS_ID`
  (`src/lib/appChrome.ts`), at its right end; a page whose state owns a
  header button portals the button into it (the dashboard's Customize,
  decision 221). It is the same shape as `SCHEDULE_TITLE_SLOT_ID` in
  `CalendarHeader.tsx`, but the id lives in `src/lib/` because both the
  chrome and the page import it. The page list and the order the pages go wide in
  are in `.avengers/plans/ipad-landscape-v1.md`.

### A measured dimension of app chrome

**Closed in mission-23:** the header now exists only on `/`
  and `/login`, and the dimension pages position against is the floating
  hamburger's row, `HAMBURGER_ROW_HEIGHT` (a CSS length in rem, so it
  follows Text size; mission-58), plus the measuring hooks
  `useHamburgerRowHeight` and `useHamburgerInsetPx` (the inset and live root
  size Schedule reads), in `src/lib/appChrome.ts`, which lists its
  dependents. A px copy of the row there is only a first-paint seed; new code
  never positions against it. A component that reads those hooks to position
  a surface is a dependent and joins that comment in the same change
  (mission-54, A-L6-12). Mission 25 adds the pinned menu's widths there,
  `NAV_RAIL_WIDTH` and `NAV_SIDEBAR_WIDTH` (CSS lengths in rem since
  mission-58, read through `pinnedNavWidth`), feeding the `--app-nav-width`
  CSS variable that the fixed bars use as their left edge. The Schedule bar's
  height (`SCHEDULE_HEADER_BAR_HEIGHT_REM`) and `SCHEDULE_TITLE_SLOT_ID` stay in
  `CalendarHeader.tsx`. Mission 44 adds `WORDMARK_HEADER_ACTIONS_ID` (the
  wordmark header's right-end slot) to `src/lib/appChrome.ts`. (Added 2026-09-05, mission-16; Bryce approved.) (Story: docs/history/structure-rationale.md, "Chrome dimension rule: the 73px header story".)
