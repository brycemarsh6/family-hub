# Mission 78: Calendar filter by person and synced calendar

- **Status:** INTERROGATING (mock sent to Bryce 2026-11-12; no builder dispatched until he says OK)
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

Written after Bryce answers the mock.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-11-12: mission opened; existing code checked (no filter exists); mock written and sent to Bryce. Waiting for his answers before contracts.

## Delivery

Not yet.
