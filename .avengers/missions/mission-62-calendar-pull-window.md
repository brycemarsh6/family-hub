# Mission 62: Calendar pull window (one year ahead)

**Project:** family-hub (Marshee). **Status:** in progress. **Assembled:** Stark, Vision (small diff, no screen change, no new file beyond tests).

## Brief

Bryce's first real pull (after PR 3, mission 60) showed "Couldn't reach
Google". He has weekly events that repeat forever. The full pull asks
Google for everything from 30 days back with `singleEvents=true` and no end,
so Google expands every forever series into instances and the list most
likely passes the 20-page cap (`too-many`). PR 99 adds a safe reason log to
confirm it.

**Bryce's answer (2026-11-09):** bring Google events in up to **one year
ahead**, and move that limit forward each day.

**Done means:** a full pull sends `timeMin` (30 days back) and `timeMax`
(365 days ahead); the daily cron re-pulls in full so the horizon moves a day
each day; a token pull still sends neither; Gauntlet green; Vision PASS; PR
merged; production checked; Bryce's Refresh brings his events in.

**Out of scope:** recurring series as series, anything on screen.

**Unknown, handled either way:** Google's docs do not say whether a full
list with `timeMax` returns a `nextSyncToken`. If it does, later pulls use
the token; if not, `listEvents` gives `nextSyncToken: null`, nothing is
saved, and each pull is a full window pull (already supported). No agent
calls Google to find out (danger register).

## Danger register

Same as mission 60: no agent or test calls Google; never read `.env`; no
migrate, seed or reset; never log a token; stage by explicit path; no
`git add -A`.

## Gauntlet

`npx tsc --noEmit`, `npx eslint .`, `npm test`, and the TZ=UTC command in
AGENTS.md (7 DST skips expected), `npm run build`.

## Contracts

### W1 - Full pulls end one year ahead; the daily cron re-pulls in full

- **Boundaries:** `src/lib/calendarPullRun.ts`, `src/lib/google/types.ts`,
  `src/lib/google/calendarEventCalls.ts` and its test,
  `src/lib/calendarEventPull.ts`, `src/app/api/cron/calendar-pull/route.ts`,
  the pull run tests (`src/lib/calendarPullRun*.test.ts`,
  `src/lib/testing/calendarPullRunHarness.ts`). Nothing else.
- **Spec:**
  1. `PULL_HORIZON_DAYS = 365` beside `PULL_WINDOW_DAYS` in
     `calendarPullRun.ts`. The full-pull mode becomes
     `{ timeMin, timeMax }`; `listUrl` sends both. A token pull sends
     neither (unchanged).
  2. `runPull` opts gain `rewindow?: boolean`. When true, a calendar's
     saved token is ignored for this run and a full window pull runs (the
     token is replaced only by the new `nextSyncToken` the full pull
     returns, per the existing rule; a null leaves nothing saved).
     `pullCalendars` passes it through; the cron route passes
     `rewindow: true`. Refresh and opening Calendar do not.
  3. Comments: say why (forever-repeating events overflow an open-ended
     list) and that the daily rewindow moves the horizon.
- **Done criteria / tests:** a full pull's mode carries `timeMax` exactly
  365 days after `now`; a token pull carries no window; with `rewindow` a
  calendar holding a token lists in full window mode; `listUrl` puts
  `timeMax` in the URL for a full pull and not for a token pull.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-11-09: Opened from the mission 60 chat after Bryce's first real pull failed. Branch `claude/calendar-pull-window` from PR 99's branch (merged with main after PR 100).
