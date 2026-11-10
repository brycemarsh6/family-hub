# Mission 58: Screensaver S2, the tablet slideshow and sleep mode

**Project:** family-hub (Marshee)
**Status:** GATES (C1 to C3 built; Vision and Captain on the code, Strange waits for Bryce's Tablet sign-in)
**Started:** 2026-11-09 · **Updated:** 2026-11-09
**Branch:** `claude/screensaver-s2-slideshow`, cut from `main` at `e62056c` (the PR #94 merge).

Plan: `.avengers/plans/screensaver-slideshow-v1.md` (approved by Bryce 2026-11-09), "How it works > Screensaver" and the S2 row. S1 is mission 57.

## Step 0 (done 2026-11-09)

- PR #94 is merged on `origin/main` (`e62056c`), and `mission-57-screensaver-s1-photos.md` is on main.
- Production deploy `dpl_ECGfBri8pesymrLFLENYfZgQefr3` for `e62056cde93b59e10772d9726363d68a61ba3c02` is READY; its build log shows "Applying migration `20261115000000_slideshow_photos`" against the production host. Recorded in mission 57's Delivery through this PR.
- Worktree `.env` symlinked to the main checkout's (gitignored). Not read.
- Next free numbers on `origin/main`: mission 58; migration stamp after `20261115000000`.

## Brief

- **Goal:** the wall tablet (the device login) shows a full-screen shuffled slideshow of the S1 photos after N minutes with no taps, and goes fully black during sleep hours. Parents and admins adjust every timing and switch from their own Settings.
- **Done means:**
  - Only a login with `user.isDevice` ever gets the screensaver.
  - After "Start after" minutes with no taps, the slideshow starts; each photo shows for "Seconds per photo"; order is shuffled with no repeat until every photo has shown.
  - Each photo is shown whole, with a blurred copy of itself filling any gap.
  - Clock and date, caption, and taken date each show only when their switch is on.
  - With sleep on, between sleep start and end (Denver), the screen is black. A tap wakes Marshee; with no further tap it is black again after "Back to black" minutes.
  - A tap on the slideshow or the black screen only wakes the app and opens the dashboard; it never presses what is underneath.
  - New photos and changed settings reach the tablet the next time the slideshow starts, without a reload.
  - The settings are one household `ScreensaverSettings` row (additive migration); numbers change only by +/− steppers.
  - Pure rules (`src/lib/screensaver.ts`: state from time, last tap and settings; the shuffle) are tested in Denver and UTC. The gauntlet passes.
- **Out of scope:** the "Open Marshee on" default page (S3), "On this day" (S4), screen power or brightness, a screensaver on any personal login, Winnie, photo management changes.

## Danger register

From AGENTS.md (absolute): never `db:seed` / `db:reset`; migrations additive only, SQL reviewed, merging applies it to production; no `User` clean script; secrets only in `.env` and Vercel, never read or printed; never `git add -A` / `git add .`, stage by path, `git show --stat HEAD` after each commit; no direct push to `main`.

New for this mission:
- Fury alone runs `npx prisma migrate deploy`, against the dev branch only, after checking the hostname starts `ep-hidden-pine-` (hostname only, never the URL).
- Production photos are the family's. Tests use the dev Blob store and made-up photos from `/System/Library/Desktop Pictures/` only.
- Testing the screensaver needs the Tablet login on the dev copy: Bryce signs it in himself in the browser pane. No agent reads `.env` or mints a cookie.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always). Strange (the slideshow, the black screen, the Wall tablet settings). Captain (new table, new files, a writes move, STRUCTURE.md entry).
- Banner: not needed; Fury read the S1 code and Settings inline.

## STRUCTURE.md cleanup pass (first job)

Measured 2026-11-09: STRUCTURE.md is 1,770 lines (trigger 1,783). Since the last pass (`6c97d25`, 1,583 lines) it gained 207 lines, almost all binding rule text (Browser return routes, Slideshow photos, Google calendar link, wide-page rules). The leftover story-shaped passages in the older text were ruled KEEP or restored by both gates in mission 54 (the `withTimeZone` sentence, the `git add -A` record). Fury's estimate: a repeat stories-only pass saves about 10 to 20 lines. Decision for Bryce (C0 below).

## Open questions for Bryce (with the mock, 2026-11-09)

**Answered 2026-11-09: Bryce approved every recommendation below, Q1 to Q11 and C0 (the STRUCTURE.md split becomes its own later PR, not part of S2). He asked whether to plan on Fable; Fury recommended staying on Opus 5.5 (the plan and every content call are settled, and Vision gates on Fable).**

Asked 2026-11-09 with the mock (slideshow, black screen, Wall tablet page). Fury's recommendation first in each:
- Q1 Where: a "Wall tablet" row on Settings opens its own page `/settings/wall-tablet` (else: an inline section on Settings, about nine more rows).
- Q2 The page also links to Slideshow photos; the existing Settings row stays.
- Q3 Stepper ladders: Start after 1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120 min; Each photo 5, 10, 15, 20, 30, 45, 60 sec; Black from and Until in 30-minute steps round the clock; Back to black 1, 2, 3, 5, 10, 15, 30 min.
- Q4 Between photos: a 1-second crossfade (else hard cut, 2-second fade, or slow zoom).
- Q5 Wide photos follow the same rule: whole photo, blurred fill, never cropped.
- Q6 Date line reads "June 14, 2023"; clock reads "7:42 PM" with the date "Sunday, November 9" under it.
- Q7 No photos yet: the tablet stays on Marshee (no screensaver) until there is at least one.
- Q8 In sleep hours the wait before black is "Back to black after" (so at 10 PM someone mid-use gets 2 minutes of no taps first).
- Q9 At the sleep end time the black screen becomes the slideshow; the first tap opens Marshee.
- Q10 A tap on the slideshow or black screen opens the dashboard (S3 makes this a setting).
- Q11 All three overlay switches start on.
- C0 STRUCTURE.md: skip the repeat stories pass (saves about 10 to 20 lines, costs two gate runs); its growth is "a trend to watch, never a BLOCKER". Offer splitting the per-domain One source of truth entries into companion files as a separate later PR.

## Design decisions made while contracting (Fury, structure calls)

- **One household row:** `ScreensaverSettings`, `id String @id @default("household")`, every column with its default, plus `updatedAt` and `updatedById String?` (a plain id, no `User` relation, the `SlideshowPhoto` precedent). A missing row reads as the defaults; the first save upserts it. Migration `20261116000000_screensaver_settings`: one `CREATE TABLE`, nothing else.
- **Times are minutes after midnight** (`sleepStartMinute` 1320 = 10 PM, `sleepEndMinute` 360 = 6 AM), Denver wall clock. A new `minuteOfDayInZone(instant, timeZone)` sits beside `hourInZone` in `householdDate.ts` (the zone-math home). Start equal to end means no sleep hours.
- **Ladders, not +1:** every number moves along a fixed list (Q3). The lists and the step functions live in pure `src/lib/screensaver.ts`, and the save action refuses any value not on its list. Sleep times wrap round midnight.
- **The state rule** (`screensaverState`): in sleep hours, "sleep" once idle for `backToBlackMinutes`, else "awake". Outside them, "slideshow" once idle for `startAfterMinutes` and at least one photo exists, else "awake". This one rule gives Q7, Q8 and Q9 with no special cases.
- **No repeats:** `pickNextPhoto(currentIds, shownIds, lastId, random)` picks at random from the photos not yet shown; when none are left it starts a new round, avoiding the last photo when there are two or more. Adds and deletes between rounds need no extra code. `random` is passed in, so tests are fixed.
- **How the tablet reads:** the `(app)` layout already loads the user. For a device login only, it also loads the settings and passes them to `AppChrome`, which mounts `ScreensaverHost`. Each time the host is about to leave "awake" it calls a read action `loadScreensaverShow()` (guard form (a), device logins only, `null` on refusal) for fresh settings and photos, re-checks the rule with them, and only then shows anything. Photos load through the S1 image route.
- **Writes:** `saveScreensaverSetting(field, value)` saves one field per tap (guard form (a), `MANAGER_ROLES` and not a device). Next.js runs one client's Server Actions one at a time, so rapid taps land in order.
- **S1's rule followed:** its STRUCTURE.md entry names "the tablet's slideshow" as the second caller that moves the photo writes into `src/lib/slideshowWrites.ts`. C1 does that move with no behaviour change, and `slideshowRead.ts` gains a narrow `listSlideshowShowItems()` (id, width, height, caption, takenOn).
- **A tap never reaches the page:** the overlay is the hit target from the first touch. It swallows `pointerdown` and wakes on its own `click`, so the whole tap belongs to the overlay; then it routes to `/` (or just closes when already there). Taps anywhere else, captured on `window`, reset the idle clock.

## Contracts

### C1 — Screensaver foundation (table, pure rules, reader, actions, slideshow writes move)
- **Status:** DONE
- **Objective:** Everything S2 needs below the screens: the settings table, the pure rules with tests, the readers, the two actions, and S1's writes moved into `slideshowWrites.ts`.
- **Boundaries:** may touch: `prisma/schema.prisma` (one new model at the end), new `prisma/migrations/20261116000000_screensaver_settings/migration.sql`, new `src/lib/screensaver.ts`, new `src/lib/screensaver.test.ts`, `src/lib/householdDate.ts` and `src/lib/householdDate.test.ts` (add `minuteOfDayInZone` and its tests only), new `src/lib/screensaverRead.ts`, new `src/lib/slideshowWrites.ts`, `src/lib/slideshowRead.ts` (add `listSlideshowShowItems` and its select only), `src/app/actions/slideshowPhotos.ts` (call `slideshowWrites.ts` instead of `db`), new `src/app/actions/screensaver.ts`. Must not touch: everything else, above all `src/components/`, `src/app/(app)/`, `STRUCTURE.md`, `package.json`, `.env`. Never run `prisma migrate` (Fury applies it). No commits.
- **Spec:**
  1. `screensaver.ts` (pure; may import only `householdDate.ts`, `mealPlanDates.ts`, `constants.ts`): `ScreensaverSettings` type; `SCREENSAVER_DEFAULTS` (30, 15, true, true, true, true, 1320, 360, 2); `START_AFTER_STEPS` [1,2,5,10,15,20,30,45,60,90,120], `SECONDS_PER_PHOTO_STEPS` [5,10,15,20,30,45,60], `BACK_TO_BLACK_STEPS` [1,2,3,5,10,15,30], `SLEEP_MINUTE_STEP` 30; `stepLadder(steps, value, dir)` (stops at the ends), `stepSleepMinute(minute, dir)` (wraps); `toScreensaverSettings(row | null)` (repairs anything off its list to the default, never throws); `parseScreensaverField(field, value)` returning the clean `{ field, value }` or `null` (the action's validator; every field name and type checked, numbers must be on their list, sleep minutes a multiple of 30 in 0 to 1410); `isSleepTime(minuteOfDay, settings)`; `screensaverState({ now, lastTapAt, settings, hasPhotos, timeZone })` returning `"awake" | "slideshow" | "sleep"` per the decision above; `pickNextPhoto`; formatters `formatSleepMinute(m)` ("10:00 PM", through `formatHouseholdClock` on a UTC instant), `formatScreensaverDate(now, timeZone)` ("Sunday, November 9", through `calendarDateInZone`, `dayOfWeek`, `FULL_DAY_NAMES`, `FULL_MONTH_NAMES`), `formatTakenOn(takenOn)` ("June 14, 2023" from `YYYY-MM-DD` via `parseDateParam`, no timezone conversion, `null` for null or bad text); and `SCREENSAVER_WORDS`, the page's words from the approved mock (title, sub line, three section names, every row label, the help line).
  2. Tests in `screensaver.test.ts`: every ladder end and middle; wrap at midnight both ways; repair of junk rows; `parseScreensaverField` refusals (unknown field, wrong type, off-list number, 45-minute sleep time); `isSleepTime` across midnight, same-day window, start equal end, sleep off; `screensaverState` for each branch including no photos, exactly-at-threshold, 9:59 PM vs 10:00 PM, 5:59 vs 6:00 AM, and the Denver DST nights (2026-03-08 and 2026-11-01) with instants chosen so a UTC-based mistake fails; `pickNextPhoto` (no repeat within a round over many draws, new round after all shown, never the same photo twice in a row when two or more exist, a deleted id never picked, a new id picked within its round); formatters. Tests must pass under both `TZ=America/Denver` and `TZ=UTC`.
  3. `minuteOfDayInZone` beside `hourInZone`, same Intl style, with tests including a DST night.
  4. `screensaverRead.ts` (`server-only`, no auth): `loadScreensaverSettings()` returns `toScreensaverSettings(row)`; the only reader of `ScreensaverSettings`.
  5. `slideshowWrites.ts` (`server-only`, no auth, no `revalidatePath`): the three `db.slideshowPhoto` writes from the actions moved verbatim in meaning (`createSlideshowPhotoRow`, `updateSlideshowCaptionRow`, `deleteSlideshowPhotoRow`, names may differ), returning what the actions need. The actions keep their guards, Blob calls, validation, results and `revalidatePath`. `grep -n "db\." src/app/actions/slideshowPhotos.ts` returns nothing afterwards.
  6. `actions/screensaver.ts`: `saveScreensaverSetting(field: unknown, value: unknown)`: guard (a) `getVerifiedUser`, refuse `!user || user.isDevice || !MANAGER_ROLES.includes(user.role)` with `{ error }`; `parseScreensaverField` or `{ error }`; upsert `id: "household"` setting that one column and `updatedById`; `revalidatePath("/settings/wall-tablet")`; plain-English errors, never throws. `loadScreensaverShow()`: guard (a); `null` unless `user.isDevice`; returns `{ settings, photos }` from `loadScreensaverSettings()` and `listSlideshowShowItems()` in one `Promise.all`. No type re-exports from this file.
  7. Schema and migration per the design decision. The SQL is a single `CREATE TABLE "ScreensaverSettings"` with the defaults; paste it whole in the report.
- **Verification:** `npx prisma validate`; `npx prisma generate`; `npx tsc --noEmit`; `npx eslint .`; `npm test`; the direct UTC test command from the Gauntlet. Expected all exit 0, test count up only by new tests.
- **Evidence required:** the migration SQL in full; the last lines and pass counts of both test runs; `grep -n "db\." src/app/actions/slideshowPhotos.ts` (empty); `grep -rn "screensaverSettings" src --include=*.ts | grep -v generated` (only `screensaverRead.ts` reads, only `actions/screensaver.ts` writes); `git diff --stat`.
- **Done criteria:** Fury re-runs tsc and both test runs and gets the same counts; Fury applies the migration to the dev branch (host checked) and `npx prisma migrate status` is clean.
- **Report:** DONE (Stark), re-run by Fury 2026-11-09: tsc 0 (after `npm install` in this worktree; `@vercel/blob` was missing, and a stale `.next` removed), eslint 0, `npm test` 1634 pass, UTC run 1634 tests 0 fail 7 skipped; `db.` absent from `actions/slideshowPhotos.ts`; one reader, one writer of `ScreensaverSettings`. Fury replaced Stark's invented `SCREENSAVER_WORDS` with the approved mock's words (Stark had no copy of the mock). Migration applied to the dev branch (host checked `ep-hidden-pine-`), `migrate status` up to date. `pickNextPhoto` returns `{ id, shownIds } | null`; the caller keeps `shownIds`. C1 status: DONE.

### C2 — The Wall tablet page and its Settings row
- **Status:** DONE
- **Objective:** Parents and admins change every screensaver setting from `/settings/wall-tablet`, reached from a new "Wall tablet" row on Settings, exactly as the approved mock.
- **Boundaries:** may touch: new `src/app/(app)/settings/wall-tablet/page.tsx`, new `src/components/WallTabletSettings.tsx`, new `src/components/LadderStepper.tsx`, `src/app/(app)/settings/page.tsx` (one row and its top comment). Must not touch: everything else (C1's files are read-only now; ask, do not edit, if one is wrong).
- **Spec:** page: `requireRole(...MANAGER_ROLES)` like `settings/slideshow/page.tsx`, then `loadScreensaverSettings()` and `countSlideshowPhotos()`; `data-page-width="wide"` root with its content inside `NARROW_PAGE_CLASSES` (STRUCTURE.md "Short pages"); `BackLink` to Settings; words only from `SCREENSAVER_WORDS`. `WallTabletSettings` (client): three sections in the mock's order; each switch a `ToggleSwitch`, each number a `LadderStepper` driven by `stepLadder` / `stepSleepMinute` and shown with its unit ("30 min", "15 sec", "10:00 PM", "2 min"); optimistic like `HabitsChoresSettings` (shows at once, a failed save puts the old value back and says so under that row); the three sleep rows are disabled when "Go black at night" is off; the Slideshow photos row links to `/settings/slideshow` with the count. `LadderStepper`: the `QuantityStepper` look, 48px buttons, `aria-label` "Decrease <label>" / "Increase <label>", a disabled end, the shown text passed in. Settings row: "Wall tablet", Lucide `Tablet` icon, same classes as the Slideshow photos row, `order-3` right after it, gated on `canManageSlideshow`.
- **Verification:** `npx tsc --noEmit`; `npx eslint .`; `npm test`.
- **Evidence required:** gauntlet last lines; `git diff --stat`; a `grep` showing no number input (`type="number"`) and no hand-typed label text in the new components.
- **Done criteria:** Strange's pass on the running page.
- **Report:** DONE (Stark): new page, `WallTabletSettings.tsx`, `LadderStepper.tsx`, one Settings row; tsc 0, eslint 0, `npm test` 1634 pass; no number inputs. Stark's note: two taps inside one render could save the same step twice (server rule still holds). Fury re-runs with C3.

### C3 — The ScreensaverHost (idle timer, slideshow, black screen)
- **Status:** DONE
- **Objective:** On a device login only, the tablet shows the slideshow and the black screen by the C1 rule, and a tap only wakes it.
- **Boundaries:** may touch: new `src/components/ScreensaverHost.tsx`, new `src/components/ScreensaverSlide.tsx` (if the slide drawing is worth its own file), `src/components/AppChrome.tsx` (one optional prop and the mount), `src/app/(app)/layout.tsx` (load settings for device logins only and pass them). Must not touch: everything else.
- **Spec:** layout: `const screensaver = user?.isDevice ? await loadScreensaverSettings() : null;` passed as `AppChrome`'s `screensaver` prop; `AppChrome` mounts `<ScreensaverHost initialSettings={screensaver} />` only when it is non-null. Host: last-tap time in a ref, set on mount and by capturing `pointerdown` and `keydown` on `window`; a 1-second interval computes `screensaverState` with `HOUSEHOLD_TIME_ZONE`; before leaving "awake" it awaits `loadScreensaverShow()` (a `null` or a throw means stay awake and try again on a later tick, never more than once a minute), re-checks with the fresh settings and photo count, then shows. Overlay: `createPortal` to `document.body` (only ever rendered after mount), `fixed inset-0`, above everything (higher z than the drawer and sheets), black background, `touch-action: none`. Slideshow: the current photo `object-contain` over a blurred, scaled `object-cover` copy of the same image; the next photo preloaded and decoded before a 1-second crossfade; `secondsPerPhoto` per photo via `pickNextPhoto` (Math.random); overlays per the mock (clock `formatHouseholdClock` with the date under it bottom left; caption over `formatTakenOn` bottom right; a soft dark shade under the words; each only when its switch is on, and the date line hidden when the photo has none). A photo whose image fails to load is skipped. Sleep: the same overlay, pure black, nothing on it. Tap: the overlay's `onPointerDown` calls `preventDefault` and `stopPropagation`; its `onClick` resets the last tap, hides the overlay and calls `router.push("/")` unless the path is already `/`. The tick resumes after wake. When the tab is hidden nothing breaks (intervals may pause). No screen power, brightness or wake-lock calls.
- **Verification:** `npx tsc --noEmit`; `npx eslint .`; `npm test`; `npm run build`.
- **Evidence required:** gauntlet last lines; `git diff --stat`; the exact lines that make the overlay swallow the tap; `grep -n "wakeLock\|brightness" src/components/ScreensaverHost.tsx` (empty).
- **Done criteria:** Strange's pass on the dev server with the Tablet login (Bryce signs it in), with "Start after" set to 1 minute and test photos only.
- **Report:** DONE (Stark): host with capture-phase tap listeners, 1-second tick, fresh `loadScreensaverShow()` before leaving awake (retry no sooner than 60 s), portal at `z-[100]` above the drawer's `z-[60]`, wake only on the overlay's own click; `ScreensaverSlide.tsx` two-layer 1-second crossfade with preload and `decode()`. Fury re-ran C2 and C3 together 2026-11-09: tsc 0, eslint 0, `npm test` 1634 pass, UTC 1634 tests 0 fail, `npm run build` 0 with `/settings/wall-tablet` in the route list.

### C4 — Records (Fury)
- Mission 57's Delivery "Shipped check" line; STRUCTURE.md entry for the screensaver (Captain's wording, Bryce's yes); CLAUDE.md "What's built" line; `.avengers/status.md` tablet check; this file's Delivery.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

Budget: 3 passes per gate, then stop and surface.

## Handoff log

- 2026-11-09 (Fury, Opus 5.5): step 0 done (above). Read the plan, mission 57, mission 54 and the S1 code. Mission file opened. Mock and questions going to Bryce.
- 2026-11-09 (Fury, Opus 5.5): Bryce approved all. STRUCTURE.md split proposed as its own task card. Contracts C1 to C4 written. C1 preflight: one hard failure, `prisma/schema.prisma` over 650 lines, which STRUCTURE.md's File-size caps exempts (same as every migration mission); REVIEW claims checked (`dayOfWeek`, `FULL_DAY_NAMES`, `FULL_MONTH_NAMES`, `formatHouseholdClock`, `hourInZone`, `parseDateParam` all exist). C1 dispatched to Stark.

## Delivery

(Pending.)
