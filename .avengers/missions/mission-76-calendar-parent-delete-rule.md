# Mission: Calendar parent delete rule (mission 76)

**Project:** family-hub (Marshee)
**Status:** DELIVERED (2026-11-12)
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

## Bryce's answers (2026-11-12, "Yes" to all five recommendations)

1. An item belongs to the people on it.
2. Delete only; editing unchanged.
3. Admins follow the same rule as parents.
4. Tablet unchanged (still cannot delete).
5. A blocked delete shows an amber note "Only Emily can delete this." in
   place of the red Delete row; the server refuses with the same words.

**The rule, exactly:** the caller (admin or parent) may delete unless the
item has at least one *other* active adult (role admin or parent, not
deactivated) on it **and** the caller is not on it. On it yourself, kid-only,
nobody, or only deactivated adults: allowed. Deactivated adults never block
(Fury's call: otherwise their items could never be deleted).

## Contracts

### C1: the rule, on the server and in both sheets
- **Objective:** one pure rule, enforced by `deleteCalendarEvent` and
  `deleteTask` from fresh database rows, and used by both sheets to swap the
  Delete row for the warn note.
- **May touch:** new `src/lib/calendarDeleteRules.ts` +
  `src/lib/calendarDeleteRules.test.ts`; `src/app/actions/calendar.ts`;
  `src/app/actions/tasks.ts`; `src/lib/calendarEventQuery.ts`;
  `src/lib/calendarTaskQuery.ts`; `src/lib/types.ts`;
  `src/components/EventDetailSheet.tsx`; `src/components/TaskDetailSheet.tsx`;
  any file that builds or passes these views (list each in the report);
  `docs/structure/calendar.md` (a few lines, or a split if it passes 300).
- **Must not touch:** `prisma/schema.prisma` (no migration),
  `src/lib/calendarEventPull.ts`, the Assistant API, `CLAUDE.md`,
  `DESIGN.md`, `STRUCTURE.md`, `package.json`.
- **Verification:** `npm run lint`, `npx tsc --noEmit`, `npm test`, the
  direct UTC command from AGENTS.md, `npm run build`, all green.
- **Evidence:** the outputs above; the test names; the server check placed
  before `removeEventCopies` (a refused delete must not remove Google copies).
- **Done:** tests cover own, other parent, other admin, kid-only, nobody,
  both parents, other parent plus kid, deactivated adult, two other parents
  (names joined "A and B"); both actions refuse with the rule's words; both
  sheets show the note instead of Delete when blocked.

## Gate ledger

- **Vision pass 1: PASS.** Re-ran the whole gauntlet (2099 tests; the 10 UTC
  skips are DST tests that skip themselves, not this change). Confirmed the
  event check runs before `removeEventCopies`, the caller is always the
  verified session, kids and the Tablet are still refused by the role check,
  and the only person deletes are the two guarded actions.
- **Strange pass 1: PASS** from code, the mock and measured contrast (light
  4.53:1, dark 8.58:1). No live screenshot: it would need a real sign-in and a
  test item written to the dev database. Bryce's phone test covers the look.
- Captain not assembled (one new pure file in `src/lib/`); Fury split
  `docs/structure/calendar.md` at Captain's mission 75 seam.

## Handoff log

- 2026-11-12: Bryce's PR 9 phone test recorded in `.avengers/status.md`.

## Delivery

- **Shipped:** the rule in `src/lib/calendarDeleteRules.ts` (11 tests), both
  delete actions refuse with its words, both sheets show the amber note in
  place of Delete. Rules: `docs/structure/calendar-tasks-search.md`, "Parents
  can't delete each other's items" (split from `calendar.md` this mission).
- **Leftovers (NOTES, not this mission's job):**
  - The rule guards against accidents, not a lock: editing is unchanged
    (Bryce's answer 2), so a parent can edit another parent off an item and
    then delete it.
  - An open task sheet keeps its old note after an edit until reopened; the
    server still gates. A refused delete from stale data leaves Delete
    showing, with the reason in the warn line.
  - Google to Marshee sync still deletes an event when its Google original
    is deleted, whoever is on it (that is the sync, not a person).
  - When Winnie gets calendar writes, her delete path must call the same
    rule.
  - On a blocked item, the "More actions" menu holds only the note.
  - CLAUDE.md is at the 250-line cap: the next edit must cut first.
