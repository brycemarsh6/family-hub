# Mission 94: family copies PR 7, welcome steps, install help, checklist

**Status:** INTERROGATE, waiting on Bryce's answers to the mock questions (D1).
**Branch:** `claude/family-copies-pr7-welcome`, cut from `origin/main` at d85d5b0 (PR 6 merged).
**Plan:** `.avengers/plans/family-copies-v1.md`, section "PR 7".
**Mock:** `.avengers/mocks/family-copies-pr7-welcome-mock.html` (questions Q1 to Q6, each with a recommendation).

## Team

Banner (research brief done), Stark, Vision, Strange (visible screens), Captain (new
files: a page, a component, a lib reader/writer, a dashboard card).

## Done means

- After `/setup`'s Continue, a new family's admin lands on `/welcome`: step 1 adds people
  through the existing `createPerson` and `CreatePersonSheet`, step 2 shows install help.
- `/settings/install` shows the same install help for every login; Settings has a row to it.
- The manifest lists 192 and 512 icons resized from the brand masters.
- A "Finish setting up" card on the dashboard for admins of a copy that ran setup, with
  self-ticking items and a family-wide dismiss saved in `HouseholdSettings.checklistDismissedAt`.
- It never shows on Bryce's copy (no setup-finished time there, and `isOwnerCopy()` as a second lock).
- Gauntlet green, `npm test` and the direct `TZ=UTC` line pass, Vision, Captain and Strange PASS.

## Out of scope

- `/settings/calendars` (PR 8 is building there), Android install steps (unless Bryce says yes),
  any migration (the column exists), editing or removing people from the welcome list.

## Danger register

AGENTS.md applies in full: no `db:seed`/`db:reset`, no `User` clean script, stage by explicit
path, additive migrations only (none planned), the dev branch holds real family data.

## Gauntlet

`npm run lint`, `npx tsc --noEmit`, `npm test`, the direct `TZ=UTC node --import tsx --test ...`
line from AGENTS.md, `npm run build`.

## Facts from Banner (file:line in the brief, summarised)

- Continue in `src/app/setup/SetupWizard.tsx:96-104` calls `login`, which redirects via
  `toStartPage` (`src/app/actions/auth.ts:101`). Plan: an allowlisted `after=/welcome` field.
- `/welcome` needs no proxy entry (not in `PUBLIC_ROUTES`), but must check the session itself.
- `createPerson` is admin only (`src/app/actions/users.ts:70-107`).
- Saved v2 dashboard layouts never gain new kinds, one reason to pin the card outside the grid.
- Detection: stores saved = `HouseholdSettings.stores` non-blank; pantry = any `PantryItem`;
  tablet = active `User` with role `device`; Google = any `LinkedAccount`, item hidden unless
  `isGoogleConfigured()`.
- `checklistDismissedAt` has no reader or writer yet; add them to `householdSettingsRead.ts`
  and `householdSettingsWrites.ts` (the only allowed `db.householdSettings` callers).
- Manifest (`src/app/manifest.ts`) lists one 1024 icon; `apple-icon.png` is 180x180 already.

## Decisions

(D1 pending.)
