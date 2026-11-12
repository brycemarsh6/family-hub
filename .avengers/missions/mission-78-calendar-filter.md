# Mission 78: Calendar filter by person and synced calendar

- **Status:** AT-THE-GATES (Bryce approved the mock 2026-11-12 except the strip; see Bryce's answers)
- **Started:** 2026-11-12 · **Updated:** 2026-11-12
- **Branch:** `claude/calendar-filter-people-calendars-dc7840`, cut from `main` `5bbf740` (PR #118 merged)
- **Mock:** `.avengers/mocks/calendar-filter-mock.html`
- **Parallel chats:** mission 76 (parent delete rule) and mission 77 (person colours) touch calendar code too. Use the shared colour names, never copied values; sync with `main` right before merging.

## Brief

- **Goal:** Bryce's words: "I need to make sure there is a filter button that I can filter by user and synced calendar (including sub calendar)". A Filter control on the Calendar opens a sheet with People and Calendars checkboxes (each linked Google calendar under its account, plus "Made in Marshee"); unticked ones hide their events on every view; the screen always shows when a filter is on.
- **Done means:** the filter built as Bryce approves it, every gate passes, merged with the Gauntlet green, production deploy checked, `git log origin/main..HEAD` empty, this file DELIVERED, Bryce's phone test in `.avengers/status.md`.
- **Out of scope (proposed, pending Bryce):** filtering Search, filtering the dashboard Calendar tile, any change to what is synced, a database column for the filter.

## What exists today (Fury, 2026-11-12)

- No filter of any kind. Mission 75's Banner brief: "The Calendar applies no filter beyond the date window". Grep of `CalendarViews.tsx`, `ScheduleView.tsx`, `CalendarHeader.tsx` finds only `Array.filter` calls.
- Data that makes it possible, all already in the browser: `CalendarEventView.people` (who), `sourceLinkedCalendarId` (the Google calendar a pulled event came from, null for Marshee-made), `syncs[].linkedCalendarId` (calendars Marshee copied it to). Tasks have people, no calendar. Pulled events get one person: the account's linker (`calendarSyncPull.ts:213`).
- The calendar list itself (names, accounts) is NOT sent to the Calendar page yet: page.tsx would need one small read (`linkedCalendarsRead.ts`) in its existing `Promise.all`.
- Top bar today: title, Today, View (row of six from iPad width), Search (`CalendarHeader.tsx`). Title sizing comment: "Jan 2027" barely fits beside three circles at 393px, so a fourth circle needs the short month on a phone.
- Precedents: `HabitFilterSheet` ("Filter · N", DESIGN.md), `lastCalendarView.ts` (per-device localStorage through `useSyncExternalStore`).
- Size: `CalendarViews.tsx` 512, `ScheduleView.tsx` 558, `docs/structure/calendar.md` 293 (split seam at ~300). Extract before adding.

## Questions put to Bryce (in the mock, each with Fury's pick)

1. Where the button sits: **fourth circle "Filter"** (phone title shortens to "Nov"). Alternative: a row inside the month dropdown.
2. Remembered: **per login, per device** (localStorage, hidden ids stored so new people and calendars start shown).
3. Sub calendars: every linked calendar switched on (any direction), under its Google account, plus "Made in Marshee". An event on several calendars shows if **any** of them is ticked; people AND calendars must both match; an event with no people follows only calendars.
3d. Tasks and planned habits follow People only.
4. Filter on: **solid circle with a count, plus a strip "Hiding ... · Show all"** on every view.
5. Search **ignores** the filter; the dashboard tile ignores it too.

## Bryce's answers (2026-11-12, word for word)

"I'm good with all recs except the yellow banner at the top. But I do like the little number circle chip on the filter icon showing that a filter is being used."

So: questions 1, 2, 3 (3b, 3c, 3d) and 5 as recommended. Question 4: **no strip**. The only "filter is on" sign is the Filter circle itself: solid, with the count chip, label "Filtered".

## Decided by Fury (structure, not design)

- The filter stores what is HIDDEN (`hiddenPeople`, `hiddenCalendars`), so new people and calendars start shown. "Made in Marshee" is the key `"marshee"` (LinkedCalendar ids are cuids, no clash).
- The count on the chip = hidden ids that still exist in today's lists (a stale id from an unlinked calendar never counts).
- Account heading in the sheet: the account's `label`, else its email (what Settings, Calendars shows).
- Calendars listed: `direction` not `"off"`, any account status. No Google colour dots (nothing in the app uses `colorHex` yet).
- People listed: active people only (`!deactivated`), in roster order.
- New companion file `docs/structure/calendar-filter.md` instead of splitting `calendar.md`, because missions 76 and 77 are editing calendar files in parallel and a split now would collide.

## Danger register

From AGENTS.md, absolute: no `db:seed` / `db:reset`; never touch the `User` table with scripts; migrations additive only (none expected); stage by explicit path, never `git add -A`; no direct push to `main`; secrets never in git or chat. The dev branch holds real family data: treat as private.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always).
- Strange: in (a new control, a sheet and a banner a person sees).
- Captain: in (new files, an extraction from two files near their caps).
- Banner: out (Fury read the calendar code inline; facts above).

## Contracts

C1 then C2, sequential (C2 imports C1's files).

### C1 - the filter's rules, its memory, and the calendar list on the page
- **Status:** DONE (commit b0ffe12)
- **Objective:** pure filter rules with tests, a per-login per-device store, the short month title helper, and the Calendar page reading the calendar list for the sheet; no visible change yet.
- **Boundaries:** may touch: new `src/lib/calendarFilter.ts`, new `src/lib/calendarFilter.test.ts`, new `src/lib/calendarFilterStore.ts`, `src/lib/linkedCalendarsRead.ts`, `src/lib/types.ts`, `src/lib/mealPlanDates.ts`, `src/lib/mealPlanDates.test.ts`, `src/lib/calendarViewVocabulary.ts`, `src/app/(app)/calendar/page.tsx`, `src/components/CalendarViews.tsx` (ONLY: accept and ignore-for-now a new `filterCalendars` prop, typed). · must not touch: everything else, especially `prisma/schema.prisma` (no migration), `package.json`, `CLAUDE.md`, `STRUCTURE.md`, `DESIGN.md`.
- **What to build:**
  - `types.ts`: `CalendarFilterAccountView = { accountId: string; label: string; calendars: { id: string; name: string }[] }`.
  - `linkedCalendarsRead.ts`: `loadFilterCalendars(): Promise<CalendarFilterAccountView[]>`: one `findMany` on linkedCalendar with `direction: { not: "off" }`, selecting id, name, isPrimary, account { id, label, email, linkedAt }; grouped by account (accounts in `linkedAt` order, calendars primary first then by name); label = `account.label ?? account.email`. No Google ids, tokens or etags leave the server.
  - `page.tsx`: add `loadFilterCalendars()` to the existing `Promise.all` (not a second await); pass `filterCalendars` to `CalendarViews`.
  - `calendarFilter.ts` (pure, no React, no `server-only`): `MARSHEE_CALENDAR_KEY = "marshee"`; `type CalendarFilter = { hiddenPeople: string[]; hiddenCalendars: string[] }`; `EMPTY_CALENDAR_FILTER`; `eventCalendarKeys(event)` = source id when `sourceLinkedCalendarId` is set, else `"marshee"`, plus every `syncs[].linkedCalendarId`, de-duplicated; `eventPasses(event, filter)` = (no people OR any person not hidden) AND (any calendar key not hidden); `taskPasses(task, filter)` = no people OR any person not hidden; `habitDaysPass(viewerId, filter)` = viewerId null OR viewer not hidden; `filterRows<R extends {events, tasks, habitDays}>(rows, filter, viewerId)` filtering each list; `hiddenCount(filter, personIds, calendarKeys)` = hidden ids present in the given lists; `toggleHiddenPerson` / `toggleHiddenCalendar` returning a new filter; `parseStoredFilter(raw: string | null): CalendarFilter` that turns anything malformed into the empty filter (never throws).
  - `calendarFilterStore.ts` (`"use client"`): `useCalendarFilter(viewerId)` returning `[filter, setFilter]` via `useSyncExternalStore`, key `marshee:calendar-filter:<viewerId ?? "device">`, same shape and same-tab signal as `lastCalendarView.ts` (read it first). Server snapshot is the empty filter. Snapshot must be referentially stable between calls when the stored string has not changed (cache by raw string), or React loops.
  - `mealPlanDates.ts`: `shortMonthHeading(title: string): string` that turns a leading full month name into its three-letter form from the existing `MONTH_NAMES` ("November" → "Nov", "Jan 2027" and "2026" unchanged). No second list of month names.
  - `calendarViewVocabulary.ts`: `CALENDAR_FILTER_LABELS` = { button: "Filter", buttonOn: "Filtered", title: "Filter", showAll: "Show all", done: "Done", people: "People", calendars: "Calendars", marshee: "Made in Marshee" }.
- **Verification:** `npx tsc --noEmit` clean; `npx eslint .` clean; `npm test` passes with the new tests counted; `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts` passes; `npm run build` passes.
- **Tests required (in `calendarFilter.test.ts`):** pulled event hidden by its source calendar; Marshee event copied to Work stays when only Work is hidden, hides when "marshee" and Work are both hidden; event with no people passes the people check; event whose every person is hidden hides; task rules; habit days hidden when the viewer is hidden, shown for a null viewer; `hiddenCount` ignores stale ids; `parseStoredFilter` on null, `"{"`, `"[]"`, `{"hiddenPeople":5}` and a good value; `shortMonthHeading` cases.
- **Evidence required:** each gauntlet command with its tail; test count before and after; `git diff --stat`.
- **Done criteria:** Fury sees the new tests in the `npm test` count, the page still renders the Calendar unchanged (no visible change), and only boundary files changed.
- **Report:** Stark: 10 files, +424/-3. npm test 2088 to 2104 (16 new), tsc, eslint, TZ=UTC run, build all clean. Setup: ran `npx prisma generate` and `npm ci` in the worktree (gitignored output only). `shortMonthHeading` keeps what follows ("September 2026" becomes "Sep 2026"). Fury read calendarFilter.ts and calendarFilterStore.ts: matches the contract.

### C2 - the Filter circle, the sheet, and every view obeying it
- **Status:** DONE (commit eeecc4d), browser check NOT done by Stark
- **Preflight note (Fury):** preflight hard-fails `STRUCTURE.md` and `DESIGN.md` on the 650 hard cap. Not applicable: STRUCTURE.md "File-size caps" says the caps govern source files, not documents (Markdown is outside them). Recorded, not overridden quietly.
- **Objective:** a fourth "Filter" circle in the Calendar top bar opens a Filter sheet (People and Calendars checkboxes, Show all, Done); every view hides what is unticked; the circle turns solid with a count chip and reads "Filtered" while anything is hidden.
- **Boundaries:** may touch: `src/components/ActionCircle.tsx`, `src/components/CalendarHeader.tsx`, new `src/components/CalendarFilterSheet.tsx`, new `src/lib/useCalendarFilterView.ts` (the hook CalendarViews calls so it grows by only a few lines), `src/components/CalendarViews.tsx`, `src/components/ScheduleView.tsx`, `src/lib/useScheduleMonthTitle.ts`, new `docs/structure/calendar-filter.md`, `STRUCTURE.md` (ONE pointer line in the calendar One source of truth area), `DESIGN.md` (ONE short entry for the Filter circle and sheet beside the HabitFilterSheet entry). · must not touch: C1's files except to import them, `CalendarSearch.tsx` and `src/app/actions/calendarSearch.ts` (search ignores the filter), the dashboard Calendar tile, `prisma/`, `package.json`, `CLAUDE.md`.
- **What to build:**
  - `ActionCircle`: optional `badge?: number` (a small round chip with the number at the circle's top right, only when > 0) and `active?: boolean` (circle `bg-accent text-accent-fg`). Existing callers unchanged. The chip uses named colour tokens only (no hex), and the label under the circle still reads normally.
  - `CalendarHeader`: a fourth `ActionCircle` after Search, icon Lucide `ListFilter`, label `CALENDAR_FILTER_LABELS.button` or `.buttonOn` when count > 0, `badge={count}`, `active={count > 0}`, opening the sheet. The month title: below the `@min-[30rem]` container width show `shortMonthHeading(title)`, from it the full title (two spans toggled by container classes, never JS width reads). The Schedule portal title in `useScheduleMonthTitle.ts` does the same. Update the header comments that say "Today, View and Search".
  - `CalendarFilterSheet.tsx`: the frame `HabitFilterSheet` uses (read it; same bottom sheet, centred from `md`, Escape and backdrop close). Header "Filter" with a "Show all" text button (disabled when nothing is hidden). Section "People": each active person, `AvatarBadge` with their own colour (the shared person colour, never a copied value) and a 48px+ tall row with a checkbox, ticked = shown. Section "Calendars": "Made in Marshee" row, then per account a small heading (its label) and its calendars indented under it. When no calendars are linked, the Calendars section shows only "Made in Marshee". A full-width "Done" button. Each tap applies at once (the calendar behind updates), no save step. Rows are real checkboxes (`role`/`aria-checked` or native input) for screen readers.
  - `useCalendarFilterView.ts`: takes viewerId, people, filterCalendars, events, tasks, habitDays; returns the filtered lists (memoised), `count`, `open`/`setOpen`, and what the sheet needs. CalendarViews uses the filtered lists everywhere it now passes `events`/`tasks`/`habitDays` (Month, Year, timelines, Day sections) AND for `dotDays` (the month panel's dots). Mount `CalendarFilterSheet` beside `CalendarSheets`.
  - `ScheduleView`: a new prop `filterRows` (or the filter plus viewerId) applied to `months` before rendering; a day the filter empties disappears exactly as a day that never had items would; today's row keeps `TodayEmptyRow` when filtered to nothing. Changing the filter re-renders without a refetch.
  - `docs/structure/calendar-filter.md`: the rules (what is stored, where, the any-calendar rule, people AND calendars, tasks and habits follow People, search and the dashboard tile ignore it, the one predicate home is `calendarFilter.ts`, a second copy of the rules is a BLOCKER).
- **Verification:** the full gauntlet; then in the browser (dev server, Bryce's dev login via the project's normal local login, never a password typed by an agent from memory): open `/calendar` at 393x852, see four circles and "Nov"-style title; open Filter, untick a person, see their events leave Month, Week, Day and Schedule; chip shows 1 and label "Filtered"; reload, filter still on; Show all clears it; Search still finds a hidden person's event.
- **Evidence required:** gauntlet tails; screenshots at 393 wide (bar with no filter, sheet open, bar with chip) and at 1024 wide (iPad landscape bar); line counts total and code (preflight counter) for `CalendarViews.tsx` and `ScheduleView.tsx` before and after.
- **Done criteria:** Fury re-runs the gauntlet; screenshots match the approved mock frames 1 to 3 minus the strip; `CalendarViews.tsx` grows by 25 lines or fewer and `ScheduleView.tsx` by 15 or fewer.
- **Report:** Stark: 10 files, +369/-17; tsc, eslint, npm test 2104/2104, TZ=UTC run, build exit 0. CalendarViews 520 to 530, ScheduleView 558 to 566 (wc -l). No browser check: no preview tool and no dev password, so the visuals go to Strange. Open points Stark raised: no test for the pure `filterScheduleMonths` (test file not on the may-touch list); a month plus year title ("Dec 2027") may truncate at 393px beside four circles.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | running | | |
| 1 | Strange | running | | |
| 1 | Captain | running | | |

## Handoff log

- 2026-11-12: mission opened; existing code checked (no filter exists); mock written and sent to Bryce. Waiting for his answers before contracts.
- 2026-11-12: Bryce approved all recommendations except the strip (count chip only). C1 and C2 written; C1 next.
- 2026-11-12: C1 DONE (b0ffe12). C2 dispatched.
- 2026-11-12: C2 DONE (eeecc4d). Gates pass 1: Vision, Strange, Captain in parallel.

## Delivery

Not yet.
