# Mission 64: Screensaver S3, "Open Marshee on" (start page)

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-11-10 · **Updated:** 2026-11-10

## Brief

- **Goal:** every login picks the page Marshee opens on after sign-in. The
  Tablet's choice is also where a tap on the slideshow or the black screen
  takes it. Plan: `.avengers/plans/screensaver-slideshow-v1.md` (S3).
- **Done means:** a login with a start page set lands there after signing in;
  the Tablet, woken from the screensaver, goes to its start page; the
  Dashboard link and `/` still show the dashboard; a parent or the Tablet
  itself sets the Tablet's start page on the Wall tablet page; the gauntlet
  passes; production has the migration.
- **Out of scope:** S4 (On this day); the S2 open notes (a failed photo stays
  out until restart, caption edits at next start, clock contrast); Slideshow
  photos stays parents and admins only.

## Bryce's decisions (2026-11-10)

- Approved the mock: [Open Marshee on mock](https://claude.ai/artifact/PHcmkkDMXujTcGrAp3Jjdw).
  A row "Open Marshee on" under Text size on Settings, help line "Where you
  land after you sign in." The same row at the top of the Wall tablet page,
  help line "Where a tap on the slideshow or the black screen takes the
  tablet." Both open the RadioSheet used by Menu style.
- The picker offers 9 pages: the `NAV_SECTIONS` destinations minus Lists
  (still "coming soon"). Settings is not offered. Empty means Dashboard.
- **The Tablet login may open the Wall tablet page and change every setting
  on it** (it had become inconvenient that only parents could). This reverses
  S2's "nothing is editable from the wall" rule for the Wall tablet page only.

## Fury's structure calls

- One new column `UserPreferences.startPage String?` (additive migration
  `20261119000000_start_page`, one `ALTER TABLE ... ADD COLUMN`).
- `src/lib/startPage.ts` (pure) is the only home of the option list, the
  default and the cleaner `toStartPage` (anything not in the list reads as
  `/`, so a stored value can never redirect off the app).
- The Tablet's start page is the device login's own `startPage`. The Wall
  tablet row writes it on every active device login (there is one today) and
  reads it from the oldest one.
- `loadScreensaverShow` also returns the tablet's fresh `startPage`, so a
  parent's change reaches a running tablet at the next slideshow start, like
  every other S2 setting.
- On a device login, Settings shows no "Open Marshee on" row (the Wall
  tablet door is there instead), so the tablet has one place to set it.

## Danger register

From AGENTS.md (absolute): never `db:seed` / `db:reset`; migrations additive
only, SQL reviewed, merging applies it to production; no `User` clean
script; secrets only in `.env` and Vercel, never read or printed; never
`git add -A` / `git add .`, stage by path, `git show --stat HEAD` after each
commit; no direct push to `main`.
- Fury alone runs `npx prisma migrate deploy`, against the dev branch only,
  after checking the hostname starts `ep-hidden-pine-` (hostname only).
- The dev branch holds real family data; treat it as private.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`
- GitHub's Gauntlet check green on the PR.

## Assembled

- Stark + Vision (always).
- Strange: two new visible rows and the Tablet seeing a new page.
- Captain: a new lib file, a migration, and a changed written rule in
  `docs/structure/slideshow.md`.
- No Banner: Fury read the few files involved inline.

## Contracts

### C1 — Data and logic: the column, the rules, the reads and writes, login and wake
- **Status:** DONE
- **Boundaries:** may touch: `prisma/schema.prisma` (one column on
  `UserPreferences`), new `prisma/migrations/20261119000000_start_page/migration.sql`,
  new `src/lib/startPage.ts`, new `src/lib/startPage.test.ts`, new
  `src/lib/startPageRead.ts`, `src/lib/dal.ts`, `src/app/actions/preferences.ts`,
  `src/app/actions/screensaver.ts`, `src/app/actions/auth.ts`,
  `src/components/ScreensaverHost.tsx`, `src/components/AppChrome.tsx`,
  `src/app/(app)/layout.tsx`. Must not touch: everything else, above all
  `src/app/(app)/settings/`, `src/components/WallTabletSettings.tsx`,
  `src/lib/nav.ts`, `STRUCTURE.md`, `docs/`, `package.json`, `.env`. Never
  run `prisma migrate` (Fury applies it). No commits.
- **Work:**
  1. Schema: `startPage String?` on `UserPreferences` with a `///` comment in
     the style of `navMode` (mission 64, one of START_PAGE_OPTIONS hrefs,
     null = Dashboard, `toStartPage` repairs anything odd). Migration SQL is
     exactly `ALTER TABLE "UserPreferences" ADD COLUMN "startPage" TEXT;`.
  2. `src/lib/startPage.ts` (pure, imports only `./nav`): `START_PAGE_OPTIONS`
     (the `NAV_SECTIONS` items, in order, minus `/lists`), `DEFAULT_START_PAGE = "/"`,
     `toStartPage(raw: unknown): string` (an exact href from the list, else
     `/`), `startPageLabel(href)`, and `START_PAGE_WORDS` with: `label`
     "Open Marshee on", `helpSelf` "Where you land after you sign in.",
     `helpTablet` "Where a tap on the slideshow or the black screen takes the
     tablet.", `saveError` "Couldn't save the start page. Check your connection and try again.",
     `notAllowed` "Only parents, admins and the wall tablet can change this.",
     `notAPage` "That isn't a page you can start on."
  3. Tests in `src/lib/startPage.test.ts`: 9 options, Lists and Settings
     absent, Dashboard first; `toStartPage` keeps each option, and turns
     null, `""`, `"/lists"`, `"/settings"`, `"https://evil.example"`,
     `"//evil.example"`, `"/calendar/x"`, a number into `/`.
  4. `dal.ts`: `VerifiedUser.startPage: string` from
     `toStartPage(preferences?.startPage)` (add it to the select).
  5. `preferences.ts`: `saveStartPage(input)` for the signed-in login
     (devices too), same shape as `saveNavMode` (exact match from
     `START_PAGE_OPTIONS` or error `notAPage`). `saveTabletStartPage(input)`:
     allowed for a device login or `MANAGER_ROLES`, else `notAllowed`; one
     `$transaction` upserting `startPage` for every `User` with
     `role: "device"` and `deactivatedAt: null`; `revalidatePath("/", "layout")`.
  6. New `src/lib/startPageRead.ts` (`server-only`, no auth):
     `loadTabletStartPage(): Promise<string | null>`, the oldest active device
     login's start page via `toStartPage`, `null` when there is no device login.
  7. `actions/screensaver.ts`: `saveScreensaverSetting` also allows a device
     login (guard: not signed in, or neither device nor `MANAGER_ROLES`, is
     refused; message "Only parents, admins and the wall tablet can change
     these settings."). `loadScreensaverShow` also returns `startPage:
     user.startPage`.
  8. `auth.ts` `login`: select `preferences: { select: { startPage: true } }`
     and `redirect(toStartPage(user!.preferences?.startPage))`.
  9. Layout and `AppChrome`: pass the device user's `startPage` to
     `ScreensaverHost` (new prop `initialStartPage`). The host keeps it in a
     ref, refreshes it from each `loadScreensaverShow` result, and `wake()`
     pushes to it when `pathname` differs (today it pushes `/`).
- **Verification:** `npx tsc --noEmit` 0; `npx eslint` 0; `npm test` and the
  UTC run pass with the new tests counted; `grep -rn "startPage" src --include=*.ts --include=*.tsx`.
- **Evidence required:** the migration SQL in full; pass counts of both test
  runs; the grep above; `git diff --stat`.
- **Done criteria:** Fury re-runs the gauntlet and gets the same counts;
  Fury applies the migration to dev (host checked); `npx prisma migrate status` clean.
- **Report:** DONE (Stark), re-run by Fury 2026-11-10: tsc 0, eslint 0, `npm test` 1784 pass 0 fail. Migration SQL is the one `ALTER TABLE` line. Applied to dev (host checked `ep-hidden-pine-`), `migrate status` up to date. Stark's own calls: `startPageLabel` takes `unknown`; `saveTabletStartPage` with no device login is a no-op success; AppChrome's `startPage` prop is optional (host defaults to `/`). Preflight's one hard failure was `prisma/schema.prisma` over the cap, which STRUCTURE.md exempts (as in mission 62).

### C2 — UI and the written rules
- **Status:** DONE
- **Boundaries:** may touch: new `src/components/StartPageSetting.tsx`,
  `src/app/(app)/settings/page.tsx`, `src/app/(app)/settings/wall-tablet/page.tsx`,
  `src/components/WallTabletSettings.tsx`, `docs/structure/slideshow.md`,
  `STRUCTURE.md` (a short pointer or entry only). Must not touch: C1's files,
  `src/lib/nav.ts`, `package.json`, `.env`, `CLAUDE.md`. No commits.
- **Work:**
  1. `StartPageSetting` (client), copying `NavModeSetting`: props
     `startPage`, `forTablet: boolean`. Row label and help line from
     `START_PAGE_WORDS` (help `helpTablet` when `forTablet`), value from
     `startPageLabel`, Lucide `House` icon, opens `RadioSheet` portaled to the
     body, optimistic, calls `saveTabletStartPage` when `forTablet` else
     `saveStartPage`, failure puts the old choice back and shows the error.
  2. Settings page: the row (not for tablet) sits right under `TextSizeSetting`,
     only when `!user.isDevice`. The Wall tablet door shows for parents and
     admins and for a device login; Slideshow photos stays as it is. Update
     the page's doc comment.
  3. Wall tablet page: `requireRole(...MANAGER_ROLES, "device")`; read
     `loadTabletStartPage()`; when not null, render
     `<StartPageSetting forTablet startPage=... />` above `WallTabletSettings`.
     Pass `canManagePhotos` (false for a device) so `WallTabletSettings`
     hides its link to `/settings/slideshow` for the tablet.
  4. `docs/structure/slideshow.md` Screensaver entry: `saveScreensaverSetting`
     allows `MANAGER_ROLES` and a device login (Bryce, 2026-11-10, mission 64);
     the Wall tablet page opens for the device login too; `loadScreensaverShow`
     also returns the start page. Add a "Start page" entry: `startPage.ts` is
     the only option list and cleaner, `startPageRead.ts` the only reader of
     another login's start page, `saveStartPage` and `saveTabletStartPage` the
     only writers; the login redirect and the tablet's wake use only
     `toStartPage` values. Add its headline to STRUCTURE.md's list beside
     Screensaver.
- **Verification:** gauntlet as above; `npm run build` passes.
- **Evidence required:** `git diff --stat`; tsc, eslint, test counts.
- **Done criteria:** Fury re-runs; Strange sees the rows on a parent login
  and the Tablet login on the dev server.
- **Report:** DONE (Stark), re-run by Fury 2026-11-10: tsc 0, eslint 0, 1784 tests pass, build 0. Committed with C1 as `f280be5`. Strange's look on the dev server is still to come.

### C3 — Gate pass 1 fixes (Captain's two blockers, plus cheap notes)
- **Status:** DONE
- **Boundaries:** may touch: `src/lib/startPage.ts`, `src/lib/startPage.test.ts`, `src/lib/tabletRules.ts`, `src/lib/tabletRules.test.ts`, `src/app/actions/screensaver.ts`, `src/app/actions/preferences.ts`, `src/app/(app)/settings/page.tsx`, `src/app/(app)/settings/wall-tablet/page.tsx`, `src/app/(app)/settings/wall-tablet/loading.tsx`, `src/components/WallTabletSettings.tsx`, `docs/structure/slideshow.md`, `docs/structure/layout.md`. Must not touch: everything else, above all `STRUCTURE.md`, `CLAUDE.md`, `src/lib/nav.ts`, `prisma/`, `.env`. No commits.
- **Work:**
  1. BLOCKER (STRUCTURE.md, `navLabelForPath` is the only path-to-words): `startPageLabel` returns `navLabelForPath(toStartPage(href))`; the literal "Dashboard" goes.
  2. BLOCKER (STRUCTURE.md, `tabletRules.ts` is the only home of what the device may do): add `tabletMayChangeWallTablet(role: Role): boolean` (role === "device"; doc comment: the tablet may open the Wall tablet page and change its settings and its start page; Bryce, 2026-11-10, mission 64) with a test. Use it in `saveScreensaverSetting` and `saveTabletStartPage` (allowed when `MANAGER_ROLES` includes the role or the check passes), on the Wall tablet page (`requireVerifiedUser()` then `redirect("/")` unless allowed), and on the Settings door (`canManageSlideshow || tabletMayChangeWallTablet(user.role)`). `canManagePhotos` becomes `MANAGER_ROLES.includes(user.role)`.
  3. NOTE: add `isStartPage(raw: unknown): raw is string` to `startPage.ts` (tested); both save actions use it instead of their inline `find`.
  4. NOTE: the Wall tablet page passes `photoCount` only when photos can be managed (0 otherwise), or drops it for devices, whichever keeps `WallTabletSettings` simplest.
  5. NOTE: `loading.tsx` gains one `SkeletonList rows={1}` above the three sections; `docs/structure/layout.md`'s Wall tablet skeleton description updated to match.
  6. NOTE: `docs/structure/slideshow.md`: header line notes "Start page added by mission 64"; the Screensaver and Start page entries name `tabletMayChangeWallTablet` as the tablet's gate; rewrap the over-long lines.
- **Verification:** `npx tsc --noEmit`, `npx eslint`, `npm test`, `npm run build`, all 0; `grep -rn "isDevice\|\"device\"" src/app/actions/screensaver.ts src/app/actions/preferences.ts "src/app/(app)/settings/page.tsx" "src/app/(app)/settings/wall-tablet/page.tsx"` shows no new inline device permission tests.
- **Evidence required:** command outputs with counts; the grep; `git diff --stat`.
- **Done criteria:** Fury re-runs; Captain re-gates PASS.
- **Report:** DONE (Stark), re-run by Fury 2026-11-10: tsc 0, eslint 0, 1787 tests pass (3 new). `photoCount` kept and passed as 0 for the tablet (no count read); `WallTabletSettings.tsx` unchanged.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision (HEAD f280be5) | PASS | none | Gauntlet re-run green (tsc, eslint, 1784 tests, UTC 1777 pass 7 skipped DST, build). No redirect off the app; none of the 9 pages is role-gated; kids refused by both save actions and the page. Notes: a signed-in visit to `/login` still goes to `/` (out of scope); wake compares path only; `saveStartPage` lets a device save its own (no screen offers it); with two device logins they could differ; `photoCount` still sent to the tablet. |
| 1 | Captain (HEAD f280be5) | BLOCKED | `startPageLabel` maps paths to words itself (rule: `navLabelForPath` only); four new inline device permission tests (rule: `tabletRules.ts` is the only home). Fix: C3 | Notes: "tablet" in names follows the Wall tablet feature precedent (Captain drafted a clarifying amendment, not applied: constitution amendments need Bryce); duplicated strict check; loading skeleton missing the new row; schema and STRUCTURE.md sizes are the known exemptions; CLAUDE.md at 250 exactly. |

## Log

- 2026-11-10 (Fury, Opus 5.5): next free mission number on `origin/main`
  was 64 (main ends at 63); latest migration `20261118000000_calendar_turned_on`.
  Mock approved by Bryce. C1 dispatched to Stark, DONE, re-run by Fury. C2 dispatched, DONE, committed `f280be5`. Vision PASS, Captain BLOCKED (two). C3 dispatched, DONE, committed. Re-gate: Vision and Captain pass 2, Strange pass 1 on the parent login (the in-app browser is still signed in as Bryce on dev).

## Delivery

- **Shipped check:** (filled at merge.)
