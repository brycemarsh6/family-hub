# Mission 75: Calendar full screen PR 9, Search, and syncing without a button

- **Status:** WAITING ON BRYCE (mock sent 2026-11-11, no code written)
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

## Questions for Bryce (with the mock)

1. Repeating events: one row on the next date, marked "Repeats". Rec: yes.
2. Order: upcoming nearest first, then "Past" newest first, 25 each with
   "Show more"; completed tasks crossed out. Rec: yes.
3. Everyone who sees the Calendar can search (kids, Tablet). Rec: yes.
4. "Last synced" replaces "Last checked" everywhere. Rec: yes.
5. Automatic check every 5 minutes (the server's own limit). Rec: yes.
