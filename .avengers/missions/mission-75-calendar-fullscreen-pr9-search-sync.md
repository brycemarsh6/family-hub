# Mission 75: Calendar full screen PR 9, Search, and syncing without a button

- **Status:** BUILDING (Bryce OK'd the mock and all five recommendations 2026-11-12, relayed word for word from the parent chat: "Yes")
- **Started:** 2026-11-11 · **Updated:** 2026-11-11
- **Plan:** `.avengers/plans/calendar-fullscreen-v1.md`, "PR 9: Search, and syncing without a button (decisions 15, 16; answer 2)". The last PR of the series.
- **Branch:** `claude/calendar-fullscreen-pr9-830f04`, cut from `origin/main` `11811fd` (PR 8 merged as #116)
- **Mock:** `.avengers/mocks/calendar-pr9-search-mock.html`

## Brief

- **Goal:** a Search circle replaces Refresh in the Calendar top bar and
  opens `/calendar/search` (BackLink "Calendar"): type two or more letters
  and matching events (title, location, notes) and tasks (title, details)
  appear grouped by date with Schedule's cards; a tap opens the existing
  detail sheet. The Calendar pulls from Google on open, when the app comes
  back to the front, and every few minutes while on screen (the Tablet only
  if touched in the last 10 minutes, answer 2). `/settings/calendars` gains
  "Sync calendars now" and "Last synced".
- **Done means:** the above; the search action refuses a signed-out caller;
  results are the set the Calendar would show; the timer never fires while
  hidden or past the Tablet idle limit; no pull loop on focus; Refresh is
  gone and nothing else is lost (reconnect banner stays); ScheduleView and
  CalendarViews split before adding; the gauntlet passes; merged, deploy
  checked, phone test in `.avengers/status.md`, this file DELIVERED, plan
  status and CLAUDE.md say the series is finished.
- **Out of scope:** expanding Marshee-made `rrule` repeats (no expander
  exists; one row each), a database full-text index, the dashboard
  Calendar tile's pull (unchanged), the "After the series" list.

## Danger register

From AGENTS.md, absolute: no `db:seed`/`db:reset`; never a clean script for
`User`; migrations additive only (none expected); secrets never in git or
chat; never `git add -A`/`.`; direct pushes to `main` blocked; merging
deploys to the family. No database writes by any agent. A forced pull
from a dev session touches the dev branch's linked calendars only.

## Gauntlet

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always). Vision owns the action's session check, the
  result set and the timer rules.
- Strange: a new page and a changed top bar and settings page (four
  viewports, text sizes, Tablet).
- Captain: in (a new page, new files, a split of two big files).
- Banner: done (brief below).

## Banner's brief (2026-11-11, summary)

- Events: `getCalendarEventsInRange` (`calendarEventQuery.ts:158`) is an
  overlap query; tasks `getTasksInDueRange` (`calendarTaskQuery.ts:31`).
  The Calendar applies no filter beyond the date window (no visibility
  field on either model). STRUCTURE.md: each select and mapper has one
  home, so search adds an export to those two files.
- Repeats are rows, never expanded. Google instances are one row each with
  `seriesId` (pull window 30 days back, 365 forward); Marshee `rrule` is
  stored and never read.
- `match.ts` `tokens` normalises and singularises; no DB text search exists
  anywhere; the assistant inventory route filters in memory.
- `ScheduleView.tsx` 603 lines: task sheet mount and handlers 538-591,
  `groupByWeek` + `TodayEmptyRow` 102-157. `CalendarSheets.tsx` has a near
  copy of the task handlers. `useUndoBar` called once in `CalendarViews`.
- `CalendarPullButton.tsx` (132): `PullContext`, `useOpenPull` (once per
  mount, unforced), the Refresh button and note, `CalendarRelinkBanner`.
  Also used by `CalendarWidgetTile`. Server lease: unforced 5 min, forced
  30 s (`calendarPullRun.ts:26-28`); forced from a non-manager does nothing.
- "Last checked" from `lastPulledOkAt` in `LinkedAccountCard.tsx:107`
  (`lastCheckedLine`, `calendarSyncVocabulary.ts:152`). Settings page is
  managers only.
- No `visibilitychange` listener and no shared idle signal exist; the
  screensaver's last-tap clock is private to `ScreensaverHost.tsx`.

## Questions for Bryce (with the mock): all answered "Yes" 2026-11-12

1. Repeating events: one row on the next date, marked "Repeats". Rec: yes.
2. Order: upcoming nearest first, then "Past" newest first, 25 each with
   "Show more"; completed tasks crossed out. Rec: yes.
3. Everyone who sees the Calendar can search (kids, Tablet). Rec: yes.
4. "Last synced" replaces "Last checked" everywhere. Rec: yes.
5. Automatic check every 5 minutes (the server's own limit). Rec: yes.

## Fury's structural calls (no Bryce decision needed)

- **Search matches in memory, not in SQL.** No DB text search exists in the
  app, and a family calendar is a few thousand rows. The server reads a slim
  text select (id, title, location, notes or details, dates, series id),
  matches with `match.ts`'s `tokens` (each typed word must be the start of
  some word in the item's fields, so "pia" finds "Piano"), arranges, then
  loads the full views for the chosen ids through the existing select and
  mapper (STRUCTURE.md: one home each).
- **One task sheet mount.** `CalendarTaskSheet.tsx` replaces the two copies
  (`ScheduleView`, `CalendarSheets`) and is the search page's third caller.
  The optimistic tick and the "Task completed" bar move out of
  `CalendarViews` into `useTaskDone` so the search page reuses them with its
  own single `UndoBar`.
- **Auto pull is a pure rule plus the provider.** `src/lib/autoPullRules.ts`
  (5 minute timer, 10 minute Tablet touch window, tested); the provider
  listens to `visibilitychange` and `pointerdown`; one pull in flight at a
  time. A Tablet touch after 10 or more idle minutes pulls at once, which
  is how "a tap that wakes the screensaver always checks" is met without
  reaching into `ScreensaverHost`.
- `CalendarPullButton.tsx` is renamed `CalendarAutoPull.tsx` (what is left:
  the provider, `useOpenPull`, the reconnect banner).

## Contracts

Waves: **C1 and C2 in parallel** (disjoint files), then **C3 and C4 in
parallel**. Builders in the same wave share this worktree, so **builders do
not commit**: Fury commits each contract by its explicit paths after it
reports. A typecheck error inside the other contract's files is not yours;
say so and move on. Shared rules: sizes in rem, never px text; touch only
(48px targets, hover never the only cue); Lucide icons only; colours by
job; never `git add`; no database writes; no migration.

### C1 - one task sheet mount, and the tick out of CalendarViews (no behaviour change)

1. **Objective:** extract so PR 9 can add without growing the two big files.
2. **Boundaries.** May touch: `src/components/ScheduleView.tsx`,
   `src/components/CalendarSheets.tsx`, `src/components/CalendarViews.tsx`,
   new `src/components/CalendarTaskSheet.tsx`, new `src/lib/useTaskDone.ts`,
   `docs/structure/calendar.md` (one short rule for each new file).
   Must not touch: everything else, including `TaskDetailSheet.tsx`,
   `useUndoBar.ts`, `taskDoneOverrides.ts`, any `src/app/` file.
   - `CalendarTaskSheet` mounts `TaskDetailSheet` with `task, people,
     canManage, isTablet, onClose, onTaskCompleted, clearTaskDone` and one
     `refresh(days: { old: Date; next?: Date })`-style callback (name it
     well) so Schedule passes its `refreshDay` + `router.refresh` and
     `CalendarSheets` passes `router.refresh`. Keep every behaviour of both
     current mounts, including Schedule's re-seat of `selectedTask` after a
     due-date edit (mission-15/C7) and the comment's reason, shortened.
   - `useTaskDone(serverTasks, { showBar, closeBar, uncomplete })` holds
     `CalendarViews.tsx`' lines ~160-200 today: `taskBarFor`, the override
     map and its prune, `tasks`, `applyDone`, `clearTaskDone`,
     `pruneTaskDoneWith`, `onTaskCompleted`, and the `showMoveBar` wrapper.
     `src/lib/` files never import from `src/app/`: the action comes in.
3. **Verification:** the full gauntlet (mission file). Line counts:
   `ScheduleView.tsx` at or under 560, `CalendarViews.tsx` at or under 515.
4. **Evidence:** `wc -l` before and after for the five files; the gauntlet
   output tails; a short list of each moved behaviour and where it now lives.
5. **Done:** one `TaskDetailSheet` JSX mount in the repo outside
   `CalendarTaskSheet.tsx` (grep proves zero others); test count unchanged
   (2060 Denver); no behaviour change.

### C2 - the search rule, the queries and the action

1. **Objective:** a session-checked Server Action that returns calendar
   search results arranged as Bryce approved.
2. **Boundaries.** May touch: new `src/lib/calendarSearch.ts` and
   `src/lib/calendarSearch.test.ts` (pure: no `db`, no `server-only`),
   `src/lib/calendarEventQuery.ts` and `src/lib/calendarTaskQuery.ts` (new
   exports only: a slim text select for every row, and load-by-ids that
   reuse the existing select and mapper), new
   `src/app/actions/calendarSearch.ts`, `STRUCTURE.md` (one entry: the
   search query's one home). Must not touch anything else.
   - **Matching:** `tokens(query)`; fewer than 2 letters in total returns
     empty. Every query token must be a prefix of some token from the
     item's fields (events: title, location, notes; tasks: title, details).
   - **Arranging** (pure, given `now` and the household zone): an event is
     upcoming if `endAt > now`, a task if its due day is today or later
     (Denver; due dates are UTC-midnight all-day instants, use the existing
     `allDayInstantToLocalDay`-family helpers, never inline zone maths).
     Events sharing a `seriesId` collapse to one: the earliest upcoming,
     else the latest past, flagged repeating. Upcoming sorted nearest
     first, past newest first; grouped by local day (events by start day,
     tasks by due day), within a day in the order Schedule uses. Caps count
     items per side (default 25, the caller raises it by 25 for "Show
     more", clamp at 500), with `hasMoreUpcoming` / `hasMorePast`.
   - **Action** `searchCalendar({ text, upcomingLimit, pastLimit })`: first
     line `getVerifiedSession()` (or the DAL call the other calendar
     actions use), refusing a signed-out caller; validates input (string,
     at most 200 characters, limits integers); returns days as
     `{ day, events: CalendarEventView[], tasks: CalendarTaskView[] }`
     plus the set of repeating event ids and the two `hasMore` flags. No
     filter beyond the Calendar's own (it has none: Banner, item 2).
3. **Verification:** gauntlet; new tests cover at least: prefix match
   across fields; every-word rule; under 2 letters; series collapse both
   ways; task due today counts as upcoming in both TZ runs; an event in
   progress is upcoming; caps and `hasMore`; ordering both sides.
4. **Evidence:** test names and counts in both TZ runs; the action's first
   lines quoted.
5. **Done:** gauntlet green; the action has no plain (non-async) export.

### C3 - the search page (after C1 and C2)

1. **Objective:** `/calendar/search` as in the mock frames 1 to 4.
2. **Boundaries.** May touch: new `src/app/(app)/calendar/search/page.tsx`
   (and `loading.tsx` if the other calendar pages have one), new
   `src/components/CalendarSearch.tsx`, `src/components/DaySection.tsx`,
   `src/components/EventCard.tsx`, `src/components/TaskCard.tsx` (optional
   props only; every existing caller unchanged), `docs/structure/calendar.md`.
   Must not touch: `CalendarHeader.tsx`, `CalendarViews.tsx`,
   `ScheduleView.tsx`, C2's files, C4's files.
   - Page (server): `getVerifiedUser()`, `canManage` and `isTablet` the way
     `calendar/page.tsx` derives them, and a roster: active users plus
     anyone assigned to any task (same select as the Calendar's roster).
     `BackLink href="/calendar" label="Calendar"`, wide layout opt-in like
     `calendar/new/page.tsx`.
   - Client: an input (`type="search"`, `enterKeyHint="search"`, autofocus,
     at least 3rem tall, a clear button with an accessible name), 300 ms
     debounce, a request counter so an older answer never replaces a newer
     one, "Searching..." while waiting, the hint and "No events or tasks
     match "x"." words from the mock, results through `DaySection` per day,
     a "Past" heading between the sides, "Show more" / "Show more past"
     buttons. "Repeats" on repeating events and the matched words
     highlighted in titles, both through new optional props.
   - Sheets: `EventDetailSheet` and C1's `CalendarTaskSheet`; the search
     page's own `useUndoBar` + `useTaskDone` and one `UndoBar` (never a
     toast); after any change, re-run the current search.
3. **Verification:** gauntlet; `npm run build` lists `/calendar/search`.
4. **Evidence:** files and line counts, gauntlet tails, the build line.
5. **Done:** gauntlet green; no existing card or DaySection caller changed.

### C4 - sync without a button (parallel with C3)

1. **Objective:** Refresh goes; Search takes its place; the Calendar pulls
   by itself; Settings has "Sync calendars now" and "Last synced".
2. **Boundaries.** May touch: `src/components/CalendarPullButton.tsx`
   (renamed `CalendarAutoPull.tsx` with `git mv`), `CalendarHeader.tsx`,
   `CalendarWidgetTile.tsx` (import path only),
   `src/app/(app)/calendar/page.tsx`, new `src/lib/autoPullRules.ts` and
   its test, `src/lib/linkedCalendarsRead.ts`,
   `src/lib/calendarSyncVocabulary.ts` and its test,
   `src/components/LinkedAccountCard.tsx`,
   `src/components/SyncedCalendarsList.tsx`, new
   `src/components/SyncNowButton.tsx`,
   `src/app/(app)/settings/calendars/page.tsx`,
   `docs/structure/calendar-sync.md`, `docs/structure/calendar.md`.
   Must not touch: C3's files, `calendarPullRun.ts` (the server lease
   stays as it is), `calendarPull.ts` unless a type must widen.
   - Header: the Refresh circle is replaced by a Search `ActionCircle`
     (Lucide `Search`, label "Search") that navigates to `/calendar/search`
     (a Link, or `router.push` if `ActionCircle` has no link form). The
     reconnect banner stays.
   - `autoPullRules.ts`: `AUTO_PULL_EVERY_MS` (5 minutes),
     `TABLET_TOUCH_WINDOW_MS` (10 minutes), and pure decisions: should the
     timer pull (never when hidden; Tablet only if the last touch is within
     the window), should a touch pull now (Tablet, after the window passed).
   - Provider (gets `isTablet`): pulls on mount (as now), on
     `visibilitychange` to visible, on the 5-minute timer only while
     visible (cleared when hidden, restarted on return), and on the Tablet
     touch rule; one pull in flight at a time; unforced; `router.refresh()`
     only when `changed`; listeners removed on unmount. `useOpenPull` for
     the dashboard tile unchanged.
   - `showRefresh` leaves the context and `loadCalendarPullState`; anything
     only it used goes too. `PULL_WORDS.refreshLabel` becomes the Sync
     button's "Sync calendars now"; "Last checked" becomes "Last synced"
     everywhere (`lastCheckedLine` renamed to match).
   - Settings: `SyncNowButton` (parents and admins already gate the page)
     calls `pullGoogleEvents(true)`, shows "Up to date" or the unreachable
     words for 4 seconds under it, then `router.refresh()`; under it "Last
     synced ..." from the newest `lastPulledOkAt` of the "Both ways"
     calendars. Shown only when at least one calendar is "Both ways".
3. **Verification:** gauntlet; tests for every rule branch (hidden, Tablet
   inside and outside the window, touch after idle, non-Tablet).
4. **Evidence:** `git grep -n "showRefresh\|Last checked\|CalendarPullButton"`
   returns nothing in `src/`; gauntlet tails; test names.
5. **Done:** gauntlet green; no Refresh anywhere; the banner unchanged.

## Execution (2026-11-12)

- C1, C2, C3, C4 all DONE; Fury committed each by explicit path
  (`git log --oneline 11811fd..HEAD`). Stark staged nothing.
- Sizes: `ScheduleView.tsx` 603 to 558, `CalendarViews.tsx` 551 to 512;
  `docs/structure/calendar.md` now 293 (split if it passes ~300).
- Tests: 2060 (mission 74) to 2083 Denver (+13 C2 `calendarSearch.test.ts`,
  +8 C4 `autoPullRules.test.ts`, +2 C4 vocabulary); UTC 2073 + 10 skips.
- Environment: the worktree's `node_modules` had been a symlink to the main
  checkout, which is on an old commit and lacks four packages, so tsc and
  build failed there. Fury replaced the symlink with `npm ci` in the
  worktree; C3 then ran `npm run build` green with `/calendar/search` listed.
- **Fury's wording calls, told to Bryce:** the search failure line
  "Couldn't search. Try again." (the "Couldn't undo. Try again." pattern);
  a result date in another year adds the year (decision 3's rule).
  Bryce, 2026-11-12: "Both of those are fine".
- Notes for the gates: stale "Last checked" in comments only
  (`calendarPullRun.ts`, its test title, `linkedCalendarWrites.ts`); no
  `loading.tsx` for `/calendar/search` (it inherits the Calendar's month
  skeleton); `HighlightedText` lives in `EventCard.tsx` and `TaskCard`
  imports it.

## Gates

### Pass 1 (2026-11-12, HEAD e8c0b89)

- **Vision: BLOCKED.** Gauntlet green (tsc, lint, 2083 Denver, UTC 2073 +
  10 skips, build lists `/calendar/search`); boundaries clean.
  - V1 BLOCKER: prefix match runs on singularised words ("movies" becomes
    "movy"), so "movie" misses "Movies at the park", "cookies" misses
    "Cookie swap", "serie" misses "World Series".
  - V2 BLOCKER: `rerun` in `CalendarSearch.tsx` asks the text captured when
    the sheet acted; an Undo after typing more leaves "Searching..." forever.
  - Notes: Sync button shows even when every account needs relinking; each
    search reads every row (watch); stale "Last checked" comments. Owned
    checks passed: signed-out refusal, same set, timer and Tablet rules, no
    focus loop, C1 behaviour kept, forced pull managers only.
- **Captain: BLOCKED.**
  - K1 BLOCKER: `calendar/search/page.tsx` uses the null-returning
    `getVerifiedUser()`; pages use `requireVerifiedUser`.
  - K2 BLOCKER: `HighlightedText` and `CalendarSearch` redefine the prefix
    and words rules outside `calendarSearch.ts`.
  - Notes: STRUCTURE.md's task-select sentence and the ScheduleView /
    CalendarViews size record are stale; calendar-sync.md "only caller" is
    false; calendar.md's `uncompleteTask` line; `calendarPull.ts` header
    still names Refresh; the roster query now exists three times (proposed
    `loadCalendarRoster`); seven older pages carry the same guard debt.
- **Strange: BLOCKED.**
  - S1 BLOCKER: each new letter blanks the list until the answer arrives;
    the mock's frame 2 keeps the earlier results under "Searching...".
  - Notes: the error line has nothing to tap and a failed "Show more"
    wipes results; the highlight borrows `--warn-soft` (job: running low);
    Settings button sits below the card in grey, the mock had it above in
    green (Bryce's call); iPhone autofocus may not raise the keyboard;
    DESIGN.md's CalendarHeader entry still says Refresh.

## Fix contracts

### F1 - the four blockers and the cheap notes

1. **Objective:** clear V1, V2, K1, K2, S1 and fold in the listed notes.
2. **Boundaries.** May touch: `src/lib/calendarSearch.ts` and its test,
   `src/lib/match.ts` (one new small export only, if needed; no behaviour
   change to existing exports), `src/components/CalendarSearch.tsx`,
   `src/components/EventCard.tsx`, `src/components/TaskCard.tsx`,
   `src/app/(app)/calendar/search/page.tsx`, `src/app/globals.css` (one
   `--highlight` token, light and dark, same values as `--warn-soft` today,
   plus its Tailwind theme entry wherever the other colour tokens are
   registered), `src/components/SyncedCalendarsList.tsx` and
   `src/lib/linkedCalendarsRead.ts` (only for the Sync-button visibility),
   comments only in `src/app/actions/calendarPull.ts`,
   `src/lib/calendarPullRun.ts`, `src/lib/calendarPullRun.test.ts` (a test
   title), `src/lib/linkedCalendarWrites.ts`; docs: `STRUCTURE.md`,
   `DESIGN.md`, `docs/structure/calendar.md`,
   `docs/structure/calendar-sync.md`. Must not touch anything else.
   - V1 + K2: one exported pure helper in `calendarSearch.ts` (for example
     `matchedPrefixLength(word, typedWords)`) that compares each typed word
     in raw normalised and singular form against each field word in raw
     normalised and singular form; `matchesSearch` and `HighlightedText`
     both use it, and the highlight length comes from the raw written word.
     `CalendarSearch.tsx` gets its highlight words from `searchWords`, no
     direct `match.ts` import. Tests: "movie" finds "Movies at the park",
     "movies" finds "Movie night", "cookies" finds "Cookie swap", "serie"
     finds "World Series", "berry" against "Berries" highlights the right
     length; existing tests stay green. One header line: the matcher is
     lenient on purpose (visible results).
   - V2: the live trimmed query in a ref; `rerun` and Show more read it and
     ask only when `searchWords` accepts it.
   - S1: keep the latest answer on screen while a newer one is pending
     (Strange's recipe: render from the latest answer; "Searching..." while
     `answer.asked !== query`; failed and nothing-found only for the
     current answer). A failed Show more keeps the previous result and
     shows the error line under the list.
   - Error line gains a 48px "Try again" button that re-asks the live query.
   - K1: `requireVerifiedUser()`; search stays open to every login.
   - Highlight uses the new `--highlight` token.
   - Sync button shows only when a "Both ways" calendar sits on an account
     whose status is ok and Google is configured (the old Refresh rule).
   - Docs and comments: Captain's wording for STRUCTURE.md's task select
     sentence and the size record (558 / 321, 512 / 245), the
     `calendar-sync.md` caller sentence, `calendar.md`'s `uncompleteTask`
     line, DESIGN.md's CalendarHeader entry (Search, not Refresh) plus one
     vocabulary line for `HighlightedText`, "Last checked" and the Refresh
     caller in comments.
3. **Verification:** the full gauntlet including `npm run build`.
4. **Evidence:** new test names, counts in both TZ runs, gauntlet tails,
   `git grep -n "Last checked\|Refresh button" -- src` output.
5. **Done:** all five blockers gone with evidence; nothing outside the list.

### Pass 2 (2026-11-12, HEAD 9fc2012)

- **Captain: PASS.** K1 and K2 fixed. Notes: `HighlightedText` still splits
  words its own way ("O'Brien" matches but is not highlighted; proposed a
  pure `highlightParts`); "which calendars get pulled" is now written three
  times (proposed `isPullableCalendar`); `forms()` is a search-only plural
  rule; no direct `rawTokens` test; roster copies and page-guard debt carried.
- **Strange: PASS.** S1 fixed (7 day groups stay under "Searching...");
  Try again 48px and works; a failed Show more keeps the list. Notes: the
  alert wraps the button (a screen reader says "Try again" twice); the dark
  highlight is quiet (1.23:1 fill); pass 1 carry-overs.
- **Vision: BLOCKED.** Gauntlet green with exit codes (build exit 0). V1,
  V2 cleared; S1 states traced, none lies.
  - V3 BLOCKER (present since C2, missed at pass 1): accented letters are
    dropped by `normalize`, so "cafe" misses "Café lunch", "zoe" misses
    "Zoë's recital", "pinata" misses "Piñata party"; "me" matches "Crème
    brûlée" through a stray piece with no highlight.
  - Notes: lenient false positives ("plus" finds "Plumber", declared);
    Show more on a stale list asks the live text (harmless).

### F2 - accents fold (last pass)

1. **Objective:** clear V3, plus two cheap notes.
2. **Boundaries.** May touch: `src/lib/calendarSearch.ts` and its test,
   `src/components/EventCard.tsx` (`HighlightedText` split regex only),
   `src/components/CalendarSearch.tsx` (`SearchError`'s `role="alert"` on
   the `<p>` only; Show more shown only when the answer on screen is the
   current one). Must not touch `match.ts` or anything else.
   - A private `fold(text)` (`normalize("NFD")`, strip `\p{M}`) applied
     before `rawTokens` / `tokens` in `searchWords`, to the joined fields in
     `matchesSearch`, and to the `word` argument in `matchedPrefixLength`.
     `HighlightedText` splits on `/([\p{L}\p{M}\p{N}]+)/u`.
   - Tests: "zoe" finds "Zoë's recital", "pinata" finds "Piñata party",
     "cafe" finds "Café lunch", `matchedPrefixLength("Café", ["caf"])` is 3,
     "me" does not match "Crème brûlée".
3. **Verification:** the full gauntlet, exit codes captured.
4. **Evidence:** test names, counts both TZ, each command's exit code.
5. **Done:** V3 gone; nothing outside the list.
