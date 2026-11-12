# Mission: Calendar parent delete rule (mission 76)

**Project:** family-hub (Marshee)
**Status:** INTERROGATING (questions out to Bryce, 2026-11-12; no code until he answers)
**Started:** 2026-11-12 · **Updated:** 2026-11-12
**Branch:** `claude/calendar-parent-delete-rule-082409`

## Brief

- **Bryce's words:** "we need to make a rule that parents can't delete other
  parents events or tasks. Any parent can delete a kids event or task though."
- **Done means (draft, pending Bryce):** a parent's delete of a calendar event
  or task that belongs to another parent is refused on the server with a warn
  message, and the sheet shows that message in place of the Delete row; a
  parent's delete of their own, a kid-only or a nobody item still works in one
  tap. Tests prove both. Merged, Gauntlet green, production checked.
- **Out of scope (draft):** editing rules, the Tablet's calendar rights
  (mission 39 PR B, C6), the Google pull's own deletes (sync, not a person),
  "this one or all of them" on delete.
- **Mock:** `.avengers/mocks/calendar-parent-delete-mock.html`.

## Facts found (Fury, 2026-11-12)

- Only two delete paths: `deleteCalendarEvent` in `src/app/actions/calendar.ts`
  and `deleteTask` in `src/app/actions/tasks.ts`. Both allow `MANAGER_ROLES`
  (admin, parent) only. Kids and the Tablet cannot delete at all today.
- The Assistant API has no calendar or task routes yet, so nothing there to
  guard. When Winnie gets calendar (CLAUDE.md "Winnie next"), the rule must go
  in the shared write file both use.
- `src/lib/calendarEventPull.ts` deletes events Google removed. That is the
  sync, not a person, and stays unguarded.
- Events and tasks carry people (`CalendarEventPerson`, `TaskPerson`) and a
  creator (`createdById`). Pulled Google events get people too
  (`calendarEventPull.ts:133`).
- Delete sits in the sheet's menu view (`EventDetailSheet.tsx`,
  `TaskDetailSheet.tsx`), with a warn-soft error line already there.

## Questions for Bryce (asked 2026-11-12)

1. Who an item belongs to: the people on it (Fury recommends), or who made it.
2. Delete only (Fury recommends), or editing too.
3. Admins: counted as parents, so the rule binds them too (Fury recommends).
4. Tablet: unchanged for now (cannot delete); mission 39 PR B uses this rule.

## Danger register

AGENTS.md applies in full. No migration expected. Tests use pure functions
only; no dev-database writes.

## Gauntlet

`npm run lint`, `npx tsc --noEmit`, `npm test`, the direct UTC test command
from AGENTS.md, `npm run build`, and the GitHub Gauntlet check.

## Assembled

Stark + Vision; Strange for the sheet change. Captain only if a new file
lands outside `src/lib/` patterns.

## Contracts

Written after Bryce answers.

## Gate ledger

## Handoff log

- 2026-11-12: Bryce's PR 9 phone test recorded in `.avengers/status.md`.

## Delivery
