# Mission 62: Calendar pull window (one year ahead)

**Project:** family-hub (Marshee). **Status:** gates passed, PR open. **Assembled:** Stark, Vision (small diff, no screen change, no new file beyond tests).

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

### W2 - Vision pass 1: collect the token's changes before the rewindow

- **Boundaries:** W1's list, plus `src/lib/linkedCalendarWrites.ts` (one
  small write) and `src/lib/testing/calendarPullRunHarness.ts`.
- **Spec:**
  1. In `pullOne`, when `rewindow` is true and the calendar has a token,
     first run the normal token pass exactly as today (list with the token,
     plan, write; a "restart" falls through to the full list as now). Only
     when that pass had zero failures, run the full window list with the
     same `now` and save its `nextSyncToken` under the existing rule. If the
     token pass failed (list or write), return its failure, keep the old
     token, and do no full pass. `changed` is true if either pass changed
     something.
  2. A clean full pass that gets `nextSyncToken: null` still stamps
     "Last checked": a new dep `markPulledOk(calendarId)` backed by a write
     in `linkedCalendarWrites.ts` that sets only `lastPulledOkAt` (the token
     is left as it is).
- **Tests:** rewindow plus a token gives listModes `[{syncToken},
  {timeMin, timeMax}]`; a cancelled event in the token pass is deleted and
  the saved token is the full pass's; a failed token pass does no full pass
  and saves nothing; a clean full pass with a null token calls
  `markPulledOk` and not `saveSyncToken`.

## Delivery

- Full pulls send `timeMin` 30 days back and `timeMax` 365 days ahead
  (Bryce: one year). The daily cron runs with `rewindow`: it reads the
  saved token's changes first, then lists the full window, so the horizon
  moves a day each day and no change is lost. "Last checked" also stamps
  after a clean pull that gets no token back. PR 99 (safe reason log) is
  merged; its test now uses the shared harness.
- Follow-ups: a first pull of about 1,000 events takes 15 to 40 seconds
  (fine on Fluid compute; set `maxDuration` if a first Refresh times out);
  editing a whole forever series in Google can make a token pull hit
  `too-many` until the next morning's rewindow.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 2 | Vision | PASS | | Blocker closed; no duplicates between passes; null-token stamp and the token pass saving first are safe; Denver, UTC and LA tests plus build green |
| 1 | Vision | BLOCKED | A rewindow dropped the token without collecting its changes, so a change moved or cancelled outside the window was lost for good | Both nextSyncToken outcomes safe; no duplicates possible; cron force:true right; reason log safe; ~1,000 events for 10 weekly series, cap 5,000; a first pull of ~1,000 inserts takes 15 to 40 s (fine on Fluid compute, else set maxDuration later); a series edit in a token pull can hit too-many until the next cron; "Last checked" stays empty with null tokens (W2 item 2) |

## Handoff log

- 2026-11-09: Opened from the mission 60 chat after Bryce's first real pull failed. Branch `claude/calendar-pull-window` from PR 99's branch (merged with main after PR 100).
