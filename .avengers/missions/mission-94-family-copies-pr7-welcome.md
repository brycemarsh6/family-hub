# Mission 94: family copies PR 7, welcome steps, install help, checklist

**Status:** GATES (C1, C2, C3 built and committed; Vision and Captain pass 1 running, Strange after).
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

- **D1 (Bryce, 2026-11-26, via the planning chat):** "Yes to the six questions". All six
  mock recommendations stand: Welcome order (family, then install); step 1 skippable; iPhone and
  iPad install help, no Android yet; the card is admin only, pinned above the widgets, outside
  Customize; five items (Add your family, Pick your stores, Add pantry items, Set up a wall
  tablet (Optional), Link Google Calendar (Optional, hidden unless Google is configured)) that
  tick themselves; "You're all set" + Done once the three required items are done; "Hide this"
  always; both hide it family wide for good; never on the owner copy; "Install on your phone"
  row in Settings for every login, opening `/settings/install`.
- **Visibility rule (Fury, structure):** card shows when `setupFinished()` AND
  `checklistDismissedAt` is null AND NOT `isOwnerCopy()` AND the viewer's role is `admin`.
  Setup can't run on the owner copy, so setup-finished alone already keeps it off Bryce's copy;
  the owner check is the second lock against a stray row.

## Contracts

### C1. Logic, data, landing, manifest (no visible screens)

- **Objective:** everything the screens need, tested, with no UI yet.
- **May touch:** new `src/lib/setupChecklist.ts` + `src/lib/setupChecklist.test.ts` (pure:
  `setupChecklistItems(facts)` returning the five rows in mock order, each
  `{ id, label, href, optional, done }`, Google row left out when `googleConfigured` is false;
  `checklistAllRequiredDone(items)`; `showSetupChecklist({ isOwner, setupFinished, dismissed, role })`);
  `src/lib/householdSettingsRead.ts` (add `checklistDismissed()`); `src/lib/householdSettingsWrites.ts`
  (add `dismissSetupChecklist(actorUserId)`, upsert-safe); a new loader `loadSetupChecklist()` in a
  new `src/lib/setupChecklistRead.ts` that gathers the facts (other active non-device users,
  stores non-blank, any `PantryItem`, an active `device` user, any `LinkedAccount`,
  `isGoogleConfigured()`), all reads in one `Promise.all`; new `src/app/actions/setupChecklist.ts`
  with `dismissSetupChecklistAction()` (`requireRole("admin")` first, then revalidate `/`);
  `src/app/actions/auth.ts` (`login` honours an optional `after` field ONLY when it equals
  exactly `/welcome`; anything else is ignored, never an open redirect);
  `src/app/setup/SetupWizard.tsx` (Continue adds `after=/welcome`); words: new
  `src/lib/welcomeVocabulary.ts` holding every string from the mock for welcome, install help,
  the checklist and the Settings row (copy exactly, no em dashes); `src/app/manifest.ts` plus new
  `public/icons/icon-192.png` and `public/icons/icon-512.png` made with `sips -z` from
  `src/app/icon.png` (a resize of the generated master, never a redraw), listed with
  `purpose: "any"`, keeping the 1024 entry.
- **Must not touch:** `/settings/calendars`, `prisma/schema.prisma`, any migration, dashboard
  components, `package.json` (the new test sits in `src/lib/`, already globbed).
- **Verification:** `npx tsc --noEmit`, `npm run lint`, `npm test`, the direct TZ=UTC line.
  Tests cover: rows and order; Google row hidden when not configured; each tick; all-required-done
  ignores the optional rows; `showSetupChecklist` false for owner, not finished, dismissed,
  parent, kid, device, true only for admin on a set-up, undismissed, non-owner copy; the `after`
  allowlist (put the check in a tiny pure helper in `src/lib/startPage.ts`, e.g.
  `postLoginPath(after, startPage)`, and test `/welcome`, `//evil.com`, `https://x`, `/welcome?x`).
- **Evidence:** command tails, test counts before and after, `sips -g pixelWidth` of both icons.
- **Done:** all green, no `db.householdSettings` call outside the two household files.

### C2. Screens (after C1)

- **Objective:** the mock's screens wired to C1.
- **May touch:** new `src/app/(app)/welcome/page.tsx` (server: `requireRole("admin")`, loads
  people) + `src/components/WelcomeSteps.tsx` (client: two steps, dots, reuses
  `CreatePersonSheet` unchanged, list adds people as `onCreated` fires, "Next", back link to step 1,
  "Go to my dashboard" to `/`); new `src/components/InstallHelp.tsx` (iPhone/iPad switch defaulting
  from the device via `useSyncExternalStore`, three steps, Lucide `Share` and `SquarePlus` icons);
  new `src/app/(app)/settings/install/page.tsx` (BackLink to Settings + InstallHelp);
  `src/app/(app)/settings/page.tsx` (one row, order-2 group, Lucide `Smartphone`);
  new `src/components/SetupChecklistCard.tsx` and its wiring in `src/app/(app)/(home)/page.tsx`
  (rendered above the widget grid only when `showSetupChecklist` is true; optimistic hide on
  "Hide this" and "Done"). Welcome must hide the drawer button like setup does if the layout
  allows it cheaply; if it needs a layout change, report instead of improvising.
- **Must not touch:** `/settings/calendars`, dashboard registry/layout files, `CreatePersonSheet`.
- **Verification:** gauntlet + `npm run build`; screenshots on a 390px viewport of each mock frame.
- **Done:** matches the mock, rem sizes, 48px targets, DESIGN.md rules.

### C3. No menu on /welcome (Stark report gap found in C2)

- **Objective:** D1 says welcome has no menu button. `hidesMenu(pathname)` in
  `src/lib/appChrome.ts` (exactly "/welcome") + test; `AppChrome.tsx` drops both hamburger
  renders and the pinned menu there; `<main>` padding unchanged.

## Progress log

- C1 DONE (Stark): 2432 tests pass both zones, tsc and lint clean, icons 192 and 512.
- C2 DONE (Stark): build green; no screenshots (worktree has no `.env`, pages need a login;
  left to Strange). Count reads "x of 4" when the Google row is hidden. Mock logo above
  welcome steps not drawn.
- C3 DONE (Stark): 2433 tests pass.
- Docs: Household settings entry and setup words moved to `docs/structure/family-copies.md`
  (Captain's mission-91 recommendation) with PR 7's rules.
- **Gates pass 1:** Vision PASS (notes: dash test, stale comment, progressbar label, x of 4,
  missing logo). Captain BLOCKED (3: inline household-people filter twice, direct
  LinkedAccount read, role labels copied). Fixed in **C4** (`countHouseholdPeople`,
  `loadHouseholdPersonInfos`, `hasAnyLinkedAccount`, `ROLE_LABELS`; tablet fact via
  `loadTabletStartPage`), plus Captain's doc notes (layout map rows, write rule, dashboard.md pointer).
- **Strange pass 1: BLOCKED** (2, both the card): rows stretched on iPad; hand-made progress
  bar instead of `ProgressBar`. Notes taken in the same batch (**C5**): the Marshee mark above
  welcome step 1 (in the approved mock), muted "Kid, profile" pill (in the mock). Left as a note:
  dark-mode segmented switch contrast (an app-wide token pairing, out of scope).
