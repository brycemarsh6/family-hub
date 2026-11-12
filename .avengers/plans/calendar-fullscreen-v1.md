# Calendar full screen v1 (the Google-style layout)

Status: **FINISHED** (all nine PRs merged; PR 9 is mission 75, 2026-11-12). Approved by Bryce 2026-11-10, every question answered (written on Fable, in the pinch-zoom chat). What is left is in "After the series" below and in `.avengers/status.md`.

This file is written for two readers: Bryce (plain English first in every
section) and the Claude session that builds each PR (the facts and file
names after it).

Mocks Bryce reviewed, in `.avengers/mocks/`:
`calendar-slide-edge-mock.html` (the slide), `calendar-fullscreen-mock.html`
(phone: Day, 3 Day, dropdown, + menu, all-day "+2"), `calendar-ipad-mock.html`
(iPad: Week, month panel, Day, Month chips, pinned menu).

## What this is

Bryce tested pinch to zoom (mission 65) and liked it, then compared the rest
of the calendar with Google Calendar on his iPhone and iPad. The calendar
should stop looking like a window inside the page and become the page:
edge to edge, no date bar, days that slide with the finger, a + at the
bottom right, Google's month dropdown, Google's all-day row, search, and no
Refresh button.

It is nine PRs. Drag to reschedule is one of them, and "this one or all of
them" for repeating events is another (Bryce added both on 2026-11-10). **Every PR leaves the family's app whole**: nothing is
removed before its replacement ships in the same PR.

## What this replaces in older plans

- `calendar-v2.md` decision 4, "Paging is swipe + arrows + dropdown. Nothing
  is swipe-only": the arrows go (Bryce, 2026-11-10).
- `calendar-v2.md` decision 6, "Header stays ours (Today / View / Add circles
  + arrows)": Add and the arrows leave the header; the title becomes
  "November" at the top left.
- `calendar-v2.md` CV6's month-jump **sheet**: becomes a drop-down on phones
  and a side panel on iPads.
- **CD1 (drag to reschedule), PR 26, branch `claude/calendar-cd1`:** open
  since September and in conflict with `main`. It never passed its gates,
  and every file it touches is rebuilt here. Drag to reschedule is now
  **PR 4 of this plan**, rebuilt on the new timeline; the old branch is a
  parts shelf (its pure maths and its server action), not something to
  merge. Bryce said to close the old PR (answer 1 below).

## Bryce's decisions (2026-11-10, in chat)

### Phone
1. **Edge to edge.** No box, no rounded corners, no side margin, no outer
   lines around the hour timeline. Hours at the far left, the last day runs
   to the right edge. Month is edge to edge too.
2. **No date bar, no < > arrows.** Moving is by swipe, Today, or the month
   dropdown.
3. **"November" with a small down arrow at the top left**, beside the menu
   button. When 3 Day or Week spans two months it shows the first day's
   month. The year is added only for a year other than this one
   ("January 2027").
4. **Top right on the phone: Today, View, Search.** No Add, no Refresh.
5. **Day labels inside the grid.** Day view: weekday and date in the top
   left corner above the hour labels, all-day items beside it. 3 Day and
   Week: weekday and date on top of each column; they slide with the grid.
6. **Floating + at the bottom right on every view.** It may cover events
   and part of Month's bottom row (Bryce: fine). Tapping it dims the page
   and pops **Event** and **Task** bubbles right above it; the + turns into
   an X. Only those two choices.
7. **Sliding swipe.** The grid and the dates above it follow the finger and
   glide to the next page. One swipe is one whole page (3 Day moves 3 days,
   Week a week). Every view that swipes today slides: Day, 3 Day, Week,
   Month, Year.
8. **Month dropdown like Google.** Tapping "November" drops a little month
   (event dots, today filled) and the month chips down from the top,
   pushing the calendar down. Swipe it for other months.
9. **All-day row like Google.** Two rows show, then "+N" under the column;
   tap "+N" or the arrow in the left corner to open them all; the up arrow
   closes. Pinching makes event titles and the all-day row grow and shrink
   with the zoom (never smaller than today's size).
10. **Task completed, Undo.** After "Mark complete" the sheet closes and a
    "Task completed, Undo" message shows. Undo shows for everyone for a few
    seconds, so a kid can fix a wrong tap. After that only parents can
    un-complete, as now.

### iPad (its own layout, from iPad width, portrait and landscape, every login including the wall tablet)
11. **All six views in a row at the top** (Schedule, Day, 3 Day, Week,
    Month, Year) instead of the view picker. It falls back to the picker
    when the row does not fit (portrait, a bigger Text size). Then Today
    and Search.
12. **"November" on Schedule, Day, 3 Day and Week** opens a side panel on
    the left (month chips and the little month); the calendar moves over.
    On Month and Year it shows only the row of month chips. The panel stays
    open until "November" is tapped again.
13. **"More" wording:** "+2" under a column (3 Day, Week), "2 more" in Day,
    "3 more" in a Month square.
14. **Pinned side menu:** while the month panel is open, an "Always open"
    side menu squeezes to icons only and returns when the panel closes.

### Search and Refresh
15. **Search:** event titles, locations, notes and task titles, past and
    future. Results grouped by date like Schedule; a tap opens the item.
16. **No Refresh button anywhere, and no pull-down.** Marshee pulls from
    Google when the Calendar opens (it does already), when the app comes
    back to the front, and every few minutes while the Calendar is open.
    A **"Sync calendars now"** button with "Last synced ..." goes on
    `/settings/calendars`.

### Drag to reschedule (decided in September in `calendar-v2.md`, carried over unchanged)
17. **Hold, then drag.** Press and hold an event on the hour timeline for
    about half a second (400 ms without moving more than 8px) and it lifts
    (slightly bigger, with a shadow). Anything quicker is a scroll, a swipe
    or a tap, as now.
18. **Drop.** The new start snaps to 15 minutes. Dropping in another column
    changes the day. The length of the event never changes.
19. **Parents only.** A kid or the Tablet login cannot lift a block.
20. **Not draggable in the first version:** all-day and multi-day events,
    and tasks. (Repeating events were on this list until Bryce took them
    off on 2026-11-10; see 22.)
21. **A drop that the server refuses snaps back** with a one-line reason.
22. **Repeating events drag too** (Bryce, 2026-11-10: "I want to be able to
    drag a repeating. Which means yes it will need a this one or all of
    them type prompt"). Dropping one asks **"This one"** or **"All of
    them"**. That question is PR 5. Until PR 5 merges, a dropped repeating
    event moves just that one day, with the Undo bar.

## Small calls Fury made while planning (Bryce can change any)

These follow from the decisions above. Each is the default unless Bryce
says otherwise.

- **A. The hours stay put when you swipe sideways.** Today, every page turn
  jumps the hours back to "now". With a slide that would make the incoming
  day appear at a different hour than the one sliding in, so the hours
  keep their place, like Google. Opening the Calendar, switching view and
  tapping Today still scroll to now.
- **B. Schedule and Year keep their own layouts.** They get the new top bar
  and the +, nothing else. Schedule is a list of cards (it never swiped),
  Year is twelve small months.
- **C. The title in Year view is the year** ("2026"), and in Schedule it
  stays the month scrolling past, as now.
- **D. On a phone in Month and Year, "November" shows only the chip row**,
  the same as the iPad (decision 12): the big month is already on screen.
- **E. On a phone, picking a day in the dropdown closes it**, so the
  calendar is visible again. On the iPad the side panel stays open
  (decision 12), and whether it is open is remembered per device.
- **F. The + keeps the app's round accent look** and sits bottom right on
  the Calendar at every width. Other pages keep theirs bottom left on
  phones (DESIGN.md says why: it must clear a row's check box and the
  Recipes A to Z rail).
- **H. While you drag, the block shows its new time** ("2:15 to 3:15 PM"),
  and holding near the top or bottom edge scrolls the hours so any time of
  day can be reached.
- **I. Only the drag asks "this one or all of them" in this plan.**
  Changing a repeating event's time in the edit form, and deleting one,
  keep doing what they do today (just that one day). Google's third
  choice, "This and following", is left out. Both are listed under "After
  the series".
- **G. Order inside the series:** PR 1 ships a plain + that opens today's
  Event or Task sheet, so Add never disappears; PR 2 swaps the sheet for
  bubbles. Refresh stays in the top bar until the search PR replaces it with
  automatic syncing and Search.

## Bryce's answers (2026-11-10: "Approve all others")

1. **Close PR 26** (the old drag attempt): yes. PR 4 rebuilds it.
2. **Automatic syncing on the kitchen tablet:** the every-few-minutes check
   runs only if the screen was touched in the last 10 minutes. Coming back
   to the app, a tap that wakes the screensaver, and opening the Calendar
   always check. (This protects the free Neon hours, the usage watch in
   `status.md`.)
3. **Kid Undo:** the message shows for 5 seconds; the server accepts an
   un-complete from a non-parent for 60 seconds after the task was
   completed, and only on a task they are on. Marshee does not record who
   completed a task, so for that minute a kid could also undo a parent's
   tick on a shared task. Accepted, no database column.
4. **Long titles wrap** in blocks tall enough, in the all-day row PR.
5. **Undo after a drag:** a "Moved to Thu 2:15 PM, Undo" bar for 5 seconds
   after every drop (the same bar as "Task completed, Undo").
6. **Dragging past the side of the screen to another page:** left out of
   the first version. Listed under "After the series".
7. **Repeating events:** Bryce did not accept "they stay put". See decision
   22 and PR 5.

## The two PR 5 questions (Bryce, 2026-11-10: "I agree with your recs", so both recommendations stand)

- **Q1. A repeating event dropped on a different day.** "All of them" is
  simple when only the time changes (every 7 AM becomes 7:30 AM). Moving
  every one to another day means rewriting Google's repeat rule ("every
  Monday, Wednesday, Friday" has no single answer when one Wednesday is
  dragged to Thursday). Recommend: a drop on a different day moves **this
  one** only, and the sheet says so in one line. Same day, new time: the
  sheet offers both choices.
- **Q2. Google's third choice, "This and following".** Recommend leaving it
  out (small call I). Two buttons are easier to tap one handed, and the
  third needs Google to split the series in two.

## Facts from the code that shape the plan (checked 2026-11-10 at `6124353`)

- **The page turn is already instant on the client.** `step()` moves a
  local cursor first and pushes the URL after (`useCalendarNavigation.ts`,
  `useCalendarPeriod.ts`; `stepPeriod` is pure). The server fetch window is
  60 days each side of the date (`CALENDAR_FETCH_WINDOW_DAYS`,
  `calendarPaging.ts`). So the neighbour pages a slide needs are already in
  memory for Day, 3 Day and Week. Month neighbours can reach just past the
  window; `MonthGrid` already draws a "not loaded" glyph for that.
- **`usePageSwipe` has no visual output on purpose** (its header says so):
  it calls `step()` on release past 60px. It already yields to a second
  finger (mission 65) and has a seam for a long press (CD1).
- **The scroll-to-now effect in `TimelineGrid.tsx` is keyed on the column
  set**, so it re-runs on every page turn (small call A changes this).
- **`TimelineGrid.tsx` is 527 lines** (STRUCTURE.md: soft cap 350, hard cap
  650). `CalendarViews.tsx` is 507, `CalendarHeader.tsx` 404. PR 1 and PR 3
  must extract, not add.
- **The box is one class list**: `overflow-hidden rounded-t-xl border
  border-b-0 border-line` on `TimelineGrid`'s root, inside `<main>`'s
  `px-4` and `max-w-3xl` (`AppChrome.tsx`). The Calendar is already a wide
  page from `md`. The pinned Schedule header already bleeds with `-mx-4`.
- **The top bar is two rows today**: the action circles (lifted into the
  hamburger's row with a negative margin and `pl-14`), then the arrows and
  title. `VIEW_CONFIG` has `showArrows`, `prevLabel`, `nextLabel`.
- **The floating + was removed from the Calendar in mission 9** because it
  covered Month day numbers, and DESIGN.md gained the "a target must also
  be unoccluded" rule from it. `FloatingAddButton.tsx` (50 lines) exists
  and sits bottom left below `md`.
- **The month jump exists as a sheet**: `MonthJumpSheet.tsx` (compact month
  with dots, `MonthChips`), opened from the title, calling `jumpToDay`.
  `ScheduleMiniMonth.tsx` is a second small month (wide Schedule).
- **The all-day strip already expands and collapses**
  (`TimelineAllDayStrip.tsx`, 398 lines; `assignLanes` in `monthLayout.ts`,
  shared with Month; caps `PHONE_LANES = 3`, `WIDE_LANES = 4`).
- **Zoom**: `--hour-height` CSS variable, `useTimelineZoom`, pure maths in
  `timelineZoom.ts`; the anchor maths reads the sticky header's height and
  a ResizeObserver re-measures the floor (mission 65, C3).
- **Tasks**: `completeTask` allows a parent or a person on the task;
  `uncompleteTask` is parents only (`src/app/actions/tasks.ts`). `Task` has
  `completedAt` and no "completed by". Events and tasks have no privacy
  field: the whole household sees all of them.
- **Repeating events (checked after Bryce asked to drag them; this corrects
  the first draft of this plan, which said `rrule` marks them).** Marshee
  cannot make a repeating event: neither form has a Repeat control
  (`TaskForm.tsx` shows "Repeat, coming soon", disabled), and the `rrule`
  column on `CalendarEvent` and `Task` is stored and never read
  (`src/app/actions/calendar.ts`, the comment at its top). Every repeating
  event the family sees comes from a Google calendar set to "Both ways".
  The pull asks Google for single events (`singleEvents=true` in
  `src/lib/google/calendarEventCalls.ts`), so a daily "Wake Up" arrives as
  one ordinary row per day, each with its own Google id in
  `CalendarEventSync.googleEventId`. Marshee does not keep Google's series
  id (`recurringEventId`; no match for that word anywhere in `src/lib` or
  `src/app`), so today it **cannot tell** that those rows belong together.
  Two things follow. A rule that says "repeating events do not lift" had
  nothing to check. And moving one of those rows through the normal write
  and push changes that one day in Google, which is exactly "This one".
- **Pull**: `CalendarPullButton.tsx` holds the provider (pull once on
  mount), the Refresh circle and the reconnect banner. The server allows a
  pull at most every 5 minutes per calendar (`calendarPull.ts`).
- **Search precedent**: `match.ts` (`tokens`, `searchRecipes`).
- **The September drag attempt** (branch `claude/calendar-cd1`, its record
  in that branch's `.avengers/missions/mission-20-calendar-cd1-drag.md`)
  built `timelineDrag.ts` (pixels to minutes, the inverse of
  `blockGeometry`, with tests), `useLongPressDrag.ts`, and a
  `moveCalendarEvent` action. It stalled at gate pass 3. What it learned:
  - Its two open blockers both came from **two separate hooks sharing one
    touch**: the long press aborted at "more than 8px" while the page swipe
    locked at "8px or more", so at exactly 8px both fired, the swipe took
    the pointer capture, the block never saw the finger lift, and a stuck
    hold timer claimed a drag that could never end. Page swiping then
    stayed dead until a reload.
  - An earlier bug of the same family: a plain tap left the hold machine
    in "pending" forever, so one tap disabled dragging for the page's life.
    The tests missed it because they covered each input alone and never a
    sequence.
  - The project has **no DOM test harness**, so capture timing and cleanup
    were checked only by throwaway scripts that were never committed.
  - **A worktree has no `.env`**, so a contract that must read or write the
    database cannot be verified by a builder in a worktree; and a Server
    Action that imports `dal.ts` (`server-only`) cannot be called from a
    plain script anywhere.
  - Its refusal banner used the red "danger" colour; DESIGN.md reserves red
    for destructive or urgent things. Refusals are "warn".
- **Since September**: events sync with Google ("any new code that writes a
  `CalendarEvent` must call the push", CLAUDE.md), events pulled from Google
  are editable, and the hour height is no longer a constant (pinch).

## How every PR runs

- One chat per PR, each in its own worktree cut from the latest `main`,
  through `/avengers`. Take the next free mission number at the start by
  listing `.avengers/missions/` **on `origin/main`** (two chats took "64"
  on the same day in this series' first hour).
- Team: Stark and Vision always; Strange on every PR here (all of it is
  visible); Captain on the layout, slide, drag, repeating, dropdown and search PRs
  (new files, splits, a new route, a new column). Banner first on the
  slide, drag, repeating and search PRs.
- Bryce confirms a mock before any builder is dispatched where the PR says
  "mock first". The mocks in `.avengers/mocks/` are the starting point.
- Rulebook changes (DESIGN.md, STRUCTURE.md) are drafted by Strange or
  Captain, quoted to Bryce in plain words, and land in the same PR as the
  code they describe.
- Gauntlet, every PR: `npx tsc --noEmit`, `npm run lint`, `npm test`, the
  direct `TZ=UTC node --import tsx --test ...` line from AGENTS.md, and
  `npm run build`.
- Sizes: text and chrome in rem (mission 58). Touch only: nothing may need
  hover. Respect "reduce motion": every animation here has an instant
  fallback.
- Strange measures on real viewports: iPhone 393 by 852, iPad 1024 by 768
  and 768 by 1024, at Normal and Largest text size, light and dark.
- Each PR ends by adding its phone test to `.avengers/status.md`, then
  push, PR, Gauntlet green, merge, check the production deploy, and
  `git log origin/main..HEAD`.

## The PRs, in order

### PR 1: Full screen layout (decisions 1 to 5, 11; small calls B, C, F, G)

**What Bryce sees.** The calendar fills the screen. One top bar: menu,
"November", then Today, View, Refresh on the right (iPad: Today, the row of
six views, Refresh). No arrows, no date bar. Day names sit inside the grid.
A + floats at the bottom right and opens today's Event or Task sheet.
Swiping still changes the page the way it does now (the slide is PR 3), and
tapping "November" still opens today's month sheet (the dropdown is PR 6).

**Mock first:** the two existing mocks cover it; re-confirm the top bar at
real size (phone, iPad landscape, iPad portrait at Largest text).

**Work.**
- *Bleed.* The timeline and Month run to both screen edges at every width.
  Captain picks the mechanism before the build: a negative margin on the
  calendar's own wrappers (the pinned Schedule header's `-mx-4` precedent)
  or a new page marker beside `data-fills-viewport`. One mechanism, named
  in STRUCTURE.md "Wide pages". Remove the box classes; keep the lines
  between hours and between days; no line on the outer left or right.
- *Top bar.* `CalendarHeader.tsx` becomes one row. The title is a new pure
  function (first visible day's month; year only when it is not this year;
  Year view shows the year) with tests, wired through `VIEW_CONFIG.title`.
  It keeps opening `MonthJumpSheet` for now. Remove the arrows and the
  `showArrows`, `prevLabel`, `nextLabel` fields with them (dead fields are
  a STRUCTURE.md violation). Schedule keeps its pinned bar and its
  scroll-driven month title.
- *iPad view row.* A segmented row of the six `VIEW_LABELS`, shown by a
  container query in rem on the bar's own width, so a bigger Text size
  falls back to the picker circle by itself. The picker stays the phone's
  control. No second list of view names.
- *Day labels.* Day view: weekday and date move into the gutter corner of
  the sticky header, the all-day strip beside it. 3 Day and Week keep
  labels over the columns. `GUTTER_WIDTH_PX` stays one constant.
- *The +.* `FloatingAddButton` gains a right-corner placement used by the
  Calendar at every width; it opens the existing Add sheet
  (`addingEvent`). Only for people who can add (`canManage`), as now.
- *Loading frame.* `calendar/loading.tsx` matches the new shape so nothing
  jumps on open.
- *Split while here.* `CalendarHeader.tsx` loses a row and should come in
  well under the soft cap; `TimelineGrid.tsx` must not grow.

**Rulebooks.** DESIGN.md: the Calendar's + is bottom right at every width;
a recorded exception to "a target must also be unoccluded" for the
Calendar's + (Bryce, 2026-11-10: it may cover events; covered items are
reached by zooming, by Schedule, or by scrolling Month, whose page keeps
its bottom padding so the last row can clear the +). The header rule
("Today / View / Add circles + arrows") is rewritten. Strange drafts.

**Checks.** Strange: zero pixels of margin or outer border on both edges at
all four viewports; the title never clips ("September", "January 2027") at
Largest text; the view row falls back cleanly; the + never covers the last
Month row once scrolled. Vision: title function in Denver and UTC; no dead
config fields; the zoom floor still leaves no blank band (re-run mission
65's seven iPad states).

**Phone test (about 4 minutes).** Open Calendar on iPhone and iPad: no box,
no margins, "November" top left, + bottom right opens Event or Task, Today
works, swipe still pages, pinch still zooms.

### PR 2: The + bubbles (decision 6)

**What Bryce sees.** Tapping + dims the page; Event and Task pop up right
above the thumb; the + becomes an X. Tap a bubble to start that form; tap
the X or the dimmed page to close.

**Work.** A new small component (working name `AddSpeedDial`) replaces the
Add `ActionSheet` in `CalendarSheets.tsx` and wraps the + from PR 1. Two
pill buttons, at least 48px tall, the same icons the sheet rows use, the
same destinations (`/calendar/new` and `/calendar/new/task` with the
current date). `aria-expanded`, focus moves to the first bubble, Escape and
the scrim close it. The open animation has an instant fallback. It works on
all six views.

**Rulebooks.** DESIGN.md "Sheets are the house dialog" gains one named
exception (the Calendar's add menu), with the reason: one-handed reach.

**Checks.** Strange: bubbles clear the home indicator and the iPad's
bottom edge; both are unoccluded; dim contrast in light and dark. Vision:
the old sheet state is gone, not orphaned.

**Phone test (1 minute).** Tap +, tap Task, come back, tap +, tap the dark
area.

### PR 3: Sliding swipe (decision 7; small call A)

**What Bryce sees.** Drag sideways and the days follow the finger, with
the next page coming in beside them. Let go past about a quarter of the
way, or flick, and it glides over; let go early and it springs back. The
hours stay where they are.

**Banner first:** the exact pointer flow in `usePageSwipe.ts`, where
`step()` re-renders, what `TimelineGrid` re-computes per column set, and
the Month and Year wrappers.

**Design (Fury's recommendation, for the builder).**
- *One paged track, three panels.* A small generic component (working name
  `PagedTrack`) renders previous, current and next side by side and shifts
  them with a single CSS variable written on one ancestor once per
  animation frame. No React render happens during a drag.
- *Timeline.* The hour gutter and the one vertical scroller stay fixed.
  Two tracks share the variable: the sticky header (day labels and all-day
  strip) and the hour columns. The header takes the current page's height
  and eases to the new page's height after the turn, so the zoom's anchor
  maths (which reads that height) stays true; the mission 65 ResizeObserver
  already follows it.
- *Neighbours come from data already loaded*: `stepPeriod(period, 1)` and
  `-1` give the neighbour anchors, `VIEW_CONFIG.days` their columns.
  Column layout for the three panels is memoised per day.
- *The turn.* On release the track eases to a full page; when the ease
  ends, `step()` is committed with `flushSync` and the variable resets to
  zero in the same frame, so the old neighbour becomes the current page
  with no flash. A new swipe is accepted only after that.
- *Month and Year* use the same track with three grids. Month's height
  follows the current month (5 or 6 rows) and eases after the turn.
- *One owner for every touch.* This is the lesson of the September drag
  attempt, applied before drag exists. The timeline gets **one gesture
  machine**: a single pure function that takes the sequence of touch
  events and answers what the touch is (undecided, scrolling the hours,
  sliding the page, handed to pinch, **holding**, **dragging a block**).
  One set of thresholds, one timer, one pointer capture, one teardown.
  PR 3 builds the machine with the hold and drag states already in it but
  switched off (a hold simply does nothing yet); PR 4 switches them on.
  `usePageSwipe`'s proven rules (8px direction lock, guarded capture,
  swallow the next click) move into it by name. Month and Year use the
  same machine without the hold states.
- *Tests are sequences, not single inputs.* The machine is pure, so whole
  gestures are tested in Node with no browser: tap, tap then hold, hold
  then lift, a move of exactly 8px, swipe that starts on a block, second
  finger at each stage, pointer cancel at each stage. Every sequence must
  end in "idle". These tests are committed.
- A second finger still hands over to pinch, and now also springs the
  track back. A swipe that ends on an event still swallows the tap.
- *Scroll to now* moves off the column-set key: it runs on mount, on a
  view change and on Today.
- *Structure.* `TimelineGrid.tsx` is split first, behaviour unchanged,
  into the shell (scroller, sizing, zoom) and one page of columns; then
  the track goes in. `usePageSwipe.ts` grows a drag output or gains a
  sibling hook; the pure decisions (settle or spring back from distance,
  speed and page width) live in a pure file with tests.

**Checks.** Vision: the pure settle rules; nothing renders per pointer
move; reduced motion turns the page instantly; a pinch started mid-drag
leaves the track at zero; Month neighbours outside the fetch window show
the existing "not loaded" glyph and never a blank month. Strange: no
frame where the header and the columns disagree by a pixel during a drag
(measure both tracks' transforms); no flash at the hand-over; the hours do
not move on a page turn. This project has recorded twice that synthetic
pointer events could not drive a swipe to a settled state here: try the
browser's real drag and touch input first, and if they still cannot,
say so in the mission file and lean on the pure tests plus Bryce's
recording.

**Phone test (3 minutes, with a screen recording).** Slow drag and let go
early; slow drag past halfway; a quick flick; a diagonal drag (should
scroll the hours, not turn the page); swipe then pinch straight away; the
same on Month and on the iPad.

### PR 4: Drag to reschedule (decisions 17 to 22; small call H; answers 5, 6)

**What Bryce sees.** Hold an event for half a second and it lifts. Drag it
up or down to a new time, or across to another day; the block shows the
new time as it moves. Let go and it stays there (and its Google copy
moves too). A quick touch still scrolls, swipes or opens the event exactly
as before.

**Mock first:** the lifted block, the time label while dragging, and the
Undo bar.

**Banner first:** read the old branch (`git show
origin/claude/calendar-cd1:<path>`): `timelineDrag.ts` and its tests, the
`moveCalendarEvent` action and its four recorded notes, and the mission
record's open findings. Also: how `updateCalendarEvent` reaches the Google
push today, and confirm with the code that a time change on a pulled
event is pushed back to the calendar it came from (the facts section
says how repeating events are stored).

**Work.**
- *Switch on hold and drag in the gesture machine from PR 3.* No second
  hook, no second timer. The hold is 400 ms within 8px, and the machine's
  one rule for "exactly 8px" covers both the hold and the swipe.
- *The maths.* Bring `timelineDrag.ts` over from the old branch and make it
  take the live pixels-per-minute (the hour height changes with pinch) and
  the column under the finger. Snap to 15 minutes. Clamp inside the day.
- *The lift.* The block scales and gains a shadow, follows the finger with
  a transform (no React render per move), and shows its new time range.
  Holding within a strip at the top or bottom scrolls the hours. Text
  selection and the iPhone long-press menu are turned off on blocks.
  The page cannot slide and the hours cannot scroll by themselves while a
  block is lifted.
- *The save.* One guarded Server Action that takes only the event id and
  the new start. The server reads the stored length and computes the end
  itself (a client can never send a length), bounds the date, refuses
  non-parents, and goes through the **same write and
  Google push** that editing an event uses, so there is one way to change
  an event's time. Fix the old action's two notes while bringing it over
  (it re-checked people it was not changing; it did not bound the date).
- *On screen.* The move shows at once (optimistic, the `PantryList`
  pattern). A refused drop glides back with a one-line reason in the
  "warn" colour, never red. A shared undo bar shows "Moved to ..., Undo"
  for 5 seconds (answer 5); this PR builds that bar, and the task undo PR
  reuses it.
- *What does not lift:* all-day and multi-day events, tasks, and anything
  for a login that cannot edit.
- *Repeating events in this PR.* They lift and drop like any other event,
  and the drop moves that one day (Marshee cannot yet tell they repeat;
  see the facts section). PR 5 adds the question.

**Rulebooks.** DESIGN.md: drag is never the only way (the edit form still
changes the time); the lift look; the refusal colour. STRUCTURE.md: the
gesture machine's one home, and the rule that time changes go through one
write path.

**Checks.** Vision: the sequence tests extended with drag (hold then move
then lift; hold then second finger; hold then cancel; drop outside the
grid), all ending idle; a kid's POST is refused; the server ignores any
client length. The database check (drag 9 to 10 AM onto 2:15 PM, read
the row: 2:15 to 3:15) is run by a gate from the main checkout with the
project's scoped test-data scripts, because a worktree has no database
access; if it cannot be run, the mission file says so and it goes on
Bryce's checklist. Strange: the lifted block and its label at every zoom
level and text size; the refusal in "warn"; nothing lifts for a kid or
the Tablet login.

**Phone test (5 minutes, with a screen recording; this is the real proof,
since no tool here can press and hold like a finger).** Tap an event (it
opens). Scroll by starting on an event. Swipe the page starting on an
event. Hold and drag to a new time. Hold and drag to another day in Week.
Drag to the bottom edge and let it scroll. Drag one day of a repeating
event and check in Google Calendar that only that day moved. Undo one. Then, the old bug: after all
of that, swipe the page once more and make sure it still turns.

### PR 5: Repeating events, "This one" or "All of them" (decision 22; small call I; Q1, Q2)

**What Bryce sees.** Drop a repeating event (a daily "Wake Up") at a new
time and a sheet slides up: "This one" or "All of them", with Cancel.
"This one" moves that day. "All of them" moves every day, here and in
Google Calendar. Cancel puts the block back. Events that do not repeat
never see the sheet.

**Mock first:** the sheet (title, the two buttons, Cancel, and the one
line shown when the drop was on a different day, Q1), and the
Undo bar wording after "All of them".

**Banner first:** the pull's write path (`calendarSyncPull.ts`,
`calendarEventPull.ts`, `calendarPullRun.ts`) and the shape of
`GoogleEventIn` in `src/lib/google/types.ts`; how a full pull treats a row
whose etag has not changed (needed for the backfill below); and Google's
own documentation for changing the start time of a repeating event's
parent, including what happens to days that were already moved one by
one. Read the docs, do not answer from memory.

**Work.**
- *Know which events repeat.* One new, empty-by-default column on
  `CalendarEventSync` for Google's series id (their `recurringEventId`).
  An additive migration, SQL reviewed before it is applied. The pull fills
  it on every insert and update.
- *Fill it for events already here.* A changes-only pull never revisits
  old rows, so each "Both ways" calendar gets one full pull (its saved
  sync token is cleared once), and the pull writes the series id onto rows
  that lack it even when nothing else changed. Nothing is deleted.
- *The sheet.* The drop from PR 4 pauses before saving when the event has
  a series id. The house sheet, three targets of 48px or more. Parents
  only, like the drag.
- *"This one".* The PR 4 save, unchanged.
- *"All of them".* A second guarded Server Action that takes the event id
  and the new start. The server works out the move in minutes from the
  stored row (the client never sends the amount), reads the series parent
  from Google, shifts its start and end by that amount keeping its own
  time zone field, and saves it back. Then it pulls that calendar so
  Marshee's rows match Google. On screen, every visible day of that
  series moves at once and the pull settles the rest. Google is the
  source of truth for a series, so if the save to Google fails, nothing
  changes in Marshee and the block glides back with the "warn" reason.
- *Undo.* The bar from PR 4 reverses "All of them" with the opposite
  shift through the same action.
- *Different day (Q1).* A drop on another day offers
  "This one" only, with one line saying why.

**Rulebooks.** STRUCTURE.md: Google owns a repeating series; Marshee
changes one only through this action, never by editing rows in a loop.
`docs/structure/calendar-sync.md`: the new column and who fills it.

**Checks.** Vision: the migration is additive; the backfill deletes
nothing and a second run changes nothing; the minutes shift across the
March and November clock changes in both `TZ` runs; a kid's POST is
refused; a series whose calendar has since been set to "Off" or unlinked
is refused cleanly; a failed Google save leaves every row untouched; the
push is not sent twice (once by the action, once by the normal edit
path). Strange: the sheet one handed on the phone, at Largest text on the
iPad, light and dark.

**Phone test (5 minutes).** In Google Calendar make a throwaway event that
repeats daily, and wait for it to show in Marshee. Drag one day and pick
"This one": only that day moves, in both apps. Drag another day and pick
"All of them": every day moves, in both apps, and the day moved first
keeps (or loses) its own time the way the mission file says Google
behaves. Undo it. Cancel one. Only after that, try a real one.

### PR 6: The month dropdown (decisions 8, 12, 14; small calls D, E)

**What Bryce sees.** Phone: tap "November" and a little month drops down
under the top bar, pushing the calendar down; swipe it for other months;
tap a day to go there. iPad: the same tap opens a panel on the left with
the chips and the little month, and the calendar moves over; on Month and
Year only the chip row appears.

**Mock first:** the dropdown at real phone size and the iPad panel in
portrait with a pinned menu.

**Work.** `MonthJumpSheet`'s insides become an inline panel (working name
`MonthJumpPanel`); the sheet goes. It reuses `PagedTrack` for swiping
months and `MonthChips` for the chips; day taps call `jumpToDay` (the view
stays). One small-month component is the goal: fold `ScheduleMiniMonth`
into it if Captain agrees the two are the same thing, or record why not.
The timeline's height measurement must follow the panel opening and
closing (it measures only on resize and column change today): observe the
scroller's top edge. iPad: the panel is a column beside the calendar from
`md`; its open state is remembered per device and per person (the
`useSyncExternalStore` pattern from the zoom). While it is open, a pinned
sidebar shows as the icon rail, done in CSS with the `body:has(...)`
pattern `AppChrome` already uses, so `navMode` itself never changes.

**Rulebooks.** DESIGN.md: the second exception to "Sheets are the house
dialog" (the month dropdown). STRUCTURE.md: the new marker and the
small-month component's one home.

**Checks.** Strange: the calendar loses no row at the bottom when the
panel opens (no clipped hour, no blank band, at every zoom); iPad portrait
with a pinned menu still shows usable day columns; chips and dates are 44px
targets. Vision: the remembered state is per person and per device; the
zoom anchor survives the panel opening.

**Phone test (3 minutes).** Open and close the dropdown in Day and Month;
swipe it to January and tap a day; on the iPad open the panel, turn the
iPad to portrait, close it.

### PR 7: The all-day row like Google, and text that zooms (decisions 9, 13; answer 4)

**What Bryce sees.** Two all-day rows, then "+2" under the busy day; tap
it or the arrow at the left to see all of them; the up arrow closes.
Zooming in makes event titles and the all-day pills bigger; zooming out
brings them back to today's size.

**Work.** A timeline-only lane cap of 2 (a new named constant; Month keeps
its own caps in `monthLayout.ts`). The overflow label moves under each
column from the existing per-day overflow counts; the arrow sits in the
gutter corner; the wording table from decision 13 lives in one vocabulary
place. A pure `zoomTextScale(hourHeight)` in `timelineZoom.ts` (1 at the
default 48px and below, rising to a tested ceiling at 192px) feeds a CSS
variable beside `--hour-height`; title size and all-day pill height are
`calc(rem * scale)`, so Text size still applies. The under-20px small
title rule from mission 65 stays. Titles (answer 4)
wrap to as many whole lines as the block holds.

**Checks.** Strange: the sticky header's height change while pinching
never moves the minute under the fingers (the mission 65 anchor test,
re-run with a tall all-day row); nothing is cut mid-letter at any zoom or
text size. Vision: the scale function's edges; Month is untouched.

**Phone test (2 minutes).** A day with four all-day items: "+2", open,
close; pinch in and out and watch the titles.

### PR 8: Task completed, Undo (decision 10; answer 3)

**What Bryce sees.** Mark a task complete: the sheet closes, the task is
crossed out, and a small "Task completed, Undo" bar shows for 5 seconds.

**Work.** `TaskDetailSheet` closes on a successful complete and reports it
upward; the shared undo bar from the drag PR (or, if this PR lands first,
a new shared component: check `LogButton` and the habits undo first) sits
above the +, with `role="status"`. Both places that mount the sheet get it (`CalendarSheets`
and `ScheduleView`). Server: `uncompleteTask` keeps "parents any time" and
adds "a person on the task, within the grace window after `completedAt`";
the window is a named constant and the rule is a pure function with tests.
No database change.

**Checks.** Vision: a kid cannot un-complete after the window or on a task
they are not on; the bar's Undo and the sheet's "Mark not complete" share
one action. Strange: the bar never covers the + or sits under the home
indicator.

**Phone test (2 minutes).** As a parent and as a kid login: complete,
Undo; complete, wait, check it stays done.

### PR 9: Search, and syncing without a button (decisions 15, 16; answer 2)

**What Bryce sees.** A Search circle replaces Refresh in the top bar. It
opens a search page: type, and matching events and tasks appear grouped by
date; tap one to open it. The Calendar keeps itself in sync with Google,
and Settings has "Sync calendars now" with the last sync time.

**Mock first:** the search page (empty, typing, results, nothing found).

**Banner first:** how `getCalendarEventsInRange` expands repeating events,
and what `EventCard`, `TaskCard` and `DaySection` need as input.

**Work.**
- *Search.* A page under the Calendar (so it has a `BackLink` to
  "Calendar", per DESIGN.md) with one input. A Server Action that checks
  the session itself, takes the text, splits it with `match.ts`'s
  `tokens`, and requires every word in the title, location or notes
  (events) or the title or details (tasks). Capped results, upcoming first
  and nearest first, then past, with "Show more". A repeating item shows
  its next occurrence. Results reuse Schedule's cards and open the
  existing detail sheets. Typing is debounced; under two letters does
  nothing.
- *Sync.* The provider in `CalendarPullButton.tsx` also pulls when the page
  becomes visible again and on a timer while visible, limited as answer 2
  decides. The Refresh circle and its note go; the reconnect banner stays.
  `/settings/calendars` gains the button (the forced pull that Refresh
  used) and "Last synced", read from what the server already stores per
  calendar (`lastPulledOkAt`, which already drives "Last checked" on the
  synced calendars list: one wording, not two). The file is renamed to
  match what is left in it.

**Rulebooks.** STRUCTURE.md: the search query's one home and the test glob
if a new test folder appears (AGENTS.md: the glob is hand-listed).
CLAUDE.md: the Calendar and Google link lines.

**Checks.** Vision: the action refuses a signed-out caller; results are
the same set the Calendar would show; the timer never fires while hidden
or past the idle limit; no pull loop on focus. Strange: the search page at
all four viewports and text sizes.

**Phone test (3 minutes).** Search a word from an old event and a future
one; open a result; add an event in Google, come back to Marshee and see
it without pressing anything; press "Sync calendars now".

## After the series

- **Making repeating events inside Marshee** (a Repeat control on the
  forms). Not in this plan: today they can only be made in Google.
- **The same "this one or all of them" question in the edit form and on
  delete**, and Google's "This and following" (small call I).
- **Dragging a block past the screen edge to another page** (answer 6).
- The mission 65 follow-ups in `status.md` (the one-frame flicker on a
  fresh iPad load, short titles at Largest text) are best fixed inside the
  layout PR and the all-day row PR, which touch the same code; each PR's
  mission file says whether it did.

## Risks, named once

- **Four gestures on one surface** (vertical scroll, sideways slide,
  pinch, hold and drag). This is where the September attempt failed, so
  one machine owns every touch, it is built before drag needs it, and it
  is tested as whole sequences. A real finger is still the only full
  proof: the slide and drag PRs each end with Bryce's screen recording.
- **Drag is the riskiest PR.** The dropdown, all-day row, task undo and
  search PRs do not depend on it, so if it stalls at its gates they go
  ahead and it does not hold up the rest. Only the repeating events PR
  waits for it.
- **"All of them" changes a real Google series.** A wrong shift moves
  every day of someone's real repeating event. So the server computes the
  shift, Undo reverses it, and the phone test starts on a throwaway
  event.
- **File size.** Three calendar files are past the soft cap. PR 1 and PR 3
  split before they add.
- **The wall tablet** runs all of this all day at a large text size with a
  screensaver on top. Every PR checks the Tablet login.
- **Each PR deploys to the family.** That is why Add and Refresh are
  replaced in the same PR that removes them.
