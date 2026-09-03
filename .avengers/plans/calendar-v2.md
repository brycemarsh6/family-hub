# Calendar v2 — the Google/Apple hybrid, Tasks, and drag

> **Provenance.** Designed and approved with Bryce on 2026-09-02 in plan
> mode, from a screen-by-screen Google Calendar walkthrough (eight view
> screenshots, then the task sheet and a 3-day timeline). This file is the
> committed source of truth; the session-local plan file it was copied from
> is disposable. It **supersedes the ORDER of K3–K7 in `calendar-v1.md`**;
> their content survives, re-slotted at the end of this file. Every phase
> below is one Avengers mission; mission files live in `.avengers/missions/`.

## Context

K2 shipped Month view and unbounded navigation (PR #10, preview live). On
first real use, Bryce and Emily want the calendar to work the way Google
Calendar does, with some Apple. Bryce's framing: "we don't have to change a
crazy ton, just add a few more things." He walked through Google screen by
screen on 2026-09-02 — the same process K0 used with Skylight — and this
plan is the result. It **replaces the ordering of the remaining K3–K7
phases**; their content survives and is re-slotted at the end.

Three things drive the shape:
1. **One new rendering model** — the hour timeline — shared by Day / 3 Day /
   Week. Nothing in the app positions anything by time today.
2. **One new entity** — `Task` — its own table, rendered by the calendar and
   later owned by the Chores branch (to be renamed Tasks). A schema decision,
   so it goes early.
3. **Two gestures that must be designed together** — swipe-to-page and
   long-press-drag — because the long-press is what tells them apart.

Standing constraints on every phase:
- `CalendarViews.tsx` is at **350/350**; both Captain and Vision ruled its
  navigation cluster must be extracted before anything else lands (CV0).
- `EventForm.tsx` is at **350/350**; its people picker and date field are
  extracted before the Task form reuses them (CT1).
- Calendar-component date math only; "today"/"now" decided in the browser
  only; pure layout libs in `src/lib/` with `node:test` under both
  `TZ=America/Denver` and the **direct** `TZ=UTC node --import tsx --test …`
  (the npm script pins Denver, so `TZ=UTC npm test` is vacuous).
- Additive migrations only, reviewed as SQL. Dev DB = Neon dev branch (real
  family snapshot). `db:seed`/`db:reset` forbidden; scoped seeders only.
- Every phase: one Avengers mission, gauntlet green, verified in a real
  browser at 375px in both themes, counts back to baseline.

## Decisions settled with Bryce — don't re-litigate

**Views**
1. Picker offers **Schedule / Day / 3 Day / Week / Month / Year**, in our
   existing `RadioSheet`. No hamburger drawer.
2. **Schedule replaces the current list-Week; Week becomes the timeline.**
   List-Day goes too (Day = timeline at 1 column). Our `DaySection` /
   `EventCard` become Schedule's building blocks unchanged.
3. **Year = 12 mini month grids**, day numbers only, tap → Month. No events
   drawn, no fetch change.
4. **Paging is swipe + arrows + dropdown.** Nothing is swipe-only. Schedule
   has no horizontal paging at all (Google doesn't either).
5. **Default view: last-used per device** (`lastStore` pattern), applied
   **only when `/calendar` opens with no `?view=`** — the URL stays the
   source of truth, or the stored preference fights the resync effect (the
   C8/C9 drift, re-invented).
6. **Header stays ours** (Today / View / Add circles + arrows); the title
   becomes the month-dropdown trigger. Google's search and hamburger are
   later walkthroughs.
7. **Month pills show text at phone width.** Settles the open `md:`→`sm:`
   question (Strange measured 8 chars fit at 375; Google shows text there).
8. **"Month chips"** = the horizontal scroller of month names above the
   Month grid and inside the dropdown. One component, two homes.

**Tasks**
9. **`Task` is its own table**, not a `kind` on `CalendarEvent`.
10. **One all-day due date.** No separate deadline, no time. Always in the
    top row.
11. **Completed tasks stay on their day, struck through.**
12. **Kids can mark their OWN tasks complete** (complete only, tasks they're
    assigned to). Parents create/edit/delete/un-complete. This is the
    reward-points loop later.
13. **The Add sheet offers Event / Task. Meal is removed** (it only
    deep-linked to Meal Plan; the *meal overlay on days* is a separate
    planned feature and is unaffected).

**Storage — the one Bryce reversed**
14. **The deferred all-day storage bug is fixed in CT1**, bundled with the
    Task migration. Reason changed: a new all-day table would otherwise copy
    the bug, and every renderer would carry two date conventions. One real
    all-day event exists today; the data fix is trivial now.

**Drag**
15. **Long-press-drag reschedules on the hour timeline first.** Month later.
    Recurring events don't lift until K4 supplies the this/all dialog.

## Exploration facts that shaped this (2026-09-02)

- `src/` has **no** hour rail, now-line, minutes-from-midnight, or absolute
  event geometry. `monthLayout.ts` (grid + lane packing) is the only 2-D
  layout and is the model the timeline lib mirrors.
- `useCalendarPeriod.stepPeriod` has a **catch-all else arm** — a `threeDay`
  view would silently step 1 day. Explicit arms required.
- `parseViewParam` falls back to `"week"`; `RadioSheet` fires `onSelect` on
  the already-checked option (`RadioSheet.tsx:72-75`).
- `SwipeActions.tsx` is the only swipe: 8px direction lock, release read from
  a **ref**, `setPointerCapture` in try/catch, `touch-pan-y`. The *pattern*
  is reusable; the component is hard-wired to row-reveal.
- `page.tsx` fetches ±61 days once (`startAt < windowEnd && endAt >
  windowStart`), no `rrule`, and hands `CalendarViews` only `events /
  canManage / windowStart / windowEnd`.
- `eventDaySpan` (the midnight-rules owner) is private in `calendarDates.ts`;
  `calendarDates.test.ts` is at 349/350 (split queued as C3).
- `overflow-anchor` is unimplemented in WebKit — Schedule's scroll anchoring
  is manual on this iPhone household.

## Phases, in order

**CV0 → CV1 → CT1 → CV2 → CV3 → CV4 → CV5 → CT2 → CV6 → CD1**, then the
original roadmap (below). Model per phase as Bryce asked: Sonnet for
well-specified CRUD/UI, Opus for schema, new algorithms, gestures, and
anything touching the two files at their cap.

### CV0 — Extract the navigation cluster; split the test file (Opus)
- `CalendarViews.tsx` 350 → ~285: lift `navigateTo`, the URL→local resync
  effect, `handleStep/Today/SetView`, `openDay` into
  `src/lib/useCalendarNavigation.ts`; lift the per-view render branches so
  `CalendarViews` is header + a view switch (this is what keeps it flat as
  views are added). Apply **Vision's compare-and-clear `Set` + no-op-push
  guard** here (the accepted C9 residual). Decide `periodWindowEdges` /
  `canStepToPeriod`'s fate — dead since C6; delete with tests or keep with
  a dormant-export comment.
- **Split `calendarDates.test.ts` by concern** (C3) and empty STRUCTURE.md's
  adoption live-instances list.
- Pure refactor: `180/180` unchanged; a before/after DOM+URL trace of
  Week/Day/Month paging proves behaviour byte-identical.

### CV1 — View vocabulary, picker, persistence (Sonnet)
- `CalendarPeriodView` += `"schedule" | "threeDay" | "year"`. **Explicit**
  `stepPeriod` arms: schedule → no step; threeDay → 3 days; year →
  `monthOffset ± 12` (**no new offset** — `periodAnchor("year")` reuses
  `monthAnchor`, `withView("year")` is the Month arm, so the round-trip
  property tests stay intact). `parseViewParam`/`buildCalendarSearch` accept
  all six. Picker options become a module constant; each later phase appends
  its entry when the view exists (no stubs).
- Last-used view via `lastStore`, read **only when `?view=` is absent**.
- `loading.tsx`: a **measured** skeleton per new view as each lands (this
  repo has shipped a guessed skeleton twice).
- Tests: the cursor's three properties extended to threeDay and year.

### CT1 — Task schema + actions + form + Add sheet; all-day storage fix (Opus)
- **Migration (one, additive, reviewed as SQL):** `Task` — `id`, `title`,
  `details?`, `dueDate` (**UTC midnight**), `completedAt?`, `rrule?` (stored;
  UI in K4), `createdById` (→User, SetNull), timestamps; `TaskPerson
  (taskId, userId)` unique pair, ≥1. Plus the **all-day event fix**:
  `CalendarEvent` rows with `allDay=true` re-stored at UTC midnight, and
  `eventDaySpan`/`daysEventCovers`/`formatAllDayLabel`/`monthLayout`/
  `validateEventInput`/`EventForm` audited to read all-day dates with
  **UTC getters**. The audit list already sits in `calendar-v1.md`.
- `src/app/actions/tasks.ts`: create / update / delete (manager-gated via
  `MANAGER_ROLES`), **complete / uncomplete** — complete permitted for a kid
  **on a task they're assigned to** (a new, narrow guard form: verified
  session + membership in `TaskPerson`; document it beside STRUCTURE.md's
  two existing forms).
- **Extract from `EventForm.tsx` first** (it is at 350/350): the people
  picker and the date/time fields into `EventPeopleField.tsx` /
  `EventDateTimeFields.tsx` — K3's own binding precondition, arriving early.
  `TaskForm.tsx` reuses both: title, details, people (creator pre-selected),
  all-day due date, an inert "Does not repeat" row until K4, "Sync to" only
  once a calendar is linked (K6).
- Add sheet: **Event / Task**; Meal removed. Route: `/calendar/new` with a
  chip row (Google) if the two forms share enough; else `/calendar/new/task`.
- Scoped `db:seed-tasks` / `db:clean-tasks` attaching to existing people.
- **Verification includes the California case:** the real Camping Trip and a
  seeded task due Sep 3 both render on Sep 3 under `TZ=America/Denver` AND
  `TZ=America/Los_Angeles` — the test events fail today.

### CV2 — `timelineLayout.ts`, pure and tested (Opus)
Sibling of `monthLayout.ts`: imports only `mealPlanDates` and
`calendarDates`; **speaks minutes, never pixels**.
- `minutesOfDay(instant)` = `getHours()*60 + getMinutes()`.
- `blockGeometry(day, event)` → `{topMinutes, heightMinutes, clippedStart,
  clippedEnd}` | null. Day bounds via `startOfDay`/`addDays` (exact under
  DST); clip at bounds; `MIN_BLOCK_MINUTES = 30`; pull a late block up so
  `top+height ≤ 1440`; `end === dayEnd` is NOT clipped (agrees with
  `eventDaySpan`'s exact-midnight rule).
- **DST policy, stated:** wall-clock projection onto a fixed 24-row rail. On
  Nov 1 2026 the repeated 1 AM collapses (1:30 MDT and 1:30 MST both → 90); a
  3-hour event across it draws 2 hours tall. Google and Apple do the same.
  The guarantee is no NaN / negative / crash. Spring-forward's missing hour
  is an empty row.
- `belongsInAllDayRow`: `allDay === true` → row without reading times
  (tasks are all-day by construction and route here); a timed event
  spanning ≥ 1 full calendar day → row (`calendarDayDiff`, no ms); Fri 10 PM
  → Sat 2 AM → **grid on both days, clipped**.
- `partitionForTimeline(columnDays, events)` → `{allDayRow, timed}`; the
  row is then fed to **`monthLayout.assignLanes` unchanged** — it IS a month
  row. No second packer.
- `assignColumns` — greedy, the sibling of `assignLanes`: sort top asc,
  height desc, id asc; clusters split where `top >= clusterEnd` (touching
  9–10 / 10–11 is NOT overlap); lowest column whose last block ended ≤ top;
  `columnCount` per cluster; cluster end uses the *visual* bottom.
- 22 tests incl. midnight-crossing, exact-midnight end, both DST days
  (**fall-back cases Denver-gated with `skip`, or they pass vacuously under
  UTC**), touching-vs-overlap red-then-green, determinism under shuffle.

### CV3 — Schedule, the continuous list (Sonnet)
- Extract `page.tsx`'s select + mapper into `server-only`
  `src/lib/calendarEventQuery.ts` (precedent `personInfo.ts`). New read-only
  action `fetchCalendarEvents(windowStart, windowEnd)` in
  `actions/calendar.ts`: `getVerifiedSession()` null-returning guard, `Date`
  checks, `end > start`, `MAX_FETCH_SPAN_DAYS = 124` (public POST — cap the
  scan). Client builds windows from `addDays` on browser-local midnights, so
  **no TZ pad** here.
- Pure `scheduleWindow.ts`: `mergeWindow` (overlap-merge into `Map<id>`,
  so a multi-day event seen twice is stored once and a deleted one drops),
  `next{Backward,Forward}Chunk` at **30 days**, `scheduleRows` → months →
  days-with-events + **today always**. Thin `useScheduleWindow` hook:
  re-merges the seed on identity change (so `router.refresh()` after
  edit/delete flows in); one in-flight ref per direction; `[]` from a guard
  failure stops that direction rather than looping.
- **Manual scroll anchoring** (no `overflow-anchor` in WebKit): record
  `scrollHeight` before prepend, add the delta to `scrollTop` in
  `useLayoutEffect`. Sentinels via `IntersectionObserver`
  (`rootMargin: "100% 0px"`). If iOS momentum scroll stutters, fall back to
  a tappable "Earlier events" row — decide on a real phone.
- Reuses `DaySection`/`EventCard`; adds week-range dividers and "Nothing
  planned. Tap to create." (→ `/calendar/new?date=`). Initial scroll to
  `?date=` ?? today. **Scrolling never touches the URL.** `CalendarHeader`
  gains `showArrows`; Schedule hides them; Today scrolls if loaded, else
  navigates. Schedule takes `initialDay` as a prop — only the CV0 hook reads
  `useSearchParams`.
- Picker: "Week" and "Day" removed here, "Schedule" added. (Timeline Week /
  Day return in CV4 — the family never loses the list view.)

### CV4 — `TimelineGrid`: Day / 3 Day / Week (Opus; Strange-heavy)
- One component: `TimelineGrid({columnDays, events, today, now, windowStart,
  windowEnd, onOpenEvent})`. `columnDays` = `[anchor]` / `[anchor,+1,+2]`
  (anchor-relative, not snapped — Google) / `daysOfWeek(sundayOf(anchor))`.
- `HOUR_HEIGHT_PX = 48` **in the component** as `--hour-height`; 24 fixed
  rows; own `overflow-y-auto` scroller sized from the measured header + nav,
  with the weekday header and all-day row `sticky` inside it.
- Now-line from `useNowMinute()` beside `useToday()` (same
  `useSyncExternalStore` + 60 s tick, `null` on SSR — the hoist Vision asked
  for). **Scroll-to-now** on open when today is a column (now − ⅓ viewport),
  else 7 AM; `useLayoutEffect` keyed on the column set, active panel only.
- Hour labels through `Intl` on a synthetic non-calendar date.
- Width policy: at 375px a Week column is ~44px → colour bands with 2–3
  chars (Google does the same); Day shows location; 3 Day and Week don't.
  **Contrast by border, not alpha** — C7's ruling for Month pills applies.
- Per-column `isOutsideWindow` → not-loaded treatment in the all-day row,
  the `MonthCell.notLoaded` policy. ±61 days suffices; **do not** wire the
  timeline to `useScheduleWindow`.
- Adds Day / 3 Day / Week to the picker; measured `loading.tsx` shapes.

### CV5 — Month text pills, month chips, Year (Sonnet)
- Month pills show text at phone width (drop the `md:` gate; C7's border
  stays; fix the stale "~2 characters" rationale — 8 fit).
- `MonthChips`: horizontal scroller of month names, year shown once at each
  January; tap = `jumpTo(1st, "month")`. Rendered above the Month grid; reused
  by CV6's dropdown.
- `YearView`: 12 × `monthGridDays`, day numbers only, today circled, tap a
  month → Month. Steps by `monthOffset ± 12`. Adds Year to the picker.

### CT2 — Tasks in every view; detail sheet; Mark complete (Sonnet)
- `page.tsx` and `fetchCalendarEvents` also return tasks in the window — a
  second query **in the same `Promise.all`** (never sequential; the
  performance rule). `CalendarTaskView` type; views take whichever prop
  shape keeps `DaySection`/`TimelineGrid` honest.
- Rendering: Schedule → a task variant of `EventCard` (checkbox affordance;
  `line-through` + `text-muted` when `completedAt`); timeline → the all-day
  row via `partitionForTimeline`; Month → pills. **`line-through` is
  permitted here and only here** — DESIGN.md forbids it for *past events*
  because "already happened" ≠ "done"; state the distinction in code.
- `TaskDetailSheet.tsx`: title, details, people, due date, **Mark complete /
  Mark not complete** (48px primary; kids see it only on their own tasks),
  Edit, Delete (single tap, house rule).
- Verification: a kid session can complete its own task and cannot complete
  another's or edit anything (attack the action directly with a minted
  cookie, Phase-1e style); counts back to baseline.

### CV6 — Month dropdown + swipe-to-page (Opus)
- The header title becomes a ≥44px control opening a sheet: compact month
  grid (dots = colour bands shrunk; today filled) + `MonthChips`; tapping a
  day → `jumpTo(day, currentView)`. Present on every view.
- `usePageSwipe` hook extracted from `SwipeActions`' state machine (8px
  undecided zone → direction lock → ref on release → `touch-pan-y` → swallow
  next click). Mounted around **timeline, Month and Year only**. Calls the
  same `step()` the arrows call; **arrows stay**. Pre-render ±1 neighbour
  panels for the drag. **Designed knowing CD1 follows:** the hook yields
  early if a long-press has claimed the pointer.
- Amend `calendar-v1.md:244` to say swipe is additive.
- Unoccluded-target check (`elementFromPoint` at arrival scroll) on every
  new tappable — Strange's proposed DESIGN.md rule, applied whether or not
  Bryce has approved the wording yet.

### CD1 — Long-press and drag to reschedule (Opus; Strange-heavy)
- Timeline only. `useLongPressDrag`: hold ≥ 400 ms without moving > 8 px →
  **drag mode** (lift: scale + shadow); anything sooner is handed to the
  scroller / page-swipe. Drop → `minutesOfDay` snapped to **15 min**; across
  columns changes the day. Duration preserved.
- Guarded `moveCalendarEvent(id, newStartAt)` — manager only; recomputes
  `endAt` from the stored duration **server-side** (never trusts a client
  end), runs `validateEventInput`, `revalidatePath`. Optimistic via
  `useOptimistic` (the `PantryList` pattern); a rejected drop snaps back with
  the house `{ error }` inline.
- **Not draggable in v1:** all-day/multi-day blocks and tasks (different row,
  different gesture — Month drag later), and **recurring events** until K4
  supplies the this/all dialog (block shows, doesn't lift; one-line reason on
  tap).
- Verification: drag 9–10 to 2:15 → 2:15–3:15 persisted (direct DB read);
  vertical drag without hold scrolls; horizontal drag without hold pages; a
  kid cannot lift a block; a failed server validation snaps back.

## Then — the original roadmap, re-slotted (nothing dropped)

Content unchanged from `calendar-v1.md`; only the order and two
dependencies changed.

- **K3 — Filters, tags, meal overlay.** Filter sheet (people / tags / **show
  tasks** / show meals) persisted per device; `CalendarTag` +
  `CalendarEventTag`; `TagSelectSheet` generalized; the meals card per day
  on Schedule and the timeline's all-day row. `EventForm` precondition is
  already satisfied by CT1's extraction. **Tasks get tags too** if wanted —
  additive.
- **K4 — Recurrence UI.** Repeats section for events **and tasks**; expansion
  in every view (K4 must give each expanded instance a distinct id before
  `assignLanes`/`assignColumns` — Vision's C1 note); "This / All" on edit,
  delete, and **drag** (unlocks dragging recurring events, CD1's carve-out).
- **RSVP / inbox — a walkthrough still owed.** Bryce named "an inbox for
  accepting events you're added to." It is a **schema decision** (per-person
  pending / accepted / declined on `CalendarEventPerson`) and **must be
  settled before K6**, because Google's attendee-response model has to map
  onto ours, not the reverse. Do this walkthrough right after CD1.
- **Search — a walkthrough still owed.** Google's header search. Reuses the
  `match.ts` tokenizer (`searchRecipes` precedent). Slots anywhere after CV3.
- **K5 — AI import** (paste / photo / voice → `EventForm`; now also a Task
  path).
- **K6 — Google: link + outbound.** Feasibility gate first (Bryce links the
  work account). Tasks may push as Google Tasks or as all-day events —
  decide at K6.
- **K7 — Google: inbound.**

## Verification, per phase

- Gauntlet: `npx tsc --noEmit`, `npx eslint .`, `npm test`, **and the direct
  `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`**,
  `npm run build`.
- Real interaction in a browser at 375px, both themes set explicitly via
  `Emulation.setEmulatedMedia` (never `--force-dark-mode`); horizontal
  overflow via `body.scrollWidth`; every new tappable checked with
  `elementFromPoint` at the **arrival** scroll position; kid-role session
  confirms read-only where it should be.
- Phase-specific: CV2's 22-case suite with fall-back cases gated; CV3's
  prepend-three-chunks `scrollTop`/`scrollHeight` delta check and a
  delete-leaves-the-cache check; CV4's side-by-side 50% pair, a Fri 10 PM →
  Sat 2 AM clip on both days, and the now-line agreeing with a 1:30 AM Nov 1
  block; CT1's California case for both an event and a task; CD1's
  drag-persists / scroll-doesn't-lift / kid-can't-lift trio.
- Database counts to baseline after every phase (`calendarEvent` 3, `user`
  5, `task` 0 until seeded).
- Each phase is one Avengers mission with its own gate budget; the K2
  lessons carry (gates that seed data run serially; builders verify their
  own instruments; comments may not claim what the code doesn't guarantee).

## Open items carried, not blocking

- Two constitution amendments await Bryce: Captain's (dormant exports),
  Strange's (unoccluded targets).
- `useCalendarPeriod.ts:229` stale comment (off every boundary so far —
  CV0 owns it).
- C4's one-source-of-truth repairs (`hexToRgba` hoist, skeleton relocation,
  `new/page.tsx` through `parseDateParam`) — fold into CV0 or CV1.
- Neon dev-branch password rotation — Bryce, in the console.
